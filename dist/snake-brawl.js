// WYGENEROWANE przez scripts/build.js z plików w src/. Nie edytuj ręcznie: `npm run build`.
(function () {
'use strict';
const __factories = {};
const __cache = {};
function __require(id) {
  if (__cache[id]) return __cache[id];
  const exports = (__cache[id] = {});
  __factories[id](exports);
  return exports;
}

// ---- src/main.js ----
__factories["src/main.js"] = function (__exports) {
// Start aplikacji: łączy canvas, klawiaturę, dźwięk, efekty i sceny w jedną pętlę.

const { PLAYERS, TICK_MS } = __require("src/config.js");
const { startLoop } = __require("src/core/loop.js");
const { SceneManager } = __require("src/core/scenes.js");
const { Keyboard } = __require("src/input/keyboard.js");
const { Sfx } = __require("src/audio/sfx.js");
const { Effects } = __require("src/render/effects.js");
const { Renderer } = __require("src/render/renderer.js");
const { createMenuScene } = __require("src/scenes/menu.js");
const { createCountdownScene } = __require("src/scenes/countdown.js");
const { createPlayScene } = __require("src/scenes/play.js");
const { createRoundEndScene } = __require("src/scenes/roundEnd.js");
const { createMatchEndScene } = __require("src/scenes/matchEnd.js");

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('game'));

const app = {
  renderer: new Renderer(canvas),
  keyboard: new Keyboard(window, PLAYERS),
  audio: new Sfx(),
  effects: new Effects(),
  /** @type {import('./game/match.js').MatchState | null} */
  match: null,
  /** @type {import('./game/types.js').RoundState | null} */
  round: null,
  roundNumber: 0,
  /** @type {SceneManager} */
  scenes: /** @type {any} */ (null),
};

app.scenes = new SceneManager(app);
app.scenes.register('menu', createMenuScene(app));
app.scenes.register('countdown', createCountdownScene(app));
app.scenes.register('play', createPlayScene(app));
app.scenes.register('roundEnd', createRoundEndScene(app));
app.scenes.register('matchEnd', createMatchEndScene(app));

// Przeglądarka pozwala włączyć dźwięk dopiero po geście użytkownika
app.keyboard.onKey(() => app.audio.unlock());

app.scenes.go('menu');

startLoop({
  tickMs: TICK_MS,
  update() {
    app.scenes.update();
    app.keyboard.endTick();
  },
  render(alpha, dt) {
    app.effects.update(dt);
    app.scenes.render(alpha, dt);
  },
});

// Do debugowania w konsoli przeglądarki
Object.assign(window, { snakeBrawl: app });
};

// ---- src/config.js ----
__factories["src/config.js"] = function (__exports) {
// Wszystkie stałe gry w jednym miejscu. Czasy logiki są w tickach (1 tick = 50 ms).

const TICK_MS = 50;
const TICKS_PER_SECOND = 1000 / TICK_MS;

// Plansza
const GRID_W = 48;
const GRID_H = 27;
const CELL = 20;

// Widok: pasek HUD nad planszą
const HUD_H = 60;
const BOARD_Y = HUD_H;
const VIEW_W = GRID_W * CELL; // 960
const VIEW_H = HUD_H + GRID_H * CELL; // 600

// Rozgrywka
const SNAKE_MOVE_EVERY = 2; // 10 pól/s
const START_LENGTH = 3;
const SHOT_COOLDOWN = 6; // 0,3 s
const BULLET_MAX_BOUNCES = 3; // pocisk odbija się 3 razy, przy 4. ścianie znika
const ROUND_TICKS = 90 * TICKS_PER_SECOND;
const COUNTDOWN_TICKS = 3 * TICKS_PER_SECOND;
const FOOD_COUNT = 3;
const WINS_TO_MATCH = 3;
const MAZE_DENSITY = 0.08;

// Gracze: kody klawiszy (KeyboardEvent.code), niezależne od układu klawiatury
const PLAYERS = [
  {
    name: 'Leon',
    color: '#FFD700',
    keys: {
      up: ['KeyW'],
      down: ['KeyS'],
      left: ['KeyA'],
      right: ['KeyD'],
      shoot: ['Space'],
    },
    help: 'W A S D  +  SPACJA',
  },
  {
    name: 'Hugo',
    color: '#00E5FF',
    keys: {
      up: ['ArrowUp'],
      down: ['ArrowDown'],
      left: ['ArrowLeft'],
      right: ['ArrowRight'],
      shoot: ['Enter', 'NumpadEnter'],
    },
    help: 'STRZAŁKI  +  ENTER',
  },
];

// Klawisze globalne
const KEYS = {
  confirm: ['Space', 'Enter', 'NumpadEnter'],
  back: ['Escape'],
  pause: ['KeyP'],
  mute: ['KeyM'],
};

// Kolory
const COLORS = {
  background: '#05060f',
  board: '#090b1c',
  gridDot: '#1b2040',
  border: '#7c4dff',
  wallEdge: '#b388ff',
  wallGlow: '#7c4dff',
  wallFill: '#1a1240',
  food: '#ff2e88',
  text: '#e8ecff',
  dim: '#7a80a8',
  danger: '#ff3d5a',
};

const FONT = '"Press Start 2P", monospace';

Object.assign(__exports, { TICK_MS, TICKS_PER_SECOND, GRID_W, GRID_H, CELL, HUD_H, BOARD_Y, VIEW_W, VIEW_H, SNAKE_MOVE_EVERY, START_LENGTH, SHOT_COOLDOWN, BULLET_MAX_BOUNCES, ROUND_TICKS, COUNTDOWN_TICKS, FOOD_COUNT, WINS_TO_MATCH, MAZE_DENSITY, PLAYERS, KEYS, COLORS, FONT });
};

// ---- src/core/loop.js ----
__factories["src/core/loop.js"] = function (__exports) {
// Pętla gry: logika w stałych tickach, rysowanie w każdej klatce.

/**
 * @param {{ tickMs: number, update: () => void, render: (alpha: number, dt: number) => void }} options
 */
function startLoop({ tickMs, update, render }) {
  let last = performance.now();
  let acc = 0;

  function frame(now) {
    // Limit chroni przed „lawiną” ticków po powrocie do karty przeglądarki
    const dt = Math.min(now - last, 250);
    last = now;
    acc += dt;
    while (acc >= tickMs) {
      update();
      acc -= tickMs;
    }
    render(acc / tickMs, dt / 1000);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

Object.assign(__exports, { startLoop });
};

// ---- src/core/scenes.js ----
__factories["src/core/scenes.js"] = function (__exports) {
// Maszyna stanów scen. Scena to obiekt z opcjonalnymi enter / update / render / exit.

/**
 * @typedef {object} Scene
 * @property {(params?: any) => void} [enter]
 * @property {() => void} [update]            raz na tick logiki
 * @property {(alpha: number, dt: number) => void} [render]   raz na klatkę
 * @property {() => void} [exit]
 */

class SceneManager {
  /** @param {{ keyboard: { reset(): void } }} app */
  constructor(app) {
    this.app = app;
    /** @type {Record<string, Scene>} */
    this.scenes = {};
    /** @type {Scene | null} */
    this.current = null;
    this.name = '';
  }

  /** @param {string} name @param {Scene} scene */
  register(name, scene) {
    this.scenes[name] = scene;
  }

  /** @param {string} name @param {any} [params] */
  go(name, params) {
    const next = this.scenes[name];
    if (!next) throw new Error(`Nieznana scena: ${name}`);
    this.current?.exit?.();
    this.app.keyboard.reset();
    this.current = next;
    this.name = name;
    next.enter?.(params);
  }

  update() {
    this.current?.update?.();
  }

  render(alpha, dt) {
    this.current?.render?.(alpha, dt);
  }
}

Object.assign(__exports, { SceneManager });
};

// ---- src/input/keyboard.js ----
__factories["src/input/keyboard.js"] = function (__exports) {
// Klawiatura: zamienia naciśnięcia klawiszy na komendy graczy dla symulacji.

/** @typedef {import('../game/types.js').Dir} Dir */
/** @typedef {import('../game/types.js').Command} Command */

const DIRS = new Set(['up', 'down', 'left', 'right']);
const MAX_PENDING_TURNS = 3;

class Keyboard {
  /**
   * @param {Window} target
   * @param {{ keys: Record<string, string[]> }[]} players
   */
  constructor(target, players) {
    this.players = players;
    /** @type {Map<string, { player: number, action: string }>} */
    this.bindings = new Map();
    players.forEach((p, player) => {
      for (const [action, codes] of Object.entries(p.keys)) {
        for (const code of codes) this.bindings.set(code, { player, action });
      }
    });

    /** Klawisze trzymane teraz */
    this.down = new Set();
    /** Klawisze wciśnięte od ostatniego ticka (dla menu i skrótów) */
    this.pressed = new Set();
    /** @type {Dir[][]} */
    this.turns = players.map(() => []);
    this.shootTapped = players.map(() => false);
    /** @type {((e: KeyboardEvent) => void)[]} */
    this.listeners = [];

    target.addEventListener('keydown', (e) => this.onKeyDown(e));
    target.addEventListener('keyup', (e) => this.down.delete(e.code));
    target.addEventListener('blur', () => this.down.clear());
  }

  /** @param {(e: KeyboardEvent) => void} fn */
  onKey(fn) {
    this.listeners.push(fn);
  }

  /** @param {KeyboardEvent} e */
  onKeyDown(e) {
    const binding = this.bindings.get(e.code);
    // Strzałki i Spacja nie mogą przewijać strony
    if (binding) e.preventDefault();
    for (const fn of this.listeners) fn(e);

    this.down.add(e.code);
    if (e.repeat) return;
    this.pressed.add(e.code);

    if (!binding) return;
    if (binding.action === 'shoot') {
      this.shootTapped[binding.player] = true;
    } else if (DIRS.has(binding.action)) {
      const queue = this.turns[binding.player];
      if (queue.length < MAX_PENDING_TURNS) queue.push(/** @type {Dir} */ (binding.action));
    }
  }

  /**
   * Komendy na ten tick. Strzał: krótkie stuknięcie albo trzymanie klawisza
   * (wtedy strzela tak często, jak pozwala cooldown).
   * @returns {Command[]}
   */
  consumeCommands() {
    return this.players.map((p, i) => {
      const turns = this.turns[i];
      this.turns[i] = [];
      const held = p.keys.shoot.some((code) => this.down.has(code));
      const shoot = held || this.shootTapped[i];
      this.shootTapped[i] = false;
      return { turns, shoot };
    });
  }

  /** Czy któryś z klawiszy został wciśnięty od ostatniego ticka. Zużywa naciśnięcie. */
  consumePressed(codes) {
    for (const code of codes) {
      if (this.pressed.delete(code)) return true;
    }
    return false;
  }

  /** Wywoływane po każdym ticku: stare naciśnięcia nie „czekają” na kolejną scenę. */
  endTick() {
    this.pressed.clear();
  }

  reset() {
    this.pressed.clear();
    this.turns = this.players.map(() => []);
    this.shootTapped = this.players.map(() => false);
  }
}

Object.assign(__exports, { Keyboard });
};

// ---- src/audio/sfx.js ----
__factories["src/audio/sfx.js"] = function (__exports) {
// Dźwięki syntezowane w Web Audio: bez plików, bez licencji.
// Przeglądarka wymaga gestu użytkownika, więc kontekst powstaje przy pierwszym klawiszu.

/** @typedef {import('../game/types.js').GameEvent} GameEvent */

class Sfx {
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

  /** @param {'shoot' | 'eat' | 'hit' | 'bounce' | 'ricochet' | 'wall' | 'clash' | 'die' | 'beep' | 'go' | 'round' | 'win'} name */
  play(name) {
    switch (name) {
      case 'shoot':
        this.tone({ freq: 880, to: 220, dur: 0.08, vol: 0.25 });
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
      case 'ricochet':
        this.tone({ freq: 1800, to: 2600, dur: 0.06, type: 'triangle', vol: 0.25 });
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
      bulletBounce: 'ricochet',
      bulletWall: 'wall',
      bulletClash: 'clash',
      died: 'die',
    };
    // Ten sam dźwięk najwyżej raz na tick
    const names = new Set(events.map((e) => SOUND[e.type]).filter(Boolean));
    for (const name of names) this.play(name);
  }
}

Object.assign(__exports, { Sfx });
};

// ---- src/render/effects.js ----
__factories["src/render/effects.js"] = function (__exports) {
// Efekty czysto wizualne: cząsteczki i potrząsanie ekranem.
// Reagują na zdarzenia z symulacji, ale nigdy nie wpływają na logikę.

const { BOARD_Y, CELL, COLORS, PLAYERS, VIEW_W } = __require("src/config.js");

/** @typedef {import('../game/types.js').GameEvent} GameEvent */
/** @typedef {import('../game/types.js').Pos} Pos */

const center = (p) => ({ x: p.x * CELL + CELL / 2, y: BOARD_Y + p.y * CELL + CELL / 2 });
const MAX_PARTICLES = 600;

class Effects {
  constructor() {
    /** @type {{ x: number, y: number, vx: number, vy: number, life: number, max: number, size: number, color: string }[]} */
    this.particles = [];
    this.shake = 0;
  }

  clear() {
    this.particles = [];
    this.shake = 0;
  }

  /** Wybuch cząsteczek w punkcie (współrzędne ekranu). */
  burst(x, y, color, count, speed = 120, life = 0.5, size = 4) {
    for (let i = 0; i < count && this.particles.length < MAX_PARTICLES; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.7);
      const l = life * (0.6 + Math.random() * 0.4);
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: l, max: l, size, color });
    }
  }

  burstAt(pos, color, count, speed, life, size) {
    const c = center(pos);
    this.burst(c.x, c.y, color, count, speed, life, size);
  }

  addShake(amount) {
    this.shake = Math.max(this.shake, amount);
  }

  /** Konfetti na koniec meczu. */
  confetti(color) {
    for (let i = 0; i < 12; i++) this.burst(Math.random() * VIEW_W, 120 + Math.random() * 300, color, 12, 200, 1.2, 5);
  }

  /** @param {GameEvent[]} events */
  handle(events) {
    for (const e of events) {
      switch (e.type) {
        case 'shot':
          this.burstAt(e.pos, PLAYERS[e.snake].color, 6, 80, 0.2, 3);
          break;
        case 'bulletBounce':
          this.burstAt(e.pos, COLORS.wallEdge, 6, 80, 0.2, 3);
          break;
        case 'bulletWall':
          this.burstAt(e.pos, COLORS.wallEdge, 14, 120, 0.35, 3);
          break;
        case 'bulletClash':
          this.burstAt(e.pos, '#ffffff', 16, 160, 0.35, 3);
          this.addShake(3);
          break;
        case 'bodyHit':
          for (const cell of e.cells) this.burstAt(cell, PLAYERS[e.snake].color, 6, 110, 0.5, 4);
          this.addShake(5);
          break;
        case 'bounced':
          this.burstAt(e.pos, PLAYERS[e.snake].color, 8, 90, 0.25, 3);
          this.addShake(2);
          break;
        case 'ate':
          this.burstAt(e.pos, COLORS.food, 12, 100, 0.4, 3);
          break;
        case 'died':
          this.burstAt(e.pos, PLAYERS[e.snake].color, 50, 260, 0.9, 5);
          this.burstAt(e.pos, '#ffffff', 20, 180, 0.5, 3);
          this.addShake(12);
          break;
      }
    }
  }

  /** @param {number} dt sekundy */
  update(dt) {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - 3 * dt;
      p.vy *= 1 - 3 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    this.shake = Math.max(0, this.shake - dt * 40);
  }

  /** Przesuwa widok o losowy wektor (wywołać w ctx.save/restore). */
  applyShake(ctx) {
    if (this.shake <= 0) return;
    const s = this.shake;
    ctx.translate(Math.round((Math.random() * 2 - 1) * s), Math.round((Math.random() * 2 - 1) * s));
  }

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x - p.size / 2), Math.round(p.y - p.size / 2), p.size, p.size);
    }
    ctx.restore();
  }
}

Object.assign(__exports, { Effects });
};

// ---- src/render/renderer.js ----
__factories["src/render/renderer.js"] = function (__exports) {
// Canvas: skalowanie do okna (z zachowaniem proporcji) i ostrość na ekranach HiDPI.
// Cały kod rysujący posługuje się współrzędnymi logicznymi VIEW_W × VIEW_H.

const { COLORS, VIEW_H, VIEW_W } = __require("src/config.js");

class Renderer {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
    this.scale = 1;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const margin = 0.96;
    const fit = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H) * margin;
    const cssW = Math.max(1, Math.floor(VIEW_W * fit));
    const cssH = Math.max(1, Math.floor(VIEW_H * fit));
    const dpr = window.devicePixelRatio || 1;

    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.scale = this.canvas.width / VIEW_W;
  }

  /** Początek klatki: czyści ekran i ustawia skalę logiczną. */
  begin() {
    const { ctx } = this;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}

Object.assign(__exports, { Renderer });
};

// ---- src/scenes/menu.js ----
__factories["src/scenes/menu.js"] = function (__exports) {
const { COLORS, KEYS, PLAYERS, VIEW_W } = __require("src/config.js");
const { randomSeed } = __require("src/core/rng.js");
const { createMatch } = __require("src/game/match.js");
const { blink, drawText } = __require("src/render/text.js");

/** @param {any} app */
function createMenuScene(app) {
  return {
    enter() {
      app.effects.clear();
    },

    update() {
      const k = app.keyboard;
      if (k.consumePressed(KEYS.mute)) app.audio.toggleMute();
      if (k.consumePressed(KEYS.confirm)) {
        app.match = createMatch(randomSeed());
        app.scenes.go('countdown');
      }
    },

    render() {
      const { ctx } = app.renderer;
      const time = performance.now();
      app.renderer.begin();

      // Tło: wolno przesuwające się neonowe paski
      ctx.save();
      for (let i = 0; i < 12; i++) {
        const y = ((time / 30 + i * 60) % 720) - 60;
        ctx.globalAlpha = 0.06;
        ctx.fillStyle = i % 2 ? PLAYERS[0].color : PLAYERS[1].color;
        ctx.fillRect(0, y, VIEW_W, 4);
      }
      ctx.restore();

      drawText(ctx, 'SNAKE', VIEW_W / 2, 120, { size: 56, color: PLAYERS[0].color, glow: 24 });
      drawText(ctx, 'BRAWL', VIEW_W / 2, 190, { size: 56, color: PLAYERS[1].color, glow: 24 });
      drawText(ctx, 'LEON  vs  HUGO', VIEW_W / 2, 250, { size: 14, color: COLORS.dim });

      const colX = [VIEW_W / 2 - 220, VIEW_W / 2 + 220];
      PLAYERS.forEach((p, i) => {
        drawText(ctx, p.name.toUpperCase(), colX[i], 320, { size: 20, color: p.color, glow: 10 });
        drawText(ctx, p.help, colX[i], 355, { size: 10, color: COLORS.text });
      });

      drawText(ctx, 'Ściany odbijają węże i pociski. Giniesz tylko od strzału w głowę.', VIEW_W / 2, 400, { size: 10, color: COLORS.dim });
      drawText(ctx, 'Strzał kosztuje 1 segment. Trafiony ogon odpada.', VIEW_W / 2, 422, { size: 10, color: COLORS.dim });

      if (blink(time)) {
        drawText(ctx, 'SPACJA / ENTER  —  START', VIEW_W / 2, 500, { size: 16, color: COLORS.text, glow: 8 });
      }
      const sound = app.audio.muted ? 'WYŁ' : 'WŁ';
      drawText(ctx, `P pauza   ESC menu   M dźwięk: ${sound}`, VIEW_W / 2, 560, { size: 8, color: COLORS.dim });
    },
  };
}

Object.assign(__exports, { createMenuScene });
};

// ---- src/core/rng.js ----
__factories["src/core/rng.js"] = function (__exports) {
// Deterministyczny generator losowy (mulberry32). Stan to zwykły obiekt,
// więc da się go skopiować, zapisać i odtworzyć tę samą rozgrywkę.

/** @param {number} seed */
function createRng(seed) {
  return { state: seed >>> 0 };
}

/** Liczba z przedziału [0, 1). */
function nextFloat(rng) {
  rng.state = (rng.state + 0x6d2b79f5) >>> 0;
  let t = rng.state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Liczba całkowita z przedziału [0, n). */
function randInt(rng, n) {
  return Math.floor(nextFloat(rng) * n);
}

/** Ziarno do nowego meczu. Jedyne miejsce, gdzie wchodzi prawdziwa losowość. */
function randomSeed() {
  return (Math.random() * 0x100000000) >>> 0;
}

Object.assign(__exports, { createRng, nextFloat, randInt, randomSeed });
};

// ---- src/game/match.js ----
__factories["src/game/match.js"] = function (__exports) {
// Mecz: seria rund do WINS_TO_MATCH wygranych. Remis nie daje punktu.

const { WINS_TO_MATCH } = __require("src/config.js");

/** @typedef {import('./types.js').RoundResult} RoundResult */

/**
 * @typedef {object} MatchState
 * @property {number} seed
 * @property {number} round       liczba rozegranych rund
 * @property {[number, number]} wins
 * @property {RoundResult[]} history
 * @property {0 | 1 | null} winner
 */

/** @param {number} seed @returns {MatchState} */
function createMatch(seed) {
  return { seed: seed >>> 0, round: 0, wins: [0, 0], history: [], winner: null };
}

/** Ziarno kolejnej rundy: każda runda ma inny labirynt, ale cały mecz jest powtarzalny. */
function nextRoundSeed(match) {
  return (match.seed + Math.imul(match.round + 1, 0x9e3779b9)) >>> 0;
}

/** @param {MatchState} match @param {RoundResult} result @returns {0 | 1 | null} */
function recordRound(match, result) {
  match.round++;
  match.history.push(result);
  if (result.winner !== 'draw') {
    match.wins[result.winner]++;
    if (match.wins[result.winner] >= WINS_TO_MATCH) match.winner = result.winner;
  }
  return match.winner;
}

Object.assign(__exports, { createMatch, nextRoundSeed, recordRound });
};

// ---- src/render/text.js ----
__factories["src/render/text.js"] = function (__exports) {
// Napisy pikselową czcionką z opcjonalną neonową poświatą.

const { COLORS, FONT, VIEW_H, VIEW_W } = __require("src/config.js");

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} str
 * @param {number} x
 * @param {number} y
 * @param {{ size?: number, color?: string, align?: CanvasTextAlign, glow?: number, alpha?: number }} [opts]
 */
function drawText(ctx, str, x, y, opts = {}) {
  const { size = 16, color = COLORS.text, align = 'center', glow = 0, alpha = 1 } = opts;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  if (glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = glow;
  }
  ctx.fillText(str, x, y);
  ctx.restore();
}

/** Przyciemnia cały ekran (pod napisami nakładek). */
function dimScreen(ctx, alpha = 0.6) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.restore();
}

/** Miganie: true przez połowę okresu. */
function blink(time, periodMs = 800) {
  return time % periodMs < periodMs / 2;
}

/** Ciemny panel z neonową ramką pod napisami nakładek (środek cx, cy). */
function drawPanel(ctx, cx, cy, w, h, color = COLORS.border) {
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
  ctx.restore();
}

Object.assign(__exports, { drawText, dimScreen, blink, drawPanel });
};

// ---- src/scenes/countdown.js ----
__factories["src/scenes/countdown.js"] = function (__exports) {
const { BOARD_Y, COLORS, COUNTDOWN_TICKS, GRID_H, CELL, KEYS, TICKS_PER_SECOND, VIEW_W } = __require("src/config.js");
const { createRound } = __require("src/game/round.js");
const { nextRoundSeed } = __require("src/game/match.js");
const { drawRoundView } = __require("src/render/view.js");
const { dimScreen, drawPanel, drawText } = __require("src/render/text.js");

/** @param {any} app */
function createCountdownScene(app) {
  let ticks = 0;

  return {
    enter() {
      app.round = createRound(nextRoundSeed(app.match));
      app.roundNumber = app.match.round + 1;
      app.effects.clear();
      ticks = COUNTDOWN_TICKS;
      app.audio.play('beep');
    },

    update() {
      const k = app.keyboard;
      if (k.consumePressed(KEYS.back)) return app.scenes.go('menu');
      if (k.consumePressed(KEYS.mute)) app.audio.toggleMute();

      ticks--;
      if (ticks <= 0) {
        app.audio.play('go');
        app.scenes.go('play');
      } else if (ticks % TICKS_PER_SECOND === 0) {
        app.audio.play('beep');
      }
    },

    render() {
      const time = performance.now();
      drawRoundView(app, time);
      const { ctx } = app.renderer;
      dimScreen(ctx, 0.35);

      const n = Math.ceil(ticks / TICKS_PER_SECOND);
      const frac = (ticks % TICKS_PER_SECOND) / TICKS_PER_SECOND;
      const cy = BOARD_Y + (GRID_H * CELL) / 2;
      drawPanel(ctx, VIEW_W / 2, cy - 25, 280, 180);
      drawText(ctx, `RUNDA ${app.roundNumber}`, VIEW_W / 2, cy - 70, { size: 18, color: COLORS.text, glow: 8 });
      drawText(ctx, String(n), VIEW_W / 2, cy + 10, { size: 48 + Math.round(frac * 24), color: COLORS.text, glow: 20 });
    },
  };
}

Object.assign(__exports, { createCountdownScene });
};

// ---- src/game/round.js ----
__factories["src/game/round.js"] = function (__exports) {
// Runda: stan początkowy i jeden krok symulacji.
// Czysta logika: bez DOM, bez czasu systemowego, losowość tylko z RNG w stanie.

const {
  FOOD_COUNT,
  GRID_H,
  GRID_W,
  MAZE_DENSITY,
  ROUND_TICKS,
  SNAKE_MOVE_EVERY,
  START_LENGTH,
} = __require("src/config.js");
const { createRng } = __require("src/core/rng.js");
const { fire, moveBullets } = __require("src/game/bullets.js");
const { eatFood, refillFood } = __require("src/game/food.js");
const { isBlocked, samePos, step } = __require("src/game/grid.js");
const { generateMaze, spawnPoints } = __require("src/game/maze.js");
const { applyHit, bounce, createSnake, queueTurn, tickTimers } = __require("src/game/snake.js");

/** @typedef {import('./types.js').RoundState} RoundState */
/** @typedef {import('./types.js').Command} Command */
/** @typedef {import('./types.js').GameEvent} GameEvent */
/** @typedef {import('./types.js').Pos} Pos */

/**
 * @param {number} seed
 * @param {{ walls?: Uint8Array, foodCount?: number, w?: number, h?: number }} [options]
 * @returns {RoundState}
 */
function createRound(seed, options = {}) {
  const grid = { w: options.w ?? GRID_W, h: options.h ?? GRID_H };
  const rng = createRng(seed);
  const spawns = spawnPoints(grid, START_LENGTH);
  const walls = options.walls ?? generateMaze(grid, rng, spawns, { density: MAZE_DENSITY });

  /** @type {RoundState} */
  const state = {
    tick: 0,
    rng,
    grid,
    walls,
    snakes: spawns.map((s, i) => createSnake(/** @type {0 | 1} */ (i), s.body, s.dir)),
    bullets: [],
    food: [],
    foodCount: options.foodCount ?? FOOD_COUNT,
    timeLeft: ROUND_TICKS,
    result: null,
  };
  refillFood(state);
  return state;
}

/**
 * Jeden tick symulacji. Modyfikuje stan i zwraca zdarzenia z tego ticka.
 * @param {RoundState} state
 * @param {Command[]} [commands]  komenda na gracza
 * @returns {GameEvent[]}
 */
function stepRound(state, commands = []) {
  /** @type {GameEvent[]} */
  const events = [];
  if (state.result) return events;
  state.tick++;

  // 1. Komendy: skręty
  state.snakes.forEach((snake, i) => {
    if (!snake.alive) return;
    for (const dir of commands[i]?.turns ?? []) queueTurn(snake, dir);
  });

  // 2. Timery
  for (const snake of state.snakes) tickTimers(snake);
  state.timeLeft--;

  // 3. Strzały
  state.snakes.forEach((snake, i) => {
    if (commands[i]?.shoot) fire(state, snake, events);
  });

  // 4. Pociski
  moveBullets(state, events);

  // 5. Węże
  if (state.tick % SNAKE_MOVE_EVERY === 0) moveSnakes(state, events);

  // 6. Jedzenie
  eatFood(state, events);
  refillFood(state);

  // 7. Koniec rundy
  checkRoundEnd(state, events);
  return events;
}

/**
 * Oba węże ruszają się równocześnie: najpierw liczymy nowe pozycje,
 * potem sprawdzamy przeszkody na podstawie stanu „po ruchu”.
 * Przeszkoda (ściana, krawędź, dowolne ciało, czołówka) nie zabija, tylko odbija:
 * wąż zawraca w miejscu. Odbity wąż nie zwalnia pola ogona, więc sprawdzamy
 * ponownie, aż nic się nie zmieni.
 */
function moveSnakes(state, events) {
  const plans = state.snakes.map((snake) => {
    if (!snake.alive) return null;
    const dir = snake.nextDirs.length ? snake.nextDirs[0] : snake.dir;
    const oldHead = snake.body[0];
    const head = step(oldHead, dir);
    const grows = snake.growPending > 0;
    const body = [head, ...(grows ? snake.body : snake.body.slice(0, -1))];
    return { snake, dir, oldHead, head, grows, body, bounce: false };
  });

  const blocked = (i, bodies) => {
    const plan = plans[i];
    if (isBlocked(state.grid, state.walls, plan.head)) return true;
    if (bodies[i].slice(1).some((p) => samePos(p, plan.head))) return true;
    for (let j = 0; j < plans.length; j++) {
      if (j === i || !state.snakes[j].alive) continue;
      const other = plans[j];
      if (other && !other.bounce) {
        if (samePos(other.head, plan.head)) return true;
        if (samePos(other.head, plan.oldHead) && samePos(plan.head, other.oldHead)) return true;
      }
      if (bodies[j].some((p) => samePos(p, plan.head))) return true;
    }
    return false;
  };

  for (let changed = true; changed; ) {
    changed = false;
    const bodies = state.snakes.map((s, i) => (plans[i] && !plans[i].bounce ? plans[i].body : s.body));
    plans.forEach((plan, i) => {
      if (plan && !plan.bounce && blocked(i, bodies)) {
        plan.bounce = true;
        changed = true;
      }
    });
  }

  for (const plan of plans) {
    if (!plan) continue;
    const { snake } = plan;
    if (plan.bounce) {
      bounce(snake);
      events.push({ type: 'bounced', snake: snake.id, pos: { ...plan.oldHead } });
      continue;
    }
    if (snake.nextDirs.length) snake.nextDirs.shift();
    snake.dir = plan.dir;
    snake.body = plan.body;
    if (plan.grows) snake.growPending--;
  }

  // Głowa wjeżdżająca w pocisk
  for (const snake of state.snakes) {
    if (!snake.alive) continue;
    const i = state.bullets.findIndex((b) => samePos(b.pos, snake.body[0]));
    if (i < 0) continue;
    const [bullet] = state.bullets.splice(i, 1);
    applyHit(snake, 0, bullet.owner, events);
  }
}

function checkRoundEnd(state, events) {
  const alive = state.snakes.filter((s) => s.alive);
  let result = null;
  if (alive.length < state.snakes.length) {
    result = { winner: alive.length === 1 ? alive[0].id : 'draw', reason: 'ko' };
  } else if (state.timeLeft <= 0) {
    const [a, b] = state.snakes;
    const winner = a.body.length === b.body.length ? 'draw' : a.body.length > b.body.length ? a.id : b.id;
    result = { winner, reason: 'time' };
  }
  if (result) {
    state.result = result;
    events.push({ type: 'roundOver', result });
  }
}

Object.assign(__exports, { createRound, stepRound });
};

// ---- src/game/bullets.js ----
__factories["src/game/bullets.js"] = function (__exports) {
// Pociski: strzał (koszt segmentu), lot, odbicia od ścian i kolizje.

const { BULLET_MAX_BOUNCES, SHOT_COOLDOWN } = __require("src/config.js");
const { OPPOSITE, isBlocked, samePos, step } = __require("src/game/grid.js");
const { applyHit, canShoot, segmentAt } = __require("src/game/snake.js");

/** @typedef {import('./types.js').RoundState} RoundState */
/** @typedef {import('./types.js').Snake} Snake */
/** @typedef {import('./types.js').Bullet} Bullet */
/** @typedef {import('./types.js').GameEvent} GameEvent */

/**
 * Strzał: zabiera segment z ogona i tworzy pocisk na polu przed głową.
 * Strzał prosto w przyległą ścianę od razu gaśnie (nie da się zastrzelić samego siebie z bliska).
 * @param {RoundState} state @param {Snake} snake @param {GameEvent[]} events
 * @returns {boolean} czy strzał padł
 */
function fire(state, snake, events) {
  if (!canShoot(snake)) return false;
  snake.body.pop();
  snake.cooldown = SHOT_COOLDOWN;

  /** @type {Bullet} */
  const bullet = { owner: snake.id, pos: step(snake.body[0], snake.dir), dir: snake.dir, bounces: 0 };
  events.push({ type: 'shot', snake: snake.id, pos: { ...snake.body[0] } });

  if (isBlocked(state.grid, state.walls, bullet.pos)) {
    events.push({ type: 'bulletWall', pos: bullet.pos });
    return true;
  }
  const other = state.bullets.findIndex((b) => samePos(b.pos, bullet.pos));
  if (other >= 0) {
    state.bullets.splice(other, 1);
    events.push({ type: 'bulletClash', pos: bullet.pos });
    return true;
  }
  if (!bulletHitsSnake(state, bullet, events)) state.bullets.push(bullet);
  return true;
}

/**
 * Trafienie węża na polu pocisku.
 * @returns {boolean} true, jeśli pocisk kogoś trafił (i znika)
 */
function bulletHitsSnake(state, bullet, events) {
  for (const snake of state.snakes) {
    if (!snake.alive) continue;
    const index = segmentAt(snake, bullet.pos);
    if (index < 0) continue;
    applyHit(snake, index, bullet.owner, events);
    return true;
  }
  return false;
}

/**
 * Przesuwa wszystkie pociski o 1 pole. Pocisk, który trafia na ścianę, zawraca
 * (w tym ticku zostaje w miejscu). Po BULLET_MAX_BOUNCES odbiciach kolejna ściana go niszczy.
 * Pociski, które wejdą na to samo pole albo się miną, znoszą się nawzajem.
 * @param {RoundState} state @param {GameEvent[]} events
 */
function moveBullets(state, events) {
  const gone = new Set();
  const moves = state.bullets.map((b) => {
    const from = b.pos;
    const next = step(from, b.dir);
    if (!isBlocked(state.grid, state.walls, next)) return { b, from, to: next };

    if (b.bounces >= BULLET_MAX_BOUNCES) {
      gone.add(b);
      events.push({ type: 'bulletWall', pos: next });
    } else {
      b.bounces++;
      b.dir = OPPOSITE[b.dir];
      events.push({ type: 'bulletBounce', pos: next });
    }
    return { b, from, to: from };
  });

  for (let i = 0; i < moves.length; i++) {
    for (let j = i + 1; j < moves.length; j++) {
      const a = moves[i];
      const c = moves[j];
      if (gone.has(a.b) || gone.has(c.b)) continue;
      const meet = samePos(a.to, c.to);
      const cross = samePos(a.to, c.from) && samePos(c.to, a.from);
      if (meet || cross) {
        events.push({ type: 'bulletClash', pos: a.to });
        gone.add(a.b);
        gone.add(c.b);
      }
    }
  }

  for (const m of moves) m.b.pos = m.to;
  for (const m of moves) {
    if (!gone.has(m.b) && bulletHitsSnake(state, m.b, events)) gone.add(m.b);
  }
  state.bullets = state.bullets.filter((b) => !gone.has(b));
}

Object.assign(__exports, { fire, bulletHitsSnake, moveBullets });
};

// ---- src/game/grid.js ----
__factories["src/game/grid.js"] = function (__exports) {
// Kratka: kierunki, pozycje i pomocnicze funkcje.

/** @typedef {import('./types.js').Dir} Dir */
/** @typedef {import('./types.js').Pos} Pos */
/** @typedef {import('./types.js').Grid} Grid */

/** @type {Record<Dir, Pos>} */
const DIR_VEC = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/** @type {Record<Dir, Dir>} */
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

/** @param {Pos} pos @param {Dir} dir @returns {Pos} */
function step(pos, dir) {
  const v = DIR_VEC[dir];
  return { x: pos.x + v.x, y: pos.y + v.y };
}

/** @param {Pos} a @param {Pos} b */
function samePos(a, b) {
  return a.x === b.x && a.y === b.y;
}

/** @param {Grid} grid @param {Pos} p */
function inBounds(grid, p) {
  return p.x >= 0 && p.y >= 0 && p.x < grid.w && p.y < grid.h;
}

/** @param {Grid} grid @param {Pos} p */
function cellIndex(grid, p) {
  return p.y * grid.w + p.x;
}

/** Obrót o 180° wokół środka planszy. @param {Grid} grid @param {Pos} p */
function rotate180(grid, p) {
  return { x: grid.w - 1 - p.x, y: grid.h - 1 - p.y };
}

/** Czy pole jest poza planszą albo jest ścianą. */
function isBlocked(grid, walls, p) {
  return !inBounds(grid, p) || walls[cellIndex(grid, p)] === 1;
}

Object.assign(__exports, { DIR_VEC, OPPOSITE, step, samePos, inBounds, cellIndex, rotate180, isBlocked });
};

// ---- src/game/snake.js ----
__factories["src/game/snake.js"] = function (__exports) {
// Wąż: tworzenie, skręty, odbicie, reakcja na trafienie.

const { DIR_VEC, OPPOSITE } = __require("src/game/grid.js");

/** @typedef {import('./types.js').Snake} Snake */
/** @typedef {import('./types.js').Dir} Dir */
/** @typedef {import('./types.js').Pos} Pos */
/** @typedef {import('./types.js').GameEvent} GameEvent */

const MAX_QUEUED_TURNS = 2;

/** @param {0 | 1} id @param {Pos[]} body @param {Dir} dir @returns {Snake} */
function createSnake(id, body, dir) {
  return {
    id,
    body: body.map((p) => ({ ...p })),
    dir,
    nextDirs: [],
    growPending: 0,
    cooldown: 0,
    alive: true,
  };
}

/**
 * Dodaje skręt do kolejki. Ignoruje zawracanie i powtórzenie kierunku.
 * @param {Snake} snake @param {Dir} dir @returns {boolean}
 */
function queueTurn(snake, dir) {
  const last = snake.nextDirs.length ? snake.nextDirs[snake.nextDirs.length - 1] : snake.dir;
  if (dir === last || dir === OPPOSITE[last]) return false;
  if (snake.nextDirs.length >= MAX_QUEUED_TURNS) return false;
  snake.nextDirs.push(dir);
  return true;
}

/** @param {Snake} snake */
function tickTimers(snake) {
  if (snake.cooldown > 0) snake.cooldown--;
}

/** @param {Snake} snake */
function canShoot(snake) {
  return snake.alive && snake.cooldown === 0 && snake.body.length > 1;
}

/**
 * Odbicie od przeszkody: wąż zawraca, czyli ogon staje się głową
 * i dalej jedzie w stronę, w którą „patrzył” ogon.
 * @param {Snake} snake
 */
function bounce(snake) {
  snake.nextDirs = [];
  if (snake.body.length === 1) {
    snake.dir = OPPOSITE[snake.dir];
    return;
  }
  snake.body.reverse();
  const [head, neck] = snake.body;
  const dx = head.x - neck.x;
  const dy = head.y - neck.y;
  snake.dir = /** @type {Dir} */ (
    Object.keys(DIR_VEC).find((d) => DIR_VEC[d].x === dx && DIR_VEC[d].y === dy) ?? OPPOSITE[snake.dir]
  );
}

/**
 * Trafienie pociskiem w segment o indeksie `index`.
 * Głowa → śmierć, ciało → odcięcie ogona od trafionego segmentu.
 * @param {Snake} snake @param {number} index @param {number} by @param {GameEvent[]} events
 */
function applyHit(snake, index, by, events) {
  if (index === 0) {
    snake.alive = false;
    events.push({ type: 'died', snake: snake.id, by, pos: { ...snake.body[0] } });
    return;
  }
  const cells = snake.body.splice(index);
  events.push({ type: 'bodyHit', snake: snake.id, by, cells });
}

/** Indeks segmentu węża na danym polu albo -1. */
function segmentAt(snake, pos) {
  return snake.body.findIndex((p) => p.x === pos.x && p.y === pos.y);
}

Object.assign(__exports, { MAX_QUEUED_TURNS, createSnake, queueTurn, tickTimers, canShoot, bounce, applyHit, segmentAt });
};

// ---- src/game/food.js ----
__factories["src/game/food.js"] = function (__exports) {
// Owoce: zjadanie i uzupełnianie na losowych wolnych polach.

const { randInt } = __require("src/core/rng.js");
const { cellIndex, samePos } = __require("src/game/grid.js");

/** @typedef {import('./types.js').RoundState} RoundState */
/** @typedef {import('./types.js').GameEvent} GameEvent */

/** @param {RoundState} state */
function refillFood(state) {
  const { grid } = state;
  if (state.food.length >= state.foodCount) return;

  const taken = new Uint8Array(state.walls);
  const mark = (p) => {
    if (p.x >= 0 && p.y >= 0 && p.x < grid.w && p.y < grid.h) taken[cellIndex(grid, p)] = 1;
  };
  state.snakes.forEach((s) => s.body.forEach(mark));
  state.bullets.forEach((b) => mark(b.pos));
  state.food.forEach(mark);

  const free = [];
  for (let i = 0; i < taken.length; i++) if (!taken[i]) free.push(i);

  while (state.food.length < state.foodCount && free.length) {
    const k = randInt(state.rng, free.length);
    const i = free[k];
    free[k] = free[free.length - 1];
    free.pop();
    state.food.push({ x: i % grid.w, y: Math.floor(i / grid.w) });
  }
}

/** @param {RoundState} state @param {GameEvent[]} events */
function eatFood(state, events) {
  for (const snake of state.snakes) {
    if (!snake.alive) continue;
    const i = state.food.findIndex((f) => samePos(f, snake.body[0]));
    if (i < 0) continue;
    const [pos] = state.food.splice(i, 1);
    snake.growPending++;
    events.push({ type: 'ate', snake: snake.id, pos });
  }
}

Object.assign(__exports, { refillFood, eatFood });
};

// ---- src/game/maze.js ----
__factories["src/game/maze.js"] = function (__exports) {
// Symetryczny labirynt: ściany są stawiane parami (pole i jego obraz po obrocie o 180°),
// więc obaj gracze mają identyczną sytuację. Okolice spawnów są zawsze wolne,
// a wszystkie wolne pola są osiągalne.

const { nextFloat, randInt } = __require("src/core/rng.js");
const { DIR_VEC, cellIndex, inBounds, rotate180, step } = __require("src/game/grid.js");

/** @typedef {import('./types.js').Grid} Grid */
/** @typedef {import('./types.js').Pos} Pos */
/** @typedef {import('./types.js').Dir} Dir */

/**
 * Pozycje startowe: Leon w lewym górnym rogu w prawo, Hugo symetrycznie.
 * @param {Grid} grid
 * @param {number} length
 * @returns {{ body: Pos[], dir: Dir }[]}
 */
function spawnPoints(grid, length) {
  const headX = 2 + length;
  const leon = Array.from({ length }, (_, i) => ({ x: headX - i, y: 2 }));
  const hugo = leon.map((p) => rotate180(grid, p));
  return [
    { body: leon, dir: 'right' },
    { body: hugo, dir: 'left' },
  ];
}

/** Pola, na których nie wolno stawiać ścian: otoczenie węży i korytarz przed głową. */
function protectedCells(grid, spawns) {
  const mask = new Uint8Array(grid.w * grid.h);
  const mark = (p) => {
    if (inBounds(grid, p)) mask[cellIndex(grid, p)] = 1;
  };

  for (const { body, dir } of spawns) {
    for (const seg of body) {
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) mark({ x: seg.x + dx, y: seg.y + dy });
      }
    }
    const side = DIR_VEC[dir].x !== 0 ? { x: 0, y: 1 } : { x: 1, y: 0 };
    let p = body[0];
    for (let i = 0; i < 14; i++) {
      p = step(p, dir);
      for (let k = -1; k <= 1; k++) mark({ x: p.x + side.x * k, y: p.y + side.y * k });
    }
  }
  return mask;
}

/** Flood fill od pola start. Zwraca maskę osiągalnych pól. */
function reachable(grid, walls, start) {
  const seen = new Uint8Array(grid.w * grid.h);
  const stack = [start];
  seen[cellIndex(grid, start)] = 1;
  while (stack.length) {
    const p = stack.pop();
    for (const d of Object.keys(DIR_VEC)) {
      const q = step(p, /** @type {Dir} */ (d));
      if (!inBounds(grid, q)) continue;
      const i = cellIndex(grid, q);
      if (seen[i] || walls[i]) continue;
      seen[i] = 1;
      stack.push(q);
    }
  }
  return seen;
}

/**
 * @param {Grid} grid
 * @param {{ state: number }} rng
 * @param {{ body: Pos[], dir: Dir }[]} spawns
 * @param {{ density?: number, attempts?: number }} [options]
 * @returns {Uint8Array}
 */
function generateMaze(grid, rng, spawns, { density = 0.08, attempts = 30 } = {}) {
  const size = grid.w * grid.h;
  const forbidden = protectedCells(grid, spawns);
  const target = Math.floor(size * density);

  for (let attempt = 0; attempt < attempts; attempt++) {
    const walls = new Uint8Array(size);
    let count = 0;

    for (let tries = 0; count < target && tries < 2000; tries++) {
      const horizontal = nextFloat(rng) < 0.5;
      const len = 2 + randInt(rng, 5);
      const x0 = randInt(rng, grid.w);
      const y0 = randInt(rng, grid.h);

      const cells = [];
      for (let i = 0; i < len; i++) {
        const p = horizontal ? { x: x0 + i, y: y0 } : { x: x0, y: y0 + i };
        if (!inBounds(grid, p)) break;
        cells.push(p);
      }
      if (cells.some((p) => forbidden[cellIndex(grid, p)])) continue;

      for (const p of cells) {
        for (const q of [p, rotate180(grid, p)]) {
          const i = cellIndex(grid, q);
          if (!walls[i]) {
            walls[i] = 1;
            count++;
          }
        }
      }
    }

    // Spawny muszą się „widzieć”, a zamknięte kieszenie zamieniamy w ściany.
    // Obszar osiągalny z jednego spawnu zawiera drugi, więc jest symetryczny.
    const start = spawns[0].body[0];
    const seen = reachable(grid, walls, start);
    if (!seen[cellIndex(grid, spawns[1].body[0])]) continue;
    for (let i = 0; i < size; i++) {
      if (!seen[i]) walls[i] = 1;
    }
    return walls;
  }

  return new Uint8Array(size);
}

Object.assign(__exports, { spawnPoints, reachable, generateMaze });
};

// ---- src/render/view.js ----
__factories["src/render/view.js"] = function (__exports) {
// Widok rundy: plansza + obiekty + efekty + HUD. Wspólny dla odliczania, gry i wyników.

const { drawBoard } = __require("src/render/board.js");
const { drawBullets, drawFood, drawSnake } = __require("src/render/entities.js");
const { drawHud } = __require("src/render/hud.js");

/**
 * @param {{ renderer: import('./renderer.js').Renderer, effects: import('./effects.js').Effects,
 *           round: import('../game/types.js').RoundState, match: import('../game/match.js').MatchState,
 *           roundNumber: number }} app
 * @param {number} time ms
 */
function drawRoundView(app, time) {
  const { renderer, effects, round, match } = app;
  const { ctx } = renderer;
  renderer.begin();

  ctx.save();
  effects.applyShake(ctx);
  drawBoard(ctx, round, renderer.scale);
  drawFood(ctx, round, time);
  for (const snake of round.snakes) drawSnake(ctx, snake);
  drawBullets(ctx, round);
  effects.draw(ctx);
  ctx.restore();

  drawHud(ctx, round, match, app.roundNumber, time);
}

Object.assign(__exports, { drawRoundView });
};

// ---- src/render/board.js ----
__factories["src/render/board.js"] = function (__exports) {
// Plansza: tło, kropki kratki, ramka i ściany. Ściany się nie zmieniają w trakcie
// rundy, więc rysujemy je raz do warstwy off-screen (poświata jest kosztowna).

const { BOARD_Y, CELL, COLORS, GRID_H, GRID_W } = __require("src/config.js");

const BOARD_W = GRID_W * CELL;
const BOARD_H = GRID_H * CELL;

/** @type {{ walls: Uint8Array | null, scale: number, canvas: HTMLCanvasElement | null }} */
const cache = { walls: null, scale: 0, canvas: null };

function buildLayer(walls, grid, scale) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(BOARD_W * scale);
  canvas.height = Math.ceil(BOARD_H * scale);
  const c = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  c.scale(scale, scale);

  c.fillStyle = COLORS.board;
  c.fillRect(0, 0, BOARD_W, BOARD_H);

  c.fillStyle = COLORS.gridDot;
  for (let y = 1; y < grid.h; y++) {
    for (let x = 1; x < grid.w; x++) c.fillRect(x * CELL - 1, y * CELL - 1, 2, 2);
  }

  const wallPath = new Path2D();
  const innerPath = new Path2D();
  for (let y = 0; y < grid.h; y++) {
    for (let x = 0; x < grid.w; x++) {
      if (!walls[y * grid.w + x]) continue;
      wallPath.rect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
      innerPath.rect(x * CELL + 4, y * CELL + 4, CELL - 8, CELL - 8);
    }
  }
  c.shadowColor = COLORS.wallGlow;
  c.shadowBlur = 10;
  c.fillStyle = COLORS.wallEdge;
  c.fill(wallPath);
  c.shadowBlur = 0;
  c.fillStyle = COLORS.wallFill;
  c.fill(innerPath);

  return canvas;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../game/types.js').RoundState} round
 * @param {number} scale  skala canvasu (dla ostrej warstwy)
 */
function drawBoard(ctx, round, scale) {
  if (cache.walls !== round.walls || cache.scale !== scale) {
    cache.canvas = buildLayer(round.walls, round.grid, scale);
    cache.walls = round.walls;
    cache.scale = scale;
  }
  ctx.drawImage(/** @type {HTMLCanvasElement} */ (cache.canvas), 0, BOARD_Y, BOARD_W, BOARD_H);

  ctx.save();
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 2;
  ctx.shadowColor = COLORS.border;
  ctx.shadowBlur = 12;
  ctx.strokeRect(1, BOARD_Y + 1, BOARD_W - 2, BOARD_H - 2);
  ctx.restore();
}

Object.assign(__exports, { drawBoard });
};

// ---- src/render/entities.js ----
__factories["src/render/entities.js"] = function (__exports) {
// Węże, pociski i owoce. Każda grupa to jedna ścieżka = jedna operacja poświaty.

const { BOARD_Y, CELL, COLORS, PLAYERS } = __require("src/config.js");
const { DIR_VEC } = __require("src/game/grid.js");

/** @typedef {import('../game/types.js').Snake} Snake */
/** @typedef {import('../game/types.js').RoundState} RoundState */

const px = (p) => p.x * CELL;
const py = (p) => BOARD_Y + p.y * CELL;

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Snake} snake
 */
function drawSnake(ctx, snake) {
  const color = PLAYERS[snake.id].color;

  ctx.save();
  ctx.globalAlpha = snake.alive ? 1 : 0.35;
  ctx.shadowColor = color;
  ctx.shadowBlur = snake.alive ? 12 : 0;

  // Ciało: segmenty z przerwą, coraz ciemniejsze ku ogonowi
  const body = new Path2D();
  for (let i = 1; i < snake.body.length; i++) {
    const p = snake.body[i];
    body.rect(px(p) + 2, py(p) + 2, CELL - 4, CELL - 4);
  }
  ctx.fillStyle = color;
  ctx.globalAlpha *= 0.8;
  ctx.fill(body);
  ctx.globalAlpha = snake.alive ? 1 : 0.35;

  // Głowa
  const head = snake.body[0];
  const hx = px(head);
  const hy = py(head);
  ctx.fillStyle = color;
  ctx.fillRect(hx + 1, hy + 1, CELL - 2, CELL - 2);
  ctx.shadowBlur = 0;

  // Oczy patrzą w kierunku ruchu
  const v = DIR_VEC[snake.dir];
  const cx = hx + CELL / 2 + v.x * 3;
  const cy = hy + CELL / 2 + v.y * 3;
  const ox = v.y !== 0 ? 4 : 0;
  const oy = v.x !== 0 ? 4 : 0;
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(cx - ox - 2, cy - oy - 2, 4, 4);
  ctx.fillRect(cx + ox - 2, cy + oy - 2, 4, 4);

  ctx.restore();
}

/** @param {CanvasRenderingContext2D} ctx @param {RoundState} round */
function drawBullets(ctx, round) {
  for (const b of round.bullets) {
    const color = PLAYERS[b.owner].color;
    const v = DIR_VEC[b.dir];
    // Każde odbicie przygasza pocisk: widać, ile mu jeszcze zostało
    const fade = 1 - b.bounces * 0.2;
    const x = px(b.pos);
    const y = py(b.pos);
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    // Smuga za pociskiem
    ctx.globalAlpha = 0.35 * fade;
    ctx.fillStyle = color;
    ctx.fillRect(x - v.x * CELL + 6, y - v.y * CELL + 6, CELL - 12, CELL - 12);
    ctx.globalAlpha = fade;
    ctx.fillRect(x + 4, y + 4, CELL - 8, CELL - 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 7, y + 7, CELL - 14, CELL - 14);
    ctx.restore();
  }
}

/** @param {CanvasRenderingContext2D} ctx @param {RoundState} round @param {number} time */
function drawFood(ctx, round, time) {
  const pulse = 1 + Math.round(Math.sin(time / 150) * 1.5);
  ctx.save();
  ctx.fillStyle = COLORS.food;
  ctx.shadowColor = COLORS.food;
  ctx.shadowBlur = 12;
  const path = new Path2D();
  for (const f of round.food) {
    const s = 6 - pulse;
    path.rect(px(f) + s, py(f) + s, CELL - 2 * s, CELL - 2 * s);
  }
  ctx.fill(path);
  ctx.restore();
}

Object.assign(__exports, { drawSnake, drawBullets, drawFood });
};

// ---- src/render/hud.js ----
__factories["src/render/hud.js"] = function (__exports) {
// Pasek nad planszą: gracze, wygrane rundy, długość, czas.

const { COLORS, HUD_H, PLAYERS, TICKS_PER_SECOND, VIEW_W, WINS_TO_MATCH } = __require("src/config.js");
const { drawText } = __require("src/render/text.js");

/** @typedef {import('../game/types.js').RoundState} RoundState */
/** @typedef {import('../game/match.js').MatchState} MatchState */

function formatTime(ticks) {
  const total = Math.max(0, Math.ceil(ticks / TICKS_PER_SECOND));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function drawPips(ctx, x, y, wins, color, alignRight) {
  const size = 12;
  const gap = 6;
  for (let i = 0; i < WINS_TO_MATCH; i++) {
    const offset = i * (size + gap);
    const px = alignRight ? x - offset - size : x + offset;
    ctx.save();
    if (i < wins) {
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.fillRect(px, y, size, size);
    } else {
      ctx.strokeStyle = COLORS.dim;
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 1, y + 1, size - 2, size - 2);
    }
    ctx.restore();
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {RoundState} round
 * @param {MatchState} match
 * @param {number} roundNumber
 * @param {number} time ms
 */
function drawHud(ctx, round, match, roundNumber, time) {
  const mid = HUD_H / 2;
  const [leon, hugo] = round.snakes;

  // Leon po lewej
  drawText(ctx, PLAYERS[0].name.toUpperCase(), 20, mid - 10, { size: 16, color: PLAYERS[0].color, align: 'left', glow: 8 });
  drawPips(ctx, 20, mid + 6, match.wins[0], PLAYERS[0].color, false);
  drawText(ctx, `DŁ ${leon.body.length}`, 200, mid, { size: 12, color: COLORS.dim, align: 'left' });

  // Hugo po prawej
  drawText(ctx, PLAYERS[1].name.toUpperCase(), VIEW_W - 20, mid - 10, { size: 16, color: PLAYERS[1].color, align: 'right', glow: 8 });
  drawPips(ctx, VIEW_W - 20, mid + 6, match.wins[1], PLAYERS[1].color, true);
  drawText(ctx, `DŁ ${hugo.body.length}`, VIEW_W - 200, mid, { size: 12, color: COLORS.dim, align: 'right' });

  // Czas na środku: ostatnie 10 s na czerwono, miga
  const last = round.timeLeft <= 10 * TICKS_PER_SECOND && !round.result;
  const color = last ? COLORS.danger : COLORS.text;
  const alpha = last && Math.floor(time / 250) % 2 ? 0.5 : 1;
  drawText(ctx, formatTime(round.timeLeft), VIEW_W / 2, mid - 6, { size: 22, color, glow: last ? 10 : 0, alpha });
  drawText(ctx, `RUNDA ${roundNumber}`, VIEW_W / 2, mid + 18, { size: 8, color: COLORS.dim });
}

Object.assign(__exports, { formatTime, drawHud });
};

// ---- src/scenes/play.js ----
__factories["src/scenes/play.js"] = function (__exports) {
const { BOARD_Y, CELL, COLORS, GRID_H, KEYS, VIEW_W } = __require("src/config.js");
const { stepRound } = __require("src/game/round.js");
const { drawRoundView } = __require("src/render/view.js");
const { dimScreen, drawPanel, drawText } = __require("src/render/text.js");

/** Ile ticków po końcu rundy jeszcze pokazujemy planszę (wybuchy). */
const AFTER_ROUND_TICKS = 30;

/** @param {any} app */
function createPlayScene(app) {
  let paused = false;
  let endTimer = 0;

  return {
    enter() {
      paused = false;
      endTimer = 0;
    },

    update() {
      const k = app.keyboard;
      if (k.consumePressed(KEYS.back)) return app.scenes.go('menu');
      if (k.consumePressed(KEYS.mute)) app.audio.toggleMute();
      if (k.consumePressed(KEYS.pause) && !app.round.result) paused = !paused;

      if (paused) {
        k.consumeCommands();
        return;
      }

      if (app.round.result) {
        if (--endTimer <= 0) app.scenes.go('roundEnd');
        return;
      }

      const events = stepRound(app.round, k.consumeCommands());
      app.effects.handle(events);
      app.audio.handle(events);
      if (app.round.result) endTimer = AFTER_ROUND_TICKS;
    },

    render() {
      drawRoundView(app, performance.now());
      if (paused) {
        const { ctx } = app.renderer;
        const cy = BOARD_Y + (GRID_H * CELL) / 2;
        dimScreen(ctx, 0.6);
        drawPanel(ctx, VIEW_W / 2, cy + 10, 420, 150);
        drawText(ctx, 'PAUZA', VIEW_W / 2, cy - 10, { size: 36, color: COLORS.text, glow: 16 });
        drawText(ctx, 'P — wznów    ESC — menu', VIEW_W / 2, cy + 40, { size: 10, color: COLORS.dim });
      }
    },
  };
}

Object.assign(__exports, { createPlayScene });
};

// ---- src/scenes/roundEnd.js ----
__factories["src/scenes/roundEnd.js"] = function (__exports) {
const { BOARD_Y, CELL, COLORS, GRID_H, KEYS, PLAYERS, TICKS_PER_SECOND, VIEW_W } = __require("src/config.js");
const { recordRound } = __require("src/game/match.js");
const { drawRoundView } = __require("src/render/view.js");
const { blink, dimScreen, drawPanel, drawText } = __require("src/render/text.js");

const MIN_TICKS = 1 * TICKS_PER_SECOND; // nie da się przeklikać od razu
const AUTO_TICKS = 4 * TICKS_PER_SECOND;

/** @param {import('../game/types.js').RoundResult} result */
function describe(result) {
  if (result.winner === 'draw') {
    return {
      title: 'REMIS!',
      color: COLORS.text,
      detail: result.reason === 'ko' ? 'Obaj trafieni w głowę naraz' : 'Koniec czasu — równe długości',
    };
  }
  const p = PLAYERS[result.winner];
  return {
    title: `${p.name.toUpperCase()} WYGRYWA RUNDĘ!`,
    color: p.color,
    detail: result.reason === 'ko' ? 'Strzał w głowę' : 'Koniec czasu — dłuższy wąż wygrywa',
  };
}

/** @param {any} app */
function createRoundEndScene(app) {
  let ticks = 0;
  let info = describe({ winner: 'draw', reason: 'ko' });

  const next = () => app.scenes.go(app.match.winner !== null ? 'matchEnd' : 'countdown');

  return {
    enter() {
      const result = app.round.result;
      recordRound(app.match, result);
      info = describe(result);
      ticks = 0;
      if (app.match.winner === null) app.audio.play('round');
    },

    update() {
      const k = app.keyboard;
      if (k.consumePressed(KEYS.back)) return app.scenes.go('menu');
      if (k.consumePressed(KEYS.mute)) app.audio.toggleMute();
      ticks++;
      if (ticks >= AUTO_TICKS || (ticks >= MIN_TICKS && k.consumePressed(KEYS.confirm))) next();
    },

    render() {
      const time = performance.now();
      drawRoundView(app, time);
      const { ctx } = app.renderer;
      const cy = BOARD_Y + (GRID_H * CELL) / 2;
      dimScreen(ctx, 0.5);
      drawPanel(ctx, VIEW_W / 2, cy + 20, 640, 260, info.color === COLORS.text ? undefined : info.color);

      drawText(ctx, info.title, VIEW_W / 2, cy - 50, { size: 28, color: info.color, glow: 16 });
      drawText(ctx, info.detail, VIEW_W / 2, cy - 5, { size: 10, color: COLORS.dim });

      const [a, b] = app.match.wins;
      drawText(ctx, String(a), VIEW_W / 2 - 60, cy + 50, { size: 36, color: PLAYERS[0].color, glow: 12 });
      drawText(ctx, ':', VIEW_W / 2, cy + 50, { size: 36, color: COLORS.text });
      drawText(ctx, String(b), VIEW_W / 2 + 60, cy + 50, { size: 36, color: PLAYERS[1].color, glow: 12 });

      if (ticks >= MIN_TICKS && blink(time)) {
        drawText(ctx, 'SPACJA — dalej', VIEW_W / 2, cy + 115, { size: 10, color: COLORS.text });
      }
    },
  };
}

Object.assign(__exports, { createRoundEndScene });
};

// ---- src/scenes/matchEnd.js ----
__factories["src/scenes/matchEnd.js"] = function (__exports) {
const { BOARD_Y, CELL, COLORS, GRID_H, KEYS, PLAYERS, TICKS_PER_SECOND, VIEW_W } = __require("src/config.js");
const { randomSeed } = __require("src/core/rng.js");
const { createMatch } = __require("src/game/match.js");
const { drawRoundView } = __require("src/render/view.js");
const { blink, dimScreen, drawPanel, drawText } = __require("src/render/text.js");

const MIN_TICKS = 1.5 * TICKS_PER_SECOND;

/** @param {any} app */
function createMatchEndScene(app) {
  let ticks = 0;

  return {
    enter() {
      ticks = 0;
      app.audio.play('win');
      app.effects.confetti(PLAYERS[app.match.winner].color);
    },

    update() {
      const k = app.keyboard;
      if (k.consumePressed(KEYS.back)) return app.scenes.go('menu');
      if (k.consumePressed(KEYS.mute)) app.audio.toggleMute();
      ticks++;
      if (ticks % (2 * TICKS_PER_SECOND) === 0) app.effects.confetti(PLAYERS[app.match.winner].color);
      if (ticks >= MIN_TICKS && k.consumePressed(KEYS.confirm)) {
        app.match = createMatch(randomSeed());
        app.scenes.go('countdown');
      }
    },

    render() {
      const time = performance.now();
      drawRoundView(app, time);
      const { ctx } = app.renderer;
      const cy = BOARD_Y + (GRID_H * CELL) / 2;
      dimScreen(ctx, 0.6);
      drawPanel(ctx, VIEW_W / 2, cy + 5, 680, 300, PLAYERS[app.match.winner].color);
      app.effects.draw(ctx);

      const winner = PLAYERS[app.match.winner];
      drawText(ctx, winner.name.toUpperCase(), VIEW_W / 2, cy - 90, { size: 48, color: winner.color, glow: 24 });
      drawText(ctx, 'WYGRYWA MECZ!', VIEW_W / 2, cy - 30, { size: 24, color: COLORS.text, glow: 10 });

      const [a, b] = app.match.wins;
      drawText(ctx, String(a), VIEW_W / 2 - 60, cy + 40, { size: 36, color: PLAYERS[0].color, glow: 12 });
      drawText(ctx, ':', VIEW_W / 2, cy + 40, { size: 36, color: COLORS.text });
      drawText(ctx, String(b), VIEW_W / 2 + 60, cy + 40, { size: 36, color: PLAYERS[1].color, glow: 12 });

      if (ticks >= MIN_TICKS && blink(time)) {
        drawText(ctx, 'SPACJA — rewanż    ESC — menu', VIEW_W / 2, cy + 110, { size: 12, color: COLORS.text });
      }
    },
  };
}

Object.assign(__exports, { createMatchEndScene });
};

__require("src/main.js");
})();
