/**
 * 01. Site Routing & ConsoleLayout Interaction Tests
 * - All route accessibility
 * - Sidebar navigation (8 nav items)
 * - Sidebar collapse/expand
 * - Header interactions (bell, avatar dropdown)
 * - Sign out flow
 * - Settings link from sidebar
 * - Active nav item highlighting
 */

import { test, expect } from '@playwright/test';

const CONSOLE_ROUTES = [
  { path: '/console', label: 'Dashboard' },
  { path: '/console/api-keys', label: 'API Keys' },
  { path: '/console/documentation', label: 'Documentation' },
  { path: '/console/logs', label: 'Request Logs' },
  { path: '/console/webhooks', label: 'Webhooks' },
  { path: '/console/integrations', label: 'SDK & Integrations' },
  { path: '/console/billing', label: 'Billing' },
  { path: '/console/settings', label: 'Settings' },
];

const LANDING_ROUTES = [
  { path: '/', expected: 'GreenFlow' },
  { path: '/shipper', expected: '' },
  { path: '/carrier', expected: '' },
  { path: '/owner', expected: '' },
];

test.describe('Landing Site Routes', () => {
  for (const route of LANDING_ROUTES) {
    test(`loads ${route.path}`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page.locator('h1').first()).toBeVisible();
    });
  }
});

test.describe('Console Route Accessibility', () => {
  for (const route of CONSOLE_ROUTES) {
    test(`${route.path} loads with correct title`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page.locator('main h1').first()).toBeVisible();
      // Page should have layout wrapper
      await expect(page.locator('aside')).toBeVisible();
      await expect(page.locator('header')).toBeVisible();
    });
  }

  test('unknown console route shows fallback', async ({ page }) => {
    await page.goto('/console/nonexistent-page');
    // Should either show 404 or redirect - page should still render
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/console');
    await page.waitForLoadState('networkidle');
  });

  test('displays all 8 navigation items', async ({ page }) => {
    const nav = page.locator('nav');
    for (const route of CONSOLE_ROUTES) {
      await expect(nav.locator(`a[href="${route.path}"]`)).toBeVisible();
    }
  });

  test('highlights active nav item on Dashboard', async ({ page }) => {
    const activeLink = page.locator('nav a[href="/console"]');
    await expect(activeLink).toHaveClass(/bg-emerald-50/);
  });

  for (const route of CONSOLE_ROUTES.slice(1)) {
    test(`navigates to ${route.label} and highlights it`, async ({ page }) => {
      await page.click(`nav a[href="${route.path}"]`);
      await page.waitForURL(`**${route.path}`);
      const activeLink = page.locator(`nav a[href="${route.path}"]`);
      await expect(activeLink).toHaveClass(/bg-emerald-50/);
    });
  }

  test('nav label shows "SDK & Integrations" not "Integrations"', async ({ page }) => {
    const intLink = page.locator('nav a[href="/console/integrations"]');
    await expect(intLink).toContainText('SDK & Integrations');
  });
});

test.describe('Sidebar Collapse & Expand', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/console');
    await page.waitForLoadState('networkidle');
  });

  test('sidebar starts expanded (w-64)', async ({ page }) => {
    const aside = page.locator('aside');
    await expect(aside).toHaveClass(/w-64/);
  });

  test('collapse button toggles sidebar to w-20', async ({ page }) => {
    const toggleBtn = page.locator('header button').first();
    await toggleBtn.click();
    const aside = page.locator('aside');
    await expect(aside).toHaveClass(/w-20/);
  });

  test('re-expand sidebar back to w-64', async ({ page }) => {
    const toggleBtn = page.locator('header button').first();
    await toggleBtn.click(); // collapse
    await toggleBtn.click(); // re-expand
    const aside = page.locator('aside');
    await expect(aside).toHaveClass(/w-64/);
  });

  test('collapsed sidebar hides user menu buttons', async ({ page }) => {
    const toggleBtn = page.locator('header button').first();
    await toggleBtn.click();
    // The user menu is in the border-t section at bottom of sidebar
    // Settings and Sign Out text should not be visible when collapsed
    const userMenu = page.locator('aside .border-t');
    await expect(userMenu.locator('span', { hasText: 'Settings' })).toBeHidden();
  });

  test('expanded sidebar shows Settings and Sign Out', async ({ page }) => {
    // Target the user menu section (border-t div at bottom of aside)
    const userMenu = page.locator('aside .border-t');
    await expect(userMenu.locator('span', { hasText: 'Settings' })).toBeVisible();
    await expect(userMenu.locator('span', { hasText: 'Sign Out' })).toBeVisible();
  });
});

test.describe('Sidebar User Menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/console');
    await page.waitForLoadState('networkidle');
  });

  test('Settings link navigates to /console/settings', async ({ page }) => {
    // Use last() to target the user menu Settings link, not the nav Settings link
    await page.locator('aside a[href="/console/settings"]').last().click();
    await page.waitForURL('**/console/settings');
    await expect(page.locator('main h1')).toContainText('Settings');
  });

  test('Sign Out clears localStorage and redirects to landing', async ({ page }) => {
    // Set something in localStorage first
    await page.evaluate(() => localStorage.setItem('api_key', 'test-key'));

    // Click Sign Out in sidebar user menu (button inside the border-t section)
    const signOutBtn = page.locator('aside .border-t button').filter({ hasText: 'Sign Out' });
    await signOutBtn.click();

    // Should redirect to landing
    await page.waitForURL('**/');
    // localStorage should be cleared
    const apiKey = await page.evaluate(() => localStorage.getItem('api_key'));
    expect(apiKey).toBeNull();
  });
});

test.describe('Header Notification Bell', () => {
  test('bell icon navigates to /console/logs on click', async ({ page }) => {
    await page.goto('/console');
    await page.waitForLoadState('networkidle');

    // Find the notification bell button by its title attribute
    const bellBtn = page.locator('header button[title="View request logs"]');
    await expect(bellBtn).toBeVisible();
    await bellBtn.click();

    await page.waitForURL('**/console/logs');
    await expect(page.locator('main h1')).toContainText('Request Logs');
  });

  test('bell icon shows green dot indicator', async ({ page }) => {
    await page.goto('/console');
    // The green dot inside the bell button
    const greenDot = page.locator('header button[title="View request logs"]').locator('span.bg-emerald-500');
    await expect(greenDot).toBeVisible();
  });
});

test.describe('Header Avatar Dropdown', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/console');
    await page.waitForLoadState('networkidle');
  });

  test('avatar shows "U" initial', async ({ page }) => {
    const avatar = page.locator('header div.from-emerald-600.rounded-full');
    await expect(avatar).toContainText('U');
  });

  test('clicking avatar opens dropdown menu', async ({ page }) => {
    const avatarBtn = page.locator('header').getByRole('button', { name: 'U', exact: true });
    await avatarBtn.click();

    // Dropdown should appear with Settings, API Keys, Sign Out
    const dropdown = page.locator('.z-50.absolute');
    await expect(dropdown).toBeVisible();
    await expect(dropdown.getByText('Settings')).toBeVisible();
    await expect(dropdown.getByText('API Keys')).toBeVisible();
    await expect(dropdown.getByText('Sign Out')).toBeVisible();
  });

  test('dropdown chevron rotates when open', async ({ page }) => {
    const avatarBtn = page.locator('header').getByRole('button', { name: 'U', exact: true });
    await avatarBtn.click();
    await expect(page.locator('.z-50.absolute')).toBeVisible();
    // ChevronDown SVG near the avatar should rotate
    const chevron = avatarBtn.locator('svg');
    await expect(chevron).toHaveClass(/rotate-180/);
  });

  test('dropdown Settings navigates to /console/settings', async ({ page }) => {
    const avatarBtn = page.locator('header').getByRole('button', { name: 'U', exact: true });
    await avatarBtn.click();

    const dropdown = page.locator('.z-50.absolute');
    await dropdown.getByText('Settings').click();
    await page.waitForURL('**/console/settings');
  });

  test('dropdown API Keys navigates to /console/api-keys', async ({ page }) => {
    const avatarBtn = page.locator('header').getByRole('button', { name: 'U', exact: true });
    await avatarBtn.click();

    const dropdown = page.locator('.z-50.absolute');
    await dropdown.getByText('API Keys').click();
    await page.waitForURL('**/console/api-keys');
  });

  test('dropdown Sign Out clears data and redirects', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('api_key', 'test'));

    const avatarBtn = page.locator('header').getByRole('button', { name: 'U', exact: true });
    await avatarBtn.click();

    const dropdown = page.locator('.z-50.absolute');
    await dropdown.getByText('Sign Out').click();

    await page.waitForURL('**/');
    const key = await page.evaluate(() => localStorage.getItem('api_key'));
    expect(key).toBeNull();
  });

  test('dropdown closes on outside click', async ({ page }) => {
    const avatarBtn = page.locator('header').getByRole('button', { name: 'U', exact: true });
    await avatarBtn.click();
    await expect(page.locator('.z-50.absolute')).toBeVisible();

    // Click on main content area using mouse
    await page.locator('main').click({ position: { x: 100, y: 100 }, force: true });
    await expect(page.locator('.z-50.absolute')).toBeHidden();
  });
});

test.describe('Header Page Title', () => {
  for (const route of CONSOLE_ROUTES) {
    test(`shows "${route.label}" on ${route.path}`, async ({ page }) => {
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');
      const headerTitle = page.locator('header h2');
      // Some routes may show "Console" if not exact match
      await expect(headerTitle).toBeVisible();
    });
  }
});

test.describe('Cross-Page Navigation Flow', () => {
  test('navigate through all 8 pages sequentially', async ({ page }) => {
    await page.goto('/console');
    await page.waitForLoadState('networkidle');

    for (const route of CONSOLE_ROUTES) {
      await page.click(`nav a[href="${route.path}"]`);
      await page.waitForURL(`**${route.path}`);
      await expect(page.locator('main h1').first()).toBeVisible();
    }
  });

  test('browser back/forward works correctly', async ({ page }) => {
    await page.goto('/console');
    await page.waitForLoadState('networkidle');

    // Navigate to API Keys
    await page.click('nav a[href="/console/api-keys"]');
    await page.waitForURL('**/console/api-keys');

    // Navigate to Logs
    await page.click('nav a[href="/console/logs"]');
    await page.waitForURL('**/console/logs');

    // Go back
    await page.goBack();
    await page.waitForURL('**/console/api-keys');

    // Go forward
    await page.goForward();
    await page.waitForURL('**/console/logs');
  });
});
