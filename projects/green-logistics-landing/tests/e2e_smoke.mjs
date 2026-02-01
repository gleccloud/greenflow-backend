import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const base = process.env.BASE_URL || 'http://localhost:5174';
const outDir = path.resolve(process.cwd(), 'test-artifacts');
fs.mkdirSync(outDir, { recursive: true });

const routes = [
  { name: 'gate', url: `${base}/` },
  { name: 'shipper', url: `${base}/shipper` },
  { name: 'carrier', url: `${base}/carrier` },
  { name: 'owner', url: `${base}/owner` },
];

const stamp = new Date().toISOString().replace(/[:.]/g, '-');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });

for (const r of routes) {
  await page.goto(r.url, { waitUntil: 'networkidle' });
  // basic sanity: page has an h1
  const h1 = await page.locator('h1').first().innerText().catch(() => '');
  if (!h1) {
    throw new Error(`[${r.name}] Missing <h1> on ${r.url}`);
  }
  const file = path.join(outDir, `${stamp}__${r.name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  // eslint-disable-next-line no-console
  console.log(`[OK] ${r.name} → ${file} (h1=${JSON.stringify(h1.slice(0, 80))})`);
}

await browser.close();
