import Link from "next/link";
import type { ClinicWithScout } from "@/lib/db";
import { t, type Lang, fmtNum } from "@/lib/i18n";
import { StarRating } from "./StarRating";
import { WishlistButton } from "./WishlistButton";

export function ClinicCard({ clinic, lang, prefix }: { clinic: ClinicWithScout; lang: Lang; prefix: string }) {
  const name = clinic.en || clinic.ko;
  return (
    <Link
      href={`${prefix}/clinic/${clinic.id}`}
      className="group relative block bg-white border border-neutral-200 rounded-2xl p-5 hover:border-black hover:shadow-md transition"
    >
      <WishlistButton id={clinic.id} className="absolute top-3 right-3 z-10" />
      <div className="flex items-start justify-between gap-2 mb-1 pr-10">
        <h3 className="font-bold text-lg leading-tight group-hover:text-pink-600">{name}</h3>
        {clinic.global_score > 0 && (
          <span className="shrink-0 bg-neutral-900 text-white text-xs font-bold rounded-full px-2 py-0.5">
            {clinic.global_score}
          </span>
        )}
      </div>
      {clinic.global_score > 0 && <StarRating score={clinic.global_score} />}
      <p className="text-xs text-neutral-500 mb-4 mt-1">{clinic.ko} · 📍 {clinic.region}</p>
      <dl className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-neutral-400">Naver</dt>
          <dd className="font-semibold">{fmtNum(clinic.naver_reviews)}</dd>
        </div>
        <div>
          <dt className="text-neutral-400">Google</dt>
          <dd className="font-semibold">{fmtNum(clinic.google_reviews)}</dd>
        </div>
        <div>
          <dt className="text-neutral-400">YouTube</dt>
          <dd className="font-semibold">{fmtNum(clinic.youtube_videos)}</dd>
        </div>
      </dl>
      {clinic.invisible_overseas && (
        <div className="mt-4 inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full px-2 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          {t(lang, "invisible_overseas")}
        </div>
      )}
    </Link>
  );
}
