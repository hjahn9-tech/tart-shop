# CLAUDE.md — AI 미니게임 플랫폼 (working title: `ARCADE`)

> 이 파일은 Claude Code가 매 세션 자동으로 읽는 **프로젝트 헌법 + 로드맵**입니다.
> 새 세션을 시작하면 항상 이 문서의 "현재 Phase"와 "작업 원칙"을 먼저 확인하세요.

---

## 0. 원칙 (우선순위 순서)

1. **기술 구현** — 플랫폼 셸 + 광고 루프를 먼저 작동시킨다.
2. **사업성** — AdSense 승인 / 실물 광고 노출 / 수익 데이터 수집.
3. **디자인** — 나중에 별도 스킬로 개선한다. **지금은 손대지 않는다.**

> 핵심 철학: "돈이 흐르는 파이프(광고 루프)를 먼저 증명하고, 그 위에 콘텐츠(게임)를 얹는다."
> 게임을 100개 찍어내는 게 아니라, **하나의 게임에서 광고가 실제로 도는 것**을 먼저 만든다.

---

## 1. 프로젝트 개요

- **What**: AI로 만든 HTML5 미니게임을 모아 얹는 웹 플랫폼. Google **H5 Games Ads**로 수익화.
- **Why**: AI 이미지/영상 파이프라인으로 콘텐츠(게임 에셋·룩)를 빠르게 생산할 수 있으므로,
  게임 자체보다 "얹고 → 광고 붙이고 → 확장하는" 플랫폼 레이어가 병목. 그 레이어를 만든다.
- **MVP 성공 기준 (Definition of Done)**:
  레퍼런스 게임 1개에서 **인터스티셜 광고**와 **리워드 광고**가 올바른 트리거에서 호출되고,
  게임의 pause/resume이 광고와 동기화되며, 광고 이벤트가 로깅된다.

---

## 2. 핵심 아키텍처 결정 (지금은 이걸로 고정 / 나중에 변경 가능)

| 항목 | 결정 | 이유 |
|---|---|---|
| 프론트엔드 | Next.js (App Router) + TypeScript + Tailwind | SEO 유리(AdSense 심사에 중요), Claude Code 지원 좋음, 배포 간단 |
| 배포 | Vercel | Next.js와 무마찰, 무료 티어로 시작 |
| 게임 | 각 게임 = self-contained HTML5, `/public/games/<slug>/`에 격리 | 게임끼리 충돌 없음, 독립 배포/교체 쉬움 |
| 임베드 | 포털 페이지에서 `<iframe>`으로 로드 | 격리 + 광고 규칙 준수(아래 참조) |
| 광고 | Google H5 Games Ads (AdSense) — **Ad Placement API** | 게임 전용 포맷(인터스티셜·리워드). 일반 배너보다 게임에 최적화 |
| 데이터 | 초기엔 파일 기반(`lib/games.ts`). DB 없음 | 오버엔지니어링 금지. 필요해질 때 도입 |

### ⚠️ 결정적 제약 — 광고 코드의 위치

> Ad Placement API와 `adsbygoogle` 태그는 **반드시 게임 canvas와 같은 document 안**에 있어야 한다.
> 우리는 게임을 iframe으로 로드하므로 → **광고 통합 코드는 포털이 아니라 각 게임 HTML 안에 들어간다.**

즉:
- **포털** = 게임 목록·상세를 보여주는 셸/디렉토리. (광고 로직 없음)
- **게임** = 자기 광고를 지고 다니는 독립 유닛. (광고 로직 포함)

이 규칙을 어기면 광고 노출이 **0**이 됩니다. 절대 임의로 바꾸지 마세요.

---

## 3. 목표 디렉토리 구조

```
/
├─ CLAUDE.md                      # 이 문서
├─ app/
│  ├─ page.tsx                    # 게임 목록 (카드 그리드)
│  ├─ games/[slug]/page.tsx       # 게임 상세: iframe + 소개/공략 텍스트
│  ├─ about/page.tsx              # AdSense 심사용
│  └─ privacy/page.tsx            # AdSense 심사용
├─ public/games/
│  └─ <slug>/
│     ├─ index.html               # 게임 본체 + 광고 통합
│     ├─ game.js                  # 게임 로직
│     └─ afg-integration.js       # H5 Games Ads 래퍼 (표준 템플릿)
├─ lib/games.ts                   # 게임 메타데이터 (제목/슬러그/썸네일/설명)
├─ content/games/<slug>.md        # 게임별 오리지널 소개·공략 (승인용 콘텐츠)
└─ docs/                          # (나중에 ROADMAP 분리 시)
```

---

## 4. 개발 단계 (이 순서대로 진행 / 한 번에 한 Phase)

### Phase 0 — 셋업
- [ ] repo init → Next.js(App Router) + TS + Tailwind
- [ ] Vercel 배포 연결, "hello" 페이지 접속 확인
- **DoD**: 배포 URL이 열린다.

### Phase 1 — 포털 셸
- [ ] `lib/games.ts` 스키마 정의 (slug, title, thumbnail, description)
- [ ] 목록 페이지: 게임 카드 그리드
- [ ] 상세 페이지: 게임 iframe + 하단에 `content/games/<slug>.md` 렌더
- [ ] 더미 게임 1개(빈 index.html)로 목록→상세→iframe 흐름 확인
- **DoD**: 더미 게임이 목록에서 클릭 → 상세에서 iframe으로 뜬다.

### Phase 2 — 레퍼런스 게임 + 광고 루프 ⭐ (가장 중요)
- [ ] 단순 아케이드 게임 1개 제작 (예: 원터치 점프/회피 — Flappy 계열)
- [ ] `afg-integration.js`로 H5 Games Ads 통합:
  - **인터스티셜**: game over → 메인 메뉴 복귀 시 `adBreak({type, name, beforeAd, adBreakDone})`
  - **리워드**: "이어하기" 선택 시 `adBreak({type:'reward', beforeReward, adViewed, adDismissed})`
  - `afg-integration.js`에 ad frequency hint 설정
- [ ] 광고 전후 게임 pause/resume 헬퍼 (`onBeforeAd`/`onAfterAd`) 연결
- [ ] dev/test 모드로 광고 자리표시자 동작 확인
- **DoD**: 두 포맷이 올바른 트리거에서 호출 + pause/resume 동기화 + 이벤트 콘솔 로깅.
- **주의**: 실물 광고는 AdSense 승인 + H5 Games Ads 활성화 이후에만 노출됨 (Phase 4).

### Phase 3 — 게임 추가 파이프라인 표준화
- [ ] "새 게임 1개 얹는 체크리스트" 문서화:
  1. `/public/games/<slug>/` 생성
  2. `afg-integration.js` 복사 + 게임의 game-over/continue 지점에 연결
  3. `lib/games.ts`에 메타 추가
  4. `content/games/<slug>.md`에 **오리지널** 소개/공략 작성
- [ ] 두 번째 게임을 이 체크리스트만으로 추가해서 검증
- **DoD**: 체크리스트만으로 두 번째 게임이 붙는다.

### Phase 4 — 사업성 (기술 안정화 후)
- [ ] AdSense 신청 준비:
  - 게임별 오리지널 콘텐츠(소개/공략/제작노트), About·개인정보·연락처 페이지
  - 얇은 페이지 최소화, 실제 플레이 가능한 게임 5~10개 이상
- [ ] 애널리틱스(GA4 or Plausible) + 광고 이벤트 자체 로깅
- [ ] AdSense 승인 → H5 Games Ads 활성화 → 실물 광고 노출 확인
- [ ] 규모 커지면 Google Ad Manager 전환 검토 (수요 확대로 CPM↑)
- **DoD**: 승인 완료 → 실제 임프레션/수익 데이터 수집 시작.

> ⚠️ 사업성 최대 리스크: AdSense는 "대량의 얇은 AI 콘텐츠(scaled content abuse)"를 거부한다.
> 웹사이트 **전체**를 광고 파트너로 평가하므로, **잘 만든 소수 + 오리지널 텍스트**가
> 얇은 다수보다 승인·수익 양면에서 유리하다. (자체 세계관/아트로 오리지널리티 확보)

### Phase 5 — 디자인 개선 (나중, 별도 스킬로)
- 지금은 기능/구조 우선. UI는 최소한(Tailwind 기본)만.
- 현주가 이후 디자인 스킬 제공 예정 → 그때 리팩터.
- **Phase 4까지는 디자인을 다듬지 않는다.**

---

## 5. Claude Code 작업 원칙

- **한 번에 한 Phase**, Phase 안에서도 작은 커밋으로 쪼갠다.
- 새 의존성 추가 **전에 물어본다.** 기본은 Next 내장 / 표준 라이브러리.
- **광고 관련 코드는 임의 변경 금지.** Ad Placement API 규칙(§2) 위반 = 노출 0.
- **오버엔지니어링 금지.** DB·백엔드 필요해지기 전엔 파일 기반(`lib/games.ts`)으로.
- **디자인 다듬기 금지 (Phase 5 전까지).** 기능부터.
- 막히면 추측하지 말고 → 현재 상태 + 에러 + 다음 3가지 옵션을 제시하고 멈춘다.
- 모든 광고·외부 스크립트는 dev/test 모드에서 먼저 검증한 뒤 실물 연결.
- 커밋 메시지는 짧고 명확하게 (`phase2: add rewarded ad callback`).

---

## 6. 열린 결정들 (현주가 정할 것)

- [ ] 플랫폼 이름/브랜드 (지금은 placeholder `ARCADE`)
- [ ] 첫 레퍼런스 게임 장르 (원터치 아케이드 추천 — 광고 루프 검증에 최소 복잡도)
- [ ] 애널리틱스: GA4 vs Plausible
- [ ] 게임 소스 방식: 직접 바이브코딩 vs 오픈소스 리믹스
- [ ] 도메인 (AdSense 신청 전 필요)

---

## 7. 지금 당장 시작할 첫 명령 (Phase 0)

Claude Code에게:
> "CLAUDE.md의 Phase 0를 실행해줘. Next.js(App Router) + TypeScript + Tailwind로
> 프로젝트를 초기화하고, 게임 목록이 들어갈 빈 홈페이지 하나만 만들어줘.
> 아직 게임·광고·디자인은 건드리지 말고, Vercel 배포 준비까지만."
