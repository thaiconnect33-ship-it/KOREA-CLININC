// Lemon8 (ByteDance) 검색 스크래퍼.
// SSR HTML 이 결과를 다 포함 → fetch + cheerio. Playwright 불필요.
// VPN 옵션: LEMON8_SOCKS5_PORT env 설정 시 nordvpn_runner 의 socks5 포트 경유.
//
// Lemon8 검색 URL:
//   https://www.lemon8-app.com/discover/<query>?region=th
//   → 단일 클리닉 페이지 redirect: /experience/<slug>?region=th
//
// 추출:
//   - article_card 카운트 (= 그 클리닉 언급된 포스트 수)
//   - likes-count 합산 (= 총 좋아요)
//   - top 5 의 좋아요

import * as cheerio from "cheerio";
import { SocksProxyAgent } from "socks-proxy-agent";
import type { PlatformResult } from "../types";

const TIMEOUT_MS = 20_000;

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

export async function scrapeLemon8(query: string): Promise<PlatformResult> {
  try {
    const url = `https://www.lemon8-app.com/discover/${encodeURIComponent(query)}?region=th`;
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const port = process.env.LEMON8_SOCKS5_PORT;
    const fetchInit: Parameters<typeof fetch>[1] & { agent?: unknown } = {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        "accept-language": "th,en;q=0.9",
      },
      signal: ctrl.signal,
      redirect: "follow",
    };
    if (port) {
      fetchInit.agent = new SocksProxyAgent(`socks5h://127.0.0.1:${port}`);
    }
    const res = await fetch(url, fetchInit);
    clearTimeout(timeout);
    if (!res.ok) {
      return {
        ok: false,
        error: `lemon8 HTTP ${res.status}`,
        metric_label: "포스트",
        metric_value: 0,
      };
    }
    const html = await res.text();
    const $ = cheerio.load(html);

    // 후보 카드 selectors — Lemon8 UI 변경 대비 다중 fallback.
    // 같은 카드 가 nested wrapper 로 인해 multiple selector 에 매칭될 수 있으므로
    // article id/href 기반 dedup.
    const cards = $(".source-article-card, .article-recommend-card, [class*='article-card']");
    const seenKey = new Set<string>();

    const posts: { title: string; likes: number; author: string }[] = [];
    cards.each((_, el) => {
      const $el = $(el);
      const title = ($el.find(".article-title, [class*='title']").first().text() || "").trim().slice(0, 200);
      const author = ($el.find(".author-name, [class*='author-name']").first().text() || "").trim().slice(0, 100);
      const likesText = $el.find(".likes-count, .digg, [class*='likes']").first().text() || "";
      const likes = parseLikeCount(likesText);
      const href = $el.find("a[href*='/post/'], a[href*='/experience/']").first().attr("href") || "";
      // dedup key: href 우선, 없으면 (title|author|likes) 조합.
      const key = href || `${title}|${author}|${likes}`;
      if (seenKey.has(key)) return;
      seenKey.add(key);
      if (title || likes) {
        posts.push({ title, author, likes });
      }
    });

    const total = posts.length;
    const totalLikes = posts.reduce((s, p) => s + p.likes, 0);
    const top5Likes = posts
      .slice()
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 5)
      .reduce((s, p) => s + p.likes, 0);

    return {
      ok: true,
      metric_label: "포스트",
      metric_value: total,
      extra: {
        total_likes: totalLikes,
        top_5_likes: top5Likes,
        sample: posts.slice(0, 10),
      },
    };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      metric_label: "포스트",
      metric_value: 0,
    };
  }
}
