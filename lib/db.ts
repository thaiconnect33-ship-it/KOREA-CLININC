// Site-wide read-only data loader. 모든 페이지가 여기서 데이터 가져감.
// 데이터 소스:
//   - data/seed.json + data/seed_discovered.json  (clinic 메타: id/ko/en/region)
//   - data/cache/<slug>.json                       (per-clinic 5플랫폼 scraped)
//   - data/yt_channel_contacts_clean.json          (Thai 마이크로 인플루언서)
//   - data/lemon8_market.json | pantip_market.json | youtube_market.json (topic intel)

import { promises as fs } from "node:fs";
import path from "node:path";
import type { ScoutResult } from "./types";

const ROOT = process.cwd();
const DATA = path.join(ROOT, "data");

export type Clinic = {
  id: string;
  ko: string;
  en: string;
  region: string;
};

export type ClinicWithScout = Clinic & {
  scout?: ScoutResult;
  // Convenience metrics
  naver_reviews: number;
  google_reviews: number;
  pantip_threads: number;
  youtube_videos: number;
  lemon8_posts: number;
  global_score: number;
  opportunity_cost_thb: number;
  // True if every overseas platform (gmaps+pantip+youtube+lemon8) ≤ tiny
  invisible_overseas: boolean;
};

export type Influencer = {
  channel: string;
  handle_slug: string;
  videos: number;
  total_views: number;
  topics: string[];
  channel_url: string;
  subscribers: string;
  contacts: { kind: string; url: string; handle?: string }[];
  contact_count: number;
  kind_breakdown: Record<string, number>;
};

export type TopicSummary = {
  slug: string;
  th: string;
  en: string;
  source: "lemon8" | "pantip" | "youtube" | "xiaohongshu" | "reddit" | "realself" | "google" | "bilibili" | "naver_blog";
  count: number;          // posts / threads / videos
  reach: number;          // likes / views
};

function slugifyHandle(s: string): string {
  const base = s
    .toLowerCase()
    .replace(/[\s/]+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  if (base) return base;
  // 비-ASCII 만 있는 채널명 (Thai/한글 등) — 안정적 해시 폴백.
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return "ch-" + Math.abs(h).toString(36);
}

function slugifyClinic(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9À-￿]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function readJSON<T>(rel: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(DATA, rel), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

let _clinics: Clinic[] | null = null;
export async function loadClinicSeeds(): Promise<Clinic[]> {
  if (_clinics) return _clinics;
  const a = await readJSON<Clinic[]>("seed.json", []);
  const b = await readJSON<Clinic[]>("seed_discovered.json", []);
  const seen = new Set<string>();
  const out: Clinic[] = [];
  for (const c of [...a, ...b]) {
    if (!c.id || seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
  }
  _clinics = out;
  return out;
}

async function loadScout(query: string): Promise<ScoutResult | null> {
  const slug = slugifyClinic(query);
  try {
    const raw = await fs.readFile(path.join(DATA, "cache", `${slug}.json`), "utf-8");
    return JSON.parse(raw) as ScoutResult;
  } catch {
    return null;
  }
}

function hydrate(c: Clinic, s: ScoutResult | null): ClinicWithScout {
  const p = s?.platforms;
  const naver = p?.naver.metric_value ?? 0;
  const google = p?.google_maps.metric_value ?? 0;
  const pantip = p?.pantip.metric_value ?? 0;
  const youtube = p?.youtube.metric_value ?? 0;
  const lemon8 = p?.lemon8.metric_value ?? 0;
  return {
    ...c,
    scout: s ?? undefined,
    naver_reviews: naver,
    google_reviews: google,
    pantip_threads: pantip,
    youtube_videos: youtube,
    lemon8_posts: lemon8,
    global_score: s?.global_score ?? 0,
    opportunity_cost_thb: s?.opportunity_cost_thb ?? 0,
    invisible_overseas: google < 50 && pantip < 1 && lemon8 < 1,
  };
}

let _all: ClinicWithScout[] | null = null;
export async function loadAllClinics(): Promise<ClinicWithScout[]> {
  if (_all) return _all;
  const seeds = await loadClinicSeeds();
  const out: ClinicWithScout[] = [];
  for (const c of seeds) {
    // ko 우선, 없으면 en 으로 try.
    const s = (await loadScout(c.ko)) ?? (await loadScout(c.en));
    out.push(hydrate(c, s));
  }
  _all = out;
  return out;
}

export async function getClinicById(id: string): Promise<ClinicWithScout | null> {
  const all = await loadAllClinics();
  return all.find((c) => c.id === id) ?? null;
}

// ── 인플루언서 ──────────────────────────────────────
let _influencers: Influencer[] | null = null;
export async function loadInfluencers(): Promise<Influencer[]> {
  if (_influencers) return _influencers;
  type Raw = {
    channel: string;
    videos: number;
    total_views: number;
    topics: string[];
    channel_url: string;
    subscribers: string;
    contacts: { kind: string; url: string; handle?: string }[];
    contact_count: number;
    kind_breakdown: Record<string, number>;
  };
  const data = await readJSON<{ channels: Raw[] }>("yt_channel_contacts_clean.json", { channels: [] });
  // 핵심 contact (IG/Line/TikTok/Email) 보유한 인플루언서만 노출. 나머지는 디렉토리에서 제외.
  const CORE = new Set(["instagram", "line", "tiktok", "email"]);
  const usable = data.channels.filter((c) => c.contacts.some((l) => CORE.has(l.kind)));
  const out = usable.map((c) => ({
    ...c,
    handle_slug: slugifyHandle(c.channel),
  }));
  _influencers = out;
  return out;
}

export async function getInfluencerBySlug(slug: string): Promise<Influencer | null> {
  const all = await loadInfluencers();
  return all.find((i) => i.handle_slug === slug) ?? null;
}

// ── 토픽 ──────────────────────────────────────────
let _topics: TopicSummary[] | null = null;
export async function loadTopics(): Promise<TopicSummary[]> {
  if (_topics) return _topics;
  type TopicEntry = { posts?: number; views?: number; likes?: number; comments?: number; videos?: number };
  type MarketFile = {
    by_topic?: Record<string, TopicEntry>;
    topics_searched?: number;
  };
  const out: TopicSummary[] = [];
  const seen = new Set<string>();

  function ingest(file: MarketFile | undefined, source: TopicSummary["source"]) {
    const bt = file?.by_topic ?? {};
    for (const [en, e] of Object.entries(bt)) {
      const slug = slugifyHandle(en);
      const key = `${source}:${slug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        slug,
        th: en,
        en,
        source,
        count: e.posts ?? e.videos ?? 0,
        reach: e.likes ?? e.views ?? 0,
      });
    }
  }
  for (const { file, source } of MARKET_FILES) {
    const data = await readJSON<MarketFile>(file, {});
    ingest(data, source);
  }

  _topics = out;
  return out;
}

// 슬러그로 토픽 묶음 조회 — 같은 슬러그가 3 source 에 다 있으면 모두 반환.
export async function getTopicGroup(slug: string): Promise<{
  slug: string;
  en: string;
  th: string;
  total_count: number;
  total_reach: number;
  by_source: TopicSummary[];
}> {
  const all = await loadTopics();
  const matches = all.filter((t) => t.slug === slug);
  if (matches.length === 0) return { slug, en: slug, th: slug, total_count: 0, total_reach: 0, by_source: [] };
  return {
    slug,
    en: matches[0].en,
    th: matches[0].th,
    total_count: matches.reduce((s, t) => s + t.count, 0),
    total_reach: matches.reduce((s, t) => s + t.reach, 0),
    by_source: matches,
  };
}

// ── Thai 후기 발췌 (clinic detail 에 임베드) ──────────
// Lemon8/Pantip/YouTube market 의 sample 에서 클리닉 이름 매칭되는 글 추출.
export type ReviewQuote = {
  source: "lemon8" | "pantip" | "youtube" | "xiaohongshu" | "reddit" | "realself" | "google" | "bilibili" | "naver_blog";
  title: string;
  url: string;
  author?: string;
  views?: number;
  likes?: number;
  snippet?: string;
};

const MARKET_FILES: { file: string; source: ReviewQuote["source"] }[] = [
  { file: "lemon8_market.json",      source: "lemon8" },
  { file: "pantip_market.json",      source: "pantip" },
  { file: "youtube_market.json",     source: "youtube" },
  { file: "xiaohongshu_market.json", source: "xiaohongshu" },
  { file: "reddit_market.json",      source: "reddit" },
  { file: "realself_market.json",    source: "realself" },
  { file: "google_market.json",      source: "google" },
  { file: "bilibili_market.json",    source: "bilibili" },
  { file: "naver_blog_market.json",  source: "naver_blog" },
];

type SamplePost = {
  title?: string;
  url?: string;
  author?: string;
  views?: number;
  likes?: number;
  view_text?: string;
  channel?: string;
  topic_th?: string;
  topic?: string;
};
type MarketFile = {
  sample_posts?: SamplePost[];
  sample_videos?: SamplePost[];
  sample_threads?: SamplePost[];
  clinic_mentions?: { name: string; mention_count: number; samples: { url: string; snippet: string; views?: number; channel?: string }[] }[];
};

function buildClinicTokens(c: Clinic): string[] {
  const out: string[] = [];
  if (c.en) {
    const brand = c.en.toLowerCase()
      .replace(/\b(plastic surgery|plastic|surgery|clinic|hospital|dermatology|skin care|skin|medical|center|korea|seoul|international)\b/g, "")
      .trim();
    if (brand.length >= 4) out.push(brand);
  }
  if (c.ko) {
    const trimmed = c.ko.replace(/(성형외과|의원|피부과|클리닉|병원|성형|피부)$/g, "").trim();
    if (trimmed.length >= 2) out.push(trimmed);
  }
  return out;
}

export async function loadClinicReviews(c: Clinic): Promise<ReviewQuote[]> {
  const tokens = buildClinicTokens(c);
  if (tokens.length === 0) return [];

  const out: ReviewQuote[] = [];
  const seen = new Set<string>();

  // 1) clinic_mentions 정확 매칭 우선.
  for (const { file, source } of MARKET_FILES) {
    const m = await readJSON<MarketFile>(file, {});
    const mentions = m.clinic_mentions ?? [];
    for (const cm of mentions) {
      const nm = cm.name.toLowerCase();
      if (!tokens.some((t) => nm.includes(t.toLowerCase()))) continue;
      for (const s of cm.samples) {
        if (seen.has(s.url)) continue;
        seen.add(s.url);
        out.push({
          source,
          title: s.snippet?.slice(0, 120) || "review",
          url: s.url,
          views: s.views,
          author: s.channel,
          snippet: s.snippet,
        });
      }
    }
  }

  // 2) sample_* 에서 본문 매칭 (느슨).
  for (const { file, source } of MARKET_FILES) {
    const m = await readJSON<MarketFile>(file, {});
    const samples = [...(m.sample_posts ?? []), ...(m.sample_videos ?? []), ...(m.sample_threads ?? [])];
    for (const s of samples) {
      const blob = `${s.title || ""} ${s.channel || ""} ${s.author || ""}`.toLowerCase();
      if (!tokens.some((t) => blob.includes(t.toLowerCase()))) continue;
      const url = s.url || "";
      if (!url || seen.has(url)) continue;
      seen.add(url);
      out.push({
        source,
        title: (s.title || "").slice(0, 140),
        url,
        author: s.author || s.channel,
        views: s.views,
        likes: s.likes,
      });
    }
  }

  return out.slice(0, 30);
}

// ── Lang-filtered content (영어 모드 carousel 용) ───
// 데이터 source 가 99% Thai 라 영어 페이지는 clinic cache 의 영어 YouTube + Reddit 만 노출.

const THAI_RE = /[฀-๿]/;
const HANGUL_RE = /[가-힣]/;

export type EnglishVideoCard = {
  title: string;
  channel: string;
  url: string;
  view_text: string;
  views: number;
};

let _enVideos: EnglishVideoCard[] | null = null;
export async function loadEnglishVideos(limit = 12): Promise<EnglishVideoCard[]> {
  if (_enVideos) return _enVideos.slice(0, limit);
  const clinics = await loadAllClinics();
  const all: EnglishVideoCard[] = [];
  const seenUrl = new Set<string>();
  for (const c of clinics) {
    const yt = c.scout?.platforms.youtube;
    const top = (yt?.extra as { top_videos?: Array<{ title?: string; channel?: string; url?: string; view_text?: string }> })?.top_videos;
    if (!Array.isArray(top)) continue;
    for (const v of top) {
      if (!v.url || !v.title || seenUrl.has(v.url)) continue;
      // Thai/한글 자막 비디오 제외 (영어 채널 + 영어 타이틀만).
      if (THAI_RE.test(v.title) || HANGUL_RE.test(v.title)) continue;
      if (v.channel && (THAI_RE.test(v.channel) || HANGUL_RE.test(v.channel))) continue;
      seenUrl.add(v.url);
      // "1.2K views" → 1200
      const vt = v.view_text || "";
      const m = vt.match(/([\d.]+)\s*([KMB]?)/i);
      let views = 0;
      if (m) {
        const n = parseFloat(m[1]);
        const u = m[2].toUpperCase();
        views = u === "K" ? n * 1e3 : u === "M" ? n * 1e6 : u === "B" ? n * 1e9 : n;
      }
      all.push({ title: v.title, channel: v.channel || "", url: v.url, view_text: vt, views: Math.round(views) });
    }
  }
  all.sort((a, b) => b.views - a.views);
  _enVideos = all;
  return all.slice(0, limit);
}

export type EnglishReviewCard = {
  source: "Reddit" | "YouTube" | "Realself" | "Xiaohongshu" | "Bilibili";
  flag: string;
  bg: string;
  title: string;
  url: string;
  author: string;
  metric: number;
};

let _enReviews: EnglishReviewCard[] | null = null;
export async function loadEnglishReviews(limit = 20): Promise<EnglishReviewCard[]> {
  if (_enReviews) return _enReviews.slice(0, limit);
  const out: EnglishReviewCard[] = [];
  const seenUrl = new Set<string>();
  // 1) Reddit market data (40 영어 + 10 mixed).
  const reddit = await readJSON<{ sample_posts?: SamplePost[] }>("reddit_market.json", {});
  for (const p of reddit.sample_posts ?? []) {
    if (!p.title || !p.url || seenUrl.has(p.url)) continue;
    if (THAI_RE.test(p.title) || HANGUL_RE.test(p.title)) continue;
    seenUrl.add(p.url);
    out.push({
      source: "Reddit", flag: "🌐", bg: "bg-orange-50",
      title: p.title.slice(0, 120),
      url: p.url,
      author: p.author || "",
      metric: p.likes ?? p.views ?? 0,
    });
  }
  // 2) Realself (보통 0 이지만 있으면).
  const realself = await readJSON<{ sample_posts?: SamplePost[] }>("realself_market.json", {});
  for (const p of realself.sample_posts ?? []) {
    if (!p.title || !p.url || seenUrl.has(p.url)) continue;
    seenUrl.add(p.url);
    out.push({
      source: "Realself", flag: "🇺🇸", bg: "bg-emerald-50",
      title: p.title.slice(0, 120), url: p.url,
      author: p.author || "",
      metric: p.likes ?? p.views ?? 0,
    });
  }
  // 2.5) Bilibili (CJK 中文 — 영어 사용자에도 visual evidence 가치).
  // Top-5 only — 영어 carousel 의 dominant lang 은 영어 유지, 중문은 가벼운 보조.
  const bili = await readJSON<{ sample_posts?: SamplePost[] }>("bilibili_market.json", {});
  for (const p of (bili.sample_posts ?? []).slice(0, 5)) {
    if (!p.title || !p.url || seenUrl.has(p.url)) continue;
    seenUrl.add(p.url);
    out.push({
      source: "Bilibili", flag: "📺", bg: "bg-cyan-50",
      title: p.title.slice(0, 120), url: p.url,
      author: p.author || "",
      metric: p.views ?? p.likes ?? 0,
    });
  }
  // 3) Clinic cache 의 영어 YouTube 비디오 (high views).
  const enVids = await loadEnglishVideos(50);
  for (const v of enVids.slice(0, 12)) {
    if (seenUrl.has(v.url)) continue;
    seenUrl.add(v.url);
    out.push({
      source: "YouTube", flag: "▶️", bg: "bg-red-50",
      title: v.title.slice(0, 120), url: v.url,
      author: v.channel,
      metric: v.views,
    });
  }
  out.sort((a, b) => b.metric - a.metric);
  _enReviews = out;
  return out.slice(0, limit);
}

// ── Aggregate stats (홈 hero stats 용) ────────────
export async function loadHomeStats() {
  const [clinics, influencers, topics] = await Promise.all([
    loadAllClinics(),
    loadInfluencers(),
    loadTopics(),
  ]);
  const lemon8Posts = topics.filter((t) => t.source === "lemon8").reduce((s, t) => s + t.count, 0);
  const youtubeViews = topics.filter((t) => t.source === "youtube").reduce((s, t) => s + t.reach, 0);
  return {
    clinics_count: clinics.length,
    influencers_count: influencers.length,
    lemon8_posts: lemon8Posts,
    youtube_views: youtubeViews,
    topics_count: new Set(topics.map((t) => t.slug)).size,
  };
}
