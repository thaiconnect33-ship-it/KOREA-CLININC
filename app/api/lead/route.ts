// Lead capture — body 검증 후 data/leads.jsonl 에 append.
// (MVP: 외부 CRM 없이 파일에 쌓아둠. 추후 Slack webhook / email 으로 확장.)

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEADS_FILE = path.join(process.cwd(), "data", "leads.jsonl");

type Payload = {
  name?: string;
  contact?: string;
  procedure?: string;
  note?: string;
  clinic?: string;
  influencer?: string;
  topic?: string;
  lang?: string;
};

export async function POST(req: NextRequest) {
  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const name = (body.name || "").trim();
  const contact = (body.contact || "").trim();
  if (name.length < 1 || name.length > 80) return NextResponse.json({ error: "invalid name" }, { status: 400 });
  if (contact.length < 3 || contact.length > 200) return NextResponse.json({ error: "invalid contact" }, { status: 400 });

  const record = {
    ts: new Date().toISOString(),
    ip: req.headers.get("x-forwarded-for") || "",
    ua: req.headers.get("user-agent") || "",
    name: name.slice(0, 80),
    contact: contact.slice(0, 200),
    procedure: (body.procedure || "").slice(0, 200),
    note: (body.note || "").slice(0, 1000),
    clinic: body.clinic?.slice(0, 80) || "",
    influencer: body.influencer?.slice(0, 80) || "",
    topic: body.topic?.slice(0, 80) || "",
    lang: body.lang === "en" ? "en" : "th",
  };
  // Vercel 서버리스 파일시스템은 read-only. /tmp 만 쓰기 가능하지만 휘발성 → webhook 우선.
  const onVercel = !!process.env.VERCEL;
  const webhook = process.env.LEAD_WEBHOOK_URL;

  // 1) Webhook (있으면 우선) — Slack/Discord/Telegram 호환.
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `🟢 New lead: ${record.name} · ${record.contact} · ${record.procedure || record.clinic || record.topic}`,
          record,
        }),
      });
    } catch (e) {
      console.error("[lead] webhook failed:", e);
    }
  }

  // 2) 파일 append — 로컬/비-Vercel 에서만 시도.
  if (!onVercel) {
    try {
      await fs.mkdir(path.dirname(LEADS_FILE), { recursive: true });
      await fs.appendFile(LEADS_FILE, JSON.stringify(record) + "\n", "utf-8");
    } catch (e) {
      console.error("[lead] file write failed:", e);
    }
  } else {
    // Vercel: 콘솔에만 출력 (Logs 에서 조회). webhook 가 없으면 lead 손실 방지 안 됨.
    console.log("[lead]", JSON.stringify(record));
  }

  return NextResponse.json({ ok: true });
}
