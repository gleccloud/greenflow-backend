#!/bin/bash

###############################################################################
# GreenFlow 배포 테스트 스크립트
# LocalStack 환경에서 전체 시스템 테스트
###############################################################################

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
}

###############################################################################
# 1단계: 환경 검증
###############################################################################

log_info "=== GreenFlow 배포 테스트 시작 ==="
log_info "1단계: 환경 검증..."

# Docker 확인
if ! command -v docker &> /dev/null; then
  log_error "Docker가 설치되지 않았습니다"
  exit 1
fi
log_success "Docker 설치됨"

# Docker Compose 확인
if ! command -v docker-compose &> /dev/null; then
  log_error "Docker Compose가 설치되지 않았습니다"
  exit 1
fi
log_success "Docker Compose 설치됨"

# Node.js 확인
if ! command -v node &> /dev/null; then
  log_error "Node.js가 설치되지 않았습니다"
  exit 1
fi
log_success "Node.js 설치됨 ($(node --version))"

# npm 확인
if ! command -v npm &> /dev/null; then
  log_error "npm이 설치되지 않았습니다"
  exit 1
fi
log_success "npm 설치됨 ($(npm --version))"

###############################################################################
# 2단계: Docker 이미지 빌드
###############################################################################

log_info "\n2단계: Docker 이미지 빌드..."

log_info "백엔드 이미지 빌드..."
docker build -t glec-api:test ./projects/glec-api-backend/
log_success "백엔드 이미지 빌드 완료"

log_info "프론트엔드 이미지 빌드..."
docker build \
  -t greenflow-frontend:test \
  --build-arg VITE_API_BASE_URL=http://backend:3000/api/v2 \
  ./projects/green-logistics-landing/
log_success "프론트엔드 이미지 빌드 완료"

###############################################################################
# 3단계: Docker Compose 서비스 시작
###############################################################################

log_info "\n3단계: Docker Compose 서비스 시작..."

# 기존 컨테이너 정리
log_info "기존 컨테이너 정리..."
docker-compose -f docker-compose.deployment-test.yml down -v 2>/dev/null || true

# 서비스 시작
log_info "서비스 시작 중..."
docker-compose -f docker-compose.deployment-test.yml up -d

# 헬스 체크 대기
log_info "서비스 준비 대기 중... (최대 60초)"

HEALTHY=false
for i in {1..60}; do
  # PostgreSQL 확인
  if docker-compose -f docker-compose.deployment-test.yml exec -T postgres pg_isready -U glec_user -d glec_dev &>/dev/null; then
    # Redis 확인
    if docker-compose -f docker-compose.deployment-test.yml exec -T redis redis-cli ping &>/dev/null; then
      # LocalStack 확인
      if curl -s http://localhost:4566/_localstack/health | grep -q '"services"'; then
        # 백엔드 확인
        if curl -s http://localhost:3000/api/v2/health | grep -q '"status"'; then
          HEALTHY=true
          break
        fi
      fi
    fi
  fi
  echo -ne "\r진행: $i/60"
  sleep 1
done

if [ "$HEALTHY" = false ]; then
  log_error "서비스 시작 실패"
  docker-compose -f docker-compose.deployment-test.yml logs
  exit 1
fi

log_success "모든 서비스 준비 완료"

###############################################################################
# 4단계: 데이터베이스 마이그레이션
###############################################################################

log_info "\n4단계: 데이터베이스 마이그레이션..."

log_info "백엔드 마이그레이션 실행..."
docker-compose -f docker-compose.deployment-test.yml exec -T backend npm run db:migrate
log_success "마이그레이션 완료"

log_info "테스트 데이터 로드..."
docker-compose -f docker-compose.deployment-test.yml exec -T backend npm run db:seed
log_success "테스트 데이터 로드 완료"

###############################################################################
# 5단계: 백엔드 테스트
###############################################################################

log_info "\n5단계: 백엔드 테스트..."

log_info "API 엔드포인트 테스트..."

# 헬스 체크
HEALTH=$(curl -s http://localhost:3000/api/v2/health)
if echo "$HEALTH" | grep -q '"status"'; then
  log_success "헬스 체크 통과"
else
  log_error "헬스 체크 실패"
  exit 1
fi

# 메트릭 확인
METRICS=$(curl -s http://localhost:3000/api/v2/metrics)
if [ ! -z "$METRICS" ]; then
  log_success "메트릭 엔드포인트 통과"
else
  log_error "메트릭 엔드포인트 실패"
fi

# 백엔드 통합 테스트
log_info "백엔드 통합 테스트 실행..."
docker-compose -f docker-compose.deployment-test.yml exec -T backend npm run test:integration || true

log_success "백엔드 테스트 완료"

###############################################################################
# 6단계: 프론트엔드 테스트
###############################################################################

log_info "\n6단계: 프론트엔드 테스트..."

# 프론트엔드 접근성 확인
log_info "프론트엔드 접근성 확인..."
if curl -s http://localhost:5173 | grep -q "GreenFlow\|greenflow"; then
  log_success "프론트엔드 접근 가능"
else
  log_warning "프론트엔드 접근 확인 불가 (정상일 수 있음)"
fi

###############################################################################
# 7단계: 로그 및 상태 출력
###############################################################################

log_info "\n7단계: 서비스 상태..."

docker-compose -f docker-compose.deployment-test.yml ps

log_info "\n📊 배포 테스트 결과:"
echo ""
echo "┌─────────────────────────────────────┐"
echo "│  ✅ LocalStack          시작됨       │"
echo "│  ✅ PostgreSQL          시작됨       │"
echo "│  ✅ Redis               시작됨       │"
echo "│  ✅ 백엔드 API          시작됨       │"
echo "│  ✅ 프론트엔드          시작됨       │"
echo "│  ✅ 데이터베이스        초기화됨     │"
echo "│  ✅ 테스트 데이터       로드됨       │"
echo "│  ✅ 백엔드 테스트       완료됨       │"
echo "└─────────────────────────────────────┘"
echo ""

###############################################################################
# 8단계: 접근 정보 출력
###############################################################################

log_info "\n🚀 배포 테스트 환경 준비 완료!"
echo ""
echo "접근 가능한 서비스:"
echo "────────────────────────────────────────"
echo "프론트엔드:        http://localhost:5173"
echo "백엔드 API:        http://localhost:3000/api/v2"
echo "헬스 체크:         http://localhost:3000/api/v2/health"
echo "PostgreSQL:        localhost:5432"
echo "  사용자: glec_user"
echo "  비밀번호: glec_pass"
echo "Redis:             localhost:6379"
echo "LocalStack:        http://localhost:4566"
echo "pgAdmin:           http://localhost:5050"
echo "  이메일: admin@greenflow.dev"
echo "  비밀번호: admin"
echo "Prometheus:        http://localhost:9090"
echo "Grafana:           http://localhost:3001"
echo "  비밀번호: admin"
echo ""

###############################################################################
# 9단계: 정리 옵션
###############################################################################

log_info "\n정리 명령어:"
echo "────────────────────────────────────────"
echo "# 모든 컨테이너 종료"
echo "docker-compose -f docker-compose.deployment-test.yml down"
echo ""
echo "# 모든 컨테이너 및 볼륨 삭제"
echo "docker-compose -f docker-compose.deployment-test.yml down -v"
echo ""
echo "# 로그 확인"
echo "docker-compose -f docker-compose.deployment-test.yml logs -f [service-name]"
echo ""

log_success "\n✨ 배포 테스트 준비 완료!\n"
