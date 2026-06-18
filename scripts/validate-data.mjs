import { readFile } from "node:fs/promises";

const file = new URL("../public/data/articles.json", import.meta.url);
const data = JSON.parse(await readFile(file, "utf8"));

if (!Array.isArray(data.articles) || data.articles.length === 0) {
  throw new Error("public/data/articles.json must contain at least one article.");
}

const required = [
  "id",
  "date",
  "generatedAt",
  "title",
  "dek",
  "summary",
  "whyItMatters",
  "details",
  "watchPoints",
  "glossary",
  "sources"
];

for (const article of data.articles) {
  for (const key of required) {
    if (!(key in article)) {
      throw new Error(`Article ${article.id || "(unknown)"} is missing ${key}.`);
    }
  }
  if (!Array.isArray(article.details) || article.details.length < 1) {
    throw new Error(`Article ${article.id} must include details.`);
  }
  if (!Array.isArray(article.sources) || article.sources.length < 1) {
    throw new Error(`Article ${article.id} must include sources.`);
  }
}

console.log(`Validated ${data.articles.length} article(s).`);
