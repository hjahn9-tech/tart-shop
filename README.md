# Tart Shop

AI로 만든 HTML5 미니게임 16종을 모은 웹 아케이드. 게임마다 리워드·인터스티셜 광고 루프를 연결했습니다.

**Live:** https://tart-shop.vercel.app

## 무엇을 만들었나

- **포털 셸**: Next.js(App Router) + TypeScript + Tailwind. 게임 목록, 상세 페이지, SEO 메타, sitemap/robots
- **게임 격리**: 각 게임은 `public/games/<slug>/`의 독립 HTML5 번들이며 iframe으로 로드
- **광고 루프**: Google H5 Games Ads(Ad Placement API) 기준. 게임 오버 → 리워드 광고 → 이어하기, 판 사이 인터스티셜, 광고 중 게임 pause/resume 동기화
- **게임 추가 파이프라인**: `npm run new-game`으로 템플릿(게임 + 광고 연동 + 소개 글)을 생성해 표준화
- **AdSense 준비**: `ads.txt`, 인증 메타, 로더를 환경변수(`NEXT_PUBLIC_ADSENSE_ID`)로 켜고 끔

## 수록 게임

Tart Dash · Tart Flap · Tart Stack · Choco Blocks · 부대찌개 타이쿤 · Star Voyager · Castaway Isles · 태고의 숲 · Dead Coast · ROOK STREET · 설한 · Backrooms: Noclip · 가시 마을 · 검은 수녀단 · 설문대할망의 섬 · 어둑시니

## 개발 방식

Claude Code와 함께 단계별(Phase 0~5)로 개발했습니다. 프로젝트 헌법과 로드맵은 [`CLAUDEtartshop.md`](CLAUDEtartshop.md)에 있으며, "광고 루프를 먼저 증명하고 그 위에 콘텐츠를 얹는다"는 원칙으로 진행했습니다.

## 실행

```bash
npm install
npm run dev        # http://localhost:3000
npm run new-game   # 새 게임 템플릿 생성
```
