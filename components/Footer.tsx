import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";

export function Footer({ lang }: { lang: Lang }) {
  const prefix = lang === "en" ? "/en" : "";
  return (
    <footer className="mt-20 border-t border-neutral-200 bg-neutral-50">
      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
        <div>
          <div className="font-black mb-3">{t(lang, "site_name")}</div>
          <p className="text-neutral-500 leading-relaxed">{t(lang, "tagline")}</p>
        </div>
        <div>
          <div className="font-semibold mb-3">Browse</div>
          <ul className="space-y-1.5 text-neutral-600">
            <li><Link href={`${prefix}/clinic`} className="hover:text-black">{t(lang, "nav_clinics")}</Link></li>
            <li><Link href={`${prefix}/topic`} className="hover:text-black">{t(lang, "nav_topics")}</Link></li>
            <li><Link href={`${prefix}/compare`} className="hover:text-black">{t(lang, "nav_compare")}</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-3">Business</div>
          <ul className="space-y-1.5 text-neutral-600">
            <li><Link href="/for-clinics" className="hover:text-black">{t(lang, "nav_for_clinics")}</Link></li>
            <li><Link href={`${prefix}/contact`} className="hover:text-black">{t(lang, "nav_contact")}</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-3">Info</div>
          <ul className="space-y-1.5 text-neutral-600">
            <li><Link href={`${prefix}/about`} className="hover:text-black">{t(lang, "footer_about")}</Link></li>
            <li><Link href={`${prefix}/privacy`} className="hover:text-black">{t(lang, "footer_priv")}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-neutral-200 py-4 text-center text-xs text-neutral-400">
        © {new Date().getFullYear()} KoreaBeautyMap
      </div>
    </footer>
  );
}
