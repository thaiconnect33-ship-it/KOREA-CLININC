// YouTube 비디오 carousel — youtube_market.json 의 sample_videos 에서 high-view 비디오 카드.
import Link from "next/link";
import { promises as fs } from "node:fs";
import path from "node:path";
import { youtubeThumb } from "@/lib/media";
import { type Lang, fmtNum } from "@/lib/i18n";

type Video = {
  title: string;
  channel: string;
  url: string;
  view_text: string;
  views: number;
  topic: string;
};

async function loadTopVideos(limit = 12): Promise<Video[]> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "data", "youtube_market.json"), "utf-8");
    const j = JSON.parse(raw) as { sample_videos?: Video[] };
    return (j.sample_videos || []).filter((v) => youtubeThumb(v.url)).slice(0, limit);
  } catch {
    return [];
  }
}

export async function VideoCarousel({ lang }: { lang: Lang }) {
  const videos = await loadTopVideos(12);
  if (videos.length === 0) return null;
  return (
    <div className="relative -mx-4">
      <div className="overflow-x-auto scrollbar-hide pb-3 px-4">
        <div className="flex gap-3 min-w-max">
          {videos.map((v, i) => {
            const thumb = youtubeThumb(v.url, "hq");
            return (
              <Link
                key={i}
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-64 shrink-0 group"
              >
                <div className="relative aspect-video rounded-xl overflow-hidden bg-neutral-200">
                  {thumb && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={thumb}
                      alt={v.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5">
                    <span className="bg-red-600 text-white text-[10px] font-bold rounded px-1.5 py-0.5">▶ YT</span>
                    <span className="text-white text-xs font-semibold">{fmtNum(v.views)} {lang === "th" ? "ครั้ง" : "views"}</span>
                  </div>
                </div>
                <h3 className="mt-2 text-sm font-bold leading-tight line-clamp-2 group-hover:text-pink-600">
                  {v.title}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">@{v.channel}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
