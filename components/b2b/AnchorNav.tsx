"use client";

import { useEffect, useState } from "react";

const SECTIONS = [
  { id: "demo",     label: "라이브 데모" },
  { id: "roi",      label: "ROI" },
  { id: "compare",  label: "vs 강남언니" },
  { id: "pricing",  label: "요금" },
  { id: "faq",      label: "FAQ" },
];

export function AnchorNav() {
  const [active, setActive] = useState("demo");
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);
  return (
    <nav className="sticky top-14 z-30 bg-white/95 backdrop-blur border-b border-neutral-200">
      <div className="max-w-5xl mx-auto px-4 h-12 flex items-center gap-1 overflow-x-auto scrollbar-hide">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold transition ${active === s.id ? "bg-black text-white" : "text-neutral-600 hover:bg-neutral-100"}`}
          >
            {s.label}
          </a>
        ))}
        <a
          href="#book"
          className="ml-auto shrink-0 bg-pink-600 text-white text-sm font-bold rounded-full px-4 py-1.5 hover:bg-pink-700"
        >
          데모 신청 →
        </a>
      </div>
    </nav>
  );
}
