// Węże, pociski i owoce. Każda grupa to jedna ścieżka = jedna operacja poświaty.

import { BOARD_Y, CELL, COLORS, PLAYERS } from '../config.js';
import { DIR_VEC } from '../game/grid.js';

/** @typedef {import('../game/types.js').Snake} Snake */
/** @typedef {import('../game/types.js').RoundState} RoundState */

const px = (p) => p.x * CELL;
const py = (p) => BOARD_Y + p.y * CELL;

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Snake} snake
 */
export function drawSnake(ctx, snake) {
  const color = PLAYERS[snake.id].color;

  ctx.save();
  ctx.globalAlpha = snake.alive ? 1 : 0.35;
  ctx.shadowColor = color;
  ctx.shadowBlur = snake.alive ? 12 : 0;

  // Ciało: segmenty z przerwą, coraz ciemniejsze ku ogonowi
  const body = new Path2D();
  for (let i = 1; i < snake.body.length; i++) {
    const p = snake.body[i];
    body.rect(px(p) + 2, py(p) + 2, CELL - 4, CELL - 4);
  }
  ctx.fillStyle = color;
  ctx.globalAlpha *= 0.8;
  ctx.fill(body);
  ctx.globalAlpha = snake.alive ? 1 : 0.35;

  // Głowa
  const head = snake.body[0];
  const hx = px(head);
  const hy = py(head);
  ctx.fillStyle = color;
  ctx.fillRect(hx + 1, hy + 1, CELL - 2, CELL - 2);
  ctx.shadowBlur = 0;

  // Oczy patrzą w kierunku ruchu
  const v = DIR_VEC[snake.dir];
  const cx = hx + CELL / 2 + v.x * 3;
  const cy = hy + CELL / 2 + v.y * 3;
  const ox = v.y !== 0 ? 4 : 0;
  const oy = v.x !== 0 ? 4 : 0;
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(cx - ox - 2, cy - oy - 2, 4, 4);
  ctx.fillRect(cx + ox - 2, cy + oy - 2, 4, 4);

  ctx.restore();
}

/** @param {CanvasRenderingContext2D} ctx @param {RoundState} round */
export function drawBullets(ctx, round) {
  for (const b of round.bullets) {
    const color = PLAYERS[b.owner].color;
    const v = DIR_VEC[b.dir];
    // Każde odbicie przygasza pocisk: widać, ile mu jeszcze zostało
    const fade = 1 - b.bounces * 0.2;
    const x = px(b.pos);
    const y = py(b.pos);
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    // Smuga za pociskiem
    ctx.globalAlpha = 0.35 * fade;
    ctx.fillStyle = color;
    ctx.fillRect(x - v.x * CELL + 6, y - v.y * CELL + 6, CELL - 12, CELL - 12);
    ctx.globalAlpha = fade;
    ctx.fillRect(x + 4, y + 4, CELL - 8, CELL - 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 7, y + 7, CELL - 14, CELL - 14);
    ctx.restore();
  }
}

/** @param {CanvasRenderingContext2D} ctx @param {RoundState} round @param {number} time */
export function drawFood(ctx, round, time) {
  const pulse = 1 + Math.round(Math.sin(time / 150) * 1.5);
  ctx.save();
  ctx.fillStyle = COLORS.food;
  ctx.shadowColor = COLORS.food;
  ctx.shadowBlur = 12;
  const path = new Path2D();
  for (const f of round.food) {
    const s = 6 - pulse;
    path.rect(px(f) + s, py(f) + s, CELL - 2 * s, CELL - 2 * s);
  }
  ctx.fill(path);
  ctx.restore();
}
