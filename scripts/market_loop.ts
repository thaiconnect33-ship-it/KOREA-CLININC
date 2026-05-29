/* Master orchestrator — 모든 market 스크래퍼를 순차로 돌리고 6시간 sleep.
 *
 * 순서 (의도적으로 가벼운 것 먼저, 무거운 것 나중):
 *   1) reddit_market           (.json API, 빠름, ~5분)
 *   2) realself_market         (Playwright, ~15분)
 *   3) google_market           (Playwright + CAPTCHA 위험, ~10분)
 *   4) xhs_google_seed         (Playwright, ~30분 — 30-60s sleep)
 *   5) xhs_fetch               (Playwright, 매우 느림 — URL 수에 비례)
 *   6) lemon8_market           (이미 있음, refresh)
 *   7) pantip_market           (이미 있음, refresh)
 *   8) youtube_market          (이미 있음, refresh)
 *
 * 안전:
 *   - 한 스크립트 실패해도 다음 진행
 *   - 30s gap between scripts
 *   - 한 cycle 끝나면 SLEEP_SEC 만큼 대기 (기본 6h)
 *
 * 실행: npx tsx scripts/market_loop.ts
 */

import { spawn } from "node:child_process";

const SLEEP_SEC = parseInt(process.env.LOOP_SLEEP_SEC || "21600", 10); // 6h
const SCRIPTS = [
  "scripts/reddit_market.ts",
  "scripts/realself_market.ts",
  "scripts/google_market.ts",
  "scripts/xhs_google_seed.ts",
  "scripts/xhs_fetch.ts",
  "scripts/lemon8_market.ts",
  "scripts/pantip_market.ts",
  "scripts/youtube_market.ts",
];

function log(msg: string) { console.log(`[${new Date().toISOString()}] [market-loop] ${msg}`); }

function runOnce(script: string): Promise<number> {
  return new Promise((resolve) => {
    log(`▶ ${script}`);
    const t0 = Date.now();
    const child = spawn("npx", ["tsx", script], { cwd: process.cwd(), stdio: "inherit", shell: true });
    child.on("exit", (code) => {
      const dur = ((Date.now() - t0) / 1000).toFixed(0);
      log(`✓ ${script} (exit ${code}, ${dur}s)`);
      resolve(code ?? 0);
    });
    child.on("error", (e) => { log(`✗ ${script}: ${e.message}`); resolve(1); });
  });
}

async function main() {
  let cycle = 0;
  while (true) {
    cycle++;
    log(`===== cycle ${cycle} =====`);
    for (const s of SCRIPTS) {
      try { await runOnce(s); }
      catch (e) { log(`uncaught: ${e instanceof Error ? e.message : String(e)}`); }
      await new Promise((r) => setTimeout(r, 30_000));
    }
    log(`cycle ${cycle} 끝 — ${SLEEP_SEC}s 대기 (${(SLEEP_SEC / 3600).toFixed(1)}h)`);
    await new Promise((r) => setTimeout(r, SLEEP_SEC * 1000));
  }
}

main().catch((e) => { console.error("[market-loop] fatal:", e); process.exit(1); });
