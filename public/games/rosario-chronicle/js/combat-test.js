// 결정론 전투 테스트 — index.html?combat-test 로 실행
// 합성 프레임(__rc.frame)으로 시뮬레이션을 직접 구동한다. rAF 불필요(탭 hidden에서도 동작).
const rc = window.__rc;
const results = [];
function check(name, cond, detail = '') {
  results.push({ name, pass: !!cond });
  console.log(`[combat-test] ${cond ? 'PASS' : 'FAIL'} — ${name}${detail ? ' (' + detail + ')' : ''}`);
}

let T = 1000;
function step(sec) {
  const n = Math.max(1, Math.round(sec / 0.016));
  for (let i = 0; i < n; i++) { T += 16; rc.frame(T); }
}

function waitFor(cond, timeout = 20000) {
  return new Promise((res, rej) => {
    const t0 = Date.now();
    const iv = setInterval(() => {
      if (cond()) { clearInterval(iv); res(); }
      else if (Date.now() - t0 > timeout) { clearInterval(iv); rej(new Error('timeout')); }
    }, 100);
  });
}

function spawnTestEnemy(x, z, over = {}) {
  const e = new rc.Enemy({
    name: '시험 병사', model: 'Skeleton_Minion', tint: 0x86b060,
    hp: 100000, dmg: 10, speed: 0, sight: 40, exp: 0, ...over,
  }, x, z);
  e.state = 'aggro';
  rc.game.enemies.push(e);
  return e;
}

function clearField() {
  const g = rc.game;
  for (const e of [...g.enemies]) g.floorGroup.remove(e.mesh);
  g.enemies.length = 0;
  g.projectiles.length = 0;
  g.patches.length = 0;   // 바닥 도트 차단
  g.turrets.length = 0;
  g.wind = null;
  g.spirit = null;        // 성령 회복 개입 차단
  g.pending.length = 0;
  g.telegraphs.length = 0;
  g.hitstopT = 0;
  g.reserveSpawn = null;
}

function resetPlayer(p) {
  p.pos.set(0, 0, 0); p.vel.set(0, 0, 0);
  p.hp = p.maxhp; p.dodgeT = 0; p.dodgeCd = 0;
}

(async () => {
  const g = rc.game;
  const F = rc.FEEL;
  // 테스트가 실제 세이브를 오염시키지 않도록 백업 → 종료 시 복원
  const savedProgress = localStorage.getItem('rosario_save');
  const restoreSave = () => {
    if (savedProgress === null) localStorage.removeItem('rosario_save');
    else localStorage.setItem('rosario_save', savedProgress);
  };
  await waitFor(() => g.state === 'title');
  rc.stopAutoFrame();
  rc.startGame('michaela');
  await waitFor(() => g.state === 'play');
  const tut = document.getElementById('tut-card');
  if (tut) tut.style.display = 'none'; // 테스트 중 온보딩 카드 제거
  const p = g.player;
  for (const u of g.party) if (u !== p) { u.alive = false; u.mesh.visible = false; } // 동료 개입 차단
  g.graceUsed = true; // 성령 부활 차단
  T = performance.now() + 50; // 실제 rAF 타임스탬프에 이어붙임 — 첫 프레임 음수 dt 방지
  step(0.032); // 워밍업

  // ---- 1. 무적 창 단위 판정 (damage()의 권위적 게이트) ----
  clearField(); resetPlayer(p);
  p.dodgeT = F.dodge.total - 0.1; // 경과 0.1s — 무적 창 안
  p.damage(50);
  check('무적 창 안 피해 무시', p.hp === p.maxhp);
  p.dodgeT = F.dodge.total - (F.dodge.iframeEnd + 0.08); // recovery 구간
  p.damage(50);
  check('무적 창 밖(recovery) 피해 적용', p.hp === p.maxhp - 50);

  // ---- 2. 실전 경로: 텔레그래프 → 즉시 회피 → 무피해 ----
  clearField(); resetPlayer(p);
  spawnTestEnemy(0, 1.0);
  step(0.032); // 공격 개시 → 텔레그래프
  check('공격 개시 시 텔레그래프 생성', g.telegraphs.length === 1);
  g.keys.ShiftLeft = true; step(0.032); g.keys.ShiftLeft = false;
  step(0.8); // 접촉 시점(0.55s) 경과
  check('회피 롤로 접촉 회피 (무피해)', p.hp === p.maxhp, `hp=${p.hp}/${p.maxhp}`);

  // ---- 3. 회피 없으면 정확히 atk만큼 피해 ----
  clearField(); resetPlayer(p);
  spawnTestEnemy(0, 1.0);
  step(0.8);
  check('회피 없으면 접촉 피해 적용', p.hp === p.maxhp - 10, `hp=${p.hp}/${p.maxhp}`);

  // ---- 4. 윈드업 중 사거리 이탈 → 접촉 실패 (권위적 재검증) ----
  clearField(); resetPlayer(p);
  spawnTestEnemy(0, 1.0);
  step(0.1);
  p.pos.set(12, 0, 0); // 윈드업 중 이탈
  step(0.8);
  check('윈드업 중 이탈 시 접촉 실패', p.hp === p.maxhp, `hp=${p.hp}`);

  // ---- 5. 회피 쿨다운 경계 ----
  clearField(); resetPlayer(p);
  g.keys.KeyW = true;
  g.keys.ShiftLeft = true; step(0.032); g.keys.ShiftLeft = false;
  check('회피 시작', p.dodgeT > 0);
  step(F.dodge.total + 0.05);
  check('롤 종료 후 쿨다운 잔존', p.dodgeT <= 0 && p.dodgeCd > 0, `cd=${p.dodgeCd.toFixed(2)}`);
  g.keys.ShiftLeft = true; step(0.032); g.keys.ShiftLeft = false;
  check('쿨다운 중 회피 불가', p.dodgeT <= 0);
  g.keys.KeyW = false;

  // ---- 6. 히트스톱 — 시뮬레이션 감속 ----
  clearField(); resetPlayer(p);
  const e6 = spawnTestEnemy(10, 10, { dmg: 0 });
  e6.atkT = 1.0;
  g.hitstopT = 0.2;
  const before = e6.atkT;
  step(0.016);
  const dropped = before - e6.atkT;
  check('히트스톱 중 시뮬 감속', dropped < 0.016 * 0.5, `atkT 감소 ${dropped.toFixed(4)}s`);

  // ==== 스프린트2: 무브 시스템 ====

  // ---- 7. charge — 직선 텔레그래프 + 경로 접촉 1회 ----
  clearField(); resetPlayer(p);
  let e = spawnTestEnemy(0, 8, { moves: ['charge'] });
  step(0.032);
  check('charge 직선 텔레그래프 생성', g.telegraphs.length === 1);
  step(1.8); // 윈드업 0.7 + 질주 0.75 + 여유
  check('charge 경로 접촉 정확히 1회 (15피해)', p.hp === p.maxhp - 15, `hp=${p.hp}/${p.maxhp}`);

  // ---- 8. charge — 측면 회피로 경로 이탈 ----
  clearField(); resetPlayer(p);
  e = spawnTestEnemy(0, 8, { moves: ['charge'] });
  step(0.1); // 윈드업 시작 (방향 고정됨)
  g.keys.KeyA = true; g.keys.ShiftLeft = true; step(0.032); g.keys.ShiftLeft = false;
  step(0.5); g.keys.KeyA = false; // 측면 롤로 폭 밖 이탈
  step(1.5);
  check('charge 측면 회피 시 무피해', p.hp === p.maxhp, `hp=${p.hp}`);

  // ---- 9. slam — 착지점 링 + AoE, 이탈 시 회피 ----
  clearField(); resetPlayer(p);
  e = spawnTestEnemy(0, 6, { moves: ['slam'] });
  step(0.032);
  check('slam 착지점 링 텔레그래프 생성', g.telegraphs.length === 1 && g.telegraphs[0].world === true);
  step(1.6); // 윈드업 0.9 + 도약 0.28 + 여유
  check('slam 착지 AoE 피해 (13.5)', p.hp === p.maxhp - 13.5, `hp=${p.hp}/${p.maxhp}`);
  clearField(); resetPlayer(p);
  e = spawnTestEnemy(0, 6, { moves: ['slam'] });
  step(0.2); // 착지점 고정 후
  p.pos.set(12, 0, 0);
  step(1.6);
  check('slam 링 밖 이탈 시 무피해', p.hp === p.maxhp, `hp=${p.hp}`);

  // ---- 10. combo — 2히트, 대상당 1회씩 ----
  clearField(); resetPlayer(p);
  e = spawnTestEnemy(0, 1.0, { moves: ['combo'] });
  step(1.4); // 윈드업 0.5 + 2타 0.35 + 여유
  check('combo 2히트 합산 피해 (7+12)', p.hp === p.maxhp - 19, `hp=${p.hp}/${p.maxhp}`);
  check('combo 사용 후 쿨다운 잔존', (e.moveCd.combo || 0) > 0, `cd=${(e.moveCd.combo || 0).toFixed(2)}`);

  // ---- 11. 2웨이브 증원 ----
  clearField(); resetPlayer(p);
  e = spawnTestEnemy(5, 5, { hp: 10 });
  g.reserveSpawn = { spec: { name: '증원 병사', model: 'Skeleton_Minion', hp: 10, dmg: 5, speed: 0, sight: 40, exp: 0 }, n: 2 };
  e.damage(99999, true);
  check('예비 병력 2웨이브 증원', g.enemies.length === 2, `enemies=${g.enemies.length}`);

  // ==== 스프린트3: 벽 · 시선 · fog of war ====
  const WALL = { x: 0, z: 5, w: 6, d: 1.3 };

  // ---- 12. 벽 슬랩 시선 판정 (순수 함수) ----
  clearField(); resetPlayer(p);
  g.walls = [WALL];
  check('벽 너머 시선 차단', rc.sightBlocked(0, 0, 0, 10) === true);
  check('벽 옆 시선 통과', rc.sightBlocked(8, 0, 8, 10) === false);
  check('벽까지 레이 거리', Math.abs(rc.castWallRay(0, 0, 0, 1, 14) - 4.35) < 0.01, `d=${rc.castWallRay(0, 0, 0, 1, 14).toFixed(2)}`);

  // ---- 13. 벽 충돌 — 뚫고 지나갈 수 없다 ----
  clearField(); resetPlayer(p);
  g.walls = [WALL];
  g.keys.KeyS = true; step(2.0); g.keys.KeyS = false; // 남쪽(+z) 벽으로 전진
  check('벽 통과 불가', !rc.pointInWall(p.pos.x, p.pos.z, 0.3), `pos=(${p.pos.x.toFixed(1)},${p.pos.z.toFixed(1)})`);
  check('벽 앞에서 정지', p.pos.z < WALL.z - WALL.d / 2, `z=${p.pos.z.toFixed(2)}`);

  // ---- 14. 벽 뒤 적은 어그로 없음 ----
  clearField(); resetPlayer(p);
  g.walls = [WALL];
  e = spawnTestEnemy(0, 9, { sight: 30 });
  e.state = 'idle';
  step(0.5);
  check('벽 뒤 적 어그로 차단', e.state === 'idle');
  g.walls = [];
  step(0.1);
  check('벽 제거 시 어그로', e.state === 'aggro');

  // ---- 15. 어둠 층 fog — 벽 뒤 적 은닉 + 타겟 락 해제 ----
  clearField(); resetPlayer(p);
  g.walls = [WALL];
  const floors = (await import('./data.js')).FLOORS;
  const savedDark = floors[g.floorIdx].dark;
  floors[g.floorIdx].dark = true;
  e = spawnTestEnemy(0, 9, { sight: 30 });
  g.target = e;
  step(0.1);
  check('어둠 층 벽 뒤 적 은닉', e.revealed === false && e.mesh.visible === false);
  check('은닉 시 타겟 락 해제', g.target === null);
  e.pos.set(8, 0, 3); // 벽 옆 개활지로
  step(0.1);
  check('시선 확보 시 공개', e.revealed === true && e.mesh.visible === true);
  floors[g.floorIdx].dark = savedDark;
  g.walls = [];

  // ==== 스프린트4: 성구 장비 — 손실 경계 ====
  const RELICS = (await import('./data.js')).RELICS;

  // ---- 16. 획득 보존 + 중복 카운트 ----
  clearField(); resetPlayer(p);
  g.relics = {}; g.equip = { weapon: null, armor: null, rosary: null };
  rc.grantRelic('w1'); rc.grantRelic('w1'); rc.grantRelic('a1');
  check('획득 수량 보존 (w1×2, a1×1)', g.relics.w1 === 2 && g.relics.a1 === 1);

  // ---- 17. 미소유 장착 거부 ----
  check('미소유 성구 장착 거부', rc.equipRelic('u5') === false && g.equip.rosary === null);

  // ---- 18. 장착 스왑 — 기존 장비 소유 보존 ----
  rc.grantRelic('w2');
  rc.equipRelic('w1');
  check('장착', g.equip.weapon === 'w1');
  rc.equipRelic('w2'); // 스왑
  check('스왑 후 슬롯 교체', g.equip.weapon === 'w2');
  check('스왑해도 기존 성구 보존', g.relics.w1 === 2 && g.relics.w2 === 1);
  rc.equipRelic('w2'); // 재클릭 = 해제
  check('재클릭 해제', g.equip.weapon === null && g.relics.w2 === 1);

  // ---- 19. 효과 적용/해제 — 피해·생명·회피쿨 ----
  rc.equipRelic('w1'); // 피해 +6%
  check('무기 피해 배율', Math.abs(rc.relicM('dmg') - 1.06) < 1e-9);
  e = spawnTestEnemy(10, 10);
  const ehp = e.hp;
  e.damage(100);
  check('가해 피해에 성구 반영 (106)', Math.abs(ehp - e.hp - 106) < 0.01, `dealt=${(ehp - e.hp).toFixed(1)}`);
  const baseMax = p.maxhp;
  rc.equipRelic('a1'); // 생명 +8%
  check('방어구 생명 재계산', p.maxhp === Math.round(p.baseMax * 1.08), `maxhp=${p.maxhp}`);
  rc.equipRelic('a1'); // 해제
  check('해제 시 생명 원복', p.maxhp === baseMax);
  rc.grantRelic('r1'); rc.equipRelic('r1'); // 회피쿨 -8%
  p.dodgeT = 0; p.dodgeCd = 0;
  g.keys.ShiftLeft = true; step(0.032); g.keys.ShiftLeft = false;
  check('묵주 회피 쿨다운 감소', p.dodgeCd > 0 && p.dodgeCd <= rc.FEEL.dodge.cd * 0.92 + 0.001, `cd=${p.dodgeCd.toFixed(3)}`);
  step(1.5); // 롤/쿨 정리

  // ---- 20. 세이브 마이그레이션 (v1 → v2) ----
  g.relics = { w3: 1 }; g.equip = { weapon: 'w3', armor: null, rosary: null };
  rc.migrateSave({ upgrades: { water: 1 }, blessings: 5, cycle: 1 }); // v1 스냅샷 (성구 필드 없음)
  check('v1 세이브 로드 무손상', g.upgrades.water === 1 && g.blessings === 5);
  check('v1 → 성구 기본값', Object.keys(g.relics).length === 0 && g.equip.weapon === null);
  rc.migrateSave({ relics: { a2: 1 }, equip: { weapon: 'a2', armor: 'ghost', rosary: null } }); // 오염 장비
  check('불법 장비 ID 방어적 해제', g.equip.weapon === null && g.equip.armor === null && g.relics.a2 === 1);
  g.relics = {}; g.equip = { weapon: null, armor: null, rosary: null };
  rc.applyRelicStats();

  // ==== 스프린트5: 터치 입력 · 풀링 ====

  // ---- 21. 가상 조이스틱/버튼 입력 병합 ----
  clearField(); resetPlayer(p);
  g.touchInput.ix = 1; g.touchInput.iz = 0;
  step(0.5);
  check('조이스틱 이동 반영', p.pos.x > 1, `x=${p.pos.x.toFixed(1)}`);
  g.touchInput.ix = 0;
  g.touchInput.dodgePulse = true;
  step(0.032);
  check('회피 버튼 → 롤 시작', p.dodgeT > 0);
  check('회피 펄스 1회 소모', g.touchInput.dodgePulse === false);
  g.touchInput.skillPulse[0] = true;
  step(0.032);
  check('스킬 펄스 소모', g.touchInput.skillPulse[0] === false);
  step(2); // 롤/쿨 정리

  // ---- 22. 스프라이트 풀 재사용 ----
  rc.impactEffect(p.pos, 0xffffff, 6);
  step(0.6); // 만료 → 반납 (생성 시 풀에서 꺼내므로 순증가가 아니라 왕복)
  const pool1 = rc.spritePoolSize();
  check('이펙트 만료 시 풀 반납', pool1 >= 6, `pool=${pool1}`);
  rc.impactEffect(p.pos, 0xffffff, 6);
  const pool2 = rc.spritePoolSize();
  check('재생성 시 풀에서 재사용', pool2 <= pool1 - 6, `${pool1}→${pool2}`);
  step(0.6);

  // ==== 스프린트6: 밸런스 회귀 어서션 ====
  const dataMod = await import('./data.js');
  let cum = 0;
  dataMod.FLOORS.forEach((Fl) => {
    if (Fl.soldiers) cum += Fl.soldiers.count * (Fl.soldiers.exp || 0);
    if (Fl.decurions) cum += Fl.decurions.reduce((s2, d2) => s2 + (d2.exp || 0), 0);
    if (Fl.boss) cum += Fl.boss.exp || 0;
  });
  check('XP 곡선: 몰살 시 Lv.50 도달 가능', cum >= dataMod.LEVEL_XP[49], `${cum}/${dataMod.LEVEL_XP[49]}`);
  check('회피 경제: 쿨다운 > 최속 공격 주기(1.4s)', F.dodge.cd > 1.4, `cd=${F.dodge.cd}`);
  check('난이도: 후반 성 공격 배율 존재', dataMod.CASTLE_DMG[4] > 1.2, `x${dataMod.CASTLE_DMG[4]}`);
  check('무브셋: combo 실배정됨', dataMod.defaultMoves({ decurion: true, kind: 'melee' }).includes('combo'));

  // ---- 매혹 카운터플레이 ----
  clearField(); resetPlayer(p);
  p.charmT = 0; p.charmResistT = 0;
  p.dodgeT = F.dodge.total - 0.1; // 무적 창
  rc.applyCharm(p, 2);
  check('매혹: 롤 무적으로 회피', p.charmT === 0);
  p.dodgeT = 0;
  rc.applyCharm(p, 2);
  check('매혹: 무방비 시 적용 + 내성 부여', p.charmT > 0 && p.charmResistT > 2, `resist=${p.charmResistT.toFixed(1)}`);
  p.charmT = 0;
  rc.applyCharm(p, 2);
  check('매혹: 내성 중 재매혹 차단', p.charmT === 0);
  p.charmResistT = 0;

  // ==== 스프린트7: 보스 킷 · 접촉 매혹 ====
  const badRef = dataMod.BOSS_KITS.flatMap((k) => [...k.moves, ...k.phase2]).filter((id) => !dataMod.MOVES[id]);
  check('보스 킷 무브 참조 전부 유효', badRef.length === 0, badRef.join(',') || 'ok');
  check('보스 킷 5성 전부 정의', dataMod.BOSS_KITS.length === 5);

  clearField(); resetPlayer(p);
  p.charmT = 0; p.charmResistT = 0;
  e = spawnTestEnemy(0, 8, { moves: ['charmDash'] }); // 아스모데우스 시그니처
  step(2.2); // 윈드업 0.8 + 질주 경로 접촉
  check('시그니처 접촉 매혹 적용', p.charmT > 0 || p.charmResistT > 0, `charm=${p.charmT.toFixed(2)} resist=${p.charmResistT.toFixed(1)}`);
  p.charmT = 0; p.charmResistT = 0;

  restoreSave();
  const fails = results.filter((r) => !r.pass).length;
  console.log(`[combat-test] ${results.length - fails}/${results.length} PASS`);
  document.title = fails === 0 ? 'COMBAT-TEST PASS' : `COMBAT-TEST FAIL(${fails})`;
  window.__combatTest = { results, fails };
})().catch((err) => {
  console.error('[combat-test] ERROR', err);
  document.title = 'COMBAT-TEST ERROR';
  window.__combatTest = { error: String(err) };
});
