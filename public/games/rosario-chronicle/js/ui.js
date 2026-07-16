// ============================================================
// MMO HUD — 네임플레이트 / 데미지 숫자 / 미니맵 / 전투로그 /
// 핫바 / 파티 프레임 / 타겟 프레임 / 배너
// ============================================================
const $ = (id) => document.getElementById(id);

// ---- 전투 로그 ----
export function log(msg, cls = '') {
  const box = $('combat-log');
  const line = document.createElement('div');
  line.className = `log-line ${cls}`;
  line.textContent = msg;
  box.appendChild(line);
  while (box.children.length > 9) box.removeChild(box.firstChild);
  box.scrollTop = box.scrollHeight;
}

// ---- 중앙 배너 ----
let bannerTimer = null;
export function toast(title, sub = '', dur = 2.6) {
  const b = $('banner');
  b.querySelector('.b-title').textContent = title;
  b.querySelector('.b-sub').textContent = sub;
  b.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => b.classList.remove('show'), dur * 1000);
}

export function goldFlash() {
  const f = $('flash');
  f.classList.remove('go');
  void f.offsetWidth;
  f.classList.add('go');
}

// ---- 떠다니는 데미지 숫자 ----
export function damageNumber(x, y, text, cls = '') {
  if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return;
  const d = document.createElement('div');
  d.className = `dmg-num ${cls}`;
  d.textContent = text;
  d.style.left = `${x + (Math.random() * 30 - 15)}px`;
  d.style.top = `${y}px`;
  $('dmg-layer').appendChild(d);
  setTimeout(() => d.remove(), 950);
}

// ---- 네임플레이트 (풀링) ----
const plates = new Map();
export function updateNameplates(items) {
  const used = new Set();
  for (const it of items) {
    used.add(it.id);
    let p = plates.get(it.id);
    if (!p) {
      p = document.createElement('div');
      p.className = 'nameplate';
      p.innerHTML = `<div class="np-name"></div><div class="np-bar"><div class="np-fill"></div></div>`;
      $('plate-layer').appendChild(p);
      plates.set(it.id, p);
    }
    p.style.display = it.visible ? 'block' : 'none';
    if (!it.visible) continue;
    p.style.transform = `translate(-50%, -100%) translate(${it.x}px, ${it.y}px)`;
    p.className = `nameplate ${it.cls}`;
    p.querySelector('.np-name').textContent = it.name;
    p.querySelector('.np-fill').style.width = `${Math.max(0, it.frac * 100)}%`;
  }
  for (const [id, p] of plates) {
    if (!used.has(id)) { p.remove(); plates.delete(id); }
  }
}

// ---- 핫바 ----
export function buildHotbar(skills) {
  const bar = $('hotbar');
  bar.innerHTML = '';
  skills.forEach((s, i) => {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.id = `slot-${i}`;
    slot.innerHTML = `
      <div class="slot-icon">${s.icon}</div>
      <div class="slot-cd"></div>
      <div class="slot-lock">🔒<span>Lv.${s.unlock}</span></div>
      <div class="slot-key">${i + 1}</div>
      <div class="slot-tip"><b>${s.name}</b><br>${s.desc}<br><span>재사용 ${s.cd}초 · Lv.${s.unlock} 해금</span></div>`;
    bar.appendChild(slot);
  });
}
export function updateHotbar(states) {
  states.forEach((st, i) => {
    const slot = $(`slot-${i}`);
    if (!slot) return;
    slot.querySelector('.slot-cd').style.height = `${Math.round(st.cdFrac * 100)}%`;
    slot.classList.toggle('locked', st.locked);
    slot.classList.toggle('ready', !st.locked && st.cdFrac <= 0);
  });
}

// ---- 파티 프레임 ----
export function buildParty(party) {
  const list = $('party-frames');
  list.innerHTML = '';
  party.forEach((u, i) => {
    const f = document.createElement('div');
    f.className = 'pframe';
    f.id = `pframe-${i}`;
    f.innerHTML = `
      <div class="pf-portrait">${u.def.portrait}</div>
      <div class="pf-body">
        <div class="pf-name">${u.isPlayer ? '★ ' : u.p2 ? '★2 ' : ''}${u.def.name}<span class="pf-lv"></span></div>
        <div class="pf-bar"><div class="pf-fill"></div></div>
        <div class="pf-hp"></div>
      </div>`;
    list.appendChild(f);
  });
}
export function updateParty(party, level) {
  party.forEach((u, i) => {
    const f = $(`pframe-${i}`);
    if (!f) return;
    f.classList.toggle('dead', !u.alive);
    f.querySelector('.pf-lv').textContent = ` Lv.${level}`;
    f.querySelector('.pf-fill').style.width = `${Math.max(0, (u.hp / u.maxhp) * 100)}%`;
    f.querySelector('.pf-hp').textContent = `${Math.max(0, Math.ceil(u.hp))} / ${u.maxhp}`;
  });
}

// ---- 타겟 프레임 ----
export function setTarget(info) {
  const t = $('target-frame');
  if (!info) { t.style.display = 'none'; return; }
  t.style.display = 'block';
  t.classList.toggle('elite', !!info.elite);
  t.querySelector('.tf-name').textContent = info.name;
  t.querySelector('.tf-fill').style.width = `${Math.max(0, info.frac * 100)}%`;
  t.querySelector('.tf-sub').textContent = info.sub || '';
}

// ---- 미니맵 ----
const MM = 148;
export function updateMinimap({ party, enemies, portal, arena, turrets }) {
  const c = $('minimap');
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, MM, MM);
  ctx.fillStyle = 'rgba(8,8,14,0.75)';
  ctx.fillRect(0, 0, MM, MM);
  ctx.strokeStyle = '#4a4258';
  ctx.strokeRect(4, 4, MM - 8, MM - 8);
  const px = (v) => ((v + arena) / (arena * 2)) * (MM - 16) + 8;
  if (portal) {
    ctx.fillStyle = '#ffd970';
    ctx.beginPath(); ctx.arc(px(portal.x), px(portal.z), 5, 0, 7); ctx.fill();
  }
  if (turrets) for (const t of turrets) {
    ctx.fillStyle = '#8a5a9a';
    ctx.fillRect(px(t.x) - 2, px(t.z) - 2, 4, 4);
  }
  for (const e of enemies) {
    ctx.fillStyle = e.elite ? '#ff8030' : '#e04040';
    ctx.beginPath(); ctx.arc(px(e.x), px(e.z), e.elite ? 3.5 : 2.5, 0, 7); ctx.fill();
  }
  for (const u of party) {
    ctx.fillStyle = u.player ? '#ffd970' : '#50c878';
    ctx.beginPath(); ctx.arc(px(u.x), px(u.z), 3, 0, 7); ctx.fill();
  }
}

// ---- 시계 (낮/밤) ----
export function setClock(icon, label) {
  $('clock').textContent = `${icon} ${label}`;
}

// ---- 경험치 바 ----
export function expBar(frac, level) {
  $('exp-fill').style.width = `${Math.min(100, frac * 100)}%`;
  $('exp-label').textContent = `Lv.${level}`;
}

// ---- 보스 프레임 ----
export function bossFrame(info) {
  const b = $('boss-bar');
  if (!info) { b.style.display = 'none'; return; }
  b.style.display = 'block';
  b.querySelector('.bname').textContent = info.name;
  $('boss-fill').style.width = `${Math.max(0, info.frac * 100)}%`;
}
