"use client";

import { useState } from "react";
import { type Lang } from "@/lib/i18n";

const FAQ_TH = [
  { q: "ทำไมเลือกหมอเกาหลี?",
    a: "เกาหลีเป็นประเทศที่มีคลินิกศัลยกรรมและสกินแคร์ระดับโลก หมอเชี่ยวชาญด้านโครงหน้าเอเชีย ราคารวมแล้วถูกกว่าในไทย/สิงคโปร์สำหรับหลายหัตถการ" },
  { q: "ต้องมีวีซ่ามั้ย?",
    a: "คนไทยไม่ต้องขอวีซ่า เข้าเกาหลีได้ 90 วัน เพียงทำ K-ETA ออนไลน์ก่อนเดินทาง" },
  { q: "ไม่พูดเกาหลีจะสื่อสารยังไง?",
    a: "คลินิกใหญ่มีล่ามไทย/อังกฤษ/จีนประจำ ฟรี — เราช่วยจองคลินิกที่มีล่ามให้คุณ" },
  { q: "ต้องอยู่เกาหลีกี่วัน?",
    a: "หัตถการเล็ก (ฟิลเลอร์/โบท็อกซ์) 1-2 วัน, หัตถการใหญ่ (จมูก/ตา) 5-10 วัน, V-line / ตัดกราม 14-21 วัน" },
  { q: "ค่าใช้จ่ายรวมประมาณเท่าไหร่?",
    a: "ใช้ Cost calculator ของเรา รวมตั๋วเครื่องบิน Bangkok-Seoul ~10-25k บาท + ที่พัก 1.5-3k บาท/คืน + ค่าหัตถการตามที่เลือก" },
  { q: "KoreaBeautyMap คิดเงินมั้ย?",
    a: "ฟรี 100% สำหรับผู้ใช้ — เราได้ค่านายหน้าจากคลินิกเท่านั้น คลินิกจ่ายเงินซื้ออันดับขึ้นไม่ได้" },
];
const FAQ_EN = [
  { q: "Why Korean doctors?",
    a: "Korea is world-class for plastic surgery & skincare. Doctors specialize in Asian facial structure. Often cheaper than Thailand/Singapore for many procedures." },
  { q: "Do I need a visa?",
    a: "Thais get 90 days visa-free. Apply K-ETA online before flying." },
  { q: "How do I communicate in Korea?",
    a: "Major clinics offer free Thai/EN/CN translators. We match you with clinics that have translators." },
  { q: "How long do I need to stay?",
    a: "Minor (filler/botox) 1-2 days · Medium (nose/eye) 5-10 days · Major (V-line/jaw) 14-21 days." },
  { q: "Total cost estimate?",
    a: "Use our calculator. + flight Bangkok-Seoul ~300-700 USD + hotel ~50-100 USD/night + procedure fee." },
  { q: "Does KoreaBeautyMap charge me?",
    a: "100% free for you — we get a referral fee from clinics. Clinics can't buy ranking." },
];

export function FAQ({ lang }: { lang: Lang }) {
  const list = lang === "en" ? FAQ_EN : FAQ_TH;
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="space-y-2">
      {list.map((f, i) => (
        <div key={i} className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-neutral-50"
          >
            <span className="font-bold text-sm md:text-base">Q. {f.q}</span>
            <span className={`text-xl transition-transform ${open === i ? "rotate-45" : ""}`}>+</span>
          </button>
          {open === i && (
            <div className="px-4 pb-4 text-sm text-neutral-700 leading-relaxed">
              <span className="text-pink-600 font-bold">A.</span> {f.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
