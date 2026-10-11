// Pasek nad planszą: gracze, wygrane rundy, długość, numer rundy.

import { COLORS, HUD_H, PLAYERS, VIEW_W, WINS_TO_MATCH } from '../config.js';
import { drawText } from './text.js';

/** @typedef {import('../game/types.js').RoundState} RoundState */
/** @typedef {import('../game/match.js').MatchState} MatchState */

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
 */
export function drawHud(ctx, round, match, roundNumber) {
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

  // Numer rundy na środku (rundy nie mają limitu czasu)
  drawText(ctx, `RUNDA ${roundNumber}`, VIEW_W / 2, mid - 6, { size: 18, color: COLORS.text });
  drawText(ctx, `do ${WINS_TO_MATCH} wygranych`, VIEW_W / 2, mid + 16, { size: 8, color: COLORS.dim });
}
