"use client";

import { useState, type FormEvent } from "react";
import { t, type Lang } from "@/lib/i18n";

export function ContactForm({ lang, prefillClinic, prefillInfluencer, prefillTopic }: {
  lang: Lang;
  prefillClinic?: string;
  prefillInfluencer?: string;
  prefillTopic?: string;
}) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [procedure, setProcedure] = useState(prefillTopic || "");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [errMsg, setErrMsg] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending"); setErrMsg("");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, contact, procedure, note,
          clinic: prefillClinic, influencer: prefillInfluencer, topic: prefillTopic, lang,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setStatus("err"); setErrMsg(d.error || `error ${res.status}`); return;
      }
      setStatus("ok");
    } catch (err) {
      setStatus("err"); setErrMsg(err instanceof Error ? err.message : String(err));
    }
  }

  if (status === "ok") {
    return (
      <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3">✓</div>
        <h2 className="text-2xl font-black text-emerald-900">
          {lang === "th" ? "ส่งสำเร็จ!" : "Submitted!"}
        </h2>
        <p className="mt-2 text-emerald-700">
          {lang === "th"
            ? "เราจะติดต่อกลับภายใน 24 ชั่วโมงผ่านช่องทางที่คุณให้ไว้"
            : "We'll reach out within 24 hours via the channel you provided."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white border border-neutral-200 rounded-2xl p-6 md:p-8 space-y-5">
      <div>
        <label className="block text-sm font-semibold mb-1.5">{t(lang, "name")}</label>
        <input
          value={name} onChange={(e) => setName(e.target.value)} required maxLength={60}
          className="w-full px-4 py-3 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-black"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1.5">{t(lang, "contact_input")}</label>
        <input
          value={contact} onChange={(e) => setContact(e.target.value)} required maxLength={120}
          placeholder="@yourhandle / you@example.com"
          className="w-full px-4 py-3 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-black"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1.5">{t(lang, "procedure")}</label>
        <input
          value={procedure} onChange={(e) => setProcedure(e.target.value)} maxLength={120}
          placeholder={lang === "th" ? "เช่น เสริมจมูก, ฟิลเลอร์, ดูแลผิว" : "e.g. rhinoplasty, filler, skincare"}
          className="w-full px-4 py-3 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-black"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1.5">
          {lang === "th" ? "หมายเหตุเพิ่มเติม (ไม่บังคับ)" : "Notes (optional)"}
        </label>
        <textarea
          value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={4}
          className="w-full px-4 py-3 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-black resize-none"
        />
      </div>
      {(prefillClinic || prefillInfluencer || prefillTopic) && (
        <div className="text-xs text-neutral-500 bg-neutral-50 rounded-xl px-3 py-2">
          Context: {prefillClinic && `clinic=${prefillClinic} `}{prefillInfluencer && `influencer=${prefillInfluencer} `}{prefillTopic && `topic=${prefillTopic}`}
        </div>
      )}
      <button
        type="submit" disabled={status === "sending"}
        className="w-full bg-black text-white font-bold rounded-xl py-3.5 hover:bg-neutral-800 disabled:opacity-60"
      >
        {status === "sending" ? "…" : t(lang, "submit")}
      </button>
      {status === "err" && <div className="text-sm text-red-600">{errMsg}</div>}
    </form>
  );
}
