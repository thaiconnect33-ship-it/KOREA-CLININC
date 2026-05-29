"use client";
// 메인 client 컴포넌트 — Hero search 와 dashboard 를 한 페이지에서 토글.
// MVP 라 한 파일로 묶음. 추후 분할 가능.

import { useState, useCallback, type FormEvent } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import type { ScoutResult } from "@/lib/types";

const PLATFORM_META = [
  { key: "naver", label: "Naver", desc: "국내 베이스라인" },
  { key: "google_maps", label: "Google Maps", desc: "글로벌 리뷰" },
  { key: "pantip", label: "Pantip", desc: "태국 커뮤니티" },
  { key: "youtube", label: "YouTube", desc: "비디오/Vlog" },
  { key: "xiaohongshu", label: "Xiaohongshu", desc: "중국 (수동)" },
  { key: "lemon8", label: "Lemon8", desc: "태국 (수동)" },
] as const;

export default function ScoutClient() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScoutResult | null>(null);

  const submit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `error ${res.status}`);
      } else {
        setResult(data as ScoutResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [query]);

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Hero */}
      <div className="max-w-3xl mx-auto px-4 pt-20 pb-12">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-center mb-3">
          해외 VIP, 얼마나 놓치고 있나요?
        </h1>
        <p className="text-center text-neutral-600 mb-10">
          지역 + 상호명 입력 → 국내(Naver) vs 해외(Google/Pantip/...) reach 즉시 비교
        </p>
        <form onSubmit={submit} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="예: 강남 OO피부과"
            disabled={loading}
            className="flex-1 px-5 py-4 rounded-xl border border-neutral-300 text-lg focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || query.trim().length < 2}
            className="px-6 py-4 bg-black text-white font-bold rounded-xl disabled:opacity-50"
          >
            {loading ? "분석 중…" : "분석 시작"}
          </button>
        </form>
        {error && (
          <div className="mt-4 text-sm text-red-600">{error}</div>
        )}
      </div>

      {/* Dashboard */}
      {loading && <Skeleton />}
      {result && <Dashboard result={result} />}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 pb-20 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="h-32 bg-neutral-200 rounded-xl" />
        <div className="h-32 bg-neutral-200 rounded-xl" />
      </div>
      <div className="h-48 bg-red-100 rounded-xl mb-6" />
      <div className="h-80 bg-neutral-200 rounded-xl" />
    </div>
  );
}

function Dashboard({ result }: { result: ScoutResult }) {
  const naverReviews = result.platforms.naver.metric_value;
  const globalTotal =
    result.platforms.google_maps.metric_value +
    result.platforms.pantip.metric_value +
    result.platforms.youtube.metric_value +
    result.platforms.xiaohongshu.metric_value +
    result.platforms.lemon8.metric_value;
  const ratio = naverReviews > 0 ? (globalTotal / naverReviews) : 0;

  const chartData = PLATFORM_META.map((p) => ({
    name: p.label,
    value: result.platforms[p.key].metric_value,
    ok: result.platforms[p.key].ok,
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 pb-20">
      {/* Top metric pair */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <MetricCard
          label="🇰🇷 국내 (Naver)"
          value={naverReviews}
          unit={result.platforms.naver.metric_label}
          subtle={result.platforms.naver.ok ? "수집 완료" : "Phase 2 — 데이터 수집 예정"}
        />
        <MetricCard
          label="🌍 해외 총 언급량"
          value={globalTotal}
          unit="건"
          subtle={`Google + Pantip + Xiaohongshu + Lemon8 합산${ratio > 0 ? ` · 국내 대비 ${(ratio * 100).toFixed(0)}%` : ""}`}
          accent
        />
      </div>

      {/* Loss alert */}
      <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6 mb-6">
        <div className="text-xs font-bold uppercase tracking-widest text-red-700 mb-2">
          이번 달 해외 VIP 놓쳐 발생한 최소 손실액
        </div>
        <div className="text-4xl md:text-5xl font-black text-red-700">
          ₩{result.opportunity_cost_krw.toLocaleString()}
        </div>
        <div className="text-sm text-red-700/80 mt-2">
          글로벌 인지도 점수: <strong>{result.global_score}</strong> / 100
        </div>
      </div>

      {/* Platform bar chart */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6">
        <div className="font-bold mb-3">플랫폼별 언급량</div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#0a0a0a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-4 text-xs">
          {PLATFORM_META.map((p) => (
            <div key={p.key} className="border border-neutral-200 rounded p-2">
              <div className="font-bold">{p.label}</div>
              <div className="text-neutral-500">{p.desc}</div>
              <div className="mt-1">
                <strong className="text-base">{result.platforms[p.key].metric_value.toLocaleString()}</strong>
                <span className="text-neutral-500 ml-1">{result.platforms[p.key].metric_label}</span>
              </div>
              {!result.platforms[p.key].ok && (
                <div className="text-red-500/70 mt-1 text-[10px] leading-tight">⏳ {result.platforms[p.key].error?.slice(0, 60)}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-8">
        <button className="w-full py-5 bg-black text-white font-black rounded-xl text-lg">
          해외 VIP 전용 예약 인프라 구축 · 솔루션 상담 →
        </button>
      </div>

      <div className="mt-6 text-xs text-neutral-400 text-center">
        쿼리: <code>{result.query}</code> · 생성: {result.generated_at.slice(0, 19).replace("T", " ")}
        {result.cached && " · cached"}
      </div>
    </div>
  );
}

function MetricCard({
  label, value, unit, subtle, accent,
}: { label: string; value: number; unit: string; subtle: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-xl p-6 border ${
        accent ? "bg-black text-white border-black" : "bg-white border-neutral-200"
      }`}
    >
      <div className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2">{label}</div>
      <div className="text-4xl font-black">{value.toLocaleString()}<span className="text-lg font-normal opacity-70 ml-2">{unit}</span></div>
      <div className="text-xs opacity-70 mt-2">{subtle}</div>
    </div>
  );
}
