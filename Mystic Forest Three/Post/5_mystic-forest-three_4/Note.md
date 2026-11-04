/Users/miya/program/tool/generativeAI/CodexApp/Projects/17_Agent Sprite Forge Test/Post/5_mystic-forest-three_4/Title.png
【Mystic Forest Three（第四弾）】本ゲームを公開しました【Codex】

https://x.com/miya00907380/status/2074614444097765461

# 概要
神秘の森を探索できる2.5Dゲーム「Mystic Forest Three」の進捗です。
キャラクターの歩行アニメーション（足が動いていない点）を改善し、本ゲームをGitHubで公開しました。

# 今後の展望
敵とのシームレスなバトルシステムを実装します。

# 本ゲームについて
### URL
[Mystic Forest Three | GitHub Pages | miya](https://miya123123.github.io/mystic-forest-three/)

### 概要
ローポリボクセル風の神秘の森を探索できる、2.5Dブラウザゲームです。
段差のある森、川、橋、石畳、発光クリスタル、ランタン、キノコや巨木を3Dシーンとして構成しています。
プレイヤーと3人の仲間はスプライトで表示し、移動方向に応じてアニメーションを切り替えます。

### 操作方法
- `W` / `A` / `S` / `D` | プレイヤー移動
- 矢印キー | プレイヤー移動
- マウスドラッグ | カメラ回転
- マウスホイール | ズームイン・ズームアウト

### 特徴
- ボクセル状の地形ブロックを生成し、草地、土、石畳、水面を配置
- 発光する水色/紫のクリスタル、ランタン、キノコ、木、橋をシーン内に配置
- `OrbitControls` でマップを回転可能にし、カメラ方向を元にプレイヤー移動方向を算出
- 移動中のみ歩行アニメーションを再生
- thief / swordsman / wizard の companion が隊列追従
- プレイヤーの足元へ影を追従

### 使用技術
- Codex（GPT-5.5）| 実装、README作成
- Vite | 開発サーバー、ビルド
- TypeScript | ゲームロジック、入力処理
- Three.js | 3D描画、ジオメトリ、マテリアル、ライティング、カメラ
- HTML Canvas / WebGL | ブラウザ上でのリアルタイム描画

### 使用Codexスキル
- Image Gen | テクスチャ画像の生成
- Generate 2D Sprite | プレイヤー歩行アニメーションの生成、透明PNG化、フレーム分割
- Playwright Interactive | テスト
 
# 動画タイムライン
0:00 修正後の本ゲームをプレイ

# 関連URL
- [agent-sprite-forge](https://github.com/0x0funky/agent-sprite-forge)
- [Codex + Agent Sprite Forge でRPGの街の生成を試す｜npaka](https://note.com/npaka/n/n34b00d58dfbe)
- [Mystic Forest Three | GitHub Pages | miya](https://miya123123.github.io/mystic-forest-three/)
- [Mystic Forest Three | GitHub | miya](https://github.com/miya123123/mystic-forest-three)
- [【Mystic Forest Three（第三弾）】ドラクエ方式のフィールド移動を実装しました【Codex + agent-sprite-forge】 | miya](https://x.com/miya00907380/status/2063742799577805216)
- [【Mystic Forest Three】歩行アニメーションを修正しました。【Codex + agent-sprite-forge】 | miya](https://x.com/miya00907380/status/2063018028598468783)
- [【agent-sprite-forge】RPGの3D森フィールドを生成しました。【Codex】 | miya](https://x.com/miya00907380/status/2061568471402697073)
- [【agent-sprite-forge】ドラゴンのアニメーションを作成しました。【Codex】 | miya](https://x.com/miya00907380/status/2060843695545454785)

# タグ
#AgentSpriteForge
#ForestField
#Codex
#GameDev
#AIImage
