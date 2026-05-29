// Pantip 검색 결과 스크래퍼.
// Pantip 의 SSR HTML 은 비어있고 (Next.js 인데 results 가 client fetch),
// 따라서 Playwright 로 렌더링 후 파싱.
//
// VPN 불필요 — Pantip 은 태국 외부에서도 접근 가능한 공개 사이트.

import { chromium, type Browser } from "playwright";
import type { PlatformResult } from "../types";

const NAV_TIMEOUT_MS = 25_000;
const RESULT_WAIT_MS = 12_000;

export async function scrapePantip(query: string): Promise<PlatformResult> {
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--disable-blink-features=AutomationControlled"],
    });
    const ctx = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      locale: "th-TH",
      extraHTTPHeaders: { "accept-language": "th,en;q=0.9" },
    });
    const page = await ctx.newPage();
    const url = `https://pantip.com/search?q=${encodeURIComponent(query)}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });

    // 검색 결과 리스트가 client fetch 후 mount. 최대 12s 대기.
    // 결과 0건일 수도 있으므로 timeout 이어도 fail 아님.
    // 다중 selector 시도 — Pantip UI 자주 바뀌어서.
    const RESULT_SELECTORS = [
      "a[href*='/topic/']",                                  // 가장 단순 — 토픽 링크 자체
      ".pt-lists.pt-lists--avatar-list .pt-lists-item",       // 기존 selector
      "[class*='search-result'] a[href*='/topic/']",          // 변형
    ];
    let resultsFound = false;
    for (const sel of RESULT_SELECTORS) {
      try {
        await page.waitForSelector(sel, { timeout: RESULT_WAIT_MS / RESULT_SELECTORS.length });
        resultsFound = true;
        break;
      } catch { /* try next */ }
    }
    // 추가 networkidle 대기 — 검색 API 응답 후 mount.
    if (resultsFound) {
      await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
    }

    // DOM 에서 토픽 링크들 모으기. nav 메뉴 (/topic/내용...) 와 검색결과 구분 필요.
    // 검색결과는 보통 /topic/<숫자> 형식.
    const data = await page.evaluate(() => {
      const anchors = Array.from(
        document.querySelectorAll("a[href*='/topic/']"),
      ) as HTMLAnchorElement[];
      const seen = new Set<string>();
      const threads: { title: string; url: string; views: number }[] = [];
      for (const a of anchors) {
        const m = a.href.match(/\/topic\/(\d{5,})/);   // 5자리 이상 숫자만 (실 thread ID)
        if (!m) continue;
        const url = `https://pantip.com/topic/${m[1]}`;
        if (seen.has(url)) continue;
        seen.add(url);
        const title = (a.textContent || a.getAttribute("title") || "").trim().slice(0, 200);
        // 조회수: 부모 element 의 텍스트 노드에서 추출 시도.
        let views = 0;
        const parent = a.closest("li, .pt-lists-item, article, [class*='item']") as HTMLElement | null;
        if (parent) {
          const m2 = parent.innerText.match(/([\d,]+)\s*(view|view\s*ครั้ง|ครั้ง)/i);
          if (m2) views = parseInt(m2[1].replace(/,/g, ""), 10) || 0;
        }
        threads.push({ title, url, views });
      }
      return threads;
    });

    return {
      ok: true,
      metric_label: "스레드",
      metric_value: data.length,
      extra: {
        threads: data.slice(0, 20),
        total_views: data.reduce((s, t) => s + t.views, 0),
      },
    };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      metric_label: "스레드",
      metric_value: 0,
    };
  } finally {
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
  }
}
