/*
 * Tart Flap — 원터치 아케이드 (Flappy 계열)
 * 탭/클릭/스페이스로 타르트를 위로 띄워 오븐 선반(파이프) 사이를 통과.
 * 광고 훅: game over에서 "이어하기"=리워드, "메인으로"=인터스티셜.
 */
(function () {
  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");
  var W = canvas.width;
  var H = canvas.height;

  // --- 상태 ---
  var STATE = { MENU: 0, PLAY: 1, OVER: 2 };
  var state = STATE.MENU;
  var paused = false; // 광고 중 일시정지
  var usedRevive = false;

  var GRAVITY = 0.45;
  var FLAP = -7.2;
  var GAP = 140; // 선반 사이 간격
  var PIPE_W = 56;
  var SPEED = 2.2;

  var tart, pipes, score, best;
  try {
    best = parseInt(localStorage.getItem("tartflap.best") || "0", 10) || 0;
  } catch (e) {
    best = 0;
  }

  function reset() {
    tart = { x: 90, y: H / 2, vy: 0, r: 16 };
    pipes = [];
    score = 0;
    usedRevive = false;
    spawnPipe(W + 40);
    spawnPipe(W + 40 + (W + 40 - 90) / 2);
  }

  function spawnPipe(x) {
    var margin = 60;
    var gapY = margin + Math.random() * (H - GAP - margin * 2);
    pipes.push({ x: x, gapY: gapY, scored: false });
  }

  function flap() {
    if (state === STATE.MENU) {
      state = STATE.PLAY;
      reset();
      tart.vy = FLAP;
      return;
    }
    if (state === STATE.PLAY) tart.vy = FLAP;
  }

  function die() {
    state = STATE.OVER;
    if (score > best) {
      best = score;
      try {
        localStorage.setItem("tartflap.best", String(best));
      } catch (e) {}
    }
  }

  // --- 광고 연동 헬퍼 (pause/resume 동기화) ---
  function onBeforeAd() {
    paused = true;
  }
  function onAfterAd() {
    paused = false;
  }

  function revive() {
    // 리워드 시청 완료 → 화면 중앙에서 부활, 근처 선반 제거
    tart.y = H / 2;
    tart.vy = 0;
    pipes = pipes.filter(function (p) {
      return p.x > tart.x + 120 || p.x + PIPE_W < tart.x - 40;
    });
    state = STATE.PLAY;
  }

  function requestRevive() {
    if (usedRevive || !window.AFG) return;
    usedRevive = true;
    window.AFG.rewarded({
      name: "tartflap_continue",
      onBeforeAd: onBeforeAd,
      onReward: revive,
      onAfterAd: onAfterAd,
      onDismiss: function () {
        usedRevive = false; // 시청 취소 시 다시 시도 가능
      },
    });
  }

  function requestMenu() {
    // game over → 메인 메뉴 복귀 시 인터스티셜
    if (!window.AFG) {
      state = STATE.MENU;
      return;
    }
    window.AFG.interstitial({
      name: "tartflap_gameover",
      onBeforeAd: onBeforeAd,
      onAfterAd: function () {
        onAfterAd();
        state = STATE.MENU;
      },
    });
  }

  // --- 업데이트 ---
  function update() {
    if (state !== STATE.PLAY || paused) return;
    tart.vy += GRAVITY;
    tart.y += tart.vy;

    for (var i = 0; i < pipes.length; i++) {
      var p = pipes[i];
      p.x -= SPEED;
      if (!p.scored && p.x + PIPE_W < tart.x) {
        p.scored = true;
        score += 1;
      }
      // 충돌
      var inX = tart.x + tart.r > p.x && tart.x - tart.r < p.x + PIPE_W;
      var inGap = tart.y - tart.r > p.gapY && tart.y + tart.r < p.gapY + GAP;
      if (inX && !inGap) die();
    }
    if (pipes.length && pipes[0].x + PIPE_W < -10) pipes.shift();
    var last = pipes[pipes.length - 1];
    if (last && last.x < W - (W + 40 - 90) / 2) spawnPipe(W + 40);

    // 바닥/천장
    if (tart.y + tart.r > H || tart.y - tart.r < 0) die();
  }

  // --- 렌더 ---
  function drawTart(x, y, r) {
    // 크러스트
    ctx.fillStyle = "#e8c39e";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // 필링
    ctx.fillStyle = "#c2185b";
    ctx.beginPath();
    ctx.arc(x, y, r * 0.62, 0, Math.PI * 2);
    ctx.fill();
    // 하이라이트
    ctx.fillStyle = "rgba(255,255,255,.55)";
    ctx.beginPath();
    ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  function draw() {
    // 배경
    ctx.fillStyle = "#fff3e6";
    ctx.fillRect(0, 0, W, H);

    // 선반(파이프)
    ctx.fillStyle = "#b5794a";
    for (var i = 0; i < pipes.length; i++) {
      var p = pipes[i];
      ctx.fillRect(p.x, 0, PIPE_W, p.gapY);
      ctx.fillRect(p.x, p.gapY + GAP, PIPE_W, H - (p.gapY + GAP));
    }

    if (state !== STATE.MENU) drawTart(tart.x, tart.y, tart.r);

    // 점수
    ctx.fillStyle = "#5b3a29";
    ctx.font = "bold 28px system-ui, sans-serif";
    ctx.textAlign = "center";
    if (state === STATE.PLAY) ctx.fillText(String(score), W / 2, 48);

    if (state === STATE.MENU) {
      centerText("🥧 Tart Flap", 30, H / 2 - 40, "#5b3a29");
      centerText("탭 / 스페이스로 시작", 16, H / 2, "#8a6a52");
      centerText("최고 점수 " + best, 14, H / 2 + 28, "#8a6a52");
    }

    if (state === STATE.OVER) {
      overlay();
      centerText("게임 오버", 26, H / 2 - 70, "#fff");
      centerText("점수 " + score + "  ·  최고 " + best, 15, H / 2 - 42, "#f0d9c7");
      button(reviveBtn(), usedRevive ? "이어하기(사용됨)" : "🍬 이어하기");
      button(menuBtn(), "메인으로");
    }
  }

  function centerText(t, size, y, color) {
    ctx.fillStyle = color;
    ctx.font = "bold " + size + "px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(t, W / 2, y);
  }

  function overlay() {
    ctx.fillStyle = "rgba(20,12,10,.72)";
    ctx.fillRect(0, 0, W, H);
  }

  function reviveBtn() {
    return { x: W / 2 - 90, y: H / 2 - 20, w: 180, h: 44 };
  }
  function menuBtn() {
    return { x: W / 2 - 90, y: H / 2 + 36, w: 180, h: 44 };
  }
  function button(b, label) {
    ctx.fillStyle = "#c2185b";
    roundRect(b.x, b.y, b.w, b.h, 12);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 + 6);
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function hit(b, x, y) {
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  }

  // --- 입력 ---
  function pointer(x, y) {
    if (paused) return;
    if (state === STATE.OVER) {
      if (!usedRevive && hit(reviveBtn(), x, y)) return requestRevive();
      if (hit(menuBtn(), x, y)) return requestMenu();
      return;
    }
    flap();
  }

  function relPos(e) {
    var rect = canvas.getBoundingClientRect();
    var cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    var cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return { x: (cx / rect.width) * W, y: (cy / rect.height) * H };
  }

  canvas.addEventListener("mousedown", function (e) {
    var p = relPos(e);
    pointer(p.x, p.y);
  });
  canvas.addEventListener(
    "touchstart",
    function (e) {
      e.preventDefault();
      var p = relPos(e);
      pointer(p.x, p.y);
    },
    { passive: false }
  );
  window.addEventListener("keydown", function (e) {
    if (e.code === "Space" || e.code === "ArrowUp") {
      e.preventDefault();
      if (!paused && state !== STATE.OVER) flap();
    }
  });

  // --- 루프 ---
  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }
  reset();
  state = STATE.MENU;
  loop();
})();
