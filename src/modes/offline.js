// Gra na jednym komputerze: komendy prosto z klawiatury, zestaw klawiszy i = gracz i.

import { randomSeed } from '../core/rng.js';
import { createMatch } from '../game/match.js';

/** @param {any} app */
export function createOfflineController(app) {
  return {
    canPause: true,
    canSkip: true,
    rematchHint: 'SPACJA — rewanż    ESC — menu',
    commands: () => app.keyboard.consumeCommands(),
    leave: () => app.scenes.go('menu'),
    rematch() {
      app.match = createMatch(randomSeed(), app.players.length);
      app.scenes.go('countdown');
    },
  };
}
