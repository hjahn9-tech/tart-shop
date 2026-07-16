import fs from "node:fs";
import path from "node:path";

// 게임별 오리지널 소개/공략(content/games/<slug>.md)을 읽어
// 최소한의 HTML로 변환한다. (마크다운 라이브러리 의존성 없이 유지)
export function getGameContentHtml(slug: string): string | null {
  const file = path.join(process.cwd(), "content", "games", `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  return renderMarkdown(fs.readFileSync(file, "utf8"));
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// 지원: # ## ### 제목, - 목록, 빈 줄로 나뉜 문단, **굵게**
function renderMarkdown(md: string): string {
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let listOpen = false;

  const closeList = () => {
    if (listOpen) {
      out.push("</ul>");
      listOpen = false;
    }
  };

  const inline = (s: string) =>
    esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      closeList();
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      closeList();
      const level = h[1].length;
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }
    const li = line.match(/^[-*]\s+(.*)$/);
    if (li) {
      if (!listOpen) {
        out.push("<ul>");
        listOpen = true;
      }
      out.push(`<li>${inline(li[1])}</li>`);
      continue;
    }
    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return out.join("\n");
}
