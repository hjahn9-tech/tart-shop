import { games } from "@/lib/games";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { GameGrid } from "./game-grid";

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description:
      "설치 없이 브라우저에서 바로 즐기는 원터치 미니게임 아케이드.",
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="relative mb-16 overflow-hidden rounded-[2rem] border border-crust/15 px-6 py-20 text-center sm:py-28">
        {/* 층진 앰비언트 — 웜 라디얼 글로우로 깊이 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(80% 60% at 50% 20%, rgba(179,22,79,0.16) 0%, rgba(224,164,92,0.06) 38%, transparent 70%)",
          }}
        />
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-caramel/80">
          browser arcade
        </p>
        <h1 className="font-serif-display text-6xl leading-[0.95] tracking-tight text-cocoa sm:text-8xl">
          Tart Shop
        </h1>
        <p className="mx-auto mt-6 max-w-md text-cocoa/60">
          달콤한 미니게임 한 판. 설치도 로그인도 없이, 브라우저에서 바로.
          아래 카드에 커서를 올려보세요.
        </p>
      </section>

      <GameGrid games={games} />
    </div>
  );
}
