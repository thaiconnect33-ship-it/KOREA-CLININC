import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { InfluencerCard } from "./InfluencerCard";
import { getTopicGroup, loadInfluencers } from "@/lib/db";
import { t, type Lang, fmtNum } from "@/lib/i18n";

const SOURCE_META: Record<string, { label: string; flag: string }> = {
  lemon8:  { label: "Lemon8",  flag: "🍋" },
  pantip:  { label: "Pantip",  flag: "🇹🇭" },
  youtube: { label: "YouTube", flag: "▶️" },
};

export async function TopicDetailPage({ slug, lang }: { slug: string; lang: Lang }) {
  const topic = await getTopicGroup(slug);
  if (topic.by_source.length === 0) notFound();
  const prefix = lang === "en" ? "/en" : "";

  // 토픽 텍스트와 매칭되는 인플루언서.
  const allInfluencers = await loadInfluencers();
  const needle = topic.en.toLowerCase();
  const matched = allInfluencers
    .filter((i) => i.topics.some((tp) => tp.toLowerCase().includes(needle)))
    .slice(0, 8);

  return (
    <>
      <Header lang={lang} />
      <main className="flex-1">
        <section className="bg-gradient-to-br from-pink-50 to-white border-b border-neutral-100">
          <div className="max-w-5xl mx-auto px-4 py-12">
            <div className="text-xs text-neutral-500 mb-2">
              <Link href={`${prefix}/topic`} className="hover:text-black">{t(lang, "nav_topics")}</Link>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">{lang === "th" ? topic.th : topic.en}</h1>
            <p className="mt-3 text-neutral-600">
              {fmtNum(topic.total_count)} contents · {fmtNum(topic.total_reach)} {t(lang, "views_count")}
            </p>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 py-12">
          <h2 className="text-xl font-black mb-4">{lang === "th" ? "ที่มาของข้อมูล" : "Source breakdown"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topic.by_source.map((s) => {
              const meta = SOURCE_META[s.source];
              return (
                <div key={s.source} className="bg-white border border-neutral-200 rounded-xl p-5">
                  <div className="text-xs text-neutral-500 mb-1">{meta.flag} {meta.label}</div>
                  <div className="text-3xl font-black">{fmtNum(s.count)}</div>
                  <div className="text-xs text-neutral-500 mt-1">{fmtNum(s.reach)} {t(lang, "views_count")}</div>
                </div>
              );
            })}
          </div>
        </section>

        {matched.length > 0 && (
          <section className="max-w-5xl mx-auto px-4 py-12 border-t border-neutral-100">
            <h2 className="text-xl font-black mb-4">
              {lang === "th" ? "อินฟลูเอนเซอร์ในหัวข้อนี้" : "Influencers covering this topic"}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {matched.map((i) => <InfluencerCard key={i.handle_slug} inf={i} lang={lang} prefix={prefix} />)}
            </div>
          </section>
        )}

        <section className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-black">{t(lang, "lead_title")}</h2>
          <p className="mt-2 text-neutral-600">{t(lang, "lead_sub")}</p>
          <Link
            href={`${prefix}/contact?topic=${slug}`}
            className="mt-6 inline-flex bg-pink-600 text-white font-bold rounded-full px-7 py-3 hover:bg-pink-700"
          >
            {t(lang, "cta_book")} →
          </Link>
        </section>
      </main>
      <Footer lang={lang} />
    </>
  );
}
