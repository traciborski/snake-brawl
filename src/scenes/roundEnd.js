import { BOARD_Y, CELL, COLORS, GRID_H, KEYS, PLAYERS, TICKS_PER_SECOND, VIEW_W } from '../config.js';
import { recordRound } from '../game/match.js';
import { drawRoundView } from '../render/view.js';
import { blink, dimScreen, drawPanel, drawText } from '../render/text.js';

const MIN_TICKS = 1 * TICKS_PER_SECOND; // nie da się przeklikać od razu
const AUTO_TICKS = 4 * TICKS_PER_SECOND;

const DEATH = { shot: 'Strzał w głowę', wall: 'Rywal wjechał w czerwoną ścianę' };

/** @param {import('../game/types.js').RoundState} round */
function describe(round) {
  const { winner } = round.result;
  if (winner === 'draw') {
    return { title: 'REMIS!', color: COLORS.text, detail: 'Obaj odpadli w tym samym momencie' };
  }
  const p = PLAYERS[winner];
  const loser = round.snakes.find((s) => !s.alive);
  return { title: `${p.name.toUpperCase()} WYGRYWA RUNDĘ!`, color: p.color, detail: DEATH[loser.death] };
}

/** @param {any} app */
export function createRoundEndScene(app) {
  let ticks = 0;
  let info = { title: '', color: COLORS.text, detail: '' };

  const next = () => app.scenes.go(app.match.winner !== null ? 'matchEnd' : 'countdown');

  return {
    enter() {
      const result = app.round.result;
      recordRound(app.match, result);
      info = describe(app.round);
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
