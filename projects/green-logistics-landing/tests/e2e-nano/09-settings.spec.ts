/**
 * 09. Settings Page Nano-Level E2E Tests
 * - API Connection section (key input, save, reset)
 * - Security section (auth method, planned features)
 * - Notifications section (3 toggles)
 * - Display Preferences (timezone, date format)
 * - Danger Zone (reset console data)
 * - Context integration
 */

import { test, expect } from '@playwright/test';

test.describe('Settings Page Load', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/console/settings');
    await page.waitForLoadState('networkidle');
  });

  test('shows Settings title', async ({ page }) => {
    await expect(page.locator('main h1')).toContainText('Settings');
  });

  test('shows subtitle about account management', async ({ page }) => {
    await expect(page.locator('main').getByText(/account.*preference|manage/i).first()).toBeVisible();
  });
});

test.describe('API Connection Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/console/settings');
    await page.waitForLoadState('networkidle');
  });

  test('shows API Connection header', async ({ page }) => {
    await expect(page.locator('main').getByText('API Connection')).toBeVisible();
  });

  test('API Key input is visible', async ({ page }) => {
    const keyInput = page.locator('main').getByPlaceholder(/api key|enter.*key/i);
    await expect(keyInput).toBeVisible();
  });

  test('API Key input has monospace font', async ({ page }) => {
    const keyInput = page.locator('main').getByPlaceholder(/api key|enter.*key/i);
    await expect(keyInput).toHaveClass(/font-mono/);
  });

  test('API Key input accepts text', async ({ page }) => {
    const keyInput = page.locator('main').getByPlaceholder(/api key|enter.*key/i);
    await keyInput.clear();
    await keyInput.fill('test-new-api-key-12345');
    await expect(keyInput).toHaveValue('test-new-api-key-12345');
  });

  test('API Base URL input is read-only', async ({ page }) => {
    const baseUrlInput = page.locator('main').locator('input[readonly]');
    await expect(baseUrlInput).toBeVisible();
    await expect(baseUrlInput).toHaveAttribute('readonly', '');
  });

  test('API Base URL shows localhost:3000 default', async ({ page }) => {
    const baseUrlInput = page.locator('main').locator('input[readonly]');
    const value = await baseUrlInput.inputValue();
    expect(value).toContain('localhost:3000');
  });

  test('Save API Key button is visible', async ({ page }) => {
    const saveBtn = page.locator('main').getByRole('button', { name: /save.*api.*key/i });
    await expect(saveBtn).toBeVisible();
  });

  test('Save API Key saves to localStorage', async ({ page }) => {
    const keyInput = page.locator('main').getByPlaceholder(/api key|enter.*key/i);
    await keyInput.clear();
    await keyInput.fill('nano-test-key-999');

    const saveBtn = page.locator('main').getByRole('button', { name: /save.*api.*key/i });
    await saveBtn.click();

    // Verify localStorage
    const stored = await page.evaluate(() => localStorage.getItem('api_key'));
    expect(stored).toBe('nano-test-key-999');
  });

  test('Save button shows "Saved!" feedback', async ({ page }) => {
    const keyInput = page.locator('main').getByPlaceholder(/api key|enter.*key/i);
    await keyInput.clear();
    await keyInput.fill('test-key');

    // Use CSS locator instead of role so it doesn't re-query by button name
    const saveBtn = page.locator('main button.bg-emerald-600').first();
    await saveBtn.click();

    await expect(saveBtn).toContainText('Saved!');
    // After 2 seconds, reverts
    await page.waitForTimeout(2500);
    await expect(saveBtn).toContainText('Save API Key');
  });

  test('Reset to Default button is visible', async ({ page }) => {
    const resetBtn = page.locator('main').getByRole('button', { name: /reset.*default/i });
    await expect(resetBtn).toBeVisible();
  });

  test('Reset to Default restores demo key', async ({ page }) => {
    // First change the key
    const keyInput = page.locator('main').getByPlaceholder(/api key|enter.*key/i);
    await keyInput.clear();
    await keyInput.fill('custom-key');

    // Reset
    const resetBtn = page.locator('main').getByRole('button', { name: /reset.*default/i });
    await resetBtn.click();

    // Input should revert to demo key
    const value = await keyInput.inputValue();
    expect(value).toContain('550e8400'); // Demo key prefix
  });
});

test.describe('Security Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/console/settings');
    await page.waitForLoadState('networkidle');
  });

  test('shows Security header', async ({ page }) => {
    await expect(page.locator('main').getByText('Security').first()).toBeVisible();
  });

  test('shows Authentication Method as Active', async ({ page }) => {
    await expect(page.locator('main').getByText('Authentication Method')).toBeVisible();
    await expect(page.locator('main').getByText('X-API-Key')).toBeVisible();
    await expect(page.locator('main').getByText('Active')).toBeVisible();
  });

  test('shows Password Authentication as Planned', async ({ page }) => {
    await expect(page.locator('main').getByText('Password Authentication')).toBeVisible();
    const plannedBadges = page.locator('main').getByText('Planned');
    const count = await plannedBadges.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('shows Two-Factor Authentication as Planned', async ({ page }) => {
    await expect(page.locator('main').getByText('Two-Factor Authentication')).toBeVisible();
  });

  test('shows TOTP description', async ({ page }) => {
    await expect(page.locator('main').getByText(/TOTP/)).toBeVisible();
  });
});

test.describe('Notifications Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/console/settings');
    await page.waitForLoadState('networkidle');
  });

  test('shows Notifications header', async ({ page }) => {
    await expect(page.locator('main').getByText('Notifications').first()).toBeVisible();
  });

  test('has 3 notification checkboxes', async ({ page }) => {
    const checkboxes = page.locator('main').locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('High Error Rate Alerts checkbox', async ({ page }) => {
    await expect(page.locator('main').getByText('High Error Rate Alerts')).toBeVisible();
  });

  test('Quota Warnings checkbox', async ({ page }) => {
    await expect(page.locator('main').getByText('Quota Warnings')).toBeVisible();
  });

  test('API Key Expiration checkbox', async ({ page }) => {
    await expect(page.locator('main').getByText('API Key Expiration')).toBeVisible();
  });

  test('notification checkbox toggles on click', async ({ page }) => {
    const checkbox = page.locator('main').locator('input[type="checkbox"]').first();
    const wasChecked = await checkbox.isChecked();
    await checkbox.click();
    const isNowChecked = await checkbox.isChecked();
    expect(isNowChecked).toBe(!wasChecked);
  });

  test('multiple checkbox toggles work independently', async ({ page }) => {
    const checkboxes = page.locator('main').locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    for (let i = 0; i < Math.min(count, 3); i++) {
      const cb = checkboxes.nth(i);
      const before = await cb.isChecked();
      await cb.click();
      expect(await cb.isChecked()).toBe(!before);
    }
  });
});

test.describe('Display Preferences Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/console/settings');
    await page.waitForLoadState('networkidle');
  });

  test('shows Display Preferences header', async ({ page }) => {
    await expect(page.locator('main').getByText('Display Preferences')).toBeVisible();
  });

  test('Timezone dropdown is visible', async ({ page }) => {
    const tzSelect = page.locator('main').locator('select').first();
    await expect(tzSelect).toBeVisible();
  });

  test('Timezone has UTC option', async ({ page }) => {
    const tzSelect = page.locator('main').locator('select').first();
    const options = tzSelect.locator('option');
    const texts = await options.allTextContents();
    expect(texts.some(t => t.includes('UTC'))).toBeTruthy();
  });

  test('Timezone has Asia/Seoul option', async ({ page }) => {
    const tzSelect = page.locator('main').locator('select').first();
    const options = tzSelect.locator('option');
    const texts = await options.allTextContents();
    expect(texts.some(t => t.includes('Seoul'))).toBeTruthy();
  });

  test('changing timezone updates selection', async ({ page }) => {
    const tzSelect = page.locator('main').locator('select').first();
    await tzSelect.selectOption('Asia/Seoul');
    await expect(tzSelect).toHaveValue('Asia/Seoul');
  });

  test('Date Format dropdown is visible', async ({ page }) => {
    const selects = page.locator('main').locator('select');
    const count = await selects.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('Date Format has YYYY-MM-DD option', async ({ page }) => {
    const dateSelect = page.locator('main').locator('select').nth(1);
    const options = dateSelect.locator('option');
    const texts = await options.allTextContents();
    expect(texts.some(t => t.includes('YYYY-MM-DD') || t.includes('ISO'))).toBeTruthy();
  });

  test('changing date format updates selection', async ({ page }) => {
    const dateSelect = page.locator('main').locator('select').nth(1);
    await dateSelect.selectOption('DD/MM/YYYY');
    await expect(dateSelect).toHaveValue('DD/MM/YYYY');
  });
});

test.describe('Danger Zone Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/console/settings');
    await page.waitForLoadState('networkidle');
  });

  test('shows Danger Zone header', async ({ page }) => {
    await expect(page.locator('main').getByText('Danger Zone')).toBeVisible();
  });

  test('shows Reset Console Data label', async ({ page }) => {
    await expect(page.locator('main').getByText('Reset Console Data')).toBeVisible();
  });

  test('shows description about clearing data', async ({ page }) => {
    await expect(page.locator('main').getByText(/clear.*local.*settings|clear.*cached/i)).toBeVisible();
  });

  test('Reset button has red styling', async ({ page }) => {
    const resetBtn = page.locator('main').getByRole('button', { name: /^reset$/i });
    await expect(resetBtn).toBeVisible();
    await expect(resetBtn).toHaveClass(/text-red|border-red/);
  });

  test('Danger Zone section has red border', async ({ page }) => {
    const dangerSection = page.locator('main').locator('.border-red-200');
    await expect(dangerSection).toBeVisible();
  });

  test('Reset shows confirmation dialog', async ({ page }) => {
    // Override window.confirm to auto-cancel
    await page.evaluate(() => {
      window.confirm = () => false;
    });

    const resetBtn = page.locator('main').getByRole('button', { name: /^reset$/i });
    await resetBtn.click();
    // Page should still be on settings (dialog was cancelled)
    await expect(page.locator('main h1')).toContainText('Settings');
  });

  test('confirmed Reset clears localStorage', async ({ page }) => {
    // Set some data
    await page.evaluate(() => localStorage.setItem('test_data', 'value'));

    // Override confirm to auto-accept
    await page.evaluate(() => {
      window.confirm = () => true;
    });

    const resetBtn = page.locator('main').getByRole('button', { name: /^reset$/i });
    await resetBtn.click();

    // localStorage should be cleared
    const data = await page.evaluate(() => localStorage.getItem('test_data'));
    expect(data).toBeNull();
  });
});

test.describe('Settings Persistence', () => {
  test('saved API key persists across page navigation', async ({ page }) => {
    await page.goto('/console/settings');
    await page.waitForLoadState('networkidle');

    // Save a key
    const keyInput = page.locator('main').getByPlaceholder(/api key|enter.*key/i);
    await keyInput.clear();
    await keyInput.fill('persist-test-key');
    await page.locator('main').getByRole('button', { name: /save.*api.*key/i }).click();

    // Navigate away and back
    await page.goto('/console');
    await page.waitForLoadState('networkidle');
    await page.goto('/console/settings');
    await page.waitForLoadState('networkidle');

    // Key should still be there
    const value = await keyInput.inputValue();
    expect(value).toBe('persist-test-key');
  });
});
