/Users/miya/program/tool/generativeAI/CodexApp/Projects/17_Agent Sprite Forge Test/Post/4_mystic-forest-three_3/Title.png
/Users/miya/program/tool/generativeAI/CodexApp/Projects/17_Agent Sprite Forge Test/Recordings/4/2.mov
【Mystic Forest Three（第三弾）】ドラクエ方式のフィールド移動を実装しました【Codex + agent-sprite-forge】

# 概要
神秘の森をプレイヤーが探索できる2.5Dゲーム「Mystic Forest Three」の進捗です。
仲間キャラクターを実装し、仲間が後ろに並んで歩く、ドラクエ方式のフィールド移動を行えるようにしました。
仲間キャラクターのアニメーションには不自然な点がある（足が動いていない）ものの、隊列で歩く自然なフィールド移動を実装できたと思います。

# 今後の展望
### 1. 歩行アニメーションの修正（優先度中）
- 一貫性を保つよう明記したうえで、類似する2D歩行アニメーションのサンプル画像を参照しながら、不自然なフレームを1フレームずつ修正します。
- 歩行アニメーションを作成するスキルを自作します。もしくは、現在開発中の差分画像生成ツール「Game Sprite Forge」内でアニメーションを作成できるようにします。そして、これらを利用して修正します。

### 2. 2.5Dゲーム開発（優先度中）
- agent-sprite-forgeを使用した2.5Dのゲーム開発を行います。
- 本ゲームの改良、または新規開発を行います。

### 3. generate2dmapを試す（優先度中）
agent-sprite-forge同梱の「generate2dmap」スキルを使用し、マップ制作を試します。

# 使用技術
- Codex（GPT-5.5・高）: 開発に使用
- agent-sprite-forge（generate2dsprite）: 仲間キャラクターの歩行アニメーション画像生成に使用
- Playwright Interactive: テスト

# 動画タイムライン
0:00-0:03 実装後の本ゲームをプレイ

# 関連URL
- [agent-sprite-forge](https://github.com/0x0funky/agent-sprite-forge)
- [Codex + Agent Sprite Forge でRPGの街の生成を試す｜npaka](https://note.com/npaka/n/n34b00d58dfbe)
- [【Mystic Forest Three】歩行アニメーションを修正しました。【Codex + agent-sprite-forge】|miya](https://x.com/miya00907380/status/2063018028598468783)
- [【agent-sprite-forge】RPGの3D森フィールドを生成しました。【Codex】|miya](https://x.com/miya00907380/status/2061568471402697073)
- [【agent-sprite-forge】ドラゴンのアニメーションを作成しました。【Codex】](https://x.com/miya00907380/status/2060843695545454785)
- [【Slowshot Nova】開発・公開しました。【Codex】 | miya](https://x.com/miya00907380/status/2060118922800824466)

#AgentSpriteForge
#ForestField
#Codex
#GameDev
#AIImage
