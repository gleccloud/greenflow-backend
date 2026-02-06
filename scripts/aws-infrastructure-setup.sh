#!/bin/bash

###############################################################################
# GreenFlow AWS 스테이징 인프라 자동 구성 스크립트
# 용도: RDS, ElastiCache, ECS, ECR, S3 등 자동 생성
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

# 설정 값
AWS_REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="${ENVIRONMENT:-staging}"
PROJECT_NAME="greenflow"
STACK_NAME="${PROJECT_NAME}-${ENVIRONMENT}"

# RDS 설정
DB_NAME="greenflow_${ENVIRONMENT}"
DB_INSTANCE_CLASS="db.t3.micro"
DB_STORAGE="20"
DB_ENGINE="postgres"
DB_ENGINE_VERSION="17.2"

# ElastiCache 설정
REDIS_NODE_TYPE="cache.t3.micro"
REDIS_ENGINE="redis"
REDIS_ENGINE_VERSION="7.2"
REDIS_NUM_CACHE_NODES="1"

# ECS 설정
ECS_CLUSTER_NAME="${PROJECT_NAME}-${ENVIRONMENT}"
ECS_SERVICE_NAME="${PROJECT_NAME}-api"
ECS_TASK_FAMILY="${PROJECT_NAME}-backend"

# ECR 설정
ECR_REPO_NAME="glec-api"

###############################################################################
# 1단계: 선행 조건 검증
###############################################################################

log_info "=== AWS 스테이징 인프라 구성 시작 ==="
log_info "1단계: 선행 조건 검증...\n"

# AWS CLI 확인
if ! command -v aws &> /dev/null; then
  log_error "AWS CLI가 설치되지 않았습니다"
  exit 1
fi

log_success "AWS CLI 설치됨 ($(aws --version))"

# AWS 자격증명 확인
if ! aws sts get-caller-identity &> /dev/null; then
  log_error "AWS 자격증명이 유효하지 않습니다"
  exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
log_success "AWS 계정 확인됨 (Account ID: $ACCOUNT_ID)"

# AWS 지역 확인
log_success "배포 지역: $AWS_REGION"

###############################################################################
# 2단계: VPC 및 보안 그룹 설정
###############################################################################

log_info "\n2단계: VPC 및 보안 그룹 설정...\n"

# 기본 VPC ID 조회
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=isDefault,Values=true" \
  --query 'Vpcs[0].VpcId' \
  --output text \
  --region $AWS_REGION)

if [ -z "$VPC_ID" ] || [ "$VPC_ID" = "None" ]; then
  log_warning "기본 VPC가 없습니다. 새로 생성합니다."
  # VPC 생성 (선택사항)
else
  log_success "기본 VPC 확인됨 ($VPC_ID)"
fi

# RDS용 보안 그룹 생성
RDS_SG_NAME="${PROJECT_NAME}-${ENVIRONMENT}-rds-sg"
log_info "RDS 보안 그룹 생성: $RDS_SG_NAME"

RDS_SG_ID=$(aws ec2 create-security-group \
  --group-name "$RDS_SG_NAME" \
  --description "RDS for ${PROJECT_NAME} ${ENVIRONMENT}" \
  --vpc-id "$VPC_ID" \
  --region $AWS_REGION \
  --output text 2>/dev/null || echo "exists")

if [ "$RDS_SG_ID" != "exists" ]; then
  # PostgreSQL 포트 (5432) 허용
  aws ec2 authorize-security-group-ingress \
    --group-id "$RDS_SG_ID" \
    --protocol tcp \
    --port 5432 \
    --cidr 0.0.0.0/0 \
    --region $AWS_REGION 2>/dev/null || true

  log_success "RDS 보안 그룹 생성 완료 ($RDS_SG_ID)"
else
  RDS_SG_ID=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=$RDS_SG_NAME" \
    --query 'SecurityGroups[0].GroupId' \
    --output text \
    --region $AWS_REGION)
  log_warning "RDS 보안 그룹 이미 존재 ($RDS_SG_ID)"
fi

# ElastiCache용 보안 그룹 생성
REDIS_SG_NAME="${PROJECT_NAME}-${ENVIRONMENT}-redis-sg"
log_info "Redis 보안 그룹 생성: $REDIS_SG_NAME"

REDIS_SG_ID=$(aws ec2 create-security-group \
  --group-name "$REDIS_SG_NAME" \
  --description "ElastiCache Redis for ${PROJECT_NAME} ${ENVIRONMENT}" \
  --vpc-id "$VPC_ID" \
  --region $AWS_REGION \
  --output text 2>/dev/null || echo "exists")

if [ "$REDIS_SG_ID" != "exists" ]; then
  # Redis 포트 (6379) 허용
  aws ec2 authorize-security-group-ingress \
    --group-id "$REDIS_SG_ID" \
    --protocol tcp \
    --port 6379 \
    --cidr 0.0.0.0/0 \
    --region $AWS_REGION 2>/dev/null || true

  log_success "Redis 보안 그룹 생성 완료 ($REDIS_SG_ID)"
else
  REDIS_SG_ID=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=$REDIS_SG_NAME" \
    --query 'SecurityGroups[0].GroupId' \
    --output text \
    --region $AWS_REGION)
  log_warning "Redis 보안 그룹 이미 존재 ($REDIS_SG_ID)"
fi

###############################################################################
# 3단계: RDS PostgreSQL 생성
###############################################################################

log_info "\n3단계: RDS PostgreSQL 스테이징 인스턴스 생성...\n"

RDS_INSTANCE_ID="${PROJECT_NAME}-${ENVIRONMENT}-db"

# RDS 인스턴스 생성 또는 기존 확인
RDS_STATUS=$(aws rds describe-db-instances \
  --db-instance-identifier "$RDS_INSTANCE_ID" \
  --region $AWS_REGION \
  --query 'DBInstances[0].DBInstanceStatus' \
  --output text 2>/dev/null || echo "not-found")

if [ "$RDS_STATUS" = "not-found" ]; then
  log_info "RDS PostgreSQL 인스턴스 생성 중..."

  aws rds create-db-instance \
    --db-instance-identifier "$RDS_INSTANCE_ID" \
    --db-instance-class "$DB_INSTANCE_CLASS" \
    --engine "$DB_ENGINE" \
    --engine-version "$DB_ENGINE_VERSION" \
    --master-username postgres \
    --master-user-password "$(openssl rand -base64 32)" \
    --allocated-storage "$DB_STORAGE" \
    --storage-type gp3 \
    --vpc-security-group-ids "$RDS_SG_ID" \
    --publicly-accessible \
    --backup-retention-period 7 \
    --enable-cloudwatch-logs-exports postgresql \
    --db-name "$DB_NAME" \
    --region $AWS_REGION \
    --tags "Key=Environment,Value=$ENVIRONMENT" "Key=Project,Value=$PROJECT_NAME"

  log_success "RDS PostgreSQL 인스턴스 생성 시작 ($RDS_INSTANCE_ID)"
  log_warning "완료까지 약 5-10분 소요됩니다"
else
  log_warning "RDS PostgreSQL 인스턴스 이미 존재 (상태: $RDS_STATUS)"
fi

###############################################################################
# 4단계: ElastiCache Redis 생성
###############################################################################

log_info "\n4단계: ElastiCache Redis 스테이징 클러스터 생성...\n"

REDIS_CLUSTER_ID="${PROJECT_NAME}-${ENVIRONMENT}-redis"

# ElastiCache 클러스터 생성 또는 기존 확인
REDIS_STATUS=$(aws elasticache describe-cache-clusters \
  --cache-cluster-id "$REDIS_CLUSTER_ID" \
  --region $AWS_REGION \
  --query 'CacheClusters[0].CacheClusterStatus' \
  --output text 2>/dev/null || echo "not-found")

if [ "$REDIS_STATUS" = "not-found" ]; then
  log_info "ElastiCache Redis 클러스터 생성 중..."

  aws elasticache create-cache-cluster \
    --cache-cluster-id "$REDIS_CLUSTER_ID" \
    --cache-node-type "$REDIS_NODE_TYPE" \
    --engine "$REDIS_ENGINE" \
    --engine-version "$REDIS_ENGINE_VERSION" \
    --num-cache-nodes "$REDIS_NUM_CACHE_NODES" \
    --cache-parameter-group-name "default.redis7" \
    --security-group-ids "$REDIS_SG_ID" \
    --tags "Key=Environment,Value=$ENVIRONMENT" "Key=Project,Value=$PROJECT_NAME" \
    --region $AWS_REGION

  log_success "ElastiCache Redis 클러스터 생성 시작 ($REDIS_CLUSTER_ID)"
  log_warning "완료까지 약 3-5분 소요됩니다"
else
  log_warning "ElastiCache Redis 클러스터 이미 존재 (상태: $REDIS_STATUS)"
fi

###############################################################################
# 5단계: S3 버킷 생성
###############################################################################

log_info "\n5단계: S3 버킷 생성...\n"

S3_BUCKET_NAME="${PROJECT_NAME}-${ENVIRONMENT}-${ACCOUNT_ID}"

# S3 버킷 생성 또는 기존 확인
if aws s3api head-bucket --bucket "$S3_BUCKET_NAME" --region $AWS_REGION 2>/dev/null; then
  log_warning "S3 버킷 이미 존재 ($S3_BUCKET_NAME)"
else
  log_info "S3 버킷 생성 중..."

  aws s3api create-bucket \
    --bucket "$S3_BUCKET_NAME" \
    --region $AWS_REGION \
    --create-bucket-configuration LocationConstraint=$AWS_REGION \
    2>/dev/null || aws s3api create-bucket --bucket "$S3_BUCKET_NAME"

  # 버지닝 활성화
  aws s3api put-bucket-versioning \
    --bucket "$S3_BUCKET_NAME" \
    --versioning-configuration Status=Enabled \
    --region $AWS_REGION

  # 암호화 설정
  aws s3api put-bucket-encryption \
    --bucket "$S3_BUCKET_NAME" \
    --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}' \
    --region $AWS_REGION

  log_success "S3 버킷 생성 완료 ($S3_BUCKET_NAME)"
fi

###############################################################################
# 6단계: ECR 리포지토리 생성
###############################################################################

log_info "\n6단계: ECR 리포지토리 생성...\n"

# ECR 리포지토리 생성 또는 기존 확인
ECR_REPO_URI=$(aws ecr describe-repositories \
  --repository-names "$ECR_REPO_NAME" \
  --region $AWS_REGION \
  --query 'repositories[0].repositoryUri' \
  --output text 2>/dev/null || echo "not-found")

if [ "$ECR_REPO_URI" = "not-found" ]; then
  log_info "ECR 리포지토리 생성 중..."

  ECR_REPO_URI=$(aws ecr create-repository \
    --repository-name "$ECR_REPO_NAME" \
    --encryption-configuration encryptionType=AES256 \
    --image-scanning-configuration scanOnPush=true \
    --tags "Key=Environment,Value=$ENVIRONMENT" "Key=Project,Value=$PROJECT_NAME" \
    --region $AWS_REGION \
    --query 'repository.repositoryUri' \
    --output text)

  log_success "ECR 리포지토리 생성 완료 ($ECR_REPO_URI)"
else
  log_warning "ECR 리포지토리 이미 존재 ($ECR_REPO_URI)"
fi

###############################################################################
# 7단계: ECS 클러스터 생성
###############################################################################

log_info "\n7단계: ECS 클러스터 생성...\n"

# ECS 클러스터 생성 또는 기존 확인
CLUSTER_STATUS=$(aws ecs describe-clusters \
  --clusters "$ECS_CLUSTER_NAME" \
  --region $AWS_REGION \
  --query 'clusters[0].status' \
  --output text 2>/dev/null || echo "not-found")

if [ "$CLUSTER_STATUS" = "not-found" ]; then
  log_info "ECS 클러스터 생성 중..."

  aws ecs create-cluster \
    --cluster-name "$ECS_CLUSTER_NAME" \
    --capacity-providers FARGATE FARGATE_SPOT \
    --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1,base=1 \
    --tags "key=Environment,value=$ENVIRONMENT" "key=Project,value=$PROJECT_NAME" \
    --region $AWS_REGION

  log_success "ECS 클러스터 생성 완료 ($ECS_CLUSTER_NAME)"
else
  log_warning "ECS 클러스터 이미 존재 (상태: $CLUSTER_STATUS)"
fi

###############################################################################
# 8단계: CloudWatch 로그 그룹 생성
###############################################################################

log_info "\n8단계: CloudWatch 로그 그룹 생성...\n"

LOG_GROUP_NAME="/ecs/${PROJECT_NAME}-${ENVIRONMENT}"

# CloudWatch 로그 그룹 생성
if aws logs describe-log-groups \
  --log-group-name-prefix "$LOG_GROUP_NAME" \
  --region $AWS_REGION \
  --query 'logGroups[0].logGroupName' \
  --output text 2>/dev/null | grep -q "$LOG_GROUP_NAME"; then

  log_warning "CloudWatch 로그 그룹 이미 존재 ($LOG_GROUP_NAME)"
else
  log_info "CloudWatch 로그 그룹 생성 중..."

  aws logs create-log-group \
    --log-group-name "$LOG_GROUP_NAME" \
    --region $AWS_REGION

  # 보관 정책 설정 (30일)
  aws logs put-retention-policy \
    --log-group-name "$LOG_GROUP_NAME" \
    --retention-in-days 30 \
    --region $AWS_REGION

  log_success "CloudWatch 로그 그룹 생성 완료 ($LOG_GROUP_NAME)"
fi

###############################################################################
# 최종 요약
###############################################################################

log_success "\n✨ AWS 스테이징 인프라 구성 완료!\n"

cat << EOF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 생성된 리소스 요약:

【RDS PostgreSQL】
  • 인스턴스 ID: $RDS_INSTANCE_ID
  • 클래스: $DB_INSTANCE_CLASS
  • 스토리지: ${DB_STORAGE}GB gp3
  • 데이터베이스: $DB_NAME
  • 상태: 생성 중 (5-10분)

【ElastiCache Redis】
  • 클러스터 ID: $REDIS_CLUSTER_ID
  • 노드 타입: $REDIS_NODE_TYPE
  • 엔진 버전: $REDIS_ENGINE_VERSION
  • 상태: 생성 중 (3-5분)

【S3 버킷】
  • 버킷명: $S3_BUCKET_NAME
  • 암호화: AES256
  • 버지닝: 활성화

【ECR 리포지토리】
  • 리포지토리 URI: $ECR_REPO_URI
  • 스캔: 활성화

【ECS 클러스터】
  • 클러스터명: $ECS_CLUSTER_NAME
  • 용량 제공자: FARGATE, FARGATE_SPOT

【CloudWatch 로그】
  • 로그 그룹: $LOG_GROUP_NAME
  • 보관 기간: 30일

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 다음 단계:

1️⃣  RDS/Redis 준비 대기 (5-15분)
    aws rds describe-db-instances --db-instance-identifier $RDS_INSTANCE_ID --region $AWS_REGION
    aws elasticache describe-cache-clusters --cache-cluster-id $REDIS_CLUSTER_ID --region $AWS_REGION

2️⃣  RDS 마이그레이션 실행
    npm run db:migrate --env=staging

3️⃣  Docker 이미지 ECR로 푸시
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
    docker tag glec-api:staging $ECR_REPO_URI:staging
    docker push $ECR_REPO_URI:staging

4️⃣  ECS Task Definition 생성
    (STAGING_DEPLOYMENT_CHECKLIST.md 참조)

5️⃣  ECS 서비스 생성
    aws ecs create-service --cluster $ECS_CLUSTER_NAME --service-name $ECS_SERVICE_NAME ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  주의사항:

  • RDS/Redis 생성 완료까지 약 5-15분 소요
  • 마스터 패스워드는 안전한 위치에 저장하세요
  • VPC 서브넷 및 라우팅 테이블 확인이 필요할 수 있습니다
  • Production 환경 구성 전에 해당 리소스 검토하세요

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📖 참조:
  • STAGING_DEPLOYMENT_CHECKLIST.md
  • DEPLOYMENT_TIMELINE.md
  • Slack: #greenflow-deployment

EOF

log_success "AWS 인프라 구성 스크립트 완료!\n"
