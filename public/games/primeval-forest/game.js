// 태고의 숲 — 순수 게임 로직 (index.html과 node 자가검증 공용)
const SPECIES = {
  jogak:   { name: '티노', tier: 1 },
  binyl:   { name: '뿔이', tier: 1 },
  komul:   { name: '목긴이', tier: 1 },
  ttuk:    { name: '파닥이', tier: 2 },
  nunal:   { name: '가시돌이', tier: 2 },
  bansong: { name: '렉스왕', tier: 3 },
}
const RATE = { 1: 1, 2: 4, 3: 15 }        // 분당 전리품
const BOX_INTERVAL_MS = 5 * 60 * 1000
const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000
const MAX_ZOMBIES = 12

const tierOf = id => SPECIES[id].tier
const byTier = t => Object.keys(SPECIES).filter(id => SPECIES[id].tier === t)

function lootRate(zombies) {              // 분당
  return zombies.reduce((s, id) => s + RATE[tierOf(id)], 0)
}

function offlineLoot(zombies, elapsedMs) {
  return lootRate(zombies) * Math.min(elapsedMs, OFFLINE_CAP_MS) / 60000
}

// 초반 페이싱 램프: 부화 횟수에 따라 다음 알까지의 간격
function eggInterval(hatches) {
  return [30e3, 60e3, 120e3, 180e3][hatches] ?? BOX_INTERVAL_MS
}

// 1티어 첫 합체는 싸게 시작해 점증, 2티어는 고정
function mergeCost(state, tier) {
  if (tier === 1) return [20, 60][state.merges1 || 0] ?? 100
  return 500
}

function canMerge(state, tier) {
  return byTier(tier + 1).length > 0
    && state.zombies.filter(id => tierOf(id) === tier).length >= 2
    && state.loot >= mergeCost(state, tier)
}

// state를 직접 변경, 태어난 공룡 id 반환. 미보유 종 우선(pity)
function doMerge(state, tier, rng) {
  if (!canMerge(state, tier)) return null
  let removed = 0
  state.zombies = state.zombies.filter(id => tierOf(id) !== tier || ++removed > 2)
  state.loot -= mergeCost(state, tier)
  if (tier === 1) state.merges1 = (state.merges1 || 0) + 1
  const all = byTier(tier + 1)
  const missing = all.filter(id => !(state.dex && state.dex[id]))
  const pool = missing.length ? missing : all
  const born = pool[Math.floor(rng() * pool.length)]
  state.zombies.push(born)
  return born
}

// node game.js → 자가검증
if (typeof window === 'undefined') {
  const assert = require('assert')
  assert.equal(offlineLoot(['jogak', 'ttuk'], 60000), 5)
  assert.equal(offlineLoot(['jogak'], OFFLINE_CAP_MS * 2), 480)   // 8시간 캡
  assert.equal(eggInterval(0), 30000)                             // 램프 시작
  assert.equal(eggInterval(4), BOX_INTERVAL_MS)                   // 램프 종료
  const s = { loot: 100, zombies: ['jogak', 'binyl', 'komul'], dex: {} }
  assert.equal(mergeCost(s, 1), 20)                               // 첫 합체 할인
  assert.equal(doMerge(s, 1, () => 0), 'ttuk')
  assert.equal(s.loot, 80)
  assert.equal(mergeCost(s, 1), 60)                               // 비용 램프
  s.dex.ttuk = true
  s.zombies.push('jogak')
  assert.equal(doMerge(s, 1, () => 0), 'nunal')                   // pity: 미보유 종 우선
  assert.equal(s.loot, 20)
  assert(!canMerge(s, 1))                                         // 1티어 소진
  assert(!canMerge(s, 2))                                         // 전리품 부족
  assert(!canMerge(s, 3))                                         // 최고 티어는 합체 불가
  console.log('ok')
}
