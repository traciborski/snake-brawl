import { BOARD_Y, COLORS, COUNTDOWN_TICKS, GRID_H, CELL, KEYS, TICKS_PER_SECOND, VIEW_W } from '../config.js';
import { createRound } from '../game/round.js';
import { nextRoundSeed } from '../game/match.js';
import { drawRoundView } from '../render/view.js';
import { dimScreen, drawPanel, drawText } from '../render/text.js';

/** @param {any} app */
export function createCountdownScene(app) {
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
