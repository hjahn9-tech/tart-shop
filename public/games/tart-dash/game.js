/*
 * Tart Dash — 원터치 러너
 * 주방 조리대를 달리는 타르트. 탭/클릭/스페이스로 점프(2단 점프 가능),
 * 밀대·설탕통을 뛰어넘고 베리를 모은다. 오래 달릴수록 빨라진다.
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

  var GROUND = 440; // 조리대 윗면 y
  var GRAVITY = 0.52;
  var JUMP = -9.6;
  var MAX_JUMPS = 2;

  var tart, obstacles, berries, clouds, score, berriesGot, best;
  var speed, dist, nextSpawn, invincible, roll;
  try {
    best = parseInt(localStorage.getItem("tartdash.best") || "0", 10) || 0;
  } catch (e) {
    best = 0;
  }

  function reset() {
    tart = { x: 84, y: GROUND - 17, vy: 0, r: 17, jumps: 0 };
    obstacles = [];
    berries = [];
    clouds = [
      { x: 60, y: 90, s: 0.3 },
      { x: 220, y: 150, s: 0.45 },
      { x: 320, y: 60, s: 0.35 },
    ];
    score = 0;
    berriesGot = 0;
    dist = 0;
    roll = 0;
    speed = 3.0;
    nextSpawn = 90;
    invincible = 0;
    usedRevive = false;
  }

  // --- 장애물/베리 생성 ---
  function spawn() {
    var kind = Math.random();
    if (kind < 0.55) {
      // 밀대 (낮음 — 한 번 점프)
      obstacles.push({ type: "pin", x: W + 30, w: 46, h: 26 });
    } else if (kind < 0.85) {
      // 설탕통 (높음 — 2단 점프 권장)
      obstacles.push({ type: "jar", x: W + 30, w: 30, h: 52 });
    } else {
      // 밀대 2연속
      obstacles.push({ type: "pin", x: W + 30, w: 46, h: 26 });
      obstacles.push({ type: "pin", x: W + 30 + 110, w: 46, h: 26 });
    }
    // 장애물 뒤 하늘에 베리 아치를 가끔 놓는다
    if (Math.random() < 0.6) {
      var bx = W + 30 + 170 + Math.random() * 60;
      var by = GROUND - 90 - Math.random() * 70;
      for (var i = 0; i < 3; i++) berries.push({ x: bx + i * 26, y: by - Math.sin((i / 2) * Math.PI) * 18, r: 7 });
    }
    // 다음 생성 간격 (빨라질수록 촘촘히 느껴지지 않게 벌린다)
    nextSpawn = (170 + Math.random() * 130) * (speed / 3.0);
  }

  function jump() {
    if (state === STATE.MENU) {
      state = STATE.PLAY;
      reset();
      return;
    }
    if (state === STATE.PLAY && tart.jumps < MAX_JUMPS) {
      tart.vy = JUMP * (tart.jumps === 1 ? 0.88 : 1); // 2단 점프는 살짝 약하게
      tart.jumps += 1;
    }
  }

  function die() {
    state = STATE.OVER;
    if (score > best) {
      best = score;
      try {
        localStorage.setItem("tartdash.best", String(best));
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
    // 리워드 시청 완료 → 근처 장애물 제거 + 잠깐 무적으로 부활
    obstacles = obstacles.filter(function (o) {
      return o.x > tart.x + 220;
    });
    tart.y = GROUND - tart.r;
    tart.vy = 0;
    tart.jumps = 0;
    invincible = 90; // 약 1.5초
    state = STATE.PLAY;
  }

  function requestRevive() {
    if (usedRevive || !window.AFG) return;
    usedRevive = true;
    window.AFG.rewarded({
      name: "tartdash_continue",
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
      name: "tartdash_gameover",
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

    // 속도 램프 — 거리 기반으로 완만하게 (약 25초 뒤 최고속)
    speed = Math.min(7, 3.0 + dist * 0.0008);
    dist += speed;
    roll += speed / tart.r;
    score = Math.floor(dist / 8) + berriesGot * 5;
    if (invincible > 0) invincible -= 1;

    // 타르트 물리
    tart.vy += GRAVITY;
    tart.y += tart.vy;
    if (tart.y + tart.r >= GROUND) {
      tart.y = GROUND - tart.r;
      tart.vy = 0;
      tart.jumps = 0;
    }

    // 장애물
    nextSpawn -= speed;
    if (nextSpawn <= 0) spawn();
    for (var i = obstacles.length - 1; i >= 0; i--) {
      var o = obstacles[i];
      o.x -= speed;
      if (o.x + o.w < -20) {
        obstacles.splice(i, 1);
        continue;
      }
      // 원-사각 충돌
      if (invincible <= 0) {
        var cx = Math.max(o.x, Math.min(tart.x, o.x + o.w));
        var cy = Math.max(GROUND - o.h, Math.min(tart.y, GROUND));
        var dx = tart.x - cx;
        var dy = tart.y - cy;
        if (dx * dx + dy * dy < (tart.r - 2) * (tart.r - 2)) die();
      }
    }

    // 베리
    for (var j = berries.length - 1; j >= 0; j--) {
      var b = berries[j];
      b.x -= speed;
      if (b.x < -20) {
        berries.splice(j, 1);
        continue;
      }
      var bdx = tart.x - b.x;
      var bdy = tart.y - b.y;
      if (bdx * bdx + bdy * bdy < (tart.r + b.r) * (tart.r + b.r)) {
        berries.splice(j, 1);
        berriesGot += 1;
      }
    }

    // 밀가루 구름 (배경 패럴랙스)
    for (var k = 0; k < clouds.length; k++) {
      var c = clouds[k];
      c.x -= speed * c.s;
      if (c.x < -60) {
        c.x = W + 60;
        c.y = 50 + Math.random() * 120;
      }
    }
  }

  // --- 렌더 ---
  function drawTart(x, y, r, rot) {
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
    // 굴러가는 씨앗 점 (회전 표현)
    ctx.fillStyle = "#7a0f38";
    for (var i = 0; i < 3; i++) {
      var a = rot + (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r * 0.38, y + Math.sin(a) * r * 0.38, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    // 하이라이트
    ctx.fillStyle = "rgba(255,255,255,.55)";
    ctx.beginPath();
    ctx.arc(x - r * 0.28, y - r * 0.28, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawObstacle(o) {
    var y = GROUND - o.h;
    if (o.type === "pin") {
      // 밀대: 몸통 + 양쪽 손잡이
      ctx.fillStyle = "#b5794a";
      roundRect(o.x, y + 6, o.w, o.h - 6, 8);
      ctx.fill();
      ctx.fillStyle = "#8a5a34";
      roundRect(o.x - 8, y + 10, 10, 10, 4);
      ctx.fill();
      roundRect(o.x + o.w - 2, y + 10, 10, 10, 4);
      ctx.fill();
    } else {
      // 설탕통: 유리병 + 뚜껑
      ctx.fillStyle = "#dfeef2";
      roundRect(o.x, y + 8, o.w, o.h - 8, 6);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillRect(o.x + 4, y + 16, o.w - 8, o.h - 24);
      ctx.fillStyle = "#8a5a34";
      roundRect(o.x - 2, y, o.w + 4, 10, 4);
      ctx.fill();
    }
  }

  function draw() {
    // 배경 (주방 벽)
    ctx.fillStyle = "#fff3e6";
    ctx.fillRect(0, 0, W, H);

    // 오븐 창의 은은한 빛
    var g = ctx.createRadialGradient(W - 60, 120, 10, W - 60, 120, 160);
    g.addColorStop(0, "rgba(224,164,92,.25)");
    g.addColorStop(1, "rgba(224,164,92,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // 밀가루 구름
    ctx.fillStyle = "rgba(255,255,255,.8)";
    for (var k = 0; k < clouds.length; k++) {
      var c = clouds[k];
      ctx.beginPath();
      ctx.arc(c.x, c.y, 16, 0, Math.PI * 2);
      ctx.arc(c.x + 16, c.y + 4, 12, 0, Math.PI * 2);
      ctx.arc(c.x - 16, c.y + 5, 11, 0, Math.PI * 2);
      ctx.fill();
    }

    // 조리대
    ctx.fillStyle = "#b5794a";
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = "#8a5a34";
    ctx.fillRect(0, GROUND, W, 5);
    // 나뭇결 줄무늬 (달리는 느낌)
    ctx.fillStyle = "rgba(90,58,32,.35)";
    for (var s = 0; s < 6; s++) {
      var wx = ((s * 90 - (dist % 90)) + W) % (W + 90) - 45;
      ctx.fillRect(wx, GROUND + 18, 44, 4);
    }

    // 베리
    for (var j = 0; j < berries.length; j++) {
      var b = berries[j];
      ctx.fillStyle = "#c2185b";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3e7d3a";
      ctx.fillRect(b.x - 1.5, b.y - b.r - 4, 3, 5);
    }

    // 장애물
    for (var i = 0; i < obstacles.length; i++) drawObstacle(obstacles[i]);

    // 타르트 (무적이면 깜빡임)
    if (state !== STATE.MENU && (invincible <= 0 || Math.floor(invincible / 5) % 2 === 0)) {
      drawTart(tart.x, tart.y, tart.r, roll);
    }

    // 점수
    if (state === STATE.PLAY) {
      ctx.fillStyle = "#5b3a29";
      ctx.font = "bold 28px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(score), W / 2, 48);
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.fillStyle = "#8a6a52";
      ctx.fillText("🍓 " + berriesGot, W / 2, 70);
    }

    if (state === STATE.MENU) {
      drawTart(W / 2, GROUND - 17, 17, 0);
      centerText("🍓 Tart Dash", 30, H / 2 - 60, "#5b3a29");
      centerText("탭 / 스페이스로 점프 · 공중에서 한 번 더", 14, H / 2 - 20, "#8a6a52");
      centerText("탭해서 시작", 16, H / 2 + 12, "#8a6a52");
      centerText("최고 점수 " + best, 14, H / 2 + 40, "#8a6a52");
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
    jump();
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
      if (!paused && state !== STATE.OVER) jump();
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
