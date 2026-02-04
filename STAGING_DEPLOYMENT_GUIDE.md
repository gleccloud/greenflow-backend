# GreenFlow 스테이징 배포 가이드

**버전**: 1.0
**작성일**: 2026-02-04
**상태**: ✅ **배포 준비 완료**

---

## 📋 개요

이 가이드는 GreenFlow를 **스테이징 환경**에 배포하는 방법을 설명합니다.

스테이징은 프로덕션 배포 전 마지막 테스트 단계입니다:
- ✅ 실제 클라우드 환경에서 테스트
- ✅ 성능 및 안정성 검증
- ✅ 프로덕션 배포 전 문제 발견

---

## 🎯 배포 체크리스트

### 사전 조건
- [ ] 로컬 배포 테스트 완료 (bash scripts/deployment-test.sh)
- [ ] 모든 E2E 테스트 통과
- [ ] 환경 변수 설정 완료
- [ ] 클라우드 계정 준비됨 (AWS / GCP / Vercel)

### 필수 계정 및 도구
- [ ] **프론트엔드**: Vercel 계정 (https://vercel.com)
- [ ] **백엔드**: AWS 계정 (https://aws.amazon.com) 또는 GCP (https://cloud.google.com)
- [ ] **도메인**: staging.greenflow.dev DNS 설정 가능
- [ ] **Slack**: 배포 알림용 Webhook (선택사항)

---

## 🚀 Step 1: 프론트엔드 스테이징 배포 (Vercel)

### 1.1 Vercel 프로젝트 생성 및 연결

```bash
# Vercel CLI 설치
npm i -g vercel

# Vercel에 로그인
vercel login

# 프로젝트 디렉토리로 이동
cd projects/green-logistics-landing

# Vercel 프로젝트 연결
vercel link
# 선택 옵션:
# - Create and link new project: Yes
# - Project name: greenflow-staging
# - Framework: Vite
# - Output directory: dist
# - Root directory: ./
```

### 1.2 환경 변수 설정

```bash
# Staging 환경 변수 추가
vercel env add VITE_API_BASE_URL
# 입력: https://staging-api.greenflow.dev/api/v2

vercel env add VITE_ENV
# 입력: staging

vercel env add VITE_LOG_LEVEL
# 입력: info

vercel env add VITE_SENTRY_DSN
# 입력: https://your-staging-sentry-key@sentry.io/project

vercel env add VITE_ANALYTICS_KEY
# 입력: staging-ga-key

# 환경 변수 확인
vercel env list
```

### 1.3 프로덕션 빌드 및 배포

```bash
# 프로덕션 빌드
npm run build

# Staging 환경으로 배포
vercel deploy

# 또는 미리보기 환경으로 배포 (스테이징)
vercel deploy --env staging

# URL 확인 (예: https://greenflow-staging.vercel.app)
```

### 1.4 도메인 연결 (선택사항)

```bash
# DNS를 staging.greenflow.dev로 설정
# Vercel 대시보드에서:
# Settings → Domains → Add
# Domain: staging.greenflow.dev
# Type: CNAME
# Value: cname.vercel.com
```

---

## 🚀 Step 2: 백엔드 스테이징 배포

### 2.1 선택지 A: AWS ECS (권장)

#### 2.1.1 ECR 이미지 저장소 생성

```bash
# AWS 로그인
aws configure
# AWS Access Key ID: [your-key]
# AWS Secret Access Key: [your-secret]
# Default region: us-east-1
# Default output format: json

# ECR 저장소 생성
aws ecr create-repository \
  --repository-name greenflow-api-staging \
  --region us-east-1

# 로그인 토큰 받기
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  [ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com
```

#### 2.1.2 Docker 이미지 빌드 및 푸시

```bash
# 백엔드 이미지 빌드
cd projects/glec-api-backend
docker build -t glec-api:staging .

# 이미지 태그 설정
docker tag glec-api:staging \
  [ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/greenflow-api-staging:staging

# ECR에 푸시
docker push \
  [ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/greenflow-api-staging:staging
```

#### 2.1.3 ECS 작업 정의 생성

```bash
# ecs-task-definition-staging.json 생성
cat > ecs-task-definition-staging.json << 'EOF'
{
  "family": "greenflow-api-staging",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "greenflow-api",
      "image": "[ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/greenflow-api-staging:staging",
      "portMappings": [
        {
          "containerPort": 3000,
          "hostPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "staging"
        },
        {
          "name": "DATABASE_URL",
          "value": "postgres://glec_user:glec_pass@staging-db.rds.amazonaws.com:5432/glec_staging"
        },
        {
          "name": "REDIS_URL",
          "value": "redis://staging-cache.cache.amazonaws.com:6379"
        },
        {
          "name": "API_PREFIX",
          "value": "/api/v2"
        },
        {
          "name": "LOG_LEVEL",
          "value": "info"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/greenflow-api-staging",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:3000/api/v2/health || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
EOF

# 작업 정의 등록
aws ecs register-task-definition \
  --cli-input-json file://ecs-task-definition-staging.json
```

#### 2.1.4 ECS 서비스 생성

```bash
# ECS 클러스터 생성 (이미 있으면 스킵)
aws ecs create-cluster --cluster-name greenflow-staging

# ECS 서비스 생성
aws ecs create-service \
  --cluster greenflow-staging \
  --service-name greenflow-api-staging \
  --task-definition greenflow-api-staging:1 \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxx],securityGroups=[sg-xxxxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:targetgroup/greenflow-staging/xxxxx,containerName=greenflow-api,containerPort=3000"
```

### 2.2 선택지 B: Google Cloud Run (간단함)

```bash
# Google Cloud 로그인
gcloud auth login

# 프로젝트 설정
gcloud config set project greenflow-staging

# 이미지 빌드 및 푸시
cd projects/glec-api-backend
gcloud builds submit --tag gcr.io/greenflow-staging/api:staging

# Cloud Run 배포
gcloud run deploy greenflow-api-staging \
  --image gcr.io/greenflow-staging/api:staging \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --set-env-vars NODE_ENV=staging,DATABASE_URL=postgres://...,REDIS_URL=redis://... \
  --health-check-path /api/v2/health

# URL 확인 (예: https://greenflow-api-staging-xxxxx.run.app)
```

### 2.3 선택지 C: Heroku (매우 간단)

```bash
# Heroku CLI 설치 및 로그인
npm i -g heroku
heroku login

# Heroku 앱 생성
heroku create greenflow-api-staging

# PostgreSQL 추가
heroku addons:create heroku-postgresql:hobby-dev -a greenflow-api-staging

# Redis 추가
heroku addons:create heroku-redis:premium-0 -a greenflow-api-staging

# 환경 변수 설정
heroku config:set NODE_ENV=staging -a greenflow-api-staging
heroku config:set API_PREFIX=/api/v2 -a greenflow-api-staging

# 배포
git push heroku main

# URL 확인 (예: https://greenflow-api-staging.herokuapp.com)
```

---

## 🚀 Step 3: 데이터베이스 준비

### 3.1 PostgreSQL 스테이징 데이터베이스

```bash
# AWS RDS 생성 (ECS 배포의 경우)
aws rds create-db-instance \
  --db-instance-identifier greenflow-staging-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 17.1 \
  --master-username glec_admin \
  --master-user-password [STRONG_PASSWORD] \
  --allocated-storage 20 \
  --publicly-accessible true

# 또는 클라우드 SQL (GCP의 경우)
gcloud sql instances create greenflow-staging-db \
  --database-version POSTGRES_17 \
  --tier db-f1-micro \
  --region us-central1

# 데이터베이스 생성
gcloud sql databases create glec_staging \
  --instance=greenflow-staging-db
```

### 3.2 Redis 스테이징 캐시

```bash
# AWS ElastiCache 생성
aws elasticache create-cache-cluster \
  --cache-cluster-id greenflow-staging-cache \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1

# 또는 클라우드 Memorystore (GCP)
gcloud redis instances create greenflow-staging-cache \
  --region us-central1 \
  --tier basic \
  --size 2 \
  --redis-version 7.0
```

### 3.3 데이터베이스 마이그레이션

```bash
# 백엔드 ECS 작업에서 실행
aws ecs run-task \
  --cluster greenflow-staging \
  --task-definition greenflow-api-staging:1 \
  --override 'containerOverrides=[{name="greenflow-api",command=["npm","run","db:migrate"]}]'

# 또는 로컬에서 원격 DB로 실행
DATABASE_URL=postgres://glec_admin:password@greenflow-staging-db.xxx.rds.amazonaws.com:5432/glec_staging \
npm run db:migrate

# 테스트 데이터 로드
DATABASE_URL=postgres://... npm run db:seed
```

---

## 🎯 Step 4: 도메인 및 SSL 설정

### 4.1 도메인 등록 및 DNS 설정

```bash
# Route53 호스팅 영역 생성 (AWS)
aws route53 create-hosted-zone --name staging.greenflow.dev

# DNS 레코드 생성
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "staging.greenflow.dev",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "d1234567890.cloudfront.net",
          "EvaluateTargetHealth": false
        }
      }
    }]
  }'
```

### 4.2 SSL 인증서

```bash
# AWS Certificate Manager에서 요청
aws acm request-certificate \
  --domain-name staging.greenflow.dev \
  --validation-method DNS

# 또는 Let's Encrypt 사용 (무료)
certbot certonly --dns-route53 -d staging.greenflow.dev
```

---

## 🧪 Step 5: 스테이징 검증

### 5.1 헬스 체크

```bash
# 프론트엔드 확인
curl -I https://staging.greenflow.dev
# 응답: HTTP/1.1 200 OK

# 백엔드 헬스 체크
curl https://staging-api.greenflow.dev/api/v2/health
# 응답: {"status":"ok", ...}

# 데이터베이스 연결 확인
curl https://staging-api.greenflow.dev/api/v2/health | jq .database

# Redis 연결 확인
curl https://staging-api.greenflow.dev/api/v2/health | jq .redis
```

### 5.2 E2E 테스트 (스테이징)

```bash
# 스테이징 환경에서 E2E 테스트 실행
BASE_URL=https://staging.greenflow.dev \
npm run test:e2e:deployment

# 결과: ✅ 모든 테스트 통과
```

### 5.3 성능 테스트

```bash
# Lighthouse CI 실행
npm i -g @lhci/cli@latest
lhci autorun --config lhci.config.js \
  --upload.target temporary-public-storage

# 결과 URL: https://lhci.report/xxxxx
```

### 5.4 모니터링 확인

```bash
# Sentry 에러 추적 확인
open https://sentry.io/organizations/your-org/issues/

# Google Analytics 이벤트 확인
open https://analytics.google.com/

# 응용 프로그램 성능 (APM)
open https://datadog.com/
```

---

## 📊 스테이징 모니터링

### 로그 수집

```bash
# CloudWatch 로그 조회
aws logs tail /ecs/greenflow-api-staging --follow

# 또는 Cloud Logging (GCP)
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=greenflow-api-staging"
```

### 성능 메트릭

```bash
# CloudWatch 메트릭 확인
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=greenflow-api-staging \
  --start-time 2026-02-04T00:00:00Z \
  --end-time 2026-02-05T00:00:00Z \
  --period 3600 \
  --statistics Average,Maximum
```

---

## 🔄 배포 후 단계

### 1단계: 스테이징 테스트 (24시간)
- ✅ 모든 기능 테스트
- ✅ 성능 및 안정성 검증
- ✅ 사용자 피드백 수집

### 2단계: 버그 수정 및 최적화
- ✅ 발견된 문제 해결
- ✅ 성능 최적화
- ✅ 보안 검토

### 3단계: 프로덕션 배포 준비
- ✅ 최종 점검
- ✅ 롤백 계획 수립
- ✅ 배포 시간 예약

---

## 🚨 트러블슈팅

### API 연결 실패

```bash
# 1. 백엔드 상태 확인
curl -v https://staging-api.greenflow.dev/api/v2/health

# 2. 로그 확인
aws logs tail /ecs/greenflow-api-staging --follow

# 3. 보안 그룹 확인
aws ec2 describe-security-groups --group-ids sg-xxxxx

# 4. 네트워크 ACL 확인
aws ec2 describe-network-acls
```

### 데이터베이스 연결 실패

```bash
# 1. RDS 상태 확인
aws rds describe-db-instances --db-instance-identifier greenflow-staging-db

# 2. 보안 그룹 규칙 확인
aws rds describe-db-security-groups

# 3. 수동 테스트
psql -h greenflow-staging-db.rds.amazonaws.com \
     -U glec_admin \
     -d glec_staging
```

### 성능 저하

```bash
# 1. CPU 사용량 확인
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=greenflow-api-staging

# 2. 메모리 사용량 확인
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name MemoryUtilization

# 3. 데이터베이스 쿼리 성능 확인
psql -h staging-db.rds.amazonaws.com -U glec_admin -d glec_staging
SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
```

---

## ✅ 최종 체크리스트

배포 완료 전:
- [ ] 프론트엔드 https://staging.greenflow.dev 접근 가능
- [ ] 백엔드 https://staging-api.greenflow.dev/api/v2/health 응답 정상
- [ ] 데이터베이스 연결 정상
- [ ] Redis 캐시 정상
- [ ] E2E 테스트 모두 통과
- [ ] Sentry 에러 추적 설정됨
- [ ] Google Analytics 설정됨
- [ ] 모니터링 대시보드 접근 가능

배포 후:
- [ ] 24시간 모니터링 완료
- [ ] 에러율 < 0.1%
- [ ] P95 응답시간 < 300ms
- [ ] 데이터 동기화 확인
- [ ] SSL 인증서 유효

---

## 📞 연락처

배포 관련 문제:
- DevOps Lead: devops@greenflow.dev
- On-call Engineer: on-call@greenflow.dev
- Slack: #greenflow-devops

---

**마지막 업데이트**: 2026-02-04
**상태**: ✅ 배포 준비 완료
**다음 단계**: 프로덕션 배포

