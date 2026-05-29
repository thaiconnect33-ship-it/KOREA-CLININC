# Manual data injection

`<클리닉슬러그>.json` 파일을 이 폴더에 두면 `/api/scout` 가 자동 merge 합니다.

## 슬러그 규칙
검색어를 소문자 + 영숫자 외 문자 → `-` 치환.
- `"ID Hospital"` → `id-hospital.json`
- `"강남 JK성형"` → `강남-jk성형.json`
- `"Gangnam Unni"` → `gangnam-unni.json`

## 파일 형식

전체 옵션 — 모든 키 옵션이고, 안 넣은 플랫폼은 자동 결과 유지:

```json
{
  "naver":       { "metric_value": 1234, "extra": { "visitor": 800, "blog": 434 } },
  "google_maps": { "metric_value": 320,  "extra": { "foreign_language_reviews": 47, "rating": 4.7 } },
  "pantip":      { "metric_value": 12,   "extra": { "total_views": 45000 } },
  "xiaohongshu": { "metric_value": 87,   "extra": { "top_5_likes": 12000 } },
  "lemon8":      { "metric_value": 23,   "extra": { "note": "2026-05 수집" } }
}
```

## 동작
- `metric_value` 있으면 → 그 플랫폼은 `ok=true` 로 표시 (placeholder 에러 사라짐)
- `extra` 는 자동 결과의 extra 와 merge (덮어쓰기)
- 자동 결과가 더 좋아질 (Phase 2) 때 이 파일 지우면 자동 결과만 사용

## 캐시 영향
검색 결과는 24h 캐시되므로 manual 파일을 새로 넣었으면 `data/cache/<슬러그>.json` 도 지워서 강제 refresh.
