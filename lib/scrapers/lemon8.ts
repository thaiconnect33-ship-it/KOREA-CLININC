// Lemon8 (ByteDance) discovery 페이지 스크래퍼.
// SSR HTML 은 skeleton 만 보내고 카드는 client-mount → Playwright 로 mount 대기.
// VPN: LEMON8_SOCKS5_PORT env 설정 시 proxy 경유.
//
// 흐름:
//   https://www.lemon8-app.com/discover/<query>?region=th
//   → 단일 결과면 /experience/<slug> 로 redirect (SPA mount 후 카드 노출)
//
// 추출: source-article-card (메인 컨텐츠) + article-recommend-card (related).
// 카드 구조: <title>\n<author>\n<like_count>  (innerText 줄 단위)

import { chromium, type Browser } from "playwright";
import type { PlatformResult } from "../types";

const NAV_TIMEOUT_MS = 30_000;
const MOUNT_WAIT_MS = 12_000;

function parseLikeCount(text: string): number {
  const t = text.trim().toLowerCase().replace(/[,\s]/g, "");
  const m = t.match(/([\d.]+)([kmb]?)/);
  if (!m) return 0;
  const num = parseFloat(m[1]);
  if (isNaN(num)) return 0;
  const unit = m[2];
  if (unit === "k") return Math.round(num * 1_000);
  if (unit === "m") return Math.round(num * 1_000_000);
  if (unit === "b") return Math.round(num * 1_000_000_000);
  return Math.round(num);
}

export async function scrapeLemon8(query: string): Promise<PlatformResult> {
  let browser: Browser | null = null;
  try {
    const launchArgs: string[] = ["--disable-blink-features=AutomationControlled"];
    const port = process.env.LEMON8_SOCKS5_PORT;
    if (port) launchArgs.push(`--proxy-server=socks5://127.0.0.1:${port}`);
    browser = await chromium.launch({ headless: true, args: launchArgs });
    const ctx = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      locale: "th-TH",
      extraHTTPHeaders: { "accept-language": "th,en;q=0.9" },
    });
    const page = await ctx.newPage();

    const url = `https://www.lemon8-app.com/discover/${encodeURIComponent(query)}?region=th`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });

    // 카드 mount 대기. source-article-card 가 메인. 없으면 article-recommend-card 라도.
    await page
      .waitForSelector(".source-article-card, .article-recommend-card", { timeout: MOUNT_WAIT_MS })
      .catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(800);

    const posts = await page.evaluate(() => {
      type P = { title: string; author: string; likes: number; href: string };
      const seen = new Set<string>();
      const out: P[] = [];
      // 우선순위: source-article-card > article-recommend-card > experience-recommend-card
      const groups = [
        ".source-article-card",
        ".article-recommend-card",
        ".experience-recommend-card",
      ];
      for (const sel of groups) {
        const els = document.querySelectorAll(sel);
        for (const el of Array.from(els)) {
          const txt = (el as HTMLElement).innerText.trim();
          if (!txt) continue;
          const lines = txt.split("\n").map((l) => l.trim()).filter(Boolean);
          if (lines.length === 0) continue;
          const title = (lines[0] || "").slice(0, 200);
          const author = (lines[1] || "").slice(0, 100);
          const likesText = lines[lines.length - 1] || "";
          // anchor href for dedup
          const a = el.querySelector("a[href*='/post/'], a[href*='/experience/']") as HTMLAnchorElement | null;
          const href = a?.href || (title + "|" + author);
          if (seen.has(href)) continue;
          seen.add(href);
          // parse like count (supports "29K", "1.2M", "352")
          const lt = likesText.toLowerCase().replace(/[,\s]/g, "");
          const m = lt.match(/([\d.]+)([kmb]?)/);
          let likes = 0;
          if (m) {
            const n = parseFloat(m[1]);
            const u = m[2];
            likes = u === "k" ? Math.round(n * 1e3) : u === "m" ? Math.round(n * 1e6) : u === "b" ? Math.round(n * 1e9) : Math.round(n);
          }
          if (title) out.push({ title, author, likes, href });
        }
      }
      return out;
    });

    // dedup by title+author (cross-group).
    const uniq = new Map<string, { title: string; author: string; likes: number }>();
    for (const p of posts) {
      const key = `${p.title}|${p.author}`;
      const existing = uniq.get(key);
      if (!existing || p.likes > existing.likes) uniq.set(key, { title: p.title, author: p.author, likes: p.likes });
    }
    const list = Array.from(uniq.values());
    const total = list.length;
    const totalLikes = list.reduce((s, p) => s + p.likes, 0);
    const top5Likes = list
      .slice()
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 5)
      .reduce((s, p) => s + p.likes, 0);

    return {
      ok: true,
      metric_label: "포스트",
      metric_value: total,
      extra: {
        total_likes: totalLikes,
        top_5_likes: top5Likes,
        sample: list.sort((a, b) => b.likes - a.likes).slice(0, 10),
      },
    };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      metric_label: "포스트",
      metric_value: 0,
    };
  } finally {
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
  }
}

// kept for type compatibility with prior import.
export { parseLikeCount };
