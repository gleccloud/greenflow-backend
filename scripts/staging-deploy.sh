#!/bin/bash

###############################################################################
# GreenFlow 스테이징 배포 스크립트
# 용도: Vercel + AWS ECS에 스테이징 환경 배포
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

log_info "=== GreenFlow 스테이징 배포 시작 ==="
log_info "1단계: 환경 검증...\n"

# 필수 도구 확인
REQUIRED_TOOLS=("git" "docker" "npm" "node")
for tool in "${REQUIRED_TOOLS[@]}"; do
  if command -v $tool &> /dev/null; then
    VERSION=$($tool --version 2>&1 | head -1)
    log_success "$tool 설치됨 ($VERSION)"
  else
    log_error "$tool가 설치되지 않았습니다"
    exit 1
  fi
done

# 환경 변수 파일 확인
if [ ! -f .env.staging ]; then
  log_error ".env.staging 파일을 찾을 수 없습니다"
  exit 1
fi
log_success ".env.staging 파일 확인"

###############################################################################
# 2단계: 코드 빌드
###############################################################################

log_info "\n2단계: 코드 빌드...\n"

# 백엔드 빌드
log_info "백엔드 빌드 중..."
cd projects/glec-api-backend
npm ci
npm run build
log_success "백엔드 빌드 완료"
cd ../..

# 프론트엔드 빌드
log_info "프론트엔드 빌드 중..."
cd projects/green-logistics-landing
npm ci
VITE_API_BASE_URL=https://staging-api.greenflow.dev/api/v2 npm run build
log_success "프론트엔드 빌드 완료"
cd ../..

###############################################################################
# 3단계: Docker 이미지 생성
###############################################################################

log_info "\n3단계: Docker 이미지 생성...\n"

# 백엔드 이미지
log_info "백엔드 Docker 이미지 빌드 중..."
docker build -t glec-api:staging ./projects/glec-api-backend
log_success "백엔드 이미지 완료: glec-api:staging"

# 프론트엔드 이미지
log_info "프론트엔드 Docker 이미지 빌드 중..."
docker build \
  -t greenflow-frontend:staging \
  --build-arg VITE_API_BASE_URL=https://staging-api.greenflow.dev/api/v2 \
  ./projects/green-logistics-landing
log_success "프론트엔드 이미지 완료: greenflow-frontend:staging"

###############################################################################
# 4단계: 로컬 테스트 (선택사항)
###############################################################################

log_info "\n4단계: 로컬 통합 테스트...\n"

read -p "로컬 통합 테스트를 실행하시겠습니까? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  log_info "Docker Compose로 로컬 테스트 실행..."

  # 기존 컨테이너 정리
  docker-compose -f docker-compose.deployment-test.yml down -v 2>/dev/null || true

  # 서비스 시작
  docker-compose \
    -f docker-compose.deployment-test.yml \
    up -d \
    postgres redis backend frontend prometheus grafana pgadmin

  # 서비스 준비 대기
  log_info "서비스 준비 대기 중... (최대 60초)"

  HEALTHY=false
  for i in {1..60}; do
    if curl -s http://localhost:3000/api/v2/health | grep -q '"status"'; then
      HEALTHY=true
      break
    fi
    echo -ne "\r진행: $i/60"
    sleep 1
  done

  if [ "$HEALTHY" = true ]; then
    log_success "로컬 테스트 환경 준비 완료"

    # 기본 헬스 체크
    log_info "API 헬스 체크..."
    curl -s http://localhost:3000/api/v2/health | jq .

    log_success "로컬 통합 테스트 통과"

    # 정리
    log_info "로컬 테스트 환경 정리 중..."
    docker-compose -f docker-compose.deployment-test.yml down -v
  else
    log_error "로컬 테스트 실패"
    exit 1
  fi
else
  log_warning "로컬 테스트 스킵"
fi

###############################################################################
# 5단계: 스테이징 환경 배포 준비 안내
###############################################################################

log_info "\n5단계: 스테이징 배포 준비 안내...\n"

cat << 'EOF'
┌────────────────────────────────────────────────────────┐
│       스테이징 배포를 위한 다음 단계를 수행하세요        │
└────────────────────────────────────────────────────────┘

【프론트엔드 배포 (Vercel)】
  1. Vercel 프로젝트 생성: vercel link --confirm
  2. 환경 변수 설정:
     - VITE_API_BASE_URL=https://staging-api.greenflow.dev/api/v2
     - VITE_GA_MEASUREMENT_ID=G-STAGING_ID
  3. 배포: vercel deploy --prod

【백엔드 배포 (AWS ECS)】

  ▶ ECR 이미지 푸시:
    aws ecr get-login-password --region us-east-1 | \
    docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

    docker tag glec-api:staging ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/glec-api:staging
    docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/glec-api:staging

  ▶ ECS 서비스 배포:
    aws ecs update-service \
      --cluster greenflow-staging \
      --service greenflow-api \
      --force-new-deployment

【데이터베이스 설정】
  1. RDS PostgreSQL 인스턴스 생성
  2. 마이그레이션 실행: npm run db:migrate --env=staging
  3. 시드 데이터 로드: npm run db:seed:staging

【도메인 & SSL】
  1. Route53 DNS 레코드 생성
  2. AWS Certificate Manager에서 SSL 인증서 발급
  3. Application Load Balancer에 인증서 연결

【배포 검증】
  1. 프론트엔드 접근: https://staging.greenflow.dev
  2. API 헬스 체크: curl https://staging-api.greenflow.dev/api/v2/health
  3. 통합 테스트: BASE_URL=https://staging.greenflow.dev npm run test:e2e:deployment

【모니터링】
  1. Sentry 프로젝트 생성 및 DSN 설정
  2. Google Analytics 추적 코드 확인
  3. CloudWatch 대시보드 생성

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📖 자세한 가이드: STAGING_DEPLOYMENT_CHECKLIST.md 참조

EOF

###############################################################################
# 6단계: 배포 완료
###############################################################################

log_success "\n✨ 스테이징 배포 준비 완료!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 생성된 Docker 이미지:"
docker images | grep -E "glec-api:staging|greenflow-frontend:staging"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "다음 단계:"
echo "1. AWS 콘솔에서 스테이징 인프라 생성 (RDS, ElastiCache, ECS)"
echo "2. Vercel에서 프론트엔드 배포"
echo "3. 도메인 설정 및 SSL 인증서 발급"
echo "4. 48시간 안정성 테스트"
echo ""
echo "예상 소요 시간: 3-4시간"
echo ""

log_success "스테이징 배포 스크립트 완료!\n"
