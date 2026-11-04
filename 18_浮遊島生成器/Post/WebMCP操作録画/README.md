# WebMCP操作録画

本ツールのWebMCPツールを使って3つの景観を生成し、操作画面を録画します。

- 動画: [WebMCP操作_浮遊島生成器.mp4](../../Recordings/WebMCP操作_浮遊島生成器.mp4)
- 呼び出し記録: [calls.json](calls.json)
- 検証記録: [verification.json](verification.json)
- 撮影スクリプト: [capture.mjs](capture.mjs)
- 検証スクリプト: [verify.mjs](verify.mjs)

Chrome 154でWebMCPを有効にした専用ウィンドウを開き、`read_floating_stage` と `configure_floating_stage` を呼び出します。3つの設定後に読み取りツールで値を照合し、呼び出し名と結果を動画上にも表示します。アプリ本体のファイルは変更しません。

```sh
node Post/WebMCP操作録画/capture.mjs
node Post/WebMCP操作録画/verify.mjs
```

Node.js、Chrome、FFmpeg、ローカルPlaywrightが必要です。Chrome 154ではツール引数をJSON文字列で渡す必要があったため、撮影時はその形式を使います。
