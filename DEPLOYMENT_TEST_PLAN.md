# GreenFlow 배포 테스트 계획 (LocalStack 통합)

**버전**: 1.0
**작성일**: 2026-02-04
**상태**: 🔄 **구현 준비 중**

---

## 📋 개요

LocalStack을 사용하여 **프로덕션 배포 전** 로컬 AWS 환경에서 전체 시스템을 테스트하는 계획입니다.

이를 통해:
- ✅ 프로덕션 배포 전 전체 시스템 검증
- ✅ 백엔드 + 프론트엔드 통합 테스트
- ✅ 실제 AWS 환경과 동일한 테스트
- ✅ 배포 문제 사전 발견

---

## 🎯 테스트 구조

```
┌─────────────────────────────────────────────────┐
│     GreenFlow 배포 테스트 (LocalStack)           │
├─────────────────────────────────────────────────┤
│                                                 │
│  1. 로컬 개발 환경 (localhost)                   │
│     ├─ PostgreSQL (5432)                        │
│     ├─ Redis (6379)                             │
│     ├─ 백엔드 API (3000)                         │
│     └─ 프론트엔드 (5173)                         │
│                                                 │
│  2. LocalStack 환경 (docker-compose)            │
│     ├─ LocalStack (4566 통합)                    │
│     ├─ RDS PostgreSQL 에뮬레이션                │
│     ├─ ElastiCache Redis 에뮬레이션             │
│     ├─ SQS (입찰 평가 큐)                       │
│     ├─ SNS (알림)                               │
│     ├─ Lambda (서버리스 로직)                    │
│     └─ S3 (파일 저장소)                         │
│                                                 │
│  3. CI/CD 파이프라인 (GitHub Actions)           │
│     ├─ 린트 + 타입 체크                         │
│     ├─ 유닛 테스트                              │
│     ├─ LocalStack 통합 테스트                    │
│     ├─ E2E 스모크 테스트                        │
│     ├─ 빌드 + 번들 검증                         │
│     └─ 배포 준비 확인                           │
│                                                 │
│  4. 프로덕션 배포                               │
│     ├─ 백엔드 (AWS ECS / GCP Cloud Run)         │
│     ├─ 프론트엔드 (Vercel / Netlify)            │
│     └─ 데이터베이스 (AWS RDS)                   │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 📊 테스트 단계

### **Phase 1: LocalStack 환경 설정 (현재 진행 중)**

#### 1.1 Docker Compose 구성
```bash
# 파일: docker-compose.localstack.yml
services:
  localstack:
    image: localstack/localstack:latest
    ports:
      - "4566:4566"
    environment:
      SERVICES: rds,elasticache,sqs,sns,lambda,s3,cloudwatch
      DEBUG: 1
      DATA_DIR: /tmp/localstack/data
    volumes:
      - localstack-data:/tmp/localstack/data
      - ./scripts/localstack-init.sh:/docker-entrypoint-initaws.d/init-aws-resources.sh

  postgres:
    image: postgres:17-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: glec_dev
      POSTGRES_USER: glec_user
      POSTGRES_PASSWORD: glec_pass

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./projects/glec-api-backend
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    environment:
      NODE_ENV: test
      DATABASE_URL: postgres://glec_user:glec_pass@postgres:5432/glec_dev
      REDIS_URL: redis://redis:6379
      AWS_ENDPOINT_URL: http://localstack:4566

  frontend:
    build: ./projects/green-logistics-landing
    ports:
      - "5173:5173"
    depends_on:
      - backend
    environment:
      VITE_API_BASE_URL: http://backend:3000/api/v2
```

#### 1.2 LocalStack 초기화 스크립트
```bash
# 파일: scripts/localstack-init.sh

#!/bin/bash

echo "🚀 LocalStack AWS 리소스 생성 중..."

# AWS CLI 설정
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1

# 1. S3 버킷 생성
echo "📦 S3 버킷 생성..."
awslocal s3 mb s3://greenflow-documents

# 2. RDS 데이터베이스 생성 (에뮬레이션)
echo "🗄️ RDS 데이터베이스 생성..."
awslocal rds create-db-instance \
  --db-instance-identifier glec-db \
  --db-instance-class db.t2.micro \
  --engine postgres \
  --master-username glec_user \
  --master-user-password glec_pass \
  --allocated-storage 20

# 3. ElastiCache Redis 클러스터
echo "🔴 ElastiCache 생성..."
awslocal elasticache create-cache-cluster \
  --cache-cluster-id glec-cache \
  --cache-node-type cache.t2.micro \
  --engine redis

# 4. SQS 큐 (입찰 평가)
echo "📮 SQS 큐 생성..."
awslocal sqs create-queue --queue-name bid-evaluation-queue
awslocal sqs create-queue --queue-name bid-ranking-queue
awslocal sqs create-queue --queue-name notification-queue

# 5. SNS 토픽 (알림)
echo "📢 SNS 토픽 생성..."
awslocal sns create-topic --name bid-updates
awslocal sns create-topic --name order-updates
awslocal sns create-topic --name fleet-updates

# 6. Lambda 함수 (bid-evaluation)
echo "⚡ Lambda 함수 배포..."
cd /tmp/lambda
zip bid-evaluation.zip bid-evaluation.js
awslocal lambda create-function \
  --function-name bid-evaluation \
  --runtime nodejs18.x \
  --role arn:aws:iam::000000000000:role/lambda-role \
  --handler bid-evaluation.handler \
  --zip-file fileb://bid-evaluation.zip

echo "✅ LocalStack 초기화 완료!"
```

---

### **Phase 2: 로컬 통합 테스트**

#### 2.1 시작 명령어
```bash
# Step 1: LocalStack + 종속성 시작
docker-compose -f docker-compose.localstack.yml up -d

# Step 2: 초기화 대기 (30초)
sleep 30

# Step 3: 백엔드 마이그레이션 실행
docker-compose -f docker-compose.localstack.yml exec backend npm run db:migrate

# Step 4: 테스트 데이터 로드
docker-compose -f docker-compose.localstack.yml exec backend npm run db:seed
```

#### 2.2 통합 테스트 시나리오

**시나리오 1: 입찰 생성 및 평가**
```typescript
// 백엔드 통합 테스트
describe('Bid Lifecycle with LocalStack', () => {
  it('should create bid and evaluate proposals via SQS', async () => {
    // 1. 입찰 생성
    const bid = await createBid({
      origin: '서울',
      destination: '부산',
      cargoWeight: 10,
    });

    // 2. SQS에 평가 작업 큐잉
    await queueBidEvaluation(bid.id);

    // 3. Lambda 함수 실행 (로컬)
    const result = await executeLambda('bid-evaluation', { bidId: bid.id });

    // 4. 결과 검증
    expect(result.rankedProposals).toHaveLength(3);
    expect(result.rankedProposals[0].score).toBeGreaterThan(0);
  });
});
```

**시나리오 2: 실시간 업데이트 (SNS Pub/Sub)**
```typescript
describe('Real-time Updates with SNS', () => {
  it('should broadcast bid updates via SNS', async () => {
    // 1. SNS 토픽에 구독
    const subscriber = subscribeSNSTopic('bid-updates');

    // 2. 입찰 상태 변경
    await updateBidStatus(bidId, 'CLOSED');

    // 3. SNS 메시지 수신 확인
    const message = await waitForMessage(subscriber, 5000);
    expect(message.body).toContain(bidId);
  });
});
```

**시나리오 3: S3 파일 저장소**
```typescript
describe('Document Storage with S3', () => {
  it('should upload bid documents to S3', async () => {
    // 1. 입찰 문서 업로드
    const uploadResult = await uploadToS3({
      bucket: 'greenflow-documents',
      key: `bids/${bidId}/contract.pdf`,
      file: contractFile,
    });

    // 2. 파일 검증
    const stored = await getFromS3({
      bucket: 'greenflow-documents',
      key: `bids/${bidId}/contract.pdf`,
    });

    expect(stored.ContentLength).toBe(contractFile.size);
  });
});
```

---

### **Phase 3: E2E 테스트 (프론트엔드)**

#### 3.1 E2E 테스트 시나리오 (Playwright)

**테스트 파일**: `tests/e2e_deployment.mjs`

```javascript
import { test, expect } from '@playwright/test';

test.describe('GreenFlow Full Stack E2E', () => {
  test.beforeAll(async () => {
    // LocalStack 상태 확인
    const health = await fetch('http://localhost:4566/_localstack/health');
    expect(health.ok).toBeTruthy();
  });

  test('should complete full bid lifecycle', async ({ page, context }) => {
    // 1. 애플리케이션 로드
    await page.goto('http://localhost:5173');
    await expect(page.locator('h1')).toContainText('GreenFlow');

    // 2. 화주 로그인
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'shipper@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("로그인")');

    // 3. 대시보드 확인
    await page.waitForURL('**/dashboard/shipper');
    await expect(page.locator('h1')).toContainText('화주 대시보드');

    // 4. 입찰 생성
    await page.click('button:has-text("새 입찰")');
    await page.fill('input[placeholder="출발지"]', '서울');
    await page.fill('input[placeholder="도착지"]', '부산');
    await page.fill('input[placeholder="무게"]', '10');
    await page.click('button:has-text("입찰 생성")');

    // 5. 실시간 제안 수신 확인
    const proposalSection = page.locator('[data-testid="proposal-rankings"]');
    await expect(proposalSection).toBeVisible({ timeout: 10000 });

    // 6. 제안 선택 및 수락
    const firstProposal = page.locator('[data-testid="proposal-item"]').first();
    await firstProposal.click();
    await page.click('button:has-text("수락")');

    // 7. 최종 확인
    await expect(page.locator('[data-testid="bid-status"]')).toContainText('ACCEPTED');
  });

  test('should handle real-time EI updates', async ({ page }) => {
    // 1. 차량군 페이지 로드
    await page.goto('http://localhost:5173/dashboard/shipper/fleets');

    // 2. SSE 연결 확인
    const response = await page.evaluate(() => {
      return fetch('http://localhost:3000/api/v2/realtime/ei-updates')
        .then(r => r.ok);
    });

    expect(response).toBeTruthy();
  });
});
```

---

### **Phase 4: CI/CD 파이프라인 통합**

#### 4.1 GitHub Actions 워크플로우 확장

**파일**: `.github/workflows/ci-cd-deployment-test.yml`

```yaml
name: Deployment Test with LocalStack

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  localstack-test:
    name: LocalStack Integration Test
    runs-on: ubuntu-latest

    services:
      localstack:
        image: localstack/localstack:latest
        ports:
          - 4566:4566
        env:
          SERVICES: rds,elasticache,sqs,sns,lambda,s3
          DEBUG: 1

      postgres:
        image: postgres:17-alpine
        env:
          POSTGRES_DB: glec_dev
          POSTGRES_USER: glec_user
          POSTGRES_PASSWORD: glec_pass
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      # 백엔드 테스트
      - name: Backend - Install dependencies
        run: |
          cd projects/glec-api-backend
          npm ci

      - name: Backend - Build
        run: |
          cd projects/glec-api-backend
          npm run build

      - name: Backend - Run tests with LocalStack
        run: |
          cd projects/glec-api-backend
          npm run test:integration
        env:
          AWS_ENDPOINT_URL: http://localhost:4566
          DATABASE_URL: postgres://glec_user:glec_pass@postgres:5432/glec_dev
          REDIS_URL: redis://redis:6379

      # 프론트엔드 테스트
      - name: Frontend - Install dependencies
        run: |
          cd projects/green-logistics-landing
          npm ci

      - name: Frontend - Build
        run: |
          cd projects/green-logistics-landing
          npm run build

      - name: Frontend - E2E Tests
        run: |
          cd projects/green-logistics-landing
          npm run test:e2e:deployment
        env:
          VITE_API_BASE_URL: http://localhost:3000/api/v2

      - name: Upload E2E artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: e2e-deployment-artifacts
          path: projects/green-logistics-landing/test-artifacts/

  deployment-readiness:
    name: Check Deployment Readiness
    runs-on: ubuntu-latest
    needs: [localstack-test]
    if: success()

    steps:
      - name: Verify all systems ready
        run: |
          echo "✅ Backend: Ready for deployment"
          echo "✅ Frontend: Ready for deployment"
          echo "✅ LocalStack tests: Passed"
          echo "🚀 System ready for production deployment"
```

---

### **Phase 5: 배포 전 체크리스트**

#### 5.1 로컬 검증 체크리스트

```bash
# 1. 백엔드 준비 확인
cd projects/glec-api-backend
npm run lint              # ✅ ESLint 통과
npm run build             # ✅ 빌드 성공
npm run test              # ✅ 71개 테스트 통과
npm run health            # ✅ /health 응답 정상

# 2. 프론트엔드 준비 확인
cd projects/green-logistics-landing
npm run lint              # ✅ ESLint 통과
npm run build             # ✅ 빌드 성공 (0 errors)
npm run test:e2e          # ✅ E2E 테스트 통과

# 3. LocalStack 통합 테스트
docker-compose -f docker-compose.localstack.yml up -d
sleep 30
npm run test:integration  # ✅ 통합 테스트 통과
docker-compose -f docker-compose.localstack.yml down

# 4. 성능 검증
npm run build:performance # ✅ 번들 최적화 확인
npm run analyze           # ✅ 번들 분석

# 5. 보안 검증
npm audit                 # ✅ 취약점 없음
```

#### 5.2 프로덕션 배포 전 확인

| 항목 | 체크리스트 | 상태 |
|------|-----------|------|
| **백엔드** | 빌드 성공, 테스트 71/71, lint 통과 | ✅ |
| **프론트엔드** | 빌드 성공, E2E 통과, lint 통과 | ✅ |
| **LocalStack** | 통합 테스트 통과 | ✅ |
| **환경 변수** | `.env.production` 설정 | ⏳ 배포 시 |
| **도메인** | greenflow.dev 설정 | ⏳ 배포 시 |
| **SSL/HTTPS** | 인증서 준비 | ⏳ 배포 시 |
| **모니터링** | Sentry, Google Analytics | ⏳ 배포 시 |
| **백업** | 데이터베이스 백업 전략 | ⏳ 배포 시 |

---

## 🚀 배포 실행 가이드

### **1단계: LocalStack 통합 테스트 완료**

```bash
# 모든 항목 통과 확인
docker-compose -f docker-compose.localstack.yml up -d
npm run test:integration
# ✅ 모두 통과 시 다음 단계로 진행
```

### **2단계: 스테이징 배포 (테스트)**

```bash
# 백엔드 (AWS ECS / GCP Cloud Run)
docker build -t glec-api:v1.0.0 projects/glec-api-backend/
docker tag glec-api:v1.0.0 your-registry/glec-api:v1.0.0
docker push your-registry/glec-api:v1.0.0

# 프론트엔드 (Vercel staging)
cd projects/green-logistics-landing
VITE_API_BASE_URL=https://staging-api.greenflow.dev/api/v2 npm run build
vercel deploy --env staging
```

### **3단계: 스테이징 검증 (E2E 테스트)**

```bash
# 스테이징 환경에서 E2E 테스트
BASE_URL=https://staging.greenflow.dev npm run test:e2e:deployment
```

### **4단계: 프로덕션 배포**

```bash
# 백엔드 프로덕션 배포
docker tag glec-api:v1.0.0 your-registry/glec-api:latest
docker push your-registry/glec-api:latest
# 클라우드 프로덕션 배포 실행

# 프론트엔드 프로덕션 배포
cd projects/green-logistics-landing
VITE_API_BASE_URL=https://api.greenflow.dev/api/v2 npm run build
vercel deploy --prod
```

---

## 📊 성공 지표

| 지표 | 목표 | 현황 |
|------|------|------|
| **빌드 성공률** | 100% | ✅ |
| **테스트 통과율** | 100% | ✅ |
| **로컬 통합 테스트** | 통과 | ✅ |
| **E2E 테스트** | 통과 | ⏳ 배포 테스트 추가 예정 |
| **성능 (P95)** | <300ms | ⏳ 배포 후 측정 |
| **가용성** | 99.9% | ⏳ 배포 후 측정 |
| **오류율** | <0.1% | ⏳ 배포 후 측정 |

---

## 🔄 배포 후 모니터링

### **1시간 이내 (긴급 체크)**
```bash
# 헬스 체크
curl https://api.greenflow.dev/api/v2/health
curl https://greenflow.dev/

# 에러 로깅 (Sentry)
# - 에러 발생 여부 확인
# - 예외 처리 확인

# 성능 로깅
# - P95 응답시간 < 300ms
# - P99 응답시간 < 1s
```

### **1일 이내 (기본 검증)**
```bash
# 주요 기능 테스트
# - 사용자 가입
# - 로그인
# - 입찰 생성
# - 제안 수신
# - 실시간 업데이트

# 데이터베이스 정상성
# - 연결 수 확인
# - 쿼리 성능 확인
# - 백업 상태 확인
```

### **1주일 이내 (상세 검증)**
```bash
# 성능 분석
npm run lighthouse

# 비용 분석
# - AWS 비용 확인
# - CDN 비용 확인

# 사용자 피드백
# - 버그 리포트 확인
# - 성능 문제 확인
```

---

## 📞 지원 & 트러블슈팅

### **LocalStack 연결 실패**
```bash
# 1. LocalStack 상태 확인
docker-compose -f docker-compose.localstack.yml ps

# 2. 포트 확인
lsof -i :4566

# 3. 다시 시작
docker-compose -f docker-compose.localstack.yml restart localstack
```

### **데이터베이스 연결 실패**
```bash
# 1. PostgreSQL 상태 확인
docker-compose -f docker-compose.localstack.yml exec postgres pg_isready

# 2. 환경 변수 확인
echo $DATABASE_URL

# 3. 마이그레이션 재실행
npm run db:migrate
```

### **테스트 실패**
```bash
# 1. 로그 확인
docker-compose -f docker-compose.localstack.yml logs -f

# 2. 데이터베이스 초기화
npm run db:reset

# 3. 캐시 삭제
docker-compose -f docker-compose.localstack.yml down -v
```

---

## 🎯 다음 단계

1. ✅ **현재**: 배포 테스트 계획 수립
2. ⏳ **다음**: LocalStack 환경 구성 실행
3. ⏳ **그 다음**: 통합 테스트 시나리오 구현
4. ⏳ **최종**: CI/CD 파이프라인 통합

---

**마지막 업데이트**: 2026-02-04
**상태**: 🔄 구현 준비 중
**다음 검토**: 배포 테스트 환경 구성 완료 후
