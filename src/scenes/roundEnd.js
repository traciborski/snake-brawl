import { BOARD_Y, CELL, COLORS, GRID_H, KEYS, PLAYERS, TICKS_PER_SECOND, VIEW_W } from '../config.js';
import { recordRound } from '../game/match.js';
import { drawRoundView } from '../render/view.js';
import { blink, dimScreen, drawPanel, drawText } from '../render/text.js';

const MIN_TICKS = 1 * TICKS_PER_SECOND; // nie da się przeklikać od razu
const AUTO_TICKS = 4 * TICKS_PER_SECOND;

/** @param {import('../game/types.js').RoundResult} result */
function describe(result) {
  if (result.winner === 'draw') {
    return {
      title: 'REMIS!',
      color: COLORS.text,
      detail: result.reason === 'ko' ? 'Zderzenie czołowe — obaj rozbici' : 'Koniec czasu — równe długości',
    };
  }
  const p = PLAYERS[result.winner];
  return {
    title: `${p.name.toUpperCase()} WYGRYWA RUNDĘ!`,
    color: p.color,
    detail: result.reason === 'ko' ? 'Rywal rozbity' : 'Koniec czasu — dłuższy wąż wygrywa',
  };
}

/** @param {any} app */
export function createRoundEndScene(app) {
  let ticks = 0;
  let info = describe({ winner: 'draw', reason: 'ko' });

  const next = () => app.scenes.go(app.match.winner !== null ? 'matchEnd' : 'countdown');

  return {
    enter() {
      const result = app.round.result;
      recordRound(app.match, result);
      info = describe(result);
      ticks = 0;
      if (app.match.winner === null) app.audio.play('round');
    },

    update() {
      const k = app.keyboard;
      if (k.consumePressed(KEYS.back)) return app.scenes.go('menu');
      if (k.consumePressed(KEYS.mute)) app.audio.toggleMute();
      ticks++;
      if (ticks >= AUTO_TICKS || (ticks >= MIN_TICKS && k.consumePressed(KEYS.confirm))) next();
    },

    render() {
      const time = performance.now();
      drawRoundView(app, time);
      const { ctx } = app.renderer;
      const cy = BOARD_Y + (GRID_H * CELL) / 2;
      dimScreen(ctx, 0.5);
      drawPanel(ctx, VIEW_W / 2, cy + 20, 640, 260, info.color === COLORS.text ? undefined : info.color);

      drawText(ctx, info.title, VIEW_W / 2, cy - 50, { size: 28, color: info.color, glow: 16 });
      drawText(ctx, info.detail, VIEW_W / 2, cy - 5, { size: 10, color: COLORS.dim });

      const [a, b] = app.match.wins;
      drawText(ctx, String(a), VIEW_W / 2 - 60, cy + 50, { size: 36, color: PLAYERS[0].color, glow: 12 });
      drawText(ctx, ':', VIEW_W / 2, cy + 50, { size: 36, color: COLORS.text });
      drawText(ctx, String(b), VIEW_W / 2 + 60, cy + 50, { size: 36, color: PLAYERS[1].color, glow: 12 });

      if (ticks >= MIN_TICKS && blink(time)) {
        drawText(ctx, 'SPACJA — dalej', VIEW_W / 2, cy + 115, { size: 10, color: COLORS.text });
      }
    },
  };
}
