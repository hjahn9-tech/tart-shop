// ============================================================
// 검은 수녀단: 로사리오 크로니클 — 데이터 정의
// 층/캐릭터/적/스킬은 전부 여기서 선언한다.
// Lv.50 확장 시 이 파일에 성(城)과 층을 추가하는 것으로 끝나야 한다.
// 3D 모델: KayKit CC0 팩 (assets/)
// ============================================================

export const CHARACTERS = {
  michaela: {
    key: 'michaela', name: '미카엘라', role: '검은 수녀 · 밸런스 딜러',
    angel: '미카엘', portrait: '⚔',
    desc: '로사리오 수녀단 최고의 구마 수녀. 성수와 은십자가를 자유자재로 다룬다.',
    hp: 120, dmg: 14, melee: 24, speed: 8.2,
    model: 'Rogue_Hooded', tint: 0x555560, height: 1.95,
    skills: [
      { id: 'water', name: '성수 투척', icon: '💧', unlock: 1, cd: 0.7, desc: '성수를 던져 원거리 피해' },
      { id: 'smite', name: '십자가 성타', icon: '✝', unlock: 2, cd: 5, desc: '주위의 악마를 강타' },
      { id: 'dash', name: '은빛 연격', icon: '🗡', unlock: 4, cd: 9, desc: '앞으로 파고들며 경로의 적을 벤다' },
      { id: 'ult', name: '미카엘의 검', icon: '📿', unlock: 6, cd: 25, desc: '대천사 미카엘 강림 — 화염검 광역 강타' },
    ],
  },
  raphaela: {
    key: 'raphaela', name: '라파엘라', role: '검은 수녀 · 치유자',
    angel: '라파엘', portrait: '✚',
    desc: '치유의 은사를 받은 수녀. 파티의 생명줄. 동료가 쓰러지기 전에 손을 내민다.',
    hp: 95, dmg: 12, melee: 16, speed: 8.6,
    model: 'Mage', tint: 0xc4bcd0, height: 1.9,
    veil: true, hide: ['Mage_Hat'],
    skills: [
      { id: 'water', name: '성수 투척', icon: '💧', unlock: 1, cd: 0.7, desc: '성수를 던져 원거리 피해' },
      { id: 'smite', name: '십자가 성타', icon: '✝', unlock: 2, cd: 5, desc: '주위의 악마를 강타' },
      { id: 'prayer', name: '치유의 기도', icon: '🙏', unlock: 4, cd: 12, desc: '파티 전원 25% 치유' },
      { id: 'ult', name: '라파엘의 숨결', icon: '📿', unlock: 6, cd: 26, desc: '대천사 라파엘 강림 — 파티 대회복 + 부활' },
    ],
  },
  gabriel: {
    key: 'gabriel', name: '가브리엘', role: '사제 · 수호자',
    angel: '가브리엘', portrait: '🛡',
    desc: '수녀단의 오랜 협력자. 대형 십자가 지팡이로 악마들의 앞을 막아선다.',
    hp: 165, dmg: 10, melee: 20, speed: 7.4,
    model: 'Knight', tint: 0x707078, height: 2.0,
    skills: [
      { id: 'water', name: '성수 투척', icon: '💧', unlock: 1, cd: 0.8, desc: '성수를 던져 원거리 피해' },
      { id: 'smite', name: '십자가 성타', icon: '✝', unlock: 2, cd: 4.5, desc: '주위의 악마를 강타' },
      { id: 'vow', name: '수호 선포', icon: '🛡', unlock: 4, cd: 14, desc: '5초간 파티 피해 50% 감소 + 도발' },
      { id: 'ult', name: '가브리엘의 나팔', icon: '📿', unlock: 6, cd: 24, desc: '대천사 가브리엘 강림 — 보호막 + 악마 경직' },
    ],
  },
};

// 누적 경험치 테이블 (index = 레벨-1). Lv.50 확장 시 뒤에 이어붙인다.
export const LEVEL_XP = [
  0, 50, 130, 240, 380, 550, 750, 980, 1240, 1530,                      // 제1성 (Lv.1~10)
  1850, 2200, 2580, 2990, 3430, 3900, 4400, 4930, 5490, 6080,           // 제2성 (Lv.11~20)
  6700, 7350, 8030, 8740, 9480, 10250, 11050, 11880, 12740, 13630,          // 제3성 (Lv.21~30)
  14550, 15500, 16480, 17490, 18530, 19600, 20700, 21830, 22990, 24180,     // 제4성 (Lv.31~40)
  25400, 26650, 27930, 29240, 30580, 31950, 33350, 34780, 36240, 37730,     // 제5성 (Lv.41~50)
];
export const MAX_LEVEL = 50;

// ---- 축복 강화 (제단) — 십부장/보스가 떨구는 '축복 성수'로 구매, 영구 저장 ----
export const UPGRADES = [
  { key: 'water', name: '성수의 축복', icon: '💧', desc: '성수 피해 +4%', per: 0.04, max: 10 },
  { key: 'life', name: '생명의 축복', icon: '❤', desc: '최대 생명력 +5%', per: 0.05, max: 10 },
  { key: 'cross', name: '십자가의 축복', icon: '✝', desc: '성타·고유기 피해 +4%', per: 0.04, max: 10 },
  { key: 'step', name: '발걸음의 축복', icon: '👣', desc: '이동 속도 +2%', per: 0.02, max: 10 },
  { key: 'spirit', name: '성령의 축복', icon: '🕊', desc: '성령의 회복 +10%', per: 0.10, max: 10 },
];

// ---- 회차(週回) 배율 — cycle 2부터 적용 ----
export const CYCLE = { hp: 0.8, dmg: 0.5, exp: 0.5 }; // 회차당 +80% HP, +50% 공격, +50% EXP

// ---- 성(城) 메타 — 엔딩/성물/다음 성 안내는 여기서 ----
export const CASTLES = [
  {
    name: '벨제붑의 탑', boss: '벨제붑', relic: '양피지 조각',
    clearText: '악마왕 벨제붑이 무너지고, 잠들었던 마을 사람들이 깨어났다.',
    nextName: '아스모데우스의 탑', nextDesc: '색욕의 마왕, 아스모데우스의 성',
    nextDir: '북쪽 바다 건너', travelText: '수녀단의 배가 북쪽 바다를 건넌다.',
  },
  {
    name: '아스모데우스의 탑', boss: '아스모데우스', relic: '장미 문장',
    clearText: '색욕의 마왕이 스러지자 탑을 채우던 달콤한 향기가 걷히고, 홀려 있던 영혼들이 풀려났다.',
    nextName: '레비아탄의 심연', nextDesc: '질투의 마왕, 레비아탄이 잠든 심해의 성',
    nextDir: '서쪽 깊은 바다 아래', travelText: '수녀단은 서쪽 바다 끝으로 향한다.',
  },
  {
    name: '레비아탄의 심연', boss: '레비아탄', relic: '검은 진주',
    clearText: '질투의 마왕이 스러지자 심연이 잠잠해지고, 가라앉았던 배들의 영혼이 수면 위로 떠올랐다.',
    nextName: '마몬의 금광', nextDesc: '탐욕의 마왕, 마몬이 쌓아 올린 황금의 성',
    nextDir: '남쪽 사막의 지하', travelText: '수녀단은 남쪽 사막으로 향한다.',
  },
  {
    name: '마몬의 금광', boss: '마몬', relic: '금 인장',
    clearText: '탐욕의 마왕이 스러지자 황금 산이 빛을 잃고, 갱도에 묶여 있던 광부들의 영혼이 해방되었다.',
    nextName: '루시퍼의 첨탑', nextDesc: '교만의 마왕, 타락한 새벽별 루시퍼의 첨탑',
    nextDir: '세계의 가장 높은 곳', travelText: '수녀단은 마지막 순례길에 오른다 — 하늘에 닿은 첨탑으로.',
  },
  {
    name: '루시퍼의 첨탑', boss: '루시퍼', relic: '새벽별 조각', final: true,
    clearText: '새벽별이 떨어졌다. 일곱 머리의 다섯 왕 — 폭식, 색욕, 질투, 탐욕, 교만이 모두 무너졌다.',
    epilogue: '검은 탑들이 금빛 먼지가 되어 흩어지고, 세상의 아침이 돌아왔다.\n' +
      '로사리오 수녀단의 기록은 여기서 일단 끝난다 —\n그러나 어둠이 다시 일어서는 날, 검은 수녀들도 다시 일어설 것이다.',
  },
];

// ---- 악마의 성 (제1성 — 벨제붑) : 10층 ----
// 기믹 프리미티브: patches / slippery / obstacles / fogNear·fogFar / turrets / illusions / wind / healMult / boss
// 적 공통: model(GLB), tint, sight(시야 — 이 거리 안에 들어오면 어그로)
export const FLOORS = [
  {
    n: 1, name: '가시밭길', ground: 0x6e7e5e, wall: 0x586650,
    intro: '바닥을 뒤덮은 가시 덤불이 발걸음을 붙잡는다.',
    patches: { name: '가시 덤불', count: 8, r: 2.6, dps: 6, slow: 0.45, color: 0x4a6b30 },
    soldiers: { name: '가시 임프', count: 4, hp: 26, dmg: 6, speed: 4.4, exp: 12, model: 'Skeleton_Minion', tint: 0x86b060, sight: 10 },
    decurions: [{ name: '가시의 발라크', hp: 110, dmg: 11, speed: 3.8, scale: 1.5, kind: 'melee', exp: 40, model: 'Skeleton_Warrior', tint: 0x6a9648, sight: 12 }],
  },
  {
    n: 2, name: '독안개 늪', ground: 0x707c50, wall: 0x5a6240,
    intro: '썩은 물웅덩이에서 독기가 피어오른다.',
    fogNear: 24, fogFar: 55,
    patches: { name: '독 웅덩이', count: 7, r: 3.0, dps: 9, slow: 0.7, color: 0x6f8a28 },
    soldiers: { name: '늪 구울', count: 5, hp: 34, dmg: 8, speed: 4.2, exp: 14, model: 'Skeleton_Minion', tint: 0x9aa855, sight: 10 },
    decurions: [{ name: '부패의 아바돈', hp: 160, dmg: 13, speed: 3.7, scale: 1.5, kind: 'ranged', exp: 46, model: 'Skeleton_Mage', tint: 0x9aa040, sight: 13 }],
  },
  {
    n: 3, name: '불구덩이', ground: 0x845844, wall: 0x684030,
    intro: '갈라진 바닥 틈으로 유황불이 끓어오른다.',
    patches: { name: '화염 구덩이', count: 7, r: 2.8, dps: 15, slow: 1.0, color: 0xd45a20 },
    soldiers: { name: '화염 임프', count: 5, hp: 40, dmg: 9, speed: 4.6, exp: 16, model: 'Skeleton_Rogue', tint: 0xd06838, sight: 11 },
    decurions: [{ name: '화염의 몰록', hp: 210, dmg: 15, speed: 3.9, scale: 1.6, kind: 'ranged', exp: 52, model: 'Skeleton_Mage', tint: 0xc85428, sight: 13 }],
  },
  {
    n: 4, name: '냉혹한 얼음바위', ground: 0x92b4cc, wall: 0x7898b0,
    intro: '얼어붙은 바닥이 발밑에서 미끄러지고, 얼음바위가 길을 막는다.',
    slippery: true,
    obstacles: { name: '얼음바위', count: 9, r: 1.8, color: 0x9ec4e0 },
    soldiers: { name: '얼음 병사', count: 5, hp: 48, dmg: 10, speed: 4.3, exp: 18, model: 'Skeleton_Minion', tint: 0x8ab4d8, sight: 11 },
    decurions: [{ name: '서리의 베리트', hp: 260, dmg: 16, speed: 3.8, scale: 1.6, kind: 'melee', exp: 58, model: 'Skeleton_Warrior', tint: 0x74a0c8, sight: 12 }],
  },
  {
    n: 5, name: '어둠의 회랑', ground: 0x484860, wall: 0x363648,
    intro: '한 치 앞도 보이지 않는 어둠. 성령의 금빛만이 주위를 밝힌다.',
    dark: true, fogNear: 18, fogFar: 40,
    soldiers: { name: '그림자 병사', count: 6, hp: 52, dmg: 11, speed: 4.8, exp: 20, model: 'Skeleton_Rogue', tint: 0x4a4a62, sight: 9 },
    decurions: [{ name: '그림자의 말파스', hp: 310, dmg: 17, speed: 4.2, scale: 1.6, kind: 'melee', exp: 64, model: 'Skeleton_Warrior', tint: 0x50506e, sight: 11 }],
  },
  {
    n: 6, name: '피의 예배당', ground: 0xa06670, wall: 0x805058,
    intro: '모독당한 예배당. 저주받은 석상들이 어둠의 화살을 쏘아댄다.',
    turrets: { name: '저주받은 석상', count: 4, dmg: 9, cd: 2.6, color: 0x6a5a60 },
    soldiers: { name: '타락 수도사', count: 5, hp: 58, dmg: 12, speed: 4.4, exp: 22, model: 'Skeleton_Mage', tint: 0x8a5560, sight: 11 },
    decurions: [{ name: '신성모독의 다곤', hp: 360, dmg: 18, speed: 3.9, scale: 1.7, kind: 'ranged', exp: 70, model: 'Skeleton_Mage', tint: 0x9a4050, sight: 13 }],
  },
  {
    n: 7, name: '거울 미궁', ground: 0x8a8ab4, wall: 0x6e6e92,
    intro: '거울 속에서 걸어 나온 환영들이 진짜 악마와 뒤섞여 있다.',
    illusions: { name: '거울 환영', count: 6, dmg: 2, speed: 5.0, exp: 2, model: 'Skeleton_Minion', tint: 0xaaaacc, sight: 10 },
    soldiers: { name: '미궁 병사', count: 4, hp: 64, dmg: 13, speed: 4.5, exp: 24, model: 'Skeleton_Minion', tint: 0x6a6a94, sight: 10 },
    decurions: [{ name: '기만의 벨리알', hp: 410, dmg: 19, speed: 4.0, scale: 1.7, kind: 'ranged', exp: 76, model: 'Skeleton_Mage', tint: 0x7a7ab0, sight: 12 }],
  },
  {
    n: 8, name: '폭풍의 회랑', ground: 0x9098a6, wall: 0x767e8a,
    intro: '주기적으로 몰아치는 돌풍이 몸을 밀어붙인다. 자세를 낮춰라.',
    wind: { calm: 5.0, gust: 1.6, force: 9 },
    soldiers: { name: '바람 정령', count: 6, hp: 70, dmg: 13, speed: 5.2, exp: 26, model: 'Skeleton_Rogue', tint: 0x7a98a8, sight: 12 },
    decurions: [{ name: '폭풍의 파주주', hp: 470, dmg: 20, speed: 4.3, scale: 1.7, kind: 'ranged', exp: 82, model: 'Skeleton_Mage', tint: 0x6a90a8, sight: 13 }],
  },
  {
    n: 9, name: '침묵의 성소', ground: 0x8c80a0, wall: 0x706488,
    intro: '뒤틀린 성역. 기도가 닿지 않아 치유의 힘이 절반으로 줄어든다.',
    healMult: 0.5,
    soldiers: { name: '정예 병사', count: 6, hp: 78, dmg: 14, speed: 4.6, exp: 28, model: 'Skeleton_Warrior', tint: 0x6a5a84, sight: 12 },
    decurions: [
      { name: '침묵의 아모니엘', hp: 380, dmg: 20, speed: 4.4, scale: 1.5, kind: 'melee', exp: 60, model: 'Skeleton_Warrior', tint: 0x8a74a8, sight: 13 },
      { name: '침묵의 카시엘', hp: 380, dmg: 18, speed: 4.0, scale: 1.5, kind: 'ranged', exp: 60, model: 'Skeleton_Mage', tint: 0x705a90, sight: 13, noRelic: true }, // 쌍둥이는 성물 하나 공유
    ],
  },
  {
    n: 10, name: '옥좌의 방', ground: 0x986480, wall: 0x784e66,
    intro: '파리 떼의 날갯소리가 옥좌를 뒤덮는다. 악마왕 벨제붑이 기다린다.',
    soldiers: { name: '파리 병사', count: 2, hp: 30, dmg: 7, speed: 6.4, exp: 8, model: 'Skeleton_Rogue', tint: 0x506030, sight: 14 },
    boss: {
      name: '벨제붑', title: '파리대왕 · 악마의 왕',
      hp: 700, dmg: 20, speed: 4.4, scale: 2.3, exp: 200, sight: 16,
      model: 'Skeleton_Warrior', tint: 0x52405e,
      shootCd: 4.0, enrageShootCd: 2.4,
      summon: { name: '파리 병사', hp: 30, dmg: 7, speed: 6.4, exp: 8, max: 6, cd: 9, model: 'Skeleton_Rogue', tint: 0x506030, sight: 30 },
    },
  },

  // ============================================================
  // 제2성 — 아스모데우스의 탑 (Lv.11~20)
  // 테마: 색욕 — 장미/향수/무도회/거울/욕망
  // 신규 기믹: kind 'charm'(매혹 — 파티원 행동 불능), invert(이동 반전)
  // ============================================================
  {
    n: 1, name: '장미 정원', ground: 0xa87484, wall: 0x8a5a68,
    intro: '핏빛 장미가 탑의 입구를 뒤덮었다. 아름다울수록 가시는 깊다.',
    patches: { name: '장미 가시덤불', count: 8, r: 2.6, dps: 10, slow: 0.45, color: 0xc04060 },
    soldiers: { name: '가시 무희', count: 5, hp: 88, dmg: 15, speed: 4.8, exp: 30, model: 'Skeleton_Rogue', tint: 0xd07890, sight: 11 },
    decurions: [{ name: '장미의 제파르', hp: 540, dmg: 22, speed: 4.0, scale: 1.5, kind: 'melee', exp: 100, model: 'Barbarian', tint: 0xc06a70, sight: 12 }],
  },
  {
    n: 2, name: '향수의 안개', ground: 0x9a7ea0, wall: 0x7e6484,
    intro: '숨을 쉴 때마다 정신이 아득해지는 달콤한 안개가 깔려 있다.',
    fogNear: 22, fogFar: 50,
    patches: { name: '향수 웅덩이', count: 7, r: 3.0, dps: 12, slow: 0.7, color: 0xb070d0 },
    soldiers: { name: '도취된 구울', count: 5, hp: 95, dmg: 16, speed: 4.4, exp: 32, model: 'Skeleton_Minion', tint: 0xb088c0, sight: 11 },
    decurions: [{ name: '향기의 살로스', hp: 580, dmg: 23, speed: 4.0, scale: 1.5, kind: 'ranged', exp: 106, model: 'Skeleton_Mage', tint: 0xa070b8, sight: 13 }],
  },
  {
    n: 3, name: '영원한 무도회장', ground: 0xb0a088, wall: 0x94846e,
    intro: '광이 나는 대리석 바닥 — 멈추고 싶어도 왈츠는 끝나지 않는다.',
    slippery: true,
    soldiers: { name: '홀린 무희', count: 5, hp: 102, dmg: 16, speed: 5.0, exp: 34, kind: 'charm', model: 'Rogue', tint: 0xe098b0, sight: 12 },
    decurions: [{ name: '무도의 벨레스', hp: 620, dmg: 24, speed: 4.2, scale: 1.6, kind: 'melee', exp: 112, model: 'Skeleton_Warrior', tint: 0xc0a878, sight: 12 }],
  },
  {
    n: 4, name: '유혹의 회랑', ground: 0xa87090, wall: 0x8a5876,
    intro: '세이렌의 노랫소리가 회랑을 채운다. 귀를 막아도 심장이 듣는다.',
    soldiers: { name: '세이렌', count: 6, hp: 108, dmg: 17, speed: 4.6, exp: 36, kind: 'charm', model: 'Rogue', tint: 0xe888a8, sight: 12 },
    decurions: [{ name: '유혹의 시트리', hp: 660, dmg: 25, speed: 4.1, scale: 1.6, kind: 'ranged', exp: 118, model: 'Skeleton_Mage', tint: 0xd06a90, sight: 13 }],
  },
  {
    n: 5, name: '뒤집힌 거울방', ground: 0x9ea8b8, wall: 0x828c9c,
    intro: '거울의 저주 — 왼쪽으로 가려 하면 몸이 오른쪽으로 움직인다.',
    invert: true,
    illusions: { name: '거울 환영', count: 6, dmg: 3, speed: 5.2, exp: 3, model: 'Skeleton_Minion', tint: 0xc0c8d8, sight: 11 },
    soldiers: { name: '거울 병사', count: 4, hp: 115, dmg: 17, speed: 4.6, exp: 38, model: 'Skeleton_Minion', tint: 0x98a4b8, sight: 11 },
    decurions: [{ name: '거울의 부알', hp: 700, dmg: 25, speed: 4.1, scale: 1.6, kind: 'ranged', exp: 124, model: 'Skeleton_Mage', tint: 0x8898b0, sight: 13 }],
  },
  {
    n: 6, name: '욕망의 금고', ground: 0xb09a5e, wall: 0x94804c,
    intro: '황금이 산을 이룬 방. 보석 박힌 석상들이 침입자를 노려본다.',
    turrets: { name: '보석 석상', count: 4, dmg: 14, cd: 2.4, color: 0xb89a50 },
    soldiers: { name: '탐욕의 수호자', count: 4, hp: 122, dmg: 18, speed: 4.3, exp: 40, model: 'Barbarian', tint: 0xc8a058, sight: 11 },
    decurions: [{ name: '탐욕의 그레모리', hp: 740, dmg: 26, speed: 4.2, scale: 1.6, kind: 'melee', exp: 130, model: 'Skeleton_Warrior', tint: 0xd0b060, sight: 12 }],
  },
  {
    n: 7, name: '침실의 미궁', ground: 0x585068, wall: 0x443c52,
    intro: '촛불마저 잠든 어둠. 베개 밑에서 몽마들이 기어 나온다.',
    dark: true, fogNear: 18, fogFar: 40,
    soldiers: { name: '몽마', count: 6, hp: 128, dmg: 19, speed: 5.2, exp: 42, kind: 'charm', model: 'Rogue', tint: 0x9070a8, sight: 10 },
    decurions: [{ name: '밤의 인큐부스', hp: 780, dmg: 27, speed: 4.4, scale: 1.7, kind: 'melee', exp: 136, model: 'Skeleton_Warrior', tint: 0x7a6098, sight: 12 }],
  },
  {
    n: 8, name: '꽃보라의 폭풍', ground: 0xa8909a, wall: 0x8a7480,
    intro: '장미 꽃잎의 폭풍이 몰아친다. 아름다움이 시야와 발을 빼앗는다.',
    wind: { calm: 4.5, gust: 1.8, force: 11 },
    soldiers: { name: '꽃잎 정령', count: 6, hp: 135, dmg: 19, speed: 5.4, exp: 44, model: 'Skeleton_Rogue', tint: 0xe0a0b8, sight: 12 },
    decurions: [{ name: '꽃보라의 오세', hp: 820, dmg: 28, speed: 4.4, scale: 1.7, kind: 'ranged', exp: 142, model: 'Skeleton_Mage', tint: 0xc888a0, sight: 13 }],
  },
  {
    n: 9, name: '연인의 성소', ground: 0x9a84a8, wall: 0x7e688c,
    intro: '저주받은 연인이 함께 지키는 성소. 사랑이 뒤틀리면 사슬이 된다.',
    healMult: 0.5,
    soldiers: { name: '정예 몽마', count: 6, hp: 142, dmg: 20, speed: 4.8, exp: 46, kind: 'charm', model: 'Rogue', tint: 0xb87898, sight: 12 },
    decurions: [
      { name: '연인 리리스', hp: 640, dmg: 28, speed: 4.6, scale: 1.5, kind: 'charm', exp: 80, model: 'Rogue', tint: 0xe07090, sight: 13 },
      { name: '연인 나아마', hp: 640, dmg: 26, speed: 4.2, scale: 1.5, kind: 'ranged', exp: 80, model: 'Skeleton_Mage', tint: 0xc06888, sight: 13, noRelic: true },
    ],
  },
  {
    n: 10, name: '아스모데우스의 옥좌', ground: 0xa06078, wall: 0x845062,
    intro: '장미 향이 짙어진다. 색욕의 마왕 아스모데우스가 옥좌에서 미소 짓는다.',
    soldiers: { name: '홀린 무희', count: 2, hp: 60, dmg: 12, speed: 6.0, exp: 12, kind: 'charm', model: 'Rogue', tint: 0xe098b0, sight: 14 },
    boss: {
      name: '아스모데우스', title: '색욕의 마왕 · 장미의 폭군',
      hp: 1500, dmg: 26, speed: 4.6, scale: 2.3, exp: 400, sight: 16,
      model: 'Barbarian', tint: 0xb05868,
      shootCd: 3.5, enrageShootCd: 2.0,
      charm: { cd: 10, dur: 2.2 },
      summon: { name: '홀린 무희', hp: 60, dmg: 12, speed: 6.0, exp: 12, max: 4, cd: 11, kind: 'charm', model: 'Rogue', tint: 0xe098b0, sight: 30 },
    },
  },

  // ============================================================
  // 제3성 — 레비아탄의 심연 (Lv.21~30)
  // 테마: 질투 — 심해/조수/그림자
  // 신규 기믹: whirl(소용돌이 — 중심으로 끌어당김), tide(해일 — 주기적으로 휩쓰는 물의 벽)
  // ============================================================
  {
    n: 1, name: '익사자의 해안', ground: 0x7a98a0, wall: 0x628088,
    intro: '검은 물이 빠져나간 해안. 익사한 자들이 젖은 모래를 밟고 일어선다.',
    patches: { name: '검은 웅덩이', count: 8, r: 2.7, dps: 14, slow: 0.5, color: 0x2a5a6a },
    soldiers: { name: '익사자 구울', count: 5, hp: 150, dmg: 21, speed: 4.4, exp: 48, model: 'Skeleton_Minion', tint: 0x6aa0a8, sight: 11 },
    decurions: [{ name: '익사자의 베파르', hp: 880, dmg: 29, speed: 4.0, scale: 1.6, kind: 'ranged', exp: 150, model: 'Skeleton_Mage', tint: 0x5a90a0, sight: 13 }],
  },
  {
    n: 2, name: '산호 미궁', ground: 0xb08a84, wall: 0x94706a,
    intro: '핏빛 산호가 미로처럼 자라나 길을 막는다.',
    obstacles: { name: '산호 기둥', count: 10, r: 1.7, color: 0xd08a7e },
    soldiers: { name: '산호 게수병', count: 5, hp: 158, dmg: 22, speed: 4.3, exp: 50, model: 'Barbarian', tint: 0xc88a80, sight: 11 },
    decurions: [{ name: '산호의 프로켈', hp: 920, dmg: 30, speed: 4.1, scale: 1.6, kind: 'melee', exp: 156, model: 'Skeleton_Warrior', tint: 0xc07a70, sight: 12 }],
  },
  {
    n: 3, name: '해파리 정원', ground: 0x7e94b0, wall: 0x667a94,
    intro: '빛나는 해파리 떼 — 스치기만 해도 맹독이 온몸을 태운다.',
    fogNear: 26, fogFar: 60,
    patches: { name: '해파리 군락', count: 8, r: 2.5, dps: 20, slow: 0.8, color: 0x7ab0d8 },
    soldiers: { name: '해파리 정령', count: 5, hp: 165, dmg: 22, speed: 4.8, exp: 52, model: 'Skeleton_Rogue', tint: 0x88b8d8, sight: 11 },
    decurions: [{ name: '촉수의 포르네우스', hp: 960, dmg: 31, speed: 4.0, scale: 1.7, kind: 'ranged', exp: 162, model: 'Skeleton_Mage', tint: 0x6a9ac8, sight: 13 }],
  },
  {
    n: 4, name: '소용돌이 회랑', ground: 0x6e8ea8, wall: 0x58748c,
    intro: '바닥 한가운데의 거대한 소용돌이가 모든 것을 심연으로 끌어당긴다.',
    whirl: { r: 13, pull: 4.5, dps: 10 },
    soldiers: { name: '물결 병사', count: 6, hp: 172, dmg: 23, speed: 4.6, exp: 54, model: 'Skeleton_Minion', tint: 0x70a8c0, sight: 12 },
    decurions: [{ name: '소용돌이의 카리브디스', hp: 1000, dmg: 31, speed: 4.2, scale: 1.7, kind: 'melee', exp: 168, model: 'Skeleton_Warrior', tint: 0x5a8ca8, sight: 12 }],
  },
  {
    n: 5, name: '무광층', ground: 0x3e4a5e, wall: 0x2e3848,
    intro: '빛이 닿은 적 없는 심해. 성령의 금빛만이 유일한 등불이다.',
    dark: true, fogNear: 18, fogFar: 40,
    soldiers: { name: '초롱아귀 병사', count: 6, hp: 180, dmg: 24, speed: 5.0, exp: 56, model: 'Skeleton_Rogue', tint: 0x4a5a78, sight: 9 },
    decurions: [{ name: '검은 물의 크로셀', hp: 1040, dmg: 32, speed: 4.3, scale: 1.7, kind: 'melee', exp: 174, model: 'Skeleton_Warrior', tint: 0x3e5068, sight: 11 }],
  },
  {
    n: 6, name: '침몰선 묘지', ground: 0x8a8474, wall: 0x706a5c,
    intro: '가라앉은 함대의 무덤. 난파선의 대포가 아직도 불을 뿜는다.',
    turrets: { name: '난파선 대포', count: 4, dmg: 18, cd: 2.2, color: 0x6a5a48 },
    soldiers: { name: '유령 선원', count: 5, hp: 188, dmg: 24, speed: 4.4, exp: 58, model: 'Skeleton_Minion', tint: 0x9aa89a, sight: 11 },
    decurions: [{ name: '망령 선장 포칼로르', hp: 1080, dmg: 33, speed: 4.1, scale: 1.7, kind: 'ranged', exp: 180, model: 'Skeleton_Mage', tint: 0x7a8a80, sight: 13 }],
  },
  {
    n: 7, name: '질투의 거울바다', ground: 0x8aa0b4, wall: 0x708698,
    intro: '수면이 순례자들을 비추더니 — 물속에서 검은 그림자들이 걸어 나온다.',
    soldiers: { name: '시기하는 물그림자', count: 4, hp: 195, dmg: 25, speed: 4.8, exp: 60, model: 'Skeleton_Rogue', tint: 0x5a7088, sight: 12 },
    decurions: [
      { name: '그림자 미카엘라', hp: 720, dmg: 30, speed: 4.9, scale: 1.2, kind: 'melee', exp: 160, model: 'Rogue_Hooded', tint: 0x3a4a66, sight: 13 },
      { name: '그림자 라파엘라', hp: 640, dmg: 28, speed: 4.5, scale: 1.2, kind: 'ranged', exp: 160, model: 'Mage', tint: 0x3a4a66, sight: 13, noRelic: true },
      { name: '그림자 가브리엘', hp: 860, dmg: 32, speed: 4.2, scale: 1.25, kind: 'melee', exp: 160, model: 'Knight', tint: 0x3a4a66, sight: 13, noRelic: true },
    ],
  },
  {
    n: 8, name: '해일의 성벽', ground: 0x7090a4, wall: 0x5a7688,
    intro: '수평선이 일어선다 — 거대한 해일이 성벽을 주기적으로 휩쓴다.',
    tide: { period: 6, dmg: 22 },
    soldiers: { name: '파도 정령', count: 6, hp: 202, dmg: 26, speed: 5.2, exp: 62, model: 'Skeleton_Rogue', tint: 0x7ab0c8, sight: 12 },
    decurions: [{ name: '해일의 라하브', hp: 1120, dmg: 34, speed: 4.4, scale: 1.8, kind: 'ranged', exp: 186, model: 'Skeleton_Mage', tint: 0x5a94b0, sight: 13 }],
  },
  {
    n: 9, name: '질투의 심장', ground: 0x78a08e, wall: 0x608474,
    intro: '심연의 성소가 초록빛으로 고동친다. 세이렌의 노래가 다시 심장을 붙잡는다.',
    healMult: 0.5,
    soldiers: { name: '심연의 몽마', count: 6, hp: 210, dmg: 26, speed: 4.8, exp: 64, kind: 'charm', model: 'Rogue', tint: 0x6aa088, sight: 12 },
    decurions: [
      { name: '탐식의 스킬라', hp: 800, dmg: 34, speed: 4.6, scale: 1.6, kind: 'melee', exp: 100, model: 'Barbarian', tint: 0x5a9078, sight: 13 },
      { name: '노래하는 로렐라이', hp: 800, dmg: 30, speed: 4.2, scale: 1.6, kind: 'charm', exp: 100, model: 'Rogue', tint: 0x78b098, sight: 13, noRelic: true },
    ],
  },
  {
    n: 10, name: '심연의 왕좌', ground: 0x5a7e94, wall: 0x48667a,
    intro: '바다 전체가 숨을 죽인다. 질투의 마왕 레비아탄이 심연에서 떠오른다.',
    tide: { period: 9, dmg: 20 },
    soldiers: { name: '익사자 구울', count: 2, hp: 90, dmg: 16, speed: 5.8, exp: 16, model: 'Skeleton_Minion', tint: 0x6aa0a8, sight: 14 },
    boss: {
      name: '레비아탄', title: '질투의 마왕 · 심연의 뱀',
      hp: 2400, dmg: 32, speed: 4.6, scale: 2.5, exp: 700, sight: 16,
      model: 'Skeleton_Mage', tint: 0x4a8a9a,
      shootCd: 3.2, enrageShootCd: 1.8,
      summon: { name: '익사자 구울', hp: 90, dmg: 16, speed: 5.8, exp: 16, max: 5, cd: 10, model: 'Skeleton_Minion', tint: 0x6aa0a8, sight: 30 },
    },
  },

  // ============================================================
  // 제4성 — 마몬의 금광 (Lv.31~40)
  // 테마: 탐욕 — 황금/갱도/용광로
  // 신규 기믹: eruption(분화 함정 — 경고 후 폭발), leech(흡혈 — 피해만큼 회복),
  //           charm.gold(황금화 — 미다스의 저주)
  // ============================================================
  {
    n: 1, name: '황금 문턱', ground: 0xb89a5e, wall: 0x9a8050,
    intro: '녹은 황금이 강처럼 흐른다. 발을 디디면 산 채로 도금된다.',
    patches: { name: '녹은 황금', count: 8, r: 2.7, dps: 24, slow: 0.6, color: 0xe0a020 },
    soldiers: { name: '들린 광부', count: 5, hp: 225, dmg: 28, speed: 4.4, exp: 68, model: 'Skeleton_Minion', tint: 0xc0a060, sight: 11 },
    decurions: [{ name: '재물의 클라우네크', hp: 1200, dmg: 36, speed: 4.0, scale: 1.6, kind: 'ranged', exp: 210, model: 'Skeleton_Mage', tint: 0xc8a048, sight: 13 }],
  },
  {
    n: 2, name: '금화 사태 갱도', ground: 0xb0925a, wall: 0x94794a,
    intro: '발밑의 금화가 물결처럼 미끄러지고, 금괴 더미가 길을 막는다.',
    slippery: true,
    obstacles: { name: '금괴 더미', count: 9, r: 1.8, color: 0xd8b050 },
    soldiers: { name: '금괴 운반꾼', count: 5, hp: 232, dmg: 29, speed: 4.3, exp: 70, model: 'Barbarian', tint: 0xc09858, sight: 11 },
    decurions: [{ name: '부(富)의 부네', hp: 1240, dmg: 37, speed: 4.1, scale: 1.6, kind: 'melee', exp: 216, model: 'Skeleton_Warrior', tint: 0xd0a850, sight: 12 }],
  },
  {
    n: 3, name: '갱부들의 굴', ground: 0x9a8468, wall: 0x7e6c54,
    intro: '바닥 곳곳에서 황금 간헐천이 예고 없이 분출한다 — 빛나는 자리를 피하라.',
    eruption: { interval: 5, count: 3, r: 2.6, dmg: 26 },
    soldiers: { name: '갱부 망령', count: 5, hp: 240, dmg: 29, speed: 4.5, exp: 72, model: 'Skeleton_Minion', tint: 0xa89078, sight: 11 },
    decurions: [{ name: '보물 도둑 라움', hp: 1280, dmg: 38, speed: 4.2, scale: 1.6, kind: 'ranged', exp: 222, model: 'Skeleton_Mage', tint: 0xb09468, sight: 13 }],
  },
  {
    n: 4, name: '도둑들의 소굴', ground: 0xa08858, wall: 0x846f48,
    intro: '금화 도둑들 — 훔친 생명으로 제 상처를 메우는 자들이다.',
    soldiers: { name: '금화 도둑', count: 6, hp: 248, dmg: 30, speed: 5.0, exp: 74, leech: 1.2, model: 'Rogue', tint: 0xc8a468, sight: 12 },
    decurions: [{ name: '도둑왕 발레포르', hp: 1320, dmg: 38, speed: 4.4, scale: 1.6, kind: 'melee', exp: 228, leech: 1.0, model: 'Skeleton_Warrior', tint: 0xb89858, sight: 12 }],
  },
  {
    n: 5, name: '지하 금맥', ground: 0x564a3a, wall: 0x42382c,
    intro: '등불이 꺼진 갱도 깊은 곳 — 어둠 속에서 금맥만이 희미하게 빛난다.',
    dark: true, fogNear: 18, fogFar: 40,
    soldiers: { name: '눈먼 갱부', count: 6, hp: 255, dmg: 31, speed: 5.0, exp: 76, model: 'Skeleton_Rogue', tint: 0x8a7858, sight: 9 },
    decurions: [{ name: '보물 은닉자 비프론스', hp: 1360, dmg: 39, speed: 4.3, scale: 1.7, kind: 'melee', exp: 234, model: 'Skeleton_Warrior', tint: 0x7a6a4a, sight: 11 }],
  },
  {
    n: 6, name: '대용광로', ground: 0xa86848, wall: 0x8a543a,
    intro: '산 하나를 녹이는 용광로. 분사구가 쇳물을 뿜어댄다.',
    patches: { name: '쇳물 웅덩이', count: 7, r: 2.6, dps: 30, slow: 1.0, color: 0xe06a20 },
    turrets: { name: '용광로 분사구', count: 4, dmg: 22, cd: 2.2, color: 0x8a4a30 },
    soldiers: { name: '불꽃 주조공', count: 5, hp: 262, dmg: 31, speed: 4.7, exp: 78, model: 'Skeleton_Rogue', tint: 0xd07840, sight: 11 },
    decurions: [{ name: '용광로의 아드라멜렉', hp: 1400, dmg: 40, speed: 4.2, scale: 1.7, kind: 'ranged', exp: 240, model: 'Skeleton_Mage', tint: 0xc06838, sight: 13 }],
  },
  {
    n: 7, name: '황금 우상의 전당', ground: 0xc0a45e, wall: 0xa2884e,
    intro: '연금술사가 만들어낸 황금 허상들의 전당 — 스치는 자를 황금으로 굳힌다.',
    illusions: { name: '황금 허상', count: 6, dmg: 4, speed: 5.0, exp: 4, model: 'Skeleton_Minion', tint: 0xe8cc70, sight: 11 },
    soldiers: { name: '황금 위병', count: 4, hp: 270, dmg: 32, speed: 4.4, exp: 80, model: 'Barbarian', tint: 0xd8b860, sight: 11 },
    decurions: [{ name: '연금술사 하겐티', hp: 1440, dmg: 40, speed: 4.1, scale: 1.7, kind: 'charm', gold: true, exp: 246, model: 'Skeleton_Mage', tint: 0xe0be58, sight: 13 }],
  },
  {
    n: 8, name: '붕괴하는 갱도', ground: 0x8e7e64, wall: 0x746650,
    intro: '갱도 전체가 무너지고 있다 — 천장과 바닥이 쉴 새 없이 터져 나간다.',
    eruption: { interval: 3.5, count: 4, r: 2.8, dmg: 30 },
    soldiers: { name: '낙석 정령', count: 6, hp: 278, dmg: 33, speed: 5.2, exp: 82, model: 'Skeleton_Minion', tint: 0x9a8a70, sight: 12 },
    decurions: [{ name: '낙석의 안드로말리우스', hp: 1480, dmg: 41, speed: 4.4, scale: 1.7, kind: 'melee', exp: 252, model: 'Skeleton_Warrior', tint: 0x8a7a60, sight: 12 }],
  },
  {
    n: 9, name: '채무의 성소', ground: 0xa89068, wall: 0x8c7654,
    intro: '영혼을 저당 잡는 금고지기들의 성소. 기도조차 이자를 뜯긴다.',
    healMult: 0.5,
    soldiers: { name: '정예 위병', count: 6, hp: 285, dmg: 33, speed: 4.6, exp: 84, model: 'Skeleton_Warrior', tint: 0xb09868, sight: 12 },
    decurions: [
      { name: '금고지기 발람', hp: 1050, dmg: 42, speed: 4.6, scale: 1.6, kind: 'melee', exp: 130, leech: 1.0, model: 'Barbarian', tint: 0xc8a858, sight: 13 },
      { name: '기록자 파이몬', hp: 1050, dmg: 38, speed: 4.2, scale: 1.6, kind: 'ranged', exp: 130, model: 'Skeleton_Mage', tint: 0xb89448, sight: 13, noRelic: true },
    ],
  },
  {
    n: 10, name: '마몬의 황금 옥좌', ground: 0xb4924e, wall: 0x967a42,
    intro: '황금 산 꼭대기의 옥좌. 탐욕의 마왕 마몬이 순례자들의 값을 매긴다.',
    eruption: { interval: 6, count: 3, r: 2.6, dmg: 26 },
    soldiers: { name: '금화 도둑', count: 2, hp: 130, dmg: 20, speed: 5.8, exp: 20, leech: 1.2, model: 'Rogue', tint: 0xc8a468, sight: 14 },
    boss: {
      name: '마몬', title: '탐욕의 마왕 · 황금 기사왕',
      hp: 3600, dmg: 38, speed: 4.4, scale: 2.4, exp: 1000, sight: 16,
      model: 'Knight', tint: 0xc8a040,
      shootCd: 3.0, enrageShootCd: 1.7,
      charm: { cd: 11, dur: 2.5, gold: true },
      summon: { name: '금화 도둑', hp: 130, dmg: 20, speed: 5.8, exp: 20, max: 4, cd: 10, leech: 1.2, model: 'Rogue', tint: 0xc8a468, sight: 30 },
    },
  },

  // ============================================================
  // 제5성 — 루시퍼의 첨탑 (Lv.41~50) · 최종장
  // 테마: 교만 — 하늘에 닿은 흰 첨탑, 타락 천사(그리고리)
  // 신규 기믹: falseSpirit(거짓 성령 — 검은 정령이 파티를 잠식)
  // 보스: 2페이즈 (50%에서 타락한 빛의 날개 — 회복 + 강화)
  // ============================================================
  {
    n: 1, name: '첨탑의 문', ground: 0xb8b8c8, wall: 0x9c9cae,
    intro: '구름 위, 흰 대리석의 문. 타락한 빛이 바닥에 고여 있다.',
    patches: { name: '타락한 빛', count: 8, r: 2.7, dps: 30, slow: 0.6, color: 0xd8d0f0 },
    soldiers: { name: '타락 위병', count: 5, hp: 300, dmg: 35, speed: 4.5, exp: 88, model: 'Skeleton_Minion', tint: 0xc8c8dc, sight: 11 },
    decurions: [{ name: '문지기 투리엘', hp: 1550, dmg: 44, speed: 4.1, scale: 1.6, kind: 'melee', exp: 270, model: 'Skeleton_Warrior', tint: 0xbcbcd4, sight: 12 }],
  },
  {
    n: 2, name: '부서진 성가대석', ground: 0xaeaec4, wall: 0x9292a8,
    intro: '무너진 성가대석 — 석상들이 뒤틀린 찬미를 쏘아 보낸다.',
    turrets: { name: '노래하는 석상', count: 4, dmg: 26, cd: 2.1, color: 0xa8a8bc },
    soldiers: { name: '타락 성가대', count: 5, hp: 310, dmg: 36, speed: 4.5, exp: 90, model: 'Skeleton_Mage', tint: 0xb8b0d0, sight: 11 },
    decurions: [{ name: '성가대장 샴시엘', hp: 1590, dmg: 45, speed: 4.1, scale: 1.6, kind: 'ranged', exp: 276, model: 'Skeleton_Mage', tint: 0xc4bce0, sight: 13 }],
  },
  {
    n: 3, name: '별빛 낙하 회랑', ground: 0x9a9ec0, wall: 0x8084a4,
    intro: '하늘에서 별이 떨어진다 — 빛나는 자리에 서 있지 마라.',
    eruption: { interval: 4.5, count: 3, r: 2.7, dmg: 34 },
    soldiers: { name: '유성 정령', count: 5, hp: 320, dmg: 36, speed: 4.8, exp: 92, model: 'Skeleton_Rogue', tint: 0x9aa2d0, sight: 11 },
    decurions: [{ name: '유성의 코카비엘', hp: 1630, dmg: 46, speed: 4.2, scale: 1.7, kind: 'ranged', exp: 282, model: 'Skeleton_Mage', tint: 0x8a94cc, sight: 13 }],
  },
  {
    n: 4, name: '거짓 성령의 방', ground: 0xa8a0c0, wall: 0x8c84a4,
    intro: '금빛 정령 곁에 — 그것을 흉내 낸 검은 정령이 파티를 따라붙는다.',
    falseSpirit: { dps: 4 },
    soldiers: { name: '모조 천사', count: 5, hp: 330, dmg: 37, speed: 4.6, exp: 94, model: 'Skeleton_Minion', tint: 0x9a8ab8, sight: 11 },
    decurions: [{ name: '모방자 페넴우에', hp: 1670, dmg: 47, speed: 4.2, scale: 1.7, kind: 'ranged', exp: 288, model: 'Skeleton_Mage', tint: 0x8a7aac, sight: 13 }],
  },
  {
    n: 5, name: '오만의 어둠', ground: 0x4a4a5e, wall: 0x38384a,
    intro: '새벽별이 모든 빛을 삼켰다. 성령의 금빛만이 길을 밝힌다.',
    dark: true, fogNear: 18, fogFar: 40,
    soldiers: { name: '빛 잃은 천사', count: 6, hp: 340, dmg: 38, speed: 5.1, exp: 96, model: 'Skeleton_Rogue', tint: 0x5a5a74, sight: 9 },
    decurions: [{ name: '어둠의 사리엘', hp: 1710, dmg: 47, speed: 4.3, scale: 1.7, kind: 'melee', exp: 294, model: 'Skeleton_Warrior', tint: 0x4e4e66, sight: 11 }],
  },
  {
    n: 6, name: '유리 바다', ground: 0xa9c4cc, wall: 0x8ba8b2,
    intro: '수정처럼 매끄러운 유리 바닥 위에서 거울 천사들이 미끄러져 온다.',
    slippery: true,
    illusions: { name: '유리 천사', count: 6, dmg: 5, speed: 5.2, exp: 5, model: 'Skeleton_Minion', tint: 0xd0e4ec, sight: 11 },
    soldiers: { name: '수정 병사', count: 4, hp: 350, dmg: 38, speed: 4.6, exp: 98, model: 'Skeleton_Minion', tint: 0xa0c0cc, sight: 11 },
    decurions: [{ name: '기만의 아르마로스', hp: 1750, dmg: 48, speed: 4.2, scale: 1.7, kind: 'melee', exp: 300, model: 'Skeleton_Warrior', tint: 0x8ab0bc, sight: 12 }],
  },
  {
    n: 7, name: '심판의 법정', ground: 0xb4aa96, wall: 0x988e7a,
    intro: '"네가 감히?" — 심판관들의 속삭임이 심장을 꿰뚫어 발을 묶는다.',
    soldiers: { name: '속삭이는 심판관', count: 6, hp: 360, dmg: 39, speed: 4.7, exp: 100, kind: 'charm', model: 'Rogue', tint: 0xb0a088, sight: 12 },
    decurions: [{ name: '심판관 바라키엘', hp: 1790, dmg: 49, speed: 4.3, scale: 1.7, kind: 'ranged', exp: 306, model: 'Skeleton_Mage', tint: 0xa89678, sight: 13 }],
  },
  {
    n: 8, name: '첨탑의 폭풍', ground: 0x8a92ae, wall: 0x6e7692,
    intro: '세계의 꼭대기 — 폭풍이 몰아치고 별이 쏟아진다.',
    wind: { calm: 4.0, gust: 1.8, force: 13 },
    eruption: { interval: 5.5, count: 3, r: 2.6, dmg: 30 },
    soldiers: { name: '폭풍 천사', count: 6, hp: 372, dmg: 40, speed: 5.4, exp: 102, model: 'Skeleton_Rogue', tint: 0x8a96c0, sight: 12 },
    decurions: [{ name: '폭풍의 아자젤', hp: 1840, dmg: 50, speed: 4.5, scale: 1.8, kind: 'ranged', exp: 312, model: 'Skeleton_Mage', tint: 0x7a88b8, sight: 13 }],
  },
  {
    n: 9, name: '새벽별의 성소', ground: 0xb0a8cc, wall: 0x948cb0,
    intro: '그리고리의 수장들이 마지막 계단을 지킨다. 기도가 절반만 닿는다.',
    healMult: 0.5,
    falseSpirit: { dps: 5 },
    soldiers: { name: '그리고리 정예', count: 6, hp: 385, dmg: 41, speed: 4.8, exp: 105, model: 'Skeleton_Warrior', tint: 0xa89cc4, sight: 12 },
    decurions: [
      { name: '대천사장 세미하자', hp: 1350, dmg: 52, speed: 4.6, scale: 1.7, kind: 'melee', exp: 165, model: 'Skeleton_Warrior', tint: 0xb8accc, sight: 13 },
      { name: '죽음의 사마엘', hp: 1350, dmg: 48, speed: 4.2, scale: 1.7, kind: 'ranged', exp: 165, model: 'Skeleton_Mage', tint: 0x9a8cc0, sight: 13, noRelic: true },
    ],
  },
  {
    n: 10, name: '하늘의 왕좌', ground: 0xc0bcd4, wall: 0xa4a0b8,
    intro: '"나는 가장 높은 곳에 오르리라" — 타락한 새벽별이 왕좌에서 일어선다.',
    eruption: { interval: 6, count: 3, r: 2.7, dmg: 30 },
    soldiers: { name: '타락천사', count: 2, hp: 180, dmg: 26, speed: 5.6, exp: 26, kind: 'ranged', model: 'Skeleton_Mage', tint: 0xd0cce0, sight: 14 },
    boss: {
      name: '루시퍼', title: '교만의 마왕 · 타락한 새벽별',
      hp: 5000, dmg: 44, speed: 4.5, scale: 2.6, exp: 1500, sight: 16,
      model: 'Knight', tint: 0xdcdcec,
      shootCd: 2.8, enrageShootCd: 1.5,
      charm: { cd: 9, dur: 2 },
      phase2Heal: 0.2,
      phase2Text: '루시퍼가 타락한 빛의 날개를 펼친다 — 새벽별의 힘이 되살아난다!',
      summon: { name: '타락천사', hp: 180, dmg: 26, speed: 5.6, exp: 26, max: 4, cd: 10, kind: 'ranged', model: 'Skeleton_Mage', tint: 0xd0cce0, sight: 30 },
    },
  },
];
