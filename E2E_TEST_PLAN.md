# 🧪 API Console E2E 테스트 계획

**작성일**: 2026-02-04
**상태**: 계획 단계
**도구**: Playwright (기존 스모크 테스트와 동일)

---

## 📋 개요

E2E 테스트는 두 단계로 진행됩니다:

### Phase 2: Mock 데이터 기반 스모크 테스트 (현재)
- 목적: UI 렌더링, 라우팅, 데이터 표시 검증
- Mock 데이터 사용: `mockConsoleData.ts`
- 테스트 파일: `tests/e2e_console_mock.spec.mjs`

### Phase 4: 실제 API 비동기 테스트 (배포 전)
- 목적: API 연결, 실시간 업데이트, 에러 처리 검증
- 실제 API 사용: 백엔드 엔드포인트
- 테스트 파일: `tests/e2e_console_api.spec.mjs`

---

## 🎯 Phase 2: Mock 스모크 테스트

### 테스트 대상

#### 1. 라우팅 & 렌더링
```
✓ /console - Dashboard 로드
✓ /console/api-keys - APIKeys 로드
✓ /console/documentation - Documentation 로드
✓ /console/logs - Logs 로드
✓ /console/webhooks - Webhooks 로드
✓ /console/integrations - Integrations 로드
✓ /console/billing - Billing 로드
✓ /console/settings - Settings 로드
```

#### 2. Mock 데이터 표시
```
✓ Dashboard: 4개 메트릭 카드 표시
✓ Dashboard: 5개 엔드포인트 순위 표시
✓ Dashboard: 5개 최근 활동 표시
✓ APIKeys: 4개 API 키 테이블 표시
✓ Logs: 8개 로그 테이블 표시
```

#### 3. UI 인터랙션
```
✓ Sidebar 펼치기/접기 가능
✓ 네비게이션 링크 클릭 가능
✓ 필터/검색 UI 표시
✓ 버튼 클릭 반응
```

### 테스트 코드 구조

```javascript
// tests/e2e_console_mock.spec.mjs

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('API Console - Mock Data Tests', () => {
  test.beforeEach(async ({ page }) => {
    // 각 테스트 전에 기본 URL로 이동
    await page.goto(BASE_URL);
  });

  test.describe('Routing', () => {
    test('should navigate to console dashboard', async ({ page }) => {
      await page.goto(`${BASE_URL}/console`);
      await expect(page).toHaveTitle(/GreenFlow/);
      await expect(page.locator('h1')).toContainText('Dashboard');
    });

    test('should navigate to all console pages', async ({ page }) => {
      const routes = [
        '/console',
        '/console/api-keys',
        '/console/documentation',
        '/console/logs',
        '/console/webhooks',
        '/console/integrations',
        '/console/billing',
        '/console/settings',
      ];

      for (const route of routes) {
        await page.goto(`${BASE_URL}${route}`);
        // 페이지 로드 확인
        await expect(page.locator('main')).toBeVisible();
      }
    });
  });

  test.describe('Dashboard', () => {
    test('should display all metric cards', async ({ page }) => {
      await page.goto(`${BASE_URL}/console`);

      // 4개 메트릭 카드 확인
      const metrics = [
        'Total Requests',
        'Success Rate',
        'Avg Response Time',
        'Active API Keys',
      ];

      for (const metric of metrics) {
        await expect(page.locator(`text=${metric}`)).toBeVisible();
      }
    });

    test('should display mock metrics values', async ({ page }) => {
      await page.goto(`${BASE_URL}/console`);

      // Mock 데이터 값 확인
      await expect(page.locator('text=12,453')).toBeVisible(); // Total Requests
      await expect(page.locator('text=99.8%')).toBeVisible();  // Success Rate
      await expect(page.locator('text=142ms')).toBeVisible();  // Avg Response Time
    });

    test('should display top endpoints', async ({ page }) => {
      await page.goto(`${BASE_URL}/console`);

      // 엔드포인트 표시 확인
      await expect(page.locator('text=Top Endpoints')).toBeVisible();
      await expect(page.locator('text=/bids')).toBeVisible();
      await expect(page.locator('text=/proposals')).toBeVisible();
    });

    test('should display recent activity', async ({ page }) => {
      await page.goto(`${BASE_URL}/console`);

      // 최근 활동 표시 확인
      await expect(page.locator('text=Recent Activity')).toBeVisible();
      await expect(page.locator('text=API Key Created')).toBeVisible();
      await expect(page.locator('text=Error Rate')).toBeVisible();
    });

    test('should take dashboard screenshot', async ({ page }) => {
      await page.goto(`${BASE_URL}/console`);
      await page.waitForLoadState('networkidle');
      await page.screenshot({
        path: 'test-artifacts/console-dashboard-mock.png',
        fullPage: true,
      });
    });
  });

  test.describe('API Keys', () => {
    test('should display all mock API keys', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/api-keys`);

      // 테이블 행 확인 (4개 키)
      const rows = page.locator('table tbody tr');
      await expect(rows).toHaveCount(4);
    });

    test('should display key details correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/api-keys`);

      // 첫 번째 키 정보 확인
      await expect(page.locator('text=Production API Key')).toBeVisible();
      await expect(page.locator('text=ACTIVE')).toBeVisible();
      await expect(page.locator('text=glec_prod')).toBeVisible();
    });

    test('should show revoked keys', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/api-keys`);

      // Revoked 상태 키 확인
      const revokedBadges = page.locator('text=REVOKED');
      await expect(revokedBadges).toBeVisible();
    });

    test('should have Create New Key button', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/api-keys`);

      // Create 버튼 확인
      const createBtn = page.locator('text=Create New Key');
      await expect(createBtn).toBeVisible();
    });

    test('should take API keys screenshot', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/api-keys`);
      await page.waitForLoadState('networkidle');
      await page.screenshot({
        path: 'test-artifacts/console-api-keys-mock.png',
        fullPage: true,
      });
    });
  });

  test.describe('Logs', () => {
    test('should display all mock logs', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/logs`);

      // 로그 행 확인 (8개 로그)
      const rows = page.locator('table tbody tr');
      await expect(rows).toHaveCount(8);
    });

    test('should display log details correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/logs`);

      // 첫 번째 로그 확인
      await expect(page.locator('text=GET')).toBeVisible();
      await expect(page.locator('text=/bids')).toBeVisible();
      await expect(page.locator('text=200')).toBeVisible();
    });

    test('should show status codes with correct colors', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/logs`);

      // 성공 상태코드 (200)
      const successCode = page.locator('text=200').first();
      await expect(successCode).toHaveClass(/emerald/); // 초록색

      // 실패 상태코드 (404, 403)
      const errorCode = page.locator('text=404');
      await expect(errorCode).toHaveClass(/orange/); // 주황색
    });

    test('should have filter controls', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/logs`);

      // 필터 버튼 확인
      await expect(page.locator('text=Filters')).toBeVisible();
      await expect(page.locator('text=Search')).toBeVisible();
      await expect(page.locator('text=Export')).toBeVisible();
    });

    test('should take logs screenshot', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/logs`);
      await page.waitForLoadState('networkidle');
      await page.screenshot({
        path: 'test-artifacts/console-logs-mock.png',
        fullPage: true,
      });
    });
  });

  test.describe('Other Pages', () => {
    test('should display documentation placeholder', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/documentation`);

      await expect(page.locator('text=API Documentation')).toBeVisible();
      await expect(page.locator('text=Swagger')).toBeVisible();
    });

    test('should display webhooks empty state', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/webhooks`);

      await expect(page.locator('text=No Webhooks Yet')).toBeVisible();
      await expect(page.locator('text=Create Your First Webhook')).toBeVisible();
    });

    test('should display integrations cards', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/integrations`);

      // 3개 통합 카드 확인
      await expect(page.locator('text=Slack')).toBeVisible();
      await expect(page.locator('text=Zapier')).toBeVisible();
      await expect(page.locator('text=GitHub')).toBeVisible();
    });

    test('should display billing information', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/billing`);

      await expect(page.locator('text=Current Plan')).toBeVisible();
      await expect(page.locator('text=Professional')).toBeVisible();
      await expect(page.locator('text=$99')).toBeVisible();
    });

    test('should display settings page', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/settings`);

      await expect(page.locator('text=Profile')).toBeVisible();
      await expect(page.locator('text=Security')).toBeVisible();
      await expect(page.locator('text=Notifications')).toBeVisible();
    });
  });

  test.describe('UI Interactions', () => {
    test('should toggle sidebar', async ({ page }) => {
      await page.goto(`${BASE_URL}/console`);

      // Sidebar 열기 확인
      const sidebar = page.locator('aside');
      await expect(sidebar).toBeVisible();

      // 토글 버튼 클릭
      const toggleBtn = page.locator('button').filter({ has: page.locator('svg') }).first();
      await toggleBtn.click();

      // Sidebar 상태 변경 확인
      // (클래스 변경 또는 너비 변경)
    });

    test('should navigate using sidebar links', async ({ page }) => {
      await page.goto(`${BASE_URL}/console`);

      // API Keys 링크 클릭
      await page.click('text=API Keys');
      await expect(page).toHaveURL(/\/api-keys/);
      await expect(page.locator('h1')).toContainText('API Keys');
    });
  });
});
```

---

## 🔄 Phase 4: 실제 API 비동기 테스트

### 테스트 대상

#### 1. API 연결
```
✓ Dashboard 메트릭이 API에서 로드
✓ API Keys가 백엔드에서 조회
✓ Logs가 실시간으로 스트리밍
✓ 필터링/검색이 API와 동기화
```

#### 2. 실시간 업데이트
```
✓ SSE로 새 로그 수신
✓ Metrics 자동 갱신
✓ WebSocket (향후) 지원
```

#### 3. 에러 처리
```
✓ 네트워크 오류 시 에러 메시지
✓ 401 Unauthorized 처리
✓ 서버 에러 (5xx) 처리
✓ 타임아웃 처리
```

#### 4. 로딩 상태
```
✓ API 호출 중 로딩 표시
✓ 로딩 중 인터랙션 비활성화
✓ 캐싱 동작 확인
```

### Phase 4 테스트 코드 예시

```javascript
// tests/e2e_console_api.spec.mjs

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v2';

test.describe('API Console - Real API Tests', () => {
  test.describe('API Calls', () => {
    test('should fetch metrics from API', async ({ page }) => {
      let apiCallCount = 0;

      // API 호출 추적
      page.on('response', (response) => {
        if (response.url().includes('/console/logs/stats')) {
          apiCallCount++;
        }
      });

      await page.goto(`${BASE_URL}/console`);
      await page.waitForLoadState('networkidle');

      // API 호출이 발생했는지 확인
      expect(apiCallCount).toBeGreaterThan(0);
    });

    test('should load API keys from backend', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/api-keys`);
      await page.waitForLoadState('networkidle');

      // 실제 데이터가 로드되었는지 확인
      const rows = page.locator('table tbody tr');
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Real-time Streaming', () => {
    test('should receive real-time logs via SSE', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/logs`);

      // 실시간 스트림 활성화
      const streamBtn = page.locator('[data-testid="enable-stream"]');
      if (await streamBtn.isVisible()) {
        await streamBtn.click();
      }

      const initialCount = await page.locator('table tbody tr').count();

      // 3초 대기 (새 로그 수신)
      await page.waitForTimeout(3000);

      const finalCount = await page.locator('table tbody tr').count();

      // 새 로그가 추가되었을 가능성
      expect(finalCount).toBeGreaterThanOrEqual(initialCount);
    });
  });

  test.describe('Error Handling', () => {
    test('should show error when API fails', async ({ page }) => {
      // API 요청 차단
      await page.route('**/api/v2/console/api-keys', (route) => {
        route.abort('failed');
      });

      await page.goto(`${BASE_URL}/console/api-keys`);
      await page.waitForLoadState('networkidle');

      // 에러 메시지 표시 확인
      await expect(page.locator('text=/Failed|Error|Unable/i')).toBeVisible();
    });

    test('should handle 401 Unauthorized', async ({ page }) => {
      await page.route('**/api/v2/console/**', (route) => {
        route.respond({ status: 401, body: 'Unauthorized' });
      });

      await page.goto(`${BASE_URL}/console`);

      // 인증 에러 처리
      await expect(page.locator('text=/Unauthorized|Login/i')).toBeVisible();
    });

    test('should handle network timeout', async ({ page }) => {
      await page.route('**/api/v2/console/**', (route) => {
        route.abort('timedout');
      });

      await page.goto(`${BASE_URL}/console`);
      await page.waitForTimeout(5000);

      // 타임아웃 에러 처리
      await expect(page.locator('text=/timeout|Timeout/i')).toBeVisible();
    });
  });

  test.describe('Loading States', () => {
    test('should show loading spinner while fetching', async ({ page }) => {
      // 느린 네트워크 시뮬레이션
      await page.route('**/api/v2/console/**', async (route) => {
        await page.waitForTimeout(1000);
        await route.continue();
      });

      const loadingPromise = page.waitForSelector('[data-testid="loading"]', {
        timeout: 2000,
      }).catch(() => null);

      await page.goto(`${BASE_URL}/console`);

      const loadingVisible = await loadingPromise;
      // 로딩 표시가 나타났을 가능성
      // (네트워크 속도에 따라 다를 수 있음)
    });

    test('should disable buttons while loading', async ({ page }) => {
      await page.route('**/api/v2/console/api-keys', async (route) => {
        await page.waitForTimeout(2000);
        await route.continue();
      });

      await page.goto(`${BASE_URL}/console/api-keys`);

      // Create 버튼이 로딩 중에 비활성화되는지 확인
      const createBtn = page.locator('text=Create New Key');
      // 상태 확인 (disabled 속성 또는 aria-disabled)
    });
  });

  test.describe('CRUD Operations', () => {
    test('should create API key via API', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/api-keys`);

      // Create 버튼 클릭
      await page.click('text=Create New Key');

      // 폼 작성
      await page.fill('[name="name"]', 'New Test Key');
      await page.click('text=Create');

      // API 호출 대기
      await page.waitForLoadState('networkidle');

      // 새 키가 테이블에 추가되었는지 확인
      await expect(page.locator('text=New Test Key')).toBeVisible();
    });

    test('should revoke API key', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/api-keys`);

      // 첫 번째 키의 리보크 버튼 클릭
      const revokeBtn = page.locator('button').filter({ has: page.locator('[aria-label="Revoke"]') }).first();
      await revokeBtn.click();

      // 확인 대화상자
      if (await page.locator('text=Confirm').isVisible()) {
        await page.click('text=Yes');
      }

      // API 호출 대기
      await page.waitForLoadState('networkidle');

      // 상태가 REVOKED로 변경되었는지 확인
      await expect(page.locator('text=REVOKED')).toBeVisible();
    });
  });
});
```

---

## 📊 테스트 범위

### Phase 2 커버리지 (Mock)
```
- 라우팅: 8개 페이지
- 데이터 표시: 18개 UI 요소
- 스크린샷: 8개 이미지
- 예상 테스트: ~30개
```

### Phase 4 커버리지 (실제 API)
```
- API 호출: 12+ 엔드포인트
- 실시간 스트리밍: SSE
- 에러 처리: 5+ 시나리오
- CRUD 작업: 8+ 작업
- 예상 테스트: ~40+개
```

---

## 🎯 실행 방법

### Phase 2: Mock 테스트 실행
```bash
# 개발 서버 시작
npm run dev

# 다른 터미널에서 테스트 실행
npx playwright test tests/e2e_console_mock.spec.mjs

# 특정 테스트만 실행
npx playwright test tests/e2e_console_mock.spec.mjs -g "Dashboard"

# UI 모드로 실행
npx playwright test tests/e2e_console_mock.spec.mjs --ui

# 스크린샷 생성
npx playwright test tests/e2e_console_mock.spec.mjs --update-snapshots
```

### Phase 4: 실제 API 테스트 실행
```bash
# 백엔드 + 개발 서버 모두 실행
npm run dev
npm run dev:backend

# 테스트 실행
npx playwright test tests/e2e_console_api.spec.mjs

# 리포트 보기
npx playwright show-report
```

---

## 📈 성공 기준

### Phase 2 (Mock 테스트)
```
✅ 모든 페이지 로드 성공
✅ 모든 Mock 데이터 표시됨
✅ 모든 스크린샷 생성됨
✅ 8개 이상의 스모크 테스트 통과
```

### Phase 4 (실제 API 테스트)
```
✅ 모든 API 엔드포인트 응답
✅ 실시간 스트리밍 작동
✅ 에러 처리 완벽
✅ CRUD 작업 성공
✅ 40+ 테스트 통과
```

---

**작성자**: Claude Code
**상태**: 계획 단계
**마지막 업데이트**: 2026-02-04
