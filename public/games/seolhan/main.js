// ============================================================
//  설한 (雪寒) — 소빙하기 조선, 생사역의 밤
//  1인칭 화승총 좀비 아포칼립스 · Three.js · 외부 에셋 없음
// ============================================================
import * as THREE from 'three';

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const $ = id => document.getElementById(id);

// ============================================================
//  프로시저럴 오디오
// ============================================================
const Sfx = {
  ctx: null, master: null, noiseBuf: null, distCurve: null,

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.7;
    this.master.connect(this.ctx.destination);

    const len = this.ctx.sampleRate * 2;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    this.distCurve = new Float32Array(256);
    for (let i = 0; i < 256; i++) this.distCurve[i] = Math.tanh((i / 128 - 1) * 4);

    this.wind();
  },

  noise() { const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; return s; },

  env(g, peak, atk, dec, t) {
    t = t ?? this.ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + atk + dec);
  },

  wind() {
    const s = this.noise(); s.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 320; f.Q.value = 0.6;
    const g = this.ctx.createGain(); g.gain.value = 0.055;
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.11;
    const lg = this.ctx.createGain(); lg.gain.value = 0.028;
    lfo.connect(lg); lg.connect(g.gain);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(); lfo.start();
  },

  gunshot() {
    const t = this.ctx.currentTime;
    // 폭발음: 노이즈 + 저역 스윕
    const n = this.noise();
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(5000, t);
    f.frequency.exponentialRampToValueAtTime(240, t + 0.3);
    const g = this.ctx.createGain(); this.env(g, 1.0, 0.004, 0.45, t);
    n.connect(f); f.connect(g); g.connect(this.master);
    n.start(t); n.stop(t + 0.6);
    // 몸통 울림
    const o = this.ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.35);
    const og = this.ctx.createGain(); this.env(og, 0.85, 0.004, 0.4, t);
    o.connect(og); og.connect(this.master);
    o.start(t); o.stop(t + 0.5);
    // 설원 메아리
    const e = this.noise();
    const ef = this.ctx.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 500;
    const eg = this.ctx.createGain(); this.env(eg, 0.16, 0.02, 0.9, t + 0.28);
    e.connect(ef); ef.connect(eg); eg.connect(this.master);
    e.start(t + 0.28); e.stop(t + 1.4);
  },

  click(vol = 0.25) {
    const t = this.ctx.currentTime;
    const n = this.noise();
    const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1800;
    const g = this.ctx.createGain(); this.env(g, vol, 0.002, 0.05, t);
    n.connect(f); f.connect(g); g.connect(this.master);
    n.start(t); n.stop(t + 0.08);
  },

  crunch() {
    const t = this.ctx.currentTime;
    const n = this.noise();
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass';
    f.frequency.value = rand(700, 1100); f.Q.value = 0.8;
    const g = this.ctx.createGain(); this.env(g, rand(0.07, 0.12), 0.004, 0.09, t);
    n.connect(f); f.connect(g); g.connect(this.master);
    n.start(t); n.stop(t + 0.12);
  },

  growl(vol) {
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(rand(55, 115), t);
    o.frequency.linearRampToValueAtTime(rand(38, 75), t + 0.8);
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = rand(4, 9);
    const lg = this.ctx.createGain(); lg.gain.value = 16;
    lfo.connect(lg); lg.connect(o.frequency);
    const ws = this.ctx.createWaveShaper(); ws.curve = this.distCurve;
    const g = this.ctx.createGain(); this.env(g, vol, 0.1, 0.85, t);
    o.connect(ws); ws.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 1.1); lfo.start(t); lfo.stop(t + 1.1);
  },

  swing() {
    const t = this.ctx.currentTime;
    const n = this.noise();
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.5;
    f.frequency.setValueAtTime(1400, t);
    f.frequency.exponentialRampToValueAtTime(300, t + 0.18);
    const g = this.ctx.createGain(); this.env(g, 0.3, 0.01, 0.17, t);
    n.connect(f); f.connect(g); g.connect(this.master);
    n.start(t); n.stop(t + 0.25);
  },

  flesh() {
    const t = this.ctx.currentTime;
    const n = this.noise();
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 480;
    const g = this.ctx.createGain(); this.env(g, 0.55, 0.005, 0.13, t);
    n.connect(f); f.connect(g); g.connect(this.master);
    n.start(t); n.stop(t + 0.18);
    const o = this.ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(35, t + 0.12);
    const og = this.ctx.createGain(); this.env(og, 0.4, 0.004, 0.13, t);
    o.connect(og); og.connect(this.master);
    o.start(t); o.stop(t + 0.18);
  },

  hurt() {
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(70, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 0.3);
    const ws = this.ctx.createWaveShaper(); ws.curve = this.distCurve;
    const g = this.ctx.createGain(); this.env(g, 0.6, 0.008, 0.32, t);
    o.connect(ws); ws.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.4);
  },

  bell() {
    const t = this.ctx.currentTime;
    [146, 219, 292].forEach((fr, i) => {
      const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = fr;
      const g = this.ctx.createGain(); this.env(g, 0.22 / (i + 1), 0.01, 2.6, t);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + 2.8);
    });
  },

  heartbeat() {
    const t = this.ctx.currentTime;
    [0, 0.16].forEach((off, i) => {
      const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 48;
      const g = this.ctx.createGain(); this.env(g, i === 0 ? 0.5 : 0.32, 0.01, 0.14, t + off);
      o.connect(g); g.connect(this.master);
      o.start(t + off); o.stop(t + off + 0.2);
    });
  },

  explosion() {
    const t = this.ctx.currentTime;
    const n = this.noise();
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(2400, t);
    f.frequency.exponentialRampToValueAtTime(70, t + 0.9);
    const g = this.ctx.createGain(); this.env(g, 1.2, 0.005, 1.1, t);
    n.connect(f); f.connect(g); g.connect(this.master);
    n.start(t); n.stop(t + 1.3);
    const o = this.ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(65, t);
    o.frequency.exponentialRampToValueAtTime(22, t + 0.7);
    const og = this.ctx.createGain(); this.env(og, 1.0, 0.005, 0.85, t);
    o.connect(og); og.connect(this.master);
    o.start(t); o.stop(t + 1);
  },

  pickup() {
    const t = this.ctx.currentTime;
    [660, 880].forEach((fr, i) => {
      const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = fr;
      const g = this.ctx.createGain(); this.env(g, 0.18, 0.01, 0.14, t + i * 0.08);
      o.connect(g); g.connect(this.master);
      o.start(t + i * 0.08); o.stop(t + i * 0.08 + 0.2);
    });
  },
};

// ============================================================
//  렌더러 / 씬 / 카메라
// ============================================================
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); // 레티나 풀해상도는 프레임 유지가 어렵다
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
const NIGHT_FOG = new THREE.Color(0x0c1424);
const DAWN_FOG = new THREE.Color(0x9a5f3c);
scene.background = NIGHT_FOG.clone();
scene.fog = new THREE.Fog(NIGHT_FOG.clone(), 8, 85);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 300);
scene.add(camera);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// 원형 소프트 글로우 텍스처 (스프라이트 공용 — 텍스처 없는 Sprite는 사각형으로 보임)
const glowTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.8)');
  grad.addColorStop(0.7, 'rgba(255,255,255,0.25)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();

// ============================================================
//  조명
// ============================================================
const hemi = new THREE.HemisphereLight(0x36466b, 0x0a0d16, 0.55);
scene.add(hemi);

const moonLight = new THREE.DirectionalLight(0x93a8d8, 0.85);
moonLight.position.set(60, 85, -50);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(2048, 2048);
moonLight.shadow.camera.left = -55; moonLight.shadow.camera.right = 55;
moonLight.shadow.camera.top = 55; moonLight.shadow.camera.bottom = -55;
moonLight.shadow.camera.far = 220;
moonLight.shadow.bias = -0.0006;
scene.add(moonLight);

const dawnLight = new THREE.DirectionalLight(0xffa050, 0);
dawnLight.position.set(-70, 25, 60);
scene.add(dawnLight);

// 달
const moonSpr = new THREE.Sprite(new THREE.SpriteMaterial({
  color: 0xdfe9ff, transparent: true, opacity: 0.95, fog: false, map: glowTex,
}));
moonSpr.position.set(85, 95, -160);
moonSpr.scale.setScalar(17);
scene.add(moonSpr);
const moonHalo = new THREE.Sprite(new THREE.SpriteMaterial({
  color: 0x8fa8e0, transparent: true, opacity: 0.18, fog: false, map: glowTex,
}));
moonHalo.position.copy(moonSpr.position);
moonHalo.scale.setScalar(48);
scene.add(moonHalo);

// ============================================================
//  월드 구축
// ============================================================
const colliders = [];   // {minX,maxX,minZ,maxZ}
const shootables = [];  // 총탄 레이캐스트 대상 (좀비 + 차폐물)
const torches = [];
const houses = [];      // {minX,maxX,minZ,maxZ, door:Vector3} — 숨을 수 있는 공간
const lootSpots = [];   // 아이템 스폰 지점
const platforms = [];   // {minX,maxX,minZ,maxZ, y} — 올라설 수 있는 단 (망루 마루 등)
const ramps = [];       // {minX,maxX,minZ,maxZ, y0, y1} — z축 경사면 (minZ 쪽이 y0)
const towers = [];      // {minX,maxX,minZ,maxZ, y, stair, top} — 좀비가 기어오를 수 있는 망루

function addCollider(cx, cz, w, d) {
  colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
}

const woodMat = new THREE.MeshStandardMaterial({ color: 0x4d3a26, roughness: 0.95 });
const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x35281a, roughness: 0.95 });
const wallClayMat = new THREE.MeshStandardMaterial({ color: 0x8a7457, roughness: 1 });
const roofMat = new THREE.MeshStandardMaterial({ color: 0x23252e, roughness: 0.9 });
const stoneMat = new THREE.MeshStandardMaterial({ color: 0x5c5f66, roughness: 1 });
const snowRoofMat = new THREE.MeshStandardMaterial({ color: 0xaeb9c8, roughness: 1 });
const paperMat = new THREE.MeshStandardMaterial({
  color: 0xd8cba8, roughness: 0.9, emissive: 0x2a2010, emissiveIntensity: 0.4,
});

function buildWorld() {
  // 설원 지면
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(420, 420, 64, 64),
    new THREE.MeshStandardMaterial({ color: 0xb9c4d4, roughness: 1 })
  );
  const pos = ground.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const r = Math.hypot(x, y);
    if (r > 42) pos.setZ(i, Math.sin(x * 0.05) * Math.cos(y * 0.04) * 1.6 * ((r - 42) / 100));
  }
  ground.geometry.computeVertexNormals();
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // 핏자국
  for (let i = 0; i < 9; i++) {
    const blood = new THREE.Mesh(
      new THREE.CircleGeometry(rand(0.5, 1.6), 10),
      new THREE.MeshStandardMaterial({ color: 0x3a0d0d, roughness: 1 })
    );
    blood.rotation.x = -Math.PI / 2;
    blood.position.set(rand(-24, 24), 0.02, rand(-26, 20));
    scene.add(blood);
  }

  buildWalls();
  hanok(-14, -10, 7, 5.5, 'choga');
  hanok(13, -13, 7, 5.5, 'giwa');
  hanok(-15, 11, 6.5, 6, 'choga');
  hanok(13, 11, 8, 5.5, 'giwa');
  buildWell(0, 3);
  buildCart(-4.5, -20);
  buildCrates(8, 18);
  buildGateDebris();

  // 야외 아이템 스폰 지점 — 우물가, 궤짝, 수레, 남쪽 공터
  lootSpots.push({ x: 2.4, z: 5.4 }, { x: 8, z: 15.8 }, { x: -3, z: -18.2 }, { x: -7, z: 22 });

  // 횃불
  [[-5.6, -27.5], [5.6, -27.5], [19, -1], [-3, 7.5], [-10, 17]].forEach(p => torch(p[0], p[1]));

  // 집 앞 청사초롱
  chorong(13, 14.7);
  chorong(-14, -6.6);
  chorong(-15, 14.9);

  // 마을의 수호물 — 장승·솟대·돌탑·당산나무·금줄
  jangseung(-2.9, -33.5, 0.25);
  jangseung(2.9, -33.5, -0.25);
  sotdae(-4.5, 6.8);
  sotdae(20, -6);
  stoneCairn(5.3, -7.5);
  stoneCairn(-8.6, 1);
  stoneCairn(17.5, 16);
  dangsanTree(-7, 4.2);
  geumjul();

  // 마을 확장 — 망루·양반가·저잣거리·사당·연못
  watchtower(-9, -24);
  yangbanCompound(20.5, 22);
  marketStall(6.5, -16, -Math.PI / 2 + 0.12, 0x6b5a4a);
  marketStall(-8, -13, Math.PI / 2 - 0.1, 0x5a6b62);
  marketStall(7, -22, -Math.PI / 2 + 0.3, 0x71564f);
  shrine(22.5, -20);
  frozenPond(-21.5, 20.5);

  // 성 밖 — 북쪽 길·폐가, 서쪽 묘지, 동쪽 강·대숲, 남쪽 논, 지평선의 산맥
  roadStrip(0, -31, 0, -38, 2.8);
  roadStrip(0, -38, -15, -45.5, 2.6);
  ruinedFarm(-16, -47);
  fallenJangseung(-7.5, -38);
  graveField(-40, -9);
  frozenRiver();
  bambooGrove(38, -36);
  paddyFields();
  mountains();

  // 성벽 밖 소나무 숲 — 새 지형(강·폐가·묘지·논·대숲)은 비켜서 심는다
  for (let i = 0; i < 75; i++) {
    const ang = rand(0, Math.PI * 2);
    const r = rand(44, 140);
    const px = Math.cos(ang) * r, pz = Math.sin(ang) * r;
    if (px > 38 && px < 49 && Math.abs(pz) < 57) continue;      // 얼어붙은 강
    if (Math.hypot(px + 16, pz + 47) < 10) continue;            // 폐가 농가
    if (px > -49 && px < -33 && pz > -19 && pz < 1) continue;   // 묘지
    if (Math.abs(px) < 26 && pz > 33 && pz < 58) continue;      // 논배미
    if (Math.hypot(px - 38, pz + 36) < 8) continue;             // 대숲
    pine(px, pz);
  }
}

function wallSeg(cx, cz, w, d) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 3.2, d), stoneMat);
  m.position.set(cx, 1.6, cz);
  m.castShadow = m.receiveShadow = true;
  scene.add(m);
  // 성벽 위 눈
  const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.15, 0.18, d + 0.15), snowRoofMat);
  cap.position.set(cx, 3.28, cz);
  scene.add(cap);
  addCollider(cx, cz, w, d);
  shootables.push(m);
}

function buildWalls() {
  // 북벽 (성문 폭 8 개방)
  wallSeg(-17, -30, 26, 1.2);
  wallSeg(17, -30, 26, 1.2);
  // 성문 기둥 + 지붕
  [-4.4, 4.4].forEach(x => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(1, 4.6, 1.2), darkWoodMat);
    p.position.set(x, 2.3, -30);
    p.castShadow = true;
    scene.add(p); shootables.push(p);
    addCollider(x, -30, 1, 1.2);
  });
  const gRoof = new THREE.Mesh(new THREE.ConeGeometry(6.4, 1.8, 4), roofMat);
  gRoof.rotation.y = Math.PI / 4;
  gRoof.scale.z = 0.45;
  gRoof.position.set(0, 5.4, -30);
  gRoof.castShadow = true;
  scene.add(gRoof);

  // 동벽 (z=5~12 파손)
  wallSeg(30, -12.5, 1.2, 35);
  wallSeg(30, 21, 1.2, 18);
  // 서벽 (z=-12~-5 파손)
  wallSeg(-30, -21, 1.2, 18);
  wallSeg(-30, 12.5, 1.2, 35);
  // 남벽
  wallSeg(0, 30, 61, 1.2);

  // 파손부 잔해
  [[30, 8.5], [-30, -8.5]].forEach(p => {
    for (let i = 0; i < 5; i++) {
      const rb = new THREE.Mesh(
        new THREE.BoxGeometry(rand(0.5, 1.3), rand(0.3, 0.8), rand(0.5, 1.3)), stoneMat);
      rb.position.set(p[0] + rand(-2.5, 2.5), rand(0.15, 0.4), p[1] + rand(-3, 3));
      rb.rotation.set(rand(0, 1), rand(0, 3), rand(0, 1));
      rb.castShadow = true;
      scene.add(rb);
    }
  });
}

function buildGateDebris() {
  // 부서져 넘어진 성문짝
  const d1 = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.25, 4.4), darkWoodMat);
  d1.position.set(-2, 0.35, -26.5);
  d1.rotation.set(0.12, 0.4, 0.28);
  d1.castShadow = true;
  scene.add(d1);
  const d2 = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.25, 4.2), darkWoodMat);
  d2.position.set(2.4, 0.2, -25);
  d2.rotation.set(-0.06, -0.7, -0.15);
  d2.castShadow = true;
  scene.add(d2);
}

function hanok(x, z, w, d, style = 'giwa') {
  // 안으로 들어가 숨을 수 있는 집 — 남쪽(+z)에 문이 뚫려 있다. 기와집 혹은 초가집.
  const g = new THREE.Group();
  const wallH = 2.5, t = 0.3, doorW = 1.5;

  const mkWall = (cx, cz, sw, sd) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sw, wallH, sd), wallClayMat);
    m.position.set(cx - x, wallH / 2, cz - z);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    addCollider(cx, cz, sw, sd);
    shootables.push(m);
  };
  mkWall(x, z - d / 2, w, t);          // 뒷벽
  mkWall(x - w / 2, z, t, d);          // 좌벽
  mkWall(x + w / 2, z, t, d);          // 우벽
  const segW = (w - doorW) / 2;        // 앞벽 — 가운데 문
  mkWall(x - doorW / 2 - segW / 2, z + d / 2, segW, t);
  mkWall(x + doorW / 2 + segW / 2, z + d / 2, segW, t);

  if (style === 'choga') {
    // 초가지붕 — 둥글게 엮은 볏짚 위에 눈이 소복하다
    const thatch = new THREE.Mesh(
      new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x8d7442, roughness: 1 })
    );
    thatch.scale.set(w * 0.72, 1.6, d * 0.78);
    thatch.position.y = 2.45;
    thatch.castShadow = true;
    g.add(thatch);
    const snowCap = new THREE.Mesh(
      new THREE.SphereGeometry(1.01, 14, 5, 0, Math.PI * 2, 0, Math.PI * 0.32), snowRoofMat);
    snowCap.scale.set(w * 0.72, 1.6, d * 0.78);
    snowCap.position.y = 2.46;
    g.add(snowCap);
    // 처마 밑 새끼줄 띠
    const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.35, 0.1, d + 0.35), woodMat);
    band.position.y = 2.47;
    g.add(band);
  } else {
    // 기와지붕 (사모지붕 근사) + 용마루 + 눈
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(w, d) * 0.72, 1.7, 4), roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1, 1, d / w);
    roof.position.y = 3.3;
    roof.castShadow = true;
    g.add(roof);
    const snow = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(w, d) * 0.73, 0.5, 4), snowRoofMat);
    snow.rotation.y = Math.PI / 4;
    snow.scale.set(1, 1, d / w);
    snow.position.y = 4.05;
    g.add(snow);
    // 용마루
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(w * 0.45, 0.16, 0.26), roofMat);
    ridge.position.y = 4.12;
    g.add(ridge);
    [-w * 0.225, w * 0.225].forEach(dx => { // 망와(끝머리)
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.3), roofMat);
      cap.position.set(dx, 4.14, 0);
      g.add(cap);
    });
    // 처마 밑 서까래 띠
    const eave = new THREE.Mesh(new THREE.BoxGeometry(w + 0.45, 0.09, d + 0.45), woodMat);
    eave.position.y = 2.46;
    g.add(eave);
  }

  // 문설주
  [-doorW / 2 - 0.1, doorW / 2 + 0.1].forEach(dx => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, wallH, 8), woodMat);
    col.position.set(dx, wallH / 2, d / 2);
    g.add(col);
  });

  // 실내 — 삿자리와 등불
  const mat = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.55, d * 0.5),
    new THREE.MeshStandardMaterial({ color: 0x6b5a3e, roughness: 1 })
  );
  mat.rotation.x = -Math.PI / 2;
  mat.position.set(0, 0.02, -d * 0.12);
  g.add(mat);
  const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.22), paperMat);
  lantern.position.set(0, 2.05, 0);
  g.add(lantern);
  const lampLight = new THREE.PointLight(0xffb060, 5, 7.5, 1.8);
  lampLight.position.set(x, 1.9, z);
  scene.add(lampLight);

  g.position.set(x, 0, z);
  scene.add(g);

  houses.push({
    minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2,
    door: new THREE.Vector3(x, 0, z + d / 2 + 0.9),   // 문 밖 접근점
    inside: new THREE.Vector3(x, 0, z),               // 집 안 지점
  });
  lootSpots.push({ x: x - w * 0.25, z: z - d * 0.2, inHouse: true });
  lootSpots.push({ x: x + w * 0.25, z: z + d * 0.15, inHouse: true });
}

function buildWell(x, z) {
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.4, 1.0, 12), stoneMat);
  ring.position.set(x, 0.5, z);
  ring.castShadow = ring.receiveShadow = true;
  scene.add(ring);
  const hole = new THREE.Mesh(
    new THREE.CircleGeometry(1.1, 12),
    new THREE.MeshBasicMaterial({ color: 0x02030a })
  );
  hole.rotation.x = -Math.PI / 2;
  hole.position.set(x, 1.02, z);
  scene.add(hole);
  [[-1.15, 0], [1.15, 0]].forEach(p => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 2.2, 6), woodMat);
    post.position.set(x + p[0], 1.6, z + p[1]);
    post.castShadow = true;
    scene.add(post);
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.5, 6), woodMat);
  beam.rotation.z = Math.PI / 2;
  beam.position.set(x, 2.6, z);
  scene.add(beam);
  addCollider(x, z, 2.8, 2.8);
  shootables.push(ring);
}

function buildCart(x, z) {
  const g = new THREE.Group();
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.15, 2.8), darkWoodMat);
  bed.position.y = 0.75;
  bed.castShadow = true;
  g.add(bed);
  [[-0.85, 0.7], [0.85, 0.7]].forEach(p => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 12), woodMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(p[0], 0.55, p[1]);
    wheel.castShadow = true;
    g.add(wheel);
  });
  g.position.set(x, 0, z);
  g.rotation.y = 0.9;
  scene.add(g);
  addCollider(x, z, 2.2, 2.8);
}

function buildCrates(x, z) {
  for (let i = 0; i < 4; i++) {
    const s = rand(0.6, 1);
    const c = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), woodMat);
    c.position.set(x + rand(-1.5, 1.5), s / 2, z + rand(-1.5, 1.5));
    c.rotation.y = rand(0, 1.5);
    c.castShadow = true;
    scene.add(c);
  }
  addCollider(x, z, 3, 3);
}

function torch(x, z) {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 2.4, 6), darkWoodMat);
  pole.position.set(x, 1.2, z);
  pole.castShadow = true;
  scene.add(pole);
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({
    color: 0xffa540, transparent: true, opacity: 0.95, fog: false, map: glowTex,
  }));
  flame.position.set(x, 2.55, z);
  flame.scale.set(0.5, 0.8, 1);
  scene.add(flame);
  const light = new THREE.PointLight(0xff8a3d, 14, 15, 1.9);
  light.position.set(x, 2.6, z);
  scene.add(light);
  torches.push({ flame, light, seed: rand(0, 100) });
}

const strawMat = new THREE.MeshStandardMaterial({ color: 0xcabf94, roughness: 1 });
const envWhite = new THREE.MeshStandardMaterial({ color: 0xd8d1bf, roughness: 0.9 });
const jangseungWood = new THREE.MeshStandardMaterial({ color: 0x74562f, roughness: 1 });

function jangseung(x, z, rotY) {
  // 천하대장군 — 부릅뜬 눈으로 마을 어귀를 지킨다
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 2.3, 10), jangseungWood);
  body.position.y = 1.15;
  body.castShadow = true;
  g.add(body);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.21, 0.2, 10), darkWoodMat);
  cap.position.y = 2.32;
  g.add(cap);
  [-0.08, 0.08].forEach(dx => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), envWhite);
    eye.position.set(dx, 1.96, 0.15);
    g.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 5), darkWoodMat);
    pupil.position.set(dx, 1.96, 0.2);
    g.add(pupil);
  });
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.15, 0.09), darkWoodMat);
  nose.position.set(0, 1.79, 0.18);
  g.add(nose);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.09, 0.04), envWhite);
  mouth.position.set(0, 1.62, 0.19);
  g.add(mouth);
  [-0.06, 0, 0.06].forEach(dx => {
    const gap = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.09, 0.045), darkWoodMat);
    gap.position.set(dx, 1.62, 0.19);
    g.add(gap);
  });
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  scene.add(g);
  addCollider(x, z, 0.55, 0.55);
  shootables.push(body);
}

function sotdae(x, z) {
  // 솟대 — 장대 끝의 오리가 하늘의 화를 물린다
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 3.2, 6), darkWoodMat);
  pole.position.y = 1.6;
  pole.castShadow = true;
  g.add(pole);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), darkWoodMat);
  body.scale.set(1.7, 0.8, 0.8);
  body.position.y = 3.28;
  g.add(body);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.28, 6), darkWoodMat);
  neck.position.set(0.18, 3.44, 0);
  neck.rotation.z = -0.5;
  g.add(neck);
  const headB = new THREE.Mesh(new THREE.SphereGeometry(0.055, 7, 6), darkWoodMat);
  headB.position.set(0.26, 3.56, 0);
  g.add(headB);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.14, 6), darkWoodMat);
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.36, 3.56, 0);
  g.add(beak);
  g.position.set(x, 0, z);
  g.rotation.y = rand(0, Math.PI * 2);
  scene.add(g);
}

function stoneCairn(x, z) {
  // 서낭당 돌탑 — 지나던 이들의 소원이 쌓였다
  let y = 0;
  [0.34, 0.27, 0.21, 0.15, 0.1].forEach(r => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), stoneMat);
    s.scale.y = 0.55;
    y += r * 0.5;
    s.position.set(x + rand(-0.03, 0.03), y, z + rand(-0.03, 0.03));
    y += r * 0.42;
    s.castShadow = true;
    scene.add(s);
  });
  addCollider(x, z, 0.7, 0.7);
}

function dangsanTree(x, z) {
  // 당산나무 — 금줄을 두른 노거수. 겨울이라 가지만 앙상하다.
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 3.6, 9), darkWoodMat);
  trunk.position.y = 1.8;
  trunk.castShadow = true;
  g.add(trunk);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + rand(-0.3, 0.3);
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.11, rand(1.4, 2.2), 6), darkWoodMat);
    br.position.set(Math.cos(a) * 0.7, 3.6 + rand(0, 0.6), Math.sin(a) * 0.7);
    br.rotation.set(Math.sin(a) * rand(0.5, 0.9), 0, Math.cos(a) * rand(0.5, 0.9));
    br.castShadow = true;
    g.add(br);
  }
  // 금줄과 한지 지전
  const rope = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.045, 6, 14), strawMat);
  rope.rotation.x = Math.PI / 2;
  rope.position.y = 1.5;
  g.add(rope);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xe8e2d0, roughness: 1, side: THREE.DoubleSide }));
    paper.position.set(Math.cos(a) * 0.5, 1.32, Math.sin(a) * 0.5);
    paper.rotation.y = -a;
    g.add(paper);
  }
  g.position.set(x, 0, z);
  scene.add(g);
  addCollider(x, z, 0.95, 0.95);
  shootables.push(trunk);
}

function geumjul() {
  // 성문에 드리운 금줄 — 마을을 지키던 것. 이제는 반쯤 늘어졌다.
  [[-4.4, -0.11], [4.4, 0.11]].forEach(([sx, tilt]) => {
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 4.6, 5), strawMat);
    rope.rotation.z = Math.PI / 2 + tilt;
    rope.position.set(sx / 2, 4.05, -30);
    scene.add(rope);
  });
  [-3.2, -1.2, 1.2, 3.2].forEach(px => {
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.34),
      new THREE.MeshStandardMaterial({ color: 0xe8e2d0, roughness: 1, side: THREE.DoubleSide }));
    paper.position.set(px, 3.72, -30);
    paper.rotation.y = rand(-0.4, 0.4);
    scene.add(paper);
  });
}

function chorong(x, z) {
  // 청사초롱 — 붉은 비단 갓 아래 불빛이 흔들린다
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 2.3, 6), darkWoodMat);
  pole.position.y = 1.15;
  pole.castShadow = true;
  g.add(pole);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 6), darkWoodMat);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(0.25, 2.28, 0);
  g.add(arm);
  const redSilk = new THREE.MeshStandardMaterial({ color: 0x8f2b2b, roughness: 0.85 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.07, 0.2), redSilk);
  top.position.set(0.45, 2.13, 0);
  g.add(top);
  const paper = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.24, 0.17), paperMat);
  paper.position.set(0.45, 1.98, 0);
  g.add(paper);
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.07, 0.2), redSilk);
  bottom.position.set(0.45, 1.83, 0);
  g.add(bottom);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    color: 0xffb060, transparent: true, opacity: 0.8, fog: false, map: glowTex,
  }));
  glow.position.set(0.45, 1.98, 0);
  glow.scale.set(0.3, 0.3, 1);
  g.add(glow);
  const light = new THREE.PointLight(0xff8a55, 7, 10, 1.8);
  light.position.set(x + 0.45, 2, z);
  scene.add(light);
  g.position.set(x, 0, z);
  scene.add(g);
  torches.push({ flame: glow, light, seed: rand(0, 100), base: 7, fw: 0.24, fh: 0.24 });
}

function pine(x, z) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 2.4, 6), darkWoodMat);
  trunk.position.y = 1.2;
  g.add(trunk);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x16241c, roughness: 1 });
  const h = rand(4, 7);
  for (let i = 0; i < 3; i++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.9 - i * 0.5, h * 0.42, 7), leafMat);
    cone.position.y = 2 + i * h * 0.24;
    g.add(cone);
    const snow = new THREE.Mesh(new THREE.ConeGeometry(1.92 - i * 0.5, 0.35, 7), snowRoofMat);
    snow.position.y = 2 + i * h * 0.24 + h * 0.21;
    g.add(snow);
  }
  g.position.set(x, 0, z);
  g.scale.setScalar(rand(0.8, 1.5));
  scene.add(g);
}

// ============================================================
//  마을 확장 — 망루·양반가·저잣거리·사당·연못
// ============================================================
const jarMat = new THREE.MeshStandardMaterial({ color: 0x453329, roughness: 0.75 });
const redPillarMat = new THREE.MeshStandardMaterial({ color: 0x77302a, roughness: 0.85 });
const iceMat = new THREE.MeshStandardMaterial({
  color: 0x8fa9c4, roughness: 0.18, metalness: 0.3,
  emissive: 0x0e1a2a, emissiveIntensity: 0.7,
});
const charredMat = new THREE.MeshStandardMaterial({ color: 0x241d18, roughness: 1 });
const burntClayMat = new THREE.MeshStandardMaterial({ color: 0x4f4238, roughness: 1 });

function watchtower(x, z) {
  // 망루 — 계단으로 마루에 올라 성문 쪽을 내려다보며 쏠 수 있다
  const g = new THREE.Group();
  const H = 2.6;
  [[-1.35, -1.35], [1.35, -1.35], [-1.35, 1.35], [1.35, 1.35]].forEach(p => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.26, H + 1.7, 0.26), darkWoodMat);
    post.position.set(p[0], (H + 1.7) / 2, p[1]);
    post.castShadow = true;
    g.add(post);
    shootables.push(post);
    addCollider(x + p[0], z + p[1], 0.34, 0.34);
  });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.14, 3.4), woodMat);
  deck.position.y = H;
  deck.castShadow = deck.receiveShadow = true;
  g.add(deck);
  shootables.push(deck);
  // 난간
  [[0, -1.62, 3.4, 0.08], [0, 1.62, 3.4, 0.08], [-1.62, 0, 0.08, 3.4], [1.62, 0, 0.08, 3.4]].forEach(r => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(r[2], 0.07, r[3]), woodMat);
    rail.position.set(r[0], H + 0.62, r[1]);
    g.add(rail);
  });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.1, 1.5, 4), roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = H + 2.5;
  roof.castShadow = true;
  g.add(roof);
  const snowc = new THREE.Mesh(new THREE.ConeGeometry(3.12, 0.42, 4), snowRoofMat);
  snowc.rotation.y = Math.PI / 4;
  snowc.position.y = H + 3.06;
  g.add(snowc);
  // 계단 — 남쪽으로 내려간다
  const steps = 8, runL = 3.7;
  for (let i = 0; i < steps; i++) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.09, runL / steps + 0.1), woodMat);
    st.position.set(0, H * (1 - (i + 0.5) / steps), 1.7 + (i + 0.5) * (runL / steps));
    st.receiveShadow = true;
    g.add(st);
  }
  ramps.push({ minX: x - 0.75, maxX: x + 0.75, minZ: z + 1.62, maxZ: z + 1.7 + runL, y0: H + 0.07, y1: 0 });
  platforms.push({ minX: x - 1.7, maxX: x + 1.7, minZ: z - 1.7, maxZ: z + 1.7, y: H + 0.07 });
  towers.push({
    minX: x - 1.7, maxX: x + 1.7, minZ: z - 1.7, maxZ: z + 1.7, y: H + 0.07,
    stair: new THREE.Vector3(x, 0, z + 5.9),  // 계단 초입
    top: new THREE.Vector3(x, 0, z),          // 마루 위
  });
  // 봉수 화로 — 마루 위의 불
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.15, 0.22, 8), stoneMat);
  bowl.position.set(0.95, H + 0.26, -0.95);
  g.add(bowl);
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({
    color: 0xffa540, transparent: true, opacity: 0.95, fog: false, map: glowTex,
  }));
  flame.position.set(0.95, H + 0.62, -0.95);
  flame.scale.set(0.45, 0.7, 1);
  g.add(flame);
  const light = new THREE.PointLight(0xff8a3d, 9, 13, 1.9);
  light.position.set(x + 0.95, H + 0.65, z - 0.95);
  scene.add(light);
  torches.push({ flame, light, seed: rand(0, 100), base: 9, fw: 0.42, fh: 0.62 });
  g.position.set(x, 0, z);
  scene.add(g);
}

function bareTree(x, z, s = 1) {
  // 겨울나무 — 가지만 앙상하다
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 3, 8), darkWoodMat);
  trunk.position.y = 1.5;
  trunk.castShadow = true;
  g.add(trunk);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + rand(-0.3, 0.3);
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.09, rand(1.2, 1.9), 6), darkWoodMat);
    br.position.set(Math.cos(a) * 0.55, 3 + rand(0, 0.5), Math.sin(a) * 0.55);
    br.rotation.set(Math.sin(a) * rand(0.5, 0.9), 0, Math.cos(a) * rand(0.5, 0.9));
    br.castShadow = true;
    g.add(br);
  }
  g.position.set(x, 0, z);
  g.scale.setScalar(s);
  scene.add(g);
  addCollider(x, z, 0.6 * s, 0.6 * s);
}

function yangbanCompound(cx, cz) {
  // 양반가 — 기와 얹은 담장 안에 안채와 장독대, 매화나무
  const fh = 1.7, ft = 0.35;
  const mkFence = (x, z, w, d) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, fh, d), wallClayMat);
    m.position.set(x, fh / 2, z);
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.18, 0.14, d + 0.18), roofMat);
    cap.position.set(x, fh + 0.07, z);
    scene.add(cap);
    addCollider(x, z, w, d);
    shootables.push(m);
  };
  mkFence(cx, cz - 5, 12, ft);          // 북담
  mkFence(cx, cz + 5, 12, ft);          // 남담
  mkFence(cx + 6, cz, ft, 10 + ft);     // 동담
  mkFence(cx - 6, cz - 2.95, ft, 4.1);  // 서담 — 가운데가 대문
  mkFence(cx - 6, cz + 2.95, ft, 4.1);
  // 솟을대문
  [cz - 1.05, cz + 1.05].forEach(gz => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.6, 0.3), darkWoodMat);
    p.position.set(cx - 6, 1.3, gz);
    p.castShadow = true;
    scene.add(p);
    addCollider(cx - 6, gz, 0.34, 0.34);
  });
  const gr = new THREE.Mesh(new THREE.ConeGeometry(1.9, 0.9, 4), roofMat);
  gr.rotation.y = Math.PI / 4;
  gr.scale.x = 0.55;
  gr.position.set(cx - 6, 3.0, cz);
  gr.castShadow = true;
  scene.add(gr);

  hanok(cx + 1, cz - 2.5, 6, 4.5, 'giwa'); // 안채

  // 장독대
  const dais = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 1.6), stoneMat);
  dais.position.set(cx + 4, 0.09, cz + 3.2);
  dais.receiveShadow = true;
  scene.add(dais);
  [[-0.8, -0.3], [0, -0.35], [0.8, -0.3], [-0.45, 0.35], [0.45, 0.35]].forEach(o => {
    const r = rand(0.24, 0.34);
    const jar = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), jarMat);
    jar.scale.y = 1.15;
    jar.position.set(cx + 4 + o[0], 0.18 + r, cz + 3.2 + o[1]);
    scene.add(jar);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.75, 0.07, 8), darkWoodMat);
    lid.position.set(cx + 4 + o[0], 0.18 + r * 2.12, cz + 3.2 + o[1]);
    scene.add(lid);
  });
  addCollider(cx + 4, cz + 3.2, 2.6, 1.8);

  bareTree(cx - 3.4, cz + 2.6, 0.75); // 매화나무 — 겨울이라 가지뿐
  lootSpots.push({ x: cx - 2, z: cz + 3.6 });
  chorong(cx - 7.2, cz + 1.6);
}

function marketStall(x, z, rotY, clothColor) {
  // 저잣거리 좌판 — 버려진 난전. 차양이 눈 무게에 쳐졌다
  const g = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({ color: clothColor, roughness: 1, side: THREE.DoubleSide });
  [[-1.15, 0.75, 2.25], [1.15, 0.75, 2.25], [-1.15, -0.7, 1.85], [1.15, -0.7, 1.85]].forEach(p => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, p[2], 6), darkWoodMat);
    post.position.set(p[0], p[2] / 2, p[1]);
    g.add(post);
  });
  const awn = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.045, 1.95), cloth);
  awn.position.set(0, 2.0, 0.05);
  awn.rotation.x = 0.19;
  awn.castShadow = true;
  g.add(awn);
  const awnSnow = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.05, 1.5), snowRoofMat);
  awnSnow.position.set(0, 2.06, -0.15);
  awnSnow.rotation.x = 0.19;
  g.add(awnSnow);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.72, 0.85), woodMat);
  counter.position.set(0, 0.36, 0.55);
  counter.castShadow = counter.receiveShadow = true;
  g.add(counter);
  shootables.push(counter);
  // 팔다 만 곡식 자루와 옹기
  [[-0.6, 0.2], [0.15, -0.1]].forEach(o => {
    const sack = new THREE.Mesh(new THREE.SphereGeometry(rand(0.2, 0.26), 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xa39274, roughness: 1 }));
    sack.scale.y = 0.8;
    sack.position.set(o[0], 0.85, 0.5 + o[1]);
    g.add(sack);
  });
  const pot = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), jarMat);
  pot.position.set(0.75, 0.87, 0.45);
  g.add(pot);
  // 차양에 매달린 북어 두름
  [-0.7, -0.25, 0.35].forEach(hx => {
    const str = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 4), strawMat);
    str.position.set(hx, 1.62, 0.85);
    g.add(str);
    const fish = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 0.035),
      new THREE.MeshStandardMaterial({ color: 0xbfb391, roughness: 1 }));
    fish.position.set(hx, 1.36, 0.85);
    fish.rotation.y = rand(-0.4, 0.4);
    g.add(fish);
  });
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  scene.add(g);
  addCollider(x, z, 2.2, 2.2);
  lootSpots.push({ x: x + Math.sin(rotY) * 1.8, z: z + Math.cos(rotY) * 1.8 });
}

function shrine(x, z) {
  // 서낭 사당 — 붉은 기둥 안쪽, 촛불 두 자루가 아직 꺼지지 않았다
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.4, 3), stoneMat);
  base.position.y = 0.2;
  base.receiveShadow = true;
  g.add(base);
  shootables.push(base);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.9, 3), wallClayMat);
  back.position.set(1.05, 1.35, 0);
  back.castShadow = true;
  g.add(back);
  shootables.push(back);
  [-1.43, 1.43].forEach(sz => {
    const side = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.9, 0.14), wallClayMat);
    side.position.set(0.1, 1.35, sz);
    side.castShadow = true;
    g.add(side);
  });
  [-1.25, 1.25].forEach(pz => {
    const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 2.0, 8), redPillarMat);
    pil.position.set(-1.05, 1.4, pz);
    pil.castShadow = true;
    g.add(pil);
  });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.5, 1.2, 4), roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = 1.15;
  roof.position.y = 2.95;
  roof.castShadow = true;
  g.add(roof);
  const rSnow = new THREE.Mesh(new THREE.ConeGeometry(2.52, 0.36, 4), snowRoofMat);
  rSnow.rotation.y = Math.PI / 4;
  rSnow.scale.z = 1.15;
  rSnow.position.y = 3.5;
  g.add(rSnow);
  // 제단과 위패
  const altar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 1.6), darkWoodMat);
  altar.position.set(0.55, 0.65, 0);
  g.add(altar);
  const tablet = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.32, 0.16), envWhite);
  tablet.position.set(0.75, 1.06, 0);
  g.add(tablet);
  // 촛불
  [-0.5, 0.5].forEach((cz2, i) => {
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.2, 6), envWhite);
    candle.position.set(0.35, 1.0, cz2);
    g.add(candle);
    const cGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      color: 0xffc060, transparent: true, opacity: 0.9, fog: false, map: glowTex,
    }));
    cGlow.position.set(0.35, 1.16, cz2);
    cGlow.scale.set(0.09, 0.13, 1);
    g.add(cGlow);
    if (i === 0) {
      const cl = new THREE.PointLight(0xffb060, 3.5, 6.5, 1.8);
      cl.position.set(x + 0.35, 1.3, z + cz2);
      scene.add(cl);
      torches.push({ flame: cGlow, light: cl, seed: rand(0, 100), base: 3.5, fw: 0.09, fh: 0.13 });
    }
  });
  g.position.set(x, 0, z);
  scene.add(g);
  addCollider(x, z, 2.7, 3.1);
  lootSpots.push({ x: x - 2.3, z });
}

function frozenPond(x, z) {
  // 얼어붙은 연못 — 금 간 얼음, 물 긷던 구멍
  const ice = new THREE.Mesh(new THREE.CircleGeometry(3.3, 22), iceMat);
  ice.rotation.x = -Math.PI / 2;
  ice.position.set(x, 0.045, z); // 핏자국(y 0.02)과 겹치지 않게 살짝 띄운다
  ice.receiveShadow = true;
  scene.add(ice);
  for (let i = 0; i < 5; i++) {
    const crack = new THREE.Mesh(new THREE.PlaneGeometry(rand(1.2, 2.6), 0.035),
      new THREE.MeshBasicMaterial({ color: 0x4a6076 }));
    crack.rotation.x = -Math.PI / 2;
    crack.rotation.z = rand(0, Math.PI);
    crack.position.set(x + rand(-1.8, 1.8), 0.06, z + rand(-1.8, 1.8));
    scene.add(crack);
  }
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.34, 10),
    new THREE.MeshBasicMaterial({ color: 0x04070e }));
  hole.rotation.x = -Math.PI / 2;
  hole.position.set(x + 1.2, 0.065, z - 0.8);
  scene.add(hole);
  const pail = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.24, 8), woodMat);
  pail.position.set(x + 1.7, 0.12, z - 1.15);
  pail.rotation.z = 0.4;
  pail.castShadow = true;
  scene.add(pail);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rand(-0.15, 0.15);
    const st = new THREE.Mesh(new THREE.SphereGeometry(rand(0.14, 0.28), 7, 5), stoneMat);
    st.scale.y = 0.6;
    st.position.set(x + Math.cos(a) * rand(3.3, 3.7), 0.08, z + Math.sin(a) * rand(3.3, 3.7));
    scene.add(st);
  }
}

// ============================================================
//  성 밖 — 북쪽 길·폐가, 서쪽 묘지, 동쪽 강·대숲, 남쪽 논, 먼 산
// ============================================================
const roadMat = new THREE.MeshStandardMaterial({ color: 0x9aa5b6, roughness: 1 });

function roadStrip(x1, z1, x2, z2, w) {
  // 눈에 다져진 길
  const len = Math.hypot(x2 - x1, z2 - z1);
  const dx = (x2 - x1) / len, dz = (z2 - z1) / len;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, len), roadMat);
  m.rotation.set(-Math.PI / 2, 0, Math.atan2(-dx, -dz));
  m.position.set((x1 + x2) / 2, 0.012, (z1 + z2) / 2);
  m.receiveShadow = true;
  scene.add(m);
}

function ruinedFarm(x, z) {
  // 불타 버려진 농가 — 등불도 없이 캄캄하다. 벽은 남았지만 옆구리가 뚫렸다
  const w = 6, d = 5, wallH = 2.2, t = 0.3, doorW = 1.5;
  const g = new THREE.Group();
  const mkWall = (cx, cz, sw, sd, h = wallH) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sw, h, sd), burntClayMat);
    m.position.set(cx - x, h / 2, cz - z);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    addCollider(cx, cz, sw, sd);
    shootables.push(m);
  };
  mkWall(x, z - d / 2, w, t);                       // 뒷벽
  mkWall(x - w / 2, z, t, d);                       // 좌벽
  mkWall(x + w / 2, z - d * 0.28, t, d * 0.4);      // 우벽 — 가운데가 무너져 뚫렸다
  mkWall(x + w / 2, z + d * 0.32, t, d * 0.3, 0.9);
  const segW = (w - doorW) / 2;
  mkWall(x - doorW / 2 - segW / 2, z + d / 2, segW, t);
  mkWall(x + doorW / 2 + segW / 2, z + d / 2, segW, t, 1.3); // 앞벽 일부도 허물어졌다
  // 반쯤 주저앉은 그을린 초가지붕
  const thatch = new THREE.Mesh(
    new THREE.SphereGeometry(1, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x352b20, roughness: 1 }));
  thatch.scale.set(w * 0.62, 1.25, d * 0.72);
  thatch.rotation.z = 0.3;
  thatch.position.set(-0.9, 1.75, 0);
  thatch.castShadow = true;
  g.add(thatch);
  const snowPatch = new THREE.Mesh(
    new THREE.SphereGeometry(1.01, 12, 4, 0, Math.PI * 2, 0, Math.PI * 0.26), snowRoofMat);
  snowPatch.scale.copy(thatch.scale);
  snowPatch.rotation.z = 0.3;
  snowPatch.position.copy(thatch.position);
  g.add(snowPatch);
  // 그을린 서까래가 나뒹군다
  [[1.6, 0.5, 0.9, 0.5], [2.6, 0.3, -1.2, -0.8], [-0.5, 0.35, 2.9, 1.1]].forEach(b => {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, rand(1.8, 2.8)), charredMat);
    beam.position.set(b[0], b[1], b[2]);
    beam.rotation.set(rand(-0.2, 0.2), b[3], rand(-0.15, 0.15));
    g.add(beam);
  });
  // 부러진 울타리
  for (let i = 0; i < 6; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, rand(0.5, 1.1), 5), charredMat);
    post.position.set(-4.2 + i * 1.7, 0.35, 3.9);
    post.rotation.z = rand(-0.3, 0.3);
    g.add(post);
  }
  g.position.set(x, 0, z);
  scene.add(g);
  houses.push({
    minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2,
    door: new THREE.Vector3(x, 0, z + d / 2 + 0.9),
    inside: new THREE.Vector3(x, 0, z),
  });
  lootSpots.push({ x: x - 1.4, z: z - 1, inHouse: true });
  lootSpots.push({ x: x + 1.2, z: z + 0.8, inHouse: true });
}

function fallenJangseung(x, z) {
  // 쓰러진 장승 — 길가에 눈을 뒤집어쓰고 누웠다
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 2.3, 10), jangseungWood);
  body.rotation.set(0, rand(0, 3), Math.PI / 2 - 0.12);
  body.position.set(x, 0.26, z);
  body.castShadow = true;
  scene.add(body);
  addCollider(x, z, 2.0, 0.7);
}

function graveField(cx, cz) {
  // 묘지 — 봉분들. 하나는 안에서부터 파헤쳐졌다
  const moundMat = new THREE.MeshStandardMaterial({ color: 0x9aa6b6, roughness: 1 });
  [[0, 0, 1.6], [4.6, -3.2, 1.35], [-4.2, -4, 1.3], [3.4, 3.8, 1.45], [-4.6, 3.4, 1.25]].forEach((m, i) => {
    const mx = cx + m[0], mz = cz + m[1], r = m[2];
    const mound = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), moundMat);
    mound.scale.y = 0.5;
    mound.position.set(mx, 0.06, mz);
    mound.receiveShadow = true;
    scene.add(mound);
    shootables.push(mound);
    addCollider(mx, mz, r * 1.5, r * 1.5);
    if (i === 1) {
      // 파헤쳐진 봉분 — 안에서 밖으로 뚫렸다
      const holeM = new THREE.Mesh(new THREE.CircleGeometry(0.5, 10),
        new THREE.MeshBasicMaterial({ color: 0x0a0705 }));
      holeM.rotation.x = -Math.PI / 2 + 0.95;
      holeM.position.set(mx + r * 0.35, r * 0.38, mz + r * 0.45);
      scene.add(holeM);
      for (let k = 0; k < 4; k++) {
        const dirt = new THREE.Mesh(new THREE.BoxGeometry(rand(0.15, 0.3), 0.08, rand(0.15, 0.3)),
          new THREE.MeshStandardMaterial({ color: 0x2e241c, roughness: 1 }));
        dirt.position.set(mx + rand(0.5, 1.6), 0.05, mz + rand(0.6, 1.8));
        dirt.rotation.y = rand(0, 3);
        scene.add(dirt);
      }
      const stele = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.8, 0.12), stoneMat);
      stele.position.set(mx - 0.3, 0.12, mz + r + 0.4);
      stele.rotation.set(Math.PI / 2 - 0.25, 0, rand(-0.4, 0.4));
      scene.add(stele);
    } else {
      const stele = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.8, 0.12), stoneMat);
      stele.position.set(mx, 0.4, mz + r * 0.75 + 0.2);
      stele.rotation.set(rand(-0.08, 0.08), rand(-0.2, 0.2), rand(-0.1, 0.1));
      scene.add(stele);
    }
  });
}

function frozenRiver() {
  // 얼어붙은 강 — 동쪽 파손부 너머, 섶다리가 걸쳐 있다
  const river = new THREE.Mesh(new THREE.PlaneGeometry(8, 116), iceMat);
  river.rotation.x = -Math.PI / 2;
  river.position.set(43.5, 0.015, 0);
  river.receiveShadow = true;
  scene.add(river);
  for (let i = 0; i < 10; i++) {
    const crack = new THREE.Mesh(new THREE.PlaneGeometry(rand(1.5, 3.5), 0.04),
      new THREE.MeshBasicMaterial({ color: 0x44586e }));
    crack.rotation.x = -Math.PI / 2;
    crack.rotation.z = rand(-0.5, 0.5);
    crack.position.set(rand(40.5, 46.5), 0.03, rand(-52, 52));
    scene.add(crack);
  }
  for (let i = 0; i < 10; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.07, 1.8), woodMat);
    plank.position.set(39 + i * 1.02, 0.1, 8.5);
    plank.rotation.y = rand(-0.03, 0.03);
    plank.receiveShadow = true;
    scene.add(plank);
  }
  [[39.3, 7.6], [39.3, 9.4], [48.2, 7.6], [48.2, 9.4]].forEach(p => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.1, 6), darkWoodMat);
    post.position.set(p[0], 0.55, p[1]);
    post.castShadow = true;
    scene.add(post);
  });
}

function bambooGrove(cx, cz) {
  // 눈 얹힌 대숲 — 바람이 지날 때마다 서걱거린다
  const bambooMat = new THREE.MeshStandardMaterial({ color: 0x5f7252, roughness: 0.9 });
  const leafM = new THREE.MeshStandardMaterial({ color: 0x2e4030, roughness: 1 });
  for (let i = 0; i < 22; i++) {
    const a = rand(0, Math.PI * 2), r = Math.sqrt(Math.random()) * 6;
    const bx = cx + Math.cos(a) * r, bz = cz + Math.sin(a) * r;
    const h = rand(4.5, 7);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, h, 5), bambooMat);
    st.position.set(bx, h / 2, bz);
    st.rotation.set(rand(-0.05, 0.05), 0, rand(-0.05, 0.05));
    scene.add(st);
    for (let k = 0; k < 2; k++) {
      const lf = new THREE.Mesh(new THREE.ConeGeometry(rand(0.25, 0.45), rand(0.7, 1.1), 5), leafM);
      lf.position.set(bx + rand(-0.3, 0.3), h - k * 0.8 - rand(0, 0.4), bz + rand(-0.3, 0.3));
      lf.rotation.set(rand(-0.4, 0.4), 0, rand(-0.4, 0.4));
      scene.add(lf);
    }
  }
}

function strawStack(x, z) {
  // 노적가리 — 낟가리 위에 눈이 얹혔다
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.25, 2.1, 9), strawMat);
  cone.position.set(x, 1.05, z);
  scene.add(cone);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.86, 0.5, 9), snowRoofMat);
  cap.position.set(x, 2.0, z);
  scene.add(cap);
  addCollider(x, z, 1.9, 1.9);
  shootables.push(cone);
}

function scarecrow(x, z) {
  // 허수아비 — 삿갓 쓴 것이 멀리서 보면 꼭 사람 같다
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 2.1, 6), darkWoodMat);
  pole.position.y = 1.05;
  g.add(pole);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.7, 6), darkWoodMat);
  arm.rotation.z = Math.PI / 2;
  arm.position.y = 1.5;
  g.add(arm);
  const coat = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.6, 0.16),
    new THREE.MeshStandardMaterial({ color: 0x77705f, roughness: 1 }));
  coat.position.y = 1.18;
  g.add(coat);
  const headS = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), strawMat);
  headS.position.y = 1.85;
  g.add(headS);
  const gat = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.3, 10), darkWoodMat);
  gat.position.y = 2.05;
  g.add(gat);
  g.rotation.z = 0.07;
  g.position.set(x, 0, z);
  scene.add(g);
}

function paddyFields() {
  // 남쪽 성 밖 — 눈에 묻힌 논배미. 두렁이 낮게 이어진다
  const ridgeMat = new THREE.MeshStandardMaterial({ color: 0x847a68, roughness: 1 });
  const mkRidge = (x, z, w, d) => {
    const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.22, d), ridgeMat);
    r.position.set(x, 0.11, z);
    r.receiveShadow = true;
    scene.add(r);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, 0.07, d + 0.06), snowRoofMat);
    cap.position.set(x, 0.24, z);
    scene.add(cap);
  };
  [36, 42.5, 49, 55.5].forEach(z => mkRidge(0, z, 48, 0.55));
  [-24, -12, 0, 12, 24].forEach(x => mkRidge(x, 45.7, 0.55, 20));
  strawStack(-17, 45);
  strawStack(6, 51.5);
  strawStack(16.5, 39.5);
  scarecrow(4, 45.5);
}

const mtnMats = []; // 원경 산맥은 안개 대신 새벽빛에 물든다
function mountains() {
  for (let i = 0; i < 15; i++) {
    const a = (i / 15) * Math.PI * 2 + rand(-0.14, 0.14);
    const r = rand(175, 235);
    const h = rand(26, 62);
    const base = h * rand(1.2, 1.7);
    const night = new THREE.Color(0x0a1220).offsetHSL(0, 0, rand(-0.008, 0.015));
    const bodyMat = new THREE.MeshBasicMaterial({ color: night.clone(), fog: false });
    const body = new THREE.Mesh(new THREE.ConeGeometry(base, h, 5), bodyMat);
    body.position.set(Math.cos(a) * r, h / 2 - 3, Math.sin(a) * r);
    body.rotation.y = rand(0, Math.PI);
    scene.add(body);
    mtnMats.push({ mat: bodyMat, night, dawn: new THREE.Color(0x74462f) });
    const capNight = new THREE.Color(0x202f47);
    const capMat = new THREE.MeshBasicMaterial({ color: capNight.clone(), fog: false });
    const cap = new THREE.Mesh(new THREE.ConeGeometry(base * 0.34, h * 0.33, 5), capMat);
    cap.position.set(body.position.x, h - 3 - h * 0.165, body.position.z);
    cap.rotation.y = body.rotation.y;
    scene.add(cap);
    mtnMats.push({ mat: capMat, night: capNight, dawn: new THREE.Color(0xc08a5e) });
  }
}

buildWorld();

// ============================================================
//  눈보라
// ============================================================
const SNOW_N = 2600;
const snowVel = new Float32Array(SNOW_N);
const snowGeo = new THREE.BufferGeometry();
{
  const p = new Float32Array(SNOW_N * 3);
  for (let i = 0; i < SNOW_N; i++) {
    p[i * 3] = rand(-45, 45);
    p[i * 3 + 1] = rand(0, 30);
    p[i * 3 + 2] = rand(-45, 45);
    snowVel[i] = rand(1.4, 3.2);
  }
  snowGeo.setAttribute('position', new THREE.BufferAttribute(p, 3));
}
// 원형 소프트 눈송이 텍스처
const snowTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
})();
const snowPts = new THREE.Points(snowGeo, new THREE.PointsMaterial({
  color: 0xe8eef8, size: 0.16, transparent: true, opacity: 0.85,
  map: snowTex, depthWrite: false, sizeAttenuation: true,
}));
scene.add(snowPts);

let windPhase = 0;
function updateSnow(dt, px, pz) {
  windPhase += dt * 0.4;
  const wx = Math.sin(windPhase) * 1.6 + 0.8;
  const arr = snowGeo.attributes.position.array;
  for (let i = 0; i < SNOW_N; i++) {
    arr[i * 3] += wx * dt;
    arr[i * 3 + 1] -= snowVel[i] * dt;
    if (arr[i * 3 + 1] < 0) {
      arr[i * 3 + 1] = rand(22, 30);
      arr[i * 3] = px + rand(-45, 45);
      arr[i * 3 + 2] = pz + rand(-45, 45);
    }
    // 플레이어 주변 래핑
    if (arr[i * 3] - px > 45) arr[i * 3] -= 90;
    if (px - arr[i * 3] > 45) arr[i * 3] += 90;
    if (arr[i * 3 + 2] - pz > 45) arr[i * 3 + 2] -= 90;
    if (pz - arr[i * 3 + 2] > 45) arr[i * 3 + 2] += 90;
  }
  snowGeo.attributes.position.needsUpdate = true;
}

// ============================================================
//  플레이어
// ============================================================
const player = {
  pos: new THREE.Vector3(0, 0, 24),
  vy: 0, grounded: true,
  hp: 100, stamina: 100, staminaWait: 0, hurtCd: 0,
  yaw: Math.PI, pitch: 0,   // 북쪽(마을 안)을 바라보고 시작... 실제로는 -z가 북, yaw 0이 -z
  bobT: 0, stepAcc: 0,
  alive: true,
};
player.yaw = 0; // -z(성문) 방향

const keys = {};
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'KeyE' && !e.repeat) tryPickup();
  if (e.code === 'Digit1') switchWeapon(1);
  if (e.code === 'Digit2') switchWeapon(2);
  if (e.code === 'Digit3') switchWeapon(3);
});
addEventListener('keyup', e => { keys[e.code] = false; });

document.addEventListener('mousemove', e => {
  if (document.pointerLockElement !== canvas) return;
  player.yaw -= e.movementX * 0.0021;
  player.pitch = clamp(player.pitch - e.movementY * 0.0021, -1.45, 1.45);
});

function resolveCollisions(p, r) {
  for (const c of colliders) {
    const nx = clamp(p.x, c.minX, c.maxX);
    const nz = clamp(p.z, c.minZ, c.maxZ);
    const dx = p.x - nx, dz = p.z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 < 1e-6) { p.x = c.maxX + r; continue; }
      const d = Math.sqrt(d2);
      p.x = nx + dx / d * r;
      p.z = nz + dz / d * r;
    }
  }
  p.x = clamp(p.x, -200, 200);
  p.z = clamp(p.z, -200, 200);
}

function groundHeightAt(x, z, py) {
  // 발밑 지지면 높이 — 현재 높이에서 오를 수 있는(py+0.55 이하) 단만 친다
  let h = 0;
  for (const p of platforms) {
    if (x > p.minX && x < p.maxX && z > p.minZ && z < p.maxZ && p.y <= py + 0.55) h = Math.max(h, p.y);
  }
  for (const r of ramps) {
    if (x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ) {
      const t = clamp((z - r.minZ) / (r.maxZ - r.minZ), 0, 1);
      const y = r.y0 + (r.y1 - r.y0) * t;
      if (y <= py + 0.55) h = Math.max(h, y);
    }
  }
  return h;
}

let camShake = 0;
function updatePlayer(dt) {
  player.hurtCd = Math.max(0, player.hurtCd - dt);
  const sprinting = keys.ShiftLeft && player.stamina > 0 &&
    (keys.KeyW || keys.KeyA || keys.KeyS || keys.KeyD);
  const speed = sprinting ? 6.6 : 4.0;

  const f = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const r = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  const move = new THREE.Vector3();
  if (keys.KeyW) move.add(f);
  if (keys.KeyS) move.sub(f);
  if (keys.KeyD) move.add(r);
  if (keys.KeyA) move.sub(r);
  const moving = move.lengthSq() > 0;
  if (moving) {
    move.normalize().multiplyScalar(speed * dt);
    player.pos.x += move.x;
    player.pos.z += move.z;
  }

  // 스태미나
  if (sprinting && moving) {
    player.stamina = Math.max(0, player.stamina - 20 * dt);
    player.staminaWait = 0.9;
  } else {
    player.staminaWait -= dt;
    if (player.staminaWait <= 0) player.stamina = Math.min(100, player.stamina + 15 * dt);
  }

  // 점프 / 중력 — 망루 마루 같은 단 위에도 올라설 수 있다
  if (keys.Space && player.grounded) { player.vy = 4.6; player.grounded = false; }
  player.vy -= 13 * dt;
  player.pos.y += player.vy * dt;
  const gh = groundHeightAt(player.pos.x, player.pos.z, player.pos.y);
  if (player.pos.y <= gh) { player.pos.y = gh; player.vy = 0; player.grounded = true; }
  else if (player.pos.y > gh + 0.04) player.grounded = false;

  resolveCollisions(player.pos, 0.42);

  // 발소리 (눈 밟는 소리)
  if (moving && player.grounded) {
    player.bobT += dt * speed * 1.9;
    player.stepAcc += speed * dt;
    if (player.stepAcc > 2.3) { player.stepAcc = 0; Sfx.crunch(); }
  }

  // 카메라
  const bobY = (moving && player.grounded) ? Math.sin(player.bobT) * 0.024 : 0;
  const bobX = (moving && player.grounded) ? Math.cos(player.bobT * 0.5) * 0.011 : 0;
  camera.position.set(
    player.pos.x + bobX + rand(-camShake, camShake),
    player.pos.y + 1.68 + bobY + rand(-camShake, camShake),
    player.pos.z
  );
  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch + recoilPitch;
  camShake = Math.max(0, camShake - dt * 0.4);

  // 질주 시 시야 확장
  const targetFov = sprinting && moving ? 76 : 70;
  camera.fov += (targetFov - camera.fov) * dt * 7;
  camera.updateProjectionMatrix();
}

function damagePlayer(amount) {
  if (!player.alive || state.phase === 'won') return;
  if (player.hurtCd > 0) return; // 피격 직후 잠깐은 다시 물리지 않는다
  player.hurtCd = 0.7;
  player.hp -= amount;
  camShake = 0.05;
  Sfx.hurt();
  const hf = $('hurtFlash');
  hf.style.opacity = 0.9;
  setTimeout(() => hf.style.opacity = 0, 130);
  if (player.hp <= 0) {
    player.hp = 0;
    player.alive = false;
    onDeath();
  }
}

// ============================================================
//  무기 — 조총 (화승총) + 환도
// ============================================================
const weapon = new THREE.Group();
const musketG = new THREE.Group();   // 슬롯 1 — 조총
weapon.add(musketG);
const gunMetal = new THREE.MeshStandardMaterial({ color: 0x3b3f47, roughness: 0.45, metalness: 0.8 });
const gunWood = new THREE.MeshStandardMaterial({ color: 0x4a3220, roughness: 0.85 });
const gunBrass = new THREE.MeshStandardMaterial({ color: 0x9a7b3a, roughness: 0.4, metalness: 0.9 });
{
  const metal = gunMetal, wood = gunWood, brass = gunBrass;

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.027, 1.02, 10), metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.025, -0.52);
  musketG.add(barrel);

  const muzzleRing = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 10), brass);
  muzzleRing.rotation.x = Math.PI / 2;
  muzzleRing.position.set(0, 0.025, -1.02);
  musketG.add(muzzleRing);

  const fore = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.07, 0.78), wood);
  fore.position.set(0, -0.02, -0.42);
  musketG.add(fore);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.11, 0.42), wood);
  stock.position.set(0, -0.045, 0.12);
  stock.rotation.x = 0.16;
  musketG.add(stock);

  // 용두(서펜틴) — 화승 무는 S자 쇠
  const serp = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.09, 0.03), metal);
  serp.position.set(0.035, 0.06, -0.05);
  serp.rotation.z = -0.4;
  musketG.add(serp);

  const pan = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.02, 0.05), brass);
  pan.position.set(0.035, 0.03, -0.09);
  musketG.add(pan);
}
// 화승 불씨 (은은히 맥동하는 주황 점)
const emberSpr = new THREE.Sprite(new THREE.SpriteMaterial({
  color: 0xff6a20, transparent: true, opacity: 0.9, fog: false, depthTest: false, map: glowTex,
}));
emberSpr.position.set(0.035, 0.105, -0.05);
emberSpr.scale.setScalar(0.02);
musketG.add(emberSpr);

// 슬롯 2 — 삼안총 (三眼銃): 세 총열 속사 화기
const samganG = new THREE.Group();
{
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.023, 0.028, 0.5, 8), gunMetal);
    b.rotation.x = Math.PI / 2;
    b.position.set(Math.cos(a) * 0.037, 0.02 + Math.sin(a) * 0.037, -0.42);
    samganG.add(b);
  }
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 10), gunBrass);
  band.rotation.x = Math.PI / 2;
  band.position.set(0, 0.02, -0.22);
  samganG.add(band);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.026, 0.65, 8), gunWood);
  pole.rotation.x = Math.PI / 2 - 0.1;
  pole.position.set(0, -0.015, 0.12);
  samganG.add(pole);
}
samganG.visible = false;
weapon.add(samganG);

// 슬롯 3 — 비격진천뢰 (飛擊震天雷): 손에 든 무쇠 폭탄
const bombG = new THREE.Group();
const bombSpark = new THREE.Sprite(new THREE.SpriteMaterial({
  color: 0xffa030, transparent: true, opacity: 0.95, fog: false, depthTest: false, map: glowTex,
}));
const bombIron = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.6, metalness: 0.5 });
{
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), bombIron);
  ball.position.set(0, -0.06, -0.12);
  bombG.add(ball);
  const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.09, 6), gunWood);
  fuse.position.set(0, 0.06, -0.12);
  bombG.add(fuse);
  bombSpark.position.set(0, 0.12, -0.12);
  bombSpark.scale.setScalar(0.05);
  bombG.add(bombSpark);
}
bombG.visible = false;
weapon.add(bombG);

const WEAPON_IDLE = { pos: new THREE.Vector3(0.27, -0.26, -0.42), rot: new THREE.Euler(0, 0.03, 0) };
weapon.position.copy(WEAPON_IDLE.pos);
camera.add(weapon);

// 총구 화염광
const muzzleLight = new THREE.PointLight(0xffa640, 0, 14, 1.8);
scene.add(muzzleLight);
const muzzleFlashSpr = new THREE.Sprite(new THREE.SpriteMaterial({
  color: 0xffd080, transparent: true, opacity: 0, fog: false, depthWrite: false, map: glowTex,
}));
muzzleFlashSpr.scale.setScalar(0.9);
scene.add(muzzleFlashSpr);

const gun = {
  reserve: 40,
  misfireT: 0, fireCd: 0,
};
const arsenal = {
  current: 1,        // 1 조총 · 2 삼안총 · 3 비격진천뢰
  hasSamgan: false,
  bombs: 0,
};

function switchWeapon(n) {
  if (n === 2 && !arsenal.hasSamgan) return;
  if (n === 3 && arsenal.bombs <= 0) return;
  if (n === arsenal.current) return;
  arsenal.current = n;
  musketG.visible = n === 1;
  samganG.visible = n === 2;
  bombG.visible = n === 3;
  Sfx.click(0.3);
}

// 환도 뷰모델 — 평소엔 숨겨져 있다가 휘두를 때 나타난다
const sword = new THREE.Group();
{
  const steel = new THREE.MeshStandardMaterial({
    color: 0xc8cdd4, roughness: 0.3, metalness: 0.5,
    emissive: 0x30363f, emissiveIntensity: 0.7, // 밤에도 칼날이 달빛에 번득이도록
  });
  const grip = new THREE.MeshStandardMaterial({ color: 0x2e2320, roughness: 0.9 });
  const brassS = new THREE.MeshStandardMaterial({ color: 0x9a7b3a, roughness: 0.4, metalness: 0.9 });

  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.22, 8), grip);
  handle.position.y = -0.12;
  sword.add(handle);
  const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.015, 12), brassS);
  sword.add(guard);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.6, 0.048), steel);
  blade.position.y = 0.31;
  blade.rotation.x = 0.06; // 환도의 완만한 곡률 흉내
  sword.add(blade);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.1, 4), steel);
  tip.position.y = 0.65;
  sword.add(tip);
}
sword.visible = false;
camera.add(sword);

const swordState = { cd: 0, animT: -1 };
let recoilPitch = 0, recoilBack = 0;

// 이펙트 풀
const effects = [];  // {update(dt)->bool alive}

function spawnMuzzleEffects() {
  const muzzleWorld = weapon.localToWorld(new THREE.Vector3(0, 0.025, -1.08));
  muzzleLight.position.copy(muzzleWorld);
  muzzleLight.intensity = 90;
  muzzleFlashSpr.position.copy(muzzleWorld);
  muzzleFlashSpr.material.opacity = 1;
  let t = 0;
  effects.push({
    update(dt) {
      t += dt;
      muzzleLight.intensity = Math.max(0, 90 * (1 - t / 0.09));
      muzzleFlashSpr.material.opacity = Math.max(0, 1 - t / 0.07);
      return t < 0.1;
    }
  });
  // 흑색화약 연기
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      color: 0x9aa0a8, transparent: true, opacity: 0.42, depthWrite: false, map: glowTex,
    }));
    s.position.copy(muzzleWorld).add(new THREE.Vector3(rand(-0.1, 0.1), rand(-0.05, 0.1), rand(-0.1, 0.1)));
    const dir = camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(rand(0.4, 1.2));
    dir.y += rand(0.3, 0.8);
    s.scale.setScalar(rand(0.25, 0.5));
    scene.add(s);
    let life = 0;
    const dur = rand(1.0, 1.8);
    effects.push({
      update(dt) {
        life += dt;
        s.position.addScaledVector(dir, dt);
        dir.multiplyScalar(1 - dt * 1.5);
        s.scale.multiplyScalar(1 + dt * 1.4);
        s.material.opacity = 0.42 * (1 - life / dur);
        if (life >= dur) { scene.remove(s); s.material.dispose(); return false; }
        return true;
      }
    });
  }
}

function spawnBlood(point) {
  for (let i = 0; i < 9; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      color: 0x8a1010, transparent: true, opacity: 0.95, depthWrite: false, map: glowTex,
    }));
    s.position.copy(point);
    s.scale.setScalar(rand(0.06, 0.17));
    scene.add(s);
    const v = new THREE.Vector3(rand(-1.8, 1.8), rand(0.5, 2.6), rand(-1.8, 1.8));
    let life = 0;
    effects.push({
      update(dt) {
        life += dt;
        v.y -= 8 * dt;
        s.position.addScaledVector(v, dt);
        s.material.opacity = 0.95 * (1 - life / 0.55);
        if (life >= 0.55 || s.position.y < 0.02) { scene.remove(s); s.material.dispose(); return false; }
        return true;
      }
    });
  }
}

const raycaster = new THREE.Raycaster();
raycaster.far = 70;

function fireGun() {
  if (gun.fireCd > 0 || gun.misfireT > 0 || !player.alive) return;
  if (gun.reserve <= 0) {
    Sfx.click(0.35);
    return;
  }
  // 조총: 한 방이 무겁다 · 삼안총: 빠르지만 약하고 흩어진다
  const p = arsenal.current === 2
    ? { cd: 0.16, dmg: 55, headDmg: 160, spread: 0.022, recoil: 0.02, kick: 0.07, misfire: 0 }
    : { cd: 0.35, dmg: 140, headDmg: 9999, spread: 0.008, recoil: 0.045, kick: 0.13, misfire: 0.06 };
  gun.fireCd = p.cd;

  // 불발 — 눈보라에 화승이 젖는다
  if (Math.random() < p.misfire) {
    gun.misfireT = 0.9;
    Sfx.click(0.5);
    showReloadText('불발! 화승 불씨를 되살린다…');
    return;
  }

  gun.reserve--;
  Sfx.gunshot();
  spawnMuzzleEffects();
  recoilPitch += p.recoil;
  recoilBack = p.kick;
  camShake = 0.03;

  // 탄도: 화승총 특유의 산탄도(彈道) 흔들림
  const dir = camera.getWorldDirection(new THREE.Vector3());
  dir.x += rand(-p.spread, p.spread);
  dir.y += rand(-p.spread, p.spread);
  dir.normalize();
  raycaster.set(camera.getWorldPosition(new THREE.Vector3()), dir);
  const hits = raycaster.intersectObjects(shootables, false);
  if (hits.length > 0) {
    const h = hits[0];
    const z = h.object.userData.zombie;
    if (z && !z.dead) {
      spawnBlood(h.point);
      Sfx.flesh();
      const dmg = h.object.userData.isHead ? p.headDmg : p.dmg;
      hitZombie(z, dmg, dir, h.object.userData.isHead);
    } else {
      // 벽·기물 명중 — 눈/파편 튐
      spawnBlood(h.point); // 재활용: 어두운 파편
    }
  }
  // 총성에 놈들이 몰려든다
  aggroAll();
}

function throwBomb() {
  if (gun.fireCd > 0 || arsenal.bombs <= 0 || !player.alive) return;
  gun.fireCd = 0.8;
  arsenal.bombs--;
  Sfx.swing();

  const dir = camera.getWorldDirection(new THREE.Vector3());
  const vel = dir.clone().multiplyScalar(12);
  vel.y += 3.5;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), bombIron);
  ball.castShadow = true;
  ball.position.copy(camera.getWorldPosition(new THREE.Vector3())).addScaledVector(dir, 0.6);
  const spark = new THREE.Sprite(new THREE.SpriteMaterial({
    color: 0xffa030, transparent: true, fog: false, map: glowTex,
  }));
  spark.scale.setScalar(0.16);
  spark.position.y = 0.15;
  ball.add(spark);
  scene.add(ball);

  let fuse = 2.0;
  effects.push({
    update(dt) {
      fuse -= dt;
      vel.y -= 13 * dt;
      ball.position.addScaledVector(vel, dt);
      // 바닥 튕김
      if (ball.position.y <= 0.13) {
        ball.position.y = 0.13;
        vel.y *= -0.35;
        vel.x *= 0.6;
        vel.z *= 0.6;
      }
      // 벽에 맞거나 심지가 다 타면 폭발
      const inWall = colliders.some(c =>
        ball.position.x > c.minX && ball.position.x < c.maxX &&
        ball.position.z > c.minZ && ball.position.z < c.maxZ && ball.position.y < 3.2);
      if (fuse <= 0 || inWall) {
        explode(ball.position.clone());
        scene.remove(ball);
        return false;
      }
      return true;
    }
  });
  if (arsenal.bombs <= 0) switchWeapon(1);
}

function explode(pos) {
  Sfx.explosion();
  camShake = 0.07;
  // 섬광과 연기
  const l = new THREE.PointLight(0xffa030, 0, 20, 1.5);
  l.position.copy(pos).y += 0.6;
  scene.add(l);
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({
    color: 0xffc060, transparent: true, opacity: 1, fog: false, depthWrite: false, map: glowTex,
  }));
  flash.position.copy(pos).y += 0.5;
  flash.scale.setScalar(1.5);
  scene.add(flash);
  let ft = 0;
  effects.push({
    update(dt) {
      ft += dt;
      l.intensity = Math.max(0, 160 * (1 - ft / 0.25));
      flash.scale.setScalar(1.5 + ft * 22);
      flash.material.opacity = Math.max(0, 1 - ft / 0.3);
      if (ft >= 0.35) {
        scene.remove(l); scene.remove(flash); flash.material.dispose();
        return false;
      }
      return true;
    }
  });
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      color: 0x6a6d72, transparent: true, opacity: 0.5, depthWrite: false, map: glowTex,
    }));
    s.position.copy(pos).add(new THREE.Vector3(rand(-0.6, 0.6), rand(0.2, 1), rand(-0.6, 0.6)));
    s.scale.setScalar(rand(0.6, 1.2));
    scene.add(s);
    const sv = new THREE.Vector3(rand(-1.2, 1.2), rand(1, 2.5), rand(-1.2, 1.2));
    let life = 0;
    const dur = rand(1.2, 2);
    effects.push({
      update(dt) {
        life += dt;
        s.position.addScaledVector(sv, dt);
        sv.multiplyScalar(1 - dt * 1.2);
        s.scale.multiplyScalar(1 + dt * 1.1);
        s.material.opacity = 0.5 * (1 - life / dur);
        if (life >= dur) { scene.remove(s); s.material.dispose(); return false; }
        return true;
      }
    });
  }
  // 폭발 피해 — 생사역
  for (const z of zombies) {
    if (z.dead) continue;
    const dd = z.group.position.distanceTo(pos);
    if (dd < 5.5) {
      const kdir = z.group.position.clone().sub(pos).setY(0).normalize();
      spawnBlood(z.group.position.clone().setY(1.2));
      hitZombie(z, dd < 3 ? 300 : 150, kdir, false);
    }
  }
  // 너무 가까우면 서리도 다친다 (망루 위처럼 높이 차가 있으면 덜 위험하다)
  const pd = Math.hypot(player.pos.x - pos.x, player.pos.y - pos.y, player.pos.z - pos.z);
  if (pd < 3.5) damagePlayer(Math.round(10 + 30 * (1 - pd / 3.5)));
  aggroAll();
}

function swingSword() {
  if (swordState.cd > 0) return;
  swordState.cd = 0.55;
  swordState.animT = 0;
  Sfx.swing();
  const fwd = camera.getWorldDirection(new THREE.Vector3());
  fwd.y = 0; fwd.normalize();
  let hitAny = false;
  for (const z of zombies) {
    if (z.dead) continue;
    const dx = z.group.position.x - player.pos.x;
    const dz = z.group.position.z - player.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 2.4) continue;
    const dot = (dx * fwd.x + dz * fwd.z) / (dist || 1);
    if (dot < 0.45) continue;
    hitAny = true;
    spawnBlood(z.group.position.clone().setY(1.3));
    hitZombie(z, 50, fwd, false);
    // 밀쳐내기
    z.group.position.x += fwd.x * 0.7;
    z.group.position.z += fwd.z * 0.7;
  }
  if (hitAny) Sfx.flesh();
}

addEventListener('mousedown', e => {
  if (document.pointerLockElement !== canvas) return;
  if (e.button === 0) arsenal.current === 3 ? throwBomb() : fireGun();
  if (e.button === 2) swingSword();
});
addEventListener('contextmenu', e => e.preventDefault());

function updateWeapon(dt) {
  gun.fireCd = Math.max(0, gun.fireCd - dt);
  swordState.cd = Math.max(0, swordState.cd - dt);

  if (gun.misfireT > 0) {
    gun.misfireT -= dt;
    if (gun.misfireT <= 0) hideReloadUI();
  }

  // 반동 복귀
  recoilPitch = Math.max(0, recoilPitch - dt * 0.22);
  recoilBack = Math.max(0, recoilBack - dt * 0.6);

  // 뷰모델 포즈 보간
  weapon.position.lerp(WEAPON_IDLE.pos, dt * 9);
  weapon.position.z += recoilBack;
  weapon.rotation.x += (WEAPON_IDLE.rot.x + recoilBack * 1.6 - weapon.rotation.x) * dt * 9;
  weapon.rotation.y += (WEAPON_IDLE.rot.y - weapon.rotation.y) * dt * 9;
  weapon.rotation.z += (WEAPON_IDLE.rot.z - weapon.rotation.z) * dt * 9;

  // 걷기 요동
  weapon.position.y += Math.sin(player.bobT) * 0.006;
  weapon.position.x += Math.cos(player.bobT * 0.5) * 0.004;

  // 환도 휘두르기 — 오른쪽에서 왼쪽으로 베어내는 궤적
  if (swordState.animT >= 0) {
    swordState.animT += dt;
    const k = swordState.animT / 0.28;
    if (k < 1) {
      sword.visible = true;
      const e = Math.sin(k * Math.PI * 0.5); // ease-out
      sword.position.set(0.35 - e * 0.8, -0.25 + Math.sin(k * Math.PI) * 0.05, -0.5);
      sword.rotation.set(-0.4 + k * 0.15, e * 0.5, -0.6 + e * 1.3);
      camera.rotation.z = Math.sin(k * Math.PI) * -0.05;
    } else {
      sword.visible = false;
      camera.rotation.z = 0;
      swordState.animT = -1;
    }
  }

  // 화승 불씨·심지 불꽃 맥동
  const pulse = 0.014 + Math.sin(performance.now() * 0.006) * 0.006 + rand(0, 0.004);
  emberSpr.scale.setScalar(pulse);
  bombSpark.scale.setScalar(pulse * 3.2);
}

// ============================================================
//  파밍 — 바닥에 떨어진 물자 (E키로 줍기)
// ============================================================
const PICKUP_DEFS = {
  ammo:   { name: '탄환 꾸러미', color: 0xf0d9a8 },
  heal:   { name: '약초 붕대', color: 0x7fc470 },
  samgan: { name: '삼안총 (三眼銃)', color: 0x6fa8ff },
  bomb:   { name: '비격진천뢰', color: 0xff8040 },
};
const pickups = []; // {type, grp, t}

function spawnPickup(type, x, z) {
  const def = PICKUP_DEFS[type];
  const grp = new THREE.Group();
  let mesh;
  if (type === 'ammo') {
    mesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x5a4228, roughness: 0.9 }));
  } else if (type === 'heal') {
    mesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x4e6b42, roughness: 0.9 }));
  } else if (type === 'samgan') {
    mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.7, 8), gunMetal);
    mesh.rotation.z = Math.PI / 2 - 0.15;
  } else {
    mesh = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), bombIron);
  }
  mesh.castShadow = true;
  grp.add(mesh);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    color: def.color, transparent: true, opacity: 0.4, fog: false, depthWrite: false, map: glowTex,
  }));
  glow.scale.setScalar(0.85);
  glow.position.y = 0.1;
  grp.add(glow);
  grp.position.set(x, 0.28, z);
  scene.add(grp);
  pickups.push({ type, grp, t: rand(0, 10) });
}

function scatterLoot() {
  // 삼안총은 반드시 집 안 어딘가에 — 뒤져 볼 가치를 만든다
  const houseSpots = lootSpots.filter(s => s.inHouse).sort(() => Math.random() - 0.5);
  const outSpots = lootSpots.filter(s => !s.inHouse).sort(() => Math.random() - 0.5);
  spawnPickup('samgan', houseSpots[0].x, houseSpots[0].z);
  const rest = [...houseSpots.slice(1), ...outSpots].sort(() => Math.random() - 0.5);
  ['bomb', 'bomb', 'ammo', 'ammo', 'heal', 'ammo', 'heal'].forEach((d, i) => {
    if (rest[i]) spawnPickup(d, rest[i].x, rest[i].z);
  });
}

function spawnWaveLoot() {
  const pool = ['ammo', 'bomb', 'heal', 'ammo', 'bomb'];
  const spots = [...lootSpots].sort(() => Math.random() - 0.5);
  let placed = 0;
  for (const s of spots) {
    if (placed >= 3) break;
    if (pickups.some(p => Math.hypot(p.grp.position.x - s.x, p.grp.position.z - s.z) < 1)) continue;
    spawnPickup(pool[Math.floor(Math.random() * pool.length)], s.x, s.z);
    placed++;
  }
}

let toastT = 0;
function toast(text) {
  const el = $('pickupHint');
  el.innerText = text;
  el.style.display = 'block';
  toastT = 2.2;
}

function nearestPickup(maxDist) {
  let best = null, bd = maxDist;
  for (const p of pickups) {
    const dd = Math.hypot(p.grp.position.x - player.pos.x, p.grp.position.z - player.pos.z);
    if (dd < bd) { bd = dd; best = p; }
  }
  return best;
}

function tryPickup() {
  if (!player.alive) return;
  const p = nearestPickup(1.9);
  if (!p) return;
  switch (p.type) {
    case 'ammo':
      gun.reserve += 15;
      toast('탄환 꾸러미 — 탄환 +15');
      break;
    case 'heal':
      player.hp = Math.min(100, player.hp + 30);
      toast('약초 붕대 — 체력 +30');
      break;
    case 'samgan':
      if (arsenal.hasSamgan) { gun.reserve += 8; toast('삼안총은 이미 있다 — 탄환 +8'); }
      else {
        arsenal.hasSamgan = true;
        toast('삼안총 획득! 삼연발 속사 — [2]로 전환');
        switchWeapon(2);
      }
      break;
    case 'bomb':
      arsenal.bombs++;
      toast(`비격진천뢰 +1 (보유 ${arsenal.bombs}) — [3]으로 전환`);
      break;
  }
  scene.remove(p.grp);
  pickups.splice(pickups.indexOf(p), 1);
  Sfx.pickup();
}

function updatePickups(dt) {
  for (const p of pickups) {
    p.t += dt;
    p.grp.position.y = 0.28 + Math.sin(p.t * 2.2) * 0.07;
    p.grp.rotation.y += dt * 1.2;
  }
  // 근처 아이템 안내 (토스트가 떠 있으면 그쪽 우선)
  const el = $('pickupHint');
  if (toastT > 0) {
    toastT -= dt;
    if (toastT <= 0) el.style.display = 'none';
    return;
  }
  const near = nearestPickup(1.9);
  if (near) {
    el.innerText = `E — ${PICKUP_DEFS[near.type].name} 줍기`;
    el.style.display = 'block';
  } else {
    el.style.display = 'none';
  }
}

// ============================================================
//  생사역 (좀비)
// ============================================================
const zombies = [];
const GAPS = [
  { entry: new THREE.Vector3(0, 0, -27), spawn: () => new THREE.Vector3(rand(-8, 8), 0, -30 - rand(8, 26)) },
  { entry: new THREE.Vector3(27, 0, 8.5), spawn: () => new THREE.Vector3(30 + rand(8, 26), 0, 8.5 + rand(-4, 4)) },
  { entry: new THREE.Vector3(-27, 0, -8.5), spawn: () => new THREE.Vector3(-30 - rand(8, 26), 0, -8.5 + rand(-4, 4)) },
];

const zClothBase = new THREE.MeshStandardMaterial({ color: 0xa89a82, roughness: 1 });
const zSkinBase = new THREE.MeshStandardMaterial({ color: 0xb7bfae, roughness: 0.9 });
const zDarkBase = new THREE.MeshStandardMaterial({ color: 0x1c1a17, roughness: 1 });
const CHIMA_COLORS = [0x6f7d88, 0x8d6f6f, 0x7a6f88, 0x8f8062]; // 물 빠진 옥색·분홍·보라·황토

function createZombie(cfg) {
  const g = new THREE.Group();
  g.rotation.order = 'YXZ';
  // 마을 사람들이었던 것들 — 남정네 / 아낙 / 갓 쓴 양반
  const roll = Math.random();
  const variant = roll < 0.16 ? 'yangban' : roll < 0.55 ? 'woman' : 'man';

  const cloth = zClothBase.clone();
  cloth.color.offsetHSL(rand(-0.02, 0.04), rand(0, 0.12), rand(-0.2, 0.05));
  const skin = zSkinBase.clone();
  skin.color.offsetHSL(rand(-0.04, 0.02), rand(-0.05, 0.05), rand(-0.12, 0.04));
  const dark = zDarkBase.clone();
  const white = new THREE.MeshStandardMaterial({ color: 0xd8d1bf, roughness: 1 });
  const accent = new THREE.MeshStandardMaterial({
    color: variant === 'yangban' ? 0x4e5a68 : CHIMA_COLORS[Math.floor(Math.random() * CHIMA_COLORS.length)],
    roughness: 1,
  });
  const gore = new THREE.MeshStandardMaterial({ color: 0x4a0f0f, roughness: 1 });
  const mats = [cloth, skin, dark, white, accent, gore];

  const meshes = [];
  // 그림자는 몸통·머리·치마·도포만 — 물량전에서 그림자 패스가 프레임을 잡아먹지 않게
  const mk = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    meshes.push(m);
    return m;
  };

  // ── 저고리
  const jeogori = variant === 'yangban' ? accent : cloth;
  const torso = mk(new THREE.BoxGeometry(0.4, 0.5, 0.23), jeogori, 0, 1.22, 0);
  torso.castShadow = true;
  g.add(torso);
  // 동정(깃) — 가슴에 V자로 여민 흰 띠
  [[-0.065, -0.42], [0.065, 0.42]].forEach(c => {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.3, 0.016), white);
    col.position.set(c[0], 0.06, 0.115);
    col.rotation.z = c[1];
    torso.add(col);
  });
  // 옷고름
  const goreum = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.012), white);
  goreum.position.set(0.05, -0.12, 0.12);
  goreum.rotation.z = 0.12;
  torso.add(goreum);
  // 옷에 밴 핏자국
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(rand(0.05, 0.13), rand(0.05, 0.14), 0.012), gore);
    b.position.set(rand(-0.13, 0.13), rand(-0.17, 0.17), 0.118);
    b.rotation.z = rand(-0.6, 0.6);
    torso.add(b);
  }

  // ── 머리 — 야윈 얼굴
  const head = mk(new THREE.SphereGeometry(0.145, 12, 10), skin, 0, 1.63, 0);
  head.scale.set(0.95, 1.12, 0.95);
  head.userData.isHead = true;
  head.castShadow = true;
  g.add(head);
  // 탁하게 흐린 검은 눈
  [-0.055, 0.055].forEach(dx => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 5), dark);
    eye.position.set(dx, 0.025, 0.12);
    head.add(eye);
  });
  // 입가로 흘러내린 검은 피
  const mBlood = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.09, 0.012), gore);
  mBlood.position.set(0.02, -0.085, 0.115);
  mBlood.rotation.z = 0.2;
  head.add(mBlood);
  // 머리채
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.152, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), dark);
  hairCap.position.y = 0.015;
  head.add(hairCap);
  if (variant === 'man') {
    const sangtu = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.036, 0.09, 8), dark);
    sangtu.position.y = 0.19;
    head.add(sangtu);
  } else if (variant === 'woman') {
    const jjok = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), dark); // 쪽진 머리
    jjok.position.set(0, -0.03, -0.13);
    head.add(jjok);
  } else {
    // 갓 — 양반의 것이었다
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.014, 14), dark);
    brim.position.y = 0.12;
    head.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.11, 0.17, 10), dark);
    crown.position.y = 0.21;
    head.add(crown);
  }

  // ── 팔 — 해진 소매와 맨손
  const mkArm = sx => {
    const arm = new THREE.Group();
    arm.position.set(sx * 0.26, 1.42, 0);
    arm.add(mk(new THREE.CylinderGeometry(0.052, 0.07, 0.44, 8), jeogori, 0, -0.22, 0));
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), skin);
    hand.position.y = -0.47;
    arm.add(hand);
    g.add(arm);
    return arm;
  };
  const armL = mkArm(-1), armR = mkArm(1);

  // ── 하체
  let skirt = null, legL, legR;
  if (variant === 'woman') {
    // 치마 — 낡은 치맛자락이 걸음마다 쓸린다
    skirt = mk(new THREE.CylinderGeometry(0.17, 0.33, 0.8, 10), accent, 0, 0.6, 0);
    skirt.castShadow = true;
    g.add(skirt);
    legL = new THREE.Group(); legL.position.set(-0.08, 0.3, 0);
    legR = new THREE.Group(); legR.position.set(0.08, 0.3, 0);
    [legL, legR].forEach(l => {
      const beoseon = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.16), white); // 버선발
      beoseon.position.set(0, -0.24, 0.03);
      l.add(beoseon);
      g.add(l);
    });
  } else {
    const mkLeg = sx => {
      const l = new THREE.Group();
      l.position.set(sx * 0.11, 0.88, 0);
      l.add(mk(new THREE.CylinderGeometry(0.06, 0.075, 0.72, 8), white, 0, -0.36, 0)); // 바지
      const jipsin = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.05, 0.17), dark); // 짚신
      jipsin.position.set(0, -0.75, 0.03);
      l.add(jipsin);
      g.add(l);
      return l;
    };
    legL = mkLeg(-1); legR = mkLeg(1);
    if (variant === 'yangban') {
      // 도포 자락
      const robe = mk(new THREE.CylinderGeometry(0.22, 0.31, 0.55, 10), accent, 0, 0.85, 0);
      robe.castShadow = true;
      g.add(robe);
    }
  }

  const gap = GAPS[Math.floor(Math.random() * GAPS.length)];
  g.position.copy(gap.spawn());

  const z = {
    group: g, head, armL, armR, legL, legR, skirt,
    mats, meshes,
    hp: cfg.hp, speed: cfg.speed * rand(0.85, 1.18), dmg: cfg.dmg,
    mode: 'gap', gapEntry: gap.entry, groundY: 0,
    animT: rand(0, 10), twitchT: 0, attackCd: rand(0.2, 0.8), attackAnimT: -1,
    stunT: 0, growlT: rand(1, 6),
    dead: false, deathT: 0, fallDir: Math.random() < 0.5 ? 1 : -1,
    aggro: false,
  };
  meshes.forEach(m => { m.userData.zombie = z; if (m === head) m.userData.isHead = true; });
  shootables.push(...meshes);
  scene.add(g);
  zombies.push(z);
  return z;
}

function hitZombie(z, dmg, dir, headshot) {
  z.hp -= dmg;
  z.aggro = true;
  if (z.hp <= 0) {
    z.dead = true;
    z.deathT = 0;
    state.kills++;
    // 사격 대상에서 제거
    for (const m of z.meshes) {
      const i = shootables.indexOf(m);
      if (i >= 0) shootables.splice(i, 1);
    }
    if (headshot) Sfx.growl(0.5);
  } else {
    z.stunT = 0.35;
    z.group.position.addScaledVector(dir, 0.4);
    Sfx.growl(0.3);
  }
}

function aggroAll() {
  for (const z of zombies) if (!z.dead) z.aggro = true;
}

function houseContaining(p) {
  for (const h of houses) {
    if (p.x > h.minX && p.x < h.maxX && p.z > h.minZ && p.z < h.maxZ) return h;
  }
  return null;
}

function updateZombies(dt) {
  const inWalls = p => Math.abs(p.x) < 29 && Math.abs(p.z) < 29;
  const playerHouse = houseContaining(player.pos);
  const playerTower = towers.find(t =>
    player.pos.x > t.minX && player.pos.x < t.maxX &&
    player.pos.z > t.minZ && player.pos.z < t.maxZ && player.pos.y > t.y - 0.6) || null;

  for (let i = zombies.length - 1; i >= 0; i--) {
    const z = zombies[i];
    const g = z.group;

    // ---- 사망 연출: 쓰러진 뒤 사라짐
    if (z.dead) {
      z.deathT += dt;
      if (z.deathT < 0.45) {
        const k = z.deathT / 0.45;
        g.rotation.x = 0.2 + z.fallDir * k * 1.4;
      } else if (z.deathT > 5) {
        const fade = 1 - (z.deathT - 5) / 1.2;
        z.mats.forEach(m => { m.transparent = true; m.opacity = Math.max(0, fade); });
        if (fade <= 0) {
          scene.remove(g);
          z.mats.forEach(m => m.dispose());
          zombies.splice(i, 1);
        }
      }
      continue;
    }

    if (z.stunT > 0) { z.stunT -= dt; continue; }

    // ---- 경로: 성벽 밖이면 개구부로, 안이면 플레이어에게
    // (플레이어도 성 밖에 있으면 개구부를 거치지 않고 곧장 덮친다)
    let target;
    if (z.mode === 'gap' && !inWalls(g.position) && inWalls(player.pos)) {
      target = z.gapEntry;
      if (g.position.distanceTo(z.gapEntry) < 3) z.mode = 'chase';
    } else {
      z.mode = 'chase';
      target = player.pos;
      // 플레이어가 집 안에 숨었으면 문을 찾아 돌아 들어온다
      if (playerHouse && houseContaining(g.position) !== playerHouse) {
        const dDoor = Math.hypot(playerHouse.door.x - g.position.x, playerHouse.door.z - g.position.z);
        target = dDoor < 1.6 ? playerHouse.inside : playerHouse.door;
      }
      // 플레이어가 망루 위면 놈들도 계단을 찾아 기어오른다
      // (이미 오르는 중이면 계속 꼭대기로 — 초입/꼭대기 목표가 진동하지 않게)
      if (playerTower && z.groundY < playerTower.y - 0.5) {
        const dStair = Math.hypot(playerTower.stair.x - g.position.x, playerTower.stair.z - g.position.z);
        target = (dStair < 1.1 || z.groundY > 0.15) ? playerTower.top : playerTower.stair;
      }
    }

    const dx = target.x - g.position.x;
    const dz = target.z - g.position.z;
    const dist = Math.hypot(dx, dz);
    const distToPlayer = Math.hypot(player.pos.x - g.position.x, player.pos.z - g.position.z);

    // 이동 — 총성을 들은 놈들은 성벽 밖에서 내달린다 (경유점으로 갈 땐 멈추지 않는다)
    if ((dist > 1.15 || target !== player.pos) && player.alive) {
      const spd = z.speed * (z.aggro && z.mode === 'gap' ? 1.3 : 1);
      g.position.x += dx / dist * spd * dt;
      g.position.z += dz / dist * spd * dt;
      resolveCollisions(g.position, 0.35);
    }

    // 좀비끼리 밀어내기
    for (let j = 0; j < zombies.length; j++) {
      if (j === i || zombies[j].dead) continue;
      const o = zombies[j].group.position;
      const sx = g.position.x - o.x, sz = g.position.z - o.z;
      const sd = Math.hypot(sx, sz);
      if (sd < 0.7 && sd > 0.001) {
        g.position.x += sx / sd * (0.7 - sd) * 0.5;
        g.position.z += sz / sd * (0.7 - sd) * 0.5;
      }
    }

    // 방향
    g.rotation.y = Math.atan2(dx, dz);
    g.rotation.x = 0.2; // 앞으로 쏠린 질주 자세

    // ---- 킹덤식 경련 애니메이션
    z.animT += dt * z.speed * 2.4;
    const swing = Math.sin(z.animT);
    z.legL.rotation.x = swing * 0.95;
    z.legR.rotation.x = -swing * 0.95;
    z.armL.rotation.x = -1.1 + Math.sin(z.animT * 1.6 + 1.3) * 0.75;
    z.armR.rotation.x = -1.1 + Math.sin(z.animT * 1.7) * 0.75;
    z.armL.rotation.z = 0.35 + Math.sin(z.animT * 2.1) * 0.25;
    z.armR.rotation.z = -0.35 - Math.sin(z.animT * 1.9) * 0.25;
    if (z.skirt) z.skirt.rotation.x = Math.sin(z.animT) * 0.12; // 치맛자락 쓸림

    // 발밑 높이 — 계단·마루를 따라 오르고, 떨어질 땐 고꾸라지듯 내려온다
    const zg = groundHeightAt(g.position.x, g.position.z, z.groundY);
    z.groundY = zg < z.groundY - 0.01 ? Math.max(zg, z.groundY - 10 * dt) : zg;
    g.position.y = z.groundY + Math.abs(Math.sin(z.animT)) * 0.06;

    z.twitchT -= dt;
    if (z.twitchT <= 0) {
      z.twitchT = rand(0.08, 0.3);
      z.head.rotation.set(rand(-0.35, 0.35), rand(-0.6, 0.6), rand(-0.4, 0.4));
    }

    // ---- 공격
    z.attackCd -= dt;
    if (z.attackAnimT >= 0) {
      z.attackAnimT += dt;
      const k = z.attackAnimT / 0.25;
      if (k < 1) {
        z.armL.rotation.x = -2.3 + k * 1.4;
        z.armR.rotation.x = -2.3 + k * 1.4;
      } else z.attackAnimT = -1;
    }
    if (distToPlayer < 1.45 && z.attackCd <= 0 && player.alive &&
        player.pos.y - g.position.y < 1.2 &&           // 망루 위까지는 손이 닿지 않는다
        houseContaining(g.position) === playerHouse) { // 벽 너머로는 못 때린다
      z.attackCd = 1.5;
      z.attackAnimT = 0;
      damagePlayer(z.dmg + rand(-2, 2));
    }

    // ---- 울음소리
    z.growlT -= dt;
    if (z.growlT <= 0) {
      z.growlT = rand(2.5, 7);
      if (distToPlayer < 32) Sfx.growl(clamp(0.5 * (1 - distToPlayer / 32), 0.03, 0.5));
    }
  }
}

// ============================================================
//  웨이브 / 스토리
// ============================================================
const WAVES = [
  { count: 10, hp: 90, speed: 2.2, dmg: 7 },
  { count: 16, hp: 100, speed: 2.5, dmg: 8 },
  { count: 22, hp: 110, speed: 2.8, dmg: 9 },
  { count: 28, hp: 122, speed: 3.1, dmg: 10 },
  { count: 36, hp: 135, speed: 3.5, dmg: 12 },
];

const INTERLUDES = [
  '눈 속에 반쯤 묻힌 짚신 한 짝. …단이 것이다.\n아직 이 마을 안에 있어.\n\n[ 상처를 싸매고 탄환을 그러모았다 — 탄환 +20 · 체력 회복 ]',
  '작은 발자국이 우물 쪽으로 이어지다 끊겼다.\n그 위를 놈들의 발자국이 어지럽게 덮었다.\n\n[ 탄환 +20 · 체력 회복 ]',
  '단이의 붉은 댕기가 우물가 기둥에 묶여 있다.\n영리한 것. 제 흔적을 남겼구나.\n\n[ 탄환 +20 · 체력 회복 ]',
  '우물 깊은 곳에서 희미한 울음소리가 들렸다.\n"단아! 조금만 버텨. 해가 뜰 때까지만—"\n\n[ 탄환 +20 · 체력 회복 ]',
];

const WIN_TEXT = `밤새 내리던 눈이 그치고, 성벽 너머로 동이 튼다.
생사역들은 겨울 해를 피해 어둠 속으로 스러졌다.

우물 바닥 — 두레박 줄을 꼭 붙든 채 떨고 있는 단이를 끌어올렸다.
"누나…"

서리는 조총을 눈밭에 내려놓고, 그 밤 처음으로 울었다.

— 雪寒, 끝 —`;

const state = {
  phase: 'title',   // title | interlude | banner | combat | dawn | won | dead
  wave: 0, kills: 0,
  t: 0,
  toSpawn: 0, spawnT: 0,
  dawnT: 0,
  heartbeatT: 0,
};

function setMsg(text, show) {
  const el = $('centerMsg');
  if (text !== undefined) el.innerText = text;
  el.style.opacity = show ? 1 : 0;
}

function setBanner(text, show) {
  const el = $('banner');
  if (text !== undefined) el.innerText = text;
  el.style.opacity = show ? 1 : 0;
}

function startWave(n) {
  state.wave = n;
  state.phase = 'banner';
  state.t = 0;
  const names = ['첫', '두', '세', '네', '다섯'];
  setBanner(`${names[n]} 번째 습격`, true);
  Sfx.bell();
}

function beginCombat() {
  state.phase = 'combat';
  state.t = 0;
  state.toSpawn = WAVES[state.wave].count;
  state.spawnT = 0;
  setBanner(undefined, false);
}

function endWave() {
  if (state.wave >= WAVES.length - 1) {
    state.phase = 'dawn';
    state.dawnT = 0;
    setMsg('…동이 튼다.', true);
    return;
  }
  state.phase = 'interlude';
  state.t = 0;
  player.hp = Math.min(100, player.hp + 45);
  gun.reserve += 20;
  spawnWaveLoot(); // 마을 어딘가에 물자가 떨어진다
  setMsg(INTERLUDES[state.wave], true);
}

function updateGame(dt) {
  switch (state.phase) {
    case 'banner':
      state.t += dt;
      if (state.t > 2.6) beginCombat();
      break;

    case 'combat': {
      // 순차 스폰
      if (state.toSpawn > 0) {
        state.spawnT -= dt;
        if (state.spawnT <= 0) {
          state.spawnT = rand(0.35, 0.75); // 물량전 — 쉴 틈 없이 밀려온다
          createZombie(WAVES[state.wave]);
          state.toSpawn--;
        }
      }
      const alive = zombies.filter(z => !z.dead).length;
      if (state.toSpawn === 0 && alive === 0) endWave();
      break;
    }

    case 'interlude':
      state.t += dt;
      if (state.t > 7) {
        setMsg(undefined, false);
        startWave(state.wave + 1);
      }
      break;

    case 'dawn': {
      state.dawnT += dt;
      const k = clamp(state.dawnT / 9, 0, 1);
      scene.fog.color.copy(NIGHT_FOG).lerp(DAWN_FOG, k);
      scene.background.copy(NIGHT_FOG).lerp(DAWN_FOG, k);
      dawnLight.intensity = k * 1.6;
      hemi.intensity = 0.55 + k * 0.5;
      moonLight.intensity = 0.85 * (1 - k);
      moonSpr.material.opacity = 0.95 * (1 - k);
      moonHalo.material.opacity = 0.18 * (1 - k);
      for (const m of mtnMats) m.mat.color.copy(m.night).lerp(m.dawn, k);
      if (state.dawnT > 9.5) onWin();
      break;
    }
  }

  // 저체력 심장박동
  if (player.alive && player.hp < 30) {
    state.heartbeatT -= dt;
    if (state.heartbeatT <= 0) {
      state.heartbeatT = 0.55 + player.hp / 30 * 0.6;
      Sfx.heartbeat();
    }
  }
}

// ============================================================
//  UI
// ============================================================
function showReloadText(text, progress) {
  $('reloadWrap').style.display = 'block';
  $('reloadText').innerText = text;
  $('reloadFill').style.width = `${clamp((progress ?? 0) * 100, 0, 100)}%`;
}
function hideReloadUI() {
  $('reloadWrap').style.display = 'none';
}

function updateHUD() {
  $('hpFill').style.width = `${player.hp}%`;
  $('stFill').style.width = `${player.stamina}%`;
  const gs = $('gunState');
  const wname = arsenal.current === 2 ? '삼안총' : '조총';
  if (arsenal.current === 3) { gs.innerText = `비격진천뢰 — ${arsenal.bombs}발`; gs.className = ''; }
  else if (gun.misfireT > 0) { gs.innerText = `${wname} — 불발 수습 중`; gs.className = 'empty'; }
  else if (gun.reserve > 0) { gs.innerText = `${wname} — 장전됨`; gs.className = ''; }
  else { gs.innerText = '탄환 없음 — 환도뿐'; gs.className = 'empty'; }
  const slots = [`[1] 조총`];
  if (arsenal.hasSamgan) slots.push('[2] 삼안총');
  if (arsenal.bombs > 0) slots.push(`[3] 진천뢰×${arsenal.bombs}`);
  $('ammoCount').innerText = `탄환 ${gun.reserve} · ${slots.join(' ')} · 환도 [우클릭]`;
  $('waveText').innerText = state.phase === 'dawn' ? '破曉' : `습격 ${state.wave + 1} / ${WAVES.length}`;
  $('killText').innerText = `처치한 생사역 ${state.kills}`;
  $('vignette').style.opacity = player.hp < 45 ? (1 - player.hp / 45) * 0.9 : 0;
}

// ============================================================
//  게임 흐름 (시작/사망/승리/일시정지)
// ============================================================
let started = false;

$('title').addEventListener('click', () => {
  Sfx.init();
  Sfx.ctx.resume();
  $('title').style.display = 'none';
  $('hud').style.display = 'block';
  started = true;
  lockPointer();
  scatterLoot();
  startWave(0);
});

function onDeath() {
  state.phase = 'dead';
  document.exitPointerLock();
  $('sh-revive').style.display = (!usedRevive && window.AFG) ? '' : 'none';
  $('deathScreen').style.display = 'flex';
}
$('deathScreen').addEventListener('click', () => {
  if (window.AFG) {
    window.AFG.interstitial({ name: 'seolhan_gameover', onAfterAd: () => location.reload() });
  } else {
    location.reload();
  }
});

function onWin() {
  if (state.phase === 'won') return;
  state.phase = 'won';
  document.exitPointerLock();
  $('winBody').innerText = WIN_TEXT;
  $('winScreen').style.display = 'flex';
  Sfx.bell();
}
$('winScreen').addEventListener('click', () => {
  if (window.AFG) {
    window.AFG.interstitial({ name: 'seolhan_gameover', onAfterAd: () => location.reload() });
  } else {
    location.reload();
  }
});

// ---- 광고 연동 (Tart Shop AFG) ----
let usedRevive = false;
function revive() { // 리워드 시청 완료 → 체력 50 + 주변 8m 생사역 정리 후 그 자리에서 재개
  player.hp = 50;
  player.alive = true;
  state.phase = 'combat';
  for (const z of zombies) {
    if (!z.dead && z.group.position.distanceTo(player.pos) < 8) {
      hitZombie(z, 9999, new THREE.Vector3(), false);
    }
  }
  $('deathScreen').style.display = 'none';
  lockPointer();
}
$('sh-revive').addEventListener('click', (e) => {
  e.stopPropagation(); // 오버레이 리트라이 클릭과 분리
  usedRevive = true;
  window.AFG.rewarded({
    name: 'seolhan_continue',
    onReward: revive,
    onDismiss: () => { usedRevive = false; },
  });
});

// 포인터 잠금이 풀리면 일시정지 (표시는 메인 루프에서 동기화)
function lockPointer() {
  try {
    const p = canvas.requestPointerLock();
    if (p && p.catch) p.catch(() => {});
  } catch (e) { /* 잠금 미지원 환경 */ }
}
$('pauseScreen').addEventListener('click', lockPointer);

// ============================================================
//  메인 루프
// ============================================================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  const paused = started && player.alive && state.phase !== 'won' &&
    document.pointerLockElement !== canvas;
  $('pauseScreen').style.display = paused ? 'flex' : 'none';

  // 횃불 흔들림 (항상)
  const now = performance.now() * 0.001;
  for (const t of torches) {
    const f = 0.75 + Math.sin(now * 9 + t.seed) * 0.15 + rand(-0.08, 0.08);
    t.light.intensity = (t.base ?? 14) * f;
    t.flame.scale.set((t.fw ?? 0.5) * (0.8 + f * 0.35), (t.fh ?? 0.8) * (0.8 + f * 0.35), 1);
  }

  if (started && !paused) {
    if (player.alive) updatePlayer(dt);
    updateWeapon(dt);
    updateZombies(dt);
    updatePickups(dt);
    updateGame(dt);
    updateHUD();
    for (let i = effects.length - 1; i >= 0; i--) {
      if (!effects[i].update(dt)) effects.splice(i, 1);
    }
  }
  updateSnow(paused ? 0.001 : dt, player.pos.x, player.pos.z);

  renderer.render(scene, camera);
}
animate();
