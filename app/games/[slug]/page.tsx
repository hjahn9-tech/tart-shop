import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getGame, games } from "@/lib/games";
import { getGameContentHtml } from "@/lib/content";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { GamePlayer } from "@/app/game-player";

export function generateStaticParams() {
  return games.map((g) => ({ slug: g.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const game = getGame(params.slug);
  if (!game) return {};
  const path = `/games/${game.slug}`;
  return {
    title: game.title,
    description: game.tagline,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      title: `${game.title} — Tart Shop`,
      description: game.tagline,
      url: path,
    },
  };
}

export default function GamePage({ params }: { params: { slug: string } }) {
  const game = getGame(params.slug);
  if (!game) notFound();

  const contentHtml = getGameContentHtml(game.slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.title,
    description: game.tagline,
    url: `${SITE_URL}/games/${game.slug}`,
    genre: "Arcade",
    applicationCategory: "Game",
    operatingSystem: "Web browser",
    playMode: "SinglePlayer",
    publisher: { "@type": "Organization", name: SITE_NAME },
  };

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm font-medium text-cocoa/50 transition-colors hover:text-cocoa"
      >
        <span aria-hidden>←</span> 게임 목록
      </Link>

      <h1 className="font-serif-display mt-4 text-4xl tracking-tight text-cocoa sm:text-5xl">
        {game.title}
      </h1>
      <p className="mt-2 text-cocoa/60">{game.tagline}</p>

      {/* 게임은 iframe으로 격리 로드 — 광고 코드는 게임 HTML 안에 존재.
          재생/전체화면 버튼으로 전체화면 플레이 (game-player.tsx) */}
      <div className="mt-8">
        <GamePlayer
          src={`/games/${game.slug}/index.html`}
          title={game.title}
          width={game.aspect.w}
          height={game.aspect.h}
        />
      </div>

      {contentHtml && (
        <section
          className="prose-tart mx-auto mt-14 max-w-2xl"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      )}
    </article>
  );
}
