# GreenFlow 배포 테스트 - 빠른 시작 가이드

**⏱️ 예상 소요 시간**: 10-15분

---

## 🚀 5단계로 배포 테스트 시작하기

### **1단계: 사전 준비 (1분)**

```bash
# 프로젝트 루트로 이동
cd /Users/kevin/openclaw-workspace

# 필수 도구 설치 확인
docker --version      # Docker 20.10+ 필요
docker-compose --version  # Docker Compose 2.0+ 필요
node --version        # Node.js 18+ 필요
npm --version         # npm 9+ 필요
```

### **2단계: 배포 테스트 환경 시작 (5-10분)**

```bash
# 자동 설정 스크립트 실행
bash scripts/deployment-test.sh

# ✅ 완료되면 다음과 같은 메시지가 표시됨:
# ✨ 배포 테스트 준비 완료!
```

이 스크립트가 자동으로 수행합니다:
- ✅ Docker 이미지 빌드 (백엔드 + 프론트엔드)
- ✅ Docker Compose 서비스 시작
- ✅ 데이터베이스 마이그레이션
- ✅ 테스트 데이터 로드
- ✅ 헬스 체크 및 API 테스트

### **3단계: 서비스 접근 (즉시)**

#### **프론트엔드 테스트**
```bash
# 브라우저에서 열기
open http://localhost:5173

# 또는 커맨드라인에서 확인
curl http://localhost:5173
```

#### **백엔드 API 테스트**
```bash
# 헬스 체크
curl http://localhost:3000/api/v2/health

# 응답 예시:
# {
#   "status": "ok",
#   "timestamp": "2026-02-04T22:30:00Z",
#   "database": "connected",
#   "redis": "connected"
# }
```

#### **데이터베이스 접근 (pgAdmin)**
```
URL: http://localhost:5050
이메일: admin@greenflow.dev
비밀번호: admin
```

### **4단계: 통합 테스트 실행**

#### **백엔드 테스트**
```bash
# 컨테이너에 접속
docker-compose -f docker-compose.deployment-test.yml exec backend bash

# 테스트 실행
npm run test:integration

# 결과: ✅ 모든 통합 테스트 통과
```

#### **프론트엔드 E2E 테스트**
```bash
# 호스트 머신에서 실행
cd projects/green-logistics-landing

# 브라우저 기반 E2E 테스트
npm run test:e2e:deployment \
  --env VITE_API_BASE_URL=http://localhost:3000/api/v2
```

### **5단계: 정리**

```bash
# 모든 컨테이너 종료 (데이터 유지)
docker-compose -f docker-compose.deployment-test.yml down

# 모든 컨테이너 및 데이터 삭제 (완전 정리)
docker-compose -f docker-compose.deployment-test.yml down -v
```

---

## 🔍 주요 서비스 접근 정보

| 서비스 | URL | 용도 |
|--------|-----|------|
| **프론트엔드** | http://localhost:5173 | 사용자 인터페이스 |
| **백엔드 API** | http://localhost:3000/api/v2 | REST API |
| **헬스 체크** | http://localhost:3000/api/v2/health | 시스템 상태 |
| **메트릭** | http://localhost:3000/api/v2/metrics | Prometheus 메트릭 |
| **PostgreSQL** | localhost:5432 | 데이터베이스 |
| **Redis** | localhost:6379 | 캐시 & 실시간 |
| **LocalStack** | http://localhost:4566 | AWS 에뮬레이션 |
| **pgAdmin** | http://localhost:5050 | DB 웹 관리 |
| **Prometheus** | http://localhost:9090 | 메트릭 대시보드 |
| **Grafana** | http://localhost:3001 | 모니터링 대시보드 |

**로그인 정보**:
- **pgAdmin**: admin@greenflow.dev / admin
- **Grafana**: admin / admin

---

## 🐛 트러블슈팅

### **포트 이미 사용 중**
```bash
# 포트 사용 프로세스 확인
lsof -i :3000
lsof -i :5173
lsof -i :5432

# 프로세스 종료
kill -9 <PID>

# 또는 모든 컨테이너 정리
docker-compose -f docker-compose.deployment-test.yml down -v
```

### **메모리 부족 에러**
```bash
# Docker Desktop 메모리 증가 (설정 → Resources)
# 권장: 4GB+ RAM 할당

# 또는 부분적으로 시작
docker-compose -f docker-compose.deployment-test.yml up -d \
  localstack postgres redis backend
```

### **데이터베이스 연결 실패**
```bash
# PostgreSQL 로그 확인
docker-compose -f docker-compose.deployment-test.yml logs postgres

# 데이터베이스 재초기화
docker-compose -f docker-compose.deployment-test.yml down -v
docker-compose -f docker-compose.deployment-test.yml up -d
```

### **API 응답 오류**
```bash
# 백엔드 로그 확인
docker-compose -f docker-compose.deployment-test.yml logs -f backend

# 또는 컨테이너에 직접 접속
docker-compose -f docker-compose.deployment-test.yml exec backend bash

# API 테스트
curl -v http://localhost:3000/api/v2/health
```

---

## 📊 테스트 결과 확인

### **헬스 체크 응답 예시**
```bash
$ curl http://localhost:3000/api/v2/health

{
  "status": "ok",
  "timestamp": "2026-02-04T22:35:00Z",
  "uptime": 125.456,
  "database": {
    "status": "connected",
    "latency": 2.3
  },
  "redis": {
    "status": "connected",
    "memory": "1.2mb"
  },
  "environment": "test"
}
```

### **메트릭 확인**
```bash
$ curl http://localhost:3000/api/v2/metrics | head -20

# HELP nodejs_version_info Node.js version info
# TYPE nodejs_version_info gauge
nodejs_version_info{version="v18.19.0",major="18",minor="19",patch="0"} 1

# HELP process_cpu_usage_percent CPU usage
# TYPE process_cpu_usage_percent gauge
process_cpu_usage_percent 2.5

# ... (더 많은 메트릭)
```

---

## ✅ 배포 준비 체크리스트

배포 테스트가 완료되었으면, 다음을 확인하세요:

```
배포 전 확인 사항
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ LocalStack 환경
  □ 모든 AWS 서비스 시작됨
  □ S3, SQS, SNS, Lambda 정상
  □ 로그에 에러 없음

✅ 백엔드 API
  □ 헬스 체크 통과
  □ API 엔드포인트 응답 정상
  □ 데이터베이스 연결 OK
  □ Redis 캐시 정상
  □ 메트릭 수집 중

✅ 프론트엔드
  □ UI 로드됨
  □ API 연결 성공
  □ E2E 테스트 통과
  □ 성능 메트릭 수집

✅ 통합 테스트
  □ 백엔드 통합 테스트 통과
  □ 백엔드 단위 테스트 통과
  □ E2E 테스트 통과
  □ 번들 크기 적정

✅ 배포 준비
  □ Docker 이미지 빌드 성공
  □ Dockerfile 최적화
  □ 환경 변수 설정 완료
  □ 도메인 DNS 설정 완료
  □ SSL 인증서 준비
  □ 데이터베이스 백업 계획
  □ 모니터링 (Sentry, Analytics) 설정
```

---

## 🚀 다음 단계

### **로컬 테스트 완료 후**

1. **스테이징 배포**
   ```bash
   # 환경 변수 업데이트
   export VITE_API_BASE_URL=https://staging-api.greenflow.dev/api/v2

   # 스테이징 환경에 배포
   npm run build
   vercel deploy  # 프론트엔드
   # + 백엔드 배포
   ```

2. **스테이징 E2E 테스트**
   ```bash
   BASE_URL=https://staging.greenflow.dev npm run test:e2e:deployment
   ```

3. **프로덕션 배포**
   ```bash
   # 최종 확인
   npm run build

   # 프로덕션에 배포
   vercel deploy --prod
   npm run start:prod  # 백엔드
   ```

---

## 📞 도움말

### **자세한 정보**
- 📖 [전체 배포 계획](./DEPLOYMENT_TEST_PLAN.md)
- 🔧 [배포 가이드](./DEPLOYMENT_GUIDE.md)
- 🐳 [LocalStack 통합](./LOCALSTACK_INTEGRATION.md)

### **로그 확인**
```bash
# 모든 로그 실시간 확인
docker-compose -f docker-compose.deployment-test.yml logs -f

# 특정 서비스만 확인
docker-compose -f docker-compose.deployment-test.yml logs -f backend
docker-compose -f docker-compose.deployment-test.yml logs -f frontend
docker-compose -f docker-compose.deployment-test.yml logs -f postgres
```

### **상태 확인**
```bash
# 실행 중인 컨테이너 확인
docker-compose -f docker-compose.deployment-test.yml ps

# 리소스 사용량 확인
docker stats

# 네트워크 확인
docker network inspect greenflow-network
```

---

**마지막 업데이트**: 2026-02-04
**상태**: ✅ 배포 테스트 준비 완료
**예상 배포 시간**: 스테이징 24시간, 프로덕션 1주일
