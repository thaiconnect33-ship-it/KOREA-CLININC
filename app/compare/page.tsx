import { ComparePage } from "@/components/Compare";

export const revalidate = 1800;

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const pick = (v: string | string[] | undefined) => Array.isArray(v) ? v[0] : v;
  return <ComparePage lang="th" a={pick(sp.a)} b={pick(sp.b)} />;
}
