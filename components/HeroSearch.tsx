"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PROCEDURES } from "@/lib/procedures";
import { type Lang } from "@/lib/i18n";

type Item = { id: string; ko: string; en: string; region: string };

export function HeroSearch({ lang, clinics }: { lang: Lang; clinics: Item[] }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const prefix = lang === "en" ? "/en" : "";

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 1) return { clinics: [] as Item[], procs: PROCEDURES.slice(0, 6) };
    const procs = PROCEDURES.filter((p) =>
      p.keywords.some((k) => k.toLowerCase().includes(s)) ||
      p.th.toLowerCase().includes(s) || p.en.toLowerCase().includes(s) || p.ko.toLowerCase().includes(s)
    ).slice(0, 4);
    const cs = clinics.filter((c) =>
      c.en.toLowerCase().includes(s) || c.ko.toLowerCase().includes(s)
    ).slice(0, 6);
    return { clinics: cs, procs };
  }, [q, clinics]);

  return (
    <div ref={ref} className="relative max-w-2xl mx-auto">
      <div className="flex gap-2 bg-white border border-neutral-300 rounded-2xl shadow-sm focus-within:border-black p-1.5">
        <span className="grid place-items-center pl-2 text-neutral-400">🔍</span>
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={lang === "th" ? "ค้นหา: คลินิก, หัตถการ, ย่าน…" : "Search: clinic, procedure, district…"}
          className="flex-1 px-2 py-3 text-base outline-none bg-transparent"
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="bg-black text-white font-bold rounded-xl px-5 py-2.5"
        >
          {lang === "th" ? "ค้นหา" : "Search"}
        </button>
      </div>
      {open && (q.length > 0 || true) && (results.clinics.length + results.procs.length > 0) && (
        <div className="absolute left-0 right-0 mt-2 bg-white border border-neutral-200 rounded-2xl shadow-lg overflow-hidden z-30 max-h-[60vh] overflow-y-auto">
          {results.procs.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-1 text-[10px] font-bold text-neutral-500 tracking-wider uppercase">
                {lang === "th" ? "หัตถการ" : "Procedures"}
              </div>
              {results.procs.map((p) => (
                <Link
                  key={p.slug}
                  href={`${prefix}/p/${p.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-pink-50"
                >
                  <span className="text-xl">{p.emoji}</span>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{lang === "th" ? p.th : p.en}</div>
                    <div className="text-xs text-neutral-500">{p.ko}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {results.clinics.length > 0 && (
            <div className="border-t border-neutral-100 p-2">
              <div className="px-3 py-1 text-[10px] font-bold text-neutral-500 tracking-wider uppercase">
                {lang === "th" ? "คลินิก" : "Clinics"}
              </div>
              {results.clinics.map((c) => (
                <Link
                  key={c.id}
                  href={`${prefix}/clinic/${c.id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-pink-50"
                >
                  <div>
                    <div className="font-bold text-sm">{c.en || c.ko}</div>
                    <div className="text-xs text-neutral-500">{c.ko} · {c.region}</div>
                  </div>
                  <span className="text-neutral-300">→</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
