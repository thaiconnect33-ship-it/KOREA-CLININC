/* 샤오홍수 URL → 페이지 fetch + parse.
 *
 * 입력:
 *   - data/xhs_url_queue.json  (xhs_google_seed.ts 가 생성)
 *   - data/xhs_seeds.json      (사용자 수동 dump)
 *
 * 출력: data/xiaohongshu_market.json  (Lemon8/Pantip 와 동일 schema → ClinicDetail 자동 표시)
 *
 * 60-90s delay 로 천천히 fetch. China IP 없으면 대다수 실패 → ok 만 저장.
 */

import { chromium, type Browser } from "playwright";
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const QUEUE_PATH = path.join(ROOT, "data", "xhs_url_queue.json");
const SEEDS_PATH = path.join(ROOT, "data", "xhs_seeds.json");
const OUT_PATH = path.join(ROOT, "data", "xiaohongshu_market.json");

type QueueItem = { url: string; query?: string };
type ParsedPost = {
  url: string;
  title: string;
  author: string;
  likes: number;
  topic: string;
  topic_th: string;
  views: number;
};

function log(msg: string) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

async function loadQueue(): Promise<QueueItem[]> {
  const out: QueueItem[] = [];
  try {
    const q = JSON.parse(await fs.readFile(QUEUE_PATH, "utf-8")) as { urls: QueueItem[] };
    out.push(...(q.urls || []));
  } catch { /* skip */ }
  try {
    const s = JSON.parse(await fs.readFile(SEEDS_PATH, "utf-8")) as { seeds: { url: string }[] };
    for (const x of s.seeds || []) {
      if (x.url) out.push({ url: x.url, query: "manual" });
    }
  } catch { /* skip */ }
  // dedup by url.
  const seen = new Set<string>();
  return out.filter((x) => x.url && !seen.has(x.url) && seen.add(x.url));
}

function parseCount(s: string): number {
  const m = (s || "").trim().match(/([\d.]+)([wkW万千]?)/);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  if (isNaN(n)) return 0;
  const u = m[2].toLowerCase();
  if (u === "w" || u === "万") return Math.round(n * 10_000);
  if (u === "k" || u === "千") return Math.round(n * 1_000);
  return Math.round(n);
}

async function fetchOne(
  ctx: import("playwright").BrowserContext,
  url: string,
  query: string,
): Promise<ParsedPost | null> {
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25_000 });
    await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});

    // 막혔는지 — login wall / "请登录" 감지.
    const blocked = await page.evaluate(() =>
      /请登录|登录后查看|验证码|出错了|访问受限/i.test(document.body.innerText || "")
    );
    if (blocked) return null;

    const data = await page.evaluate(() => {
      const title = (document.querySelector("meta[property='og:title']")?.getAttribute("content")
        || document.querySelector("h1, .note-title, [class*='title']")?.textContent
        || document.title || "").trim().slice(0, 240);
      const author = (document.querySelector("meta[property='og:author']")?.getAttribute("content")
        || document.querySelector("[class*='user-name'], [class*='author-name'], [class*='nick']")?.textContent
        || "").trim().slice(0, 60);
      const likeEl = document.querySelector("[class*='like-count'], [class*='likes-count'], [data-test='like']");
      const likes = (likeEl?.textContent || "").trim();
      return { title, author, likes };
    });
    if (!data.title || data.title.length < 3) return null;

    return {
      url,
      title: data.title,
      author: data.author,
      likes: parseCount(data.likes),
      topic: query,
      topic_th: query,
      views: 0,
    };
  } catch {
    return null;
  } finally {
    await page.close().catch(() => {});
  }
}

async function main() {
  const queue = await loadQueue();
  log(`큐: ${queue.length} URL`);
  if (queue.length === 0) {
    log("큐가 비어있음 — xhs_google_seed.ts 먼저 돌리거나 xhs_seeds.json 에 URL 추가");
    return;
  }

  const browser: Browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const ctx = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36",
    locale: "zh-CN",
  });

  const posts: ParsedPost[] = [];
  let blocked = 0;
  for (const [i, q] of queue.entries()) {
    log(`(${i + 1}/${queue.length}) ${q.url}`);
    const p = await fetchOne(ctx, q.url, q.query || "manual");
    if (p) {
      posts.push(p);
      log(`  ✓ "${p.title.slice(0, 50)}" ♥${p.likes}`);
    } else {
      blocked++;
      log(`  ✗ blocked`);
    }
    const baseSleep = parseInt(process.env.XHS_FETCH_SLEEP_MS || "60000", 10);
    const jitter = parseInt(process.env.XHS_FETCH_JITTER_MS || "30000", 10);
    const sleep = baseSleep + Math.floor(Math.random() * jitter);
    await new Promise((r) => setTimeout(r, sleep));
  }
  await browser.close();

  // 집계.
  const byTopic = new Map<string, { posts: number; likes: number }>();
  for (const p of posts) {
    const e = byTopic.get(p.topic) ?? { posts: 0, likes: 0 };
    e.posts++; e.likes += p.likes;
    byTopic.set(p.topic, e);
  }
  const byAuthor = new Map<string, { posts: number; likes: number; topics: Set<string> }>();
  for (const p of posts) {
    if (!p.author) continue;
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
    total_posts: posts.length,
    total_likes: posts.reduce((s, p) => s + p.likes, 0),
    blocked_count: blocked,
    by_topic: Object.fromEntries(byTopic),
    top_influencers: influencers,
    clinic_mentions: [],   // 매칭은 ClinicDetail 의 loadClinicReviews 가 sample_posts 에서 직접 처리.
    sample_posts: posts.sort((a, b) => b.likes - a.likes).slice(0, 50),
  };
  await fs.writeFile(OUT_PATH, JSON.stringify(output, null, 2), "utf-8");
  log(`완료 — ok ${posts.length} / blocked ${blocked} → ${OUT_PATH}`);
}

main().catch((e) => {
  console.error("[xhs_fetch] fatal:", e);
  process.exit(1);
});
