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
const destination = path.join(root, 'Recordings/WebMCP全パラメータ操作_浮遊島生成器.mp4');
const output = await mkdtemp(path.join(os.tmpdir(), 'webmcp-all-parameters-'));
const manifestPath = path.join(root, 'Post/WebMCP全パラメータ操作録画/calls.json');
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
  const recordedResult = parsed?.settings ? { seed: parsed.seed, settings: parsed.settings, stats: parsed.stats } : parsed;
  callLog.calls.push({ elapsedSeconds: Number(((Date.now() - new Date(callLog.captureStartedAt).getTime()) / 1000).toFixed(2)), tool: name, input, durationMs: Date.now() - began, result: recordedResult });
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

const parameterLabel = { seed: 'シード', biome: '世界のスタイル', islands: '島の数', radius: '島の大きさ', depth: '岩の深さ', roughness: '地表の起伏', rockShape: '岩の形状', rockRoughness: '岩のゴツゴツ度', temples: '神殿の数', trees: '木の本数', ruins: '遺跡の数', waterfalls: '滝の本数', bridges: '橋の生成' };
const biomeLabel = { garden: '緑の群島', twilight: '夜の遺跡', snow: '雪の庭' };
function displayValue(key, value) {
  if (key === 'biome') return biomeLabel[value] ?? value;
  if (key === 'bridges') return value ? 'あり' : 'なし';
  if (key === 'roughness' || key === 'rockRoughness') return `${Math.round(value * 100)}%`;
  if (key === 'radius' || key === 'depth') return `${Number(value).toFixed(1)}m`;
  return String(value);
}
async function assertVisible(page, key, value, biome) {
  await page.waitForFunction(expected => {
    if (expected.key === 'biome') return Boolean(document.querySelector(`[data-biome="${expected.value}"].selected`));
    if (expected.key === 'bridges') return document.querySelector('#bridges').checked === expected.value;
    const selector = expected.key === 'seed' ? '#seed' : `#${expected.key}`;
    const field = document.querySelector(selector);
    if (!field) return false;
    if (expected.key === 'seed' || expected.key === 'rockShape') return field.value === String(expected.value);
    return Number(field.value) === expected.value;
  }, { key, value, biome });
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

  await caption(page, 'FLOATING ISLAND WORKSHOP  ·  WEBMCP', '全13パラメータをWebMCPで変更', 'シード、景観、地形、装飾まで、各項目をひとつずつ操作します。');
  const started = Date.now();
  await hold(page, 4, started);

  let segment = Date.now();
  await caption(page, 'START  ·  READ TOOL', '現在の全パラメータを取得', 'read_floating_stage  ·  変更前の設定と生成数を確認');
  const initial = await callTool(page, 'read_floating_stage', {});
  if (!initial?.settings || initial.stats?.islands !== initial.settings.islands) throw new Error('初期生成結果の取得に失敗しました');
  await caption(page, 'INITIAL SETTINGS', `初期状態：${biomeLabel[initial.settings.biome]}  ·  ${initial.stats.islands}島`, `シード ${initial.seed}  ·  13項目すべてを個別に変更します。`);
  await hold(page, 6, segment);

  const changes = [
    ['seed', 'WEBMCP-ALL-002'],
    ['biome', 'twilight'],
    ['islands', 4],
    ['radius', 6.5],
    ['depth', 7],
    ['roughness', 0.7],
    ['rockShape', 'rounded'],
    ['rockRoughness', 0.75],
    ['temples', 2],
    ['trees', 32],
    ['ruins', 2],
    ['waterfalls', 3],
    ['bridges', false],
  ];
  let current = initial.settings;
  for (let i = 0; i < changes.length; i++) {
    const [key, value] = changes[i];
    const previous = current[key];
    if (previous === value) throw new Error(`${key} は初期値から変わりません`);
    segment = Date.now();
    await caption(page, `PARAMETER ${String(i + 1).padStart(2, '0')} / 13  ·  WEBMCP`, `${parameterLabel[key]}を変更`, `${displayValue(key, previous)}  →  ${displayValue(key, value)}   ·   configure_floating_stage`);
    const configured = await callTool(page, 'configure_floating_stage', { [key]: value });
    if (configured?.settings?.[key] !== value) throw new Error(`${key} のWebMCP実行結果が一致しません`);
    current = configured.settings;
    await assertVisible(page, key, value, current.biome);
    await caption(page, `PARAMETER ${String(i + 1).padStart(2, '0')} / 13  ·  VERIFIED`, `${parameterLabel[key]}を反映しました`, `設定画面とWebMCP返却値を確認  ·  ${displayValue(key, value)}`);
    await hold(page, 4.1, segment);
  }

  segment = Date.now();
  await caption(page, 'FINAL  ·  READ TOOL', '変更後の全パラメータを取得', 'read_floating_stage  ·  最終状態をまとめて照合');
  const final = await callTool(page, 'read_floating_stage', {});
  for (const [key, value] of changes) if (final?.settings?.[key] !== value) throw new Error(`${key} の最終設定が一致しません`);
  await caption(page, 'COMPLETE  ·  13 / 13', '全パラメータの変更を確認', `夜の遺跡  ·  ${final.stats.islands}島 / 神殿${final.stats.temples} / 滝${final.stats.waterfalls} / 橋${final.stats.bridges ? 'あり' : 'なし'}`);
  await hold(page, 8, segment);
  await caption(page, 'WEBMCP  ·  END', '浮遊島生成器', 'WebMCPのツール呼び出しで、設定と生成結果を操作しました。');
  await page.waitForTimeout(4_000);

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
