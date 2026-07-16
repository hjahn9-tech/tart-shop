// ============================================================
// 사운드 — 전부 WebAudio 실시간 합성 (외부 파일 없음)
// BGM: 홀리 액션 배틀 테마 — Dm→B♭→F→C, 132 BPM
//      오르간 패드 + 대성당 리버브 + 드라이빙 베이스/드럼 + 아르페지오
// ============================================================
let ctx = null;
let master = null;
let windGain = null;
let reverb = null;
let reverbSend = null;
let melodyDelay = null;
let schedTimer = null;
let nextT = 0;
let stepN = 0;

const BPM = 132;
const BEAT = 60 / BPM;
const STEP = BEAT / 2; // 8분음표
const n2f = (m) => 440 * Math.pow(2, (m - 69) / 12);

// 코드 진행: Dm — B♭ — F — C (미디 노트)
const PROG = [
  { root: 38, pad: [50, 53, 57, 62], arp: [62, 65, 69, 74] }, // Dm
  { root: 34, pad: [46, 50, 53, 58], arp: [58, 62, 65, 70] }, // B♭
  { root: 41, pad: [53, 57, 60, 65], arp: [65, 69, 72, 77] }, // F
  { root: 36, pad: [48, 52, 55, 60], arp: [60, 64, 67, 72] }, // C
];
// 마디 내 아르페지오 패턴 (-1 = 쉼표)
const ARP_PATT = [0, 2, 1, 3, 0, 3, 2, -1];

export function initAudio() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0.38;
  master.connect(ctx.destination);
  startMusic();
}

// ---------- 대성당 리버브 (노이즈 임펄스) ----------
function makeReverb() {
  const len = Math.floor(ctx.sampleRate * 2.0);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
  }
  const cv = ctx.createConvolver();
  cv.buffer = buf;
  return cv;
}

// ---------- 스케줄드 신스 보이스 ----------
function oscAt(t, { freq, dur, type = 'sine', vol = 0.2, slideTo = null, dest = master, attack = 0.008 }) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest);
  o.start(t); o.stop(t + dur + 0.05);
}
function noiseAt(t, { dur, freq, q = 1, vol = 0.2, type = 'bandpass' }) {
  const len = Math.ceil(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

// 드럼
const kick = (t) => oscAt(t, { freq: 150, slideTo: 45, dur: 0.16, type: 'sine', vol: 0.5 });
const snare = (t) => { noiseAt(t, { dur: 0.13, freq: 1900, q: 0.7, vol: 0.16 }); oscAt(t, { freq: 190, dur: 0.08, type: 'triangle', vol: 0.1 }); };
const hat = (t, open) => noiseAt(t, { dur: open ? 0.09 : 0.045, freq: 7500, q: 0.6, vol: 0.05, type: 'highpass' });

// 베이스 — 질주하는 8분음표
function bassNote(f, t) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 520;
  o.type = 'sawtooth';
  o.frequency.value = f;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.17, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + STEP * 0.95);
  o.connect(lp).connect(g).connect(master);
  o.start(t); o.stop(t + STEP);
}

// 오르간 패드 — 성가대의 벽 (마디 지속, 리버브로)
function padChord(midis, t, dur) {
  for (const m of midis) {
    const f = n2f(m);
    for (const [mult, type, v] of [[1, 'sine', 0.05], [1.003, 'sawtooth', 0.018], [2, 'sine', 0.02]]) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 1100;
      o.type = type;
      o.frequency.value = f * mult;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(v, t + 0.22);
      g.gain.setValueAtTime(v, t + dur - 0.3);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(lp).connect(g);
      g.connect(reverbSend);
      g.connect(master);
      o.start(t); o.stop(t + dur + 0.1);
    }
  }
}

// 멜로디 아르페지오 — 딜레이 에코로 대성당 느낌
function melody(f, t) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'triangle';
  o.frequency.value = f;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.13, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  o.connect(g);
  g.connect(master);
  g.connect(melodyDelay);
  o.start(t); o.stop(t + 0.35);
}

// 종 — 마디 액센트
function bellNote(f, t) {
  oscAt(t, { freq: f, dur: 2.4, type: 'sine', vol: 0.09, dest: reverbSend, attack: 0.005 });
  oscAt(t, { freq: f * 2.76, dur: 1.1, type: 'sine', vol: 0.03, dest: reverbSend, attack: 0.005 });
}

// ---------- 시퀀서 ----------
function scheduleStep(s, t) {
  const bar = Math.floor(s / 8);
  const i = s % 8;
  const chord = PROG[bar % 4];
  const calm = bar % 16 >= 14; // 16마디마다 2마디 브레이크 (숨 고르기)

  if (!calm) {
    if (i === 0 || i === 4) kick(t);
    if (i === 2 || i === 6) snare(t);
    hat(t, i % 2 === 1);
    bassNote(n2f(chord.root + ((i === 3 || i === 7) ? 12 : 0)), t);
  } else {
    if (i === 0) kick(t);
    if (i % 2 === 0) bassNote(n2f(chord.root), t);
  }
  if (i === 0) {
    padChord(chord.pad, t, BEAT * 4);
    if (bar % 4 === 0) bellNote(n2f(chord.pad[3] + 12), t);
  }
  const idx = ARP_PATT[i];
  if (idx >= 0 && !calm) melody(n2f(chord.arp[idx]), t);
  if (calm && (i === 0 || i === 4)) melody(n2f(chord.arp[i === 0 ? 0 : 2]), t);
}

function startMusic() {
  reverb = makeReverb();
  const wet = ctx.createGain();
  wet.gain.value = 0.5;
  reverb.connect(wet).connect(master);
  reverbSend = ctx.createGain();
  reverbSend.gain.value = 1;
  reverbSend.connect(reverb);

  melodyDelay = ctx.createDelay(1);
  melodyDelay.delayTime.value = STEP * 1.5; // 점8분 에코
  const fb = ctx.createGain();
  fb.gain.value = 0.32;
  melodyDelay.connect(fb).connect(melodyDelay);
  const dwet = ctx.createGain();
  dwet.gain.value = 0.5;
  melodyDelay.connect(dwet).connect(reverbSend);

  // 밤바람 (setNight로 조절)
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const wind = ctx.createBufferSource();
  wind.buffer = buf; wind.loop = true;
  const wf = ctx.createBiquadFilter();
  wf.type = 'lowpass'; wf.frequency.value = 400;
  windGain = ctx.createGain();
  windGain.gain.value = 0;
  wind.connect(wf).connect(windGain).connect(master);
  wind.start();

  // 룩어헤드 스케줄러 (탭이 가려져 타이머가 느려져도 1.4초 선행 예약)
  nextT = ctx.currentTime + 0.1;
  stepN = 0;
  schedTimer = setInterval(() => {
    while (nextT < ctx.currentTime + 1.4) {
      scheduleStep(stepN, nextT);
      stepN++;
      nextT += STEP;
    }
  }, 200);
}

export function setNight(night) {
  if (windGain) windGain.gain.linearRampToValueAtTime(night ? 0.04 : 0, ctx.currentTime + 3);
}

// ---------- 효과음 (즉시 재생) ----------
function tone({ freq, dur = 0.3, type = 'sine', vol = 0.3, slideTo = null, delay = 0 }) {
  if (!ctx) return;
  oscAt(ctx.currentTime + delay, { freq, dur, type, vol, slideTo });
}
function noiseBurst({ dur = 0.2, freq = 1200, q = 1, vol = 0.25, delay = 0 }) {
  if (!ctx) return;
  noiseAt(ctx.currentTime + delay, { dur, freq, q, vol });
}

export const sfx = {
  throw() { noiseBurst({ dur: 0.12, freq: 2400, vol: 0.1 }); },
  splash() { noiseBurst({ dur: 0.22, freq: 1400, q: 0.8, vol: 0.18 }); tone({ freq: 500, dur: 0.15, type: 'sine', vol: 0.08, slideTo: 300 }); },
  smite() { tone({ freq: 880, dur: 0.5, type: 'triangle', vol: 0.2 }); tone({ freq: 1318, dur: 0.7, type: 'sine', vol: 0.12, delay: 0.04 }); },
  hit() { noiseBurst({ dur: 0.1, freq: 300, q: 0.6, vol: 0.22 }); },
  hurt() { tone({ freq: 220, dur: 0.15, type: 'square', vol: 0.08, slideTo: 150 }); },
  death() { tone({ freq: 300, dur: 0.5, type: 'sawtooth', vol: 0.12, slideTo: 60 }); noiseBurst({ dur: 0.35, freq: 500, vol: 0.1 }); },
  aggro() { tone({ freq: 130, dur: 0.3, type: 'sawtooth', vol: 0.14, slideTo: 75 }); },
  levelup() { [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.4, type: 'triangle', vol: 0.14, delay: i * 0.09 })); },
  unlock() { [659, 880].forEach((f, i) => tone({ freq: f, dur: 0.3, type: 'triangle', vol: 0.12, delay: i * 0.1 })); },
  ult() { // 성가대 코드
    [220, 277.2, 329.6, 440].forEach((f) => { tone({ freq: f, dur: 2.2, type: 'sine', vol: 0.1 }); tone({ freq: f * 1.005, dur: 2.2, type: 'sine', vol: 0.07 }); });
    noiseBurst({ dur: 1.2, freq: 4000, q: 0.4, vol: 0.04 });
  },
  heal() { tone({ freq: 660, dur: 0.5, type: 'sine', vol: 0.09 }); tone({ freq: 990, dur: 0.6, type: 'sine', vol: 0.05, delay: 0.08 }); },
  portal() { [440, 554, 659, 880, 1108].forEach((f, i) => tone({ freq: f, dur: 1.2, type: 'sine', vol: 0.08, delay: i * 0.12 })); },
  grace() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ freq: f, dur: 1.6, type: 'sine', vol: 0.1, delay: i * 0.06 })); },
  select() { tone({ freq: 660, dur: 0.12, type: 'triangle', vol: 0.1 }); },
  charm() { tone({ freq: 1046, dur: 0.45, type: 'sine', vol: 0.1, slideTo: 523 }); tone({ freq: 1318, dur: 0.55, type: 'sine', vol: 0.06, delay: 0.08, slideTo: 659 }); },
  tide() { noiseBurst({ dur: 1.4, freq: 260, q: 0.5, vol: 0.28 }); tone({ freq: 130, dur: 1.2, type: 'sine', vol: 0.14, slideTo: 55 }); },
  eruption() { noiseBurst({ dur: 0.35, freq: 420, q: 0.6, vol: 0.3 }); tone({ freq: 90, dur: 0.3, type: 'sine', vol: 0.25, slideTo: 40 }); },
  petrify() { tone({ freq: 1568, dur: 0.5, type: 'triangle', vol: 0.14 }); tone({ freq: 784, dur: 0.35, type: 'square', vol: 0.06, delay: 0.05, slideTo: 392 }); },
};
