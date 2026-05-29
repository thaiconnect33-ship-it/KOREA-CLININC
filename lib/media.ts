// 외부 URL 에서 썸네일 / 미디어 정보 추출.

export function youtubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/[?&]v=([A-Za-z0-9_-]{11})/) || url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/) || url.match(/youtube\.com\/(?:embed|v|shorts)\/([A-Za-z0-9_-]{11})/);
  return m?.[1] ?? null;
}

export function youtubeThumb(url: string, quality: "default" | "mq" | "hq" | "max" = "hq"): string | null {
  const id = youtubeId(url);
  if (!id) return null;
  const q = quality === "default" ? "default" : quality === "mq" ? "mqdefault" : quality === "hq" ? "hqdefault" : "maxresdefault";
  return `https://i.ytimg.com/vi/${id}/${q}.jpg`;
}

export function platformFromUrl(url: string): "youtube" | "lemon8" | "pantip" | "xiaohongshu" | "reddit" | "realself" | "google" | "other" {
  if (!url) return "other";
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/lemon8/i.test(url)) return "lemon8";
  if (/pantip\.com/i.test(url)) return "pantip";
  if (/xiaohongshu\.com|xhslink/i.test(url)) return "xiaohongshu";
  if (/reddit\.com/i.test(url)) return "reddit";
  if (/realself/i.test(url)) return "realself";
  return "other";
}
