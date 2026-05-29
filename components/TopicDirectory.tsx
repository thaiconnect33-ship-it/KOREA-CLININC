import { Header } from "./Header";
import { Footer } from "./Footer";
import { TopicChip } from "./TopicChip";
import { loadTopics } from "@/lib/db";
import { t, type Lang, fmtNum } from "@/lib/i18n";

export async function TopicDirectoryPage({ lang }: { lang: Lang }) {
  const prefix = lang === "en" ? "/en" : "";
  const topics = await loadTopics();
  // 그룹핑 by slug.
  const groups = new Map<string, { slug: string; th: string; en: string; total_count: number; total_reach: number; sources: Set<string> }>();
  for (const tp of topics) {
    const g = groups.get(tp.slug) ?? { slug: tp.slug, th: tp.th, en: tp.en, total_count: 0, total_reach: 0, sources: new Set() };
    g.total_count += tp.count;
    g.total_reach += tp.reach;
    g.sources.add(tp.source);
    groups.set(tp.slug, g);
  }
  const all = Array.from(groups.values()).sort((a, b) => b.total_reach - a.total_reach);
  return (
    <>
      <Header lang={lang} />
      <main className="flex-1 max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-black mb-2">{t(lang, "nav_topics")}</h1>
        <p className="text-neutral-500 mb-8">{all.length} topics · {fmtNum(all.reduce((s, g) => s + g.total_reach, 0))} total reach</p>
        <div className="flex flex-wrap gap-2">
          {all.map((g) => (
            <TopicChip key={g.slug} slug={g.slug} label={lang === "th" ? g.th : g.en} reach={g.total_reach} prefix={prefix} />
          ))}
        </div>
      </main>
      <Footer lang={lang} />
    </>
  );
}
