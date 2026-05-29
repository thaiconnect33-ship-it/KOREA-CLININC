import { ClinicDirectoryPage } from "@/components/ClinicDirectory";

export const revalidate = 1800;

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const pick = (v: string | string[] | undefined) => Array.isArray(v) ? v[0] : v;
  return <ClinicDirectoryPage lang="th" region={pick(sp.region)} />;
}
