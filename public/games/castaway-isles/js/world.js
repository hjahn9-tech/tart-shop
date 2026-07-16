// 시드 기반 난수, 섬 이름/퀘스트/지형 생성
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const World = (() => {
  const ISLAND_COUNT = 50;
  const MAP_W = 2500, MAP_H = 1350; // 항해 월드 크기(px)

  const ADJ = ['코코넛', '반짝이는', '달빛', '산호', '바람의', '무지개', '조개', '파도', '노을', '별빛'];
  const NOUN = ['섬', '모래섬', '산호섬', '바위섬', '야자섬'];

  const QUEST_TYPES = [
    { key: 'coconut',  item: '코코넛',     action: '모으세요',  min: 4, max: 6 },
    { key: 'shell',    item: '조개껍데기', action: '모으세요',  min: 4, max: 6 },
    { key: 'flower',   item: '무지개 꽃',  action: '꺾으세요',  min: 3, max: 5 },
    { key: 'crab',     item: '아기 게',    action: '잡으세요',  min: 3, max: 5 },
    { key: 'starfish', item: '불가사리',   action: '구조하세요', min: 3, max: 5 },
    { key: 'bottle',   item: '유리병 편지', action: '찾으세요',  min: 2, max: 3 },
    { key: 'treasure', item: '보물상자',   action: '찾으세요',  min: 1, max: 1 },
    { key: 'fire',     item: '장작',       action: '모아 봉화를 피우세요', min: 3, max: 4 },
  ];

  // 50개 섬 메타데이터 (위치, 이름, 퀘스트) — 시드 고정이라 항상 동일
  const islands = [];
  for (let i = 0; i < ISLAND_COUNT; i++) {
    const rng = mulberry32(1000 + i * 7919);
    const col = i % 10, row = Math.floor(i / 10);
    const x = 170 + col * 235 + (rng() - 0.5) * 90;
    const y = 160 + row * 250 + (rng() - 0.5) * 90;
    const qt = QUEST_TYPES[Math.floor(rng() * QUEST_TYPES.length)];
    // 동쪽(오른쪽 열)으로 갈수록 어려워짐: 수량 증가
    let extra = Math.floor(col / 3);
    if (qt.key === 'treasure') extra = col >= 6 ? 1 : 0;
    const count = qt.min + Math.floor(rng() * (qt.max - qt.min + 1)) + extra;
    islands.push({
      idx: i,
      x, y,
      r: 26 + rng() * 14,               // 월드맵에서의 크기
      hue: Math.floor(rng() * 3),        // 월드맵 색 변주
      name: ADJ[i % 10] + ' ' + NOUN[Math.floor(i / 10)],
      stars: 1 + Math.floor(col / 4),    // 난이도 표시 (★1~3)
      quest: { type: qt.key, item: qt.item, action: qt.action, count },
    });
  }

  const TILE = 16;
  const T_DEEP = 0, T_SHALLOW = 1, T_SAND = 2, T_GRASS = 3, T_GRASS_DK = 4;

  // 섬 지형 + 오브젝트 생성 (같은 섬은 항상 같은 모양)
  function generateIsland(meta) {
    const rng = mulberry32(5000 + meta.idx * 104729);
    const W = 46, H = 38;
    const cx = W / 2, cy = H / 2 - 1;
    const p1 = rng() * Math.PI * 2, p2 = rng() * Math.PI * 2;
    const a1 = 0.16 + rng() * 0.14, a2 = 0.07 + rng() * 0.09;
    const base = 12 + rng() * 3;

    const tiles = [];
    for (let y = 0; y < H; y++) {
      const row = [];
      for (let x = 0; x < W; x++) {
        const dx = x - cx, dy = (y - cy) * 1.18;
        const th = Math.atan2(dy, dx);
        const rr = base * (1 + a1 * Math.sin(3 * th + p1) + a2 * Math.sin(7 * th + p2));
        const d = Math.hypot(dx, dy) / rr;
        let t;
        if (d < 0.60) t = (rng() < 0.25 ? T_GRASS_DK : T_GRASS);
        else if (d < 0.68) t = T_GRASS;
        else if (d < 0.97) t = T_SAND;
        else if (d < 1.35) t = T_SHALLOW;
        else t = T_DEEP;
        row.push(t);
      }
      tiles.push(row);
    }

    const isType = (x, y, ...ts) =>
      x >= 0 && y >= 0 && x < W && y < H && ts.includes(tiles[y][x]);

    // 무작위로 조건 맞는 타일 찾기
    function randTile(pred, tries = 400) {
      for (let i = 0; i < tries; i++) {
        const x = 2 + Math.floor(rng() * (W - 4));
        const y = 2 + Math.floor(rng() * (H - 4));
        if (pred(x, y)) return { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 };
      }
      return { x: cx * TILE, y: cy * TILE };
    }

    // 상륙 지점: 남쪽 해변
    let spawn = null;
    outer:
    for (let y = H - 1; y >= 0; y--) {
      for (let dx2 = 0; dx2 < 8; dx2++) {
        const x = Math.floor(cx) + (dx2 % 2 ? 1 : -1) * Math.ceil(dx2 / 2);
        if (isType(x, y, T_SAND)) { spawn = { x: x * TILE + 8, y: y * TILE + 8 }; break outer; }
      }
    }
    if (!spawn) spawn = { x: cx * TILE, y: cy * TILE };
    const raftPos = { x: spawn.x, y: spawn.y + 30 };

    // 장식: 야자수, 바위, 풀
    const solids = [];   // {x, y, r, spr}
    const decos = [];    // {x, y, spr}
    const palmCount = 5 + Math.floor(rng() * 5);
    for (let i = 0; i < palmCount; i++) {
      const p = randTile((x, y) => isType(x, y, T_GRASS, T_GRASS_DK) &&
        !solids.some(s => Math.hypot(s.x - x * TILE, s.y - y * TILE) < 30));
      solids.push({ x: p.x, y: p.y, r: 5, spr: 'palm', ox: -8, oy: -20 });
    }
    for (let i = 0; i < 3 + Math.floor(rng() * 3); i++) {
      const p = randTile((x, y) => isType(x, y, T_SAND, T_GRASS));
      solids.push({ x: p.x, y: p.y, r: 5, spr: 'rock', ox: -5, oy: -4 });
    }
    for (let i = 0; i < 10 + Math.floor(rng() * 8); i++) {
      const p = randTile((x, y) => isType(x, y, T_GRASS, T_GRASS_DK));
      decos.push({ x: p.x, y: p.y, spr: 'tuft' });
    }

    // 퀘스트 아이템 배치
    const q = meta.quest;
    const items = [];   // {x, y, type, taken, vx?, vy?}
    const placeOn = {
      coconut:  (x, y) => isType(x, y, T_GRASS, T_SAND),
      shell:    (x, y) => isType(x, y, T_SAND),
      flower:   (x, y) => isType(x, y, T_GRASS, T_GRASS_DK),
      crab:     (x, y) => isType(x, y, T_SAND),
      starfish: (x, y) => isType(x, y, T_SAND, T_SHALLOW),
      bottle:   (x, y) => isType(x, y, T_SAND),
      treasure: (x, y) => isType(x, y, T_GRASS, T_GRASS_DK),
      wood:     (x, y) => isType(x, y, T_GRASS, T_SAND),
    };
    const itemKey = q.type === 'fire' ? 'wood' : q.type;
    for (let i = 0; i < q.count; i++) {
      const p = randTile((x, y) => placeOn[itemKey](x, y) &&
        !items.some(it => Math.hypot(it.x - x * TILE, it.y - y * TILE) < 40));
      const it = { x: p.x, y: p.y, type: itemKey, taken: false };
      if (itemKey === 'crab') { it.vx = 0; it.vy = 0; it.t = 0; }
      items.push(it);
    }
    let firepit = null;
    if (q.type === 'fire') {
      const p = randTile((x, y) => isType(x, y, T_GRASS));
      firepit = { x: p.x, y: p.y, lit: false };
    }

    return { meta, W, H, tiles, solids, decos, items, firepit, spawn, raftPos };
  }

  return { ISLAND_COUNT, MAP_W, MAP_H, islands, generateIsland, TILE,
           T_DEEP, T_SHALLOW, T_SAND, T_GRASS, T_GRASS_DK };
})();
