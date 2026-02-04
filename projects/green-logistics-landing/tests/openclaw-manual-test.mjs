import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

// 실제 사용자 제공 대시보드 URL
const DASHBOARD_URL = 'http://127.0.0.1:18789/chat?session=agent%3Acoder%3Acron%3A13b1364d-e8c3-4a07-a4a5-937bb66d613c';
const TIMEOUT = 120000;
const outDir = path.resolve(process.cwd(), 'test-artifacts/manual-validation');
fs.mkdirSync(outDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║   OpenClaw DeepSeek R1 14B Manual Validation                  ║');
console.log('║   실제 대시보드 URL 기반 나노 단위 검증                        ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

const testCases = [
  {
    name: 'reasoning-math',
    prompt: '12 × 5 = 60개의 사과. 30%는 18개. 60 - 18 = 42개가 정답입니다. 이 계산이 맞나요?',
    expectedKeywords: ['맞', '42', '정답'],
    minLength: 10,
  },
  {
    name: 'coding-simple',
    prompt: 'def fib(n): return n if n<=1 else fib(n-1)+fib(n-2) 이 코드 설명해줘',
    expectedKeywords: ['피보나치', 'fibonacci', '재귀'],
    minLength: 20,
  },
  {
    name: 'korean-simple',
    prompt: '안녕하세요. 간단한 인사 부탁해요.',
    expectedKeywords: ['안녕', '반갑'],
    minLength: 5,
  },
];

const browser = await chromium.launch({ headless: false }); // Show browser for debugging
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await context.newPage();

const results = {
  timestamp: new Date().toISOString(),
  dashboardUrl: DASHBOARD_URL,
  tests: [],
};

try {
  console.log('Navigating to dashboard...');
  await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Take initial screenshot
  const initialScreenshot = path.join(outDir, `${stamp}_initial.png`);
  await page.screenshot({ path: initialScreenshot, fullPage: true });
  console.log(`Initial screenshot saved: ${initialScreenshot}\n`);

  for (const [index, testCase] of testCases.entries()) {
    console.log(`[Test ${index + 1}/${testCases.length}] ${testCase.name}`);
    console.log(`  Prompt: ${testCase.prompt}`);

    const testResult = {
      name: testCase.name,
      prompt: testCase.prompt,
      status: 'unknown',
      responseTime: 0,
      response: '',
      keywordsFound: [],
      error: null,
    };

    try {
      // Wait for page to be ready
      await page.waitForTimeout(2000);

      // Find textarea or input
      const textarea = page.locator('textarea, input[type="text"], [contenteditable="true"]').first();
      const textareaVisible = await textarea.isVisible().catch(() => false);

      if (!textareaVisible) {
        throw new Error('Textarea not found or not visible');
      }

      // Clear and type message
      await textarea.click();
      await textarea.fill('');
      await page.waitForTimeout(500);
      await textarea.fill(testCase.prompt);
      await page.waitForTimeout(1000);

      // Take pre-send screenshot
      const preSendScreenshot = path.join(outDir, `${stamp}_${index}_${testCase.name}_presend.png`);
      await page.screenshot({ path: preSendScreenshot, fullPage: true });

      // Send message (try Enter first)
      const startTime = Date.now();
      await textarea.press('Enter');
      console.log('  Message sent, waiting for response...');

      // Wait for response with better logic
      let responseDetected = false;
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds

      while (!responseDetected && attempts < maxAttempts) {
        await page.waitForTimeout(1000);
        attempts++;

        // Look for any new message elements
        const messages = await page.locator('[role="article"], .message, [data-message]').count();

        if (messages > 0) {
          // Wait a bit more for the response to complete
          await page.waitForTimeout(3000);
          responseDetected = true;
        }

        if (attempts % 5 === 0) {
          console.log(`    Waiting... (${attempts}s)`);
        }
      }

      const responseTime = Date.now() - startTime;
      testResult.responseTime = responseTime;

      if (!responseDetected) {
        throw new Error('No response detected within timeout');
      }

      console.log(`  Response received in ${(responseTime / 1000).toFixed(2)}s`);

      // Capture response
      await page.waitForTimeout(2000);
      const responseScreenshot = path.join(outDir, `${stamp}_${index}_${testCase.name}_response.png`);
      await page.screenshot({ path: responseScreenshot, fullPage: true });

      // Get all text from the page
      const pageText = await page.textContent('body');
      testResult.response = pageText;

      // Check keywords
      testCase.expectedKeywords.forEach(keyword => {
        if (pageText.toLowerCase().includes(keyword.toLowerCase())) {
          testResult.keywordsFound.push(keyword);
        }
      });

      // Validation
      if (testResult.response.length >= testCase.minLength && testResult.keywordsFound.length > 0) {
        testResult.status = 'passed';
        console.log(`  ✓ PASSED - Found keywords: ${testResult.keywordsFound.join(', ')}`);
      } else {
        testResult.status = 'failed';
        console.log(`  ✗ FAILED - Response too short or missing keywords`);
      }

    } catch (error) {
      testResult.status = 'failed';
      testResult.error = error.message;
      console.log(`  ✗ FAILED: ${error.message}`);
    }

    results.tests.push(testResult);

    // Delay between tests
    if (index < testCases.length - 1) {
      console.log('  Waiting 5s before next test...\n');
      await page.waitForTimeout(5000);
    }
  }

} catch (error) {
  console.error('Test suite failed:', error);
} finally {
  // Save results
  const reportPath = path.join(outDir, `${stamp}_report.json`);
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

  const passed = results.tests.filter(t => t.status === 'passed').length;
  const failed = results.tests.filter(t => t.status === 'failed').length;

  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                        SUMMARY                                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(`\nTotal Tests:     ${results.tests.length}`);
  console.log(`Passed:          ${passed} ✓`);
  console.log(`Failed:          ${failed} ✗`);
  console.log(`Success Rate:    ${((passed / results.tests.length) * 100).toFixed(1)}%`);
  console.log(`\nReport saved:    ${reportPath}\n`);

  await browser.close();
  process.exit(failed);
}
