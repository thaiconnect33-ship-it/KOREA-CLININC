// Shared types for scout results.

export type PlatformResult = {
  ok: boolean;
  error?: string;
  // 각 플랫폼이 채우는 메트릭. metric_label / metric_value 가 dashboard 의 표시
  // 단위를 명시 (예: "리뷰", "스레드", "포스트").
  metric_label: string;
  metric_value: number;
  // 부가 데이터 (플랫폼별 raw).
  extra?: Record<string, unknown>;
};

export type ScoutResult = {
  query: string;
  generated_at: string;       // ISO timestamp
  cached: boolean;
  // 플랫폼별 결과. 일부 플랫폼은 placeholder (Phase 2) 일 수 있음.
  platforms: {
    naver: PlatformResult;
    google_maps: PlatformResult;
    pantip: PlatformResult;
    youtube: PlatformResult;
    xiaohongshu: PlatformResult;
    lemon8: PlatformResult;
  };
  // 가공된 지표
  global_score: number;       // 0-100
  opportunity_cost_thb: number;  // 월 예상 손실액 (THB; 클리닉 owner 의 국가별 통화 변환은 클라이언트)
  opportunity_cost_krw: number;  // 월 예상 손실액 (KRW; Hero 표시용)
};
