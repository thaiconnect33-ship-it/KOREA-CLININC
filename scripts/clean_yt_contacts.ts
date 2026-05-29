/* YouTube channel about에서 뽑은 raw external_links 를 정리.
 *
 * 문제: yt_channel_contacts.ts 가 사용한 정규식이 "Instagram\nNIN" 같은 줄바꿈을 잘못 매칭해서
 *       handle="nin" 이 수십 번 중복 / youtube redirect URL 만 잔뜩 들어가 있음.
 *
 * 해결: redirect URL 의 &q= 파라미터를 풀어서 실제 destination URL 만 분류 / dedup.
 *
 * 실행: npx tsx scripts/clean_yt_contacts.ts
 */

import { promises as fs } from "node:fs";
import path from "node:path";

type RawLink = { kind: string; raw: string; handle?: string };
type CleanLink = { kind: string; url: string; handle?: string };

function unwrapYoutubeRedirect(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith("youtube.com") && u.pathname.startsWith("/redirect")) {
      const q = u.searchParams.get("q");
      if (q) return decodeURIComponent(q);
    }
  } catch { /* skip */ }
  return url;
}

function classify(url: string): { kind: string; handle?: string } | null {
  if (/accounts\.google\.com|youtube\.com\/(signin|results|watch|c\/|@|channel|redirect|post)/i.test(url)) {
    return null; // YouTube 내부 / 로그인 — 노이즈.
  }
  if (/instagram\.com\/([\w._-]+)/i.test(url)) {
    const m = url.match(/instagram\.com\/([\w._-]+)/i);
    return { kind: "instagram", handle: m?.[1]?.replace(/\/$/, "") };
  }
  if (/(?:line\.me|lin\.ee|liff\.line)/i.test(url)) {
    const m = url.match(/(?:line\.me\/(?:R\/)?ti\/p\/%40|lin\.ee\/|line\.me\/R\/ti\/p\/@)([\w]+)/i);
    return { kind: "line", handle: m?.[1] };
  }
  if (/tiktok\.com\/@([\w.-]+)/i.test(url)) {
    const m = url.match(/tiktok\.com\/@([\w.-]+)/i);
    return { kind: "tiktok", handle: m?.[1] };
  }
  if (/facebook\.com\/([\w.-]+)/i.test(url)) {
    const m = url.match(/facebook\.com\/([\w.-]+)/i);
    return { kind: "facebook", handle: m?.[1]?.replace(/\/$/, "") };
  }
  if (/twitter\.com\/([\w.-]+)|x\.com\/([\w.-]+)/i.test(url)) {
    const m = url.match(/(?:twitter\.com|x\.com)\/([\w.-]+)/i);
    return { kind: "twitter", handle: m?.[1]?.replace(/\/$/, "") };
  }
  if (/^mailto:/i.test(url) || /[\w.+-]+@[\w-]+\.[\w.-]+/.test(url)) {
    return { kind: "email" };
  }
  // website
  return { kind: "website" };
}

function cleanLinks(raws: RawLink[], aboutText: string): CleanLink[] {
  const seen = new Set<string>();
  const out: CleanLink[] = [];

  // 1) raw URL 들을 unwrap → classify.
  for (const r of raws) {
    if (!r.raw.startsWith("http")) continue;
    const unwrapped = unwrapYoutubeRedirect(r.raw);
    const cls = classify(unwrapped);
    if (!cls) continue;
    const key = `${cls.kind}|${cls.handle || unwrapped}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ kind: cls.kind, url: unwrapped, handle: cls.handle });
  }

  // 2) about_text 에서 raw email 도 (redirect 풀린 URL 에서 떨어지지 않은 평문).
  const emailRe = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
  for (const m of aboutText.matchAll(emailRe)) {
    const email = m[0];
    if (/youtube\.com|gstatic|googleapis|google-analytics/i.test(email)) continue;
    const key = `email|${email}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ kind: "email", url: `mailto:${email}`, handle: email });
  }

  return out;
}

async function main() {
  const inputPath = path.join(process.cwd(), "data", "yt_channel_contacts.json");
  const raw = JSON.parse(await fs.readFile(inputPath, "utf-8"));

  const cleaned = raw.channels.map((c: {
    channel: string;
    videos: number;
    total_views: number;
    topics: string[];
    channel_url: string;
    about_text: string;
    subscribers?: string;
    external_links: RawLink[];
  }) => {
    const links = cleanLinks(c.external_links, c.about_text);
    return {
      channel: c.channel,
      videos: c.videos,
      total_views: c.total_views,
      topics: c.topics,
      channel_url: c.channel_url,
      subscribers: c.subscribers || "",
      contacts: links,
      contact_count: links.length,
      kind_breakdown: links.reduce<Record<string, number>>((acc, l) => {
        acc[l.kind] = (acc[l.kind] || 0) + 1;
        return acc;
      }, {}),
    };
  });

  const ranked = [...cleaned].sort((a, b) => {
    // 정렬 우선순위: 1) IG/Line/TikTok 같은 핵심 contact 있는지, 2) videos, 3) views.
    const aHasCore = a.contacts.some((l: CleanLink) => /^(instagram|line|tiktok|email)$/.test(l.kind)) ? 1 : 0;
    const bHasCore = b.contacts.some((l: CleanLink) => /^(instagram|line|tiktok|email)$/.test(l.kind)) ? 1 : 0;
    if (bHasCore !== aHasCore) return bHasCore - aHasCore;
    if (b.videos !== a.videos) return b.videos - a.videos;
    return b.total_views - a.total_views;
  });

  const withCore = ranked.filter((c: { contacts: CleanLink[] }) =>
    c.contacts.some((l: CleanLink) => /^(instagram|line|tiktok|email)$/.test(l.kind))
  ).length;

  const outPath = path.join(process.cwd(), "data", "yt_channel_contacts_clean.json");
  await fs.writeFile(outPath, JSON.stringify({
    generated_at: new Date().toISOString(),
    source: "yt_channel_contacts.json (cleaned)",
    total_channels: ranked.length,
    with_any_contact: ranked.filter((c: { contact_count: number }) => c.contact_count > 0).length,
    with_core_contact: withCore,
    channels: ranked,
  }, null, 2), "utf-8");

  console.log(`완료 — ${ranked.length} 채널 / 핵심 contact (IG/Line/TT/Email) 있음: ${withCore}`);
  console.log(`→ ${outPath}`);

  // TOP 15 출력.
  console.log("\n=== TOP 15 채널 (핵심 contact 보유) ===");
  for (const c of ranked.slice(0, 15)) {
    const breakdown = Object.entries(c.kind_breakdown).map(([k, n]) => `${k}=${n}`).join(",");
    console.log(`  @${c.channel} [${c.videos}v / ${c.total_views.toLocaleString()}views] ${breakdown}`);
    const core = c.contacts.filter((l: CleanLink) => /^(instagram|line|tiktok|email)$/.test(l.kind)).slice(0, 4);
    for (const l of core) {
      console.log(`     ${l.kind}: ${l.handle || l.url}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
