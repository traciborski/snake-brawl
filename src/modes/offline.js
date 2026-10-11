// Gra na jednym komputerze: komendy prosto z klawiatury, zestaw klawiszy i = gracz i.
// W treningu (jeden gracz) wąż słucha wszystkich zestawów. Dotyk steruje graczem 1.

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
