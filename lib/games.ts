// 게임 메타데이터 — public/games/<slug>/game.json 을 자동으로 읽어들인다.
// 게임을 추가하려면 코드를 건드릴 필요 없이 폴더 + game.json 만 넣으면 된다.
// (DB 없음, 파일 기반 유지)
import fs from "node:fs";
import path from "node:path";

export type Game = {
  slug: string;
  title: string;
  tagline: string;
  emoji: string;
  thumbnail?: string; // 게임 폴더 기준 상대 경로(선택). 없으면 emoji 사용
  aspect: { w: number; h: number };
};

const GAMES_DIR = path.join(process.cwd(), "public", "games");

function loadGames(): Game[] {
  if (!fs.existsSync(GAMES_DIR)) return [];

  const entries = fs
    .readdirSync(GAMES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory());

  const loaded: { game: Game; order: number }[] = [];

  for (const dir of entries) {
    const slug = dir.name;
    const metaPath = path.join(GAMES_DIR, slug, "game.json");
    const indexPath = path.join(GAMES_DIR, slug, "index.html");

    // game.json 과 index.html 둘 다 있어야 유효한 게임으로 인정
    if (!fs.existsSync(metaPath) || !fs.existsSync(indexPath)) continue;

    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
      loaded.push({
        order: typeof meta.order === "number" ? meta.order : 100,
        game: {
          slug,
          title: meta.title ?? slug,
          tagline: meta.tagline ?? "",
          emoji: meta.emoji ?? "🎮",
          thumbnail: meta.thumbnail || undefined,
          aspect: meta.aspect ?? { w: 360, h: 540 },
        },
      });
    } catch {
      // game.json 형식이 잘못된 폴더는 조용히 건너뛴다
      continue;
    }
  }

  loaded.sort((a, b) => a.order - b.order || a.game.title.localeCompare(b.game.title));
  return loaded.map((l) => l.game);
}

export const games: Game[] = loadGames();

export function getGame(slug: string): Game | undefined {
  return games.find((g) => g.slug === slug);
}
