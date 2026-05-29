// 파일 기반 결과 캐시. 같은 쿼리 24h 내 재조회 시 스크래핑 스킵.
// 디렉토리: data/cache/<slug>.json.
// 디렉토리는 lazy create.

import { promises as fs } from "node:fs";
import path from "node:path";
import type { ScoutResult } from "./types";

const CACHE_DIR = path.join(process.cwd(), "data", "cache");
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

function slugify(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9À-￿]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function readCache(query: string): Promise<ScoutResult | null> {
  const file = path.join(CACHE_DIR, `${slugify(query)}.json`);
  try {
    const raw = await fs.readFile(file, "utf-8");
    const parsed = JSON.parse(raw) as ScoutResult;
    const age = Date.now() - new Date(parsed.generated_at).getTime();
    if (age > TTL_MS) return null;
    return { ...parsed, cached: true };
  } catch {
    return null;
  }
}

export async function writeCache(result: ScoutResult): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const file = path.join(CACHE_DIR, `${slugify(result.query)}.json`);
  await fs.writeFile(file, JSON.stringify(result, null, 2), "utf-8");
}
