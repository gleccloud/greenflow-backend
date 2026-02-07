/**
 * 07. SDK & Integrations Page Nano-Level E2E Tests
 * - SDK section (install, code, client cards)
 * - Active integrations (Webhooks link, REST API card)
 * - Coming Soon section
 * - Copy-to-clipboard
 * - Navigation links
 */

import { test, expect } from '@playwright/test';

test.describe('Integrations Page Load', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/console/integrations');
    await page.waitForLoadState('networkidle');
  });

  test('shows SDK & Integrations title', async ({ page }) => {
    await expect(page.locator('main h1')).toContainText('SDK & Integrations');
  });

  test('shows subtitle about connecting applications', async ({ page }) => {
    await expect(page.locator('main').getByText(/connect.*application|sdk.*api/i)).toBeVisible();
  });
});

test.describe('SDK Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/console/integrations');
    await page.waitForLoadState('networkidle');
  });

  test('shows TypeScript / JavaScript SDK header', async ({ page }) => {
    await expect(page.locator('main').getByText(/typescript.*javascript.*sdk/i)).toBeVisible();
  });

  test('shows @glec/sdk version info', async ({ page }) => {
    await expect(page.locator('main').getByText(/@glec\/sdk/).first()).toBeVisible();
  });

  test('shows npm install command', async ({ page }) => {
    await expect(page.locator('main').getByText('npm install @glec/sdk')).toBeVisible();
  });

  test('has copy button for npm command', async ({ page }) => {
    // The install line should have a copy button nearby
    const installLine = page.locator('main').locator('code').filter({ hasText: 'npm install @glec/sdk' });
    const parent = installLine.locator('..');
    const copyBtn = parent.locator('button');
    const count = await copyBtn.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('shows Quick Start code block', async ({ page }) => {
    const codeBlock = page.locator('main').locator('pre code');
    const count = await codeBlock.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('code block contains GlecClient import', async ({ page }) => {
    const code = page.locator('main').locator('pre code').first();
    await expect(code).toContainText('GlecClient');
  });

  test('code block contains @glec/sdk import', async ({ page }) => {
    const code = page.locator('main').locator('pre code').first();
    await expect(code).toContainText('@glec/sdk');
  });
});

test.describe('SDK Client Cards', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/console/integrations');
    await page.waitForLoadState('networkidle');
  });

  test('shows Fleet client card with 9 methods', async ({ page }) => {
    await expect(page.locator('main').getByText('Fleet').first()).toBeVisible();
    await expect(page.locator('main').getByText('9 methods')).toBeVisible();
  });

  test('shows Bids client card with 15 methods', async ({ page }) => {
    await expect(page.locator('main').getByRole('heading', { name: 'Bids' })).toBeVisible();
    await expect(page.locator('main').getByText('15 methods')).toBeVisible();
  });

  test('shows Orders client card with 5 methods', async ({ page }) => {
    await expect(page.locator('main').getByRole('heading', { name: 'Orders' })).toBeVisible();
    await expect(page.locator('main').getByText('5 methods', { exact: true })).toBeVisible();
  });

  test('shows Integrity client card with 16 methods', async ({ page }) => {
    await expect(page.locator('main').getByText('Integrity')).toBeVisible();
    await expect(page.locator('main').getByText('16 methods')).toBeVisible();
  });

  test('4 client cards in grid layout', async ({ page }) => {
    const cards = page.locator('main').locator('.border.border-slate-200.rounded-lg.p-4');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });
});

test.describe('Documentation Link', () => {
  test('shows link to documentation page', async ({ page }) => {
    await page.goto('/console/integrations');
    await page.waitForLoadState('networkidle');

    const docLink = page.locator('main').locator('a[href="/console/documentation"]');
    await expect(docLink).toBeVisible();
    await expect(docLink).toContainText(/documentation|api.*doc/i);
  });

  test('documentation link navigates correctly', async ({ page }) => {
    await page.goto('/console/integrations');
    await page.waitForLoadState('networkidle');

    await page.locator('main').locator('a[href="/console/documentation"]').click();
    await page.waitForURL('**/console/documentation');
    await expect(page.locator('main h1')).toContainText('API Documentation');
  });
});

test.describe('Active Integrations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/console/integrations');
    await page.waitForLoadState('networkidle');
  });

  test('shows Active Integrations header', async ({ page }) => {
    await expect(page.locator('main').getByText('Active Integrations')).toBeVisible();
  });

  test('shows Webhooks card with Active badge', async ({ page }) => {
    const webhookCard = page.locator('main').locator('a[href="/console/webhooks"]');
    await expect(webhookCard).toBeVisible();
    await expect(webhookCard).toContainText('Webhooks');
  });

  test('Webhooks card links to /console/webhooks', async ({ page }) => {
    await page.locator('main').locator('a[href="/console/webhooks"]').click();
    await page.waitForURL('**/console/webhooks');
    await expect(page.locator('main h1')).toContainText('Webhooks');
  });

  test('shows REST API card with Active badge', async ({ page }) => {
    await expect(page.locator('main').getByText('REST API')).toBeVisible();
    await expect(page.locator('main').getByText(/85\+.*endpoint/i)).toBeVisible();
  });

  test('Active badges are visible', async ({ page }) => {
    const activeBadges = page.locator('main').getByText('Active');
    const count = await activeBadges.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });
});

test.describe('Coming Soon Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/console/integrations');
    await page.waitForLoadState('networkidle');
  });

  test('shows Coming Soon header', async ({ page }) => {
    await expect(page.locator('main').getByText('Coming Soon').first()).toBeVisible();
  });

  test('shows Slack integration card', async ({ page }) => {
    await expect(page.locator('main').getByRole('heading', { name: 'Slack' })).toBeVisible();
  });

  test('shows Zapier integration card', async ({ page }) => {
    await expect(page.locator('main').getByRole('heading', { name: 'Zapier' })).toBeVisible();
  });

  test('shows GitHub integration card', async ({ page }) => {
    await expect(page.locator('main').getByRole('heading', { name: 'GitHub' })).toBeVisible();
  });

  test('coming soon cards have reduced opacity', async ({ page }) => {
    const comingSoonCard = page.locator('main').locator('.opacity-60').first();
    await expect(comingSoonCard).toBeVisible();
  });
});
