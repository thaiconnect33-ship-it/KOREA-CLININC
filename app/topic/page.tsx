import { TopicDirectoryPage } from "@/components/TopicDirectory";

export const revalidate = 1800;

export default function Page() {
  return <TopicDirectoryPage lang="th" />;
}
