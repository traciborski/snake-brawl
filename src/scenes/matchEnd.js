import { BOARD_Y, CELL, COLORS, GRID_H, KEYS, TICKS_PER_SECOND, VIEW_W } from '../config.js';
import { drawRoundView } from '../render/view.js';
import { blink, dimScreen, drawPanel, drawScore, drawText } from '../render/text.js';
import { actionButtons } from '../ui/dom.js';

const MIN_TICKS = 1.5 * TICKS_PER_SECOND;

/** @param {any} app */
export function createMatchEndScene(app) {
  let ticks = 0;
  let buttonsShown = false;

  return {
    enter() {
      ticks = 0;
      buttonsShown = false;
      app.audio.play('win');
      app.effects.confetti(app.players[app.match.winner].color);
    },

    update() {
      const k = app.keyboard;
      if (k.consumePressed(KEYS.back)) return app.controller.leave();
      if (k.consumePressed(KEYS.mute)) app.audio.toggleMute();
      ticks++;
      // Offline: przyciski rewanżu i menu (na telefonie nie ma Spacji); online wszyscy wracają sami
      if (!app.controller.matchEndTicks && !buttonsShown && ticks >= MIN_TICKS) {
        buttonsShown = true;
        const { row, focus } = actionButtons([
          { label: 'REWANŻ', onclick: () => app.controller.rematch() },
          { label: 'MENU', onclick: () => app.controller.leave() },
        ]);
        app.overlay.show(row, { position: 'in-panel' });
        focus();
      }
      if (ticks % (2 * TICKS_PER_SECOND) === 0) app.effects.confetti(app.players[app.match.winner].color);
      const auto = app.controller.matchEndTicks && ticks >= app.controller.matchEndTicks;
      if (auto || (ticks >= MIN_TICKS && k.consumePressed(KEYS.confirm))) app.controller.rematch();
    },

    exit() {
      app.overlay.hide();
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

      if (app.controller.matchEndTicks && ticks >= MIN_TICKS && blink(time)) {
        drawText(ctx, app.controller.rematchHint, VIEW_W / 2, cy + 110, { size: 12, color: COLORS.text });
      }
    },
  };
}
