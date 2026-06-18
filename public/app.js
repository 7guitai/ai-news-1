const fallbackArticles = [
  {
    id: "initial-guide",
    date: "2026-06-18",
    generatedAt: "2026-06-18T00:00:00.000Z",
    image: "/assets/ai-ink-hero.png",
    imageAlt: "水墨画風の円環と山並みでAIニュースを表現したキービジュアル",
    title: "AIニュースを毎日読み解くための初回ガイド",
    dek: "このサイトは、公式発表・研究・規制・プロダクト更新を日次で集約し、背景と影響まで含めた日本語記事として公開します。",
    summary:
      "初回データです。GitHub Actionsのスケジュールを有効化すると、毎日RSSを取得し、OpenAI APIキーがある場合は本文を詳細な解説記事として自動生成します。",
    whyItMatters:
      "AIのニュースは、モデル性能、利用規約、企業導入、規制、研究成果が同時に動きます。リンクだけを並べても意思決定には使いづらい。OpenAIやGoogle AIなどの出典を示しながら、背景と確認点を整理します。",
    details: [
      {
        heading: "対象範囲",
        body: "OpenAI、Anthropic、Google、DeepMind、Meta、Microsoft、NVIDIAなどの公式情報に加え、主要なAI関連ニュースフィードを参照します。"
      },
      {
        heading: "記事の方針",
        body: "事実、背景、影響、確認すべき論点を分け、専門用語には短い説明を添えます。読者が次の判断につなげられる丁寧さを重視します。"
      },
      {
        heading: "自動更新",
        body: "毎朝JSTでスクリプトを実行し、生成されたJSONをCloudflare Pagesで配信します。手動実行も可能です。"
      }
    ],
    watchPoints: [
      "OpenAI APIキーをGitHub Secretsに入れると、本文の詳細度が大きく上がります。",
      "フィードURLはscripts/generate-news.mjsで追加・削除できます。",
      "Cloudflare Pagesの出力ディレクトリはpublicに設定します。"
    ],
    glossary: [
      {
        term: "RSS",
        description: "ニュースやブログの更新情報を機械的に取得するための配信形式です。"
      },
      {
        term: "日次ダイジェスト",
        description: "複数のニュースを一つの記事として整理した読み物です。"
      }
    ],
    tags: ["運用", "自動更新", "AIニュース"],
    sources: [
      {
        title: "OpenAI News",
        source: "OpenAI",
        url: "https://openai.com/news/",
        publishedAt: "2026-06-18"
      },
      {
        title: "Google AI Blog",
        source: "Google",
        url: "https://blog.google/technology/ai/",
        publishedAt: "2026-06-18"
      }
    ]
  }
];

const defaultImage = "/assets/ai-ink-hero.png";

const state = {
  articles: fallbackArticles,
  activeIndex: 0
};

const formatDate = (value) =>
  new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short"
  }).format(new Date(value));

const formatDateTime = (value) =>
  new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));

const create = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
};

async function loadArticles() {
  try {
    const response = await fetch("/data/articles.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed to load articles: ${response.status}`);
    const data = await response.json();
    if (Array.isArray(data.articles) && data.articles.length > 0) {
      state.articles = data.articles;
    }
  } catch (error) {
    console.warn(error);
  }
}

function renderTicker(article) {
  const track = document.querySelector("#tickerTrack");
  const topics = [
    ...(article.tags || []),
    ...(article.watchPoints || []).slice(0, 3),
    ...(article.sources || []).map((source) => source.source)
  ].filter(Boolean);
  const repeated = [...topics, ...topics, ...topics];
  track.replaceChildren(
    ...repeated.map((topic) => create("span", "ticker-pill", topic))
  );
}

function renderArticle(index) {
  state.activeIndex = index;
  const article = state.articles[index] || state.articles[0];
  const articleImage = article.image || defaultImage;
  const articleImageAlt = article.imageAlt || `${article.title}のキービジュアル`;

  document.querySelector("#articleDate").dateTime = article.date;
  document.querySelector("#articleDate").textContent = formatDate(article.date);
  document.querySelector("#articleTitle").textContent = article.title;
  document.querySelector("#articleLead").textContent = article.dek;
  document.querySelector("#articleSummary").textContent = article.summary;
  document.querySelector("#whyItMatters").textContent = article.whyItMatters;
  document.querySelector("#generatedAt").textContent = formatDateTime(article.generatedAt || article.date);
  document.querySelector("#sourceCount").textContent = `${article.sources?.length || 0}件の出典をもとに整理`;
  document.querySelector("#articleImage").src = articleImage;
  document.querySelector("#articleImage").alt = articleImageAlt;
  document.querySelector("#articleImageCaption").textContent = articleImageAlt;

  const meta = document.querySelector("#articleMeta");
  meta.replaceChildren(
    ...[...(article.tags || []), `出典 ${article.sources?.length || 0}件`].map((item) =>
      create("span", "meta-pill", item)
    )
  );

  const sourceStrip = document.querySelector("#sourceStrip");
  sourceStrip.replaceChildren(
    ...(article.sources || []).slice(0, 3).map((source, sourceIndex) => {
      const link = create("a", "source-chip");
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.append(create("b", "", `Source ${sourceIndex + 1}`));
      link.append(create("strong", "", source.title));
      link.append(create("span", "", `${source.source} / ${source.publishedAt || "日付不明"}`));
      return link;
    })
  );

  const details = document.querySelector("#detailsList");
  details.replaceChildren(
    ...(article.details || []).map((item, detailIndex) => {
      const relatedSource = article.sources?.[detailIndex];
      const wrap = create("div", "detail-item");
      wrap.append(create("strong", "", item.heading));
      wrap.append(create("p", "", item.body));
      if (relatedSource?.url) {
        const sourceLink = create("a", "detail-source", `${relatedSource.source}で確認する`);
        sourceLink.href = relatedSource.url;
        sourceLink.target = "_blank";
        sourceLink.rel = "noopener noreferrer";
        wrap.append(sourceLink);
      }
      return wrap;
    })
  );

  const watchPoints = document.querySelector("#watchPoints");
  watchPoints.replaceChildren(
    ...(article.watchPoints || []).map((point) => create("li", "", point))
  );

  const glossary = document.querySelector("#glossary");
  glossary.replaceChildren(
    ...(article.glossary || []).flatMap((item) => [
      create("dt", "", item.term),
      create("dd", "", item.description)
    ])
  );

  const sources = document.querySelector("#sources");
  sources.replaceChildren(
    ...(article.sources || []).map((source) => {
      const link = create("a", "source-link");
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.append(create("strong", "", source.title));
      link.append(create("span", "", `${source.source} / ${source.publishedAt || "日付不明"}`));
      return link;
    })
  );

  renderTicker(article);
}

function renderSelectors() {
  const select = document.querySelector("#articleSelect");
  select.replaceChildren(
    ...state.articles.map((article, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = `${formatDate(article.date)} - ${article.title}`;
      return option;
    })
  );
  select.addEventListener("change", (event) => {
    renderArticle(Number(event.target.value));
    document.querySelector("#latest").scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function renderArchive() {
  const grid = document.querySelector("#archiveGrid");
  grid.replaceChildren(
    ...state.articles.map((article, index) => {
      const card = create("article", "archive-card");
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", `${article.title}を読む`);
      card.append(create("time", "", formatDate(article.date)));
      card.append(create("h3", "", article.title));
      card.append(create("p", "", article.dek));
      const open = () => {
        document.querySelector("#articleSelect").value = String(index);
        renderArticle(index);
        document.querySelector("#latest").scrollIntoView({ behavior: "smooth", block: "start" });
      };
      card.addEventListener("click", open);
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      });
      return card;
    })
  );
}

function setupNavigation() {
  const header = document.querySelector(".site-header");
  const menuButton = document.querySelector(".menu-button");
  const mobileNav = document.querySelector("#mobileNav");

  const setHeader = () => {
    header.dataset.elevated = String(window.scrollY > 24);
  };
  setHeader();
  window.addEventListener("scroll", setHeader, { passive: true });

  menuButton.addEventListener("click", () => {
    const expanded = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!expanded));
    mobileNav.hidden = expanded;
  });

  mobileNav.addEventListener("click", (event) => {
    if (event.target.matches("a")) {
      menuButton.setAttribute("aria-expanded", "false");
      mobileNav.hidden = true;
    }
  });
}

await loadArticles();
renderSelectors();
renderArchive();
renderArticle(0);
setupNavigation();
