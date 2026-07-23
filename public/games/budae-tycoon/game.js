/* 부대찌개 타이쿤 — 검은 고양이 미미의 성장 스토리 타이쿤
 * 카운터에 앉은 손님들이 각자 주문을 외치고, 화구 위 냄비들이 동시에 끓는다.
 * 냄비(화구)를 탭해 고르고 재료를 넣어 폭탄 타이머가 터지기 전에 서빙하라.
 * XP는 localStorage에 누적 — 레벨 1 초보 사장냥 → 레벨 30 검은 대장고양이.
 */
(function () {
  "use strict";
  var cv = document.getElementById("game");
  var ctx = cv.getContext("2d");
  var W = 360,
    H = 540;

  // ---------- 색 팔레트 (귀엽지만 힙하게: 다크 + 네온) ----------
  var C = {
    bg: "#14121a",
    wall: "#1b1725",
    floor: "#221d2e",
    wood: "#4d3a2e",
    steel: "#2a2635",
    panel: "#1f1b2a",
    panel2: "#292336",
    cream: "#fff3e0",
    dim: "#9b93ad",
    coral: "#ff6b6b",
    mint: "#4ef0c0",
    gold: "#ffd166",
    red: "#e94b4b",
    flame: "#ff9c41",
  };

  // ---------- 재료 (레벨로 해금) ----------
  var ING = [
    { id: "spam", e: "🥫", name: "스팸", lv: 1 },
    { id: "ssg", e: "🌭", name: "소시지", lv: 1 },
    { id: "ramen", e: "🍜", name: "라면", lv: 1 },
    { id: "kimchi", e: "🥬", name: "김치", lv: 1 },
    { id: "cheese", e: "🧀", name: "치즈", lv: 3 },
    { id: "tteok", e: "🍡", name: "떡", lv: 5 },
    { id: "bean", e: "🫘", name: "빈스", lv: 8 },
    { id: "minari", e: "🌿", name: "미나리", lv: 10 },
    { id: "egg", e: "🥚", name: "계란", lv: 11 },
    { id: "mush", e: "🍄", name: "버섯", lv: 14 },
    { id: "onion", e: "🧅", name: "양파", lv: 17 },
    { id: "mandu", e: "🥟", name: "만두", lv: 20 },
    { id: "garlic", e: "🧄", name: "마늘", lv: 23 },
  ];
  function ing(id) {
    for (var i = 0; i < ING.length; i++) if (ING[i].id === id) return ING[i];
  }

  // ---------- 신메뉴 (미미가 개발하는 조합 — 레벨업 스토리의 축) ----------
  var MENUS = [
    { lv: 1, name: "기본 부대찌개", ing: ["spam", "ssg", "ramen"] },
    { lv: 2, name: "김치 부대찌개", ing: ["spam", "kimchi", "ramen"] },
    { lv: 3, name: "치즈 부대찌개", ing: ["ssg", "cheese", "ramen"] },
    { lv: 5, name: "떡 사리 부대", ing: ["spam", "tteok", "kimchi", "ramen"] },
    { lv: 7, name: "더블 미트 부대", ing: ["spam", "ssg", "cheese", "kimchi"] },
    { lv: 8, name: "콩 부대찌개", ing: ["bean", "ssg", "cheese", "ramen"] },
    { lv: 10, name: "향긋 미나리 부대", ing: ["minari", "spam", "kimchi", "ramen"] },
    { lv: 11, name: "아침 부대찌개", ing: ["egg", "spam", "kimchi", "ramen"] },
    { lv: 13, name: "치즈 폭포", ing: ["cheese", "tteok", "egg", "ramen"] },
    { lv: 14, name: "숲속 부대찌개", ing: ["mush", "ssg", "kimchi", "ramen"] },
    { lv: 16, name: "얼큰 풀하우스", ing: ["mush", "bean", "spam", "tteok", "ramen"] },
    { lv: 17, name: "양파 폭탄 부대", ing: ["onion", "ssg", "cheese", "egg"] },
    { lv: 20, name: "만두 전골 부대", ing: ["mandu", "kimchi", "tteok", "ramen"] },
    { lv: 23, name: "마늘 광부 부대", ing: ["garlic", "spam", "mush", "onion", "ramen"] },
    { lv: 26, name: "미미 시그니처", ing: ["mandu", "cheese", "egg", "bean", "kimchi", "ramen"] },
    { lv: 29, name: "대장의 한 그릇", ing: ["spam", "ssg", "mandu", "garlic", "tteok", "ramen"] },
  ];

  // ---------- 성장 티어 (미미의 겉모습이 변한다) ----------
  var TIERS = [
    { lv: 1, title: "초보 사장냥", story: "골목 구석, 미미의 작고 보잘것없는 첫 가게가 문을 열었다." },
    { lv: 6, title: "견습 요리냥", story: "단골이 생기기 시작했다. 새로 맨 두건이 제법 어울린다." },
    { lv: 13, title: "정식 요리사", story: "셰프 모자를 눌러쓴 미미. 소문이 골목을 넘었다." },
    { lv: 20, title: "힙한 셰프냥", story: "선글라스를 걸친 미미. 가게 앞에 웨이팅 줄이 생겼다." },
    { lv: 27, title: "검은 대장고양이", story: "골목의 전설. 모두가 미미의 부대찌개를 기다린다." },
  ];
  var MAXLV = 30;
  var CUSTOMERS = ["🐶", "🐰", "🐻", "🐹", "🐷", "🦊", "🐸", "🐔", "🐭", "🐨"];

  function tierOf(lv) {
    var t = 0;
    for (var i = 0; i < TIERS.length; i++) if (lv >= TIERS[i].lv) t = i;
    return t;
  }
  function needXp(lv) {
    return 30 + lv * 10; // lv→lv+1 필요 XP. 30레벨까지 총 ~5200
  }

  // ---------- 저장 ----------
  var save = { level: 1, xp: 0, best: 0 };
  try {
    var s = JSON.parse(localStorage.getItem("budae-tycoon"));
    if (s && s.level) save = s;
  } catch (e) {}
  function persist() {
    try {
      localStorage.setItem("budae-tycoon", JSON.stringify(save));
    } catch (e) {}
  }

  // ---------- 상태 ----------
  var STATE = { MENU: 0, PLAY: 1, OVER: 2 };
  var state = STATE.MENU;
  var paused = false; // 광고 중
  var pots = []; // 화구별 상태 {phase:'order'|'anim'|'cool', ...}
  var sel = 0;
  var hearts, coins, served, runXp, usedRevive;
  var banner = null; // 레벨업 오버레이 {t, lines}
  var flashT = 0; // 폭발 시 화면 플래시 + 흔들림
  var floaties = [];
  var mimiX = 180;
  var blinkT = 0,
    tailT = 0,
    time = 0;

  function burnerCount() {
    return save.level >= 7 ? 3 : 2;
  }
  function potXs() {
    return pots.length === 3 ? [70, 180, 290] : [120, 240];
  }
  function potW() {
    return pots.length === 3 ? 92 : 108;
  }

  // ---------- 광고 ----------
  function onBeforeAd() {
    paused = true;
  }
  function onAfterAd() {
    paused = false;
  }
  function requestRevive() {
    if (usedRevive || !window.AFG) return;
    usedRevive = true;
    window.AFG.rewarded({
      name: "budae_continue",
      onBeforeAd: onBeforeAd,
      onReward: function () {
        hearts = 3;
        state = STATE.PLAY;
        resetPots();
      },
      onAfterAd: onAfterAd,
      onDismiss: function () {
        usedRevive = false;
      },
    });
  }
  function requestMenu() {
    if (!window.AFG) {
      state = STATE.MENU;
      return;
    }
    window.AFG.interstitial({
      name: "budae_gameover",
      onBeforeAd: onBeforeAd,
      onAfterAd: function () {
        onAfterAd();
        state = STATE.MENU;
      },
    });
  }

  // ---------- 게임 로직 ----------
  function unlockedMenus() {
    return MENUS.filter(function (m) {
      return m.lv <= save.level;
    });
  }
  function newPot(delay) {
    return { phase: "cool", coolT: delay, menu: null, got: {}, count: 0, customer: "", pat: 0, patMax: 1, mood: "", animT: 0, shakeT: 0 };
  }
  function resetPots() {
    pots = [];
    var n = burnerCount();
    for (var i = 0; i < n; i++) pots.push(newPot(0.6 + i * 2.2)); // 시차 두고 주문 도착
    sel = 0;
  }
  function startRun() {
    hearts = 3;
    coins = 0;
    served = 0;
    runXp = 0;
    usedRevive = false;
    floaties = [];
    banner = null;
    flashT = 0;
    state = STATE.PLAY;
    resetPots();
  }
  function spawnOrder(p) {
    var pool = unlockedMenus();
    p.menu = pool[(Math.random() * pool.length) | 0];
    p.got = {};
    p.count = 0;
    p.customer = CUSTOMERS[(Math.random() * CUSTOMERS.length) | 0];
    p.patMax = Math.max(7, 16 - save.level * 0.25 - served * 0.12);
    p.pat = p.patMax;
    p.mood = "";
    p.phase = "order";
    if (pots[sel] && pots[sel].phase !== "order") autoSel();
  }
  function autoSel() {
    var best = -1;
    for (var i = 0; i < pots.length; i++)
      if (pots[i].phase === "order" && (best < 0 || pots[i].pat < pots[best].pat)) best = i;
    if (best >= 0) sel = best;
  }
  function addXp(n) {
    if (save.level >= MAXLV) return;
    runXp += n;
    save.xp += n;
    var lines = [];
    while (save.level < MAXLV && save.xp >= needXp(save.level)) {
      save.xp -= needXp(save.level);
      save.level++;
      var lv = save.level;
      lines.push("LEVEL " + lv + "!");
      MENUS.forEach(function (m) {
        if (m.lv === lv) lines.push("신메뉴 개발 — " + m.name);
      });
      ING.forEach(function (g) {
        if (g.lv === lv) lines.push("새 재료 입고 — " + g.e + " " + g.name);
      });
      if (lv === 7) lines.push("🔥 화구 +1 — 주방 확장!");
      for (var i = 0; i < TIERS.length; i++)
        if (TIERS[i].lv === lv) lines.push("✨ " + TIERS[i].title + " 승급 ✨");
      if (lv === MAXLV) lines.push("미미는 전설의 검은 대장고양이가 되었다!");
    }
    if (save.level >= MAXLV) save.xp = 0;
    persist();
    if (lines.length) banner = { t: 2.6, lines: lines };
    // 레벨업으로 화구가 늘면 즉시 설치
    if (state === STATE.PLAY && burnerCount() > pots.length) pots.push(newPot(1.5));
  }
  function tapIngredient(g) {
    var p = pots[sel];
    if (!p || p.phase !== "order") return;
    var need = p.menu.ing.indexOf(g.id) >= 0;
    if (!need) {
      p.shakeT = 0.35;
      p.pat = Math.max(0, p.pat - 1.2);
      return;
    }
    if (p.got[g.id]) return; // 이미 넣음
    p.got[g.id] = true;
    p.count++;
    if (p.count === p.menu.ing.length) serve(p);
  }
  function serve(p) {
    var bonus = Math.ceil((p.pat / p.patMax) * 10);
    var gain = 6 + p.menu.ing.length * 3 + bonus;
    coins += gain;
    served++;
    if (coins > save.best) {
      save.best = coins;
      persist();
    }
    addXp(6 + p.menu.ing.length * 3);
    var x = potXs()[pots.indexOf(p)];
    floaties.push({ x: x, y: 240, text: "+" + gain, color: C.gold, life: 1 });
    p.mood = "happy";
    p.phase = "anim";
    p.animT = 0.7;
    autoSel();
  }
  function explode(p) {
    hearts--;
    p.mood = "boom";
    p.phase = "anim";
    p.animT = 0.9;
    flashT = 0.5;
    var x = potXs()[pots.indexOf(p)];
    floaties.push({ x: x, y: 240, text: "-♥", color: C.red, life: 1 });
    autoSel();
    if (hearts <= 0) state = STATE.OVER;
  }

  // ---------- 입력 ----------
  function pos(e) {
    var r = cv.getBoundingClientRect();
    var p = e.touches ? e.touches[0] : e;
    return { x: ((p.clientX - r.left) * W) / r.width, y: ((p.clientY - r.top) * H) / r.height };
  }
  function inRect(p, x, y, w, h) {
    return p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
  }
  // 재료 트레이 슬롯 (5×3 = 최대 15칸)
  function slotRect(i) {
    var col = i % 5,
      row = (i / 5) | 0;
    return { x: 7 + col * 70, y: 378 + row * 54, w: 66, h: 48 };
  }
  cv.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    if (paused) return;
    var p = pos(e);
    if (state === STATE.MENU) {
      startRun();
      return;
    }
    if (state === STATE.OVER) {
      if (!usedRevive && inRect(p, 60, 350, 240, 46)) {
        requestRevive();
        return;
      }
      if (inRect(p, 60, 410, 240, 46)) {
        requestMenu();
        return;
      }
      return;
    }
    if (state === STATE.PLAY) {
      if (banner) return;
      // 화구/손님 열 탭 → 냄비 선택
      if (p.y > 55 && p.y < 370) {
        var xs = potXs();
        for (var i = 0; i < xs.length; i++) {
          if (Math.abs(p.x - xs[i]) < 55 && pots[i].phase === "order") {
            sel = i;
            return;
          }
        }
        return;
      }
      for (var k = 0; k < ING.length; k++) {
        if (ING[k].lv > save.level) continue;
        var r = slotRect(k);
        if (inRect(p, r.x, r.y, r.w, r.h)) {
          tapIngredient(ING[k]);
          return;
        }
      }
    }
  });

  // ---------- 미미 그리기 (티어별 성장 외형) ----------
  function drawMimi(x, y, s, tier) {
    // x,y = 발 밑 중앙. s=1 → 약 90px 높이. 티어가 오를수록 커지고 힙해진다.
    var wag = Math.sin(tailT * 4) * 0.25;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.lineJoin = "round";
    // 따뜻한 주방 조명 글로우 (어두운 바닥에서 실루엣 분리)
    var glow = ctx.createRadialGradient(0, -50, 8, 0, -50, 70);
    glow.addColorStop(0, "rgba(255,209,102,.18)");
    glow.addColorStop(1, "rgba(255,209,102,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, -50, 70, 0, Math.PI * 2);
    ctx.fill();
    // 꼬리
    ctx.strokeStyle = "#221e2b";
    ctx.lineWidth = 9;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(20, -18);
    ctx.quadraticCurveTo(42, -22, 46 + wag * 10, -46 - wag * 14);
    ctx.stroke();
    // 몸통 (크림 림라이트로 실루엣 분리)
    ctx.strokeStyle = "rgba(255,243,224,.35)";
    ctx.lineWidth = 1.5;
    ctx.fillStyle = "#221e2b";
    ctx.beginPath();
    ctx.ellipse(0, -24, 26, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 배 (크림색)
    ctx.fillStyle = "#efe6d8";
    ctx.beginPath();
    ctx.ellipse(0, -18, 13, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    // 발
    ctx.fillStyle = "#221e2b";
    ctx.beginPath();
    ctx.ellipse(-11, -3, 8, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(11, -3, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // 머리
    ctx.beginPath();
    ctx.arc(0, -60, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 귀
    ctx.beginPath();
    ctx.moveTo(-19, -72);
    ctx.lineTo(-13, -92);
    ctx.lineTo(-4, -78);
    ctx.moveTo(19, -72);
    ctx.lineTo(13, -92);
    ctx.lineTo(4, -78);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ff9aa8";
    ctx.beginPath();
    ctx.moveTo(-16, -76);
    ctx.lineTo(-13, -86);
    ctx.lineTo(-8, -78);
    ctx.fill();
    // 눈 (깜빡임) — 티어 3+는 선글라스
    if (tier >= 3) {
      ctx.fillStyle = "#0c0b10";
      ctx.strokeStyle = C.gold;
      ctx.lineWidth = 1.5;
      roundRect(-16, -66, 13, 9, 3);
      ctx.fill();
      ctx.stroke();
      roundRect(3, -66, 13, 9, 3);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-3, -62);
      ctx.lineTo(3, -62);
      ctx.stroke();
    } else {
      var blink = blinkT < 0.12;
      ctx.fillStyle = C.mint;
      if (blink) {
        ctx.fillRect(-13, -62, 8, 2);
        ctx.fillRect(5, -62, 8, 2);
      } else {
        ctx.beginPath();
        ctx.ellipse(-9, -61, 3.5, 5, 0, 0, Math.PI * 2);
        ctx.ellipse(9, -61, 3.5, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // 코 + 수염
    ctx.fillStyle = "#ff9aa8";
    ctx.beginPath();
    ctx.arc(0, -54, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(239,230,216,.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-8, -53);
    ctx.lineTo(-20, -55);
    ctx.moveTo(-8, -50);
    ctx.lineTo(-19, -49);
    ctx.moveTo(8, -53);
    ctx.lineTo(20, -55);
    ctx.moveTo(8, -50);
    ctx.lineTo(19, -49);
    ctx.stroke();
    // 티어 0: 헐렁한 앞치마 / 1+: 코랄 두건 / 2+: 셰프 모자 / 4: 금목걸이
    if (tier === 0) {
      ctx.fillStyle = C.cream;
      ctx.beginPath();
      ctx.moveTo(-14, -34);
      ctx.lineTo(14, -34);
      ctx.lineTo(10, -8);
      ctx.lineTo(-10, -8);
      ctx.fill();
      ctx.strokeStyle = C.coral;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-6, -28, 12, 10);
    }
    if (tier >= 1 && tier < 2) {
      ctx.fillStyle = C.coral;
      ctx.beginPath();
      ctx.moveTo(-21, -70);
      ctx.quadraticCurveTo(0, -84, 21, -70);
      ctx.lineTo(18, -76);
      ctx.quadraticCurveTo(0, -90, -18, -76);
      ctx.fill();
    }
    if (tier >= 2) {
      // 셰프 모자
      ctx.fillStyle = "#fdfbf6";
      roundRect(-14, -96, 28, 14, 4);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-9, -96, 8, 0, Math.PI * 2);
      ctx.arc(0, -100, 9, 0, Math.PI * 2);
      ctx.arc(9, -96, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.coral;
      ctx.fillRect(-14, -84, 28, 3);
    }
    if (tier >= 4) {
      ctx.strokeStyle = C.gold;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, -44, 12, 0.25 * Math.PI, 0.75 * Math.PI);
      ctx.stroke();
      ctx.fillStyle = C.gold;
      ctx.font = "9px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("M", 0, -29);
    }
    ctx.restore();
  }

  // ---------- 그리기 헬퍼 ----------
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function text(t, x, y, size, color, align, bold) {
    ctx.fillStyle = color;
    ctx.font = (bold ? "700 " : "") + size + "px system-ui";
    ctx.textAlign = align || "center";
    ctx.fillText(t, x, y);
  }
  function wrapText(str, x, y, maxW, lineH) {
    var words = str.split(" ");
    var line = "";
    for (var i = 0; i < words.length; i++) {
      var test = line + (line ? " " : "") + words[i];
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, y);
        line = words[i];
        y += lineH;
      } else line = test;
    }
    ctx.fillText(line, x, y);
  }

  // ---------- 식당 요소 그리기 ----------
  function drawPotOn(cx, potY, w, p, i) {
    // 화구 + 불꽃 + 냄비. potY = 냄비 바닥(=화구 위)
    var selMe = i === sel && p.phase === "order";
    var danger = p.phase === "order" && p.pat / p.patMax < 0.3;
    var shake = p.shakeT > 0 ? Math.sin(p.shakeT * 60) * 3 : danger ? Math.sin(time * 30) * 1.5 : 0;
    var hw = w / 2;
    // 화구 그레이트
    ctx.strokeStyle = "#3a3450";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(cx, potY + 6, hw - 6, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
    // 불꽃 (항상 활활)
    for (var f = 0; f < 5; f++) {
      var fx = cx - 24 + f * 12;
      var fh = 7 + Math.sin(time * 11 + f * 2.1 + i * 3) * 3;
      ctx.fillStyle = f % 2 ? C.flame : C.gold;
      ctx.beginPath();
      ctx.moveTo(fx - 3, potY + 8);
      ctx.lineTo(fx, potY + 8 - fh);
      ctx.lineTo(fx + 3, potY + 8);
      ctx.fill();
    }
    ctx.save();
    ctx.translate(cx + shake, potY);
    // 냄비 (검정 무쇠 + 네온 라인)
    ctx.fillStyle = "#0e0c13";
    roundRect(-hw, -34, w, 34, 8);
    ctx.fill();
    ctx.strokeStyle = danger ? (Math.sin(time * 16) > 0 ? C.red : "#3a3450") : selMe ? C.mint : "#3a3450";
    ctx.lineWidth = selMe || danger ? 2.5 : 1.5;
    roundRect(-hw, -34, w, 34, 8);
    ctx.stroke();
    // 손잡이
    ctx.fillStyle = "#0e0c13";
    ctx.fillRect(-hw - 9, -28, 9, 7);
    ctx.fillRect(hw, -28, 9, 7);
    // 국물
    ctx.fillStyle = "#c93a2e";
    roundRect(-hw + 5, -30, w - 10, 13, 6);
    ctx.fill();
    // 넣은 재료
    if (p.phase === "order") {
      var got = p.menu.ing.filter(function (id) {
        return p.got[id];
      });
      ctx.font = "13px system-ui";
      ctx.textAlign = "center";
      for (var g = 0; g < got.length; g++) {
        var bob = Math.sin(time * 3 + g * 1.7) * 1.5;
        ctx.fillText(ing(got[g]).e, -hw + 12 + g * 13, -19 + bob);
      }
    }
    // 보글보글 끓는 김 (모든 냄비 상시)
    ctx.fillStyle = "rgba(255,243,224,.3)";
    for (var j = 0; j < 3; j++) {
      var t2 = (time * 0.8 + j * 0.33 + i * 0.2) % 1;
      ctx.beginPath();
      ctx.arc(-18 + j * 18 + Math.sin(t2 * 6) * 4, -38 - t2 * 24, 4 - t2 * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // 연출: 서빙 성공 / 폭발
    if (p.phase === "anim") {
      ctx.font = "34px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(p.mood === "boom" ? "💥" : "✨", 0, -44);
    }
    ctx.restore();
    // 선택 표시 화살표
    if (selMe) {
      var bounce = Math.sin(time * 6) * 3;
      text("▼", cx, potY - 78 + bounce, 14, C.mint, "center", true);
    }
  }

  function drawColumn(cx, p, i) {
    // 손님 + 주문 말풍선 (화구와 같은 열)
    if (p.phase === "cool") return; // 빈 자리
    var mood = p.phase === "anim" ? (p.mood === "boom" ? "💢" : "😋") : p.customer;
    ctx.font = "26px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(mood, cx, 152);
    if (p.phase !== "order") return;
    var selMe = i === sel;
    var pr = p.pat / p.patMax;
    var danger = pr < 0.3;
    var bw = 104,
      bx = Math.min(W - 6 - bw, Math.max(6, cx - bw / 2)),
      by = 62,
      bh = 62;
    ctx.fillStyle = C.panel;
    roundRect(bx, by, bw, bh, 10);
    ctx.fill();
    ctx.strokeStyle = danger ? (Math.sin(time * 16) > 0 ? C.red : C.panel2) : selMe ? C.mint : C.panel2;
    ctx.lineWidth = selMe || danger ? 2 : 1.5;
    roundRect(bx, by, bw, bh, 10);
    ctx.stroke();
    // 주문 재료 아이콘 (최대 6 → 3×2줄, 넣은 건 밝게)
    var n = p.menu.ing.length;
    ctx.font = "16px system-ui";
    for (var k = 0; k < n; k++) {
      var g = ing(p.menu.ing[k]);
      var col = k % 3,
        row = (k / 3) | 0;
      var rowN = row === 0 ? Math.min(3, n) : n - 3;
      var ix = bx + bw / 2 - (rowN - 1) * 14 + col * 28;
      var iy = by + 20 + row * 19;
      ctx.globalAlpha = p.got[g.id] ? 1 : 0.35;
      ctx.fillText(g.e, ix, iy);
    }
    ctx.globalAlpha = 1;
    // 폭탄 퓨즈 바
    ctx.fillStyle = C.panel2;
    roundRect(bx + 18, by + bh - 10, bw - 24, 5, 2.5);
    ctx.fill();
    ctx.fillStyle = danger ? C.red : pr < 0.6 ? C.gold : C.mint;
    roundRect(bx + 18, by + bh - 10, Math.max(4, (bw - 24) * pr), 5, 2.5);
    ctx.fill();
    // 퓨즈 앞 폭탄 (위험하면 커지며 깜빡)
    var bs = danger ? 13 + Math.sin(time * 14) * 2 : 10;
    ctx.font = bs + "px system-ui";
    ctx.fillText("💣", bx + 10, by + bh - 4);
  }

  // ---------- 화면 ----------
  function drawMenuScreen() {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    var tier = tierOf(save.level);
    // 네온 간판
    text("MIMI'S BUDAE POT", 180, 52, 11, C.mint, "center");
    text("부대찌개 타이쿤", 180, 88, 30, C.cream, "center", true);
    ctx.strokeStyle = C.coral;
    ctx.lineWidth = 2;
    roundRect(70, 62, 220, 38, 8);
    ctx.stroke();
    // 미미
    drawMimi(180, 300, 1.1 + tier * 0.12, tier);
    // 티어 + 스토리
    text("Lv." + save.level + "  " + TIERS[tier].title, 180, 336, 17, C.gold, "center", true);
    ctx.fillStyle = C.dim;
    ctx.font = "12px system-ui";
    wrapText(TIERS[tier].story, 180, 360, 300, 17);
    // XP 바
    if (save.level < MAXLV) {
      var r = save.xp / needXp(save.level);
      ctx.fillStyle = C.panel2;
      roundRect(80, 386, 200, 10, 5);
      ctx.fill();
      ctx.fillStyle = C.mint;
      roundRect(80, 386, Math.max(8, 200 * r), 10, 5);
      ctx.fill();
      text(save.xp + " / " + needXp(save.level) + " XP", 180, 412, 11, C.dim, "center");
    } else {
      text("★ MAX LEVEL — 골목의 전설 ★", 180, 400, 13, C.gold, "center", true);
    }
    var nb = save.level >= 7 ? 3 : 2;
    text(
      "화구 " + nb + "개 · 메뉴 " + unlockedMenus().length + "종 · 재료 " +
        ING.filter(function (g) { return g.lv <= save.level; }).length + "종",
      180, 438, 12, C.dim, "center"
    );
    if (save.best > 0) text("최고 매출  " + save.best + "냥", 180, 458, 12, C.gold, "center");
    var pulse = 0.6 + Math.sin(time * 4) * 0.4;
    ctx.globalAlpha = pulse;
    text("탭해서 영업 시작", 180, 500, 16, C.coral, "center", true);
    ctx.globalAlpha = 1;
  }

  function drawPlay() {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    if (flashT > 0) ctx.translate(Math.sin(flashT * 55) * 4 * flashT, Math.sin(flashT * 47) * 3 * flashT);

    // --- 홀: 벽 + 간판 + 알전구 ---
    ctx.fillStyle = C.wall;
    ctx.fillRect(0, 44, W, 116);
    text("· MIMI'S BUDAE POT ·", 180, 57, 8, C.mint, "center");
    for (var l = 0; l < 9; l++) {
      var tw = 0.5 + Math.sin(time * 3 + l * 1.3) * 0.5;
      ctx.globalAlpha = 0.35 + tw * 0.45;
      ctx.fillStyle = l % 2 ? C.gold : C.coral;
      ctx.beginPath();
      ctx.arc(28 + l * 38, 66, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // --- 카운터 (손님이 앉는 바) ---
    ctx.fillStyle = C.wood;
    ctx.fillRect(0, 158, W, 13);
    ctx.fillStyle = "rgba(0,0,0,.25)";
    ctx.fillRect(0, 168, W, 3);
    // --- 주방 바닥 ---
    ctx.fillStyle = C.floor;
    ctx.fillRect(0, 171, W, 199);
    ctx.strokeStyle = "rgba(255,255,255,.03)";
    ctx.lineWidth = 1;
    for (var ty = 190; ty < 370; ty += 22) {
      ctx.beginPath();
      ctx.moveTo(0, ty);
      ctx.lineTo(W, ty);
      ctx.stroke();
    }

    var xs = potXs();
    var w = potW();
    // 손님 + 주문 (카운터 뒤, 화구와 같은 열)
    for (var i = 0; i < pots.length; i++) drawColumn(xs[i], pots[i], i);

    // 미미 — 선택한 화구 쪽으로 이동 (가스레인지 뒤에서 상반신)
    var tier = tierOf(save.level);
    drawMimi(mimiX, 302, 0.72 + tier * 0.05, tier);

    // --- 가스레인지 본체 ---
    ctx.fillStyle = C.steel;
    roundRect(8, 296, 344, 72, 12);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.05)";
    ctx.fillRect(8, 296, 344, 4);
    // 조절 노브
    for (var nb = 0; nb < xs.length; nb++) {
      ctx.fillStyle = "#1a1724";
      ctx.beginPath();
      ctx.arc(xs[nb], 350, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = nb === sel ? C.mint : "#3a3450";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(xs[nb], 350, 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    // 화구 + 냄비
    for (var b = 0; b < pots.length; b++) drawPotOn(xs[b], 300, w, pots[b], b);

    // --- 상단 바 ---
    text("♥".repeat(hearts) + "♡".repeat(3 - hearts), 14, 28, 16, C.coral, "left");
    text("Lv." + save.level, 180, 28, 14, C.mint, "center", true);
    text(coins + "냥", 346, 28, 15, C.gold, "right", true);
    if (save.level < MAXLV) {
      var r = save.xp / needXp(save.level);
      ctx.fillStyle = C.panel2;
      ctx.fillRect(140, 36, 80, 4);
      ctx.fillStyle = C.mint;
      ctx.fillRect(140, 36, 80 * r, 4);
    }
    text("서빙 " + served, 346, 190, 11, C.dim, "right");

    // --- 재료 트레이 ---
    for (var k = 0; k < ING.length; k++) {
      var s2 = slotRect(k);
      var g2 = ING[k];
      var unlocked = g2.lv <= save.level;
      ctx.fillStyle = unlocked ? C.panel2 : "#1a1724";
      roundRect(s2.x, s2.y, s2.w, s2.h, 8);
      ctx.fill();
      var selPot = pots[sel];
      if (unlocked && selPot && selPot.phase === "order" && selPot.menu.ing.indexOf(g2.id) >= 0 && !selPot.got[g2.id]) {
        ctx.strokeStyle = C.mint; // 선택한 냄비에 필요한 재료 힌트
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.5;
        roundRect(s2.x, s2.y, s2.w, s2.h, 8);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (unlocked) {
        text(g2.e, s2.x + 33, s2.y + 25, 18, C.cream, "center");
        text(g2.name, s2.x + 33, s2.y + 41, 10, C.cream, "center");
      } else {
        ctx.globalAlpha = 0.45;
        text("🔒", s2.x + 33, s2.y + 24, 13, C.dim, "center");
        text("Lv." + g2.lv, s2.x + 33, s2.y + 40, 10, C.dim, "center");
        ctx.globalAlpha = 1;
      }
    }

    // 플로팅 텍스트
    for (var f = 0; f < floaties.length; f++) {
      var fl = floaties[f];
      ctx.globalAlpha = fl.life;
      text(fl.text, fl.x, fl.y, 16, fl.color, "center", true);
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // 폭발 플래시
    if (flashT > 0) {
      ctx.fillStyle = "rgba(233,75,75," + flashT * 0.5 + ")";
      ctx.fillRect(0, 0, W, H);
    }

    // 레벨업 배너
    if (banner) {
      ctx.fillStyle = "rgba(12,10,18,.88)";
      ctx.fillRect(0, 0, W, H);
      var by = 220;
      text("🎉", 180, by - 40, 34, C.cream, "center");
      for (var b2 = 0; b2 < banner.lines.length; b2++) {
        var big = b2 === 0;
        text(banner.lines[b2], 180, by + b2 * 28, big ? 24 : 15, big ? C.gold : C.cream, "center", big);
      }
    }
  }

  function drawOver() {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    text("영업 종료!", 180, 120, 30, C.coral, "center", true);
    ctx.font = "40px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("😿", 180, 180);
    text("매출  " + coins + "냥", 180, 230, 20, C.gold, "center", true);
    text("서빙 " + served + "그릇 · +" + runXp + " XP", 180, 258, 14, C.dim, "center");
    if (coins >= save.best && coins > 0) text("★ 최고 기록! ★", 180, 286, 14, C.mint, "center", true);
    if (!usedRevive) {
      ctx.fillStyle = C.mint;
      roundRect(60, 350, 240, 46, 10);
      ctx.fill();
      text("📺 광고 보고 이어하기", 180, 379, 15, "#0c0b10", "center", true);
    }
    ctx.strokeStyle = C.dim;
    ctx.lineWidth = 1.5;
    roundRect(60, 410, 240, 46, 10);
    ctx.stroke();
    text("메인으로", 180, 439, 15, C.cream, "center");
  }

  // ---------- 루프 ----------
  var last = performance.now();
  function loop(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!paused) {
      time += dt;
      tailT += dt;
      blinkT -= dt;
      if (blinkT < -3 - Math.random() * 2) blinkT = 0.12;
      if (flashT > 0) flashT -= dt;
      // 미미가 선택한 화구 쪽으로 슬쩍 이동
      if (state === STATE.PLAY && pots.length) {
        var tx = potXs()[Math.min(sel, pots.length - 1)];
        mimiX += (tx - mimiX) * Math.min(1, dt * 6);
      }
      if (banner) {
        banner.t -= dt;
        if (banner.t <= 0) banner = null;
      } else if (state === STATE.PLAY) {
        for (var i = 0; i < pots.length; i++) {
          var p = pots[i];
          p.shakeT > 0 && (p.shakeT -= dt);
          if (p.phase === "cool") {
            p.coolT -= dt;
            if (p.coolT <= 0) spawnOrder(p);
          } else if (p.phase === "anim") {
            p.animT -= dt;
            if (p.animT <= 0) {
              p.phase = "cool";
              p.coolT = 0.9 + Math.random() * 0.8;
            }
          } else {
            p.pat -= dt;
            if (p.pat <= 0) {
              explode(p);
              if (state !== STATE.PLAY) break;
            }
          }
        }
      }
      for (var f = floaties.length - 1; f >= 0; f--) {
        floaties[f].y -= 40 * dt;
        floaties[f].life -= dt;
        if (floaties[f].life <= 0) floaties.splice(f, 1);
      }
    }
    if (state === STATE.MENU) drawMenuScreen();
    else if (state === STATE.PLAY) drawPlay();
    else drawOver();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
