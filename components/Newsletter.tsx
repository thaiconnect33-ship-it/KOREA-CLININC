"use client";

import { useState } from "react";
import { type Lang } from "@/lib/i18n";

export function Newsletter({ lang }: { lang: Lang }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    try {
      const r = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "newsletter", contact: email, procedure: "newsletter signup", lang }),
      });
      setStatus(r.ok ? "ok" : "err");
    } catch { setStatus("err"); }
  }
  if (status === "ok") {
    return (
      <div className="bg-gradient-to-br from-pink-500 to-orange-400 text-white rounded-3xl p-8 text-center">
        <div className="text-4xl mb-2">✨</div>
        <h3 className="text-2xl font-black">
          {lang === "th" ? "ขอบคุณค่ะ!" : "You're in!"}
        </h3>
        <p className="mt-2 text-pink-50">
          {lang === "th" ? "เราจะส่งคลินิกใหม่และส่วนลดให้คุณก่อนใคร" : "We'll send new clinics & deals first."}
        </p>
      </div>
    );
  }
  return (
    <div className="bg-gradient-to-br from-pink-500 to-orange-400 text-white rounded-3xl p-8 md:p-10">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
        <div>
          <h3 className="text-2xl md:text-3xl font-black">
            {lang === "th" ? "อยากรู้คลินิกใหม่และส่วนลดก่อนใคร?" : "Get new clinics & deals first"}
          </h3>
          <p className="mt-2 text-pink-50">
            {lang === "th" ? "ส่งให้ทุก 2 สัปดาห์ ไม่สแปม" : "Bi-weekly, no spam"}
          </p>
        </div>
        <form onSubmit={submit} className="flex gap-2">
          <input
            type="email" required
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="px-4 py-3 rounded-xl text-neutral-900 outline-none min-w-[200px]"
          />
          <button
            type="submit"
            className="bg-black text-white font-bold rounded-xl px-5 py-3 hover:bg-neutral-900"
          >
            {lang === "th" ? "สมัคร" : "Subscribe"}
          </button>
        </form>
      </div>
      {status === "err" && (
        <p className="mt-3 text-sm text-yellow-100">
          {lang === "th" ? "ลองอีกครั้งนะคะ" : "Please try again"}
        </p>
      )}
    </div>
  );
}
