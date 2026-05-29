/* Lemon8 Thai 시장 인텔리전스 스크립트.
 *
 * 태국어 주제 키워드 ("한국 성형", "한국 피부", "한국 의사", ...) 로 검색 →
 * - 총 포스트 수, 총 좋아요
 * - top 인플루언서 (author 단위 좋아요 합산)
 * - 본문에 언급된 한국 클리닉 이름 (자동 매칭)
 *
 * 산출: data/lemon8_market.json
 *
 * 실행: npx tsx scripts/lemon8_market.ts
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

type Post = {
  topic: string;
  topic_th: string;
  title: string;
  description: string;
  author: string;
  likes: number;
  url: string;
};

const TOPICS: { th: string; en: string }[] = [
  // 광의 — 한국 / K-beauty
  { th: "ศัลยกรรมเกาหลี",        en: "Korean plastic surgery" },
  { th: "คลินิกความงามเกาหลี",   en: "Korean beauty clinic" },
  { th: "หมอเกาหลี",             en: "Korean doctor" },
  { th: "ความงามเกาหลี",         en: "Korean beauty" },
  { th: "เคบิวตี้",                en: "K-beauty" },
  { th: "รีวิวเกาหลี",             en: "Korea review" },
  { th: "ไปเกาหลีทำหน้า",        en: "Korea trip face surgery" },
  { th: "ทริปเกาหลีความงาม",     en: "Korea beauty trip" },
  // 시술 카테고리
  { th: "ทำหน้าเกาหลี",          en: "Korean face surgery" },
  { th: "ทำตาสองชั้นเกาหลี",     en: "Korean double eyelid" },
  { th: "ทำจมูกเกาหลี",          en: "Korean nose job" },
  { th: "เสริมจมูกเกาหลี",       en: "Korean nose augmentation" },
  { th: "แก้จมูกเกาหลี",          en: "Korean nose revision" },
  { th: "ทำคางเกาหลี",            en: "Korean chin" },
  { th: "ทำปากเกาหลี",            en: "Korean lips" },
  { th: "ฟิลเลอร์เกาหลี",        en: "Korean filler" },
  { th: "โบท็อกซ์เกาหลี",        en: "Korean botox" },
  { th: "ฉีดหน้าเกาหลี",          en: "Korean face injection" },
  { th: "เลเซอร์เกาหลี",          en: "Korean laser" },
  { th: "ดูดไขมันเกาหลี",         en: "Korean liposuction" },
  { th: "ลดน้ำหนักเกาหลี",       en: "Korean weight loss" },
  { th: "ปลูกผมเกาหลี",          en: "Korean hair transplant" },
  // 피부과
  { th: "ผิวเกาหลี",              en: "Korean skin" },
  { th: "ดูแลผิวเกาหลี",          en: "Korean skincare" },
  { th: "ผิวกระจกเกาหลี",         en: "Korean glass skin" },
  { th: "ผิวขาวเกาหลี",           en: "Korean white skin" },
  { th: "รักษาสิวเกาหลี",         en: "Korean acne treatment" },
  { th: "ฟื้นฟูผิวเกาหลี",         en: "Korean skin recovery" },
  { th: "มาสก์เกาหลี",            en: "Korean mask" },
  { th: "เซรั่มเกาหลี",            en: "Korean serum" },
  // 트렌드 시술
  { th: "รีจูรันเกาหลี",           en: "Korean rejuran" },
  { th: "เอ็กโซโซมเกาหลี",       en: "Korean exosome" },
  { th: "สแตมเซลล์เกาหลี",       en: "Korean stem cell" },
  { th: "อินโหมดเกาหลี",          en: "Korean inmode" },
  { th: "ลิฟต์หน้าเกาหลี",         en: "Korean facelift" },
  // 지역 / 지명
  { th: "กังนัม",                  en: "Gangnam" },
  { th: "กังนัมศัลยกรรม",         en: "Gangnam plastic surgery" },
  { th: "อัปกุจอง",                en: "Apgujeong" },
  { th: "ชองดัม",                  en: "Cheongdam" },
  { th: "เมียงดง",                 en: "Myeongdong" },
];

// 한국 클리닉 이름 사전 (영문, 부분 match). seed.json 으로부터 자동 로드.
async function loadKoreanClinicNames(): Promise<string[]> {
  const seeds: { en?: string; ko?: string }[] = [];
  for (const f of ["seed.json", "seed_discovered.json"]) {
    try {
      const raw = await fs.readFile(path.join(process.cwd(), "data", f), "utf-8");
      seeds.push(...(JSON.parse(raw) as { en?: string; ko?: string }[]));
    } catch { /* skip */ }
  }
  const names = new Set<string>();
  for (const s of seeds) {
    if (s.en) names.add(s.en.toLowerCase());
    if (s.ko) names.add(s.ko);
  }
  return Array.from(names);
}

function parseLikeCount(text: string): number {
  const t = text.trim().toLowerCase().replace(/[,\s]/g, "");
  const m = t.match(/([\d.]+)([kmb]?)/);
  if (!m) return 0;
  const num = parseFloat(m[1]);
  if (isNaN(num)) return 0;
  const unit = m[2];
  if (unit === "k") return Math.round(num * 1_000);
  if (unit === "m") return Math.round(num * 1_000_000);
  if (unit === "b") return Math.round(num * 1_000_000_000);
  return Math.round(num);
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      "accept-language": "th,en;q=0.9",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/**
 * Lemon8 의 두 가지 article card schema:
 *   A) /experience/<brand> 페이지 — .source-article-card
 *   B) /topic/<query> 페이지 — .article_card_main (snake_case)
 * 둘 다 시도.
 */
function parseCards(html: string, topicTh: string, topicEn: string): Post[] {
  const $ = cheerio.load(html);
  const out: Post[] = [];
  const seen = new Set<string>();

  // Schema A — /experience/ 페이지
  $(".source-article-card, .article-recommend-card").each((_, el) => {
    const $el = $(el);
    const title = ($el.find(".article-title, [class*='title']").first().text() || "").trim().slice(0, 200);
    const description = (
      $el.find(".source-article-card-cover-desc, [class*='cover-desc'], [class*='desc']").first().text() || ""
    ).trim().slice(0, 1000);
    const author = ($el.find(".author-name, [class*='author-name']").first().text() || "").trim().slice(0, 100);
    const likes = parseLikeCount($el.find(".likes-count, .digg, [class*='likes']").first().text() || "");
    const href = $el.find("a[href*='/post/'], a[href*='/experience/']").first().attr("href") || "";
    const key = href || `${title}|${author}|${likes}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (title || likes) {
      out.push({ topic: topicEn, topic_th: topicTh, title, description, author, likes,
        url: href ? new URL(href, "https://www.lemon8-app.com").toString() : "" });
    }
  });

  // Schema B — /topic/ 페이지 (snake_case 클래스)
  $(".article_card_main").each((_, el) => {
    const $el = $(el);
    const title = ($el.find(".article_card_main_body_title").first().text() || "").trim().slice(0, 200);
    const description = (
      $el.find(".article_card_main_body_content, .article_card_desc").first().text() || ""
    ).trim().slice(0, 1000);
    const author = ($el.find(".article_card_user, [class*='user']").first().text() || "").trim().slice(0, 100);
    const likes = parseLikeCount($el.find(".article_card_like").first().text() || "");
    const href = $el.find("a").first().attr("href") || "";
    const key = href || `${title}|${author}|${likes}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (title || likes) {
      out.push({ topic: topicEn, topic_th: topicTh, title, description, author, likes,
        url: href ? new URL(href, "https://www.lemon8-app.com").toString() : "" });
    }
  });

  return out;
}

async function scrapeTopic(topicTh: string, topicEn: string): Promise<Post[]> {
  // 두 URL 패턴 시도 — /topic/ (generic 검색) + /experience/ (브랜드).
  // Union 으로 합치고 dedup.
  const urls = [
    `https://www.lemon8-app.com/topic/${encodeURIComponent(topicTh)}?region=th`,
    `https://www.lemon8-app.com/experience/${encodeURIComponent(topicTh)}?region=th`,
  ];
  const seen = new Set<string>();
  const out: Post[] = [];
  for (const url of urls) {
    try {
      const html = await fetchHtml(url);
      for (const p of parseCards(html, topicTh, topicEn)) {
        const key = p.url || `${p.title}|${p.author}|${p.likes}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(p);
      }
    } catch { /* 한쪽 실패해도 다른 쪽 시도 */ }
  }
  return out;
}

/**
 * 후보 토큰 사전 — 영문 클리닉 이름에서 generic 부분 떼고 unique brand 만 남김.
 * False positive 방지:
 *   - 영문: brand ≥5 chars (the/ami/real/view 같은 흔한 단어 제외)
 *   - 흔한 영어 stop-brand 별도 제외 리스트
 *   - 매칭은 word-boundary 기반 (substring NO)
 *   - 한국어: 4자 이상 + 흔한 접미사 제거
 */
const STOP_BRANDS = new Set([
  "the", "best", "new", "one", "real", "view", "ami", "fresh", "global", "grand",
  "namu", "marble", "fortune", "evita", "april", "tellus",  // 5자 이하 또는 흔한 영단어
]);

function buildSearchTokens(clinicNames: string[]): { token: string; canonical: string; kind: "ko" | "en" }[] {
  const stop = /(\s+(plastic surgery|plastic|surgery|clinic|hospital|dermatology|skin care|skin|medical|center|korea|seoul|international)\b)/gi;
  const out = new Map<string, { canonical: string; kind: "ko" | "en" }>();
  for (const name of clinicNames) {
    if (!name) continue;
    const lower = name.toLowerCase();
    if (/[가-힯]/.test(name)) {
      const trimmed = name.replace(/(성형외과|의원|피부과|클리닉|병원|성형|피부)$/g, "").trim();
      if (trimmed.length >= 4) out.set(trimmed, { canonical: name, kind: "ko" });
      continue;
    }
    const brand = lower.replace(stop, "").trim();
    // 5자 이상이고 흔한 영단어 아닌 brand 만 등록.
    if (brand.length >= 5 && !STOP_BRANDS.has(brand)) {
      out.set(brand, { canonical: name, kind: "en" });
    }
  }
  return Array.from(out.entries()).map(([token, v]) => ({ token, ...v }));
}

function detectClinicMentions(
  text: string,
  tokens: { token: string; canonical: string; kind: "ko" | "en" }[],
): string[] {
  const lower = text.toLowerCase();
  const hits = new Set<string>();
  for (const t of tokens) {
    if (t.kind === "ko") {
      if (text.includes(t.token)) hits.add(t.canonical);
    } else {
      // Word-boundary 기반 매칭 — substring 부분 매칭 (preview 의 view 등) 방지.
      const re = new RegExp(`\\b${t.token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (re.test(lower)) hits.add(t.canonical);
    }
  }
  return Array.from(hits);
}

function log(msg: string) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

async function main() {
  const clinicNames = await loadKoreanClinicNames();
  const tokens = buildSearchTokens(clinicNames);
  log(`로드: ${clinicNames.length} 한국 클리닉 → ${tokens.length} 매칭 토큰 (brand-only)`);

  const allPosts: Post[] = [];
  for (const [i, t] of TOPICS.entries()) {
    log(`(${i + 1}/${TOPICS.length}) ${t.th} (${t.en})`);
    try {
      const posts = await scrapeTopic(t.th, t.en);
      allPosts.push(...posts);
      log(`  +${posts.length} 포스트`);
    } catch (e) {
      log(`  ✗ 실패: ${e instanceof Error ? e.message : String(e)}`);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  // 토픽별 집계.
  const byTopic = new Map<string, { posts: number; likes: number }>();
  for (const p of allPosts) {
    const entry = byTopic.get(p.topic) ?? { posts: 0, likes: 0 };
    entry.posts++;
    entry.likes += p.likes;
    byTopic.set(p.topic, entry);
  }

  // 인플루언서 집계 (author 단위).
  const byAuthor = new Map<string, { posts: number; likes: number; topics: Set<string> }>();
  for (const p of allPosts) {
    if (!p.author) continue;
    const e = byAuthor.get(p.author) ?? { posts: 0, likes: 0, topics: new Set() };
    e.posts++;
    e.likes += p.likes;
    e.topics.add(p.topic);
    byAuthor.set(p.author, e);
  }
  const influencers = Array.from(byAuthor.entries())
    .map(([author, e]) => ({
      author,
      posts: e.posts,
      total_likes: e.likes,
      topics: Array.from(e.topics),
    }))
    .sort((a, b) => b.total_likes - a.total_likes)
    .slice(0, 50);

  // 한국 클리닉 mention 감지 — title + description + author 모두 스캔, brand-token 매칭.
  // matched snippet 도 저장 → false positive 검증 가능.
  type MentionEntry = {
    count: number;
    samples: { url: string; snippet: string; likes: number; author: string }[];
  };
  const clinicMentions = new Map<string, MentionEntry>();
  for (const p of allPosts) {
    const text = `${p.title} ${p.description} ${p.author}`;
    for (const name of detectClinicMentions(text, tokens)) {
      const e = clinicMentions.get(name) ?? { count: 0, samples: [] };
      e.count++;
      if (e.samples.length < 5) {
        e.samples.push({
          url: p.url,
          snippet: text.replace(/\s+/g, " ").slice(0, 200),
          likes: p.likes,
          author: p.author,
        });
      }
      clinicMentions.set(name, e);
    }
  }
  const mentions = Array.from(clinicMentions.entries())
    .map(([name, e]) => ({ name, mention_count: e.count, samples: e.samples }))
    .sort((a, b) => b.mention_count - a.mention_count);

  // 요약.
  const totalPosts = allPosts.length;
  const totalLikes = allPosts.reduce((s, p) => s + p.likes, 0);

  const output = {
    generated_at: new Date().toISOString(),
    total_posts: totalPosts,
    total_likes: totalLikes,
    topics_searched: TOPICS.length,
    by_topic: Object.fromEntries(byTopic),
    top_influencers: influencers,
    clinic_mentions: mentions,
    sample_posts: allPosts
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 30),
  };

  const outPath = path.join(process.cwd(), "data", "lemon8_market.json");
  await fs.writeFile(outPath, JSON.stringify(output, null, 2), "utf-8");
  log(`완료 — ${totalPosts} 포스트, ${totalLikes.toLocaleString()} 좋아요, ${influencers.length} 인플루언서, ${mentions.length} 클리닉 mention → ${outPath}`);
}

main().catch((e) => {
  console.error("[lemon8_market] fatal:", e);
  process.exit(1);
});
