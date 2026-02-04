import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const DASHBOARD_URL = 'http://127.0.0.1:18789/?token=test_secure_token_2026';
const TIMEOUT = 120000; // 2 minutes for AI responses
const outDir = path.resolve(process.cwd(), 'test-artifacts/openclaw-validation');
fs.mkdirSync(outDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');

// Test cases for validation
const testCases = [
  {
    name: 'reasoning-complex',
    prompt: '다음 수학 문제를 단계별로 풀어줘: 한 상자에 사과가 12개 들어있고, 5개 상자를 샀습니다. 사과의 30%를 친구에게 주었다면, 남은 사과는 몇 개인가요?',
    expectedKeywords: ['12', '5', '60', '30%', '18', '42'],
    category: 'reasoning',
    minResponseLength: 100,
  },
  {
    name: 'coding-python',
    prompt: 'Python으로 피보나치 수열을 재귀함수로 구현해줘. 코드만 간단하게.',
    expectedKeywords: ['def', 'fibonacci', 'return', 'if'],
    category: 'coding',
    minResponseLength: 50,
  },
  {
    name: 'reasoning-logic',
    prompt: '세 사람 A, B, C가 있습니다. A는 B보다 키가 크고, C는 A보다 키가 작습니다. 가장 키가 큰 사람은 누구인가요? 논리적으로 설명해줘.',
    expectedKeywords: ['A', 'B', 'C', '키', '크'],
    category: 'reasoning',
    minResponseLength: 50,
  },
  {
    name: 'korean-language',
    prompt: '오픈클로에 DeepSeek R1 14B를 연동한 이유를 한 문장으로 설명해줘.',
    expectedKeywords: ['DeepSeek', 'R1'],
    category: 'language',
    minResponseLength: 20,
  },
  {
    name: 'coding-function',
    prompt: 'JavaScript로 배열의 중복을 제거하는 함수를 작성해줘. 코드만.',
    expectedKeywords: ['function', 'Set', 'array'],
    category: 'coding',
    minResponseLength: 30,
  },
];

const results = {
  timestamp: new Date().toISOString(),
  totalTests: testCases.length,
  passed: 0,
  failed: 0,
  tests: [],
};

async function waitForResponse(page, timeout = TIMEOUT) {
  const startTime = Date.now();
  let lastMessageCount = 0;

  while (Date.now() - startTime < timeout) {
    await page.waitForTimeout(1000);

    const messages = await page.locator('.message, [class*="message"], [role="article"]').count();

    if (messages > lastMessageCount) {
      lastMessageCount = messages;
      // Wait a bit more to see if response is still being generated
      await page.waitForTimeout(2000);

      const newMessages = await page.locator('.message, [class*="message"], [role="article"]').count();
      if (newMessages === lastMessageCount) {
        // No new messages, response complete
        return true;
      }
      lastMessageCount = newMessages;
    }
  }

  return lastMessageCount > 0;
}

async function runTest(browser, testCase, index) {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  const testResult = {
    name: testCase.name,
    category: testCase.category,
    prompt: testCase.prompt,
    status: 'unknown',
    responseTime: 0,
    responseLength: 0,
    keywordsFound: [],
    keywordsMissing: [],
    response: '',
    error: null,
  };

  try {
    console.log(`\n[Test ${index + 1}/${testCases.length}] ${testCase.name}`);
    console.log(`  Category: ${testCase.category}`);
    console.log(`  Prompt: ${testCase.prompt.substring(0, 60)}...`);

    // Navigate to dashboard
    await page.goto(DASHBOARD_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Take initial screenshot
    await page.screenshot({
      path: path.join(outDir, `${stamp}_${index}_${testCase.name}_initial.png`),
      fullPage: true
    });

    // Find and fill chat input
    const inputSelectors = [
      'input[type="text"]',
      'textarea',
      '[contenteditable="true"]',
      '[placeholder*="메시지"]',
      '[placeholder*="message"]',
      '[placeholder*="입력"]',
    ];

    let input = null;
    for (const selector of inputSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible().catch(() => false)) {
        input = element;
        break;
      }
    }

    if (!input) {
      throw new Error('Chat input not found');
    }

    // Send message
    const startTime = Date.now();
    await input.fill(testCase.prompt);
    await page.waitForTimeout(500);

    // Try to find and click send button
    const sendButtonSelectors = [
      'button[type="submit"]',
      'button:has-text("전송")',
      'button:has-text("Send")',
      '[aria-label*="전송"]',
      '[aria-label*="send"]',
    ];

    let sent = false;
    for (const selector of sendButtonSelectors) {
      const button = page.locator(selector).first();
      if (await button.isVisible().catch(() => false)) {
        await button.click();
        sent = true;
        break;
      }
    }

    if (!sent) {
      // Try pressing Enter
      await input.press('Enter');
    }

    console.log('  Message sent, waiting for response...');

    // Wait for response
    const responseReceived = await waitForResponse(page);
    const responseTime = Date.now() - startTime;
    testResult.responseTime = responseTime;

    if (!responseReceived) {
      throw new Error('No response received within timeout');
    }

    console.log(`  Response received in ${(responseTime / 1000).toFixed(2)}s`);

    // Capture response
    await page.waitForTimeout(1000);
    const messages = page.locator('.message, [class*="message"], [role="article"]');
    const lastMessage = messages.last();
    const responseText = await lastMessage.textContent().catch(() => '');

    testResult.response = responseText;
    testResult.responseLength = responseText.length;

    console.log(`  Response length: ${responseText.length} characters`);
    console.log(`  First 100 chars: ${responseText.substring(0, 100)}...`);

    // Take response screenshot
    await page.screenshot({
      path: path.join(outDir, `${stamp}_${index}_${testCase.name}_response.png`),
      fullPage: true
    });

    // Validate response
    let allKeywordsFound = true;
    for (const keyword of testCase.expectedKeywords) {
      if (responseText.toLowerCase().includes(keyword.toLowerCase())) {
        testResult.keywordsFound.push(keyword);
      } else {
        testResult.keywordsMissing.push(keyword);
        allKeywordsFound = false;
      }
    }

    const lengthValid = responseText.length >= testCase.minResponseLength;
    const hasContent = responseText.trim().length > 0;

    if (hasContent && lengthValid && testResult.keywordsFound.length > 0) {
      testResult.status = 'passed';
      console.log(`  ✓ PASSED`);
      console.log(`    - Keywords found: ${testResult.keywordsFound.join(', ')}`);
      if (testResult.keywordsMissing.length > 0) {
        console.log(`    - Keywords missing: ${testResult.keywordsMissing.join(', ')} (not critical)`);
      }
    } else {
      testResult.status = 'failed';
      console.log(`  ✗ FAILED`);
      if (!hasContent) console.log('    - Empty response');
      if (!lengthValid) console.log(`    - Response too short (${responseText.length} < ${testCase.minResponseLength})`);
      if (testResult.keywordsFound.length === 0) console.log('    - No expected keywords found');
    }

  } catch (error) {
    testResult.status = 'failed';
    testResult.error = error.message;
    console.log(`  ✗ FAILED: ${error.message}`);
  } finally {
    await context.close();
  }

  return testResult;
}

// Main execution
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   OpenClaw DeepSeek R1 14B Validation Suite               ║');
console.log('║   나노 단위 검증 테스트                                     ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const browser = await chromium.launch({ headless: true });

// Run tests sequentially
for (let i = 0; i < testCases.length; i++) {
  const result = await runTest(browser, testCases[i], i);
  results.tests.push(result);

  if (result.status === 'passed') {
    results.passed++;
  } else {
    results.failed++;
  }

  // Small delay between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
}

await browser.close();

// Generate report
console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║                     TEST SUMMARY                           ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log(`Total Tests:     ${results.totalTests}`);
console.log(`Passed:          ${results.passed} ✓`);
console.log(`Failed:          ${results.failed} ✗`);
console.log(`Success Rate:    ${((results.passed / results.totalTests) * 100).toFixed(1)}%\n`);

// Category breakdown
const categories = {};
results.tests.forEach(test => {
  if (!categories[test.category]) {
    categories[test.category] = { passed: 0, failed: 0 };
  }
  if (test.status === 'passed') {
    categories[test.category].passed++;
  } else {
    categories[test.category].failed++;
  }
});

console.log('Category Breakdown:');
Object.keys(categories).forEach(category => {
  const cat = categories[category];
  const total = cat.passed + cat.failed;
  console.log(`  ${category}: ${cat.passed}/${total} passed (${((cat.passed/total)*100).toFixed(0)}%)`);
});

// Performance metrics
const avgResponseTime = results.tests.reduce((sum, t) => sum + t.responseTime, 0) / results.tests.length;
const avgResponseLength = results.tests.reduce((sum, t) => sum + t.responseLength, 0) / results.tests.length;

console.log('\nPerformance Metrics:');
console.log(`  Avg Response Time:   ${(avgResponseTime / 1000).toFixed(2)}s`);
console.log(`  Avg Response Length: ${avgResponseLength.toFixed(0)} chars`);

// Save JSON report
const reportPath = path.join(outDir, `${stamp}_report.json`);
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
console.log(`\nDetailed report saved: ${reportPath}`);

// Save markdown report
const mdReport = `# OpenClaw DeepSeek R1 14B Validation Report

**Timestamp:** ${results.timestamp}

## Summary

- **Total Tests:** ${results.totalTests}
- **Passed:** ${results.passed} ✓
- **Failed:** ${results.failed} ✗
- **Success Rate:** ${((results.passed / results.totalTests) * 100).toFixed(1)}%

## Performance Metrics

- **Average Response Time:** ${(avgResponseTime / 1000).toFixed(2)}s
- **Average Response Length:** ${avgResponseLength.toFixed(0)} characters

## Test Results

${results.tests.map((test, i) => `
### ${i + 1}. ${test.name} (${test.category})

- **Status:** ${test.status === 'passed' ? '✓ PASSED' : '✗ FAILED'}
- **Prompt:** ${test.prompt}
- **Response Time:** ${(test.responseTime / 1000).toFixed(2)}s
- **Response Length:** ${test.responseLength} characters
- **Keywords Found:** ${test.keywordsFound.join(', ') || 'None'}
- **Keywords Missing:** ${test.keywordsMissing.join(', ') || 'None'}
${test.error ? `- **Error:** ${test.error}` : ''}

**Response Preview:**
\`\`\`
${test.response.substring(0, 500)}${test.response.length > 500 ? '...' : ''}
\`\`\`
`).join('\n')}

## Category Breakdown

${Object.keys(categories).map(cat => {
  const c = categories[cat];
  const total = c.passed + c.failed;
  return `- **${cat}:** ${c.passed}/${total} passed (${((c.passed/total)*100).toFixed(0)}%)`;
}).join('\n')}

---
Generated by OpenClaw Validation Suite
`;

const mdReportPath = path.join(outDir, `${stamp}_report.md`);
fs.writeFileSync(mdReportPath, mdReport);
console.log(`Markdown report saved: ${mdReportPath}`);

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║                  VALIDATION COMPLETE                       ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

process.exit(results.failed > 0 ? 1 : 0);
