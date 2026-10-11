// AlgoNook — tiny WebAudio synth for UI feedback. No libraries.
// Lazily creates one AudioContext; every sound is a short oscillator blip.

let ctx = null;
let enabled = true;

export function setSoundEnabled(v) {
  enabled = v;
}

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, { type = 'square', gain = 0.05, when = 0, slide = 0 } = {}) {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  select: () => tone(660, 0.06, { type: 'square', gain: 0.03 }),
  correct: () => { tone(523, 0.09); tone(784, 0.12, { when: 0.08 }); },
  wrong: () => tone(160, 0.22, { type: 'sawtooth', gain: 0.05, slide: -60 }),
  hint: () => tone(440, 0.08, { type: 'sine', gain: 0.04 }),
  unlock: () => { tone(392, 0.1); tone(523, 0.1, { when: 0.09 }); tone(659, 0.16, { when: 0.18 }); },
  levelup: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, { when: i * 0.09 })); },
  boot: () => tone(220, 0.3, { type: 'sawtooth', gain: 0.03, slide: 220 }),
  tick: () => tone(880, 0.03, { type: 'square', gain: 0.02 }),
  push: () => tone(500, 0.05, { type: 'triangle', gain: 0.05 }),
  pop: () => tone(330, 0.06, { type: 'triangle', gain: 0.05 }),
};
