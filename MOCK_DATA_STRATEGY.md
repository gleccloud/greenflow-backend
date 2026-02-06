# 🎯 Mock 데이터 전략 및 관리 계획

**작성일**: 2026-02-04
**상태**: Phase 2 진행 중
**목표**: 화면 캡처 → 스모크 테스트 → 실제 API 전환 → E2E 비동기 테스트

---

## 📋 Overview

Mock 데이터는 **단계별로 다른 목적**을 가지고 관리됩니다.

| Phase | 목적 | Mock 데이터 | API 연결 | 테스트 |
|-------|------|-----------|---------|--------|
| **Phase 2** | 화면 캡처 & 스모크 | ✅ 사용 | ❌ 백엔드 스펙 작성 | ✅ Mock 기반 |
| **Phase 3** | API 개발 & 통합 | ✅ 유지 | ⚙️ 구현 시작 | ⚙️ 부분 API 테스트 |
| **Phase 4** | 배포 준비 | ❌ 제거 | ✅ 전환 완료 | ✅ 실제 데이터 |
| **Production** | 실시간 서빙 | ❌ 없음 | ✅ 프로덕션 API | ✅ E2E 비동기 테스트 |

---

## 🎨 Phase 2: Mock 데이터 활용 (현재)

### 목적
- ✅ API Console UI/UX 검증
- ✅ 모든 페이지 화면 캡처
- ✅ 스모크 테스트 (라우팅, 렌더링)
- ✅ 디자인 시스템 일관성 확인

### 구현 상태

**생성된 Mock 데이터 파일**: `src/console/data/mockConsoleData.ts`

```typescript
// 구성 요소
├── mockAPIKeys[]       (4개 샘플 키)
├── mockAPILogs[]       (8개 샘플 로그)
├── mockMetricsSummary  (일일 메트릭)
├── mockEndpointMetrics[] (5개 엔드포인트)
├── mockRequestTrend[]   (7일 추세)
├── mockRecentActivities[] (5개 활동)
└── Helper functions (generateRandomMetric, simulateMetricsUpdate)
```

### 사용 중인 페이지

#### 1. Dashboard (`src/console/pages/Dashboard.tsx`)
```typescript
import { mockMetricsSummary, mockEndpointMetrics, mockRecentActivities } from '../data/mockConsoleData';

// Mock 메트릭 표시
- Total Requests: 12,453
- Success Rate: 99.8%
- Avg Response Time: 142ms
- Active API Keys: 3개

// Mock 엔드포인트 순위 (상위 4개)
- GET /api/v2/bids: 4,250 요청
- POST /api/v2/proposals: 2,100 요청
- GET /api/v2/fleets: 1,890 요청
- PUT /api/v2/bids/:id: 950 요청

// Mock 최근 활동 (5개)
- API Key Created
- High Error Rate Alert
- API Key Rotated
- New Integration
- Rate Limit Exceeded
```

#### 2. API Keys (`src/console/pages/APIKeys.tsx`)
```typescript
import { mockAPIKeys } from '../data/mockConsoleData';

// Mock API 키 (4개)
1. Production API Key (ACTIVE) - glec_prod_a1b2c3d4e5f6g7h8
2. Testing Environment (ACTIVE) - glec_test_x9y8z7w6v5u4t3s2
3. Legacy Webhook Key (REVOKED) - glec_hook_p1o2n3m4l5k6j7i8h
4. Partner Integration (ACTIVE) - glec_partner_r6q5p4o3n2m1l0k9

// 각 키 정보
- Scopes (권한 범위)
- Rate Limits (요청 제한)
- IP Whitelist
- Creation/Expiration dates
- Last used timestamp
```

#### 3. Logs (`src/console/pages/Logs.tsx`)
```typescript
import { mockAPILogs } from '../data/mockConsoleData';

// Mock 로그 (8개)
- GET /api/v2/bids - 200 OK - 145ms
- POST /api/v2/proposals - 201 Created - 312ms
- GET /api/v2/fleets/123 - 404 Not Found - 89ms
- PUT /api/v2/bids/456 - 200 OK - 267ms
- GET /api/v2/proposals?bid_id=456 - 200 OK - 198ms
- GET /api/v2/bids - 200 OK - 156ms
- DELETE /api/v2/proposals/789 - 403 Forbidden - 45ms
- GET /api/v2/fleets - 200 OK - 234ms

// 각 로그 정보
- Timestamp (정확한 시각)
- HTTP Method & Endpoint
- Status Code & Duration
- Request/Response Size
- API Key ID
- Error messages (실패 시)
```

### Phase 2 스크린샷 캡처 계획

```bash
# 필요한 스크린샷 (E2E 테스트와 함께)
1. /console               → Dashboard (메트릭 표시)
2. /console/api-keys     → API Keys 테이블 (4개 키)
3. /console/logs         → Logs 테이블 (8개 로그)
4. /console/documentation → API 문서 (스캐폰드)
5. /console/webhooks     → Webhooks (빈 상태)
6. /console/integrations → Integrations (3개 카드)
7. /console/billing      → Billing (요금 정보)
8. /console/settings     → Settings (프로필, 보안)
```

---

## 🔄 Phase 3: API 개발 & 부분 전환

### 목적
- ✅ 백엔드 API 엔드포인트 구현
- ⚙️ 일부 페이지 실제 API로 전환
- ⚙️ Mock 데이터 유지 (스모크 테스트용)
- ⚙️ API 통합 테스트

### 계획

#### 3.1 백엔드 API 구현 (필수)
```
✓ GET /api/v2/console/api-keys
✓ POST /api/v2/console/api-keys
✓ PUT /api/v2/console/api-keys/:id
✓ DELETE /api/v2/console/api-keys/:id
✓ POST /api/v2/console/api-keys/:id/revoke
✓ POST /api/v2/console/api-keys/:id/rotate
✓ GET /api/v2/console/logs
✓ GET /api/v2/console/logs/:id
✓ GET /api/v2/console/logs/stats
✓ GET /api/v2/console/logs/search
✓ GET /api/v2/console/logs/export
✓ GET /api/v2/console/logs/stream (SSE)
```

#### 3.2 Hook 활성화
```typescript
// 현재: Mock 데이터 사용
const keys = mockAPIKeys;

// Phase 3: useAPIKeys Hook으로 전환
const { keys, createKey, revokeKey } = useAPIKeys();

// Hook은 apiKeyService를 통해 실제 API 호출
```

#### 3.3 Mock 데이터 유지 이유
- 스모크 테스트 실행 (API 없을 때)
- 개발 환경에서 스냅샷 테스트
- 오프라인 개발 지원
- 백엔드 문제 시 폴백

---

## 🗑️ Phase 4: Mock 데이터 제거 & API 완전 전환

### 목적
- ✅ 모든 Mock 데이터 제거
- ✅ 실제 API만 사용
- ✅ 실시간 비동기 데이터 테스트
- ✅ E2E 테스트 최종 검증

### 액션 아이템

#### 4.1 Mock 파일 제거
```bash
# 제거할 파일
rm src/console/data/mockConsoleData.ts

# 영향받는 파일들
src/console/pages/Dashboard.tsx
src/console/pages/APIKeys.tsx
src/console/pages/Logs.tsx
```

#### 4.2 모든 페이지 API 호출로 전환
```typescript
// Before (Phase 2-3)
import { mockAPIKeys } from '../data/mockConsoleData';
const keys = mockAPIKeys;

// After (Phase 4)
import { useAPIKeys } from '../hooks';
const { keys, isLoading, error } = useAPIKeys();
```

#### 4.3 로딩 상태 & 에러 처리 추가
```typescript
if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorAlert message={error} />;
return <KeysTable keys={keys} />;
```

#### 4.4 실시간 스트리밍 활성화
```typescript
// Logs 페이지에서 SSE 스트리밍
const { logs, toggleRealTimeStream } = useLogs();

useEffect(() => {
  const unsubscribe = toggleRealTimeStream(true);
  return () => unsubscribe();
}, []);
```

---

## 🧪 E2E 테스트 전략

### Phase 2: Mock 기반 스모크 테스트
```javascript
// tests/e2e_console_mock.spec.mjs
import { test, expect } from '@playwright/test';

test.describe('API Console (Mock Data)', () => {
  test('Dashboard loads with mock metrics', async ({ page }) => {
    await page.goto('http://localhost:5173/console');

    // Mock 데이터 존재 확인
    await expect(page.locator('text=12,453')).toBeVisible();
    await expect(page.locator('text=99.8%')).toBeVisible();

    // 스크린샷 캡처
    await page.screenshot({ path: 'console-dashboard.png' });
  });

  test('API Keys page displays mock keys', async ({ page }) => {
    await page.goto('http://localhost:5173/console/api-keys');

    // 4개 Mock 키 확인
    const keyRows = page.locator('table tbody tr');
    await expect(keyRows).toHaveCount(4);

    // 스크린샷 캡처
    await page.screenshot({ path: 'console-api-keys.png' });
  });

  test('Logs page displays mock logs', async ({ page }) => {
    await page.goto('http://localhost:5173/console/logs');

    // 8개 Mock 로그 확인
    const logRows = page.locator('table tbody tr');
    await expect(logRows).toHaveCount(8);

    // 스크린샷 캡처
    await page.screenshot({ path: 'console-logs.png' });
  });
});
```

### Phase 4: 실제 API 비동기 테스트
```javascript
// tests/e2e_console_api.spec.mjs
import { test, expect } from '@playwright/test';

test.describe('API Console (Real API Data)', () => {
  test('Dashboard loads real metrics via API', async ({ page }) => {
    await page.goto('http://localhost:5173/console');

    // API 호출 대기
    await page.waitForLoadState('networkidle');

    // 메트릭이 로드되었는지 확인 (값은 동적)
    const metricValues = page.locator('[data-testid="metric-value"]');
    await expect(metricValues.first()).toBeVisible();

    // 스크린샷 캡처
    await page.screenshot({ path: 'console-dashboard-api.png' });
  });

  test('Logs page streams real-time updates via SSE', async ({ page }) => {
    await page.goto('http://localhost:5173/console/logs');

    // 실시간 스트림 활성화
    await page.click('[data-testid="enable-stream"]');

    // 새 로그가 추가되는지 확인
    const initialCount = await page.locator('table tbody tr').count();

    // 2초 대기 (새 로그 수신)
    await page.waitForTimeout(2000);

    const finalCount = await page.locator('table tbody tr').count();
    expect(finalCount).toBeGreaterThanOrEqual(initialCount);
  });

  test('API Keys CRUD operations', async ({ page }) => {
    await page.goto('http://localhost:5173/console/api-keys');

    // 새 키 생성
    await page.click('text=Create New Key');
    await page.fill('[name="keyName"]', 'Test Key');
    await page.click('text=Create');

    // API 호출 대기
    await page.waitForLoadState('networkidle');

    // 새 키가 테이블에 추가되었는지 확인
    await expect(page.locator('text=Test Key')).toBeVisible();
  });

  test('Error handling for failed API calls', async ({ page }) => {
    // API 오류 시뮬레이션
    await page.route('**/api/v2/console/api-keys', (route) => {
      route.abort('failed');
    });

    await page.goto('http://localhost:5173/console/api-keys');

    // 에러 메시지 표시 확인
    await expect(page.locator('text=Failed to fetch API keys')).toBeVisible();
  });
});
```

---

## 📊 Mock 데이터 상태 추적

### Phase 2 (현재)
```
✅ mockConsoleData.ts 생성
✅ Dashboard 연결
✅ APIKeys 연결
✅ Logs 연결
✅ 빌드 성공
⏳ 스크린샷 캡처 (다음)
⏳ 스모크 테스트 (다음)
```

### Phase 3 (예정)
```
⏳ 백엔드 API 엔드포인트 구현
⏳ useAPIKeys Hook 테스트
⏳ useLogs Hook 테스트
⏳ useMetrics Hook 구현
⏳ 부분 API 전환
⏳ 통합 테스트
```

### Phase 4 (배포 전)
```
⏳ mockConsoleData.ts 제거
⏳ 모든 페이지 API 호출로 전환
⏳ 로딩/에러 상태 추가
⏳ SSE 스트리밍 활성화
⏳ E2E 비동기 테스트 작성
⏳ 최종 검증
```

---

## 🎯 제거 체크리스트 (Phase 4)

### 파일 제거
- [ ] `src/console/data/mockConsoleData.ts` 삭제
- [ ] 모든 파일에서 import 제거 확인

### 코드 변경
- [ ] Dashboard.tsx - useMetrics() 사용
- [ ] APIKeys.tsx - useAPIKeys() 사용
- [ ] Logs.tsx - useLogs() 사용
- [ ] 로딩 상태 UI 추가
- [ ] 에러 처리 추가

### 테스트 & 검증
- [ ] `npm run build` 성공
- [ ] 모든 E2E 테스트 통과
- [ ] API 응답 시간 확인
- [ ] SSE 스트리밍 작동 확인
- [ ] 오프라인 모드 동작 (선택)

---

## 📝 참고 사항

### 왜 Mock 데이터를 단계별로 관리하는가?

1. **개발 병렬화**: 백엔드 개발과 동시에 프론트엔드 완성
2. **테스트 자동화**: Mock이 있으면 API 없이도 테스트 가능
3. **UI/UX 검증**: 실제 데이터를 기다리지 않고 화면 최적화
4. **배포 안정성**: API 전환 시 문제 조기 발견
5. **문서화**: Mock으로 API 스펙 검증 가능

### Mock 데이터가 프로덕션에 포함되지 않는 이유

- 빌드 크기 증가 (mockConsoleData.ts 제거)
- 보안 (샘플 데이터 노출 방지)
- 성능 (불필요한 임포트 제거)
- 유지보수 (실제 데이터만 유지)

### 번들 크기 영향

```
Phase 2: 814.09 KB (gzipped: 238.72 KB) - Mock 포함
Phase 4: ~810 KB (gzipped: ~237 KB) - Mock 제거 (약 1-2KB 절감)
```

---

## 🚀 다음 단계

### 즉시 (Phase 2 완료)
1. ✅ Mock 데이터 초기화 완료
2. ⏳ E2E 스모크 테스트 작성
3. ⏳ 모든 페이지 스크린샷 캡처

### 단기 (Phase 3)
1. ⏳ 백엔드 API 엔드포인트 구현
2. ⏳ Hook 활성화 & 테스트
3. ⏳ 통합 테스트

### 중기 (Phase 4 - 배포 전)
1. ⏳ Mock 데이터 제거
2. ⏳ 실제 API로 전환
3. ⏳ E2E 비동기 테스트
4. ⏳ 최종 검증

---

**작성자**: Claude Code
**상태**: Phase 2 진행 중
**마지막 업데이트**: 2026-02-04
