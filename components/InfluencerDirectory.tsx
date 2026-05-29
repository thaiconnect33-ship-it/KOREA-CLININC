import { Header } from "./Header";
import { Footer } from "./Footer";
import { InfluencerCard } from "./InfluencerCard";
import { loadInfluencers } from "@/lib/db";
import { t, type Lang, fmtNum } from "@/lib/i18n";

export async function InfluencerDirectoryPage({ lang }: { lang: Lang }) {
  const prefix = lang === "en" ? "/en" : "";
  const all = (await loadInfluencers())
    .sort((a, b) => (b.videos - a.videos) || (b.total_views - a.total_views));
  return (
    <>
      <Header lang={lang} />
      <main className="flex-1 max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-black mb-2">{t(lang, "nav_influencers")}</h1>
        <p className="text-neutral-500 mb-8">{fmtNum(all.length)} Thai creators · K-beauty / Korean surgery</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {all.map((i) => (
            <InfluencerCard key={i.handle_slug} inf={i} lang={lang} prefix={prefix} />
          ))}
        </div>
      </main>
      <Footer lang={lang} />
    </>
  );
}
