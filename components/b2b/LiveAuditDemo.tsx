"use client";

import { useState } from "react";

type Platform = { ok: boolean; metric_label: string; metric_value: number };
type ScoutLite = {
  query: string;
  global_score: number;
  opportunity_cost_krw: number;
  platforms: {
    naver: Platform;
    google_maps: Platform;
    pantip: Platform;
    youtube: Platform;
    lemon8: Platform;
  };
};

const PRESETS = [
  { label: "바노바기", q: "바노바기성형외과" },
  { label: "ID Hospital", q: "아이디병원" },
  { label: "리엔장", q: "리엔장성형외과" },
];

export function LiveAuditDemo() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScoutLite | null>(null);
  const [err, setErr] = useState("");

  async function go(query: string) {
    const v = query.trim();
    if (v.length < 2) return;
    setLoading(true); setErr(""); setResult(null);
    try {
      const r = await fetch("/api/scout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: v }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || `error ${r.status}`); return; }
      setResult(j as ScoutLite);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-3xl p-6 md:p-8">
      <div className="text-xs font-bold text-pink-600 tracking-wider mb-1">LIVE</div>
      <h3 className="text-2xl md:text-3xl font-black mb-2">우리 클리닉, 태국에 얼마나 보이나?</h3>
      <p className="text-neutral-600 text-sm mb-5">한국명 입력 → 5초 안에 5플랫폼 진단</p>

      <form onSubmit={(e) => { e.preventDefault(); go(q); }} className="flex flex-col sm:flex-row gap-2 mb-3">
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="예: 바노바기성형외과"
          className="flex-1 px-4 py-3 border border-neutral-300 rounded-xl text-base outline-none focus:border-black"
        />
        <button
          type="submit" disabled={loading || q.trim().length < 2}
          className="bg-black text-white font-bold rounded-xl px-6 py-3 disabled:opacity-50"
        >
          {loading ? "분석 중…" : "진단 시작 →"}
        </button>
      </form>
      <div className="flex flex-wrap gap-1.5 mb-5">
        <span className="text-xs text-neutral-500 mr-1">샘플:</span>
        {PRESETS.map((p) => (
          <button key={p.q} type="button" onClick={() => { setQ(p.q); go(p.q); }} className="text-xs bg-neutral-100 hover:bg-neutral-200 rounded-full px-2 py-0.5 font-semibold">
            {p.label}
          </button>
        ))}
      </div>

      {err && <div className="text-sm text-red-600 mb-3">⚠️ {err}</div>}

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Card title="국내 reach (Naver)" v={result.platforms.naver.metric_value} unit="리뷰" color="emerald" />
            <Card title="해외 reach (Pantip/Lemon8/YT)"
              v={result.platforms.pantip.metric_value + result.platforms.lemon8.metric_value + result.platforms.youtube.metric_value}
              unit="posts" color="amber" />
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="text-xs font-bold text-amber-800 tracking-wider mb-1">💸 OPPORTUNITY COST</div>
            <div className="text-2xl font-black text-amber-900">
              월 ₩{(result.opportunity_cost_krw / 10000).toFixed(0)}만원 매출 손실 예상
            </div>
            <p className="text-xs text-amber-700 mt-1">
              국내 reach 대비 해외 reach 격차 × 평균 객단가로 추정
            </p>
          </div>
          <div className="text-sm bg-neutral-900 text-white rounded-2xl p-4">
            ⭐ 글로벌 스코어 <b className="text-2xl">{result.global_score}/100</b>
            <p className="text-xs text-neutral-400 mt-1">자세한 진단 PDF 받으려면 데모 신청</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ title, v, unit, color }: { title: string; v: number; unit: string; color: "emerald" | "amber" }) {
  const bg = color === "emerald" ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200";
  const fg = color === "emerald" ? "text-emerald-700" : "text-amber-700";
  return (
    <div className={`${bg} border rounded-2xl p-4`}>
      <div className="text-xs text-neutral-600 font-semibold">{title}</div>
      <div className={`text-2xl font-black ${fg}`}>{v.toLocaleString()}</div>
      <div className="text-xs text-neutral-500">{unit}</div>
    </div>
  );
}
