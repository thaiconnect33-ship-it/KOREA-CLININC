"use client";
// 가벼운 fake-but-realistic live ticker — 5초마다 회전.
// 추후 실제 /api/leads/recent 와 연결하면 더 자연스러움.

import { useEffect, useState } from "react";
import { type Lang } from "@/lib/i18n";

const SAMPLES_TH = [
  { c: "🇹🇭", name: "คุณ K. (Bangkok)",     p: "เสริมจมูก",   t: "2 นาทีที่แล้ว" },
  { c: "🇹🇭", name: "คุณ T. (เชียงใหม่)",  p: "ฟิลเลอร์",    t: "5 นาทีที่แล้ว" },
  { c: "🇨🇳", name: "周小姐 (上海)",         p: "ทำตาสองชั้น", t: "9 นาทีที่แล้ว" },
  { c: "🇹🇭", name: "คุณ M. (Phuket)",     p: "Lifting",     t: "12 นาทีที่แล้ว" },
  { c: "🇻🇳", name: "Ms. L. (Hanoi)",       p: "Skincare",   t: "17 นาทีที่แล้ว" },
  { c: "🇹🇭", name: "คุณ A. (Bangkok)",    p: "V-line",     t: "22 นาทีที่แล้ว" },
  { c: "🇮🇩", name: "Ms. R. (Jakarta)",    p: "Rhinoplasty", t: "31 นาทีที่แล้ว" },
];
const SAMPLES_EN = [
  { c: "🇹🇭", name: "K. (Bangkok)",       p: "Rhinoplasty",   t: "2 min ago" },
  { c: "🇹🇭", name: "T. (Chiang Mai)",    p: "Filler",        t: "5 min ago" },
  { c: "🇨🇳", name: "Ms. Zhou (Shanghai)",p: "Double eyelid", t: "9 min ago" },
  { c: "🇹🇭", name: "M. (Phuket)",        p: "Lifting",       t: "12 min ago" },
  { c: "🇻🇳", name: "Ms. L. (Hanoi)",     p: "Skincare",      t: "17 min ago" },
  { c: "🇹🇭", name: "A. (Bangkok)",       p: "V-line",        t: "22 min ago" },
  { c: "🇮🇩", name: "Ms. R. (Jakarta)",   p: "Rhinoplasty",   t: "31 min ago" },
];

export function LiveTicker({ lang }: { lang: Lang }) {
  const list = lang === "en" ? SAMPLES_EN : SAMPLES_TH;
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((x) => (x + 1) % list.length), 4500);
    return () => clearInterval(id);
  }, [list.length]);
  const item = list[idx];
  const verb = lang === "th" ? "ขอคำปรึกษา" : "asked about";
  return (
    <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur border border-neutral-200 rounded-full px-3 py-1.5 text-xs shadow-sm">
      <span className="relative flex w-2 h-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      <span className="font-semibold">{item.c} {item.name}</span>
      <span className="text-neutral-500">{verb} <b className="text-neutral-800">{item.p}</b></span>
      <span className="text-neutral-400">· {item.t}</span>
    </div>
  );
}
