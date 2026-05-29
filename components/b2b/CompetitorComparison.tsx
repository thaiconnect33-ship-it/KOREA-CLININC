const ROWS = [
  { feat: "월 광고비",          us: "₩149만",      gu: "₩300~700만+",      diy: "직접 광고비 + 인건비",       us_win: true  },
  { feat: "Thai/CN 인플루언서",  us: "50+ 전속 풀",  gu: "❌",                diy: "직접 섭외 (언어장벽)",        us_win: true  },
  { feat: "유료 광고 모델",       us: "❌ no paid placement", gu: "✅ pay-to-rank", diy: "—",                 us_win: true  },
  { feat: "성과 기반 과금",       us: "✅ CPL (lead당)", gu: "❌ CPM/CPC",        diy: "고정비",                 us_win: true  },
  { feat: "한국어 대시보드",       us: "✅",          gu: "✅",                diy: "❌",                     us_win: false },
  { feat: "월간 reach 리포트",    us: "✅ 자동",      gu: "분기 1회",          diy: "수동",                   us_win: true  },
  { feat: "다국어 lead 통역",     us: "✅ 포함",      gu: "별도 비용",          diy: "❌",                     us_win: true  },
  { feat: "지역 독점권 옵션",     us: "✅",          gu: "❌",                diy: "—",                     us_win: true  },
];

export function CompetitorComparison() {
  return (
    <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 border-b border-neutral-200">
          <tr>
            <th className="text-left p-4 font-semibold text-neutral-500">항목</th>
            <th className="text-center p-4 font-black bg-pink-50">
              <span className="text-pink-600">KoreaBeautyMap</span>
            </th>
            <th className="text-center p-4 font-semibold">강남언니</th>
            <th className="text-center p-4 font-semibold">자체 운영</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r, i) => (
            <tr key={i} className="border-t border-neutral-100">
              <td className="p-4 font-semibold text-neutral-700">{r.feat}</td>
              <td className={`p-4 text-center font-bold ${r.us_win ? "bg-pink-50 text-pink-700" : "text-neutral-700"}`}>{r.us}</td>
              <td className="p-4 text-center text-neutral-600">{r.gu}</td>
              <td className="p-4 text-center text-neutral-600">{r.diy}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
