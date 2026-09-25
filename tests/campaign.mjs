import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const solutions = JSON.parse(await readFile('tests/solutions.json', 'utf8'));
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Users/Admin/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, recordVideo: { dir: 'test-results/campaign-video', size: { width: 1600, height: 900 } } });
const page = await context.newPage(), errors = [], results = [];
page.on('pageerror', error => errors.push(error.message));
const state = () => page.evaluate(() => window.__CATAPULT__.state());
try {
  await page.goto('http://127.0.0.1:5188');
  await page.locator('#home:not([hidden])').waitFor();
  await page.locator('#play').click();
  for (const solution of solutions) {
    assert.equal((await state()).level, solution.level);
    await page.mouse.move(232 + Math.cos(solution.angle) * solution.power * 29, 658 + Math.sin(solution.angle) * solution.power * 29);
    await page.mouse.down(); await page.waitForTimeout(120); await page.mouse.up();
    if (solution.boostAt) {
      await page.waitForFunction(x => { const s = window.__CATAPULT__.state(); return s.projectile?.x >= x || s.awake; }, solution.boostAt, { polling: 'raf', timeout: 12000 });
      await page.keyboard.press('Space');
    }
    await page.locator('#result-next').waitFor({ timeout: 20000 });
    const result = await state(); results.push(result); console.log(JSON.stringify(result));
    assert.equal(result.phase, 'won'); assert.equal(result.stars, 3);
    if ([1, 5, 7].includes(solution.level)) await page.screenshot({ path: `test-results/campaign-${solution.level + 1}.png` });
    if (solution.level < 7) await page.locator('#result-next').click();
  }
  await page.locator('#result-levels').click();
  assert.equal(await page.locator('.level-card .earned').count(), 24);
  await page.screenshot({ path: 'test-results/24-stars.png' });
  await page.locator('#level-0').click();
  for (let i = 0; i < 3; i++) {
    const x = 232 + Math.cos(-1.2) * 290, y = 658 + Math.sin(-1.2) * 290;
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.up();
    await page.waitForFunction(() => window.__CATAPULT__.state().phase !== 'flying', null, { timeout: 15000 });
  }
  await page.locator('.lost').waitFor();
  assert.equal((await state()).phase, 'lost');
  await page.screenshot({ path: 'test-results/09-loss.png' });
  await page.locator('#result-next').click();
  assert.equal((await state()).shots, 0);
  assert.deepEqual(errors, []);
  await writeFile('test-results/campaign-report.json', JSON.stringify({ passed: true, levels: results, lossAndRetry: true, errors }, null, 2));
} catch (error) { await page.screenshot({ path: 'test-results/campaign-failure.png' }); console.log('LAST STATE', await state(), errors); throw error; }
finally { await context.close(); await browser.close(); }
