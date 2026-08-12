// ROOK STREET — 지하철역 웨이브 FPS (영상 재현 빌드, SPEC.md 참조)
import * as THREE from 'three';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- 상태 ----------
const game = {
  running: false, over: false,
  hp: 100, wave: 0, kills: 0, heads: 0, shots: 0, hits: 0,
  sens: 2.2, lightMul: 1,
  enemies: [], gibs: [], effects: [], pendingSpawns: 0, spawnT: 0, interT: 0,
};

// ---------- 렌더러 / 씬 ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050506);
scene.fog = new THREE.Fog(0x050506, 24, 78);

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.08, 200);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------- 캔버스 텍스처 ----------
function canvasTex(w, h, draw, repX = 1, repY = 1) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repX, repY);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// 크림 소형 타일 벽 — 의사난수 해시로 사선 밴딩 제거 (평가 지시 3)
function tileWallTex(repX, repY) {
  return canvasTex(256, 256, (g) => {
    g.fillStyle = '#8a8072'; g.fillRect(0, 0, 256, 256); // 그라우트
    for (let y = 0; y < 256; y += 16) {
      for (let x = 0; x < 256; x += 16) {
        const off = (y / 16) % 2 ? 8 : 0;
        const h = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
        const v = 162 + h * 30 - (h > 0.94 ? 55 : 0); // 가끔 그라임 타일
        g.fillStyle = `rgb(${v | 0},${(v - 8) | 0},${(v - 30) | 0})`;
        g.fillRect(x + off + 1, y + 1, 14, 14);
      }
    }
  }, repX, repY);
}
// 형광등 할로 (radial gradient)
const HALO = canvasTex(64, 64, (g) => {
  const rg = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  rg.addColorStop(0, 'rgba(232,255,238,0.9)');
  rg.addColorStop(1, 'rgba(232,255,238,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
});
// 러스트 브라운 (무기 — 평가 지시 2)
function rustTex() {
  return canvasTex(64, 64, (g) => {
    g.fillStyle = '#4a3226'; g.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 350; i++) {
      const v = 42 + Math.random() * 55;
      g.fillStyle = `rgba(${(v + 34) | 0},${v | 0},${(v - 16) | 0},.6)`;
      g.fillRect(Math.random() * 64, Math.random() * 64, 2, 2);
    }
  }, 2, 2);
}
// MIND THE GAP 스텐실 (평가 지시 8)
const MIND = canvasTex(256, 64, (g) => {
  g.fillStyle = 'rgba(235,228,210,0.7)';
  g.font = 'bold 30px Arial';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('MIND THE GAP', 128, 33);
});
// ROOK STREET 모자이크 사인
function signTex() {
  return canvasTex(512, 160, (g) => {
    g.fillStyle = '#e8e2d2'; g.fillRect(0, 0, 512, 160);
    for (let y = 0; y < 160; y += 16) for (let x = 0; x < 512; x += 16) {
      g.fillStyle = (x + y) % 64 ? 'rgba(0,0,0,.06)' : 'rgba(0,0,0,.1)';
      g.fillRect(x + 1, y + 1, 14, 14);
    }
    g.strokeStyle = '#8e2f2a'; g.lineWidth = 10; g.strokeRect(10, 10, 492, 140);
    g.strokeStyle = '#e8e2d2'; g.lineWidth = 4; g.strokeRect(18, 18, 476, 124);
    // 글자를 저해상 오프스크린에 그린 뒤 nearest 업스케일 → 모자이크 블록 글자 (평가 지시 9)
    const off = document.createElement('canvas');
    off.width = 160; off.height = 36;
    const og = off.getContext('2d');
    og.fillStyle = '#26356e';
    og.font = 'bold 21px Georgia, serif';
    og.textAlign = 'center'; og.textBaseline = 'middle';
    og.fillText('ROOK STREET', 80, 19);
    g.imageSmoothingEnabled = false;
    g.drawImage(off, 28, 34, 456, 94);
  });
}
// 콘크리트 (플랫폼 바닥)
function concreteTex(rep) {
  return canvasTex(256, 256, (g) => {
    g.fillStyle = '#6a6660'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      const v = 88 + Math.random() * 40;
      g.fillStyle = `rgba(${v},${v - 3},${v - 8},.5)`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 2.5, 2.5);
    }
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2;
    g.strokeRect(0, 0, 256, 256);
  }, rep, rep);
}
// 포스터 (가상 광고)
function posterTex(kind) {
  return canvasTex(160, 224, (g) => {
    if (kind === 0) {
      g.fillStyle = '#b8305a'; g.fillRect(0, 0, 160, 224);
      g.fillStyle = '#f2e8e0'; g.font = 'bold 26px Arial'; g.textAlign = 'left';
      g.fillText('OTHING', 12, 60); g.fillText('TO SEE', 12, 96);
      g.fillStyle = '#f8d868'; g.fillText('HERE.', 12, 132);
      g.fillStyle = 'rgba(255,255,255,.7)'; g.font = '9px Arial';
      g.fillText('SERVICE OF THE TRANSIT AUTH.', 12, 205);
    } else if (kind === 1) {
      g.fillStyle = '#1e2a20'; g.fillRect(0, 0, 160, 224);
      g.fillStyle = '#d8c890'; g.font = 'bold 22px Georgia'; g.textAlign = 'center';
      g.fillText('HOLLOW', 80, 52);
      g.font = '14px Georgia'; g.fillText('Bitters', 80, 76);
      g.fillStyle = '#7a5a30'; g.fillRect(62, 96, 36, 86);
      g.fillStyle = '#d8c890'; g.font = '9px Georgia'; g.fillText('SINCE NEVER', 80, 205);
    } else {
      g.fillStyle = '#23304a'; g.fillRect(0, 0, 160, 224);
      g.fillStyle = '#e8e8f0'; g.font = 'bold 18px Arial'; g.textAlign = 'center';
      g.fillText('SLAPPIS', 80, 60); g.fillText('WATCH CO.', 80, 84);
      g.strokeStyle = '#e8c66a'; g.lineWidth = 4;
      g.beginPath(); g.arc(80, 140, 32, 0, 7); g.stroke();
      g.beginPath(); g.moveTo(80, 140); g.lineTo(80, 118); g.moveTo(80, 140); g.lineTo(96, 148); g.stroke();
    }
  });
}

// ---------- 재질 ----------
const M = {
  tileA: new THREE.MeshLambertMaterial({ map: tileWallTex(40, 4) }), // ~13×8cm 타일
  sign: new THREE.MeshLambertMaterial({ map: signTex() }),
  concrete: new THREE.MeshLambertMaterial({ map: concreteTex(8) }),
  concreteSide: new THREE.MeshLambertMaterial({ map: concreteTex(4) }),
  dark: new THREE.MeshLambertMaterial({ color: 0x1c1c20 }),
  ceiling: new THREE.MeshLambertMaterial({ color: 0x3a3a40 }), // 조명에 반응하게 상향 (평가 지시 6)
  rib: new THREE.MeshLambertMaterial({ color: 0x2e2e33 }),
  column: new THREE.MeshLambertMaterial({ color: 0x2e4a3a }),
  rail: new THREE.MeshStandardMaterial({ color: 0x4a3a30, metalness: 0.55, roughness: 0.55 }), // 녹슨 레일 (평가 지시 5)
  tie: new THREE.MeshLambertMaterial({ color: 0x241c14 }),
  gravel: new THREE.MeshLambertMaterial({ color: 0x2e2b28 }),
  pitWall: new THREE.MeshLambertMaterial({ color: 0x35322c }), // 피트 측벽 그라임
  wood: new THREE.MeshLambertMaterial({ color: 0x5a3e26 }),
  woodDark: new THREE.MeshLambertMaterial({ color: 0x4a3420 }),
  yellow: new THREE.MeshLambertMaterial({ color: 0x6e5f28 }), // 낡은 노랑
  paper: new THREE.MeshLambertMaterial({ color: 0xb8b4aa, side: THREE.DoubleSide }),
  tube: new THREE.MeshBasicMaterial({ color: 0xd8e8e0 }),
  fixture: new THREE.MeshLambertMaterial({ color: 0x33332e }),
  vend: new THREE.MeshLambertMaterial({ color: 0x7a2222 }),
  vendFace: new THREE.MeshBasicMaterial({ color: 0x3a1414 }),
  mann: new THREE.MeshStandardMaterial({ color: 0x0e0e10, roughness: 0.92, metalness: 0.02 }), // 근접에도 무광 검정 (평가 지시 4)
  gun: new THREE.MeshStandardMaterial({ map: rustTex(), roughness: 0.68, metalness: 0.28 }),   // 러스트 브라운 (평가 지시 2)
  gunDark: new THREE.MeshStandardMaterial({ map: rustTex(), color: 0x6a5a4a, roughness: 0.75 }),
  hand: new THREE.MeshLambertMaterial({ color: 0x8a6a52 }),
};
function box(w, h, d, m, sx = 0, sy = 0, sz = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(sx, sy, sz);
  return mesh;
}

// ---------- 역 구성 ----------
// 좌표계: z = 역 길이 방향 (-L..L), x = 폭. 중앙 플랫폼 |x|<4, 선로 4..7.2, 측면 7.2..11, 벽 ±11
const L = 40, PIT = -1.1;
const station = new THREE.Group();
scene.add(station);

function groundY(x) { // 플레이어/적 접지 높이
  const ax = Math.abs(x);
  if (ax < 3.8) return 0;
  if (ax < 4.4) return (4.4 - ax) / 0.6 * 1.1 + PIT; // 플랫폼 가장자리 경사(계단 대용)
  if (ax < 7.0) return PIT;
  if (ax < 7.6) return (ax - 7.0) / 0.6 * 1.1 + PIT;
  return 0;
}

{
  // 중앙 플랫폼
  const mid = box(8, 1.2, L * 2, M.concrete, 0, -0.6, 0);
  mid.receiveShadow = true; station.add(mid);
  // 선로 피트 바닥(자갈) + 레일/침목
  for (const side of [-1, 1]) {
    const pit = box(3.2, 0.1, L * 2, M.gravel, side * 5.6, PIT - 0.05, 0);
    pit.receiveShadow = true; station.add(pit);
    for (const rx of [-0.7, 0.7]) {
      const r = box(0.09, 0.14, L * 2, M.rail, side * 5.6 + rx, PIT + 0.09, 0);
      station.add(r);
    }
    for (let z = -L; z < L; z += 0.85) station.add(box(2.2, 0.07, 0.3, M.tie, side * 5.6, PIT + 0.02, z));
    // 피트 측벽 (그라임 — 평가 지시 5)
    station.add(box(0.12, 1.2, L * 2, M.pitWall, side * 4.02, -0.55, 0));
    station.add(box(0.12, 1.2, L * 2, M.pitWall, side * 7.18, -0.55, 0));
    // 측면 플랫폼
    const sp = box(3.8, 1.2, L * 2, M.concreteSide, side * 9.1, -0.6, 0);
    sp.receiveShadow = true; station.add(sp);
    // 벽 + 상단 초록 몰딩 스트립 (지오메트리 분리 — 평가 지시 3)
    const wall = box(0.4, 5.2, L * 2, M.tileA, side * 11.2, 2.6, 0);
    station.add(wall);
    station.add(box(0.14, 0.55, L * 2, M.column, side * 10.94, 4.3, 0));
    // 벽 사인 + 포스터 (밀도 상향 — 평가 지시 12)
    for (let z = -L + 8; z < L; z += 16) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.35), M.sign);
      s.position.set(side * 10.98, 2.5, z);
      s.rotation.y = -side * Math.PI / 2;
      station.add(s);
      for (const pz of [7.2, 11.5]) {
        const p = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.55),
          new THREE.MeshLambertMaterial({ map: posterTex((Math.abs((z + pz) * 7) | 0) % 3) }));
        p.position.set(side * 10.98, 2.2, z + pz);
        p.rotation.y = -side * Math.PI / 2;
        station.add(p);
      }
    }
    // 플랫폼 노란 엣지
    station.add(box(0.35, 0.021, L * 2, M.yellow, side * 3.9, 0.011, 0));
    station.add(box(0.35, 0.021, L * 2, M.yellow, side * 7.35, 0.011, 0));
  }
  // 천장 + 아치 리브
  station.add(box(23, 0.3, L * 2, M.ceiling, 0, 4.8, 0));
  for (let z = -L + 3; z < L; z += 6) {
    const rib = box(23, 0.5, 0.5, M.rib, 0, 4.55, z);
    station.add(rib);
  }
  // 중앙 기둥 열 (초록 철 기둥)
  for (let z = -L + 4; z < L; z += 6) {
    for (const px of [-3.2, 3.2]) {
      const c = box(0.34, 4.8, 0.34, M.column, px, 2.4, z);
      c.castShadow = true;
      station.add(c);
      station.add(box(0.6, 0.16, 0.6, M.column, px, 4.7, z));
    }
  }
  // 벤치 (나무 슬랫)
  for (let z = -L + 10; z < L; z += 14) {
    for (const bx of [0, 9.1]) for (const side of bx ? [-1, 1] : [1]) {
      const b = new THREE.Group();
      for (let k = 0; k < 3; k++) b.add(box(1.9, 0.06, 0.14, M.wood, 0, 0.48, -0.16 + k * 0.16));
      for (let k = 0; k < 2; k++) b.add(box(1.9, 0.06, 0.14, M.wood, 0, 0.78 + k * 0.17, 0.24));
      b.add(box(0.1, 0.5, 0.5, M.woodDark, -0.8, 0.24, 0));
      b.add(box(0.1, 0.5, 0.5, M.woodDark, 0.8, 0.24, 0));
      b.position.set(side * bx, 0, z + (bx ? 3 : 0));
      b.rotation.y = bx ? (side > 0 ? Math.PI : 0) : Math.PI / 2;
      b.traverse((o) => { o.castShadow = true; });
      station.add(b);
    }
  }
  // 쓰레기통 + 자판기
  for (let z = -L + 6; z < L; z += 20) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.8, 10), M.dark);
    t.position.set(2.9, 0.4, z); t.castShadow = true;
    station.add(t);
  }
  for (const [vx, vz] of [[-9.6, -L + 12], [9.6, L - 14]]) { // 자판기 2대 (평가 지시 12)
    const vend = box(1.1, 1.9, 0.7, M.vend, vx, 0.95, vz);
    vend.castShadow = true; station.add(vend);
    station.add(box(0.7, 1.1, 0.03, M.vendFace, vx, 1.1, vz + 0.37));
  }
  // MIND THE GAP 스텐실 (평가 지시 8)
  for (let z = -L + 7; z < L; z += 14) {
    for (const side of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.55),
        new THREE.MeshLambertMaterial({ map: MIND, transparent: true }));
      m.position.set(side * 3.05, 0.014, z);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = -side * Math.PI / 2;
      station.add(m);
    }
  }
  // 선로 위 쓰레기 봉투 더미 (평가 지시 12)
  for (let i = 0; i < 6; i++) {
    const b = box(0.5 + Math.random() * 0.3, 0.35, 0.45, M.dark,
      (i % 2 ? 5.6 : -5.6) + (Math.random() - 0.5), PIT + 0.18, (Math.random() * 2 - 1) * (L - 6));
    b.rotation.y = Math.random() * 3;
    station.add(b);
  }
  // 바닥 쓰레기 (종이)
  for (let i = 0; i < 55; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.16 + Math.random() * 0.14, 0.12 + Math.random() * 0.1), M.paper);
    const lane = Math.random();
    const x = lane < 0.6 ? (Math.random() * 2 - 1) * 3.6 : (Math.random() < 0.5 ? -1 : 1) * (7.7 + Math.random() * 2.8);
    p.position.set(x, 0.012, (Math.random() * 2 - 1) * (L - 2));
    p.rotation.x = -Math.PI / 2;
    p.rotation.z = Math.random() * Math.PI * 2;
    station.add(p);
  }
  // 터널 끝 마감 + 신호등
  for (const side of [-1, 1]) {
    station.add(box(23, 6, 0.5, M.dark, 0, 2.5, side * (L + 0.2)));
    for (const sx of [-5.6, 5.6]) {
      const sig = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8),
        new THREE.MeshBasicMaterial({ color: side > 0 ? 0xc03030 : 0x30c050 }));
      sig.position.set(sx, 0.6, side * (L - 0.6));
      station.add(sig);
    }
  }
}

// ---------- 조명 ----------
const lights = [];
{
  scene.add(new THREE.AmbientLight(0x9aa2b2, 0.22)); // 낮은 베이스 — 광풀 대비 극대화 (평가 지시 1b)
  const hemi = new THREE.HemisphereLight(0x6a7080, 0x201f1c, 0.22);
  scene.add(hemi);
  lights.push({ l: hemi, base: 0.22 });
  // 매달린 형광등 — 중앙/측면 교차 배치
  const spots = [];
  for (let z = -L + 5; z < L; z += 10) spots.push([0, z]);
  for (let z = -L + 10; z < L; z += 20) { spots.push([9.1, z]); spots.push([-9.1, z]); }
  for (const [x, z] of spots) {
    const g = new THREE.Group();
    g.add(box(0.34, 0.1, 2.0, M.fixture, 0, 0, 0));
    g.add(box(0.14, 0.05, 1.8, M.tube, 0, -0.07, 0));
    for (const rz of [-0.8, 0.8]) {
      const rod = box(0.03, 0.7, 0.03, M.fixture, 0, 0.4, rz);
      g.add(rod);
    }
    g.position.set(x, 4.1, z);
    station.add(g);
    // 발광 튜브 할로 (additive 글로우 — 평가 지시 1c)
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: HALO, color: 0xe0f2dc, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    halo.scale.set(2.4, 1.1, 1);
    halo.position.set(0, -0.1, 0);
    g.add(halo);
    const pl = new THREE.PointLight(0xe2ecd4, 40, 22, 1.8); // 바닥 광풀 강화 (평가 지시 1b)
    pl.position.set(x, 3.7, z);
    scene.add(pl);
    lights.push({ l: pl, base: 40 });
  }
  // 그림자용 키 라이트 하나만 — 무드를 죽이지 않게 약하게 (평가 지시 1a)
  const key = new THREE.SpotLight(0xdfe8dc, 18, 30, 0.9, 0.5, 1.5);
  key.position.set(0, 4.4, 0);
  key.target.position.set(0, 0, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key, key.target);
  lights.push({ l: key, base: 18, follow: true, tgt: key.target });
}
function applyLighting() {
  for (const e of lights) e.l.intensity = e.base * game.lightMul;
}

// ---------- 플레이어 ----------
const player = { pos: new THREE.Vector3(0, 0, L - 8), vel: new THREE.Vector3(), yaw: Math.PI, pitch: 0, bob: 0 };

document.addEventListener('mousemove', (e) => {
  if (!game.running || document.pointerLockElement !== renderer.domElement) return;
  const k = game.sens * 0.0011;
  player.yaw -= e.movementX * k;
  player.pitch = clamp(player.pitch - e.movementY * k, -1.35, 1.35);
});
const keys = {};
addEventListener('keydown', (e) => { keys[e.code] = true; });
addEventListener('keyup', (e) => { keys[e.code] = false; });

// ---------- 무기 뷰모델 (복셀 SMG + 손) ----------
const weapon = new THREE.Group();
{
  const g = weapon;
  g.add(box(0.09, 0.14, 0.62, M.gun, 0, 0, -0.1));            // 리시버
  g.add(box(0.05, 0.05, 0.34, M.gunDark, 0, 0.02, -0.55));    // 총열
  g.add(box(0.07, 0.07, 0.07, M.gunDark, 0, 0.06, -0.72));    // 머즐
  g.add(box(0.06, 0.22, 0.09, M.gunDark, 0, -0.16, 0.02));    // 탄창
  g.add(box(0.07, 0.12, 0.1, M.gun, 0, -0.1, 0.16));          // 그립
  g.add(box(0.08, 0.1, 0.26, M.gunDark, 0, 0.02, 0.3));       // 개머리판
  g.add(box(0.04, 0.06, 0.12, M.gun, 0, 0.1, -0.3));          // 조준기
  // 그리블 (평가 지시 2)
  g.add(box(0.03, 0.04, 0.16, M.gunDark, 0.055, 0.03, -0.18));
  g.add(box(0.1, 0.03, 0.08, M.gunDark, 0, 0.085, -0.05));
  g.add(box(0.03, 0.08, 0.05, M.gunDark, -0.05, -0.02, 0.08));
  // 손 — 손바닥 + 손가락 마디 (평가 지시 2)
  const handR = box(0.1, 0.09, 0.11, M.hand, 0.01, -0.13, 0.14);
  g.add(box(0.09, 0.035, 0.05, M.hand, -0.02, -0.16, 0.09));
  const handL = box(0.09, 0.08, 0.1, M.hand, -0.02, -0.1, -0.32);
  g.add(box(0.08, 0.03, 0.05, M.hand, -0.05, -0.13, -0.35));
  g.add(handR, handL);
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0xffd890, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  flash.position.set(0, 0.06, -0.8);
  g.add(flash);
  g.userData.flash = flash;
  const flashLight = new THREE.PointLight(0xffc060, 0, 6);
  flashLight.position.copy(flash.position);
  g.add(flashLight);
  g.userData.flashLight = flashLight;
  camera.add(g);
  g.scale.setScalar(0.5); // 원본처럼 소형 (평가 지시 2)
  g.position.set(0.35, -0.33, -0.55);
  g.rotation.y = 0.14;
  scene.add(camera);
}

// ---------- 오디오 (합성) ----------
let AC = null, master = null;
function initAudio() {
  if (AC) return;
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain();
    master.gain.value = 0.85;
    master.connect(AC.destination);
  } catch (e) { /* */ }
}
function noise(dur, freq, vol, q = 0.7) {
  if (!AC) return;
  try {
    const n = AC.createBufferSource();
    const buf = AC.createBuffer(1, AC.sampleRate * dur, AC.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    n.buffer = buf;
    const f = AC.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const gn = AC.createGain(); gn.gain.value = vol;
    n.connect(f).connect(gn).connect(master);
    n.start();
  } catch (e) { /* */ }
}
function tone(freq, end, dur, type, vol) {
  if (!AC) return;
  try {
    const o = AC.createOscillator(), gn = AC.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, AC.currentTime);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, end), AC.currentTime + dur);
    gn.gain.setValueAtTime(vol, AC.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + dur);
    o.connect(gn).connect(master);
    o.start(); o.stop(AC.currentTime + dur);
  } catch (e) { /* */ }
}
const snd = {
  shot() { // 설한식 폭발음: 노이즈 로우패스 스윕(무게) + 저역 몸통 울림
    if (!AC) return;
    try {
      const t0 = AC.currentTime;
      const n = AC.createBufferSource();
      const buf = AC.createBuffer(1, AC.sampleRate * 0.28, AC.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.4);
      n.buffer = buf;
      const f = AC.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(4800, t0);
      f.frequency.exponentialRampToValueAtTime(380, t0 + 0.13);
      const gn = AC.createGain();
      gn.gain.setValueAtTime(0.5, t0);
      gn.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);
      n.connect(f).connect(gn).connect(master);
      n.start(t0);
      tone(130, 52, 0.12, 'sine', 0.3);
    } catch (e) { /* */ }
  },
  hit() { noise(0.06, 900, 0.22, 0.6); }, // 명중 살 맞는 소리
  head() { tone(1250, 1250, 0.1, 'sine', 0.3); tone(1875, 1875, 0.16, 'sine', 0.15); noise(0.08, 500, 0.3, 0.5); },
  die() { tone(220, 40, 0.4, 'sawtooth', 0.22); tone(80, 34, 0.25, 'sine', 0.3); noise(0.2, 500, 0.2); },
  hurt() { tone(180, 70, 0.25, 'square', 0.3); },
  bell() { [660, 880].forEach((f, i) => tone(f, f, 0.8, 'sine', 0.2 * (1 - i * 0.3))); },
  step() { noise(0.05, 600, 0.05, 0.4); },
};

// ---------- 마네킹 적 ----------
function makeMannequin() {
  const g = new THREE.Group();
  const head = box(0.26, 0.3, 0.26, M.mann, 0, 1.62, 0);
  head.userData.part = 'head';
  const torso = box(0.44, 0.62, 0.24, M.mann, 0, 1.16, 0);
  torso.userData.part = 'body';
  const hip = box(0.36, 0.18, 0.22, M.mann, 0, 0.78, 0);
  hip.userData.part = 'body';
  const armL = box(0.11, 0.6, 0.11, M.mann, -0.3, 1.16, 0);
  const armR = box(0.11, 0.6, 0.11, M.mann, 0.3, 1.16, 0);
  armL.userData.part = 'body'; armR.userData.part = 'body';
  armL.geometry.translate(0, -0.22, 0); armL.position.y = 1.4;
  armR.geometry.translate(0, -0.22, 0); armR.position.y = 1.4;
  const legL = box(0.14, 0.7, 0.16, M.mann, -0.11, 0.7, 0);
  const legR = box(0.14, 0.7, 0.16, M.mann, 0.11, 0.7, 0);
  legL.userData.part = 'body'; legR.userData.part = 'body';
  legL.geometry.translate(0, -0.32, 0); legL.position.y = 0.72;
  legR.geometry.translate(0, -0.32, 0); legR.position.y = 0.72;
  g.add(head, torso, hip, armL, armR, legL, legR);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.userData = { head, armL, armR, legL, legR };
  return g;
}
class Mannequin {
  constructor(x, z, hpMul, spdMul) {
    this.mesh = makeMannequin();
    this.mesh.position.set(x, groundY(x), z);
    this.mesh.userData.owner = this;
    this.hp = 100 * hpMul;
    this.speed = (1.5 + Math.random() * 0.5) * spdMul;
    this.attackT = 0;
    this.stunT = 0;
    this.t = Math.random() * 10;
    scene.add(this.mesh);
  }
  get pos() { return this.mesh.position; }
  update(dt) {
    if (this.stunT > 0) { this.stunT -= dt; return; } // 피격 경직 (설한식)
    this.t += dt;
    const to = player.pos.clone().sub(this.pos); to.y = 0;
    const d = to.length();
    to.normalize();
    this.mesh.rotation.y = Math.atan2(to.x, to.z);
    this.attackT -= dt;
    const u = this.mesh.userData;
    if (d > 1.5) {
      this.pos.addScaledVector(to, this.speed * dt);
      this.pos.y = groundY(this.pos.x);
      const sw = Math.sin(this.t * 7) * 0.55; // 걷기 스윙
      u.armL.rotation.x = sw; u.armR.rotation.x = -sw;
      u.legL.rotation.x = -sw * 0.8; u.legR.rotation.x = sw * 0.8;
    } else {
      u.legL.rotation.x = u.legR.rotation.x = 0;
      if (this.attackT <= 0) { // 근접 스윙
        this.attackT = 1.0;
        u.armR.rotation.x = -2.2;
        setTimeout(() => { if (this.hp > 0) u.armR.rotation.x = 0; }, 180);
        if (d < 1.9 && !game.over) damagePlayer(12);
      }
    }
  }
  damage(n, isHead, dir) {
    if (this.hp <= 0) return;
    this.hp -= isHead ? 9999 : n;
    if (this.hp <= 0) { this.die(isHead, dir); return; }
    // 살아남은 피격: 경직 + 밀림 + 움찔 (킬링 실감의 절반은 여기)
    this.stunT = 0.22;
    if (dir) {
      this.pos.addScaledVector(dir, 0.35);
      this.pos.y = groundY(this.pos.x);
    }
    const u = this.mesh.userData;
    u.armL.rotation.x = -0.8; u.armR.rotation.x = -0.8;
  }
  die(isHead, dir) {
    game.enemies.splice(game.enemies.indexOf(this), 1);
    game.kills++;
    if (isHead) { game.heads++; snd.head(); }
    snd.die();
    // 파츠 분해 낙하
    const parts = [...this.mesh.children];
    for (const p of parts) {
      this.mesh.remove(p);
      p.position.applyMatrix4(this.mesh.matrixWorld.clone());
      p.getWorldQuaternion ? null : null;
      p.position.copy(p.position);
      scene.add(p);
      const vel = new THREE.Vector3((Math.random() - 0.5) * 3, 2 + Math.random() * 2.5, (Math.random() - 0.5) * 3);
      if (dir) vel.addScaledVector(dir, 3.5); // 총알 방향으로 날아간다
      if (isHead && p.userData.part === 'head') { vel.y += 3.5; vel.addScaledVector(dir || vel, 1.5); } // 헤드샷 = 머리 팝
      game.gibs.push({
        mesh: p, t: 5, // 잔해가 잠시 남는다 (평가 지시 7)
        vel,
        rot: new THREE.Vector3(Math.random() * 8 - 4, Math.random() * 8 - 4, 0),
      });
    }
    scene.remove(this.mesh);
    updateWaveHUD();
    if (game.enemies.length === 0 && game.pendingSpawns === 0) endWave();
  }
}

// ---------- 사격 ----------
const ray = new THREE.Raycaster();
let firing = false, fireT = 0, recoil = 0, recoilPitch = 0; // 카메라 피치 반동 (설한식)
addEventListener('mousedown', (e) => { if (e.button === 0) firing = true; });
addEventListener('mouseup', (e) => { if (e.button === 0) firing = false; });

function shoot() {
  game.shots++;
  snd.shot();
  recoil = 1;
  recoilPitch = Math.min(0.085, recoilPitch + 0.016); // 총구 들림 — 연사 시 누적
  const f = weapon.userData.flash;
  f.material.opacity = 0.95;
  f.scale.setScalar(0.7 + Math.random() * 0.7);
  weapon.userData.flashLight.intensity = 28; // 강한 섬광 (설한 90의 SMG 버전)
  // 화약 연기 2점
  for (let i = 0; i < 2; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: HALO, color: 0x9aa0a8, transparent: true, opacity: 0.35, depthWrite: false,
    }));
    weapon.userData.flash.getWorldPosition(s.position);
    s.position.x += (Math.random() - 0.5) * 0.1;
    s.scale.setScalar(0.18 + Math.random() * 0.14);
    scene.add(s);
    game.effects.push({
      mesh: s, t: 0.6 + Math.random() * 0.4, dur: 1, fade: true, grow: 1.6, grav: -1.2,
      vel: new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.5 + Math.random() * 0.5, (Math.random() - 0.5) * 0.4),
    });
  }
  // 스프레드
  const nd = new THREE.Vector2((Math.random() - 0.5) * 0.014, (Math.random() - 0.5) * 0.014);
  ray.setFromCamera(nd, camera);
  const shotDir = ray.ray.direction.clone();
  const targets = [];
  for (const e of game.enemies) targets.push(e.mesh);
  const hits = ray.intersectObjects(targets, true);
  if (hits.length) {
    const h = hits[0];
    let o = h.object, owner = null;
    while (o && !owner) { owner = o.userData.owner || null; o = o.parent; }
    if (owner) {
      game.hits++;
      const isHead = h.object.userData.part === 'head';
      chipBurst(h.point, isHead);
      snd.hit();
      hitmark(isHead ? 'head' : 'body');
      owner.damage(40, isHead, shotDir);
    }
  } else {
    // 벽 등 명중점 스파크 (환경)
    const env = ray.intersectObjects(station.children, false);
    if (env.length && env[0].distance < 60) impactFx(env[0].point, 0x6a6a72);
  }
}
// 마네킹 파편 — 검은 조각 + 스파크 (설한 spawnBlood의 마네킹 버전)
function chipBurst(pos, big) {
  const n = big ? 10 : 6;
  for (let i = 0; i < n; i++) {
    const dark = Math.random() < 0.72;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: HALO, color: dark ? 0x1a1a1e : 0xffe0a0, transparent: true, opacity: 0.95, depthWrite: false,
    }));
    s.scale.setScalar(dark ? 0.09 + Math.random() * 0.12 : 0.05 + Math.random() * 0.04);
    s.position.copy(pos);
    scene.add(s);
    game.effects.push({
      mesh: s, t: 0.35 + Math.random() * 0.2, dur: 0.55, fade: true,
      vel: new THREE.Vector3((Math.random() - 0.5) * 3.5, 0.5 + Math.random() * 2.4, (Math.random() - 0.5) * 3.5),
    });
  }
}
// 히트마커 — 명중 확인 (헤드샷은 금색)
let hitmarkT = null;
function hitmark(kind) {
  const el = $('hitmark');
  el.style.borderColor = kind === 'head' ? '#ffcf5a' : 'rgba(255,255,255,.9)';
  el.style.opacity = '1';
  clearTimeout(hitmarkT);
  hitmarkT = setTimeout(() => { el.style.opacity = '0'; }, 90);
}
function impactFx(pos, color) {
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03),
      new THREE.MeshBasicMaterial({ color }));
    s.position.copy(pos);
    scene.add(s);
    game.effects.push({
      mesh: s, t: 0.25,
      vel: new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 3, (Math.random() - 0.5) * 4),
    });
  }
}

// ---------- 웨이브 ----------
function startWave() {
  game.wave++;
  game.pendingSpawns = 4 + game.wave * 2;
  game.spawnT = 0.5;
  $('wave-num').textContent = game.wave;
  updateWaveHUD();
  snd.bell();
}
function endWave() {
  game.interT = 3;
  $('wave-remain').textContent = 'CLEARED';
}
function spawnOne() {
  const lanes = [
    [5.6, -L + 2], [-5.6, -L + 2], [5.6, L - 2], [-5.6, L - 2], // 선로 터널
    [9.1, -L + 4], [-9.1, -L + 4],                              // 측면 끝
  ];
  const [x, z] = lanes[Math.floor(Math.random() * lanes.length)];
  const hpMul = 1 + (game.wave - 1) * 0.12;
  const spdMul = 1 + (game.wave - 1) * 0.06;
  game.enemies.push(new Mannequin(x + (Math.random() - 0.5) * 1.5, z, hpMul, spdMul));
  updateWaveHUD();
}
function updateWaveHUD() {
  const remain = game.enemies.length + game.pendingSpawns;
  if (remain > 0) $('wave-remain').textContent = `${remain} REMAINING`;
  $('st-kills').textContent = game.kills;
  $('st-heads').textContent = game.heads;
  $('st-acc').textContent = game.shots ? Math.round((game.hits / game.shots) * 100) + '%' : '0%';
}

// ---------- 피해 / 게임오버 ----------
function damagePlayer(n) {
  if (game.over) return;
  game.hp = Math.max(0, game.hp - n);
  snd.hurt();
  $('cond-fill').style.width = game.hp + '%';
  $('cond-num').textContent = game.hp;
  $('vig').classList.add('hit');
  setTimeout(() => $('vig').classList.remove('hit'), 160);
  if (game.hp <= 0) gameOver();
}
function gameOver() {
  game.over = true;
  game.running = false;
  document.exitPointerLock();
  $('go-stats').innerHTML =
    `WAVE <b>${game.wave}</b> · KILLS <b>${game.kills}</b> · HEADSHOTS <b>${game.heads}</b> · ACCURACY <b>${game.shots ? Math.round((game.hits / game.shots) * 100) : 0}%</b>`;
  $('go-revive').style.display = (!game.usedRevive && window.AFG) ? '' : 'none';
  $('gameover').style.display = 'flex';
}

// ---- 광고 연동 (Tart Shop AFG) ----
function revive() { // 리워드 시청 완료 → CONDITION 50 + 주변 6m 정리 후 재개
  game.hp = 50;
  $('cond-fill').style.width = '50%';
  $('cond-num').textContent = 50;
  for (const e of [...game.enemies]) {
    if (e.pos.distanceTo(player.pos) < 6) e.damage(9999, false, null);
  }
  game.over = false;
  $('gameover').style.display = 'none';
  game.running = true;
  renderer.domElement.requestPointerLock();
}
$('go-revive').addEventListener('click', (e) => {
  e.stopPropagation(); // 오버레이 리트라이 클릭과 분리
  game.usedRevive = true;
  window.AFG.rewarded({
    name: 'rookstreet_continue',
    onReward: revive,
    onDismiss: () => { game.usedRevive = false; },
  });
});
$('gameover').addEventListener('click', () => {
  if (window.AFG) {
    window.AFG.interstitial({ name: 'rookstreet_gameover', onAfterAd: () => location.reload() });
  } else {
    location.reload();
  }
});

// ---------- 데브 패널 ----------
$('dp-light').addEventListener('input', (e) => {
  game.lightMul = e.target.value / 100;
  $('dpv-light').textContent = e.target.value + '%';
  applyLighting();
});
$('dp-sens').addEventListener('input', (e) => {
  game.sens = e.target.value / 10;
  $('dpv-sens').textContent = game.sens.toFixed(1);
});
$('dp-vol').addEventListener('input', (e) => {
  if (master) master.gain.value = e.target.value / 100;
  $('dpv-vol').textContent = e.target.value + '%';
});

// ---------- 시작 ----------
$('intro').addEventListener('click', () => {
  initAudio();
  $('intro').style.display = 'none';
  renderer.domElement.requestPointerLock();
  if (!game.running && !game.over) {
    game.running = true;
    if (game.wave === 0) startWave();
  }
});
document.addEventListener('pointerlockchange', () => {
  if (game.forced) return;
  if (document.pointerLockElement !== renderer.domElement && !game.over && game.wave > 0) {
    game.running = false;
    $('intro').style.display = 'flex'; // 일시정지 = 다시 클릭
  } else if (document.pointerLockElement === renderer.domElement) {
    game.running = true;
  }
});

// ---------- 메인 루프 ----------
let last = 0, fpsAcc = 0, fpsN = 0, statT = 0, stepT = 0;
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
  last = t;

  if (game.running) {
    // 이동
    const fwd = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const wish = new THREE.Vector3();
    if (keys.KeyW) wish.add(fwd);
    if (keys.KeyS) wish.sub(fwd);
    if (keys.KeyD) wish.add(right);
    if (keys.KeyA) wish.sub(right);
    if (wish.lengthSq() > 0) wish.normalize();
    player.vel.addScaledVector(wish, 40 * dt);
    player.vel.multiplyScalar(Math.max(0, 1 - 10 * dt));
    const spd = player.vel.length();
    if (spd > 4.2) player.vel.setLength(4.2);
    player.pos.addScaledVector(player.vel, dt);
    player.pos.x = clamp(player.pos.x, -10.6, 10.6);
    player.pos.z = clamp(player.pos.z, -L + 1, L - 1);
    const gy = groundY(player.pos.x);
    player.pos.y += (gy - player.pos.y) * Math.min(1, dt * 10);
    // 발소리
    stepT -= dt * spd;
    if (spd > 1.5 && stepT <= 0) { stepT = 2.2; snd.step(); }
    // 밥/카메라
    player.bob += dt * spd * 1.9;
    const bobY = Math.sin(player.bob * 2) * 0.025 * Math.min(1, spd / 3);
    camera.position.set(player.pos.x, player.pos.y + 1.68 + bobY, player.pos.z);
    camera.rotation.set(0, 0, 0);
    camera.rotateY(player.yaw);
    recoilPitch = Math.max(0, recoilPitch - dt * 0.32); // 총구 들림 복귀 (설한식)
    camera.rotateX(player.pitch + recoilPitch);

    // 사격
    fireT -= dt;
    if (firing && fireT <= 0) { fireT = 0.1; shoot(); }
    recoil = Math.max(0, recoil - dt * 7);
    weapon.position.set(0.35, -0.33 + bobY * 0.5, -0.55 + recoil * 0.05);
    weapon.rotation.x = recoil * 0.09;
    weapon.userData.flash.material.opacity *= 0.45;
    weapon.userData.flashLight.intensity *= 0.45;

    // 스폰
    if (game.pendingSpawns > 0) {
      game.spawnT -= dt;
      if (game.spawnT <= 0) { game.spawnT = 1.1; game.pendingSpawns--; spawnOne(); }
    }
    if (game.interT > 0) {
      game.interT -= dt;
      if (game.interT <= 0) startWave();
    }
    // 적
    for (const e of [...game.enemies]) e.update(dt);
    // 키 라이트 추종
    for (const e of lights) if (e.follow) {
      e.l.position.set(player.pos.x, 4.4, player.pos.z);
      e.tgt.position.set(player.pos.x, 0, player.pos.z);
    }
  }

  // 파츠/이펙트 (일시정지 중에도 정리)
  for (let i = game.gibs.length - 1; i >= 0; i--) {
    const g = game.gibs[i];
    g.t -= dt;
    g.mesh.position.addScaledVector(g.vel, dt);
    g.vel.y -= 9.8 * dt;
    const gfloor = groundY(g.mesh.position.x) + 0.05; // 선로 피트에서도 바닥에 안착 (평가 지시 7)
    if (g.mesh.position.y < gfloor) { g.mesh.position.y = gfloor; g.vel.set(0, 0, 0); g.rot.set(0, 0, 0); }
    g.mesh.rotation.x += g.rot.x * dt;
    g.mesh.rotation.z += g.rot.y * dt;
    if (g.t <= 0) { scene.remove(g.mesh); game.gibs.splice(i, 1); }
  }
  for (let i = game.effects.length - 1; i >= 0; i--) {
    const fx = game.effects[i];
    fx.t -= dt;
    fx.mesh.position.addScaledVector(fx.vel, dt);
    fx.vel.y -= (fx.grav ?? 12) * dt;
    if (fx.grow) fx.mesh.scale.multiplyScalar(1 + fx.grow * dt);
    if (fx.fade && fx.mesh.material.opacity !== undefined) {
      fx.mesh.material.opacity = Math.max(0, fx.mesh.material.opacity - dt / (fx.dur || 0.5));
    }
    if (fx.t <= 0) { scene.remove(fx.mesh); game.effects.splice(i, 1); }
  }

  renderer.render(scene, camera);

  // 데브 카운터
  fpsAcc += dt; fpsN++;
  statT -= dt;
  if (statT <= 0) {
    statT = 0.25;
    const fps = Math.round(fpsN / fpsAcc);
    fpsAcc = 0; fpsN = 0;
    $('dp-stats').textContent = `${fps} fps · ${renderer.info.render.calls} draws · ${game.enemies.length} active`;
  }
}
requestAnimationFrame(frame);
applyLighting();

// 디버그 핸들
window.__rook = {
  game, player, startWave, spawnOne, Mannequin, damagePlayer, groundY, shoot, frame,
  forceStart() { // 자동화 검증용 — 포인터락 없이 구동
    initAudio();
    $('intro').style.display = 'none';
    game.running = true;
    game.forced = true;
    if (game.wave === 0) startWave();
  },
};
