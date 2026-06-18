import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

const outputPath = new URL("../public/data/articles.json", import.meta.url);
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(new Date());

const defaultFeeds = [
  { name: "OpenAI", url: "https://openai.com/news/rss.xml" },
  { name: "Google AI", url: "https://blog.google/technology/ai/rss/" },
  { name: "NVIDIA AI", url: "https://blogs.nvidia.com/blog/category/deep-learning/feed/" },
  { name: "AWS Machine Learning", url: "https://aws.amazon.com/blogs/machine-learning/feed/" },
  { name: "Hugging Face", url: "https://huggingface.co/blog/feed.xml" },
  { name: "arXiv AI", url: "http://export.arxiv.org/rss/cs.AI" },
  { name: "The Decoder", url: "https://the-decoder.com/feed/" },
  { name: "MIT Technology Review AI", url: "https://www.technologyreview.com/topic/artificial-intelligence/feed/" }
];

const feeds = process.env.FEED_URLS
  ? process.env.FEED_URLS.split(",").map((url, index) => ({ name: `Feed ${index + 1}`, url: url.trim() }))
  : defaultFeeds;

const maxItemsPerFeed = Number(process.env.MAX_ITEMS_PER_FEED || 8);
const maxSources = Number(process.env.MAX_SOURCES || 14);
const keepArticles = Number(process.env.KEEP_ARTICLES || 60);

const aiKeywords = [
  "ai",
  "artificial intelligence",
  "model",
  "llm",
  "agent",
  "生成ai",
  "machine learning",
  "deep learning",
  "robot",
  "inference",
  "training",
  "safety",
  "governance",
  "gpu"
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

const articleWritingRules = [
  `禁止接続詞を使わない: ${bannedConnectors.join(" / ")}`,
  `禁止語彙を使わない: ${bannedVocabulary.join(" / ")}`,
  "一文の長さを意図的に揺らし、10字台の短文と50字超の長文を混在させる。",
  "文末の「です」「ます」を3回以上連続させない。",
  "抽象論で終わらせず、具体的な数値、固有名詞、体験談のいずれかを1つ以上入れる。",
  "「結論から言うと」で始めない。",
  "統計や効果を書く場合、出典がなければ断定せず「目安として」と明記する。"
];

function decodeEntities(value = "") {
  return value
    .replaceAll("<![CDATA[", "")
    .replaceAll("]]>", "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .trim();
}

function stripTags(value = "") {
  return decodeEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTag(block, names) {
  for (const name of names) {
    const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
    if (match) return decodeEntities(match[1]);
  }
  return "";
}

function extractLink(block) {
  const rssLink = extractTag(block, ["link"]);
  if (rssLink) return stripTags(rssLink);
  const atomLink = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);
  return atomLink ? decodeEntities(atomLink[1]) : "";
}

function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    for (const key of [...parsed.searchParams.keys()]) {
      if (key.startsWith("utm_") || key === "fbclid" || key === "gclid") {
        parsed.searchParams.delete(key);
      }
    }
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url;
  }
}

function parseFeed(xml, feed) {
  const blocks = [
    ...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi),
    ...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)
  ].map((match) => match[0]);

  return blocks.slice(0, maxItemsPerFeed).map((block) => {
    const title = stripTags(extractTag(block, ["title"]));
    const url = normalizeUrl(extractLink(block));
    const rawDate = extractTag(block, ["pubDate", "published", "updated", "dc:date"]);
    const publishedAt = rawDate ? new Date(rawDate).toISOString() : new Date().toISOString();
    const summary = stripTags(extractTag(block, ["description", "summary", "content:encoded", "content"]));
    return {
      title,
      url,
      source: feed.name,
      publishedAt,
      summary: summary.slice(0, 900)
    };
  }).filter((item) => item.title && item.url);
}

function scoreItem(item) {
  const text = `${item.title} ${item.summary}`.toLowerCase();
  const keywordScore = aiKeywords.reduce((score, keyword) => score + (text.includes(keyword) ? 2 : 0), 0);
  const ageHours = Math.max(1, (Date.now() - new Date(item.publishedAt).getTime()) / 36e5);
  const freshness = Math.max(0, 10 - ageHours / 24);
  return keywordScore + freshness;
}

async function fetchFeed(feed) {
  const response = await fetch(feed.url, {
    headers: {
      "user-agent": "AI-Koyomi-NewsBot/1.0 (+https://pages.cloudflare.com/)"
    }
  });
  if (!response.ok) throw new Error(`${feed.name} returned ${response.status}`);
  return parseFeed(await response.text(), feed);
}

async function collectSources() {
  const settled = await Promise.allSettled(feeds.map(fetchFeed));
  const items = [];
  for (const result of settled) {
    if (result.status === "fulfilled") {
      items.push(...result.value);
    } else {
      console.warn(result.reason.message);
    }
  }

  const seen = new Set();
  return items
    .filter((item) => {
      const key = item.url || item.title;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((item) => ({ ...item, score: scoreItem(item) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSources);
}

function sourceForPrompt(source) {
  return {
    title: source.title,
    source: source.source,
    url: source.url,
    publishedAt: source.publishedAt,
    summary: source.summary
  };
}

function extractJson(text) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Model response did not contain JSON.");
  return JSON.parse(raw.slice(start, end + 1));
}

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
    throw new Error(`Generated article uses banned wording: ${found.join(", ")}`);
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
      throw new Error("Generated article ends three or more consecutive sentences with です/ます.");
    }
  }
}

function validateArticle(article, sources) {
  const clean = {
    id: article.id || `ai-news-${today}`,
    date: article.date || today,
    generatedAt: new Date().toISOString(),
    title: article.title,
    dek: article.dek,
    summary: article.summary,
    whyItMatters: article.whyItMatters,
    details: article.details,
    watchPoints: article.watchPoints,
    glossary: article.glossary,
    tags: article.tags || ["AIニュース"],
    sources: (article.sources?.length ? article.sources : sources).map((source) => ({
      title: source.title,
      source: source.source,
      url: source.url,
      publishedAt: source.publishedAt?.slice(0, 10) || today
    }))
  };

  const requiredStrings = ["title", "dek", "summary", "whyItMatters"];
  for (const key of requiredStrings) {
    if (!clean[key] || typeof clean[key] !== "string") {
      throw new Error(`Generated article is missing ${key}.`);
    }
  }
  if (!Array.isArray(clean.details) || clean.details.length < 3) {
    throw new Error("Generated article must include at least three detail sections.");
  }
  if (!Array.isArray(clean.watchPoints) || clean.watchPoints.length < 3) {
    throw new Error("Generated article must include at least three watch points.");
  }
  if (!Array.isArray(clean.glossary) || clean.glossary.length < 2) {
    throw new Error("Generated article must include glossary terms.");
  }
  validateWritingRules(clean);
  return clean;
}

async function generateWithOpenAI(sources) {
  if (!process.env.OPENAI_API_KEY) return null;

  const prompt = {
    date: today,
    instruction:
      "以下のAI関連ニュース出典をもとに、日本語の詳細な日次解説記事を作成してください。本文は出典の丸写しにせず、事実・背景・影響・次に見る論点を分けて丁寧に説明してください。不確かな推測は避け、各source URLを保持してください。AIが書いたように見える均質な文体を避け、writingRulesを必ず守ってください。",
    writingRules: articleWritingRules,
    schema: {
      id: "ai-news-YYYY-MM-DD",
      date: "YYYY-MM-DD",
      title: "記事タイトル",
      dek: "100字前後の導入",
      summary: "まず何が起きたか。300字以上。",
      whyItMatters: "なぜ重要か。300字以上。",
      details: [{ heading: "小見出し", body: "詳しい説明。250字以上。" }],
      watchPoints: ["次に確認すべき論点"],
      glossary: [{ term: "用語", description: "短く平易な説明" }],
      tags: ["タグ"],
      sources: [{ title: "出典タイトル", source: "媒体名", url: "URL", publishedAt: "YYYY-MM-DD" }]
    },
    sources: sources.map(sourceForPrompt)
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      temperature: 0.25,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a careful Japanese technology journalist. You write accurate, sourced, readable AI news analysis. Return only valid JSON."
        },
        { role: "user", content: JSON.stringify(prompt) }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return validateArticle(extractJson(data.choices[0].message.content), sources);
}

function fallbackArticle(sources) {
  const topSources = sources.slice(0, Math.min(8, sources.length));
  const themes = [...new Set(topSources.map((source) => source.source))].slice(0, 5);
  return validateArticle(
    {
      id: `ai-news-${today}`,
      date: today,
      title: "今日のAIニュース総覧",
      dek: `${themes.join("、")}などの新着情報を横断し、今日確認すべきAI関連トピックを整理しました。`,
      summary:
        "本日の自動収集では、主要なAI企業・研究組織・技術メディアのフィードから新着情報を取得しました。OpenAI APIキーが未設定のため、この記事は出典のタイトルと概要をもとにした簡易版です。詳細な本文生成を有効にすると、各ニュースの背景、利用者や開発者への影響、次に注目すべき論点まで踏み込んだ記事になります。",
      whyItMatters:
        "AIの動向は、モデルの能力向上だけでなく、価格、企業導入、安全性、著作権、規制、半導体、クラウド基盤まで広く波及します。毎日の小さな発表を追うことで、数週間後に大きな変化として見える兆候を早く捉えられます。",
      details: topSources.slice(0, 5).map((source) => ({
        heading: source.title,
        body: `${source.source}から公開された情報です。概要: ${source.summary || "本文概要はフィードに含まれていません。"}`
      })),
      watchPoints: [
        "同じテーマが複数社から出ている場合、市場全体の方向転換を示している可能性があります。",
        "モデル発表は、価格、API制限、利用規約、対象地域もあわせて確認すると実務判断に使いやすくなります。",
        "規制や安全性のニュースは、短期の機能追加よりも導入計画への影響が大きくなる場合があります。"
      ],
      glossary: [
        {
          term: "基盤モデル",
          description: "大量のデータで事前学習され、文章生成や画像理解など複数用途に使えるAIモデルです。"
        },
        {
          term: "AIエージェント",
          description: "目標に向けて情報取得、判断、ツール操作を組み合わせて進めるAIシステムです。"
        }
      ],
      tags: ["AIニュース", "日次ダイジェスト", ...themes.slice(0, 3)],
      sources: topSources
    },
    topSources
  );
}

async function readExisting() {
  if (!existsSync(outputPath)) {
    return { updatedAt: new Date().toISOString(), articles: [] };
  }
  return JSON.parse(await readFile(outputPath, "utf8"));
}

const sources = await collectSources();
if (sources.length === 0) {
  throw new Error("No news sources were collected. Check feed URLs or network access.");
}

let article = null;
try {
  article = await generateWithOpenAI(sources);
} catch (error) {
  console.warn(error.message);
}

if (!article) {
  article = fallbackArticle(sources);
}

const existing = await readExisting();
const articles = [
  article,
  ...(existing.articles || []).filter((item) => item.date !== article.date)
].slice(0, keepArticles);

await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
await writeFile(
  outputPath,
  `${JSON.stringify({ updatedAt: new Date().toISOString(), articles }, null, 2)}\n`,
  "utf8"
);

console.log(`Wrote ${article.id} with ${article.sources.length} source(s).`);
