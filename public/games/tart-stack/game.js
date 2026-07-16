/*
 * Tart Stack — 원터치 쌓기 아케이드
 * 좌우로 움직이는 타르트를 탭으로 떨궈 아래 층과 겹치게 쌓는다.
 * 겹치지 않은 부분은 잘려 나가고, 완전히 빗나가면 게임 오버.
 * 광고 훅: game over에서 "이어하기"=리워드, "메인으로"=인터스티셜.
 */
(function () {
  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");
  var W = canvas.width;
  var H = canvas.height;

  var STATE = { MENU: 0, PLAY: 1, OVER: 2 };
  var state = STATE.MENU;
  var paused = false;
  var usedRevive = false;

  var BLOCK_H = 28;
  var START_W = 200;

  var stack, mover, score, best, speed, dir, cameraY;
  try {
    best = parseInt(localStorage.getItem("tartstack.best") || "0", 10) || 0;
  } catch (e) {
    best = 0;
  }

  function reset() {
    var baseX = (W - START_W) / 2;
    stack = [{ x: baseX, w: START_W, y: H - BLOCK_H }];
    score = 0;
    speed = 2.0;
    dir = 1;
    usedRevive = false;
    cameraY = 0;
    spawnMover();
  }

  function topBlock() {
    return stack[stack.length - 1];
  }

  function spawnMover() {
    var top = topBlock();
    mover = { x: 0, w: top.w, y: top.y - BLOCK_H };
    dir = 1;
  }

  function start() {
    state = STATE.PLAY;
    reset();
  }

  function drop() {
    var top = topBlock();
    var left = Math.max(mover.x, top.x);
    var right = Math.min(mover.x + mover.w, top.x + top.w);
    var overlap = right - left;

    if (overlap <= 0) {
      die();
      return;
    }
    // 겹친 부분만 남기고 쌓는다
    var placed = { x: left, w: overlap, y: mover.y };
    stack.push(placed);
    score += 1;
    if (score > best) {
      best = score;
      try {
        localStorage.setItem("tartstack.best", String(best));
      } catch (e) {}
    }
    speed = Math.min(5.5, speed + 0.12);
    spawnMover();
  }

  function die() {
    state = STATE.OVER;
  }

  // --- 광고 연동 ---
  function onBeforeAd() {
    paused = true;
  }
  function onAfterAd() {
    paused = false;
  }
  function revive() {
    // 넉넉한 폭으로 다시 시작 (마지막 층 위에 정렬)
    var top = topBlock();
    mover = { x: top.x, w: Math.max(top.w, 90), y: top.y - BLOCK_H };
    dir = 1;
    state = STATE.PLAY;
  }
  function requestRevive() {
    if (usedRevive || !window.AFG) return;
    usedRevive = true;
    window.AFG.rewarded({
      name: "tartstack_continue",
      onBeforeAd: onBeforeAd,
      onReward: revive,
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
      name: "tartstack_gameover",
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
    mover.x += speed * dir;
    if (mover.x <= 0) {
      mover.x = 0;
      dir = 1;
    } else if (mover.x + mover.w >= W) {
      mover.x = W - mover.w;
      dir = -1;
    }
    // 탑이 화면 위쪽 1/3에 닿으면 카메라를 위로 스크롤
    var targetTop = topBlock().y - BLOCK_H;
    var desired = Math.max(0, H / 3 - targetTop);
    cameraY += (desired - cameraY) * 0.12;
  }

  // --- 렌더 ---
  function drawBlock(b, isMover) {
    var y = b.y + cameraY;
    ctx.fillStyle = isMover ? "#d98a34" : "#e2b98f";
    roundRect(b.x, y, b.w, BLOCK_H - 4, 6);
    ctx.fill();
    // 필링 줄무늬
    ctx.fillStyle = "#b3164f";
    roundRect(b.x + 6, y + 6, Math.max(0, b.w - 12), 6, 3);
    ctx.fill();
  }

  function draw() {
    ctx.fillStyle = "#fff3e6";
    ctx.fillRect(0, 0, W, H);

    if (state !== STATE.MENU) {
      for (var i = 0; i < stack.length; i++) drawBlock(stack[i], false);
      if (state === STATE.PLAY) drawBlock(mover, true);
    }

    ctx.fillStyle = "#5b3a29";
    ctx.font = "bold 28px system-ui, sans-serif";
    ctx.textAlign = "center";
    if (state === STATE.PLAY) ctx.fillText(String(score), W / 2, 48);

    if (state === STATE.MENU) {
      centerText("🧁 Tart Stack", 30, H / 2 - 40, "#5b3a29");
      centerText("탭 / 스페이스로 시작", 16, H / 2, "#8a6a52");
      centerText("최고 " + best + "층", 14, H / 2 + 28, "#8a6a52");
    }

    if (state === STATE.OVER) {
      ctx.fillStyle = "rgba(20,12,10,.72)";
      ctx.fillRect(0, 0, W, H);
      centerText("게임 오버", 26, H / 2 - 70, "#fff");
      centerText(score + "층  ·  최고 " + best + "층", 15, H / 2 - 42, "#f0d9c7");
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
  function reviveBtn() {
    return { x: W / 2 - 90, y: H / 2 - 20, w: 180, h: 44 };
  }
  function menuBtn() {
    return { x: W / 2 - 90, y: H / 2 + 36, w: 180, h: 44 };
  }
  function button(b, label) {
    ctx.fillStyle = "#b3164f";
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
    if (state === STATE.MENU) return start();
    if (state === STATE.OVER) {
      if (!usedRevive && hit(reviveBtn(), x, y)) return requestRevive();
      if (hit(menuBtn(), x, y)) return requestMenu();
      return;
    }
    drop();
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
      if (paused) return;
      if (state === STATE.MENU) start();
      else if (state === STATE.PLAY) drop();
    }
  });

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }
  reset();
  state = STATE.MENU;
  loop();
})();
