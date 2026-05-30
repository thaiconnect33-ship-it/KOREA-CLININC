/* Naver Blog 한국 클리닉 후기 검색 스크래퍼.
 *
 * 외국 IP 로 anonymous 가능. 한국 K-beauty 사용자 직접 후기 풍부 — 클리닉 클레임용
 * 진성 데이터 (한국 클리닉 입장에선 가장 신뢰도 높은 source).
 *
 * search.naver.com/search.naver?where=blog&query=<query> → 22개 카드 (api_subject_bx).
 *
 * 산출: data/naver_blog_market.json (Lemon8/Pantip 와 동일 schema).
 * 실행: npx tsx scripts/naver_blog_market.ts
 */

import { chromium, type Browser } from "playwright";
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT_PATH = path.join(ROOT, "data", "naver_blog_market.json");

// 한국 K-beauty/성형 + 주요 클리닉 브랜드. 정밀 키워드로 광고 사이트 false match 줄임.
const TOPICS: { ko: string; en: string }[] = [
  { ko: "강남 성형외과 후기",   en: "Gangnam plastic surgery review" },
  { ko: "압구정 성형외과 후기", en: "Apgujeong plastic surgery review" },
  { ko: "강남 피부과 후기",     en: "Gangnam dermatology review" },
  { ko: "양악수술 후기",        en: "jaw surgery review" },
  { ko: "코수술 후기 강남",     en: "rhinoplasty Gangnam review" },
  { ko: "쌍꺼풀 후기 강남",     en: "double eyelid Gangnam review" },
  { ko: "안검하수 수술 후기",   en: "ptosis surgery review" },
  { ko: "리프팅 후기 강남",     en: "lifting Gangnam review" },
  { ko: "필러 후기 강남",       en: "filler Gangnam review" },
  { ko: "보톡스 후기 강남",     en: "botox Gangnam review" },
  // 브랜드 + "후기" — 진성 후기 위주.
  { ko: "아이디병원 후기",      en: "ID Hospital review" },
  { ko: "JK성형외과 후기",      en: "JK Plastic Surgery review" },
  { ko: "바노바기 후기",        en: "Banobagi review" },
  { ko: "리엔장 후기",          en: "Lienjang review" },
  { ko: "원진성형외과 후기",    en: "Wonjin Plastic Surgery review" },
  { ko: "그랜드성형외과 후기",  en: "Grand Plastic Surgery review" },
  { ko: "BK 성형외과 후기",     en: "BK Plastic Surgery review" },
  { ko: "뷰성형외과 후기",      en: "View Plastic Surgery review" },
];

type Post = {
  topic: string;
  topic_en: string;
  title: string;
  author: string;
  url: string;
  snippet: string;
  date: string;
  views: number;
  likes: number;
};

function log(msg: string) { console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`); }

async function scrapeTopic(
  ctx: import("playwright").BrowserContext,
  ko: string,
  en: string,
): Promise<Post[]> {
  const page = await ctx.newPage();
  try {
    const url = `https://search.naver.com/search.naver?where=blog&query=${encodeURIComponent(ko)}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForSelector("div.api_subject_bx, li.bx", { timeout: 10_000 }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 4_000 }).catch(() => {});
    await page.waitForTimeout(1000);

    const items = await page.evaluate(() => {
      type Item = { title: string; href: string; author: string; snippet: string; date: string };
      const out: Item[] = [];
      const seen = new Set<string>();
      // Naver 2025 UI: 실 결과는 div.sds-comps-vertical-layout.fds-ugc-* wrapper.
      // 검색결과 카드 selector 가 자주 바뀌므로 blog.naver.com link 직접 iterate +
      // nav/광고 패턴은 closest() 로 skip.
      const blogAnchors = Array.from(document.querySelectorAll<HTMLAnchorElement>(
        "a[href*='blog.naver.com']:not([href*='ader.naver']):not([href*='ads.naver'])"
      ));
      for (const a of blogAnchors) {
        // nav menu / login link / footer 등 skip.
        if (a.closest('.gnb_my_li, .gnb_first, [class*="gnb_"], header, footer, nav')) continue;
        const href = a.href.split("?")[0];
        // 실 blog post URL pattern: blog.naver.com/<id>/<articleNo>
        if (!/blog\.naver\.com\/[\w-]+\/\d+/.test(href)) continue;
        if (seen.has(href)) continue;
        seen.add(href);
        // wrapper = 가장 가까운 결과 카드 (vertical layout container).
        const wrapper = a.closest(
          '[class*="fds-ugc"], [class*="sds-comps-vertical-layout"], li.bx, div.api_subject_bx, article'
        ) as HTMLElement | null;
        // 제목: a 의 textContent 가 보통 제목 (또는 wrapper 내 별도 title element).
        let title = (a.textContent || "").trim();
        if (title.length < 4 && wrapper) {
          const titleEl = wrapper.querySelector(".title_link, [class*='title'] a, h3, [role='heading']") as HTMLElement | null;
          if (titleEl) title = titleEl.textContent?.trim() || title;
        }
        title = title.slice(0, 200);
        if (!title || title.length < 4) continue;
        // 본문 발췌
        const snippetEl = wrapper?.querySelector(".dsc_link, .api_txt_lines.dsc_txt, [class*='dsc'], [class*='desc']") as HTMLElement | null;
        const snippet = (snippetEl?.textContent || "").trim().slice(0, 300);
        // 작성자 (블로그 id 추출: blog.naver.com/<id>/...)
        const idMatch = href.match(/blog\.naver\.com\/([\w-]+)\//);
        let author = idMatch ? idMatch[1] : "";
        const authorEl = wrapper?.querySelector(".sub_name, [class*='name'], [class*='author']") as HTMLElement | null;
        if (authorEl) {
          const t = authorEl.textContent?.trim();
          if (t && t.length > 0 && t.length < 60) author = t;
        }
        // 날짜
        const dateEl = wrapper?.querySelector(".sub_time, [class*='date'], time") as HTMLElement | null;
        const date = (dateEl?.textContent || "").trim();
        out.push({ title, href, author: author.slice(0, 60), snippet, date });
      }
      return out;
    });

    return items
      .map((it) => ({
        topic: ko,
        topic_en: en,
        title: it.title,
        author: it.author,
        url: it.href,
        snippet: it.snippet,
        date: it.date,
        views: 0,
        likes: 0,
      }))
      .slice(0, 25);
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
    locale: "ko-KR",
  });

  const all: Post[] = [];
  const seenUrl = new Set<string>();
  for (const [i, t] of TOPICS.entries()) {
    log(`(${i + 1}/${TOPICS.length}) ${t.ko}`);
    try {
      const ps = await scrapeTopic(ctx, t.ko, t.en);
      let added = 0;
      for (const p of ps) {
        if (seenUrl.has(p.url)) continue;
        seenUrl.add(p.url);
        all.push(p);
        added++;
      }
      log(`  +${added}`);
    } catch (e) {
      log(`  ✗ ${e instanceof Error ? e.message : String(e)}`);
    }
    await new Promise((r) => setTimeout(r, 5_000 + Math.random() * 5_000));
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
    const e = byAuthor.get(p.author) ?? { posts: 0, topics: new Set<string>() };
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
  log(`완료 — posts ${all.length} → ${path.relative(ROOT, OUT_PATH)}`);
}

main().catch((e) => {
  console.error("[naver_blog_market] fatal:", e);
  process.exit(1);
});
