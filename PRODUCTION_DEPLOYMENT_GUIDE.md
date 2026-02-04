# GreenFlow 프로덕션 배포 가이드

**버전**: 1.0
**작성일**: 2026-02-04
**상태**: ✅ **배포 준비 완료**

---

## 📋 개요

이 가이드는 GreenFlow를 **프로덕션 환경**에 배포하는 방법을 설명합니다.

프로덕션은 실제 사용자들이 사용하는 라이브 환경입니다:
- ⚠️ 높은 안정성과 가용성 필요 (99.9% SLA)
- ⚠️ 데이터 보안 및 개인정보 보호 필수
- ⚠️ 실시간 모니터링 및 빠른 대응 체계

---

## ⚠️ 프로덕션 배포 사전 체크리스트

### 필수 완료 항목
- [ ] 스테이징 배포 24시간 이상 안정적 운영
- [ ] E2E 테스트 100% 통과
- [ ] 성능 테스트: P95 < 300ms, P99 < 1s
- [ ] 보안 감사: npm audit 통과, OWASP 체크 완료
- [ ] 데이터 마이그레이션 테스트 완료
- [ ] 롤백 계획 수립 및 테스트
- [ ] 모니터링 및 알림 설정 완료
- [ ] 재해 복구 계획 수립
- [ ] 팀 교육: 배포 및 운영 절차 숙지

### 위험 평가
- [ ] 배포 일시 선정: 트래픽 저점 시간대 (예: 토요일 오전 3시)
- [ ] 배포 담당자: 3명 이상 대기
- [ ] 커뮤니케이션: Slack #greenflow-production 채널 활성화
- [ ] 롤백 테스트: 실제 배포 전 3회 이상 시뮬레이션

---

## 🎯 배포 체계

```
개발 (Development)
     ↓
스테이징 (Staging)  - 24시간 테스트 및 모니터링
     ↓
프로덕션 (Production) - 라이브 사용자 트래픽
     ↓
모니터링 및 지원
```

---

## 🚀 Step 1: 최종 검증 및 준비

### 1.1 빌드 최종 검증

```bash
# 프로덕션 빌드 최종 확인
npm run build

# 번들 크기 확인 (목표: < 500kB)
du -sh dist/

# TypeScript 엄격 모드 확인
npm run build 2>&1 | grep -i "error\|warning"

# ESLint 최종 점검
npm run lint
```

### 1.2 환경 변수 확인

```bash
# .env.production 파일 작성
cat > .env.production << 'EOF'
# 프로덕션 환경
VITE_ENV=production
VITE_LOG_LEVEL=warn

# API 엔드포인트
VITE_API_BASE_URL=https://api.greenflow.dev/api/v2

# 모니터링
VITE_SENTRY_DSN=https://your-prod-sentry-key@sentry.io/project
VITE_ANALYTICS_KEY=prod-ga-key

# 버전 정보
VITE_VERSION=1.0.0
VITE_BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
VITE_GIT_COMMIT=$(git rev-parse --short HEAD)
VITE_GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
EOF

# 환경 변수 검증
npm run build
```

### 1.3 데이터베이스 백업

```bash
# PostgreSQL 백업 (프로덕션)
pg_dump -h prod-db.rds.amazonaws.com \
        -U glec_admin \
        -d glec_prod \
        -Fc > greenflow-prod-backup-$(date +%Y%m%d-%H%M%S).dump

# S3에 백업 저장
aws s3 cp greenflow-prod-backup-*.dump s3://greenflow-backups/

# 백업 검증
pg_restore --list greenflow-prod-backup-*.dump | head -20
```

### 1.4 롤백 계획 수립

```bash
# 현재 프로덕션 버전 저장
git tag -a prod-v1.0.0 -m "Production release v1.0.0"
git push origin prod-v1.0.0

# Docker 이미지 현재 버전 저장
docker tag [ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/greenflow-api:latest \
           [ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/greenflow-api:prod-v1.0.0
docker push [ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/greenflow-api:prod-v1.0.0
```

---

## 🚀 Step 2: 프론트엔드 프로덕션 배포

### 2.1 Vercel 프로덕션 배포

```bash
# 프로덕션 환경 변수 설정
vercel env add VITE_API_BASE_URL --production
# 입력: https://api.greenflow.dev/api/v2

vercel env add VITE_ENV --production
# 입력: production

vercel env add VITE_SENTRY_DSN --production
# 입력: https://your-prod-sentry-key@sentry.io/project

# 프로덕션 빌드
npm run build

# 프로덕션 배포
vercel deploy --prod

# 배포 확인
curl -I https://greenflow.dev
# 응답: HTTP/1.1 200 OK
```

### 2.2 도메인 최종 설정

```bash
# Vercel에서 greenflow.dev 도메인 연결
# Settings → Domains → Add Domain
# Domain: greenflow.dev
# Type: Alias (Vercel 도메인)

# SSL 인증서 자동 생성됨 (Let's Encrypt)
# https://greenflow.dev 접속 확인
```

### 2.3 CDN 캐시 설정

```bash
# Vercel에서 자동으로 CDN 설정됨
# Edge Network: 200+ 데이터 센터

# 수동 캐시 정책 설정 (선택)
# vercel.json에서:
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

---

## 🚀 Step 3: 백엔드 프로덕션 배포

### 3.1 Docker 이미지 프로덕션 빌드

```bash
# 백엔드 프로덕션 이미지 빌드
cd projects/glec-api-backend
docker build -t glec-api:prod .

# 이미지 태그 설정 (버전 포함)
docker tag glec-api:prod \
  [ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/greenflow-api:1.0.0
docker tag glec-api:prod \
  [ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/greenflow-api:latest

# ECR에 푸시
docker push [ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/greenflow-api:1.0.0
docker push [ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/greenflow-api:latest
```

### 3.2 ECS 작업 정의 업데이트 (프로덕션)

```bash
# ecs-task-definition-prod.json 생성
cat > ecs-task-definition-prod.json << 'EOF'
{
  "family": "greenflow-api-prod",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "greenflow-api",
      "image": "[ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/greenflow-api:latest",
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
          "value": "production"
        },
        {
          "name": "DATABASE_URL",
          "value": "postgres://glec_admin:password@prod-db.rds.amazonaws.com:5432/glec_prod"
        },
        {
          "name": "REDIS_URL",
          "value": "redis://prod-cache.cache.amazonaws.com:6379"
        },
        {
          "name": "API_PREFIX",
          "value": "/api/v2"
        },
        {
          "name": "LOG_LEVEL",
          "value": "warn"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/greenflow-api-prod",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/api/v2/health || exit 1"],
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
  --cli-input-json file://ecs-task-definition-prod.json
```

### 3.3 ECS 서비스 업데이트 (블루-그린 배포)

```bash
# 새 작업 정의로 서비스 업데이트 (자동 롤링 배포)
aws ecs update-service \
  --cluster greenflow-prod \
  --service greenflow-api-prod \
  --task-definition greenflow-api-prod:1 \
  --force-new-deployment

# 배포 진행 상태 확인
aws ecs describe-services \
  --cluster greenflow-prod \
  --services greenflow-api-prod \
  --query 'services[0].deployments'

# 배포 완료 대기 (약 3-5분)
aws ecs wait services-stable \
  --cluster greenflow-prod \
  --services greenflow-api-prod
```

### 3.4 트래픽 점진적 이동 (카나리 배포)

```bash
# 1단계: 10% 트래픽 → 새 버전
aws elbv2 modify-target-group \
  --target-group-arn arn:aws:elasticloadbalancing:... \
  --matcher HttpCode=200-399

# 2단계: 모니터링 (15분)
# CloudWatch에서 에러율, 지연시간 확인

# 3단계: 50% 트래픽 → 새 버전
# 4단계: 모니터링 (15분)
# 5단계: 100% 트래픽 → 새 버전
```

---

## 🚀 Step 4: 데이터베이스 및 캐시 설정

### 4.1 프로덕션 PostgreSQL

```bash
# 프로덕션 RDS 인스턴스 확인
aws rds describe-db-instances \
  --db-instance-identifier greenflow-prod-db

# 자동 백업 설정
aws rds modify-db-instance \
  --db-instance-identifier greenflow-prod-db \
  --backup-retention-period 30 \
  --preferred-backup-window "03:00-04:00" \
  --apply-immediately

# 다중 AZ 활성화 (고가용성)
aws rds modify-db-instance \
  --db-instance-identifier greenflow-prod-db \
  --multi-az \
  --apply-immediately
```

### 4.2 프로덕션 Redis (ElastiCache)

```bash
# 클러스터 모드 활성화 (고성능)
aws elasticache create-replication-group \
  --replication-group-id greenflow-prod-cache \
  --replication-group-description "Production Redis" \
  --engine redis \
  --cache-node-type cache.r6g.xlarge \
  --num-cache-clusters 3 \
  --automatic-failover-enabled \
  --at-rest-encryption-enabled \
  --transit-encryption-enabled

# 자동 스냅샷 활성화
aws elasticache modify-replication-group \
  --replication-group-id greenflow-prod-cache \
  --snapshot-retention-limit 30 \
  --automatic-failover-enabled \
  --apply-immediately
```

### 4.3 데이터베이스 마이그레이션

```bash
# 프로덕션 DB 마이그레이션 실행
DATABASE_URL="postgres://glec_admin:password@prod-db.rds.amazonaws.com:5432/glec_prod" \
npm run db:migrate

# 마이그레이션 상태 확인
DATABASE_URL="..." npm run db:status

# 문제 발생 시 롤백
DATABASE_URL="..." npm run db:migrate:revert
```

---

## 🧪 Step 5: 프로덕션 검증

### 5.1 헬스 체크

```bash
# 프론트엔드
curl -I https://greenflow.dev
# 응답: HTTP/1.1 200 OK

# 백엔드 헬스
curl https://api.greenflow.dev/api/v2/health
# 응답: {"status":"ok", ...}

# 데이터베이스
curl https://api.greenflow.dev/api/v2/health | jq .database

# Redis
curl https://api.greenflow.dev/api/v2/health | jq .redis
```

### 5.2 성능 테스트

```bash
# Lighthouse 성능 테스트
npm i -g @lhci/cli@latest
lhci autorun --config lhci.config.js

# 로드 테스트
npm i -g autocannon
autocannon https://greenflow.dev -c 100 -d 30
```

### 5.3 보안 테스트

```bash
# OWASP ZAP 스캔
docker pull owasp/zap2docker-stable
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://greenflow.dev

# SSL 인증서 확인
openssl s_client -connect greenflow.dev:443 -showcerts
```

### 5.4 실제 사용자 테스트

```bash
# 1. 회원가입 테스트
curl -X POST https://api.greenflow.dev/api/v2/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@greenflow.dev",
    "password": "TestPassword123!",
    "role": "SHIPPER"
  }'

# 2. 로그인 테스트
curl -X POST https://api.greenflow.dev/api/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@greenflow.dev",
    "password": "TestPassword123!"
  }'

# 3. 입찰 생성 테스트
curl -X POST https://api.greenflow.dev/api/v2/order/bid \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "Seoul",
    "destination": "Busan",
    "cargoWeight": 10
  }'
```

---

## 📊 모니터링 및 알림 설정

### CloudWatch 알람

```bash
# 에러율 > 1% 알람
aws cloudwatch put-metric-alarm \
  --alarm-name greenflow-prod-error-rate \
  --alarm-description "Alert if error rate > 1%" \
  --metric-name ErrorRate \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:greenflow-alerts

# CPU 사용률 > 80% 알람
aws cloudwatch put-metric-alarm \
  --alarm-name greenflow-prod-cpu \
  --alarm-description "Alert if CPU > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:greenflow-alerts
```

### Sentry 설정

```bash
# Sentry 프로젝트 생성
# https://sentry.io/organizations/your-org/projects/new/

# 환경 변수에 DSN 추가
VITE_SENTRY_DSN=https://your-prod-key@sentry.io/project

# 소스맵 업로드 (선택)
npm run build
sentry-cli releases files upload-sourcemaps ./dist/
```

### Google Analytics 설정

```bash
# GA4 프로젝트 생성
# https://analytics.google.com/

# 환경 변수에 추가
VITE_ANALYTICS_KEY=G-XXXXXXXXXX

# 이벤트 추적 확인
# Real-time 섹션에서 사용자 활동 확인
```

---

## 🔄 배포 후 절차

### 1시간 이내 (긴급 모니터링)
- [ ] 프론트엔드 접근 확인
- [ ] 백엔드 API 응답 확인
- [ ] 에러율 < 0.1% 확인
- [ ] 성능 메트릭 정상 확인

### 24시간 이내
- [ ] 모든 기능 작동 확인
- [ ] 데이터베이스 동기화 확인
- [ ] 사용자 피드백 수집
- [ ] 비용 모니터링

### 1주일 이내
- [ ] 장기 성능 메트릭 분석
- [ ] 예상치 못한 문제 확인
- [ ] 최적화 기회 식별

---

## 🆘 긴급 롤백 절차

### 즉시 롤백이 필요한 경우
1. 에러율 > 5%
2. P95 응답시간 > 5초
3. 데이터 손실 발생
4. 보안 침해 발생

### 롤백 실행

```bash
# 1. 이전 ECS 작업 정의로 롤백
aws ecs update-service \
  --cluster greenflow-prod \
  --service greenflow-api-prod \
  --task-definition greenflow-api-prod:$(expr $(aws ecs describe-services --cluster greenflow-prod --services greenflow-api-prod --query 'services[0].taskDefinition' | cut -d: -f2) - 1)

# 2. 배포 완료 대기
aws ecs wait services-stable \
  --cluster greenflow-prod \
  --services greenflow-api-prod

# 3. 프론트엔드 롤백 (Vercel)
vercel deploy --prod --skip-build

# 4. 상태 확인
curl https://api.greenflow.dev/api/v2/health

# 5. 팀에 알림
# #greenflow-production 채널에 롤백 메시지
```

---

## ✅ 최종 체크리스트

배포 전:
- [ ] 스테이징 24시간 안정성 확인
- [ ] E2E 테스트 100% 통과
- [ ] 보안 감사 통과
- [ ] 데이터 백업 완료
- [ ] 롤백 계획 수립
- [ ] 팀 준비 완료

배포 중:
- [ ] 모니터링 활성화
- [ ] Slack 채널 활성화
- [ ] 담당자 대기
- [ ] 1단계: 프론트엔드 배포
- [ ] 1단계: 검증
- [ ] 2단계: 백엔드 배포
- [ ] 2단계: 검증
- [ ] 3단계: 데이터베이스 마이그레이션
- [ ] 3단계: 검증

배포 후:
- [ ] 1시간 긴급 모니터링
- [ ] 24시간 안정성 확인
- [ ] 1주일 성능 분석
- [ ] 회고 회의 (배운 점 정리)

---

**마지막 업데이트**: 2026-02-04
**상태**: ✅ 배포 준비 완료
**다음 단계**: 배포 실행

