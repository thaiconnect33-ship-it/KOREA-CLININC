// 수동 데이터 주입.
// 사용자가 `data/manual/<slug>.json` 에 Xiaohongshu/Lemon8 같이 자동 스크래핑이
// 어려운 플랫폼의 수치를 손으로 채워두면, API 가 결과 만들 때 자동 merge.
//
// 파일 형식 예시:
// {
//   "xiaohongshu": { "metric_value": 87, "extra": { "top_5_likes": 12000 } },
//   "lemon8":      { "metric_value": 23, "extra": { "note": "2026-05 수집" } },
//   "naver":       { "metric_value": 1234 },                  // 옵션 — 자동 결과 덮어쓰기
//   "google_maps": { "metric_value": 320, "extra": { "foreign_language_reviews": 47 } }
// }
//
// 각 플랫폼 key 는 ScoutResult.platforms 의 key 와 동일. 누락된 플랫폼은 자동 결과 유지.

import { promises as fs } from "node:fs";
import path from "node:path";
import type { PlatformResult, ScoutResult } from "./types";

const MANUAL_DIR = path.join(process.cwd(), "data", "manual");

type ManualEntry = Partial<{
  metric_value: number;
  metric_label: string;
  extra: Record<string, unknown>;
}>;
type ManualFile = Partial<Record<keyof ScoutResult["platforms"], ManualEntry>>;

function slugify(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9À-￿]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function loadManual(query: string): Promise<ManualFile | null> {
  const file = path.join(MANUAL_DIR, `${slugify(query)}.json`);
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as ManualFile;
  } catch {
    return null;
  }
}

/** 자동 결과 위에 manual entry 가 있으면 덮어쓰기. metric_value 있으면 ok=true 로 승격. */
export function mergeManual(auto: PlatformResult, manual: ManualEntry | undefined): PlatformResult {
  if (!manual) return auto;
  const merged: PlatformResult = { ...auto };
  if (typeof manual.metric_value === "number") {
    merged.metric_value = manual.metric_value;
    merged.ok = true;
    merged.error = undefined;
  }
  if (manual.metric_label) merged.metric_label = manual.metric_label;
  if (manual.extra) merged.extra = { ...(merged.extra ?? {}), ...manual.extra, manual_source: true };
  return merged;
}

export function applyManual(
  platforms: ScoutResult["platforms"],
  manual: ManualFile | null,
): ScoutResult["platforms"] {
  if (!manual) return platforms;
  return {
    naver: mergeManual(platforms.naver, manual.naver),
    google_maps: mergeManual(platforms.google_maps, manual.google_maps),
    pantip: mergeManual(platforms.pantip, manual.pantip),
    youtube: mergeManual(platforms.youtube, manual.youtube),
    xiaohongshu: mergeManual(platforms.xiaohongshu, manual.xiaohongshu),
    lemon8: mergeManual(platforms.lemon8, manual.lemon8),
  };
}
