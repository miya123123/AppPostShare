import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve('playwright', { paths: [process.cwd(), '/Users/miya/program/node_modules'] }));
const execFileAsync = promisify(execFile);
const root = process.cwd();
const source = path.join(root, 'src/floating-island-workshop/dist');
const destination = path.join(root, 'Recordings/WebMCP操作_浮遊島生成器.mp4');
const output = await mkdtemp(path.join(os.tmpdir(), 'webmcp-island-capture-'));
const manifestPath = path.join(root, 'Post/WebMCP操作録画/calls.json');
const callLog = { captureStartedAt: null, browser: null, video: null, calls: [], errors: [] };
const contentTypes = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.wasm': 'application/wasm' };

let browser;
let context;
let server;

function parseResult(value) {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return value; }
}

async function callTool(page, name, input) {
  const began = Date.now();
  const result = await page.evaluate(async ({ name, input }) => {
    const modelContext = document.modelContext;
    if (!modelContext) throw new Error('document.modelContext がありません');
    const tools = await modelContext.getTools();
    const tool = tools.find(candidate => candidate.name === name);
    if (!tool) throw new Error(`WebMCPツール ${name} が見つかりません`);
    // Chrome 154 では文字列JSONが必要です。Chrome 155 で非推奨とされる形式もこの録画環境では実機確認済みです。
    return modelContext.executeTool(tool, JSON.stringify(input));
  }, { name, input });
  const parsed = parseResult(result);
  callLog.calls.push({ elapsedSeconds: Number(((Date.now() - new Date(callLog.captureStartedAt).getTime()) / 1000).toFixed(2)), tool: name, input, durationMs: Date.now() - began, result: parsed });
  return parsed;
}

function addOverlay(page) {
  return page.evaluate(() => {
    const host = document.createElement('section');
    host.id = 'webmcp-recording-overlay';
    host.setAttribute('aria-label', 'WebMCP操作の録画表示');
    host.style.cssText = 'position:fixed;z-index:2147483647;left:50%;bottom:18px;transform:translateX(-50%);width:min(900px,calc(100vw - 48px));box-sizing:border-box;padding:16px 24px;border:1px solid rgba(128,222,189,.55);border-radius:15px;background:rgba(12,29,39,.93);color:#f3f7f7;box-shadow:0 12px 38px rgba(0,0,0,.32);font:500 17px/1.45 -apple-system,BlinkMacSystemFont,"Hiragino Sans",sans-serif;pointer-events:none;text-align:left;backdrop-filter:blur(12px)';
    host.innerHTML = '<div id="webmcp-recording-step" style="font-size:12px;letter-spacing:.13em;color:#80debd;font-weight:700;margin-bottom:5px"></div><div id="webmcp-recording-title" style="font-size:22px;font-weight:700"></div><div id="webmcp-recording-detail" style="font-size:15px;color:#cfdddd;margin-top:4px"></div>';
    document.body.appendChild(host);
    return true;
  });
}

async function caption(page, step, title, detail) {
  await page.evaluate(({ step, title, detail }) => {
    document.querySelector('#webmcp-recording-step').textContent = step;
    document.querySelector('#webmcp-recording-title').textContent = title;
    document.querySelector('#webmcp-recording-detail').textContent = detail;
  }, { step, title, detail });
}

async function hold(page, seconds, began = Date.now()) {
  const remaining = seconds * 1000 - (Date.now() - began);
  if (remaining > 0) await page.waitForTimeout(remaining);
}

async function configureAndCheck(page, biome, settings) {
  const configured = await callTool(page, 'configure_floating_stage', settings);
  const observed = await callTool(page, 'read_floating_stage', {});
  if (!observed?.settings || observed.settings.biome !== biome) throw new Error(`${biome} の生成結果を確認できませんでした`);
  for (const [key, value] of Object.entries(settings)) {
    if (observed.settings[key] !== value) throw new Error(`${key} の反映値が異なります: ${observed.settings[key]} !== ${value}`);
  }
  await page.waitForFunction(expected => {
    const selected = document.querySelector(`[data-biome="${expected.biome}"].selected`);
    return Boolean(selected) && document.querySelector('#seed').value === expected.seed && Number(document.querySelector('#stat-islands').textContent) === expected.islands;
  }, settings);
  if (configured?.settings && configured.settings.biome !== biome) throw new Error(`${biome} の設定ツール結果が一致しません`);
  return observed;
}

try {
  server = createServer(async (request, response) => {
    try {
      const requested = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
      const file = path.resolve(source, `.${requested === '/' ? '/index.html' : requested}`);
      if (!file.startsWith(`${source}${path.sep}`)) { response.writeHead(403).end(); return; }
      const info = await stat(file);
      if (!info.isFile()) { response.writeHead(404).end(); return; }
      response.setHeader('Content-Type', contentTypes[path.extname(file)] ?? 'application/octet-stream');
      response.setHeader('Cache-Control', 'no-store');
      response.writeHead(200);
      await pipeline(createReadStream(file), response);
    } catch {
      if (!response.headersSent) response.writeHead(404).end();
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--enable-blink-features=WebMCP,WebMCPTesting', '--disable-renderer-backgrounding'] });
  callLog.browser = { version: browser.version(), origin: `http://127.0.0.1:${server.address().port}` };
  context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, recordVideo: { dir: output, size: { width: 1920, height: 1080 } } });
  callLog.captureStartedAt = new Date().toISOString();
  const page = await context.newPage();
  page.on('pageerror', error => callLog.errors.push({ type: 'pageerror', message: error.message }));
  page.on('console', message => { if (message.type() === 'error') callLog.errors.push({ type: 'console', message: message.text() }); });
  page.on('requestfailed', request => callLog.errors.push({ type: 'requestfailed', url: request.url(), failure: request.failure()?.errorText }));
  await page.goto(callLog.browser.origin, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('#loading').hidden && document.querySelector('#stat-islands').textContent !== '—', null, { timeout: 45000 });
  await addOverlay(page);

  await caption(page, 'FLOATING ISLAND WORKSHOP  ·  WEBMCP', 'WebMCPで浮遊島を操作', 'ブラウザに登録されたツールを使って、設定と生成結果を変更します。');
  const started = Date.now();
  await hold(page, 4, started);

  let segment = Date.now();
  await caption(page, '01 / 05  ·  READ TOOL', '現在の生成結果を取得', 'read_floating_stage  ·  登録ツールと初期設定を確認');
  const initial = await callTool(page, 'read_floating_stage', {});
  if (!initial?.settings || initial.stats?.islands !== initial.settings.islands) throw new Error('初期生成結果の取得に失敗しました');
  await caption(page, '01 / 05  ·  RESULT', `初期状態：${initial.settings.biome}  ·  ${initial.stats.islands}島`, `シード ${initial.seed}  ·  橋 ${initial.stats.bridges}本  ·  ${initial.stats.triangles.toLocaleString('ja-JP')} triangles`);
  await hold(page, 9, segment);

  const scenes = [
    { label: '緑の群島', biome: 'garden', settings: { seed: 'WEBMCP-DEMO-001', biome: 'garden', islands: 5, radius: 5.8, depth: 5.8, roughness: 0.45, rockShape: 'jagged', rockRoughness: 0.65, temples: 1, trees: 28, ruins: 1, waterfalls: 3, bridges: true } },
    { label: '夜の遺跡', biome: 'twilight', settings: { seed: 'WEBMCP-DEMO-001', biome: 'twilight', islands: 3, radius: 5.2, depth: 6.2, roughness: 0.6, rockShape: 'plateau', rockRoughness: 0.45, temples: 2, trees: 14, ruins: 2, waterfalls: 1, bridges: false } },
    { label: '雪の庭', biome: 'snow', settings: { seed: 'WEBMCP-DEMO-001', biome: 'snow', islands: 4, radius: 6, depth: 5.8, roughness: 0.35, rockShape: 'rounded', rockRoughness: 0.55, temples: 1, trees: 10, ruins: 1, waterfalls: 2, bridges: true } },
  ];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    segment = Date.now();
    await caption(page, `0${i + 2} / 05  ·  CONFIGURE TOOL`, `${scene.label}を設定して生成`, `configure_floating_stage  ·  ${scene.settings.islands}島 / ${scene.settings.rockShape} / 神殿${scene.settings.temples} / 滝${scene.settings.waterfalls} / 橋${scene.settings.bridges ? 'あり' : 'なし'}`);
    const observed = await configureAndCheck(page, scene.biome, scene.settings);
    await caption(page, `0${i + 2} / 05  ·  VERIFIED`, `${scene.label}を生成しました`, `WebMCPで設定変更と結果取得を確認  ·  ${observed.stats.islands}島 / ${observed.stats.bridges}橋 / ${observed.stats.temples}神殿`);
    await hold(page, 15, segment);
  }

  segment = Date.now();
  await caption(page, '05 / 05  ·  READ TOOL', '最終の生成結果を取得', 'read_floating_stage  ·  現在の設定と生成数をもう一度確認');
  const final = await callTool(page, 'read_floating_stage', {});
  if (final?.settings?.biome !== 'snow' || final.stats?.islands !== 4) throw new Error('最終状態が期待した雪の庭と一致しません');
  await caption(page, '05 / 05  ·  COMPLETE', 'WebMCP操作を完了', `最終状態：雪の庭  ·  ${final.stats.islands}島 / ${final.stats.bridges}橋  ·  全${callLog.calls.length}回の呼び出しを記録`);
  await hold(page, 10, segment);
  await caption(page, 'WEBMCP  ·  END', '浮遊島生成器', 'WebMCPのツール呼び出しで、設定と生成結果を操作しました。');
  await page.waitForTimeout(5_000);

  callLog.captureFinishedAt = new Date().toISOString();
  callLog.video = { expectedResolution: '1920x1080', frameRate: 30, audio: false, temporaryCaptureFilesRemoved: true, sourceUrl: callLog.browser.origin, result: destination, toolCalls: callLog.calls.length };
  const video = page.video();
  await context.close();
  context = null;
  const rawVideo = await video.path();
  await execFileAsync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', rawVideo, '-an', '-vf', 'scale=1920:1080:flags=lanczos,setsar=1,fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-movflags', '+faststart', destination], { cwd: root });
  await rm(output, { recursive: true, force: true });
  callLog.video.fileBytes = (await stat(destination)).size;
  const manifest = { ...callLog, captureDurationSeconds: Number(((new Date(callLog.captureFinishedAt).getTime() - new Date(callLog.captureStartedAt).getTime()) / 1000).toFixed(2)) };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({ status: 'recorded', browser: callLog.browser, calls: callLog.calls.map(({ tool, input }) => ({ tool, input })), errors: callLog.errors, video: manifest.video, durationSeconds: manifest.captureDurationSeconds }, null, 2));
} finally {
  if (context) await context.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
  if (server?.listening) await new Promise(resolve => server.close(resolve));
  await rm(output, { recursive: true, force: true });
}
