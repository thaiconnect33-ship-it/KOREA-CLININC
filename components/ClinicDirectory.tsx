import Link from "next/link";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { ClinicCard } from "./ClinicCard";
import { TravelBar } from "./TravelBar";
import { loadAllClinics } from "@/lib/db";
import { t, type Lang, fmtNum } from "@/lib/i18n";

export async function ClinicDirectoryPage({ lang, region }: { lang: Lang; region?: string }) {
  const prefix = lang === "en" ? "/en" : "";
  const all = await loadAllClinics();
  const filtered = region ? all.filter((c) => c.region === region) : all;
  const sorted = filtered.sort((a, b) => b.global_score - a.global_score);

  // 지역별 카운트 — chip 필터에 사용.
  const counts = new Map<string, number>();
  for (const c of all) counts.set(c.region, (counts.get(c.region) || 0) + 1);
  const regions = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <Header lang={lang} />
      <TravelBar lang={lang} />
      <main className="flex-1 max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl md:text-4xl font-black mb-2">
          {region ? `${t(lang, "nav_clinics")} · ${region}` : t(lang, "nav_clinics")}
        </h1>
        <p className="text-neutral-500 mb-6">
          {fmtNum(sorted.length)} {lang === "th" ? "คลินิกในโซล" : "Seoul clinics"}
        </p>

        {/* Region filter chips */}
        <div className="flex flex-wrap gap-2 mb-8 -mx-1">
          <Link
            href={`${prefix}/clinic`}
            className={`px-3 py-1.5 rounded-full text-sm font-bold border ${!region ? "bg-black text-white border-black" : "bg-white border-neutral-300 hover:border-black"}`}
          >
            {lang === "th" ? "ทั้งหมด" : "All"} <span className="text-xs opacity-70">({fmtNum(all.length)})</span>
          </Link>
          {regions.map(([r, n]) => (
            <Link
              key={r}
              href={`${prefix}/clinic?region=${encodeURIComponent(r)}`}
              className={`px-3 py-1.5 rounded-full text-sm font-bold border ${region === r ? "bg-black text-white border-black" : "bg-white border-neutral-300 hover:border-black"}`}
            >
              📍 {r} <span className="text-xs opacity-70">({n})</span>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((c) => (
            <ClinicCard key={c.id} clinic={c} lang={lang} prefix={prefix} />
          ))}
        </div>
      </main>
      <Footer lang={lang} />
    </>
  );
}
