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
  "image",
  "imageAlt",
  "title",
  "dek",
  "summary",
  "whyItMatters",
  "details",
  "watchPoints",
  "glossary",
  "sources"
];

const bannedConnectors = ["したがって", "一方で", "そして", "これにより", "つまり", "さらに"];
const bannedVocabulary = [
  "単なる",
  "鍵となる",
  "革新的",
  "飛躍的",
  "劇的",
  "シームレス",
  "最適化",
  "本質的"
];

function collectArticleText(article) {
  return [
    article.title,
    article.dek,
    article.summary,
    article.whyItMatters,
    ...(article.details || []).flatMap((item) => [item.heading, item.body]),
    ...(article.watchPoints || []),
    ...(article.glossary || []).flatMap((item) => [item.term, item.description]),
    ...(article.tags || [])
  ]
    .filter(Boolean)
    .join("\n");
}

function validateWritingRules(article) {
  const text = collectArticleText(article);
  const banned = [...bannedConnectors, ...bannedVocabulary, "結論から言うと"];
  const found = banned.filter((word) => text.includes(word));
  if (found.length > 0) {
    throw new Error(`Article ${article.id} uses banned wording: ${found.join(", ")}`);
  }

  const endings = text
    .split(/[。！？!?]\s*/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .map((sentence) => /(?:です|ます)$/.test(sentence));

  let politeRun = 0;
  for (const isPoliteEnding of endings) {
    politeRun = isPoliteEnding ? politeRun + 1 : 0;
    if (politeRun >= 3) {
      throw new Error(`Article ${article.id} ends three or more consecutive sentences with です/ます.`);
    }
  }
}

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
  validateWritingRules(article);
}

console.log(`Validated ${data.articles.length} article(s).`);
