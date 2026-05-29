// 글로벌 인지도 점수 (0-100).
// 가중치: gmaps 다국어 30 + xiaohongshu 30 + lemon8 30 + pantip 10.
// 각 메트릭은 normalize 한 뒤 가중 평균. saturate 기준은 임의 상수 — 실 데이터로 조정.

import type { ScoutResult } from "./types";

const SATURATE = {
  gmaps_foreign: 50,    // 다국어 리뷰 50건 이상이면 만점
  xiaohongshu: 200,     // 포스트 200건 이상이면 만점
  lemon8: 100,
  pantip: 30,
  youtube_foreign: 25,  // 외국어 비디오 25개 이상이면 만점
};

function norm(value: number, max: number): number {
  return Math.min(1, Math.max(0, value / max));
}

// 가중치 (총 100):
//   gmaps_foreign 25 + xiaohongshu 20 + lemon8 15 + pantip 20 + youtube 20.
export function computeGlobalScore(r: ScoutResult): number {
  const gmapsForeign = (r.platforms.google_maps.extra?.foreign_language_reviews as number | undefined) ?? 0;
  const ytForeign = (r.platforms.youtube.extra?.foreign_video_count as number | undefined) ?? 0;
  const xs = r.platforms.xiaohongshu.metric_value;
  const lm = r.platforms.lemon8.metric_value;
  const pt = r.platforms.pantip.metric_value;
  const score =
    norm(gmapsForeign, SATURATE.gmaps_foreign) * 25 +
    norm(xs, SATURATE.xiaohongshu) * 20 +
    norm(lm, SATURATE.lemon8) * 15 +
    norm(pt, SATURATE.pantip) * 20 +
    norm(ytForeign, SATURATE.youtube_foreign) * 20;
  return Math.round(score);
}
