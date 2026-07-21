import { ADSENSE_ID } from "@/lib/site";

// AdSense는 도메인 루트의 /ads.txt 로 게시자 소유를 검증한다.
// 게시자 ID가 설정되면 표준 한 줄을 emit, 아니면 빈 파일(비활성).
export function GET() {
  const pub = ADSENSE_ID.replace(/^ca-/, ""); // ca-pub-XXXX → pub-XXXX
  const body = pub
    ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`
    : "";
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
