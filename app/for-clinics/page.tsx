// 한국 클리닉 사장님 대상 B2B 세일즈 페이지 (Korean).
import Link from "next/link";
import { AnchorNav } from "@/components/b2b/AnchorNav";
import { LiveAuditDemo } from "@/components/b2b/LiveAuditDemo";
import { ROICalculator } from "@/components/b2b/ROICalculator";
import { DashboardMockup } from "@/components/b2b/DashboardMockup";
import { CompetitorComparison } from "@/components/b2b/CompetitorComparison";
import { SalesProof } from "@/components/b2b/SalesProof";
import { B2BFaq } from "@/components/b2b/B2BFaq";
import { DemoBooking } from "@/components/b2b/DemoBooking";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      {/* TOP NAV */}
      <header className="border-b border-neutral-200 sticky top-0 bg-white/95 backdrop-blur z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-black text-lg"><span className="text-pink-600">K</span>·BeautyMap <span className="text-xs font-normal text-neutral-500 ml-1">for Clinics</span></Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/" className="text-neutral-600 hover:text-black hidden sm:inline">← 일반 사이트</Link>
            <a href="#book" className="bg-black text-white font-bold rounded-full px-4 py-1.5">데모 신청</a>
          </div>
        </div>
      </header>

      <AnchorNav />

      <main className="flex-1">
        {/* HERO */}
        <section className="bg-gradient-to-br from-pink-50 via-white to-orange-50 border-b border-neutral-100">
          <div className="max-w-5xl mx-auto px-4 py-12 md:py-20">
            <div className="inline-flex bg-amber-100 text-amber-900 text-xs font-bold rounded-full px-3 py-1 mb-5">
              🔒 B2B · Korean Clinics Only
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.05]">
              태국 환자 매출, <br />
              <span className="text-pink-600">매달 ₩수천만</span> 놓치고 있습니다
            </h1>
            <p className="mt-6 text-lg text-neutral-700 max-w-2xl">
              강남언니/바비톡은 한국 내수 위주.<br />
              우리는 <b>태국 · 중국 · 동남아</b> 마이크로 인플루언서로 직접 환자 매칭 — 광고가 아닌 <b>성과 모델</b>.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#demo" className="bg-black text-white font-bold rounded-full px-6 py-3.5 hover:bg-neutral-800">
                라이브 데모 시도 →
              </a>
              <a href="#book" className="bg-pink-600 text-white font-bold rounded-full px-6 py-3.5 hover:bg-pink-700">
                30분 미팅 신청 →
              </a>
            </div>
          </div>
        </section>

        {/* LIVE DEMO */}
        <section id="demo" className="max-w-5xl mx-auto px-4 py-16">
          <LiveAuditDemo />
        </section>

        {/* ROI CALC */}
        <section id="roi" className="max-w-5xl mx-auto px-4 py-16">
          <ROICalculator />
        </section>

        {/* DASHBOARD MOCKUP */}
        <section className="max-w-5xl mx-auto px-4 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="text-xs font-bold text-pink-600 tracking-wider mb-2">YOUR DASHBOARD</div>
              <h2 className="text-3xl md:text-4xl font-black leading-tight">
                매달 1일, 자동으로 받는<br />reach 진단 리포트
              </h2>
              <p className="mt-4 text-neutral-600">
                Naver · Google · Pantip · Lemon8 · YouTube 5개 플랫폼 데이터를 합쳐 자동 분석.
                인플루언서 매칭 진행 상황 + lead 매칭 현황까지 한 화면에.
              </p>
              <ul className="mt-6 space-y-2 text-sm">
                {["월간 reach 변동 그래프", "경쟁사 대비 포지셔닝", "인플루언서 매칭 캘린더", "Lead 매칭 추적 (CRM 연동 옵션)"]
                  .map((x, i) => <li key={i} className="flex items-center gap-2"><span className="text-emerald-500">✓</span>{x}</li>)}
              </ul>
            </div>
            <DashboardMockup />
          </div>
        </section>

        {/* COMPETITOR COMPARE */}
        <section id="compare" className="max-w-5xl mx-auto px-4 py-16">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-2">강남언니 / 자체 운영 vs 우리</h2>
          <p className="text-center text-neutral-600 mb-8">한 줄로 정리</p>
          <CompetitorComparison />
        </section>

        {/* PROOF */}
        <section className="max-w-5xl mx-auto px-4 py-16">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-2">베타 클리닉 후기</h2>
          <p className="text-center text-neutral-600 mb-10">실제 가입 클리닉 (익명)</p>
          <SalesProof />
        </section>

        {/* PRICING */}
        <section id="pricing" className="max-w-5xl mx-auto px-4 py-16">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-3">요금</h2>
          <p className="text-center text-neutral-500 mb-10 text-sm">매칭이 핵심 · 대시보드는 진단 도구</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Tier name="진단" badge="무료" priceTop="₩0" priceBot="1회" pts={["5플랫폼 reach 진단", "경쟁사 비교", "1-page PDF"]} />
            <Tier name="Core" badge="인기" priceTop="₩149만" priceBot="/월" pts={["월간 자동 리포트", "인플루언서 매칭 매월 2건", "통역+예약 패키지", "+ 매칭당 ₩50~150만 (인플루 규모별)"]} highlight />
            <Tier name="Exclusive" badge="" priceTop="₩499만" priceBot="/월" pts={["지역 독점 (1지구 1카테고리)", "매칭 무제한", "전담 매니저", "분기별 컨텐츠 production"]} />
          </div>
          <p className="text-center text-xs text-neutral-500 mt-6">VAT 별도 · 3개월 계약 · 첫 달 진단 무료 · 14일 트라이얼</p>
        </section>

        {/* FAQ */}
        <section id="faq" className="max-w-3xl mx-auto px-4 py-16">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-8">자주 묻는 질문</h2>
          <B2BFaq />
        </section>

        {/* BOOK */}
        <section id="book" className="max-w-3xl mx-auto px-4 py-16">
          <DemoBooking />
        </section>

        {/* SECONDARY CONTACTS */}
        <section className="max-w-3xl mx-auto px-4 pb-20">
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-3 gap-3 text-center">
            <a href="https://pf.kakao.com/_xKBeautyMap" target="_blank" rel="noopener" className="bg-yellow-300 hover:bg-yellow-400 rounded-2xl py-4 font-bold">💬 카카오톡 채널</a>
            <a href="https://talk.naver.com/koreabeautymap" target="_blank" rel="noopener" className="bg-emerald-100 hover:bg-emerald-200 rounded-2xl py-4 font-bold">🟢 네이버 톡톡</a>
            <a href="mailto:sales@koreabeautymap.com" className="bg-neutral-100 hover:bg-neutral-200 rounded-2xl py-4 font-bold">✉️ sales@…</a>
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-200 py-8 text-center text-xs text-neutral-400">
        © {new Date().getFullYear()} KoreaBeautyMap · For Clinics
        <div className="mt-1">
          <Link href="/" className="hover:text-black">일반 사이트 →</Link>
        </div>
      </footer>
    </div>
  );
}

function Tier({ name, badge, priceTop, priceBot, pts, highlight }: { name: string; badge: string; priceTop: string; priceBot: string; pts: string[]; highlight?: boolean }) {
  return (
    <div className={`rounded-3xl p-6 ${highlight ? "bg-black text-white ring-2 ring-pink-500 scale-105" : "bg-white border border-neutral-200"}`}>
      <div className="flex items-center justify-between">
        <div className={`text-xs font-bold uppercase tracking-wider ${highlight ? "text-pink-300" : "text-neutral-500"}`}>{name}</div>
        {badge && <span className={`text-[10px] font-black rounded-full px-2 py-0.5 ${highlight ? "bg-pink-500 text-white" : "bg-amber-100 text-amber-800"}`}>{badge}</span>}
      </div>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-black">{priceTop}</span>
        <span className={`text-sm ${highlight ? "text-neutral-400" : "text-neutral-500"}`}>{priceBot}</span>
      </div>
      <ul className={`mt-4 space-y-1.5 text-sm ${highlight ? "text-neutral-200" : "text-neutral-700"}`}>
        {pts.map((p, i) => <li key={i} className="flex gap-2"><span className={highlight ? "text-pink-300" : "text-emerald-500"}>✓</span><span>{p}</span></li>)}
      </ul>
      <a href="#book" className={`mt-6 block text-center font-bold rounded-xl py-3 ${highlight ? "bg-pink-500 hover:bg-pink-400" : "bg-black text-white hover:bg-neutral-800"}`}>
        선택 →
      </a>
    </div>
  );
}
