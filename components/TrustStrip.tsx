import { type Lang } from "@/lib/i18n";

const ITEMS_TH = [
  { ic: "🚫", title: "ไม่มีโฆษณาแฝง",         sub: "คลินิกจ่ายเงินไม่ได้อันดับขึ้น" },
  { ic: "🔍", title: "5 แหล่งรีวิวจริง",       sub: "Naver · Google · Pantip · Lemon8 · YT" },
  { ic: "💸", title: "ปรึกษาฟรี",               sub: "ไม่ผูกมัด ไม่มีค่าธรรมเนียม" },
  { ic: "🇰🇷", title: "528 คลินิกในโซล",       sub: "Updated ทุกวัน" },
];
const ITEMS_EN = [
  { ic: "🚫", title: "No paid placements",     sub: "Clinics can't buy ranking" },
  { ic: "🔍", title: "5 real review sources",  sub: "Naver · Google · Pantip · Lemon8 · YT" },
  { ic: "💸", title: "Free consult",           sub: "No commitment, no fee" },
  { ic: "🇰🇷", title: "528 Seoul clinics",      sub: "Updated daily" },
];

export function TrustStrip({ lang }: { lang: Lang }) {
  const items = lang === "en" ? ITEMS_EN : ITEMS_TH;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((it, i) => (
        <div key={i} className="bg-white border border-neutral-200 rounded-2xl p-4 flex items-start gap-3">
          <div className="text-2xl">{it.ic}</div>
          <div>
            <div className="font-bold text-sm">{it.title}</div>
            <div className="text-xs text-neutral-500 mt-0.5">{it.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
