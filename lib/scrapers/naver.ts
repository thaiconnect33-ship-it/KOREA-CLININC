// Naver Place (m.place.naver.com) 스크래퍼.
// 흐름: m.place.naver.com 검색 → 첫 결과의 place_id 추출 → 디테일 페이지에서
// 방문자 리뷰 수 + 블로그 리뷰 수 추출.

import { chromium, type Browser } from "playwright";
import type { PlatformResult } from "../types";

const NAV_TIMEOUT_MS = 25_000;
const SELECTOR_WAIT_MS = 10_000;

export async function scrapeNaver(query: string): Promise<PlatformResult> {
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--disable-blink-features=AutomationControlled"],
    });
    const ctx = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      locale: "ko-KR",
      viewport: { width: 414, height: 896 },
    });
    const page = await ctx.newPage();

    // 1) 검색 결과 페이지로 이동.
    const searchUrl = `https://m.place.naver.com/place/list?query=${encodeURIComponent(query)}`;
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });

    // SPA mount 대기 — networkidle 만으로는 부족, place anchor 가 실제로 mount 되길 기다림.
    await page.waitForSelector('a[href*="/place/"]', { timeout: SELECTOR_WAIT_MS }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: SELECTOR_WAIT_MS }).catch(() => {});
    await page.waitForTimeout(1200);

    // 2) 첫 결과 place_id 추출. /photo 페이지가 아닌 직접 /place/<id> URL 선호.
    // 영문 query 의 경우 첫 결과가 false-match (예: "ID Hospital" → "연세아이디의원") 일 수 있어
    // 동일 place_id 가 2회 이상 반복되는 것을 우선 (Naver 가 메인 결과를 중복 노출하는 패턴 활용).
    const firstHref = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href*="/place/"]')) as HTMLAnchorElement[];
      const idCount = new Map<string, number>();
      const idFirstHref = new Map<string, string>();
      for (const a of anchors) {
        const m = a.href.match(/\/place\/(\d+)/);
        if (!m) continue;
        const id = m[1];
        idCount.set(id, (idCount.get(id) || 0) + 1);
        if (!idFirstHref.has(id) && !a.href.includes("/photo")) idFirstHref.set(id, a.href);
      }
      if (idCount.size === 0) return null;
      // 2회 이상 노출된 id 중 가장 빠른 anchor 사용 (메인 결과). 없으면 그냥 첫 id.
      const sorted = Array.from(idCount.entries()).sort((a, b) => b[1] - a[1]);
      const winnerId = sorted[0][0];
      return idFirstHref.get(winnerId) || `https://m.place.naver.com/place/${winnerId}`;
    });

    if (!firstHref) {
      return {
        ok: true,
        metric_label: "리뷰",
        metric_value: 0,
        extra: { note: "검색 결과 없음", visitor_review_count: 0, blog_review_count: 0 },
      };
    }

    const placeIdMatch = firstHref.match(/\/place\/(\d+)/);
    if (!placeIdMatch) {
      return { ok: false, error: "place_id 파싱 실패", metric_label: "리뷰", metric_value: 0 };
    }
    const placeId = placeIdMatch[1];

    // 3) 디테일 홈으로 이동. 헤더에 방문자/블로그 리뷰 수 표시.
    const detailUrl = `https://m.place.naver.com/place/${placeId}/home`;
    await page.goto(detailUrl, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
    await page.waitForLoadState("networkidle", { timeout: SELECTOR_WAIT_MS }).catch(() => {});

    // 4) 리뷰 카운트 추출. Naver 의 클래스명이 자주 바뀌므로 텍스트 패턴 + meta 태그 fallback.
    // 방문자 리뷰는 "리뷰 N" 또는 "방문자리뷰 N" 등 변형 다양.
    const counts = await page.evaluate(() => {
      const text = document.body.innerText;
      // 다양한 변형 모두 잡기.
      const visitorPatterns = [
        /방문자\s*리뷰\s*([\d,]+)/,
        /방문자리뷰\s*([\d,]+)/,
        /리뷰\s+([\d,]+)(?!\s*\d)/,  // "리뷰 1,234" (블로그/방문자 구분 없을 때)
      ];
      const blogPatterns = [
        /블로그\s*리뷰\s*([\d,]+)/,
        /블로그리뷰\s*([\d,]+)/,
      ];
      let visitor = 0;
      for (const p of visitorPatterns) {
        const m = text.match(p);
        if (m) { visitor = parseInt(m[1].replace(/,/g, ""), 10); break; }
      }
      let blog = 0;
      for (const p of blogPatterns) {
        const m = text.match(p);
        if (m) { blog = parseInt(m[1].replace(/,/g, ""), 10); break; }
      }
      // Name: og:title meta → document.title 정제 → h1.
      const ogTitle = (document.querySelector('meta[property="og:title"]') as HTMLMetaElement | null)?.content;
      const docTitle = document.title.replace(/\s*:\s*네이버 지도.*$/, "").replace(/\s*\|\s*.*$/, "").trim();
      const h1 = document.querySelector("h1")?.textContent?.trim();
      const name = (ogTitle || h1 || docTitle || "").slice(0, 200);
      return { visitor, blog, name };
    });

    const total = counts.visitor + counts.blog;
    return {
      ok: true,
      metric_label: "리뷰",
      metric_value: total,
      extra: {
        place_id: placeId,
        name: counts.name,
        visitor_review_count: counts.visitor,
        blog_review_count: counts.blog,
        detail_url: detailUrl,
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
