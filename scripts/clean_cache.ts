/* cache/<dirty>.json → cache/<clean>.json rename.
 * cleanClinicName 으로 노이즈 제거 후 다른 슬러그가 나오면 rename.
 * 충돌 시 (이미 clean 파일 존재) 새 데이터의 query 필드 보고 우선순위 결정 — 단순화: skip.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { cleanClinicName } from "../lib/cleanClinicName";

const CACHE = path.join(process.cwd(), "data", "cache");

function slugify(query: string): string {
  return query.toLowerCase()
    .replace(/[^a-z0-9À-￿]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function main() {
  const files = await fs.readdir(CACHE);
  let renamed = 0, skipped = 0, deleted = 0;
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    const base = f.replace(/\.json$/, "");
    const cleaned = cleanClinicName(base);
    if (cleaned === base) continue;
    const newName = slugify(cleaned) + ".json";
    if (newName === f) continue;
    const newPath = path.join(CACHE, newName);
    const oldPath = path.join(CACHE, f);
    try {
      // 충돌 확인 — clean 파일이 이미 있으면 dirty 파일은 그냥 삭제 (clean 이 우선).
      await fs.access(newPath);
      await fs.unlink(oldPath);
      deleted++;
      continue;
    } catch { /* 새 파일 없음 — rename 가능 */ }
    try {
      await fs.rename(oldPath, newPath);
      // 내부 query 필드도 업데이트.
      const raw = await fs.readFile(newPath, "utf-8");
      const j = JSON.parse(raw);
      if (j.query) {
        j.query = cleanClinicName(j.query);
        await fs.writeFile(newPath, JSON.stringify(j, null, 2), "utf-8");
      }
      renamed++;
    } catch (e) {
      console.warn(`skip ${f}: ${e instanceof Error ? e.message : String(e)}`);
      skipped++;
    }
  }
  console.log(`완료 — renamed ${renamed}, deleted (dup) ${deleted}, skipped ${skipped}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
