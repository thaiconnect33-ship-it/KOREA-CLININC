/* Reddit — old.reddit.com HTML 스크래핑 (Playwright).
 *
 * 2023 이후 .json 엔드포인트가 anonymous 차단됨 (403).
 * old.reddit.com 의 검색 결과 HTML 은 anonymous 로도 노출됨 → Playwright 로 파싱.
 *
 * 산출: data/reddit_market.json
 */

import { chromium, type Browser } from "playwright";
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT_PATH = path.join(ROOT, "data", "reddit_market.json");

const SUBREDDITS = ["PlasticSurgery", "AsianBeauty", "30PlusSkincare", "SkincareAddiction", "korea", "koreatravel"];
const TOPICS: { en: string; th: string }[] = [
  { en: "Korean plastic surgery",   th: "ศัลยกรรมเกาหลี" },
  { en: "Korean rhinoplasty",        th: "ทำจมูกเกาหลี" },
  { en: "Korean double eyelid",      th: "ทำตาสองชั้นเกาหลี" },
  { en: "Korean skincare",            th: "ดูแลผิวเกาหลี" },
  { en: "Seoul plastic surgery",     th: "ศัลยกรรมโซล" },
  { en: "Gangnam clinic",            th: "คลินิกกังนัม" },
  { en: "Korea filler",              th: "ฟิลเลอร์เกาหลี" },
  { en: "Korea botox",               th: "โบท็อกซ์เกาหลี" },
  { en: "Korean V-line",              th: "เกาหลี V-line" },
  { en: "Korea hair transplant",     th: "ปลูกผมเกาหลี" },
];
const CLINIC_BRANDS = ["Banobagi", "ID Hospital", "JK Plastic Surgery", "Lienjang", "Wonjin", "BK Plastic"];

type Post = {
  topic: string;
  topic_th: string;
  title: string;
  author: string;
  subreddit: string;
  score: number;
  comments: number;
  url: string;
  views: number;
  likes: number;
};

function log(msg: string) { console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`); }

async function searchOldReddit(
  ctx: import("playwright").BrowserContext,
  query: string,
  subreddit: string | null,
): Promise<{ title: string; url: string; author: string; subreddit: string; score: number; comments: number }[]> {
  const page = await ctx.newPage();
  try {
    const url = subreddit
      ? `https://old.reddit.com/r/${subreddit}/search?q=${encodeURIComponent(query)}&restrict_sr=on&sort=relevance&t=year`
      : `https://old.reddit.com/search?q=${encodeURIComponent(query)}&sort=relevance&t=year`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25_000 });
    // Reddit rate-limit interstitial?
    const blocked = await page.evaluate(() => /try again|rate limit|too many requests/i.test(document.body.innerText));
    if (blocked) return [];

    const items = await page.evaluate(() => {
      const out: { title: string; url: string; author: string; subreddit: string; score: number; comments: number }[] = [];
      const things = Array.from(document.querySelectorAll(".search-result, .thing[data-fullname]"));
      for (const t of things) {
        const titleEl = t.querySelector("a.search-title, a.title") as HTMLAnchorElement | null;
        const title = (titleEl?.textContent || "").trim();
        const url = titleEl?.href || "";
        if (!title || !url) continue;
        const authorEl = t.querySelector(".search-author a, a.author");
        const author = (authorEl?.textContent || "").trim();
        const subEl = t.querySelector(".search-subreddit-link, a[href*='/r/']");
        let sub = "";
        const subText = (subEl?.textContent || "");
        const subMatch = subText.match(/r\/(\w+)/) || (subEl as HTMLAnchorElement | null)?.href?.match(/\/r\/(\w+)/);
        if (subMatch) sub = subMatch[1];
        const scoreEl = t.querySelector(".search-score, .score.unvoted");
        const score = parseInt((scoreEl?.textContent || "0").replace(/[^\d-]/g, ""), 10) || 0;
        const commentsEl = t.querySelector(".search-comments, a.comments");
        const comments = parseInt((commentsEl?.textContent || "0").replace(/[^\d]/g, ""), 10) || 0;
        out.push({ title: title.slice(0, 240), url, author, subreddit: sub, score, comments });
      }
      return out.slice(0, 25);
    });
    return items;
  } finally {
    await page.close().catch(() => {});
  }
}

async function main() {
  const queries: { q: string; sub?: string; topic: { en: string; th: string } }[] = [];
  for (const t of TOPICS) queries.push({ q: t.en, topic: t });
  for (const sub of SUBREDDITS) queries.push({ q: "Korean", sub, topic: { en: `r/${sub} Korea`, th: `r/${sub} เกาหลี` } });
  for (const b of CLINIC_BRANDS) queries.push({ q: b, topic: { en: b, th: b } });

  log(`쿼리 ${queries.length}개`);
  const browser: Browser = await chromium.launch({ headless: true, args: ["--disable-blink-features=AutomationControlled"] });
  const ctx = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36",
    locale: "en-US",
  });

  const all: Post[] = [];
  for (const [i, q] of queries.entries()) {
    log(`(${i + 1}/${queries.length}) "${q.q}"${q.sub ? ` r/${q.sub}` : ""}`);
    try {
      const items = await searchOldReddit(ctx, q.q, q.sub || null);
      for (const it of items) {
        all.push({
          topic: q.topic.en,
          topic_th: q.topic.th,
          title: it.title,
          author: it.author,
          subreddit: it.subreddit,
          score: it.score,
          comments: it.comments,
          url: it.url,
          views: 0,
          likes: it.score,
        });
      }
      log(`  +${items.length}`);
    } catch (e) {
      log(`  ✗ ${e instanceof Error ? e.message : String(e)}`);
    }
    await new Promise((r) => setTimeout(r, 5_000 + Math.random() * 5_000));
  }
  await browser.close();

  const seen = new Set<string>();
  const dedup = all.filter((p) => p.url && !seen.has(p.url) && seen.add(p.url));

  const byTopic = new Map<string, { posts: number; likes: number; comments: number }>();
  for (const p of dedup) {
    const e = byTopic.get(p.topic) ?? { posts: 0, likes: 0, comments: 0 };
    e.posts++; e.likes += p.likes; e.comments += p.comments;
    byTopic.set(p.topic, e);
  }
  const byAuthor = new Map<string, { posts: number; likes: number; topics: Set<string> }>();
  for (const p of dedup) {
    if (!p.author || p.author === "[deleted]") continue;
    const e = byAuthor.get(p.author) ?? { posts: 0, likes: 0, topics: new Set() };
    e.posts++; e.likes += p.likes; e.topics.add(p.topic);
    byAuthor.set(p.author, e);
  }
  const influencers = Array.from(byAuthor.entries())
    .map(([author, e]) => ({ author, posts: e.posts, total_likes: e.likes, topics: Array.from(e.topics) }))
    .sort((a, b) => b.total_likes - a.total_likes)
    .slice(0, 50);

  const output = {
    generated_at: new Date().toISOString(),
    total_posts: dedup.length,
    total_likes: dedup.reduce((s, p) => s + p.likes, 0),
    topics_searched: queries.length,
    by_topic: Object.fromEntries(byTopic),
    top_influencers: influencers,
    clinic_mentions: [],
    sample_posts: dedup.sort((a, b) => b.likes - a.likes).slice(0, 50),
  };
  await fs.writeFile(OUT_PATH, JSON.stringify(output, null, 2), "utf-8");
  log(`완료 — ${dedup.length} posts → ${OUT_PATH}`);
}

main().catch((e) => { console.error("[reddit_market] fatal:", e); process.exit(1); });
