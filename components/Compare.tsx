import Link from "next/link";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { ClinicCard } from "./ClinicCard";
import { loadAllClinics, type ClinicWithScout } from "@/lib/db";
import { t, type Lang, fmtNum } from "@/lib/i18n";

const METRICS: { key: keyof ClinicWithScout; label_th: string; label_en: string }[] = [
  { key: "global_score",    label_th: "คะแนนรวม",          label_en: "Global Score" },
  { key: "naver_reviews",   label_th: "Naver รีวิว",       label_en: "Naver reviews" },
  { key: "google_reviews",  label_th: "Google รีวิว",      label_en: "Google reviews" },
  { key: "pantip_threads",  label_th: "Pantip กระทู้",     label_en: "Pantip threads" },
  { key: "youtube_videos",  label_th: "YouTube วิดีโอ",    label_en: "YouTube videos" },
  { key: "lemon8_posts",    label_th: "Lemon8 โพสต์",      label_en: "Lemon8 posts" },
];

export async function ComparePage({ lang, a, b }: { lang: Lang; a?: string; b?: string }) {
  const all = await loadAllClinics();
  const prefix = lang === "en" ? "/en" : "";
  const clinicA = a ? all.find((c) => c.id === a) : null;
  const clinicB = b ? all.find((c) => c.id === b) : null;

  // 선택 안 됐을 때: top 10 추천 + 인기 비교 묶음 표시.
  if (!clinicA || !clinicB) {
    const top = all.filter((c) => c.scout).sort((a, b) => b.global_score - a.global_score).slice(0, 12);
    const pairs: [ClinicWithScout, ClinicWithScout][] = [];
    for (let i = 0; i < top.length - 1 && pairs.length < 6; i += 2) {
      pairs.push([top[i], top[i + 1]]);
    }
    return (
      <>
        <Header lang={lang} />
        <main className="flex-1 max-w-5xl mx-auto px-4 py-12">
          <h1 className="text-4xl font-black mb-2">{t(lang, "nav_compare")}</h1>
          <p className="text-neutral-500 mb-8">
            {lang === "th"
              ? "เปรียบเทียบคลินิกเกาหลี — เลือก 2 คลินิกที่อยากดู หรือเลือกคู่ยอดนิยมด้านล่าง"
              : "Compare Korean clinics side-by-side. Pick a popular pair below."}
          </p>
          <ChoosePicker lang={lang} clinics={top} />
          <h2 className="text-xl font-black mt-12 mb-4">
            {lang === "th" ? "คู่ยอดนิยม" : "Popular pairs"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pairs.map(([x, y]) => (
              <Link
                key={`${x.id}-${y.id}`}
                href={`${prefix}/compare?a=${x.id}&b=${y.id}`}
                className="flex items-center justify-between bg-white border border-neutral-200 rounded-2xl p-4 hover:border-black"
              >
                <span className="font-bold">{x.en || x.ko}</span>
                <span className="text-neutral-400">vs</span>
                <span className="font-bold">{y.en || y.ko}</span>
              </Link>
            ))}
          </div>
        </main>
        <Footer lang={lang} />
      </>
    );
  }

  const winner = (k: keyof ClinicWithScout): "a" | "b" | "tie" => {
    const va = (clinicA[k] as number) ?? 0;
    const vb = (clinicB[k] as number) ?? 0;
    if (va === vb) return "tie";
    return va > vb ? "a" : "b";
  };

  return (
    <>
      <Header lang={lang} />
      <main className="flex-1">
        <section className="bg-gradient-to-br from-pink-50 to-white border-b border-neutral-100">
          <div className="max-w-5xl mx-auto px-4 py-10">
            <div className="text-xs text-neutral-500 mb-3">
              <Link href={`${prefix}/compare`} className="hover:text-black">{t(lang, "nav_compare")}</Link>
            </div>
            <h1 className="text-3xl md:text-4xl font-black">
              {clinicA.en || clinicA.ko} <span className="text-neutral-400">vs</span> {clinicB.en || clinicB.ko}
            </h1>
            <p className="mt-2 text-neutral-600">
              {lang === "th"
                ? "เปรียบเทียบจากข้อมูลจริง 5 แพลตฟอร์ม (Naver, Google, Pantip, YouTube, Lemon8)"
                : "Honest comparison across 5 real platforms"}
            </p>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <ClinicCard clinic={clinicA} lang={lang} prefix={prefix} />
            <ClinicCard clinic={clinicB} lang={lang} prefix={prefix} />
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="text-left p-3 font-semibold text-neutral-500"></th>
                  <th className="text-right p-3 font-black">{clinicA.en || clinicA.ko}</th>
                  <th className="text-right p-3 font-black">{clinicB.en || clinicB.ko}</th>
                </tr>
              </thead>
              <tbody>
                {METRICS.map((m) => {
                  const w = winner(m.key);
                  const va = (clinicA[m.key] as number) ?? 0;
                  const vb = (clinicB[m.key] as number) ?? 0;
                  return (
                    <tr key={m.key as string} className="border-t border-neutral-100">
                      <td className="p-3 text-neutral-600">{lang === "th" ? m.label_th : m.label_en}</td>
                      <td className={`p-3 text-right font-bold ${w === "a" ? "text-pink-600" : "text-neutral-700"}`}>
                        {fmtNum(va)}{w === "a" && " ▲"}
                      </td>
                      <td className={`p-3 text-right font-bold ${w === "b" ? "text-pink-600" : "text-neutral-700"}`}>
                        {fmtNum(vb)}{w === "b" && " ▲"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <h3 className="font-black mb-2">
              {lang === "th" ? "เราอ่านข้อมูลยังไง?" : "How to read this"}
            </h3>
            <p className="text-sm text-neutral-700">
              {lang === "th"
                ? "Naver รีวิวสะท้อนตลาดในประเทศเกาหลี Pantip/Lemon8/YouTube สะท้อนความนิยมในไทย คลินิกที่ดีในเกาหลีอาจไม่ดังในไทย — เลือกคลินิกที่มีรีวิวเป็นภาษาที่คุณเข้าใจได้"
                : "Naver = Korean domestic reach. Pantip/Lemon8/YouTube = Thai-language coverage. A top Korean clinic may have zero Thai reviews. Pick one with reviews in your language."}
            </p>
          </div>

          <div className="mt-8 text-center">
            <Link
              href={`${prefix}/contact?clinic=${clinicA.id}`}
              className="inline-flex bg-pink-600 text-white font-bold rounded-full px-7 py-3 hover:bg-pink-700"
            >
              {t(lang, "cta_book")} →
            </Link>
          </div>
        </section>
      </main>
      <Footer lang={lang} />
    </>
  );
}

function ChoosePicker({ lang, clinics }: { lang: Lang; clinics: ClinicWithScout[] }) {
  return (
    <form className="bg-white border border-neutral-200 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto] gap-3 items-end" method="GET">
      <label className="block">
        <span className="text-xs text-neutral-500">A</span>
        <select name="a" className="mt-1 w-full border border-neutral-300 rounded-lg px-3 py-2.5">
          {clinics.map((c) => <option key={c.id} value={c.id}>{c.en || c.ko}</option>)}
        </select>
      </label>
      <span className="text-neutral-400 text-center pb-2">vs</span>
      <label className="block">
        <span className="text-xs text-neutral-500">B</span>
        <select name="b" className="mt-1 w-full border border-neutral-300 rounded-lg px-3 py-2.5">
          {clinics.slice(1).concat(clinics[0]).map((c) => <option key={c.id} value={c.id}>{c.en || c.ko}</option>)}
        </select>
      </label>
      <button type="submit" className="bg-black text-white font-bold rounded-lg px-5 py-2.5">
        {lang === "th" ? "เปรียบเทียบ" : "Compare"}
      </button>
    </form>
  );
}
