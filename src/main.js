// Start aplikacji: łączy canvas, klawiaturę, dźwięk, efekty i sceny w jedną pętlę.

import { DEFAULT_NAMES, KEYMAPS, PLAYER_COLORS, TICK_MS } from './config.js';
import { startLoop } from './core/loop.js';
import { SceneManager } from './core/scenes.js';
import { Keyboard } from './input/keyboard.js';
import { Touch } from './input/touch.js';
import { Sfx } from './audio/sfx.js';
import { Effects } from './render/effects.js';
import { Renderer } from './render/renderer.js';
import { createMenuScene } from './scenes/menu.js';
import { createSetupScene } from './scenes/setup.js';
import { createOnlineScene } from './scenes/online.js';
import { createOfflineController } from './modes/offline.js';
import { Overlay } from './ui/dom.js';
import { roomFromLink } from './net/client.js';
import { createCountdownScene } from './scenes/countdown.js';
import { createPlayScene } from './scenes/play.js';
import { createRoundEndScene } from './scenes/roundEnd.js';
import { createMatchEndScene } from './scenes/matchEnd.js';

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

// Ctrl to strzał, a Ctrl+W zamyka kartę i przeglądarka nie pozwala tego zablokować.
// W trakcie gry (i online w ogóle) prosimy więc o potwierdzenie wyjścia ze strony.
window.addEventListener('beforeunload', (e) => {
  const playing = app.scenes.name === 'countdown' || app.scenes.name === 'play' || app.scenes.name === 'roundEnd';
  if (playing || app.session) {
    e.preventDefault();
    e.returnValue = '';
  }
});

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
