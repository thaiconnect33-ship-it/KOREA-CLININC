/* Bilibili (B站) 한국 성형/미용 검색 스크래퍼.
 *
 * 외국 IP 로 anonymous 가능 (✅ probe 검증). 中文 K-beauty 콘텐츠 풍부.
 * search.bilibili.com/all?keyword=<query> → 영상 카드 + view + duration 파싱.
 *
 * 산출: data/bilibili_market.json (Lemon8/Pantip 와 동일 schema).
 * 실행: npx tsx scripts/bilibili_market.ts
 */

import { chromium, type Browser } from "playwright";
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT_PATH = path.join(ROOT, "data", "bilibili_market.json");

// 中文 한국 미용/성형 키워드 + 클리닉 브랜드 (한국 클리닉 클레임용).
const TOPICS: { cn: string; th: string }[] = [
  { cn: "韩国整形",       th: "เกาหลีศัลยกรรม" },
  { cn: "韩国双眼皮",     th: "เกาหลีตาสองชั้น" },
  { cn: "韩国鼻整形",     th: "เกาหลีจมูก" },
  { cn: "韩国玻尿酸",     th: "เกาหลีฟิลเลอร์" },
  { cn: "韩国肉毒素",     th: "เกาหลีโบท็อกซ์" },
  { cn: "韩国V线",        th: "เกาหลี V-line" },
  { cn: "韩国瘦脸",       th: "เกาหลีหน้าเรียว" },
  { cn: "韩国吸脂",       th: "เกาหลีดูดไขมัน" },
  { cn: "韩国童颜针",     th: "เกาหลีรีจูแลน" },
  { cn: "韩国水光针",     th: "เกาหลีเรียวจูริน" },
  { cn: "韩国植发",       th: "เกาหลีปลูกผม" },
  { cn: "江南整形",       th: "กังนัมศัลยกรรม" },
  { cn: "首尔整形",       th: "โซลศัลยกรรม" },
  { cn: "Banobagi",       th: "Banobagi" },
  { cn: "ID医院",         th: "ID Hospital" },
  { cn: "JK整形",         th: "JK Plastic Surgery" },
  { cn: "Lienjang",       th: "Lienjang" },
];

type Video = {
  topic: string;
  topic_th: string;
  title: string;
  author: string;
  url: string;
  views: number;
  likes: number;
  duration: string;
};

function log(msg: string) { console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`); }

// "2.7万" → 27000, "9.1万" → 91000, "12.3k" → 12300, "1234" → 1234
function parseChineseCount(text: string): number {
  const t = (text || "").trim();
  const m = t.match(/([\d.]+)\s*([万千wk]?)/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  if (isNaN(n)) return 0;
  const u = m[2].toLowerCase();
  if (u === "万") return Math.round(n * 10_000);
  if (u === "千") return Math.round(n * 1_000);
  if (u === "w") return Math.round(n * 10_000);
  if (u === "k") return Math.round(n * 1_000);
  return Math.round(n);
}

async function scrapeTopic(
  ctx: import("playwright").BrowserContext,
  cn: string,
  th: string,
): Promise<Video[]> {
  const page = await ctx.newPage();
  try {
    const url = `https://search.bilibili.com/all?keyword=${encodeURIComponent(cn)}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForSelector(".bili-video-card, [class*='video-card']", { timeout: 12_000 }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const items = await page.evaluate(() => {
      type Item = { title: string; href: string; author: string; viewsText: string; likesText: string; duration: string };
      const cards = document.querySelectorAll(".bili-video-card");
      const out: Item[] = [];
      const seen = new Set<string>();
      cards.forEach((card) => {
        const a = card.querySelector("a[href*='/video/BV']") as HTMLAnchorElement | null;
        if (!a) return;
        // BV id 만 분리해서 dedup key.
        const m = a.href.match(/\/video\/(BV\w+)/);
        if (!m) return;
        const bvId = m[1];
        if (seen.has(bvId)) return;
        seen.add(bvId);
        const href = `https://www.bilibili.com/video/${bvId}/`;
        // title 은 보통 a.title 또는 card title element.
        const titleEl = card.querySelector(".bili-video-card__info--tit, h3.bili-video-card__info--tit, [class*='info--tit']");
        const title = (titleEl?.textContent || a.title || a.textContent || "").trim().slice(0, 240);
        // author = up name
        const authorEl = card.querySelector(".bili-video-card__info--author, [class*='info--author']");
        const author = (authorEl?.textContent || "").trim().slice(0, 60);
        // views + duration 보통 stats 영역에 함께
        const statsEls = card.querySelectorAll(".bili-video-card__stats span, [class*='stats'] span");
        const stats = Array.from(statsEls).map((el) => el.textContent?.trim() || "").filter(Boolean);
        // Bilibili stats 구조: stats[0]=views, stats[1]=views (중복 노출), stats[2]=likes/댓글
        // 또는 stats[0]=views, stats[1]=댓글 — UI 변형 다양. views=가장 큰 값, likes=가장 작은 nonzero 로 추정.
        const viewsText = stats[0] || "";
        const likesText = stats[2] || stats[1] || "";
        const durationEl = card.querySelector(".bili-video-card__stats__duration, [class*='duration']");
        const duration = (durationEl?.textContent || "").trim();
        out.push({ title, href, author, viewsText, likesText, duration });
      });
      return out;
    });

    const videos: Video[] = items
      .filter((it) => it.title && it.title.length > 3)
      .map((it) => ({
        topic: cn,
        topic_th: th,
        title: it.title,
        author: it.author,
        url: it.href,
        views: parseChineseCount(it.viewsText),
        likes: parseChineseCount(it.likesText),
        duration: it.duration,
      }))
      .slice(0, 25);
    return videos;
  } finally {
    await page.close().catch(() => {});
  }
}

async function main() {
  const browser: Browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const ctx = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36",
    locale: "zh-CN",
  });

  const all: Video[] = [];
  const seenUrl = new Set<string>();
  for (const [i, t] of TOPICS.entries()) {
    log(`(${i + 1}/${TOPICS.length}) ${t.cn}`);
    try {
      const vs = await scrapeTopic(ctx, t.cn, t.th);
      let added = 0;
      for (const v of vs) {
        if (seenUrl.has(v.url)) continue;
        seenUrl.add(v.url);
        all.push(v);
        added++;
      }
      log(`  +${added} (총 ${vs.length} 중 신규)`);
    } catch (e) {
      log(`  ✗ ${e instanceof Error ? e.message : String(e)}`);
    }
    // 6-12s 랜덤 sleep — 같은 keyword 가 search 부담 줄임.
    await new Promise((r) => setTimeout(r, 6_000 + Math.random() * 6_000));
  }
  await browser.close();

  const byTopic = new Map<string, { posts: number; likes: number; views: number }>();
  for (const v of all) {
    const e = byTopic.get(v.topic) ?? { posts: 0, likes: 0, views: 0 };
    e.posts++; e.likes += v.likes; e.views += v.views;
    byTopic.set(v.topic, e);
  }
  const byAuthor = new Map<string, { posts: number; views: number; topics: Set<string> }>();
  for (const v of all) {
    if (!v.author) continue;
    const e = byAuthor.get(v.author) ?? { posts: 0, views: 0, topics: new Set<string>() };
    e.posts++; e.views += v.views; e.topics.add(v.topic);
    byAuthor.set(v.author, e);
  }
  const influencers = Array.from(byAuthor.entries())
    .map(([author, e]) => ({ author, posts: e.posts, total_views: e.views, topics: Array.from(e.topics) }))
    .sort((a, b) => b.total_views - a.total_views)
    .slice(0, 50);

  const output = {
    generated_at: new Date().toISOString(),
    total_videos: all.length,
    total_views: all.reduce((s, v) => s + v.views, 0),
    total_likes: all.reduce((s, v) => s + v.likes, 0),
    topics_searched: TOPICS.length,
    by_topic: Object.fromEntries(byTopic),
    top_influencers: influencers,
    clinic_mentions: [],
    sample_posts: all.sort((a, b) => b.views - a.views).slice(0, 50),
  };
  await fs.writeFile(OUT_PATH, JSON.stringify(output, null, 2), "utf-8");
  log(`완료 — videos ${all.length} / views ${output.total_views.toLocaleString()} → ${path.relative(ROOT, OUT_PATH)}`);
}

main().catch((e) => {
  console.error("[bilibili_market] fatal:", e);
  process.exit(1);
});
