/* Choco Blocks — 초콜릿 테트리스 (Tart Shop) */
(function () {
  "use strict";

  // ---------- 순수 로직 (DOM 무관 — 하단 self-check에서 검증) ----------
  var COLS = 10,
    ROWS = 20;

  var PIECES = {
    I: { size: 4, cells: [[0, 1], [1, 1], [2, 1], [3, 1]], color: "#ead9bf" }, // 화이트초코
    O: { size: 2, cells: [[0, 0], [1, 0], [0, 1], [1, 1]], color: "#c98f3f" }, // 카라멜
    T: { size: 3, cells: [[1, 0], [0, 1], [1, 1], [2, 1]], color: "#c9707f" }, // 딸기초코
    S: { size: 3, cells: [[1, 0], [2, 0], [0, 1], [1, 1]], color: "#8a9b55" }, // 말차초코
    Z: { size: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]], color: "#46281a" }, // 다크초코
    J: { size: 3, cells: [[0, 0], [0, 1], [1, 1], [2, 1]], color: "#8a5633" }, // 밀크초코
    L: { size: 3, cells: [[2, 0], [0, 1], [1, 1], [2, 1]], color: "#a9713a" }, // 헤이즐넛
  };

  function rotateCells(cells, size) {
    return cells.map(function (c) {
      return [size - 1 - c[1], c[0]];
    });
  }

  function collides(board, cells, px, py) {
    for (var i = 0; i < cells.length; i++) {
      var x = px + cells[i][0],
        y = py + cells[i][1];
      if (x < 0 || x >= COLS || y >= ROWS) return true;
      if (y >= 0 && board[y][x]) return true;
    }
    return false;
  }

  function fullRows(board) {
    var rows = [];
    for (var y = 0; y < ROWS; y++) {
      if (
        board[y].every(function (v) {
          return v;
        })
      )
        rows.push(y);
    }
    return rows;
  }

  function collapseRows(board, rows) {
    rows.forEach(function (y) {
      board.splice(y, 1);
      board.unshift(new Array(COLS).fill(null));
    });
  }

  function emptyBoard() {
    var b = [];
    for (var y = 0; y < ROWS; y++) b.push(new Array(COLS).fill(null));
    return b;
  }

  // ---------- self-check: `node game.js` 로 실행 시 ----------
  if (typeof document === "undefined") {
    var assert = function (cond, msg) {
      if (!cond) throw new Error("FAIL: " + msg);
    };
    // 회전 4번 = 원위치
    var c = PIECES.T.cells;
    for (var r = 0; r < 4; r++) c = rotateCells(c, 3);
    assert(
      JSON.stringify(c.slice().sort()) === JSON.stringify(PIECES.T.cells.slice().sort()),
      "rotate x4 identity"
    );
    // 충돌: 벽/바닥/블록
    var b = emptyBoard();
    assert(collides(b, PIECES.O.cells, -1, 0), "left wall");
    assert(collides(b, PIECES.O.cells, COLS - 1, 0), "right wall");
    assert(collides(b, PIECES.O.cells, 0, ROWS - 1), "floor");
    assert(!collides(b, PIECES.O.cells, 4, 0), "open space");
    b[5][4] = "#fff";
    assert(collides(b, PIECES.O.cells, 4, 4), "stacked block");
    // 줄 삭제
    b = emptyBoard();
    for (var x = 0; x < COLS; x++) b[ROWS - 1][x] = "#fff";
    b[ROWS - 2][0] = "#eee";
    var fr = fullRows(b);
    assert(fr.length === 1 && fr[0] === ROWS - 1, "one full row");
    collapseRows(b, fr);
    assert(b[ROWS - 1][0] === "#eee", "row above falls down");
    assert(fullRows(b).length === 0, "board cleared");
    console.log("choco-blocks self-check OK");
    return;
  }

  // ---------- 캔버스 / 레이아웃 ----------
  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = 360 * DPR;
  canvas.height = 540 * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  var CELL = 24;
  var BX = 12,
    BY = 30; // 보드 원점 (240x480)
  var PX = 264; // 우측 패널 x

  // ---------- 상태 ----------
  var STATE = { MENU: 0, PLAY: 1, OVER: 2 };
  var state = STATE.MENU;
  var board, cur, nextType, bag;
  var score, linesCleared, level;
  var dropTimer, flashRows, flashT;
  var paused = false,
    usedRevive = false;
  var best = parseInt(localStorage.getItem("chocoBlocksBest") || "0", 10);
  var menuBoard = null; // 메뉴 배경 장식용

  function drawBag() {
    if (!bag || !bag.length)
      bag = ["I", "O", "T", "S", "Z", "J", "L"].sort(function () {
        return Math.random() - 0.5;
      });
    return bag.pop();
  }

  function spawn() {
    var type = nextType || drawBag();
    nextType = drawBag();
    var p = PIECES[type];
    cur = {
      type: type,
      size: p.size,
      cells: p.cells,
      color: p.color,
      x: Math.floor((COLS - p.size) / 2),
      y: -1,
    };
    if (collides(board, cur.cells, cur.x, cur.y)) gameOver();
  }

  function reset() {
    board = emptyBoard();
    bag = [];
    nextType = null;
    score = 0;
    linesCleared = 0;
    level = 0;
    dropTimer = 0;
    flashRows = [];
    flashT = 0;
    usedRevive = false;
    spawn();
  }

  function gravityInterval() {
    return Math.max(0.12, 0.8 - level * 0.08);
  }

  // ---------- 조작 ----------
  function tryMove(dx) {
    if (!collides(board, cur.cells, cur.x + dx, cur.y)) {
      cur.x += dx;
      return true;
    }
    return false;
  }

  function tryRotate() {
    var rc = rotateCells(cur.cells, cur.size);
    var kicks = [0, -1, 1, -2, 2];
    for (var i = 0; i < kicks.length; i++) {
      if (!collides(board, rc, cur.x + kicks[i], cur.y)) {
        cur.cells = rc;
        cur.x += kicks[i];
        sndRotate();
        return;
      }
    }
  }

  function stepDown() {
    if (!collides(board, cur.cells, cur.x, cur.y + 1)) {
      cur.y += 1;
      return true;
    }
    lock();
    return false;
  }

  function hardDrop() {
    while (!collides(board, cur.cells, cur.x, cur.y + 1)) cur.y += 1;
    lock();
  }

  function ghostY() {
    var y = cur.y;
    while (!collides(board, cur.cells, cur.x, y + 1)) y += 1;
    return y;
  }

  function lock() {
    cur.cells.forEach(function (c) {
      var y = cur.y + c[1];
      if (y >= 0) board[y][cur.x + c[0]] = cur.color;
    });
    var rows = fullRows(board);
    if (rows.length) {
      flashRows = rows;
      flashT = 0.28;
      sndClear();
    } else {
      sndLock();
      spawn();
    }
  }

  function applyClear() {
    var n = flashRows.length;
    collapseRows(board, flashRows);
    flashRows = [];
    score += [0, 100, 300, 500, 800][n] * (level + 1);
    linesCleared += n;
    level = Math.floor(linesCleared / 10);
    spawn();
  }

  function gameOver() {
    state = STATE.OVER;
    sndOver();
    if (score > best) {
      best = score;
      localStorage.setItem("chocoBlocksBest", String(best));
    }
  }

  // ---------- 광고 (Tart Shop AFG) ----------
  function onBeforeAd() {
    paused = true;
  }
  function onAfterAd() {
    paused = false;
  }

  function revive() {
    // 리워드 시청 완료 → 보드만 싹 비우고 점수/레벨 유지한 채 계속
    board = emptyBoard();
    flashRows = [];
    flashT = 0;
    spawn();
    state = STATE.PLAY;
  }

  function requestRevive() {
    if (usedRevive || !window.AFG) return;
    usedRevive = true;
    window.AFG.rewarded({
      name: "chocoblocks_continue",
      onBeforeAd: onBeforeAd,
      onReward: revive,
      onAfterAd: onAfterAd,
      onDismiss: function () {
        usedRevive = false; // 시청 취소 시 다시 시도 가능
      },
    });
  }

  function requestRestart() {
    var go = function () {
      reset();
      state = STATE.PLAY;
    };
    if (!window.AFG) return go();
    window.AFG.interstitial({
      name: "chocoblocks_gameover",
      onBeforeAd: onBeforeAd,
      onAfterAd: function () {
        onAfterAd();
        go();
      },
    });
  }

  // ---------- 사운드 (절차적) ----------
  var AC = null;
  function initAudio() {
    if (AC) return;
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {}
  }
  function blip(freq, end, dur, type, vol) {
    if (!AC) return;
    try {
      var o = AC.createOscillator(),
        g = AC.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, AC.currentTime);
      o.frequency.exponentialRampToValueAtTime(end, AC.currentTime + dur);
      g.gain.setValueAtTime(vol, AC.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + dur);
      o.connect(g).connect(AC.destination);
      o.start();
      o.stop(AC.currentTime + dur);
    } catch (e) {}
  }
  function sndRotate() {
    blip(320, 400, 0.06, "square", 0.04);
  }
  function sndLock() {
    blip(180, 120, 0.08, "square", 0.05);
  }
  function sndClear() {
    blip(440, 880, 0.25, "triangle", 0.12);
  }
  function sndOver() {
    blip(300, 60, 0.6, "sawtooth", 0.12);
  }

  // ---------- 그리기 ----------
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawChoco(x, y, size, color, dim) {
    // 초콜릿 조각: 베이스 + 밝은 윗면 베벨 + 어두운 아랫면 + 가운데 홈
    ctx.globalAlpha = dim ? 0.35 : 1;
    ctx.fillStyle = color;
    roundRect(x + 1, y + 1, size - 2, size - 2, 4);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.22)";
    roundRect(x + 2, y + 2, size - 4, (size - 4) * 0.35, 3);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,.25)";
    roundRect(x + 3, y + size * 0.62, size - 6, size * 0.28, 3);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.35)";
    ctx.lineWidth = 1;
    roundRect(x + 1.5, y + 1.5, size - 3, size - 3, 4);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawBoard(b) {
    // 몰드(초콜릿 틀)
    ctx.fillStyle = "#311c0e";
    roundRect(BX - 6, BY - 6, COLS * CELL + 12, ROWS * CELL + 12, 10);
    ctx.fill();
    ctx.fillStyle = "#1d1007";
    ctx.fillRect(BX, BY, COLS * CELL, ROWS * CELL);
    ctx.strokeStyle = "rgba(255,235,205,.05)";
    ctx.lineWidth = 1;
    for (var x = 1; x < COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(BX + x * CELL, BY);
      ctx.lineTo(BX + x * CELL, BY + ROWS * CELL);
      ctx.stroke();
    }
    for (var y = 1; y < ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(BX, BY + y * CELL);
      ctx.lineTo(BX + COLS * CELL, BY + y * CELL);
      ctx.stroke();
    }
    for (y = 0; y < ROWS; y++)
      for (x = 0; x < COLS; x++)
        if (b[y][x]) drawChoco(BX + x * CELL, BY + y * CELL, CELL, b[y][x]);
  }

  function drawPieceAt(cells, color, px, py, size, dim) {
    cells.forEach(function (c) {
      var y = py + c[1];
      if (y >= 0) drawChoco(BX + (px + c[0]) * CELL, BY + y * CELL, CELL, color, dim);
    });
  }

  function drawPanel() {
    ctx.fillStyle = "#f5e9d9";
    ctx.textAlign = "left";
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.fillText("다음", PX, BY + 10);
    ctx.fillStyle = "#311c0e";
    roundRect(PX - 4, BY + 18, 84, 60, 8);
    ctx.fill();
    var p = PIECES[nextType];
    var mini = 14;
    var ox = PX - 4 + (84 - p.size * mini) / 2,
      oy = BY + 18 + (60 - 2 * mini) / 2 - (p.size === 2 ? 0 : mini * 0.5) + 7;
    p.cells.forEach(function (c) {
      drawChoco(ox + c[0] * mini, oy + c[1] * mini, mini, p.color);
    });

    function stat(label, val, y) {
      ctx.fillStyle = "#b89a7a";
      ctx.font = "10px system-ui, sans-serif";
      ctx.fillText(label, PX, y);
      ctx.fillStyle = "#f5e9d9";
      ctx.font = "bold 16px system-ui, sans-serif";
      ctx.fillText(String(val), PX, y + 18);
    }
    stat("점수", score, BY + 110);
    stat("줄", linesCleared, BY + 155);
    stat("레벨", level + 1, BY + 200);
    stat("최고", best, BY + 245);
  }

  // 캔버스 버튼
  var BTN = {
    start: { x: 90, y: 330, w: 180, h: 48, label: "시작" },
    revive: { x: 60, y: 300, w: 240, h: 46, label: "📺 광고 보고 이어하기" },
    restart: { x: 60, y: 358, w: 240, h: 46, label: "다시하기" },
  };

  function drawBtn(b, primary) {
    ctx.fillStyle = primary ? "#c98f3f" : "#5a3a22";
    roundRect(b.x, b.y, b.w, b.h, 12);
    ctx.fill();
    ctx.fillStyle = primary ? "#241309" : "#f5e9d9";
    ctx.font = "bold 15px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 5);
    ctx.textAlign = "left";
  }

  function inBtn(b, x, y) {
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  }

  function draw() {
    ctx.fillStyle = "#241309";
    ctx.fillRect(0, 0, 360, 540);

    if (state === STATE.MENU) {
      drawBoard(menuBoard);
      ctx.fillStyle = "rgba(20,10,4,.62)";
      ctx.fillRect(0, 0, 360, 540);
      ctx.textAlign = "center";
      ctx.font = "44px system-ui, sans-serif";
      ctx.fillText("🍫", 180, 165);
      ctx.fillStyle = "#f5e9d9";
      ctx.font = "bold 34px system-ui, sans-serif";
      ctx.fillText("Choco Blocks", 180, 215);
      ctx.fillStyle = "#b89a7a";
      ctx.font = "13px system-ui, sans-serif";
      ctx.fillText("추억의 블록 쌓기, 초콜릿 한 판", 180, 244);
      ctx.font = "12px system-ui, sans-serif";
      ctx.fillText("← → 이동 · ↑ 회전 · 스페이스 떨어뜨리기", 180, 282);
      ctx.fillText("모바일: 드래그 이동 · 탭 회전 · 아래로 휙 드롭", 180, 300);
      drawBtn(BTN.start, true);
      ctx.textAlign = "left";
      return;
    }

    drawBoard(board);
    if (state === STATE.PLAY && !flashRows.length) {
      drawPieceAt(cur.cells, cur.color, cur.x, ghostY(), cur.size, true);
      drawPieceAt(cur.cells, cur.color, cur.x, cur.y, cur.size, false);
    }
    if (flashRows.length && Math.floor(flashT * 20) % 2 === 0) {
      ctx.fillStyle = "rgba(255,240,210,.85)";
      flashRows.forEach(function (y) {
        ctx.fillRect(BX, BY + y * CELL, COLS * CELL, CELL);
      });
    }
    drawPanel();

    if (state === STATE.OVER) {
      ctx.fillStyle = "rgba(20,10,4,.75)";
      ctx.fillRect(0, 0, 360, 540);
      ctx.textAlign = "center";
      ctx.fillStyle = "#f5e9d9";
      ctx.font = "bold 30px system-ui, sans-serif";
      ctx.fillText("녹아버렸다…", 180, 180);
      ctx.fillStyle = "#b89a7a";
      ctx.font = "15px system-ui, sans-serif";
      ctx.fillText("점수 " + score + " · 줄 " + linesCleared + " · 최고 " + best, 180, 215);
      if (!usedRevive && window.AFG) drawBtn(BTN.revive, true);
      drawBtn(BTN.restart, false);
      ctx.textAlign = "left";
    }
  }

  // ---------- 업데이트 ----------
  function update(dt) {
    if (state !== STATE.PLAY || paused) return;
    if (flashT > 0) {
      flashT -= dt;
      if (flashT <= 0) applyClear();
      return;
    }
    dropTimer += dt;
    if (dropTimer >= gravityInterval()) {
      dropTimer = 0;
      stepDown();
    }
  }

  var last = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    var dt = Math.min((t - last) / 1000, 0.05);
    last = t;
    update(dt);
    draw();
  }

  // ---------- 입력 ----------
  function canvasPos(clientX, clientY) {
    var r = canvas.getBoundingClientRect();
    return { x: ((clientX - r.left) / r.width) * 360, y: ((clientY - r.top) / r.height) * 540 };
  }

  function pressAt(x, y) {
    initAudio();
    if (state === STATE.MENU) {
      if (inBtn(BTN.start, x, y)) {
        reset();
        state = STATE.PLAY;
      }
      return true;
    }
    if (state === STATE.OVER) {
      if (!usedRevive && window.AFG && inBtn(BTN.revive, x, y)) requestRevive();
      else if (inBtn(BTN.restart, x, y)) requestRestart();
      return true;
    }
    return false; // PLAY 중 — 호출부에서 회전 처리
  }

  canvas.addEventListener("mousedown", function (e) {
    var p = canvasPos(e.clientX, e.clientY);
    if (!pressAt(p.x, p.y) && state === STATE.PLAY && !paused) tryRotate();
  });

  document.addEventListener("keydown", function (e) {
    if (state !== STATE.PLAY || paused) {
      if (e.code === "Enter" && state === STATE.MENU) {
        initAudio();
        reset();
        state = STATE.PLAY;
      }
      return;
    }
    if (flashRows.length) return;
    if (e.code === "ArrowLeft") tryMove(-1);
    else if (e.code === "ArrowRight") tryMove(1);
    else if (e.code === "ArrowDown") {
      dropTimer = 0;
      stepDown();
    } else if (e.code === "ArrowUp" || e.code === "KeyX") tryRotate();
    else if (e.code === "Space") {
      e.preventDefault();
      hardDrop();
    }
  });

  // 터치: 가로 드래그 = 이동, 세로 드래그 = 소프트 드롭, 탭 = 회전, 아래로 휙 = 하드 드롭
  var touch = null;
  canvas.addEventListener(
    "touchstart",
    function (e) {
      e.preventDefault();
      var t = e.touches[0];
      var p = canvasPos(t.clientX, t.clientY);
      touch = { x0: p.x, y0: p.y, col0: cur ? cur.x : 0, movedX: 0, movedY: 0, t0: Date.now(), ui: false };
      if (state !== STATE.PLAY) {
        touch.ui = true;
        pressAt(p.x, p.y);
      }
    },
    { passive: false }
  );
  canvas.addEventListener(
    "touchmove",
    function (e) {
      e.preventDefault();
      if (!touch || touch.ui || state !== STATE.PLAY || paused || flashRows.length) return;
      var t = e.touches[0];
      var p = canvasPos(t.clientX, t.clientY);
      var dx = p.x - touch.x0,
        dy = p.y - touch.y0;
      touch.movedX = Math.max(touch.movedX, Math.abs(dx));
      touch.movedY = Math.max(touch.movedY, Math.abs(dy));
      // 가로: 시작 열 기준 목표 열까지 한 칸씩 (충돌 시 멈춤)
      var want = touch.col0 + Math.round(dx / CELL);
      while (cur.x < want && tryMove(1));
      while (cur.x > want && tryMove(-1));
      // 세로: 한 칸 끌 때마다 소프트 드롭
      if (dy > CELL) {
        touch.y0 = p.y;
        dropTimer = 0;
        stepDown();
      }
    },
    { passive: false }
  );
  canvas.addEventListener(
    "touchend",
    function (e) {
      e.preventDefault();
      if (!touch) return;
      var dt = Date.now() - touch.t0;
      var t = e.changedTouches[0];
      var p = canvasPos(t.clientX, t.clientY);
      var dy = p.y - touch.y0;
      if (!touch.ui && state === STATE.PLAY && !paused && !flashRows.length) {
        if (dt < 250 && dy > 70 && touch.movedY > touch.movedX) hardDrop();
        else if (dt < 300 && touch.movedX < 12 && touch.movedY < 12) tryRotate();
      }
      touch = null;
    },
    { passive: false }
  );

  // ---------- 시작 ----------
  menuBoard = emptyBoard();
  (function fillMenuBoard() {
    var colors = Object.keys(PIECES).map(function (k) {
      return PIECES[k].color;
    });
    for (var y = 12; y < ROWS; y++)
      for (var x = 0; x < COLS; x++)
        if (Math.random() < 0.8 - (ROWS - 1 - y) * 0.09)
          menuBoard[y][x] = colors[Math.floor(Math.random() * colors.length)];
  })();

  draw(); // 첫 페인트 (rAF가 늦거나 탭이 가려져 있어도 메뉴가 보이게)
  requestAnimationFrame(frame);
})();
