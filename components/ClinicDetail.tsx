import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { ReviewQuotes } from "./ReviewQuotes";
import { TrustStrip } from "./TrustStrip";
import { getClinicById, loadClinicReviews } from "@/lib/db";
import { youtubeId, youtubeThumb } from "@/lib/media";
import { t, type Lang, fmtNum } from "@/lib/i18n";

const PLATFORMS: { key: "naver" | "google_maps" | "pantip" | "youtube" | "lemon8"; label: string; flag: string; color: string }[] = [
  { key: "naver",       label: "Naver",       flag: "🇰🇷", color: "bg-emerald-500" },
  { key: "google_maps", label: "Google Maps", flag: "🌐", color: "bg-blue-500"    },
  { key: "pantip",      label: "Pantip",      flag: "🇹🇭", color: "bg-indigo-500" },
  { key: "youtube",     label: "YouTube",     flag: "▶️", color: "bg-red-500"     },
  { key: "lemon8",      label: "Lemon8",      flag: "🍋", color: "bg-yellow-500"  },
];

export async function ClinicDetailPage({ id, lang }: { id: string; lang: Lang }) {
  const clinic = await getClinicById(id);
  if (!clinic) notFound();
  const prefix = lang === "en" ? "/en" : "";
  const reviews = await loadClinicReviews(clinic);

  // 비디오 임베드 후보 — YouTube URL 만 추출.
  const videoReviews = reviews.filter((r) => r.source === "youtube" && youtubeId(r.url)).slice(0, 6);

  // 메트릭 차트용 max.
  const maxMetric = Math.max(
    clinic.naver_reviews, clinic.google_reviews, clinic.pantip_threads,
    clinic.youtube_videos, clinic.lemon8_posts, 1,
  );

  return (
    <>
      <Header lang={lang} />
      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden bg-gradient-to-br from-pink-50 via-white to-orange-50">
          <div className="max-w-5xl mx-auto px-4 py-10 md:py-14">
            <div className="text-xs text-neutral-500 mb-2">
              <Link href={`${prefix}/clinic`} className="hover:text-black">{t(lang, "nav_clinics")}</Link> · {clinic.region}
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">{clinic.en || clinic.ko}</h1>
            <p className="mt-2 text-neutral-600">{clinic.ko}</p>

            <div className="mt-6 flex flex-wrap gap-2 items-center">
              <span className="bg-black text-white text-sm font-bold rounded-full px-3 py-1">
                ⭐ Score {clinic.global_score}/100
              </span>
              {clinic.invisible_overseas && (
                <span className="bg-amber-100 text-amber-800 text-sm font-semibold rounded-full px-3 py-1">
                  ⚠️ {t(lang, "invisible_overseas")}
                </span>
              )}
              {reviews.length > 0 && (
                <span className="bg-emerald-100 text-emerald-800 text-sm font-semibold rounded-full px-3 py-1">
                  💬 {reviews.length} {lang === "th" ? "รีวิวจริง" : "real reviews"}
                </span>
              )}
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={`${prefix}/contact?clinic=${clinic.id}`}
                className="bg-pink-600 text-white font-bold rounded-full px-6 py-3 hover:bg-pink-700"
              >
                💌 {t(lang, "cta_book")}
              </Link>
              <Link
                href={`${prefix}/compare?a=${clinic.id}`}
                className="bg-white border border-neutral-300 font-bold rounded-full px-6 py-3 hover:border-black"
              >
                ⚖️ {t(lang, "nav_compare")}
              </Link>
            </div>
          </div>
        </section>

        {/* PLATFORM REACH BARS */}
        <section className="max-w-5xl mx-auto px-4 py-12">
          <h2 className="text-xl font-black mb-4">
            {lang === "th" ? "ผลงานบน 5 แพลตฟอร์ม" : "Reach across 5 platforms"}
          </h2>
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-3">
            {PLATFORMS.map((p) => {
              const pf = clinic.scout?.platforms[p.key];
              const v = pf?.metric_value ?? 0;
              const pct = (v / maxMetric) * 100;
              return (
                <div key={p.key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-bold">{p.flag} {p.label}</span>
                    <span className="font-mono">{fmtNum(v)} {pf?.metric_label ? <span className="text-neutral-400">{pf.metric_label}</span> : null}</span>
                  </div>
                  <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div className={`h-full ${p.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* VIDEO EMBEDS */}
        {videoReviews.length > 0 && (
          <section className="max-w-5xl mx-auto px-4 py-10 border-t border-neutral-100">
            <h2 className="text-xl font-black mb-4">
              ▶️ {lang === "th" ? "วิดีโอรีวิว" : "Video reviews"}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {videoReviews.map((v, i) => {
                const thumb = youtubeThumb(v.url, "hq");
                return (
                  <a
                    key={i}
                    href={v.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group"
                  >
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-neutral-200">
                      {thumb && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={thumb}
                          alt={v.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold rounded px-1.5 py-0.5">▶ YT</div>
                      {v.views && (
                        <div className="absolute bottom-2 left-2 text-white text-xs font-semibold">{fmtNum(v.views)} {lang === "th" ? "ครั้ง" : "views"}</div>
                      )}
                    </div>
                    <h3 className="mt-2 text-sm font-bold line-clamp-2 group-hover:text-pink-600">{v.title}</h3>
                    {v.author && <p className="text-xs text-neutral-500 mt-0.5">@{v.author}</p>}
                  </a>
                );
              })}
            </div>
          </section>
        )}

        {/* ALL REVIEWS embedded */}
        <ReviewQuotes quotes={reviews.filter((r) => r.source !== "youtube" || !youtubeId(r.url))} lang={lang} />

        {/* Invisible upsell */}
        {reviews.length === 0 && (
          <section className="max-w-3xl mx-auto px-4 py-12 border-t border-neutral-100">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
              <h2 className="text-xl font-black text-amber-900">
                {lang === "th" ? "ยังไม่พบรีวิวภาษาไทย/จีนสำหรับคลินิกนี้" : "No Thai or Chinese reviews found yet"}
              </h2>
              <p className="mt-2 text-sm text-amber-800">
                {lang === "th" ? "ลองเปรียบเทียบกับคลินิกที่มีรีวิวภาษาไทยแล้ว" : "Compare with clinics that already have Thai reviews."}
              </p>
              <Link
                href={`${prefix}/compare?a=${clinic.id}`}
                className="mt-4 inline-flex bg-amber-900 text-white text-sm font-bold rounded-full px-5 py-2"
              >
                {lang === "th" ? "เปรียบเทียบ →" : "Compare →"}
              </Link>
            </div>
          </section>
        )}

        {/* Trust */}
        <section className="max-w-5xl mx-auto px-4 py-12">
          <TrustStrip lang={lang} />
        </section>

        {/* CTA */}
        <section className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-black">{t(lang, "lead_title")}</h2>
          <p className="mt-2 text-neutral-600">{t(lang, "lead_sub")}</p>
          <Link
            href={`${prefix}/contact?clinic=${clinic.id}`}
            className="mt-6 inline-flex bg-pink-600 text-white font-bold rounded-full px-7 py-3 hover:bg-pink-700"
          >
            {t(lang, "cta_book")} →
          </Link>
        </section>
      </main>

      {/* Sticky mobile CTA */}
      <Link
        href={`${prefix}/contact?clinic=${clinic.id}`}
        className="md:hidden fixed bottom-4 left-4 right-4 z-50 bg-pink-600 text-white text-center font-bold rounded-full py-3.5 shadow-lg hover:bg-pink-700"
      >
        💌 {t(lang, "cta_book")}
      </Link>

      <Footer lang={lang} />
    </>
  );
}
