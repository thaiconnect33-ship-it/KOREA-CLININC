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
    // 검색결과는 보통 /topic/<숫자> 형식. 같은 thread 가 title anchor + info anchor 로 두 번 노출되므로
    // thread ID 로 dedup, info 컨테이너에서 view 카운트 (마지막 라인) 추출.
    const data = await page.evaluate(() => {
      const anchors = Array.from(
        document.querySelectorAll("a[href*='/topic/']"),
      ) as HTMLAnchorElement[];
      type T = { title: string; url: string; views: number };
      const byId = new Map<string, T>();
      for (const a of anchors) {
        const m = a.href.match(/\/topic\/(\d{5,})(?:\/|$|\?|#)/);
        if (!m) continue;
        const id = m[1];
        const url = `https://pantip.com/topic/${id}`;
        const existing = byId.get(id);
        // title: 가장 긴 textContent 가 진짜 title.
        const text = (a.textContent || "").trim();
        if (!existing) byId.set(id, { title: text.slice(0, 200), url, views: 0 });
        else if (text.length > existing.title.length && !text.startsWith("คห.")) {
          existing.title = text.slice(0, 200);
        }
        // view 카운트: pt-list-item__sr__info container 의 마지막 숫자 라인.
        const info = a.closest("[class*='pt-list-item__sr__info']") as HTMLElement | null;
        if (info) {
          const t = info.innerText;
          // 마지막 줄이 숫자만 (조회수 또는 view 수). 댓글수 패턴 "คห.NN" 은 제외.
          const lines = t.split("\n").map((l) => l.trim()).filter(Boolean);
          for (let i = lines.length - 1; i >= 0; i--) {
            const ln = lines[i];
            if (/^[\d,]+$/.test(ln)) {
              const n = parseInt(ln.replace(/,/g, ""), 10);
              if (!isNaN(n) && n > 0) {
                const cur = byId.get(id)!;
                if (n > cur.views) cur.views = n;
              }
              break;
            }
          }
        }
        // fallback: parent item text 의 마지막 숫자.
        if ((byId.get(id)?.views ?? 0) === 0) {
          const parent = a.closest("li, .pt-lists-item, article, [class*='item']") as HTMLElement | null;
          if (parent) {
            const matches = parent.innerText.match(/(\d{1,3}(?:,\d{3})+|\d+)(?=\s*$)/m);
            if (matches) {
              const n = parseInt(matches[1].replace(/,/g, ""), 10);
              const cur = byId.get(id)!;
              if (!isNaN(n) && n > cur.views) cur.views = n;
            }
          }
        }
      }
      return Array.from(byId.values());
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
