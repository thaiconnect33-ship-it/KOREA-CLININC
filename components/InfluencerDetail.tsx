import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { getInfluencerBySlug } from "@/lib/db";
import { t, type Lang, fmtNum } from "@/lib/i18n";

const KIND_META: Record<string, { label: string; color: string }> = {
  instagram: { label: "Instagram", color: "bg-pink-100 text-pink-700" },
  line:      { label: "Line",      color: "bg-green-100 text-green-700" },
  tiktok:    { label: "TikTok",    color: "bg-neutral-900 text-white" },
  email:     { label: "Email",     color: "bg-blue-100 text-blue-700" },
  facebook:  { label: "Facebook",  color: "bg-blue-50 text-blue-700" },
  twitter:   { label: "Twitter",   color: "bg-sky-100 text-sky-700" },
  website:   { label: "Website",   color: "bg-neutral-100 text-neutral-700" },
};

export async function InfluencerDetailPage({ slug, lang }: { slug: string; lang: Lang }) {
  const inf = await getInfluencerBySlug(slug);
  if (!inf) notFound();
  const prefix = lang === "en" ? "/en" : "";

  return (
    <>
      <Header lang={lang} />
      <main className="flex-1">
        <section className="bg-gradient-to-br from-pink-50 to-orange-50 border-b border-neutral-100">
          <div className="max-w-5xl mx-auto px-4 py-12">
            <div className="text-xs text-neutral-500 mb-3">
              <Link href={`${prefix}/influencer`} className="hover:text-black">{t(lang, "nav_influencers")}</Link>
            </div>
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 grid place-items-center text-white font-black text-3xl">
                {inf.channel.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight">{inf.channel}</h1>
                <p className="text-neutral-600 mt-1">
                  {inf.videos} {t(lang, "videos_count")} · {fmtNum(inf.total_views)} {t(lang, "views_count")}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {inf.topics.slice(0, 8).map((tp, i) => (
                <span key={i} className="bg-white border border-neutral-300 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                  {tp}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Contacts */}
        <section className="max-w-5xl mx-auto px-4 py-12">
          <h2 className="text-xl font-black mb-4">{t(lang, "contact_via")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {inf.contacts.map((c, i) => {
              const meta = KIND_META[c.kind] ?? { label: c.kind, color: "bg-neutral-100 text-neutral-700" };
              return (
                <a
                  key={i}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex items-center gap-3 bg-white border border-neutral-200 rounded-xl p-4 hover:border-black"
                >
                  <span className={`text-xs font-bold rounded px-2 py-0.5 ${meta.color}`}>{meta.label}</span>
                  <span className="font-mono text-sm truncate">{c.handle || c.url.slice(0, 60)}</span>
                </a>
              );
            })}
          </div>
        </section>

        {/* Brokerage CTA */}
        <section className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-black">
            {lang === "th" ? "อยากจองอินฟลูฯ คนนี้?" : "Want to book this creator?"}
          </h2>
          <p className="mt-2 text-neutral-600">
            {lang === "th"
              ? "เราดูแลการติดต่อ การเจรจา และการประสานงานให้ครบ ฟรีในรอบแรก"
              : "We handle outreach, negotiation, and brief — first round is on us."}
          </p>
          <Link
            href={`${prefix}/contact?influencer=${inf.handle_slug}`}
            className="mt-6 inline-flex bg-black text-white font-bold rounded-full px-7 py-3 hover:bg-neutral-800"
          >
            {lang === "th" ? "ขอข้อมูลการจอง" : "Request booking info"} →
          </Link>
        </section>

        <section className="max-w-5xl mx-auto px-4 pb-12">
          <a href={inf.channel_url} target="_blank" rel="noopener noreferrer nofollow" className="text-sm text-neutral-500 hover:text-black underline">
            → YouTube channel
          </a>
        </section>
      </main>
      <Footer lang={lang} />
    </>
  );
}
