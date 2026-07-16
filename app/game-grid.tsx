"use client";

import Link from "next/link";
import type { Game } from "@/lib/games";

// 카드 위에서 커서를 따라오는 스포트라이트 글로우 (Measured 리빌을 카드에 적용)
function handleMove(e: React.MouseEvent<HTMLAnchorElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${e.clientX - r.left}px`);
  el.style.setProperty("--my", `${e.clientY - r.top}px`);
}

export function GameGrid({ games }: { games: Game[] }) {
  return (
    <>
      <div className="mb-6 flex items-baseline justify-between">
        <h2 className="font-serif-display text-2xl text-cocoa">게임</h2>
        <span className="text-sm text-cocoa/40">{games.length}개</span>
      </div>

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((g) => (
          <Link
            key={g.slug}
            href={`/games/${g.slug}`}
            onMouseMove={handleMove}
            className="spotlight-card liquid-glass group rounded-3xl p-4 transition duration-300 hover:-translate-y-1 hover:shadow-tart-lg active:translate-y-0 active:scale-[0.99]"
          >
            <span className="spot" aria-hidden />
            <div className="relative z-[1]">
              <div
                className="relative mb-4 h-40 overflow-hidden rounded-2xl"
                style={{
                  background:
                    "radial-gradient(90% 90% at 50% 15%, #2c1c13 0%, #1a120c 100%)",
                }}
              >
                {g.thumbnail ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/games/${g.slug}/${g.thumbnail}`}
                      alt={`${g.title} 미리보기`}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                    />
                    {/* 톤 통일 오버레이 — 밝은 썸네일도 다크 테마에 녹아들게 */}
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/15"
                    />
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-6xl transition-transform duration-500 group-hover:scale-[1.04]">
                    <span className="drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
                      {g.emoji}
                    </span>
                  </div>
                )}
              </div>
              <h3 className="px-1 text-lg font-semibold tracking-tight text-cocoa transition-colors group-hover:text-berry">
                {g.title}
              </h3>
              <p className="mt-1 px-1 text-sm text-cocoa/55">{g.tagline}</p>
            </div>
          </Link>
        ))}
      </section>
    </>
  );
}
