// Dźwięki syntezowane w Web Audio: bez plików, bez licencji.
// Przeglądarka wymaga gestu użytkownika, więc kontekst powstaje przy pierwszym klawiszu.

/** @typedef {import('../game/types.js').GameEvent} GameEvent */

export class Sfx {
  constructor() {
    /** @type {AudioContext | null} */
    this.ctx = null;
    /** @type {GainNode | null} */
    this.master = null;
    this.muted = false;
    /** @type {AudioBuffer | null} */
    this.noiseBuffer = null;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.25;
      this.master.connect(this.ctx.destination);

      const len = this.ctx.sampleRate * 0.5;
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.25;
    return this.muted;
  }

  tone({ freq, to = freq, dur = 0.1, type = /** @type {OscillatorType} */ ('square'), vol = 0.4, delay = 0 }) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noise({ dur = 0.3, vol = 0.5, freq = 1200, delay = 0 }) {
    if (!this.ctx || !this.master || !this.noiseBuffer) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq, t);
    filter.frequency.exponentialRampToValueAtTime(80, t + dur);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  /** @param {'shoot' | 'sword' | 'eat' | 'hit' | 'bounce' | 'warp' | 'wall' | 'clash' | 'die' | 'beep' | 'go' | 'round' | 'win'} name */
  play(name) {
    switch (name) {
      case 'shoot':
        this.tone({ freq: 880, to: 220, dur: 0.08, vol: 0.25 });
        break;
      case 'sword':
        // Świst ostrza: szum opadający i szybko rosnący ton
        this.noise({ dur: 0.35, vol: 0.45, freq: 5000 });
        this.tone({ freq: 220, to: 1400, dur: 0.18, type: 'sawtooth', vol: 0.15 });
        break;
      case 'eat':
        this.tone({ freq: 520, to: 1040, dur: 0.08, type: 'triangle', vol: 0.5 });
        break;
      case 'hit':
        this.noise({ dur: 0.15, vol: 0.5, freq: 2500 });
        this.tone({ freq: 200, to: 80, dur: 0.15, vol: 0.3 });
        break;
      case 'bounce':
        this.tone({ freq: 160, to: 320, dur: 0.1, type: 'triangle', vol: 0.5 });
        break;
      case 'warp':
        this.tone({ freq: 300, to: 1500, dur: 0.12, type: 'sine', vol: 0.4 });
        break;
      case 'wall':
        this.noise({ dur: 0.05, vol: 0.15, freq: 1500 });
        break;
      case 'clash':
        this.noise({ dur: 0.12, vol: 0.4, freq: 4000 });
        break;
      case 'die':
        this.noise({ dur: 0.7, vol: 0.8, freq: 1500 });
        this.tone({ freq: 300, to: 40, dur: 0.6, type: 'sawtooth', vol: 0.3 });
        break;
      case 'beep':
        this.tone({ freq: 440, dur: 0.12, vol: 0.3 });
        break;
      case 'go':
        this.tone({ freq: 880, dur: 0.25, vol: 0.35 });
        break;
      case 'round':
        [523, 659, 784].forEach((f, i) => this.tone({ freq: f, dur: 0.15, type: 'triangle', vol: 0.4, delay: i * 0.1 }));
        break;
      case 'win':
        [523, 659, 784, 1047, 784, 1047].forEach((f, i) =>
          this.tone({ freq: f, dur: 0.18, type: 'square', vol: 0.25, delay: i * 0.12 }),
        );
        break;
    }
  }

  /** @param {GameEvent[]} events */
  handle(events) {
    const SOUND = {
      shot: 'shoot',
      ate: 'eat',
      bodyHit: 'hit',
      bounced: 'bounce',
      teleported: 'warp',
      bulletWall: 'wall',
      bulletClash: 'clash',
      bulletBounce: 'bounce',
      swordSwing: 'sword',
      bulletWarp: 'warp',
      died: 'die',
    };
    // Ten sam dźwięk najwyżej raz na tick
    const names = new Set(events.map((e) => SOUND[e.type]).filter(Boolean));
    for (const name of names) this.play(name);
  }
}
