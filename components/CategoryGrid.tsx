import Link from "next/link";
import { PROCEDURES } from "@/lib/procedures";
import { type Lang } from "@/lib/i18n";

export function CategoryGrid({ lang, prefix }: { lang: Lang; prefix: string }) {
  return (
    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-6 gap-3">
      {PROCEDURES.map((p) => (
        <Link
          key={p.slug}
          href={`${prefix}/p/${p.slug}`}
          className="group flex flex-col items-center gap-2 bg-white border border-neutral-200 rounded-2xl p-4 hover:border-pink-400 hover:shadow-sm transition"
        >
          <div className="w-12 h-12 grid place-items-center text-2xl bg-gradient-to-br from-pink-50 to-orange-50 rounded-2xl group-hover:scale-110 transition-transform">
            {p.emoji}
          </div>
          <div className="text-xs font-semibold text-center leading-tight text-neutral-700 group-hover:text-pink-600">
            {lang === "th" ? p.th : lang === "en" ? p.en : p.ko}
          </div>
        </Link>
      ))}
    </div>
  );
}
