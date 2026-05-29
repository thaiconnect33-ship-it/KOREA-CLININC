// /p/[slug] — 시술별 랜딩.
// 구성: hero (이름 + emoji + cost range) → 추천 클리닉 → 리뷰 carousel → YouTube 영상 → 컨택.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { ClinicCard } from "./ClinicCard";
import { ReviewCarousel } from "./ReviewCarousel";
import { VideoCarousel } from "./VideoCarousel";
import { TrustStrip } from "./TrustStrip";
import { CostCalculator } from "./CostCalculator";
import { FAQ } from "./FAQ";
import { PatientStories } from "./PatientStories";
import { getProcedure } from "@/lib/procedures";
import { loadAllClinics } from "@/lib/db";
import { t, type Lang, fmtNum } from "@/lib/i18n";

export async function ProcedureDetailPage({ slug, lang }: { slug: string; lang: Lang }) {
  const proc = getProcedure(slug);
  if (!proc) notFound();
  const prefix = lang === "en" ? "/en" : "";

  // 키워드 매칭 — 클리닉 이름/지역에 procedure keyword 가 있거나, scout 데이터에 있는 클리닉 우선.
  // 단순 휴리스틱: top global_score 6개.
  const all = await loadAllClinics();
  const top = all.filter((c) => c.scout).sort((a, b) => b.global_score - a.global_score).slice(0, 9);

  const title = lang === "th" ? proc.th : proc.en;
  const costRange = (proc.cost_thb_min && proc.cost_thb_max)
    ? `${(proc.cost_thb_min / 1000).toFixed(0)}k – ${(proc.cost_thb_max / 1000).toFixed(0)}k THB`
    : null;

  return (
    <>
      <Header lang={lang} />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-pink-50 via-white to-orange-50">
          <div className="max-w-5xl mx-auto px-4 py-12 md:py-16">
            <div className="text-xs text-neutral-500 mb-3">
              <Link href="/" className="hover:text-black">{t(lang, "site_name")}</Link> /
              <Link href={`${prefix}/topic`} className="hover:text-black"> {t(lang, "nav_topics")}</Link>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-6xl">{proc.emoji}</div>
              <div>
                <h1 className="text-3xl md:text-5xl font-black tracking-tight">
                  {lang === "th" ? `เกาหลี · ${proc.th}` : `Korea · ${proc.en}`}
                </h1>
                <p className="mt-1 text-neutral-600">{proc.ko}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              {costRange && (
                <span className="bg-emerald-100 text-emerald-800 text-sm font-bold rounded-full px-3 py-1">
                  💸 {lang === "th" ? "ราคาประมาณ" : "Est. cost"}: {costRange}
                </span>
              )}
              <span className="bg-pink-100 text-pink-800 text-sm font-bold rounded-full px-3 py-1">
                {fmtNum(top.length)} {lang === "th" ? "คลินิกแนะนำ" : "recommended"}
              </span>
            </div>
            <div className="mt-7">
              <Link
                href={`${prefix}/contact?topic=${proc.slug}`}
                className="inline-flex bg-pink-600 text-white font-bold rounded-full px-7 py-3 hover:bg-pink-700"
              >
                {t(lang, "cta_book")} →
              </Link>
            </div>
          </div>
        </section>

        {/* Recommended clinics */}
        <section className="max-w-5xl mx-auto px-4 py-14">
          <h2 className="text-xl md:text-2xl font-black mb-4">
            {lang === "th" ? `คลินิกแนะนำสำหรับ ${proc.th}` : `Top clinics for ${proc.en}`}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {top.map((c) => <ClinicCard key={c.id} clinic={c} lang={lang} prefix={prefix} />)}
          </div>
        </section>

        {/* Real reviews */}
        <section className="max-w-5xl mx-auto px-4 py-10 border-t border-neutral-100">
          <h2 className="text-xl md:text-2xl font-black mb-4">
            💬 {lang === "th" ? "เสียงจริงจากผู้ใช้" : "What real users say"}
          </h2>
          <ReviewCarousel lang={lang} />
        </section>

        {/* Videos */}
        <section className="max-w-5xl mx-auto px-4 py-10 border-t border-neutral-100">
          <h2 className="text-xl md:text-2xl font-black mb-4">
            ▶️ {lang === "th" ? "วิดีโอรีวิว" : "Video reviews"}
          </h2>
          <VideoCarousel lang={lang} />
        </section>

        {/* Cost calculator */}
        <section className="max-w-5xl mx-auto px-4 py-10 border-t border-neutral-100">
          <CostCalculator lang={lang} defaultSlug={proc.slug} />
        </section>

        {/* Patient stories */}
        <section className="max-w-5xl mx-auto px-4 py-10 border-t border-neutral-100">
          <h2 className="text-xl md:text-2xl font-black mb-4">
            💖 {lang === "th" ? "เรื่องราวจากคนที่เคยไปจริง" : "Real patient stories"}
          </h2>
          <PatientStories lang={lang} />
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-4 py-10 border-t border-neutral-100">
          <h2 className="text-xl md:text-2xl font-black text-center mb-6">
            ❓ {lang === "th" ? "คำถามที่พบบ่อย" : "Frequently asked"}
          </h2>
          <FAQ lang={lang} />
        </section>

        {/* Trust */}
        <section className="max-w-5xl mx-auto px-4 py-10 border-t border-neutral-100">
          <TrustStrip lang={lang} />
        </section>

        {/* CTA */}
        <section className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl font-black">{t(lang, "lead_title")}</h2>
          <p className="mt-3 text-neutral-600">{t(lang, "lead_sub")}</p>
          <Link
            href={`${prefix}/contact?topic=${proc.slug}`}
            className="mt-7 inline-flex bg-pink-600 text-white font-bold rounded-full px-7 py-3 hover:bg-pink-700"
          >
            {t(lang, "cta_book")} ({title}) →
          </Link>
        </section>
      </main>
      <Footer lang={lang} />
    </>
  );
}
