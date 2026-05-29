// "이번 주 핫" — topic 데이터에서 reach 상위 6개 + procedures 매칭.
import Link from "next/link";
import { loadTopics } from "@/lib/db";
import { PROCEDURES } from "@/lib/procedures";
import { type Lang, fmtNum } from "@/lib/i18n";

export async function HotTopics({ lang, prefix }: { lang: Lang; prefix: string }) {
  const topics = await loadTopics();
  // 그룹핑 by slug → reach 합계.
  const grouped = new Map<string, { slug: string; en: string; th: string; reach: number; count: number }>();
  for (const t of topics) {
    const g = grouped.get(t.slug) ?? { slug: t.slug, en: t.en, th: t.th, reach: 0, count: 0 };
    g.reach += t.reach;
    g.count += t.count;
    grouped.set(t.slug, g);
  }
  // procedures 매칭 우선 — keyword 가 topic 에 들어가면 procedure 페이지로.
  const top = Array.from(grouped.values()).sort((a, b) => b.reach - a.reach).slice(0, 6);
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {top.map((g, i) => {
        const proc = PROCEDURES.find((p) => p.keywords.some((k) => g.en.toLowerCase().includes(k.toLowerCase())));
        const href = proc ? `${prefix}/p/${proc.slug}` : `${prefix}/topic/${g.slug}`;
        const label = proc ? (lang === "th" ? proc.th : proc.en) : (lang === "th" ? g.th : g.en);
        return (
          <Link
            key={g.slug + i}
            href={href}
            className="bg-white border border-neutral-200 rounded-2xl p-5 hover:border-pink-400 hover:shadow-md transition group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{proc?.emoji || "🔥"}</div>
                <div>
                  <div className="text-xs text-neutral-500 font-semibold">#{i + 1} {lang === "th" ? "ฮ็อต" : "Hot"}</div>
                  <div className="font-bold text-base group-hover:text-pink-600">{label}</div>
                </div>
              </div>
            </div>
            <div className="mt-3 text-xs text-neutral-500 flex gap-3">
              <span><b className="text-neutral-700">{fmtNum(g.count)}</b> {lang === "th" ? "โพสต์" : "posts"}</span>
              <span><b className="text-neutral-700">{fmtNum(g.reach)}</b> {lang === "th" ? "การเข้าถึง" : "reach"}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
