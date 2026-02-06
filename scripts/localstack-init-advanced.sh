#!/bin/bash

###############################################################################
# GreenFlow LocalStack 초기화 스크립트 (고급)
# 용도: LocalStack에서 필요한 AWS 리소스 자동 생성
###############################################################################

set -e

echo "=========================================="
echo "LocalStack 초기화 시작"
echo "=========================================="

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

# AWS CLI 구성
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1

# LocalStack 엔드포인트 (Docker 네트워크 내에서는 호스트명 사용)
LOCALSTACK_ENDPOINT="http://localstack:4566"

# 최대 재시도 횟수
MAX_RETRIES=30
RETRY_INTERVAL=2

###############################################################################
# 1단계: LocalStack 준비 대기
###############################################################################

log_info "LocalStack 준비 대기 중..."

for i in $(seq 1 $MAX_RETRIES); do
  if aws s3api list-buckets --endpoint-url=$LOCALSTACK_ENDPOINT &>/dev/null; then
    log_success "LocalStack 준비 완료"
    break
  fi

  if [ $i -eq $MAX_RETRIES ]; then
    echo "❌ LocalStack 준비 실패"
    exit 1
  fi

  echo -ne "\r진행: $i/$MAX_RETRIES"
  sleep $RETRY_INTERVAL
done

###############################################################################
# 2단계: S3 버킷 생성
###############################################################################

log_info "\n2단계: S3 버킷 생성..."

BUCKETS=(
  "greenflow-dev"
  "greenflow-uploads"
  "greenflow-logs"
  "greenflow-backups"
)

for BUCKET in "${BUCKETS[@]}"; do
  if ! aws s3api head-bucket --bucket "$BUCKET" --endpoint-url=$LOCALSTACK_ENDPOINT 2>/dev/null; then
    aws s3api create-bucket \
      --bucket "$BUCKET" \
      --endpoint-url=$LOCALSTACK_ENDPOINT \
      --region us-east-1

    # 버킷 암호화 설정
    aws s3api put-bucket-encryption \
      --bucket "$BUCKET" \
      --server-side-encryption-configuration '{
        "Rules": [
          {
            "ApplyServerSideEncryptionByDefault": {
              "SSEAlgorithm": "AES256"
            }
          }
        ]
      }' \
      --endpoint-url=$LOCALSTACK_ENDPOINT

    # 버전 관리 활성화
    aws s3api put-bucket-versioning \
      --bucket "$BUCKET" \
      --versioning-configuration Status=Enabled \
      --endpoint-url=$LOCALSTACK_ENDPOINT

    log_success "S3 버킷 생성: $BUCKET"
  else
    log_warning "S3 버킷 이미 존재: $BUCKET"
  fi
done

###############################################################################
# 3단계: DynamoDB 테이블 생성
###############################################################################

log_info "\n3단계: DynamoDB 테이블 생성..."

# 사용자 선호도 테이블
aws dynamodb create-table \
  --table-name greenflow-user-preferences \
  --attribute-definitions \
    AttributeName=user_id,AttributeType=S \
  --key-schema \
    AttributeName=user_id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url=$LOCALSTACK_ENDPOINT 2>/dev/null || log_warning "테이블 이미 존재: greenflow-user-preferences"

log_success "DynamoDB 테이블 생성: greenflow-user-preferences"

# 감사 로그 테이블
aws dynamodb create-table \
  --table-name greenflow-audit-logs \
  --attribute-definitions \
    AttributeName=event_id,AttributeType=S \
    AttributeName=timestamp,AttributeType=N \
  --key-schema \
    AttributeName=event_id,KeyType=HASH \
    AttributeName=timestamp,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url=$LOCALSTACK_ENDPOINT 2>/dev/null || log_warning "테이블 이미 존재: greenflow-audit-logs"

log_success "DynamoDB 테이블 생성: greenflow-audit-logs"

###############################################################################
# 4단계: SQS 큐 생성
###############################################################################

log_info "\n4단계: SQS 큐 생성..."

QUEUES=(
  "greenflow-notifications"
  "greenflow-order-processing"
  "greenflow-email-sending"
  "greenflow-analytics"
  "greenflow-dlq"
)

for QUEUE in "${QUEUES[@]}"; do
  aws sqs create-queue \
    --queue-name "$QUEUE" \
    --endpoint-url=$LOCALSTACK_ENDPOINT \
    --attributes '{"VisibilityTimeout": "300", "MessageRetentionPeriod": "1209600"}' \
    2>/dev/null || log_warning "큐 이미 존재: $QUEUE"

  log_success "SQS 큐 생성: $QUEUE"
done

###############################################################################
# 5단계: SNS 토픽 생성
###############################################################################

log_info "\n5단계: SNS 토픽 생성..."

TOPICS=(
  "greenflow-notifications"
  "greenflow-order-events"
  "greenflow-alert"
)

for TOPIC in "${TOPICS[@]}"; do
  aws sns create-topic \
    --name "$TOPIC" \
    --endpoint-url=$LOCALSTACK_ENDPOINT \
    2>/dev/null || log_warning "토픽 이미 존재: $TOPIC"

  log_success "SNS 토픽 생성: $TOPIC"
done

###############################################################################
# 6단계: KMS 키 생성
###############################################################################

log_info "\n6단계: KMS 키 생성..."

# KMS 키 생성
KMS_KEY_ID=$(aws kms create-key \
  --description "GreenFlow encryption key" \
  --endpoint-url=$LOCALSTACK_ENDPOINT \
  --query 'KeyMetadata.KeyId' \
  --output text 2>/dev/null || echo "exists")

if [ "$KMS_KEY_ID" != "exists" ]; then
  log_success "KMS 키 생성: $KMS_KEY_ID"

  # Alias 생성
  aws kms create-alias \
    --alias-name alias/greenflow-key \
    --target-key-id "$KMS_KEY_ID" \
    --endpoint-url=$LOCALSTACK_ENDPOINT 2>/dev/null || true
else
  log_warning "KMS 키 이미 존재"
fi

###############################################################################
# 7단계: Secrets Manager에 시크릿 생성
###############################################################################

log_info "\n7단계: Secrets Manager 시크릿 생성..."

SECRETS=(
  "greenflow/db/password:greenflow_password"
  "greenflow/jwt/secret:test-jwt-secret-key-change-in-production"
  "greenflow/api/key:test-api-key-12345"
  "greenflow/stripe/secret:sk_test_123456789"
  "greenflow/sendgrid/key:SG.test123456"
)

for SECRET in "${SECRETS[@]}"; do
  IFS=':' read -r NAME VALUE <<< "$SECRET"

  aws secretsmanager create-secret \
    --name "$NAME" \
    --secret-string "$VALUE" \
    --endpoint-url=$LOCALSTACK_ENDPOINT \
    2>/dev/null || log_warning "시크릿 이미 존재: $NAME"

  log_success "Secrets Manager 시크릿 생성: $NAME"
done

###############################################################################
# 8단계: CloudWatch 로그 그룹 생성
###############################################################################

log_info "\n8단계: CloudWatch 로그 그룹 생성..."

LOG_GROUPS=(
  "/greenflow/api"
  "/greenflow/database"
  "/greenflow/cache"
  "/greenflow/jobs"
  "/greenflow/errors"
)

for LOG_GROUP in "${LOG_GROUPS[@]}"; do
  aws logs create-log-group \
    --log-group-name "$LOG_GROUP" \
    --endpoint-url=$LOCALSTACK_ENDPOINT \
    2>/dev/null || log_warning "로그 그룹 이미 존재: $LOG_GROUP"

  # 보관 정책 설정 (7일)
  aws logs put-retention-policy \
    --log-group-name "$LOG_GROUP" \
    --retention-in-days 7 \
    --endpoint-url=$LOCALSTACK_ENDPOINT \
    2>/dev/null || true

  log_success "CloudWatch 로그 그룹 생성: $LOG_GROUP"
done

###############################################################################
# 9단계: IAM 역할 생성
###############################################################################

log_info "\n9단계: IAM 역할 생성..."

# Trust Policy
cat > /tmp/trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# IAM 역할 생성
aws iam create-role \
  --role-name greenflow-task-role \
  --assume-role-policy-document file:///tmp/trust-policy.json \
  --endpoint-url=$LOCALSTACK_ENDPOINT \
  2>/dev/null || log_warning "IAM 역할 이미 존재: greenflow-task-role"

log_success "IAM 역할 생성: greenflow-task-role"

# 정책 추가
cat > /tmp/policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:*",
        "dynamodb:*",
        "sqs:*",
        "sns:*",
        "kms:*",
        "secretsmanager:*",
        "logs:*"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name greenflow-task-role \
  --policy-name greenflow-policy \
  --policy-document file:///tmp/policy.json \
  --endpoint-url=$LOCALSTACK_ENDPOINT \
  2>/dev/null || log_warning "정책 이미 적용: greenflow-policy"

log_success "IAM 정책 추가: greenflow-policy"

###############################################################################
# 완료
###############################################################################

echo ""
echo "=========================================="
echo "✅ LocalStack 초기화 완료!"
echo "=========================================="
echo ""
echo "생성된 리소스:"
echo "  • S3 버킷: 4개"
echo "  • DynamoDB 테이블: 2개"
echo "  • SQS 큐: 5개"
echo "  • SNS 토픽: 3개"
echo "  • KMS 키: 1개"
echo "  • Secrets Manager 시크릿: 5개"
echo "  • CloudWatch 로그 그룹: 5개"
echo "  • IAM 역할: 1개"
echo ""
echo "다음 단계:"
echo "  1. 백엔드 API 시작: npm run start"
echo "  2. 프론트엔드 개발 서버: npm run dev"
echo "  3. LocalStack 콘솔: http://localhost:8080"
echo "  4. pgAdmin: http://localhost:5050"
echo "  5. Prometheus: http://localhost:9090"
echo "  6. Grafana: http://localhost:3001"
echo "  7. Redis Commander: http://localhost:8081"
echo ""
echo "=========================================="
