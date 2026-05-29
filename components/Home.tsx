import Link from "next/link";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { ClinicCard } from "./ClinicCard";
import { CategoryGrid } from "./CategoryGrid";
import { VideoCarousel } from "./VideoCarousel";
import { ReviewCarousel } from "./ReviewCarousel";
import { LiveTicker } from "./LiveTicker";
import { TrustStrip } from "./TrustStrip";
import { HotTopics } from "./HotTopics";
import { TravelBar } from "./TravelBar";
import { RegionBrowser } from "./RegionBrowser";
import { HeroSearch } from "./HeroSearch";
import { CostCalculator } from "./CostCalculator";
import { FAQ } from "./FAQ";
import { PatientStories } from "./PatientStories";
import { Newsletter } from "./Newsletter";
import { t, type Lang, fmtNum } from "@/lib/i18n";
import {
  loadAllClinics, loadInfluencers, loadHomeStats,
} from "@/lib/db";

export async function HomePage({ lang }: { lang: Lang }) {
  const prefix = lang === "en" ? "/en" : "";
  const [clinics, influencers, stats] = await Promise.all([
    loadAllClinics(),
    loadInfluencers(),
    loadHomeStats(),
  ]);
  const featuredClinics = clinics
    .filter((c) => c.scout)
    .sort((a, b) => b.global_score - a.global_score)
    .slice(0, 6);
  const moreClinics = clinics
    .filter((c) => c.scout)
    .sort((a, b) => b.global_score - a.global_score)
    .slice(6, 12);

  // 검색 자동완성용 클리닉 light data (id/ko/en/region 만).
  const searchClinics = clinics.map((c) => ({ id: c.id, ko: c.ko, en: c.en, region: c.region })).slice(0, 1000);

  return (
    <>
      <Header lang={lang} />
      <TravelBar lang={lang} />
      <main className="flex-1">
        {/* HERO ========================================================== */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-100 via-orange-50 to-yellow-50" />
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-pink-300/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-orange-300/30 rounded-full blur-3xl" />

          <div className="relative max-w-6xl mx-auto px-4 pt-10 pb-14 md:pt-16 md:pb-20">
            <div className="flex justify-center mb-6">
              <LiveTicker lang={lang} />
            </div>

            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-center leading-[1.05]">
              {lang === "th" ? (
                <>เกาหลี K-beauty ที่<span className="text-pink-600">จริง</span><br />ที่<span className="bg-yellow-200 px-2">คนไทย</span>ไว้ใจ</>
              ) : (
                <>The <span className="text-pink-600">honest</span> map of<br />Korean <span className="bg-yellow-200 px-2">K-beauty</span></>
              )}
            </h1>
            <p className="mt-5 max-w-2xl mx-auto text-base md:text-lg text-neutral-700 text-center">
              {lang === "th"
                ? `เปรียบเทียบ ${fmtNum(stats.clinics_count)} คลินิกในโซลจากรีวิวจริง 5 แพลตฟอร์ม — ไม่มีโฆษณาแฝง`
                : `Compare ${fmtNum(stats.clinics_count)} Seoul clinics across 5 real platforms — no paid placements.`}
            </p>

            {/* Hero Search (with autocomplete) */}
            <div className="mt-7">
              <HeroSearch lang={lang} clinics={searchClinics} />
            </div>

            {/* Quick stats inline */}
            <div className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm">
              <div><b className="text-2xl text-pink-600">{fmtNum(stats.clinics_count)}</b> <span className="text-neutral-600">{lang === "th" ? "คลินิก" : "clinics"}</span></div>
              <div><b className="text-2xl text-pink-600">{fmtNum(stats.youtube_views)}</b> <span className="text-neutral-600">{lang === "th" ? "การชม" : "views"}</span></div>
              <div><b className="text-2xl text-pink-600">{fmtNum(stats.lemon8_posts)}</b> <span className="text-neutral-600">Lemon8</span></div>
              <div><b className="text-2xl text-pink-600">{influencers.length}+</b> <span className="text-neutral-600">{lang === "th" ? "ครีเอเตอร์ลับ" : "private creators"}</span></div>
            </div>
          </div>
        </section>

        {/* CATEGORY GRID ================================================== */}
        <section className="max-w-6xl mx-auto px-4 pt-10 md:pt-14">
          <h2 className="text-xl md:text-2xl font-black mb-4">
            {lang === "th" ? "เลือกประเภทหัตถการที่สนใจ" : "Pick a procedure"}
          </h2>
          <CategoryGrid lang={lang} prefix={prefix} />
        </section>

        {/* REGION BROWSER ================================================ */}
        <section className="max-w-6xl mx-auto px-4 pt-14">
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-black">
              📍 {lang === "th" ? "เลือกย่านในโซล" : "Browse by district"}
            </h2>
          </div>
          <RegionBrowser lang={lang} prefix={prefix} />
        </section>

        {/* HOT TOPICS ==================================================== */}
        <section className="max-w-6xl mx-auto px-4 pt-14">
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-black">
              🔥 {lang === "th" ? "ฮ็อตประจำสัปดาห์" : "Hot this week"}
            </h2>
            <Link href={`${prefix}/topic`} className="text-sm text-neutral-500 hover:text-black">
              {lang === "th" ? "ดูทั้งหมด →" : "All →"}
            </Link>
          </div>
          <HotTopics lang={lang} prefix={prefix} />
        </section>

        {/* VIDEO CAROUSEL ================================================= */}
        <section className="max-w-6xl mx-auto px-4 pt-14">
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-black">
              ▶️ {lang === "th" ? "วิดีโอที่คนดูเยอะที่สุด" : "Most-watched videos"}
            </h2>
          </div>
          <VideoCarousel lang={lang} />
        </section>

        {/* FEATURED CLINICS =============================================== */}
        <section className="max-w-6xl mx-auto px-4 pt-14">
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-black">{t(lang, "section_clinics")}</h2>
            <Link href={`${prefix}/clinic`} className="text-sm text-neutral-500 hover:text-black">
              {lang === "th" ? "ดูทั้งหมด →" : "All →"}
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredClinics.map((c) => (
              <ClinicCard key={c.id} clinic={c} lang={lang} prefix={prefix} />
            ))}
          </div>
        </section>

        {/* COST CALCULATOR ============================================== */}
        <section className="max-w-6xl mx-auto px-4 pt-14">
          <CostCalculator lang={lang} />
        </section>

        {/* REVIEW CAROUSEL ================================================ */}
        <section className="max-w-6xl mx-auto px-4 pt-14">
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-black">
              💬 {lang === "th" ? "เสียงจริงจากแฟนๆ ทั่วเอเชีย" : "Real voices from Asia"}
            </h2>
          </div>
          <ReviewCarousel lang={lang} />
        </section>

        {/* PATIENT STORIES =============================================== */}
        <section className="max-w-6xl mx-auto px-4 pt-14">
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-black">
              💖 {lang === "th" ? "เรื่องราวจากคนที่เคยไปจริง" : "Real patient stories"}
            </h2>
          </div>
          <PatientStories lang={lang} />
        </section>

        {/* MORE CLINICS =================================================== */}
        <section className="max-w-6xl mx-auto px-4 pt-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {moreClinics.map((c) => (
              <ClinicCard key={c.id} clinic={c} lang={lang} prefix={prefix} />
            ))}
          </div>
        </section>

        {/* TRUST STRIP =================================================== */}
        <section className="max-w-6xl mx-auto px-4 pt-14">
          <TrustStrip lang={lang} />
        </section>

        {/* PRIVATE NETWORK (B2B tease) ================================== */}
        <section className="max-w-6xl mx-auto px-4 pt-14">
          <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-3xl p-8 md:p-12 text-white">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="max-w-xl">
                <div className="text-xs font-bold text-pink-300 tracking-wider mb-2">
                  {lang === "th" ? "เครือข่ายลับ" : "PRIVATE NETWORK"}
                </div>
                <h2 className="text-2xl md:text-3xl font-black leading-tight">
                  {lang === "th"
                    ? `${influencers.length}+ ครีเอเตอร์ลับทั่วเอเชีย 🇹🇭🇨🇳🇻🇳🇮🇩`
                    : `${influencers.length}+ vetted SE Asia & China creators`}
                </h2>
                <p className="mt-3 text-neutral-300 text-sm">
                  {lang === "th"
                    ? "คลินิกเกาหลีติดต่อได้ผ่านเราเท่านั้น — เรารักษาความน่าเชื่อถือไม่ให้รับงานทุกคลินิก"
                    : "Accessible to Korean clinics only through us. We preserve trust by not letting creators take every gig."}
                </p>
              </div>
              <Link href="/for-clinics" className="shrink-0 bg-pink-500 text-white font-bold rounded-full px-6 py-3 hover:bg-pink-400">
                {lang === "th" ? "คลินิก: ขอเข้าถึง →" : "Clinics: request access →"}
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ =========================================================== */}
        <section className="max-w-3xl mx-auto px-4 pt-14">
          <h2 className="text-2xl md:text-3xl font-black text-center mb-6">
            ❓ {lang === "th" ? "คำถามที่พบบ่อย" : "Frequently asked"}
          </h2>
          <FAQ lang={lang} />
        </section>

        {/* NEWSLETTER ==================================================== */}
        <section className="max-w-6xl mx-auto px-4 pt-14">
          <Newsletter lang={lang} />
        </section>

        {/* LEAD CTA ===================================================== */}
        <section className="max-w-3xl mx-auto px-4 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-black">{t(lang, "lead_title")}</h2>
          <p className="mt-3 text-neutral-600">{t(lang, "lead_sub")}</p>
          <Link
            href={`${prefix}/contact`}
            className="mt-7 inline-flex bg-pink-600 text-white font-bold rounded-full px-7 py-3 hover:bg-pink-700"
          >
            {t(lang, "cta_book")} →
          </Link>
        </section>
      </main>
      <Footer lang={lang} />
    </>
  );
}
