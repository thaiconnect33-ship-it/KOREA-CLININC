/* 자동화 루프 — prefetch.ts 를 일정 간격으로 무한 반복.
 *
 * 동작:
 *   - prefetch 1회 실행 (sub-process spawn) → 대기 → 다시 prefetch ...
 *   - SLEEP_SEC 만큼 대기 (기본 21,600s = 6h).
 *   - 시드는 매 cycle 마다 다시 로드 → 새 seed_discovered.json 갱신되면 자동 picked up.
 *
 * 실행:
 *   npx tsx scripts/prefetch_loop.ts
 *
 * 중단:
 *   Ctrl-C 또는 프로세스 kill.
 */

import { spawn } from "node:child_process";
import path from "node:path";

const SLEEP_SEC = parseInt(process.env.LOOP_SLEEP_SEC || "21600", 10); // 6h 기본

function log(msg: string) {
  const t = new Date().toISOString();
  console.log(`[${t}] [loop] ${msg}`);
}

function runOnce(): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn("npx", ["tsx", "scripts/prefetch.ts"], {
      cwd: process.cwd(),
      stdio: "inherit",
      shell: true,
    });
    child.on("exit", (code) => resolve(code ?? 0));
    child.on("error", (e) => {
      console.error("[loop] spawn error:", e);
      resolve(1);
    });
  });
}

async function main() {
  let cycle = 0;
  while (true) {
    cycle++;
    log(`===== cycle ${cycle} 시작 =====`);
    const start = Date.now();
    const code = await runOnce();
    const elapsed = ((Date.now() - start) / 1000).toFixed(0);
    log(`cycle ${cycle} 종료 (exit ${code}, 소요 ${elapsed}s)`);
    log(`대기 ${SLEEP_SEC}s = ${(SLEEP_SEC / 3600).toFixed(1)}h ...`);
    await new Promise((r) => setTimeout(r, SLEEP_SEC * 1000));
  }
}

main().catch((e) => {
  console.error("[loop] fatal:", e);
  process.exit(1);
});
