// Naver Map 검색 결과에서 클리닉 이름을 추출할 때 anchor textContent 에 함께 들어오는
// 노이즈 — "톡톡" (Naver Talk Talk 채팅 뱃지), "라이브", "예약", "즉시예약" — 와 중복
// 카테고리 suffix 를 정리.
//
// 패턴 예:
//   "비앤영의원톡톡성형외과" → "비앤영의원"
//   "우아성형외과의원톡톡성형외과" → "우아성형외과의원"
//   "제이준성형외과의원성형외과" → "제이준성형외과의원"
//   "압구정리앤스타의원성형외과" → "압구정리앤스타의원"

const BADGES = ["톡톡", "라이브", "즉시예약", "예약", "광고", "BEST", "오픈"];
const MEDICAL_SUFFIX = ["의원", "성형외과", "피부과", "치과", "병원", "클리닉", "한의원", "내과", "정형외과", "이비인후과"];
const CATEGORIES = ["성형외과", "피부과", "치과", "내과", "정형외과", "이비인후과", "한의원"];

export function cleanClinicName(raw: string): string {
  let s = (raw || "").trim();
  if (!s) return s;

  // 1) 뱃지 제거.
  for (const b of BADGES) s = s.split(b).join("");

  // 2) 끝에 카테고리가 있고, 그 앞에 다른 medical suffix 가 이미 있으면 trailing 카테고리 제거.
  //    예: "비앤영의원성형외과" → "비앤영의원"
  //        "우아성형외과의원성형외과" → "우아성형외과의원"
  for (const cat of CATEGORIES) {
    if (s.endsWith(cat)) {
      const stem = s.slice(0, -cat.length);
      // stem 안에 medical suffix 가 이미 끝에 있는지.
      const hasMedicalBefore = MEDICAL_SUFFIX.some((m) => stem.endsWith(m));
      if (hasMedicalBefore) {
        s = stem.trim();
        break;
      }
    }
  }

  // 3) 연속 중복 카테고리 (e.g. "...성형외과성형외과") 제거.
  for (const cat of CATEGORIES) {
    const dup = cat + cat;
    while (s.includes(dup)) s = s.replace(dup, cat);
  }

  // 4) 가운데 공백 + 의원 + (분점/지점/명) 후 trailing 카테고리:
  //    "리팅성형외과의원 서울성형외과" → "리팅성형외과의원 서울"
  //    "...의원 강남성형외과" → "...의원 강남"
  //    (사용자 입력에는 거의 안 들어오는 형태)
  for (const cat of CATEGORIES) {
    const m = s.match(new RegExp(`^(.+?의원\\s+[^\\s]+?)${cat}$`));
    if (m) { s = m[1].trim(); break; }
  }

  return s.trim();
}

// 동일 이름이 여러 place_id 로 들어왔을 때 dedup 키 생성.
export function nameKey(name: string): string {
  return cleanClinicName(name).replace(/\s+/g, "").toLowerCase();
}
