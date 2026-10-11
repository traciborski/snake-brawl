import { BOARD_Y, CELL, COLORS, GRID_H, KEYS, VIEW_W } from '../config.js';
import { stepRound } from '../game/round.js';
import { drawRoundView } from '../render/view.js';
import { dimScreen, drawPanel, drawText } from '../render/text.js';

/** Ile ticków po końcu rundy jeszcze pokazujemy planszę (wybuchy). */
const AFTER_ROUND_TICKS = 30;

/** @param {any} app */
export function createPlayScene(app) {
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

      // Komendy z klawiatury (offline) albo od wszystkich graczy z sieci (online).
      // null = jeszcze nie ma ruchów wszystkich graczy na tę klatkę, więc czekamy.
      app.controller.beforeTick?.();
      for (let i = 0; i < (app.controller.maxSteps ?? 1); i++) {
        const commands = app.controller.commands();
        if (!commands) return;
        const events = stepRound(app.round, commands);
        app.effects.handle(events, app.players);
        app.audio.handle(events);
        if (app.round.result) {
          endTimer = AFTER_ROUND_TICKS;
          return;
        }
      }
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
