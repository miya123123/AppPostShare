# 浮遊島生成器 全パラメータ操作録画

本ツールのWebMCPを使って、13項目を一度にまとめず、ひとつずつ変更する様子を撮影します。

- 動画: [WebMCP全パラメータ操作_浮遊島生成器.mp4](../../Recordings/WebMCP全パラメータ操作_浮遊島生成器.mp4)
- 呼び出し記録: [calls.json](calls.json)
- 検証記録: [verification.json](verification.json)
- 撮影スクリプト: [capture.mjs](capture.mjs)
- 検証スクリプト: [verify.mjs](verify.mjs)

初期設定をWebMCPで取得し、シード、スタイル、島数、大きさ、深さ、地表の起伏、岩の形状と粗さ、神殿、木、遺跡、滝、橋を順番に1項目ずつ更新します。各変更では画面の値と `configure_floating_stage` の返却値を確認し、最後に全設定を `read_floating_stage` で再確認します。

```sh
node Post/WebMCP全パラメータ操作録画/capture.mjs
node Post/WebMCP全パラメータ操作録画/verify.mjs
```

Node.js、Chrome、FFmpeg、ローカルPlaywrightが必要です。Chrome 154でWebMCPを有効にして撮影します。
