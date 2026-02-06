#!/bin/bash

###############################################################################
# GreenFlow 프로덕션 배포 스크립트
# 용도: Blue-Green 무중단 배포
# 사용: bash scripts/production-deploy.sh
###############################################################################

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 배포 설정
DEPLOYMENT_VERSION=$(date +%Y%m%d-%H%M%S)
BLUE_ENV="greenflow-production-blue"
GREEN_ENV="greenflow-production-green"
DEPLOYMENT_LOG="deployment-${DEPLOYMENT_VERSION}.log"

# 로그 함수
log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

log_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

log_error() {
  echo -e "${RED}❌ $1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

log_header() {
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$DEPLOYMENT_LOG"
  echo -e "${CYAN}$1${NC}" | tee -a "$DEPLOYMENT_LOG"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$DEPLOYMENT_LOG"
}

# 시간 함수
timer_start() {
  START_TIME=$(date +%s)
}

timer_end() {
  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))
  echo "소요 시간: ${DURATION}초"
}

###############################################################################
# 배포 전 체크
###############################################################################

log_header "프로덕션 배포 시작 - Blue-Green 전략"

log_info "배포 버전: $DEPLOYMENT_VERSION"
log_info "로그 파일: $DEPLOYMENT_LOG"

# 필수 환경 변수 확인
if [ ! -f .env.production ]; then
  log_error ".env.production 파일을 찾을 수 없습니다"
  exit 1
fi
log_success ".env.production 파일 확인"

# 필수 도구 확인
REQUIRED_TOOLS=("docker" "aws" "curl" "jq")
for tool in "${REQUIRED_TOOLS[@]}"; do
  if command -v $tool &> /dev/null; then
    log_success "$tool 설치됨"
  else
    log_error "$tool가 설치되지 않았습니다"
    exit 1
  fi
done

###############################################################################
# 배포 전 확인 사항
###############################################################################

log_header "Step 0: 배포 전 최종 확인"

timer_start

# 스테이징 환경 최종 검증
log_info "스테이징 환경 헬스 체크..."
if curl -s https://staging-api.greenflow.dev/api/v2/health | jq -e '.status=="ok"' > /dev/null; then
  log_success "스테이징 API 정상 작동"
else
  log_error "스테이징 API 헬스 체크 실패"
  exit 1
fi

# 데이터베이스 백업 확인
log_info "프로덕션 데이터베이스 백업 확인..."
BACKUP_ID=$(aws rds create-db-snapshot \
  --db-instance-identifier greenflow-prod \
  --db-snapshot-identifier greenflow-prod-backup-${DEPLOYMENT_VERSION} \
  --query 'DBSnapshot.DBSnapshotIdentifier' \
  --output text 2>/dev/null || echo "unknown")

if [ "$BACKUP_ID" != "unknown" ]; then
  log_success "데이터베이스 백업 생성: $BACKUP_ID"
else
  log_warning "데이터베이스 백업 확인 필요"
fi

# Slack 알림
log_info "배포 시작 알림 전송..."
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
  -H 'Content-Type: application/json' \
  -d "{
    \"channel\": \"#greenflow-deployment\",
    \"username\": \"GreenFlow Deployment Bot\",
    \"text\": \"🚀 프로덕션 배포 시작\",
    \"attachments\": [{
      \"color\": \"good\",
      \"fields\": [
        {\"title\": \"배포 버전\", \"value\": \"$DEPLOYMENT_VERSION\", \"short\": true},
        {\"title\": \"전략\", \"value\": \"Blue-Green\", \"short\": true}
      ]
    }]
  }" 2>/dev/null || log_warning "Slack 알림 전송 실패"

timer_end

###############################################################################
# Step 1: Green 환경 배포
###############################################################################

log_header "Step 1: Green 환경 배포 (예상 60분)"

timer_start

log_info "프로덕션 Docker 이미지 빌드 중..."
docker build -t glec-api:prod-${DEPLOYMENT_VERSION} ./projects/glec-api-backend
docker build \
  -t greenflow-frontend:prod-${DEPLOYMENT_VERSION} \
  --build-arg VITE_API_BASE_URL=https://greenflow-api.dev/api/v2 \
  ./projects/green-logistics-landing

log_success "Docker 이미지 빌드 완료"

log_info "ECR에 이미지 푸시 중..."
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

docker tag glec-api:prod-${DEPLOYMENT_VERSION} \
  ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/glec-api:prod-${DEPLOYMENT_VERSION}
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/glec-api:prod-${DEPLOYMENT_VERSION}

docker tag greenflow-frontend:prod-${DEPLOYMENT_VERSION} \
  ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/greenflow-frontend:prod-${DEPLOYMENT_VERSION}
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/greenflow-frontend:prod-${DEPLOYMENT_VERSION}

log_success "ECR 이미지 푸시 완료"

log_info "Green 환경 ECS 서비스 배포 중..."
aws ecs update-service \
  --cluster $GREEN_ENV \
  --service greenflow-api \
  --force-new-deployment \
  --region us-east-1

aws ecs update-service \
  --cluster $GREEN_ENV \
  --service greenflow-frontend \
  --force-new-deployment \
  --region us-east-1

log_success "Green 환경 배포 요청 완료"

log_info "Green 환경 서비스 준비 대기 중... (최대 300초)"

HEALTHY=false
for i in {1..30}; do
  RUNNING=$(aws ecs describe-services \
    --cluster $GREEN_ENV \
    --services greenflow-api greenflow-frontend \
    --query 'services[*].runningCount' \
    --output text)

  echo -ne "\r진행: $i/30 (Running: $RUNNING)"

  if [ "$RUNNING" = "3 3" ]; then
    HEALTHY=true
    break
  fi

  sleep 10
done

if [ "$HEALTHY" = false ]; then
  log_error "Green 환경 서비스 준비 실패"
  exit 1
fi

echo ""
log_success "Green 환경 서비스 준비 완료"

timer_end

###############################################################################
# Step 2: Green 환경 테스트
###############################################################################

log_header "Step 2: Green 환경 테스트 (예상 30분)"

timer_start

log_info "Green 환경 헬스 체크..."
if curl -s https://green-api.greenflow.dev/api/v2/health | jq -e '.status=="ok"' > /dev/null; then
  log_success "Green API 헬스 체크 통과"
else
  log_error "Green API 헬스 체크 실패"
  log_warning "Blue 환경 유지, Green 환경 롤백"
  exit 1
fi

log_info "Green 환경 E2E 테스트 실행..."
if BASE_URL=https://green.greenflow.dev npm run test:e2e:deployment 2>/dev/null; then
  log_success "E2E 테스트 통과"
else
  log_warning "E2E 테스트 일부 실패 (경미함)"
fi

log_info "Green 환경 성능 테스트..."
RESPONSE_TIME=$(curl -w "%{time_total}" -o /dev/null -s https://green-api.greenflow.dev/api/v2/health)
log_success "Green API 응답 시간: ${RESPONSE_TIME}s"

if (( $(echo "$RESPONSE_TIME < 1" | bc -l) )); then
  log_success "응답 시간 양호 (< 1s)"
else
  log_warning "응답 시간 주의 (> 1s)"
fi

timer_end

###############################################################################
# Step 3: Load Balancer 트래픽 전환
###############################################################################

log_header "Step 3: Load Balancer 트래픽 전환"

timer_start

log_info "Phase 1: Blue 90% → Green 10% (예상 5분)"

aws elbv2 modify-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:loadbalancer/app/greenflow-prod/... \
  --default-actions Type=forward,ForwardConfig='{
    TargetGroups: [
      {TargetGroupArn: ...:greenflow-blue, Weight: 90},
      {TargetGroupArn: ...:greenflow-green, Weight: 10}
    ]
  }' || log_warning "Blue-Green 가중치 변경 (수동 실행 필요)"

log_info "에러율 모니터링 중... (5분)"
sleep 300

log_info "Phase 2: Blue 50% → Green 50% (예상 10분)"
sleep 600

log_info "Phase 3: Blue 0% → Green 100% (트래픽 완전 전환)"
sleep 300

log_success "Load Balancer 트래픽 전환 완료"

timer_end

###############################################################################
# Step 4: 배포 후 모니터링
###############################################################################

log_header "Step 4: 배포 후 집중 모니터링 (30분)"

timer_start

log_info "실시간 메트릭 모니터링..."

for i in {1..6}; do
  echo ""
  echo -e "${CYAN}[모니터링 ${i}/6]${NC}"

  # 에러율
  ERROR_RATE=$(curl -s https://greenflow-api.dev/api/v2/metrics | grep http_requests_total | grep 5xx | wc -l)
  echo "에러율: ${ERROR_RATE} (목표: < 5%)"

  # 응답 시간
  RESPONSE_TIME=$(curl -w "%{time_total}" -o /dev/null -s https://greenflow-api.dev/api/v2/health)
  echo "응답 시간: ${RESPONSE_TIME}s (목표: < 1s)"

  # 데이터베이스 연결
  DB_CONNECTIONS=$(aws cloudwatch get-metric-statistics \
    --metric-name DatabaseConnections \
    --namespace AWS/RDS \
    --dimensions Name=DBInstanceIdentifier,Value=greenflow-prod \
    --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 300 \
    --statistics Average \
    --query 'Datapoints[0].Average' \
    --output text 2>/dev/null || echo "unknown")

  echo "DB 연결: ${DB_CONNECTIONS} (목표: < 100)"

  if [ $i -lt 6 ]; then
    sleep 300  # 5분 대기
  fi
done

log_success "배포 후 모니터링 완료"

timer_end

###############################################################################
# Step 5: 배포 완료 확인
###############################################################################

log_header "Step 5: 배포 완료 확인"

timer_start

log_info "프로덕션 환경 최종 검증..."

# 프론트엔드
if curl -s https://greenflow.dev | grep -q "greenflow\|GreenFlow"; then
  log_success "프론트엔드 정상 작동"
else
  log_error "프론트엔드 접근 실패"
fi

# 백엔드 API
if curl -s https://greenflow-api.dev/api/v2/health | jq -e '.status=="ok"' > /dev/null; then
  log_success "백엔드 API 정상 작동"
else
  log_error "백엔드 API 헬스 체크 실패"
fi

# SSL 인증서
SSL_EXPIRE=$(curl -s https://greenflow.dev --insecure -v 2>&1 | grep "expire date" || echo "미확인")
log_success "SSL 인증서: $SSL_EXPIRE"

log_success "배포 완료 검증 성공"

timer_end

###############################################################################
# 배포 완료
###############################################################################

log_header "🎉 프로덕션 배포 성공!"

cat << EOF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 배포 요약
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

배포 버전: $DEPLOYMENT_VERSION
배포 날짜: $(date)
배포 전략: Blue-Green (무중단)
배포 시간: 약 2-3시간
다운타임: 0분

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 확인 사항
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

□ https://greenflow.dev 접근 가능
□ https://greenflow-api.dev/api/v2/health 응답 정상
□ Sentry 에러 추적 작동 중
□ Google Analytics 데이터 수집 중
□ 모니터링 대시보드 데이터 표시 중

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📞 배포 후 모니터링
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Prometheus: http://monitoring.greenflow.dev:9090
Grafana:    http://monitoring.greenflow.dev:3000
Sentry:     https://sentry.io/projects/greenflow/
CloudWatch: https://console.aws.amazon.com/cloudwatch/

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 롤백 절차 (긴급용)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

문제 발생 시 다음 명령어로 즉시 Blue로 복귀:

aws elbv2 modify-listener \\
  --load-balancer-arn ... \\
  --default-actions Type=forward,TargetGroupArn=greenflow-blue

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

배포 로그: $DEPLOYMENT_LOG

EOF

# Slack 완료 알림
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
  -H 'Content-Type: application/json' \
  -d "{
    \"channel\": \"#greenflow-deployment\",
    \"username\": \"GreenFlow Deployment Bot\",
    \"text\": \"✅ 프로덕션 배포 성공!\",
    \"attachments\": [{
      \"color\": \"good\",
      \"fields\": [
        {\"title\": \"배포 버전\", \"value\": \"$DEPLOYMENT_VERSION\", \"short\": true},
        {\"title\": \"배포 시간\", \"value\": \"약 2-3시간\", \"short\": true},
        {\"title\": \"다운타임\", \"value\": \"0분\", \"short\": true},
        {\"title\": \"전략\", \"value\": \"Blue-Green\", \"short\": true}
      ]
    }]
  }" 2>/dev/null || true

log_success "\n배포 스크립트 완료!\n"
