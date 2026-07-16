import type { Metadata } from "next";
import { Noto_Sans_KR, Instrument_Serif } from "next/font/google";
import Link from "next/link";
import { NavLink } from "./nav-link";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const sans = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Tart Shop — 달콤한 미니게임 아케이드",
    template: "%s — Tart Shop",
  },
  description:
    "Tart Shop은 브라우저에서 바로 즐기는 원터치 미니게임 아케이드입니다. 설치 없이 달콤한 게임 한 판.",
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "ko_KR",
    title: "Tart Shop — 달콤한 미니게임 아케이드",
    description:
      "설치 없이 브라우저에서 바로 즐기는 원터치 미니게임 아케이드.",
    url: "/",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`${sans.variable} ${serif.variable}`}>
      <body className="min-h-dvh bg-cream font-sans text-cocoa antialiased">
        {/* 은은한 웜 앰비언트 — 배경 깊이 */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10"
          style={{
            background:
              "radial-gradient(120% 80% at 50% -10%, #2a1a12 0%, #160f0b 55%, #120b08 100%)",
          }}
        />
        <header className="fixed inset-x-0 top-4 z-40 px-4">
          <div className="liquid-glass mx-auto flex max-w-3xl items-center justify-between rounded-full py-2.5 pl-5 pr-3">
            <Link
              href="/"
              className="flex items-center gap-2 tracking-tight"
            >
              <span className="text-xl">🥧</span>
              <span className="font-serif-display text-xl leading-none">
                Tart Shop
              </span>
            </Link>
            <nav className="flex items-center gap-5 rounded-full px-2 text-sm font-medium">
              <NavLink href="/">게임</NavLink>
              <NavLink href="/about">소개</NavLink>
              <NavLink href="/privacy">개인정보</NavLink>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-5 pb-16 pt-28">{children}</main>
        <footer className="border-t border-crust/15">
          <div className="mx-auto max-w-5xl px-5 py-10 text-sm text-cocoa/45">
            <div className="flex items-center gap-2">
              <span>🥧</span>
              <span className="font-serif-display text-lg text-cocoa/80">
                Tart Shop
              </span>
            </div>
            <p className="mt-2">
              브라우저에서 즐기는 원터치 미니게임 아케이드.
            </p>
            <p className="mt-4 text-xs text-cocoa/30">
              © {new Date().getFullYear()} Tart Shop
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
