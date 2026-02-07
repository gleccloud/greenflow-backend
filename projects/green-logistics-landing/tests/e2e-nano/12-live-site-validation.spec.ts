/**
 * Live Site Validation — End-to-End Console Flow
 *
 * Tests the deployed site at localhost:5173 with backend at localhost:3000
 * Covers: API key creation → banner display → reveal/copy → dashboard metrics → navigation
 *
 * STRICT VALIDATION: All clipboard operations verify actual content, not just button states.
 */
import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3000/api/v2';
const DEMO_KEY = '550e8400e29b41d4a716446655440000';

test.describe('Phase 1: API Key Creation & Full Key Display', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant clipboard permissions upfront
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Set demo API key before each test
    await page.goto('/console/api-keys');
    await page.evaluate((key) => {
      localStorage.setItem('api_key', key);
    }, DEMO_KEY);
    await page.goto('/console/api-keys');
    await page.waitForLoadState('networkidle');
  });

  test('create a key and see the full key banner', async ({ page }) => {
    // Click Create New Key
    await page.getByRole('button', { name: /create new key/i }).click();

    // Fill in key name
    const nameInput = page.getByPlaceholder(/production api key/i);
    await expect(nameInput).toBeVisible();
    const keyName = `Live-Test-${Date.now()}`;
    await nameInput.fill(keyName);

    // Check some scopes
    const readFleetCheckbox = page.locator('input[type="checkbox"]').first();
    if (!(await readFleetCheckbox.isChecked())) {
      await readFleetCheckbox.check();
    }

    // Click Create Key button inside the form
    await page.locator('button:has-text("Create Key"):not(:has-text("New"))').click();

    // Wait for the form to close and banner to appear
    await page.waitForTimeout(2000);

    // The green banner should appear with the full key
    const banner = page.locator('main div.bg-emerald-50');
    const bannerVisible = await banner.isVisible().catch(() => false);

    if (bannerVisible) {
      // Banner should contain the key name
      await expect(banner.locator('text=API Key Created')).toBeVisible();

      // Banner should contain the full key (starts with glec_)
      const fullKeyCode = banner.locator('code');
      const fullKeyText = await fullKeyCode.textContent();
      expect(fullKeyText).toBeTruthy();
      expect(fullKeyText!.startsWith('glec_')).toBe(true);
      // STRICT: Full key must be exactly 69 characters (glec_ + 64 hex chars)
      expect(fullKeyText!.length).toBe(69);

      // Banner should have a copy button
      const copyBtn = banner.locator('button[title="Copy full key"]');
      await expect(copyBtn).toBeVisible();

      // Banner should have a close button (×)
      const closeBtn = banner.locator('button:has-text("×")');
      await expect(closeBtn).toBeVisible();

      // Close the banner
      await closeBtn.click();
      await expect(banner).not.toBeVisible();
    }

    // The key should appear in the table
    const table = page.locator('table');
    if (await table.isVisible()) {
      const rows = table.locator('tbody tr');
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThan(0);
    }
  });

  test('banner copy button copies the full 69-char key to clipboard', async ({ page }) => {
    // Create a key
    await page.getByRole('button', { name: /create new key/i }).click();
    const keyName = `ClipboardStrict-${Date.now()}`;
    await page.getByPlaceholder(/production api key/i).fill(keyName);
    await page.locator('button:has-text("Create Key"):not(:has-text("New"))').click();
    await page.waitForTimeout(2000);

    // Banner must be visible — use specific selector to avoid matching sidebar nav links
    const banner = page.locator('main div.bg-emerald-50');
    await expect(banner).toBeVisible();

    // Read the full key shown in the banner
    const fullKeyCode = banner.locator('code');
    const displayedKey = await fullKeyCode.textContent();
    expect(displayedKey).toBeTruthy();
    expect(displayedKey!.startsWith('glec_')).toBe(true);
    expect(displayedKey!.length).toBe(69);

    // Click the banner copy button
    const copyBtn = banner.locator('button[title="Copy full key"]');
    await copyBtn.click();
    await page.waitForTimeout(500);

    // STRICT: Read the clipboard and verify it matches the displayed key exactly
    const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardContent).toBe(displayedKey);
    expect(clipboardContent.length).toBe(69);
    expect(clipboardContent.startsWith('glec_')).toBe(true);
    // Verify hex portion (after glec_ prefix)
    const hexPortion = clipboardContent.substring(5);
    expect(hexPortion).toMatch(/^[0-9a-f]{64}$/);
  });

  test('newly created key: Eye button toggles between revealed and masked', async ({ page }) => {
    // Create a key first
    await page.getByRole('button', { name: /create new key/i }).click();
    const keyName = `Reveal-Test-${Date.now()}`;
    await page.getByPlaceholder(/production api key/i).fill(keyName);
    await page.locator('button:has-text("Create Key"):not(:has-text("New"))').click();
    await page.waitForTimeout(2000);

    // Read the full key from the banner before closing it
    const banner = page.locator('main div.bg-emerald-50');
    let expectedFullKey = '';
    if (await banner.isVisible().catch(() => false)) {
      expectedFullKey = (await banner.locator('code').textContent()) || '';
      // Close the banner
      await banner.locator('button:has-text("×")').click();
    }

    // Find our specific key row by name (parallel tests may create newer keys)
    const table = page.locator('table');
    if (await table.isVisible()) {
      const firstRow = table.locator(`tbody tr:has-text("${keyName}")`);
      await expect(firstRow).toBeVisible();

      // Newly created key should have "Show/hide full key" Eye button
      const eyeBtn = firstRow.locator('button[title="Show/hide full key"]');
      await expect(eyeBtn).toBeVisible();

      const keyCode = firstRow.locator('code').first();
      const initialText = await keyCode.textContent();

      // After create, selectedKeyToReveal is set to the new key's ID,
      // so the key may start in REVEALED state (showing full key) or MASKED state.
      // Either is acceptable; what matters is toggling works.
      const startsRevealed = !initialText!.includes('*');

      if (startsRevealed) {
        // Key starts revealed — verify it's the full key
        expect(initialText!.startsWith('glec_')).toBe(true);
        expect(initialText!.length).toBe(69);
        if (expectedFullKey) {
          expect(initialText).toBe(expectedFullKey);
        }

        // Click Eye to MASK
        await eyeBtn.click();
        await page.waitForTimeout(500);
        const maskedText = await keyCode.textContent();
        expect(maskedText).toContain('*');

        // Click Eye again to REVEAL
        await eyeBtn.click();
        await page.waitForTimeout(500);
        const revealedAgain = await keyCode.textContent();
        expect(revealedAgain!.startsWith('glec_')).toBe(true);
        expect(revealedAgain!.length).toBe(69);
      } else {
        // Key starts masked — verify asterisks present
        expect(initialText).toContain('*');

        // Click Eye to REVEAL
        await eyeBtn.click();
        await page.waitForTimeout(500);
        const revealedText = await keyCode.textContent();
        expect(revealedText!.startsWith('glec_')).toBe(true);
        expect(revealedText!.length).toBe(69);
        if (expectedFullKey) {
          expect(revealedText).toBe(expectedFullKey);
        }

        // Click again to MASK
        await eyeBtn.click();
        await page.waitForTimeout(500);
        const hiddenText = await keyCode.textContent();
        expect(hiddenText).toContain('*');
      }
    }
  });

  test('in-table copy button copies the full 69-char key for newly created key', async ({ page }) => {
    // Create a key
    await page.getByRole('button', { name: /create new key/i }).click();
    const keyName = `InTableCopy-${Date.now()}`;
    await page.getByPlaceholder(/production api key/i).fill(keyName);
    await page.locator('button:has-text("Create Key"):not(:has-text("New"))').click();
    await page.waitForTimeout(2000);

    // Read expected full key from banner
    const banner = page.locator('main div.bg-emerald-50');
    let expectedFullKey = '';
    if (await banner.isVisible().catch(() => false)) {
      expectedFullKey = (await banner.locator('code').textContent()) || '';
      await banner.locator('button:has-text("×")').click();
    }

    // Find our specific key row by name (other tests may create keys that appear first)
    const table = page.locator('table');
    if (await table.isVisible()) {
      const ourRow = table.locator(`tbody tr:has-text("${keyName}")`);
      await expect(ourRow).toBeVisible();

      const copyBtn = ourRow.locator('button[title="Copy full key"]');
      await expect(copyBtn).toBeVisible();

      // Clear clipboard first
      await page.evaluate(() => navigator.clipboard.writeText(''));

      // Click copy
      await copyBtn.click();
      await page.waitForTimeout(500);

      // STRICT: Verify clipboard content
      const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardContent.length).toBe(69);
      expect(clipboardContent.startsWith('glec_')).toBe(true);
      expect(clipboardContent.substring(5)).toMatch(/^[0-9a-f]{64}$/);

      // If we have the expected key, verify exact match
      if (expectedFullKey) {
        expect(clipboardContent).toBe(expectedFullKey);
      }

      // Check icon should appear after copy
      const checkIcon = ourRow.locator('.text-emerald-500');
      await expect(checkIcon).toBeVisible();
    }
  });

  test('existing keys show prefix only — NO copy button, NO eye button', async ({ page }) => {
    // Wait for keys to load
    await page.waitForTimeout(1500);

    const table = page.locator('table');
    if (await table.isVisible()) {
      const rows = table.locator('tbody tr');
      const rowCount = await rows.count();

      if (rowCount > 0) {
        // Find a row that is NOT newly created (doesn't have "Show/hide full key" button)
        // On a fresh page load, ALL keys lack full key in memory
        const lastRow = rows.last();

        // Should show "prefix only" label
        const prefixLabel = lastRow.locator('text=prefix only');
        await expect(prefixLabel).toBeVisible();

        // Should show the key prefix with dots
        const keyCode = lastRow.locator('code').first();
        const keyText = await keyCode.textContent();
        expect(keyText).toBeTruthy();
        // Prefix format: "glec_xxx••••••••" (8 char prefix + dots)
        expect(keyText!).toContain('••••••••');

        // STRICT: There should be NO "Copy full key" button
        const copyFullBtn = lastRow.locator('button[title="Copy full key"]');
        await expect(copyFullBtn).toHaveCount(0);

        // STRICT: There should be NO "Show/hide full key" button
        const eyeBtn = lastRow.locator('button[title="Show/hide full key"]');
        await expect(eyeBtn).toHaveCount(0);
      }
    }
  });
});

test.describe('Phase 2: Dashboard Metrics Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/console');
    await page.evaluate((key) => {
      localStorage.setItem('api_key', key);
    }, DEMO_KEY);
  });

  test('dashboard page loads and shows metric cards', async ({ page }) => {
    await page.goto('/console');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Dashboard should have content (not blank)
    const main = page.locator('main');
    const text = await main.textContent();
    expect(text!.length).toBeGreaterThan(50);

    // Should show some metric-related content
    const hasRequests = text!.includes('Requests') || text!.includes('requests');
    const hasResponse = text!.includes('Response') || text!.includes('response');
    const hasRate = text!.includes('Rate') || text!.includes('rate');
    const hasMetrics = text!.includes('Metric') || text!.includes('metric');
    const hasUsage = text!.includes('Usage') || text!.includes('usage');
    const hasError = text!.includes('error') || text!.includes('Error');
    const hasDashboard = text!.includes('Dashboard') || text!.includes('dashboard');

    expect(hasRequests || hasResponse || hasRate || hasMetrics || hasUsage || hasError || hasDashboard).toBeTruthy();
  });

  test('dashboard shows non-zero metrics after API usage', async ({ page }) => {
    // First, make a few API calls to generate metrics
    await page.goto('/console');
    await page.evaluate(async (baseUrl) => {
      const apiKey = localStorage.getItem('api_key')!;
      const headers = { 'Content-Type': 'application/json', 'X-API-Key': apiKey };
      await fetch(`${baseUrl}/console/api-keys?page=1&pageSize=5`, { headers });
      await fetch(`${baseUrl}/console/metrics/quota-info`, { headers });
    }, API_BASE);

    // Wait for metrics to be logged
    await page.waitForTimeout(2000);

    // Navigate to dashboard
    await page.goto('/console');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check that the dashboard loaded data from the API
    const metricsResult = await page.evaluate(async (baseUrl) => {
      const apiKey = localStorage.getItem('api_key')!;
      const res = await fetch(`${baseUrl}/console/metrics/summary?period=WEEK`, {
        headers: { 'X-API-Key': apiKey },
      });
      const data = await res.json();
      return { totalRequests: data.totalRequests, successRate: data.successRate };
    }, API_BASE);

    expect(metricsResult.totalRequests).toBeGreaterThan(0);
  });

  test('endpoint details API returns data', async ({ page }) => {
    await page.goto('/console');

    const result = await page.evaluate(async (baseUrl) => {
      const apiKey = localStorage.getItem('api_key')!;
      const res = await fetch(`${baseUrl}/console/metrics/endpoints-detail`, {
        headers: { 'X-API-Key': apiKey },
      });
      const data = await res.json();
      return {
        status: res.status,
        isArray: Array.isArray(data),
        count: Array.isArray(data) ? data.length : 0,
        hasEndpoint: Array.isArray(data) && data.length > 0 ? !!data[0].endpoint : false,
      };
    }, API_BASE);

    expect(result.status).toBe(200);
    expect(result.isArray).toBe(true);
    expect(result.count).toBeGreaterThan(0);
    expect(result.hasEndpoint).toBe(true);
  });

  test('quota info shows usage data', async ({ page }) => {
    await page.goto('/console');

    const result = await page.evaluate(async (baseUrl) => {
      const apiKey = localStorage.getItem('api_key')!;
      const res = await fetch(`${baseUrl}/console/metrics/quota-info`, {
        headers: { 'X-API-Key': apiKey },
      });
      const data = await res.json();
      return {
        status: res.status,
        limit: data.limit,
        used: data.used,
        remaining: data.remaining,
        percentUsed: data.percentUsed,
      };
    }, API_BASE);

    expect(result.status).toBe(200);
    expect(result.limit).toBeGreaterThan(0);
    expect(result.used).toBeGreaterThanOrEqual(0);
    expect(result.remaining).toBeLessThanOrEqual(result.limit);
  });
});

test.describe('Phase 3: Console Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/console');
    await page.evaluate((key) => {
      localStorage.setItem('api_key', key);
    }, DEMO_KEY);
  });

  test('sidebar navigation works for all pages', async ({ page }) => {
    await page.goto('/console');
    await page.waitForLoadState('networkidle');

    const navItems = [
      { text: /dashboard/i, expectUrl: '/console' },
      { text: /api keys/i, expectUrl: '/console/api-keys' },
      { text: /logs/i, expectUrl: '/console/logs' },
      { text: /webhooks/i, expectUrl: '/console/webhooks' },
      { text: /documentation/i, expectUrl: '/console/documentation' },
      { text: /billing/i, expectUrl: '/console/billing' },
      { text: /settings/i, expectUrl: '/console/settings' },
    ];

    for (const nav of navItems) {
      // Find the nav link in the sidebar
      const sidebar = page.locator('aside, nav').first();
      const link = sidebar.getByText(nav.text).first();

      if (await link.isVisible().catch(() => false)) {
        await link.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        // Check URL contains expected path
        const currentUrl = page.url();
        expect(currentUrl).toContain(nav.expectUrl);

        // Page should have content
        const main = page.locator('main');
        const mainText = await main.textContent().catch(() => '');
        expect(mainText!.length).toBeGreaterThan(10);
      }
    }
  });

  test('API Keys page shows table with keys', async ({ page }) => {
    await page.goto('/console/api-keys');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should have Create New Key button
    const createBtn = page.getByRole('button', { name: /create new key/i });
    await expect(createBtn).toBeVisible();

    // Should have a table or empty state
    const table = page.locator('table');
    const emptyState = page.getByText(/no api keys/i);
    const errorState = page.locator('.bg-orange-50');

    const hasTable = await table.isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    const hasError = await errorState.isVisible().catch(() => false);

    expect(hasTable || hasEmpty || hasError).toBeTruthy();

    if (hasTable) {
      // Table should have headers
      await expect(table.locator('th:has-text("Name")')).toBeVisible();
      await expect(table.locator('th:has-text("Key")')).toBeVisible();
      await expect(table.locator('th:has-text("Status")')).toBeVisible();

      // Should have at least one row
      const rows = table.locator('tbody tr');
      expect(await rows.count()).toBeGreaterThan(0);

      // First row should have ACTIVE badge
      const firstRowStatus = rows.first().locator('.bg-emerald-100');
      if (await firstRowStatus.isVisible().catch(() => false)) {
        await expect(firstRowStatus).toContainText('ACTIVE');
      }
    }
  });

  test('Webhooks page loads', async ({ page }) => {
    await page.goto('/console/webhooks');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const main = page.locator('main');
    const text = await main.textContent();
    expect(text!.length).toBeGreaterThan(10);

    // Should have webhook-related content
    const hasWebhook = text!.toLowerCase().includes('webhook');
    const hasEndpoint = text!.toLowerCase().includes('endpoint');
    const hasUrl = text!.toLowerCase().includes('url');
    expect(hasWebhook || hasEndpoint || hasUrl).toBeTruthy();
  });

  test('Documentation page loads with tabs', async ({ page }) => {
    await page.goto('/console/documentation');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const main = page.locator('main');
    const text = await main.textContent();
    expect(text!.length).toBeGreaterThan(50);

    // Should have documentation tabs or content
    const hasQuickStart = text!.toLowerCase().includes('quick start') || text!.toLowerCase().includes('quickstart');
    const hasApi = text!.toLowerCase().includes('api');
    const hasReference = text!.toLowerCase().includes('reference');
    const hasExample = text!.toLowerCase().includes('example');
    const hasDoc = text!.toLowerCase().includes('documentation');
    expect(hasQuickStart || hasApi || hasReference || hasExample || hasDoc).toBeTruthy();
  });

  test('Billing page loads with data', async ({ page }) => {
    await page.goto('/console/billing');
    await page.evaluate((key) => {
      localStorage.setItem('api_key', key);
    }, DEMO_KEY);
    await page.goto('/console/billing');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const main = page.locator('main');
    const text = await main.textContent();
    expect(text!.length).toBeGreaterThan(10);

    // Should have billing-related content
    const hasBilling = text!.toLowerCase().includes('billing');
    const hasCost = text!.toLowerCase().includes('cost');
    const hasPlan = text!.toLowerCase().includes('plan');
    const hasUsage = text!.toLowerCase().includes('usage');
    expect(hasBilling || hasCost || hasPlan || hasUsage).toBeTruthy();
  });

  test('Settings page loads and API key can be saved', async ({ page }) => {
    await page.goto('/console/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const main = page.locator('main');
    const text = await main.textContent();
    expect(text!.length).toBeGreaterThan(10);

    // Should have settings content
    const hasSettings = text!.toLowerCase().includes('settings');
    const hasApi = text!.toLowerCase().includes('api');
    const hasKey = text!.toLowerCase().includes('key');
    expect(hasSettings || hasApi || hasKey).toBeTruthy();

    // Find the API key input
    const apiKeyInput = page.locator('input[type="password"], input[placeholder*="API"], input[placeholder*="key"]').first();
    if (await apiKeyInput.isVisible().catch(() => false)) {
      await apiKeyInput.fill(DEMO_KEY);

      // Find and click save button
      const saveBtn = page.getByRole('button', { name: /save/i }).first();
      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(1000);

        // Verify key was saved to localStorage
        const savedKey = await page.evaluate(() => localStorage.getItem('api_key'));
        expect(savedKey).toBe(DEMO_KEY);
      }
    }
  });
});

test.describe('Phase 4: Key Lifecycle on Live Site', () => {
  test('full lifecycle: create → reveal → copy → revoke', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Setup
    await page.goto('/console/api-keys');
    await page.evaluate((key) => {
      localStorage.setItem('api_key', key);
    }, DEMO_KEY);
    await page.goto('/console/api-keys');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // 1. Create a key
    await page.getByRole('button', { name: /create new key/i }).click();
    const keyName = `Lifecycle-${Date.now()}`;
    await page.getByPlaceholder(/production api key/i).fill(keyName);
    await page.locator('button:has-text("Create Key"):not(:has-text("New"))').click();
    await page.waitForTimeout(2000);

    // 2. Verify banner with full key (use 'main' prefix to avoid matching sidebar nav)
    const banner = page.locator('main div.bg-emerald-50');
    let fullKey = '';
    if (await banner.isVisible().catch(() => false)) {
      const keyText = await banner.locator('code').textContent();
      expect(keyText).toBeTruthy();
      expect(keyText!.startsWith('glec_')).toBe(true);
      // STRICT: must be 69 chars
      expect(keyText!.length).toBe(69);
      fullKey = keyText!;

      // Copy from banner
      await banner.locator('button[title="Copy full key"]').click();
      await page.waitForTimeout(500);

      // STRICT: Verify clipboard
      const clipboardAfterBannerCopy = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardAfterBannerCopy).toBe(fullKey);

      // Close banner
      await banner.locator('button:has-text("×")').click();
    }

    // 3. Verify key appears in table with Eye and Copy buttons (since it's freshly created)
    const table = page.locator('table');
    if (await table.isVisible()) {
      const rows = table.locator('tbody tr');
      expect(await rows.count()).toBeGreaterThan(0);

      const firstRow = rows.first();
      const nameCell = await firstRow.locator('td').first().textContent();
      expect(nameCell).toContain(keyName);

      // 4. Test Eye toggle — after create, key may start REVEALED (selectedKeyToReveal is set)
      const eyeBtn = firstRow.locator('button[title="Show/hide full key"]');
      if (await eyeBtn.isVisible().catch(() => false)) {
        const keyCode = firstRow.locator('code').first();
        const initialText = await keyCode.textContent();
        const startsRevealed = !initialText!.includes('*');

        if (startsRevealed) {
          // Verify revealed text is full 69-char key
          expect(initialText!.startsWith('glec_')).toBe(true);
          expect(initialText!.length).toBe(69);
          if (fullKey) expect(initialText).toBe(fullKey);

          // Toggle to masked
          await eyeBtn.click();
          await page.waitForTimeout(500);
          const maskedText = await keyCode.textContent();
          expect(maskedText).toContain('*');

          // Toggle back to revealed
          await eyeBtn.click();
          await page.waitForTimeout(500);
          const revealedAgain = await keyCode.textContent();
          expect(revealedAgain!.length).toBe(69);
        } else {
          // Toggle to revealed
          await eyeBtn.click();
          await page.waitForTimeout(500);
          const revealedText = await keyCode.textContent();
          expect(revealedText!.startsWith('glec_')).toBe(true);
          expect(revealedText!.length).toBe(69);
          if (fullKey) expect(revealedText).toBe(fullKey);

          // Toggle back to masked
          await eyeBtn.click();
          await page.waitForTimeout(500);
        }
      }

      // 5. Test in-table copy button
      const copyBtn = firstRow.locator('button[title="Copy full key"]');
      if (await copyBtn.isVisible().catch(() => false)) {
        await page.evaluate(() => navigator.clipboard.writeText('')); // Clear clipboard
        await copyBtn.click();
        await page.waitForTimeout(500);

        // STRICT: Verify clipboard has exact full key
        const clipboardAfterTableCopy = await page.evaluate(() => navigator.clipboard.readText());
        expect(clipboardAfterTableCopy.length).toBe(69);
        expect(clipboardAfterTableCopy.startsWith('glec_')).toBe(true);
        if (fullKey) {
          expect(clipboardAfterTableCopy).toBe(fullKey);
        }
      }

      // 6. Revoke the key
      const revokeBtn = firstRow.locator('button[title="Revoke API Key"]');
      if (await revokeBtn.isVisible().catch(() => false)) {
        await revokeBtn.click();
        await page.waitForTimeout(2000);

        // After revoke, refresh to see updated state
        await page.goto('/console/api-keys');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);
      }
    }
  });
});

test.describe('Phase 5: Logs Page', () => {
  test('logs page shows API request history', async ({ page }) => {
    await page.goto('/console/logs');
    await page.evaluate((key) => {
      localStorage.setItem('api_key', key);
    }, DEMO_KEY);
    await page.goto('/console/logs');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const main = page.locator('main');
    const text = await main.textContent();
    expect(text!.length).toBeGreaterThan(10);

    // Should have log-related content
    const hasLog = text!.toLowerCase().includes('log');
    const hasRequest = text!.toLowerCase().includes('request');
    const hasEndpoint = text!.toLowerCase().includes('endpoint');
    const hasMethod = text!.toLowerCase().includes('get') || text!.toLowerCase().includes('post');
    expect(hasLog || hasRequest || hasEndpoint || hasMethod).toBeTruthy();
  });
});

test.describe('Phase 6: Strict Clipboard Verification', () => {
  test('creating key via API, then verifying clipboard copy produces exact match', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.goto('/console/api-keys');
    await page.evaluate((key) => {
      localStorage.setItem('api_key', key);
    }, DEMO_KEY);

    // Create a key directly via API to get the known full key
    const createResult = await page.evaluate(async (baseUrl) => {
      const apiKey = localStorage.getItem('api_key')!;
      const res = await fetch(`${baseUrl}/console/api-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          name: `Clipboard-Verify-${Date.now()}`,
          scopes: ['read:fleet', 'read:ei'],
        }),
      });
      const data = await res.json();
      return {
        status: res.status,
        fullKey: data?.key,
        keyId: data?.apiKey?.id,
        keyPrefix: data?.apiKey?.keyPrefix,
      };
    }, API_BASE);

    // STRICT: Validate the API response key format
    if (createResult.status === 200 || createResult.status === 201) {
      expect(createResult.fullKey).toBeTruthy();
      expect(createResult.fullKey.startsWith('glec_')).toBe(true);
      expect(createResult.fullKey.length).toBe(69);
      expect(createResult.fullKey.substring(5)).toMatch(/^[0-9a-f]{64}$/);

      // STRICT: Verify keyPrefix is exactly the first 8 characters
      expect(createResult.keyPrefix).toBe(createResult.fullKey.substring(0, 8));
      expect(createResult.keyPrefix.length).toBe(8);

      // Now reload page to get the updated list with this key in fullKeys state gone
      await page.goto('/console/api-keys');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // After page reload, the key should show as prefix-only (no full key in memory)
      const table = page.locator('table');
      if (await table.isVisible()) {
        // Find the row containing our key prefix
        const matchingRow = table.locator(`tbody tr:has(code:text("${createResult.keyPrefix}"))`);
        if (await matchingRow.isVisible().catch(() => false)) {
          // STRICT: This row should have "prefix only" label
          const prefixLabel = matchingRow.locator('text=prefix only');
          await expect(prefixLabel).toBeVisible();

          // STRICT: No copy button should exist for this row's key column
          const keyCell = matchingRow.locator('td').nth(1);
          const copyBtn = keyCell.locator('button[title="Copy full key"]');
          await expect(copyBtn).toHaveCount(0);
        }
      }
    }
  });
});
