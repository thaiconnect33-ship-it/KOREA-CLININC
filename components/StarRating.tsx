// 0-100 score → 5점 별점 시각화.
export function StarRating({ score, size = "sm" }: { score: number; size?: "sm" | "md" }) {
  const stars = Math.max(0, Math.min(5, score / 20));
  const full = Math.floor(stars);
  const half = stars - full >= 0.4 && stars - full < 0.9;
  const empty = 5 - full - (half ? 1 : 0);
  const cls = size === "md" ? "text-lg" : "text-xs";
  return (
    <span className={`inline-flex items-center gap-0.5 ${cls} text-amber-500`}>
      {Array.from({ length: full }).map((_, i) => <span key={`f${i}`}>★</span>)}
      {half && <span>⯨</span>}
      {Array.from({ length: empty }).map((_, i) => <span key={`e${i}`} className="text-neutral-300">★</span>)}
      <span className="ml-1 text-neutral-500 font-mono text-[10px]">{stars.toFixed(1)}</span>
    </span>
  );
}
