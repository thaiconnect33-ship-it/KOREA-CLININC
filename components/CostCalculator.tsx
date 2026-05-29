"use client";

import { useState } from "react";
import { PROCEDURES } from "@/lib/procedures";
import { type Lang } from "@/lib/i18n";

// 통화 환율 (rough) — 추후 ECB API 등으로 자동.
const RATES = { THB: 1, KRW: 38, CNY: 0.26, USD: 0.029, VND: 720, IDR: 580 };

export function CostCalculator({ lang, defaultSlug }: { lang: Lang; defaultSlug?: string }) {
  const [slug, setSlug] = useState(defaultSlug || PROCEDURES[0].slug);
  const [ccy, setCcy] = useState<keyof typeof RATES>("THB");
  const proc = PROCEDURES.find((p) => p.slug === slug) || PROCEDURES[0];
  const minThb = proc.cost_thb_min ?? 0;
  const maxThb = proc.cost_thb_max ?? 0;
  const r = RATES[ccy];
  const fmt = (v: number) => {
    if (ccy === "KRW" || ccy === "VND" || ccy === "IDR") return (v * r).toLocaleString(undefined, { maximumFractionDigits: 0 });
    if (ccy === "USD") return (v * r).toLocaleString(undefined, { maximumFractionDigits: 0 });
    return (v * r).toLocaleString(undefined, { maximumFractionDigits: 0 });
  };
  return (
    <div className="bg-gradient-to-br from-emerald-50 to-yellow-50 border border-emerald-200 rounded-3xl p-6 md:p-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-3xl">💸</div>
        <h3 className="text-xl md:text-2xl font-black">
          {lang === "th" ? "เครื่องคำนวณค่าใช้จ่าย" : "Cost calculator"}
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
        <label className="block">
          <span className="text-xs text-neutral-600 font-semibold">{lang === "th" ? "หัตถการ" : "Procedure"}</span>
          <select
            value={slug} onChange={(e) => setSlug(e.target.value)}
            className="mt-1 w-full bg-white border border-neutral-300 rounded-xl px-3 py-2.5 font-semibold"
          >
            {PROCEDURES.map((p) => (
              <option key={p.slug} value={p.slug}>{p.emoji} {lang === "th" ? p.th : p.en}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-neutral-600 font-semibold">{lang === "th" ? "สกุลเงิน" : "Currency"}</span>
          <select
            value={ccy} onChange={(e) => setCcy(e.target.value as keyof typeof RATES)}
            className="mt-1 w-full bg-white border border-neutral-300 rounded-xl px-3 py-2.5 font-semibold"
          >
            <option value="THB">🇹🇭 THB</option>
            <option value="KRW">🇰🇷 KRW</option>
            <option value="CNY">🇨🇳 CNY</option>
            <option value="USD">🇺🇸 USD</option>
            <option value="VND">🇻🇳 VND</option>
            <option value="IDR">🇮🇩 IDR</option>
          </select>
        </label>
      </div>
      <div className="bg-white rounded-2xl p-5 border border-emerald-200">
        <div className="text-xs text-neutral-500 mb-1">
          {lang === "th" ? "ราคาประมาณการ" : "Estimated range"}
        </div>
        <div className="text-3xl md:text-4xl font-black text-emerald-700">
          {fmt(minThb)} – {fmt(maxThb)} <span className="text-base text-neutral-500 font-normal">{ccy}</span>
        </div>
        <p className="text-xs text-neutral-500 mt-2">
          {lang === "th" ? "* ตัวเลขรวมค่าหมอและค่าโรงพยาบาล ไม่รวมที่พัก/ตั๋วเครื่องบิน" : "* Includes doctor & hospital fees, not flights/hotel"}
        </p>
      </div>
    </div>
  );
}
