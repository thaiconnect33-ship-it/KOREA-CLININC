// Thai 환자 한국행 핵심 정보 — 비자/언어/거리/통화.
import { type Lang } from "@/lib/i18n";

const ROWS_TH = [
  { ic: "🛂", k: "วีซ่า",   v: "ไม่ต้อง 90 วัน" },
  { ic: "✈️", k: "บินตรง",  v: "6 ชม. · 8 สายการบิน" },
  { ic: "🗣️", k: "ภาษา",    v: "ล่ามไทย ฟรี" },
  { ic: "💱", k: "อัตราแลก", v: "≈ 1 บาท = 38 KRW" },
];
const ROWS_EN = [
  { ic: "🛂", k: "Visa",      v: "Visa-free 90 days" },
  { ic: "✈️", k: "Direct",    v: "6 hr · 8 airlines" },
  { ic: "🗣️", k: "Language",  v: "Free Thai translator" },
  { ic: "💱", k: "Currency",  v: "≈ 1 THB = 38 KRW" },
];

export function TravelBar({ lang }: { lang: Lang }) {
  const rows = lang === "en" ? ROWS_EN : ROWS_TH;
  return (
    <div className="bg-emerald-50 border-y border-emerald-200">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap gap-x-6 gap-y-2 text-xs items-center justify-center">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span>{r.ic}</span>
            <span className="font-semibold text-emerald-900">{r.k}:</span>
            <span className="text-emerald-700">{r.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
