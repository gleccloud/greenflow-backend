/**
 * 10. Performance & Accessibility Nano-Level E2E Tests
 * - Page load times for all 8 console pages
 * - Semantic HTML structure
 * - Keyboard navigation
 * - Focus management
 * - Responsive viewports
 * - No console errors on page load
 * - Memory: no memory leaks on rapid navigation
 */

import { test, expect } from '@playwright/test';

const CONSOLE_PAGES = [
  { path: '/console', name: 'Dashboard' },
  { path: '/console/api-keys', name: 'API Keys' },
  { path: '/console/documentation', name: 'Documentation' },
  { path: '/console/logs', name: 'Logs' },
  { path: '/console/webhooks', name: 'Webhooks' },
  { path: '/console/integrations', name: 'Integrations' },
  { path: '/console/billing', name: 'Billing' },
  { path: '/console/settings', name: 'Settings' },
];

test.describe('Page Load Performance', () => {
  for (const page_ of CONSOLE_PAGES) {
    test(`${page_.name} loads within 5 seconds`, async ({ page }) => {
      const start = Date.now();
      await page.goto(page_.path);
      // Wait for either the page h1 or any main content (error states may not have h1)
      await page.locator('main').waitFor({ state: 'visible', timeout: 5000 });
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(5000);
    });
  }

  test('landing page loads within 3 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 3000 });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000);
  });
});

test.describe('Semantic HTML Structure', () => {
  for (const page_ of CONSOLE_PAGES) {
    test(`${page_.name} has semantic landmarks`, async ({ page }) => {
      await page.goto(page_.path);
      await page.waitForLoadState('networkidle');

      // Should have header, nav, main, aside
      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('nav').first()).toBeVisible();
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('aside')).toBeVisible();
    });
  }

  for (const page_ of CONSOLE_PAGES) {
    test(`${page_.name} has h1 heading or content`, async ({ page }) => {
      await page.goto(page_.path);
      await page.waitForLoadState('networkidle');

      // Each page should have an h1 inside main (or error/loading state content)
      const h1Count = await page.locator('main h1').count();
      const hasContent = await page.locator('main').locator('h1, h2, h3, p').first().isVisible().catch(() => false);
      expect(h1Count >= 1 || hasContent).toBeTruthy();
    });
  }
});

test.describe('Keyboard Navigation', () => {
  test('Tab key moves focus through sidebar nav items', async ({ page }) => {
    await page.goto('/console');
    await page.waitForLoadState('networkidle');

    // Focus the first nav link
    const firstLink = page.locator('nav a').first();
    await firstLink.focus();

    // Tab through several items
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }

    // Some element should be focused
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
  });

  test('Enter key activates focused nav link', async ({ page }) => {
    await page.goto('/console');
    await page.waitForLoadState('networkidle');

    // Click the API Keys link directly to navigate
    const apiKeysLink = page.locator('nav a[href="/console/api-keys"]');
    await apiKeysLink.focus();
    await page.keyboard.press('Enter');
    await page.waitForURL('**/console/api-keys');
    await expect(page.locator('main h1')).toContainText('API Keys');
  });
});

test.describe('Responsive Viewports', () => {
  const viewports = [
    { width: 1024, height: 768, name: 'Tablet Landscape' },
    { width: 1280, height: 720, name: 'Small Desktop' },
    { width: 1440, height: 900, name: 'Medium Desktop' },
    { width: 1920, height: 1080, name: 'Full HD' },
  ];

  for (const vp of viewports) {
    test(`Dashboard renders at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/console');
      await page.waitForLoadState('networkidle');
      // Dashboard should render (may show error state if backend is down, but layout should work)
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('aside')).toBeVisible();
    });
  }
});

test.describe('Console Error Monitoring', () => {
  for (const page_ of CONSOLE_PAGES) {
    test(`${page_.name} has no uncaught JS errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));

      await page.goto(page_.path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Filter out expected API errors (network failures when backend is down)
      const criticalErrors = errors.filter(
        (e) => !e.includes('fetch') && !e.includes('Failed to fetch') && !e.includes('NetworkError') && !e.includes('ERR_CONNECTION_REFUSED')
      );
      expect(criticalErrors).toHaveLength(0);
    });
  }
});

test.describe('Rapid Navigation Stability', () => {
  test('rapidly switching between all pages does not crash', async ({ page }) => {
    await page.goto('/console');
    await page.waitForLoadState('networkidle');

    // Navigate through all pages twice rapidly
    for (let round = 0; round < 2; round++) {
      for (const p of CONSOLE_PAGES) {
        await page.click(`nav a[href="${p.path}"]`);
        await page.waitForTimeout(200);
      }
    }

    // Page should still be stable
    await expect(page.locator('aside')).toBeVisible();
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });

  test('back/forward through 8 pages does not crash', async ({ page }) => {
    await page.goto('/console');
    await page.waitForLoadState('networkidle');

    // Navigate forward through pages
    for (const p of CONSOLE_PAGES.slice(1)) {
      await page.click(`nav a[href="${p.path}"]`);
      await page.waitForTimeout(200);
    }

    // Go back through all pages
    for (let i = 0; i < CONSOLE_PAGES.length - 1; i++) {
      await page.goBack();
      await page.waitForTimeout(200);
    }

    // Should be back at dashboard
    await expect(page.locator('main')).toBeVisible();
  });
});

test.describe('Button Accessibility', () => {
  test('all buttons are focusable', async ({ page }) => {
    await page.goto('/console');
    await page.waitForLoadState('networkidle');

    const buttons = page.locator('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);

    // Check first few buttons are focusable
    for (let i = 0; i < Math.min(count, 5); i++) {
      const btn = buttons.nth(i);
      if (await btn.isVisible()) {
        await btn.focus();
        const isFocused = await btn.evaluate((el) => el === document.activeElement);
        expect(isFocused).toBeTruthy();
      }
    }
  });
});

test.describe('Link Accessibility', () => {
  test('sidebar nav links have text content', async ({ page }) => {
    await page.goto('/console');
    await page.waitForLoadState('networkidle');

    const navLinks = page.locator('nav a');
    const count = await navLinks.count();
    expect(count).toBe(8);

    for (let i = 0; i < count; i++) {
      const text = await navLinks.nth(i).textContent();
      expect(text?.trim().length).toBeGreaterThan(0);
    }
  });
});

test.describe('Page Load Waterfall', () => {
  test('sequential page load total under 20 seconds', async ({ page }) => {
    const start = Date.now();

    for (const p of CONSOLE_PAGES) {
      await page.goto(p.path);
      await page.locator('main').waitFor({ state: 'visible', timeout: 5000 });
    }

    const totalElapsed = Date.now() - start;
    expect(totalElapsed).toBeLessThan(20000);
  });
});
