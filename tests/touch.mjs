import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Users/Admin/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true });
const context = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
const page = await context.newPage();
try {
  await page.goto('http://127.0.0.1:5188'); await page.locator('#home:not([hidden])').waitFor(); await page.locator('#play').tap();
  const bounds = await page.locator('canvas').boundingBox();
  assert.ok(bounds);
  const angle = -40 * Math.PI / 180, power = 18.7;
  const x = bounds.x + (232 + Math.cos(angle) * power * 29) * bounds.width / 1600;
  const y = bounds.y + (658 + Math.sin(angle) * power * 29) * bounds.height / 900;
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await page.waitForTimeout(200);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForFunction(() => window.__CATAPULT__.state().projectile?.x >= 1010, null, { polling: 'raf' });
  await page.locator('#boost').tap();
  await page.locator('#result-next').waitFor({ timeout: 15000 });
  const state = await page.evaluate(() => window.__CATAPULT__.state());
  assert.equal(state.phase, 'won'); assert.equal(state.justTouch, true);
  await page.screenshot({ path: 'test-results/12-touch.png' });
  await writeFile('test-results/touch-report.json', JSON.stringify({ passed: true, viewport: { width: 844, height: 390 }, state }, null, 2));
  console.log('Touch aim, release and boost passed at 844x390.');
} finally { await context.close(); await browser.close(); }
