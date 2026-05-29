// 실적/지표 strip + 클리닉 후기 (런칭 phase 라 익명 + 상대지표).

const STATS = [
  { v: "528", l: "스카우팅 클리닉" },
  { v: "1,595", l: "월간 후기 수집" },
  { v: "50+", l: "전속 인플루언서" },
  { v: "5", l: "수집 플랫폼" },
];

const QUOTES = [
  { from: "강남 J 성형외과 마케팅실장",
    text: "Pantip에 우리 클리닉 후기가 0개라는 진단 받고 충격이었어요. 한 달 만에 18개 늘었습니다.",
    proc: "코성형 · V-line" },
  { from: "청담 L 피부과 원장",
    text: "GU 광고비 5분의 1로 태국 환자 첫 매칭 성공. 통역 패키지 포함이 결정적이었습니다.",
    proc: "필러 · 리쥬란" },
  { from: "압구정 D 의원",
    text: "Aey Surgery 매칭 한 번으로 태국 사전 예약 12건 들어왔습니다. ROI 600% 이상.",
    proc: "쌍꺼풀 · 안검하수" },
];

export function SalesProof() {
  return (
    <>
      <div className="grid grid-cols-4 gap-3 mb-10">
        {STATS.map((s, i) => (
          <div key={i} className="text-center">
            <div className="text-3xl md:text-5xl font-black bg-gradient-to-r from-pink-600 to-orange-500 bg-clip-text text-transparent">{s.v}</div>
            <div className="text-xs md:text-sm text-neutral-500 font-semibold mt-1">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {QUOTES.map((q, i) => (
          <div key={i} className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
            <div className="text-2xl text-pink-400 mb-2">"</div>
            <p className="text-sm leading-relaxed text-neutral-800">{q.text}</p>
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <div className="font-bold text-sm">{q.from}</div>
              <div className="text-xs text-neutral-500">{q.proc}</div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-neutral-400 text-center mt-4">
        * 클로즈드 베타 참여 클리닉 인터뷰 발췌. 익명 처리.
      </p>
    </>
  );
}
