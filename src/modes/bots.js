// Tryb lokalny: jeden człowiek przeciwko botom.

import { randomSeed } from '../core/rng.js';
import { createMatch } from '../game/match.js';
import { chooseBotCommand } from '../game/bot.js';
import { mergeCommands } from '../input/touch.js';

/** @param {any} app @param {'easy' | 'medium' | 'hard'} difficulty */
export function createBotController(app, difficulty) {
  return {
    canPause: true,
    canSkip: true,
    rematchHint: 'SPACJA — rewanż    ESC — menu',
    commands() {
      const human = app.keyboard.consumeCommands()[0] ?? {};
      return [
        mergeCommands(human, app.touch.consume()),
        ...app.players.slice(1).map((_, i) => chooseBotCommand(app.round, i + 1, difficulty)),
      ];
    },
    leave: () => app.scenes.go('menu'),
    rematch() {
      app.match = createMatch(randomSeed(), app.players.length);
      app.scenes.go('countdown');
    },
  };
}
