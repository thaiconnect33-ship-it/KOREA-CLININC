/* 일회성 — seed_discovered.json 의 클리닉명 정리 + dedup.
 *
 * 원인: discover.ts 가 Naver Map anchor textContent 를 통째로 잡아서 톡톡 뱃지 + 카테고리
 *      suffix 가 이름에 합쳐졌음.
 *
 * 실행: npx tsx scripts/clean_seeds.ts
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { cleanClinicName, nameKey } from "../lib/cleanClinicName";

type Seed = { id: string; ko: string; en: string; region: string; place_id?: string };

async function main() {
  const file = path.join(process.cwd(), "data", "seed_discovered.json");
  const raw = await fs.readFile(file, "utf-8");
  const seeds = JSON.parse(raw) as Seed[];

  const cleanedByKey = new Map<string, Seed>();
  let changed = 0;
  let dedup = 0;
  for (const s of seeds) {
    const cleanedKo = cleanClinicName(s.ko);
    if (cleanedKo !== s.ko) changed++;
    const k = nameKey(cleanedKo) + "::" + s.region;
    if (cleanedByKey.has(k)) {
      dedup++;
      continue;
    }
    cleanedByKey.set(k, {
      ...s,
      ko: cleanedKo,
      en: cleanClinicName(s.en),
    });
  }
  const out = Array.from(cleanedByKey.values());
  // backup 후 저장.
  await fs.writeFile(file + ".pre-clean.bak", raw, "utf-8");
  await fs.writeFile(file, JSON.stringify(out, null, 2), "utf-8");
  console.log(`정리 — ${seeds.length} → ${out.length} (정리됨 ${changed}, dedup ${dedup})`);
  console.log(`백업: ${file}.pre-clean.bak`);
}

main().catch((e) => { console.error(e); process.exit(1); });
