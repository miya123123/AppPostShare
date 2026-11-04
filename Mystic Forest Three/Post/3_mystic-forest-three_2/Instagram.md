/Users/miya/program/tool/generativeAI/CodexApp/Projects/17_Agent Sprite Forge Test/Recordings/3_mystic-forest-three_2/join.mov
/Users/miya/program/tool/generativeAI/CodexApp/Projects/17_Agent Sprite Forge Test/Post/3_mystic-forest-three_2/Title.png
【Mystic Forest Three】歩行アニメーションを修正しました。【Codex + agent-sprite-forge】

# 概要
神秘の森をプレイヤーが探索できる2.5Dゲーム「Mystic Forest Three」の進捗です。
横移動時のキャラクターの歩行アニメーションが不自然な点を修正しました。
後述のプロンプトを使用し、足が動いていない点を修正しました。
プレイヤーの歩行アニメーション画像はagent-sprite-forgeで生成し、テストはPlaywright Interactiveで行いました。
動画の冒頭は、修正前後のアニメーションです。
まだ不自然な点はあるものの、前回より質は向上したという印象です。

# 使用プロンプトと結果
以下の3パターンの修正用のプロンプトを試し、パターン3で生成したアニメーションを採用しました。

### 1. 抽象的プロンプト（-> x）
単に「足が動いていない点を修正してください」といった抽象的なテキストのみのプロンプトです。
結果、相変わらず足が動かなかったり、足が交差するフレームが抜けていたりしました。

### 2. 抽象的プロンプト + サンプル歩行動画の参照（-> x）
上記のような抽象的なテキストプロンプトに加えて、Unity Chanの3Dの歩行アニメーション動画を参照させるパターンです。
結果は同様にイマイチでした。

### 3. 1フレームごとに指定するプロンプト（-> △）
アニメーションの各フレームの画像を指定するプロンプトです。
具体的には、「左足が前に出るフレーム、左右の足が交差するフレーム、右足が前に出るフレーム、左右の足が交差するフレームを順に生成し、スムーズに足が動いているように修正してください。」といったプロンプトです。
結果は、一見すると成功したかのように見えましたが、残念ながら、後で、左足フレームの前足も右足になっていたり、キャラクターのスタイルも少し変化していることに気づきました。
とはいえ、以前の足が動いていない場合よりも、随分それっぽく見えるようになったため、暫定的にこれを採用することにしました。

# 今後の展望
### 1. 仲間キャラクターの実装（優先度大）
仲間キャラクターを実装し、仲間が並ぶドラクエ方式のフィールド移動を行えるようにします。

### 2. 歩行アニメーションのさらなる改善（優先度中）
- 一貫性を保つよう明記して修正させます。
- 3Dではなく、類似の2Dの歩行アニメーションのサンプル画像を参照させます。
- パターン3のプロンプトで生成後、不自然なフレーム（右足フレームなど）を1フレームずつ修正させます。
- 歩行アニメーションを作成するスキルを自作します。もしくは、現在開発中の差分画像生成ツール「Game Sprite Forge」内でアニメーションを作成できるようにします。

### 3. 2.5Dゲーム開発（優先度中）
- agent-sprite-forgeを使用した2.5Dのゲーム開発を行います。
- 本ゲームの改良もしくは、新規開発を行います。

### 4. generate2dmapを試す（優先度中）
agent-sprite-forge同梱の「generate2dmap」スキルを使用したマップ制作を試します。

# 使用技術
- Codex（GPT-5.5・高）: 開発に使用
- agent-sprite-forge（generate2dsprite）: 歩行アニメーションの画像生成に使用
- Playwright Interactive: テスト

# 動画タイムライン
- 0:00-0:03 修正前後のアニメーション
- 0:04-0:35 修正アニメーション実装後のプレイ

# 関連URL
- [agent-sprite-forge](https://github.com/0x0funky/agent-sprite-forge)
- [Codex + Agent Sprite Forge でRPGの街の生成を試す｜npaka](https://note.com/npaka/n/n34b00d58dfbe)
- [【agent-sprite-forge】RPGの3D森フィールドを生成しました。【Codex】|miya](https://x.com/miya00907380/status/2061568471402697073)
- [【agent-sprite-forge】ドラゴンのアニメーションを作成しました。【Codex】](https://x.com/miya00907380/status/2060843695545454785)
- [【Slowshot Nova】開発・公開しました。【Codex】 | miya](https://x.com/miya00907380/status/2060118922800824466)

# タグ
#AgentSpriteForge
#ForestField
#Codex
#GameDev
#AIImage
