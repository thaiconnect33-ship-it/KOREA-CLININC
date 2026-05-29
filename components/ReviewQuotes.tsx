import type { ReviewQuote } from "@/lib/db";
import { fmtNum, type Lang } from "@/lib/i18n";

const META: Record<ReviewQuote["source"], { label: string; flag: string; color: string }> = {
  lemon8:      { label: "Lemon8",      flag: "🍋", color: "bg-yellow-100 text-yellow-800" },
  pantip:      { label: "Pantip",      flag: "🇹🇭", color: "bg-blue-100 text-blue-800" },
  youtube:     { label: "YouTube",     flag: "▶️", color: "bg-red-100 text-red-800" },
  xiaohongshu: { label: "Xiaohongshu", flag: "🇨🇳", color: "bg-pink-100 text-pink-800" },
  reddit:      { label: "Reddit",      flag: "🌐", color: "bg-orange-100 text-orange-800" },
  realself:    { label: "Realself",    flag: "🇺🇸", color: "bg-emerald-100 text-emerald-800" },
  google:      { label: "Google",      flag: "🔎", color: "bg-neutral-100 text-neutral-800" },
};

export function ReviewQuotes({ quotes, lang }: { quotes: ReviewQuote[]; lang: Lang }) {
  if (quotes.length === 0) return null;
  return (
    <section className="max-w-5xl mx-auto px-4 py-12 border-t border-neutral-100">
      <h2 className="text-xl font-black mb-1">
        {lang === "th" ? "เสียงจริงจากแฟนๆ ทั่วเอเชีย" : "Real voices from Asia"}
      </h2>
      <p className="text-sm text-neutral-500 mb-5">
        {lang === "th"
          ? `${quotes.length} รีวิว/โพสต์ที่กล่าวถึงคลินิกนี้`
          : `${quotes.length} posts mentioning this clinic`}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {quotes.map((q, i) => {
          const meta = META[q.source];
          return (
            <a
              key={i}
              href={q.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="block bg-white border border-neutral-200 rounded-2xl p-4 hover:border-black"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-bold rounded px-2 py-0.5 ${meta.color}`}>
                  {meta.flag} {meta.label}
                </span>
                {q.author && <span className="text-xs text-neutral-500 truncate">@{q.author}</span>}
                <span className="ml-auto text-xs text-neutral-400">
                  {q.views ? `${fmtNum(q.views)} ${lang === "th" ? "ครั้ง" : "views"}` : q.likes ? `♥ ${fmtNum(q.likes)}` : ""}
                </span>
              </div>
              <p className="text-sm leading-snug line-clamp-3">{q.title || q.snippet}</p>
            </a>
          );
        })}
      </div>
    </section>
  );
}
