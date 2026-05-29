"use client";

import { useState } from "react";

export function DemoBooking() {
  const [clinic, setClinic] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [interest, setInterest] = useState("매칭+대시보드");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending"); setErr("");
    try {
      const r = await fetch("/api/lead", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, contact,
          procedure: `[B2B 데모] ${interest}`,
          note: `클리닉: ${clinic}\n관심: ${interest}\n메모: ${notes}`,
          clinic, lang: "ko",
        }),
      });
      if (!r.ok) { const j = await r.json().catch(() => ({})); setErr(j.error || `error ${r.status}`); setStatus("err"); return; }
      setStatus("ok");
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); setStatus("err"); }
  }

  if (status === "ok") {
    return (
      <div className="bg-emerald-50 border border-emerald-300 rounded-3xl p-8 text-center">
        <div className="text-5xl mb-3">✅</div>
        <h3 className="text-2xl font-black text-emerald-900">데모 신청 접수!</h3>
        <p className="mt-2 text-emerald-700">
          영업일 기준 1일 이내 카톡 또는 이메일로 연락드립니다.<br />
          무료 진단 PDF 도 함께 발송됩니다.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white border border-neutral-200 rounded-3xl p-6 md:p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="text-3xl">📅</div>
        <div>
          <h3 className="text-2xl md:text-3xl font-black">30분 데모 신청</h3>
          <p className="text-sm text-neutral-500">무료 진단 PDF + Zoom 데모 + 인플루언서 샘플 BRD</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="클리닉명" required>
          <input value={clinic} onChange={(e) => setClinic(e.target.value)} required maxLength={80}
            placeholder="예: 바노바기성형외과"
            className="w-full px-4 py-3 border border-neutral-300 rounded-xl outline-none focus:border-black" />
        </Field>
        <Field label="담당자 이름" required>
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={40}
            placeholder="홍길동 실장"
            className="w-full px-4 py-3 border border-neutral-300 rounded-xl outline-none focus:border-black" />
        </Field>
        <Field label="연락처 (카톡 ID / 이메일)" required>
          <input value={contact} onChange={(e) => setContact(e.target.value)} required maxLength={120}
            placeholder="@yourkakaoid 또는 you@clinic.com"
            className="w-full px-4 py-3 border border-neutral-300 rounded-xl outline-none focus:border-black" />
        </Field>
        <Field label="관심 패키지">
          <select value={interest} onChange={(e) => setInterest(e.target.value)}
            className="w-full px-4 py-3 border border-neutral-300 rounded-xl outline-none focus:border-black bg-white">
            <option>진단만 (무료)</option>
            <option>매칭+대시보드</option>
            <option>지역 독점</option>
            <option>커스텀</option>
          </select>
        </Field>
        <div className="md:col-span-2">
          <Field label="추가 메모 (선택)">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={3}
              placeholder="주력 시술, 타깃 국가, 예상 월 환자수 등"
              className="w-full px-4 py-3 border border-neutral-300 rounded-xl outline-none focus:border-black resize-none" />
          </Field>
        </div>
      </div>

      <button type="submit" disabled={status === "sending"}
        className="mt-6 w-full bg-pink-600 text-white font-bold rounded-xl py-3.5 hover:bg-pink-700 disabled:opacity-50 text-lg">
        {status === "sending" ? "전송 중…" : "데모 신청 →"}
      </button>
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
      <p className="mt-3 text-xs text-neutral-500 text-center">
        제출 시 영업/마케팅 이메일 수신에 동의합니다. 언제든 해지 가능.
      </p>
    </form>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-neutral-600 mb-1">
        {label} {required && <span className="text-pink-600">*</span>}
      </span>
      {children}
    </label>
  );
}
