import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Users/Admin/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
try {
  await page.goto('http://127.0.0.1:5188'); await page.locator('#home:not([hidden])').waitFor(); await page.locator('#play').click();
  await page.waitForTimeout(1000);
  const start = await page.evaluate(() => ({ now: performance.now(), ...window.__CATAPULT__.state() }));
  await page.waitForTimeout(3000);
  const end = await page.evaluate(() => ({ now: performance.now(), ...window.__CATAPULT__.state() }));
  const result = { measuredRenderFps: (end.renderedFrames - start.renderedFrames) * 1000 / (end.now - start.now), context: '1600x900, Chromium headless, no video capture', sampleMs: end.now - start.now };
  console.log(JSON.stringify(result)); await writeFile('test-results/performance-report.json', JSON.stringify(result, null, 2));
} finally { await browser.close(); }
