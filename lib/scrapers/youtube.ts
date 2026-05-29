// YouTube 검색 스크래퍼 — 클리닉 명 검색 → 비디오 개수, 조회수, 언어 분류.
// 한국 의료관광 vlog 가 YouTube 에 많아 Thai/Chinese 시장 reach 측정에 유용.
//
// 전략: youtube.com/results?search_query=<en_brand> 로 검색, 상위 N개 비디오의
// title/channel 텍스트의 unicode 기반 언어 분류.

import { chromium, type Browser } from "playwright";
import type { PlatformResult } from "../types";

const NAV_TIMEOUT_MS = 30_000;
const SELECTOR_WAIT_MS = 15_000;
const MAX_VIDEOS = 30;

function isKorean(text: string): boolean {
  return /[가-힯]/.test(text);
}
function isThai(text: string): boolean {
  return /[฀-๿]/.test(text);
}
function isChinese(text: string): boolean {
  return /[一-鿿]/.test(text) && !isKorean(text);
}
function isJapanese(text: string): boolean {
  // Hiragana + Katakana 만 있는 경우 — 한자 share 라 제외.
  return /[぀-ゟ゠-ヿ]/.test(text);
}

function parseViewCount(text: string): number {
  // YouTube view count format: "1.2M views", "543K views", "12,345 views",
  // 한국어 "조회수 1.2만회", 태국어 "1.2 หมื่นครั้ง" 등.
  const t = text.toLowerCase().replace(/[,\s]/g, "");
  const m = t.match(/([\d.]+)([kmb만천억]?)/);
  if (!m) return 0;
  const num = parseFloat(m[1]);
  if (isNaN(num)) return 0;
  const unit = m[2];
  if (unit === "k" || unit === "천") return Math.round(num * 1_000);
  if (unit === "m" || unit === "만") return Math.round(num * (unit === "만" ? 10_000 : 1_000_000));
  if (unit === "b" || unit === "억") return Math.round(num * (unit === "억" ? 100_000_000 : 1_000_000_000));
  return Math.round(num);
}

export async function scrapeYoutube(query: string): Promise<PlatformResult> {
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--disable-blink-features=AutomationControlled"],
    });
    const ctx = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      locale: "en-US",
    });
    const page = await ctx.newPage();

    // consent.youtube.com 우회 — `youtube.com/?themeRefresh=1` 또는 cookie 'CONSENT=YES+'.
    await ctx.addCookies([{
      name: "CONSENT", value: "YES+", domain: ".youtube.com", path: "/",
    }]);

    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`;
    // sp=EgIQAQ%3D%3D 은 type=Video filter (channel/playlist 제외).
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
    try {
      await page.waitForSelector("ytd-video-renderer", { timeout: SELECTOR_WAIT_MS });
    } catch {
      // 결과 없을 수도 — 0 으로 리턴.
      return { ok: true, metric_label: "비디오", metric_value: 0, extra: { note: "결과 없음" } };
    }

    // 스크롤로 30개 까지 로드.
    for (let i = 0; i < 2; i++) {
      await page.evaluate(() => window.scrollBy(0, 2000));
      await page.waitForTimeout(800);
    }

    const videos = await page.evaluate((max) => {
      const els = Array.from(document.querySelectorAll("ytd-video-renderer")).slice(0, max);
      return els.map((el) => {
        const titleEl = el.querySelector("a#video-title, #video-title");
        const title = (titleEl?.textContent || "").trim();
        const href = (titleEl as HTMLAnchorElement | null)?.href || "";
        const channelEl = el.querySelector("ytd-channel-name a, #channel-name a, #text > a");
        const channel = (channelEl?.textContent || "").trim();
        // view count metadata.
        const metaSpans = Array.from(el.querySelectorAll("#metadata-line span, .metadata-snippet-text"))
          .map((s) => (s as HTMLElement).textContent || "");
        const viewLine = metaSpans.find((t) => /view|조회수|ครั้ง/i.test(t)) || metaSpans[0] || "";
        return { title, channel, url: href, view_text: viewLine };
      });
    }, MAX_VIDEOS);

    const lang = { korean: 0, thai: 0, chinese: 0, japanese: 0, english_other: 0 };
    let totalViews = 0;
    for (const v of videos) {
      const combo = `${v.title} ${v.channel}`;
      if (isThai(combo)) lang.thai++;
      else if (isChinese(combo)) lang.chinese++;
      else if (isJapanese(combo)) lang.japanese++;
      else if (isKorean(combo)) lang.korean++;
      else lang.english_other++;
      totalViews += parseViewCount(v.view_text);
    }
    const foreign = lang.thai + lang.chinese + lang.japanese + lang.english_other;

    return {
      ok: true,
      metric_label: "비디오",
      metric_value: videos.length,
      extra: {
        total_views: totalViews,
        foreign_video_count: foreign,
        lang_breakdown: lang,
        sample_size: videos.length,
        top_videos: videos.slice(0, 10).map((v) => ({
          title: v.title.slice(0, 120),
          channel: v.channel.slice(0, 60),
          url: v.url,
          view_text: v.view_text,
        })),
      },
    };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      metric_label: "비디오",
      metric_value: 0,
    };
  } finally {
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
  }
}
