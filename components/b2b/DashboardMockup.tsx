// 가입 후 보게 될 대시보드 시각 sample.
export function DashboardMockup() {
  return (
    <div className="relative">
      <div className="absolute -top-4 -right-4 bg-pink-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg rotate-6 z-10">
        가입 후 화면 ↓
      </div>
      <div className="bg-neutral-900 rounded-3xl p-2 shadow-2xl">
        {/* Window chrome */}
        <div className="flex gap-1.5 px-3 py-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span className="ml-3 text-xs text-neutral-400 font-mono">dashboard.koreabeautymap.com/clinic/your-clinic</span>
        </div>
        {/* Body */}
        <div className="bg-white rounded-2xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-black text-lg">우리 클리닉 — 5월 리포트</h4>
              <p className="text-xs text-neutral-500">2026-05-29 자동 생성</p>
            </div>
            <span className="bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full px-2 py-0.5">▲ +18%</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <Tile label="Naver 리뷰" v="8,765" delta="+312" />
            <Tile label="Pantip 언급" v="13" delta="+5" pink />
            <Tile label="Lemon8 ♥" v="2.4k" delta="+1.1k" pink />
            <Tile label="YouTube 조회" v="42k" delta="+18k" pink />
          </div>

          <div className="bg-neutral-50 rounded-xl p-3 mb-4">
            <div className="text-xs font-bold text-neutral-500 mb-2">월 reach 추세</div>
            <div className="flex items-end gap-1 h-16">
              {[40, 55, 50, 65, 60, 75, 80, 72, 85, 95, 88, 100].map((h, i) => (
                <div key={i} className="flex-1 bg-gradient-to-t from-pink-300 to-pink-500 rounded-t" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <div className="text-xs font-bold text-amber-800">💸 이번 달 lead 매칭</div>
            <div className="text-2xl font-black text-amber-900 mt-1">7 / 10</div>
            <div className="text-xs text-amber-700">목표 대비 70% — Aey Surgery 협업 진행 중</div>
          </div>

          <div className="space-y-1.5">
            {[
              { name: "@aey_surgery", proc: "코성형 컨텐츠 작업 중", status: "진행" },
              { name: "@surgeryreview", proc: "전체 패키지 리뷰", status: "검토" },
              { name: "@khunkheth", proc: "필러 reels 예정", status: "대기" },
            ].map((c, i) => (
              <div key={i} className="flex items-center justify-between bg-neutral-50 rounded-lg px-3 py-2 text-xs">
                <span className="font-bold">{c.name}</span>
                <span className="text-neutral-500">{c.proc}</span>
                <span className="bg-white border border-neutral-300 rounded px-1.5 py-0.5 font-semibold">{c.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, v, delta, pink }: { label: string; v: string; delta: string; pink?: boolean }) {
  return (
    <div className="bg-neutral-50 rounded-xl p-2.5">
      <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">{label}</div>
      <div className="font-black text-lg mt-0.5">{v}</div>
      <div className={`text-[10px] font-bold ${pink ? "text-pink-600" : "text-emerald-600"}`}>▲ {delta}</div>
    </div>
  );
}
