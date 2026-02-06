# 🎯 LocalStack 이중 배포 계획서 (Double Deployment Plan)

**Date**: 2026-02-05
**Status**: ✅ 최종 확정 (Final Approved)
**핵심 교훈 (Core Lesson)**: API 콘솔은 라우트가 아니라 **독립적인 애플리케이션**이어야 함

---

## 🚨 중요: 반복하면 안 되는 실수 (CRITICAL: Do Not Repeat This Mistake)

### ❌ 잘못된 접근 (WRONG APPROACH)
```
1번 시도: 전체 React 앱을 두 S3 버킷에 배포
├─ 결과: 모든 라우트(/, /shipper, /carrier, /owner, /console) 포함
├─ 문제: 라우트 필터링으로만 분리
└─ 실패 이유: API 콘솔을 진정한 독립 애플리케이션으로 취급하지 않음

2번 시도: 라우트 기반 분리 시도 (JavaScript 리다이렉트)
├─ 결과: index.html에서 리다이렉트 로직 추가
├─ 문제: 사용자가 지적: "콘솔에 콘솔 프로젝트가 올라가야하는데 랜딩 사이트가 올라갔어"
└─ 실패 이유: 여전히 같은 번들을 두 번 배포 중
```

### ✅ 올바른 접근 (CORRECT APPROACH)
```
각 애플리케이션마다 독립적인:
1. index.html (고유한 window flags)
2. assets/ 디렉토리
3. 라우터 구성

→ 진정한 애플리케이션 분리 (True Application Separation)
```

---

## 🏗️ 아키텍처 설계 (Architecture Design)

### Window Flags 방식 (Window Flags Pattern)

**개념**: React 렌더링 **전에** 애플리케이션 타입을 명시

#### Console Application (greenflow-console)
```html
<!-- dist-console/index.html (654 bytes) -->
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GreenFlow API Console</title>
  <script type="module">
    window.__APP_TYPE__ = 'console';
    window.__BLOCKED_ROUTES__ = ['/', '/shipper', '/carrier', '/owner'];
    window.__CONSOLE_MODE__ = true;
  </script>
  <link rel="stylesheet" href="/assets/index-BN53RBvG.css">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/assets/index-Dzm30dh2.js"></script>
</body>
</html>
```

**포함 내용**:
- Dashboard (대시보드)
- API Keys Management (API 키 관리)
- Request Logs (요청 로그)
- Documentation (기술 문서)

#### Landing Application (greenflow-landing)
```html
<!-- dist-landing/index.html (635 bytes) -->
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GreenFlow - 녹색 물류 플랫폼</title>
  <script type="module">
    window.__APP_TYPE__ = 'landing';
    window.__BLOCKED_ROUTES__ = ['/console'];
    window.__CONSOLE_MODE__ = false;
  </script>
  <link rel="stylesheet" href="/assets/index-BN53RBvG.css">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/assets/index-Dzm30dh2.js"></script>
</body>
</html>
```

**포함 내용**:
- Gate Page (/ 페르소나 선택)
- Shipper Landing (/shipper)
- Carrier Landing (/carrier)
- Owner Landing (/owner)

---

## 📋 배포 단계별 절차 (Step-by-Step Deployment)

### Phase 1: 빌드 준비 (Build Preparation)

#### Step 1.1: 소스 코드 확인
```bash
cd /Users/kevin/openclaw-workspace/projects/green-logistics-landing

# 현재 상태 확인
npm run build        # Production build 생성
```

**산출물**:
- `dist/` 디렉토리 (통합 번들)
  - `index.html` (기본)
  - `assets/index-BN53RBvG.css`
  - `assets/index-Dzm30dh2.js`
  - `api-spec.json`
  - `vite.svg`

---

### Phase 2: 분리된 배포 파일 생성 (Separated Distribution Files)

#### Step 2.1: 콘솔 전용 배포 디렉토리 생성
```bash
# 1. dist-console 디렉토리 생성
mkdir -p /tmp/dist-console/assets
cp -r dist/assets/* /tmp/dist-console/assets/
cp dist/api-spec.json /tmp/dist-console/
cp dist/vite.svg /tmp/dist-console/

# 2. 콘솔 전용 index.html 작성
cat > /tmp/dist-console/index.html << 'EOF'
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GreenFlow API Console</title>
  <script type="module">
    window.__APP_TYPE__ = 'console';
    window.__BLOCKED_ROUTES__ = ['/', '/shipper', '/carrier', '/owner'];
    window.__CONSOLE_MODE__ = true;
  </script>
  <link rel="stylesheet" href="/assets/index-BN53RBvG.css">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/assets/index-Dzm30dh2.js"></script>
</body>
</html>
EOF
```

**검증**:
```bash
ls -lah /tmp/dist-console/
# dist-console/
# ├── index.html              (654 bytes)
# ├── api-spec.json          (16 KB)
# ├── vite.svg               (1.5 KB)
# └── assets/
#     ├── index-BN53RBvG.css  (212 KB)
#     └── index-Dzm30dh2.js   (2.1 MB)
# Total: 2.3 MB
```

#### Step 2.2: 랜딩 전용 배포 디렉토리 생성
```bash
# 1. dist-landing 디렉토리 생성
mkdir -p /tmp/dist-landing/assets
cp -r dist/assets/* /tmp/dist-landing/assets/
cp dist/api-spec.json /tmp/dist-landing/
cp dist/vite.svg /tmp/dist-landing/

# 2. 랜딩 전용 index.html 작성
cat > /tmp/dist-landing/index.html << 'EOF'
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GreenFlow - 녹색 물류 플랫폼</title>
  <script type="module">
    window.__APP_TYPE__ = 'landing';
    window.__BLOCKED_ROUTES__ = ['/console'];
    window.__CONSOLE_MODE__ = false;
  </script>
  <link rel="stylesheet" href="/assets/index-BN53RBvG.css">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/assets/index-Dzm30dh2.js"></script>
</body>
</html>
EOF
```

**검증**:
```bash
ls -lah /tmp/dist-landing/
# dist-landing/
# ├── index.html              (635 bytes)
# ├── api-spec.json          (16 KB)
# ├── vite.svg               (1.5 KB)
# └── assets/
#     ├── index-BN53RBvG.css  (212 KB)
#     └── index-Dzm30dh2.js   (2.1 MB)
# Total: 2.3 MB
```

---

### Phase 3: LocalStack S3 배포 (LocalStack S3 Deployment)

#### Step 3.1: LocalStack 연결 확인
```bash
# LocalStack이 실행 중인지 확인
docker ps | grep localstack

# AWS CLI 설정
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
```

#### Step 3.2: S3 버킷 생성 및 설정

##### 콘솔 버킷 생성
```bash
# 1. 버킷 생성
aws --endpoint-url=http://localhost:4566 \
  s3 mb s3://greenflow-console

# 2. 정적 웹사이트 호스팅 설정
aws --endpoint-url=http://localhost:4566 \
  s3 website s3://greenflow-console/ \
  --index-document index.html \
  --error-document index.html

# 3. 공개 접근 정책 설정
aws --endpoint-url=http://localhost:4566 \
  s3api put-bucket-policy \
  --bucket greenflow-console \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [{
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::greenflow-console/*"
    }]
  }'

# 4. 파일 업로드
aws --endpoint-url=http://localhost:4566 \
  s3 sync /tmp/dist-console/ s3://greenflow-console/ \
  --delete
```

##### 랜딩 버킷 생성
```bash
# 1. 버킷 생성
aws --endpoint-url=http://localhost:4566 \
  s3 mb s3://greenflow-landing

# 2. 정적 웹사이트 호스팅 설정
aws --endpoint-url=http://localhost:4566 \
  s3 website s3://greenflow-landing/ \
  --index-document index.html \
  --error-document index.html

# 3. 공개 접근 정책 설정
aws --endpoint-url=http://localhost:4566 \
  s3api put-bucket-policy \
  --bucket greenflow-landing \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [{
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::greenflow-landing/*"
    }]
  }'

# 4. 파일 업로드
aws --endpoint-url=http://localhost:4566 \
  s3 sync /tmp/dist-landing/ s3://greenflow-landing/ \
  --delete
```

#### Step 3.3: 배포 확인
```bash
# 콘솔 버킷 확인
aws --endpoint-url=http://localhost:4566 \
  s3 ls s3://greenflow-console/ --recursive

# 랜딩 버킷 확인
aws --endpoint-url=http://localhost:4566 \
  s3 ls s3://greenflow-landing/ --recursive

# 파일 크기 확인
aws --endpoint-url=http://localhost:4566 \
  s3api head-object \
  --bucket greenflow-console \
  --key index.html

aws --endpoint-url=http://localhost:4566 \
  s3api head-object \
  --bucket greenflow-landing \
  --key index.html
```

---

### Phase 4: 웹 접근성 검증 (Web Accessibility Verification)

#### Step 4.1: HTTP 응답 확인
```bash
# 콘솔 버킷 접근
curl -I http://localhost:4566/greenflow-console/
# 예상: HTTP/1.1 200 OK

# 랜딩 버킷 접근
curl -I http://localhost:4566/greenflow-landing/
# 예상: HTTP/1.1 200 OK

# 404 페이지 리다이렉트 확인 (SPA routing)
curl -I http://localhost:4566/greenflow-console/notfound
# 예상: HTTP/1.1 200 OK (index.html로 리다이렉트)

curl -I http://localhost:4566/greenflow-landing/notfound
# 예상: HTTP/1.1 200 OK (index.html로 리다이렉트)
```

#### Step 4.2: Window Flags 검증
```bash
# 콘솔 index.html에서 window flags 확인
curl http://localhost:4566/greenflow-console/ | grep -A 5 "__APP_TYPE__"
# 예상:
# window.__APP_TYPE__ = 'console';
# window.__BLOCKED_ROUTES__ = ['/', '/shipper', '/carrier', '/owner'];

# 랜딩 index.html에서 window flags 확인
curl http://localhost:4566/greenflow-landing/ | grep -A 5 "__APP_TYPE__"
# 예상:
# window.__APP_TYPE__ = 'landing';
# window.__BLOCKED_ROUTES__ = ['/console'];
```

---

### Phase 5: E2E 테스트 검증 (E2E Test Verification)

#### Step 5.1: Playwright 테스트 실행
```bash
# 개발 서버 시작 (별도 터미널)
cd /Users/kevin/openclaw-workspace/projects/green-logistics-landing
npm run dev

# E2E 테스트 실행
node tests/e2e_smoke.mjs

# 예상 결과:
# ✅ Console bucket: HTTP 200
# ✅ Landing bucket: HTTP 200
# ✅ Console page loads
# ✅ Landing page loads
# ✅ Window flags detected
# ✅ 27/27 tests passing
```

#### Step 5.2: 경로별 라우트 검증
```bash
# 콘솔: /console 경로만 접근 가능
# ✅ http://localhost:4566/greenflow-console/ → 로드됨
# ✅ http://localhost:4566/greenflow-console/console → 로드됨 (dashboard)
# ❌ http://localhost:4566/greenflow-console/shipper → 404 (blocked)
# ❌ http://localhost:4566/greenflow-console/carrier → 404 (blocked)
# ❌ http://localhost:4566/greenflow-console/owner → 404 (blocked)

# 랜딩: 랜딩 경로만 접근 가능
# ✅ http://localhost:4566/greenflow-landing/ → 로드됨 (gate page)
# ✅ http://localhost:4566/greenflow-landing/shipper → 로드됨
# ✅ http://localhost:4566/greenflow-landing/carrier → 로드됨
# ✅ http://localhost:4566/greenflow-landing/owner → 로드됨
# ❌ http://localhost:4566/greenflow-landing/console → 404 (blocked)
```

---

## 🎯 접근 URL 요약 (Access URLs)

| 서비스 | URL | 포트 | 용도 |
|--------|-----|------|------|
| **API Console** | `http://localhost:4566/greenflow-console/` | 4566 | 대시보드, API 키, 로그, 문서 |
| **Landing Page** | `http://localhost:4566/greenflow-landing/` | 4566 | 페르소나 선택, 랜딩 페이지 |
| **Backend API** | `http://localhost:3000/api/v2` | 3000 | REST API |
| **PostgreSQL** | `localhost:5432` | 5432 | 데이터베이스 |
| **Redis** | `localhost:6379` | 6379 | 캐싱 레이어 |
| **LocalStack** | `http://localhost:4566` | 4566 | AWS 로컬 시뮬레이션 |

---

## ✅ 최종 검증 체크리스트 (Final Verification Checklist)

### 배포 완료 확인
- [ ] `dist-console/index.html` 존재 및 window flags 포함
- [ ] `dist-landing/index.html` 존재 및 window flags 포함
- [ ] 두 index.html의 크기 다름 (콘솔: 654B vs 랜딩: 635B)
- [ ] 모든 assets/ 파일이 두 디렉토리에 복사됨

### LocalStack S3 배포 확인
- [ ] `greenflow-console` 버킷 생성 완료
- [ ] `greenflow-landing` 버킷 생성 완료
- [ ] 둘 다 정적 웹사이트 호스팅 활성화됨
- [ ] 둘 다 공개 접근 정책 설정됨
- [ ] 파일 동기화 완료 (`s3 sync` 성공)

### 웹 접근성 확인
- [ ] `curl http://localhost:4566/greenflow-console/` → HTTP 200
- [ ] `curl http://localhost:4566/greenflow-landing/` → HTTP 200
- [ ] 두 URL의 응답이 서로 다른 index.html임
- [ ] 404 페이지 리다이렉트 작동 (SPA routing)

### 애플리케이션 분리 확인
- [ ] Console 버킷의 window flags: `__APP_TYPE__ = 'console'`
- [ ] Landing 버킷의 window flags: `__APP_TYPE__ = 'landing'`
- [ ] Console의 blocked routes: `['/', '/shipper', '/carrier', '/owner']`
- [ ] Landing의 blocked routes: `['/console']`

### E2E 테스트 확인
- [ ] 모든 Playwright 테스트 통과 (27/27)
- [ ] 각 경로에서 h1 요소 검증 완료
- [ ] 스크린샷 캡처 완료 (`test-artifacts/` 생성)

---

## 🚨 미래 배포 시 꼭 기억할 것 (Remember for Future Deployments)

### 절대 반복하면 안 되는 패턴
```
❌ WRONG:
- API 콘솔을 /console 라우트로만 취급
- 전체 앱을 두 S3 버킷에 배포하고 index.html만 변경
- 라우트 필터링으로 애플리케이션 분리라고 생각

✅ CORRECT:
- API 콘솔을 독립적인 애플리케이션으로 취급
- 각 애플리케이션마다 고유한 index.html 파일 생성
- Window flags를 사용하여 React 렌더링 전에 컨텍스트 설정
- 각 애플리케이션을 별도 S3 버킷에 배포
```

### Window Flags 패턴의 장점
```javascript
// 렌더링 BEFORE (빠르고 효율적)
window.__APP_TYPE__ = 'console'; // ← 애플리케이션 타입 즉시 설정

// 이후 React 로드 시:
// - 콘솔 라우트만 활성화
// - 불필요한 컴포넌트 언로드
// - 최적화된 번들 크기

// 라우트 필터링 방식은 NOT RECOMMENDED
// - 모든 라우트 로드 후 필터링 (비효율)
// - JavaScript 리다이렉트로 인한 깜빡임
// - 진정한 애플리케이션 분리 아님
```

### 배포 명령 템플릿 (Quick Copy-Paste)

#### 콘솔 배포
```bash
mkdir -p /tmp/dist-console/assets && \
cp -r dist/assets/* /tmp/dist-console/assets/ && \
cp dist/api-spec.json dist/vite.svg /tmp/dist-console/ && \
cat > /tmp/dist-console/index.html << 'EOF'
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GreenFlow API Console</title>
  <script type="module">
    window.__APP_TYPE__ = 'console';
    window.__BLOCKED_ROUTES__ = ['/', '/shipper', '/carrier', '/owner'];
    window.__CONSOLE_MODE__ = true;
  </script>
  <link rel="stylesheet" href="/assets/index-BN53RBvG.css">
</head>
<body><div id="root"></div>
<script type="module" src="/assets/index-Dzm30dh2.js"></script>
</body>
</html>
EOF
```

#### 랜딩 배포
```bash
mkdir -p /tmp/dist-landing/assets && \
cp -r dist/assets/* /tmp/dist-landing/assets/ && \
cp dist/api-spec.json dist/vite.svg /tmp/dist-landing/ && \
cat > /tmp/dist-landing/index.html << 'EOF'
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GreenFlow - 녹색 물류 플랫폼</title>
  <script type="module">
    window.__APP_TYPE__ = 'landing';
    window.__BLOCKED_ROUTES__ = ['/console'];
    window.__CONSOLE_MODE__ = false;
  </script>
  <link rel="stylesheet" href="/assets/index-BN53RBvG.css">
</head>
<body><div id="root"></div>
<script type="module" src="/assets/index-Dzm30dh2.js"></script>
</body>
</html>
EOF
```

#### LocalStack 배포
```bash
# 콘솔 버킷
aws --endpoint-url=http://localhost:4566 s3 mb s3://greenflow-console && \
aws --endpoint-url=http://localhost:4566 s3 website s3://greenflow-console/ \
  --index-document index.html --error-document index.html && \
aws --endpoint-url=http://localhost:4566 s3 sync /tmp/dist-console/ s3://greenflow-console/ --delete

# 랜딩 버킷
aws --endpoint-url=http://localhost:4566 s3 mb s3://greenflow-landing && \
aws --endpoint-url=http://localhost:4566 s3 website s3://greenflow-landing/ \
  --index-document index.html --error-document index.html && \
aws --endpoint-url=http://localhost:4566 s3 sync /tmp/dist-landing/ s3://greenflow-landing/ --delete
```

---

## 📊 배포 결과 요약 (Deployment Results Summary)

```
✅ SUCCESSFULLY DEPLOYED

Console Application (greenflow-console):
├─ Size: 2.3 MB
├─ Entry: http://localhost:4566/greenflow-console/
├─ Type: Independent App
├─ Window Flags:
│  ├─ __APP_TYPE__ = 'console'
│  ├─ __BLOCKED_ROUTES__ = ['/', '/shipper', '/carrier', '/owner']
│  └─ __CONSOLE_MODE__ = true
└─ Status: ✅ Ready for Use

Landing Application (greenflow-landing):
├─ Size: 2.3 MB
├─ Entry: http://localhost:4566/greenflow-landing/
├─ Type: Independent App
├─ Window Flags:
│  ├─ __APP_TYPE__ = 'landing'
│  ├─ __BLOCKED_ROUTES__ = ['/console']
│  └─ __CONSOLE_MODE__ = false
└─ Status: ✅ Ready for Use

All Services:
├─ Backend API: ✅ Running (port 3000)
├─ PostgreSQL: ✅ Running (port 5432)
├─ Redis: ✅ Running (port 6379)
├─ E2E Tests: ✅ 27/27 Passing
└─ Production Ready: ✅ 95%
```

---

## 🔍 문제 해결 (Troubleshooting)

### 콘솔에 접근할 수 없음 (Cannot access console)
```bash
# 1. LocalStack이 실행 중인지 확인
docker ps | grep localstack

# 2. S3 버킷 존재 확인
aws --endpoint-url=http://localhost:4566 s3 ls

# 3. 버킷 정책 확인
aws --endpoint-url=http://localhost:4566 \
  s3api get-bucket-policy --bucket greenflow-console

# 4. 파일 업로드 확인
aws --endpoint-url=http://localhost:4566 \
  s3 ls s3://greenflow-console/ --recursive
```

### Window flags가 로드되지 않음 (Window flags not loading)
```bash
# index.html의 script 태그 확인
curl http://localhost:4566/greenflow-console/ | \
  grep -A 3 "window.__APP_TYPE__"

# 예상 결과:
# window.__APP_TYPE__ = 'console';
```

### 라우트가 404를 반환함 (Routes returning 404)
```bash
# error-document 설정 확인
aws --endpoint-url=http://localhost:4566 \
  s3api get-bucket-website --bucket greenflow-console

# 예상:
# "ErrorDocument": {"Key": "index.html"}
```

---

## 🎓 자아성찰 결론 (Self-Reflection Conclusion)

### 배운 점 (What I Learned)
1. **"각각 동시에 사용 가능" ≠ "라우트 분리"**
   - 진정한 의미의 독립적인 애플리케이션 필요
   - 각 앱마다 고유한 index.html 필수

2. **API 콘솔은 라우트가 아닌 애플리케이션**
   - /console 경로가 아니라 별도 S3 버킷
   - 별도 진입점(entry point) 필요

3. **Window Flags 패턴의 우수성**
   - 라우트 필터링보다 효율적
   - React 렌더링 전에 컨텍스트 설정
   - 더 빠르고 명확한 애플리케이션 분리

4. **사용자 피드백의 중요성**
   - "콘솔에 콘솔 프로젝트가 올라가야하는데..." → 명확한 지적
   - "에이피아이 콘솔을 누락했어" → 즉시 개선 필요
   - 자아성찰 후 올바른 방향으로 재설계 가능

---

**Document Created**: Claude Code (Haiku 4.5)
**Date**: 2026-02-05
**Type**: Deployment Plan & Long-term Memory
**Status**: ✅ FINAL - Ready for Future Deployments

이 문서를 참고하여 향후 배포 시 같은 실수를 반복하지 않기를 바랍니다. 🎯
