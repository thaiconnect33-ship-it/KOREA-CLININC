import { Header } from "./Header";
import { Footer } from "./Footer";
import { ContactForm } from "./ContactForm";
import { t, type Lang } from "@/lib/i18n";

export function ContactPageView({ lang, prefillClinic, prefillInfluencer, prefillTopic }: {
  lang: Lang;
  prefillClinic?: string;
  prefillInfluencer?: string;
  prefillTopic?: string;
}) {
  return (
    <>
      <Header lang={lang} />
      <main className="flex-1 max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-black mb-2">{t(lang, "lead_title")}</h1>
        <p className="text-neutral-600 mb-8">{t(lang, "lead_sub")}</p>
        <ContactForm lang={lang} prefillClinic={prefillClinic} prefillInfluencer={prefillInfluencer} prefillTopic={prefillTopic} />
      </main>
      <Footer lang={lang} />
    </>
  );
}
