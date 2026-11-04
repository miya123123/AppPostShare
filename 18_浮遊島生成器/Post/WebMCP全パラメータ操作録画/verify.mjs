import { createHash } from 'node:crypto';
import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = process.cwd();
const capturePath = path.join(root, 'Post/WebMCP全パラメータ操作録画/calls.json');
const videoPath = path.join(root, 'Recordings/WebMCP全パラメータ操作_浮遊島生成器.mp4');
const verificationPath = path.join(root, 'Post/WebMCP全パラメータ操作録画/verification.json');
const capture = JSON.parse(await readFile(capturePath, 'utf8'));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const defaults = { seed: 'MIYA-SKY-001', biome: 'garden', islands: 3, radius: 5.5, depth: 5.8, roughness: 0.45, rockShape: 'spire', rockRoughness: 0.5, temples: 0, trees: 22, ruins: 1, waterfalls: 2, bridges: true };
const changes = [
  ['seed', 'WEBMCP-ALL-002'], ['biome', 'twilight'], ['islands', 4], ['radius', 6.5], ['depth', 7],
  ['roughness', 0.7], ['rockShape', 'rounded'], ['rockRoughness', 0.75], ['temples', 2], ['trees', 32],
  ['ruins', 2], ['waterfalls', 3], ['bridges', false],
];
assert(capture.browser?.version, 'Chrome version missing');
assert(capture.errors?.length === 0, `Browser errors: ${JSON.stringify(capture.errors)}`);
assert(capture.calls.length === changes.length + 2, `Expected ${changes.length + 2} WebMCP calls; got ${capture.calls.length}`);
assert(capture.calls[0].tool === 'read_floating_stage' && capture.calls.at(-1).tool === 'read_floating_stage', 'Initial and final reads are required');
const initial = capture.calls[0].result?.settings;
assert(initial && Object.keys(defaults).every(key => initial[key] === defaults[key]) && Object.keys(initial).length === Object.keys(defaults).length, 'Initial settings do not match the expected app defaults');
let expected = { ...defaults };
const parameters = [];
for (let i = 0; i < changes.length; i++) {
  const [key, value] = changes[i];
  const call = capture.calls[i + 1];
  assert(call.tool === 'configure_floating_stage', `Parameter ${key} is missing a configure call`);
  assert(Object.keys(call.input).length === 1 && call.input[key] === value, `Parameter ${key} was not changed independently`);
  assert(expected[key] !== value, `Parameter ${key} is unchanged from its initial value`);
  expected[key] = value;
  for (const [resultKey, resultValue] of Object.entries(expected)) {
    assert(call.result.settings[resultKey] === resultValue, `${key}: returned ${resultKey} does not match accumulated settings`);
  }
  parameters.push({ key, from: defaults[key], to: value, result: call.result.settings[key] });
}
const finalCall = capture.calls.at(-1);
for (const [key, value] of Object.entries(expected)) assert(finalCall.result.settings[key] === value, `Final read ${key} differs`);
assert(finalCall.result.stats.islands === expected.islands, 'Final island count differs');

const fileInfo = await stat(videoPath);
const probe = JSON.parse((await execFileAsync('ffprobe', ['-v', 'error', '-count_frames', '-show_entries', 'format=duration,size:stream=codec_type,codec_name,width,height,pix_fmt,avg_frame_rate,nb_read_frames', '-of', 'json', videoPath])).stdout);
const streams = probe.streams ?? [];
const stream = streams.find(candidate => candidate.codec_type === 'video');
const duration = Number(probe.format?.duration);
assert(fileInfo.size > 1_000_000, `Unexpectedly small video: ${fileInfo.size} bytes`);
assert(stream?.codec_name === 'h264', `Expected H.264; got ${stream?.codec_name}`);
assert(stream?.width === 1920 && stream?.height === 1080, `Unexpected resolution: ${stream?.width}x${stream?.height}`);
assert(stream?.pix_fmt === 'yuv420p' && stream?.avg_frame_rate === '30/1', 'Unexpected pixel format or frame rate');
assert(!streams.some(candidate => candidate.codec_type === 'audio'), 'Unexpected audio stream');
assert(duration >= 60 && duration <= 90, `Expected a 60–90 second video; got ${duration}s`);
await execFileAsync('ffmpeg', ['-v', 'error', '-i', videoPath, '-f', 'null', '-'], { maxBuffer: 10 * 1024 * 1024 });

const report = {
  status: 'passed',
  verifiedAt: new Date().toISOString(),
  chromeVersion: capture.browser.version,
  browserErrors: capture.errors.length,
  webmcpCalls: capture.calls.length,
  initialSettings: defaults,
  changedParameters: parameters,
  finalSettings: finalCall.result.settings,
  finalStats: finalCall.result.stats,
  video: {
    file: 'Recordings/WebMCP全パラメータ操作_浮遊島生成器.mp4',
    bytes: fileInfo.size,
    durationSeconds: Number(duration.toFixed(3)),
    width: stream.width,
    height: stream.height,
    frameRate: stream.avg_frame_rate,
    decodedFrames: Number(stream.nb_read_frames),
    codec: stream.codec_name,
    pixelFormat: stream.pix_fmt,
    audio: false,
    sha256: createHash('sha256').update(await readFile(videoPath)).digest('hex'),
    fullDecode: 'passed',
  },
};
await writeFile(verificationPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
