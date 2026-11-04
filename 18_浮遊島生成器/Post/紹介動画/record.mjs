import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// npm install は不要です。既存のローカル Playwright を解決します。
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve('output/playwright/intro');
await mkdir(path.join(root, 'downloads'), { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const manifest = { url: 'http://127.0.0.1:8765', clips: {}, downloads: [], errors: [] };

async function capture(name, prepare, duration, act) {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1,
    recordVideo: { dir: root, size: { width: 1920, height: 1080 } }, acceptDownloads: true });
  const epoch = Date.now();
  const page = await context.newPage();
  // macOS Chrome の screencast は外枠の高さから87pxを除いた領域です。
  // 専用ウィンドウを広げ、1080pxのページ下端まで録画します。
  const cdp = await context.newCDPSession(page);
  const { windowId } = await cdp.send('Browser.getWindowForTarget');
  await cdp.send('Browser.setWindowBounds', { windowId, bounds: { width: 1920, height: 1167 } });
  page.on('pageerror', error => manifest.errors.push({ name, error: error.message }));
  await page.goto(manifest.url);
  await page.waitForFunction(() => document.querySelector('#loading').hidden && document.querySelector('#stat-islands').textContent !== '—');
  await prepare(page);
  await page.waitForTimeout(600);
  const start = (Date.now() - epoch) / 1000;
  await page.screenshot({ path: path.join(root, `${name}-start.png`) });
  const begin = Date.now();
  if (act) await act(page);
  await page.waitForTimeout(Math.max(0, duration * 1000 - (Date.now() - begin)));
  await page.screenshot({ path: path.join(root, `${name}-end.png`) });
  const video = page.video();
  await context.close();
  const file = await video.path();
  manifest.clips[name] = { file: path.relative(process.cwd(), file), start, duration };
  console.log(name, manifest.clips[name]);
}

try {
  for (const biome of ['garden', 'twilight', 'snow']) {
    await capture(biome, async page => {
      await page.locator(`button[data-biome="${biome}"]`).click();
      await page.locator('#expand-preview').click();
      await page.waitForTimeout(3600); // 生成通知を待ち、景観を読みやすくします。
    }, biome === 'garden' ? 14 : 5);
  }
  await capture('orbit', async page => {
    await page.locator('#temples').focus();
    await page.keyboard.press('ArrowRight');
    await page.locator('#expand-preview').click();
    await page.waitForTimeout(700);
  }, 9, async page => {
    await page.mouse.move(1000, 480);
    await page.mouse.down();
    await page.mouse.move(1210, 500, { steps: 45 });
    await page.mouse.up();
    await page.waitForTimeout(1600);
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(2600);
  });
  await capture('exports', async page => {
    // ブラウザの通常ズーム相当の縮小。生成ロジックは変更しません。
    await page.evaluate(() => { document.documentElement.style.zoom = '0.7'; });
    await page.locator('#temples').focus();
    await page.keyboard.press('ArrowRight');
    await page.locator('#export-glb').scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
  }, 11, async page => {
    for (const ext of ['glb', 'json', 'png']) {
      const downloadPromise = page.waitForEvent('download');
      await page.locator(`#export-${ext}`).click();
      const download = await downloadPromise;
      const file = path.join(root, 'downloads', download.suggestedFilename());
      await download.saveAs(file);
      manifest.downloads.push({ extension: ext, file: path.relative(process.cwd(), file), failure: await download.failure() });
      await page.waitForTimeout(2500);
    }
  });
} finally {
  await browser.close();
  await writeFile(path.join(root, 'capture.json'), JSON.stringify(manifest, null, 2) + '\n');
}
if (manifest.errors.length) throw new Error('ブラウザエラーを capture.json で確認してください。');
