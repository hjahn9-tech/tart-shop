// 메인 게임: 타이틀 → 항해(바다) → 섬 탐험
(() => {
  const canvas = document.getElementById('game');
  const g = canvas.getContext('2d');
  const SCALE = 3;
  const VW = canvas.width / SCALE;   // 384
  const VH = canvas.height / SCALE;  // 256
  const S = Sprites, W = World, TILE = W.TILE;

  // ---------- 입력 ----------
  const keys = {};
  let spacePressed = false;
  window.addEventListener('keydown', e => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
    if (e.key === ' ' && !keys[' ']) spacePressed = true;
    keys[e.key] = true;
    if (e.key.length === 1) keys[e.key.toLowerCase()] = true;
    if (e.key === 'm' || e.key === 'M' || e.key === 'ㅡ') Music.toggle();
    if (e.key === 'c' || e.key === 'C' || e.key === 'ㅊ') bookOpen = !bookOpen;
    if (e.key === 'Escape') bookOpen = false;
  });
  window.addEventListener('keyup', e => {
    keys[e.key] = false;
    if (e.key.length === 1) keys[e.key.toLowerCase()] = false;
  });
  const axis = () => {
    if (joy.id !== null) {
      const m = Math.hypot(joy.dx, joy.dy);
      if (m > 0.25) { const c = Math.min(1, m); return { dx: joy.dx / m * c, dy: joy.dy / m * c }; }
    }
    let dx = 0, dy = 0;
    if (keys.ArrowLeft || keys.a || keys['ㅁ']) dx -= 1;
    if (keys.ArrowRight || keys.d || keys['ㅇ']) dx += 1;
    if (keys.ArrowUp || keys.w || keys['ㅈ']) dy -= 1;
    if (keys.ArrowDown || keys.s || keys['ㄴ']) dy += 1;
    if (dx && dy) { dx *= 0.707; dy *= 0.707; }
    return { dx, dy };
  };

  // ---------- 터치 조작 (모바일) ----------
  const touchOn = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const joy = { id: null, bx: 0, by: 0, dx: 0, dy: 0 };
  const BTNS = [
    { id: 'act',   label: '조사', x: 1060, y: 618, r: 48 },
    { id: 'raft',  label: 'R',   x: 950,  y: 684, r: 34 },
    { id: 'music', label: '♪',   x: 950,  y: 544, r: 30 },
    { id: 'book',  label: '도감', x: 1060, y: 478, r: 30 },
  ];
  function canvasPos(t) {
    const r = canvas.getBoundingClientRect();
    return { x: (t.clientX - r.left) * canvas.width / r.width,
             y: (t.clientY - r.top) * canvas.height / r.height };
  }
  if (touchOn) {
    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const p = canvasPos(t);
        const b = BTNS.find(b => Math.hypot(b.x - p.x, b.y - p.y) < b.r + 12);
        if (b) {
          if (b.id === 'act') spacePressed = true;
          else if (b.id === 'raft') touchR = true;
          else if (b.id === 'music') Music.toggle();
          else if (b.id === 'book') bookOpen = !bookOpen;
        } else if (state === 'title') {
          spacePressed = true;
        } else if (joy.id === null) {
          joy.id = t.identifier; joy.bx = p.x; joy.by = p.y; joy.dx = 0; joy.dy = 0;
        }
      }
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier !== joy.id) continue;
        const p = canvasPos(t);
        joy.dx = Math.max(-1, Math.min(1, (p.x - joy.bx) / 70));
        joy.dy = Math.max(-1, Math.min(1, (p.y - joy.by) / 70));
      }
    }, { passive: false });
    const touchEnd = e => {
      for (const t of e.changedTouches)
        if (t.identifier === joy.id) { joy.id = null; joy.dx = 0; joy.dy = 0; }
    };
    canvas.addEventListener('touchend', touchEnd);
    canvas.addEventListener('touchcancel', touchEnd);
  }

  // ---------- 사운드 (WebAudio 삑삑이) ----------
  let audio = null;
  function beep(freq, dur = 0.09, type = 'triangle', vol = 0.15, delay = 0) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = audio.currentTime + delay;
      const o = audio.createOscillator(), gn = audio.createGain();
      o.type = type; o.frequency.value = freq;
      gn.gain.setValueAtTime(vol, t0);
      gn.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(gn); gn.connect(audio.destination);
      o.start(t0); o.stop(t0 + dur);
    } catch (e) {}
  }
  const sfx = {
    pickup:  () => beep(880, 0.08),
    catch:   () => { beep(660, 0.06); beep(990, 0.08, 'triangle', 0.15, 0.06); },
    land:    () => { beep(440, 0.1); beep(550, 0.12, 'triangle', 0.15, 0.09); },
    sail:    () => beep(330, 0.12, 'sine'),
    complete:() => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.14, 'triangle', 0.18, i * 0.11)),
    fire:    () => beep(220, 0.25, 'sawtooth', 0.1),
  };

  // ---------- 저장 ----------
  const SAVE_KEY = 'castaway-isles-save';
  let completed = new Set();
  let raft = { x: 90, y: W.MAP_H / 2 };
  function save() {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      completed: [...completed], raft: { x: raft.x, y: raft.y },
    }));
  }
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (d) { completed = new Set(d.completed); raft.x = d.raft.x; raft.y = d.raft.y; }
    } catch (e) {}
  }
  load();

  // ---------- 상태 ----------
  let state = 'title';        // title | sail | island
  let tick = 0;
  let banner = null;          // {text, t, sub}
  let particles = [];
  let bookOpen = false;       // 도감 패널
  let touchR = false;         // 터치 R버튼 (프레임마다 소비)
  let adPending = false;      // 광고 연동 (Tart Shop AFG): 퀘스트 완료 → 출항 시 전면 광고
  const islandCache = {};     // idx -> 생성된 섬 (세션 내 진행상황 유지)

  let isle = null;            // 현재 섬 데이터
  let player = { x: 0, y: 0, dir: 'down', moving: false, collected: 0, done: false };

  function showBanner(text, sub = '', dur = 150) { banner = { text, sub, t: dur }; }

  function burst(x, y, colors) {
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2, sp = 0.5 + Math.random() * 1.5;
      particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.6,
                       t: 40 + Math.random() * 30, c: colors[i % colors.length] });
    }
  }

  // ---------- 항해 모드 ----------
  let nearIsland = null;
  function updateSail() {
    const { dx, dy } = axis();
    const spd = 2.2;
    raft.x = Math.max(20, Math.min(W.MAP_W - 20, raft.x + dx * spd));
    raft.y = Math.max(20, Math.min(W.MAP_H - 20, raft.y + dy * spd));
    if (dx) raft.flip = dx < 0;

    // 섬에 못 올라가게 밀어내기 + 근접 감지
    nearIsland = null;
    for (const isl of W.islands) {
      const d = Math.hypot(raft.x - isl.x, raft.y - isl.y);
      if (d < isl.r + 6) {
        const a = Math.atan2(raft.y - isl.y, raft.x - isl.x);
        raft.x = isl.x + Math.cos(a) * (isl.r + 6);
        raft.y = isl.y + Math.sin(a) * (isl.r + 6);
      }
      if (d < isl.r + 34) nearIsland = isl;
    }

    if (spacePressed && nearIsland) {
      landOn(nearIsland);
    }
  }

  function landOn(meta) {
    if (!islandCache[meta.idx]) islandCache[meta.idx] = W.generateIsland(meta);
    isle = islandCache[meta.idx];
    player.x = isle.spawn.x; player.y = isle.spawn.y;
    player.dir = 'up'; player.moving = false;
    player.collected = isle.items.filter(it => it.taken).length;
    player.done = completed.has(meta.idx);
    state = 'island';
    sfx.land();
    Music.play('island');
    const q = meta.quest;
    if (player.done) showBanner(meta.name, '이미 퀘스트를 완료한 섬이에요 ✔', 130);
    else showBanner(meta.name + '에 상륙!', `퀘스트: ${q.item} ${q.count}개 ${q.action}`, 200);
  }

  function leaveIsland() {
    // 섬 바로 아래에서 다시 항해 시작
    const meta = isle.meta;
    const a = Math.PI / 2; // 남쪽
    raft.x = meta.x + Math.cos(a) * (meta.r + 14);
    raft.y = meta.y + Math.sin(a) * (meta.r + 14);
    state = 'sail';
    isle = null;
    sfx.sail();
    Music.play('sail');
    save();
    // 광고 연동 (Tart Shop AFG): 방금 퀘스트를 완료한 섬을 떠날 때만 전면 광고
    if (adPending) {
      adPending = false;
      if (window.AFG) window.AFG.interstitial({ name: 'castaway_island_done' });
    }
  }

  // ---------- 섬 모드 ----------
  function tileAt(px, py) {
    const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
    if (tx < 0 || ty < 0 || tx >= isle.W || ty >= isle.H) return W.T_DEEP;
    return isle.tiles[ty][tx];
  }
  const walkable = (px, py) => tileAt(px, py) !== W.T_DEEP;

  function tryMove(nx, ny) {
    // 발 위치 기준 충돌 (스프라이트 하단)
    if (!walkable(nx, ny + 6)) return false;
    for (const s of isle.solids) {
      if (Math.hypot(s.x - nx, s.y - (ny + 4)) < s.r + 4) return false;
    }
    return true;
  }

  function updateIsland() {
    const { dx, dy } = axis();
    const inWater = tileAt(player.x, player.y + 6) === W.T_SHALLOW;
    const spd = inWater ? 1.0 : 1.7;
    player.moving = !!(dx || dy);
    if (dx || dy) {
      if (Math.abs(dx) >= Math.abs(dy)) player.dir = dx < 0 ? 'left' : 'right';
      else player.dir = dy < 0 ? 'up' : 'down';
      const nx = player.x + dx * spd, ny = player.y + dy * spd;
      if (tryMove(nx, player.y)) player.x = nx;
      if (tryMove(player.x, ny)) player.y = ny;
    }

    const q = isle.meta.quest;

    // 게 움직임
    for (const it of isle.items) {
      if (it.type !== 'crab' || it.taken) continue;
      it.t--;
      if (it.t <= 0) {
        it.t = 40 + Math.random() * 60;
        const a = Math.random() * Math.PI * 2;
        it.vx = Math.cos(a) * 0.5; it.vy = Math.sin(a) * 0.5;
        if (Math.random() < 0.3) { it.vx = 0; it.vy = 0; }
      }
      const nx = it.x + it.vx, ny = it.y + it.vy;
      if (tileAt(nx, ny) === W.T_SAND) { it.x = nx; it.y = ny; }
      else { it.vx *= -1; it.vy *= -1; }
    }

    // 아이템 획득
    if (!player.done) {
      for (const it of isle.items) {
        if (it.taken) continue;
        const d = Math.hypot(it.x - player.x, it.y - (player.y + 4));
        if (it.type === 'treasure') {
          if (d < 14 && spacePressed) {
            it.taken = true; it.opened = true; player.collected++;
            sfx.catch(); burst(it.x, it.y, ['#ffca3a', '#fff6a8', '#ff8c42']);
          }
        } else if (d < 10) {
          it.taken = true; player.collected++;
          it.type === 'crab' ? sfx.catch() : sfx.pickup();
          burst(it.x, it.y, ['#fff6a8', '#ffffff', '#7fd8be']);
        }
      }

      // 봉화: 장작 다 모으면 불 붙이기
      if (q.type === 'fire' && isle.firepit && !isle.firepit.lit) {
        const fp = isle.firepit;
        const d = Math.hypot(fp.x - player.x, fp.y - (player.y + 4));
        if (player.collected >= q.count && d < 14 && spacePressed) {
          fp.lit = true; sfx.fire();
          burst(fp.x, fp.y, ['#ff8c42', '#ffca3a', '#ff5d5d']);
        }
      }

      // 완료 판정
      const fireOk = q.type !== 'fire' || (isle.firepit && isle.firepit.lit);
      if (player.collected >= q.count && fireOk) {
        player.done = true;
        completed.add(isle.meta.idx);
        adPending = true;
        save();
        sfx.complete();
        burst(player.x, player.y - 8, ['#ffca3a', '#ff5d8f', '#4a80e8', '#5ed47f']);
        const total = completed.size;
        showBanner('🎉 퀘스트 완료!', total >= W.ISLAND_COUNT
          ? '모든 섬을 정복했어요!! 🏆'
          : `${total} / ${W.ISLAND_COUNT} 섬 완료 — R키로 바다로 나가요`, 240);
      }
    }

    // 뗏목으로 복귀
    const nearRaft = Math.hypot(isle.raftPos.x - player.x, isle.raftPos.y - player.y) < 16;
    if (keys.r || keys['ㄱ'] || touchR || (nearRaft && spacePressed)) leaveIsland();
  }

  // ---------- 그리기: 공통 ----------
  function drawWater(camX, camY, w, h) {
    const f = Math.floor(tick / 30) % 2;
    const tile = f ? S.tiles.deepB : S.tiles.deepA;
    const x0 = Math.floor(camX / TILE), y0 = Math.floor(camY / TILE);
    for (let y = y0; y <= y0 + h / TILE + 1; y++)
      for (let x = x0; x <= x0 + w / TILE + 1; x++)
        g.drawImage(tile, x * TILE - camX, y * TILE - camY);
  }

  function drawGirl(x, y) {
    const frame = player.moving ? Math.floor(tick / 8) % 2 : 0;
    const bob = player.moving && frame ? 1 : 0;
    let spr, flip = false;
    if (player.dir === 'down') spr = S.girl.down[frame];
    else if (player.dir === 'up') spr = S.girl.up[frame];
    else { spr = S.girl.side[frame]; flip = player.dir === 'right'; }
    g.save();
    if (flip) { g.translate(x + 6, 0); g.scale(-1, 1); g.translate(-(x + 6), 0); }
    g.drawImage(spr, Math.round(x - 6), Math.round(y - 12 + bob));
    g.restore();
  }

  const ITEM_SPR = {
    coconut: () => S.coconut, shell: () => S.shell, flower: () => S.flower,
    starfish: () => S.starfish, bottle: () => S.bottle, crab: () => S.crab,
    wood: () => S.wood,
    treasure: it => (it.opened ? S.chestOpen : S.chest),
  };

  // ---------- 그리기: 항해 ----------
  function drawSail() {
    const camX = Math.max(0, Math.min(W.MAP_W - VW, raft.x - VW / 2));
    const camY = Math.max(0, Math.min(W.MAP_H - VH, raft.y - VH / 2));
    drawWater(camX, camY, VW, VH);

    // 섬들
    const grassCols = ['#4cc95e', '#3bb04c', '#5ed47f'];
    for (const isl of W.islands) {
      const sx = isl.x - camX, sy = isl.y - camY;
      if (sx < -60 || sy < -60 || sx > VW + 60 || sy > VH + 60) continue;
      // 얕은 물 링 → 모래 → 풀
      g.fillStyle = '#3ec6e0';
      blob(sx, sy, isl.r + 8, isl.idx);
      g.fillStyle = '#f7e08c';
      blob(sx, sy, isl.r, isl.idx);
      g.fillStyle = grassCols[isl.hue];
      blob(sx, sy, isl.r * 0.62, isl.idx);
      // 야자수 + 완료 깃발
      g.drawImage(S.palm, sx - 12, sy - isl.r * 0.55 - 14);
      if (completed.has(isl.idx)) g.drawImage(S.flag, sx + 4, sy - isl.r * 0.55 - 10);
    }

    // 갈매기
    for (let i = 0; i < 4; i++) {
      const gx = ((i * 700 + tick * (0.4 + i * 0.1)) % (W.MAP_W + 100)) - 50 - camX;
      const gy = 100 + i * 300 + Math.sin(tick / 40 + i) * 15 - camY;
      if (gx > -10 && gx < VW + 10 && gy > -10 && gy < VH + 10) g.drawImage(S.seagull, gx, gy);
    }

    // 뗏목
    g.save();
    const bobY = Math.sin(tick / 25) * 1.5;
    if (raft.flip) { g.translate(raft.x - camX, 0); g.scale(-1, 1); g.translate(-(raft.x - camX), 0); }
    g.drawImage(S.raft, raft.x - 9 - camX, raft.y - 8 - camY + bobY);
    g.restore();
    drawGirlOnRaft(raft.x - camX, raft.y - camY + bobY);

    drawParticles(camX, camY);
  }

  function drawGirlOnRaft(x, y) {
    g.drawImage(S.girl.down[0], x - 4, y - 14, 8, 11);
  }

  // 씨드 고정 blob (원 + 울퉁불퉁)
  function blob(x, y, r, seed) {
    g.beginPath();
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const rr = r * (1 + 0.12 * Math.sin(3 * a + seed) + 0.06 * Math.sin(7 * a + seed * 2));
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.82;
      i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
    }
    g.closePath(); g.fill();
  }

  // ---------- 그리기: 섬 ----------
  function drawIsland() {
    const mw = isle.W * TILE, mh = isle.H * TILE;
    const camX = Math.max(0, Math.min(mw - VW, player.x - VW / 2));
    const camY = Math.max(0, Math.min(mh - VH, player.y - VH / 2));

    const f = Math.floor(tick / 30) % 2;
    const tileImg = [
      f ? S.tiles.deepB : S.tiles.deepA,
      f ? S.tiles.shallowB : S.tiles.shallowA,
      S.tiles.sand, S.tiles.grass, S.tiles.grassDk,
    ];
    const x0 = Math.floor(camX / TILE), y0 = Math.floor(camY / TILE);
    for (let y = y0; y <= Math.min(isle.H - 1, y0 + VH / TILE + 1); y++)
      for (let x = x0; x <= Math.min(isle.W - 1, x0 + VW / TILE + 1); x++)
        g.drawImage(tileImg[isle.tiles[y][x]], x * TILE - camX, y * TILE - camY);

    // 풀 장식
    for (const d of isle.decos) g.drawImage(S.tuft, d.x - 3 - camX, d.y - 1 - camY);

    // 뗏목 (복귀 지점)
    g.drawImage(S.raftParked, isle.raftPos.x - 7 - camX, isle.raftPos.y - 2 - camY);

    // 봉화
    if (isle.firepit) {
      const fp = isle.firepit;
      g.drawImage(fp.lit ? S.fireLit : S.firepit, fp.x - 5 - camX, fp.y - (fp.lit ? 6 : 3) - camY);
    }

    // y 정렬해서 그리기 (플레이어 + 나무/바위 + 아이템)
    const drawList = [];
    for (const s of isle.solids) drawList.push({ y: s.y, fn: () => g.drawImage(S[s.spr], s.x + s.ox - camX, s.y + s.oy - camY) });
    for (const it of isle.items) {
      if (it.taken && it.type !== 'treasure') continue;
      if (it.taken && it.type === 'treasure' && !it.opened) continue;
      const spr = ITEM_SPR[it.type](it);
      const bobY = it.type === 'crab' ? 0 : Math.sin(tick / 20 + it.x) * 1;
      drawList.push({ y: it.y, fn: () => {
        g.drawImage(spr, it.x - spr.width / 2 - camX, it.y - spr.height / 2 - camY + bobY);
        if (!it.taken && (it.type === 'treasure' || it.type === 'bottle') && Math.floor(tick / 20) % 2)
          g.drawImage(S.sparkle, it.x - 2 - camX, it.y - 12 - camY);
      }});
    }
    drawList.push({ y: player.y + 4, fn: () => drawGirl(player.x - camX, player.y - camY) });
    drawList.sort((a, b) => a.y - b.y);
    for (const d of drawList) d.fn();

    drawParticles(camX, camY);
  }

  function drawParticles(camX, camY) {
    for (const p of particles) {
      g.fillStyle = p.c;
      g.fillRect(Math.round(p.x - camX), Math.round(p.y - camY), 2, 2);
    }
  }

  // ---------- HUD (원본 해상도로 또렷하게) ----------
  function text(str, x, y, size = 16, color = '#fff', align = 'left', outline = true) {
    g.font = `bold ${size}px 'Apple SD Gothic Neo', sans-serif`;
    g.textAlign = align;
    if (outline) {
      g.lineWidth = Math.max(3, size / 5);
      g.strokeStyle = 'rgba(20,30,60,0.85)';
      g.strokeText(str, x, y);
    }
    g.fillStyle = color;
    g.fillText(str, x, y);
  }

  function roundRect(x, y, w, h, r, fill) {
    g.fillStyle = fill;
    g.beginPath();
    g.roundRect(x, y, w, h, r);
    g.fill();
  }

  function drawHUD() {
    const CW = canvas.width, CH = canvas.height;

    // 진행도
    roundRect(14, 14, 150, 40, 10, 'rgba(20,30,60,0.72)');
    text(`⭐ ${completed.size} / ${W.ISLAND_COUNT}`, 32, 42, 22, '#ffca3a', 'left', false);

    if (state === 'sail') {
      // 미니맵
      const MW = 170, MH = 96, mx = CW - MW - 14, my = 14;
      roundRect(mx, my, MW, MH, 8, 'rgba(20,30,60,0.72)');
      for (const isl of W.islands) {
        const px = mx + 6 + (isl.x / W.MAP_W) * (MW - 12);
        const py = my + 6 + (isl.y / W.MAP_H) * (MH - 12);
        g.fillStyle = completed.has(isl.idx) ? '#ffca3a' : '#5ed47f';
        g.fillRect(px - 2, py - 2, 4, 4);
      }
      const rx = mx + 6 + (raft.x / W.MAP_W) * (MW - 12);
      const ry = my + 6 + (raft.y / W.MAP_H) * (MH - 12);
      g.fillStyle = '#fff';
      g.fillRect(rx - 2, ry - 2, 5, 5);

      if (nearIsland) {
        const done = completed.has(nearIsland.idx);
        const q = nearIsland.quest;
        roundRect(CW / 2 - 260, CH - 96, 520, 74, 12, 'rgba(20,30,60,0.8)');
        text(`${done ? '✔ ' : ''}${nearIsland.name}`, CW / 2, CH - 64, 24, done ? '#ffca3a' : '#fff', 'center', false);
        text(done ? '퀘스트 완료한 섬 — 다시 구경할 수 있어요 (SPACE)'
                  : `난이도 ${'★'.repeat(nearIsland.stars)} · ${q.item} ${q.count}개 ${q.action} — SPACE로 상륙!`,
             CW / 2, CH - 36, 17, '#a5ecf7', 'center', false);
      } else {
        text('←↑↓→ / WASD 항해  ·  섬 근처에서 SPACE 상륙  ·  C 도감  ·  M 음악', CW / 2, CH - 24, 16, 'rgba(255,255,255,0.85)', 'center');
      }
    }

    if (state === 'island' && isle) {
      const q = isle.meta.quest;
      // 퀘스트 카드
      roundRect(CW - 344, 14, 330, 66, 10, 'rgba(20,30,60,0.72)');
      text(isle.meta.name, CW - 328, 40, 18, '#a5ecf7', 'left', false);
      if (player.done) {
        text('✔ 퀘스트 완료!', CW - 328, 66, 18, '#ffca3a', 'left', false);
      } else if (q.type === 'fire' && player.collected >= q.count) {
        text('🔥 봉화에 가서 SPACE로 불 붙이기!', CW - 328, 66, 17, '#ff8c42', 'left', false);
      } else {
        text(`${q.item} ${q.action}  ${player.collected} / ${q.count}`, CW - 328, 66, 18, '#fff', 'left', false);
      }
      text('R / 뗏목에서 SPACE: 바다로  ·  보물상자는 SPACE로 열기  ·  C 도감', CW / 2, CH - 20, 15, 'rgba(255,255,255,0.8)', 'center');
    }

    // 터치 UI
    if (touchOn) {
      g.globalAlpha = 0.55;
      if (joy.id !== null) {
        g.strokeStyle = '#fff'; g.lineWidth = 3;
        g.beginPath(); g.arc(joy.bx, joy.by, 70, 0, 7); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.6)';
        g.beginPath(); g.arc(joy.bx + joy.dx * 70, joy.by + joy.dy * 70, 30, 0, 7); g.fill();
      }
      for (const b of BTNS) {
        roundRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2, b.r, 'rgba(20,30,60,0.6)');
        text(b.label, b.x, b.y + 7, b.id === 'act' ? 20 : 16, '#fff', 'center', false);
      }
      g.globalAlpha = 1;
    }

    // 배너
    if (banner) {
      const alpha = Math.min(1, banner.t / 30);
      g.globalAlpha = alpha;
      roundRect(CW / 2 - 280, CH / 2 - 150, 560, 92, 14, 'rgba(20,30,60,0.85)');
      text(banner.text, CW / 2, CH / 2 - 112, 30, '#ffca3a', 'center', false);
      if (banner.sub) text(banner.sub, CW / 2, CH / 2 - 78, 18, '#fff', 'center', false);
      g.globalAlpha = 1;
    }
  }

  // ---------- 도감 & 업적 ----------
  const QUEST_EMOJI = { coconut: '🥥', shell: '🐚', flower: '🌺', crab: '🦀',
                        starfish: '🌟', bottle: '💌', treasure: '💰', fire: '🔥' };
  const TYPE_ACH = {
    coconut: '코코넛 부자', shell: '조개 수집가', flower: '섬의 플로리스트', crab: '게 조련사',
    starfish: '불가사리 친구', bottle: '바다의 우체부', treasure: '보물 사냥꾼', fire: '봉화지기',
  };
  const ACHIEVEMENTS = [
    { name: '첫 발자국', desc: '첫 번째 섬 퀘스트 완료', test: () => completed.size >= 1 },
    { name: '초보 탐험가', desc: '섬 10개 완료', test: () => completed.size >= 10 },
    { name: '베테랑 항해사', desc: '섬 25개 완료', test: () => completed.size >= 25 },
    { name: '무인도 마스터', desc: '50개 섬 모두 완료', test: () => completed.size >= 50 },
    ...Object.entries(TYPE_ACH).map(([type, name]) => ({
      name, desc: `${QUEST_EMOJI[type]} 퀘스트 섬 전부 완료`,
      test: () => {
        const list = W.islands.filter(i => i.quest.type === type);
        return list.length > 0 && list.every(i => completed.has(i.idx));
      },
    })),
  ];

  function drawBook() {
    const CW = canvas.width, CH = canvas.height;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = 'rgba(8,14,34,0.8)'; g.fillRect(0, 0, CW, CH);
    roundRect(140, 44, CW - 280, CH - 88, 16, 'rgba(26,37,71,0.96)');
    text('📖 탐험 도감', CW / 2, 92, 30, '#ffca3a', 'center', false);
    text(`완료한 섬 ${completed.size} / ${W.ISLAND_COUNT}`, CW / 2, 122, 16, '#a5ecf7', 'center', false);

    const cellW = 58, cellH = 44, gx0 = CW / 2 - cellW * 5, gy0 = 140;
    for (const isl of W.islands) {
      const cx = gx0 + (isl.idx % 10) * cellW, cy = gy0 + Math.floor(isl.idx / 10) * cellH;
      const done = completed.has(isl.idx);
      roundRect(cx + 3, cy + 3, cellW - 6, cellH - 6, 8,
                done ? 'rgba(255,202,58,0.28)' : 'rgba(255,255,255,0.07)');
      g.globalAlpha = done ? 1 : 0.45;
      text(QUEST_EMOJI[isl.quest.type], cx + cellW / 2, cy + cellH / 2 + 8, 20, '#fff', 'center', false);
      g.globalAlpha = 1;
      if (done) text('✔', cx + cellW - 12, cy + 16, 13, '#ffca3a', 'center', false);
    }

    const ay = gy0 + 5 * cellH + 34;
    text('🏅 업적', CW / 2, ay, 20, '#ffca3a', 'center', false);
    ACHIEVEMENTS.forEach((a, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const ax = CW / 2 + (col === 0 ? -400 : 30), ayy = ay + 32 + row * 30;
      const ok = a.test();
      text(`${ok ? '🏅' : '🔒'} ${a.name} — ${a.desc}`, ax, ayy, 15,
           ok ? '#ffca3a' : 'rgba(255,255,255,0.45)', 'left', false);
    });
    text('C 또는 ESC로 닫기', CW / 2, CH - 62, 14, 'rgba(255,255,255,0.6)', 'center', false);
  }

  // ---------- 타이틀 ----------
  function drawTitle() {
    g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    drawWater(tick * 0.3 % 100, 0, VW, VH);
    // 떠다니는 섬 장식
    g.fillStyle = '#f7e08c'; blob(VW / 2, VH / 2 + 62, 46, 3);
    g.fillStyle = '#4cc95e'; blob(VW / 2, VH / 2 + 62, 30, 3);
    g.drawImage(S.palm, VW / 2 - 26, VH / 2 + 18);
    g.drawImage(S.girl.down[Math.floor(tick / 30) % 2], VW / 2 + 6, VH / 2 + 30);
    g.drawImage(S.crab, VW / 2 - 4, VH / 2 + 52);
    g.drawImage(S.seagull, VW / 2 - 60 + Math.sin(tick / 50) * 20, VH / 2 - 60);
    g.drawImage(S.seagull, VW / 2 + 50 + Math.cos(tick / 40) * 15, VH / 2 - 75);

    g.setTransform(1, 0, 0, 1, 0, 0);
    const CW = canvas.width, CH = canvas.height;
    text('아일라의 무인도 대모험', CW / 2, CH / 2 - 90, 52, '#ffca3a', 'center');
    text('~ 50개의 섬을 탐험하라! ~', CW / 2, CH / 2 - 40, 22, '#a5ecf7', 'center');
    if (Math.floor(tick / 35) % 2) text(touchOn ? '화면을 터치해서 출항!' : 'SPACE 키를 눌러 출항!', CW / 2, CH - 100, 26, '#fff', 'center');
    if (completed.size > 0)
      text(`이어하기 · ⭐ ${completed.size}/${W.ISLAND_COUNT} 완료`, CW / 2, CH - 60, 17, 'rgba(255,255,255,0.8)', 'center');
    text('이동: 방향키/WASD · 조사: SPACE · 뗏목 복귀: R · 도감: C · 음악: M', CW / 2, CH - 28, 15, 'rgba(255,255,255,0.6)', 'center');

    if (spacePressed && !bookOpen) { state = 'sail'; sfx.sail(); Music.play('sail'); }
  }

  // ---------- 메인 루프 ----------
  function frame() {
    tick++;
    g.imageSmoothingEnabled = false;

    if (banner && --banner.t <= 0) banner = null;
    for (const p of particles) { p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.t--; }
    particles = particles.filter(p => p.t > 0);

    if (state === 'title') {
      drawTitle();
    } else {
      if (!bookOpen) {
        if (state === 'sail') updateSail();
        else if (state === 'island') updateIsland();
      }

      g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
      if (state === 'sail') drawSail();
      else if (state === 'island') drawIsland();

      g.setTransform(1, 0, 0, 1, 0, 0);
      drawHUD();
    }
    if (bookOpen) drawBook();

    spacePressed = false;
    touchR = false;
    requestAnimationFrame(frame);
  }
  frame();
})();
