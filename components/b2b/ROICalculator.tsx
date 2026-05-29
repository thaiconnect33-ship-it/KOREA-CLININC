"use client";

import { useMemo, useState } from "react";

const PROC_AVG_KRW: Record<string, number> = {
  "코성형":   4_500_000,
  "쌍꺼풀":   1_800_000,
  "V-line":  9_000_000,
  "리프팅":   3_000_000,
  "필러":     400_000,
  "보톡스":   300_000,
  "피부/레이저": 500_000,
  "모발이식": 5_000_000,
};

export function ROICalculator() {
  const [proc, setProc] = useState("코성형");
  const [monthly, setMonthly] = useState(20); // 월 잠재 환자 수
  const [conversion, setConversion] = useState(25); // %
  const [our_fee, setOurFee] = useState(150_000); // 매칭당 평균 우리 fee

  const calc = useMemo(() => {
    const avg = PROC_AVG_KRW[proc] || 1_500_000;
    const matched = Math.round(monthly * conversion / 100);
    const revenue = matched * avg;
    const our_cost = matched * our_fee + 1_490_000; // 매칭 fee + Core 월구독
    const net = revenue - our_cost;
    const roi = our_cost > 0 ? (net / our_cost) * 100 : 0;
    return { matched, revenue, our_cost, net, roi, avg };
  }, [proc, monthly, conversion, our_fee]);

  const fmt = (n: number) => "₩" + n.toLocaleString("ko-KR");

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-cyan-50 border border-emerald-200 rounded-3xl p-6 md:p-8">
      <h3 className="text-2xl font-black mb-1">💰 ROI 계산기</h3>
      <p className="text-sm text-neutral-600 mb-6">월 잠재 태국 환자수 기준 — 보수적 시나리오</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <label className="block">
          <span className="text-xs font-semibold text-neutral-600">주력 시술</span>
          <select value={proc} onChange={(e) => setProc(e.target.value)} className="mt-1 w-full bg-white border border-neutral-300 rounded-xl px-3 py-2.5 font-semibold">
            {Object.keys(PROC_AVG_KRW).map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-neutral-600">월 노출 잠재 환자</span>
          <input
            type="number" min={1} max={500} value={monthly} onChange={(e) => setMonthly(parseInt(e.target.value || "0", 10))}
            className="mt-1 w-full bg-white border border-neutral-300 rounded-xl px-3 py-2.5 font-semibold"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-neutral-600">실 방문 전환율 %</span>
          <input
            type="number" min={1} max={100} value={conversion} onChange={(e) => setConversion(parseInt(e.target.value || "0", 10))}
            className="mt-1 w-full bg-white border border-neutral-300 rounded-xl px-3 py-2.5 font-semibold"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="실제 방문" v={`${calc.matched}명/월`} />
        <Stat label="예상 매출" v={fmt(calc.revenue)} highlight="emerald" />
        <Stat label="우리 fee" v={fmt(calc.our_cost)} />
        <Stat label="순익" v={fmt(calc.net)} highlight={calc.net > 0 ? "pink" : "neutral"} />
      </div>
      <div className="mt-5 bg-white rounded-2xl p-4 border border-emerald-200">
        <div className="text-xs text-neutral-500">예상 ROI</div>
        <div className="text-3xl md:text-4xl font-black text-emerald-700">
          {calc.roi.toFixed(0)}% <span className="text-base text-neutral-500 font-normal">/ 월</span>
        </div>
      </div>
      <p className="text-xs text-neutral-500 mt-3">
        * 평균 객단가는 한국 표준 기준. 실제는 클리닉별 가격대에 따라 다름. 무료 진단으로 우리 클리닉의 실제 reach 확인 가능.
      </p>
    </div>
  );
}

function Stat({ label, v, highlight }: { label: string; v: string; highlight?: "emerald" | "pink" | "neutral" }) {
  const color = highlight === "emerald" ? "text-emerald-700" : highlight === "pink" ? "text-pink-600" : "text-neutral-900";
  return (
    <div className="bg-white rounded-xl p-3 border border-neutral-200">
      <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">{label}</div>
      <div className={`text-lg md:text-xl font-black ${color} mt-0.5`}>{v}</div>
    </div>
  );
}
