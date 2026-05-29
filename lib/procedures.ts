// 시술 카테고리 — 홈 카테고리 그리드 + /p/[slug] 랜딩 페이지에서 사용.
// topic 데이터에서 자동 추출 못함 (한/태/영 키워드 매칭 필요) → 수동 큐레이션.

export type Procedure = {
  slug: string;
  emoji: string;
  th: string;
  en: string;
  ko: string;
  // 검색 키워드 — topic / clinic / review 매칭 시 쓰는 토큰들.
  keywords: string[];
  // 평균 비용 range — 추후 데이터 추가 시 갱신.
  cost_thb_min?: number;
  cost_thb_max?: number;
};

export const PROCEDURES: Procedure[] = [
  {
    slug: "rhinoplasty",
    emoji: "👃",
    th: "เสริมจมูก",
    en: "Rhinoplasty",
    ko: "코성형",
    keywords: ["rhinoplasty", "nose", "จมูก", "nose job", "코성형", "코"],
    cost_thb_min: 60_000, cost_thb_max: 250_000,
  },
  {
    slug: "double-eyelid",
    emoji: "👀",
    th: "ทำตาสองชั้น",
    en: "Double eyelid",
    ko: "쌍꺼풀",
    keywords: ["double eyelid", "blepharoplasty", "eyelid", "ตาสองชั้น", "쌍꺼풀", "눈매교정", "눈"],
    cost_thb_min: 25_000, cost_thb_max: 120_000,
  },
  {
    slug: "v-line",
    emoji: "💎",
    th: "ปรับโครงหน้า V-line",
    en: "V-line jaw",
    ko: "V라인 윤곽",
    keywords: ["v-line", "v line", "jaw surgery", "ตัดกราม", "양악", "윤곽", "안면윤곽", "턱"],
    cost_thb_min: 200_000, cost_thb_max: 500_000,
  },
  {
    slug: "filler",
    emoji: "💉",
    th: "ฟิลเลอร์",
    en: "Filler",
    ko: "필러",
    keywords: ["filler", "hyaluronic", "ฟิลเลอร์", "玻尿酸", "필러"],
    cost_thb_min: 5_000, cost_thb_max: 30_000,
  },
  {
    slug: "botox",
    emoji: "✨",
    th: "โบท็อกซ์",
    en: "Botox",
    ko: "보톡스",
    keywords: ["botox", "โบท็อกซ์", "肉毒素", "보톡스"],
    cost_thb_min: 4_000, cost_thb_max: 25_000,
  },
  {
    slug: "lifting",
    emoji: "⬆️",
    th: "ยกกระชับ Lifting",
    en: "Lifting",
    ko: "리프팅",
    keywords: ["lifting", "facelift", "ยกกระชับ", "提拉", "리프팅", "울쎄라", "써마지"],
    cost_thb_min: 20_000, cost_thb_max: 150_000,
  },
  {
    slug: "skin-care",
    emoji: "🌸",
    th: "ดูแลผิว",
    en: "Skincare & laser",
    ko: "피부 / 레이저",
    keywords: ["skincare", "skin", "laser", "ดูแลผิว", "皮肤", "피부", "레이저", "물광", "스킨부스터"],
    cost_thb_min: 3_000, cost_thb_max: 40_000,
  },
  {
    slug: "hair-transplant",
    emoji: "💇",
    th: "ปลูกผม",
    en: "Hair transplant",
    ko: "모발이식",
    keywords: ["hair transplant", "ปลูกผม", "植发", "모발이식"],
    cost_thb_min: 80_000, cost_thb_max: 300_000,
  },
  {
    slug: "breast",
    emoji: "🌷",
    th: "ศัลยกรรมหน้าอก",
    en: "Breast surgery",
    ko: "가슴성형",
    keywords: ["breast", "augmentation", "implant", "หน้าอก", "丰胸", "가슴"],
    cost_thb_min: 150_000, cost_thb_max: 400_000,
  },
  {
    slug: "liposuction",
    emoji: "🏃",
    th: "ดูดไขมัน",
    en: "Liposuction",
    ko: "지방흡입",
    keywords: ["liposuction", "lipo", "ดูดไขมัน", "吸脂", "지방흡입"],
    cost_thb_min: 80_000, cost_thb_max: 300_000,
  },
  {
    slug: "anti-aging",
    emoji: "🧬",
    th: "ชะลอวัย / Rejuran",
    en: "Anti-aging & Rejuran",
    ko: "동안 / 리쥬란",
    keywords: ["rejuran", "exosome", "stem cell", "童颜针", "리쥬란", "엑소좀", "스템셀"],
    cost_thb_min: 8_000, cost_thb_max: 50_000,
  },
  {
    slug: "acne-scar",
    emoji: "💧",
    th: "รักษาสิว / รอยแผลเป็น",
    en: "Acne & scar",
    ko: "여드름 / 흉터",
    keywords: ["acne", "scar", "สิว", "痘印", "여드름", "흉터"],
    cost_thb_min: 3_000, cost_thb_max: 30_000,
  },
];

export function getProcedure(slug: string): Procedure | null {
  return PROCEDURES.find((p) => p.slug === slug) ?? null;
}
