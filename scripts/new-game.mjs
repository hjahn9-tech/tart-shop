#!/usr/bin/env node
/*
 * 새 게임 폴더를 자동으로 만들어주는 스크립트.
 * 사용법:
 *   npm run new-game -- <슬러그> "게임 제목" "한 줄 소개" [이모지]
 * 예:
 *   npm run new-game -- tart-run "Tart Run" "굴러오는 타르트를 피하세요" 🍩
 *
 * 하는 일:
 *   1. public/games/<슬러그>/ 폴더 생성 (game.json, index.html, afg-integration.js)
 *   2. content/games/<슬러그>.md 소개글 초안 생성
 * 이후 폴더 안 index.html 을 여러분 게임으로 바꾸면 목록에 자동으로 나타납니다.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const TEMPLATE = path.join(__dirname, "templates", "game");

const [slugRaw, title, tagline, emoji = "🎮"] = process.argv.slice(2);

if (!slugRaw || !title) {
  console.error(
    '사용법: npm run new-game -- <슬러그> "게임 제목" "한 줄 소개" [이모지]\n' +
      '예:     npm run new-game -- tart-run "Tart Run" "굴러오는 타르트를 피하세요" 🍩'
  );
  process.exit(1);
}

// 슬러그 정리: 소문자, 영숫자와 하이픈만
const slug = slugRaw
  .toLowerCase()
  .replace(/[^a-z0-9-]/g, "-")
  .replace(/-+/g, "-")
  .replace(/^-|-$/g, "");

if (!slug) {
  console.error("슬러그는 영문/숫자로 지어주세요. 예: tart-run");
  process.exit(1);
}

const gameDir = path.join(ROOT, "public", "games", slug);
if (fs.existsSync(gameDir)) {
  console.error(`이미 존재하는 게임입니다: public/games/${slug}`);
  process.exit(1);
}

function fill(str) {
  return str
    .replaceAll("__TITLE__", title)
    .replaceAll("__TAGLINE__", tagline || "")
    .replaceAll("__EMOJI__", emoji);
}

// 1) 게임 폴더 생성
fs.mkdirSync(gameDir, { recursive: true });
fs.writeFileSync(
  path.join(gameDir, "game.json"),
  fill(fs.readFileSync(path.join(TEMPLATE, "game.json"), "utf8"))
);
fs.writeFileSync(
  path.join(gameDir, "index.html"),
  fill(fs.readFileSync(path.join(TEMPLATE, "index.html"), "utf8"))
);
fs.copyFileSync(
  path.join(TEMPLATE, "afg-integration.js"),
  path.join(gameDir, "afg-integration.js")
);

// 2) 소개글 초안 생성
const contentDir = path.join(ROOT, "content", "games");
fs.mkdirSync(contentDir, { recursive: true });
const contentPath = path.join(contentDir, `${slug}.md`);
if (!fs.existsSync(contentPath)) {
  fs.writeFileSync(
    contentPath,
    fill(fs.readFileSync(path.join(TEMPLATE, "content.md"), "utf8"))
  );
}

console.log(`✓ 새 게임 생성됨: ${slug}\n`);
console.log("다음 단계:");
console.log(`  1) 여러분 게임 파일을 이 폴더에 넣기 → public/games/${slug}/`);
console.log(`     (게임의 시작 파일 이름은 반드시 index.html)`);
console.log(`  2) 소개글 채우기 → content/games/${slug}.md`);
console.log(`  3) npm run dev 로 확인 → http://localhost:3000/games/${slug}`);
console.log(`\n메타 수정은 public/games/${slug}/game.json 에서 하면 됩니다.`);
