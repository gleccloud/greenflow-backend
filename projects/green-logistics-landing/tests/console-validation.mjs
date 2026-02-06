/**
 * Console Dashboard Validation with Playwright
 * Tests console URL and diagnoses API connection issues
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONSOLE_URL = 'http://greenflow-console.s3-website.us-east-1.localhost.localstack.cloud:4566';
const LANDING_URL = 'http://greenflow-landing.s3-website.us-east-1.localhost.localstack.cloud:4566';
const API_BASE_URL = 'http://localhost:3000/api/v2';

async function validateConsole() {
  console.log('🔍 Console Dashboard Validation Starting...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console logs
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push({ type: msg.type(), text });
    console.log(`[Browser ${msg.type()}] ${text}`);
  });

  // Capture network requests
  const networkRequests = [];
  page.on('request', request => {
    if (request.url().includes('console') || request.url().includes('metrics')) {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
      });
      console.log(`📡 Request: ${request.method()} ${request.url()}`);
    }
  });

  // Capture network responses
  page.on('response', response => {
    if (response.url().includes('console') || response.url().includes('metrics')) {
      console.log(`📥 Response: ${response.status()} ${response.url()}`);
    }
  });

  try {
    console.log('1️⃣ Testing Console URL...');
    console.log(`URL: ${CONSOLE_URL}\n`);

    // Navigate to console
    await page.goto(CONSOLE_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait a bit for React to render
    await page.waitForTimeout(3000);

    // Check window flags
    const windowFlags = await page.evaluate(() => {
      return {
        appType: (window as any).__APP_TYPE__,
        blockedRoutes: (window as any).__BLOCKED_ROUTES__,
        consoleMode: (window as any).__CONSOLE_MODE__,
      };
    });

    console.log('\n✅ Window Flags:', windowFlags);

    // Check current URL
    const currentUrl = page.url();
    console.log(`\n📍 Current URL: ${currentUrl}`);

    // Check if we see error message
    const errorElement = await page.$('text=Connection Error');
    if (errorElement) {
      console.log('\n❌ Connection Error Detected!');
      const errorText = await page.textContent('div.bg-red-50');
      console.log(`Error Message: ${errorText}`);
    }

    // Check if we see loading spinner
    const loadingElement = await page.$('text=Loading dashboard data');
    if (loadingElement) {
      console.log('\n⏳ Loading State Detected');
    }

    // Check if dashboard loaded successfully
    const dashboardTitle = await page.$('h1:has-text("Dashboard")');
    if (dashboardTitle) {
      console.log('\n✅ Dashboard Title Found!');

      // Check for metrics
      const metricsCards = await page.$$('div.bg-white.rounded-xl');
      console.log(`📊 Found ${metricsCards.length} metric cards`);
    }

    // Take screenshot
    const screenshotPath = join(__dirname, '../test-artifacts/console-debug.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`\n📸 Screenshot saved: ${screenshotPath}`);

    // Check API health
    console.log('\n2️⃣ Testing Backend API...');
    console.log(`API URL: ${API_BASE_URL}\n`);

    try {
      const apiResponse = await fetch(`${API_BASE_URL}/health`);
      console.log(`✅ API Health: ${apiResponse.status} ${apiResponse.statusText}`);
      const healthData = await apiResponse.json();
      console.log(`Health Data:`, healthData);
    } catch (apiError) {
      console.log(`❌ API Health Check Failed: ${apiError.message}`);
      console.log('\n🚨 Backend API is NOT running!');
      console.log('Please start the backend:');
      console.log('  cd projects/glec-api-backend');
      console.log('  npm run start:dev');
    }

    // Test console metrics endpoint
    console.log('\n3️⃣ Testing Console Metrics Endpoint...');
    try {
      const metricsResponse = await fetch(`${API_BASE_URL}/console/metrics/summary?period=DAY`);
      console.log(`Metrics API: ${metricsResponse.status} ${metricsResponse.statusText}`);
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        console.log('✅ Metrics Data:', metricsData);
      } else {
        console.log('❌ Metrics endpoint returned error');
      }
    } catch (metricsError) {
      console.log(`❌ Metrics API Failed: ${metricsError.message}`);
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📋 Validation Summary');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Console URL: ${errorElement ? '❌ Error' : '✅ Loaded'}`);
    console.log(`Window Flags: ${windowFlags.appType === 'console' ? '✅ Correct' : '❌ Wrong'}`);
    console.log(`Dashboard: ${dashboardTitle ? '✅ Rendered' : '❌ Not Rendered'}`);
    console.log(`Network Requests: ${networkRequests.length} total`);
    console.log('═══════════════════════════════════════════════════════\n');

    // Network requests summary
    if (networkRequests.length > 0) {
      console.log('📡 Network Requests Made:');
      networkRequests.forEach(req => {
        console.log(`  ${req.method} ${req.url}`);
      });
    }

    // Keep browser open for inspection
    console.log('\n⏸️  Browser kept open for inspection...');
    console.log('Press Ctrl+C to close\n');

    await new Promise(() => {}); // Keep alive

  } catch (error) {
    console.error('\n❌ Validation Failed:', error.message);
    await page.screenshot({
      path: join(__dirname, '../test-artifacts/console-error.png'),
      fullPage: true
    });
  }
}

validateConsole().catch(console.error);
