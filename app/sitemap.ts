import type { MetadataRoute } from "next";
import { loadAllClinics } from "@/lib/db";
import { PROCEDURES } from "@/lib/procedures";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://koreabeautymap.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const clinics = await loadAllClinics();
  const langs = ["", "/en"];
  const now = new Date();

  const out: MetadataRoute.Sitemap = [];
  for (const l of langs) {
    out.push({ url: `${BASE}${l}/`, lastModified: now, priority: 1, changeFrequency: "daily" });
    out.push({ url: `${BASE}${l}/clinic`, lastModified: now, priority: 0.8, changeFrequency: "daily" });
    out.push({ url: `${BASE}${l}/topic`, lastModified: now, priority: 0.7, changeFrequency: "weekly" });
    out.push({ url: `${BASE}${l}/compare`, lastModified: now, priority: 0.7, changeFrequency: "weekly" });
    for (const p of PROCEDURES) {
      out.push({ url: `${BASE}${l}/p/${p.slug}`, lastModified: now, priority: 0.9, changeFrequency: "weekly" });
    }
    for (const c of clinics) {
      out.push({ url: `${BASE}${l}/clinic/${c.id}`, lastModified: now, priority: 0.6, changeFrequency: "weekly" });
    }
  }
  out.push({ url: `${BASE}/for-clinics`, lastModified: now, priority: 0.6, changeFrequency: "monthly" });
  return out;
}
