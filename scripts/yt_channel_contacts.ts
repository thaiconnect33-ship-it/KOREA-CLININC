/* YouTube 채널의 About / description 에서 외부 contact (IG/Line/email/website) 추출.
 *
 * Input: data/youtube_market.json 의 top_channels (이름)
 * Output: data/yt_channel_contacts.json
 * 실행: npx tsx scripts/yt_channel_contacts.ts
 */

import { chromium, type Browser } from "playwright";
import { promises as fs } from "node:fs";
import path from "node:path";

type Input = { channel: string; videos: number; total_views: number; topics: string[] };
type Contact = {
  channel: string;
  videos: number;
  total_views: number;
  topics: string[];
  channel_url: string;
  about_text: string;
  subscribers?: string;
  external_links: { kind: string; raw: string; handle?: string }[];
};

function log(msg: string) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function extractLinks(text: string): { kind: string; raw: string; handle?: string }[] {
  const out: { kind: string; raw: string; handle?: string }[] = [];
  for (const m of text.matchAll(/[\w.+-]+@[\w-]+\.[\w.-]+/g)) {
    out.push({ kind: "email", raw: m[0] });
  }
  for (const m of text.matchAll(/(?:ig|insta(?:gram)?|IG)[\s:_-]*@?([a-zA-Z0-9._]{2,30})/gi)) {
    out.push({ kind: "instagram", raw: m[0], handle: m[1] });
  }
  for (const m of text.matchAll(/(?:line(?:\s*id)?|ไลน์)[\s:_-]*@?([a-zA-Z0-9._-]{2,30})/gi)) {
    out.push({ kind: "line", raw: m[0], handle: m[1] });
  }
  for (const m of text.matchAll(/(?:tiktok|tt|ติ๊กต่อก)[\s:_-]*@?([a-zA-Z0-9._]{2,30})/gi)) {
    out.push({ kind: "tiktok", raw: m[0], handle: m[1] });
  }
  for (const m of text.matchAll(/(?:facebook|fb)[\s:_-]*@?([a-zA-Z0-9._-]{2,40})/gi)) {
    out.push({ kind: "facebook", raw: m[0], handle: m[1] });
  }
  for (const m of text.matchAll(/https?:\/\/[^\s)\]]+/g)) {
    const url = m[0];
    let kind = "url";
    if (/instagram\.com/i.test(url)) kind = "instagram_url";
    else if (/line\.me|liff\.line/i.test(url)) kind = "line_url";
    else if (/tiktok\.com/i.test(url)) kind = "tiktok_url";
    else if (/facebook\.com/i.test(url)) kind = "facebook_url";
    else if (/twitter\.com|x\.com/i.test(url)) kind = "twitter_url";
    else if (/youtube\.com|youtu\.be/i.test(url)) kind = "youtube_url";
    out.push({ kind, raw: url });
  }
  return out;
}

async function scrapeChannel(
  ctx: import("playwright").BrowserContext,
  channelName: string,
): Promise<{ channel_url: string; about_text: string; subscribers?: string }> {
  const page = await ctx.newPage();
  try {
    // 1) 검색해서 채널 찾기 (검색 → channel filter).
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(channelName)}&sp=EgIQAg%253D%253D`; // sp=channel filter
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 25_000 });
    await page.waitForSelector("ytd-channel-renderer", { timeout: 10_000 }).catch(() => {});
    const channelHref = await page.evaluate(() => {
      const el = document.querySelector("ytd-channel-renderer a[href*='/channel/'], ytd-channel-renderer a[href*='/@']") as HTMLAnchorElement | null;
      return el?.href || "";
    });
    if (!channelHref) {
      return { channel_url: "", about_text: "" };
    }
    // 2) channel about 페이지로 직행.
    const aboutUrl = channelHref.endsWith("/") ? channelHref + "about" : channelHref + "/about";
    await page.goto(aboutUrl, { waitUntil: "domcontentloaded", timeout: 25_000 });
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});

    // about description + 외부 링크는 yt-formatted-string description 안.
    const data = await page.evaluate(() => {
      const desc = (document.querySelector("yt-formatted-string#description, #description-container, [id*='description']")?.textContent ?? "").trim().slice(0, 3000);
      const links = Array.from(document.querySelectorAll("a[href*='https']"))
        .map((a) => (a as HTMLAnchorElement).href)
        .filter((h) => !/youtube\.com\/(watch|results|c\/|@|channel)/i.test(h))
        .slice(0, 30);
      const subEl = document.querySelector("#subscriber-count, yt-formatted-string[id*='subscriber'], [class*='subscriber']");
      const subscribers = (subEl?.textContent || "").trim();
      return { desc, links, subscribers };
    });

    return {
      channel_url: channelHref,
      about_text: data.desc + "\n" + data.links.join("\n"),
      subscribers: data.subscribers,
    };
  } finally {
    await page.close().catch(() => {});
  }
}

async function main() {
  const raw = await fs.readFile(path.join(process.cwd(), "data", "youtube_market.json"), "utf-8");
  const market = JSON.parse(raw) as { top_channels: Input[] };
  const list = market.top_channels ?? [];
  log(`대상: ${list.length} 채널`);

  const browser: Browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent: "Mozilla/5.0 Chrome/130 Safari/537.36",
    locale: "th-TH",
  });
  await ctx.addCookies([{ name: "CONSENT", value: "YES+", domain: ".youtube.com", path: "/" }]);

  const out: Contact[] = [];
  for (const [i, c] of list.entries()) {
    log(`(${i + 1}/${list.length}) @${c.channel}`);
    try {
      const { channel_url, about_text, subscribers } = await scrapeChannel(ctx, c.channel);
      const links = extractLinks(about_text);
      out.push({
        channel: c.channel,
        videos: c.videos,
        total_views: c.total_views,
        topics: c.topics,
        channel_url,
        about_text: about_text.slice(0, 600),
        subscribers,
        external_links: links,
      });
      log(`  ${links.length} 외부링크${subscribers ? ` (${subscribers})` : ""}`);
    } catch (e) {
      log(`  ✗ 실패: ${e instanceof Error ? e.message : String(e)}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  await browser.close();

  const ranked = [...out].sort((a, b) => b.external_links.length - a.external_links.length || b.total_views - a.total_views);
  const outPath = path.join(process.cwd(), "data", "yt_channel_contacts.json");
  await fs.writeFile(outPath, JSON.stringify({
    generated_at: new Date().toISOString(),
    total_channels: out.length,
    with_contact: out.filter((x) => x.external_links.length > 0).length,
    channels: ranked,
  }, null, 2), "utf-8");
  log(`완료 — ${out.length} 채널 중 ${out.filter((x) => x.external_links.length > 0).length} contact 추출 → ${outPath}`);
}

main().catch((e) => {
  console.error("[yt_channel_contacts] fatal:", e);
  process.exit(1);
});
