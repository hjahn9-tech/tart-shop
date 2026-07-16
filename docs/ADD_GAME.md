# 게임 올리기 가이드

Tart Shop에 게임을 추가하는 방법입니다. **코드를 몰라도** 따라 할 수 있게 정리했어요.

핵심 규칙은 딱 하나입니다.

> `public/games/<슬러그>/` 폴더에 **게임 파일 + `game.json`** 을 넣으면 목록에 자동으로 나타납니다.
> (`<슬러그>` = 주소에 쓰일 영문 이름. 예: `tart-run`)

`lib/games.ts` 같은 코드는 손댈 필요가 없습니다.

---

## 방법 A — 명령어 한 줄 (가장 쉬움)

터미널에서 프로젝트 폴더로 간 뒤:

```bash
npm run new-game -- tart-run "Tart Run" "굴러오는 타르트를 피하세요" 🍩
```

그러면 자동으로 만들어집니다:

- `public/games/tart-run/` — `game.json`, `index.html`, `afg-integration.js`(광고 래퍼)
- `content/games/tart-run.md` — 소개글 초안

이제 **폴더 안 `index.html` 을 여러분 게임으로 바꾸기만** 하면 끝입니다.
확인: `npm run dev` → http://localhost:3000/games/tart-run

---

## 방법 B — 이미 만든 게임을 올리기 (웹 게임)

여러분이 만든 게임이 **브라우저에서 도는 정적 파일**(HTML/CSS/JS, Three.js, 파이게임-web 등)이면 그대로 올릴 수 있어요.

1. **게임을 정적 파일로 준비합니다.**
   - Vite/webpack 등으로 만들었다면 먼저 빌드하세요 (예: `npm run build` → `dist/` 폴더 생성).
   - 결과물에 **`index.html` 이 있어야** 합니다. 이게 게임의 시작 파일입니다.
2. **폴더를 만들고 파일을 통째로 넣습니다.**
   ```
   public/games/<슬러그>/
     ├─ index.html      ← 게임 시작 파일 (이름 고정)
     ├─ (게임의 나머지 파일 전부: js, css, 이미지, 사운드 …)
     └─ game.json       ← 아래 3번
   ```
3. **`game.json` 을 만듭니다.** (목록 카드에 쓰일 정보)
   ```json
   {
     "title": "게임 제목",
     "tagline": "한 줄 소개",
     "emoji": "🎮",
     "aspect": { "w": 360, "h": 540 },
     "order": 3
   }
   ```
4. 끝. `npm run dev` 로 확인하세요.

> 방법 A로 폴더를 먼저 만든 뒤, 생성된 `index.html` 만 여러분 게임 것으로 교체하는 게 가장 안전합니다.
> (`game.json` 과 `afg-integration.js` 는 남겨두세요.)

### ⚠️ 가장 흔한 실수 — 경로

게임은 `/games/<슬러그>/` **하위 폴더**에서 실행됩니다. 그래서 파일을 불러올 때
**상대경로**(`./game.js`, `assets/img.png`)를 써야 합니다. `/game.js` 처럼 슬래시로
시작하는 **절대경로는 깨집니다.**

- Vite면 빌드 설정에 `base: './'` 를 넣으세요.
- 이미지·사운드도 모두 상대경로인지 확인하세요.

---

## `game.json` 필드 설명

| 필드 | 필수 | 설명 |
|---|---|---|
| `title` | ✅ | 게임 제목 (카드·페이지 제목) |
| `tagline` | ✅ | 한 줄 소개 |
| `emoji` | | 썸네일 대신 쓸 이모지 (기본 🎮) |
| `thumbnail` | | 썸네일 이미지. 게임 폴더 기준 파일명 (예: `"cover.png"`) |
| `aspect` | | 화면 비율 `{ "w":가로, "h":세로 }` (기본 360×540 세로) |
| `order` | | 목록 정렬 순서(작을수록 앞). 없으면 100 |

썸네일 이미지를 넣으면 카드가 더 예쁩니다. 게임 폴더에 `cover.png` 를 넣고
`"thumbnail": "cover.png"` 라고 적으면 됩니다.

---

## 광고 붙이기 (선택 — 나중에 해도 됨)

수익화가 목적이라면 게임에 광고 훅을 연결합니다. `afg-integration.js` 가 이미
폴더에 들어 있으니, 게임에서 두 지점만 호출하면 됩니다.

```html
<!-- index.html 안, 게임 스크립트보다 먼저 -->
<script src="./afg-integration.js"></script>
```

```js
// 게임 오버 → 메인으로 돌아갈 때: 전면 광고
window.AFG.interstitial({
  name: "mygame_gameover",
  onBeforeAd: pauseGame,   // 광고 전 일시정지
  onAfterAd: resumeToMenu, // 광고 후 메뉴로
});

// "이어하기" 선택 시: 리워드 광고
window.AFG.rewarded({
  name: "mygame_continue",
  onBeforeAd: pauseGame,
  onReward: revivePlayer,  // 광고 다 보면 보상(부활)
  onAfterAd: resumeGame,
});
```

- 지금은 클라이언트 ID가 없어 **테스트 모드**로 돕니다(자리표시자 + 콘솔 로깅). 이벤트는
  브라우저 콘솔의 `[AFG]` 로그로 확인할 수 있습니다.
- 실물 광고는 AdSense 승인 후 `index.html` 상단 주석의 `ca-pub-XXXXXXXX` 를 실제
  게시자 ID로 바꾸면 자동으로 켜집니다. **광고 코드는 반드시 게임 폴더 안**에 있어야
  합니다(포털이 아니라). 참고 예시는 `public/games/tart-flap/game.js` 를 보세요.

---

## 이런 게임은 그대로 못 올려요

- **Unity(WebGL 아님)·Flutter·네이티브 앱**: 브라우저 정적 파일이 아니라서 iframe으로
  못 띄웁니다. Unity는 **WebGL로 빌드**하면 정적 파일이 나와 올릴 수 있습니다.
- 서버가 꼭 필요한 게임(백엔드 API 의존): 지금 구조는 정적 게임 전용입니다.

---

## 배포까지

로컬에서 잘 보이면 그대로 Vercel에 올리면 끝입니다. 폴더를 추가하고 배포하면
새 게임이 사이트에 반영됩니다. (도메인 연결 시 `NEXT_PUBLIC_SITE_URL` 환경변수 설정)
