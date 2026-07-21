// 배포 도메인은 아직 미정 (CLAUDEtartshop.md §6 열린 결정).
// 도메인 확정 시 NEXT_PUBLIC_SITE_URL 환경변수만 설정하면 전체 SEO 메타에 반영됨.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://tart-shop.example";

export const SITE_NAME = "Tart Shop";

// AdSense 게시자 ID (예: "ca-pub-1234567890123456").
// 승인 후 NEXT_PUBLIC_ADSENSE_ID 환경변수만 설정하면 인증 메타·로더·ads.txt가 활성화됨.
export const ADSENSE_ID = process.env.NEXT_PUBLIC_ADSENSE_ID || "";
