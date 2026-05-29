import { TopicDetailPage } from "@/components/TopicDetail";

export const revalidate = 1800;

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <TopicDetailPage slug={slug} lang="en" />;
}
