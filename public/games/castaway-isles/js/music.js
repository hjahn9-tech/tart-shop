// 칩튠 배경음악 — WebAudio 시퀀서 (8분음표 스텝, 0 = 쉼표)
const Music = (() => {
  let ctx = null, timer = null, cur = null, step = 0, nextT = 0;
  let muted = false;
  const freq = m => 440 * Math.pow(2, (m - 69) / 12);

  const TRACKS = {
    sail: {   // 경쾌한 항해 테마
      bpm: 138,
      melody: [72,0,69,67, 69,0,64,0, 67,69,67,64, 62,0,60,0,
               64,67,69,72, 74,0,72,69, 67,0,69,67, 64,0,62,0],
      bass:   [48,0,52,0, 45,0,48,0, 43,0,47,0, 48,0,43,0,
               48,0,52,0, 45,0,48,0, 43,0,47,0, 48,0,48,0],
    },
    island: { // 아늑한 섬 테마
      bpm: 92,
      melody: [64,0,67,0, 72,0,0,69, 67,0,64,0, 62,0,60,0,
               64,0,67,0, 69,0,0,72, 67,0,62,0, 60,0,0,0],
      bass:   [48,0,0,0, 45,0,0,0, 43,0,0,0, 48,0,0,0,
               48,0,0,0, 45,0,0,0, 43,0,0,0, 43,0,0,0],
    },
  };

  function ensure() {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  }

  function note(m, t, dur, type, vol) {
    const o = ctx.createOscillator(), gn = ctx.createGain();
    o.type = type; o.frequency.value = freq(m);
    gn.gain.setValueAtTime(vol, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(gn); gn.connect(ctx.destination);
    o.start(t); o.stop(t + dur);
  }

  function tickLoop() {
    const tr = TRACKS[cur];
    if (!tr) return;
    const spb = 60 / tr.bpm / 2;
    while (nextT < ctx.currentTime + 0.2) {
      const i = step % tr.melody.length;
      if (tr.melody[i]) note(tr.melody[i], nextT, spb * 1.8, 'square', 0.045);
      if (tr.bass[i]) note(tr.bass[i], nextT, spb * 3.5, 'triangle', 0.07);
      nextT += spb; step++;
    }
  }

  function play(name) {
    cur = name;
    if (muted) return;
    try {
      ensure();
      step = 0; nextT = ctx.currentTime + 0.05;
      if (!timer) timer = setInterval(tickLoop, 90);
    } catch (e) {}
  }

  function toggle() {
    muted = !muted;
    if (muted) { if (timer) { clearInterval(timer); timer = null; } }
    else if (cur) play(cur);
    return muted;
  }

  return { play, toggle, get muted() { return muted; } };
})();
