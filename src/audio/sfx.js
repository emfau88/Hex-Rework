// Tiny synthesised sound set. No audio files; everything is built from oscillators and noise.

export class Sfx {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.last = {};
  }

  /** Browsers only allow audio after a tap; call this from the first input. */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.42;
        this.master.connect(this.ctx.destination);
      } catch {
        this.ctx = null;
      }
    } else if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  tone(freq, dur, { type = 'sine', gain = 0.2, delay = 0, slide = 0 } = {}) {
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.008); // an exponential ramp must never target 0
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noise(dur, { gain = 0.2, cutoff = 900, delay = 0 } = {}) {
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(filter).connect(g).connect(this.master);
    src.start(t);
  }

  /** @param {number} level 1 for the player's own actions, lower for distant events */
  play(name, level = 1) {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running' || !(level > 0)) return;
    const now = this.ctx.currentTime;
    if (now - (this.last[name] || 0) < 0.06) return;
    this.last[name] = now;
    const v = level;
    switch (name) {
      case 'select':
        this.tone(620, 0.05, { type: 'triangle', gain: 0.1 * v });
        break;
      case 'send':
        this.tone(392, 0.09, { type: 'triangle', gain: 0.16 * v });
        this.tone(587, 0.11, { type: 'triangle', gain: 0.14 * v, delay: 0.06 });
        break;
      case 'capture':
        this.tone(659, 0.13, { type: 'triangle', gain: 0.17 * v });
        this.tone(988, 0.2, { type: 'sine', gain: 0.13 * v, delay: 0.07 });
        break;
      case 'lost':
        this.tone(330, 0.16, { type: 'triangle', gain: 0.16 * v, slide: 0.6 });
        break;
      case 'repel':
        this.noise(0.12, { gain: 0.2 * v, cutoff: 700 });
        this.tone(130, 0.14, { gain: 0.2 * v, slide: 0.55 });
        break;
      case 'build':
        this.tone(220, 0.05, { type: 'square', gain: 0.07 * v });
        this.tone(262, 0.05, { type: 'square', gain: 0.07 * v, delay: 0.1 });
        this.tone(523, 0.18, { type: 'triangle', gain: 0.14 * v, delay: 0.2 });
        break;
      case 'castle':
        this.noise(0.5, { gain: 0.3 * v, cutoff: 420 });
        this.tone(82, 0.7, { gain: 0.34 * v, slide: 0.5 });
        for (const [i, f] of [220, 277, 330].entries()) this.tone(f, 0.7, { type: 'triangle', gain: 0.1 * v, delay: 0.12 + i * 0.04 });
        break;
      case 'stomp':
        // The stone giant's foot comes down: a deep thud.
        this.noise(0.3, { gain: 0.3 * v, cutoff: 260 });
        this.tone(55, 0.4, { gain: 0.36 * v, slide: 0.5 });
        break;
      case 'alarm':
        this.tone(740, 0.12, { type: 'square', gain: 0.07 });
        this.tone(740, 0.12, { type: 'square', gain: 0.07, delay: 0.18 });
        break;
      case 'storm':
        this.noise(1.2, { gain: 0.22, cutoff: 500 });
        this.tone(110, 1.1, { type: 'sawtooth', gain: 0.07, slide: 0.7 });
        break;
      case 'victory':
        for (const [i, f] of [523, 659, 784, 1047].entries()) this.tone(f, 0.38, { type: 'triangle', gain: 0.18, delay: i * 0.13 });
        break;
      case 'defeat':
        for (const [i, f] of [392, 330, 262, 196].entries()) this.tone(f, 0.42, { type: 'triangle', gain: 0.17, delay: i * 0.17 });
        break;
      default:
    }
  }
}
