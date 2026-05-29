// POST /api/scout — { query: string } → ScoutResult.
// 5 플랫폼 병렬 스크래핑 (현재는 Pantip 만 실작동, 나머지 placeholder).
// 결과는 24h 파일 캐시.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { scrapePantip } from "@/lib/scrapers/pantip";
import { scrapeNaver } from "@/lib/scrapers/naver";
import { scrapeGoogleMaps } from "@/lib/scrapers/gmaps";
import { scrapeYoutube } from "@/lib/scrapers/youtube";
import { scrapeLemon8 } from "@/lib/scrapers/lemon8";
import { placeholderXiaohongshu } from "@/lib/scrapers/placeholder";
import { readCache, writeCache } from "@/lib/cache";
import { computeGlobalScore } from "@/lib/globalScore";
import { computeOpportunityCost } from "@/lib/opportunityCost";
import { loadManual, applyManual } from "@/lib/manualOverride";
import type { ScoutResult } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;       // serverless 환경 timeout (로컬은 무한)

export async function POST(req: NextRequest) {
  let body: { query?: string };
  try {
    body = (await req.json()) as { query?: string };
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const query = (body.query || "").trim();
  if (!query || query.length < 2) {
    return NextResponse.json({ error: "query 2자 이상" }, { status: 400 });
  }
  if (query.length > 100) {
    return NextResponse.json({ error: "query 너무 김" }, { status: 400 });
  }

  // 캐시 hit?
  const cached = await readCache(query);
  if (cached) return NextResponse.json(cached);

  // Vercel/serverless 환경에서는 Playwright 못 돌림 → cache miss 시 명시적 안내.
  if (process.env.VERCEL || process.env.NEXT_RUNTIME === "edge") {
    return NextResponse.json({
      error: "no_cache",
      message: "이 클리닉의 라이브 진단은 곧 추가됩니다. 데모 신청해주세요.",
    }, { status: 404 });
  }

  // 병렬 스크래핑. Naver/Google/Pantip/YouTube/Lemon8 실작동, Xiaohongshu 만 placeholder.
  const [pantip, naver, gmaps, youtube, lemon8, manual] = await Promise.all([
    scrapePantip(query),
    scrapeNaver(query),
    scrapeGoogleMaps(query),
    scrapeYoutube(query),
    scrapeLemon8(query),
    loadManual(query),
  ]);
  const xiaohongshu = placeholderXiaohongshu();

  // data/manual/<slug>.json 이 있으면 해당 플랫폼 결과 덮어쓰기 (user 수동 주입).
  const platforms = applyManual(
    { naver, google_maps: gmaps, pantip, youtube, xiaohongshu, lemon8 },
    manual,
  );

  const partial: ScoutResult = {
    query,
    generated_at: new Date().toISOString(),
    cached: false,
    platforms,
    global_score: 0,
    opportunity_cost_thb: 0,
    opportunity_cost_krw: 0,
  };
  partial.global_score = computeGlobalScore(partial);
  const cost = computeOpportunityCost(partial);
  partial.opportunity_cost_krw = cost.krw;
  partial.opportunity_cost_thb = cost.thb;

  await writeCache(partial);
  return NextResponse.json(partial);
}
