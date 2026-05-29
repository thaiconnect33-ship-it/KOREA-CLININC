import { ProcedureDetailPage } from "@/components/ProcedureDetail";

export const revalidate = 1800;

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ProcedureDetailPage slug={slug} lang="th" />;
}
