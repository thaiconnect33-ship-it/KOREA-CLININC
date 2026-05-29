// Google Maps 스크래퍼 (no-API).
// 흐름: maps.google.com 검색 → 첫 결과 디테일 패널 → 평점/리뷰수 추출
//      → review 탭 열고 상위 N개 리뷰의 언어 감지 (Thai/Chinese/English).
// VPN 미사용 — 검색당 1-2회라 rate limit 거의 안 걸림. 필요해지면 nordvpn 추가.

import { chromium, type Browser } from "playwright";
import type { PlatformResult } from "../types";

const NAV_TIMEOUT_MS = 30_000;
const SELECTOR_WAIT_MS = 15_000;
const MAX_REVIEW_SAMPLE = 50;       // 언어 감지용 샘플 수

// Unicode range 기반 언어 감지. 한국어 (한글) vs 외국어 구분.
function isKorean(text: string): boolean {
  return /[가-힯ᄀ-ᇿ㄰-㆏]/.test(text);
}
function isThai(text: string): boolean {
  return /[฀-๿]/.test(text);
}
function isChinese(text: string): boolean {
  // CJK Unified Ideographs (한글 한자 corner-case 무시하고 단순 판정).
  return /[一-鿿]/.test(text) && !isKorean(text);
}

export async function scrapeGoogleMaps(query: string): Promise<PlatformResult> {
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
      extraHTTPHeaders: { "accept-language": "en-US,en;q=0.9" },
    });
    const page = await ctx.newPage();

    // 1) 검색 URL — query 에 "Seoul" 자동 부착 (성형/피부과 owner 가 도시명 빠뜨려도 정확도 ↑).
    // 이미 "강남" 등 한국어 지역명 포함되어도 영문 "Seoul" 부착이 도움.
    const enriched = /seoul|korea|gangnam|hongdae/i.test(query) ? query : `${query} Seoul`;
    const url = `https://www.google.com/maps/search/${encodeURIComponent(enriched)}/?hl=en`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });

    // 2) consent / cookie 팝업 dismiss.
    for (const sel of [
      'button[aria-label*="Reject"]',
      'button[aria-label*="Accept"]',
      'form[action*="consent"] button',
    ]) {
      try {
        const btn = await page.locator(sel).first();
        if (await btn.count() && await btn.isVisible({ timeout: 800 })) {
          await btn.click({ timeout: 1500 });
          await page.waitForLoadState("domcontentloaded", { timeout: 6000 });
          break;
        }
      } catch { /* ignore */ }
    }

    // 3) 디테일 패널 (F7nice) 로드 대기. 단일 결과면 자동 redirect, 다중이면 첫번째 click 필요.
    let hadPanel = false;
    try {
      await page.waitForSelector("div.F7nice", { timeout: SELECTOR_WAIT_MS });
      hadPanel = true;
    } catch {
      // 리스트 페이지일 가능성 — 첫 결과 click.
      try {
        const firstResult = page.locator('a[href*="/maps/place/"]').first();
        if (await firstResult.count()) {
          await firstResult.click({ timeout: 5000 });
          await page.waitForSelector("div.F7nice", { timeout: SELECTOR_WAIT_MS });
          hadPanel = true;
        }
      } catch { /* still no panel */ }
    }

    if (!hadPanel) {
      return {
        ok: true,
        metric_label: "리뷰",
        metric_value: 0,
        extra: { note: "Google Maps 결과 없음", foreign_language_reviews: 0 },
      };
    }

    // 4) 평점 + 총 리뷰수 추출.
    const meta = await page.evaluate(() => {
      const fnice = document.querySelector("div.F7nice");
      const text = fnice?.textContent || "";
      const ratingMatch = text.match(/(\d+\.\d+)/);
      const totalMatch = text.match(/\(([\d,]+)\)/);
      const h1 = document.querySelector("h1")?.textContent?.trim() || "";
      return {
        name: h1.slice(0, 200),
        rating: ratingMatch ? parseFloat(ratingMatch[1]) : 0,
        total: totalMatch ? parseInt(totalMatch[1].replace(/,/g, ""), 10) : 0,
      };
    });

    // 5) 리뷰 탭 열고 상위 샘플 수집.
    let langBreakdown = { korean: 0, thai: 0, chinese: 0, english_other: 0 };
    let sampledReviews: string[] = [];
    try {
      // "Reviews" 탭 button — aria-label 또는 텍스트.
      const reviewsTab = page.locator('button[aria-label*="Reviews" i], button[role="tab"]:has-text("Reviews")').first();
      if (await reviewsTab.count()) {
        await reviewsTab.click({ timeout: 5000 });
        await page.waitForTimeout(2000);
        // 스크롤로 더 많은 리뷰 로드 (3회).
        const scrollContainer = page.locator('div[class*="m6QErb"][class*="DxyBCb"], div[role="main"] [aria-label*="reviews" i]').first();
        for (let i = 0; i < 3; i++) {
          await scrollContainer.evaluate((el) => el.scrollBy(0, 2000)).catch(() => {});
          await page.waitForTimeout(900);
        }
        // 리뷰 텍스트 수집.
        sampledReviews = await page.evaluate((max) => {
          const els = Array.from(document.querySelectorAll('[class*="MyEned"], [class*="wiI7pd"]'));
          return els.slice(0, max).map((el) => (el as HTMLElement).innerText.trim()).filter(Boolean);
        }, MAX_REVIEW_SAMPLE);
      }
    } catch { /* sampling 실패해도 평점/총리뷰는 살림 */ }

    for (const r of sampledReviews) {
      if (isKorean(r)) langBreakdown.korean++;
      else if (isThai(r)) langBreakdown.thai++;
      else if (isChinese(r)) langBreakdown.chinese++;
      else langBreakdown.english_other++;
    }

    const foreign = langBreakdown.thai + langBreakdown.chinese + langBreakdown.english_other;

    return {
      ok: true,
      metric_label: "리뷰",
      metric_value: meta.total,
      extra: {
        name: meta.name,
        rating: meta.rating,
        total_reviews: meta.total,
        sample_size: sampledReviews.length,
        foreign_language_reviews: foreign,        // sample 내 외국어 리뷰 수
        lang_breakdown: langBreakdown,
      },
    };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      metric_label: "리뷰",
      metric_value: 0,
    };
  } finally {
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
  }
}
