// 간단한 i18n — Thai 디폴트, /en prefix 가 영어.
// 추가 언어 늘리려면 STRINGS 에 키만 추가.

export type Lang = "th" | "en";

export const STRINGS = {
  th: {
    site_name: "KoreaBeautyMap",
    tagline: "ค้นพบคลินิกความงามและศัลยกรรมเกาหลีที่คนไทยไว้วางใจ",
    nav_clinics: "คลินิก",
    nav_influencers: "อินฟลูเอนเซอร์",
    nav_topics: "หัวข้อยอดนิยม",
    nav_compare: "เปรียบเทียบ",
    nav_for_clinics: "สำหรับคลินิก",
    nav_contact: "ติดต่อ",
    hero_h1: "เกาหลี K-beauty ที่จริง",
    hero_sub: "528 คลินิก / 50 อินฟลูเอนเซอร์ / รีวิวจริงจาก Lemon8, Pantip และ YouTube",
    cta_book: "ขอคำปรึกษาฟรี",
    cta_view_clinic: "ดูคลินิก",
    cta_view_influencer: "ดูโปรไฟล์",
    section_topics: "หัวข้อที่คนไทยค้นหามากที่สุด",
    section_clinics: "คลินิกแนะนำในโซล",
    section_influencers: "อินฟลูเอนเซอร์ไทยที่รีวิวเกาหลี",
    invisible_overseas: "ยังไม่ค่อยมีรีวิวภาษาไทย",
    posts_count: "โพสต์",
    videos_count: "วิดีโอ",
    threads_count: "กระทู้",
    reviews_count: "รีวิว",
    likes_count: "ไลค์",
    views_count: "ครั้ง",
    contact_via: "ติดต่อผ่าน",
    lead_title: "อยากปรึกษาหมอเกาหลี?",
    lead_sub: "กรอกข้อมูล เราจับคู่คุณกับคลินิกและอินฟลูที่เหมาะกับคุณ ฟรี",
    name: "ชื่อ",
    contact_input: "Line / Instagram / Email",
    procedure: "หัตถการที่สนใจ",
    submit: "ส่งข้อมูล",
    footer_about: "เกี่ยวกับเรา",
    footer_priv: "ความเป็นส่วนตัว",
    overseas_label: "Visibility ในไทย",
  },
  en: {
    site_name: "KoreaBeautyMap",
    tagline: "Discover Korean beauty & plastic surgery clinics — trusted reviews from Thai patients",
    nav_clinics: "Clinics",
    nav_influencers: "Influencers",
    nav_topics: "Topics",
    nav_compare: "Compare",
    nav_for_clinics: "For Clinics",
    nav_contact: "Contact",
    hero_h1: "K-beauty, the honest map",
    hero_sub: "528 clinics / 50 influencers / real reviews from Lemon8, Pantip & YouTube",
    cta_book: "Get a free consult",
    cta_view_clinic: "View clinic",
    cta_view_influencer: "View profile",
    section_topics: "Most-searched topics by Thais",
    section_clinics: "Featured clinics in Seoul",
    section_influencers: "Thai influencers reviewing Korea",
    invisible_overseas: "Limited overseas review presence",
    posts_count: "posts",
    videos_count: "videos",
    threads_count: "threads",
    reviews_count: "reviews",
    likes_count: "likes",
    views_count: "views",
    contact_via: "Contact via",
    lead_title: "Want to consult a Korean doctor?",
    lead_sub: "Submit your info — we'll match you with the right clinic & influencer for free.",
    name: "Name",
    contact_input: "Line / Instagram / Email",
    procedure: "Procedure of interest",
    submit: "Submit",
    footer_about: "About",
    footer_priv: "Privacy",
    overseas_label: "Thai visibility",
  },
} as const;

export function t(lang: Lang, key: keyof typeof STRINGS["th"]): string {
  return STRINGS[lang][key];
}

export function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return n.toLocaleString();
}
