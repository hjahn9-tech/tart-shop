import * as THREE from 'three';

// ============================================================================
//  DEAD COAST — endless coastal-road zombie rail shooter
//  A convertible supercar with 4 gunners speeds down a seaside highway while
//  the undead give chase. Day/night cycle drives zombie behaviour.
// ============================================================================

// ---- global constants -------------------------------------------------------
const ROAD_W      = 16;     // road width (X)
const LANE_X      = 0;      // car sits centred on the road
const CONTACT_R   = 4.2;    // distance at which a zombie reaches the car
const CAR_SPEED   = 26;     // scenery scroll speed (units/s) = "car speed"
const DAY_LEN     = 70;     // seconds for a full day/night cycle
const SPAWN_RANGE = 78;     // how far ahead zombies appear

// ---- renderer / scene -------------------------------------------------------
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x9fc7e8, 60, 240);

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 600);
// behind & above the car, looking forward (-Z is "ahead")
camera.position.set(0, 11, 24);
camera.lookAt(0, 3, -18);

// ---- lights -----------------------------------------------------------------
const hemi = new THREE.HemisphereLight(0xffffff, 0x334455, 0.9);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(-40, 60, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 200;
sun.shadow.camera.left = -60; sun.shadow.camera.right = 60;
sun.shadow.camera.top = 60;   sun.shadow.camera.bottom = -60;
scene.add(sun);
scene.add(sun.target);

const moon = new THREE.DirectionalLight(0x9fb8ff, 0.0);
moon.position.set(30, 50, 30);
scene.add(moon);

// ============================================================================
//  WORLD — sea, sand shoulder, road with scrolling markings & scenery
// ============================================================================

// Sea occupies the +X (right) side; land shoulder on both sides of the road.
const seaGeo = new THREE.PlaneGeometry(400, 800, 40, 60);
seaGeo.rotateX(-Math.PI / 2);
const seaMat = new THREE.MeshStandardMaterial({ color: 0x1f6b8f, roughness: 0.25, metalness: 0.55 });
const sea = new THREE.Mesh(seaGeo, seaMat);
sea.position.set(220, -1.2, -180);
sea.receiveShadow = false;
scene.add(sea);
const seaBase = seaGeo.attributes.position.array.slice(); // for wave animation

// distant beach line between road-shoulder and sea
const beach = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 800).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0xe8d9a8, roughness: 1 })
);
beach.position.set(50, -0.9, -180);
beach.receiveShadow = true;
scene.add(beach);

// land side (-X, left): grassy/rocky shoulder — colour shifts per biome
const land = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 800).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0x4a6b3a, roughness: 1 })
);
land.position.set(-110, -0.85, -180);
land.receiveShadow = true;
scene.add(land);

// the road itself
const road = new THREE.Mesh(
  new THREE.PlaneGeometry(ROAD_W, 800).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0x2b2f38, roughness: 0.9 })
);
road.position.set(LANE_X, -0.8, -180);
road.receiveShadow = true;
scene.add(road);

// road edge lines
for (const s of [-1, 1]) {
  const edge = new THREE.Mesh(
    new THREE.PlaneGeometry(0.4, 800).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xd8d8c0, roughness: 0.8 })
  );
  edge.position.set(s * (ROAD_W / 2 - 0.4), -0.78, -180);
  scene.add(edge);
}

// --- scrolling pools (lane dashes + roadside scenery) -----------------------
const scrollers = []; // { mesh, resetFn }

function addScroller(mesh, resetFn) {
  scene.add(mesh);
  scrollers.push({ mesh, resetFn });
}

// centre lane dashes
for (let i = 0; i < 22; i++) {
  const dash = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 5).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xf0e14a, roughness: 0.7 })
  );
  dash.position.set(0, -0.77, -i * 16);
  addScroller(dash, (m) => { m.position.z -= 22 * 16; });
}

// biome palettes cycle as you travel — sand → grass → rock → dusk-red
const BIOMES = [
  { land: 0x6a7f45, name: 'grass' },
  { land: 0x8a7c50, name: 'savanna' },
  { land: 0x7a5a44, name: 'rock' },
  { land: 0x4a6b3a, name: 'forest' },
];

// palm trees / rocks / signs along the shoulders
function makePalm() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.4, 6, 6),
    new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 1 })
  );
  trunk.position.y = 3; trunk.castShadow = true; g.add(trunk);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f8f4a, roughness: 1 });
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.7, 3.4, 4), leafMat);
    leaf.position.set(Math.cos(i) * 1.2, 6, Math.sin(i) * 1.2);
    leaf.rotation.z = 0.9; leaf.rotation.y = i;
    leaf.castShadow = true; g.add(leaf);
  }
  return g;
}
function makeRock() {
  const r = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1.2 + Math.random() * 1.4, 0),
    new THREE.MeshStandardMaterial({ color: 0x77726b, roughness: 1, flatShading: true })
  );
  r.rotation.set(Math.random(), Math.random(), Math.random());
  r.position.y = 0.4; r.castShadow = true;
  return r;
}

function makeSceneryItem() {
  const g = new THREE.Group();
  const kind = Math.random();
  g.add(kind < 0.5 ? makePalm() : makeRock());
  return g;
}

// two shoulders worth of scenery objects, recycled forward
for (let i = 0; i < 26; i++) {
  const item = makeSceneryItem();
  const side = Math.random() < 0.62 ? -1 : 1; // more on land side
  const x = side < 0 ? -(11 + Math.random() * 26) : (16 + Math.random() * 22);
  item.position.set(x, 0, -Math.random() * 400 - 20);
  addScroller(item, (m) => {
    m.position.z -= 420;
    const sd = Math.random() < 0.62 ? -1 : 1;
    m.position.x = sd < 0 ? -(11 + Math.random() * 26) : (16 + Math.random() * 22);
    m.clear();
    m.add(makeSceneryItem().children[0]);
  });
}

// ============================================================================
//  THE CAR + 4 GUNNERS
// ============================================================================
const carGroup = new THREE.Group();
carGroup.position.set(LANE_X, 0, 6);
scene.add(carGroup);

function buildCar() {
  const body = new THREE.Group();

  const paint = new THREE.MeshStandardMaterial({ color: 0xd21f3c, roughness: 0.35, metalness: 0.6 });
  const dark  = new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.5, metalness: 0.3 });

  // lower chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.1, 9), paint);
  chassis.position.y = 1.1; chassis.castShadow = true; body.add(chassis);
  // hood / rear tapering
  const hood = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.7, 3.2), paint);
  hood.position.set(0, 1.7, -3.2); hood.castShadow = true; body.add(hood);
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.7, 2.2), paint);
  trunk.position.set(0, 1.7, 3.6); trunk.castShadow = true; body.add(trunk);
  // open cockpit tub (dark interior)
  const tub = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.9, 4.4), dark);
  tub.position.set(0, 1.9, 0.4); body.add(tub);
  // windshield
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 1.0, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.4, metalness: 0.4, roughness: 0.1 })
  );
  glass.position.set(0, 2.5, -1.9); glass.rotation.x = -0.35; body.add(glass);

  // wheels
  const wheelGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.7, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0c0c10, roughness: 0.85 });
  const wheels = [];
  for (const [wx, wz] of [[-2.3, -3], [2.3, -3], [-2.3, 3], [2.3, 3]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(wx, 0.9, wz); w.castShadow = true; body.add(w); wheels.push(w);
  }
  // headlights glow
  for (const s of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffffaa, emissiveIntensity: 1.4 }));
    hl.position.set(s * 1.4, 1.6, -4.6); body.add(hl);
  }

  carGroup.add(body);
  return { body, wheels };
}
const car = buildCar();

// --- 4 gunners (2 male, 2 female) standing in the open cabin ---------------
function buildGunner(cfg) {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xf0c39a, roughness: 1 });
  const cloth = new THREE.MeshStandardMaterial({ color: cfg.cloth, roughness: 1 });
  const hairMat = new THREE.MeshStandardMaterial({ color: cfg.hair, roughness: 1 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.5), cloth);
  torso.position.y = 1.4; torso.castShadow = true; g.add(torso);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), skin);
  head.position.y = 2.25; head.castShadow = true; g.add(head);

  // hair — long for female, short cap for male
  const hair = new THREE.Mesh(
    cfg.female ? new THREE.BoxGeometry(0.62, 0.7, 0.62) : new THREE.BoxGeometry(0.6, 0.28, 0.6),
    hairMat
  );
  hair.position.y = cfg.female ? 2.35 : 2.5; g.add(hair);

  // arms holding a gun, pointing forward (-Z)
  const armMat = cloth;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.9), armMat);
  armL.position.set(-0.35, 1.6, -0.5); g.add(armL);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.9), armMat);
  armR.position.set(0.35, 1.6, -0.5); g.add(armR);

  // the weapon model
  const gun = new THREE.Group();
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x25282f, roughness: 0.6, metalness: 0.4 });
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, cfg.barrel), gunMat);
  barrel.position.z = -cfg.barrel / 2; gun.add(barrel);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.35, 0.5), gunMat);
  stock.position.z = 0.2; gun.add(stock);
  gun.position.set(0, 1.55, -0.9); g.add(gun);

  // muzzle flash sprite (hidden until firing)
  const flash = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 1.4),
    new THREE.MeshBasicMaterial({ color: 0xffdd66, transparent: true, opacity: 0, depthWrite: false })
  );
  flash.position.set(0, 1.55, -0.9 - cfg.barrel);
  g.add(flash);

  g.userData = { flash, gun, torso, restY: torso.position.z };
  return g;
}

// gunner seating positions inside the cabin
const gunnerCfgs = [
  { cloth: 0x2f6fb0, hair: 0x2a1a10, female: false, barrel: 0.9 },  // male   — pistol
  { cloth: 0xb04a2f, hair: 0x120d08, female: false, barrel: 1.5 },  // male   — SMG
  { cloth: 0x8f4fb0, hair: 0x5a3316, female: true,  barrel: 1.7 },  // female — shotgun
  { cloth: 0x2fae8f, hair: 0x1a1210, female: true,  barrel: 2.3 },  // female — rifle
];
const gunnerSeats = [[-0.95, -0.6], [0.95, -0.6], [-0.95, 1.1], [0.95, 1.1]];
const gunners = gunnerCfgs.map((cfg, i) => {
  const g = buildGunner(cfg);
  g.position.set(gunnerSeats[i][0], 1.0, gunnerSeats[i][1]);
  carGroup.add(g);
  return g;
});

// ============================================================================
//  WEAPONS
// ============================================================================
const WEAPONS = [
  { name: '권총',   char: '알렉스', key: 1, dmg: 34, interval: 0.28, auto: false, pellets: 1, spread: 0.0,  color: 0xfff2b0, score: 10 },
  { name: 'SMG',    char: '리코',   key: 2, dmg: 16, interval: 0.075, auto: true,  pellets: 1, spread: 0.045, color: 0xfff0c0, score: 7 },
  { name: '샷건',   char: '미라',   key: 3, dmg: 20, interval: 0.62, auto: false, pellets: 7, spread: 0.16, color: 0xffd58a, score: 9 },
  { name: '저격총', char: '유나',   key: 4, dmg: 120, interval: 0.9, auto: false, pellets: 1, spread: 0.0,  color: 0xbfe6ff, score: 20 },
];
let currentWeapon = 0;

// build weapon HUD
const weaponPanel = document.getElementById('weapon-panel');
WEAPONS.forEach((w, i) => {
  const el = document.createElement('div');
  el.className = 'wslot' + (i === 0 ? ' active' : '');
  el.innerHTML = `<div class="wkey">[${w.key}]</div><div class="wname">${w.name}</div><div class="wchar">${w.char}</div>`;
  weaponPanel.appendChild(el);
});
function selectWeapon(i) {
  currentWeapon = i;
  [...weaponPanel.children].forEach((el, idx) => el.classList.toggle('active', idx === i));
}

// ============================================================================
//  ZOMBIES
// ============================================================================
const zombies = [];
const zombieHitList = []; // meshes for raycasting

const zSkin = [0x6f8f5a, 0x7a8f6a, 0x5f7a55, 0x88906a];
function buildZombie() {
  const g = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({
    color: zSkin[(Math.random() * zSkin.length) | 0], roughness: 1
  });
  const ragMat = new THREE.MeshStandardMaterial({ color: 0x3a3630, roughness: 1 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.5), ragMat);
  torso.position.y = 1.4; torso.castShadow = true; g.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skinMat);
  head.position.y = 2.25; head.castShadow = true; g.add(head);

  // arms reaching forward (toward the car)
  const armMat = skinMat;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.22), armMat);
  armL.position.set(-0.55, 1.75, 0.35); armL.rotation.x = 1.1; g.add(armL);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.22), armMat);
  armR.position.set(0.55, 1.75, 0.35); armR.rotation.x = 1.1; g.add(armR);

  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.1, 0.28), ragMat);
  legL.position.set(-0.25, 0.55, 0); g.add(legL);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.1, 0.28), ragMat);
  legR.position.set(0.25, 0.55, 0); g.add(legR);

  torso.userData.zombieRoot = g;
  head.userData.zombieRoot = g;
  zombieHitList.push(torso, head);

  g.userData = { torso, head, armL, armR, legL, legR };
  return g;
}

function spawnZombie(state) {
  const g = buildZombie();
  // spawn ahead and to the sides, on/near the road, then they converge on the car
  const angle = (Math.random() - 0.5) * 2.4; // fan out ahead
  const dist = 40 + Math.random() * SPAWN_RANGE;
  const carZ = carGroup.position.z;
  let x = Math.sin(angle) * dist * 0.5 + (Math.random() - 0.5) * 6;
  let z = carZ - Math.cos(angle) * dist;
  // some spawn from behind to actually "chase"
  if (Math.random() < 0.35) { z = carZ + 30 + Math.random() * 40; x = (Math.random() - 0.5) * ROAD_W; }
  x = THREE.MathUtils.clamp(x, -ROAD_W / 2 - 3, ROAD_W / 2 + 8);

  g.position.set(x, 0, z);
  const hp = 40 + Math.random() * 30 + state.difficulty * 8;
  const baseSpeed = 8 + Math.random() * 5 + state.difficulty * 0.8;
  g.userData.hp = hp;
  g.userData.maxHp = hp;
  g.userData.baseSpeed = baseSpeed;
  g.userData.phase = Math.random() * Math.PI * 2;
  g.userData.dying = false;
  scene.add(g);
  zombies.push(g);
}

function removeZombie(z, i) {
  // pull its hit meshes out of the raycast list
  for (const key of ['torso', 'head']) {
    const idx = zombieHitList.indexOf(z.userData[key]);
    if (idx !== -1) zombieHitList.splice(idx, 1);
  }
  scene.remove(z);
  zombies.splice(i, 1);
}

// ============================================================================
//  SHOOTING — hitscan raycast + tracer + impact
// ============================================================================
const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2(0, 0);
const tracers = []; // { line, life }
const tracerMat = new THREE.LineBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.9 });

function makeTracer(from, to, color) {
  const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }));
  scene.add(line);
  tracers.push({ line, life: 0.08 });
}

// impact spark pool
function makeImpact(pos, color) {
  const spark = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 6, 6),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false })
  );
  spark.position.copy(pos);
  spark.userData.life = 0.16;
  scene.add(spark);
  impacts.push(spark);
}
const impacts = [];

let fireCooldown = 0;
function fire(state) {
  if (fireCooldown > 0) return;
  const w = WEAPONS[currentWeapon];
  fireCooldown = w.interval;

  // gunner muzzle flash + recoil
  const gunner = gunners[currentWeapon];
  gunner.userData.flash.material.opacity = 1;
  gunner.userData.flash.rotation.z = Math.random() * Math.PI;
  gunner.userData.torso.position.z = gunner.userData.restY + 0.18; // kick back

  const muzzleWorld = new THREE.Vector3();
  gunner.userData.flash.getWorldPosition(muzzleWorld);

  playShot(w);

  for (let p = 0; p < w.pellets; p++) {
    const nd = pointerNDC.clone();
    nd.x += (Math.random() - 0.5) * w.spread;
    nd.y += (Math.random() - 0.5) * w.spread;
    raycaster.setFromCamera(nd, camera);

    const hits = raycaster.intersectObjects(zombieHitList, false);
    if (hits.length) {
      const hit = hits[0];
      const zroot = hit.object.userData.zombieRoot;
      const headshot = hit.object === zroot.userData.head;
      const dmg = w.dmg * (headshot ? 2 : 1);
      damageZombie(zroot, dmg, state, headshot);
      makeTracer(muzzleWorld, hit.point, w.color);
      makeImpact(hit.point, headshot ? 0xff5555 : 0x9fd08a);
    } else {
      // shoot into the distance
      const far = raycaster.ray.at(120, new THREE.Vector3());
      makeTracer(muzzleWorld, far, w.color);
    }
  }
}

function damageZombie(z, dmg, state, headshot) {
  if (z.userData.dying) return;
  z.userData.hp -= dmg;
  // hit flash
  z.userData.torso.material.emissive = new THREE.Color(0x883322);
  z.userData.torso.material.emissiveIntensity = 0.6;
  z.userData.hitFlash = 0.08;

  if (z.userData.hp <= 0) {
    z.userData.dying = true;
    z.userData.deathT = 0;
    const idxT = zombieHitList.indexOf(z.userData.torso);
    if (idxT !== -1) zombieHitList.splice(idxT, 1);
    const idxH = zombieHitList.indexOf(z.userData.head);
    if (idxH !== -1) zombieHitList.splice(idxH, 1);

    const gained = WEAPONS[currentWeapon].score * (headshot ? 2 : 1);
    state.score += gained;
    state.kills += 1;
    registerCombo(state, gained, headshot);
    playKill();
  }
}

// combo system ---------------------------------------------------------------
const comboEl = document.getElementById('combo');
function registerCombo(state, gained, headshot) {
  state.comboCount += 1;
  state.comboTimer = 2.2;
  if (state.comboCount >= 3) {
    comboEl.textContent = (headshot ? 'HEADSHOT! ' : '') + `${state.comboCount} COMBO  +${gained}`;
    comboEl.style.opacity = '1';
    state.comboFade = 0.9;
  } else if (headshot) {
    comboEl.textContent = 'HEADSHOT!';
    comboEl.style.opacity = '1';
    state.comboFade = 0.7;
  }
}

// ============================================================================
//  AUDIO — tiny procedural blips (WebAudio), safe-wrapped
// ============================================================================
let actx = null;
function initAudio() { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
function blip(freq, dur, type, gain) {
  if (!actx) return;
  try {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.value = gain; g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
    o.connect(g); g.connect(actx.destination);
    o.start(); o.stop(actx.currentTime + dur);
  } catch (e) {}
}
function playShot(w) {
  const base = w.name === '저격총' ? 180 : w.name === '샷건' ? 120 : 320;
  blip(base + Math.random() * 60, 0.09, 'square', 0.06);
}
function playKill() { blip(90, 0.18, 'sawtooth', 0.05); }
function playHurt() { blip(70, 0.25, 'sawtooth', 0.09); }

// ============================================================================
//  GAME STATE + HUD
// ============================================================================
const hpFill = document.getElementById('hp-fill');
const scoreEl = document.getElementById('score');
const distEl = document.getElementById('dist');
const timeDot = document.getElementById('time-dot');
const timeText = document.getElementById('time-text');
const vignette = document.getElementById('dmg-vignette');

let state = null;
function newState() {
  return {
    running: false, carHP: 100, score: 0, kills: 0, distance: 0,
    timeOfDay: 0.28,          // start mid-morning
    spawnTimer: 0, difficulty: 0,
    comboCount: 0, comboTimer: 0, comboFade: 0,
    dayFactor: 1,
  };
}

function startGame() {
  // clear any leftover zombies
  for (let i = zombies.length - 1; i >= 0; i--) removeZombie(zombies[i], i);
  state = newState();
  state.running = true;
  selectWeapon(0);
  document.getElementById('start').classList.add('hidden');
  document.getElementById('gameover').classList.add('hidden');
  initAudio();
}

function gameOver() {
  state.running = false;
  document.getElementById('go-stats').innerHTML =
    `점수 <span>${state.score.toLocaleString()}</span><br>` +
    `처치 <span>${state.kills}</span> · 주행 <span>${Math.floor(state.distance)} m</span>`;
  document.getElementById('gameover').classList.remove('hidden');
}

function hurtCar(amount) {
  state.carHP = Math.max(0, state.carHP - amount);
  hpFill.style.width = state.carHP + '%';
  vignette.style.opacity = '0.9';
  playHurt();
  if (state.carHP <= 0) gameOver();
}

// ============================================================================
//  DAY / NIGHT CYCLE
// ============================================================================
const skyDay   = new THREE.Color(0x9fc7e8);
const skyNight = new THREE.Color(0x0b1430);
const skyDusk  = new THREE.Color(0xd98a5a);
const seaDay   = new THREE.Color(0x1f6b8f);
const seaNight = new THREE.Color(0x0a2438);

function updateDayNight(dt) {
  state.timeOfDay = (state.timeOfDay + dt / DAY_LEN) % 1;
  const t = state.timeOfDay;

  // daylight amount: peak at noon (t=0.5), dark near 0/1
  const light = Math.max(0, Math.sin(t * Math.PI));     // 0..1..0
  const isDusk = t > 0.72 && t < 0.82 || t > 0.18 && t < 0.28;

  // zombie behaviour factor: fast in day, slow at night
  state.dayFactor = 0.45 + light * 0.75;                // ~0.45 night → ~1.2 day

  // sky + fog colour
  const sky = new THREE.Color().copy(skyNight).lerp(skyDay, light);
  if (isDusk) sky.lerp(skyDusk, 0.4);
  scene.background = sky;
  scene.fog.color.copy(sky);

  // sea colour + lights
  seaMat.color.copy(seaNight).lerp(seaDay, light);
  sun.intensity = 0.15 + light * 1.7;
  hemi.intensity = 0.3 + light * 0.7;
  moon.intensity = (1 - light) * 0.5;
  sun.color.setHSL(0.09 + light * 0.05, 0.6, 0.5 + light * 0.4);

  // HUD indicator
  if (light > 0.55) { timeText.textContent = '낮 — 좀비 활발'; timeDot.style.color = '#ffd34d'; }
  else if (light > 0.2) { timeText.textContent = isDusk ? '황혼' : '해질녘'; timeDot.style.color = '#ff9a4d'; }
  else { timeText.textContent = '밤 — 좀비 둔화'; timeDot.style.color = '#7fa8ff'; }
}

// ============================================================================
//  MAIN LOOP
// ============================================================================
const clock = new THREE.Clock();
let firing = false;

function updateZombies(dt) {
  const carPos = carGroup.position;
  for (let i = zombies.length - 1; i >= 0; i--) {
    const z = zombies[i];
    const ud = z.userData;

    if (ud.dying) {
      ud.deathT += dt;
      z.rotation.x = Math.min(Math.PI / 2, ud.deathT * 6); // fall forward
      z.position.y = -ud.deathT * 0.4;
      const op = Math.max(0, 1 - ud.deathT * 1.6);
      z.traverse(o => { if (o.material) { o.material.transparent = true; o.material.opacity = op; } });
      if (ud.deathT > 0.7) removeZombie(z, i);
      continue;
    }

    // hit-flash decay
    if (ud.hitFlash > 0) {
      ud.hitFlash -= dt;
      if (ud.hitFlash <= 0) ud.torso.material.emissiveIntensity = 0;
    }

    // move toward the car
    const dx = carPos.x - z.position.x;
    const dz = carPos.z - z.position.z;
    const d = Math.hypot(dx, dz) || 1;
    const speed = ud.baseSpeed * state.dayFactor;
    z.position.x += (dx / d) * speed * dt;
    z.position.z += (dz / d) * speed * dt;
    z.rotation.y = Math.atan2(dx, dz);

    // shambling bob + arm sway
    ud.phase += dt * (4 + speed * 0.2);
    z.position.y = Math.abs(Math.sin(ud.phase)) * 0.18;
    ud.legL.rotation.x = Math.sin(ud.phase) * 0.6;
    ud.legR.rotation.x = -Math.sin(ud.phase) * 0.6;

    // reached the car → damage & remove
    if (d < CONTACT_R) {
      hurtCar(7 + state.difficulty);
      removeZombie(z, i);
    } else if (z.position.z > carPos.z + 70) {
      // fell too far behind (car outran it) — recycle silently
      removeZombie(z, i);
    }
  }
}

function updateEffects(dt) {
  // tracers fade
  for (let i = tracers.length - 1; i >= 0; i--) {
    const tr = tracers[i];
    tr.life -= dt;
    tr.line.material.opacity = Math.max(0, tr.life / 0.08) * 0.9;
    if (tr.life <= 0) { scene.remove(tr.line); tr.line.geometry.dispose(); tracers.splice(i, 1); }
  }
  // impacts
  for (let i = impacts.length - 1; i >= 0; i--) {
    const sp = impacts[i];
    sp.userData.life -= dt;
    sp.scale.multiplyScalar(1 + dt * 6);
    sp.material.opacity = Math.max(0, sp.userData.life / 0.16) * 0.9;
    if (sp.userData.life <= 0) { scene.remove(sp); impacts.splice(i, 1); }
  }
  // muzzle flashes + gunner recoil recovery
  gunners.forEach(g => {
    if (g.userData.flash.material.opacity > 0)
      g.userData.flash.material.opacity = Math.max(0, g.userData.flash.material.opacity - dt * 12);
    const t = g.userData.torso;
    t.position.z += (g.userData.restY - t.position.z) * Math.min(1, dt * 14);
  });
  // damage vignette fade
  const cur = parseFloat(vignette.style.opacity || '0');
  if (cur > 0) vignette.style.opacity = Math.max(0, cur - dt * 2.2).toFixed(3);
}

let seaTime = 0;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  // sea waves (always animate for menu ambience)
  seaTime += dt;
  const pos = seaGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = seaBase[i * 3], z = seaBase[i * 3 + 2];
    pos.array[i * 3 + 1] = Math.sin(x * 0.05 + seaTime * 1.2) * 0.6 + Math.cos(z * 0.06 + seaTime) * 0.5;
  }
  pos.needsUpdate = true;

  // car idle bob + wheel spin always
  car.wheels.forEach(w => (w.rotation.x -= dt * 12));

  if (state && state.running) {
    // scenery scroll = forward motion
    const scroll = CAR_SPEED * dt;
    for (const s of scrollers) {
      s.mesh.position.z += scroll;
      if (s.mesh.position.z > 40) s.resetFn(s.mesh);
    }
    // world moves, so push zombies back with it (they still chase)
    for (const z of zombies) z.position.z += scroll;

    state.distance += CAR_SPEED * dt * 0.35;
    state.difficulty = state.distance / 240;
    distEl.textContent = Math.floor(state.distance) + ' m';
    scoreEl.textContent = state.score.toLocaleString();

    updateDayNight(dt);

    // spawn zombies — rate scales with daylight + difficulty
    state.spawnTimer -= dt;
    const spawnEvery = Math.max(0.28, (1.5 - state.difficulty * 0.15)) / state.dayFactor;
    if (state.spawnTimer <= 0 && zombies.length < 60) {
      state.spawnTimer = spawnEvery;
      spawnZombie(state);
    }

    updateZombies(dt);

    // firing: auto weapons repeat while held; semi-auto fires once per click
    fireCooldown -= dt;
    if (firing && WEAPONS[currentWeapon].auto) fire(state);

    // combo timer
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.comboCount = 0;
    }
    if (state.comboFade > 0) {
      state.comboFade -= dt;
      if (state.comboFade <= 0) comboEl.style.opacity = '0';
    }

    // car engine sway
    carGroup.rotation.z = Math.sin(seaTime * 3) * 0.006;
    carGroup.position.y = Math.sin(seaTime * 6) * 0.04;
  }

  updateEffects(dt);
  // keep sun following forward so shadows stay put
  sun.target.position.set(0, 0, carGroup.position.z - 20);

  renderer.render(scene, camera);
}
animate();

// ============================================================================
//  INPUT
// ============================================================================
const crosshair = document.getElementById('crosshair');
window.addEventListener('mousemove', (e) => {
  crosshair.style.left = e.clientX + 'px';
  crosshair.style.top = e.clientY + 'px';
  pointerNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointerNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener('mousedown', (e) => {
  if (e.button !== 0 || !state || !state.running) return;
  firing = true;
  fire(state); // immediate shot (semi-auto & first auto round)
});
window.addEventListener('mouseup', () => { firing = false; });

window.addEventListener('keydown', (e) => {
  if (e.key >= '1' && e.key <= '4') selectWeapon(parseInt(e.key) - 1);
});

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
