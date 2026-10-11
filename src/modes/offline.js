// Gra na jednym komputerze: komendy prosto z klawiatury, zestaw klawiszy i = gracz i.
// Dotyk (jeśli ktoś gra na tablecie) steruje graczem 1.

import { randomSeed } from '../core/rng.js';
import { createMatch } from '../game/match.js';
import { mergeCommands } from '../input/touch.js';

/** @param {any} app */
export function createOfflineController(app) {
  return {
    canPause: true,
    canSkip: true,
    rematchHint: 'SPACJA — rewanż    ESC — menu',
    commands() {
      const [first, ...rest] = app.keyboard.consumeCommands();
      return [mergeCommands(first, app.touch.consume()), ...rest];
    },
    leave: () => app.scenes.go('menu'),
    rematch() {
      app.match = createMatch(randomSeed(), app.players.length);
      app.scenes.go('countdown');
    },
  };
}
