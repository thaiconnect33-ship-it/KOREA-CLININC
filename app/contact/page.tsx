import { ContactPageView } from "@/components/ContactPage";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const pick = (v: string | string[] | undefined) => Array.isArray(v) ? v[0] : v;
  return (
    <ContactPageView
      lang="th"
      prefillClinic={pick(sp.clinic)}
      prefillInfluencer={pick(sp.influencer)}
      prefillTopic={pick(sp.topic)}
    />
  );
}
