# AI暦 - Daily AI Chronicle

最新のAI関連ニュースを毎日集め、日本語の解説記事として公開するCloudflare Pages向けサイトです。デザインは、深い紺黒、墨絵、金の円環、薄い罫線を軸にした静かな和風エディトリアルにしています。

## 使い方

Cloudflare Pagesでは以下を設定してください。

- Build command: `npm run build`
- Build output directory: `public`
- Node.js version: `22`

日次更新はGitHub Actionsの `.github/workflows/daily-ai-news.yml` が担当します。JST 06:00にRSSを取得し、`public/data/articles.json` を更新してコミットします。Cloudflare PagesをGitHub連携していれば、そのコミットで自動デプロイされます。

## 詳細な記事生成を有効にする

GitHub repository secretsに `OPENAI_API_KEY` を追加してください。必要なら repository variables に `OPENAI_MODEL` も追加できます。未設定の場合もRSSをもとに簡易ダイジェストを生成しますが、背景・影響・用語説明まで踏み込んだ記事にするにはAPIキーが必要です。

## ローカル確認

```bash
npm run validate:data
npm run news:update
```

`npm run news:update` はネットワークに接続してRSSを取得します。生成対象のフィードは [scripts/generate-news.mjs](./scripts/generate-news.mjs) の `defaultFeeds` で編集できます。

## ファイル構成

- `public/index.html`: サイト本体
- `public/styles.css`: デザイン
- `public/app.js`: 記事表示、アーカイブ、モバイルナビ
- `public/assets/ai-ink-hero.png`: 生成したヒーロー背景
- `public/data/articles.json`: 配信される記事データ
- `scripts/generate-news.mjs`: RSS収集と記事生成
- `scripts/validate-data.mjs`: Cloudflare Pagesビルド時のデータ検証
