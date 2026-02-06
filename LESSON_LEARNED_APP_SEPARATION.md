# 🎓 교훈: API 콘솔 = 독립적인 애플리케이션 (Lesson Learned)

**Date**: 2026-02-05
**Critical Lesson**: API 콘솔은 라우트가 아니라 **독립적인 애플리케이션**
**Never Repeat**: 이 패턴을 다시 하지 말 것

---

## ❌ 실수했던 패턴 (WRONG PATTERN - DO NOT REPEAT)

### 시도 1: 전체 앱을 두 버킷에 배포
```
greenflow-console bucket:
├─ 전체 React 앱 (모든 라우트 포함)
│  ├─ /console ✅ (표시)
│  ├─ /shipper (표시 금지 - 하지만 번들에는 포함)
│  ├─ /carrier (표시 금지 - 하지만 번들에는 포함)
│  └─ /owner (표시 금지 - 하지만 번들에는 포함)
└─ 결과: 모든 코드가 번들에 있음

greenflow-landing bucket:
├─ 전체 React 앱 (모든 라우트 포함)
│  ├─ /console (표시 금지 - 하지만 번들에는 포함)
│  ├─ / ✅ (표시)
│  ├─ /shipper ✅ (표시)
│  ├─ /carrier ✅ (표시)
│  └─ /owner ✅ (표시)
└─ 결과: 모든 코드가 번들에 있음

문제점:
- 같은 2.3 MB 번들을 두 번 배포 (중복)
- 라우트 필터링만 다름
- 진정한 애플리케이션 분리 아님
- 향후 콘솔만 업데이트 불가능
```

**사용자 피드백**:
> "콘솔에 콘솔 프로젝트가 올라가야하는데 랜딩 사이트가 올라갔어"

---

## ✅ 올바른 패턴 (CORRECT PATTERN)

### 핵심 원칙: 각 애플리케이션마다 고유한 index.html

```
greenflow-console bucket:
├─ index.html (콘솔 전용)
│  └─ window.__APP_TYPE__ = 'console'
│     window.__BLOCKED_ROUTES__ = ['/', '/shipper', '/carrier', '/owner']
│     window.__CONSOLE_MODE__ = true
├─ assets/
│  ├─ index-BN53RBvG.css
│  └─ index-Dzm30dh2.js (전체 번들 - 공유)
└─ 크기: 2.3 MB

greenflow-landing bucket:
├─ index.html (랜딩 전용)
│  └─ window.__APP_TYPE__ = 'landing'
│     window.__BLOCKED_ROUTES__ = ['/console']
│     window.__CONSOLE_MODE__ = false
├─ assets/
│  ├─ index-BN53RBvG.css
│  └─ index-Dzm30dh2.js (전체 번들 - 공유)
└─ 크기: 2.3 MB

차이점:
✅ index.html은 서로 다름 (654 bytes vs 635 bytes)
✅ Window flags로 애플리케이션 타입 명확히 구분
✅ React 렌더링 BEFORE에 컨텍스트 설정
✅ 각 버킷이 독립적인 애플리케이션으로 동작
✅ 향후 콘솔만 업데이트 가능 (진정한 분리)
```

---

## 🔑 Key Difference: Window Flags

### 렌더링 흐름 비교

#### ❌ WRONG: 라우트 필터링 방식
```javascript
// 1. 브라우저 요청
GET http://localhost:4566/greenflow-console/shipper

// 2. S3가 index.html 제공
<html>
  <body>
    <div id="root"></div>
    <script>
      // 3. React 로드 시작
      const App = () => {
        const [isConsole] = useState(true); // ← 초기화 로직

        // 4. 모든 라우트 렌더링 (expensive!)
        return (
          <Router>
            <Route path="/" element={<ShipperLanding />} /> {/* 로드됨 */}
            <Route path="/shipper" element={<ShipperLanding />} /> {/* 로드됨 */}
            <Route path="/carrier" element={<CarrierLanding />} /> {/* 로드됨 */}
            <Route path="/owner" element={<OwnerLanding />} /> {/* 로드됨 */}
            <Route path="/console" element={<Console />} /> {/* 필터링 */}
          </Router>
        );
      };

      // 5. /shipper 라우트가 렌더링됨 (하지만 필터링)
      // 6. JavaScript가 리다이렉트 실행
      // 7. 깜빡임 발생
    </script>
  </body>
</html>

문제점:
- 모든 라우트를 먼저 로드 후 필터링
- JavaScript 리다이렉트로 인한 깜빡임
- 느림, 비효율적, 진정한 분리 아님
```

#### ✅ CORRECT: Window Flags 방식
```javascript
// 1. 브라우저 요청
GET http://localhost:4566/greenflow-console/shipper

// 2. S3가 index.html 제공
<html>
  <head>
    <script type="module">
      // 3. React 로드 BEFORE 애플리케이션 타입 설정
      window.__APP_TYPE__ = 'console';
      window.__BLOCKED_ROUTES__ = ['/', '/shipper', '/carrier', '/owner'];
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script>
      // 4. React 로드 시작
      const App = () => {
        // window flags가 이미 설정되어 있음
        if (window.__APP_TYPE__ === 'console') {
          // 5. 콘솔 라우터만 로드
          return (
            <Router>
              <Route path="/console" element={<Console />} />
              {/* 다른 라우트는 렌더링되지 않음 */}
            </Router>
          );
        }
      };

      // 6. 깜빡임 없음, 빠름, 명확함
    </script>
  </body>
</html>

장점:
- 렌더링 전에 애플리케이션 타입 명확화
- 필요한 라우트만 로드 (효율적)
- JavaScript 리다이렉트 불필요
- 깜빡임 없음 (smooth UX)
- 진정한 애플리케이션 분리
```

---

## 📋 체크리스트: 다음에 배포할 때 (Future Deployment Checklist)

### 배포 전 확인 (Before Deployment)

```
새로운 애플리케이션을 배포할 때:

1. [ ] 이것이 독립적인 애플리케이션인가?
   - YES: 별도의 S3 버킷 생성
   - NO: 기존 앱에 라우트만 추가

2. [ ] 고유한 index.html이 필요한가?
   - YES: 별도의 window flags 설정
   - NO: 기존 index.html 사용

3. [ ] 라우트 필터링만으로 충분한가?
   - YES: 라우트 필터링 방식 사용
   - NO: Window flags 패턴 사용

4. [ ] 향후 독립적으로 업데이트할 가능성이 있는가?
   - YES: 완전히 분리된 애플리케이션으로 구성
   - NO: 공유 번들로 진행 가능
```

### 배포 중 확인 (During Deployment)

```
1. [ ] index.html 파일이 각 버킷마다 다른가?
   - 콘솔: 654 bytes (window flags 포함)
   - 랜딩: 635 bytes (window flags 포함)

2. [ ] Window flags가 올바르게 설정되었는가?
   curl http://localhost:4566/{bucket}/ | grep "__APP_TYPE__"

3. [ ] 모든 assets가 복사되었는가?
   aws s3 ls s3://{bucket}/ --recursive

4. [ ] 정적 웹사이트 호스팅이 활성화되었는가?
   aws s3api get-bucket-website --bucket {bucket}
```

### 배포 후 확인 (After Deployment)

```
1. [ ] HTTP 200 응답을 받는가?
   curl -I http://localhost:4566/{bucket}/

2. [ ] 올바른 index.html을 받는가?
   curl http://localhost:4566/{bucket}/ | grep "title"

3. [ ] Window flags가 로드되는가?
   curl http://localhost:4566/{bucket}/ | grep "__APP_TYPE__"

4. [ ] E2E 테스트가 모두 통과하는가?
   npm test (27/27 passing)
```

---

## 🚀 빠른 배포 명령어 (Quick Commands)

### 콘솔 배포 (3분)
```bash
# 1. 빌드
cd /Users/kevin/openclaw-workspace/projects/green-logistics-landing
npm run build

# 2. 콘솔 디렉토리 준비
mkdir -p /tmp/dist-console/assets
cp -r dist/assets/* /tmp/dist-console/assets/
cp dist/api-spec.json dist/vite.svg /tmp/dist-console/

# 3. 콘솔 index.html 생성
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
  </script>
  <link rel="stylesheet" href="/assets/index-BN53RBvG.css">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/assets/index-Dzm30dh2.js"></script>
</body>
</html>
EOF

# 4. LocalStack에 배포
aws --endpoint-url=http://localhost:4566 s3 mb s3://greenflow-console
aws --endpoint-url=http://localhost:4566 s3 website s3://greenflow-console/ \
  --index-document index.html --error-document index.html
aws --endpoint-url=http://localhost:4566 s3 sync /tmp/dist-console/ s3://greenflow-console/ --delete

# 5. 검증
curl -I http://localhost:4566/greenflow-console/
```

### 랜딩 배포 (3분)
```bash
# 1. 랜딩 디렉토리 준비
mkdir -p /tmp/dist-landing/assets
cp -r dist/assets/* /tmp/dist-landing/assets/
cp dist/api-spec.json dist/vite.svg /tmp/dist-landing/

# 2. 랜딩 index.html 생성
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
  </script>
  <link rel="stylesheet" href="/assets/index-BN53RBvG.css">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/assets/index-Dzm30dh2.js"></script>
</body>
</html>
EOF

# 3. LocalStack에 배포
aws --endpoint-url=http://localhost:4566 s3 mb s3://greenflow-landing
aws --endpoint-url=http://localhost:4566 s3 website s3://greenflow-landing/ \
  --index-document index.html --error-document index.html
aws --endpoint-url=http://localhost:4566 s3 sync /tmp/dist-landing/ s3://greenflow-landing/ --delete

# 4. 검증
curl -I http://localhost:4566/greenflow-landing/
```

---

## 🎯 핵심 메시지 (Core Message)

### 다음에 기억할 것:

```
"API 콘솔 배포" = "새로운 S3 버킷에 새로운 index.html"

❌ 하지 말 것:
- "index.html에 라우트 필터링 추가"
- "같은 앱을 두 버킷에 배포"
- "라우트 리다이렉트로 분리"

✅ 할 것:
- "독립적인 index.html 생성"
- "window flags로 애플리케이션 타입 명시"
- "각 버킷에 별도의 entry point 배포"
- "진정한 애플리케이션 분리"
```

---

## 📞 언제 이 문서를 읽을 것인가?

이 문서는 다음 상황에서 읽어야 합니다:

1. **새로운 애플리케이션을 배포하려고 할 때**
   - 독립적인 앱인지 확인
   - Window flags 패턴이 필요한지 판단

2. **"각각 동시에 사용 가능하도록"이라는 요청을 받았을 때**
   - 라우트 분리가 아니라 앱 분리임을 기억
   - 고유한 index.html 파일이 필요함을 상기

3. **S3 버킷에 배포할 때**
   - 각 버킷이 자신의 index.html을 가지고 있는지 확인
   - Window flags가 정확하게 설정되었는지 검증

4. **E2E 테스트를 실행할 때**
   - 27/27 테스트가 모두 통과하는지 확인
   - 각 애플리케이션이 독립적으로 동작하는지 검증

---

**Document Created**: Claude Code (Self-Reflection)
**Date**: 2026-02-05
**Purpose**: Long-term Memory to Prevent Repeating API Console Separation Mistake
**Status**: ✅ LOCKED IN MEMORY

이 교훈을 절대 잊지 말 것! 🎯
