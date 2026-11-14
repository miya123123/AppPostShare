# itch.io掲載原稿・日本語

## タイトル（Title）
ファスナー・ワールド：Zipper World

## Project URL
https://miya-gamedev.itch.io/zipper-world

## Short description or tagline
ファスナーを詰まらせないように引いて、カラフルな世界を開くゲームです。

## Classification
Games

## Kind of project
HTML

## Release status
Prototype

## Pricing
PWYW

### Suggested donation
$2

## Uploads
This file will be played in the browser
/Users/miya/program/app/chatGPTGame/root/ChatGPT/GPT 6/20_ファスナー・ワールド/zipper-world-itch-v2/zipper-world.html

### Change display name
zipper-world.html

### This file will be played in the browser
Check

## Embed options
### Click to launch in fullscreen
Check

### Frame options
#### Mobile friendly — Your project can run on mobile phones (smaller resolution and touch support)
Check

##### Orientation
Portrait（縦向き）

#### Enable scrollbars — Enable scrollbars in the iframe that contains your project
Check

## Details
1. 概要
30秒程度の短時間でプレイ可能なスコアアタックゲームです。
ファスナーを開くとその先にはカラフルな世界が出現し、通常プレイでは4つの世界を順に巡ります。
素早く引いたり、コースから外れたりして、摩擦ゲージが最大まで溜まるとファスナーが詰まってペナルティを受けます。
詰まりやすい高スコアのお宝ルートと、詰まりにくい低スコアの安全ルートの2つのルートを選択可能です。
3連続一度も詰まらなかった場合、虹色フィーバーとなり、7つの世界が出現する虹色世界に到達します。
本ゲームはプロトタイプ版となります。

2. 操作
「世界をひらく」を押して開始。
金色の引き手を指やマウスでつかみ、点線に沿って下へドラッグ。
途中で指を離しても、同じ引き手から再開できます。
通常世界では、ファスナーを素早く引くと摩擦ゲージが溜まります。点線の上を正確に引いていても、高速で引くと上昇します。
摩擦ゲージが100%になるとファスナーが詰まります。指を離して冷却し、20%以下まで回復すると、同じ引き手から再開できます。
キーボードはSpaceでつかむ・離す、矢印キーまたはWASDで移動。Escapeは一時停止。
画面右下は一時停止、右上はサウンド切替。

3. スコア
進行スコア: 各世界につき最大300点 × 倍率。
開放ボーナス：安全ルートは200点×倍率、お宝ルートは700点×倍率、虹色フィーバーは600点×倍率です。
世界が始まってから3.5秒以内に、詰まらず開放すると次の世界の倍率が＋0.5。
倍率は最大5倍。詰まった場合はその場で、3.5秒を超過した場合は次の世界で、倍率が1倍へ戻ります。
3つの世界を詰まらず連続で開くと、次に「虹色フィーバー」が始まります。横に指がぶれても詰まらず、中央へ穏やかに誘導されます。
虹色フィーバーでは7つの世界を1つずつ順番に表示します。世界の切り替わりは短いフェードでつなぎます。しずくの庭、ネオン・シティ、サンゴの海、星の遊園地、水晶洞窟、お菓子の森、オーロラの空島を巡ります。

4. 画像・サウンド
ゲーム内の背景、建物、樹木、サンゴ、惑星、金属の引き手、粒子はCanvas 2Dの描画コードからプロシージャルに生成しています。ゲーム内では、PNG素材や画像生成モデルは使用していません。
サウンドはWeb Audioの合成音です。初期状態はオフ。右上ボタンでオンにできます。
ベストスコアと音設定はブラウザ内に保存します。OSの「視差効果を減らす」などの設定では演出の動きを減らします。

5. 摩擦ゲージ
一定の速度を超えると摩擦が溜まります。離したり、ゆっくり引くと、摩擦が減少します。
コースから外れた際にも、摩擦が増加します。
摩擦ゲージが100%になると詰まり、スコア倍率が1倍に戻ります。
指やマウスのボタンを離すと冷却します。
虹色フィーバー中は摩擦が増えず、詰まりも発生しません。

6. リスクとリターン
1） 速く引くか、慎重に引くか
素早く引くと制限時間内に多くの世界を開けられ、3.5秒以内に詰まらず開放すると、次の世界の倍率も増加します。
一方、高速で引くほど摩擦が溜まりやすく、100%になると詰まって倍率が1倍に戻ります。また、コースから外れやすくなり、外れると摩擦が大きく増加します。

2） 安全ルートか、お宝ルートか
安全ルートは曲がりが少なく、開放ボーナスは小さいです（200点×倍率）。詰まりを回避しやすいため、虹色世界に到達しやすいです。
お宝ルートはカーブが多く判定も厳しいため、摩擦や詰まりのリスクが高まりますが、開放ボーナスは大きいです（700点×倍率）。

7. 動作確認済みOS
Mac / Android / iOS

8. 使用技術
・Codex（GPT-6.1-Sol）：本ゲームの設計と実装、この紹介文と紹介動画の作成に使用しました
・Canvas 2D：ゲーム画面の描画に使用しました
・Web Audio：ゲーム内のサウンド生成に使用しました
・GPT Image：宣伝用カバー・バナー画像の生成に使用しました


## Genre
Action

# Tags
2D, Casual, Colorful, Procedural Generation, Score Attack, Short, Singleplayer

## AI generation disclosure
Yes

### What kind of AI generated content is used?
Graphics, Text, Code

### Statement of AI usage (optional)
・Codex（GPT-6.1-Sol）：本ゲームの設計と実装、この紹介文と紹介動画の作成に使用しました
・GPT Image：宣伝用カバー・バナー画像の生成に使用しました

## Community
Discussion board

## Upload Cover Image
/Users/miya/program/app/chatGPTGame/root/ChatGPT/GPT 6/20_ファスナー・ワールド/zipper-world-itch-v2/cover/cover-en-1260x1000.png

## Gameplay video or trailer
https://youtu.be/OdaeTfT2JZM
/Users/miya/program/app/chatGPTGame/root/ChatGPT/GPT 6/20_ファスナー・ワールド/Recordings/3/Join.mov


## Screenshots
/Users/miya/program/app/chatGPTGame/root/ChatGPT/GPT 6/20_ファスナー・ワールド/zipper-world-itch-v2/screenshots






## Metadata
### Classification
#### Input methods — How can your game be played?
Mouse / Touch / Keyboard

#### Average session duration — Time it takes to reach an objective (complete a level, a run, etc.)
A few seconds

#### Player count — How many players can play together during a single session
1

#### Languages
Japanese






## Edit Thema

### Layout
#### Screenshots
Sidebar

### Images
#### Banner
/Users/miya/program/app/chatGPTGame/root/ChatGPT/GPT 6/20_ファスナー・ワールド/zipper-world-itch-v2/banner/banner-en-1920x640.png
