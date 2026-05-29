/* Lemon8 상위 인플루언서의 프로필 → bio + 외부 SNS 링크 (IG/Line/등) 자동 추출.
 *
 * Input: data/lemon8_market.json 의 top_influencers
 * Output: data/influencer_contacts.json
 * 실행: npx tsx scripts/influencer_contacts.ts
 */

import { chromium, type Browser } from "playwright";
import { promises as fs } from "node:fs";
import path from "node:path";

type Input = {
  author: string;
  posts: number;
  total_likes: number;
  topics: string[];
};

type Contact = {
  author: string;
  posts: number;
  total_likes: number;
  topics: string[];
  profile_url: string;
  bio: string;
  followers?: number;
  external_links: { kind: string; raw: string; handle?: string }[];
};

function log(msg: string) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

// bio 텍스트에서 IG/Line/Twitter/YouTube/email/TikTok 등 추출.
function extractLinks(bio: string): { kind: string; raw: string; handle?: string }[] {
  const out: { kind: string; raw: string; handle?: string }[] = [];
  const text = bio.replace(/\s+/g, " ");
  // Email
  for (const m of text.matchAll(/[\w.+-]+@[\w-]+\.[\w.-]+/g)) {
    out.push({ kind: "email", raw: m[0] });
  }
  // Instagram handle — @xxx (단, line/twitter 와 구분 어려움)
  for (const m of text.matchAll(/(?:ig|insta(?:gram)?|IG)[\s:_-]*@?([a-zA-Z0-9._]{2,30})/gi)) {
    out.push({ kind: "instagram", raw: m[0], handle: m[1] });
  }
  // Line ID
  for (const m of text.matchAll(/(?:line(?:\s*id)?|ไลน์)[\s:_-]*@?([a-zA-Z0-9._-]{2,30})/gi)) {
    out.push({ kind: "line", raw: m[0], handle: m[1] });
  }
  // TikTok
  for (const m of text.matchAll(/(?:tiktok|ติ๊กต่อก)[\s:_-]*@?([a-zA-Z0-9._]{2,30})/gi)) {
    out.push({ kind: "tiktok", raw: m[0], handle: m[1] });
  }
  // Twitter / X
  for (const m of text.matchAll(/(?:twitter|x\.com)[\s:_-]*@?([a-zA-Z0-9._]{2,15})/gi)) {
    out.push({ kind: "twitter", raw: m[0], handle: m[1] });
  }
  // YouTube
  for (const m of text.matchAll(/(?:youtube|YT)[\s:_-]*@?([a-zA-Z0-9._-]{2,30})/gi)) {
    out.push({ kind: "youtube", raw: m[0], handle: m[1] });
  }
  // 일반 https URL
  for (const m of text.matchAll(/https?:\/\/[^\s]+/g)) {
    const url = m[0];
    let kind = "url";
    if (/instagram\.com/i.test(url)) kind = "instagram_url";
    else if (/line\.me|liff\.line/i.test(url)) kind = "line_url";
    else if (/tiktok\.com/i.test(url)) kind = "tiktok_url";
    else if (/twitter\.com|x\.com/i.test(url)) kind = "twitter_url";
    else if (/youtube\.com|youtu\.be/i.test(url)) kind = "youtube_url";
    out.push({ kind, raw: url });
  }
  return out;
}

async function scrapeOne(
  ctx: import("playwright").BrowserContext,
  author: string,
): Promise<{ profile_url: string; bio: string; followers?: number }> {
  const page = await ctx.newPage();
  try {
    // Lemon8 web 의 사용자 프로필 URL 패턴 — /@<username> 또는 검색으로 매칭.
    // username 모를 수 있어서 검색 페이지 → 프로필 클릭 fallback.
    const directUrl = `https://www.lemon8-app.com/@${encodeURIComponent(author)}?region=th`;
    let usedUrl = directUrl;
    await page.goto(directUrl, { waitUntil: "domcontentloaded", timeout: 25_000 });
    await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});

    // 만약 404 같은 페이지 → 검색 fallback.
    const has404 = await page.evaluate(() => /404|not found|page-not-found/i.test(document.body.innerText || ""));
    if (has404) {
      usedUrl = `https://www.lemon8-app.com/discover/${encodeURIComponent(author)}?region=th`;
      await page.goto(usedUrl, { waitUntil: "domcontentloaded", timeout: 25_000 });
      await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
    }

    const data = await page.evaluate(() => {
      const bio = (
        document.querySelector("[class*='bio'], [class*='intro'], [class*='profile-desc']")?.textContent ?? ""
      ).trim().slice(0, 2000);
      const followerText = (
        document.querySelector("[class*='follower'], [class*='subscribers']")?.textContent ?? ""
      );
      const f = followerText.match(/([\d.,]+)([KkMm]?)/);
      let followers: number | undefined;
      if (f) {
        const num = parseFloat(f[1].replace(/,/g, ""));
        const u = f[2].toLowerCase();
        followers = Math.round(num * (u === "k" ? 1_000 : u === "m" ? 1_000_000 : 1));
      }
      return { bio, followers };
    });

    return { profile_url: usedUrl, bio: data.bio, followers: data.followers };
  } finally {
    await page.close().catch(() => {});
  }
}

async function main() {
  const raw = await fs.readFile(path.join(process.cwd(), "data", "lemon8_market.json"), "utf-8");
  const market = JSON.parse(raw) as { top_influencers: Input[] };
  const list = market.top_influencers ?? [];
  log(`대상: ${list.length} 인플루언서`);

  const browser: Browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent: "Mozilla/5.0 Chrome/130 Safari/537.36",
    locale: "th-TH",
    extraHTTPHeaders: { "accept-language": "th,en;q=0.9" },
  });

  const out: Contact[] = [];
  for (const [i, inf] of list.entries()) {
    log(`(${i + 1}/${list.length}) @${inf.author}`);
    try {
      const { profile_url, bio, followers } = await scrapeOne(ctx, inf.author);
      const links = extractLinks(bio);
      out.push({
        author: inf.author,
        posts: inf.posts,
        total_likes: inf.total_likes,
        topics: inf.topics,
        profile_url,
        bio,
        followers,
        external_links: links,
      });
      log(`  bio ${bio.length}자, ${links.length} 외부링크`);
    } catch (e) {
      log(`  ✗ 실패: ${e instanceof Error ? e.message : String(e)}`);
      out.push({
        author: inf.author,
        posts: inf.posts,
        total_likes: inf.total_likes,
        topics: inf.topics,
        profile_url: "",
        bio: "",
        external_links: [],
      });
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  await browser.close();

  // 외부 contact 발견된 인플루언서 우선 정렬.
  const ranked = [...out].sort((a, b) => {
    const ca = a.external_links.length, cb = b.external_links.length;
    if (cb !== ca) return cb - ca;
    return b.total_likes - a.total_likes;
  });

  const outPath = path.join(process.cwd(), "data", "influencer_contacts.json");
  await fs.writeFile(outPath, JSON.stringify({
    generated_at: new Date().toISOString(),
    total_influencers: out.length,
    with_contact: out.filter((x) => x.external_links.length > 0).length,
    influencers: ranked,
  }, null, 2), "utf-8");
  log(`완료 — ${out.length} 인플루언서 중 ${out.filter((x) => x.external_links.length > 0).length}명 외부 contact 추출 → ${outPath}`);
}

main().catch((e) => {
  console.error("[influencer_contacts] fatal:", e);
  process.exit(1);
});
