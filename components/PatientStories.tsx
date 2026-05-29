// 환자 스토리 — 큐레이션된 따뜻한 톤. (실제 사례 추가될 때 data/stories.json 으로 교체 가능)
import { type Lang } from "@/lib/i18n";

const TH = [
  { name: "คุณ Earn, Bangkok", proc: "เสริมจมูก @ ID Hospital",
    quote: "ตอนแรกกลัวมากเรื่องภาษา แต่คลินิกมีล่ามไทยตลอด ผ่าตัด 2 ชั่วโมง พักฟื้น 7 วัน หายเป๊ะ ค่าใช้จ่ายรวมตั๋ว 95k บาท ถูกกว่าที่ไทย" },
  { name: "คุณ Mim, Phuket", proc: "ฟิลเลอร์ @ Lienjang",
    quote: "ไปเป็นทริปท่องเที่ยว 4 วัน 3 คืน รวมฟิลเลอร์ 4 จุด รวม 18k บาท ของเกาหลีเนื้อแน่นกว่ามาก ใช้ได้ 12 เดือน คุ้ม" },
  { name: "คุณ Pim, Chiang Mai", proc: "Rejuran @ Banobagi",
    quote: "ทำ 3 ครั้งห่างกัน 4 สัปดาห์ ผิวสว่างขึ้นชัดเจน รูขุมขนเล็กลง คนรอบตัวสังเกตเห็น มากกว่าทำเองในไทย เหมือนคนละผิว" },
  { name: "Ms. Zhou, Shanghai", proc: "V-line @ JK Plastic",
    quote: "동양인 얼굴 잘 아는 의사. 14일 회복 후 셀카 찍을 때 자신감 ↑↑. 친구들이 다 비밀 묻는다." },
];
const EN = [
  { name: "Earn, Bangkok", proc: "Rhinoplasty @ ID Hospital",
    quote: "Worried about language at first, but the clinic had a Thai translator the whole time. 2-hour surgery, 7-day recovery. Total including flight: ~$2.7k. Cheaper than Thailand." },
  { name: "Mim, Phuket", proc: "Filler @ Lienjang",
    quote: "Combined a 4-day Korea trip with 4-point filler — total ~$520. Korean filler holds better, lasts ~12 months. Worth it." },
  { name: "Pim, Chiang Mai", proc: "Rejuran @ Banobagi",
    quote: "3 sessions, 4 weeks apart. Skin visibly brighter, pores tighter. Friends keep asking what I did." },
  { name: "Ms. Zhou, Shanghai", proc: "V-line @ JK Plastic",
    quote: "Doctor knows Asian faces. 14-day recovery, selfie confidence way up. Everyone asks my secret." },
];

export function PatientStories({ lang }: { lang: Lang }) {
  const list = lang === "en" ? EN : TH;
  return (
    <div className="relative -mx-4">
      <div className="overflow-x-auto scrollbar-hide pb-3 px-4">
        <div className="flex gap-3 min-w-max">
          {list.map((s, i) => (
            <div key={i} className="w-80 shrink-0 bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm">
              <div className="text-3xl mb-3">"</div>
              <p className="text-sm leading-relaxed text-neutral-700">{s.quote}</p>
              <div className="mt-4 flex items-center gap-3 pt-4 border-t border-neutral-100">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-300 to-orange-300 grid place-items-center font-black text-white">
                  {s.name.split(/\s/).slice(-1)[0].slice(0, 1)}
                </div>
                <div>
                  <div className="font-bold text-sm">{s.name}</div>
                  <div className="text-xs text-neutral-500">{s.proc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
