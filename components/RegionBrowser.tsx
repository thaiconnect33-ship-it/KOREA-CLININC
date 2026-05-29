// 지역별 클리닉 수 카드 — 강남/청담/압구정/홍대/명동/잠실 etc.
import Link from "next/link";
import { loadAllClinics } from "@/lib/db";
import { type Lang, fmtNum } from "@/lib/i18n";

const REGION_META: Record<string, { th: string; en: string; emoji: string }> = {
  "강남":     { th: "กังนัม",     en: "Gangnam",     emoji: "🏙️" },
  "청담":     { th: "ชองดัม",     en: "Cheongdam",   emoji: "💎" },
  "압구정":    { th: "อัปกูจอง",   en: "Apgujeong",   emoji: "✨" },
  "홍대":     { th: "ฮงแด",       en: "Hongdae",     emoji: "🎨" },
  "명동":     { th: "เมียงดง",   en: "Myeongdong",  emoji: "🛍️" },
  "잠실":     { th: "จัมซิล",     en: "Jamsil",      emoji: "🌆" },
  "신사":     { th: "ชินซา",     en: "Sinsa",       emoji: "🌟" },
  "서울":     { th: "โซล",       en: "Seoul",       emoji: "🇰🇷" },
};

export async function RegionBrowser({ lang, prefix }: { lang: Lang; prefix: string }) {
  const clinics = await loadAllClinics();
  const byRegion = new Map<string, number>();
  for (const c of clinics) {
    const r = c.region || "서울";
    byRegion.set(r, (byRegion.get(r) || 0) + 1);
  }
  const sorted = Array.from(byRegion.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {sorted.map(([region, count]) => {
        const meta = REGION_META[region] || { th: region, en: region, emoji: "📍" };
        return (
          <Link
            key={region}
            href={`${prefix}/clinic?region=${encodeURIComponent(region)}`}
            className="group bg-white border border-neutral-200 rounded-2xl p-4 hover:border-pink-400 hover:shadow-sm transition flex items-center gap-3"
          >
            <div className="text-3xl">{meta.emoji}</div>
            <div>
              <div className="font-bold group-hover:text-pink-600">{lang === "th" ? meta.th : meta.en}</div>
              <div className="text-xs text-neutral-500">{fmtNum(count)} {lang === "th" ? "คลินิก" : "clinics"}</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
