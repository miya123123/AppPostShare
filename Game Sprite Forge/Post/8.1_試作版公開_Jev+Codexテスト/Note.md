/Users/miya/program/app/chatGPTGame/root/Claude/Claude Opus 4.7/2_Game Sprite Forge/Recordings/8.1/Title.png
【Game Sprite Forge 開発記録（第10弾）】Codexによる自動テストと、試作版の公開を行いました。

https://x.com/miya00907380/status/2108678901320871975

# 概要
スプライト差分画像をプロシージャルに高速生成できるゲーム開発向けツール「Game Sprite Forge」の開発記録です。

本ツールの試作版の公開と、Codexを使用した以下の自動テストを行いました。

テストの結果、複数の不具合が見つかりました。
今後は、修正版をitch.ioで出品予定です。

# 試作版のURL
試作版のURLは以下の通りです。

ご興味のある方はぜひ触ってみてください。
建設的なフィードバック大歓迎です。

[Game Sprite Forge | miya](https://game-sprite-forge.miya333.chatgpt.site)

# 本テスト
### テスト方法
Codex・Jev・Playwrightを使用し、エクスポート・パラメーターの境界値・UI・パレット・例外処理など、合計662ケースの機能テストを行いました。
デモ画像・複数の合成画像・帽子をかぶった人物・竜王の画像を入力に使い、全30プリセットを検証しました。
また、差分画像の品質チェックもCodexに目視で別途実行させました。

### テスト結果
機能テストは662ケース中653ケースが合格となりました。
スマホなどの狭い画面での表示崩れと、竜王APNGアニメーションのアルファ値の変化の不具合が見られました。

目視では、人物の浮遊・呼吸・オーラリングアニメーションの帽子・足先・リングが欠けたり、竜王の睡眠アニメーションの「Z」が欠ける不具合などが見られました。

# 今後の展望
1. 不具合修正
今回のテスト結果を受けた修正を行います。

2. テスト
人間（miya）によるテストを行います。

3. 本ツールの出品
itch.ioで本ツールをPay what you want方式で出品します。
関連するドキュメント類の作成も行います。

# 本ツールの概要
元画像1枚からゲーム用スプライトの差分画像をプロシージャルに高速生成するブラウザツールです。
ダメージ・色相変化・凍結・毒・睡眠など、全30プリセットの差分画像から選択し、生成できます。
静止画とアニメーションに対応し、ダメージの強さやフレーム数、呼吸の振幅などを調整できます。
カスタムパレットによる減色やアウトライン追加にも対応しています。
PNG・スプライトシート・GIF・APNG・WebP形式で書き出せ、選択した差分をまとめたシートも保存できます。

# 使用画像
ぴぽや様のキャラクターチップ素材（帽子をかぶった人物）と「竜王様b_歩行」の画像をお借りしました。

# 動画タイムライン
0:00 本自動テストの様子（竜王を入力画像に使用、一部十倍速）
0:30 自動テスト（人物を入力画像に使用、一部十倍速）
0:55 見つかった不具合1（狭い画面での表示崩れ）
1:06 不具合2（人物の浮遊・呼吸・オーラリングアニメーションの欠け）
1:23 不具合3（竜王の睡眠アニメーションのZの欠け）

# 使用技術
Claude Code、Codex、Antigravity: 開発に使用
Codex(gpt-6.1-sol)、Jev(jev-1.13.0)、Playwright、Chromeブラウザー: 本自動テストに使用

# 関連URL
- [お借りした素材 | キャラクターチップ１ - ぴぽや倉庫](https://pipoya.net/sozai/assets/charachip/character-chip-1/#RPG%E3%82%AD%E3%83%A3%E3%83%A9%E5%9F%BA%E6%9C%AC%E3%82%BB%E3%83%83%E3%83%88)
- [お借りした素材 | 【エネミー素材】魔王＆竜王 - ぴぽやblog](https://pipoya.net/blog/demon-king-and-dragon-king/)
- [【Game Sprite Forgeの開発記録（第一弾）】 | miya](https://x.com/miya00907380/status/2047072960163512811)
- [【Game Sprite Forgeの開発記録（第二弾）】 | miya](https://x.com/miya00907380/status/2050334453671526699)
- [【Game Sprite Forgeの開発記録（第三弾）】 | miya](https://x.com/i/status/2054320716577755583)
- [【Game Sprite Forgeの開発記録（第四弾）】 | miya](https://x.com/miya00907380/status/2062293248635269537)
- [【Game Sprite Forge（第五弾）】差分画像を修正しました。 | miya](https://x.com/miya00907380/status/2067366686777606425)
- [【Game Sprite Forge（第六弾）】カスタムパレットを追加し、任意の色で減色できるようにしました。 | miya](https://x.com/miya00907380/status/2079687869254234223)
- [【Game Sprite Forge 開発記録（第7弾）】大規模なリファクタリングを行いました。 | miya](https://x.com/miya00907380/status/2094908166307729877)
- [【Game Sprite Forge 開発記録（第8弾）】差分画像を追加しました。 | miya](https://x.com/miya00907380/status/2098532033437876489)

# タグ
#GameSpriteForge
#PixelArt
#プロシージャル差分画像生成
#ドット絵
#indiedev
