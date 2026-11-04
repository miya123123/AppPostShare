"""完成動画と実際にダウンロードした3形式を独立に検証します。"""
from pathlib import Path
import hashlib
import io
import json
import math
import struct
import subprocess
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / 'output/playwright/intro'
VIDEO = ROOT / 'Recordings/紹介動画_浮遊島生成器.mp4'


def command(args):
    return subprocess.run(args, cwd=ROOT, capture_output=True, check=True)


capture = json.loads((WORK / 'capture.json').read_text())
assert capture['errors'] == []
assert {d['extension'] for d in capture['downloads']} == {'glb', 'json', 'png'}
downloads = {}
for entry in capture['downloads']:
    assert entry['failure'] is None
    p = ROOT / entry['file']
    b = p.read_bytes()
    assert len(b) > 0
    info = {'file': entry['file'], 'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest()}
    if entry['extension'] == 'glb':
        magic, version, length = struct.unpack('<4sII', b[:12])
        assert magic == b'glTF' and version == 2 and length == len(b)
        chunks = []
        offset = 12
        while offset < len(b):
            size, kind = struct.unpack('<I4s', b[offset:offset+8])
            assert size % 4 == 0 and offset + 8 + size <= len(b)
            chunks.append((kind, b[offset+8:offset+8+size]))
            offset += 8 + size
        assert offset == len(b) and chunks[0][0] == b'JSON' and chunks[1][0] == b'BIN\0'
        model = json.loads(chunks[0][1])
        assert model['asset']['version'] == '2.0'
        assert model['buffers'][0]['byteLength'] <= len(chunks[1][1])
        assert any('Temple' in n.get('name', '') for n in model['nodes'])
        assert len(model['materials']) > 0 and len(model['meshes']) > 0
        for view in model['bufferViews']:
            assert view.get('byteOffset', 0) + view['byteLength'] <= model['buffers'][view.get('buffer', 0)]['byteLength']
        info.update(meshes=len(model['meshes']), materials=len(model['materials']), temple=True)
    elif entry['extension'] == 'json':
        data = json.loads(b)
        assert data['schemaVersion'] == 2 and data['settings']['temples'] == 1
        assert len(data['islands']) == 3 and len(data['bridges']) == 2
        assert len(data['spawn']) == 3
        assert sum(i['temple'] is not None for i in data['islands']) == 1
        assert all(i['surface']['vertices'] and i['surface']['triangles'] for i in data['islands'])
        assert all(math.isfinite(c) for island in data['islands'] for vertex in island['surface']['vertices'] for c in vertex)
        info.update(schemaVersion=2, islands=3, bridges=2, temples=1, surface=True, spawn=True)
    else:
        with Image.open(p) as im:
            im.verify()
        with Image.open(p) as im:
            assert im.width > 0 and im.height > 0
            assert len(im.convert('RGB').getcolors(maxcolors=2) or []) != 1
            info.update(width=im.width, height=im.height, mode=im.mode)
    downloads[entry['extension']] = info

probe = json.loads(command(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(VIDEO)]).stdout)
assert len(probe['streams']) == 1
video = probe['streams'][0]
assert video['codec_type'] == 'video' and video['codec_name'] == 'h264'
assert (video['width'], video['height']) == (1920, 1080)
assert video['r_frame_rate'] == '30/1' and video['pix_fmt'] == 'yuv420p'
assert int(video['nb_frames']) == 2250
assert abs(float(probe['format']['duration']) - 75) < .04
video_bytes = VIDEO.read_bytes()
assert video_bytes.index(b'moov') < video_bytes.index(b'mdat')
decoded = command(['ffmpeg', '-v', 'error', '-i', str(VIDEO), '-map', '0:v:0', '-progress', 'pipe:1', '-f', 'null', '-'])
assert not decoded.stderr and b'frame=2250' in decoded.stdout and b'progress=end' in decoded.stdout

times = [1, 4, 6.6, 9, 10.6, 13, 14.6, 17, 18.6, 21.3, 23.7, 24.6, 27.3, 29.7,
         30.6, 32, 33.7, 34.6, 38, 41.7, 42.6, 45, 48.5, 52, 55, 57.7, 58.6, 61, 64,
         66, 68.5, 69.7, 70.6, 73, 74.9]
for group in range((len(times)+5)//6):
    sheet = Image.new('RGB', (1920, 1680), '#102631')
    draw = ImageDraw.Draw(sheet)
    for n, t in enumerate(times[group*6:(group+1)*6]):
        png = command(['ffmpeg', '-v', 'error', '-ss', str(t), '-i', str(VIDEO), '-frames:v', '1',
                       '-vf', 'scale=960:540', '-f', 'image2pipe', '-vcodec', 'png', '-']).stdout
        frame = Image.open(io.BytesIO(png)).convert('RGB')
        x, y = (n%2)*960, (n//2)*560
        sheet.paste(frame, (x, y+20))
        draw.text((x+10, y+3), f'{t:.1f}s', fill='white')
    sheet.save(WORK / f'review-{group+1:02}.png')

command(['ffmpeg', '-v', 'error', '-y', '-ss', '2', '-i', str(VIDEO), '-frames:v', '1',
         str(ROOT / 'Recordings/紹介動画_サムネイル.png')])
result = {
    'video': {'file': str(VIDEO.relative_to(ROOT)), 'bytes': VIDEO.stat().st_size,
              'sha256': hashlib.sha256(VIDEO.read_bytes()).hexdigest(), 'duration': 75,
              'width': 1920, 'height': 1080, 'fps': 30, 'frames': 2250, 'audioStreams': 0,
              'codec': 'h264', 'pixelFormat': 'yuv420p', 'faststart': True, 'fullDecode': 'passed'},
    'downloads': downloads, 'browserErrors': capture['errors'],
    'visualReview': {'framesPrepared': len(times), 'timestamps': times,
                     'status': '目視確認用フレームを準備済み。目視結果は visual-review.md を参照してください。'},
}
(PRODUCTION := ROOT / 'Post/紹介動画').joinpath('verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(result, ensure_ascii=False, indent=2))
