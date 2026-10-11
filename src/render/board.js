// Plansza: tło, kropki kratki, ramka i ściany. Ściany się nie zmieniają w trakcie
// rundy, więc rysujemy je raz do warstwy off-screen (poświata jest kosztowna).

import { BOARD_Y, CELL, COLORS, GRID_H, GRID_W } from '../config.js';

const BOARD_W = GRID_W * CELL;
const BOARD_H = GRID_H * CELL;

/** @type {{ walls: Uint8Array | null, scale: number, canvas: HTMLCanvasElement | null }} */
const cache = { walls: null, scale: 0, canvas: null };

function buildLayer(walls, grid, scale) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(BOARD_W * scale);
  canvas.height = Math.ceil(BOARD_H * scale);
  const c = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  c.scale(scale, scale);

  c.fillStyle = COLORS.board;
  c.fillRect(0, 0, BOARD_W, BOARD_H);

  c.fillStyle = COLORS.gridDot;
  for (let y = 1; y < grid.h; y++) {
    for (let x = 1; x < grid.w; x++) c.fillRect(x * CELL - 1, y * CELL - 1, 2, 2);
  }

  // Każdy rodzaj ściany: świecąca krawędź + ciemny środek
  for (const [kind, [edge, fill]] of Object.entries(COLORS.walls)) {
    const wallPath = new Path2D();
    const innerPath = new Path2D();
    for (let y = 0; y < grid.h; y++) {
      for (let x = 0; x < grid.w; x++) {
        if (walls[y * grid.w + x] !== Number(kind)) continue;
        wallPath.rect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
        innerPath.rect(x * CELL + 4, y * CELL + 4, CELL - 8, CELL - 8);
      }
    }
    c.shadowColor = edge;
    c.shadowBlur = 10;
    c.fillStyle = edge;
    c.fill(wallPath);
    c.shadowBlur = 0;
    c.fillStyle = fill;
    c.fill(innerPath);
  }

  return canvas;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../game/types.js').RoundState} round
 * @param {number} scale  skala canvasu (dla ostrej warstwy)
 */
export function drawBoard(ctx, round, scale) {
  if (cache.walls !== round.walls || cache.scale !== scale) {
    cache.canvas = buildLayer(round.walls, round.grid, scale);
    cache.walls = round.walls;
    cache.scale = scale;
  }
  ctx.drawImage(/** @type {HTMLCanvasElement} */ (cache.canvas), 0, BOARD_Y, BOARD_W, BOARD_H);

  ctx.save();
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 2;
  ctx.shadowColor = COLORS.border;
  ctx.shadowBlur = 12;
  ctx.strokeRect(1, BOARD_Y + 1, BOARD_W - 2, BOARD_H - 2);
  ctx.restore();
}
