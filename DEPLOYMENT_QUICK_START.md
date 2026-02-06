# ⚡ 배포 빠른 시작 가이드

**작성일**: 2026-02-05
**목표**: 5분 안에 개발 환경 구성

---

## 1️⃣ 백엔드 설정 (3분)

### 단계 1: 데이터베이스 초기화

```bash
# PostgreSQL 사용자 생성
psql -U postgres -c "CREATE USER glec_user WITH PASSWORD 'password' CREATEDB;"

# 데이터베이스 생성
psql -U postgres -c "CREATE DATABASE glec_api OWNER glec_user;"

# 또는 Docker 사용 (권장)
cd projects/glec-api-backend
docker-compose up -d postgres redis
```

### 단계 2: 환경 설정

```bash
# .env 파일 생성
cp .env.example .env

# 필요한 값 설정
cat >> .env << EOF
DB_HOST=localhost
DB_PORT=5432
DB_NAME=glec_api
DB_USER=glec_user
DB_PASSWORD=password
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=$(openssl rand -base64 32)
EOF
```

### 단계 3: 마이그레이션 & 서버 시작

```bash
# 마이그레이션
npm install
npm run db:migrate

# 서버 시작 (백그라운드)
npm run start:prod &

# 헬스 체크
sleep 2
curl http://localhost:3000/api/v2/health
# 출력: {"status":"ok",...}
```

---

## 2️⃣ 프론트엔드 설정 (2분)

### 단계 1: 환경 설정

```bash
cd ../green-logistics-landing

cat > .env.local << EOF
VITE_API_BASE_URL=http://localhost:3000/api/v2
EOF
```

### 단계 2: 개발 서버 시작

```bash
npm install
npm run dev

# 브라우저 자동 열림
# 또는 수동으로: http://localhost:5173/console
```

---

## ✅ 검증 (즉시)

### API 키 페이지
```
URL: http://localhost:5173/console/api-keys
확인 사항:
✅ 페이지 로드됨
✅ API 키 테이블 표시됨
✅ "Create New Key" 버튼 작동
```

### 로그 페이지
```
URL: http://localhost:5173/console/logs
확인 사항:
✅ 페이지 로드됨
✅ 로그 테이블 표시됨
✅ "Live" 버튼으로 실시간 스트림 시작 가능
```

### 대시보드
```
URL: http://localhost:5173/console
확인 사항:
✅ 4개 메트릭 카드 표시됨
✅ 엔드포인트 차트 표시됨
✅ Recent Activity 표시됨
```

---

## 🧪 E2E 테스트 (선택 사항)

```bash
# 모든 테스트 실행
npx playwright test tests/e2e_console_api.spec.mjs

# 결과
# 27 passed (100%)
```

---

## 🆘 문제 해결

### Backend가 시작되지 않음

```bash
# 1. 로그 확인
npm run start:prod

# 2. PostgreSQL 확인
psql -U glec_user -d glec_api -c "SELECT 1;"

# 3. Redis 확인
redis-cli ping

# 4. 포트 확인
lsof -i :3000
```

### Frontend에서 API 호출 실패

```bash
# 1. Backend 헬스 체크
curl http://localhost:3000/api/v2/health

# 2. CORS 설정 확인
# Backend .env:
CORS_ORIGIN=http://localhost:5173

# 3. 브라우저 콘솔 에러 확인
# F12 → Console 탭
```

---

## 📊 최종 상태

| 서비스 | 상태 | URL |
|--------|------|-----|
| Backend API | ✅ 실행 | http://localhost:3000 |
| Frontend Dev | ✅ 실행 | http://localhost:5173 |
| PostgreSQL | ✅ 실행 | localhost:5432 |
| Redis | ✅ 실행 | localhost:6379 |
| Swagger | ✅ 접근 가능 | http://localhost:5173/console/documentation |

---

## 🚀 다음 단계

1. **로컬 개발**: 기능 개발 및 테스트
2. **E2E 테스트**: 모든 테스트 통과 확인
3. **프로덕션 배포**: Vercel, Netlify, 또는 AWS로 배포

자세한 내용은 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) 참조.

---

**완료! 🎉**
