// Pasek nad planszą: 2–4 graczy (imię, wygrane rundy, długość, amunicja) i numer rundy.
// Gracze 0 i 2 po lewej, 1 i 3 po prawej (zewnętrzne miejsca dla pierwszej dwójki).

import { COLORS, VIEW_W, WINS_TO_MATCH } from '../config.js';
import { drawText } from './text.js';

/** @typedef {import('../game/types.js').RoundState} RoundState */
/** @typedef {import('../game/match.js').MatchState} MatchState */

function drawPips(ctx, x, y, wins, color, alignRight) {
  const size = 10;
  const gap = 5;
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

const SLOT_X = [16, 216];

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {RoundState} round
 * @param {MatchState} match
 * @param {{ name: string, color: string }[]} players
 * @param {number} roundNumber
 */
export function drawHud(ctx, round, match, players, roundNumber) {
  round.snakes.forEach((snake, i) => {
    const right = i % 2 === 1;
    const offset = SLOT_X[Math.floor(i / 2)];
    const x = right ? VIEW_W - offset : offset;
    const align = right ? 'right' : 'left';
    const { name, color } = players[i];
    const alpha = snake.alive ? 1 : 0.4;

    drawText(ctx, name.toUpperCase(), x, 16, { size: 14, color, align, glow: snake.alive ? 8 : 0, alpha });
    ctx.save();
    ctx.globalAlpha = alpha;
    drawPips(ctx, x, 27, match.wins[i], color, right);
    ctx.restore();
    const stats = snake.alive ? `DŁ ${snake.body.length}  AMMO ${snake.ammo}` : snake.death === 'left' ? 'WYSZEDŁ' : 'ODPADŁ';
    drawText(ctx, stats, x, 50, { size: 8, color: COLORS.dim, align, alpha });
  });

  // Numer rundy na środku (rundy nie mają limitu czasu)
  drawText(ctx, `RUNDA ${roundNumber}`, VIEW_W / 2, 22, { size: 14, color: COLORS.text });
  drawText(ctx, `do ${WINS_TO_MATCH} wygranych`, VIEW_W / 2, 44, { size: 7, color: COLORS.dim });
}
