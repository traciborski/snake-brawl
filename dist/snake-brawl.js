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

const { DEFAULT_NAMES, KEYMAPS, PLAYER_COLORS, TICK_MS } = __require("src/config.js");
const { startLoop } = __require("src/core/loop.js");
const { SceneManager } = __require("src/core/scenes.js");
const { Keyboard } = __require("src/input/keyboard.js");
const { Touch } = __require("src/input/touch.js");
const { Sfx } = __require("src/audio/sfx.js");
const { Effects } = __require("src/render/effects.js");
const { Renderer } = __require("src/render/renderer.js");
const { createMenuScene } = __require("src/scenes/menu.js");
const { createSetupScene } = __require("src/scenes/setup.js");
const { createOnlineScene } = __require("src/scenes/online.js");
const { createOfflineController } = __require("src/modes/offline.js");
const { Overlay } = __require("src/ui/dom.js");
const { roomFromLink } = __require("src/net/client.js");
const { createCountdownScene } = __require("src/scenes/countdown.js");
const { createPlayScene } = __require("src/scenes/play.js");
const { createRoundEndScene } = __require("src/scenes/roundEnd.js");
const { createMatchEndScene } = __require("src/scenes/matchEnd.js");

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('game'));

const app = {
  renderer: new Renderer(canvas),
  keyboard: new Keyboard(window, KEYMAPS),
  touch: new Touch(window, document.getElementById('fire'), document.getElementById('sword')),
  overlay: new Overlay(/** @type {HTMLElement} */ (document.getElementById('overlay'))),
  audio: new Sfx(),
  effects: new Effects(),
  /** @type {import('./game/match.js').MatchState | null} */
  match: null,
  /** @type {import('./game/types.js').RoundState | null} */
  round: null,
  roundNumber: 0,
  alpha: 0,
  /** @type {import('./net/client.js').Session | null} sesja w pokoju gry online */
  session: null,
  /** @type {((lobby: any) => void) | null} */
  onLobby: null,
  /** Dołączanie w trakcie meczu: czekamy na swoją rundę (null = nie czekamy) */
  lateJoin: null,
  /** @type {{ name: string, color: string }[]} */
  players: DEFAULT_NAMES.slice(0, 2).map((name, i) => ({ name, color: PLAYER_COLORS[i] })),
  /** Tryb gry: skąd biorą się komendy, co robi Esc i rewanż (offline albo online) */
  controller: /** @type {any} */ (null),
  /** @type {SceneManager} */
  scenes: /** @type {any} */ (null),
};

app.scenes = new SceneManager(app);
app.controller = createOfflineController(app);
app.scenes.register('menu', createMenuScene(app));
app.scenes.register('setup', createSetupScene(app));
app.scenes.register('online', createOnlineScene(app));
app.scenes.register('countdown', createCountdownScene(app));
app.scenes.register('play', createPlayScene(app));
app.scenes.register('roundEnd', createRoundEndScene(app));
app.scenes.register('matchEnd', createMatchEndScene(app));

// Telefon i tablet: pełny ekran przy pierwszym stuknięciu (i znowu po każdym, jeśli ktoś z niego
// wyszedł). Przeglądarka pozwala na to dopiero przy puszczeniu palca (pointerup), nie przy dotknięciu.
// iPhone nie ma pełnego ekranu dla stron: tam pomaga „Dodaj do ekranu początkowego” (manifest).
window.addEventListener('pointerup', (e) => {
  if (e.pointerType === 'touch' || e.pointerType === 'pen') enterFullscreen();
});

function enterFullscreen() {
  const doc = /** @type {any} */ (document);
  if (doc.fullscreenElement || doc.webkitFullscreenElement) return;
  const el = /** @type {any} */ (document.documentElement);
  const request = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
  if (!request) return;
  Promise.resolve(request({ navigationUI: 'hide' }))
    .then(() => /** @type {any} */ (screen.orientation)?.lock?.('landscape').catch(() => {}))
    .catch(() => {});
}

// Przeglądarka pozwala włączyć dźwięk dopiero po geście użytkownika
for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, () => app.audio.unlock());

// Link zaproszenia (?pokoj=KOD) prowadzi od razu do dołączania do pokoju
const invite = roomFromLink();
if (invite) app.scenes.go('online', { invite });
else app.scenes.go('menu');

startLoop({
  tickMs: TICK_MS,
  // Online gra nie może stanąć w karcie w tle, bo inni czekaliby na nasze ruchy
  runHidden: () => !!app.session,
  update() {
    app.scenes.update();
    app.keyboard.endTick();
  },
  render(alpha, dt) {
    // Sterowanie dotykiem i blokada przewijania tylko w trakcie rundy
    const inRound = app.scenes.name === 'countdown' || app.scenes.name === 'play';
    app.touch.setVisible(inRound);
    document.body.classList.toggle('in-round', inRound);
    app.effects.update(dt);
    app.alpha = alpha; // część ticka od ostatniego kroku logiki (płynne animacje, np. miecz)
    app.scenes.render(alpha, dt);
  },
});

// Do debugowania w konsoli przeglądarki
Object.assign(window, { snakeBrawl: app });
};

// ---- src/config.js ----
__factories["src/config.js"] = function (__exports) {
// Wszystkie stałe gry w jednym miejscu. Czasy logiki są w tickach (1 tick = 55 ms).

const TICK_MS = 55; // 50 ms było odrobinę za szybko
const TICKS_PER_SECOND = Math.round(1000 / TICK_MS); // ok. 18

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
const SNAKE_MOVE_EVERY = 2; // ok. 9 pól/s
const START_LENGTH = 3;
const SHOT_COOLDOWN = 6; // ok. 0,33 s
const SHOTS_PER_SEGMENT = 10; // jeden segment ogona = 10 strzałów
// Pocisk: 3 pola na 2 ticki = ok. 27 pól/s, czyli 3× szybciej niż wąż
const BULLET_CELLS = 3;
const BULLET_PER_TICKS = 2;
// Ściany działają na pocisk jak na węża, więc pocisk ma zasięg i limit odbić (żeby nie latał w kółko)
const BULLET_RANGE = 48; // pól, czyli jedna szerokość planszy
const BULLET_MAX_BOUNCES = 3;
// Miecz: ostrze wiruje wokół głowy i tnie wszystko w kole o promieniu SWORD_RADIUS pól
const SWORD_RADIUS = 3;
const SWORD_TICKS = 8; // ok. 0,45 s wirowania
const SWORD_COOLDOWN = 72; // ok. 4 s od wciśnięcia do następnego cięcia
const COUNTDOWN_TICKS = 3 * TICKS_PER_SECOND;
const FOOD_COUNT = 3;
const WINS_TO_MATCH = 3;
const MAZE_DENSITY = 0.08;
// Udział rodzajów ścian w labiryncie: najwięcej czarnych, najmniej niebieskich
const WALL_MIX = { bounce: 0.5, deadly: 0.3, portal: 0.2 };

// Rodzaje pól planszy. Krawędź planszy działa jak PORTAL.
const WALL = {
  NONE: 0,
  BOUNCE: 1, // czarna: odbija
  DEADLY: 2, // czerwona: zabija
  PORTAL: 3, // niebieska: przenosi na jej drugą stronę
};

// Gracze
const MAX_PLAYERS = 6; // gra przez internet
const OFFLINE_MIN_PLAYERS = 1; // jeden gracz = trening
const OFFLINE_MAX_PLAYERS = 4;
const OFFLINE_DEFAULT_PLAYERS = 2;
const NAME_MAX = 12;
// Kolory graczy: neonowe, inne niż ściany (czerwona, niebieska, szara) i jedzenie (różowe)
const PLAYER_COLORS = ['#FFD700', '#00E5FF', '#39FF14', '#FF9100', '#B388FF', '#FFFFFF'];
// Kolory do wyboru (domyślne graczy + dwa dodatkowe); dwóch graczy nie może mieć tego samego
const COLOR_CHOICES = [...PLAYER_COLORS, '#C6FF00', '#1DE9B6'];
const DEFAULT_NAMES = ['Gracz 1', 'Gracz 2', 'Gracz 3', 'Gracz 4', 'Gracz 5', 'Gracz 6'];

// Zestawy klawiszy (KeyboardEvent.code, niezależne od układu klawiatury).
// Offline: zestaw i = gracz i (trening: wszystkie zestawy sterują jednym wężem).
// Online: wszystkie zestawy sterują własnym wężem.
const KEYMAPS = [
  {
    keys: {
      up: ['KeyW'],
      down: ['KeyS'],
      left: ['KeyA'],
      right: ['KeyD'],
      shoot: ['Space'],
      sword: ['ShiftLeft', 'KeyE'],
    },
    help: 'W A S D  +  SPACJA  +  L. SHIFT',
  },
  {
    keys: {
      up: ['ArrowUp'],
      down: ['ArrowDown'],
      left: ['ArrowLeft'],
      right: ['ArrowRight'],
      shoot: ['Enter', 'NumpadEnter'],
      sword: ['ShiftRight', 'ControlRight'],
    },
    help: 'STRZAŁKI  +  ENTER  +  PR. SHIFT',
  },
  {
    keys: {
      up: ['KeyI'],
      down: ['KeyK'],
      left: ['KeyJ'],
      right: ['KeyL'],
      shoot: ['KeyU'],
      sword: ['KeyO'],
    },
    help: 'I J K L  +  U  +  O',
  },
  {
    keys: {
      up: ['Numpad8'],
      down: ['Numpad5', 'Numpad2'],
      left: ['Numpad4'],
      right: ['Numpad6'],
      shoot: ['Numpad0'],
      sword: ['NumpadDecimal'],
    },
    help: 'NUMPAD 8 4 5 6  +  0  +  ,',
  },
];
/** Podpowiedź klawiszy w treningu (steruje się dowolnym zestawem). */
const SOLO_HELP = 'W A S D / STRZAŁKI  +  SPACJA  +  SHIFT';

// Adres serwera gry online, używany tylko, gdy gra jest otwarta z dysku (dwuklik w index.html),
// np. 'wss://snake-brawl.twoje-konto.workers.dev'. Gra otwarta z Cloudflare albo z `npm start`
// łączy się z serwerem pod tym samym adresem. Adres można też podać w linku: ?server=wss://...
const ONLINE_SERVER = '';

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
  border: '#3d5afe',
  // [krawędź, środek] dla każdego rodzaju ściany
  walls: {
    1: ['#9aa0b8', '#000000'],
    2: ['#ff3d5a', '#4a0712'],
    3: ['#3d5afe', '#0c1450'],
  },
  food: '#ff2e88',
  text: '#e8ecff',
  dim: '#7a80a8',
  danger: '#ff3d5a',
};

const FONT = '"Press Start 2P", monospace';

Object.assign(__exports, { TICK_MS, TICKS_PER_SECOND, GRID_W, GRID_H, CELL, HUD_H, BOARD_Y, VIEW_W, VIEW_H, SNAKE_MOVE_EVERY, START_LENGTH, SHOT_COOLDOWN, SHOTS_PER_SEGMENT, BULLET_CELLS, BULLET_PER_TICKS, BULLET_RANGE, BULLET_MAX_BOUNCES, SWORD_RADIUS, SWORD_TICKS, SWORD_COOLDOWN, COUNTDOWN_TICKS, FOOD_COUNT, WINS_TO_MATCH, MAZE_DENSITY, WALL_MIX, WALL, MAX_PLAYERS, OFFLINE_MIN_PLAYERS, OFFLINE_MAX_PLAYERS, OFFLINE_DEFAULT_PLAYERS, NAME_MAX, PLAYER_COLORS, COLOR_CHOICES, DEFAULT_NAMES, KEYMAPS, SOLO_HELP, ONLINE_SERVER, KEYS, COLORS, FONT });
};

// ---- src/core/loop.js ----
__factories["src/core/loop.js"] = function (__exports) {
// Pętla gry: logika w stałych tickach, rysowanie w każdej klatce.
// Gdy karta jest w tle, przeglądarka wstrzymuje requestAnimationFrame. W grze online
// (runHidden) logika biegnie wtedy dalej na zegarze z Web Workera (zwykłe timery w tle
// są mocno spowalniane), żeby inni gracze nie czekali na nasze ruchy.

/**
 * @param {{ tickMs: number, update: () => void, render: (alpha: number, dt: number) => void,
 *           runHidden?: () => boolean }} options
 */
function startLoop({ tickMs, update, render, runHidden = () => false }) {
  let last = performance.now();
  let acc = 0;

  /** Doganianie czasu: tyle ticków, ile wypada od ostatniego razu (z limitem). */
  function advance(now) {
    const dt = Math.min(now - last, 250);
    last = now;
    acc += dt;
    while (acc >= tickMs) {
      update();
      acc -= tickMs;
    }
    return dt;
  }

  function frame(now) {
    const dt = advance(now);
    render(acc / tickMs, dt / 1000);
    requestAnimationFrame(frame);
  }

  startBackgroundTicker(tickMs, () => {
    if (document.hidden && runHidden()) advance(performance.now());
  });
  document.addEventListener('visibilitychange', () => {
    // Po powrocie z tła nie nadrabiamy całego czasu naraz (offline gra po prostu stała)
    if (!document.hidden && !runHidden()) last = performance.now();
  });

  requestAnimationFrame(frame);
}

/** Zegar w osobnym wątku. Bez obsługi Workerów (albo gdy zablokowane) po prostu nic nie robi. */
function startBackgroundTicker(ms, onTick) {
  try {
    const code = `setInterval(() => postMessage(0), ${ms});`;
    const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
    const worker = new Worker(url);
    worker.onmessage = onTick;
    return worker;
  } catch {
    return null;
  }
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

/** @param {KeyboardEvent} e */
function isTyping(e) {
  const t = /** @type {HTMLElement | null} */ (e.target);
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'BUTTON');
}
const MAX_PENDING_TURNS = 3;

class Keyboard {
  /**
   * @param {Window} target
   * @param {{ keys: Record<string, string[]> }[]} players  zestawy klawiszy
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
    this.swordTapped = players.map(() => false);
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
    // Pisanie w polu tekstowym (imię, kod pokoju) i obsługa przycisków nie sterują grą
    if (isTyping(e)) return;
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
    } else if (binding.action === 'sword') {
      this.swordTapped[binding.player] = true;
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
      // Miecz: wystarczy wcisnąć (trzymany tnie znowu, gdy tylko minie cooldown)
      const sword = (p.keys.sword ?? []).some((code) => this.down.has(code)) || this.swordTapped[i];
      this.swordTapped[i] = false;
      return { turns, shoot, sword };
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

  /** Komendy ze wszystkich zestawów klawiszy połączone w jedną (gra online: jeden wąż). */
  consumeMerged() {
    const all = this.consumeCommands();
    return { turns: all.flatMap((c) => c.turns), shoot: all.some((c) => c.shoot), sword: all.some((c) => c.sword) };
  }

  reset() {
    this.pressed.clear();
    this.turns = this.players.map(() => []);
    this.shootTapped = this.players.map(() => false);
    this.swordTapped = this.players.map(() => false);
  }
}

Object.assign(__exports, { Keyboard });
};

// ---- src/input/touch.js ----
__factories["src/input/touch.js"] = function (__exports) {
// Sterowanie dotykiem (telefon, tablet): przesunięcie palcem w dowolnym miejscu skręca węża,
// przycisk STRZAŁ (można przytrzymać) strzela, przycisk MIECZ tnie wokół głowy.
// Daje te same komendy co klawiatura.
//
// Sterowanie włącza się samo przy pierwszym dotknięciu ekranu. Kto gra myszą i klawiaturą,
// nigdy go nie zobaczy. Przyciski widać tylko w trakcie rundy (setVisible).

/** @typedef {import('../game/types.js').Dir} Dir */
/** @typedef {import('../game/types.js').Command} Command */

/** Jak daleko (w pikselach ekranu) trzeba przesunąć palec, żeby skręcić. */
const SWIPE_PX = 24;
const MAX_PENDING_TURNS = 3;

/** Kierunek przesunięcia albo null, jeśli palec przesunął się za mało. */
function swipeDir(dx, dy, threshold = SWIPE_PX) {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

class Touch {
  /**
   * @param {EventTarget} target  gdzie słuchać palców (okno)
   * @param {HTMLElement | null} fireButton
   * @param {HTMLElement | null} swordButton
   */
  constructor(target, fireButton = null, swordButton = null) {
    this.fireButton = fireButton;
    this.swordButton = swordButton;
    /** czy ktoś już grał dotykiem na tym urządzeniu */
    this.active = false;
    this.visible = false;
    /** @type {Map<number, { x: number, y: number }>} początek bieżącego ruchu każdego palca */
    this.swipes = new Map();
    /** @type {Dir[]} */
    this.turns = [];
    this.firing = false;
    this.fireTapped = false;
    this.swordTapped = false;
    /** @type {(() => void)[]} */
    this.onFirstTouch = [];

    target.addEventListener('pointerdown', (e) => this.down(/** @type {PointerEvent} */ (e)));
    target.addEventListener('pointermove', (e) => this.move(/** @type {PointerEvent} */ (e)));
    for (const type of ['pointerup', 'pointercancel']) {
      target.addEventListener(type, (e) => this.swipes.delete(/** @type {PointerEvent} */ (e).pointerId));
    }

    if (fireButton) {
      fireButton.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.firing = true;
        this.fireTapped = true;
      });
      for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
        fireButton.addEventListener(type, () => (this.firing = false));
      }
    }
    swordButton?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.swordTapped = true;
    });
  }

  /** @param {PointerEvent} e */
  down(e) {
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
    if (!this.active) {
      this.active = true;
      this.updateButton();
      for (const fn of this.onFirstTouch) fn();
    }
    if (!this.visible || e.target === this.fireButton || e.target === this.swordButton) return;
    this.swipes.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  /** Każde przesunięcie o SWIPE_PX daje skręt; bez odrywania palca można skręcać dalej. */
  move(e) {
    const start = this.swipes.get(e.pointerId);
    if (!start) return;
    const dir = swipeDir(e.clientX - start.x, e.clientY - start.y);
    if (!dir) return;
    if (this.turns[this.turns.length - 1] !== dir && this.turns.length < MAX_PENDING_TURNS) this.turns.push(dir);
    this.swipes.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  /** Przyciski STRZAŁ i MIECZ oraz przesuwanie działają tylko w trakcie rundy. */
  setVisible(visible) {
    if (visible === this.visible) return;
    this.visible = visible;
    if (!visible) this.reset();
    this.updateButton();
  }

  updateButton() {
    const hidden = !(this.active && this.visible);
    if (this.fireButton) this.fireButton.hidden = hidden;
    if (this.swordButton) this.swordButton.hidden = hidden;
  }

  /** @returns {Command} komenda na ten tick (jak z klawiatury) */
  consume() {
    const cmd = { turns: this.turns, shoot: this.firing || this.fireTapped, sword: this.swordTapped };
    this.turns = [];
    this.fireTapped = false;
    this.swordTapped = false;
    return cmd;
  }

  reset() {
    this.swipes.clear();
    this.turns = [];
    this.firing = false;
    this.fireTapped = false;
    this.swordTapped = false;
  }
}

/** Łączy dwie komendy w jedną (np. klawiatura + dotyk). @param {Command} a @param {Command} b */
function mergeCommands(a, b) {
  return { turns: [...(a.turns ?? []), ...(b.turns ?? [])], shoot: !!(a.shoot || b.shoot), sword: !!(a.sword || b.sword) };
}

Object.assign(__exports, { SWIPE_PX, swipeDir, Touch, mergeCommands });
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

Object.assign(__exports, { Sfx });
};

// ---- src/render/effects.js ----
__factories["src/render/effects.js"] = function (__exports) {
// Efekty czysto wizualne: cząsteczki i potrząsanie ekranem.
// Reagują na zdarzenia z symulacji, ale nigdy nie wpływają na logikę.

const { BOARD_Y, CELL, COLORS, VIEW_W } = __require("src/config.js");

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

  /** @param {GameEvent[]} events @param {{ color: string }[]} players */
  handle(events, players) {
    const color = (id) => players[id].color;
    for (const e of events) {
      switch (e.type) {
        case 'shot':
          this.burstAt(e.pos, color(e.snake), 6, 80, 0.2, 3);
          break;
        case 'bulletWall':
          this.burstAt(e.pos, '#ffffff', 10, 110, 0.3, 3);
          break;
        case 'swordSwing':
          this.burstAt(e.pos, color(e.snake), 14, 200, 0.3, 3);
          this.addShake(2);
          break;
        case 'bulletBounce':
          this.burstAt(e.pos, COLORS.walls[1][0], 6, 80, 0.2, 2);
          break;
        case 'bulletWarp':
          this.burstAt(e.pos, COLORS.walls[3][0], 6, 80, 0.2, 2);
          break;
        case 'bulletClash':
          this.burstAt(e.pos, '#ffffff', 16, 160, 0.35, 3);
          this.addShake(3);
          break;
        case 'bodyHit':
          for (const cell of e.cells) this.burstAt(cell, color(e.snake), 6, 110, 0.5, 4);
          this.addShake(5);
          break;
        case 'teleported':
          this.burstAt(e.pos, COLORS.walls[3][0], 12, 120, 0.35, 3);
          break;
        case 'bounced':
          this.burstAt(e.pos, color(e.snake), 8, 90, 0.25, 3);
          this.addShake(2);
          break;
        case 'ate':
          this.burstAt(e.pos, COLORS.food, 12, 100, 0.4, 3);
          break;
        case 'died':
          this.burstAt(e.pos, color(e.snake), 50, 260, 0.9, 5);
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

    // Nakładka HTML skaluje się razem z canvasem
    this.canvas.parentElement?.style.setProperty('--u', `${cssW / VIEW_W}px`);
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
const { COLORS, PLAYER_COLORS, VIEW_W } = __require("src/config.js");
const { blink, drawText } = __require("src/render/text.js");
const { h } = __require("src/ui/dom.js");
const { fetchRooms, serverUrl, showRoomInAddressBar } = __require("src/net/client.js");
const { PUBLIC_ROOMS } = __require("src/net/protocol.js");

/** Co ile odświeżamy w menu stan pokoju publicznego. */
const PUBLIC_REFRESH_MS = 5000;

/** Stan pokoju publicznego w jednej linijce, np. „2/6 · trwa mecz”. */
function publicRoomStatus(room) {
  if (!room) return '';
  const count = `${room.players.length}/${room.max}`;
  if (room.full) return `${count} · pełny`;
  if (room.playing) return `${count} · trwa mecz`;
  return room.players.length ? `${count} · czekają!` : `${count} · pusty`;
}

/** @param {any} app */
function createMenuScene(app) {
  let timer = 0;

  return {
    enter() {
      app.effects.clear();
      showRoomInAddressBar(null);
      const buttons = [
        h('button', { type: 'button', onclick: () => app.scenes.go('setup'), autofocus: true }, '1  GRA NA JEDNYM KOMPUTERZE'),
        h('button', { type: 'button', onclick: () => app.scenes.go('online') }, '2  GRA PRZEZ INTERNET'),
      ];
      // Pokój publiczny widać od razu w menu (gdy jest serwer gry): wchodzi się jednym kliknięciem
      const code = PUBLIC_ROOMS[0];
      const status = h('small', { className: 'room-status' });
      if (serverUrl()) {
        buttons.push(
          h('button', { type: 'button', onclick: () => app.scenes.go('online', { invite: code }) }, `3  POKÓJ PUBLICZNY ${code}  `, status),
        );
        const refresh = async () => {
          const rooms = await fetchRooms();
          status.textContent = publicRoomStatus(rooms?.find((r) => r.code === code));
        };
        refresh();
        timer = setInterval(refresh, PUBLIC_REFRESH_MS);
      }
      const menu = h('div', { className: 'menu-buttons', onkeydown: (e) => onKey(e, buttons) }, buttons);
      app.overlay.show(menu, { position: 'low' });
    },

    exit() {
      clearInterval(timer);
      app.overlay.hide();
    },

    render() {
      const { ctx } = app.renderer;
      const time = performance.now();
      app.renderer.begin();

      // Tło: wolno przesuwające się neonowe paski w kolorach graczy
      ctx.save();
      for (let i = 0; i < 12; i++) {
        const y = ((time / 30 + i * 60) % 720) - 60;
        ctx.globalAlpha = 0.06;
        ctx.fillStyle = PLAYER_COLORS[i % PLAYER_COLORS.length];
        ctx.fillRect(0, y, VIEW_W, 4);
      }
      ctx.restore();

      drawText(ctx, 'SNAKE', VIEW_W / 2, 90, { size: 56, color: PLAYER_COLORS[0], glow: 24 });
      drawText(ctx, 'BRAWL', VIEW_W / 2, 160, { size: 56, color: PLAYER_COLORS[1], glow: 24 });

      drawText(ctx, 'CZERWONA zabija   CZARNA odbija   NIEBIESKA przenosi', VIEW_W / 2, 225, { size: 10, color: COLORS.text });
      drawText(ctx, 'Strzał w głowę eliminuje. Trafiony ogon odpada.', VIEW_W / 2, 250, { size: 10, color: COLORS.dim });
      drawText(ctx, '1 segment ogona = 10 strzałów. Własne pociski są niegroźne.', VIEW_W / 2, 272, { size: 10, color: COLORS.dim });

      if (blink(time, 1600)) {
        drawText(ctx, 'wybierz tryb gry', VIEW_W / 2, 330, { size: 10, color: COLORS.dim });
      }
      const sound = app.audio.muted ? 'WYŁ' : 'WŁ';
      drawText(ctx, `P pauza   ESC menu   M dźwięk: ${sound}`, VIEW_W / 2, 580, { size: 8, color: COLORS.dim });
    },
  };

  /** Strzałki/WS przesuwają wybór, 1/2/3 wybierają od razu, M wycisza. */
  function onKey(e, buttons) {
    const i = buttons.indexOf(document.activeElement);
    if (['ArrowDown', 'KeyS'].includes(e.code)) buttons[(i + 1) % buttons.length].focus();
    else if (['ArrowUp', 'KeyW'].includes(e.code)) buttons[(i - 1 + buttons.length) % buttons.length].focus();
    else if (e.code === 'Digit1' || e.code === 'Numpad1') buttons[0].click();
    else if (e.code === 'Digit2' || e.code === 'Numpad2') buttons[1].click();
    else if ((e.code === 'Digit3' || e.code === 'Numpad3') && buttons[2]) buttons[2].click();
    else if (e.code === 'KeyM') app.audio.toggleMute();
    else return;
    e.preventDefault();
  }
}

Object.assign(__exports, { publicRoomStatus, createMenuScene });
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

/**
 * Wynik meczu w kolorach graczy, np. „2 : 0 : 1” (środek w cx).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number[]} wins
 * @param {{ color: string }[]} players
 */
function drawScore(ctx, wins, players, cx, y, size = wins.length > 4 ? 26 : 36) {
  const parts = [];
  wins.forEach((w, i) => {
    if (i > 0) parts.push({ str: ':', color: COLORS.text });
    parts.push({ str: String(w), color: players[i].color });
  });
  ctx.save();
  ctx.font = `${size}px ${FONT}`;
  const gap = size * 0.6;
  const widths = parts.map((p) => ctx.measureText(p.str).width);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (parts.length - 1);
  ctx.restore();
  let x = cx - total / 2;
  parts.forEach((p, i) => {
    drawText(ctx, p.str, x + widths[i] / 2, y, { size, color: p.color, glow: p.str === ':' ? 0 : 12 });
    x += widths[i] + gap;
  });
}

Object.assign(__exports, { drawText, dimScreen, blink, drawPanel, drawScore });
};

// ---- src/ui/dom.js ----
__factories["src/ui/dom.js"] = function (__exports) {
// Nakładka HTML nad canvasem: formularze (imiona, kod pokoju) i przyciski menu,
// których nie da się wygodnie zrobić na samym canvasie.

/**
 * Tworzy element: h('button', { type: 'submit', onclick }, 'START').
 * @param {string} tag
 * @param {Record<string, any>} [props]
 * @param {...(Node | string | null | undefined | (Node | string)[])} children
 */
function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'style') Object.assign(el.style, value);
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else if (key in el) el[key] = value;
    else el.setAttribute(key, value);
  }
  el.append(...children.flat().filter((c) => c != null && c !== false));
  return el;
}

class Overlay {
  /** @param {HTMLElement} el */
  constructor(el) {
    this.el = el;
    this.hide();
  }

  /**
   * @param {HTMLElement} content
   * @param {{ position?: 'center' | 'low' }} [opts]
   */
  show(content, { position = 'center' } = {}) {
    this.el.className = `overlay ${position}`;
    this.el.replaceChildren(content);
    this.el.hidden = false;
    // Najpierw element z autofocus (o ile aktywny), potem pierwsze pole albo aktywny przycisk
    const target = content.querySelector('[autofocus]:not(:disabled)') ?? content.querySelector('input, button:not(:disabled)');
    /** @type {HTMLElement | null} */ (target)?.focus();
  }

  hide() {
    this.el.hidden = true;
    this.el.replaceChildren();
  }
}

Object.assign(__exports, { h, Overlay });
};

// ---- src/net/client.js ----
__factories["src/net/client.js"] = function (__exports) {
// Połączenie z serwerem pokoi (WebSocket), wybór adresu serwera i linki zaproszeń do pokoju.

const { ONLINE_SERVER } = __require("src/config.js");
const { ROOMS_API, normalizeCode } = __require("src/net/protocol.js");

/**
 * Adres serwera pokoi:
 * - z linku (?server=wss://…), gdy ktoś chce wskazać inny serwer,
 * - ten sam adres, z którego przyszła gra (Cloudflare albo `npm start`: gra i pokoje są razem),
 * - przy grze otwartej z dysku (file://) adres z config.js.
 * @returns {string | null}
 */
function serverUrl() {
  const fromLink = new URLSearchParams(location.search).get('server');
  if (fromLink) return fromLink.replace(/\/+$/, '');
  if (location.protocol === 'http:' || location.protocol === 'https:') {
    return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
  }
  return ONLINE_SERVER || null;
}

/**
 * Lista aktywnych pokoi z serwera gry (z pokojami publicznymi, także pustymi) albo null,
 * gdy serwera nie ma albo nie odpowiada.
 * @returns {Promise<{ code: string, players: string[], playing: boolean, round: number | null,
 *   full: boolean, public: boolean, max: number }[] | null>}
 */
async function fetchRooms() {
  const server = serverUrl();
  if (!server) return null;
  try {
    const res = await fetch(server.replace(/^ws/, 'http') + ROOMS_API, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()).rooms;
  } catch {
    return null;
  }
}

/**
 * Sesja w pokoju gry. Po połączeniu `onMessage` dostaje wszystkie wiadomości serwera.
 * @typedef {object} Session
 * @property {string} code
 * @property {any} lobby                  ostatni stan poczekalni
 * @property {(msg: object) => void} send
 * @property {() => void} close
 * @property {((msg: any) => void) | null} onMessage
 * @property {(() => void) | null} onClose  zerwanie połączenia (nie wywoływane po close())
 */

/**
 * Łączy z pokojem. Kończy się po pierwszym stanie poczekalni albo błędem
 * (np. { code: 'exists' | 'missing' | 'full' | 'playing' | 'network', msg }).
 * @returns {Promise<Session>}
 */
function joinRoom(baseUrl, code, name, create, color = null) {
  return new Promise((resolve, reject) => {
    const networkError = { code: 'network', msg: 'Nie udało się połączyć z serwerem gry' };
    /** @type {WebSocket} */
    let ws;
    try {
      ws = new WebSocket(`${baseUrl}/room/${code}`);
    } catch {
      reject(networkError);
      return;
    }

    let settled = false;
    let closing = false;
    /** @type {Session} */
    const session = {
      code,
      lobby: null,
      onMessage: null,
      onClose: null,
      send: (msg) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
      },
      close: () => {
        closing = true;
        ws.close();
      },
    };

    ws.onopen = () => session.send({ t: 'hello', name, create, color });
    ws.onmessage = (e) => {
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      if (msg.t === 'lobby') session.lobby = msg;
      if (!settled) {
        if (msg.t === 'lobby') {
          settled = true;
          resolve(session);
        } else if (msg.t === 'error') {
          settled = true;
          reject(msg);
        }
        return;
      }
      session.onMessage?.(msg);
    };
    ws.onclose = () => {
      if (!settled) {
        settled = true;
        reject(networkError);
      } else if (!closing) {
        session.onClose?.();
      }
    };
  });
}

const ROOM_PARAM = 'pokoj';

/** Kod pokoju z linku zaproszenia (?pokoj=KOT7) albo null. */
function roomFromLink() {
  return normalizeCode(new URLSearchParams(location.search).get(ROOM_PARAM));
}

/** Link zaproszenia do pokoju (z zachowaniem ?server=, jeśli był). */
function roomLink(code) {
  const url = new URL(location.href);
  url.hash = '';
  url.searchParams.set(ROOM_PARAM, code);
  return url.toString();
}

/** Strona z listą aktywnych pokoi (z zachowaniem ?server=, jeśli był). */
function roomsPage() {
  const url = new URL('/pokoje', location.href);
  const server = new URLSearchParams(location.search).get('server');
  if (server) url.searchParams.set('server', server);
  return url.toString();
}

/** Ustawia (albo czyści, gdy code = null) kod pokoju w pasku adresu, bez przeładowania strony. */
function showRoomInAddressBar(code) {
  try {
    const url = new URL(location.href);
    if (code) url.searchParams.set(ROOM_PARAM, code);
    else url.searchParams.delete(ROOM_PARAM);
    history.replaceState(null, '', url);
  } catch {
    // np. strona otwarta z dysku w przeglądarce, która na to nie pozwala
  }
}

Object.assign(__exports, { serverUrl, fetchRooms, joinRoom, roomFromLink, roomLink, roomsPage, showRoomInAddressBar });
};

// ---- src/net/protocol.js ----
__factories["src/net/protocol.js"] = function (__exports) {
// Wspólne dla gry i serwera: kody pokoi, kolory graczy i zapis komend w wiadomościach sieciowych.

const { COLOR_CHOICES } = __require("src/config.js");

/** Bez liter i cyfr, które łatwo pomylić (O/0, I/1). */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 4;
/** Pokoje publiczne: zawsze istnieją, widać je w menu gry i na liście pokoi. */
const PUBLIC_ROOMS = ['4B'];
const ROOM_PATH_RE = new RegExp(`^/room/([A-Z2-9]{${CODE_LENGTH}}|${PUBLIC_ROOMS.join('|')})$`);
/** Lista aktywnych pokoi (JSON) dla strony /pokoje. */
const ROOMS_API = '/api/pokoje';

/** Losowy kod pokoju, np. „KOT7”. */
function randomCode(random = Math.random) {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  return code;
}

/** Kod wpisany przez gracza (albo nazwa pokoju publicznego): wielkie litery, bez spacji. Zwraca null, jeśli niepoprawny. */
function normalizeCode(raw) {
  const code = String(raw ?? '').toUpperCase().replace(/\s+/g, '');
  return ROOM_PATH_RE.test(`/room/${code}`) ? code : null;
}

const DIR_TO_CHAR = { up: 'u', down: 'd', left: 'l', right: 'r' };
const CHAR_TO_DIR = { u: 'up', d: 'down', l: 'left', r: 'right' };

/**
 * Komenda gry → zwarta postać do wiadomości: { d: 'ul', s: 1, m: 1 } (max 3 skręty, s = strzał, m = miecz).
 * @param {import('../game/types.js').Command} cmd
 */
function encodeCommand(cmd) {
  const d = (cmd.turns ?? []).slice(0, 3).map((t) => DIR_TO_CHAR[t]).join('');
  return { d, s: cmd.shoot ? 1 : 0, m: cmd.sword ? 1 : 0 };
}

/** @returns {import('../game/types.js').Command} */
function decodeCommand({ d = '', s = 0, m = 0 }) {
  return { turns: [...d].map((c) => CHAR_TO_DIR[c]).filter(Boolean), shoot: !!s, sword: !!m };
}

/**
 * Kolor dla gracza: wybrany, jeśli jest na liście i nikt go nie ma, inaczej pierwszy wolny.
 * @param {unknown} wanted @param {string[]} taken kolory innych graczy
 */
function pickColor(wanted, taken) {
  const free = COLOR_CHOICES.filter((c) => !taken.includes(c));
  if (typeof wanted === 'string' && free.includes(wanted.toUpperCase())) return wanted.toUpperCase();
  return free[0] ?? COLOR_CHOICES[0];
}

/**
 * Następny wolny kolor po `current` (kliknięcie w kwadracik koloru).
 * @param {string} current @param {string[]} taken kolory innych graczy
 */
function nextColor(current, taken) {
  const start = Math.max(0, COLOR_CHOICES.indexOf(current));
  for (let i = 1; i <= COLOR_CHOICES.length; i++) {
    const c = COLOR_CHOICES[(start + i) % COLOR_CHOICES.length];
    if (!taken.includes(c)) return c;
  }
  return current;
}

Object.assign(__exports, { CODE_ALPHABET, CODE_LENGTH, PUBLIC_ROOMS, ROOM_PATH_RE, ROOMS_API, randomCode, normalizeCode, encodeCommand, decodeCommand, pickColor, nextColor });
};

// ---- src/scenes/setup.js ----
__factories["src/scenes/setup.js"] = function (__exports) {
// Gra na jednym komputerze: liczba graczy (1–4) i ich imiona. Jeden gracz = trening.

const {
  DEFAULT_NAMES,
  KEYMAPS,
  NAME_MAX,
  OFFLINE_DEFAULT_PLAYERS,
  OFFLINE_MAX_PLAYERS,
  OFFLINE_MIN_PLAYERS,
  PLAYER_COLORS,
  SOLO_HELP,
  VIEW_W,
} = __require("src/config.js");
const { randomSeed } = __require("src/core/rng.js");
const { createMatch } = __require("src/game/match.js");
const { drawText } = __require("src/render/text.js");
const { h } = __require("src/ui/dom.js");
const { load, save } = __require("src/ui/storage.js");
const { createOfflineController } = __require("src/modes/offline.js");
const { nextColor, pickColor } = __require("src/net/protocol.js");
const { paintSwatch, swatch } = __require("src/ui/swatch.js");

const COUNT_HINTS = {
  1: 'Trening: sam na planszy, bez punktów. Zbieraj owoce, omijaj czerwone ściany.',
  4: 'Gracz 4 potrzebuje klawiatury numerycznej.',
};

/** Liczba graczy w dozwolonym zakresie (np. zapamiętana w przeglądarce). */
function clampPlayers(n) {
  const count = Math.round(Number(n));
  if (!Number.isFinite(count)) return OFFLINE_DEFAULT_PLAYERS;
  return Math.min(OFFLINE_MAX_PLAYERS, Math.max(OFFLINE_MIN_PLAYERS, count));
}

/** Czyści imię: bez zbędnych spacji, przycięte, a puste zastąpione domyślnym. */
function cleanName(raw, i) {
  const name = String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
  return name || DEFAULT_NAMES[i];
}

/** Zapamiętane kolory graczy offline, bez powtórzeń (powtórzony dostaje pierwszy wolny). */
function savedColors(saved) {
  const colors = [];
  for (let i = 0; i < OFFLINE_MAX_PLAYERS; i++) colors.push(pickColor(saved?.[i] ?? PLAYER_COLORS[i], colors));
  return colors;
}

/** @param {any} app */
function createSetupScene(app) {
  return {
    enter() {
      const saved = load('names', DEFAULT_NAMES);
      let count = clampPlayers(load('offlinePlayers', OFFLINE_DEFAULT_PLAYERS));
      // Pola na imiona wszystkich czterech graczy: przy zmianie liczby graczy wpisane imiona zostają
      const inputs = DEFAULT_NAMES.slice(0, OFFLINE_MAX_PLAYERS).map((fallback, i) =>
        h('input', { value: saved[i] ?? fallback, maxLength: NAME_MAX, placeholder: fallback, 'aria-label': `Imię gracza ${i + 1}` }),
      );

      // Kolory: klik w kwadracik zmienia na następny, którego nie ma żaden inny gracz
      const colors = savedColors(load('colors', PLAYER_COLORS));

      const start = (e) => {
        e.preventDefault();
        const names = inputs.slice(0, count).map((input, i) => cleanName(input.value, i));
        save('names', inputs.map((input, i) => cleanName(input.value, i)));
        save('offlinePlayers', count);
        save('colors', colors.slice(0, count));
        app.controller = createOfflineController(app);
        app.players = names.map((name, i) => ({ name, color: colors[i] }));
        app.match = createMatch(randomSeed(), names.length);
        app.scenes.go('countdown');
      };

      // Zajęte są tylko kolory widocznych graczy (ukryci 3. i 4. gracz niczego nie blokują)
      const swatches = colors.map((c, i) =>
        swatch(c, () => {
          colors[i] = nextColor(colors[i], colors.slice(0, count).filter((_, j) => j !== i));
          paintSwatch(swatches[i], colors[i]);
        }),
      );

      const countButtons = [];
      for (let n = OFFLINE_MIN_PLAYERS; n <= OFFLINE_MAX_PLAYERS; n++) {
        countButtons.push(h('button', { type: 'button', className: 'count', onclick: () => setCount(n) }, String(n)));
      }
      const rows = inputs.map((input, i) =>
        h(
          'div',
          { className: 'row' },
          swatches[i],
          input,
          h('small', {}, KEYMAPS[i].help),
        ),
      );
      const hint = h('p', { className: 'hint' });
      const colorHint = h('p', { className: 'hint' }, 'Kliknij kwadracik, żeby zmienić kolor węża.');

      function setCount(n) {
        count = n;
        // Nowo widoczny gracz z kolorem kogoś innego dostaje pierwszy wolny
        for (let i = 0; i < n; i++) {
          colors[i] = pickColor(colors[i], colors.slice(0, i));
          paintSwatch(swatches[i], colors[i]);
        }
        countButtons.forEach((b, i) => b.classList.toggle('selected', i + OFFLINE_MIN_PLAYERS === n));
        rows.forEach((row, i) => (row.hidden = i >= n));
        rows[0].querySelector('small').textContent = n === 1 ? SOLO_HELP : KEYMAPS[0].help;
        hint.textContent = COUNT_HINTS[n] ?? '';
      }

      const form = h(
        'form',
        {
          className: 'panel',
          onsubmit: start,
          onkeydown: (e) => {
            if (e.code === 'Escape') app.scenes.go('menu');
            // Szybki wybór liczby graczy cyframi, gdy nie piszemy w polu
            const digit = /^Digit([1-4])$/.exec(e.code);
            if (digit && !(e.target instanceof HTMLInputElement)) setCount(Number(digit[1]));
          },
        },
        h('h2', {}, 'GRACZE'),
        h('div', { className: 'row', style: { justifyContent: 'center' } }, h('span', {}, 'Ilu graczy?'), countButtons),
        rows,
        colorHint,
        hint,
        h(
          'div',
          { className: 'buttons' },
          h('button', { type: 'button', onclick: () => app.scenes.go('menu') }, 'WSTECZ'),
          h('button', { type: 'submit' }, 'START'),
        ),
        h('p', { className: 'hint' }, 'Enter — start · Esc — menu'),
      );
      setCount(count);
      app.overlay.show(form);
      inputs[0].select();
    },

    exit() {
      app.overlay.hide();
    },

    render() {
      app.renderer.begin();
      drawText(app.renderer.ctx, 'GRA NA JEDNYM KOMPUTERZE', VIEW_W / 2, 80, { size: 20, color: PLAYER_COLORS[0], glow: 12 });
    },
  };
}

Object.assign(__exports, { clampPlayers, cleanName, savedColors, createSetupScene });
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
// Mecz: seria rund do WINS_TO_MATCH wygranych. Remis nie daje punktu. Od 2 do 4 graczy.

const { WINS_TO_MATCH } = __require("src/config.js");

/** @typedef {import('./types.js').RoundResult} RoundResult */

/**
 * @typedef {object} MatchState
 * @property {number} seed
 * @property {number} round       liczba rozegranych rund
 * @property {number[]} wins       wygrane rundy na gracza
 * @property {RoundResult[]} history
 * @property {number | null} winner
 */

/** @param {number} seed @param {number} [players] @returns {MatchState} */
function createMatch(seed, players = 2) {
  return { seed: seed >>> 0, round: 0, wins: Array(players).fill(0), history: [], winner: null };
}

/** Ziarno kolejnej rundy: każda runda ma inny labirynt, ale cały mecz jest powtarzalny. */
function nextRoundSeed(match) {
  return (match.seed + Math.imul(match.round + 1, 0x9e3779b9)) >>> 0;
}

/**
 * Stan meczu po rozegranych rundach (dla gracza dołączającego w trakcie: zna tylko ich wyniki).
 * @param {number} seed @param {number} players @param {(number | 'draw')[]} winners zwycięzcy kolejnych rund
 */
function replayMatch(seed, players, winners) {
  const match = createMatch(seed, players);
  for (const winner of winners) recordRound(match, { winner });
  return match;
}

/** @param {MatchState} match @param {RoundResult} result @returns {number | null} */
function recordRound(match, result) {
  match.round++;
  match.history.push(result);
  if (result.winner !== 'draw') {
    match.wins[result.winner]++;
    if (match.wins[result.winner] >= WINS_TO_MATCH) match.winner = result.winner;
  }
  return match.winner;
}

Object.assign(__exports, { createMatch, nextRoundSeed, replayMatch, recordRound });
};

// ---- src/ui/storage.js ----
__factories["src/ui/storage.js"] = function (__exports) {
// Zapamiętywanie drobiazgów (imiona) w przeglądarce. Brak dostępu do localStorage
// (tryb prywatny, zablokowane dane) nie może psuć gry.

const PREFIX = 'snakeBrawl.';

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // trudno, następnym razem trzeba będzie wpisać od nowa
  }
}

Object.assign(__exports, { load, save });
};

// ---- src/modes/offline.js ----
__factories["src/modes/offline.js"] = function (__exports) {
// Gra na jednym komputerze: komendy prosto z klawiatury, zestaw klawiszy i = gracz i.
// W treningu (jeden gracz) wąż słucha wszystkich zestawów. Dotyk steruje graczem 1.

const { randomSeed } = __require("src/core/rng.js");
const { createMatch } = __require("src/game/match.js");
const { mergeCommands } = __require("src/input/touch.js");

/** @param {any} app */
function createOfflineController(app) {
  return {
    canPause: true,
    canSkip: true,
    rematchHint: 'SPACJA — rewanż    ESC — menu',
    commands() {
      const n = app.players.length;
      if (n === 1) return [mergeCommands(app.keyboard.consumeMerged(), app.touch.consume())];
      const [first, ...rest] = app.keyboard.consumeCommands().slice(0, n);
      return [mergeCommands(first, app.touch.consume()), ...rest];
    },
    leave: () => app.scenes.go('menu'),
    rematch() {
      app.match = createMatch(randomSeed(), app.players.length);
      app.scenes.go('countdown');
    },
  };
}

Object.assign(__exports, { createOfflineController });
};

// ---- src/ui/swatch.js ----
__factories["src/ui/swatch.js"] = function (__exports) {
// Kwadracik koloru gracza. Klikalny: każde kliknięcie zmienia kolor na następny wolny.

const { h } = __require("src/ui/dom.js");

/** Maluje kwadracik na dany kolor (z poświatą). */
function paintSwatch(el, color) {
  el.style.background = color;
  el.style.boxShadow = `0 0 8px ${color}`;
}

/**
 * @param {string} color
 * @param {(() => void) | null} onPick  kliknięcie (null = zwykły, nieklikalny kwadracik)
 */
function swatch(color, onPick = null) {
  const el = onPick
    ? h('button', { type: 'button', className: 'swatch pick', title: 'Kliknij, żeby zmienić kolor', 'aria-label': 'Zmień kolor', onclick: onPick })
    : h('span', { className: 'swatch' });
  paintSwatch(el, color);
  return el;
}

Object.assign(__exports, { paintSwatch, swatch });
};

// ---- src/scenes/online.js ----
__factories["src/scenes/online.js"] = function (__exports) {
// Gra przez internet: imię, utworzenie pokoju albo dołączenie kodem, poczekalnia.

const { DEFAULT_NAMES, MAX_PLAYERS, NAME_MAX, PLAYER_COLORS, VIEW_W } = __require("src/config.js");
const { joinRoom, roomLink, roomsPage, serverUrl, showRoomInAddressBar } = __require("src/net/client.js");
const { PUBLIC_ROOMS, nextColor, normalizeCode, pickColor, randomCode } = __require("src/net/protocol.js");
const { paintSwatch, swatch } = __require("src/ui/swatch.js");
const { attachSession, leaveOnline } = __require("src/modes/online.js");
const { drawText } = __require("src/render/text.js");
const { h } = __require("src/ui/dom.js");
const { load, save } = __require("src/ui/storage.js");
const { cleanName } = __require("src/scenes/setup.js");

/** Ile razy próbujemy nowego kodu, gdy wylosowany jest zajęty. */
const CREATE_ATTEMPTS = 5;

/** @param {any} app */
function createOnlineScene(app) {
  let busy = false;

  /**
   * Formularz: imię + utwórz / dołącz. Z linku zaproszenia (inviteCode) kod jest już wpisany,
   * a Enter od razu dołącza.
   */
  function showForm(error = '', inviteCode = null) {
    const server = serverUrl();
    const name = h('input', {
      value: load('onlineName', load('names', DEFAULT_NAMES)[0]),
      maxLength: NAME_MAX,
      'aria-label': 'Twoje imię',
    });
    const code = h('input', {
      value: inviteCode ?? '',
      placeholder: 'KOD',
      maxLength: 4,
      'aria-label': 'Kod pokoju',
      style: { width: '6em', textTransform: 'uppercase' },
    });
    const message = h('p', { className: 'hint error' }, error || (server ? '' : 'Serwer gry online nie jest jeszcze ustawiony.'));
    // Wybrany kolor (gdy w pokoju ktoś już go ma, serwer da pierwszy wolny; w poczekalni można zmienić)
    let color = pickColor(load('onlineColor', PLAYER_COLORS[0]), []);
    const colorPick = swatch(color, () => {
      color = nextColor(color, []);
      paintSwatch(colorPick, color);
      save('onlineColor', color);
    });

    const go = async (create) => {
      if (busy || !server) return;
      const playerName = cleanName(name.value, 0);
      save('onlineName', playerName);
      const joinCode = create ? null : normalizeCode(code.value);
      if (!create && !joinCode) {
        message.textContent = 'Wpisz 4-znakowy kod pokoju';
        code.focus();
        return;
      }
      busy = true;
      message.textContent = create ? 'Tworzę pokój…' : 'Łączę…';
      try {
        let session = null;
        for (let i = 0; !session; i++) {
          try {
            session = await joinRoom(server, create ? randomCode() : joinCode, playerName, create, color);
          } catch (err) {
            if (!(create && err.code === 'exists' && i < CREATE_ATTEMPTS)) throw err;
          }
        }
        attachSession(app, session);
        showLobby();
      } catch (err) {
        message.textContent = err?.msg ?? 'Coś poszło nie tak';
      } finally {
        busy = false;
      }
    };

    const panel = h(
      'form',
      {
        className: 'panel',
        onsubmit: (e) => e.preventDefault(),
        // Enter w polu: z wpisanym kodem dołącza, bez kodu tworzy pokój
        // (formularz z dwoma polami i bez przycisku „submit” sam się nie wysyła)
        onkeydown: (e) => {
          if (e.code === 'Escape') app.scenes.go('menu');
          if ((e.code === 'Enter' || e.code === 'NumpadEnter') && e.target instanceof HTMLInputElement) {
            e.preventDefault();
            go(!code.value.trim());
          }
        },
      },
      h('h2', {}, inviteCode ? (PUBLIC_ROOMS.includes(inviteCode) ? `POKÓJ PUBLICZNY ${inviteCode}` : `ZAPROSZENIE DO POKOJU ${inviteCode}`) : 'GRA PRZEZ INTERNET'),
      inviteCode && h('p', { className: 'hint' }, 'Wpisz swoje imię i wciśnij Enter, żeby dołączyć.'),
      h('div', { className: 'row' }, h('span', { style: { width: '7em' } }, 'Imię'), colorPick, name),
      h('p', { className: 'hint' }, 'Kliknij kwadracik, żeby zmienić kolor węża.'),
      h(
        'div',
        { className: 'buttons' },
        h('button', { type: 'button', onclick: () => go(true), disabled: !server }, 'UTWÓRZ POKÓJ'),
      ),
      h('p', { className: 'hint' }, 'albo dołącz do znajomych:'),
      h(
        'div',
        { className: 'row', style: { justifyContent: 'center' } },
        code,
        h('button', { type: 'button', onclick: () => go(false), disabled: !server }, 'DOŁĄCZ'),
      ),
      message,
      h(
        'div',
        { className: 'buttons' },
        h('button', { type: 'button', onclick: () => app.scenes.go('menu') }, 'WSTECZ'),
        // Lista pokoi jest stroną serwera gry, więc tylko gdy gra przyszła z serwera (nie z dysku)
        server && location.protocol !== 'file:' && h('button', { type: 'button', onclick: () => location.assign(roomsPage()) }, 'LISTA POKOI'),
      ),
    );
    app.overlay.show(panel);
    name.select();
  }

  /** Poczekalnia: kod pokoju, lista graczy, start dla założyciela. */
  function showLobby() {
    const lobby = app.session?.lobby;
    if (!lobby) return showForm();
    showRoomInAddressBar(lobby.code);
    const playing = !!lobby.playing;
    const isHost = lobby.host === lobby.you && !playing;
    const canStart = lobby.players.length >= 2;
    // Dołączyliśmy w trakcie meczu: wchodzimy od rundy lateJoin.r (numerujemy od 1 dla ludzi)
    const status = playing
      ? app.lateJoin
        ? `Trwa mecz. Dołączysz od rundy ${app.lateJoin.r + 1}…`
        : 'Mecz właśnie się kończy, za chwilę wszyscy wrócą tutaj…'
      : isHost
        ? canStart
          ? 'Kliknij START, gdy wszyscy są.'
          : 'Czekamy na co najmniej jednego gracza…'
        : lobby.public
          ? 'Czekamy, aż gospodarz (pierwszy w pokoju) zacznie mecz…'
          : 'Czekamy, aż założyciel zacznie mecz…';

    const rows = lobby.players.map((p, i) =>
      h(
        'div',
        { className: 'row' },
        // Własny kolor można zmienić w poczekalni (serwer pilnuje, żeby się nie powtarzał)
        p.id === lobby.you && !playing
          ? swatch(p.color, () => {
              const next = nextColor(p.color, lobby.players.filter((o) => o.id !== p.id).map((o) => o.color));
              save('onlineColor', next);
              app.session?.send({ t: 'color', c: next });
            })
          : swatch(p.color ?? PLAYER_COLORS[i]),
        h('span', { style: { color: p.color ?? PLAYER_COLORS[i] } }, p.name),
        h('small', {}, [p.id === lobby.host ? (lobby.public ? '★ gospodarz' : '★ założyciel') : '', p.id === lobby.you ? ' (Ty)' : ''].join('')),
      ),
    );

    const panel = h(
      'div',
      { className: 'panel', onkeydown: (e) => e.code === 'Escape' && leaveOnline(app) },
      h('h2', {}, lobby.public ? `POKÓJ PUBLICZNY  ${lobby.code}` : `POKÓJ  ${lobby.code}`),
      h('p', { className: 'hint' }, 'Wyślij znajomym link (albo sam kod), żeby dołączyli:'),
      linkRow(lobby.code),
      rows,
      h('p', { className: 'hint' }, `${lobby.players.length} / ${MAX_PLAYERS} graczy`),
      h(
        'div',
        { className: 'buttons' },
        h('button', { type: 'button', onclick: () => leaveOnline(app) }, 'WYJDŹ'),
        isHost && h('button', { type: 'button', autofocus: true, disabled: !canStart, onclick: () => app.session?.send({ t: 'start' }) }, 'START'),
      ),
      h('p', { className: 'hint' }, status),
    );
    app.overlay.show(panel);
  }

  /** Link zaproszenia z przyciskiem kopiowania. */
  function linkRow(code) {
    const link = h('input', { value: roomLink(code), readOnly: true, 'aria-label': 'Link do pokoju', style: { width: '24em', fontSize: '0.7em' } });
    const copy = h('button', { type: 'button' }, 'KOPIUJ LINK');
    copy.addEventListener('click', async () => {
      link.select();
      try {
        await navigator.clipboard.writeText(link.value);
      } catch {
        document.execCommand?.('copy'); // starsze przeglądarki i strona z dysku
      }
      copy.textContent = 'SKOPIOWANO!';
      setTimeout(() => (copy.textContent = 'KOPIUJ LINK'), 1500);
    });
    return h('div', { className: 'row', style: { justifyContent: 'center' } }, link, copy);
  }

  return {
    /** @param {{ lobby?: boolean, error?: string, invite?: string }} [params] */
    enter(params = {}) {
      app.onLobby = () => showLobby();
      if (params.lobby && app.session) showLobby();
      else showForm(params.error, params.invite ?? null);
    },

    exit() {
      app.onLobby = null;
      app.overlay.hide();
    },

    render() {
      app.renderer.begin();
      drawText(app.renderer.ctx, 'GRA PRZEZ INTERNET', VIEW_W / 2, 70, { size: 20, color: PLAYER_COLORS[1], glow: 12 });
      drawText(app.renderer.ctx, `2–${MAX_PLAYERS} graczy, każdy na swoim komputerze`, VIEW_W / 2, 105, { size: 10, color: '#7a80a8' });
    },
  };
}

Object.assign(__exports, { createOnlineScene });
};

// ---- src/modes/online.js ----
__factories["src/modes/online.js"] = function (__exports) {
// Gra przez internet: komendy wszystkich graczy przez serwer (lockstep) z przewidywaniem (rollback):
// ekran nie czeka na cudze ruchy, a rundę rozstrzyga stan policzony z prawdziwych komend.

const { BOARD_Y, COLORS, PLAYER_COLORS, TICKS_PER_SECOND, VIEW_W } = __require("src/config.js");
const { createMatch, replayMatch } = __require("src/game/match.js");
const { Lockstep } = __require("src/net/lockstep.js");
const { Rollback } = __require("src/net/rollback.js");
const { mergeCommands } = __require("src/input/touch.js");
const { showRoomInAddressBar } = __require("src/net/client.js");
const { drawPanel, drawText } = __require("src/render/text.js");

/** Ile ticków przestoju, zanim pokażemy „czekam na…” (żeby nie migało przy zwykłym pingu). */
const STALL_NOTICE = 10;
/** Najdalej tyle klatek przewidujemy (ok. 0,45 s); dalej gra czeka na brakujące ruchy. */
const MAX_PREDICT = 8;

/**
 * Podłącza sesję do aplikacji: obsługuje start meczu, ruchy i rozłączenia.
 * @param {any} app @param {import('../net/client.js').Session} session
 */
function attachSession(app, session) {
  app.session = session;
  session.onMessage = (msg) => {
    if (msg.t === 'start') startMatch(app, session, msg);
    else if (msg.t === 'late') waitToJoin(app, session, msg);
    else if (msg.t === 'lobby') {
      // Mecz się skończył, zanim dołączający zdążył wejść: zwykła poczekalnia
      if (!msg.playing) app.lateJoin = null;
      app.onLobby?.(msg);
    } else if (msg.t === 'result' && app.lateJoin) {
      app.lateJoin.results[msg.r] = msg.w;
      tryLateStart(app, session);
    } else app.controller.receive?.(msg);
  };
  session.onClose = () => {
    app.session = null;
    app.scenes.go('online', { error: 'Połączenie z serwerem zostało zerwane' });
  };
}

/** Wyjście z pokoju i powrót do menu. */
function leaveOnline(app) {
  app.session?.close();
  app.session = null;
  app.lateJoin = null;
  showRoomInAddressBar(null);
  app.scenes.go('menu');
}

function startMatch(app, session, { seed, players }) {
  app.lateJoin = null;
  const me = players.findIndex((p) => p.id === session.lobby?.you);
  app.players = players.map((p, i) => ({ name: p.name, color: p.color ?? PLAYER_COLORS[i] }));
  app.match = createMatch(seed, players.length);
  app.controller = createOnlineController(app, session, me);
  app.scenes.go('countdown');
}

/**
 * Dołączenie w trakcie meczu: czekamy w poczekalni na wyniki rund sprzed naszej rundy
 * (żeby znać stan meczu) i wchodzimy do gry od rundy r.
 */
function waitToJoin(app, session, { seed, r, players, results }) {
  app.lateJoin = { seed, r, players, results: [...results] };
  app.onLobby?.(session.lobby);
  tryLateStart(app, session);
}

function tryLateStart(app, session) {
  const late = app.lateJoin;
  const known = late.results.slice(0, late.r);
  if (known.length < late.r || known.some((w) => w === undefined)) return;
  const match = replayMatch(late.seed, late.players.length, known);
  // Mecz rozstrzygnął się, zanim weszliśmy: czekamy na powrót wszystkich do poczekalni
  if (match.winner !== null) return;

  app.lateJoin = null;
  const me = late.players.findIndex((p) => p.id === session.lobby?.you);
  app.players = late.players.map((p, i) => ({ name: p.name, color: p.color ?? PLAYER_COLORS[i] }));
  app.match = match;
  app.controller = createOnlineController(app, session, me, late.players.map((p) => p.r));
  app.scenes.go('countdown');
}

/**
 * @param {any} app @param {import('../net/client.js').Session} session @param {number} me
 * @param {number[]} [joinRounds] od której rundy gra każdy gracz
 */
function createOnlineController(app, session, me, joinRounds) {
  const lock = new Lockstep(app.players.length, me, joinRounds, { maxAhead: MAX_PREDICT });
  const rollback = new Rollback(lock);
  let stalled = 0;

  return {
    canPause: false,
    canSkip: false,
    matchEndTicks: 8 * TICKS_PER_SECOND,
    rematchHint: 'Za chwilę powrót do poczekalni   ESC — wyjście',
    me,

    receive(msg) {
      if (msg.t === 'input') lock.receive(msg);
      else if (msg.t === 'left') lock.markLeft(msg.p, msg.r, msg.f);
      else if (msg.t === 'joined') {
        // Nowy gracz w trakcie meczu: gra od rundy msg.r, do tego czasu nie ma węża
        lock.addPlayer(msg.r);
        app.players.push({ name: msg.name, color: msg.color ?? PLAYER_COLORS[msg.p] });
        app.match.wins.push(0);
      }
    },

    /** Ilu węży jest w danej rundzie (dołączający wchodzą od swojej rundy). */
    playersInRound: (r) => lock.playersInRound(r),

    /** Wynik rundy dla serwera: potrzebny graczom dołączającym w trakcie meczu. */
    roundEnded(r, result) {
      session.send({ t: 'result', r, w: result.winner });
    },

    startRound(r) {
      rollback.startRound(r, app.round);
      app.round = rollback.display;
      stalled = 0;
    },

    /**
     * Raz na tick: upływ czasu, wysłanie własnej komendy (z klawiatury tylko pierwszej),
     * potwierdzenie tego, co już wiadomo, i przewidywany stan na ekran (app.round).
     * @returns {import('../game/types.js').GameEvent[]} zdarzenia do efektów i dźwięków
     */
    advance() {
      lock.tick();
      let first = true;
      while (lock.canSend()) {
        const cmd = first ? mergeCommands(app.keyboard.consumeMerged(), app.touch.consume()) : {};
        session.send(lock.makeInput(cmd));
        first = false;
      }
      const { events, advanced } = rollback.update();
      app.round = rollback.display;
      stalled = advanced ? 0 : stalled + 1;
      return events;
    },

    /** Mniej niż dwóch graczy w pokoju: mecz nie ma sensu, wracamy do poczekalni. */
    shouldEndMatch: () => lock.activePlayers() < 2,

    drawStatus(ctx) {
      if (stalled < STALL_NOTICE) return;
      const names = lock.waitingFor().map((p) => app.players[p].name);
      if (!names.length) return;
      drawPanel(ctx, VIEW_W / 2, BOARD_Y + 30, 520, 40);
      drawText(ctx, `Czekam na: ${names.join(', ')}`, VIEW_W / 2, BOARD_Y + 30, { size: 10, color: COLORS.text });
    },

    leave: () => leaveOnline(app),

    rematch() {
      session.send({ t: 'lobby' });
      app.scenes.go('online', { lobby: true });
    },
  };
}

Object.assign(__exports, { attachSession, leaveOnline, createOnlineController });
};

// ---- src/net/lockstep.js ----
__factories["src/net/lockstep.js"] = function (__exports) {
// Lockstep: każdy komputer liczy tę samą symulację z tych samych komend.
// Komendy są numerowane (runda, klatka). Własna komenda działa INPUT_DELAY klatek później,
// żeby zdążyła dolecieć do innych. Krok symulacji robimy tylko, gdy mamy komendy wszystkich.
//
// Tempo wyznacza lokalny zegar (clock: ticki od początku rundy, co 55 ms):
// - wysyłamy dokładnie jedną komendę na tick: na klatkę, która wykona się INPUT_DELAY ticków później,
// - symulacja nie wyprzedza zegara (klatka < clock), więc gra nigdy nie biegnie szybciej
//   niż w trybie offline; kto został w tyle, nadrabia najwyżej o jedną klatkę na tick,
// - zegar nie ucieka symulacji dalej niż o MAX_AHEAD klatek. Gdy czekamy na ruchy innych
//   (np. zaczęliśmy rundę chwilę przed nimi), zegar staje, zamiast wysyłać nasze komendy
//   coraz dalej w przyszłość, co wydłużałoby opóźnienie naszych własnych skrętów.
// Czysta logika, bez sieci (wysyłaniem zajmuje się kontroler trybu online).

const { decodeCommand, encodeCommand } = __require("src/net/protocol.js");

const INPUT_DELAY = 1; // 55 ms (z przewidywaniem, patrz rollback.js)
const MAX_AHEAD = 1;

class Lockstep {
  /**
   * @param {number} players liczba graczy
   * @param {number} me mój numer gracza
   * @param {number[]} [joinRounds] od której rundy gra każdy gracz (dołączający w trakcie meczu)
   * @param {{ maxAhead?: number }} [opts] o ile klatek zegar może wyprzedzić potwierdzoną symulację
   */
  constructor(players, me, joinRounds = Array(players).fill(0), { maxAhead = MAX_AHEAD } = {}) {
    this.maxAhead = maxAhead;
    this.players = players;
    this.me = me;
    this.joinRounds = [...joinRounds];
    /** @type {Map<string, import('../game/types.js').Command>} klucz `runda:klatka:gracz` */
    this.buffer = new Map();
    /** @type {Map<number, { r: number, f: number }>} od kiedy gracz jest poza grą */
    this.left = new Map();
    this.round = -1;
    this.frame = 0;
    this.sent = 0;
    this.clock = 0;
  }

  /** Początek rundy: pierwsze INPUT_DELAY klatek są puste u wszystkich. */
  startRound(r) {
    this.round = r;
    this.frame = 0;
    this.sent = INPUT_DELAY;
    this.clock = 0;
    for (const key of this.buffer.keys()) {
      if (Number(key.split(':')[0]) < r) this.buffer.delete(key);
    }
  }

  /** Upływ jednego ticka czasu rzeczywistego. */
  tick() {
    if (this.round >= 0 && this.clock - this.frame <= this.maxAhead) this.clock++;
  }

  /**
   * Czy wysłać kolejną własną komendę: jedna na tick. W ticku `clock` wykonuje się klatka
   * clock - 1, więc komenda na klatkę clock - 1 + INPUT_DELAY działa dokładnie INPUT_DELAY ticków później.
   */
  canSend() {
    return this.round >= 0 && this.sent < this.clock + INPUT_DELAY;
  }

  /** Czy symulacji wolno zrobić kolejny krok (nie wyprzedzamy zegara). */
  due() {
    return this.round >= 0 && this.frame < this.clock;
  }

  /** O ile klatek symulacja jest za zegarem (0 = na czas). */
  behind() {
    return Math.max(0, this.clock - this.frame - 1);
  }

  /** Zapisuje własną komendę na kolejną klatkę i zwraca wiadomość do wysłania. */
  makeInput(cmd) {
    const f = this.sent++;
    const enc = encodeCommand(cmd);
    this.buffer.set(`${this.round}:${f}:${this.me}`, decodeCommand(enc));
    return { t: 'input', r: this.round, f, ...enc };
  }

  /** Komenda innego gracza z serwera (własne echo pomijamy, bo już ją mamy). */
  receive({ p, r, f, d, s, m }) {
    if (p === this.me) return;
    this.buffer.set(`${r}:${f}:${p}`, decodeCommand({ d, s, m }));
  }

  /** Gracz się rozłączył: od klatki (r, f) jego wąż ginie. */
  markLeft(p, r, f) {
    this.left.set(p, { r, f });
  }

  isLeft(p, r = this.round, f = this.frame) {
    const at = this.left.get(p);
    return !!at && (r > at.r || (r === at.r && f >= at.f));
  }

  /** Nowy gracz dołącza w trakcie meczu, od rundy r. */
  addPlayer(r) {
    this.joinRounds.push(r);
    this.players++;
  }

  /** Ilu graczy (węży) jest w rundzie r: dołączający dopiero od swojej rundy. */
  playersInRound(r) {
    let n = 0;
    while (n < this.players && this.joinRounds[n] <= r) n++;
    return n;
  }

  /** Ilu graczy jeszcze gra (nie rozłączyło się). */
  activePlayers() {
    let n = 0;
    for (let p = 0; p < this.players; p++) if (!this.isLeft(p, Infinity, 0)) n++;
    return n;
  }

  /** Gracze, na których komendy czekamy w bieżącej klatce. */
  waitingFor() {
    const missing = [];
    for (let p = 0; p < this.playersInRound(this.round); p++) {
      if (this.frame < INPUT_DELAY || this.isLeft(p)) continue;
      if (!this.buffer.has(`${this.round}:${this.frame}:${p}`)) missing.push(p);
    }
    return missing;
  }

  /**
   * Komendy na klatkę f do przewidywania: znane, a brakujące jako „nic nie robi” (jedzie prosto).
   * @returns {import('../game/types.js').Command[]}
   */
  commandsAt(f) {
    const commands = [];
    for (let p = 0; p < this.playersInRound(this.round); p++) {
      if (this.isLeft(p, this.round, f)) commands.push({ quit: true });
      else commands.push(this.buffer.get(`${this.round}:${f}:${p}`) ?? {});
    }
    return commands;
  }

  /**
   * Komendy wszystkich graczy na bieżącą klatkę (i przejście do następnej)
   * albo null, jeśli czegoś jeszcze brakuje.
   * @returns {import('../game/types.js').Command[] | null}
   */
  take() {
    if (!this.due() || this.waitingFor().length) return null;
    const { round, frame } = this;
    const commands = [];
    for (let p = 0; p < this.playersInRound(round); p++) {
      const key = `${round}:${frame}:${p}`;
      if (this.isLeft(p)) commands.push({ quit: true });
      else commands.push(this.buffer.get(key) ?? {});
      this.buffer.delete(key);
    }
    this.frame++;
    return commands;
  }
}

Object.assign(__exports, { INPUT_DELAY, MAX_AHEAD, Lockstep });
};

// ---- src/net/rollback.js ----
__factories["src/net/rollback.js"] = function (__exports) {
// Przewidywanie w grze online (rollback): ekran nie czeka na ruchy innych graczy.
//
// - Stan potwierdzony liczymy tylko z prawdziwych komend wszystkich graczy (jak w lockstepie),
//   więc jest identyczny na każdym komputerze i to on rozstrzyga rundę.
// - Na ekranie jest stan przewidywany: kopia potwierdzonego, policzona dalej aż do bieżącego
//   ticka. Nasze komendy znamy, a brakujące cudze zastępujemy „nic nie robi” (jedzie prosto).
// - Gdy przyjdą prawdziwe komendy, potwierdzony stan idzie do przodu, a przewidywany liczymy
//   od nowa. Cudzy wąż, który skręcił wcześniej, niż przewidzieliśmy, przeskakuje wtedy na
//   właściwe miejsce, ale gra się nie zatrzymuje.
// - Przewidujemy najwyżej lock.maxAhead klatek do przodu. Dalej zegar staje (czekamy).
// Czysta logika: bez sieci i bez rysowania.

const { cloneRound, stepRound } = __require("src/game/round.js");

/** Zdarzenia, które od razu pokazujemy z przewidywania (własny strzał i miecz bez czekania na sieć). */
const INSTANT = new Set(['shot', 'swordSwing']);

class Rollback {
  /** @param {import('./lockstep.js').Lockstep} lock */
  constructor(lock) {
    this.lock = lock;
    /** @type {import('../game/types.js').RoundState | null} */
    this.confirmed = null;
    /** @type {import('../game/types.js').RoundState | null} stan na ekranie */
    this.display = null;
    this.shownFrame = 0;
    /** @type {((state: import('../game/types.js').RoundState) => void) | null} po każdej potwierdzonej klatce (testy) */
    this.onConfirm = null;
  }

  /** @param {number} r @param {import('../game/types.js').RoundState} round */
  startRound(r, round) {
    this.lock.startRound(r);
    this.confirmed = round;
    this.display = cloneRound(round);
    this.shownFrame = 0;
  }

  /**
   * Po ticku zegara (lock.tick() i wysłanie własnej komendy robi kontroler).
   * @returns {{ events: import('../game/types.js').GameEvent[], advanced: boolean }}
   *   zdarzenia do efektów i dźwięków; advanced = czy obraz poszedł do przodu
   */
  update() {
    const { lock } = this;
    const me = lock.me;
    const events = [];
    let commands;
    while (!this.confirmed.result && (commands = lock.take())) {
      for (const e of stepRound(this.confirmed, commands)) {
        // Własny strzał i miecz pokazaliśmy już z przewidywania
        if (!(INSTANT.has(e.type) && e.snake === me)) events.push(e);
      }
      this.onConfirm?.(this.confirmed);
    }

    const target = lock.clock;
    const advanced = target > this.shownFrame;
    if (this.confirmed.result) {
      this.display = this.confirmed;
      this.shownFrame = target;
      return { events, advanced };
    }

    const display = cloneRound(this.confirmed);
    for (let f = lock.frame; f < target; f++) {
      const step = stepRound(display, lock.commandsAt(f));
      if (f >= this.shownFrame) {
        for (const e of step) if (INSTANT.has(e.type) && e.snake === me) events.push(e);
      }
    }
    // Koniec rundy rozstrzyga tylko stan potwierdzony
    display.result = null;
    this.display = display;
    this.shownFrame = Math.max(this.shownFrame, target);
    return { events, advanced };
  }
}

Object.assign(__exports, { Rollback });
};

// ---- src/game/round.js ----
__factories["src/game/round.js"] = function (__exports) {
// Runda: stan początkowy i jeden krok symulacji.
// Czysta logika: bez DOM, bez czasu systemowego, losowość tylko z RNG w stanie.

const { FOOD_COUNT, GRID_H, GRID_W, MAZE_DENSITY, SNAKE_MOVE_EVERY, START_LENGTH, WALL } = __require("src/config.js");
const { createRng } = __require("src/core/rng.js");
const { fire, moveBullets } = __require("src/game/bullets.js");
const { eatFood, refillFood } = __require("src/game/food.js");
const { cellIndex, passThrough, samePos } = __require("src/game/grid.js");
const { generateMaze, spawnPoints } = __require("src/game/maze.js");
const { applyHit, bounce, createSnake, kill, queueTurn, tickTimers } = __require("src/game/snake.js");
const { applySwords, swing } = __require("src/game/sword.js");

/** @typedef {import('./types.js').RoundState} RoundState */
/** @typedef {import('./types.js').Command} Command */
/** @typedef {import('./types.js').GameEvent} GameEvent */
/** @typedef {import('./types.js').Pos} Pos */
/** @typedef {import('./types.js').Dir} Dir */

/**
 * @param {number} seed
 * @param {{ players?: number, walls?: Uint8Array, foodCount?: number, w?: number, h?: number }} [options]
 * @returns {RoundState}
 */
function createRound(seed, options = {}) {
  const grid = { w: options.w ?? GRID_W, h: options.h ?? GRID_H };
  const rng = createRng(seed);
  // Labirynt zawsze chroni wszystkie miejsca startu, więc nie zależy od liczby graczy
  const spawns = spawnPoints(grid, START_LENGTH);
  const walls = options.walls ?? generateMaze(grid, rng, spawns, { density: MAZE_DENSITY });
  const players = options.players ?? 2;

  /** @type {RoundState} */
  const state = {
    tick: 0,
    rng,
    grid,
    walls,
    snakes: spawns.slice(0, players).map((s, i) => createSnake(i, s.body, s.dir)),
    bullets: [],
    food: [],
    // Przy 5–6 wężach trochę więcej owoców
    foodCount: options.foodCount ?? FOOD_COUNT + Math.max(0, players - 4),
    result: null,
  };
  refillFood(state);
  return state;
}

/**
 * Kopia stanu rundy do przewidywania (gra online): wszystko, co zmienia stepRound, jest nowe.
 * Labirynt i wymiary planszy w trakcie rundy się nie zmieniają, więc są wspólne.
 * @param {RoundState} s @returns {RoundState}
 */
function cloneRound(s) {
  return {
    ...s,
    rng: { ...s.rng },
    snakes: s.snakes.map((sn) => ({ ...sn, body: sn.body.map((p) => ({ ...p })), nextDirs: [...sn.nextDirs] })),
    bullets: s.bullets.map((b) => ({ ...b, pos: { ...b.pos } })),
    food: s.food.map((p) => ({ ...p })),
    result: s.result ? { ...s.result } : null,
  };
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

  // 1. Komendy: skręty (i wyjście z gry online: wąż gracza, który się rozłączył, ginie)
  state.snakes.forEach((snake, i) => {
    if (!snake.alive) return;
    if (commands[i]?.quit) return kill(snake, 'left', null, events);
    for (const dir of commands[i]?.turns ?? []) queueTurn(snake, dir);
  });

  // 2. Timery
  for (const snake of state.snakes) tickTimers(snake);

  // 3. Strzały i miecz
  state.snakes.forEach((snake, i) => {
    if (commands[i]?.shoot) fire(state, snake, events);
    if (commands[i]?.sword) swing(snake, events);
  });

  // 4. Pociski
  moveBullets(state, events);

  // 5. Węże
  if (state.tick % SNAKE_MOVE_EVERY === 0) moveSnakes(state, events);

  // 5b. Miecze tną wokół głów (już po ruchu)
  applySwords(state, events);

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
 * - czerwona ściana → śmierć (wall),
 * - zderzenie głowami (to samo pole albo zamiana miejscami) → giną obaj (crash),
 * - głowa w ciało innego węża → ginie ten, kto wjechał (body),
 * - czarna ściana, własne ciało → odbicie (wąż zawraca w miejscu),
 * - krawędź i niebieska ściana → przeniesienie na drugą stronę (`passThrough`).
 * Odbity albo martwy wąż nie zwalnia pola ogona, więc sprawdzamy ponownie, aż nic się nie zmieni.
 */
function moveSnakes(state, events) {
  const { grid, walls } = state;
  const plans = state.snakes.map((snake) => {
    if (!snake.alive) return null;
    const dir = snake.nextDirs.length ? snake.nextDirs[0] : snake.dir;
    const oldHead = snake.body[0];
    const { pos: head, teleported } = passThrough(grid, walls, oldHead, dir);
    const grows = snake.growPending > 0;
    const body = [head, ...(grows ? snake.body : snake.body.slice(0, -1))];
    const cell = walls[cellIndex(grid, head)];
    return { snake, dir, oldHead, head, teleported, grows, body, dies: cell === WALL.DEADLY ? 'wall' : null, bounce: false };
  });
  const moving = (plan) => plan && !plan.bounce && !plan.dies;

  /** Co spotka głowę węża i: null (jedzie dalej), 'bounce' albo przyczyna śmierci. */
  const outcome = (i, bodies) => {
    const plan = plans[i];
    for (let j = 0; j < plans.length; j++) {
      if (j === i || !state.snakes[j].alive) continue;
      const other = plans[j];
      if (moving(other)) {
        if (samePos(other.head, plan.head)) return 'crash';
        if (samePos(other.head, plan.oldHead) && samePos(plan.head, other.oldHead)) return 'crash';
      }
      if (bodies[j].some((p) => samePos(p, plan.head))) return 'body';
    }
    if (walls[cellIndex(grid, plan.head)] !== WALL.NONE) return 'bounce';
    if (bodies[i].slice(1).some((p) => samePos(p, plan.head))) return 'bounce';
    return null;
  };

  for (let changed = true; changed; ) {
    changed = false;
    const bodies = state.snakes.map((s, i) => (moving(plans[i]) ? plans[i].body : s.body));
    // Najpierw wyniki dla wszystkich, potem zmiany: czołówka dotyczy obu węży naraz
    const results = plans.map((plan, i) => (moving(plan) ? outcome(i, bodies) : null));
    results.forEach((result, i) => {
      if (!result) return;
      if (result === 'bounce') plans[i].bounce = true;
      else plans[i].dies = result;
      changed = true;
    });
  }

  for (const plan of plans) {
    if (!plan) continue;
    const { snake } = plan;
    if (plan.dies) {
      // Głowa zostaje tam, gdzie wjechała (w ścianę albo w rywala)
      snake.body = plan.body;
      kill(snake, plan.dies, null, events);
      continue;
    }
    if (plan.bounce) {
      bounce(snake, grid);
      events.push({ type: 'bounced', snake: snake.id, pos: { ...plan.oldHead } });
      continue;
    }
    if (snake.nextDirs.length) snake.nextDirs.shift();
    snake.dir = plan.dir;
    snake.body = plan.body;
    if (plan.grows) snake.growPending--;
    if (plan.teleported) events.push({ type: 'teleported', snake: snake.id, pos: { ...plan.head } });
  }

  // Głowa wjeżdżająca w cudzy pocisk
  for (const snake of state.snakes) {
    if (!snake.alive) continue;
    const i = state.bullets.findIndex((b) => b.owner !== snake.id && samePos(b.pos, snake.body[0]));
    if (i < 0) continue;
    const [bullet] = state.bullets.splice(i, 1);
    applyHit(snake, 0, bullet.owner, events);
  }
}

/**
 * Runda kończy się, gdy zostanie najwyżej jeden żywy wąż. Nikt → remis.
 * Trening (jeden wąż): runda trwa, dopóki wąż żyje.
 */
function checkRoundEnd(state, events) {
  const alive = state.snakes.filter((s) => s.alive);
  if (alive.length > (state.snakes.length > 1 ? 1 : 0)) return;
  const result = { winner: alive.length === 1 ? alive[0].id : 'draw' };
  state.result = result;
  events.push({ type: 'roundOver', result });
}

Object.assign(__exports, { createRound, cloneRound, stepRound });
};

// ---- src/game/bullets.js ----
__factories["src/game/bullets.js"] = function (__exports) {
// Pociski: strzał (1 segment ogona = 10 strzałów), lot i kolizje.
// Ściany działają na pocisk jak na węża: czarna odbija, czerwona niszczy, niebieska i krawędź
// przenoszą na drugą stronę. Pocisk ma zasięg (BULLET_RANGE pól) i najwyżej BULLET_MAX_BOUNCES
// odbić, żeby nie latał w kółko. Własne pociski przelatują przez strzelającego.

const { BULLET_CELLS, BULLET_MAX_BOUNCES, BULLET_PER_TICKS, BULLET_RANGE, SHOTS_PER_SEGMENT, SHOT_COOLDOWN, WALL } = __require("src/config.js");
const { OPPOSITE, cellIndex, passThrough, samePos } = __require("src/game/grid.js");
const { applyHit, canShoot, segmentAt } = __require("src/game/snake.js");

/** @typedef {import('./types.js').RoundState} RoundState */
/** @typedef {import('./types.js').Snake} Snake */
/** @typedef {import('./types.js').Bullet} Bullet */
/** @typedef {import('./types.js').GameEvent} GameEvent */

/** Ile pól pocisk przelatuje w danym ticku (rozkłada BULLET_CELLS równo na BULLET_PER_TICKS). */
function bulletStepsAt(tick) {
  const at = (t) => Math.floor((t * BULLET_CELLS) / BULLET_PER_TICKS);
  return at(tick) - at(tick - 1);
}

/**
 * Strzał: tworzy pocisk na polu przed głową. Gdy skończy się amunicja, zabiera
 * segment z ogona i zamienia go na SHOTS_PER_SEGMENT strzałów.
 * @param {RoundState} state @param {Snake} snake @param {GameEvent[]} events
 * @returns {boolean} czy strzał padł
 */
function fire(state, snake, events) {
  if (!canShoot(snake)) return false;
  if (snake.ammo === 0) {
    snake.body.pop();
    snake.ammo = SHOTS_PER_SEGMENT;
  }
  snake.ammo--;
  snake.cooldown = SHOT_COOLDOWN;

  /** @type {Bullet} */
  const bullet = { owner: snake.id, pos: { ...snake.body[0] }, dir: snake.dir, travel: 0, bounces: 0 };
  events.push({ type: 'shot', snake: snake.id, pos: { ...snake.body[0] } });

  // Pierwsze pole lotu: przed głową (albo za ścianą, od której pocisk się odbił)
  const first = nextCell(state, bullet);
  if (first.gone) {
    events.push({ type: 'bulletWall', pos: first.wallPos });
    return true;
  }
  applyMove(bullet, first, events);
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
 * Trafienie węża (innego niż strzelający) na polu pocisku.
 * @returns {boolean} true, jeśli pocisk kogoś trafił (i znika)
 */
function bulletHitsSnake(state, bullet, events) {
  for (const snake of state.snakes) {
    if (!snake.alive || snake.id === bullet.owner) continue;
    const index = segmentAt(snake, bullet.pos);
    if (index < 0) continue;
    applyHit(snake, index, bullet.owner, events);
    return true;
  }
  return false;
}

/** Przesuwa pociski o tyle pól, ile wypada w tym ticku, sprawdzając kolizje po każdym polu. */
function moveBullets(state, events) {
  const steps = bulletStepsAt(state.tick);
  for (let i = 0; i < steps && state.bullets.length; i++) stepBullets(state, events);
}

/**
 * Dokąd pocisk przeleci o jedno pole, tak jak wąż: przez krawędź i niebieskie ściany na drugą
 * stronę, od czarnej się odbija (zawraca i zostaje na swoim polu), na czerwonej znika.
 * Znika też po przeleceniu BULLET_RANGE pól i po zbyt wielu odbiciach.
 * @param {RoundState} state @param {Bullet} bullet
 * @returns {{ gone: boolean, pos: import('./types.js').Pos, dir: import('./types.js').Dir,
 *   bounced: boolean, teleported: boolean, wallPos: import('./types.js').Pos }}
 */
function nextCell(state, bullet) {
  const { grid, walls } = state;
  const { pos, teleported } = passThrough(grid, walls, bullet.pos, bullet.dir);
  const wall = walls[cellIndex(grid, pos)];
  const travel = (bullet.travel ?? 0) + 1;
  const result = { gone: false, pos, dir: bullet.dir, bounced: false, teleported, wallPos: pos };
  if (wall === WALL.DEADLY || travel > BULLET_RANGE) return { ...result, gone: true };
  if (wall === WALL.BOUNCE) {
    if ((bullet.bounces ?? 0) >= BULLET_MAX_BOUNCES) return { ...result, gone: true };
    return { ...result, pos: bullet.pos, dir: OPPOSITE[bullet.dir], bounced: true, teleported: false };
  }
  return result;
}

/** Przesuwa pocisk zgodnie z nextCell (bez kolizji z innymi pociskami i wężami). */
function applyMove(bullet, move, events) {
  bullet.pos = move.pos;
  bullet.dir = move.dir;
  bullet.travel = (bullet.travel ?? 0) + 1;
  if (move.bounced) {
    bullet.bounces = (bullet.bounces ?? 0) + 1;
    events.push({ type: 'bulletBounce', pos: move.wallPos });
  }
  if (move.teleported) events.push({ type: 'bulletWarp', pos: move.pos });
}

/**
 * Jeden krok wszystkich pocisków o 1 pole (ściany jak dla węża, patrz nextCell).
 * Pociski, które wejdą na to samo pole albo się miną, znoszą się nawzajem.
 * @param {RoundState} state @param {GameEvent[]} events
 */
function stepBullets(state, events) {
  const gone = new Set();
  const moves = state.bullets.map((b) => {
    const move = nextCell(state, b);
    return { b, move, from: b.pos, to: move.pos };
  });

  for (const m of moves) {
    if (m.move.gone) {
      gone.add(m.b);
      events.push({ type: 'bulletWall', pos: m.move.wallPos });
    }
  }

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

  for (const m of moves) if (!gone.has(m.b)) applyMove(m.b, m.move, events);
  for (const m of moves) {
    if (!gone.has(m.b) && bulletHitsSnake(state, m.b, events)) gone.add(m.b);
  }
  state.bullets = state.bullets.filter((b) => !gone.has(b));
}

Object.assign(__exports, { bulletStepsAt, fire, bulletHitsSnake, moveBullets, nextCell });
};

// ---- src/game/grid.js ----
__factories["src/game/grid.js"] = function (__exports) {
// Kratka: kierunki, pozycje i pomocnicze funkcje.

const { WALL } = __require("src/config.js");

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

/** Czy pole jest poza planszą albo jest ścianą (dowolnego rodzaju). */
function isBlocked(grid, walls, p) {
  return !inBounds(grid, p) || walls[cellIndex(grid, p)] !== 0;
}

/** Zawija pozycję na drugą stronę planszy (krawędź działa jak portal). */
function wrap(grid, p) {
  return { x: (p.x + grid.w) % grid.w, y: (p.y + grid.h) % grid.h };
}

/**
 * Pole, na które wjeżdża wąż z `from` w kierunku `dir`.
 * - Krawędź planszy: wyjazd z przeciwnej krawędzi.
 * - Niebieska ściana w środku: wyjazd zza jej bliźniaczki po drugiej stronie planszy
 *   (obraz po obrocie o 180°; labirynt jest symetryczny, więc zawsze istnieje),
 *   dalej w tym samym kierunku.
 * @param {Grid} grid @param {Uint8Array} walls @param {Pos} from @param {Dir} dir
 * @returns {{ pos: Pos, teleported: boolean }}
 */
function passThrough(grid, walls, from, dir) {
  const isPortal = (p) => walls[cellIndex(grid, p)] === WALL.PORTAL;
  const next = step(from, dir);
  let teleported = !inBounds(grid, next);
  let pos = wrap(grid, next);
  if (isPortal(pos)) {
    pos = rotate180(grid, pos);
    for (let i = 0; i < grid.w + grid.h && isPortal(pos); i++) pos = wrap(grid, step(pos, dir));
    teleported = true;
  }
  return { pos, teleported };
}

/**
 * Kierunek od pola `from` do sąsiedniego pola `to`, także przez krawędź planszy.
 * Gdy pola nie sąsiadują (przeskok przez niebieską ścianę), zwraca null.
 * @returns {Dir | null}
 */
function dirBetween(grid, from, to) {
  for (const d of /** @type {Dir[]} */ (Object.keys(DIR_VEC))) {
    if (samePos(wrap(grid, step(from, d)), to)) return d;
  }
  return null;
}

Object.assign(__exports, { DIR_VEC, OPPOSITE, step, samePos, inBounds, cellIndex, rotate180, isBlocked, wrap, passThrough, dirBetween });
};

// ---- src/game/snake.js ----
__factories["src/game/snake.js"] = function (__exports) {
// Wąż: tworzenie, skręty, odbicie, reakcja na trafienie.

const { OPPOSITE, dirBetween } = __require("src/game/grid.js");

/** @typedef {import('./types.js').Snake} Snake */
/** @typedef {import('./types.js').Dir} Dir */
/** @typedef {import('./types.js').Pos} Pos */
/** @typedef {import('./types.js').GameEvent} GameEvent */

const MAX_QUEUED_TURNS = 2;

/** @param {number} id @param {Pos[]} body @param {Dir} dir @returns {Snake} */
function createSnake(id, body, dir) {
  return {
    id,
    body: body.map((p) => ({ ...p })),
    dir,
    nextDirs: [],
    growPending: 0,
    eaten: 0,
    cooldown: 0,
    swordTicks: 0,
    swordCooldown: 0,
    ammo: 0,
    alive: true,
    death: null,
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
  if (snake.swordCooldown > 0) snake.swordCooldown--;
}

/** @param {Snake} snake */
function canShoot(snake) {
  return snake.alive && snake.cooldown === 0 && (snake.ammo > 0 || snake.body.length > 1);
}

/**
 * Odbicie od przeszkody: wąż zawraca, czyli ogon staje się głową
 * i dalej jedzie w stronę, w którą „patrzył” ogon.
 * @param {Snake} snake @param {import('./types.js').Grid} grid
 */
function bounce(snake, grid) {
  snake.nextDirs = [];
  if (snake.body.length === 1) {
    snake.dir = OPPOSITE[snake.dir];
    return;
  }
  snake.body.reverse();
  // Przy przeskoku przez portal segmenty nie sąsiadują: wtedy po prostu zawracamy
  snake.dir = dirBetween(grid, snake.body[1], snake.body[0]) ?? OPPOSITE[snake.dir];
}

/** Śmierć węża. @param {Snake} snake @param {'shot' | 'wall' | 'crash' | 'body' | 'sword' | 'left'} cause */
function kill(snake, cause, by, events) {
  snake.alive = false;
  snake.death = cause;
  events.push({ type: 'died', snake: snake.id, by, pos: { ...snake.body[0] }, cause });
}

/**
 * Trafienie pociskiem w segment o indeksie `index`.
 * Głowa → śmierć, ciało → odcięcie ogona od trafionego segmentu.
 * @param {Snake} snake @param {number} index @param {number} by @param {GameEvent[]} events
 */
function applyHit(snake, index, by, events) {
  if (index === 0) {
    kill(snake, 'shot', by, events);
    return;
  }
  const cells = snake.body.splice(index);
  events.push({ type: 'bodyHit', snake: snake.id, by, cells });
}

/** Indeks segmentu węża na danym polu albo -1. */
function segmentAt(snake, pos) {
  return snake.body.findIndex((p) => p.x === pos.x && p.y === pos.y);
}

Object.assign(__exports, { MAX_QUEUED_TURNS, createSnake, queueTurn, tickTimers, canShoot, bounce, kill, applyHit, segmentAt });
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
    snake.eaten++;
    events.push({ type: 'ate', snake: snake.id, pos });
  }
}

Object.assign(__exports, { refillFood, eatFood });
};

// ---- src/game/maze.js ----
__factories["src/game/maze.js"] = function (__exports) {
// Symetryczny labirynt: każda ściana ma lustrzane odbicia w obu osiach (a więc też obraz
// po obrocie o 180°), więc gracze w każdym z czterech rogów (i obaj na środkach boków) mają identyczną sytuację.
// Okolice spawnów są zawsze wolne, a wszystkie wolne pola są osiągalne.

const { nextFloat, randInt } = __require("src/core/rng.js");
const { WALL, WALL_MIX } = __require("src/config.js");
const { DIR_VEC, cellIndex, inBounds, passThrough, rotate180, step } = __require("src/game/grid.js");

const mirrorX = (grid, p) => ({ x: grid.w - 1 - p.x, y: p.y });
const mirrorY = (grid, p) => ({ x: p.x, y: grid.h - 1 - p.y });

/** Pole i jego trzy lustrzane odbicia. */
function symmetric(grid, p) {
  return [p, mirrorX(grid, p), mirrorY(grid, p), rotate180(grid, p)];
}

/** @typedef {import('./types.js').Grid} Grid */
/** @typedef {import('./types.js').Pos} Pos */
/** @typedef {import('./types.js').Dir} Dir */

/**
 * Pozycje startowe: cztery rogi (lewy górny, prawy dolny, prawy górny, lewy dolny), potem
 * środek lewego i prawego boku (piąty i szósty gracz online). Przy dwóch graczach
 * zajmują więc przeciwległe rogi.
 * @param {Grid} grid
 * @param {number} length
 * @returns {{ body: Pos[], dir: Dir }[]}
 */
function spawnPoints(grid, length) {
  const headX = 2 + length;
  const tl = Array.from({ length }, (_, i) => ({ x: headX - i, y: 2 }));
  const ml = tl.map((p) => ({ x: p.x, y: Math.floor(grid.h / 2) }));
  return [
    { body: tl, dir: 'right' },
    { body: tl.map((p) => rotate180(grid, p)), dir: 'left' },
    { body: tl.map((p) => mirrorX(grid, p)), dir: 'left' },
    { body: tl.map((p) => mirrorY(grid, p)), dir: 'right' },
    { body: ml, dir: 'right' },
    { body: ml.map((p) => mirrorX(grid, p)), dir: 'left' },
  ];
}

/**
 * Stałe czarne osłony na środku górnego i dolnego brzegu oraz na środku planszy: węże
 * z sąsiednich rogów (i ze środków boków) startują naprzeciw siebie w tym samym rzędzie,
 * więc nie mogą mieć się od razu na muszce.
 */
function startCovers(grid) {
  const cells = [];
  const mid = Math.floor(grid.h / 2);
  for (const x of [Math.floor(grid.w / 2) - 1, Math.floor(grid.w / 2)]) {
    for (const y of [1, 2, 3, mid - 1, mid]) cells.push(...symmetric(grid, { x, y }));
  }
  return cells;
}

/**
 * Pola, na których nie wolno stawiać ścian: otoczenie węży i korytarz przed głową aż do
 * stałej osłony na środku (wąż jadący prosto odbija się od niej, a nie wpada w czerwoną ścianę).
 */
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
    const coverX = DIR_VEC[dir].x > 0 ? Math.floor(grid.w / 2) - 1 : Math.floor(grid.w / 2);
    const corridor = DIR_VEC[dir].x !== 0 ? Math.abs(coverX - p.x) - 1 : 14;
    for (let i = 0; i < corridor; i++) {
      p = step(p, dir);
      for (let k = -1; k <= 1; k++) mark({ x: p.x + side.x * k, y: p.y + side.y * k });
    }
  }
  return mask;
}

/** Flood fill od pola start, poruszając się jak wąż (przez portale i krawędź). Zwraca maskę osiągalnych pól. */
function reachable(grid, walls, start) {
  const seen = new Uint8Array(grid.w * grid.h);
  const stack = [start];
  seen[cellIndex(grid, start)] = 1;
  while (stack.length) {
    const p = stack.pop();
    for (const d of Object.keys(DIR_VEC)) {
      const { pos: q } = passThrough(grid, walls, p, /** @type {Dir} */ (d));
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
    for (const p of startCovers(grid)) walls[cellIndex(grid, p)] = WALL.BOUNCE;
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

      // Każdy odcinek ma jeden rodzaj: czarna, czerwona albo niebieska (proporcje w WALL_MIX)
      const roll = nextFloat(rng);
      const kind = roll < WALL_MIX.bounce ? WALL.BOUNCE : roll < WALL_MIX.bounce + WALL_MIX.deadly ? WALL.DEADLY : WALL.PORTAL;
      for (const p of cells) {
        for (const q of symmetric(grid, p)) {
          const i = cellIndex(grid, q);
          if (!walls[i]) {
            walls[i] = kind;
            count++;
          }
        }
      }
    }

    // Wszystkie spawny muszą być połączone, a zamknięte kieszenie zamieniamy w ściany.
    // Obszar osiągalny z jednego spawnu zawiera pozostałe, więc jest symetryczny.
    const seen = reachable(grid, walls, spawns[0].body[0]);
    if (spawns.some((s) => !seen[cellIndex(grid, s.body[0])])) continue;
    let total = 0;
    for (let i = 0; i < size; i++) {
      if (!seen[i] && !walls[i]) walls[i] = WALL.BOUNCE;
      if (walls[i]) total++;
    }
    // Za duże zamknięte kieszenie psują planszę: losujemy od nowa
    if (total > size * density * 1.6) continue;
    return walls;
  }

  return new Uint8Array(size);
}

Object.assign(__exports, { symmetric, spawnPoints, reachable, generateMaze });
};

// ---- src/game/sword.js ----
__factories["src/game/sword.js"] = function (__exports) {
// Miecz: atak z bliska. Po wciśnięciu wokół głowy wiruje ostrze (przez SWORD_TICKS ticków)
// i w kole o promieniu SWORD_RADIUS pól wokół głowy:
// - głowa rywala → śmierć,
// - ciało rywala → odcięcie ogona od pierwszego segmentu w zasięgu (jak trafienie pociskiem),
// - cudze pociski → zniszczone.
// Ściany nie zasłaniają. Zasięg liczy się też przez krawędź planszy (plansza jest „zawinięta”).
// Własny wąż i własne pociski są bezpieczne. Wszystkie miecze tnące w tym samym ticku działają
// naraz, więc dwa węże z mieczami w swoim zasięgu giną oba.

const { SWORD_COOLDOWN, SWORD_RADIUS, SWORD_TICKS } = __require("src/config.js");
const { kill } = __require("src/game/snake.js");

/** @typedef {import('./types.js').RoundState} RoundState */
/** @typedef {import('./types.js').Snake} Snake */
/** @typedef {import('./types.js').Pos} Pos */
/** @typedef {import('./types.js').GameEvent} GameEvent */

/** @param {Snake} snake */
function canSwing(snake) {
  return snake.alive && snake.swordCooldown === 0;
}

/** Wciśnięcie miecza: ostrze zaczyna wirować. @returns {boolean} czy zadziałało */
function swing(snake, events) {
  if (!canSwing(snake)) return false;
  snake.swordTicks = SWORD_TICKS;
  snake.swordCooldown = SWORD_COOLDOWN;
  events.push({ type: 'swordSwing', snake: snake.id, pos: { ...snake.body[0] } });
  return true;
}

/** Czy pole p leży w kole miecza wokół pola center (z zawinięciem przez krawędzie). */
function inSwordRange(grid, center, p) {
  const ax = Math.abs(p.x - center.x);
  const ay = Math.abs(p.y - center.y);
  const dx = Math.min(ax, grid.w - ax);
  const dy = Math.min(ay, grid.h - ay);
  return dx * dx + dy * dy <= SWORD_RADIUS * SWORD_RADIUS;
}

/**
 * Cięcia wszystkich wirujących mieczy w tym ticku (po ruchu węży i pocisków).
 * @param {RoundState} state @param {GameEvent[]} events
 */
function applySwords(state, events) {
  const swords = state.snakes.filter((s) => s.alive && s.swordTicks > 0);
  if (!swords.length) return;

  // Najpierw zbieramy wszystkie trafienia (miecze działają naraz), potem je stosujemy
  /** @type {Map<Snake, { by: number, index: number }>} */
  const cuts = new Map();
  const goneBullets = new Set();
  for (const sword of swords) {
    const center = sword.body[0];
    for (const target of state.snakes) {
      if (target === sword || !target.alive) continue;
      const index = target.body.findIndex((p) => inSwordRange(state.grid, center, p));
      if (index < 0) continue;
      const prev = cuts.get(target);
      if (!prev || index < prev.index) cuts.set(target, { by: sword.id, index });
    }
    for (const b of state.bullets) {
      if (b.owner !== sword.id && inSwordRange(state.grid, center, b.pos)) goneBullets.add(b);
    }
  }

  for (const b of goneBullets) events.push({ type: 'bulletClash', pos: { ...b.pos } });
  state.bullets = state.bullets.filter((b) => !goneBullets.has(b));

  for (const [target, { by, index }] of cuts) {
    if (index === 0) kill(target, 'sword', by, events);
    else events.push({ type: 'bodyHit', snake: target.id, by, cells: target.body.splice(index) });
  }

  for (const sword of swords) sword.swordTicks--;
}

Object.assign(__exports, { canSwing, swing, inSwordRange, applySwords });
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
      const players = app.controller.playersInRound?.(app.match.round) ?? app.players.length;
      app.round = createRound(nextRoundSeed(app.match), { players });
      app.roundNumber = app.match.round + 1;
      app.effects.clear();
      ticks = COUNTDOWN_TICKS;
      app.audio.play('beep');
    },

    update() {
      const k = app.keyboard;
      if (k.consumePressed(KEYS.back)) return app.controller.leave();
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
      drawText(ctx, app.round.snakes.length === 1 ? 'TRENING' : `RUNDA ${app.roundNumber}`, VIEW_W / 2, cy - 70, { size: 18, color: COLORS.text, glow: 8 });
      drawText(ctx, String(n), VIEW_W / 2, cy + 10, { size: 48 + Math.round(frac * 24), color: COLORS.text, glow: 20 });
      if (app.touch.active) {
        drawText(ctx, 'przesuń palcem, żeby skręcić', VIEW_W / 2, cy + 120, { size: 10, color: COLORS.text });
      }
    },
  };
}

Object.assign(__exports, { createCountdownScene });
};

// ---- src/render/view.js ----
__factories["src/render/view.js"] = function (__exports) {
// Widok rundy: plansza + obiekty + efekty + HUD. Wspólny dla odliczania, gry i wyników.

const { drawBoard } = __require("src/render/board.js");
const { drawBullets, drawFood, drawSnake, drawSword } = __require("src/render/entities.js");
const { drawHud } = __require("src/render/hud.js");

/**
 * @param {{ renderer: import('./renderer.js').Renderer, effects: import('./effects.js').Effects,
 *           round: import('../game/types.js').RoundState, match: import('../game/match.js').MatchState,
 *           roundNumber: number, players: { name: string, color: string }[] }} app
 * @param {number} time ms
 */
function drawRoundView(app, time) {
  const { renderer, effects, round, match, players } = app;
  const { ctx } = renderer;
  renderer.begin();

  ctx.save();
  effects.applyShake(ctx);
  drawBoard(ctx, round, renderer.scale);
  drawFood(ctx, round, time);
  for (const snake of round.snakes) drawSnake(ctx, snake, players[snake.id].color);
  for (const snake of round.snakes) drawSword(ctx, snake, players[snake.id].color, app.alpha ?? 0);
  drawBullets(ctx, round, players);
  effects.draw(ctx);
  ctx.restore();

  drawHud(ctx, round, match, players, app.roundNumber);
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

  // Każdy rodzaj ściany: świecąca krawędź + ciemny środek
  for (const [kind, [edge, fill]] of Object.entries(COLORS.walls)) {
    const wallPath = new Path2D();
    const innerPath = new Path2D();
    for (let y = 0; y < grid.h; y++) {
      for (let x = 0; x < grid.w; x++) {
        if (walls[y * grid.w + x] !== Number(kind)) continue;
        wallPath.rect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
        innerPath.rect(x * CELL + 4, y * CELL + 4, CELL - 8, CELL - 8);
      }
    }
    c.shadowColor = edge;
    c.shadowBlur = 10;
    c.fillStyle = edge;
    c.fill(wallPath);
    c.shadowBlur = 0;
    c.fillStyle = fill;
    c.fill(innerPath);
  }

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

const { BOARD_Y, CELL, COLORS, SWORD_RADIUS, SWORD_TICKS } = __require("src/config.js");
const { DIR_VEC } = __require("src/game/grid.js");

/** @typedef {import('../game/types.js').Snake} Snake */
/** @typedef {import('../game/types.js').RoundState} RoundState */

const px = (p) => p.x * CELL;
const py = (p) => BOARD_Y + p.y * CELL;

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Snake} snake
 * @param {string} color
 */
function drawSnake(ctx, snake, color) {

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

/** @param {CanvasRenderingContext2D} ctx @param {RoundState} round @param {{ color: string }[]} players */
function drawBullets(ctx, round, players) {
  for (const b of round.bullets) {
    const color = players[b.owner].color;
    const v = DIR_VEC[b.dir];
    const x = px(b.pos);
    const y = py(b.pos);
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    // Smuga za pociskiem
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = color;
    ctx.fillRect(x - v.x * CELL + 6, y - v.y * CELL + 6, CELL - 12, CELL - 12);
    ctx.globalAlpha = 1;
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

/**
 * Wirujący miecz wokół głowy: koło zasięgu i dwa ostrza obracające się w trakcie cięcia.
 * @param {CanvasRenderingContext2D} ctx @param {Snake} snake @param {string} color @param {number} alpha część ticka (płynny obrót)
 */
function drawSword(ctx, snake, color, alpha = 0) {
  if (!snake.alive || snake.swordTicks <= 0) return;
  const head = snake.body[0];
  const cx = px(head) + CELL / 2;
  const cy = py(head) + CELL / 2;
  const reach = (SWORD_RADIUS + 0.5) * CELL;
  // Postęp cięcia 0..1 (półtora obrotu na całe wirowanie)
  const progress = Math.min(1, (SWORD_TICKS - snake.swordTicks + alpha) / SWORD_TICKS);
  const angle = progress * Math.PI * 3;

  ctx.save();
  // Zasięg
  ctx.globalAlpha = 0.25 * (1 - progress) + 0.1;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, reach, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Ostrza: smuga i jasna klinga
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 14;
  ctx.lineCap = 'round';
  for (const offset of [0, Math.PI]) {
    const a = angle + offset;
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = color;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, reach * 0.7, a - 0.7, a);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * CELL * 0.6, cy + Math.sin(a) * CELL * 0.6);
    ctx.lineTo(cx + Math.cos(a) * reach, cy + Math.sin(a) * reach);
    ctx.stroke();
  }
  ctx.restore();
}

Object.assign(__exports, { drawSnake, drawBullets, drawFood, drawSword });
};

// ---- src/render/hud.js ----
__factories["src/render/hud.js"] = function (__exports) {
// Pasek nad planszą: 1–6 graczy (imię, wygrane rundy, długość, amunicja) i numer rundy.
// W treningu (jeden wąż) zamiast rund: czas i zjedzone owoce.
// Gracze 0, 2, 4 po lewej, 1, 3, 5 po prawej (zewnętrzne miejsca dla pierwszej dwójki).
// Przy 5–6 graczach po trzy miejsca na stronę i mniejsze imiona.

const { COLORS, SWORD_COOLDOWN, TICK_MS, VIEW_W, WINS_TO_MATCH } = __require("src/config.js");
const { drawText } = __require("src/render/text.js");

/** @typedef {import('../game/types.js').RoundState} RoundState */
/** @typedef {import('../game/match.js').MatchState} MatchState */

function drawPips(ctx, x, y, wins, color, alignRight) {
  const size = 10;
  const gap = 5;
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

/** Pasek gotowości miecza: pełny i świecący = można ciąć. */
function drawSwordBar(ctx, x, y, snake, alignRight) {
  const w = 30;
  const h = 10;
  const left = alignRight ? x - w : x;
  const ready = snake.swordCooldown === 0;
  const fill = ready ? 1 : 1 - snake.swordCooldown / SWORD_COOLDOWN;
  ctx.save();
  ctx.strokeStyle = ready ? COLORS.text : COLORS.dim;
  ctx.lineWidth = 2;
  ctx.strokeRect(left + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = ready ? COLORS.text : COLORS.dim;
  if (ready) {
    ctx.shadowColor = COLORS.text;
    ctx.shadowBlur = 8;
  }
  ctx.fillRect(left + 3, y + 3, Math.round((w - 6) * fill), h - 6);
  ctx.restore();
}

const SLOT_X = [16, 216];
const SLOT_X_SIX = [16, 152, 288];

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {RoundState} round
 * @param {MatchState} match
 * @param {{ name: string, color: string }[]} players
 * @param {number} roundNumber
 */
function drawHud(ctx, round, match, players, roundNumber) {
  const solo = round.snakes.length === 1;
  const many = round.snakes.length > 4;
  round.snakes.forEach((snake, i) => {
    const right = i % 2 === 1;
    const offset = (many ? SLOT_X_SIX : SLOT_X)[Math.floor(i / 2)];
    const x = right ? VIEW_W - offset : offset;
    const align = right ? 'right' : 'left';
    const { name, color } = players[i];
    const alpha = snake.alive ? 1 : 0.4;

    drawText(ctx, name.toUpperCase(), x, 16, { size: many ? 10 : 14, color, align, glow: snake.alive ? 8 : 0, alpha });
    ctx.save();
    ctx.globalAlpha = alpha;
    if (!solo) drawPips(ctx, x, 27, match.wins[i], color, right);
    // Obok wygranych: gotowość miecza
    const barOffset = solo ? 0 : WINS_TO_MATCH * 15 + 10;
    if (snake.alive) drawSwordBar(ctx, right ? x - barOffset : x + barOffset, 27, snake, right);
    ctx.restore();
    const stats = snake.alive ? `DŁ ${snake.body.length}  AMMO ${snake.ammo}` : snake.death === 'left' ? 'WYSZEDŁ' : 'ODPADŁ';
    drawText(ctx, stats, x, 50, { size: 8, color: COLORS.dim, align, alpha });
  });

  if (solo) {
    const snake = round.snakes[0];
    drawText(ctx, 'TRENING', VIEW_W / 2, 22, { size: 14, color: COLORS.text });
    drawText(ctx, `CZAS ${formatTime(round.tick)}  OWOCE ${snake.eaten}`, VIEW_W / 2, 44, { size: 7, color: COLORS.dim });
    return;
  }
  // Numer rundy na środku (rundy nie mają limitu czasu)
  drawText(ctx, `RUNDA ${roundNumber}`, VIEW_W / 2, 22, { size: 14, color: COLORS.text });
  drawText(ctx, `do ${WINS_TO_MATCH} wygranych`, VIEW_W / 2, 44, { size: 7, color: COLORS.dim });
}

/** Czas rundy z liczby ticków, np. „1:05”. */
function formatTime(ticks) {
  const seconds = Math.floor((ticks * TICK_MS) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

Object.assign(__exports, { drawHud, formatTime });
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
      app.controller.startRound?.(app.match.round);
    },

    update() {
      const k = app.keyboard;
      if (k.consumePressed(KEYS.back)) return app.controller.leave();
      if (k.consumePressed(KEYS.mute)) app.audio.toggleMute();
      if (k.consumePressed(KEYS.pause) && app.controller.canPause && !app.round.result) paused = !paused;

      if (paused) {
        k.consumeCommands();
        app.touch.consume();
        return;
      }

      if (app.round.result) {
        if (--endTimer <= 0) app.scenes.go('roundEnd');
        return;
      }

      // Online: kontroler sam liczy rundę (z przewidywaniem) i podmienia app.round
      if (app.controller.advance) {
        const events = app.controller.advance();
        app.effects.handle(events, app.players);
        app.audio.handle(events);
        if (app.round.result) endTimer = AFTER_ROUND_TICKS;
        return;
      }

      // Offline: komendy z klawiatury, jeden krok na tick
      const events = stepRound(app.round, app.controller.commands());
      app.effects.handle(events, app.players);
      app.audio.handle(events);
      if (app.round.result) endTimer = AFTER_ROUND_TICKS;
    },

    render() {
      drawRoundView(app, performance.now());
      app.controller.drawStatus?.(app.renderer.ctx);
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
const { BOARD_Y, CELL, COLORS, GRID_H, KEYS, TICKS_PER_SECOND, VIEW_W } = __require("src/config.js");
const { recordRound } = __require("src/game/match.js");
const { formatTime } = __require("src/render/hud.js");
const { load, save } = __require("src/ui/storage.js");
const { drawRoundView } = __require("src/render/view.js");
const { blink, dimScreen, drawPanel, drawScore, drawText } = __require("src/render/text.js");

const MIN_TICKS = 1 * TICKS_PER_SECOND; // nie da się przeklikać od razu
const AUTO_TICKS = 4 * TICKS_PER_SECOND;

const DEATH = {
  shot: 'Strzał w głowę',
  wall: 'Rywal wjechał w czerwoną ścianę',
  body: 'Rywal wjechał w ogon',
  crash: 'Zderzenie głowami',
  sword: 'Cięcie mieczem',
  left: 'Rywal wyszedł z gry',
};

const SOLO_DEATH = {
  wall: 'Czerwona ściana',
  left: 'Koniec treningu',
};

/**
 * Trening: wynik to zjedzone owoce, najlepszy zapamiętujemy w przeglądarce.
 * @param {import('../game/types.js').RoundState} round
 */
function describeSolo(round) {
  const snake = round.snakes[0];
  const best = load('soloBest', 0);
  const record = snake.eaten > best;
  if (record) save('soloBest', snake.eaten);
  return {
    title: record ? 'NOWY REKORD!' : 'KONIEC PRÓBY',
    subtitle: `OWOCE: ${snake.eaten}   CZAS: ${formatTime(round.tick)}`,
    color: record ? COLORS.food : COLORS.text,
    detail: `${SOLO_DEATH[snake.death] ?? 'Wąż odpadł'} · rekord: ${Math.max(best, snake.eaten)} owoców`,
  };
}

/**
 * @param {import('../game/types.js').RoundState} round
 * @param {{ name: string, color: string }[]} players
 */
function describe(round, players) {
  const { winner } = round.result;
  const duel = round.snakes.length === 2;
  if (winner === 'draw') {
    const crash = round.snakes.every((s) => s.death === 'crash');
    const detail = crash ? 'Zderzenie głowami' : duel ? 'Obaj odpadli w tym samym momencie' : 'Wszyscy odpadli naraz';
    return { title: 'REMIS!', subtitle: '', color: COLORS.text, detail };
  }
  const p = players[winner];
  const loser = round.snakes.find((s) => !s.alive);
  const detail = duel ? DEATH[loser.death] : 'Ostatni na placu boju';
  return { title: p.name.toUpperCase(), subtitle: 'WYGRYWA RUNDĘ!', color: p.color, detail };
}

/** @param {any} app */
function createRoundEndScene(app) {
  let ticks = 0;
  let info = { title: '', subtitle: '', color: COLORS.text, detail: '' };
  let solo = false;

  const next = () => {
    // Online: gdy w pokoju zostało mniej niż dwóch graczy, mecz kończy się powrotem do poczekalni
    if (app.controller.shouldEndMatch?.()) return app.controller.rematch();
    app.scenes.go(app.match.winner !== null ? 'matchEnd' : 'countdown');
  };

  return {
    enter() {
      const result = app.round.result;
      app.controller.roundEnded?.(app.match.round, result);
      recordRound(app.match, result);
      solo = app.round.snakes.length === 1;
      info = solo ? describeSolo(app.round) : describe(app.round, app.players);
      ticks = 0;
      if (app.match.winner === null) app.audio.play('round');
    },

    update() {
      const k = app.keyboard;
      if (k.consumePressed(KEYS.back)) return app.controller.leave();
      if (k.consumePressed(KEYS.mute)) app.audio.toggleMute();
      ticks++;
      // Online wszyscy przechodzą dalej po tym samym czasie, bez przeklikiwania
      const skip = app.controller.canSkip && ticks >= MIN_TICKS && k.consumePressed(KEYS.confirm);
      // Trening czeka na gracza (żeby zdążył przeczytać wynik)
      if ((!solo && ticks >= AUTO_TICKS) || skip) next();
    },

    render() {
      const time = performance.now();
      drawRoundView(app, time);
      const { ctx } = app.renderer;
      const cy = BOARD_Y + (GRID_H * CELL) / 2;
      dimScreen(ctx, 0.5);
      drawPanel(ctx, VIEW_W / 2, cy + 20, 640, 260, info.color === COLORS.text ? undefined : info.color);

      drawText(ctx, info.title, VIEW_W / 2, cy - 70, { size: 28, color: info.color, glow: 16 });
      if (info.subtitle) drawText(ctx, info.subtitle, VIEW_W / 2, cy - 30, { size: 16, color: COLORS.text });
      drawText(ctx, info.detail, VIEW_W / 2, cy + 5, { size: 10, color: COLORS.dim });
      if (!solo) drawScore(ctx, app.match.wins, app.players, VIEW_W / 2, cy + 55);

      if (app.controller.canSkip && ticks >= MIN_TICKS && blink(time)) {
        const hint = solo ? 'SPACJA — kolejna próba    ESC — menu' : 'SPACJA — dalej';
        drawText(ctx, hint, VIEW_W / 2, cy + 115, { size: 10, color: COLORS.text });
      }
    },
  };
}

Object.assign(__exports, { createRoundEndScene });
};

// ---- src/scenes/matchEnd.js ----
__factories["src/scenes/matchEnd.js"] = function (__exports) {
const { BOARD_Y, CELL, COLORS, GRID_H, KEYS, TICKS_PER_SECOND, VIEW_W } = __require("src/config.js");
const { drawRoundView } = __require("src/render/view.js");
const { blink, dimScreen, drawPanel, drawScore, drawText } = __require("src/render/text.js");

const MIN_TICKS = 1.5 * TICKS_PER_SECOND;

/** @param {any} app */
function createMatchEndScene(app) {
  let ticks = 0;

  return {
    enter() {
      ticks = 0;
      app.audio.play('win');
      app.effects.confetti(app.players[app.match.winner].color);
    },

    update() {
      const k = app.keyboard;
      if (k.consumePressed(KEYS.back)) return app.controller.leave();
      if (k.consumePressed(KEYS.mute)) app.audio.toggleMute();
      ticks++;
      if (ticks % (2 * TICKS_PER_SECOND) === 0) app.effects.confetti(app.players[app.match.winner].color);
      const auto = app.controller.matchEndTicks && ticks >= app.controller.matchEndTicks;
      if (auto || (ticks >= MIN_TICKS && k.consumePressed(KEYS.confirm))) app.controller.rematch();
    },

    render() {
      const time = performance.now();
      drawRoundView(app, time);
      const { ctx } = app.renderer;
      const cy = BOARD_Y + (GRID_H * CELL) / 2;
      dimScreen(ctx, 0.6);
      drawPanel(ctx, VIEW_W / 2, cy + 5, 680, 300, app.players[app.match.winner].color);
      app.effects.draw(ctx);

      const winner = app.players[app.match.winner];
      drawText(ctx, winner.name.toUpperCase(), VIEW_W / 2, cy - 90, { size: 48, color: winner.color, glow: 24 });
      drawText(ctx, 'WYGRYWA MECZ!', VIEW_W / 2, cy - 30, { size: 24, color: COLORS.text, glow: 10 });

      drawScore(ctx, app.match.wins, app.players, VIEW_W / 2, cy + 40);

      if (ticks >= MIN_TICKS && blink(time)) {
        drawText(ctx, app.controller.rematchHint, VIEW_W / 2, cy + 110, { size: 12, color: COLORS.text });
      }
    },
  };
}

Object.assign(__exports, { createMatchEndScene });
};

__require("src/main.js");
})();
