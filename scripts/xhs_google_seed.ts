/* 샤오홍수 URL discovery via Google `site:xiaohongshu.com` 검색.
 *
 * 전략:
 *   - China IP 가 없으므로 직접 search_result 페이지를 못 긁음.
 *   - 대신 Google 검색이 RED 의 SEO-노출 페이지를 인덱싱 함 → 우리는 Google 만 긁음.
 *   - 쿼리 = (中文 K-beauty 키워드) OR (영문 클리닉 브랜드) + `site:xiaohongshu.com`
 *   - 산출: data/xhs_url_queue.json  (xhs_fetch.ts 가 천천히 소비)
 *
 * 안전 장치:
 *   - 쿼리당 30-60s sleep, page 당 추가 sleep
 *   - 누적 URL 중복 제거 + 캐시 (재실행 시 새 URL 만 추가)
 *   - 실행: npx tsx scripts/xhs_google_seed.ts
 */

import { chromium, type Browser } from "playwright";
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const QUEUE_PATH = path.join(ROOT, "data", "xhs_url_queue.json");

// 중문 + 영문 키워드 (브랜드는 영문/한글 그대로 — RED 가 인덱싱하는 경우 매칭).
const CN_TOPICS = [
  "韩国整形",
  "韩国皮肤科",
  "韩国医美",
  "韩国双眼皮",
  "韩国鼻整形",
  "韩国玻尿酸",
  "韩国肉毒素",
  "韩国瘦脸",
  "韩国吸脂",
  "韩国V线",
  "江南整形",
  "江南皮肤科",
  "首尔整形",
  "韩国植发",
  "韩国童颜针",
  "韩国水光针",
  "韩国祛痘",
  "韩国激光",
  "韩国微整",
  "韩国 整形 推荐",
];

// 클리닉 브랜드 (영문) 도 추가 — RED 에서 한국 브랜드를 영문으로 태그하는 경우 있음.
const CLINIC_BRANDS = [
  "Banobagi", "ID Hospital", "Lienjang", "JK Plastic Surgery",
  "VIP International", "Wonjin", "BK Plastic", "Grand Plastic",
  "Cheongdam Pure", "Oracle Dermatology", "365mc",
];

type Queue = {
  generated_at: string;
  total_urls: number;
  urls: { url: string; query: string; discovered_at: string }[];
};

function log(msg: string) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

async function loadQueue(): Promise<Queue> {
  try {
    return JSON.parse(await fs.readFile(QUEUE_PATH, "utf-8")) as Queue;
  } catch {
    return { generated_at: new Date().toISOString(), total_urls: 0, urls: [] };
  }
}

async function saveQueue(q: Queue) {
  q.total_urls = q.urls.length;
  q.generated_at = new Date().toISOString();
  await fs.mkdir(path.dirname(QUEUE_PATH), { recursive: true });
  await fs.writeFile(QUEUE_PATH, JSON.stringify(q, null, 2), "utf-8");
}

async function searchGoogle(
  ctx: import("playwright").BrowserContext,
  query: string,
): Promise<string[]> {
  const page = await ctx.newPage();
  try {
    const full = `${query} site:xiaohongshu.com`;
    const url = `https://www.google.com/search?q=${encodeURIComponent(full)}&num=30&hl=zh-CN`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });

    // CAPTCHA detection — 발견 시 빈 배열 반환 (다음 쿼리에서 재시도).
    const captcha = await page.evaluate(() => /sorry|captcha|unusual traffic/i.test(document.body.innerText));
    if (captcha) {
      return [];
    }

    const urls = await page.evaluate(() => {
      const found = new Set<string>();
      for (const a of Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))) {
        const h = a.href;
        const m = h.match(/https?:\/\/(?:www\.)?xiaohongshu\.com\/(?:explore|discovery\/item|user\/profile)\/[\w-]+/);
        if (m) found.add(m[0]);
      }
      return Array.from(found);
    });
    return urls;
  } finally {
    await page.close().catch(() => {});
  }
}

async function main() {
  const queue = await loadQueue();
  const seen = new Set(queue.urls.map((u) => u.url));
  log(`기존 큐: ${queue.urls.length} URL`);

  const queries = [...CN_TOPICS, ...CLINIC_BRANDS];
  log(`쿼리 ${queries.length}개 시작`);

  const browser: Browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const ctx = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    locale: "zh-CN",
    extraHTTPHeaders: { "accept-language": "zh-CN,zh;q=0.9,en;q=0.8" },
  });

  let added = 0;
  let captchas = 0;
  for (const [i, q] of queries.entries()) {
    log(`(${i + 1}/${queries.length}) "${q}"`);
    try {
      const urls = await searchGoogle(ctx, q);
      if (urls.length === 0) captchas++;
      for (const u of urls) {
        if (seen.has(u)) continue;
        seen.add(u);
        queue.urls.push({ url: u, query: q, discovered_at: new Date().toISOString() });
        added++;
      }
      log(`  +${urls.length} URL (신규 ${urls.length}, 누적 ${queue.urls.length})`);
    } catch (e) {
      log(`  ✗ ${e instanceof Error ? e.message : String(e)}`);
    }
    // 30-60s 랜덤 sleep — Google rate limit 회피.
    const sleep = 30_000 + Math.floor(Math.random() * 30_000);
    await new Promise((r) => setTimeout(r, sleep));
  }
  await browser.close();
  await saveQueue(queue);
  log(`완료 — 신규 ${added}, captcha hit ${captchas}, 총 ${queue.urls.length}`);
}

main().catch((e) => {
  console.error("[xhs_google_seed] fatal:", e);
  process.exit(1);
});
