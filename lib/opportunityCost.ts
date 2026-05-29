// 기회비용 (월 예상 손실액) 계산.
// 공식: Opportunity_Cost = (C_competitor - C_my) * R_conversion * V_ticket
// C_competitor 는 지역별 상수 테이블에서 lookup.

import type { ScoutResult } from "./types";

// 지역별 탑티어 경쟁사 평균 총 언급량 (글로벌 플랫폼 합산).
// 강남/홍대/청담 등 한국 성형/피부과 핫스팟 기준. 임의 상수 — 실 데이터로 calibrate 필요.
const COMPETITOR_AVG: Record<string, number> = {
  강남: 300,
  청담: 280,
  홍대: 220,
  압구정: 290,
  잠실: 180,
  // ...
};
const DEFAULT_COMPETITOR_AVG = 200;

const CONVERSION_RATE = 0.01;       // 언급 1건당 0.01 명 결제 전환
const TICKET_KRW = 2_000_000;       // 하이엔드 객단가 (KRW)
const TICKET_THB = 50_000;          // 환산 (1 KRW ≈ 0.025 THB)

export function detectRegion(query: string): { region: string; competitorAvg: number } {
  for (const [region, avg] of Object.entries(COMPETITOR_AVG)) {
    if (query.includes(region)) return { region, competitorAvg: avg };
  }
  return { region: "기타", competitorAvg: DEFAULT_COMPETITOR_AVG };
}

/** 글로벌 플랫폼 (gmaps 다국어 + xiaohongshu + lemon8 + pantip + youtube 외국어) 의 언급량 합. */
export function myGlobalMentions(r: ScoutResult): number {
  const gmapsForeign = (r.platforms.google_maps.extra?.foreign_language_reviews as number | undefined) ?? 0;
  const ytForeign = (r.platforms.youtube.extra?.foreign_video_count as number | undefined) ?? 0;
  return (
    gmapsForeign +
    r.platforms.xiaohongshu.metric_value +
    r.platforms.lemon8.metric_value +
    r.platforms.pantip.metric_value +
    ytForeign
  );
}

export function computeOpportunityCost(r: ScoutResult): { krw: number; thb: number; region: string } {
  const { region, competitorAvg } = detectRegion(r.query);
  const my = myGlobalMentions(r);
  const gap = Math.max(0, competitorAvg - my);
  const krw = Math.round(gap * CONVERSION_RATE * TICKET_KRW);
  const thb = Math.round(gap * CONVERSION_RATE * TICKET_THB);
  return { krw, thb, region };
}
