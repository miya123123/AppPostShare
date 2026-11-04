"""既存録画と追加撮影を75秒の字幕付き紹介動画に編集します。"""
from pathlib import Path
import json
import subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / 'output/playwright/intro'
PRODUCTION = ROOT / 'Post/紹介動画'
DEST = ROOT / 'Recordings/紹介動画_浮遊島生成器.mp4'
CAPTURE = json.loads((WORK / 'capture.json').read_text())
BG = '0x102631'


def run(args):
    subprocess.run(args, cwd=ROOT, check=True)


def encode(index, file, start, duration, crop=None):
    dest = WORK / f'cut-{index:02}.mp4'
    filters = ['setpts=PTS-STARTPTS'] + ([] if crop is None else [crop]) + [
        'scale=1920:936:force_original_aspect_ratio=decrease:force_divisible_by=2',
        f'pad=1920:1080:(ow-iw)/2:0:color={BG}',
        'setsar=1', 'fps=30:start_time=0', 'tpad=stop_mode=clone:stop_duration=0.1',
        'fade=t=in:st=0:d=0.12', f'fade=t=out:st={duration-0.12}:d=0.12',
    ]
    run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', str(start), '-i', str(file),
         '-t', str(duration), '-vf', ','.join(filters), '-an', '-c:v', 'libx264', '-preset', 'fast',
         '-crf', '17', '-pix_fmt', 'yuv420p', '-r', '30', '-frames:v', str(round(duration * 30)), str(dest)])
    return dest


def fresh(index, name, duration, offset=0, crop=None):
    clip = CAPTURE['clips'][name]
    return encode(index, ROOT / clip['file'], clip['start'] + offset, duration, crop)


def font(size, weight='W6'):
    file = next(p for p in Path('/System/Library/Fonts').glob(f'*{weight}.ttc') if '角' in p.name)
    return ImageFont.truetype(str(file), size)


def mobile(index):
    # 実機画面と同じ時刻のプレビューを並べ、固定表示と設定欄を同時に見せます。
    card = Image.new('RGB', (1920, 1080), '#102631')
    d = ImageDraw.Draw(card)
    d.text((700, 35), 'SMARTPHONE', font=font(24), fill='#80debd')
    d.text((700, 90), 'スマホでも、見ながら調整。', font=font(44), fill='#ecf3f3')
    d.text((700, 163), 'プレビューを固定して、設定をスクロール', font=font(27, 'W3'), fill='#a5bec6')
    d.rounded_rectangle((690, 236, 1750, 912), radius=20, fill='#2e4750')
    background = WORK / 'mobile-background.png'
    card.save(background)
    dest = WORK / f'cut-{index:02}.mp4'
    graph = (
        '[1:v]fps=30,split=2[phone][preview];'
        '[phone]crop=1080:2208:0:154,scale=440:900[phonefit];'
        '[preview]crop=1020:646:30:278,scale=1040:658[detail];'
        '[0:v][phonefit]overlay=120:20[base];'
        '[base][detail]overlay=700:245,setsar=1,format=yuv420p,'
        'fade=t=in:st=0:d=0.12,fade=t=out:st=15.88:d=0.12[out]'
    )
    run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-loop', '1', '-framerate', '30',
         '-i', str(background), '-ss', '22', '-i', str(ROOT / 'Recordings/1.mp4'),
         '-filter_complex', graph, '-map', '[out]', '-t', '16', '-an', '-c:v', 'libx264',
         '-preset', 'fast', '-crf', '17', '-pix_fmt', 'yuv420p', str(dest)])
    return dest


def image_cut(index):
    png = next(d['file'] for d in CAPTURE['downloads'] if d['extension'] == 'png')
    dest = WORK / f'cut-{index:02}.mp4'
    run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-loop', '1', '-framerate', '30',
         '-i', str(ROOT / png), '-t', '2', '-vf',
         f'scale=1920:936:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=1920:1080:(ow-iw)/2:0:color={BG},setsar=1',
         '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '17', '-pix_fmt', 'yuv420p', str(dest)])
    return dest


cuts = [
    fresh(0, 'garden', 6), fresh(1, 'garden', 4, 6), fresh(2, 'twilight', 4), fresh(3, 'snow', 4),
    encode(4, ROOT / 'Recordings/2_0.mov', 11, 6),
    encode(5, ROOT / 'Recordings/2_0.mov', 20, 6),
    encode(6, ROOT / 'Recordings/2_1.mov', 106, 4),
    fresh(7, 'orbit', 8), mobile(8), fresh(9, 'exports', 10, crop='crop=1260:740:330:330'),
    image_cut(10), fresh(11, 'garden', 5, 9),
]
concat = WORK / 'concat.txt'
concat.write_text('\n'.join(f"file '{p.name}'" for p in cuts) + '\n')
assembled = WORK / 'assembled.mp4'
run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0',
     '-i', str(concat), '-c', 'copy', '-an', str(assembled)])

# subtitle.ass は独立した制作素材として管理します。
subtitle = 'Post/紹介動画/subtitle.ass'
run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(assembled),
     '-vf', f"drawbox=x=0:y=936:w=iw:h=144:color={BG}:t=fill,ass={subtitle}",
     '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p',
     '-r', '30', '-movflags', '+faststart', str(DEST)])
print(DEST)
