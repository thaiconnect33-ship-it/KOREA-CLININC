import Link from "next/link";
import { fmtNum } from "@/lib/i18n";

export function TopicChip({ slug, label, reach, prefix }: { slug: string; label: string; reach: number; prefix: string }) {
  return (
    <Link
      href={`${prefix}/topic/${slug}`}
      className="inline-flex items-center gap-2 bg-white border border-neutral-300 rounded-full px-3 py-1.5 text-sm font-semibold hover:border-black hover:bg-neutral-50"
    >
      <span>{label}</span>
      {reach > 0 && (
        <span className="text-xs text-neutral-400">{fmtNum(reach)}</span>
      )}
    </Link>
  );
}
