// Pasek nad planszą: 1–6 graczy (imię, wygrane rundy, długość, amunicja) i numer rundy.
// W treningu (jeden wąż) zamiast rund: czas i zjedzone owoce.
// Gracze 0, 2, 4 po lewej, 1, 3, 5 po prawej (zewnętrzne miejsca dla pierwszej dwójki).
// Przy 5–6 graczach po trzy miejsca na stronę i mniejsze imiona.

import { COLORS, TICK_MS, VIEW_W, WINS_TO_MATCH } from '../config.js';
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
const SLOT_X_SIX = [16, 152, 288];

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {RoundState} round
 * @param {MatchState} match
 * @param {{ name: string, color: string }[]} players
 * @param {number} roundNumber
 */
export function drawHud(ctx, round, match, players, roundNumber) {
  const solo = round.snakes.length === 1;
  const many = round.snakes.length > 4;
  round.snakes.forEach((snake, i) => {
    const right = i % 2 === 1;
    const offset = (many ? SLOT_X_SIX : SLOT_X)[Math.floor(i / 2)];
    const x = right ? VIEW_W - offset : offset;
    const align = right ? 'right' : 'left';
    const { name, color } = players[i];
    const alpha = snake.alive ? 1 : 0.4;

    drawText(ctx, name.toUpperCase(), x, 16, { size: many ? 10 : 14, color, align, glow: snake.alive ? 8 : 0, alpha });
    ctx.save();
    ctx.globalAlpha = alpha;
    if (!solo) drawPips(ctx, x, 27, match.wins[i], color, right);
    ctx.restore();
    const stats = snake.alive ? `DŁ ${snake.body.length}  AMMO ${snake.ammo}` : snake.death === 'left' ? 'WYSZEDŁ' : 'ODPADŁ';
    drawText(ctx, stats, x, 50, { size: 8, color: COLORS.dim, align, alpha });
  });

  if (solo) {
    const snake = round.snakes[0];
    drawText(ctx, 'TRENING', VIEW_W / 2, 22, { size: 14, color: COLORS.text });
    drawText(ctx, `CZAS ${formatTime(round.tick)}  OWOCE ${snake.eaten}`, VIEW_W / 2, 44, { size: 7, color: COLORS.dim });
    return;
  }
  // Numer rundy na środku (rundy nie mają limitu czasu)
  drawText(ctx, `RUNDA ${roundNumber}`, VIEW_W / 2, 22, { size: 14, color: COLORS.text });
  drawText(ctx, `do ${WINS_TO_MATCH} wygranych`, VIEW_W / 2, 44, { size: 7, color: COLORS.dim });
}

/** Czas rundy z liczby ticków, np. „1:05”. */
export function formatTime(ticks) {
  const seconds = Math.floor((ticks * TICK_MS) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
