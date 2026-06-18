# AI Nexus Daily

AI Nexus Daily is a Cloudflare Pages-ready Japanese AI news briefing site. It collects AI-related RSS feeds, generates a sourced daily article, and publishes the result as a static site.

## Production Features

- Daily AI article data in `public/data/articles.json`
- Search and tag filtering in the browser
- Source links, reading time, glossary, and watch points
- RSS feed, sitemap, and robots.txt generation
- SEO metadata, Open Graph metadata, and JSON-LD
- Article writing rules in `ARTICLE_WRITING_RULES.md`

## Cloudflare Pages

- Build command: `npm run build`
- Build output directory: `public`
- Node.js version: `22`

Daily updates are handled by `.github/workflows/daily-ai-news.yml`. The workflow collects RSS sources, updates `public/data/articles.json`, and lets Cloudflare Pages redeploy from GitHub.

## Detailed Article Generation

Set `OPENAI_API_KEY` in GitHub repository secrets to enable richer article generation. You can also set `OPENAI_MODEL` as a repository variable.

## Local Checks

```bash
npm run validate:data
npm run site:meta
npm run build
```

`npm run news:update` fetches RSS feeds and rewrites the article data. It requires network access.

## Key Files

- `public/index.html`: Static page shell
- `public/styles.css`: Site design
- `public/app.js`: Article rendering, search, filtering, sharing
- `public/data/articles.json`: Published article data
- `scripts/generate-news.mjs`: RSS collection and article generation
- `scripts/validate-data.mjs`: Article data and writing rule validation
- `scripts/build-site-meta.mjs`: RSS, sitemap, and robots generation
