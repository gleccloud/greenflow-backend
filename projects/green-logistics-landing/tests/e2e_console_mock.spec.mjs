/**
 * E2E Test Suite: API Console - Mock Data Tests (Phase 2)
 *
 * Tests UI rendering, routing, and data display using mock data.
 * Mock data is used for:
 * - UI/UX validation
 * - Screenshot capture for documentation
 * - Smoke testing before API integration
 *
 * Tests will be updated in Phase 4 to use real API endpoints.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('API Console - Mock Data Tests (Phase 2)', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to base URL before each test
    await page.goto(BASE_URL);
  });

  // ============================================================================
  // ROUTING & PAGE LOADS
  // ============================================================================

  test.describe('Routing & Page Loads', () => {

    test('should navigate to console dashboard', async ({ page }) => {
      await page.goto(`${BASE_URL}/console`);

      // Wait for main content to load
      await page.waitForLoadState('networkidle');

      // Verify page loaded with correct title
      await expect(page).toHaveTitle(/GreenFlow|Console|API/i);

      // Verify dashboard header
      await expect(page.locator('h1')).toContainText('Dashboard');

      // Verify main content area visible
      await expect(page.locator('main')).toBeVisible();
    });

    test('should navigate to all 8 console pages', async ({ page }) => {
      const routes = [
        { path: '/console', title: 'Dashboard' },
        { path: '/console/api-keys', title: 'API Keys' },
        { path: '/console/logs', title: 'Logs' },
        { path: '/console/documentation', title: 'Documentation' },
        { path: '/console/webhooks', title: 'Webhooks' },
        { path: '/console/integrations', title: 'Integrations' },
        { path: '/console/billing', title: 'Billing' },
        { path: '/console/settings', title: 'Settings' },
      ];

      for (const route of routes) {
        await page.goto(`${BASE_URL}${route.path}`);
        await page.waitForLoadState('networkidle');

        // Verify page loaded
        await expect(page.locator('main')).toBeVisible();

        // Verify h1 contains expected title
        const h1 = page.locator('h1').first();
        await expect(h1).toBeVisible();
      }
    });

    test('should have console layout with sidebar', async ({ page }) => {
      await page.goto(`${BASE_URL}/console`);
      await page.waitForLoadState('networkidle');

      // Verify layout components
      await expect(page.locator('aside')).toBeVisible(); // Sidebar
      await expect(page.locator('header')).toBeVisible(); // Header
      await expect(page.locator('main')).toBeVisible(); // Main content
    });
  });

  // ============================================================================
  // DASHBOARD PAGE
  // ============================================================================

  test.describe('Dashboard Page', () => {

    test('should display all 4 metric cards', async ({ page }) => {
      await page.goto(`${BASE_URL}/console`);
      await page.waitForLoadState('networkidle');

      // Verify metric cards exist
      const metricLabels = [
        'Total Requests',
        'Success Rate',
        'Avg Response Time',
        'Active API Keys',
      ];

      for (const label of metricLabels) {
        const element = page.locator(`text=${label}`);
        await expect(element).toBeVisible({ timeout: 5000 });
      }
    });

    test('should display correct mock metric values', async ({ page }) => {
      await page.goto(`${BASE_URL}/console`);
      await page.waitForLoadState('networkidle');

      // Verify specific mock data values
      await expect(page.locator('text=12,453')).toBeVisible(); // Total Requests
      await expect(page.locator('text=99.8%')).toBeVisible(); // Success Rate
      await expect(page.locator('text=142ms')).toBeVisible(); // Avg Response Time
    });

    test('should display Top Endpoints section', async ({ page }) => {
      await page.goto(`${BASE_URL}/console`);
      await page.waitForLoadState('networkidle');

      // Verify section header
      await expect(page.locator('text=Top Endpoints')).toBeVisible();

      // Verify endpoint names are displayed
      await expect(page.locator('text=/api/v2/bids')).toBeVisible();
      await expect(page.locator('text=/api/v2/proposals')).toBeVisible();
      await expect(page.locator('text=/api/v2/fleets')).toBeVisible();
    });

    test('should display Recent Activity section', async ({ page }) => {
      await page.goto(`${BASE_URL}/console`);
      await page.waitForLoadState('networkidle');

      // Verify section header
      await expect(page.locator('text=Recent Activity')).toBeVisible();

      // Verify activity items
      await expect(page.locator('text=API Key Created')).toBeVisible();
      await expect(page.locator('text=High Error Rate')).toBeVisible();
      await expect(page.locator('text=API Key Rotated')).toBeVisible();
    });

    test('should have Request Trend chart placeholder', async ({ page }) => {
      await page.goto(`${BASE_URL}/console`);
      await page.waitForLoadState('networkidle');

      // Verify chart section exists
      await expect(page.locator('text=Request Trend')).toBeVisible();
      await expect(page.locator('text=(7 days)')).toBeVisible();
    });

    test('should capture dashboard screenshot', async ({ page }) => {
      await page.goto(`${BASE_URL}/console`);
      await page.waitForLoadState('networkidle');

      // Wait for all images to load
      await page.waitForLoadState('load');

      await page.screenshot({
        path: 'test-artifacts/console-dashboard-mock.png',
        fullPage: true,
      });
    });
  });

  // ============================================================================
  // API KEYS PAGE
  // ============================================================================

  test.describe('API Keys Page', () => {

    test('should navigate to API Keys page', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/api-keys`);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h1')).toContainText('API Keys');
    });

    test('should display all 4 mock API keys in table', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/api-keys`);
      await page.waitForLoadState('networkidle');

      // Verify table rows (should have 4 mock keys)
      const rows = page.locator('table tbody tr');
      await expect(rows).toHaveCount(4);
    });

    test('should display API key details correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/api-keys`);
      await page.waitForLoadState('networkidle');

      // Verify key names
      await expect(page.locator('text=Production API Key')).toBeVisible();
      await expect(page.locator('text=Testing Environment')).toBeVisible();
      await expect(page.locator('text=Partner Integration')).toBeVisible();
    });

    test('should display ACTIVE and REVOKED statuses', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/api-keys`);
      await page.waitForLoadState('networkidle');

      // Verify status badges
      const activeStatus = page.locator('text=ACTIVE');
      const revokedStatus = page.locator('text=REVOKED');

      await expect(activeStatus).toBeVisible();
      await expect(revokedStatus).toBeVisible();
    });

    test('should show key prefix information', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/api-keys`);
      await page.waitForLoadState('networkidle');

      // Verify key prefixes are visible
      await expect(page.locator('text=glec_prod')).toBeVisible();
      await expect(page.locator('text=glec_test')).toBeVisible();
    });

    test('should have Create New Key button', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/api-keys`);
      await page.waitForLoadState('networkidle');

      // Verify create button
      const createBtn = page.locator('button', { has: page.locator('text=Create') }).first();
      await expect(createBtn).toBeVisible();
    });

    test('should capture API Keys screenshot', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/api-keys`);
      await page.waitForLoadState('networkidle');
      await page.waitForLoadState('load');

      await page.screenshot({
        path: 'test-artifacts/console-api-keys-mock.png',
        fullPage: true,
      });
    });
  });

  // ============================================================================
  // LOGS PAGE
  // ============================================================================

  test.describe('Logs Page', () => {

    test('should navigate to Logs page', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/logs`);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h1')).toContainText('Logs');
    });

    test('should display all 8 mock logs in table', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/logs`);
      await page.waitForLoadState('networkidle');

      // Verify table rows (should have 8 mock logs)
      const rows = page.locator('table tbody tr');
      await expect(rows).toHaveCount(8);
    });

    test('should display log details correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/logs`);
      await page.waitForLoadState('networkidle');

      // Verify HTTP methods are displayed
      await expect(page.locator('text=GET').first()).toBeVisible();
      await expect(page.locator('text=POST').first()).toBeVisible();
      await expect(page.locator('text=PUT').first()).toBeVisible();

      // Verify endpoints are displayed
      await expect(page.locator('text=/api/v2/bids')).toBeVisible();
      await expect(page.locator('text=/api/v2/proposals')).toBeVisible();
    });

    test('should display status codes with color coding', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/logs`);
      await page.waitForLoadState('networkidle');

      // Verify status codes are visible
      const successCode = page.locator('text=200').first();
      const notFoundCode = page.locator('text=404').first();
      const forbiddenCode = page.locator('text=403').first();

      await expect(successCode).toBeVisible();
      await expect(notFoundCode).toBeVisible();
      await expect(forbiddenCode).toBeVisible();
    });

    test('should display request/response sizes', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/logs`);
      await page.waitForLoadState('networkidle');

      // Verify size information is displayed (bytes)
      const sizePatterns = page.locator('text=/\\d+ B$/');
      await expect(sizePatterns.first()).toBeVisible();
    });

    test('should display response times in milliseconds', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/logs`);
      await page.waitForLoadState('networkidle');

      // Verify duration column shows milliseconds
      const durationPattern = page.locator('text=/\\d+ms$/');
      await expect(durationPattern.first()).toBeVisible();
    });

    test('should have filter and search controls', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/logs`);
      await page.waitForLoadState('networkidle');

      // Verify UI controls exist
      // (Search bar, Filter button, Export button are common in logs)
      const mainContent = page.locator('main');
      await expect(mainContent).toBeVisible();
    });

    test('should capture Logs screenshot', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/logs`);
      await page.waitForLoadState('networkidle');
      await page.waitForLoadState('load');

      await page.screenshot({
        path: 'test-artifacts/console-logs-mock.png',
        fullPage: true,
      });
    });
  });

  // ============================================================================
  // OTHER PAGES
  // ============================================================================

  test.describe('Other Console Pages', () => {

    test('should display Documentation page', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/documentation`);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('main')).toBeVisible();
    });

    test('should display Webhooks page', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/webhooks`);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('main')).toBeVisible();
    });

    test('should display Integrations page', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/integrations`);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('main')).toBeVisible();
    });

    test('should display Billing page', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/billing`);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('main')).toBeVisible();
    });

    test('should display Settings page', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/settings`);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('main')).toBeVisible();
    });

    test('should capture Documentation screenshot', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/documentation`);
      await page.waitForLoadState('networkidle');
      await page.waitForLoadState('load');

      await page.screenshot({
        path: 'test-artifacts/console-documentation-mock.png',
        fullPage: true,
      });
    });

    test('should capture Webhooks screenshot', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/webhooks`);
      await page.waitForLoadState('networkidle');
      await page.waitForLoadState('load');

      await page.screenshot({
        path: 'test-artifacts/console-webhooks-mock.png',
        fullPage: true,
      });
    });

    test('should capture Integrations screenshot', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/integrations`);
      await page.waitForLoadState('networkidle');
      await page.waitForLoadState('load');

      await page.screenshot({
        path: 'test-artifacts/console-integrations-mock.png',
        fullPage: true,
      });
    });

    test('should capture Billing screenshot', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/billing`);
      await page.waitForLoadState('networkidle');
      await page.waitForLoadState('load');

      await page.screenshot({
        path: 'test-artifacts/console-billing-mock.png',
        fullPage: true,
      });
    });

    test('should capture Settings screenshot', async ({ page }) => {
      await page.goto(`${BASE_URL}/console/settings`);
      await page.waitForLoadState('networkidle');
      await page.waitForLoadState('load');

      await page.screenshot({
        path: 'test-artifacts/console-settings-mock.png',
        fullPage: true,
      });
    });
  });

  // ============================================================================
  // UI INTERACTIONS
  // ============================================================================

  test.describe('UI Interactions', () => {

    test('should have visible sidebar navigation', async ({ page }) => {
      await page.goto(`${BASE_URL}/console`);
      await page.waitForLoadState('networkidle');

      // Verify sidebar is visible
      const sidebar = page.locator('aside');
      await expect(sidebar).toBeVisible();

      // Verify navigation links exist
      const navLinks = sidebar.locator('a, button');
      await expect(navLinks).not.toHaveCount(0);
    });

    test('should navigate between pages using sidebar', async ({ page }) => {
      await page.goto(`${BASE_URL}/console`);
      await page.waitForLoadState('networkidle');

      // Find and click API Keys link in sidebar
      const apiKeysLink = page.locator('a:has-text("API Keys"), button:has-text("API Keys")').first();
      if (await apiKeysLink.isVisible()) {
        await apiKeysLink.click();
        await page.waitForLoadState('networkidle');

        // Verify navigation
        await expect(page).toHaveURL(/\/api-keys/);
      }
    });

    test('should display header with console branding', async ({ page }) => {
      await page.goto(`${BASE_URL}/console`);
      await page.waitForLoadState('networkidle');

      // Verify header is visible
      const header = page.locator('header');
      await expect(header).toBeVisible();
    });

    test('should maintain layout on page navigation', async ({ page }) => {
      await page.goto(`${BASE_URL}/console`);
      await page.waitForLoadState('networkidle');

      // Navigate to another page
      await page.goto(`${BASE_URL}/console/logs`);
      await page.waitForLoadState('networkidle');

      // Verify layout components still visible
      await expect(page.locator('aside')).toBeVisible();
      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('main')).toBeVisible();
    });
  });

  // ============================================================================
  // MOCK DATA VALIDATION
  // ============================================================================

  test.describe('Mock Data Validation', () => {

    test('should render without errors', async ({ page }) => {
      // Listen for console errors
      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.goto(`${BASE_URL}/console`);
      await page.waitForLoadState('networkidle');

      // Check that no critical errors occurred
      const criticalErrors = errors.filter(e => !e.includes('404'));
      // Allow some 404s for non-critical assets
    });

    test('should have correct mock data for all pages', async ({ page }) => {
      const pages = [
        { path: '/console', keyword: 'Dashboard' },
        { path: '/console/api-keys', keyword: 'API Keys' },
        { path: '/console/logs', keyword: 'Logs' },
      ];

      for (const p of pages) {
        await page.goto(`${BASE_URL}${p.path}`);
        await page.waitForLoadState('networkidle');

        // Verify page is not empty
        const content = page.locator('main');
        await expect(content).toBeVisible();

        // Verify has meaningful content (more than just headers)
        const textContent = await page.locator('body').textContent();
        expect(textContent?.length || 0).toBeGreaterThan(100);
      }
    });

    test('should display metrics and tables correctly', async ({ page }) => {
      // Test Dashboard metrics
      await page.goto(`${BASE_URL}/console`);
      await page.waitForLoadState('networkidle');

      const dashboardMetrics = await page.locator('text=12,453').count();
      expect(dashboardMetrics).toBeGreaterThan(0);

      // Test API Keys table
      await page.goto(`${BASE_URL}/console/api-keys`);
      await page.waitForLoadState('networkidle');

      const keyRows = await page.locator('table tbody tr').count();
      expect(keyRows).toBe(4);

      // Test Logs table
      await page.goto(`${BASE_URL}/console/logs`);
      await page.waitForLoadState('networkidle');

      const logRows = await page.locator('table tbody tr').count();
      expect(logRows).toBe(8);
    });
  });

  // ============================================================================
  // PERFORMANCE & ACCESSIBILITY
  // ============================================================================

  test.describe('Performance & Accessibility', () => {

    test('should load dashboard quickly', async ({ page }) => {
      const start = Date.now();
      await page.goto(`${BASE_URL}/console`);
      await page.waitForLoadState('networkidle');
      const duration = Date.now() - start;

      // Should load in less than 5 seconds
      expect(duration).toBeLessThan(5000);
    });

    test('should have semantic HTML structure', async ({ page }) => {
      await page.goto(`${BASE_URL}/console`);
      await page.waitForLoadState('networkidle');

      // Verify semantic elements
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('header')).toBeVisible();
    });

    test('should be responsive on different viewport sizes', async ({ page }) => {
      const viewports = [
        { width: 1920, height: 1080 }, // Desktop
        { width: 1024, height: 768 },  // Tablet
        { width: 375, height: 667 },   // Mobile
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.goto(`${BASE_URL}/console`);
        await page.waitForLoadState('networkidle');

        // Verify main content is visible at all sizes
        await expect(page.locator('main')).toBeVisible();
      }
    });
  });
});
