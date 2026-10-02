// Start aplikacji: łączy canvas, klawiaturę, dźwięk, efekty i sceny w jedną pętlę.

import { PLAYERS, TICK_MS } from './config.js';
import { startLoop } from './core/loop.js';
import { SceneManager } from './core/scenes.js';
import { Keyboard } from './input/keyboard.js';
import { Sfx } from './audio/sfx.js';
import { Effects } from './render/effects.js';
import { Renderer } from './render/renderer.js';
import { createMenuScene } from './scenes/menu.js';
import { createCountdownScene } from './scenes/countdown.js';
import { createPlayScene } from './scenes/play.js';
import { createRoundEndScene } from './scenes/roundEnd.js';
import { createMatchEndScene } from './scenes/matchEnd.js';

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
