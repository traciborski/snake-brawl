// Pasek nad planszą: gracze, wygrane rundy, długość, czas.

import { COLORS, HUD_H, PLAYERS, TICKS_PER_SECOND, VIEW_W, WINS_TO_MATCH } from '../config.js';
import { drawText } from './text.js';

/** @typedef {import('../game/types.js').RoundState} RoundState */
/** @typedef {import('../game/match.js').MatchState} MatchState */

export function formatTime(ticks) {
  const total = Math.max(0, Math.ceil(ticks / TICKS_PER_SECOND));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function drawPips(ctx, x, y, wins, color, alignRight) {
  const size = 12;
  const gap = 6;
  for (let i = 0; i < WINS_TO_MATCH; i++) {
    const offset = i * (size + gap);
    const px = alignRight ? x - offset - size : x + offset;
    ctx.save();
    if (i < wins) {
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.fillRect(px, y, size, size);
    } else {
      ctx.strokeStyle = COLORS.dim;
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 1, y + 1, size - 2, size - 2);
    }
    ctx.restore();
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {RoundState} round
 * @param {MatchState} match
 * @param {number} roundNumber
 * @param {number} time ms
 */
export function drawHud(ctx, round, match, roundNumber, time) {
  const mid = HUD_H / 2;
  const [leon, hugo] = round.snakes;

  // Leon po lewej
  drawText(ctx, PLAYERS[0].name.toUpperCase(), 20, mid - 10, { size: 16, color: PLAYERS[0].color, align: 'left', glow: 8 });
  drawPips(ctx, 20, mid + 6, match.wins[0], PLAYERS[0].color, false);
  drawText(ctx, `DŁ ${leon.body.length}`, 200, mid, { size: 12, color: COLORS.dim, align: 'left' });

  // Hugo po prawej
  drawText(ctx, PLAYERS[1].name.toUpperCase(), VIEW_W - 20, mid - 10, { size: 16, color: PLAYERS[1].color, align: 'right', glow: 8 });
  drawPips(ctx, VIEW_W - 20, mid + 6, match.wins[1], PLAYERS[1].color, true);
  drawText(ctx, `DŁ ${hugo.body.length}`, VIEW_W - 200, mid, { size: 12, color: COLORS.dim, align: 'right' });

  // Czas na środku: ostatnie 10 s na czerwono, miga
  const last = round.timeLeft <= 10 * TICKS_PER_SECOND && !round.result;
  const color = last ? COLORS.danger : COLORS.text;
  const alpha = last && Math.floor(time / 250) % 2 ? 0.5 : 1;
  drawText(ctx, formatTime(round.timeLeft), VIEW_W / 2, mid - 6, { size: 22, color, glow: last ? 10 : 0, alpha });
  drawText(ctx, `RUNDA ${roundNumber}`, VIEW_W / 2, mid + 18, { size: 8, color: COLORS.dim });
}
