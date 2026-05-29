/* YouTube Thai 시장 인텔리전스 — 태국어 한국 K-beauty 키워드로 YouTube 검색.
 *
 * 산출: data/youtube_market.json
 * 실행: npx tsx scripts/youtube_market.ts
 */

import { chromium, type Browser } from "playwright";
import { promises as fs } from "node:fs";
import path from "node:path";

type Video = {
  topic: string;
  topic_th: string;
  title: string;
  channel: string;
  view_text: string;
  views: number;
  url: string;
};

const TOPICS: { th: string; en: string }[] = [
  { th: "ศัลยกรรมเกาหลี",        en: "Korean plastic surgery" },
  { th: "ทำตาสองชั้นเกาหลี",     en: "Korean double eyelid" },
  { th: "ทำจมูกเกาหลี",          en: "Korean nose job" },
  { th: "เสริมจมูกเกาหลี",       en: "Korean nose augmentation" },
  { th: "ฟิลเลอร์เกาหลี",        en: "Korean filler" },
  { th: "โบท็อกซ์เกาหลี",        en: "Korean botox" },
  { th: "หมอเกาหลี",             en: "Korean doctor" },
  { th: "ไปเกาหลีทำหน้า",        en: "Korea trip face surgery" },
  { th: "รีวิวเกาหลี ความงาม",   en: "Korea beauty review" },
  { th: "ผิวเกาหลี",              en: "Korean skin" },
  { th: "ดูแลผิวเกาหลี",          en: "Korean skincare" },
  { th: "เคบิวตี้",                en: "K-beauty" },
  { th: "ปลูกผมเกาหลี",          en: "Korean hair transplant" },
  { th: "ดูดไขมันเกาหลี",         en: "Korean liposuction" },
  { th: "ลดน้ำหนักเกาหลี",       en: "Korean weight loss" },
  { th: "รีจูรันเกาหลี",           en: "Korean rejuran" },
  { th: "เอ็กโซโซมเกาหลี",       en: "Korean exosome" },
  { th: "สแตมเซลล์เกาหลี",       en: "Korean stem cell" },
  { th: "อินโหมดเกาหลี",          en: "Korean inmode" },
  { th: "ลิฟต์หน้าเกาหลี",         en: "Korean facelift" },
  { th: "กังนัม ศัลยกรรม",        en: "Gangnam plastic surgery" },
  { th: "อัปกุจอง ความงาม",      en: "Apgujeong beauty" },
  { th: "ทริปเกาหลีความงาม",     en: "Korea beauty trip" },
  { th: "เซลฟี่เกาหลี",            en: "Korea selfie" },
  { th: "เมคอัพเกาหลี",           en: "Korean makeup" },
];

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

function parseViewCount(text: string): number {
  const t = text.trim().toLowerCase().replace(/[,\s]/g, "");
  const m = t.match(/([\d.]+)([kmb หมื่นแสนล้านพันหมื่]?)/);
  if (!m) return 0;
  const num = parseFloat(m[1]);
  if (isNaN(num)) return 0;
  const unit = m[2];
  if (unit === "k" || unit === "พัน") return Math.round(num * 1_000);
  if (unit === "m" || unit === "ล้าน") return Math.round(num * 1_000_000);
  if (unit === "b") return Math.round(num * 1_000_000_000);
  if (unit === "หมื่น") return Math.round(num * 10_000);
  if (unit === "แสน") return Math.round(num * 100_000);
  return Math.round(num);
}

function log(msg: string) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

async function scrapeYoutubeTopic(
  ctx: import("playwright").BrowserContext,
  topicTh: string,
  topicEn: string,
): Promise<Video[]> {
  const page = await ctx.newPage();
  try {
    await ctx.addCookies([{ name: "CONSENT", value: "YES+", domain: ".youtube.com", path: "/" }]);
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(topicTh)}&sp=EgIQAQ%253D%253D`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    try {
      await page.waitForSelector("ytd-video-renderer", { timeout: 12_000 });
    } catch {
      return [];
    }
    // 스크롤로 30개까지.
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 2200));
      await page.waitForTimeout(700);
    }
    const items = await page.evaluate((max) => {
      const els = Array.from(document.querySelectorAll("ytd-video-renderer")).slice(0, max);
      return els.map((el) => {
        const titleEl = el.querySelector("a#video-title, #video-title") as HTMLAnchorElement | null;
        const title = (titleEl?.textContent || "").trim();
        const url = titleEl?.href || "";
        const channelEl = el.querySelector("ytd-channel-name a, #channel-name a, #text > a");
        const channel = (channelEl?.textContent || "").trim();
        const metaSpans = Array.from(el.querySelectorAll("#metadata-line span, .metadata-snippet-text"))
          .map((s) => (s as HTMLElement).textContent || "");
        const view_text = metaSpans.find((t) => /view|ครั้ง|조회|回/i.test(t)) || metaSpans[0] || "";
        return { title, channel, url, view_text };
      });
    }, 40);
    return items.map((it) => ({
      topic: topicEn,
      topic_th: topicTh,
      title: it.title.slice(0, 200),
      channel: it.channel.slice(0, 80),
      view_text: it.view_text.slice(0, 60),
      views: parseViewCount(it.view_text),
      url: it.url,
    })).filter((v) => v.title || v.url);
  } finally {
    await page.close().catch(() => {});
  }
}

async function main() {
  const tokens = await loadClinicTokens();
  log(`로드: ${tokens.length} 한국 클리닉 토큰`);

  const browser: Browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const ctx = await browser.newContext({
    userAgent:
      "Mozilla/5.0 Chrome/130 Safari/537.36",
    locale: "th-TH",
  });

  const allVideos: Video[] = [];
  for (const [i, t] of TOPICS.entries()) {
    log(`(${i + 1}/${TOPICS.length}) ${t.th} (${t.en})`);
    try {
      const vids = await scrapeYoutubeTopic(ctx, t.th, t.en);
      allVideos.push(...vids);
      log(`  +${vids.length} 비디오`);
    } catch (e) {
      log(`  ✗ 실패: ${e instanceof Error ? e.message : String(e)}`);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  await browser.close();

  // 토픽별 집계.
  const byTopic = new Map<string, { videos: number; views: number }>();
  for (const v of allVideos) {
    const e = byTopic.get(v.topic) ?? { videos: 0, views: 0 };
    e.videos++; e.views += v.views;
    byTopic.set(v.topic, e);
  }

  // 채널 = 인플루언서.
  const byChannel = new Map<string, { videos: number; views: number; topics: Set<string> }>();
  for (const v of allVideos) {
    if (!v.channel) continue;
    const e = byChannel.get(v.channel) ?? { videos: 0, views: 0, topics: new Set() };
    e.videos++; e.views += v.views; e.topics.add(v.topic);
    byChannel.set(v.channel, e);
  }
  const channels = Array.from(byChannel.entries())
    .map(([channel, e]) => ({ channel, videos: e.videos, total_views: e.views, topics: Array.from(e.topics) }))
    .sort((a, b) => b.total_views - a.total_views)
    .slice(0, 50);

  // 한국 클리닉 mention.
  const clinicMentions = new Map<string, { count: number; samples: { url: string; snippet: string; views: number; channel: string }[] }>();
  for (const v of allVideos) {
    const text = `${v.title} ${v.channel}`;
    for (const name of detectClinicMentions(text, tokens)) {
      const e = clinicMentions.get(name) ?? { count: 0, samples: [] };
      e.count++;
      if (e.samples.length < 5) e.samples.push({ url: v.url, snippet: text.slice(0, 200), views: v.views, channel: v.channel });
      clinicMentions.set(name, e);
    }
  }
  const mentions = Array.from(clinicMentions.entries())
    .map(([name, e]) => ({ name, mention_count: e.count, samples: e.samples }))
    .sort((a, b) => b.mention_count - a.mention_count);

  const output = {
    generated_at: new Date().toISOString(),
    total_videos: allVideos.length,
    total_views: allVideos.reduce((s, v) => s + v.views, 0),
    topics_searched: TOPICS.length,
    by_topic: Object.fromEntries(byTopic),
    top_channels: channels,
    clinic_mentions: mentions,
    sample_videos: allVideos.sort((a, b) => b.views - a.views).slice(0, 30),
  };
  const outPath = path.join(process.cwd(), "data", "youtube_market.json");
  await fs.writeFile(outPath, JSON.stringify(output, null, 2), "utf-8");
  log(`완료 — ${allVideos.length} 비디오, ${output.total_views.toLocaleString()} views, ${channels.length} 채널, ${mentions.length} 클리닉 mention → ${outPath}`);
}

main().catch((e) => {
  console.error("[youtube_market] fatal:", e);
  process.exit(1);
});
