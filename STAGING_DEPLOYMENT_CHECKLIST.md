# 스테이징 배포 체크리스트

**작성일**: 2026-02-04
**상태**: 🔄 준비 중
**예상 완료**: 2026-02-05

---

## 📋 배포 전 확인 사항

### 1단계: 환경 설정 (1시간)

- [ ] `.env.staging` 파일 생성
- [ ] 데이터베이스 자격증명 설정
- [ ] Redis 연결 정보 확인
- [ ] AWS S3 버킷 생성 (staging)
- [ ] 환경 변수 검증

```bash
# 환경 변수 확인
cat .env.staging | grep -E "^[A-Z_]+=" | wc -l
# 결과: 20+ 개의 변수가 설정되어야 함
```

### 2단계: 인프라 준비 (2-3시간)

#### 옵션 A: AWS ECS 배포

- [ ] AWS ECR (Elastic Container Registry) 생성
- [ ] Docker 이미지 푸시

```bash
# ECR 로그인
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

# 이미지 태그 지정
docker tag glec-api:test 123456789.dkr.ecr.us-east-1.amazonaws.com/glec-api:staging
docker tag greenflow-frontend:test 123456789.dkr.ecr.us-east-1.amazonaws.com/greenflow-frontend:staging

# 이미지 푸시
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/glec-api:staging
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/greenflow-frontend:staging
```

- [ ] ECS 클러스터 생성
- [ ] Task Definition 생성
- [ ] Load Balancer 설정
- [ ] Auto Scaling 정책 설정

#### 옵션 B: GCP Cloud Run 배포

- [ ] Google Artifact Registry 생성
- [ ] Docker 이미지 푸시

```bash
# GCP 인증
gcloud auth configure-docker us-docker.pkg.dev

# 이미지 태그
docker tag glec-api:test us-docker.pkg.dev/PROJECT_ID/greenflow/glec-api:staging
docker tag greenflow-frontend:test us-docker.pkg.dev/PROJECT_ID/greenflow/greenflow-frontend:staging

# 푸시
docker push us-docker.pkg.dev/PROJECT_ID/greenflow/glec-api:staging
docker push us-docker.pkg.dev/PROJECT_ID/greenflow/greenflow-frontend:staging
```

- [ ] Cloud Run 서비스 배포 (백엔드)
- [ ] Cloud Storage 버킷 생성
- [ ] Cloud CDN 설정

#### 옵션 C: Heroku 배포 (간단함)

- [ ] Heroku 앱 생성

```bash
# 백엔드 배포
heroku create greenflow-api-staging
heroku buildpacks:add heroku/docker -a greenflow-api-staging
git push heroku main -a greenflow-api-staging

# 프론트엔드는 Vercel 사용
```

### 3단계: 데이터베이스 설정 (1시간)

- [ ] RDS 인스턴스 생성 (PostgreSQL 15+)
  - Instance: db.t3.micro (스테이징)
  - Storage: 100GB
  - Multi-AZ: 아니오 (비용 절감)
  - Backup: 7일 보관

```bash
# RDS 연결 확인
psql -h staging-db.example.com -U glec_staging_user -d glec_staging -c "SELECT version();"
```

- [ ] ElastiCache 인스턴스 생성 (Redis)
  - Node type: cache.t3.micro
  - Automatic failover: 아니오

```bash
# Redis 연결 확인
redis-cli -h staging-redis.example.com -p 6379 ping
```

- [ ] 데이터베이스 마이그레이션 실행

```bash
# 원격 서버에서 실행
npm run db:migrate --env=staging
npm run db:seed:staging  # 스테이징 데이터 로드
```

### 4단계: 도메인 & SSL 설정 (30분)

- [ ] 도메인 구입: `staging.greenflow.dev`
- [ ] Route53 (AWS) 또는 Cloud DNS (GCP)에 DNS 레코드 추가

```bash
# A 레코드 (프론트엔드)
staging.greenflow.dev A 1.2.3.4  # Load Balancer IP

# CNAME 레코드 (API)
staging-api.greenflow.dev CNAME greenflow-api-staging.herokuapp.com
```

- [ ] SSL 인증서 발급 (AWS Certificate Manager 또는 Let's Encrypt)
- [ ] 인증서 ELB/ALB에 연결

### 5단계: 프론트엔드 배포 (30분)

#### Vercel 배포 (권장)

```bash
# 1. Vercel 프로젝트 생성
vercel link --confirm

# 2. 환경 변수 설정
vercel env add VITE_API_BASE_URL
# 값: https://staging-api.greenflow.dev/api/v2

vercel env add VITE_GA_MEASUREMENT_ID
# 값: G-STAGING_MEASUREMENT_ID

# 3. 스테이징 배포
vercel deploy --prod
```

- [ ] 빌드 성공 확인
- [ ] 배포 URL 확인: https://staging.greenflow.dev
- [ ] 프론트엔드 로드 확인

### 6단계: 백엔드 배포 (1시간)

#### ECS 배포 (AWS)

```bash
# 1. Task Definition 생성
aws ecs register-task-definition \
  --cli-input-json file://task-definition-staging.json

# 2. ECS 서비스 업데이트
aws ecs update-service \
  --cluster greenflow-staging \
  --service greenflow-api \
  --force-new-deployment
```

#### Cloud Run 배포 (GCP)

```bash
# 1. 서비스 배포
gcloud run deploy greenflow-api-staging \
  --image us-docker.pkg.dev/PROJECT_ID/greenflow/glec-api:staging \
  --platform managed \
  --region us-central1 \
  --env-vars-file .env.staging

# 2. 트래픽 100% 할당
gcloud run services update-traffic greenflow-api-staging \
  --to-revisions LATEST=100
```

- [ ] 헬스 체크 통과 확인

```bash
curl https://staging-api.greenflow.dev/api/v2/health
```

### 7단계: 모니터링 설정 (1시간)

- [ ] Sentry 프로젝트 생성 (에러 추적)
- [ ] Google Analytics 설정 (사용자 분석)
- [ ] CloudWatch 대시보드 생성 (AWS)
- [ ] 로그 집계 (CloudWatch Logs 또는 Google Cloud Logging)

```bash
# Sentry 설정 확인
curl https://staging-api.greenflow.dev/api/v2/health | grep sentry
```

### 8단계: E2E 테스트 (1시간)

```bash
# 스테이징 환경에서 E2E 테스트 실행
export BASE_URL=https://staging.greenflow.dev
npm run test:e2e:deployment

# 예상 결과: 모든 테스트 통과 ✅
```

- [ ] 로그인 기능 테스트
- [ ] 데이터 조회 테스트
- [ ] API 통신 테스트
- [ ] 에러 처리 테스트

### 9단계: 보안 점검 (30분)

- [ ] HTTPS 활성화 확인
- [ ] CORS 설정 검증
- [ ] 환경 변수 노출 확인 (`.env` 파일 커밋 안 됨)
- [ ] 민감한 데이터 마스킹 확인 (로그에 비밀번호 노출 안 됨)
- [ ] 보안 헤더 설정

```bash
# 보안 헤더 확인
curl -I https://staging.greenflow.dev | grep -E "Security|X-"
```

### 10단계: 성능 테스트 (1시간)

```bash
# 백엔드 성능 테스트
apache2-benchmark -n 1000 -c 100 https://staging-api.greenflow.dev/api/v2/health

# 프론트엔드 성능 측정
npm run build:performance
lighthouse https://staging.greenflow.dev
```

- [ ] 백엔드 응답 시간 < 500ms
- [ ] 프론트엔드 Lighthouse 점수 > 80
- [ ] 데이터베이스 쿼리 성능 확인

---

## ⏱️ 전체 소요 시간

| 단계 | 소요 시간 | 상태 |
|------|---------|------|
| 환경 설정 | 1시간 | ⏳ |
| 인프라 준비 | 2-3시간 | ⏳ |
| DB 설정 | 1시간 | ⏳ |
| 도메인/SSL | 30분 | ⏳ |
| 프론트엔드 배포 | 30분 | ⏳ |
| 백엔드 배포 | 1시간 | ⏳ |
| 모니터링 | 1시간 | ⏳ |
| E2E 테스트 | 1시간 | ⏳ |
| 보안 점검 | 30분 | ⏳ |
| 성능 테스트 | 1시간 | ⏳ |
| **총계** | **10-12시간** | 🔄 |

---

## 🔗 참고 문서

- [STAGING_DEPLOYMENT_GUIDE.md](./STAGING_DEPLOYMENT_GUIDE.md) - 상세 배포 가이드
- [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md) - 프로덕션 배포 가이드
- [DEPLOYMENT_TEST_QUICKSTART.md](./DEPLOYMENT_TEST_QUICKSTART.md) - 로컬 테스트 빠른 시작

---

## 📞 스테이징 배포 담당자

- **프론트엔드**: Vercel을 통한 자동 배포
- **백엔드**: AWS ECS 또는 GCP Cloud Run
- **데이터베이스**: AWS RDS PostgreSQL
- **캐시**: AWS ElastiCache Redis

---

**마지막 업데이트**: 2026-02-04
**상태**: 🔄 배포 준비 중
**예상 완료**: 2026-02-05 (24시간 이내)
