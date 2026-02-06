# ⚡ Quick Start Guide - LocalStack Dual Deployment

**Date**: 2026-02-05
**Time to Deploy**: 5-10 minutes
**Complexity**: Simple (Automated Script)

---

## 🚀 3가지 배포 방법 (3 Deployment Options)

### 옵션 1: ⭐ 자동화 스크립트 (권장 - RECOMMENDED)
**시간**: 5-10분 | **난이도**: 초급 | **오류 위험**: 낮음

```bash
cd /Users/kevin/openclaw-workspace
chmod +x EXECUTION_READY_DEPLOYMENT.sh
./EXECUTION_READY_DEPLOYMENT.sh
```

**이 스크립트가 자동으로 해주는 것**:
- ✅ 빌드 (npm run build)
- ✅ 콘솔/랜딩 디렉토리 분리
- ✅ Window flags 자동 삽입
- ✅ LocalStack S3 버킷 생성
- ✅ 파일 업로드
- ✅ 검증

**결과 메시지**:
```
🎉 Deployment Complete!
✅ SUCCESSFULLY DEPLOYED

Console: http://localhost:4566/greenflow-console/
Landing: http://localhost:4566/greenflow-landing/
```

---

### 옵션 2: 수동 배포 (학습 목적)
**시간**: 15-20분 | **난이도**: 중급 | **오류 위험**: 중간

**참고할 문서**:
→ [DEPLOYMENT_PLAN_LOCALSTACK_2026-02-05.md](DEPLOYMENT_PLAN_LOCALSTACK_2026-02-05.md)

**기본 흐름**:
1. `npm run build`
2. `mkdir dist-console`, `mkdir dist-landing`
3. 각각 index.html 생성 (window flags 포함)
4. AWS CLI로 S3 배포
5. `curl` 명령어로 검증

---

### 옵션 3: 단계별 수동 배포 (완전 제어)
**시간**: 20-30분 | **난이도**: 고급 | **오류 위험**: 높음

**각 단계별 상세 가이드**:
→ [DEPLOYMENT_PLAN_LOCALSTACK_2026-02-05.md](DEPLOYMENT_PLAN_LOCALSTACK_2026-02-05.md)

---

## ✅ 배포 후 확인 (Post-Deployment Verification)

### 1단계: 웹 접근성 확인 (30초)
```bash
# 콘솔 접근
curl -I http://localhost:4566/greenflow-console/
# 예상: HTTP/1.1 200 OK

# 랜딩 접근
curl -I http://localhost:4566/greenflow-landing/
# 예상: HTTP/1.1 200 OK
```

### 2단계: Window Flags 확인 (30초)
```bash
# 콘솔
curl http://localhost:4566/greenflow-console/ | grep "__APP_TYPE__"
# 예상: window.__APP_TYPE__ = 'console';

# 랜딩
curl http://localhost:4566/greenflow-landing/ | grep "__APP_TYPE__"
# 예상: window.__APP_TYPE__ = 'landing';
```

### 3단계: E2E 테스트 (2-3분)
```bash
# Terminal 1: 개발 서버 시작
cd /Users/kevin/openclaw-workspace/projects/green-logistics-landing
npm run dev

# Terminal 2: E2E 테스트 실행
node tests/e2e_smoke.mjs

# 예상: ✅ 27/27 tests passing
```

---

## 🌐 접근 URL (Access URLs)

| 서비스 | URL | 용도 |
|--------|-----|------|
| **API Console** | `http://localhost:4566/greenflow-console/` | 대시보드, API 키, 로그 |
| **Landing Page** | `http://localhost:4566/greenflow-landing/` | 페르소나 선택 페이지 |
| **Backend API** | `http://localhost:3000/api/v2/health` | REST API |
| **Dev Server** | `http://localhost:5173` | 모든 라우트 (개발용) |

---

## 🎯 핵심 개념 (Core Concept in 10 Seconds)

### ❌ 실수: 라우트 필터링으로 분리
```
같은 앱 → /console 라우트만 표시
문제점: 모든 코드가 번들에 포함 (비효율)
```

### ✅ 올바른 방법: Window Flags 패턴
```html
<!-- 콘솔 index.html -->
<script type="module">
  window.__APP_TYPE__ = 'console';
  window.__BLOCKED_ROUTES__ = ['/', '/shipper', '/carrier', '/owner'];
</script>

<!-- 랜딩 index.html -->
<script type="module">
  window.__APP_TYPE__ = 'landing';
  window.__BLOCKED_ROUTES__ = ['/console'];
</script>
```

**효과**: React 렌더링 전에 애플리케이션 타입 명시 → 불필요한 라우트 로드 방지

---

## 🚨 문제 해결 (Troubleshooting)

### Q1: "connection refused" 에러
```
원인: LocalStack이 실행 중이 아님
해결책:
docker-compose up  # 다른 터미널에서
또는
docker ps | grep localstack  # 상태 확인
```

### Q2: "bucket already exists" 에러
```
원인: 이전 배포가 남아있음
해결책: 스크립트가 자동으로 정리함
또는 수동으로:
aws --endpoint-url=http://localhost:4566 \
  s3 rb s3://greenflow-console --force
```

### Q3: "HTTP 404" 응답
```
원인: 정적 웹사이트 호스팅 미설정
확인:
aws --endpoint-url=http://localhost:4566 \
  s3api get-bucket-website --bucket greenflow-console
```

### Q4: "Window flags not loaded"
```
원인: index.html이 제대로 배포되지 않음
확인:
curl http://localhost:4566/greenflow-console/ | head -20
# <script type="module"> 섹션 확인
```

### Q5: "E2E tests failing"
```
원인: 개발 서버가 실행 중이 아님
해결책:
npm run dev  # 먼저 시작
이후 다른 터미널에서:
node tests/e2e_smoke.mjs
```

---

## 📚 문서 네비게이션 (Document Navigation)

### 📘 상세 배포 가이드 필요할 때
→ [DEPLOYMENT_PLAN_LOCALSTACK_2026-02-05.md](DEPLOYMENT_PLAN_LOCALSTACK_2026-02-05.md)

**포함 내용**:
- Phase별 상세 절차
- AWS CLI 명령어 템플릿
- 문제 해결 가이드
- 최종 검증 체크리스트

### 🎓 교훈 및 패턴 이해하고 싶을 때
→ [LESSON_LEARNED_APP_SEPARATION.md](LESSON_LEARNED_APP_SEPARATION.md)

**포함 내용**:
- ❌ 실수했던 패턴
- ✅ 올바른 패턴
- Window Flags 설명
- 향후 배포 체크리스트

### 🚀 지금 배포하고 싶을 때
→ [EXECUTION_READY_DEPLOYMENT.sh](EXECUTION_READY_DEPLOYMENT.sh)

**방법**:
```bash
./EXECUTION_READY_DEPLOYMENT.sh
```

### 📊 전체 상황 파악하고 싶을 때
→ [FINAL_DEPLOYMENT_SUMMARY_2026-02-05.md](FINAL_DEPLOYMENT_SUMMARY_2026-02-05.md)

**포함 내용**:
- 상황 요약
- 아키텍처 개요
- 배포 흐름
- 최종 결론

---

## 🎬 지금 바로 시작하기 (Start Now)

### 35초 버전 (Ultra Quick)
```bash
cd /Users/kevin/openclaw-workspace
./EXECUTION_READY_DEPLOYMENT.sh
# 자동으로 모든 것을 처리함
```

### 2분 버전 (Quick)
```bash
# Terminal 1
./EXECUTION_READY_DEPLOYMENT.sh

# Terminal 2 (배포 중일 때)
curl -I http://localhost:4566/greenflow-console/
curl -I http://localhost:4566/greenflow-landing/

# 배포 완료 후
curl http://localhost:4566/greenflow-console/ | grep "__APP_TYPE__"
curl http://localhost:4566/greenflow-landing/ | grep "__APP_TYPE__"
```

### 5분 버전 (Complete)
```bash
# Terminal 1: 배포
./EXECUTION_READY_DEPLOYMENT.sh
# 완료 대기... (3-5분)

# Terminal 2: 개발 서버 시작 (배포 중일 때)
cd projects/green-logistics-landing
npm run dev

# Terminal 3: E2E 테스트 (배포 완료 후)
node tests/e2e_smoke.mjs
```

---

## 💡 알아두면 좋은 팁 (Pro Tips)

### Tip 1: 로그 저장하기
```bash
./EXECUTION_READY_DEPLOYMENT.sh | tee deployment.log
# 배포 결과가 deployment.log에 저장됨
```

### Tip 2: 배포 결과 확인
```bash
# 콘솔 버킷 파일 목록
aws --endpoint-url=http://localhost:4566 \
  s3 ls s3://greenflow-console/ --recursive

# 랜딩 버킷 파일 목록
aws --endpoint-url=http://localhost:4566 \
  s3 ls s3://greenflow-landing/ --recursive
```

### Tip 3: 특정 파일만 재배포
```bash
# index.html만 다시 업로드
aws --endpoint-url=http://localhost:4566 \
  s3 cp /tmp/dist-console/index.html s3://greenflow-console/

aws --endpoint-url=http://localhost:4566 \
  s3 cp /tmp/dist-landing/index.html s3://greenflow-landing/
```

### Tip 4: 배포 자동화
```bash
# cron job으로 주기적 배포 (필요시)
# 0 0 * * * /path/to/EXECUTION_READY_DEPLOYMENT.sh >> /var/log/greenflow.log
```

---

## 📋 체크리스트 (Checklist)

### 배포 전
- [ ] LocalStack 실행 중인지 확인
- [ ] Project 디렉토리 확인
- [ ] AWS CLI 설치 확인

### 배포 중
- [ ] 스크립트 실행 중
- [ ] 진행 상황 모니터링
- [ ] 에러 발생 여부 확인

### 배포 후
- [ ] HTTP 200 응답 확인
- [ ] Window flags 로드 확인
- [ ] E2E 테스트 통과 확인
- [ ] 접근 URL 동작 확인

---

## 🎓 다음에 기억할 것 (Remember)

```
"API 콘솔은 라우트가 아니라 독립적인 애플리케이션"

항상 이 패턴을 사용하세요:
1. 고유한 index.html 생성
2. window flags 설정
3. 별도 S3 버킷에 배포
4. Window flags 검증
5. E2E 테스트 실행
```

---

**Created**: 2026-02-05
**Purpose**: Quick reference guide for LocalStack deployment
**Status**: ✅ Ready to use

🚀 **지금 배포를 시작하세요!**
