import { readFile, writeFile } from "node:fs/promises";

const siteUrl = process.env.SITE_URL || "https://ai-news-1.pages.dev";
const dataPath = new URL("../public/data/articles.json", import.meta.url);
const feedPath = new URL("../public/feed.xml", import.meta.url);
const sitemapPath = new URL("../public/sitemap.xml", import.meta.url);
const robotsPath = new URL("../public/robots.txt", import.meta.url);

function escapeXml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

const data = JSON.parse(await readFile(dataPath, "utf8"));
const articles = Array.isArray(data.articles) ? data.articles : [];
const latestDate = articles[0]?.date || new Date().toISOString().slice(0, 10);

const rssItems = articles
  .map((article) => {
    const link = `${siteUrl}/#latest`;
    const pubDate = new Date(article.generatedAt || article.date).toUTCString();
    return `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid>${escapeXml(`${siteUrl}/#${article.id}`)}</guid>
      <pubDate>${escapeXml(pubDate)}</pubDate>
      <description>${escapeXml(article.dek || article.summary || "")}</description>
    </item>`;
  })
  .join("\n");

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>AI Nexus Daily</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>AIニュースを出典つきの日本語ブリーフとして毎日整理します。</description>
    <language>ja</language>
    <lastBuildDate>${escapeXml(new Date(data.updatedAt || Date.now()).toUTCString())}</lastBuildDate>
${rssItems}
  </channel>
</rss>
`;

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${escapeXml(`${siteUrl}/`)}</loc>
    <lastmod>${escapeXml(latestDate)}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;

const robots = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;

await writeFile(feedPath, rss, "utf8");
await writeFile(sitemapPath, sitemap, "utf8");
await writeFile(robotsPath, robots, "utf8");

console.log("Built feed.xml, sitemap.xml, and robots.txt.");
