/* Realself.com — 미국 기반 성형 리뷰 사이트.
 *
 * Realself 의 검색 패턴:
 *   https://www.realself.com/search?q=<query>
 *   https://www.realself.com/topic/<slug>
 *
 * 영문 키워드 (Korean + procedure / Seoul + clinic) 로 검색 → 결과 카드 파싱.
 *
 * 산출: data/realself_market.json (다른 _market.json 과 동일 schema).
 * 실행: npx tsx scripts/realself_market.ts
 */

import { chromium, type Browser } from "playwright";
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT_PATH = path.join(ROOT, "data", "realself_market.json");

const TOPICS: { en: string; th: string }[] = [
  { en: "Korean plastic surgery",  th: "ศัลยกรรมเกาหลี" },
  { en: "Korean rhinoplasty",       th: "ทำจมูกเกาหลี" },
  { en: "Korean double eyelid",     th: "ทำตาสองชั้นเกาหลี" },
  { en: "Korean botox",             th: "โบท็อกซ์เกาหลี" },
  { en: "Korean filler",            th: "ฟิลเลอร์เกาหลี" },
  { en: "Seoul plastic surgery",    th: "ศัลยกรรมโซล" },
  { en: "Gangnam plastic surgery",  th: "ศัลยกรรมกังนัม" },
  { en: "Korea facelift",           th: "เกาหลีลิฟต์หน้า" },
  { en: "Korean V-line",            th: "เกาหลี V-line" },
  { en: "Korean jaw surgery",       th: "เกาหลีตัดกราม" },
  { en: "Banobagi review",          th: "Banobagi" },
  { en: "ID Hospital Korea",        th: "ID Hospital" },
  { en: "JK Plastic Surgery Korea", th: "JK Plastic Surgery" },
  { en: "Lienjang Korea",           th: "Lienjang" },
  { en: "Wonjin Korea",             th: "Wonjin" },
];

type Post = {
  topic: string;
  topic_th: string;
  title: string;
  author: string;
  url: string;
  views: number;
  likes: number;
};

function log(msg: string) { console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`); }

async function scrapeTopic(
  ctx: import("playwright").BrowserContext,
  en: string,
  th: string,
): Promise<Post[]> {
  const page = await ctx.newPage();
  try {
    const url = `https://www.realself.com/search?q=${encodeURIComponent(en)}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});

    const items = await page.evaluate(() => {
      const out: { title: string; url: string; author: string }[] = [];
      const seen = new Set<string>();
      // Realself 결과 카드 — 다양한 셀렉터 (페이지 구조 변경에 대비해 lax).
      const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href*='/review/'], a[href*='/question/'], a[href*='/photo/']"));
      for (const a of anchors) {
        const u = a.href;
        if (seen.has(u)) continue;
        seen.add(u);
        const title = (a.textContent || a.getAttribute("title") || "").trim().slice(0, 200);
        if (!title || title.length < 5) continue;
        const card = a.closest("article, li, [class*='card'], [class*='result']") as HTMLElement | null;
        const authorEl = card?.querySelector("[class*='author'], [class*='user'], [class*='name']");
        const author = (authorEl?.textContent || "").trim().slice(0, 60);
        out.push({ title, url: u, author });
      }
      return out.slice(0, 30);
    });

    return items.map((it) => ({
      topic: en,
      topic_th: th,
      title: it.title,
      author: it.author,
      url: it.url,
      views: 0,
      likes: 0,
    }));
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
    locale: "en-US",
  });

  const all: Post[] = [];
  for (const [i, t] of TOPICS.entries()) {
    log(`(${i + 1}/${TOPICS.length}) ${t.en}`);
    try {
      const ps = await scrapeTopic(ctx, t.en, t.th);
      all.push(...ps);
      log(`  +${ps.length}`);
    } catch (e) {
      log(`  ✗ ${e instanceof Error ? e.message : String(e)}`);
    }
    await new Promise((r) => setTimeout(r, 8_000 + Math.random() * 5_000));
  }
  await browser.close();

  const byTopic = new Map<string, { posts: number }>();
  for (const p of all) {
    const e = byTopic.get(p.topic) ?? { posts: 0 };
    e.posts++;
    byTopic.set(p.topic, e);
  }
  const byAuthor = new Map<string, { posts: number; topics: Set<string> }>();
  for (const p of all) {
    if (!p.author) continue;
    const e = byAuthor.get(p.author) ?? { posts: 0, topics: new Set() };
    e.posts++; e.topics.add(p.topic);
    byAuthor.set(p.author, e);
  }
  const influencers = Array.from(byAuthor.entries())
    .map(([author, e]) => ({ author, posts: e.posts, total_likes: 0, topics: Array.from(e.topics) }))
    .sort((a, b) => b.posts - a.posts)
    .slice(0, 50);

  const output = {
    generated_at: new Date().toISOString(),
    total_posts: all.length,
    total_likes: 0,
    topics_searched: TOPICS.length,
    by_topic: Object.fromEntries(byTopic),
    top_influencers: influencers,
    clinic_mentions: [],
    sample_posts: all.slice(0, 50),
  };
  await fs.writeFile(OUT_PATH, JSON.stringify(output, null, 2), "utf-8");
  log(`완료 — ${all.length} posts → ${OUT_PATH}`);
}

main().catch((e) => {
  console.error("[realself_market] fatal:", e);
  process.exit(1);
});
