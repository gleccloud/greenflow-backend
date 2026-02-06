# 🔒 Phase 2 보존 및 유지관리 가이드

**작성일**: 2026-02-05
**상태**: Phase 2 Mock 데이터 버전 안전 보관 완료
**목적**: Phase 3 진행 중 Mock 데이터 버전 훼손 방지

---

## 📦 백업 정보

### 백업 위치
```
/Users/kevin/openclaw-workspace/BACKUPS/Phase2_MockData_Version/
└── green-logistics-phase2-backup-20260205_002051.tar.gz (6.3 MB)
```

### 백업 포함 내용
```
✅ src/console/              # 모든 콘솔 코드
✅ src/console/data/mockConsoleData.ts  # Mock 데이터
✅ src/console/pages/        # 8개 페이지
✅ src/console/components/   # 콘솔 컴포넌트
✅ src/console/hooks/        # Custom hooks
✅ src/console/context/      # Context
✅ src/console/types/        # Type definitions
✅ src/App.tsx               # 라우팅 설정 (ProtectedRoute 제거됨)
✅ tests/e2e_console_mock.spec.mjs  # E2E 테스트
✅ test-artifacts/console-*.png     # 8개 스크린샷
✅ package.json & package-lock.json
✅ 빌드 설정 파일들
```

### 백업 복원 방법
```bash
# Phase 2 상태로 완전 복원
cd /Users/kevin/openclaw-workspace
tar -xzf BACKUPS/Phase2_MockData_Version/green-logistics-phase2-backup-20260205_002051.tar.gz -C projects/green-logistics-landing/

# 또는 특정 폴더만 복원
tar -xzf BACKUPS/Phase2_MockData_Version/green-logistics-phase2-backup-20260205_002051.tar.gz -C . src/console/data/
```

---

## 🖥️ 서버 상태

### 현재 실행 중인 서버
```
포트: 5174
상태: ✅ 정상 실행
빌드: 프로덕션 (프리뷰 모드)
커맨드: npm run preview -- --host 0.0.0.0 --port 5174
```

### 서버 프로세스 ID
```bash
# 서버 상태 확인
ps aux | grep preview

# 서버 중지
kill $(cat /tmp/preview_server.pid)

# 서버 재시작
cd /Users/kevin/openclaw-workspace/projects/green-logistics-landing
npm run preview -- --host 0.0.0.0 --port 5174 &
echo $! > /tmp/preview_server.pid
```

### 접근 가능한 URL
```
📍 API 콘솔:
  http://localhost:5174/console              # Dashboard
  http://localhost:5174/console/api-keys     # API Keys
  http://localhost:5174/console/logs         # Logs
  http://localhost:5174/console/documentation
  http://localhost:5174/console/webhooks
  http://localhost:5174/console/integrations
  http://localhost:5174/console/billing
  http://localhost:5174/console/settings

📍 랜딩 페이지:
  http://localhost:5174/                     # Gate
  http://localhost:5174/shipper
  http://localhost:5174/carrier
  http://localhost:5174/owner
```

---

## ⚠️ Phase 3 진행 시 주의사항

### 보호해야 할 파일들

#### 1. Mock 데이터 (CRITICAL)
```
파일: src/console/data/mockConsoleData.ts
상태: 읽기 전용으로 취급
조건:
  ✅ Phase 2에서는 반드시 유지
  ✅ Phase 3에서도 백업으로 유지
  ❌ Phase 3 진행 중 수정 금지
  ✓ Phase 4에서만 제거

복원 방법:
  git checkout src/console/data/mockConsoleData.ts
```

#### 2. E2E 테스트 (CRITICAL)
```
파일: tests/e2e_console_mock.spec.mjs
상태: Mock 데이터 기반 테스트
조건:
  ✅ Phase 2 완료 시점의 테스트 보존
  ✅ Phase 3에서는 tests/e2e_console_api.spec.mjs 추가
  ❌ e2e_console_mock.spec.mjs 수정 금지
  ✓ Phase 4에서는 e2e_console_mock.spec.mjs 제거

복원 방법:
  git checkout tests/e2e_console_mock.spec.mjs
```

#### 3. Mock 데이터 스크린샷 (IMPORTANT)
```
파일들: test-artifacts/console-*-mock.png (8개)
상태: 참조용 스크린샷
조건:
  ✅ 보존 및 참조용 (변경 금지)
  ✓ 새 스크린샷은 다른 이름으로 저장

추가 스크린샷:
  test-artifacts/console-*-api.png (Phase 4)
```

#### 4. 콘솔 페이지 (NORMAL)
```
파일들:
  src/console/pages/Dashboard.tsx
  src/console/pages/APIKeys.tsx
  src/console/pages/Logs.tsx
  ... (5개 추가 페이지)

상태: Phase 3에서 Hook 활성화 시 수정 가능
조건:
  ✅ Mock 데이터 임포트는 유지
  ✅ UI 구조는 변경 금지
  ✓ useAPIKeys, useLogs 호출 추가 가능
  ❌ Mock 데이터 제거는 Phase 4까지 금지
```

### 변경 금지 목록

```
🔒 LOCKED FILES (Phase 4까지 변경 금지):
   ├── src/console/data/mockConsoleData.ts
   ├── tests/e2e_console_mock.spec.mjs
   ├── test-artifacts/console-*-mock.png (8개)
   └── MOCK_DATA_STRATEGY.md (전략 문서)

⚠️ CAUTION FILES (수정 시 주의):
   ├── src/console/pages/*.tsx (Mock import 유지)
   ├── src/console/components/ConsoleLayout.tsx
   └── src/App.tsx (라우팅, ProtectedRoute 제거됨)

✏️ MODIFIABLE FILES (Phase 3에서 수정 가능):
   ├── src/console/hooks/useAPIKeys.ts (API 호출 추가)
   ├── src/console/hooks/useLogs.ts (API 호출 추가)
   ├── src/console/hooks/useMetrics.ts (신규)
   ├── src/console/services/apiClient.ts (필요시)
   └── tests/e2e_console_api.spec.mjs (신규 테스트)
```

---

## 📋 변경 추적 체크리스트

### Phase 3 시작 전 확인
```
점검 항목:
  [ ] 백업 파일 위치 확인: /BACKUPS/Phase2_MockData_Version/
  [ ] 백업 파일 무결성 확인: 6.3 MB 크기
  [ ] 서버 실행 상태 확인: port 5174
  [ ] Git 상태 확인: mockConsoleData.ts 최신 버전
  [ ] 스크린샷 8개 모두 존재 확인
  [ ] E2E 테스트 44개 모두 존재 확인
```

### Phase 3 진행 중 체크리스트
```
매일 확인:
  [ ] src/console/data/mockConsoleData.ts 변경 여부 확인
  [ ] tests/e2e_console_mock.spec.mjs 변경 여부 확인
  [ ] git diff로 의도하지 않은 변경 감지

주간 확인:
  [ ] 서버가 여전히 정상 실행 중인지 확인
  [ ] Mock 데이터 기반 스크린샷이 유효한지 확인
  [ ] 백업 파일이 안전한지 확인
```

### Phase 3 완료 시 절차
```
1. 최종 백업 생성
   tar -czf BACKUPS/Phase3_Complete_Backup_$(date +%Y%m%d).tar.gz \
     projects/green-logistics-landing/

2. Mock 데이터 비교
   git diff src/console/data/mockConsoleData.ts (변경 없어야 함)

3. E2E 테스트 검증
   npm test tests/e2e_console_mock.spec.mjs (모두 패스 확인)

4. 새 API 엔드포인트 테스트 추가
   tests/e2e_console_api.spec.mjs 작성 완료 확인
```

---

## 🔄 Git 관리

### 커밋 메시지 규칙

#### Phase 3 커밋 (Mock 데이터 변경 금지)
```bash
# ✅ 좋은 예
git commit -m "Phase 3: useAPIKeys hook 활성화 (Mock 데이터 호환성 유지)"

# ✅ 좋은 예
git commit -m "Phase 3: API 엔드포인트 호출 추가 (Mock 데이터는 폴백으로 유지)"

# ❌ 나쁜 예
git commit -m "Remove mockConsoleData.ts"

# ❌ 나쁜 예
git commit -m "Update e2e_console_mock.spec.mjs to use real API"
```

### 실수 방지 Git Hook

#### .git/hooks/pre-commit (선택사항)
```bash
#!/bin/bash
# Mock 데이터 파일 변경 감지

if git diff --cached --name-only | grep -q "mockConsoleData.ts"; then
  echo "⚠️  경고: mockConsoleData.ts가 변경되려고 합니다!"
  echo "Phase 2 데이터를 보호하기 위해 변경을 취소하시겠습니까? (y/n)"
  read -r response
  if [[ "$response" == "y" ]]; then
    git reset HEAD src/console/data/mockConsoleData.ts
    exit 1
  fi
fi

exit 0
```

---

## 📊 Phase 3 진행 로그

### Timeline

#### Week 1: API 준비
```
상태: Phase 2 Mock 데이터 버전 보존 ✅
변경사항: 없음 (mockConsoleData.ts 보호)
테스트: e2e_console_mock.spec.mjs 통과 확인

진행:
  - API 엔드포인트 설계 및 구현
  - mockConsoleData.ts와 동일한 형식 준수
```

#### Week 2: Hook 활성화
```
상태: Mock 데이터 버전 유지
변경사항: src/console/hooks/*.ts에만 API 호출 추가
테스트:
  - e2e_console_mock.spec.mjs (Mock 데이터 테스트)
  - e2e_console_api.spec.mjs (API 테스트) - 신규

진행:
  - useAPIKeys 활성화
  - useLogs 활성화
  - useMetrics 신규 작성
```

#### Week 3: 통합 테스트
```
상태: Mock 데이터 완전 보존
변경사항: 없음 (mockConsoleData.ts)
테스트:
  - Mock 데이터 테스트 (기존)
  - API 호출 테스트 (신규)
  - 혼합 테스트 (선택)

진행:
  - 통합 테스트 실행
  - 성능 최적화
  - 문서 업데이트
```

#### Week 4: Phase 4 준비
```
상태: Mock 데이터 제거 준비
변경사항: 계획만 수립

진행:
  - Mock 제거 체크리스트 작성
  - 최종 API 검증
  - 배포 준비
```

---

## 🆘 문제 해결

### 실수로 mockConsoleData.ts를 수정한 경우

```bash
# 1. 변경사항 확인
git diff src/console/data/mockConsoleData.ts

# 2. 변경 취소
git checkout src/console/data/mockConsoleData.ts

# 3. 백업에서 복원 (필요시)
tar -xzf BACKUPS/Phase2_MockData_Version/green-logistics-phase2-backup-20260205_002051.tar.gz \
  -C . src/console/data/mockConsoleData.ts

# 4. 서버 재시작
kill $(cat /tmp/preview_server.pid)
npm run preview -- --host 0.0.0.0 --port 5174 &
echo $! > /tmp/preview_server.pid
```

### 서버가 갑자기 중단된 경우

```bash
# 1. 서버 상태 확인
ps aux | grep preview

# 2. 기존 프로세스 종료
kill $(cat /tmp/preview_server.pid) 2>/dev/null

# 3. 서버 재시작
cd /Users/kevin/openclaw-workspace/projects/green-logistics-landing
npm run preview -- --host 0.0.0.0 --port 5174 &
echo $! > /tmp/preview_server.pid

# 4. 확인
curl -s http://localhost:5174/console | head -20
```

### 스크린샷이 변경된 경우

```bash
# 1. 백업에서 원본 스크린샷 복원
tar -xzf BACKUPS/Phase2_MockData_Version/green-logistics-phase2-backup-20260205_002051.tar.gz \
  -C . test-artifacts/console-*-mock.png

# 2. Git에서도 복원
git checkout test-artifacts/console-*-mock.png
```

---

## 📚 참고 문서

### Phase 2 관련 (보존된 상태)
```
✅ PHASE2_완료_현황.md
✅ MOCK_DATA_STRATEGY.md (라이프사이클 정의)
✅ E2E_TEST_PLAN.md
✅ E2E_TEST_RESULTS.md
✅ PHASE2_DOCUMENTATION_INDEX.md
```

### Phase 3 관련 (새로 작성 예정)
```
📝 PHASE3_IMPLEMENTATION.md (진행 중 작성)
📝 PHASE3_API_ENDPOINTS.md (상세 스펙)
📝 PHASE3_HOOK_IMPLEMENTATION.md (Hook 코드)
```

### 주의 사항
```
🔒 이 문서는 Phase 3 진행 중에 정기적으로 참조
🔒 변경 전에 이 문서의 "변경 금지 목록" 확인
🔒 의도하지 않은 변경 시 복원 절차 참고
```

---

## ✅ 현재 상태 요약

### Phase 2 완료 상태
```
✅ Mock 데이터: 안전하게 백업 (6.3 MB)
✅ E2E 테스트: 44개 테스트 보존
✅ 스크린샷: 8개 모두 캡처 및 보존
✅ 서버: 5174 포트에서 정상 실행
✅ 라우팅: ProtectedRoute 제거, 인증 없이 접근 가능
```

### 주의: 다음부터는
```
🚨 src/console/data/mockConsoleData.ts 변경 금지
🚨 tests/e2e_console_mock.spec.mjs 수정 금지
🚨 test-artifacts/console-*-mock.png 덮어쓰기 금지
✅ 새 Hook 코드: src/console/hooks/ (수정 가능)
✅ 새 테스트: tests/e2e_console_api.spec.mjs (신규)
```

---

**작성자**: Claude Code
**상태**: ✅ Phase 2 보존 완료, 서버 운영 중
**마지막 업데이트**: 2026-02-05
**분류**: 🔒 보존 및 유지관리 가이드
