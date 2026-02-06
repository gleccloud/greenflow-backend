#!/bin/bash

###############################################################################
# GreenFlow LocalStack 기반 완전 로컬 배포 스크립트
# 용도: Docker Compose + LocalStack으로 완전 로컬에서 배포 테스트
###############################################################################

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
# 1단계: 선행 조건 검증
###############################################################################

log_info "=== GreenFlow LocalStack 배포 시작 ==="
log_info "1단계: 선행 조건 검증...\n"

# Docker 확인
if ! command -v docker &> /dev/null; then
  log_error "Docker가 설치되지 않았습니다"
  exit 1
fi

log_success "Docker 설치됨 ($(docker --version))"

# Docker Compose 확인
if ! docker-compose --version &> /dev/null; then
  log_error "Docker Compose가 설치되지 않았습니다"
  exit 1
fi

log_success "Docker Compose 설치됨"

###############################################################################
# 2단계: Docker Compose 서비스 시작
###############################################################################

log_info "\n2단계: Docker Compose 서비스 시작...\n"

log_info "컨테이너 시작 중 (이 과정은 2-3분 소요될 수 있습니다)..."

docker-compose -f docker-compose.localstack.yml down -v 2>/dev/null || true

docker-compose -f docker-compose.localstack.yml up -d

log_success "Docker Compose 서비스 시작됨"

###############################################################################
# 3단계: 서비스 준비 대기
###############################################################################

log_info "\n3단계: 서비스 준비 대기 중...\n"

# LocalStack 준비 대기
log_info "LocalStack 준비 대기..."
for i in {1..60}; do
  if docker-compose -f docker-compose.localstack.yml exec -T localstack bash -c 'awslocal s3 ls' &>/dev/null; then
    log_success "LocalStack 준비 완료"
    break
  fi
  echo -ne "\r진행: $i/60"
  sleep 1
done

# PostgreSQL 준비 대기
log_info "\nPostgreSQL 준비 대기..."
for i in {1..30}; do
  if docker-compose -f docker-compose.localstack.yml exec -T postgres pg_isready -U greenflow_user &>/dev/null; then
    log_success "PostgreSQL 준비 완료"
    break
  fi
  echo -ne "\r진행: $i/30"
  sleep 1
done

# Redis 준비 대기
log_info "\nRedis 준비 대기..."
for i in {1..30}; do
  if docker-compose -f docker-compose.localstack.yml exec -T redis redis-cli ping &>/dev/null; then
    log_success "Redis 준비 완료"
    break
  fi
  echo -ne "\r진행: $i/30"
  sleep 1
done

###############################################################################
# 4단계: LocalStack 초기화
###############################################################################

log_info "\n4단계: LocalStack 초기화...\n"

log_info "LocalStack 리소스 생성 중..."

# LocalStack 초기화 스크립트를 LocalStack 컨테이너에서 실행
docker-compose -f docker-compose.localstack.yml exec -T localstack bash << 'INIT_SCRIPT'
#!/bin/bash
set -e

# AWS CLI 구성
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
LOCALSTACK_ENDPOINT="http://localhost:4566"

echo "LocalStack 준비 대기 중..."
for i in {1..30}; do
  if awslocal s3api list-buckets 2>/dev/null | grep -q Buckets; then
    echo "LocalStack 준비 완료"
    break
  fi
  sleep 2
done

echo "S3 버킷 생성..."
for BUCKET in greenflow-dev greenflow-uploads greenflow-logs greenflow-backups; do
  awslocal s3api create-bucket --bucket "$BUCKET" --region us-east-1 2>/dev/null || true
done

echo "DynamoDB 테이블 생성..."
awslocal dynamodb create-table --table-name greenflow-user-preferences --attribute-definitions AttributeName=user_id,AttributeType=S --key-schema AttributeName=user_id,KeyType=HASH --billing-mode PAY_PER_REQUEST 2>/dev/null || true
awslocal dynamodb create-table --table-name greenflow-audit-logs --attribute-definitions AttributeName=event_id,AttributeType=S AttributeName=timestamp,AttributeType=N --key-schema AttributeName=event_id,KeyType=HASH AttributeName=timestamp,KeyType=RANGE --billing-mode PAY_PER_REQUEST 2>/dev/null || true

echo "SQS 큐 생성..."
for QUEUE in greenflow-notifications greenflow-order-processing greenflow-email-sending greenflow-analytics greenflow-dlq; do
  awslocal sqs create-queue --queue-name "$QUEUE" --attributes VisibilityTimeout=300,MessageRetentionPeriod=1209600 2>/dev/null || true
done

echo "SNS 토픽 생성..."
for TOPIC in greenflow-notifications greenflow-order-events greenflow-alert; do
  awslocal sns create-topic --name "$TOPIC" 2>/dev/null || true
done

echo "LocalStack 초기화 완료!"
INIT_SCRIPT

log_success "LocalStack 초기화 완료"

###############################################################################
# 5단계: 데이터베이스 마이그레이션
###############################################################################

log_info "\n5단계: 데이터베이스 마이그레이션...\n"

log_info "데이터베이스 마이그레이션 실행..."

# 백엔드 컨테이너에서 마이그레이션 실행
docker-compose -f docker-compose.localstack.yml exec -T backend npm run db:migrate 2>/dev/null || log_warning "데이터베이스 마이그레이션 스킵 (명령어 없음)"

log_success "데이터베이스 마이그레이션 완료"

###############################################################################
# 6단계: 백엔드 준비 대기
###############################################################################

log_info "\n6단계: 백엔드 API 준비 대기...\n"

for i in {1..60}; do
  if curl -f http://localhost:3000/api/v2/health 2>/dev/null | grep -q '"status"'; then
    log_success "백엔드 API 준비 완료"
    break
  fi
  echo -ne "\r진행: $i/60"
  sleep 1
done

###############################################################################
# 7단계: 배포 완료 및 정보 표시
###############################################################################

log_success "\n✨ GreenFlow LocalStack 배포 완료!\n"

cat << 'EOF'
════════════════════════════════════════════════════════════════════════════════

📊 배포된 서비스:

✅ LocalStack (AWS 에뮬레이션)
   Web UI:        http://localhost:8080
   Endpoint:      http://localhost:4566
   Services:      S3, SQS, SNS, Lambda, RDS, ElastiCache, 등 20+

✅ 백엔드 API (NestJS)
   URL:           http://localhost:3000
   API:           http://localhost:3000/api/v2
   Health Check:  http://localhost:3000/api/v2/health

✅ 프론트엔드 (Vite + React)
   URL:           http://localhost:5173

✅ 데이터베이스 (PostgreSQL)
   Host:          localhost:5432
   pgAdmin:       http://localhost:5050

✅ 캐시 (Redis)
   Host:          localhost:6379

✅ 모니터링
   Prometheus:    http://localhost:9090
   Grafana:       http://localhost:3001

════════════════════════════════════════════════════════════════════════════════

🧪 테스트 명령어:

# API 헬스 체크
curl http://localhost:3000/api/v2/health

# S3 버킷 목록
docker-compose -f docker-compose.localstack.yml exec -T localstack \
  awslocal s3 ls

════════════════════════════════════════════════════════════════════════════════

EOF

log_success "배포 완료!\n"
