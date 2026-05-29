/* Discover script — Naver Map 으로 서울 클리닉 자동 발견.
 * 다양한 지역 + 카테고리 쿼리 → 결과 dedup → data/seed_discovered.json.
 *
 * 실행:
 *   npx tsx scripts/discover.ts
 *
 * 산출: 시드 200+ 개의 후보 (ko/en/region) — prefetch.ts 가 사용.
 */

import { chromium, type Browser } from "playwright";
import { promises as fs } from "node:fs";
import path from "node:path";
import { cleanClinicName } from "../lib/cleanClinicName";

const NAV_TIMEOUT_MS = 30_000;
const SELECTOR_WAIT_MS = 12_000;
const MAX_PER_QUERY = 30;

const QUERIES: { query: string; region: string }[] = [
  { query: "강남 성형외과",  region: "강남" },
  { query: "강남 피부과",    region: "강남" },
  { query: "청담 성형외과",  region: "청담" },
  { query: "청담 피부과",    region: "청담" },
  { query: "압구정 성형외과", region: "압구정" },
  { query: "압구정 피부과",   region: "압구정" },
  { query: "홍대 성형외과",   region: "홍대" },
  { query: "홍대 피부과",     region: "홍대" },
  { query: "명동 성형외과",   region: "명동" },
  { query: "명동 피부과",     region: "명동" },
  { query: "잠실 성형외과",   region: "잠실" },
  { query: "잠실 피부과",     region: "잠실" },
  { query: "신촌 성형외과",   region: "신촌" },
  { query: "종로 피부과",     region: "종로" },
  { query: "분당 성형외과",   region: "분당" },
  { query: "서울 모발이식",   region: "서울" },
  { query: "서울 눈성형",     region: "서울" },
  { query: "서울 코성형",     region: "서울" },
  { query: "서울 양악수술",   region: "서울" },
  { query: "서울 안면윤곽",   region: "서울" },
];

type Discovered = {
  id: string;             // slug
  ko: string;             // 검색 결과 이름 (한국어)
  en: string;             // 자동 trans-literation (간단)
  region: string;
  place_id: string;
};

function log(msg: string) {
  const t = new Date().toISOString().slice(11, 19);
  console.log(`[${t}] ${msg}`);
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

// 간단한 한 → 영 transliteration. 한글 → "korean-clinic-N" fallback.
// 의도: en 필드는 Google/Pantip 검색용 한국어로 검색해도 결과 나오는 경우 많음.
// 그래서 en = ko 그대로 써도 일단 동작. 한글로도 충분히 검색 가능.
function asciifyForSearch(ko: string): string {
  // 한글 그대로 두기 (Google/YouTube/Pantip 다 multilang 검색 지원).
  return ko;
}

async function discoverOne(
  ctx: import("playwright").BrowserContext,
  query: string,
  region: string,
): Promise<Discovered[]> {
  const page = await ctx.newPage();
  try {
    const url = `https://m.place.naver.com/place/list?query=${encodeURIComponent(query)}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
    await page.waitForLoadState("networkidle", { timeout: SELECTOR_WAIT_MS }).catch(() => {});
    // 결과 cards 가 있을 때까지 짧게 대기.
    await page.waitForSelector('a[href*="/place/"]', { timeout: SELECTOR_WAIT_MS }).catch(() => {});

    const items = await page.evaluate((maxN) => {
      const seen = new Set<string>();
      const out: { name: string; place_id: string }[] = [];
      const anchors = Array.from(document.querySelectorAll('a[href*="/place/"]')) as HTMLAnchorElement[];
      for (const a of anchors) {
        const m = a.href.match(/\/place\/(\d+)/);
        if (!m) continue;
        const pid = m[1];
        if (seen.has(pid)) continue;
        const name = (a.textContent || "").trim();
        if (!name || name.length < 2 || name.length > 60) continue;
        seen.add(pid);
        out.push({ name, place_id: pid });
        if (out.length >= maxN) break;
      }
      return out;
    }, MAX_PER_QUERY);

    return items.map((it) => {
      const clean = cleanClinicName(it.name);
      return {
        id: slugify(`${region}-${clean}-${it.place_id.slice(-6)}`),
        ko: clean,
        en: asciifyForSearch(clean) || clean,
        region,
        place_id: it.place_id,
      };
    });
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
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    locale: "ko-KR",
    viewport: { width: 414, height: 896 },
  });

  const seen = new Map<string, Discovered>();
  for (const [i, q] of QUERIES.entries()) {
    log(`(${i + 1}/${QUERIES.length}) "${q.query}"`);
    try {
      const items = await discoverOne(ctx, q.query, q.region);
      let added = 0;
      for (const it of items) {
        if (!seen.has(it.place_id)) {
          seen.set(it.place_id, it);
          added++;
        }
      }
      log(`  +${added} (총 ${seen.size})`);
    } catch (e) {
      log(`  ✗ 실패: ${e instanceof Error ? e.message : String(e)}`);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  await browser.close();

  const arr = Array.from(seen.values());
  const out = path.join(process.cwd(), "data", "seed_discovered.json");
  await fs.writeFile(out, JSON.stringify(arr, null, 2), "utf-8");
  log(`완료 — ${arr.length}개 발견 → ${out}`);
}

main().catch((e) => {
  console.error("[discover] fatal:", e);
  process.exit(1);
});
