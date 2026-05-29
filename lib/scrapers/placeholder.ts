// Xiaohongshu / Lemon8 placeholder.
// MVP 에선 0 반환. 데이터는 사용자가 별도 수집해서 주입할 예정.

import type { PlatformResult } from "../types";

export function placeholderXiaohongshu(): PlatformResult {
  return {
    ok: false,
    error: "manual fill — bot 방어 심해서 데이터 외부에서 수집",
    metric_label: "포스트",
    metric_value: 0,
    extra: { top_5_likes: 0, manual: true },
  };
}

export function placeholderLemon8(): PlatformResult {
  return {
    ok: false,
    error: "manual fill — ByteDance 봇 방어, 외부 수집",
    metric_label: "포스트",
    metric_value: 0,
    extra: { manual: true },
  };
}
