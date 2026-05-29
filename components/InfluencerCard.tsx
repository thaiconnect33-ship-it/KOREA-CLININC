import Link from "next/link";
import type { Influencer } from "@/lib/db";
import { t, type Lang, fmtNum } from "@/lib/i18n";

const KIND_LABEL: Record<string, string> = {
  instagram: "IG",
  line: "Line",
  tiktok: "TT",
  email: "✉",
};

export function InfluencerCard({ inf, lang, prefix }: { inf: Influencer; lang: Lang; prefix: string }) {
  const core = inf.contacts.filter((l) => ["instagram", "line", "tiktok", "email"].includes(l.kind));
  return (
    <Link
      href={`${prefix}/influencer/${inf.handle_slug}`}
      className="group block bg-white border border-neutral-200 rounded-2xl p-5 hover:border-black hover:shadow-md transition"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 grid place-items-center text-white font-black text-sm">
          {inf.channel.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-sm truncate group-hover:text-pink-600">{inf.channel}</div>
          <div className="text-xs text-neutral-500">{inf.videos} {t(lang, "videos_count")} · {fmtNum(inf.total_views)} {t(lang, "views_count")}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {core.slice(0, 4).map((c, idx) => (
          <span key={idx} className="bg-neutral-100 text-neutral-700 text-[10px] font-bold rounded px-1.5 py-0.5">
            {KIND_LABEL[c.kind]} {c.handle ? `@${c.handle.slice(0, 14)}` : ""}
          </span>
        ))}
      </div>
    </Link>
  );
}
