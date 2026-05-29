// 사용자 리뷰 carousel — Lemon8/Pantip/Xiaohongshu/Reddit sample_posts 합쳐서 가로 스크롤.
import Link from "next/link";
import { promises as fs } from "node:fs";
import path from "node:path";
import { type Lang, fmtNum } from "@/lib/i18n";

type RawPost = {
  title?: string;
  url?: string;
  author?: string;
  views?: number;
  likes?: number;
  topic?: string;
};

const FILES: { file: string; source: string; flag: string; bg: string }[] = [
  { file: "lemon8_market.json",      source: "Lemon8",      flag: "🍋", bg: "bg-yellow-50" },
  { file: "pantip_market.json",      source: "Pantip",      flag: "🇹🇭", bg: "bg-blue-50" },
  { file: "xiaohongshu_market.json", source: "Xiaohongshu", flag: "🇨🇳", bg: "bg-pink-50" },
  { file: "reddit_market.json",      source: "Reddit",      flag: "🌐", bg: "bg-orange-50" },
  { file: "realself_market.json",    source: "Realself",    flag: "🇺🇸", bg: "bg-emerald-50" },
];

type Card = { source: string; flag: string; bg: string; title: string; url: string; author: string; metric: number };

async function loadReviews(limit = 16): Promise<Card[]> {
  const out: Card[] = [];
  for (const f of FILES) {
    try {
      const raw = await fs.readFile(path.join(process.cwd(), "data", f.file), "utf-8");
      const j = JSON.parse(raw) as { sample_posts?: RawPost[] };
      for (const p of (j.sample_posts || []).slice(0, 8)) {
        if (!p.title || !p.url) continue;
        out.push({
          source: f.source, flag: f.flag, bg: f.bg,
          title: p.title.slice(0, 120),
          url: p.url,
          author: p.author || "",
          metric: p.likes ?? p.views ?? 0,
        });
      }
    } catch { /* skip */ }
  }
  // shuffle 약하게 (sort by metric desc, then interleave by source).
  return out.sort((a, b) => b.metric - a.metric).slice(0, limit);
}

export async function ReviewCarousel({ lang }: { lang: Lang }) {
  const cards = await loadReviews(20);
  if (cards.length === 0) return null;
  return (
    <div className="relative -mx-4">
      <div className="overflow-x-auto scrollbar-hide pb-3 px-4">
        <div className="flex gap-3 min-w-max">
          {cards.map((c, i) => (
            <Link
              key={i}
              href={c.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className={`block w-72 shrink-0 ${c.bg} rounded-2xl p-4 border border-neutral-200 hover:border-black transition`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold bg-white rounded px-1.5 py-0.5">{c.flag} {c.source}</span>
                {c.metric > 0 && (
                  <span className="text-xs text-neutral-500 font-semibold">
                    {c.metric.toLocaleString()} {c.source === "YouTube" ? (lang === "th" ? "ครั้ง" : "views") : "♥"}
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold leading-snug line-clamp-4">{c.title}</p>
              {c.author && <p className="text-xs text-neutral-500 mt-2">@{c.author}</p>}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
