"use client";

import { useState } from "react";

const FAQ = [
  { q: "강남언니 / 바비톡과 뭐가 다른가요?",
    a: "두 곳은 한국 내수 + 광고 모델이고, 우리는 태국/중국/동남아 환자 유치 + lead 성과 모델입니다. 광고를 사는 게 아니라 실제 매칭된 환자만 비용을 내는 구조라 ROI 측정이 가능합니다." },
  { q: "마이크로 인플루언서는 어떻게 검증하나요?",
    a: "최소 1년 이상 한국 미용/성형 컨텐츠 제작 이력, 자체 채널 운영, 실 contact 보유한 50+ Thai/Chinese 크리에이터만 등록. 우리가 직접 BRD 작성 + 컨텐츠 감수 합니다." },
  { q: "환자가 실제로 오면 어떻게 알 수 있죠?",
    a: "Lead 페이지에 환자가 'X 클리닉 상담 신청' 으로 표시되면 우리가 카톡으로 알림 + 환자 contact 즉시 전달. 30일 내 방문 시 매칭 fee 청구." },
  { q: "결제는 어떻게 진행되나요?",
    a: "월 구독은 매월 1일 자동 청구, 매칭 fee 는 환자 방문 확인 후 월말 정산. 세금계산서 발행. 3개월 단위 계약." },
  { q: "환자 컴플레인 책임은 누가 지나요?",
    a: "의료 행위는 100% 클리닉 책임이며 우리는 매칭/홍보만 담당. 단 환자가 통역/예약 관련 불만 시 우리가 1차 응대 → 클리닉과 협의." },
  { q: "테스트 / 무료 진단 가능한가요?",
    a: "데모 신청 시 무료 1-page 진단 PDF 즉시 발송 (우리 클리닉이 5플랫폼에서 어떻게 보이는지). 14일 무료 트라이얼 후 결정." },
];

export function B2BFaq() {
  const [open, setOpen] = useState(0);
  return (
    <div className="space-y-2">
      {FAQ.map((f, i) => (
        <div key={i} className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
          <button type="button" onClick={() => setOpen(open === i ? -1 : i)} className="w-full flex items-center justify-between p-4 text-left hover:bg-neutral-50">
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
