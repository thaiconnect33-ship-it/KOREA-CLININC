/* Apify rednote-xiaohongshu-search-scraper dump → xiaohongshu_market.json 변환.
 *
 * 입력: data/manual/dataset_rednote-xiaohongshu-search-scraper_*.json (한 개 이상)
 *       Apify 가 RED 검색결과를 통째로 dump 한 raw JSON 배열.
 *
 * 출력: data/xiaohongshu_market.json  (Lemon8/Pantip 와 동일 schema → ClinicDetail 자동 표시)
 *
 * 실행: npx tsx scripts/xhs_import.ts
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MANUAL_DIR = path.join(ROOT, "data", "manual");
const OUT_PATH = path.join(ROOT, "data", "xiaohongshu_market.json");

type ApifyEntry = {
  keyword?: string;
  link?: string;
  item?: {
    id?: string;
    note_card?: {
      display_title?: string;
      type?: string;
      user?: { nickname?: string; nick_name?: string; user_id?: string };
      interact_info?: {
        liked_count?: string | number;
        collected_count?: string | number;
        comment_count?: string | number;
        shared_count?: string | number;
      };
      cover?: { url_default?: string; url_pre?: string };
      corner_tag_info?: { type?: string; text?: string }[];
    };
  };
  scrapedAt?: string;
};

type ParsedPost = {
  url: string;
  title: string;
  author: string;
  author_id: string;
  likes: number;
  collected: number;
  comments: number;
  shared: number;
  topic: string;
  topic_th: string;
  cover: string;
  type: string;
  published: string;
  views: number;
};

function log(msg: string) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function parseIntSafe(v: string | number | undefined): number {
  if (typeof v === "number") return Math.round(v);
  if (typeof v !== "string") return 0;
  const n = parseInt(v.replace(/[,\s]/g, ""), 10);
  return isNaN(n) ? 0 : n;
}

function entryToPost(e: ApifyEntry): ParsedPost | null {
  const nc = e.item?.note_card;
  if (!nc) return null;
  const title = (nc.display_title || "").trim();
  if (!title) return null;
  const link = e.link || "";
  // URL 정규화 — xsec_token 등 query string 제거 (캐싱/dedup 에 방해).
  const cleanUrl = link.split("?")[0];
  if (!cleanUrl) return null;
  const author = (nc.user?.nickname || nc.user?.nick_name || "").trim();
  const interact = nc.interact_info || {};
  const cover = nc.cover?.url_default || nc.cover?.url_pre || "";
  const published = nc.corner_tag_info?.find((c) => c.type === "publish_time")?.text || "";
  return {
    url: cleanUrl,
    title: title.slice(0, 240),
    author: author.slice(0, 60),
    author_id: nc.user?.user_id || "",
    likes: parseIntSafe(interact.liked_count),
    collected: parseIntSafe(interact.collected_count),
    comments: parseIntSafe(interact.comment_count),
    shared: parseIntSafe(interact.shared_count),
    topic: (e.keyword || "manual").slice(0, 60),
    topic_th: (e.keyword || "manual").slice(0, 60),
    cover,
    type: nc.type || "note",
    published,
    views: 0,
  };
}

async function listDumps(): Promise<string[]> {
  try {
    const items = await fs.readdir(MANUAL_DIR);
    return items
      .filter((f) => /^dataset_rednote-xiaohongshu.*\.json$/i.test(f))
      .map((f) => path.join(MANUAL_DIR, f));
  } catch {
    return [];
  }
}

async function main() {
  const dumps = await listDumps();
  if (dumps.length === 0) {
    log(`덤프 없음 — ${MANUAL_DIR} 에 dataset_rednote-xiaohongshu*.json 추가 후 재실행`);
    return;
  }
  log(`덤프 ${dumps.length}개 발견`);

  const allPosts: ParsedPost[] = [];
  const seenUrl = new Set<string>();
  let totalRaw = 0;
  for (const f of dumps) {
    const raw = await fs.readFile(f, "utf-8");
    let arr: ApifyEntry[];
    try {
      arr = JSON.parse(raw);
    } catch {
      log(`  ✗ ${path.basename(f)} JSON 파싱 실패 — skip`);
      continue;
    }
    if (!Array.isArray(arr)) {
      log(`  ✗ ${path.basename(f)} 배열 아님 — skip`);
      continue;
    }
    totalRaw += arr.length;
    let imported = 0;
    for (const e of arr) {
      const p = entryToPost(e);
      if (!p) continue;
      if (seenUrl.has(p.url)) continue;
      seenUrl.add(p.url);
      allPosts.push(p);
      imported++;
    }
    log(`  ✓ ${path.basename(f)} — ${imported}/${arr.length}`);
  }

  // 집계.
  const byTopic = new Map<string, { posts: number; likes: number }>();
  for (const p of allPosts) {
    const e = byTopic.get(p.topic) ?? { posts: 0, likes: 0 };
    e.posts++; e.likes += p.likes;
    byTopic.set(p.topic, e);
  }
  const byAuthor = new Map<string, { posts: number; likes: number; topics: Set<string>; author_id: string }>();
  for (const p of allPosts) {
    if (!p.author) continue;
    const e = byAuthor.get(p.author) ?? { posts: 0, likes: 0, topics: new Set<string>(), author_id: p.author_id };
    e.posts++; e.likes += p.likes; e.topics.add(p.topic);
    byAuthor.set(p.author, e);
  }
  const influencers = Array.from(byAuthor.entries())
    .map(([author, e]) => ({ author, author_id: e.author_id, posts: e.posts, total_likes: e.likes, topics: Array.from(e.topics) }))
    .sort((a, b) => b.total_likes - a.total_likes)
    .slice(0, 50);

  const sortedSample = allPosts.slice().sort((a, b) => b.likes - a.likes);

  const output = {
    generated_at: new Date().toISOString(),
    total_posts: allPosts.length,
    total_likes: allPosts.reduce((s, p) => s + p.likes, 0),
    total_collected: allPosts.reduce((s, p) => s + p.collected, 0),
    blocked_count: 0,
    source: "apify_rednote_dump",
    raw_entries: totalRaw,
    keywords: Array.from(byTopic.keys()),
    by_topic: Object.fromEntries(byTopic),
    top_influencers: influencers,
    clinic_mentions: [],
    sample_posts: sortedSample.slice(0, 50),
  };
  await fs.writeFile(OUT_PATH, JSON.stringify(output, null, 2), "utf-8");
  log(`완료 — posts ${allPosts.length} / 총 likes ${output.total_likes.toLocaleString()} → ${path.relative(ROOT, OUT_PATH)}`);
}

main().catch((e) => {
  console.error("[xhs_import] fatal:", e);
  process.exit(1);
});
