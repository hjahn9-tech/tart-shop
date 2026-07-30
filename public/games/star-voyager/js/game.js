import * as THREE from 'three';

// ---------- state ----------
const state = { running: false, t: 0, hp: 100, score: 0, dist: 0, speed: 30, kills: 0, shake: 0 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- renderer / scene / camera ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02030a);
scene.fog = new THREE.Fog(0x02030a, 90, 250);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 500);
camera.position.set(0, 3.2, 12);
camera.lookAt(0, 0, -30);

scene.add(new THREE.AmbientLight(0x8899bb, 0.7));
const sun = new THREE.DirectionalLight(0xffffff, 1.4);
sun.position.set(30, 40, 10);
scene.add(sun);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------- starfield (2 parallax layers) ----------
function makeStars(count, size, speedMul, color) {
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    arr[i * 3] = (Math.random() - 0.5) * 160;
    arr[i * 3 + 1] = (Math.random() - 0.5) * 100;
    arr[i * 3 + 2] = -Math.random() * 270 + 20;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, sizeAttenuation: true, fog: false }));
  scene.add(pts);
  return { arr, geo, speedMul };
}
const starLayers = [makeStars(500, 0.35, 0.35, 0xaabbdd), makeStars(250, 0.7, 0.7, 0xffffff)];

// ---------- distant planet ----------
const planet = new THREE.Group();
const planetBall = new THREE.Mesh(
  new THREE.SphereGeometry(26, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0x6a4a8f, roughness: 0.9, emissive: 0x1a0f2e, fog: false })
);
const planetRing = new THREE.Mesh(
  new THREE.TorusGeometry(40, 2.2, 8, 64),
  new THREE.MeshStandardMaterial({ color: 0xc9b8e8, roughness: 0.8, fog: false })
);
planetRing.rotation.x = Math.PI / 2.4;
planet.add(planetBall, planetRing);
planet.position.set(-70, 32, -230);
scene.add(planet);

// ---------- player ship ----------
const ship = new THREE.Group();
{
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(0.7, 2.6, 8),
    new THREE.MeshStandardMaterial({ color: 0xd8e4f5, roughness: 0.4, metalness: 0.5 })
  );
  body.rotation.x = -Math.PI / 2; // nose toward -Z
  const cockpit = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0x36d5ff, roughness: 0.1, emissive: 0x0a4a66 })
  );
  cockpit.position.set(0, 0.28, -0.1);
  const wings = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 0.12, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x8ba3c7, roughness: 0.5, metalness: 0.4 })
  );
  wings.position.z = 0.55;
  const fin = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.9, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x8ba3c7, roughness: 0.5 })
  );
  fin.position.set(0, 0.5, 0.9);
  const engine = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x66f0ff })
  );
  engine.position.set(0, 0, 1.45);
  const engineLight = new THREE.PointLight(0x55e5ff, 3, 10);
  engineLight.position.copy(engine.position);
  ship.add(body, cockpit, wings, fin, engine, engineLight);
  ship.userData.engine = engine;
}
scene.add(ship);

const target = new THREE.Vector2(0, 0.5); // ship steering target (x, y)
const X_LIM = 10, Y_MIN = -4.5, Y_MAX = 6;

// ---------- input (mouse + touch) ----------
function steer(cx, cy, isTouch) {
  const nx = (cx / innerWidth) * 2 - 1;
  const ny = -(cy / innerHeight) * 2 + 1;
  target.x = clamp(nx * 11, -X_LIM, X_LIM);
  // touch: offset ship above finger so it isn't hidden under it
  target.y = clamp(ny * 6 + 0.8 + (isTouch ? 2.4 : 0), Y_MIN, Y_MAX);
}
addEventListener('mousemove', e => steer(e.clientX, e.clientY, false));
addEventListener('touchstart', e => { e.preventDefault(); steer(e.touches[0].clientX, e.touches[0].clientY, true); }, { passive: false });
addEventListener('touchmove', e => { e.preventDefault(); steer(e.touches[0].clientX, e.touches[0].clientY, true); }, { passive: false });

// ---------- procedural audio ----------
let AC = null;
function initAudio() { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* silent */ } }
function blip(freq, endFreq, dur, type, vol) {
  if (!AC) return;
  try {
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, AC.currentTime);
    o.frequency.exponentialRampToValueAtTime(endFreq, AC.currentTime + dur);
    g.gain.setValueAtTime(vol, AC.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + dur);
    o.connect(g).connect(AC.destination);
    o.start(); o.stop(AC.currentTime + dur);
  } catch (e) { /* silent */ }
}
const sndShot = () => blip(880, 220, 0.08, 'square', 0.05);
const sndBoom = () => blip(160, 30, 0.35, 'sawtooth', 0.22);
const sndHurt = () => blip(120, 45, 0.3, 'sawtooth', 0.3);

// ---------- shared geometry / materials ----------
const laserGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.8, 6);
laserGeo.rotateX(Math.PI / 2); // align along Z
const laserMat = new THREE.MeshBasicMaterial({ color: 0x5ff2ff });
const bulletGeo = new THREE.SphereGeometry(0.24, 8, 8);
const bulletMat = new THREE.MeshBasicMaterial({ color: 0xff4a6a });
const astGeo = new THREE.DodecahedronGeometry(1, 0);
const astMat = new THREE.MeshStandardMaterial({ color: 0x8a7f72, roughness: 1, flatShading: true });
const shardGeo = new THREE.TetrahedronGeometry(0.3, 0);
const shardMatOrange = new THREE.MeshBasicMaterial({ color: 0xffa040 });
const shardMatCyan = new THREE.MeshBasicMaterial({ color: 0x7fe8ff });

// ---------- enemy factory ----------
function makeEnemy() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(0.8, 2.2, 6),
    new THREE.MeshStandardMaterial({ color: 0x3a2f4a, roughness: 0.6, metalness: 0.3 })
  );
  body.rotation.x = Math.PI / 2; // nose toward +Z (facing player)
  const wings = new THREE.Mesh(
    new THREE.BoxGeometry(3, 0.1, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x5a4a72, roughness: 0.6 })
  );
  wings.position.z = -0.4;
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff3355 }));
  eye.position.z = 1.15;
  g.add(body, wings, eye);
  return g;
}

// ---------- entity arrays ----------
const lasers = [], asteroids = [], enemies = [], bullets = [], shards = [];

function explode(pos, mat, n, power) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(shardGeo, mat);
    m.position.copy(pos);
    m.userData.vel = new THREE.Vector3(
      (Math.random() - 0.5) * power, (Math.random() - 0.5) * power, (Math.random() - 0.5) * power
    );
    m.userData.life = 0.5 + Math.random() * 0.3;
    m.userData.maxLife = m.userData.life;
    scene.add(m);
    shards.push(m);
  }
}

function remove(arr, i, obj) { scene.remove(obj); arr.splice(i, 1); }

// ---------- spawning ----------
function spawnAsteroid() {
  const m = new THREE.Mesh(astGeo, astMat);
  const s = 1 + Math.random() * 2.4;
  m.scale.setScalar(s);
  m.position.set((Math.random() - 0.5) * 30, -6 + Math.random() * 14, -240);
  m.userData = {
    r: s * 1.1, hp: 40 + s * 35,
    rot: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(1.5),
    vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 1.5,
  };
  scene.add(m);
  asteroids.push(m);
}

function spawnEnemy() {
  const g = makeEnemy();
  g.position.set((Math.random() - 0.5) * 16, -3 + Math.random() * 8, -210);
  g.userData = {
    hp: 60, baseX: g.position.x, baseY: g.position.y,
    freq: 0.8 + Math.random() * 0.8, amp: 3 + Math.random() * 4, phase: Math.random() * 6.28,
    shootTimer: 1 + Math.random() * 1.5,
  };
  scene.add(g);
  enemies.push(g);
}

// ---------- damage / HUD ----------
const $ = id => document.getElementById(id);
const hpbar = $('hpbar'), scoreEl = $('score'), distEl = $('dist'), vig = $('vig');

function damage(n) {
  state.hp = Math.max(0, state.hp - n);
  hpbar.style.width = state.hp + '%';
  state.shake = 0.5;
  sndHurt();
  vig.classList.add('hit');
  setTimeout(() => vig.classList.remove('hit'), 120);
  if (state.hp <= 0) gameOver();
}

function gameOver() {
  state.running = false;
  $('finalStats').innerHTML =
    `점수 <b>${state.score}</b><br>격추 <b>${state.kills}</b><br>항행 거리 <b>${Math.floor(state.dist)} m</b>`;
  $('reviveBtn').style.display = (!usedRevive && window.AFG) ? '' : 'none';
  $('gameover').style.display = 'flex';
}

$('startBtn').addEventListener('click', () => {
  initAudio();
  $('start').style.display = 'none';
  state.running = true;
});

// ---------- 광고 연동 (Tart Shop AFG) ----------
let usedRevive = false;

function revive() {
  // 리워드 시청 완료 → HP 60 회복 + 화면 위협 전체 제거 후 재개
  state.hp = 60;
  hpbar.style.width = '60%';
  for (const arr of [asteroids, enemies, bullets]) {
    for (let i = arr.length - 1; i >= 0; i--) remove(arr, i, arr[i]);
  }
  $('gameover').style.display = 'none';
  state.running = true;
}

$('reviveBtn').addEventListener('click', () => {
  usedRevive = true;
  window.AFG.rewarded({
    name: 'starvoyager_continue',
    onReward: revive,
    onDismiss: () => { usedRevive = false; }, // 시청 취소 시 다시 시도 가능
  });
});

$('restartBtn').addEventListener('click', () => {
  if (window.AFG) {
    window.AFG.interstitial({ name: 'starvoyager_gameover', onAfterAd: () => location.reload() });
  } else {
    location.reload();
  }
});

// ---------- main loop ----------
let astTimer = 0.5, enemyTimer = 2.5, fireTimer = 0, fireSide = 1;
const clock = new THREE.Clock();
const shipPos = ship.position;

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  renderer.render(scene, camera);
  if (!state.running) return;

  state.t += dt;
  const diff = Math.min(1, state.t / 120); // 0→1 over 2 minutes
  state.speed = 30 + diff * 40;
  state.dist += state.speed * dt * 0.4;
  const scroll = state.speed * dt;

  // ship steering + banking
  shipPos.x += (target.x - shipPos.x) * Math.min(1, dt * 7);
  shipPos.y += (target.y - shipPos.y) * Math.min(1, dt * 7);
  ship.rotation.z = clamp((shipPos.x - target.x) * 0.22, -0.7, 0.7);
  ship.rotation.x = clamp((target.y - shipPos.y) * 0.1, -0.4, 0.4);
  ship.userData.engine.scale.setScalar(1 + Math.sin(state.t * 30) * 0.25);

  // camera follow + shake
  state.shake = Math.max(0, state.shake - dt * 2);
  const sh = state.shake;
  camera.position.set(
    shipPos.x * 0.5 + (Math.random() - 0.5) * sh,
    shipPos.y * 0.5 + 3.2 + (Math.random() - 0.5) * sh,
    12
  );
  camera.lookAt(shipPos.x * 0.8, shipPos.y * 0.8, -30);

  // starfield scroll
  for (const layer of starLayers) {
    const a = layer.arr, v = scroll * layer.speedMul;
    for (let i = 2; i < a.length; i += 3) {
      a[i] += v;
      if (a[i] > 20) a[i] -= 270;
    }
    layer.geo.attributes.position.needsUpdate = true;
  }
  planet.rotation.y += dt * 0.02;

  // spawn
  astTimer -= dt;
  if (astTimer <= 0) { spawnAsteroid(); astTimer = 0.85 - diff * 0.5; }
  enemyTimer -= dt;
  if (enemyTimer <= 0) { spawnEnemy(); enemyTimer = 3.6 - diff * 2.1; }

  // auto-fire (twin cannons alternate)
  fireTimer -= dt;
  if (fireTimer <= 0) {
    fireTimer = 0.14;
    fireSide *= -1;
    const m = new THREE.Mesh(laserGeo, laserMat);
    m.position.set(shipPos.x + fireSide * 1.2, shipPos.y, shipPos.z - 1);
    scene.add(m);
    lasers.push(m);
    sndShot();
  }

  // lasers
  for (let i = lasers.length - 1; i >= 0; i--) {
    const l = lasers[i];
    l.position.z -= 160 * dt;
    if (l.position.z < -245) { remove(lasers, i, l); continue; }
    let hit = false;
    for (let j = asteroids.length - 1; j >= 0 && !hit; j--) {
      const a = asteroids[j];
      if (l.position.distanceTo(a.position) < a.userData.r + 0.6) {
        hit = true;
        a.userData.hp -= 30;
        explode(l.position, shardMatCyan, 3, 6);
        if (a.userData.hp <= 0) {
          explode(a.position, shardMatOrange, 10, 12);
          sndBoom();
          state.score += 10; state.kills++;
          remove(asteroids, j, a);
        }
      }
    }
    for (let j = enemies.length - 1; j >= 0 && !hit; j--) {
      const e = enemies[j];
      if (l.position.distanceTo(e.position) < 1.8) {
        hit = true;
        e.userData.hp -= 30;
        explode(l.position, shardMatCyan, 3, 6);
        if (e.userData.hp <= 0) {
          explode(e.position, shardMatOrange, 12, 14);
          sndBoom();
          state.score += 25; state.kills++;
          remove(enemies, j, e);
        }
      }
    }
    if (hit) remove(lasers, i, l);
  }

  // asteroids
  for (let i = asteroids.length - 1; i >= 0; i--) {
    const a = asteroids[i];
    a.position.z += scroll;
    a.position.x += a.userData.vx * dt;
    a.position.y += a.userData.vy * dt;
    a.rotation.x += a.userData.rot.x * dt;
    a.rotation.y += a.userData.rot.y * dt;
    if (a.position.z > 15) { remove(asteroids, i, a); continue; }
    if (a.position.distanceTo(shipPos) < a.userData.r + 1.2) {
      explode(a.position, shardMatOrange, 8, 10);
      sndBoom();
      damage(25);
      remove(asteroids, i, a);
    }
  }

  // enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    const u = e.userData;
    e.position.z += scroll * 0.55;
    e.position.x = u.baseX + Math.sin(state.t * u.freq + u.phase) * u.amp;
    e.position.y = u.baseY + Math.cos(state.t * u.freq * 0.7 + u.phase) * u.amp * 0.4;
    e.rotation.z = Math.cos(state.t * u.freq + u.phase) * 0.4;
    if (e.position.z > 12) { remove(enemies, i, e); continue; }
    if (e.position.distanceTo(shipPos) < 2.4) {
      explode(e.position, shardMatOrange, 12, 14);
      sndBoom();
      damage(30);
      remove(enemies, i, e);
      continue;
    }
    u.shootTimer -= dt;
    if (u.shootTimer <= 0 && e.position.z < -20) {
      u.shootTimer = 1.6 + Math.random() * 1.2 - diff * 0.6;
      const b = new THREE.Mesh(bulletGeo, bulletMat);
      b.position.copy(e.position);
      b.userData.vel = shipPos.clone().sub(e.position).normalize().multiplyScalar(50);
      b.userData.life = 5;
      scene.add(b);
      bullets.push(b);
    }
  }

  // enemy bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.userData.life -= dt;
    b.position.addScaledVector(b.userData.vel, dt);
    if (b.userData.life <= 0 || b.position.z > 15) { remove(bullets, i, b); continue; }
    if (b.position.distanceTo(shipPos) < 1.4) {
      damage(12);
      remove(bullets, i, b);
    }
  }

  // explosion shards
  for (let i = shards.length - 1; i >= 0; i--) {
    const s = shards[i];
    s.userData.life -= dt;
    if (s.userData.life <= 0) { remove(shards, i, s); continue; }
    s.position.addScaledVector(s.userData.vel, dt);
    s.rotation.x += dt * 6;
    s.rotation.y += dt * 4;
    s.scale.setScalar(Math.max(0.01, s.userData.life / s.userData.maxLife));
  }

  // HUD
  scoreEl.textContent = state.score;
  distEl.textContent = Math.floor(state.dist) + ' m';
}
loop();
