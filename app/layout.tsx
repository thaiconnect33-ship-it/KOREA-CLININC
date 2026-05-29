import type { Metadata } from "next";
import { Inter, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const noto = Noto_Sans_Thai({
  variable: "--font-thai",
  subsets: ["thai"],
  weight: ["400", "600", "800"],
});

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://koreabeautymap.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "KoreaBeautyMap — รีวิวจริงคลินิกเกาหลี / Real Korean clinic reviews",
    template: "%s · KoreaBeautyMap",
  },
  description: "528 Seoul clinics. Real reviews from Lemon8, Pantip, YouTube, Reddit, Xiaohongshu. No paid placements. Free consults.",
  keywords: ["Korean plastic surgery", "ศัลยกรรมเกาหลี", "韩国整形", "Seoul clinic", "K-beauty", "Gangnam clinic"],
  openGraph: {
    type: "website",
    title: "KoreaBeautyMap — Honest Korean K-beauty",
    description: "Compare 528 Seoul clinics across 5 real platforms. No paid placements.",
    siteName: "KoreaBeautyMap",
  },
  twitter: { card: "summary_large_image", title: "KoreaBeautyMap" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${inter.variable} ${noto.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white font-thai text-neutral-900">
        {children}
      </body>
    </html>
  );
}
