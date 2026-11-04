import { createHash } from 'node:crypto';
import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = process.cwd();
const capturePath = path.join(root, 'Post/WebMCP操作録画/calls.json');
const videoPath = path.join(root, 'Recordings/WebMCP操作_浮遊島生成器.mp4');
const verificationPath = path.join(root, 'Post/WebMCP操作録画/verification.json');
const capture = JSON.parse(await readFile(capturePath, 'utf8'));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(capture.browser?.version, 'Chrome version missing');
assert(capture.errors?.length === 0, `Browser errors: ${JSON.stringify(capture.errors)}`);
assert(capture.calls.length === 8, `Expected eight WebMCP calls; got ${capture.calls.length}`);
assert(capture.calls[0].tool === 'read_floating_stage' && capture.calls[7].tool === 'read_floating_stage', 'Initial and final reads are required');

const expected = [
  { biome: 'garden', islands: 5, rockShape: 'jagged', temples: 1, waterfalls: 3, bridges: true },
  { biome: 'twilight', islands: 3, rockShape: 'plateau', temples: 2, waterfalls: 1, bridges: false },
  { biome: 'snow', islands: 4, rockShape: 'rounded', temples: 1, waterfalls: 2, bridges: true },
];
const states = [];
for (let i = 0; i < expected.length; i++) {
  const configure = capture.calls[1 + i * 2];
  const read = capture.calls[2 + i * 2];
  const want = expected[i];
  assert(configure.tool === 'configure_floating_stage', `Scene ${i + 1} is missing a configure call`);
  assert(read.tool === 'read_floating_stage', `Scene ${i + 1} is missing a follow-up read`);
  for (const [key, value] of Object.entries(want)) {
    assert(configure.input[key] === value, `Scene ${i + 1}: configure input ${key} differs`);
    assert(read.result.settings[key] === value, `Scene ${i + 1}: returned setting ${key} differs`);
  }
  assert(read.result.stats.islands === want.islands, `Scene ${i + 1}: island count differs`);
  states.push({ biome: want.biome, settings: read.result.settings, stats: read.result.stats });
}
assert(capture.calls[7].result.settings.biome === 'snow' && capture.calls[7].result.stats.islands === 4, 'Final read does not match the snow scene');

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

const hash = createHash('sha256').update(await readFile(videoPath)).digest('hex');
const report = {
  status: 'passed',
  verifiedAt: new Date().toISOString(),
  chromeVersion: capture.browser.version,
  browserErrors: capture.errors.length,
  webmcpCalls: capture.calls.length,
  scenes: states,
  video: {
    file: 'Recordings/WebMCP操作_浮遊島生成器.mp4',
    bytes: fileInfo.size,
    durationSeconds: Number(duration.toFixed(3)),
    width: stream.width,
    height: stream.height,
    frameRate: stream.avg_frame_rate,
    decodedFrames: Number(stream.nb_read_frames),
    codec: stream.codec_name,
    pixelFormat: stream.pix_fmt,
    audio: false,
    sha256: hash,
    fullDecode: 'passed',
  },
};
await writeFile(verificationPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
