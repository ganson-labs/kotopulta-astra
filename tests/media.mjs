import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Users/Admin/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, recordVideo: { dir: 'test-results/showcase-raw', size: { width: 1600, height: 900 } } });
await context.addInitScript(() => {
  const Native = window.AudioContext;
  window.AudioContext = class CapturedAudioContext extends Native {
    constructor(...args) {
      super(...args);
      const ctx = this, sink = ctx.createMediaStreamDestination(), analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      const nativeConnect = AudioNode.prototype.connect;
      AudioNode.prototype.connect = function(...connectionArgs) {
        if (connectionArgs[0] === ctx.destination) { nativeConnect.call(this, sink); nativeConnect.call(this, analyser); }
        return nativeConnect.apply(this, connectionArgs);
      };
      const samples = new Float32Array(analyser.fftSize);
      window.__soundMeter = () => { analyser.getFloatTimeDomainData(samples); return { peak: Math.max(...samples.map(Math.abs)), rms: Math.sqrt(samples.reduce((sum, v) => sum + v * v, 0) / samples.length), state: ctx.state }; };
      const chunks = [], recorder = new MediaRecorder(sink.stream, { mimeType: 'audio/webm;codecs=opus' });
      recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      recorder.start(); window.__audioStartedAt = performance.now();
      window.__finishAudio = () => new Promise(resolve => {
        recorder.onstop = async () => {
          const buffer = new Uint8Array(await new Blob(chunks).arrayBuffer());
          let binary = ''; for (let i = 0; i < buffer.length; i++) binary += String.fromCharCode(buffer[i]);
          resolve(btoa(binary));
        }; recorder.stop();
      });
    }
  };
});
const page = await context.newPage();
try {
  await page.goto('http://127.0.0.1:5188');
  await page.locator('#home:not([hidden])').waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1000);
  await page.locator('#play').click();
  await page.waitForTimeout(800);
  const s0 = await page.evaluate(() => ({ frames: window.__CATAPULT__.state().renderedFrames, now: performance.now() }));
  await page.waitForTimeout(1500);
  const s1 = await page.evaluate(() => ({ frames: window.__CATAPULT__.state().renderedFrames, now: performance.now() }));
  const fps = (s1.frames - s0.frames) * 1000 / (s1.now - s0.now);
  const music = await page.evaluate(() => window.__soundMeter());
  console.log('PERFORMANCE', JSON.stringify({ measuredRenderFps: fps, music }));
  assert.ok(music.rms > 0.0001); assert.equal(music.state, 'running');
  const angle = -40 * Math.PI / 180, power = 18.7;
  await page.mouse.move(232 + Math.cos(angle) * power * 29, 658 + Math.sin(angle) * power * 29, { steps: 12 });
  await page.mouse.down(); await page.waitForTimeout(800); await page.mouse.up();
  await page.waitForFunction(() => window.__CATAPULT__.state().projectile?.x > 800);
  await page.keyboard.press('Escape');
  const before = await page.evaluate(() => window.__CATAPULT__.state().projectile);
  await page.waitForTimeout(450);
  const after = await page.evaluate(() => window.__CATAPULT__.state().projectile);
  assert.deepEqual(before, after, 'Physics advances during pause');
  await page.locator('#resume').click();
  await page.waitForFunction(() => window.__CATAPULT__.state().projectile?.x >= 1010, null, { polling: 'raf' });
  await page.keyboard.press('Space');
  await page.waitForTimeout(340);
  await page.screenshot({ path: 'test-results/10-action.png' });
  await page.locator('#result-next').waitFor();
  const result = await page.evaluate(() => window.__CATAPULT__.state());
  assert.equal(result.phase, 'won');
  await page.waitForTimeout(800);
  await page.keyboard.press('r');
  assert.equal((await page.evaluate(() => window.__CATAPULT__.state())).phase, 'won');
  await page.locator('#result-next').click();
  const a2 = -44 * Math.PI / 180, p2 = 17.5;
  await page.mouse.move(232 + Math.cos(a2) * p2 * 29, 658 + Math.sin(a2) * p2 * 29, { steps: 10 });
  await page.mouse.down(); await page.waitForTimeout(650); await page.mouse.up();
  await page.waitForFunction(() => window.__CATAPULT__.state().projectile?.x >= 1140, null, { polling: 'raf' });
  await page.keyboard.press('Space');
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'test-results/11-glass-action.png' });
  await page.locator('#result-next').waitFor();
  await page.waitForTimeout(1000);
  const audio = await page.evaluate(() => window.__finishAudio());
  await writeFile('test-results/game-audio.webm', Buffer.from(audio, 'base64'));
  await page.locator('#sound').click();
  await page.waitForTimeout(350);
  const muted = await page.evaluate(() => window.__soundMeter());
  assert.ok(muted.rms < 0.00001);
  await writeFile('test-results/media-report.json', JSON.stringify({ passed: true, measuredRenderFps: fps, music, muted, pauseFreezesPhysics: true, resultHotkeySafe: true }, null, 2));
  console.log(JSON.stringify({ fps, music, muted }));
} finally { await context.close(); await browser.close(); }
