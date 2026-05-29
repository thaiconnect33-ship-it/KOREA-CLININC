import { ClinicDetailPage } from "@/components/ClinicDetail";

export const revalidate = 1800;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClinicDetailPage id={id} lang="en" />;
}
