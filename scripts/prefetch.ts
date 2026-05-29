/* Prefetch script — 시드 클리닉 리스트를 받아 Naver/Google/Pantip 백그라운드 스크래핑.
 *
 * - 각 클리닉마다 ko/en 쿼리 따로 사용 (Naver=ko, Google=en, Pantip=en).
 * - 결과는 data/cache/<slug>.json 에 두 슬러그로 둘 다 저장 → 사용자가 둘 중 어떤
 *   이름으로 검색해도 cache hit.
 * - 24h TTL 은 cache.ts 가 관리. 만료되면 재돌리면 됨.
 *
 * 실행:
 *   npx tsx scripts/prefetch.ts
 *   (또는 백그라운드: 같은 명령을 nohup/start /b 로 띄움)
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { scrapePantip } from "../lib/scrapers/pantip";
import { scrapeNaver } from "../lib/scrapers/naver";
import { scrapeGoogleMaps } from "../lib/scrapers/gmaps";
import { scrapeYoutube } from "../lib/scrapers/youtube";
import { scrapeLemon8 } from "../lib/scrapers/lemon8";
import { placeholderXiaohongshu } from "../lib/scrapers/placeholder";
import { loadManual, applyManual } from "../lib/manualOverride";
import { computeGlobalScore } from "../lib/globalScore";
import { computeOpportunityCost } from "../lib/opportunityCost";
import type { ScoutResult } from "../lib/types";

type Seed = { id: string; ko: string; en: string; region: string };

const CACHE_DIR = path.join(process.cwd(), "data", "cache");
const SEED_PATHS = [
  path.join(process.cwd(), "data", "seed.json"),
  path.join(process.cwd(), "data", "seed_discovered.json"),
];
// 한 클리닉당 wall-clock 상한. 한 플랫폼이 응답 없이 멈춰서 전체가 hang 되는 거 방지.
// (Playwright 내부 timeout 이 안 걸리는 케이스 — cheongdam-u 가 2.6h hang 한 적 있음)
const PER_CLINIC_TIMEOUT_MS = parseInt(process.env.PER_CLINIC_TIMEOUT_MS || "90000", 10);

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout ${ms}ms — ${label}`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

function slugify(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9À-￿]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function log(msg: string) {
  const t = new Date().toISOString().slice(11, 19);
  console.log(`[${t}] ${msg}`);
}

async function processOne(seed: Seed): Promise<void> {
  log(`▶ ${seed.id} (ko="${seed.ko}", en="${seed.en}")`);
  const t0 = Date.now();

  // 병렬 — naver=한국어, google+pantip+youtube+lemon8=영문 brand.
  const [naver, gmaps, pantip, youtube, lemon8] = await Promise.all([
    scrapeNaver(seed.ko),
    scrapeGoogleMaps(`${seed.en} ${seed.region}`),
    scrapePantip(seed.en),
    scrapeYoutube(`${seed.en} Korea`),
    scrapeLemon8(seed.en),
  ]);
  const xiaohongshu = placeholderXiaohongshu();

  // Manual override 적용 (각 슬러그별로 시도).
  const manualEn = await loadManual(seed.en);
  const platforms = applyManual(
    { naver, google_maps: gmaps, pantip, youtube, xiaohongshu, lemon8 },
    manualEn,
  );

  const result: ScoutResult = {
    query: seed.en,
    generated_at: new Date().toISOString(),
    cached: false,
    platforms,
    global_score: 0,
    opportunity_cost_thb: 0,
    opportunity_cost_krw: 0,
  };
  result.global_score = computeGlobalScore(result);
  const cost = computeOpportunityCost(result);
  result.opportunity_cost_krw = cost.krw;
  result.opportunity_cost_thb = cost.thb;

  await fs.mkdir(CACHE_DIR, { recursive: true });
  // 양쪽 슬러그에 동일 데이터 저장 (query 필드만 다르게).
  const enSlug = slugify(seed.en);
  const koSlug = slugify(seed.ko);
  await fs.writeFile(
    path.join(CACHE_DIR, `${enSlug}.json`),
    JSON.stringify({ ...result, query: seed.en }, null, 2),
    "utf-8",
  );
  if (koSlug !== enSlug) {
    await fs.writeFile(
      path.join(CACHE_DIR, `${koSlug}.json`),
      JSON.stringify({ ...result, query: seed.ko }, null, 2),
      "utf-8",
    );
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  log(
    `  ✓ ${seed.id} (${elapsed}s) — naver=${naver.metric_value} gmaps=${gmaps.metric_value} pantip=${pantip.metric_value} youtube=${youtube.metric_value} lemon8=${lemon8.metric_value} score=${result.global_score}`,
  );
}

async function main() {
  const all: Seed[] = [];
  const seenIds = new Set<string>();
  for (const sp of SEED_PATHS) {
    try {
      const raw = await fs.readFile(sp, "utf-8");
      const items = JSON.parse(raw) as Seed[];
      for (const it of items) {
        if (!seenIds.has(it.id)) {
          seenIds.add(it.id);
          all.push(it);
        }
      }
      log(`로드: ${sp} (${items.length}개)`);
    } catch {
      log(`스킵: ${sp} (없음)`);
    }
  }
  const seeds = all;
  log(`총 ${seeds.length}개 시드 처리 시작`);

  let ok = 0, fail = 0, timeouts = 0;
  for (const [i, seed] of seeds.entries()) {
    try {
      log(`(${i + 1}/${seeds.length})`);
      await withTimeout(processOne(seed), PER_CLINIC_TIMEOUT_MS, seed.id);
      ok++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.startsWith("timeout ")) {
        log(`  ⧗ ${seed.id} skip (${msg})`);
        timeouts++;
      } else {
        log(`  ✗ ${seed.id} 실패: ${msg}`);
        fail++;
      }
    }
    // 약간 쉬기 — 같은 IP 가 연속 검색하는 거 부담 줄이기.
    await new Promise((r) => setTimeout(r, 3000));
  }

  log(`완료 — 성공 ${ok}, 타임아웃 ${timeouts}, 실패 ${fail}, 총 ${seeds.length}`);
}

main().catch((e) => {
  console.error("[prefetch] fatal:", e);
  process.exit(1);
});
