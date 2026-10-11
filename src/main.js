// Start aplikacji: łączy canvas, klawiaturę, dźwięk, efekty i sceny w jedną pętlę.

import { DEFAULT_NAMES, KEYMAPS, PLAYER_COLORS, TICK_MS } from './config.js';
import { startLoop } from './core/loop.js';
import { SceneManager } from './core/scenes.js';
import { Keyboard } from './input/keyboard.js';
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
  overlay: new Overlay(/** @type {HTMLElement} */ (document.getElementById('overlay'))),
  audio: new Sfx(),
  effects: new Effects(),
  /** @type {import('./game/match.js').MatchState | null} */
  match: null,
  /** @type {import('./game/types.js').RoundState | null} */
  round: null,
  roundNumber: 0,
  /** @type {import('./net/client.js').Session | null} sesja w pokoju gry online */
  session: null,
  /** @type {((lobby: any) => void) | null} */
  onLobby: null,
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
    app.effects.update(dt);
    app.scenes.render(alpha, dt);
  },
});

// Do debugowania w konsoli przeglądarki
Object.assign(window, { snakeBrawl: app });
