/* Google web search 결과 수집 — Thai/En 키워드 + 클리닉 브랜드.
 *
 * 산출: data/google_market.json
 * 안전: 쿼리당 15-30s sleep + CAPTCHA 발견 시 빈 배열.
 */

import { chromium, type Browser } from "playwright";
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT_PATH = path.join(ROOT, "data", "google_market.json");

const TOPICS: { en: string; th: string; hl: "en" | "th" }[] = [
  // 영문 글로벌
  { en: "Korean plastic surgery best clinic",  th: "Korean plastic surgery best clinic",  hl: "en" },
  { en: "Korean rhinoplasty review Seoul",      th: "Korean rhinoplasty review Seoul",      hl: "en" },
  { en: "Gangnam plastic surgery review",       th: "Gangnam plastic surgery review",       hl: "en" },
  { en: "Korean skincare clinic review",        th: "Korean skincare clinic review",        hl: "en" },
  // 태국어
  { en: "Korean plastic surgery (Thai)",        th: "รีวิว ศัลยกรรม เกาหลี",                  hl: "th" },
  { en: "Korean dermatology (Thai)",            th: "คลินิก ผิว เกาหลี รีวิว",                hl: "th" },
  { en: "Gangnam clinic Thai",                  th: "กังนัม คลินิก ความงาม รีวิว",            hl: "th" },
  { en: "Korea nose job Thai",                  th: "เสริม จมูก เกาหลี ราคา",                 hl: "th" },
  // 클리닉 브랜드 (영문)
  { en: "Banobagi review",                       th: "Banobagi review",                       hl: "en" },
  { en: "ID Hospital Korea review",              th: "ID Hospital Korea review",              hl: "en" },
  { en: "Lienjang review English",               th: "Lienjang review English",               hl: "en" },
  { en: "JK Plastic Surgery review",             th: "JK Plastic Surgery review",             hl: "en" },
  { en: "Wonjin Plastic Surgery review",         th: "Wonjin Plastic Surgery review",         hl: "en" },
];

type Item = {
  topic: string;
  topic_th: string;
  title: string;
  url: string;
  snippet: string;
  domain: string;
  views: number;
  likes: number;
  author: string;
};

function log(msg: string) { console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`); }

async function searchGoogle(
  ctx: import("playwright").BrowserContext,
  query: string,
  hl: "en" | "th",
): Promise<{ title: string; url: string; snippet: string }[]> {
  const page = await ctx.newPage();
  try {
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=${hl}&num=20`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25_000 });
    const captcha = await page.evaluate(() => /sorry|captcha|unusual traffic/i.test(document.body.innerText || ""));
    if (captcha) return [];
    const items = await page.evaluate(() => {
      const out: { title: string; url: string; snippet: string }[] = [];
      // Google SERP — div.g 가 일반 결과 컨테이너.
      for (const el of Array.from(document.querySelectorAll("div.g, div[data-ved] h3"))) {
        const root = (el.closest("div.g") ?? el) as HTMLElement;
        const h = root.querySelector("h3")?.textContent || "";
        const a = root.querySelector<HTMLAnchorElement>("a[href]")?.href || "";
        if (!h || !a || a.startsWith("/")) continue;
        if (/google\.com|youtube\.com\/results|webcache/i.test(a)) continue;
        const sn = (root.querySelector("[data-sncf], [class*='VwiC'], [data-content-feature]")?.textContent || "").trim().slice(0, 240);
        out.push({ title: h, url: a, snippet: sn });
      }
      // dedup.
      const seen = new Set<string>();
      return out.filter((x) => !seen.has(x.url) && seen.add(x.url));
    });
    return items.slice(0, 20);
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
  });

  const all: Item[] = [];
  let captchas = 0;
  for (const [i, t] of TOPICS.entries()) {
    log(`(${i + 1}/${TOPICS.length}) "${t.th}" [${t.hl}]`);
    try {
      const items = await searchGoogle(ctx, t.th, t.hl);
      if (items.length === 0) captchas++;
      for (const it of items) {
        let domain = "";
        try { domain = new URL(it.url).hostname.replace(/^www\./, ""); } catch { /* skip */ }
        all.push({
          topic: t.en,
          topic_th: t.th,
          title: it.title,
          url: it.url,
          snippet: it.snippet,
          domain,
          views: 0,
          likes: 0,
          author: domain,
        });
      }
      log(`  +${items.length}`);
    } catch (e) {
      log(`  ✗ ${e instanceof Error ? e.message : String(e)}`);
    }
    await new Promise((r) => setTimeout(r, 15_000 + Math.random() * 15_000));
  }
  await browser.close();

  const seen = new Set<string>();
  const dedup = all.filter((x) => x.url && !seen.has(x.url) && seen.add(x.url));

  const byTopic = new Map<string, { posts: number }>();
  for (const p of dedup) {
    const e = byTopic.get(p.topic) ?? { posts: 0 };
    e.posts++; byTopic.set(p.topic, e);
  }
  const byDomain = new Map<string, { posts: number; topics: Set<string> }>();
  for (const p of dedup) {
    if (!p.domain) continue;
    const e = byDomain.get(p.domain) ?? { posts: 0, topics: new Set() };
    e.posts++; e.topics.add(p.topic);
    byDomain.set(p.domain, e);
  }
  const influencers = Array.from(byDomain.entries())
    .map(([author, e]) => ({ author, posts: e.posts, total_likes: 0, topics: Array.from(e.topics) }))
    .sort((a, b) => b.posts - a.posts)
    .slice(0, 50);

  const output = {
    generated_at: new Date().toISOString(),
    total_posts: dedup.length,
    total_likes: 0,
    topics_searched: TOPICS.length,
    captcha_hits: captchas,
    by_topic: Object.fromEntries(byTopic),
    top_influencers: influencers,
    clinic_mentions: [],
    sample_posts: dedup.slice(0, 50),
  };
  await fs.writeFile(OUT_PATH, JSON.stringify(output, null, 2), "utf-8");
  log(`완료 — ${dedup.length} results, ${captchas} captchas → ${OUT_PATH}`);
}

main().catch((e) => {
  console.error("[google_market] fatal:", e);
  process.exit(1);
});
