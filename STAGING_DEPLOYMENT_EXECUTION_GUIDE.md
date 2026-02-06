# GreenFlow 스테이징 배포 실행 가이드

**작성일**: 2026-02-04
**상태**: ✅ **배포 준비 완료 - 실행 단계**
**다음 시작**: 2026-02-05 09:00 UTC

---

## 🚀 배포 실행 단계별 가이드

### 📋 사전 준비 (2026-02-04)

배포 전에 다음을 확인하세요:

```bash
# ✅ 확인 항목
□ AWS 계정 로그인 확인
□ AWS CLI 설치 및 설정 (aws configure)
□ Docker 이미지 2개 준비 완료 (glec-api:staging, greenflow-frontend:staging)
□ .env.staging 파일 확인
□ Vercel 계정 준비
□ Route53 호스팅 영역 생성 (greenflow.dev)
```

### 📋 사전 환경 변수 설정

```bash
# AWS 지역 설정 (기본값: us-east-1)
export AWS_REGION="us-east-1"
export ENVIRONMENT="staging"
export PROJECT_NAME="greenflow"
export ACCOUNT_ID="123456789012"  # 본인의 AWS 계정 ID

# 도메인 설정
export DOMAIN_NAME="greenflow.dev"
export HOSTED_ZONE_ID="Z1234567890ABC"  # Route53 호스팅 영역 ID
```

---

## 🎯 2026-02-05 배포 실행 일정

### ⏰ 09:00 - AWS 인프라 구성 (60분 예상)

#### 1단계: AWS 인프라 자동 구성 (10분)

```bash
# 1-1. AWS 인프라 구성 스크립트 실행
bash scripts/aws-infrastructure-setup.sh

# 예상 출력:
# ✅ AWS CLI 설치됨
# ✅ AWS 계정 확인됨 (Account ID: XXXX)
# ✅ RDS 보안 그룹 생성 완료
# ✅ RDS PostgreSQL 인스턴스 생성 시작
# ✅ ElastiCache Redis 클러스터 생성 시작
# ... 기타 리소스 생성
```

#### 2단계: 생성 진행 상황 모니터링 (50분)

RDS와 ElastiCache 인스턴스 생성까지 약 5-15분 소요됩니다.

```bash
# 2-1. RDS 인스턴스 생성 상태 확인
aws rds describe-db-instances \
  --db-instance-identifier greenflow-staging-db \
  --region $AWS_REGION \
  --query 'DBInstances[0].DBInstanceStatus' \
  --output text

# 예상 상태: creating → backing-up → available

# 2-2. ElastiCache 클러스터 상태 확인
aws elasticache describe-cache-clusters \
  --cache-cluster-id greenflow-staging-redis \
  --region $AWS_REGION \
  --query 'CacheClusters[0].CacheClusterStatus' \
  --output text

# 예상 상태: creating → available

# 2-3. 상태가 "available"이 될 때까지 기다립니다
watch -n 10 'aws rds describe-db-instances --db-instance-identifier greenflow-staging-db --region $AWS_REGION --query "DBInstances[0].DBInstanceStatus" --output text'
```

#### 3단계: RDS 엔드포인트 및 마스터 암호 저장

```bash
# 3-1. RDS 엔드포인트 조회
RDS_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier greenflow-staging-db \
  --region $AWS_REGION \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo "RDS Endpoint: $RDS_ENDPOINT"

# 3-2. Redis 엔드포인트 조회
REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters \
  --cache-cluster-id greenflow-staging-redis \
  --region $AWS_REGION \
  --query 'CacheClusters[0].CacheNodes[0].Address' \
  --output text)

echo "Redis Endpoint: $REDIS_ENDPOINT"

# 3-3. AWS Secrets Manager에 마스터 암호 저장
# (RDS 생성 시 생성된 마스터 암호를 안전한 위치에 저장)
```

---

### ⏰ 14:00 - Vercel 프론트엔드 배포 (30분 예상)

#### 4단계: Vercel 프로젝트 연결

```bash
# 4-1. Vercel 프로젝트 디렉토리로 이동
cd projects/green-logistics-landing

# 4-2. Vercel 프로젝트 연결
vercel link --confirm

# 4-3. 프로젝트 ID 확인 (자동으로 .vercelignore 및 설정 생성)
cat .vercel/project.json | jq .projectId

# 4-4. 환경 변수 설정
# Option 1: Vercel CLI 사용
vercel env add VITE_API_BASE_URL "https://staging-api.greenflow.dev/api/v2"
vercel env add VITE_GA_MEASUREMENT_ID "G-STAGING_MEASUREMENT_ID"
vercel env add VITE_SENTRY_DSN "https://staging@sentry.io/staging-project-id"

# Option 2: vercel.json 파일 사용 (이미 생성됨)
# 환경 변수는 vercel.json에 이미 설정되어 있습니다
```

#### 5단계: Vercel에 배포

```bash
# 5-1. 프로덕션 배포
vercel deploy --prod

# 예상 출력:
# Vercel CLI
# > Production: https://greenflow-landing-staging.vercel.app

# 5-2. 배포된 도메인 확인
VERCEL_DOMAIN=$(vercel domains list | grep staging | awk '{print $1}')
echo "Vercel Domain: $VERCEL_DOMAIN"

# 5-3. 배포 완료 확인
curl -I https://greenflow-landing-staging.vercel.app/
```

---

### ⏰ 15:00 - AWS ECS 백엔드 배포 (60분 예상)

#### 6단계: Docker 이미지를 ECR로 푸시

```bash
# 6-1. ECR 로그인
aws ecr get-login-password --region $AWS_REGION | \
docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# 예상 출력:
# Login Succeeded

# 6-2. Docker 이미지 태그 변경
docker tag glec-api:staging $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/glec-api:staging
docker tag greenflow-frontend:staging $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/greenflow-frontend:staging

# 6-3. ECR에 푸시
docker push $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/glec-api:staging
docker push $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/greenflow-frontend:staging

# 예상 시간: 5-10분 (이미지 크기에 따라)
```

#### 7단계: ECS Task Definition 등록

```bash
# 7-1. Task Definition JSON 파일 준비
# ecs-task-definition.json 파일에서 다음 항목 업데이트:
# - ACCOUNT_ID: 실제 AWS 계정 ID
# - DATABASE_HOST: RDS 엔드포인트
# - REDIS_HOST: Redis 엔드포인트

# 7-2. Task Definition 등록
aws ecs register-task-definition \
  --cli-input-json file://ecs-task-definition.json \
  --region $AWS_REGION

# 예상 출력:
# {
#   "taskDefinition": {
#     "taskDefinitionArn": "arn:aws:ecs:us-east-1:ACCOUNT_ID:task-definition/greenflow-backend:1",
#     ...
#   }
# }
```

#### 8단계: ECS 서비스 생성

```bash
# 8-1. 서비스 생성
aws ecs create-service \
  --cluster greenflow-staging \
  --service-name greenflow-api \
  --task-definition greenflow-backend:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-XXXXXX],securityGroups=[sg-XXXXXX],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:targetgroup/greenflow-staging/XXXXXX,containerName=greenflow-api,containerPort=3000" \
  --region $AWS_REGION

# 8-2. 서비스 상태 확인
aws ecs describe-services \
  --cluster greenflow-staging \
  --services greenflow-api \
  --region $AWS_REGION \
  --query 'services[0].status' \
  --output text

# 예상 상태: ACTIVE → RUNNING
```

#### 9단계: Load Balancer 엔드포인트 확인

```bash
# 9-1. Load Balancer DNS 이름 조회
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --region $AWS_REGION \
  --query "LoadBalancers[?contains(LoadBalancerName, 'greenflow')].DNSName" \
  --output text)

echo "ALB DNS: $ALB_DNS"

# 9-2. Target Group 헬스 확인
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:targetgroup/greenflow-staging/XXXXXX \
  --region $AWS_REGION
```

---

### ⏰ 16:00 - Route53 DNS 및 SSL 설정 (30분 예상)

#### 10단계: DNS 및 SSL 자동 설정

```bash
# 10-1. DNS 및 SSL 설정 스크립트 실행
bash scripts/dns-ssl-setup.sh

# 예상 출력:
# ✅ Route53 호스팅 영역 확인됨
# ✅ SSL 인증서 요청 완료
# ✅ 프론트엔드 DNS 레코드 생성 완료
# ✅ 백엔드 DNS 레코드 생성 완료
```

#### 11단계: DNS 레코드 확인

```bash
# 11-1. Route53 DNS 레코드 확인
aws route53 list-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --region $AWS_REGION \
  --query 'ResourceRecordSets[?contains(Name, "staging")]' \
  --output table

# 11-2. DNS 전파 확인 (최대 48시간)
nslookup staging.greenflow.dev
nslookup staging-api.greenflow.dev

# 11-3. SSL 인증서 상태 확인
aws acm list-certificates \
  --region us-east-1 \
  --query "CertificateSummaryList[?DomainName=='greenflow.dev'].[CertificateArn, Status]" \
  --output table
```

---

### ⏰ 17:00 - 최종 검증 (30분 예상)

#### 12단계: 배포된 서비스 검증

```bash
# 12-1. 프론트엔드 접근 테스트
# DNS 전파 대기 (최대 1시간)
curl -I https://staging.greenflow.dev/
# 또는 브라우저에서 https://staging.greenflow.dev 접속

# 예상 응답:
# HTTP/2 200
# cache-control: public, max-age=31536000, immutable

# 12-2. API 헬스 체크
curl https://staging-api.greenflow.dev/api/v2/health

# 예상 응답:
# {
#   "status": "ok",
#   "timestamp": "2026-02-05T17:00:00Z",
#   "database": "connected",
#   "redis": "connected"
# }

# 12-3. 통합 E2E 테스트
cd projects/green-logistics-landing
BASE_URL=https://staging.greenflow.dev npm run test:e2e:deployment

# 12-4. 성능 테스트 (선택사항)
curl -w "@curl-format.txt" -o /dev/null -s https://staging.greenflow.dev/
```

#### 13단계: CloudWatch 및 모니터링 확인

```bash
# 13-1. CloudWatch 로그 확인
aws logs tail /ecs/greenflow-staging --follow --region $AWS_REGION

# 13-2. ECS 태스크 상태 확인
aws ecs describe-tasks \
  --cluster greenflow-staging \
  --tasks $(aws ecs list-tasks --cluster greenflow-staging --region $AWS_REGION --query 'taskArns[0]' --output text) \
  --region $AWS_REGION

# 13-3. Target Group 헬스 확인
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:targetgroup/greenflow-staging/XXXXXX \
  --region $AWS_REGION \
  --query 'TargetHealthDescriptions[*].[Target.Id, TargetHealth.State, TargetHealth.Description]' \
  --output table
```

---

## 🎊 배포 완료 체크리스트

```
□ 09:00 - AWS 인프라 구성 완료
  └─ □ RDS PostgreSQL 실행 중
  └─ □ ElastiCache Redis 실행 중
  └─ □ S3 버킷 생성
  └─ □ ECR 리포지토리 생성
  └─ □ ECS 클러스터 생성
  └─ □ CloudWatch 로그 그룹 생성

□ 14:00 - Vercel 프론트엔드 배포 완료
  └─ □ Vercel 프로젝트 연결
  └─ □ 환경 변수 설정
  └─ □ 프로덕션 배포 완료
  └─ □ Vercel 도메인 확인

□ 15:00 - ECS 백엔드 배포 완료
  └─ □ Docker 이미지 ECR 푸시
  └─ □ Task Definition 등록
  └─ □ ECS 서비스 생성
  └─ □ Task 실행 중 (2개)
  └─ □ Load Balancer 헬스 체크 통과

□ 16:00 - DNS 및 SSL 설정 완료
  └─ □ Route53 DNS 레코드 생성
  └─ □ SSL 인증서 요청
  └─ □ DNS 전파 확인

□ 17:00 - 최종 검증 완료
  └─ □ 프론트엔드 접근 가능 (https://staging.greenflow.dev)
  └─ □ API 헬스 체크 통과 (https://staging-api.greenflow.dev/api/v2/health)
  └─ □ E2E 테스트 통과
  └─ □ CloudWatch 로그 확인
  └─ □ 모니터링 대시보드 구성
```

---

## 📊 환경 변수 매핑

### 프론트엔드 환경 변수 (vercel.json)

```json
{
  "VITE_API_BASE_URL": "https://staging-api.greenflow.dev/api/v2",
  "VITE_GA_MEASUREMENT_ID": "G-STAGING_MEASUREMENT_ID",
  "VITE_SENTRY_DSN": "https://staging@sentry.io/staging-project-id"
}
```

### 백엔드 환경 변수 (ECS Task Definition)

```env
NODE_ENV=staging
DATABASE_HOST={RDS_ENDPOINT}
DATABASE_PORT=5432
DATABASE_NAME=greenflow_staging
DATABASE_USERNAME={AWS_SECRETS_MANAGER}
DATABASE_PASSWORD={AWS_SECRETS_MANAGER}
REDIS_HOST={REDIS_ENDPOINT}
REDIS_PORT=6379
JWT_SECRET={AWS_SECRETS_MANAGER}
SENTRY_DSN={AWS_SECRETS_MANAGER}
LOG_LEVEL=info
```

---

## 🚨 문제 해결

### 문제 1: RDS/Redis 생성 지연 (30분 이상)

```bash
# 확인 사항
aws rds describe-db-instances --db-instance-identifier greenflow-staging-db --region $AWS_REGION

# 해결책
1. AWS 계정의 서비스 할당량 확인 (RDS, ElastiCache)
2. VPC 및 보안 그룹 설정 확인
3. AWS 콘솔에서 상세 에러 메시지 확인
```

### 문제 2: ECS Task 실패

```bash
# CloudWatch 로그 확인
aws logs tail /ecs/greenflow-staging --follow

# Task 상태 확인
aws ecs describe-tasks --cluster greenflow-staging --tasks {TASK_ARN}

# 일반적인 원인
1. 환경 변수 누락
2. 데이터베이스 연결 실패
3. IAM 역할 권한 부족
4. 메모리/CPU 부족
```

### 문제 3: DNS 전파 지연 (30분 이상)

```bash
# DNS 상태 확인
nslookup staging.greenflow.dev

# DNS 캐시 초기화 (macOS)
sudo dscacheutil -flushcache

# Linux
sudo systemctl restart systemd-resolved
```

### 문제 4: SSL 인증서 검증 대기

```bash
# ACM 콘솔에서 DNS CNAME 레코드 확인
aws acm describe-certificate --certificate-arn {CERT_ARN} --region us-east-1

# Route53에 자동으로 추가된 CNAME 확인
aws route53 list-resource-record-sets --hosted-zone-id {HOSTED_ZONE_ID} --query 'ResourceRecordSets[?Type==`CNAME`]'
```

---

## 📞 지원 및 참고 문서

- **상세 체크리스트**: [STAGING_DEPLOYMENT_CHECKLIST.md](STAGING_DEPLOYMENT_CHECKLIST.md)
- **배포 타임라인**: [DEPLOYMENT_TIMELINE.md](DEPLOYMENT_TIMELINE.md)
- **문제 해결**: 각 스크립트의 log_error 메시지 및 AWS 콘솔 확인
- **Slack**: `#greenflow-deployment`

---

## ✅ 최종 확인

배포 완료 후:

```bash
# 1. 브라우저에서 프론트엔드 확인
https://staging.greenflow.dev

# 2. API 헬스 체크
curl https://staging-api.greenflow.dev/api/v2/health | jq

# 3. 모니터링 대시보드 확인
https://grafana.monitoring.internal:3000

# 4. Sentry 에러 추적 확인
https://sentry.io/organizations/greenflow

# 5. CloudWatch 로그 확인
aws logs tail /ecs/greenflow-staging --follow
```

**축하합니다! 스테이징 배포가 완료되었습니다! 🎉**

다음: [2026-02-06 48시간 안정성 테스트](DEPLOYMENT_TIMELINE.md#2026-02-06)

---

**작성일**: 2026-02-04
**예정 시작**: 2026-02-05 09:00 UTC
**예상 완료**: 2026-02-05 18:00 UTC

GreenFlow 스테이징 배포를 성공적으로 실행하세요! 🚀
