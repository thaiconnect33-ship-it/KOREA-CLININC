/* Pantip Thai 시장 인텔리전스 — 태국어 한국 K-beauty 키워드로 Pantip 검색.
 *
 * 산출: data/pantip_market.json
 * 실행: npx tsx scripts/pantip_market.ts
 */

import { chromium, type Browser } from "playwright";
import { promises as fs } from "node:fs";
import path from "node:path";

type Post = {
  topic: string;
  topic_th: string;
  title: string;
  author: string;
  room: string;          // 포럼 카테고리 (예: 사이/Camera/Sukhumvit)
  views: number;
  comments: number;
  url: string;
};

const TOPICS: { th: string; en: string }[] = [
  { th: "ศัลยกรรมเกาหลี",        en: "Korean plastic surgery" },
  { th: "คลินิกความงามเกาหลี",   en: "Korean beauty clinic" },
  { th: "หมอเกาหลี",             en: "Korean doctor" },
  { th: "ทำหน้าเกาหลี",          en: "Korean face surgery" },
  { th: "ทำตาสองชั้นเกาหลี",     en: "Korean double eyelid" },
  { th: "ทำจมูกเกาหลี",          en: "Korean nose job" },
  { th: "เสริมจมูกเกาหลี",       en: "Korean nose augmentation" },
  { th: "ฟิลเลอร์เกาหลี",        en: "Korean filler" },
  { th: "โบท็อกซ์เกาหลี",        en: "Korean botox" },
  { th: "ผิวเกาหลี",              en: "Korean skin" },
  { th: "เคบิวตี้",                en: "K-beauty" },
  { th: "ไปเกาหลีทำหน้า",        en: "Korea trip face surgery" },
  { th: "รีวิวเกาหลี",             en: "Korea review" },
  { th: "ดูแลผิวเกาหลี",          en: "Korean skincare" },
  { th: "ปลูกผมเกาหลี",          en: "Korean hair transplant" },
  { th: "เลเซอร์เกาหลี",          en: "Korean laser" },
  { th: "ดูดไขมันเกาหลี",         en: "Korean liposuction" },
  { th: "รักษาสิวเกาหลี",         en: "Korean acne treatment" },
  { th: "กังนัม",                  en: "Gangnam" },
  { th: "กังนัมศัลยกรรม",         en: "Gangnam plastic surgery" },
  { th: "อัปกุจอง",                en: "Apgujeong" },
  { th: "ชองดัม",                  en: "Cheongdam" },
  { th: "เมียงดง",                 en: "Myeongdong" },
  { th: "รีจูรัน",                 en: "Rejuran" },
  { th: "เอ็กโซโซม",              en: "Exosome" },
  { th: "สแตมเซลล์",              en: "Stem cell" },
  { th: "อินโหมด",                 en: "Inmode" },
  { th: "ผิวกระจก",                en: "Glass skin" },
  { th: "ผิวขาวเกาหลี",           en: "Korean white skin" },
  { th: "ทริปเกาหลีความงาม",     en: "Korea beauty trip" },
];

// ── 클리닉 이름 매칭 (lemon8_market.ts 와 동일 로직) ──────────────────
const STOP_BRANDS = new Set([
  "the", "best", "new", "one", "real", "view", "ami", "fresh", "global", "grand",
  "namu", "marble", "fortune", "evita", "april", "tellus",
]);

async function loadClinicTokens(): Promise<{ token: string; canonical: string; kind: "ko" | "en" }[]> {
  const seeds: { en?: string; ko?: string }[] = [];
  for (const f of ["seed.json", "seed_discovered.json"]) {
    try {
      const raw = await fs.readFile(path.join(process.cwd(), "data", f), "utf-8");
      seeds.push(...(JSON.parse(raw) as { en?: string; ko?: string }[]));
    } catch { /* skip */ }
  }
  const stop = /(\s+(plastic surgery|plastic|surgery|clinic|hospital|dermatology|skin care|skin|medical|center|korea|seoul|international)\b)/gi;
  const out = new Map<string, { canonical: string; kind: "ko" | "en" }>();
  for (const s of seeds) {
    if (s.ko && /[가-힯]/.test(s.ko)) {
      const trimmed = s.ko.replace(/(성형외과|의원|피부과|클리닉|병원|성형|피부)$/g, "").trim();
      if (trimmed.length >= 4) out.set(trimmed, { canonical: s.ko, kind: "ko" });
    }
    if (s.en) {
      const lower = s.en.toLowerCase();
      const brand = lower.replace(stop, "").trim();
      if (brand.length >= 5 && !STOP_BRANDS.has(brand)) {
        out.set(brand, { canonical: s.en, kind: "en" });
      }
    }
  }
  return Array.from(out.entries()).map(([token, v]) => ({ token, ...v }));
}

function detectClinicMentions(text: string, tokens: { token: string; canonical: string; kind: "ko" | "en" }[]): string[] {
  const lower = text.toLowerCase();
  const hits = new Set<string>();
  for (const t of tokens) {
    if (t.kind === "ko") {
      if (text.includes(t.token)) hits.add(t.canonical);
    } else {
      const re = new RegExp(`\\b${t.token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (re.test(lower)) hits.add(t.canonical);
    }
  }
  return Array.from(hits);
}

function log(msg: string) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

async function scrapePantipTopic(
  ctx: import("playwright").BrowserContext,
  topicTh: string,
  topicEn: string,
): Promise<Post[]> {
  const page = await ctx.newPage();
  try {
    const url = `https://pantip.com/search?q=${encodeURIComponent(topicTh)}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25_000 });
    await page.waitForSelector("a[href*='/topic/']", { timeout: 10_000 }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});

    const items = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll("a[href*='/topic/']")) as HTMLAnchorElement[];
      const seen = new Set<string>();
      const out: { title: string; href: string; parentText: string }[] = [];
      for (const a of anchors) {
        const m = a.href.match(/\/topic\/(\d{5,})/);
        if (!m) continue;
        const id = m[1];
        if (seen.has(id)) continue;
        seen.add(id);
        const title = (a.textContent || a.getAttribute("title") || "").trim().slice(0, 200);
        const parent = a.closest("li, article, [class*='item'], [class*='card']") as HTMLElement | null;
        const parentText = (parent?.innerText || "").slice(0, 600);
        out.push({ title, href: `https://pantip.com/topic/${id}`, parentText });
      }
      return out;
    });

    const posts: Post[] = [];
    for (const it of items) {
      // 부모 텍스트에서 view/comment/author/room 추출 (Pantip 검색결과 카드 패턴).
      const viewsM = it.parentText.match(/([\d,]+)\s*view/i);
      const commentsM = it.parentText.match(/([\d,]+)\s*(comment|ความเห็น)/i);
      const authorM = it.parentText.match(/(?:by|โดย)\s+([^\s•|·\n]{1,40})/i);
      const roomM = it.parentText.match(/(?:ห้อง|room)\s*:?\s*([^\n•|·]{1,30})/i);
      posts.push({
        topic: topicEn,
        topic_th: topicTh,
        title: it.title,
        author: authorM?.[1]?.trim() ?? "",
        room: roomM?.[1]?.trim() ?? "",
        views: viewsM ? parseInt(viewsM[1].replace(/,/g, ""), 10) : 0,
        comments: commentsM ? parseInt(commentsM[1].replace(/,/g, ""), 10) : 0,
        url: it.href,
      });
    }
    return posts;
  } finally {
    await page.close().catch(() => {});
  }
}

async function main() {
  const tokens = await loadClinicTokens();
  log(`로드: ${tokens.length} 한국 클리닉 토큰 (brand-only)`);

  const browser: Browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const ctx = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36",
    locale: "th-TH",
    extraHTTPHeaders: { "accept-language": "th,en;q=0.9" },
  });

  const allPosts: Post[] = [];
  for (const [i, t] of TOPICS.entries()) {
    log(`(${i + 1}/${TOPICS.length}) ${t.th} (${t.en})`);
    try {
      const posts = await scrapePantipTopic(ctx, t.th, t.en);
      allPosts.push(...posts);
      log(`  +${posts.length} 스레드`);
    } catch (e) {
      log(`  ✗ 실패: ${e instanceof Error ? e.message : String(e)}`);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  await browser.close();

  // 토픽별 집계.
  const byTopic = new Map<string, { posts: number; views: number; comments: number }>();
  for (const p of allPosts) {
    const e = byTopic.get(p.topic) ?? { posts: 0, views: 0, comments: 0 };
    e.posts++; e.views += p.views; e.comments += p.comments;
    byTopic.set(p.topic, e);
  }

  // 인플루언서 (author 단위).
  const byAuthor = new Map<string, { posts: number; views: number; topics: Set<string> }>();
  for (const p of allPosts) {
    if (!p.author) continue;
    const e = byAuthor.get(p.author) ?? { posts: 0, views: 0, topics: new Set() };
    e.posts++; e.views += p.views; e.topics.add(p.topic);
    byAuthor.set(p.author, e);
  }
  const influencers = Array.from(byAuthor.entries())
    .map(([author, e]) => ({ author, posts: e.posts, total_views: e.views, topics: Array.from(e.topics) }))
    .sort((a, b) => b.total_views - a.total_views)
    .slice(0, 50);

  // 한국 클리닉 mention 감지.
  const clinicMentions = new Map<string, { count: number; samples: { url: string; snippet: string }[] }>();
  for (const p of allPosts) {
    const text = `${p.title} ${p.author}`;
    for (const name of detectClinicMentions(text, tokens)) {
      const e = clinicMentions.get(name) ?? { count: 0, samples: [] };
      e.count++;
      if (e.samples.length < 5) e.samples.push({ url: p.url, snippet: text.slice(0, 200) });
      clinicMentions.set(name, e);
    }
  }
  const mentions = Array.from(clinicMentions.entries())
    .map(([name, e]) => ({ name, mention_count: e.count, samples: e.samples }))
    .sort((a, b) => b.mention_count - a.mention_count);

  const output = {
    generated_at: new Date().toISOString(),
    total_posts: allPosts.length,
    total_views: allPosts.reduce((s, p) => s + p.views, 0),
    topics_searched: TOPICS.length,
    by_topic: Object.fromEntries(byTopic),
    top_influencers: influencers,
    clinic_mentions: mentions,
    sample_posts: allPosts.sort((a, b) => b.views - a.views).slice(0, 30),
  };
  const outPath = path.join(process.cwd(), "data", "pantip_market.json");
  await fs.writeFile(outPath, JSON.stringify(output, null, 2), "utf-8");
  log(`완료 — ${allPosts.length} 스레드, ${output.total_views.toLocaleString()} views, ${influencers.length} 인플루언서, ${mentions.length} 클리닉 mention → ${outPath}`);
}

main().catch((e) => {
  console.error("[pantip_market] fatal:", e);
  process.exit(1);
});
