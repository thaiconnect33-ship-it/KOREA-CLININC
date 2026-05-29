import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";

export function Header({ lang }: { lang: Lang }) {
  const prefix = lang === "en" ? "/en" : "";
  const altPrefix = lang === "en" ? "" : "/en";
  const altLabel = lang === "en" ? "TH" : "EN";
  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-neutral-200">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-6">
        <Link href={prefix || "/"} className="font-black text-lg tracking-tight">
          <span className="text-pink-600">K</span>·BeautyMap
        </Link>
        <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-neutral-700">
          <Link href={`${prefix}/clinic`} className="hover:text-black">{t(lang, "nav_clinics")}</Link>
          <Link href={`${prefix}/topic`} className="hover:text-black">{t(lang, "nav_topics")}</Link>
          <Link href={`${prefix}/compare`} className="hover:text-black">{t(lang, "nav_compare")}</Link>
          <Link href="/for-clinics" className="hover:text-black">{t(lang, "nav_for_clinics")}</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link href={`${altPrefix}/`} className="text-xs font-semibold text-neutral-500 hover:text-black border border-neutral-300 rounded px-2 py-1">
            {altLabel}
          </Link>
          <Link
            href={`${prefix}/contact`}
            className="hidden sm:inline-flex bg-black text-white text-sm font-semibold rounded-full px-4 py-1.5 hover:bg-neutral-800"
          >
            {t(lang, "cta_book")}
          </Link>
        </div>
      </div>
    </header>
  );
}
