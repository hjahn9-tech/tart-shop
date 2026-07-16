// 도트 스프라이트를 문자열 배열로 정의하고 오프스크린 캔버스로 굽는다.
const Sprites = (() => {

  function make(rows, pal) {
    const h = rows.length, w = rows[0].length;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); }
      }
    });
    return c;
  }

  // ---- 주인공 아일라 (12x16) ----
  const GIRL_PAL = {
    H: '#7a4a2b',  // 머리카락
    h: '#9c6238',  // 머리 하이라이트
    F: '#ffd9a8',  // 피부
    E: '#3a2b21',  // 눈
    P: '#ff9eb0',  // 볼터치
    T: '#ff6b81',  // 상의 (코랄)
    t: '#e85570',  // 상의 그림자
    S: '#4a80e8',  // 반바지
    B: '#8a5a33',  // 신발
    R: '#ffca3a',  // 머리끈 (노랑)
  };

  const girlDownA = make([
    '...hHHHHh...',
    '..HHHHHHHH..',
    '.HHHHHHHHHH.',
    '.HHFFFFFFHH.',
    '.HHFEFFEFHH.',
    '..FFFFFFFF..',
    '..PFFFFFFP..',
    '...TTTTTT...',
    '..TTTtTTTT..',
    '.FTTTTTTTTF.',
    '.FTTTtTTTTF.',
    '..SSSSSSSS..',
    '..SS....SS..',
    '..FF....FF..',
    '..FF....FF..',
    '..BB....BB..',
  ], GIRL_PAL);

  const girlDownB = make([
    '...hHHHHh...',
    '..HHHHHHHH..',
    '.HHHHHHHHHH.',
    '.HHFFFFFFHH.',
    '.HHFEFFEFHH.',
    '..FFFFFFFF..',
    '..PFFFFFFP..',
    '...TTTTTT...',
    '..TTTtTTTT..',
    '.FTTTTTTTTF.',
    '.FTTTtTTTTF.',
    '..SSSSSSSS..',
    '...SS..SS...',
    '...FF..FF...',
    '...FF..FF...',
    '...BB..BB...',
  ], GIRL_PAL);

  const girlUpA = make([
    '...hHHHHh...',
    '..HHHHHHHH..',
    '.HHHHHHHHHH.',
    '.HHHHRRHHHH.',
    '.HHHHHHHHHH.',
    '..HHHHHHHH..',
    '...HHHHHH...',
    '...TTTTTT...',
    '..TTTTTTTT..',
    '.FTTTTTTTTF.',
    '.FTTTTTTTTF.',
    '..SSSSSSSS..',
    '..SS....SS..',
    '..FF....FF..',
    '..FF....FF..',
    '..BB....BB..',
  ], GIRL_PAL);

  const girlUpB = make([
    '...hHHHHh...',
    '..HHHHHHHH..',
    '.HHHHHHHHHH.',
    '.HHHHRRHHHH.',
    '.HHHHHHHHHH.',
    '..HHHHHHHH..',
    '...HHHHHH...',
    '...TTTTTT...',
    '..TTTTTTTT..',
    '.FTTTTTTTTF.',
    '.FTTTTTTTTF.',
    '..SSSSSSSS..',
    '...SS..SS...',
    '...FF..FF...',
    '...FF..FF...',
    '...BB..BB...',
  ], GIRL_PAL);

  // 왼쪽 바라봄 (오른쪽은 뒤집어 그림) — 뒤로 묶은 포니테일이 오른쪽에
  const girlSideA = make([
    '...hHHHHh...',
    '..HHHHHHHH..',
    '.HHHHHHHHHR.',
    '.FFFFFHHHHH.',
    '.FEFFFHHHH..',
    '.FFFFFHHH...',
    '.PFFFFHH....',
    '...TTTTTT...',
    '..TTTTTTT...',
    '..FTTTTtT...',
    '..TTTTTTT...',
    '..SSSSSS....',
    '..SS..SS....',
    '..FF..FF....',
    '..FF..FF....',
    '..BB..BB....',
  ], GIRL_PAL);

  const girlSideB = make([
    '...hHHHHh...',
    '..HHHHHHHH..',
    '.HHHHHHHHHR.',
    '.FFFFFHHHHH.',
    '.FEFFFHHHH..',
    '.FFFFFHHH...',
    '.PFFFFHH....',
    '...TTTTTT...',
    '..TTTTTTT...',
    '..FTTTTtT...',
    '..TTTTTTT...',
    '..SSSSSS....',
    '...SSSS.....',
    '..FF..FF....',
    '.FF....FF...',
    '.BB....BB...',
  ], GIRL_PAL);

  // ---- 야자수 (16x22) ----
  const palm = make([
    '....GGG.gGG.....',
    '..GGggGGGGGGg...',
    '.GgGGGGgGGGGGG..',
    '.GGG.GGGGG.gGG..',
    'gG...GgGGG...GG.',
    '.....GCGCG......',
    '.....gGGGg......',
    '......TTT.......',
    '......TtT.......',
    '......TTT.......',
    '.....TtTT.......',
    '.....TTT........',
    '.....TtT........',
    '....TTTT........',
    '....TtT.........',
    '....TTT.........',
    '....TTTT........',
    '...TTTtTT.......',
  ], { G: '#2fae5b', g: '#5ed47f', C: '#7a4a2b', T: '#9c6238', t: '#b97f4b' });

  // ---- 아이템들 ----
  const coconut = make([
    '.CCCC.',
    'CCcCCC',
    'CCCCcC',
    'CcCCCC',
    'CCCCCC',
    '.CCCC.',
  ], { C: '#8a5a33', c: '#a8744a' });

  const shell = make([
    '..PPP..',
    '.PWPWP.',
    'PWPWPWP',
    'PPWPWPP',
    '.PPPPP.',
    '..PPP..',
  ], { P: '#ff9eb0', W: '#ffe3ea' });

  const flower = make([
    '.RR.RR.',
    'RRRYRRR',
    '.RYYYR.',
    'RRRYRRR',
    '.RR.RR.',
    '...G...',
    '..GG...',
    '...G...',
  ], { R: '#ff5d8f', Y: '#ffca3a', G: '#2fae5b' });

  const starfish = make([
    '...OO...',
    '...OO...',
    'OOOooOOO',
    '.OOooOO.',
    '..OOOO..',
    '.OO..OO.',
    'OO....OO',
  ], { O: '#ff8c42', o: '#ffb26b' });

  const bottle = make([
    '..KK..',
    '..GG..',
    '.GggG.',
    '.GgWG.',
    '.GWgG.',
    '.GggG.',
    '.GGGG.',
  ], { G: '#7fd8be', g: '#a9e8d8', W: '#fff6d8', K: '#8a5a33' });

  const chest = make([
    '.BBBBBBBBBB.',
    'BbbbbbbbbbbB',
    'BbBBBBBBBBbB',
    'BBBBYYBBBBBB',
    'BbbbYYbbbbbB',
    'BbbbbbbbbbbB',
    'BbBBBBBBBBbB',
    '.BBBBBBBBBB.',
  ], { B: '#8a5a33', b: '#b97f4b', Y: '#ffca3a' });

  const chestOpen = make([
    '.BBBBBBBBBB.',
    'BYYYYYYYYYYB',
    'BYyYYyYYyYYB',
    'BBBBBBBBBBBB',
    'BbbbYYbbbbbB',
    'BbbbbbbbbbbB',
    'BbBBBBBBBBbB',
    '.BBBBBBBBBB.',
  ], { B: '#8a5a33', b: '#b97f4b', Y: '#ffca3a', y: '#fff6a8' });

  const crab = make([
    'C..CCCC..C',
    '.C.CcCC.C.',
    '..CCCCCC..',
    '.CCWCCWCC.',
    '..CCCCCC..',
    '.C.C..C.C.',
    'C..C..C..C',
  ], { C: '#ff5d5d', c: '#ff8f8f', W: '#ffffff' });

  const wood = make([
    '.WWWWWWW',
    'WwWWwWWW',
    'WWWWWWw.',
  ], { W: '#9c6238', w: '#b97f4b' });

  const firepit = make([
    '....SS....',
    '..S....S..',
    '.S..WW..S.',
    'S..WWWW..S',
    '.S..WW..S.',
    '..S....S..',
  ], { S: '#8d8d9e', W: '#9c6238' });

  const fireLit = make([
    '....yy....',
    '...yYYy...',
    '..yYOOYy..',
    '.yYOOOOYy.',
    'S.YOOOOY.S',
    'S..WWWW..S',
    '.S..WW..S.',
    '..S....S..',
  ], { S: '#8d8d9e', W: '#7a4a2b', O: '#ff8c42', Y: '#ffca3a', y: '#fff6a8' });

  const rock = make([
    '...SSSS....',
    '..SsssSS...',
    '.SsssssSS..',
    'SsssssssSS.',
    'SSssssssSS.',
    '.SSSSSSSS..',
  ], { S: '#8d8d9e', s: '#b8b8c8' });

  const tuft = make([
    'g.g.g.',
    '.ggg.g',
    'g.g.g.',
  ], { g: '#5ed47f' });

  // ---- 뗏목 (항해용, 18x16) ----
  const raft = make([
    '........M.........',
    '........M.WWWWW...',
    '........M.WWWWw...',
    '........M.WWWw....',
    '........M.WWw.....',
    '........M.Ww......',
    '........M.........',
    '........M.........',
    '.TTTTTTTTTTTTTTT..',
    'TtTTtTTTtTTTTtTTT.',
    'TTTTTTTTTTTTTTTTT.',
    'TtTTTtTTTTtTTtTTT.',
    '.TTTTTTTTTTTTTTT..',
  ], { T: '#9c6238', t: '#b97f4b', M: '#7a4a2b', W: '#fff6d8', w: '#ffd9a8' });

  // 섬에 세워둔 뗏목 (돛 없이)
  const raftParked = make([
    '.TTTTTTTTTTTT..',
    'TtTTtTTTtTTtTT.',
    'TTTTTTTTTTTTTT.',
    'TtTTTtTTtTTTTT.',
    '.TTTTTTTTTTTT..',
  ], { T: '#9c6238', t: '#b97f4b' });

  const flag = make([
    'M.....',
    'MRRRR.',
    'MRRR..',
    'MRR...',
    'M.....',
    'M.....',
    'M.....',
    'M.....',
    'M.....',
    'M.....',
  ], { M: '#7a4a2b', R: '#ff5d5d' });

  const sparkle = make([
    '..Y..',
    '.YyY.',
    'YyWyY',
    '.YyY.',
    '..Y..',
  ], { Y: '#ffca3a', y: '#fff6a8', W: '#ffffff' });

  const seagull = make([
    'W...W',
    '.W.W.',
    '..W..',
  ], { W: '#ffffff' });

  // ---- 타일 (16x16) ----
  function makeTile(base, specks, speckColors, seed) {
    const c = document.createElement('canvas');
    c.width = 16; c.height = 16;
    const g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 16, 16);
    let s = seed;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < specks; i++) {
      g.fillStyle = speckColors[Math.floor(rnd() * speckColors.length)];
      g.fillRect(Math.floor(rnd() * 16), Math.floor(rnd() * 16), 1, 1);
    }
    return c;
  }

  const tiles = {
    deepA:    makeTile('#1e6fd0', 10, ['#2a80e0', '#1a5fb8'], 11),
    deepB:    makeTile('#1e6fd0', 10, ['#3d92ec', '#1a5fb8'], 77),
    shallowA: makeTile('#3ec6e0', 12, ['#6fdcef', '#2fb4d2'], 23),
    shallowB: makeTile('#3ec6e0', 12, ['#a5ecf7', '#2fb4d2'], 91),
    sand:     makeTile('#f7e08c', 14, ['#ffedb0', '#e8c86a'], 37),
    grass:    makeTile('#4cc95e', 14, ['#67e078', '#3bb04c'], 53),
    grassDk:  makeTile('#3bb04c', 14, ['#4cc95e', '#2f9c40'], 67),
  };

  return {
    girl: {
      down: [girlDownA, girlDownB],
      up: [girlUpA, girlUpB],
      side: [girlSideA, girlSideB],
    },
    palm, coconut, shell, flower, starfish, bottle,
    chest, chestOpen, crab, wood, firepit, fireLit,
    rock, tuft, raft, raftParked, flag, sparkle, seagull,
    tiles,
  };
})();
