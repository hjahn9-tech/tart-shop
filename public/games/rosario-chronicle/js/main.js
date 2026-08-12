// ============================================================
// 검은 수녀단: 로사리오 크로니클 — 엔진 v0.2 "찐 MMORPG"
// KayKit GLB 캐릭터/애니메이션 · 낮밤 순환 · 몬스터 시야 어그로 ·
// 스킬 해금 · WebAudio 사운드 · MMO HUD
// ============================================================
import * as THREE from 'three';
import { CHARACTERS, FLOORS, LEVEL_XP, MAX_LEVEL, CASTLES, UPGRADES, CYCLE, CASTLE_DMG, MOVES, defaultMoves, layoutFor, RELICS, RELIC_SLOTS, BOSS_RELICS, BOSS_KITS } from './data.js';
import { loadAll, spawnModel, makeAnimator } from './assets.js';
import { createFog } from './fog.js';
import { initAudio, sfx, setNight } from './audio.js';
import * as ui from './ui.js';
import * as net from './net.js';

// ---- 코옵 브로드캐스트 헬퍼: 호스트면 게스트에게도 전달 ----
function netFx(o) {
  if (game.netP2 && net.state.peer) net.send({ t: 'fx', ...o });
}
function coopToast(...a) { ui.toast(...a); netFx({ k: 'toast', a }); }
function coopLog(...a) { ui.log(...a); netFx({ k: 'log', a }); }
function coopFlash() { ui.goldFlash(); netFx({ k: 'flash' }); }

const ARENA = 21;
const DAY_LEN = 150;           // 낮밤 한 사이클 (초)
const MODEL_YAW = 0;           // 모델 전방 보정
const $ = (id) => document.getElementById(id);

// ---------- 렌더러 / 씬 ----------
const renderer = new THREE.WebGLRenderer({ canvas: $('game'), antialias: true });
const IS_TOUCH = matchMedia('(pointer: coarse)').matches; // 모바일 품질 티어 (스프린트5)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, IS_TOUCH ? 1.25 : 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.65;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
const fog = createFog(scene, IS_TOUCH ? 96 : 144); // 어둠 층 fog of war — 모바일은 레이 예산 축소
function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ---------- 광원 (낮밤 순환) ----------
const hemi = new THREE.HemisphereLight(0x8898b0, 0x4a4a54, 0.7);
scene.add(hemi);
scene.add(new THREE.AmbientLight(0x6a6a78, 0.9)); // 최소 밝기 보장 (밤에도 또렷하게)
const sun = new THREE.DirectionalLight(0xffe8c0, 1.0);
sun.castShadow = true;
sun.shadow.mapSize.set(IS_TOUCH ? 1024 : 2048, IS_TOUCH ? 1024 : 2048);
sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
sun.shadow.camera.far = 150;
scene.add(sun, sun.target);
const moon = new THREE.DirectionalLight(0x7080c0, 0.0);
scene.add(moon, moon.target);

// 별
const stars = (() => {
  const n = 500;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const e = Math.random() * Math.PI * 0.48;
    const r = 160;
    pos[i * 3] = Math.cos(a) * Math.cos(e) * r;
    pos[i * 3 + 1] = Math.sin(e) * r + 8;
    pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color: 0xd8e0ff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0 });
  const p = new THREE.Points(g, m);
  scene.add(p);
  return p;
})();

const SKY = { day: new THREE.Color(0xaec4dc), dusk: new THREE.Color(0xc07e58), night: new THREE.Color(0x28304e) };
const _sky = new THREE.Color();

// ---------- 텍스처 ----------
function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,244,210,1)');
  grd.addColorStop(0.35, 'rgba(255,220,130,0.55)');
  grd.addColorStop(1, 'rgba(255,190,60,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
const GLOW = glowTexture();

function stoneTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#a2a2a2'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 3000; i++) {
    const v = 130 + Math.random() * 60;
    g.fillStyle = `rgba(${v},${v},${v},0.25)`;
    g.fillRect(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 5, 2 + Math.random() * 5);
  }
  g.strokeStyle = 'rgba(40,40,40,0.55)'; g.lineWidth = 3;
  const T = 128;
  for (let y = 0; y < 4; y++) {
    g.beginPath(); g.moveTo(0, y * T); g.lineTo(512, y * T); g.stroke();
    const off = (y % 2) * T * 0.5;
    for (let x = 0; x < 5; x++) { g.beginPath(); g.moveTo(x * T + off, y * T); g.lineTo(x * T + off, y * T + T); g.stroke(); }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 6);
  return t;
}
const STONE = stoneTexture();

const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
// 수녀 커스텀 파츠: 파츠 숨김 + 베일 부착 (KayKit SD 비율 — 본 공간 치수)
function applyNunCustom(obj, def) {
  if (def.hide) {
    for (const n of def.hide) {
      const o = obj.getObjectByName(n);
      if (o) o.visible = false;
    }
  }
  if (def.veil) {
    const head = obj.getObjectByName('head');
    if (head) {
      const veil = new THREE.Group();
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.68, 0.95, 7), mat(0x14141a));
      cone.castShadow = true;
      cone.position.y = 0.72;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.60, 0.63, 0.20, 10), mat(0xf0ead8));
      band.position.y = 0.32;
      veil.add(cone, band);
      head.add(veil);
    }
  }
}

// 이모시브 틴트 (매혹 등 상태 표시) — 0x000000이면 해제
function flash(group, hex) {
  group.traverse((o) => {
    if (o.isMesh && o.material && o.material.emissive) o.material.emissive.setHex(hex);
  });
}
function box(w, h, d, c) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); m.castShadow = true; m.receiveShadow = true; return m; }
// 스프라이트 풀 (스프린트5) — 이펙트/투사체가 잦은 GC를 만들지 않게 재사용.
// 영구 사용처(성령·엔진 등)는 반납하지 않아도 무방 — 만료 경로만 freeSprite를 부른다.
const spritePool = [];
function glowSprite(color, size) {
  let s = spritePool.pop();
  if (!s) {
    s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  }
  s.material.color.setHex(color);
  s.material.opacity = 1;
  s.scale.setScalar(size);
  return s;
}
function freeSprite(s) { if (s.isSprite) spritePool.push(s); }

// ---------- 상태 ----------
const game = {
  state: 'loading', floorIdx: 0, party: [], player: null,
  enemies: [], corpses: [], projectiles: [], effects: [], pending: [],
  patches: [], turrets: [], obstacles: [], torches: [],
  level: 1, exp: 0, parchments: 0,
  graceUsed: false, cleared: false, portal: null,
  shieldT: 0, guardT: 0, tauntT: 0,
  wind: null, boss: null, floorGroup: null, spirit: null, target: null,
  keys: {}, player2: null,
  hitstopT: 0, shakeT: 0, shakeAmp: 0, telegraphs: [],
  walls: [], wallMeshes: [],
  camDist: 15, camYaw: 0,
  dayT: DAY_LEN * 0.16, night: false,
  cycle: 1, blessings: 0,
  upgrades: { water: 0, life: 0, cross: 0, step: 0, spirit: 0 },
  relics: {}, equip: { weapon: null, armor: null, rosary: null }, // 성구 (스프린트4)
  touchInput: { ix: 0, iz: 0, skillPulse: [false, false, false, false], dodgePulse: false }, // 터치 (스프린트5)
};

// ---- 축복 강화 / 회차 — localStorage 영구 저장 ----
const UP_MAP = Object.fromEntries(UPGRADES.map((u) => [u.key, u]));
const upM = (key) => 1 + game.upgrades[key] * UP_MAP[key].per;
function saveData() { // 세이브 v2 — relics/equip 추가 (v1 로드는 migrateSave가 기본값 보강)
  return {
    saveV: 2, upgrades: game.upgrades, blessings: game.blessings, cycle: game.cycle,
    relics: game.relics, equip: game.equip,
  };
}
function migrateSave(s) { // v1(성구 없음) → v2. 미확인 장비 ID는 방어적으로 해제
  Object.assign(game.upgrades, s.upgrades || {});
  game.blessings = s.blessings ?? game.blessings;
  game.cycle = s.cycle ?? game.cycle;
  game.relics = s.relics || {};
  const eq = s.equip || {};
  for (const { key } of RELIC_SLOTS) {
    const r = RELICS[eq[key]];
    game.equip[key] = r && r.slot === key && game.relics[eq[key]] > 0 ? eq[key] : null;
  }
}
function saveProgress() {
  try { localStorage.setItem('rosario_save', JSON.stringify(saveData())); } catch (e) { /* 시크릿 모드 등 */ }
  saveProgressServer();
}
function saveProgressServer() {
  if (net.state.connected && game.acctName) net.send({ t: 'save', data: saveData() });
}
function onServerSave(data) { // 계정 저장 데이터 수신 (접속 시 1회)
  if (data) {
    migrateSave(data);
    applyRelicStats();
    try { localStorage.setItem('rosario_save', JSON.stringify(saveData())); } catch (e) { /* */ }
    refreshUpgradePanel();
    $('coop-status').textContent += ` · [${game.acctName}] 계정 불러옴 ✓`;
  } else {
    saveProgressServer(); // 서버에 첫 업로드
  }
}
function loadProgress() {
  try {
    const s = JSON.parse(localStorage.getItem('rosario_save'));
    if (s) migrateSave(s);
  } catch (e) { /* 무시 */ }
}

// ---- 성구 장비 (스프린트4) — 정의는 RELICS(ID 참조), 이전은 원자적 커밋 ----
const relicM = (stat) => {
  let m = 1;
  for (const { key } of RELIC_SLOTS) {
    const r = RELICS[game.equip[key]];
    if (r && r.stat[stat]) m += r.stat[stat];
  }
  return m;
};
function applyRelicStats() { // 생명은 재계산 필요 (축복 life와 동일 패턴)
  for (const u of game.party) {
    u.maxhp = Math.round(u.baseMax * upM('life') * relicM('hp'));
    u.hp = Math.min(u.hp, u.maxhp);
  }
}
function grantRelic(id) {
  const def = RELICS[id];
  if (!def) return;
  game.relics[id] = (game.relics[id] || 0) + 1; // 단일 변이 → 즉시 저장 (손실 경계 없음)
  coopToast('성구 획득!', `${def.icon} ${def.name}`);
  coopLog(`${def.icon} ${def.name} 획득 — I 키로 성물함`, 'gold');
  sfx.unlock();
  saveProgress();
  refreshRelicPanel();
}
function equipRelic(id) { // 트랜잭션: 소유 검증 → 슬롯 교체 1회 커밋 → 저장. 기존 장비는 소유 목록에 그대로
  const def = RELICS[id];
  if (!def || !(game.relics[id] > 0)) return false;
  game.equip[def.slot] = game.equip[def.slot] === id ? null : id; // 재클릭 = 해제
  applyRelicStats();
  sfx.select();
  saveProgress();
  refreshRelicPanel();
  return true;
}

// ---- 축복의 제단 UI ----
function refreshUpgradePanel() {
  const bl = $('blessing-label');
  if (bl) bl.textContent = game.blessings;
  const panel = $('upgrade-panel');
  if (!panel || panel.style.display !== 'block') return;
  $('up-blessings').textContent = game.blessings;
  const rows = $('up-rows');
  rows.innerHTML = '';
  for (const up of UPGRADES) {
    const rank = game.upgrades[up.key];
    const cost = rank + 1;
    const maxed = rank >= up.max;
    const row = document.createElement('div');
    row.className = 'up-row';
    row.innerHTML = `<span class="up-icon">${up.icon}</span>
      <span class="up-name">${up.name} <em>${rank}/${up.max}</em></span>
      <span class="up-desc">${up.desc} · 현재 +${Math.round(rank * up.per * 100)}%</span>
      <button class="up-buy" ${maxed || game.blessings < cost ? 'disabled' : ''}>${maxed ? 'MAX' : `강화 ✚${cost}`}</button>`;
    row.querySelector('.up-buy').addEventListener('click', () => buyUpgrade(up.key));
    rows.appendChild(row);
  }
}
function buyUpgrade(key) {
  const up = UP_MAP[key];
  const rank = game.upgrades[key];
  const cost = rank + 1;
  if (rank >= up.max || game.blessings < cost) return;
  game.blessings -= cost;
  game.upgrades[key]++;
  if (key === 'life') applyRelicStats(); // 생명 재계산 (축복 + 성구 통합)
  sfx.unlock();
  coopLog(`✚ ${up.name} ${game.upgrades[key]}단계 — ${up.desc}`, 'gold');
  saveProgress();
  refreshUpgradePanel();
}
function toggleUpgradePanel() {
  const panel = $('upgrade-panel');
  panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
  refreshUpgradePanel();
}

// ---- 성물함 UI ----
const STAT_LABEL = { dmg: '피해', hp: '생명', spd: '이속', dcd: '회피쿨' };
function refreshRelicPanel() {
  const panel = $('relic-panel');
  if (!panel || panel.style.display !== 'block') return;
  $('relic-slots').innerHTML = RELIC_SLOTS.map((s) => {
    const r = RELICS[game.equip[s.key]];
    return `<div class="relic-slot"><b>${s.icon} ${s.name}</b><span>${r ? `${r.icon} ${r.name}` : '—'}</span></div>`;
  }).join('');
  const rows = $('relic-rows');
  rows.innerHTML = '';
  const owned = Object.entries(game.relics).filter(([id, n]) => n > 0 && RELICS[id]);
  if (!owned.length) {
    rows.innerHTML = '<div class="up-sub">아직 성구가 없다 — 십부장을 처치하면 얻는다</div>';
    return;
  }
  owned.sort(([a], [b]) => RELICS[a].tier - RELICS[b].tier);
  for (const [id, n] of owned) {
    const r = RELICS[id];
    const eq = game.equip[r.slot] === id;
    const statTxt = Object.entries(r.stat)
      .map(([k, v]) => `${STAT_LABEL[k]} ${v > 0 ? '+' : ''}${Math.round(v * 100)}%`).join(' · ');
    const row = document.createElement('div');
    row.className = 'up-row';
    row.innerHTML = `<span class="up-icon">${r.icon}</span>
      <span class="up-name">${r.name}${n > 1 ? ` ×${n}` : ''} <em>${r.unique ? '유니크' : '★'.repeat(r.tier)}</em></span>
      <span class="up-desc">${statTxt}</span>
      <button class="up-buy ${eq ? 'equipped' : ''}">${eq ? '장착됨' : '장착'}</button>`;
    row.querySelector('.up-buy').addEventListener('click', () => equipRelic(id));
    rows.appendChild(row);
  }
}
function toggleRelicPanel() {
  const panel = $('relic-panel');
  panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
  refreshRelicPanel();
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyC' && (game.state === 'play' || game.state === 'ending')) toggleUpgradePanel();
  if (e.code === 'KeyI' && (game.state === 'play' || game.state === 'ending')) toggleRelicPanel();
  if (e.code === 'KeyP' && game.state === 'play') toggleP2();
});

// 로컬 2인 협동 (멀티플레이 M1): 동료 한 명을 2P가 조종
function toggleP2() {
  if (game.netP2) return; // 온라인 동료가 조종 중
  if (game.player2) {
    game.player2.p2 = false;
    coopToast('', `2P가 떠났다 — ${game.player2.def.name}은(는) 다시 스스로 싸운다`);
    coopLog(`${game.player2.def.name} — AI 조종으로 복귀`, 'dim');
    game.player2 = null;
  } else {
    const u = game.party.find((m) => !m.isPlayer);
    if (!u) return;
    u.p2 = true;
    game.player2 = u;
    coopToast('2P 참가!', `${u.def.name} — 방향키 이동 · , 성수 · . 성타 · / 고유기 · 우Shift 궁극기`, 4.5);
    coopLog(`2P가 ${u.def.name}을(를) 조종합니다`, 'gold');
  }
  ui.buildParty(game.party);
}

// ---- 성(城) 헬퍼: FLOORS는 성마다 10층씩 이어붙인 평탄 배열 ----
const castleOf = (idx) => Math.floor(idx / 10);
function castleRelicTotal(ci) {
  let n = 0;
  for (let k = ci * 10; k < Math.min((ci + 1) * 10, FLOORS.length); k++) {
    n += (FLOORS[k].decurions || []).filter((d) => !d.noRelic).length;
  }
  return n;
}

const toScreenV = new THREE.Vector3();
function toScreen(pos, yOff = 0) {
  toScreenV.set(pos.x, pos.y + yOff, pos.z).project(camera);
  return {
    x: (toScreenV.x * 0.5 + 0.5) * window.innerWidth,
    y: (-toScreenV.y * 0.5 + 0.5) * window.innerHeight,
    front: toScreenV.z < 1,
  };
}
function clampArena(p) {
  p.x = Math.max(-ARENA, Math.min(ARENA, p.x));
  p.z = Math.max(-ARENA, Math.min(ARENA, p.z));
}
function after(t, fn) { game.pending.push({ t, fn }); }

// ---------- 벽 (스프린트3) — 이동·시선·투사체를 모두 막는 축정렬 사각 ----------
function collideWalls(p, r) { // 축별 밀어내기 → 벽면 슬라이딩
  for (const w of game.walls) {
    const dx = p.x - w.x, dz = p.z - w.z;
    const px = w.w / 2 + r - Math.abs(dx), pz = w.d / 2 + r - Math.abs(dz);
    if (px <= 0 || pz <= 0) continue;
    if (px < pz) p.x += dx >= 0 ? px : -px;
    else p.z += dz >= 0 ? pz : -pz;
  }
}
function pointInWall(x, z, pad = 0) {
  for (const w of game.walls) {
    if (Math.abs(x - w.x) < w.w / 2 + pad && Math.abs(z - w.z) < w.d / 2 + pad) return w;
  }
  return null;
}
function segRectT(x0, z0, dx, dz, w) { // 슬랩 교차 — 진입 t(0~1) 또는 null
  let t0 = 0, t1 = 1;
  for (const [p0, dp, c, half] of [[x0, dx, w.x, w.w / 2], [z0, dz, w.z, w.d / 2]]) {
    if (Math.abs(dp) < 1e-9) { if (Math.abs(p0 - c) > half) return null; }
    else {
      let ta = (c - half - p0) / dp, tb = (c + half - p0) / dp;
      if (ta > tb) { const tmp = ta; ta = tb; tb = tmp; }
      if (ta > t0) t0 = ta;
      if (tb < t1) t1 = tb;
      if (t0 > t1) return null;
    }
  }
  return t0;
}
function sightBlocked(x0, z0, x1, z1) { // 시선 판정 — AI·타겟팅·fog가 같은 진실을 쓴다
  const dx = x1 - x0, dz = z1 - z0;
  for (const w of game.walls) if (segRectT(x0, z0, dx, dz, w) !== null) return true;
  return false;
}
function castWallRay(x, z, dirX, dirZ, maxDist) { // fog 각도 룩업 — 가장 가까운 벽까지 거리
  let best = maxDist;
  const dx = dirX * maxDist, dz = dirZ * maxDist;
  for (const w of game.walls) {
    const t = segRectT(x, z, dx, dz, w);
    if (t !== null && t * maxDist < best) best = t * maxDist;
  }
  return best;
}

// ---------- 전투 체감 (스프린트1) ----------
// 모든 전투 동작의 타이밍을 한 곳에 명시한다: startup / active(무적·접촉) / recovery
const FEEL = {
  dodge: { startup: 0.04, iframeEnd: 0.34, total: 0.46, dist: 5.2, cd: 2.6 }, // 쿨 2.6s — 아껴 쓰는 자원 (스프린트6, 묵주 성구가 유의미해짐)
  telegraph: { windup: 0.55, flash: 0.15 },  // windup 끝 = 접촉 판정 시점
  hitstop: { hit: 0.05, hurt: 0.07, kill: 0.12, scale: 0.12 },
};
function addHitstop(d) { game.hitstopT = Math.max(game.hitstopT, d); }
function shake(amp, dur = 0.3) { game.shakeAmp = Math.max(game.shakeAmp, amp); game.shakeT = Math.max(game.shakeT, dur); }
function knock(e, fromPos, pow) { // 피격자 넉백 임펄스 (Enemy.update에서 감쇠 적용)
  const d = e.pos.clone().sub(fromPos); d.y = 0;
  if (d.lengthSq() < 0.01) return;
  e.kbV = (e.kbV || new THREE.Vector3()).add(d.normalize().multiplyScalar(pow));
}
// 타격 스파크 — burstEffect보다 알갱이가 튀는 임팩트
function impactEffect(pos, color, n = 5) {
  for (let i = 0; i < n; i++) {
    const s = glowSprite(color, 0.35 + Math.random() * 0.3);
    s.position.copy(pos); s.position.y = 1.1;
    const a = Math.random() * Math.PI * 2;
    game.floorGroup.add(s);
    game.effects.push({
      mesh: s, t: 0, dur: 0.22 + Math.random() * 0.14, grow: -1.5,
      vel: new THREE.Vector3(Math.cos(a) * 7, 3 + Math.random() * 4, Math.sin(a) * 7),
    });
  }
}
// 공격 텔레그래프 — 부채꼴(근접)/직선(돌진)/링(강타). 적 mesh에 붙이면 위치·방향 자동 추종.
function telegraphMat() {
  return new THREE.MeshBasicMaterial({
    color: 0xff5533, transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false,
  });
}
function pushTelegraph(mesh, owner, dur, world) {
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = world ? 0.14 : 0.14;
  if (world) game.floorGroup.add(mesh); else owner.mesh.add(mesh);
  game.telegraphs.push({ mesh, owner, t: 0, dur, world });
  sfx.warn();
}
// 주의: rotation.x=-π/2 평면에서 로컬 +Z(전방)는 평면 -Y에 대응한다
function telegraphEffect(enemy, r, dur, arc = 1.8) { // 전방 부채꼴 (기본 ~103°)
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 20, -Math.PI / 2 - arc / 2, arc), telegraphMat());
  pushTelegraph(m, enemy, dur, false);
}
function telegraphLine(enemy, len, width, dur) { // 전방 직선 (돌진 경로)
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, len), telegraphMat());
  m.geometry.translate(0, -len / 2, 0); // 발밑에서 전방으로 뻗음
  pushTelegraph(m, enemy, dur, false);
}
function telegraphRing(pos, r, dur, owner) { // 지정 지점 원 (착지 AoE)
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 24), telegraphMat());
  m.position.set(pos.x, 0, pos.z);
  pushTelegraph(m, owner, dur, true);
}
function updateTelegraphs(dt) {
  for (let i = game.telegraphs.length - 1; i >= 0; i--) {
    const tg = game.telegraphs[i];
    tg.t += dt;
    const k = tg.t / tg.dur;
    const flashing = tg.dur - tg.t < FEEL.telegraph.flash;
    tg.mesh.material.opacity = flashing ? (Math.floor(tg.t * 30) % 2 ? 0.8 : 0.35) : 0.2 + k * 0.3;
    tg.mesh.material.color.setHex(flashing ? 0xff2211 : 0xff5533);
    if (k >= 1 || (tg.owner && tg.owner.hp <= 0)) {
      (tg.world ? game.floorGroup : tg.owner.mesh).remove(tg.mesh);
      game.telegraphs.splice(i, 1);
    }
  }
}

// ---------- 파티 유닛 ----------
let plateSeq = 0;
class Unit {
  constructor(key, isPlayer) {
    this.def = CHARACTERS[key];
    this.key = key;
    this.isPlayer = isPlayer;
    this.plateId = `u${plateSeq++}`;
    this.baseMax = this.def.hp;
    this.maxhp = Math.round(this.baseMax * upM('life'));
    this.hp = this.maxhp;
    this.dmg = this.def.dmg;
    this.melee = this.def.melee;
    this.speed = this.def.speed;
    const { obj, clips } = spawnModel(this.def.model, { tint: this.def.tint, height: this.def.height });
    applyNunCustom(obj, this.def);
    this.mesh = new THREE.Group();
    obj.rotation.y = MODEL_YAW;
    this.mesh.add(obj);
    this.anim = makeAnimator(obj, clips);
    this.anim.play('idle');
    this.vel = new THREE.Vector3();
    this.cool = [0, 0, 0, 0];
    this.alive = true;
    this.slowT = 1;
    this.charmT = 0;
    this.faceDir = new THREE.Vector3(0, 0, -1);
    this.p2 = false;
    this.dodgeT = 0;       // 롤 잔여 시간 (total → 0)
    this.dodgeCd = 0;
    this.dodgeFxT = 0;     // "회피!" 표시 스로틀 (도트 프레임 스팸 방지)
    this.charmResistT = 0; // 재매혹 내성
    this.dodgeDir = new THREE.Vector3(0, 0, -1);
    this.dashT = 0;
    this.dashDir = new THREE.Vector3();
    this.dashHit = new Set();
    this.npcT = 0;
    scene.add(this.mesh);
  }
  get pos() { return this.mesh.position; }
  face(dir) { this.mesh.rotation.y = Math.atan2(dir.x, dir.z); }
  iframes() { // 롤 무적 창: 경과 시간이 [startup, iframeEnd] 안일 때
    const el = FEEL.dodge.total - this.dodgeT;
    return this.dodgeT > 0 && el >= FEEL.dodge.startup && el <= FEEL.dodge.iframeEnd;
  }
  damage(n) {
    if (!this.alive || game.shieldT > 0) return;
    if (this.iframes()) { // 권위적 회피 판정 — 시각 연출이 아니라 여기서 결정된다
      if (!(this.dodgeFxT > 0)) { // 도트류가 프레임마다 불러도 표시는 0.35s에 1회
        this.dodgeFxT = 0.35;
        const s = toScreen(this.pos, 2.1);
        if (s.front) ui.damageNumber(s.x, s.y, '회피!', 'dodge');
        netFx({ k: 'dmg', x: +this.pos.x.toFixed(1), z: +this.pos.z.toFixed(1), h: 2.1, v: '회피!', cls: 'dodge' });
        if (this.isPlayer) sfx.perfect();
      }
      return;
    }
    if (game.guardT > 0) n *= 0.5;
    this.hp -= n;
    const s = toScreen(this.pos, 2.1);
    if (s.front) ui.damageNumber(s.x, s.y, `-${Math.round(n)}`, 'taken');
    netFx({ k: 'dmg', x: +this.pos.x.toFixed(1), z: +this.pos.z.toFixed(1), h: 2.1, v: `-${Math.round(n)}`, cls: 'taken' });
    if (this.isPlayer) sfx.hurt();
    if (this.hp <= 0) this.fall();
  }
  heal(n) {
    if (!this.alive || n <= 0) return;
    this.hp = Math.min(this.maxhp, this.hp + n);
  }
  fall() {
    if (!game.graceUsed) {
      game.graceUsed = true;
      this.hp = Math.ceil(this.maxhp * 0.3);
      coopFlash(); sfx.grace();
      coopToast('✝ 성령의 보호 ✝', `${this.def.name}이(가) 금빛 속에서 다시 일어났다`);
      coopLog(`성령의 보호 — ${this.def.name}이(가) 일어납니다`, 'gold');
      return;
    }
    this.hp = 0;
    this.alive = false;
    this.anim.play('death', { once: true });
    coopLog(`${this.def.name}이(가) 쓰러졌습니다`, 'red');
    if (game.party.every((u) => !u.alive)) gameOver();
  }
  revive(frac) {
    this.alive = true;
    this.hp = Math.ceil(this.maxhp * frac);
    this.anim.play('idle');
  }
}

// ---------- 적 ----------
class Enemy {
  constructor(spec, x, z) {
    this.spec = spec;
    this.plateId = `e${plateSeq++}`;
    const cm = game.cycle - 1; // 회차 배율
    this.maxhp = Math.round(spec.hp * (1 + CYCLE.hp * cm));
    this.hp = this.maxhp;
    this.atk = spec.dmg * (1 + CYCLE.dmg * cm) * (CASTLE_DMG[Math.floor((game.floorIdx || 0) / 10)] || 1);
    this.expVal = Math.round((spec.exp || 0) * (1 + CYCLE.exp * cm));
    this.speed = spec.speed;
    this.scale = spec.scale || 1;
    this.radius = 0.6 + 0.4 * this.scale;
    this.sight = spec.sight || 11;
    const height = (spec.boss ? 1.9 : 1.7) * this.scale;
    const { obj, clips } = spawnModel(spec.model, {
      tint: spec.tint, height, opacity: spec.illusion ? 0.5 : undefined,
    });
    this.mesh = new THREE.Group();
    obj.rotation.y = MODEL_YAW;
    this.mesh.add(obj);
    this.mesh.position.set(x, 0, z);
    this.mesh.userData.owner = this;
    this.anim = makeAnimator(obj, clips);
    this.anim.play('idle');
    this.state = 'idle';           // idle(배회) → aggro(교전)
    this.home = new THREE.Vector3(x, 0, z);
    this.wanderTo = null;
    this.wanderT = Math.random() * 3;
    this.atkT = 0;                       // 무브 간 공통 게이트 (연속 시전 방지)
    this.kit = spec.boss ? BOSS_KITS[Math.floor((game.floorIdx || 0) / 10)] : null; // 성별 보스 킷
    this.moves = spec.moves || (this.kit ? this.kit.moves : defaultMoves(spec));
    this.moveCd = {};                    // 무브별 쿨다운 (런타임)
    this.move = null;                    // 진행 중 무브 상태기
    this.shootT = 2 + Math.random() * 2;
    this.summonT = spec.boss ? 6 : 0;
    this.stunT = 0;
    this.enraged = false;
    if (spec.boss) this.addWings(height);
    game.floorGroup.add(this.mesh);
  }
  get pos() { return this.mesh.position; }
  face(dir) { this.mesh.rotation.y = Math.atan2(dir.x, dir.z); }
  addWings(h) {
    const wingMat = new THREE.MeshBasicMaterial({ color: 0xb0c4d8, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
    this.wings = [];
    for (const side of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(h * 0.8, h * 1.1), wingMat);
      w.position.set(side * h * 0.38, h * 0.62, -h * 0.18);
      w.rotation.y = side * 0.6;
      this.mesh.add(w); this.wings.push(w);
    }
  }
  nearestParty() {
    let best = null, bd = Infinity;
    for (const u of game.party) {
      if (!u.alive) continue;
      let d = this.pos.distanceTo(u.pos);
      if (u.key === 'gabriel') d *= game.tauntT > 0 ? 0.15 : 0.6;
      if (d < bd) { bd = d; best = u; }
    }
    return best;
  }
  aggro() {
    if (this.state === 'aggro') return;
    this.state = 'aggro';
    sfx.aggro();
    const s = toScreen(this.pos, 2.2 * this.scale);
    if (s.front) ui.damageNumber(s.x, s.y, '!', 'aggro');
    if (this.spec.boss) {
      coopToast(this.spec.name, this.spec.title, 3.5);
      coopLog(`${this.spec.name}이(가) 옥좌에서 일어납니다!`, 'red');
    }
  }
  update(dt) {
    if (this.kbV && this.kbV.lengthSq() > 0.02) { // 넉백 감쇠
      this.pos.addScaledVector(this.kbV, dt);
      clampArena(this.pos);
      collideWalls(this.pos, 0.7);
      this.kbV.multiplyScalar(Math.max(0, 1 - 9 * dt));
    }
    if (this.stunT > 0) {
      this.stunT -= dt;
      if (this.move) this.move = null; // 경직 = 무브 중단 (인터럽트 규칙)
      this.anim.base(false);
      return;
    }
    for (const k in this.moveCd) this.moveCd[k] = Math.max(0, this.moveCd[k] - dt);
    const spec = this.spec;
    const t = this.nearestParty();
    if (!t) { this.anim.base(false); return; }
    const dToParty = this.pos.distanceTo(t.pos);
    if (this.move) { this.updateMove(dt); return; } // 진행 중 무브가 이동·판정을 소유

    // ---- 시야: 배회 상태 ----
    if (this.state === 'idle') {
      if (dToParty < this.sight && !sightBlocked(this.pos.x, this.pos.z, t.pos.x, t.pos.z)) { this.aggro(); }
      else {
        this.wanderT -= dt;
        if (this.wanderT <= 0) {
          this.wanderT = 3 + Math.random() * 4;
          const a = Math.random() * Math.PI * 2;
          this.wanderTo = this.home.clone().add(new THREE.Vector3(Math.cos(a) * 4, 0, Math.sin(a) * 4));
          clampArena(this.wanderTo);
        }
        let moving = false;
        if (this.wanderTo) {
          const d = this.wanderTo.clone().sub(this.pos); d.y = 0;
          if (d.length() > 0.4) {
            d.normalize();
            this.pos.addScaledVector(d, this.speed * 0.35 * dt);
            collideWalls(this.pos, 0.7);
            this.face(d);
            moving = true;
          } else this.wanderTo = null;
        }
        this.anim.base(moving);
        return;
      }
    }

    // ---- 교전 ----
    const dir = t.pos.clone().sub(this.pos); dir.y = 0; dir.normalize();
    this.face(dir);
    const keepDist = (spec.kind === 'ranged' || spec.kind === 'charm') ? 7 : this.radius + 0.7;
    let moving = false;
    if (dToParty > keepDist) {
      this.pos.addScaledVector(dir, this.speed * dt);
      clampArena(this.pos);
      collideWalls(this.pos, 0.7);
      moving = true;
    }
    this.anim.base(moving);

    this.atkT -= dt;
    if (this.atkT <= 0) {
      const id = this.pickMove(dToParty);
      if (id) this.startMove(id, t);
    }
    if (spec.kind === 'ranged' || spec.boss) {
      this.shootT -= dt;
      if (this.shootT <= 0 && dToParty < 20 && !sightBlocked(this.pos.x, this.pos.z, t.pos.x, t.pos.z)) {
        this.anim.play('shoot', { once: true });
        sfx.warn(); // 발사 예고 — 0.35s 후 발사
        const g = glowSprite(spec.boss ? 0x9a4adf : 0xd05050, 1.1);
        g.position.copy(this.pos); g.position.y = 1.4;
        game.floorGroup.add(g);
        game.effects.push({ mesh: g, t: 0, dur: 0.35, grow: 1.2 });
        if (spec.boss) {
          this.shootT = this.enraged ? spec.enrageShootCd : spec.shootCd;
          after(0.35, () => {
            if (this.hp <= 0) return;
            for (const a of [-0.3, 0, 0.3]) {
              const dd = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
              spawnBolt(this.pos, dd, this.atk * 0.6, false, 0x9a4adf);
            }
          });
        } else {
          this.shootT = 3.0;
          after(0.35, () => { if (this.hp > 0) spawnBolt(this.pos, dir, this.atk * 0.7, false, 0xd05050); });
        }
      }
    }
    // 매혹 시전 (kind 'charm')
    if (spec.kind === 'charm') {
      this.charmCdT = (this.charmCdT ?? 2 + Math.random() * 3) - dt;
      if (this.charmCdT <= 0 && dToParty < 11 && !sightBlocked(this.pos.x, this.pos.z, t.pos.x, t.pos.z)) {
        this.charmCdT = 6.5;
        this.anim.play('cast', { once: true });
        telegraphEffect(this, 2.0, 0.55, Math.PI * 2); // 시전 예고 링 — 이 안에 회피 타이밍을 맞추면 무효
        after(0.55, () => { if (this.hp > 0 && t.alive) applyCharm(t, 2, spec.gold); });
      }
    }
    if (spec.boss) {
      // 보스 매혹 파동 (아스모데우스)
      if (spec.charm) {
        this.charmWaveT = (this.charmWaveT ?? 6) - dt;
        if (this.charmWaveT <= 0) {
          this.charmWaveT = spec.charm.cd;
          this.anim.play('cast', { once: true });
          telegraphEffect(this, 2.6, 0.55, Math.PI * 2); // 보스 매혹 파동 예고
          after(0.55, () => {
            if (this.hp <= 0) return;
            const alive = game.party.filter((u) => u.alive);
            if (alive.length) applyCharm(alive[Math.floor(Math.random() * alive.length)], spec.charm.dur, spec.charm.gold);
          });
          coopLog(`${spec.name}의 ${spec.charm.gold ? '황금의 저주가' : '매혹이'} 파티를 흔든다!`, 'red');
        }
      }
      this.summonT -= dt;
      const flies = game.enemies.filter((e) => e.spec.summoned).length;
      if (this.summonT <= 0 && flies < spec.summon.max) {
        this.summonT = spec.summon.cd;
        this.anim.play('cast', { once: true });
        for (let i = 0; i < 2; i++) {
          const a = Math.random() * Math.PI * 2;
          const fly = new Enemy({ ...spec.summon, summoned: true }, this.pos.x + Math.cos(a) * 3, this.pos.z + Math.sin(a) * 3);
          fly.state = 'aggro';
          game.enemies.push(fly);
        }
        coopLog(`${spec.name}이(가) ${spec.summon.name}을(를) 불러냅니다!`, 'red');
      }
      if (!this.enraged && this.hp < this.maxhp * 0.5) {
        this.enraged = true;
        this.speed *= 1.35;
        this.moves = spec.phase2Moves || (this.kit && this.kit.phase2) || [...new Set([...this.moves, 'charge'])]; // 2페이즈 무브셋 교체
        for (const k in this.moveCd) this.moveCd[k] *= 0.5;
        if (spec.phase2Heal) { // 2페이즈 (루시퍼)
          this.hp = Math.min(this.maxhp, this.hp + this.maxhp * spec.phase2Heal);
          coopFlash();
          burstEffect(this.pos, 0xffffff, 6);
          coopToast('제2막', spec.phase2Text || `${spec.name}의 힘이 되살아난다!`, 3.5);
          coopLog(spec.phase2Text || `${spec.name}이(가) 2페이즈에 돌입합니다!`, 'red');
        } else {
          coopToast('', `${spec.name}이(가) 광폭화했다!`);
          coopLog(`${spec.name}이(가) 광폭화합니다!`, 'red');
        }
      }
      if (this.wings) {
        const f = Math.sin(performance.now() * 0.02) * 0.55;
        this.wings[0].rotation.y = -0.6 - f;
        this.wings[1].rotation.y = 0.6 + f;
      }
    }
  }
  // ---- 무브 상태기 (스프린트2) — 콘텐츠는 MOVES, 여기엔 런타임만 ----
  pickMove(d) { // 배열 뒤쪽(특수기) 우선 — 적법(사거리+쿨다운)한 첫 무브
    for (let i = this.moves.length - 1; i >= 0; i--) {
      const id = this.moves[i], mv = MOVES[id];
      if (!mv || (this.moveCd[id] || 0) > 0) continue;
      if (mv.kind === 'melee' && d > this.radius + mv.trigger) continue;
      if (mv.kind === 'charge' && (d < mv.minRange || d > mv.maxRange)) continue;
      if (mv.kind === 'slam' && d > mv.maxRange) continue;
      return id;
    }
    return null;
  }
  startMove(id, target) {
    const mv = MOVES[id];
    this.move = { id, mv, t: 0, phase: 'windup', hits: new Set(), target };
    this.moveCd[id] = mv.cd;
    this.anim.play(mv.anim, { once: true });
    if (mv.kind === 'melee') {
      telegraphEffect(this, this.radius + mv.reach, mv.windup, mv.arc);
    } else if (mv.kind === 'charge') {
      const d = target.pos.clone().sub(this.pos); d.y = 0; d.normalize();
      this.move.dir = d;
      this.face(d); // 방향은 여기서 고정 — 윈드업 중 옆으로 비키면 빗나간다
      telegraphLine(this, mv.speed * mv.dur, mv.width + this.radius, mv.windup);
    } else if (mv.kind === 'slam') {
      this.move.dest = target.pos.clone(); this.move.dest.y = 0;
      this.move.from = this.pos.clone();
      this.move.aoeR = mv.r + this.radius * 0.5;
      telegraphRing(this.move.dest, this.move.aoeR, mv.windup, this); // 착지점 고정
    }
  }
  hitUnit(u, mul, kn, dirVec, mv) { // 접촉 1회 적용 — 피해가 실제로 들어간 경우만 임팩트
    u.damage(this.atk * mul);
    if (u.iframes() || game.shieldT > 0) return false;
    sfx.hit(); sfx.impact();
    addHitstop(FEEL.hitstop.hurt);
    if (u.isPlayer) shake(0.32, 0.24);
    impactEffect(u.pos, 0xff8866);
    u.vel.addScaledVector(dirVec, kn);
    if (mv && mv.charm && u.alive) applyCharm(u, mv.charm, mv.gold); // 시그니처 접촉 매혹 (내성 게이트는 applyCharm 소유)
    return true;
  }
  resolveMeleeHit(mul, kn) { // 접촉 판정 (권위적): 생존 + 사거리 + 전방각(부채꼴과 동일)
    const t = this.move.target, mv = this.move.mv;
    if (this.hp <= 0 || !t.alive) return;
    const reach = this.radius + mv.reach;
    const to = t.pos.clone().sub(this.pos); to.y = 0;
    if (to.length() >= reach) return;
    to.normalize();
    const fwd = new THREE.Vector3(Math.sin(this.mesh.rotation.y), 0, Math.cos(this.mesh.rotation.y));
    if (fwd.dot(to) < Math.cos(mv.arc / 2)) return;
    if (this.hitUnit(t, mul, kn, fwd, mv) && this.spec.leech) { // 흡혈 (제4성)
      this.hp = Math.min(this.maxhp, this.hp + this.atk * mul * this.spec.leech);
      burstEffect(this.pos, 0x9aff66, 1.3);
    }
  }
  updateMove(dt) {
    const m = this.move, mv = m.mv;
    m.t += dt;
    if (m.phase === 'windup') {
      if (mv.kind === 'melee' && m.target.alive) { // 근접만 윈드업 중 대상 추적 회전
        const d = m.target.pos.clone().sub(this.pos); d.y = 0;
        if (d.lengthSq() > 0.01) this.face(d.normalize());
      }
      if (m.t >= mv.windup) {
        m.t = 0;
        if (mv.kind === 'melee') {
          this.resolveMeleeHit(mv.dmg, mv.knock);
          if (mv.second) { // 2연격 — 두 번째 타도 같은 텔레그래프 계약
            m.phase = 'second';
            telegraphEffect(this, this.radius + mv.reach, mv.second.at, mv.arc);
            this.anim.play(mv.anim, { once: true });
          } else m.phase = 'recovery';
        } else m.phase = 'active';
      }
    } else if (m.phase === 'second') {
      if (m.t >= mv.second.at) {
        m.t = 0;
        this.resolveMeleeHit(mv.second.dmg, mv.second.knock);
        m.phase = 'recovery';
      }
    } else if (m.phase === 'active') {
      if (mv.kind === 'charge') { // 질주 — 경로상 접촉, 대상당 1회
        this.pos.addScaledVector(m.dir, mv.speed * dt);
        clampArena(this.pos);
        if (pointInWall(this.pos.x, this.pos.z, this.radius * 0.4)) { // 벽에 쾅 — 돌진 중단
          collideWalls(this.pos, 0.7);
          m.t = 0; m.phase = 'recovery';
          shake(0.3, 0.2); sfx.impact();
          impactEffect(this.pos, 0xccccff, 4);
        }
        for (const u of game.party) {
          if (u.alive && !m.hits.has(u) && this.pos.distanceTo(u.pos) < mv.width * 0.5 + this.radius + 0.6) {
            m.hits.add(u);
            this.hitUnit(u, mv.dmg, mv.knock, m.dir, mv);
          }
        }
        if (m.t >= mv.dur) { m.t = 0; m.phase = 'recovery'; }
      } else { // slam — 0.28s 포물선 도약 후 착지 AoE
        const k = Math.min(1, m.t / 0.28);
        this.pos.lerpVectors(m.from, m.dest, k);
        this.pos.y = Math.sin(k * Math.PI) * 2.2;
        if (k >= 1) {
          this.pos.y = 0;
          m.t = 0; m.phase = 'recovery';
          ringEffect(this.pos, m.aoeR, 0xff7744);
          shake(0.5, 0.3); sfx.eruption();
          for (const u of game.party) {
            if (!u.alive || this.pos.distanceTo(u.pos) >= m.aoeR + 0.4) continue;
            const kd = u.pos.clone().sub(this.pos).setY(0);
            this.hitUnit(u, mv.dmg, mv.knock, kd.lengthSq() > 0.01 ? kd.normalize() : new THREE.Vector3(0, 0, 1), mv);
          }
        }
      }
    } else if (m.phase === 'recovery') {
      this.anim.base(false);
      if (m.t >= (mv.recovery ?? 0.3)) { this.move = null; this.atkT = 0.4; }
    }
  }
  damage(n, byPlayer = true) {
    if (this.hp <= 0) return;
    n *= relicM('dmg'); // 성구 무기 보정 — 파티 가해 피해의 단일 관문
    this.hp -= n;
    this.aggro();
    const s = toScreen(this.pos, 2.0 * this.scale);
    if (s.front) ui.damageNumber(s.x, s.y, Math.round(n), byPlayer ? 'dealt' : 'dealt npc');
    netFx({ k: 'dmg', x: +this.pos.x.toFixed(1), z: +this.pos.z.toFixed(1), h: 2.0 * this.scale, v: Math.round(n), cls: byPlayer ? 'dealt' : 'dealt npc' });
    if (byPlayer) game.target = this;
    if (this.hp <= 0) this.die();
  }
  die() {
    game.enemies.splice(game.enemies.indexOf(this), 1);
    if (game.target === this) game.target = null;
    this.anim.play('death', { once: true });
    this.mesh.visible = true; // 은닉 중 사망해도 시체는 보인다
    game.corpses.push({ mesh: this.mesh, anim: this.anim, t: this.spec.boss ? 999 : 1.5 });
    addHitstop(FEEL.hitstop.kill); // 처치 임팩트
    flash(this.mesh, 0xffffff);
    impactEffect(this.pos, 0xffe8b0, 8);
    if (this.spec.decurion || this.spec.boss) shake(this.spec.boss ? 0.8 : 0.4, 0.4);
    sfx.death();
    gainExp(this.expVal);
    coopLog(`${this.spec.name} 처치 (+${this.expVal} EXP)`);
    if (this.spec.decurion || this.spec.boss) { // 축복 성수 드롭
      game.blessings += this.spec.boss ? 3 : 1;
      coopLog(`✚ 축복 성수 +${this.spec.boss ? 3 : 1} (보유 ${game.blessings}) — C 키로 강화`, 'green');
      saveProgress();
      refreshUpgradePanel();
      // 성구 드롭 (스프린트4): 십부장 = 그 성 티어 랜덤, 보스 = 유니크 확정
      const ci = castleOf(game.floorIdx);
      if (this.spec.boss) {
        grantRelic(BOSS_RELICS[ci]);
      } else {
        const pool = Object.keys(RELICS).filter((k) => RELICS[k].tier === ci + 1 && !RELICS[k].unique);
        if (pool.length) grantRelic(pool[Math.floor(Math.random() * pool.length)]);
      }
    }
    if (this.spec.decurion && !this.spec.noRelic) {
      game.parchments++;
      const ci = castleOf(game.floorIdx);
      const relic = CASTLES[ci].relic;
      const total = castleRelicTotal(ci);
      coopToast('십부장 격파!', `${relic}을(를) 얻었다 (${game.parchments}/${total})`);
      coopLog(`${relic} 획득 (${game.parchments}/${total})`, 'gold');
    }
    if (this.spec.boss) { startEnding(this); return; }
    if (game.reserveSpawn && game.enemies.length <= game.reserveSpawn.n) { // 2웨이브 증원
      const { spec, n } = game.reserveSpawn;
      game.reserveSpawn = null;
      coopToast('', '악마의 증원이 나타났다!');
      coopLog('증원 출현!', 'red');
      for (let k = 0; k < n; k++) {
        const x = (Math.random() * 2 - 1) * (ARENA - 4);
        const z = -ARENA + 4 + Math.random() * (ARENA * 0.9);
        const e = new Enemy(spec, x, z);
        e.state = 'aggro';
        game.enemies.push(e);
        burstEffect(e.pos, 0x9a4adf, 2.2);
      }
    }
    if (game.enemies.length === 0 && !FLOORS[game.floorIdx].boss) floorCleared();
  }
}

// ---------- 투사체 / 이펙트 ----------
function spawnBolt(from, dir, dmg, friendly, color) {
  const m = glowSprite(color, friendly ? 0.9 : 1.1);
  m.position.copy(from); m.position.y = 1.2;
  game.floorGroup.add(m);
  game.projectiles.push({ mesh: m, vel: dir.clone().multiplyScalar(friendly ? 17 : 11), dmg, friendly, ttl: 1.6 });
  if (friendly) sfx.throw();
}
function ringEffect(pos, r, color) {
  netFx({ k: 'ring', x: +pos.x.toFixed(1), z: +pos.z.toFixed(1), r, c: color });
  const m = new THREE.Mesh(new THREE.RingGeometry(r * 0.55, r, 28),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.copy(pos); m.position.y = 0.12;
  game.floorGroup.add(m);
  game.effects.push({ mesh: m, t: 0, dur: 0.45, grow: 1.6 });
}
// 매혹 (제2성) / 황금화 (제4성 — gold): 파티원 행동 불능
// 스프린트6 카운터플레이: 롤 무적으로 회피 가능 + 5초 재매혹 내성
function applyCharm(u, dur, gold = false) {
  if (!u.alive || game.shieldT > 0 || u.charmResistT > 0) return;
  if (u.iframes()) {
    const s = toScreen(u.pos, 2.2);
    if (s.front) ui.damageNumber(s.x, s.y, '회피!', 'dodge');
    if (u.isPlayer) sfx.perfect();
    return;
  }
  u.charmResistT = dur + 5;
  u.charmT = Math.max(u.charmT, dur);
  flash(u.mesh, gold ? 0x8a6a10 : 0xaa3366);
  ringEffect(u.pos, 1.8, gold ? 0xffd24a : 0xff77aa);
  const s = toScreen(u.pos, 2.2);
  if (s.front) ui.damageNumber(s.x, s.y, gold ? '❂' : '♥', gold ? 'petrify' : 'charm');
  netFx({ k: 'dmg', x: +u.pos.x.toFixed(1), z: +u.pos.z.toFixed(1), h: 2.2, v: gold ? '❂' : '♥', cls: gold ? 'petrify' : 'charm' });
  if (gold) sfx.petrify(); else sfx.charm();
  if (u.isPlayer) coopLog(`${u.def.name}이(가) ${gold ? '황금으로 굳었다!' : '매혹당했다!'}`, 'red');
}

function burstEffect(pos, color, size = 1.6) {
  netFx({ k: 'burst', x: +pos.x.toFixed(1), z: +pos.z.toFixed(1), c: color, sz: size });
  const s = glowSprite(color, size);
  s.position.copy(pos); s.position.y = 1.1;
  game.floorGroup.add(s);
  game.effects.push({ mesh: s, t: 0, dur: 0.35, grow: 2.2 });
}
function updateProjectiles(dt) {
  for (let i = game.projectiles.length - 1; i >= 0; i--) {
    const p = game.projectiles[i];
    if (!p) continue; // 순회 도중 엔딩 전환(startEnding)이 목록을 비운 경우
    p.mesh.position.addScaledVector(p.vel, dt);
    p.ttl -= dt;
    let hit = p.ttl <= 0;
    if (!hit && pointInWall(p.mesh.position.x, p.mesh.position.z, 0.2)) { // 벽 = 엄폐
      burstEffect(p.mesh.position, 0x8890a0, 1.1);
      hit = true;
    }
    if (!hit && p.friendly) {
      for (const e of [...game.enemies]) {
        if (p.mesh.position.distanceTo(e.pos) < e.radius + 0.5) {
          burstEffect(p.mesh.position, 0x88ccff, 1.8);
          impactEffect(p.mesh.position, 0x88ccff);
          sfx.splash();
          addHitstop(FEEL.hitstop.hit);
          knock(e, p.mesh.position.clone().sub(p.vel), 3.5);
          e.damage(p.dmg, p.byPlayer);
          for (const o of [...game.enemies]) {
            if (o !== e && p.mesh.position.distanceTo(o.pos) < 2.2) o.damage(p.dmg * 0.5, p.byPlayer);
          }
          hit = true; break;
        }
      }
    } else if (!hit) {
      for (const u of game.party) {
        if (u.alive && p.mesh.position.distanceTo(u.pos) < 1.0) {
          u.damage(p.dmg);
          if (!u.iframes() && game.shieldT <= 0) {
            addHitstop(FEEL.hitstop.hurt);
            impactEffect(u.pos, 0xff8866, 4);
            if (u.isPlayer) shake(0.25, 0.2);
          }
          hit = true; break;
        }
      }
    }
    if (hit) { game.floorGroup.remove(p.mesh); freeSprite(p.mesh); game.projectiles.splice(i, 1); }
  }
}
function updateEffects(dt) {
  for (let i = game.effects.length - 1; i >= 0; i--) {
    const fx = game.effects[i];
    fx.t += dt;
    const k = fx.t / fx.dur;
    if (fx.vel) { // 스파크 알갱이 — 중력 낙하
      fx.mesh.position.addScaledVector(fx.vel, dt);
      fx.vel.y -= 22 * dt;
    }
    fx.mesh.scale.multiplyScalar(Math.max(0.01, 1 + fx.grow * dt));
    if (fx.mesh.material.opacity !== undefined) fx.mesh.material.opacity = 0.85 * (1 - k);
    if (k >= 1) { game.floorGroup.remove(fx.mesh); freeSprite(fx.mesh); game.effects.splice(i, 1); }
  }
}

// ---------- 성령 ----------
function buildSpirit() {
  const g = new THREE.Group();
  const core = glowSprite(0xffd970, 3.2);
  g.add(core);
  g.userData.core = core;
  g.userData.motes = [];
  for (let i = 0; i < 4; i++) {
    const m = glowSprite(0xffe9a8, 0.9);
    g.add(m); g.userData.motes.push(m);
  }
  const light = new THREE.PointLight(0xffcc66, 2.4, 22);
  light.position.y = 0.5;
  g.add(light);
  g.userData.light = light;
  g.userData.healT = 0;
  scene.add(g);
  return g;
}
function updateSpirit(dt, posList) {
  const s = game.spirit;
  if (!s) return;
  const pts = posList || game.party.filter((u) => u.alive).map((u) => u.pos);
  if (!pts.length) return;
  const center = new THREE.Vector3();
  for (const p of pts) center.add(p);
  center.divideScalar(pts.length);
  const t = performance.now() * 0.001;
  center.x += Math.sin(t * 0.7) * 1.7;
  center.z += Math.cos(t * 0.9) * 1.7;
  center.y = 2.8 + Math.sin(t * 1.8) * 0.35;
  s.position.lerp(center, 2.2 * dt);
  s.userData.core.scale.setScalar(3.2 + Math.sin(t * 3) * 0.4);
  s.userData.motes.forEach((m, i) => {
    const a = t * 1.4 + (i * Math.PI) / 2;
    m.position.set(Math.cos(a) * 1.3, Math.sin(t * 2 + i) * 0.6, Math.sin(a) * 1.3);
  });
  s.userData.light.intensity = game.night ? 3.4 : 2.0;
  if (posList) return; // 게스트: 연출만 (회복은 호스트 권위)
  s.userData.healT -= dt;
  if (s.userData.healT <= 0) {
    s.userData.healT = 1;
    const mult = FLOORS[game.floorIdx].healMult ?? 1;
    for (const u of game.party) { if (u.alive) u.heal(1.5 * mult * upM('spirit')); }
  }
}

// ---------- 층 구성 ----------
function clearFloor() {
  if (game.floorGroup) scene.remove(game.floorGroup);
  game.floorGroup = new THREE.Group();
  scene.add(game.floorGroup);
  game.enemies = []; game.corpses = []; game.projectiles = []; game.effects = []; game.pending = [];
  game.patches = []; game.turrets = []; game.obstacles = []; game.torches = [];
  game.portal = null; game.cleared = false; game.graceUsed = false;
  game.wind = null; game.whirl = null; game.tide = null; game.eruption = null;
  game.falseSpirit = null;
  game.boss = null; game.target = null;
  game.quest = { soldiers: 0, decurions: 0 };
  game.knownIds = new Set(); // 코옵: 게스트에게 전송한 적 목록
}

function addProp(name, x, z, { height, ry = 0, tint } = {}) {
  const { obj } = spawnModel(name, { height, tint });
  obj.position.set(x, 0, z);
  obj.rotation.y = ry;
  obj.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
  game.floorGroup.add(obj);
  return obj;
}

function addTorch(x, z, ry) {
  const t = addProp('torch', x, z, { height: 1.3, ry });
  const flame = glowSprite(0xffa040, 1.4);
  flame.position.set(x, 1.6, z);
  game.floorGroup.add(flame);
  const light = new THREE.PointLight(0xff9040, 1.0, 14);
  light.position.set(x, 1.9, z);
  game.floorGroup.add(light);
  game.torches.push({ light, flame, seed: Math.random() * 10 });
}

// ---------- 층 빌더 (호스트/게스트 공용 — 결정적 부분) ----------
function setFloorAtmosphere(F) {
  scene.fog = new THREE.Fog(0x000000, F.fogNear ?? 34, F.fogFar ?? 110);
}

function buildFloorBase(F) {
  // 바닥 (석재 타일) + 성벽
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(ARENA * 2 + 6, ARENA * 2 + 6),
    new THREE.MeshLambertMaterial({ map: STONE, color: F.ground }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  game.floorGroup.add(ground);

  const W = ARENA + 2;
  for (const [x, z, ry] of [[0, -W, 0], [0, W, 0], [-W, 0, Math.PI / 2], [W, 0, Math.PI / 2]]) {
    const wall = box(W * 2 + 2, 2.0, 1.4, F.wall);
    wall.position.set(x, 1.0, z); wall.rotation.y = ry;
    game.floorGroup.add(wall);
    // 총안 (crenellation)
    for (let k = -4; k <= 4; k++) {
      const m = box(1.4, 0.9, 1.4, F.wall);
      const off = k * 4.6;
      m.position.set(ry ? x : off, 2.45, ry ? off : z);
      game.floorGroup.add(m);
    }
  }
  // 성별 시각 정체성 (스프린트7) — 외곽 링을 따라 성 테마 데코 (충돌 없음, 결정론 배치)
  {
    const ci = castleOf(game.floorIdx);
    const R = ARENA - 1.2;
    const n = 10;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (game.floorIdx % 10) * 0.13; // 층마다 살짝 회전
      const x = Math.cos(a) * R, z = Math.sin(a) * R;
      const s = 0.8 + ((i * 37 + game.floorIdx * 13) % 10) / 18; // 결정론 크기 변주
      let m;
      if (ci === 0) {        // 벨제붑 — 가시 오벨리스크
        m = new THREE.Mesh(new THREE.ConeGeometry(0.35 * s, 2.6 * s, 5), mat(0x3a2a20));
      } else if (ci === 1) { // 아스모데우스 — 장미빛 거울 파편
        m = new THREE.Mesh(new THREE.BoxGeometry(0.9 * s, 2.4 * s, 0.12),
          new THREE.MeshStandardMaterial({ color: 0xd8a8c8, metalness: 0.8, roughness: 0.15 }));
        m.rotation.y = a + 0.6;
      } else if (ci === 2) { // 레비아탄 — 산호 기둥
        m = new THREE.Mesh(new THREE.ConeGeometry(0.5 * s, 1.9 * s, 6), mat(0x3a8a96));
      } else if (ci === 3) { // 마몬 — 금괴 더미
        m = new THREE.Group();
        for (let k = 0; k < 3; k++) {
          const b = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.4, 0.55),
            new THREE.MeshStandardMaterial({ color: 0xd8b45a, metalness: 0.85, roughness: 0.3 }));
          b.position.set((k % 2) * 0.35 - 0.17, 0.2 + k * 0.42, 0);
          b.rotation.y = k * 0.5;
          m.add(b);
        }
      } else {               // 루시퍼 — 부러진 대리석 기둥
        m = new THREE.Mesh(new THREE.CylinderGeometry(0.42 * s, 0.5 * s, 2.2 * s, 8), mat(0xd8d4cc));
        m.rotation.z = ((i * 53) % 10 - 5) * 0.02;
      }
      m.position.set(x, m.position.y || (ci === 3 ? 0 : 1.1 * s), z);
      m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      game.floorGroup.add(m);
    }
  }

  // 층 레이아웃 벽 (스프린트3) — 시각과 충돌·시선 데이터가 같은 원본을 공유
  game.walls = F.layout || layoutFor(game.floorIdx) || [];
  game.wallMeshes = [];
  for (const w of game.walls) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w.w, 2.4, w.d),
      new THREE.MeshLambertMaterial({ map: STONE, color: F.wall, transparent: true, opacity: 1 }),
    );
    m.position.set(w.x, 1.2, w.z);
    m.castShadow = true; m.receiveShadow = true;
    game.floorGroup.add(m);
    game.wallMeshes.push(m);
  }

  // 프롭: 기둥(모서리) + 깃발 + 횃불
  for (const [x, z] of [[-W + 1, -W + 1], [W - 1, -W + 1], [-W + 1, W - 1], [W - 1, W - 1]]) {
    addProp('pillar', x, z, { height: 4.2 });
  }
  addProp('banner', -6, -W + 0.6, { height: 3.0 });
  addProp('banner', 6, -W + 0.6, { height: 3.0 });
  for (const [x, z, ry] of [[-10, -W + 1, 0], [10, -W + 1, 0], [-W + 1, -8, Math.PI / 2], [W - 1, -8, -Math.PI / 2], [-W + 1, 8, Math.PI / 2], [W - 1, 8, -Math.PI / 2], [-10, W - 1, Math.PI], [10, W - 1, Math.PI]]) {
    addTorch(x, z, ry);
  }
  if (F.boss) {
    const throne = box(4, 5, 1.5, 0x2a1420);
    throne.position.set(0, 2.5, -ARENA - 0.5);
    game.floorGroup.add(throne);
  }
}

function patchVisual(F, x, z) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(F.patches.r, 18),
    new THREE.MeshLambertMaterial({ color: F.patches.color, emissive: F.patches.color, emissiveIntensity: 0.45, transparent: true, opacity: 0.85 }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, 0.04, z);
  game.floorGroup.add(m);
  // 위험 지대 외곽 링 (스프린트7) — 바닥색과 겹쳐도 경계가 읽히게
  const edge = new THREE.Mesh(new THREE.RingGeometry(F.patches.r * 0.88, F.patches.r, 24),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }));
  edge.rotation.x = -Math.PI / 2; edge.position.set(x, 0.06, z);
  game.floorGroup.add(edge);
  return m;
}
function obstacleVisual(F, x, z) {
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(F.obstacles.r, 0), mat(F.obstacles.color));
  m.castShadow = true;
  m.position.set(x, F.obstacles.r * 0.7, z);
  game.floorGroup.add(m);
  return m;
}
function turretVisual(F, x, z) {
  addProp('pillar', x, z, { height: 2.6, tint: F.turrets.color });
  const eye = glowSprite(0xff2020, 0.9);
  eye.position.set(x, 2.8, z);
  game.floorGroup.add(eye);
}
function whirlRingsVisual(F) {
  const rings = [];
  for (const [ri, ro, op] of [[F.whirl.r * 0.25, F.whirl.r * 0.34, 0.5], [F.whirl.r * 0.55, F.whirl.r * 0.64, 0.38], [F.whirl.r * 0.88, F.whirl.r, 0.26]]) {
    const m = new THREE.Mesh(new THREE.RingGeometry(ri, ro, 40, 1, 0, Math.PI * 1.7),
      new THREE.MeshBasicMaterial({ color: 0x3a7a9a, transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, 0.06, -2);
    game.floorGroup.add(m);
    rings.push(m);
  }
  return rings;
}
function buildPortalVisual(x, z) {
  const g = new THREE.Group();
  const { obj } = spawnModel('stairs', { height: 2.2 });
  obj.position.y = 0;
  g.add(obj);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 7, 14, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd970, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }));
  pillar.position.y = 3.5; g.add(pillar);
  const glow = glowSprite(0xffd970, 6);
  glow.position.y = 1.2; g.add(glow);
  const light = new THREE.PointLight(0xffcc66, 3.4, 26);
  light.position.y = 3; g.add(light);
  g.position.set(x, 0, z);
  game.floorGroup.add(g);
  return g;
}

function buildEndBeam(x, z, final) {
  const beam = new THREE.Group();
  const ray = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.1, 70, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd970, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  ray.position.y = 35; beam.add(ray);
  beam.add(glowSprite(0xffe9a8, 7));
  const light = new THREE.PointLight(0xffcc66, 4, 30);
  beam.add(light);
  beam.position.set(x, 4.2, z);
  beam.rotation.x = final ? 0 : -0.55;
  game.floorGroup.add(beam);
  return beam;
}

function tideWallVisual(dx, dz) {
  const m = new THREE.Mesh(
    dx ? new THREE.BoxGeometry(1.6, 2.8, ARENA * 2 + 4) : new THREE.BoxGeometry(ARENA * 2 + 4, 2.8, 1.6),
    new THREE.MeshLambertMaterial({ color: 0x5a9ab8, transparent: true, opacity: 0.55, emissive: 0x2a5a78, emissiveIntensity: 0.5 }),
  );
  m.position.set(-dx * (ARENA + 1), 1.4, -dz * (ARENA + 1));
  game.floorGroup.add(m);
  return m;
}

function loadFloor(i) {
  game.floorIdx = i;
  const F = FLOORS[i];
  clearFloor();
  setFloorAtmosphere(F);
  buildFloorBase(F);

  // --- 기믹 (배치는 호스트가 결정 — 코옵 시 좌표를 게스트로 전송) ---
  if (F.patches) {
    for (let k = 0; k < F.patches.count; k++) {
      const x = (Math.random() * 2 - 1) * (ARENA - 4);
      const z = -ARENA + 5 + Math.random() * (ARENA * 2 - 12);
      patchVisual(F, x, z);
      game.patches.push({ x, z, r: F.patches.r, dps: F.patches.dps, slow: F.patches.slow });
    }
  }
  if (F.obstacles) {
    for (let k = 0; k < F.obstacles.count; k++) {
      const x = (Math.random() * 2 - 1) * (ARENA - 4);
      const z = -ARENA + 6 + Math.random() * (ARENA * 2 - 16);
      obstacleVisual(F, x, z);
      game.obstacles.push({ x, z, r: F.obstacles.r });
    }
  }
  if (F.turrets) {
    const spots = [[-14, -14], [14, -14], [-14, 2], [14, 2]];
    for (let k = 0; k < F.turrets.count; k++) {
      const [x, z] = spots[k % spots.length];
      turretVisual(F, x, z);
      game.turrets.push({ x, z, t: Math.random() * F.turrets.cd, cd: F.turrets.cd, dmg: F.turrets.dmg });
    }
  }
  if (F.wind) game.wind = { ...F.wind, t: F.wind.calm, gusting: false, dir: new THREE.Vector3(1, 0, 0) };
  // --- 기믹: 소용돌이 (제3성) ---
  if (F.whirl) game.whirl = { x: 0, z: -2, ...F.whirl, rings: whirlRingsVisual(F) };
  // --- 기믹: 해일 (제3성) ---
  if (F.tide) game.tide = { ...F.tide, t: 4 + Math.random() * 2, wall: null, dir: new THREE.Vector3(1, 0, 0), hit: new Set() };
  // --- 기믹: 분화 함정 (제4성) ---
  if (F.eruption) game.eruption = { ...F.eruption, t: 3, active: [] };
  // --- 기믹: 거짓 성령 (제5성) — 성령을 흉내 낸 검은 정령이 파티를 잠식 ---
  if (F.falseSpirit) {
    const g = new THREE.Group();
    const core = glowSprite(0x7a3adf, 2.8);
    g.add(core);
    const motes = [];
    for (let k = 0; k < 3; k++) { const m = glowSprite(0x9a5aef, 0.8); g.add(m); motes.push(m); }
    const light = new THREE.PointLight(0x8a4adf, 1.6, 16);
    g.add(light);
    g.position.set(0, 3, 0);
    game.floorGroup.add(g);
    game.falseSpirit = { ...F.falseSpirit, mesh: g, core, motes, tickT: 1 };
  }

  // --- 적 배치 ---
  const spawn = (spec, n, extra = {}) => {
    for (let k = 0; k < n; k++) {
      const x = (Math.random() * 2 - 1) * (ARENA - 4);
      const z = -ARENA + 4 + Math.random() * (ARENA * 0.9);
      game.enemies.push(new Enemy({ ...spec, ...extra }, x, z));
    }
  };
  if (F.soldiers) {
    // 스폰 페이싱: 5기 이상이면 절반은 예비 — 남은 적이 예비 수 이하로 줄면 2웨이브
    const total = F.soldiers.count;
    const wave1 = total >= 5 ? Math.ceil(total / 2) : total;
    spawn(F.soldiers, wave1);
    game.reserveSpawn = total > wave1 ? { spec: F.soldiers, n: total - wave1 } : null;
    game.quest.soldiers = total;
  } else game.reserveSpawn = null;
  if (F.illusions) spawn({ ...F.illusions, hp: 1, illusion: true }, F.illusions.count);
  if (F.decurions) {
    F.decurions.forEach((d, k) => {
      game.enemies.push(new Enemy({ ...d, decurion: true }, (k - (F.decurions.length - 1) / 2) * 6, -ARENA + 5));
    });
    game.quest.decurions = F.decurions.length;
  }
  if (F.boss) {
    game.boss = new Enemy({ ...F.boss, boss: true }, 0, -ARENA + 7);
    game.enemies.push(game.boss);
  }

  // --- 파티 배치 ---
  game.party.forEach((u, k) => {
    const dx = u.isPlayer ? 0 : (k % 2 === 0 ? -2.5 : 2.5);
    u.pos.set(dx, 0, ARENA - 4 + (u.isPlayer ? 0 : 1.5));
    u.vel.set(0, 0, 0);
    if (u.alive) u.anim.play('idle');
  });

  const ci = castleOf(i);
  const cyc = game.cycle > 1 ? `[${game.cycle}회차] ` : '';
  $('floor-label').textContent = `${cyc}제${ci + 1}성 ${F.n}층 · ${F.name}`;
  const bossName = F.boss ? F.boss.name : F.decurions.map((d) => d.name).join(' & ');
  coopToast(`${F.n}층 — ${F.name}`, `${F.intro}`, 4);
  coopLog(`${CASTLES[ci].name} ${F.n}층에 진입했습니다 — ${bossName}이(가) 지키고 있다`, 'gold');
  if (game.netP2 && net.state.peer) sendFloor();
}

function floorCleared() {
  if (game.cleared) return;
  game.cleared = true;
  sfx.portal();
  coopToast('층이 정화되었다', '황금빛 계단이 열렸다 — 빛으로 들어가라');
  coopLog('층이 정화되었습니다 — 황금 계단으로 이동하세요', 'gold');
  game.portal = buildPortalVisual(0, -ARENA + 4);
  for (const u of game.party) { if (u.alive) u.heal(u.maxhp * 0.3); }
}

// ---------- 성장 / 스킬 해금 ----------
function gainExp(n) {
  if (game.level >= MAX_LEVEL) return;
  game.exp += n;
  while (game.level < MAX_LEVEL && game.exp >= LEVEL_XP[game.level]) {
    game.level++;
    for (const u of game.party) {
      u.baseMax += 6; u.dmg += 2; u.melee += 3; // HP/렙 반감 — 후반 난이도 역전 방지 (스프린트6)
      u.maxhp = Math.round(u.baseMax * upM('life') * relicM('hp'));
      u.heal(u.maxhp * 0.4);
    }
    coopFlash(); sfx.levelup();
    coopToast(`LEVEL UP — Lv.${game.level}`, '주님의 힘이 파티를 강하게 하신다');
    coopLog(`파티가 Lv.${game.level}이 되었습니다`, 'gold');
    for (const u of game.party) {
      for (const s of u.def.skills) {
        if (s.unlock === game.level) {
          sfx.unlock();
          coopLog(`${u.def.name} — 새 스킬 해금: ${s.icon} ${s.name}`, 'gold');
          if (u.isPlayer) coopToast('새 스킬 해금', `${s.icon} ${s.name} — ${s.desc}`, 3.2);
        }
      }
    }
  }
}

// ---------- 스킬 ----------
function nearestEnemy(from, maxD, aggroOnly = false) {
  let best = null, bd = maxD;
  for (const e of game.enemies) {
    if (aggroOnly && e.state !== 'aggro') continue;
    const d = from.distanceTo(e.pos);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function useSkill(u, i) {
  const s = u.def.skills[i];
  if (!s || u.cool[i] > 0 || game.level < s.unlock || !u.alive) return false;
  const byPlayer = u.isPlayer;
  switch (s.id) {
    case 'water': {
      u.cool[i] = byPlayer ? s.cd : s.cd + 0.5;
      const t = nearestEnemy(u.pos, 20);
      const dir = t ? t.pos.clone().sub(u.pos) : u.faceDir.clone();
      dir.y = 0; dir.normalize();
      u.face(dir);
      u.anim.play('shoot', { once: true, speed: 1.6 });
      after(0.22, () => { if (u.alive) { const b = u.pos.clone(); spawnBolt(b, dir, u.dmg * upM('water'), true, 0x9adfff); game.projectiles[game.projectiles.length - 1].byPlayer = byPlayer; } });
      break;
    }
    case 'smite': {
      u.cool[i] = s.cd;
      u.anim.play('attack', { once: true });
      sfx.smite();
      after(0.3, () => {
        if (!u.alive) return;
        ringEffect(u.pos, 3.4, 0xffd970);
        for (const e of [...game.enemies]) {
          if (u.pos.distanceTo(e.pos) < 3.6) {
            e.damage(u.melee * upM('cross'), byPlayer);
            knock(e, u.pos, 4.5);
            addHitstop(FEEL.hitstop.hit);
            impactEffect(e.pos, 0xffe07a, 4);
          }
        }
      });
      break;
    }
    case 'dash': {
      u.cool[i] = s.cd;
      const t = nearestEnemy(u.pos, 12);
      const dir = t ? t.pos.clone().sub(u.pos) : u.faceDir.clone();
      dir.y = 0; dir.normalize();
      u.face(dir);
      u.dashT = 0.28; u.dashDir.copy(dir); u.dashHit.clear();
      u.anim.play('attack', { once: true, speed: 1.4 });
      sfx.smite();
      break;
    }
    case 'prayer': {
      u.cool[i] = s.cd;
      u.anim.play('cast', { once: true });
      sfx.heal();
      after(0.4, () => {
        for (const p of game.party) { if (p.alive) { p.heal(p.maxhp * 0.25); ringEffect(p.pos, 1.8, 0x9affc8); } }
        coopLog(`${u.def.name}의 치유의 기도 — 파티 회복`, 'green');
      });
      break;
    }
    case 'vow': {
      u.cool[i] = s.cd;
      u.anim.play('cast', { once: true });
      sfx.heal();
      game.guardT = 5; game.tauntT = 5;
      ringEffect(u.pos, 5, 0xd0d8ff);
      coopLog(`${u.def.name}의 수호 선포 — 5초간 파티 피해 감소`, 'green');
      break;
    }
    case 'ult': {
      u.cool[i] = s.cd;
      u.anim.play('cast', { once: true });
      coopFlash(); sfx.ult();
      coopToast(`✠ 대천사 ${u.def.angel} 강림 ✠`, s.name);
      coopLog(`대천사 ${u.def.angel} 강림 — ${s.name}!`, 'gold');
      if (u.key === 'michaela') {
        after(0.35, () => {
          ringEffect(u.pos, 8, 0xff8844);
          burstEffect(u.pos, 0xffaa44, 5);
          for (const e of [...game.enemies]) {
            if (u.pos.distanceTo(e.pos) < 8.5) {
              e.damage((60 + game.level * 4) * upM('cross'), byPlayer);
              knock(e, u.pos, 7);
            }
          }
        });
      } else if (u.key === 'raphaela') {
        after(0.35, () => {
          for (const p of game.party) {
            if (p.alive) p.heal(p.maxhp * 0.7);
            else p.revive(0.4);
            ringEffect(p.pos, 2.2, 0x9affc8);
          }
        });
      } else {
        game.shieldT = 4;
        for (const e of game.enemies) e.stunT = Math.max(e.stunT, 2);
        ringEffect(u.pos, 9, 0xffffff);
      }
      break;
    }
  }
  return true;
}

// ---------- 플레이어 / NPC ----------
// 입력 추상화 (멀티플레이 M0): 키보드든 네트워크든 같은 구조체로 들어온다
// { ix, iz: -1~1 이동축, skills: [성수, 성타, 고유기, 궁극기] }
function getLocalInput(pnum) {
  const k = game.keys;
  if (pnum === 2) {
    return {
      ix: (k.ArrowRight ? 1 : 0) - (k.ArrowLeft ? 1 : 0),
      iz: (k.ArrowDown ? 1 : 0) - (k.ArrowUp ? 1 : 0),
      skills: [!!k.Comma, !!k.Period, !!k.Slash, !!k.ShiftRight],
      dodge: !!k.ControlRight,
    };
  }
  const arrows = !game.player2; // 2P가 없으면 방향키도 1P 몫
  const t = game.touchInput; // 가상 조이스틱/버튼 병합 (펄스는 여기서 소모)
  const input = {
    ix: Math.max(-1, Math.min(1, (k.KeyD || (arrows && k.ArrowRight) ? 1 : 0) - (k.KeyA || (arrows && k.ArrowLeft) ? 1 : 0) + t.ix)),
    iz: Math.max(-1, Math.min(1, (k.KeyS || (arrows && k.ArrowDown) ? 1 : 0) - (k.KeyW || (arrows && k.ArrowUp) ? 1 : 0) + t.iz)),
    skills: [
      !!(k.Space || k.KeyJ || k.Digit1) || t.skillPulse[0],
      !!(k.KeyK || k.Digit2) || t.skillPulse[1],
      !!k.Digit3 || t.skillPulse[2],
      !!(k.KeyL || k.Digit4) || t.skillPulse[3],
    ],
    dodge: !!k.ShiftLeft || t.dodgePulse,
  };
  t.skillPulse = [false, false, false, false];
  t.dodgePulse = false;
  return input;
}

function updatePlayer(u, dt, input) {
  const F = FLOORS[game.floorIdx];
  if (u.charmT > 0) { // 매혹 — 넋을 잃고 멈춘다
    u.charmT -= dt;
    u.anim.base(false);
    if (u.charmT <= 0) flash(u.mesh, 0x000000);
    return;
  }
  const inv = F.invert ? -1 : 1; // 거울의 저주 — 이동 반전
  const dir = new THREE.Vector3(input.ix * inv, 0, input.iz * inv);
  if (dir.lengthSq() > 0) {
    dir.normalize();
    if (!input.world) dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), game.camYaw);
    u.faceDir.copy(dir);
  }
  if (u.dashT > 0) {
    u.dashT -= dt;
    u.pos.addScaledVector(u.dashDir, 24 * dt);
    clampArena(u.pos);
    for (const e of [...game.enemies]) {
      if (!u.dashHit.has(e) && u.pos.distanceTo(e.pos) < e.radius + 1.2) {
        u.dashHit.add(e);
        e.damage(u.melee * 1.2 * upM('cross'), u.isPlayer);
        knock(e, u.pos, 5);
        addHitstop(FEEL.hitstop.hit);
        impactEffect(e.pos, 0xd0e8ff);
        burstEffect(e.pos, 0xd0e8ff, 1.6);
      }
    }
    return;
  }
  // 회피 롤 — 이동/스킬보다 우선, 진행 중엔 다른 행동 불가 (recovery 포함)
  if (u.dodgeT > 0) {
    u.dodgeT -= dt;
    u.pos.addScaledVector(u.dodgeDir, (FEEL.dodge.dist / FEEL.dodge.total) * dt);
    clampArena(u.pos);
    collideWalls(u.pos, 0.5);
    const obj = u.mesh.children[0];
    const prog = 1 - u.dodgeT / FEEL.dodge.total;
    obj.rotation.x = -Math.PI * 2 * Math.min(1, prog); // 앞구르기 한 바퀴
    u.dodgeGhostT = (u.dodgeGhostT || 0) - dt;
    if (u.dodgeGhostT <= 0) { // 잔상
      u.dodgeGhostT = 0.07;
      const g = glowSprite(0xcfe4ff, 1.4);
      g.position.copy(u.pos); g.position.y = 1.0;
      game.floorGroup.add(g);
      game.effects.push({ mesh: g, t: 0, dur: 0.25, grow: -1.2 });
    }
    if (u.dodgeT <= 0) obj.rotation.x = 0;
    return;
  }
  if (input.dodge && u.dodgeCd <= 0 && u.charmT <= 0) {
    u.dodgeT = FEEL.dodge.total;
    u.dodgeCd = FEEL.dodge.cd * relicM('dcd'); // 묵주 성구 — 회피 쿨다운 감소
    u.dodgeDir.copy(dir.lengthSq() > 0 ? dir : u.faceDir).normalize();
    u.face(u.dodgeDir);
    u.vel.set(0, 0, 0);
    sfx.dodge();
  }
  const slippery = !!F.slippery;
  const accel = slippery ? 16 : 90;
  const friction = slippery ? 1.2 : 11;
  u.vel.addScaledVector(dir, accel * dt);
  u.vel.multiplyScalar(Math.max(0, 1 - friction * dt));
  const maxSpd = u.speed * u.slowT * upM('step') * relicM('spd');
  if (u.vel.length() > maxSpd) u.vel.setLength(maxSpd);
  u.pos.addScaledVector(u.vel, dt);
  collideWalls(u.pos, 0.5);
  const moving = u.vel.length() > 0.6;
  if (moving) u.face(u.vel);
  u.anim.base(moving);

  if (input.skills[0]) useSkill(u, 0);
  if (input.skills[1]) useSkill(u, 1);
  if (input.skills[2]) useSkill(u, 2);
  if (input.skills[3]) useSkill(u, 3);
}

function updateCompanion(u, dt) {
  if (u.charmT > 0) {
    u.charmT -= dt;
    u.anim.base(false);
    if (u.charmT <= 0) flash(u.mesh, 0x000000);
    return;
  }
  if (u.dashT > 0) {
    u.dashT -= dt;
    u.pos.addScaledVector(u.dashDir, 24 * dt);
    clampArena(u.pos);
    for (const e of [...game.enemies]) {
      if (!u.dashHit.has(e) && u.pos.distanceTo(e.pos) < e.radius + 1.2) {
        u.dashHit.add(e); e.damage(u.melee * 1.2 * upM('cross'), false);
      }
    }
    return;
  }
  const player = game.player;
  const toPlayer = u.pos.distanceTo(player.pos);
  const enemy = nearestEnemy(u.pos, 13, true) || nearestEnemy(u.pos, 9);
  let moveTo = null;
  const wantDist = u.key === 'gabriel' ? 1.8 : u.key === 'raphaela' ? 7.5 : 5;
  if (toPlayer > 5.5) moveTo = player.pos;
  else if (enemy) {
    const d = u.pos.distanceTo(enemy.pos);
    if (d > wantDist + 1) moveTo = enemy.pos;
    else if (d < wantDist - 1.5 && u.key === 'raphaela') {
      moveTo = u.pos.clone().add(u.pos.clone().sub(enemy.pos).setY(0).normalize().multiplyScalar(3));
    }
  }
  let moving = false;
  if (moveTo) {
    const dir = moveTo.clone().sub(u.pos); dir.y = 0;
    if (dir.lengthSq() > 0.2) {
      dir.normalize();
      u.pos.addScaledVector(dir, u.speed * 0.92 * u.slowT * upM('step') * relicM('spd') * dt);
      collideWalls(u.pos, 0.5);
      u.face(dir);
      moving = true;
    }
  }
  u.anim.base(moving);

  u.npcT -= dt;
  if (u.npcT > 0) return;
  u.npcT = 0.25;
  if (enemy) {
    const d = u.pos.distanceTo(enemy.pos);
    if (u.key === 'michaela' && d > 3 && d < 8 && game.level >= 4) { if (useSkill(u, 2)) return; }
    if (u.key === 'gabriel') {
      const near = game.enemies.filter((e) => e.state === 'aggro' && e.pos.distanceTo(u.pos) < 6).length;
      if (near >= 2 && game.level >= 4) { if (useSkill(u, 2)) return; }
      if (d < 3) { if (useSkill(u, 1)) return; }
    }
    useSkill(u, 0);
  }
  if (u.key === 'raphaela') {
    const hurt = game.party.filter((p) => p.alive && p.hp < p.maxhp * 0.6);
    if (hurt.length && game.level >= 4) useSkill(u, 2);
    const avg = game.party.reduce((a, p) => a + (p.alive ? p.hp / p.maxhp : 0), 0) / 3;
    if (avg < 0.35 && game.level >= 6) useSkill(u, 3);
  }
}

// ---------- 기믹 ----------
function updateGimmicks(dt) {
  for (const u of game.party) {
    if (!u.alive) continue;
    u.slowT = 1;
    for (const pt of game.patches) {
      const dx = u.pos.x - pt.x, dz = u.pos.z - pt.z;
      if (dx * dx + dz * dz < pt.r * pt.r) {
        u.damage(pt.dps * dt);
        u.slowT = Math.min(u.slowT, pt.slow);
      }
    }
  }
  for (const t of game.turrets) {
    t.t -= dt;
    if (t.t <= 0) {
      t.t = t.cd;
      const alive = game.party.filter((u) => u.alive);
      if (alive.length) {
        const target = alive[Math.floor(Math.random() * alive.length)];
        const from = new THREE.Vector3(t.x, 0, t.z);
        const dir = target.pos.clone().sub(from); dir.y = 0; dir.normalize();
        spawnBolt(from, dir, t.dmg, false, 0x9a40c0);
      }
    }
  }
  if (game.wind) {
    const w = game.wind;
    w.t -= dt;
    if (w.t <= 0) {
      w.gusting = !w.gusting;
      w.t = w.gusting ? w.gust : w.calm;
      if (w.gusting) {
        const a = Math.random() * Math.PI * 2;
        w.dir.set(Math.cos(a), 0, Math.sin(a));
        coopToast('', '돌풍이 몰아친다!');
      }
    }
    if (w.gusting) {
      for (const u of game.party) {
        if (u.alive) u.pos.addScaledVector(w.dir, w.force * dt);
      }
    }
  }
  // 소용돌이 — 중심으로 끌어당기고, 눈(眼)에서는 익사 피해
  if (game.whirl) {
    const w = game.whirl;
    for (const m of w.rings) m.rotation.z += dt * 1.6;
    for (const u of game.party) {
      if (!u.alive) continue;
      const dx = w.x - u.pos.x, dz = w.z - u.pos.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < w.r && d > 0.1) {
        u.pos.x += (dx / d) * w.pull * dt;
        u.pos.z += (dz / d) * w.pull * dt;
        if (d < 2.2) u.damage(w.dps * dt);
      }
    }
  }
  // 해일 — 물의 벽이 아레나를 휩쓴다
  if (game.tide) {
    const td = game.tide;
    if (!td.wall) {
      td.t -= dt;
      if (td.t <= 0) {
        const [dx, dz] = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(Math.random() * 4)];
        td.dir.set(dx, 0, dz);
        td.wall = tideWallVisual(dx, dz);
        netFx({ k: 'tide', dx, dz });
        td.hit = new Set();
        coopToast('', '해일이 밀려온다!');
        sfx.tide();
      }
    } else {
      td.wall.position.x += td.dir.x * 13 * dt;
      td.wall.position.z += td.dir.z * 13 * dt;
      for (const u of game.party) {
        if (!u.alive || td.hit.has(u)) continue;
        const d = td.dir.x ? Math.abs(u.pos.x - td.wall.position.x) : Math.abs(u.pos.z - td.wall.position.z);
        if (d < 1.8) {
          td.hit.add(u);
          u.damage(td.dmg);
          u.pos.addScaledVector(td.dir, 3);
          clampArena(u.pos);
        }
      }
      const off = td.dir.x ? td.wall.position.x : td.wall.position.z;
      if (Math.abs(off) > ARENA + 2) {
        game.floorGroup.remove(td.wall);
        td.wall = null;
        td.t = td.period;
      }
    }
  }
  // 분화 함정 — 경고 원이 빛난 뒤 1초 후 폭발
  if (game.eruption) {
    const er = game.eruption;
    er.t -= dt;
    if (er.t <= 0) {
      er.t = er.interval;
      const alive = game.party.filter((u) => u.alive);
      for (let k = 0; k < er.count && alive.length; k++) {
        const u = alive[Math.floor(Math.random() * alive.length)];
        const x = u.pos.x + (Math.random() * 2 - 1) * 6;
        const z = u.pos.z + (Math.random() * 2 - 1) * 6;
        const m = new THREE.Mesh(new THREE.RingGeometry(er.r * 0.7, er.r, 24),
          new THREE.MeshBasicMaterial({ color: 0xff8820, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
        m.rotation.x = -Math.PI / 2;
        m.position.set(x, 0.08, z);
        game.floorGroup.add(m);
        er.active.push({ x, z, t: 1.0, mesh: m });
        netFx({ k: 'warn', x: +x.toFixed(1), z: +z.toFixed(1), r: er.r });
      }
    }
    for (let i = er.active.length - 1; i >= 0; i--) {
      const sp = er.active[i];
      sp.t -= dt;
      sp.mesh.material.opacity = 0.4 + Math.sin(sp.t * 25) * 0.35; // 경고 점멸
      if (sp.t <= 0) {
        game.floorGroup.remove(sp.mesh);
        er.active.splice(i, 1);
        burstEffect(new THREE.Vector3(sp.x, 0, sp.z), 0xffb030, 3.2);
        ringEffect(new THREE.Vector3(sp.x, 0, sp.z), er.r, 0xffaa30);
        sfx.eruption();
        for (const u of game.party) {
          if (!u.alive) continue;
          const dx = u.pos.x - sp.x, dz = u.pos.z - sp.z;
          if (dx * dx + dz * dz < er.r * er.r) u.damage(er.dmg);
        }
      }
    }
  }
  // 거짓 성령 — 진짜 성령의 반대편을 떠돌며 파티를 잠식
  if (game.falseSpirit) {
    const fs = game.falseSpirit;
    const alive = game.party.filter((u) => u.alive);
    if (alive.length) {
      const center = new THREE.Vector3();
      for (const u of alive) center.add(u.pos);
      center.divideScalar(alive.length);
      const t = performance.now() * 0.001;
      center.x -= Math.sin(t * 0.7) * 1.9; // 진짜 성령과 반대 위상
      center.z -= Math.cos(t * 0.9) * 1.9;
      center.y = 2.7 + Math.sin(t * 1.6 + 2) * 0.35;
      fs.mesh.position.lerp(center, 2.0 * dt);
      fs.core.scale.setScalar(2.8 + Math.sin(t * 2.6) * 0.35);
      fs.motes.forEach((m, i) => {
        const a = -t * 1.5 + (i * Math.PI * 2) / 3;
        m.position.set(Math.cos(a) * 1.2, Math.sin(t * 2 + i) * 0.5, Math.sin(a) * 1.2);
      });
      fs.tickT -= dt;
      if (fs.tickT <= 0) {
        fs.tickT = 1;
        for (const u of alive) u.damage(fs.dps);
      }
    }
  }
  for (const u of game.party) {
    if (!u.alive) continue;
    for (const o of game.obstacles) {
      const dx = u.pos.x - o.x, dz = u.pos.z - o.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      const min = o.r + 0.5;
      if (d < min && d > 0.001) {
        u.pos.x = o.x + (dx / d) * min;
        u.pos.z = o.z + (dz / d) * min;
      }
    }
    clampArena(u.pos);
  }
}

// ---------- 낮과 밤 ----------
function updateDayNight(dt) {
  game.dayT += dt;
  const phase = (game.dayT / DAY_LEN) % 1;
  const ang = phase * Math.PI * 2;
  const elev = Math.sin(ang);
  const F = FLOORS[game.floorIdx];
  const darkMul = F.dark ? 0.5 : 1;

  sun.position.set(Math.cos(ang) * 50, Math.max(2, elev * 60), 25);
  sun.intensity = Math.max(0, elev) * 1.6 * darkMul;
  sun.color.setHSL(0.09, 0.5, 0.55 + Math.max(0, elev) * 0.25);
  moon.position.set(-Math.cos(ang) * 50, Math.max(2, -elev * 60), -25);
  moon.intensity = Math.max(0, -elev) * 0.85 * darkMul;
  hemi.intensity = (0.55 + Math.max(0, elev) * 0.75) * darkMul + 0.3;

  if (elev > 0) _sky.copy(SKY.dusk).lerp(SKY.day, Math.min(1, elev * 2.2));
  else _sky.copy(SKY.dusk).lerp(SKY.night, Math.min(1, -elev * 2.6));
  if (F.dark) _sky.multiplyScalar(0.25);
  if (F.ground && !F.dark) _sky.lerp(new THREE.Color(F.ground), 0.12);
  scene.background = _sky;
  if (scene.fog) scene.fog.color.copy(_sky);
  stars.material.opacity = Math.max(0, Math.min(1, -elev * 3)) * 0.9;

  const night = elev < -0.08;
  if (night !== game.night) {
    game.night = night;
    setNight(night);
    coopLog(night ? '밤이 찾아옵니다 — 횃불이 타오릅니다' : '동이 틉니다', 'dim');
  }
  ui.setClock(night ? '🌙' : elev < 0.15 ? '🌅' : '☀', night ? '밤' : '낮');

  const tt = performance.now() * 0.001;
  for (const t of game.torches) {
    const flick = Math.sin(tt * 13 + t.seed * 7) * 0.15 + Math.sin(tt * 29 + t.seed) * 0.08;
    t.light.intensity = (night ? 2.8 : 1.2) + flick;
    t.flame.scale.setScalar(1.3 + flick * 0.8);
  }
}

// ---------- UI 갱신 ----------
function updateHUD() {
  ui.updateParty(game.party, game.level);
  const prev = LEVEL_XP[game.level - 1];
  const next = LEVEL_XP[game.level] ?? prev;
  ui.expBar(game.level >= MAX_LEVEL ? 1 : (game.exp - prev) / (next - prev), game.level);
  const p = game.player;
  ui.updateHotbar(p.def.skills.map((s, i) => ({
    cdFrac: u_cd(p, i, s), locked: game.level < s.unlock,
  })));

  // 네임플레이트
  const plates = [];
  for (const u of game.party) {
    const s = toScreen(u.pos, 2.3);
    plates.push({ id: u.plateId, x: s.x, y: s.y, visible: s.front, name: `${u.p2 ? '★2 ' : ''}${u.def.name}`, frac: u.hp / u.maxhp, cls: u.isPlayer || u.p2 ? 'ally player' : 'ally' });
  }
  for (const e of game.enemies) {
    if (e.revealed === false) continue; // 미공개 적은 HUD에 새지 않는다
    const s = toScreen(e.pos, 2.1 * e.scale);
    const elite = e.spec.decurion || e.spec.boss;
    plates.push({
      id: e.plateId, x: s.x, y: s.y, visible: s.front,
      name: e.spec.name, frac: e.hp / e.maxhp,
      cls: `enemy ${elite ? 'elite' : ''} ${e.state === 'aggro' ? 'mad' : ''}`,
    });
  }
  ui.updateNameplates(plates);

  // 타겟 프레임
  if (game.target && game.target.hp > 0) {
    const t = game.target;
    ui.setTarget({ name: t.spec.name, frac: t.hp / t.maxhp, elite: !!(t.spec.decurion || t.spec.boss), sub: t.spec.title || (t.spec.decurion ? '십부장' : '') });
  } else ui.setTarget(null);

  // 보스 / 미니맵 / 임무
  ui.bossFrame(game.boss && game.boss.hp > 0 && game.boss.state === 'aggro' // 어그로 전엔 숨김 (스포일러 방지)
    ? { name: `${game.boss.spec.name} — ${game.boss.spec.title}`, frac: game.boss.hp / game.boss.maxhp } : null);
  ui.updateMinimap({
    arena: ARENA,
    party: game.party.filter((u) => u.alive).map((u) => ({ x: u.pos.x, z: u.pos.z, player: u.isPlayer })),
    enemies: game.enemies.filter((e) => e.revealed !== false).map((e) => ({ x: e.pos.x, z: e.pos.z, elite: e.spec.decurion || e.spec.boss })),
    portal: game.portal ? game.portal.position : null,
    turrets: game.turrets,
  });
  const F = FLOORS[game.floorIdx];
  const dec = game.enemies.filter((e) => e.spec.decurion || e.spec.boss).length;
  const sol = game.enemies.filter((e) => !e.spec.decurion && !e.spec.boss && !e.spec.illusion).length;
  $('quest-body').textContent = game.cleared
    ? '황금 계단으로 올라가라'
    : F.boss ? `${F.boss.name} 퇴치 (${dec ? '전투 중' : '완료'})`
      : `병사 정화 ${Math.max(0, sol)}마리 · 십부장 ${dec}명 남음`;
}
function u_cd(u, i, s) { return Math.max(0, Math.min(1, u.cool[i] / s.cd)); }

// ---------- 흐름 ----------
function startGame(charKey) {
  for (const u of game.party) scene.remove(u.mesh);
  game.party = [];
  game.level = 1; game.exp = 0; game.parchments = 0;
  const order = [charKey, ...Object.keys(CHARACTERS).filter((k) => k !== charKey)];
  for (const k of order) game.party.push(new Unit(k, k === charKey));
  game.player = game.party[0];
  game.player2 = null;
  game.netP2 = false;
  game.usedAdRevive = false; // 광고 부활 판당 1회 리셋
  if (!game.spirit) game.spirit = buildSpirit();
  ui.buildParty(game.party);
  ui.buildHotbar(game.player.def.skills);
  $('select-screen').style.display = 'none';
  $('title-screen').style.display = 'none';
  $('hud').style.display = 'block';
  game.state = 'play';
  loadFloor(0);
  refreshUpgradePanel();
  if (game.coopHost && (net.state.peer || game.coopPendingP2)) assignNetP2();
  if (game.cycle > 1) coopLog(`${game.cycle}회차 — 악마들이 더 강해져 있습니다`, 'red');
  coopLog(`${game.player.def.name}(으)로 순례를 시작합니다`, 'gold');
  if (!localStorage.getItem('rosario_tut')) $('tut-card').style.display = 'flex'; // 첫 플레이 안내
}
$('tut-ok').addEventListener('click', () => {
  $('tut-card').style.display = 'none';
  try { localStorage.setItem('rosario_tut', '1'); } catch (e) { /* */ }
});

function showEnd(title, sub, buttons) {
  $('end-title').textContent = title;
  $('end-sub').textContent = sub;
  const b1 = $('end-btn'), b2 = $('end-btn2');
  b1.textContent = buttons[0].label;
  b1.onclick = buttons[0].fn;
  if (buttons[1]) {
    b2.style.display = 'inline-block';
    b2.textContent = buttons[1].label;
    b2.onclick = buttons[1].fn;
  } else b2.style.display = 'none';
  $('end-screen').style.display = 'flex';
}
function gameOver() {
  game.state = 'over';
  // ---- 광고 연동 (Tart Shop AFG) ----
  const restart = () => {
    $('end-screen').style.display = 'none';
    for (const u of game.party) u.revive(0.7);
    game.state = 'play';
    loadFloor(game.floorIdx);
  };
  const buttons = [{
    label: '기도하고 다시 일어나기',
    fn: () => {
      if (window.AFG) window.AFG.interstitial({ name: 'rosario_gameover', onAfterAd: restart });
      else restart();
    },
  }];
  if (window.AFG && !game.usedAdRevive && !guest.active) { // 리워드 부활 — 판당 1회, 코옵 게스트 제외
    buttons.push({
      label: '📺 광고 보고 부활',
      fn: () => {
        game.usedAdRevive = true;
        window.AFG.rewarded({
          name: 'rosario_continue',
          onReward: () => {
            $('end-screen').style.display = 'none';
            for (const u of game.party) u.revive(0.5);
            game.state = 'play';
          },
          onDismiss: () => { game.usedAdRevive = false; },
        });
      },
    });
  }
  showEnd('파티가 쓰러졌다…',
    `${CASTLES[castleOf(game.floorIdx)].name} ${FLOORS[game.floorIdx].n}층 — ${FLOORS[game.floorIdx].name}에서. 그러나 기도는 끝나지 않았다.`,
    buttons);
}

// 회차 플레이 — 레벨·강화 유지, 악마는 회차 배율로 강화
function startNewCycle() {
  $('end-screen').style.display = 'none';
  game.cycle++;
  game.parchments = 0;
  saveProgress();
  for (const u of game.party) { if (!u.alive) u.revive(1); u.hp = u.maxhp; }
  game.state = 'play';
  coopFlash();
  loadFloor(0);
  coopToast(`${game.cycle}회차 — 십자가의 길`, '악마들이 더 강해져 돌아왔다', 4);
  coopLog(`${game.cycle}회차 순례 시작 — 적 생명 +${Math.round(CYCLE.hp * (game.cycle - 1) * 100)}% · 공격 +${Math.round(CYCLE.dmg * (game.cycle - 1) * 100)}%`, 'gold');
}

// ---------- 엔딩 시퀀스: 벨제붑 몰락 → 양피지 수렴 → 제2성 안내 ----------
function startEnding(boss) {
  game.state = 'ending';
  // 주인을 잃은 파리 떼도 함께 무너진다
  for (const e of [...game.enemies]) {
    game.enemies.splice(game.enemies.indexOf(e), 1);
    e.anim.play('death', { once: true });
    game.corpses.push({ mesh: e.mesh, anim: e.anim, t: 3 });
  }
  for (const p of game.projectiles) game.floorGroup.remove(p.mesh);
  game.projectiles = [];
  ui.updateNameplates([]);
  ui.setTarget(null);
  ui.bossFrame(null);
  const center = new THREE.Vector3();
  const alive = game.party.filter((u) => u.alive);
  for (const u of alive) center.add(u.pos);
  center.divideScalar(Math.max(1, alive.length));
  game.ending = { t: 0, stage: 0, bossPos: boss.pos.clone(), center, pieces: [], beam: null };
  netFx({ k: 'end0', id: boss.plateId });
  const C = CASTLES[castleOf(game.floorIdx)];
  coopToast(`악마왕 ${C.boss}이(가) 쓰러졌다`, '탑을 뒤덮던 어둠이 걷힌다…', 3.2);
  coopLog(`악마왕 ${C.boss}이(가) 쓰러졌습니다!`, 'gold');
}

// 다음 성으로 이동 (성 클리어 보상: 파티 완전 회복 + 성물 카운터 리셋)
function goToCastle(ci) {
  $('end-screen').style.display = 'none';
  game.parchments = 0;
  for (const u of game.party) {
    if (!u.alive) u.revive(1);
    u.hp = u.maxhp;
  }
  game.state = 'play';
  coopFlash();
  loadFloor(ci * 10);
  coopLog(CASTLES[ci - 1].travelText, 'gold');
}

function updateEnding(dt) {
  const E = game.ending;
  E.t += dt;
  for (const u of game.party) { if (u.alive) { u.anim.base(false); u.anim.update(dt); } }
  for (let i = game.corpses.length - 1; i >= 0; i--) {
    const c = game.corpses[i];
    c.anim.update(dt);
    if (c.t < 100) { c.t -= dt; if (c.t <= 0) { game.floorGroup.remove(c.mesh); game.corpses.splice(i, 1); } }
  }
  updateEffects(dt);
  updateSpirit(dt);

  let camTarget = E.bossPos, camOff = new THREE.Vector3(0, 6, 8);

  const ci = castleOf(game.floorIdx);
  const C = CASTLES[ci];
  const total = castleRelicTotal(ci);

  // stage 0 → 1: 성물 소환
  if (E.stage === 0 && E.t > 3.2) {
    E.stage = 1;
    coopFlash(); sfx.grace();
    coopToast(`${total}개의 ${C.relic}`, '조각들이 스스로 빛나며 떠오른다', 3.5);
    netFx({ k: 'end1', cx: +E.center.x.toFixed(1), cz: +E.center.z.toFixed(1), total });
    for (let i = 0; i < total; i++) {
      const g = new THREE.Group();
      const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.0),
        new THREE.MeshBasicMaterial({ color: 0xe8d4a0, side: THREE.DoubleSide }));
      g.add(paper, glowSprite(0xffd970, 1.4));
      game.floorGroup.add(g);
      E.pieces.push({ mesh: g, a: (i / total) * Math.PI * 2, y: 1.5 + Math.random() * 2.5 });
    }
  }
  // stage 1: 나선 수렴
  if (E.stage === 1) {
    camTarget = E.center; camOff = new THREE.Vector3(0, 7, 10);
    const k = Math.min(1, (E.t - 3.2) / 4.2);
    const r = 9 * (1 - k) + 0.3;
    for (const p of E.pieces) {
      const a = p.a + E.t * (1.2 + k * 2.5);
      p.mesh.position.set(
        E.center.x + Math.cos(a) * r,
        p.y * (1 - k) + 4.2 * k,
        E.center.z + Math.sin(a) * r,
      );
      p.mesh.rotation.set(0, a + Math.PI / 2, 0.3);
    }
    if (k >= 1) {
      E.stage = 2;
      coopFlash(); sfx.ult();
      for (const p of E.pieces) { game.floorGroup.remove(p.mesh); }
      E.pieces = [];
      // 하나로 합쳐진 빛 — 다음 성(최종장은 하늘)을 가리키는 빛줄기
      E.beam = buildEndBeam(E.center.x, E.center.z, !!C.final);
      netFx({ k: 'end2', cx: +E.center.x.toFixed(1), cz: +E.center.z.toFixed(1), final: !!C.final });
      if (C.final) {
        coopToast(`${C.relic}이(가) 하나로 이어졌다`, '빛기둥이 하늘로 곧게 솟아오른다 — 순례가 끝났다', 4.5);
        coopLog('빛이 하늘에 닿았습니다 — 순례의 끝', 'gold');
      } else {
        coopToast(`${C.relic}이(가) 하나로 이어졌다`, `금빛 지도가 ${C.nextDir} — ${C.nextName}을(를) 가리킨다`, 4.5);
        coopLog(`금빛 지도가 ${C.nextName}의 위치를 드러냅니다`, 'gold');
      }
    }
  }
  // stage 2+: 빛줄기 감상 → 선택지 (카메라는 빛줄기에 고정)
  if (E.stage >= 2) {
    camTarget = E.center; camOff = new THREE.Vector3(0, 9, 14);
    if (E.beam) {
      const pulse = 0.5 + Math.sin(E.t * 4) * 0.12;
      E.beam.children[0].material.opacity = pulse;
    }
    if (E.stage === 2 && E.t > 11.5) {
      E.stage = 3;
      netFx({ k: 'end3' });
      if (C.final) { // ---- 진 엔딩: 순례의 끝 → 회차 선택 ----
        const record = `순례의 기록 — ${game.cycle}회차 완주 · Lv.${game.level} · ${game.player.def.name}의 승리`;
        showEnd('✠ 순례의 끝 ✠',
          `${C.clearText}\n${C.epilogue}\n\n${record}`,
          [
            { label: `${game.cycle + 1}회차 순례를 시작한다 ✠`, fn: startNewCycle },
            { label: '아멘 — 순례를 마친다', fn: () => location.reload() },
          ]);
        return;
      }
      const nextCi = ci + 1;
      const hasNext = nextCi * 10 < FLOORS.length; // 다음 성이 구현되어 있는가
      const record = `이번 순례의 기록 — Lv.${game.level} · ${C.relic} ${game.parchments}/${total} · ${game.player.def.name}의 승리`;
      const story = `${C.clearText}\n${total}개의 ${C.relic}이 하나로 이어지자 금빛 지도가 ${C.nextDir}를 가리켰다 —\n${C.nextDesc}.\n\n${record}`;
      showEnd(`${nextCi + 1}번째 성으로 가시겠습니까?`, story, [
        {
          label: `제${nextCi + 1}성으로 간다 ✠`,
          fn: hasNext
            ? () => goToCastle(nextCi)
            : () => showEnd(`제${nextCi + 1}성 — ${C.nextName}`,
              `${C.travelText}\n다음 성문은 아직 봉인되어 있다 — 다음 장(Lv.${nextCi * 10 + 1}~${nextCi * 10 + 10} 확장)에서 계속.`,
              [{ label: '타이틀로 돌아가기', fn: () => location.reload() }]),
        },
        { label: '여기서 순례를 마친다', fn: () => location.reload() },
      ]);
    }
  }
  // 시네마틱 카메라
  const look = camTarget;
  camera.position.lerp(new THREE.Vector3(look.x + camOff.x, look.y + camOff.y, look.z + camOff.z), 1.6 * dt);
  camera.lookAt(look.x, look.y + 1.5, look.z);
}

// ---------- 입력 ----------
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') e.preventDefault();
  game.keys[e.code] = true;
});
window.addEventListener('keyup', (e) => { game.keys[e.code] = false; });
window.addEventListener('wheel', (e) => {
  game.camDist = Math.max(9, Math.min(26, game.camDist + Math.sign(e.deltaY) * 1.4));
});
// ---- 모바일 터치 조작 (스프린트5) — 포인터 이벤트라 데스크톱에서도 검증 가능 ----
if (IS_TOUCH) document.body.classList.add('touch');
window.addEventListener('touchstart', function once() {
  document.body.classList.add('touch'); // 하이브리드 기기 대응
  initAudio(); // 모바일 오디오 언락
  window.removeEventListener('touchstart', once);
}, { passive: true });

{
  const joy = $('joy'), knob = $('joy-knob');
  const JOY_R = 46;
  let joyId = null;
  const joyVec = (e) => {
    const r = joy.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > JOY_R) { dx *= JOY_R / len; dy *= JOY_R / len; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    game.touchInput.ix = dx / JOY_R;
    game.touchInput.iz = dy / JOY_R;
  };
  joy.addEventListener('pointerdown', (e) => { joyId = e.pointerId; joy.setPointerCapture(joyId); joyVec(e); });
  joy.addEventListener('pointermove', (e) => { if (e.pointerId === joyId) joyVec(e); });
  const joyEnd = (e) => {
    if (e.pointerId !== joyId) return;
    joyId = null;
    game.touchInput.ix = game.touchInput.iz = 0;
    knob.style.transform = '';
  };
  joy.addEventListener('pointerup', joyEnd);
  joy.addEventListener('pointercancel', joyEnd);

  $('btn-dodge').addEventListener('pointerdown', (e) => { e.preventDefault(); game.touchInput.dodgePulse = true; });
  $('hotbar').addEventListener('pointerdown', (e) => { // 핫바 탭 = 스킬 (데스크톱 클릭도 동작)
    const slot = e.target.closest('.slot');
    if (slot) game.touchInput.skillPulse[+slot.id.split('-')[1]] = true;
  });
}

let dragging = false, dragX = 0;
window.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('pointerdown', (e) => {
  if (e.button === 2) { dragging = true; dragX = e.clientX; }
  else if (e.button === 0 && game.state === 'play' && e.target === renderer.domElement) {
    // 클릭 타겟팅 (캔버스 한정 — 조이스틱/버튼 탭 제외)
    const ndc = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(game.enemies.filter((en) => en.revealed !== false).map((en) => en.mesh), true);
    if (hits.length) {
      let o = hits[0].object;
      while (o && !o.userData.owner) o = o.parent;
      if (o) { game.target = o.userData.owner; sfx.select(); }
    }
  }
});
window.addEventListener('pointermove', (e) => {
  if (dragging) {
    game.camYaw -= (e.clientX - dragX) * 0.008;
    dragX = e.clientX;
  }
});
window.addEventListener('pointerup', (e) => { if (e.button === 2) dragging = false; });

// ---------- 메인 루프 ----------
function updateGame(dt) {
  if (game.shieldT > 0) game.shieldT -= dt;
  if (game.guardT > 0) game.guardT -= dt;
  if (game.tauntT > 0) game.tauntT -= dt;
  for (const u of game.party) {
    for (let i = 0; i < 4; i++) u.cool[i] = Math.max(0, u.cool[i] - dt);
    u.dodgeCd = Math.max(0, u.dodgeCd - dt);
    u.dodgeFxT = Math.max(0, u.dodgeFxT - dt);
    u.charmResistT = Math.max(0, u.charmResistT - dt);
  }

  for (let i = game.pending.length - 1; i >= 0; i--) {
    const p = game.pending[i];
    p.t -= dt;
    if (p.t <= 0) { game.pending.splice(i, 1); p.fn(); }
  }

  if (game.player.alive) updatePlayer(game.player, dt, getLocalInput(1));
  if (game.player2 && game.player2.alive) updatePlayer(game.player2, dt, game.netP2 ? net.state.remoteInput : getLocalInput(2));
  for (const u of game.party) if (!u.isPlayer && u !== game.player2 && u.alive) updateCompanion(u, dt);
  for (const e of [...game.enemies]) e.update(dt);

  // 어둠 층: 인지 기반 공개 — 렌더/네임플레이트/미니맵/타겟팅이 전부 이 값을 쓴다
  const dark = !!FLOORS[game.floorIdx].dark;
  const seers = [game.player, game.player2].filter((u) => u && u.alive);
  for (const e of game.enemies) {
    e.revealed = !dark || seers.some((u) =>
      e.pos.distanceTo(u.pos) <= 14 && !sightBlocked(u.pos.x, u.pos.z, e.pos.x, e.pos.z));
    e.mesh.visible = e.revealed;
  }
  if (game.target && game.target.revealed === false) game.target = null; // 가려지면 락 해제

  updateProjectiles(dt);
  updateGimmicks(dt);
  updateEffects(dt);
  updateTelegraphs(dt);
  updateSpirit(dt);

  for (const u of game.party) u.anim.update(dt);
  for (const e of game.enemies) e.anim.update(dt);
  for (let i = game.corpses.length - 1; i >= 0; i--) {
    const c = game.corpses[i];
    c.anim.update(dt);
    c.t -= dt;
    if (c.t <= 0) { game.floorGroup.remove(c.mesh); game.corpses.splice(i, 1); }
  }

  if (game.portal) {
    game.portal.rotation.y += dt * 0.5;
    const touchers = [game.player, game.player2].filter((u) => u && u.alive);
    if (touchers.some((u) => u.pos.distanceTo(game.portal.position) < 2.4)) {
      if (game.floorIdx + 1 < FLOORS.length) loadFloor(game.floorIdx + 1);
    }
  }

  // 카메라 — 2P가 있으면 두 사람의 중점 + 거리 비례 줌아웃
  let fx = game.player.pos.x, fz = game.player.pos.z, extra = 0;
  if (game.player2 && game.player2.alive) {
    fx = (fx + game.player2.pos.x) / 2;
    fz = (fz + game.player2.pos.z) / 2;
    extra = Math.min(6, game.player.pos.distanceTo(game.player2.pos) * 0.25);
  }
  const d = game.camDist + extra;
  const cx = fx + Math.sin(game.camYaw) * d * 0.72;
  const cz = fz + Math.cos(game.camYaw) * d * 0.72;
  camera.position.lerp(new THREE.Vector3(cx, d * 0.85, cz), 5 * dt);
  if (game.shakeT > 0) { // 카메라 셰이크 — 감쇠하며 흔들림
    game.shakeT -= dt;
    const a = game.shakeAmp * Math.max(0, game.shakeT) * 2.5;
    camera.position.x += (Math.random() - 0.5) * a;
    camera.position.y += (Math.random() - 0.5) * a * 0.6;
    camera.position.z += (Math.random() - 0.5) * a;
    if (game.shakeT <= 0) game.shakeAmp = 0;
  }
  camera.lookAt(fx, 1.2, fz);

  // 벽이 카메라-플레이어 사이를 가리면 반투명 (낮은 앵글에서만 발생)
  for (let i = 0; i < game.walls.length; i++) {
    const w = game.walls[i], m = game.wallMeshes[i];
    if (!m) continue;
    let fade = false;
    const t = segRectT(camera.position.x, camera.position.z, fx - camera.position.x, fz - camera.position.z, w);
    if (t !== null && camera.position.y + (1.2 - camera.position.y) * t < 2.5) fade = true;
    m.material.opacity += ((fade ? 0.35 : 1) - m.material.opacity) * Math.min(1, dt * 8);
  }

  fog.update(camera, game.player.pos.x, game.player.pos.z, castWallRay, dt);

  updateHUD();

  // 코옵 호스트: 스냅샷 송신 (~15Hz)
  if (game.netP2 && net.state.peer) {
    game.snapT = (game.snapT ?? 0) - dt;
    if (game.snapT <= 0) {
      game.snapT = 0.07;
      net.send(buildSnap());
    }
  }
}

// ============================================================
// 온라인 코옵 (M2) — 호스트 권위 + 씬 게스트
// ============================================================
function buildSnap() {
  const newE = [], list = [];
  for (const e of game.enemies) {
    if (!game.knownIds.has(e.plateId)) {
      game.knownIds.add(e.plateId);
      newE.push({
        id: e.plateId, model: e.spec.model, tint: e.spec.tint,
        h: (e.spec.boss ? 1.9 : 1.7) * e.scale, name: e.spec.name,
        elite: !!(e.spec.decurion || e.spec.boss), boss: !!e.spec.boss, title: e.spec.title || '',
      });
    }
    list.push({ id: e.plateId, x: +e.pos.x.toFixed(2), z: +e.pos.z.toFixed(2), ry: +e.mesh.rotation.y.toFixed(2), hp: Math.round(e.hp), mh: e.maxhp, o: e.anim.onceInfo() });
  }
  return {
    t: 'snap', dayT: Math.round(game.dayT), lv: game.level,
    party: game.party.map((u) => ({ x: +u.pos.x.toFixed(2), z: +u.pos.z.toFixed(2), ry: +u.mesh.rotation.y.toFixed(2), hp: Math.round(u.hp), mh: u.maxhp, al: u.alive, o: u.anim.onceInfo() })),
    cool: game.player2 ? game.player2.cool.map((c) => +c.toFixed(1)) : [0, 0, 0, 0],
    en: list, newE,
    proj: game.projectiles.map((pr) => ({ x: +pr.mesh.position.x.toFixed(1), z: +pr.mesh.position.z.toFixed(1), f: pr.friendly ? 1 : 0 })),
    portal: game.portal ? { x: game.portal.position.x, z: game.portal.position.z } : null,
  };
}

function sendFloor() {
  net.send({
    t: 'floor', idx: game.floorIdx, cycle: game.cycle,
    patches: game.patches.map((pa) => ({ x: +pa.x.toFixed(1), z: +pa.z.toFixed(1) })),
    obstacles: game.obstacles.map((o) => ({ x: +o.x.toFixed(1), z: +o.z.toFixed(1) })),
    turrets: game.turrets.map((tu) => ({ x: tu.x, z: tu.z })),
  });
}

function assignNetP2() {
  const u = game.party.find((m) => !m.isPlayer && m.key === game.coopGuestChar)
    || game.party.find((m) => !m.isPlayer);
  if (!u) return;
  if (game.player2) game.player2.p2 = false;
  u.p2 = true;
  game.player2 = u;
  game.netP2 = true;
  game.knownIds = new Set(); // 게스트에게 전체 재전송
  ui.buildParty(game.party);
  net.send({ t: 'start', chars: game.party.map((m) => m.key), p2: game.party.indexOf(u), level: game.level, cycle: game.cycle });
  sendFloor();
  coopToast('온라인 동료 합류!', `원격 순례자가 ${u.def.name}을(를) 조종합니다`, 4);
  coopLog('온라인 코옵 시작 — 호스트 권위 모드', 'gold');
}

function onNetPeerLeft() {
  if (game.netP2 && game.player2) {
    game.player2.p2 = false;
    game.player2 = null;
    game.netP2 = false;
    ui.buildParty(game.party);
    coopToast('', '원격 동료가 떠났다 — AI가 이어받는다');
    coopLog('원격 동료 접속 종료 — AI 복귀', 'dim');
  }
  game.coopPendingP2 = false;
  if (guest.active) {
    guest.active = false;
    coopToast('연결 끊김', '호스트와의 연결이 끊어졌습니다', 4);
  }
}

// ---------- 순례 준비실 (로비): 캐릭터 슬롯 협상 ----------
const lobby = { active: false, role: null, myPick: null, otherPick: null, room: '' };

function showLobby(role, room) {
  lobby.active = true;
  lobby.role = role;
  lobby.room = room;
  lobby.myPick = null;
  lobby.otherPick = null;
  $('lobby-panel').style.display = 'block';
  renderLobby();
}

function renderLobby() {
  if (!lobby.active) return;
  $('lobby-room').textContent = lobby.room;
  $('lobby-peer').textContent = net.state.peer ? '접속됨 ✓' : '대기 중…';
  const hostPick = lobby.role === 'host' ? lobby.myPick : lobby.otherPick;
  const guestPick = lobby.role === 'host' ? lobby.otherPick : lobby.myPick;
  const buildRow = (elId, pick, mine, taken) => {
    const row = $(elId);
    row.innerHTML = '';
    for (const def of Object.values(CHARACTERS)) {
      const b = document.createElement('button');
      b.className = `lobby-pick${pick === def.key ? ' picked' : ''}${taken === def.key ? ' taken' : ''}`;
      b.textContent = `${def.portrait} ${def.name}`;
      b.disabled = !mine || taken === def.key;
      if (mine) b.addEventListener('click', () => lobbyPick(def.key));
      row.appendChild(b);
    }
  };
  buildRow('lobby-host-picks', hostPick, lobby.role === 'host', guestPick);
  buildRow('lobby-guest-picks', guestPick, lobby.role === 'guest', hostPick);
  const isHost = lobby.role === 'host';
  $('lobby-start').style.display = isHost ? 'inline-block' : 'none';
  $('lobby-wait').style.display = isHost ? 'none' : 'inline';
  $('lobby-start').disabled = !hostPick || (net.state.peer && !guestPick);
}

function lobbyPick(key) {
  if (lobby.role === 'host') {
    if (key === lobby.otherPick) return;
    lobby.myPick = key;
    net.send({ t: 'lobby', h: lobby.myPick, g: lobby.otherPick });
  } else {
    net.send({ t: 'pickreq', key });
  }
  renderLobby();
}

function onHostMsg(m) { // 호스트가 받는 게스트발 메시지
  if (m.t === 'pickreq') {
    if (m.key !== lobby.myPick) lobby.otherPick = m.key;
    net.send({ t: 'lobby', h: lobby.myPick, g: lobby.otherPick });
    renderLobby();
  }
}

// ---------- 게스트 모드: 스냅샷 퍼핏 렌더링 ----------
const guest = { active: false, party: [], units: [], enemies: new Map(), proj: [], p2i: 1, chars: [], cool: null, portalPos: null, portalMesh: null, inputTimer: null, tides: [], dying: [], ending: null };

function makePuppet(model, tint, height, def = null, parent = scene) {
  const { obj, clips } = spawnModel(model, { tint, height });
  if (def) applyNunCustom(obj, def);
  const mesh = new THREE.Group();
  obj.rotation.y = MODEL_YAW;
  mesh.add(obj);
  const anim = makeAnimator(obj, clips);
  anim.play('idle');
  parent.add(mesh);
  return { mesh, anim, tx: 0, tz: 0, try: 0, hp: 1, mh: 1, dead: false, name: '', elite: false, boss: false, title: '' };
}

function applyOnce(pp, o) {
  if (!o || !o.n || pp.dead) return;
  if (pp.onceSeq === o.s) return;
  pp.onceSeq = o.s;
  pp.anim.play(o.n, { once: true });
}

function getGuestInput() {
  const b = getLocalInput(1);
  const v = new THREE.Vector3(b.ix, 0, b.iz);
  if (v.lengthSq() > 0) v.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), game.camYaw);
  return { ix: +v.x.toFixed(3), iz: +v.z.toFixed(3), skills: b.skills, world: true };
}

function onGuestMsg(m) {
  if (m.t === 'lobby') { lobby.otherPick = m.h; lobby.myPick = m.g; renderLobby(); return; }
  if (m.t === 'start') guestStart(m);
  else if (m.t === 'floor') guestFloor(m);
  else if (m.t === 'snap') guestSnap(m);
  else if (m.t === 'fx') guestFx(m);
}

function guestFx(m) {
  if (!guest.active) return;
  switch (m.k) {
    case 'toast': ui.toast(...m.a); break;
    case 'log': ui.log(...m.a); break;
    case 'flash': ui.goldFlash(); break;
    case 'ring': ringEffect(new THREE.Vector3(m.x, 0, m.z), m.r, m.c); break;
    case 'burst': burstEffect(new THREE.Vector3(m.x, 0, m.z), m.c, m.sz); break;
    case 'dmg': {
      const sc = toScreen(new THREE.Vector3(m.x, 0, m.z), m.h || 2);
      if (sc.front) ui.damageNumber(sc.x, sc.y, m.v, m.cls);
      break;
    }
    case 'warn': { // 분화 경고
      const w = new THREE.Mesh(new THREE.RingGeometry(m.r * 0.7, m.r, 24),
        new THREE.MeshBasicMaterial({ color: 0xff8820, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
      w.rotation.x = -Math.PI / 2;
      w.position.set(m.x, 0.08, m.z);
      game.floorGroup.add(w);
      game.effects.push({ mesh: w, t: 0, dur: 1.0, grow: 0 });
      break;
    }
    case 'tide': { // 해일 벽 — 게스트가 같은 속도로 재현
      guest.tides.push({ mesh: tideWallVisual(m.dx, m.dz), dx: m.dx, dz: m.dz });
      sfx.tide();
      break;
    }
    case 'end0': { // 보스 시체 유지 + 사망 모션
      const pp = guest.enemies.get(m.id);
      if (pp) { pp.corpse = true; pp.dead = true; pp.anim.play('death', { once: true }); }
      break;
    }
    case 'end1': { // 성물 조각 소환
      guest.ending = { t: 0, cx: m.cx, cz: m.cz, pieces: [] };
      for (let i = 0; i < m.total; i++) {
        const g = new THREE.Group();
        const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.0),
          new THREE.MeshBasicMaterial({ color: 0xe8d4a0, side: THREE.DoubleSide }));
        g.add(paper, glowSprite(0xffd970, 1.4));
        game.floorGroup.add(g);
        guest.ending.pieces.push({ mesh: g, a: (i / m.total) * Math.PI * 2, y: 1.5 + Math.random() * 2.5 });
      }
      sfx.grace();
      break;
    }
    case 'end2': { // 빛기둥
      if (guest.ending) {
        for (const pc of guest.ending.pieces) game.floorGroup.remove(pc.mesh);
        guest.ending.pieces = [];
      }
      buildEndBeam(m.cx, m.cz, m.final);
      sfx.ult();
      break;
    }
    case 'end3': ui.toast('', '호스트가 다음 여정을 선택하고 있습니다…', 5); break;
  }
}

function guestStart(m) {
  guest.active = true;
  guest.chars = m.chars;
  guest.p2i = m.p2;
  game.level = m.level;
  game.cycle = m.cycle;
  for (const pp of guest.party) scene.remove(pp.mesh);
  guest.party = m.chars.map((key) => {
    const def = CHARACTERS[key];
    return makePuppet(def.model, def.tint, def.height, def, scene);
  });
  guest.units = m.chars.map((key, i) => ({ def: CHARACTERS[key], hp: 1, maxhp: 1, alive: true, isPlayer: false, p2: i === m.p2 }));
  ui.buildParty(guest.units);
  ui.buildHotbar(CHARACTERS[m.chars[m.p2]].skills);
  if (!game.spirit) game.spirit = buildSpirit();
  $('title-screen').style.display = 'none';
  $('select-screen').style.display = 'none';
  $('lobby-panel').style.display = 'none';
  lobby.active = false;
  $('hud').style.display = 'block';
  game.state = 'guestmode';
  coopToast('순례에 합류!', `당신은 ★2 ${CHARACTERS[m.chars[m.p2]].name} — WASD 이동 · 1~4 스킬`, 5);
  coopLog('호스트의 순례에 합류했습니다', 'gold');
  if (!guest.inputTimer) {
    guest.inputTimer = setInterval(() => {
      if (guest.active) net.send({ t: 'input', i: getGuestInput() });
    }, 50);
  }
}

function guestFloor(m) {
  game.floorIdx = m.idx;
  game.cycle = m.cycle;
  const F = FLOORS[m.idx];
  clearFloor();
  setFloorAtmosphere(F);
  buildFloorBase(F);
  for (const c of m.patches || []) patchVisual(F, c.x, c.z);
  for (const c of m.obstacles || []) obstacleVisual(F, c.x, c.z);
  for (const c of m.turrets || []) turretVisual(F, c.x, c.z);
  if (F.whirl) game.whirl = { x: 0, z: -2, ...F.whirl, rings: whirlRingsVisual(F), guestOnly: true };
  guest.enemies.clear();
  guest.proj = [];
  guest.portalMesh = null;
  guest.portalPos = null;
  guest.tides = [];
  guest.dying = [];
  guest.ending = null;
  const ci = castleOf(m.idx);
  const cyc = game.cycle > 1 ? `[${game.cycle}회차] ` : '';
  $('floor-label').textContent = `${cyc}제${ci + 1}성 ${F.n}층 · ${F.name}`;
  coopToast(`${F.n}층 — ${F.name}`, F.intro, 4);
}

function guestSnap(m) {
  if (!guest.active) return;
  game.dayT = m.dayT;
  game.level = m.lv;
  guest.cool = m.cool;
  guest.portalPos = m.portal;
  m.party.forEach((p, i) => {
    const pp = guest.party[i];
    if (!pp) return;
    pp.tx = p.x; pp.tz = p.z; pp.try = p.ry;
    const u = guest.units[i];
    u.hp = p.hp; u.maxhp = p.mh; u.alive = p.al;
    if (!p.al && !pp.dead) { pp.dead = true; pp.anim.play('death', { once: true }); }
    else if (p.al && pp.dead) { pp.dead = false; pp.anim.play('idle'); }
    else applyOnce(pp, p.o);
  });
  for (const ne of m.newE || []) {
    if (guest.enemies.has(ne.id)) continue;
    const pp = makePuppet(ne.model, ne.tint, ne.h, null, game.floorGroup);
    pp.name = ne.name; pp.elite = ne.elite; pp.boss = ne.boss; pp.title = ne.title;
    guest.enemies.set(ne.id, pp);
  }
  const seen = new Set();
  for (const e of m.en || []) {
    seen.add(e.id);
    const pp = guest.enemies.get(e.id);
    if (!pp) continue;
    if (pp.tx === 0 && pp.tz === 0 && pp.mesh.position.lengthSq() === 0) pp.mesh.position.set(e.x, 0, e.z); // 첫 스냅: 즉시 배치
    pp.tx = e.x; pp.tz = e.z; pp.try = e.ry; pp.hp = e.hp; pp.mh = e.mh;
    applyOnce(pp, e.o);
  }
  for (const [id, pp] of guest.enemies) {
    if (!seen.has(id)) {
      if (pp.corpse) continue; // 엔딩: 보스 시체 유지
      guest.enemies.delete(id);
      pp.dead = true;
      pp.anim.play('death', { once: true });
      guest.dying.push({ pp, t: 1.4 }); // 사망 모션 후 제거
    }
  }
  const pr = m.proj || [];
  while (guest.proj.length < pr.length) {
    const sp = glowSprite(0x9adfff, 1.0);
    game.floorGroup.add(sp);
    guest.proj.push(sp);
  }
  while (guest.proj.length > pr.length) {
    const sp = guest.proj.pop();
    if (sp.parent) sp.parent.remove(sp);
  }
  pr.forEach((p, i) => {
    const sp = guest.proj[i];
    sp.position.set(p.x, 1.2, p.z);
    sp.material.color.setHex(p.f ? 0x9adfff : 0xd05050);
  });
  if (m.portal && !guest.portalMesh) guest.portalMesh = buildPortalVisual(m.portal.x, m.portal.z);
}

function guestFrame(dt) {
  const k = Math.min(1, 10 * dt);
  const all = [...guest.party, ...guest.enemies.values()];
  for (const pp of all) {
    const dx = pp.tx - pp.mesh.position.x, dz = pp.tz - pp.mesh.position.z;
    const moving = dx * dx + dz * dz > 0.02;
    pp.mesh.position.x += dx * k;
    pp.mesh.position.z += dz * k;
    let dr = pp.try - pp.mesh.rotation.y;
    while (dr > Math.PI) dr -= Math.PI * 2;
    while (dr < -Math.PI) dr += Math.PI * 2;
    pp.mesh.rotation.y += dr * k;
    if (!pp.dead) pp.anim.base(moving);
    pp.anim.update(dt);
  }
  if (game.whirl) for (const r of game.whirl.rings) r.rotation.z += dt * 1.6;
  if (guest.portalMesh) guest.portalMesh.rotation.y += dt * 0.5;
  // 해일 벽 재현 (호스트와 같은 속도)
  for (let i = guest.tides.length - 1; i >= 0; i--) {
    const td = guest.tides[i];
    td.mesh.position.x += td.dx * 13 * dt;
    td.mesh.position.z += td.dz * 13 * dt;
    const off = td.dx ? td.mesh.position.x : td.mesh.position.z;
    if (Math.abs(off) > ARENA + 2) {
      game.floorGroup.remove(td.mesh);
      guest.tides.splice(i, 1);
    }
  }
  // 사망 모션 후 제거
  for (let i = guest.dying.length - 1; i >= 0; i--) {
    const d = guest.dying[i];
    d.pp.anim.update(dt);
    d.t -= dt;
    if (d.t <= 0) {
      (d.pp.mesh.parent || scene).remove(d.pp.mesh);
      guest.dying.splice(i, 1);
    }
  }
  // 엔딩: 성물 조각 나선 수렴 재현
  if (guest.ending && guest.ending.pieces.length) {
    const E = guest.ending;
    E.t += dt;
    const gk = Math.min(1, E.t / 4.2);
    const r = 9 * (1 - gk) + 0.3;
    for (const pc of E.pieces) {
      const a = pc.a + E.t * (1.2 + gk * 2.5);
      pc.mesh.position.set(E.cx + Math.cos(a) * r, pc.y * (1 - gk) + 4.2 * gk, E.cz + Math.sin(a) * r);
      pc.mesh.rotation.set(0, a + Math.PI / 2, 0.3);
    }
  }
  updateEffects(dt);
  updateSpirit(dt, guest.party.map((pp) => pp.mesh.position));

  const me = guest.party[guest.p2i];
  if (me) {
    const d = game.camDist;
    camera.position.lerp(new THREE.Vector3(
      me.mesh.position.x + Math.sin(game.camYaw) * d * 0.72, d * 0.85,
      me.mesh.position.z + Math.cos(game.camYaw) * d * 0.72), 5 * dt);
    camera.lookAt(me.mesh.position.x, 1.2, me.mesh.position.z);
  }

  // HUD
  ui.updateParty(guest.units, game.level);
  ui.expBar(1, game.level);
  if (guest.cool) {
    ui.updateHotbar(CHARACTERS[guest.chars[guest.p2i]].skills.map((sk, i) => ({
      cdFrac: Math.max(0, Math.min(1, guest.cool[i] / sk.cd)), locked: game.level < sk.unlock,
    })));
  }
  const plates = [];
  guest.party.forEach((pp, i) => {
    const sc = toScreen(pp.mesh.position, 2.3);
    plates.push({ id: `gp${i}`, x: sc.x, y: sc.y, visible: sc.front, name: `${i === guest.p2i ? '★2 ' : ''}${guest.units[i].def.name}`, frac: guest.units[i].hp / Math.max(1, guest.units[i].maxhp), cls: i === guest.p2i ? 'ally player' : 'ally' });
  });
  let bossInfo = null;
  for (const [id, pp] of guest.enemies) {
    const sc = toScreen(pp.mesh.position, 2.1);
    plates.push({ id, x: sc.x, y: sc.y, visible: sc.front, name: pp.name, frac: pp.hp / Math.max(1, pp.mh), cls: `enemy ${pp.elite ? 'elite' : ''}` });
    if (pp.boss) bossInfo = { name: `${pp.name} — ${pp.title}`, frac: pp.hp / Math.max(1, pp.mh) };
  }
  ui.updateNameplates(plates);
  ui.bossFrame(bossInfo);
  ui.updateMinimap({
    arena: ARENA,
    party: guest.party.map((pp, i) => ({ x: pp.mesh.position.x, z: pp.mesh.position.z, player: i === guest.p2i })),
    enemies: [...guest.enemies.values()].map((pp) => ({ x: pp.mesh.position.x, z: pp.mesh.position.z, elite: pp.elite })),
    portal: guest.portalPos, turrets: [],
  });
}

let last = 0;
function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
  last = t;
  // 예외가 콜백 밖으로 나가면 three.js가 다음 프레임 예약을 멈춰 게임이 영구 정지한다
  try {
    // fog 상태 게이트 — 이른 렌더 분기보다 먼저 (메뉴/선택 화면 누출 방지)
    fog.setEnabled(game.state === 'play' && !!(FLOORS[game.floorIdx] && FLOORS[game.floorIdx].dark));
    updateDayNight(dt);
    // 히트스톱 — 시뮬레이션만 12%로 감속 (실시간으로 회복)
    let simDt = dt;
    if (game.hitstopT > 0) { game.hitstopT -= dt; simDt = dt * FEEL.hitstop.scale; }
    if (game.state === 'play') updateGame(simDt);
    else if (game.state === 'ending') updateEnding(dt);
    else if (game.state === 'guestmode') guestFrame(dt);
    else if (game.spirit) { updateSpirit(dt); for (const u of game.party) u.anim.update(dt); }
    renderer.render(scene, camera);
    frameErrors = 0; // 정상 프레임이면 일시 오류 용서
  } catch (err) {
    console.error('frame error:', err);
    if (++frameErrors > 60) { // 매 프레임 실패 = 복구 불능 — 조용한 무한 루프 대신 멈추고 알린다
      renderer.setAnimationLoop(null);
      document.body.insertAdjacentHTML('beforeend',
        `<div style="position:fixed;inset:0;z-index:99;display:flex;align-items:center;justify-content:center;background:rgba(6,4,12,.9);color:#e8dcb8;font-size:14px;text-align:center;line-height:2">
          오류로 게임이 멈췄습니다.<br><a href="" style="color:#d8b45a">새로고침</a></div>`);
    }
  }
}
let frameErrors = 0;
renderer.setAnimationLoop(frame);
// 백그라운드 틱 — 탭이 가려져도 월드는 멈추지 않는다 (MMO식)
// 백그라운드 틱은 온라인 코옵 중에만 (솔로는 숨은 탭에서 일시정지 — 배터리 + 몰살 방지)
const bgTick = setInterval(() => { if (document.hidden && !game.testDrive && net.state.connected) frame(performance.now()); }, 50);
camera.position.set(0, 18, 26);
camera.lookAt(0, 0, 0);

// ---------- 부팅: 로딩 → 타이틀 → 선택 ----------
(async () => {
  await loadAll((frac, name) => {
    $('load-fill').style.width = `${Math.round(frac * 100)}%`;
    $('load-label').textContent = `성물을 준비하는 중… ${name}`;
  });
  $('loading-screen').style.display = 'none';
  $('title-screen').style.display = 'flex';
  game.state = 'title';
})();

{
  const wrap = $('char-cards');
  for (const def of Object.values(CHARACTERS)) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>${def.portrait} ${def.name}</h3>
      <div class="card-role">${def.role}</div>
      <div class="card-angel">수호천사 · ${def.angel}</div>
      <p>${def.desc}</p>
      <div class="card-skills">${def.skills.map((s) => `<span title="${s.name}">${s.icon}<em>Lv.${s.unlock}</em></span>`).join('')}</div>
      <div class="card-stats">HP ${def.hp} · 공격 ${def.dmg} · 성타 ${def.melee}</div>`;
    card.addEventListener('click', () => { sfx.select(); startGame(def.key); });
    wrap.appendChild(card);
  }
}
$('start-btn').addEventListener('click', () => {
  initAudio();
  sfx.select();
  $('title-screen').style.display = 'none';
  $('select-screen').style.display = 'flex';
});

// 개발용 치트 (PoC): 콘솔에서 __rc.loadFloor(9) 등으로 층 이동
$('reset-save').addEventListener('click', () => {
  localStorage.removeItem('rosario_save');
  location.reload();
});
function readAcct() {
  const name = $('acct-name').value.trim();
  game.acctName = name || null;
  try { if (name) localStorage.setItem('rosario_acct', name); } catch (e) { /* */ }
  return name;
}
$('coop-host').addEventListener('click', () => {
  const room = ($('coop-room').value || 'ROSARIO').trim().toUpperCase();
  const acct = readAcct();
  game.coopHost = true;
  net.connect(room, true, {
    onHosted: () => {
      $('coop-status').textContent = `방 [${room}] 생성`;
      showLobby('host', room);
    },
    onPeer: () => {
      $('coop-status').textContent = '동료가 접속했습니다!';
      if (game.state === 'play') assignNetP2();
      else { game.coopPendingP2 = true; renderLobby(); net.send({ t: 'lobby', h: lobby.myPick, g: lobby.otherPick }); }
    },
    onMsg: onHostMsg,
    onSave: onServerSave,
    onPeerLeft: () => { onNetPeerLeft(); renderLobby(); },
    onError: (msg) => { $('coop-status').textContent = `오류: ${msg}`; },
  }, acct);
});
$('coop-join').addEventListener('click', () => {
  const room = ($('coop-room').value || 'ROSARIO').trim().toUpperCase();
  const acct = readAcct();
  initAudio();
  net.connect(room, false, {
    onJoined: () => {
      $('coop-status').textContent = '접속 완료';
      showLobby('guest', room);
    },
    onMsg: onGuestMsg,
    onSave: onServerSave,
    onPeerLeft: onNetPeerLeft,
    onError: (msg) => { $('coop-status').textContent = `오류: ${msg}`; },
  }, acct);
});
$('lobby-start').addEventListener('click', () => {
  if (lobby.role !== 'host' || !lobby.myPick) return;
  initAudio();
  $('lobby-panel').style.display = 'none';
  lobby.active = false;
  game.coopGuestChar = lobby.otherPick;
  startGame(lobby.myPick);
});
try { $('acct-name').value = localStorage.getItem('rosario_acct') || ''; } catch (e) { /* */ }
loadProgress();

window.__rc = { game, loadFloor, startGame, gainExp, frame, startNewCycle, buyUpgrade, guest, net, assignNetP2, lobby, renderLobby,
  FEEL, Enemy, sightBlocked, castWallRay, pointInWall, fog, // 전투 테스트용
  grantRelic, equipRelic, relicM, applyRelicStats, migrateSave, // 성구 테스트용
  impactEffect, spritePoolSize: () => spritePool.length, // 풀링 테스트용
  applyCharm, // 밸런스 테스트용
  stopAutoFrame() { game.testDrive = true; renderer.setAnimationLoop(null); }, // 합성 프레임 전용 모드
};
if (location.search.includes('combat-test')) import('./combat-test.js');
