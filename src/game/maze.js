// Symetryczny labirynt: ściany są stawiane parami (pole i jego obraz po obrocie o 180°),
// więc obaj gracze mają identyczną sytuację. Okolice spawnów są zawsze wolne,
// a wszystkie wolne pola są osiągalne.

import { nextFloat, randInt } from '../core/rng.js';
import { DIR_VEC, cellIndex, inBounds, rotate180, step } from './grid.js';

/** @typedef {import('./types.js').Grid} Grid */
/** @typedef {import('./types.js').Pos} Pos */
/** @typedef {import('./types.js').Dir} Dir */

/**
 * Pozycje startowe: Leon w lewym górnym rogu w prawo, Hugo symetrycznie.
 * @param {Grid} grid
 * @param {number} length
 * @returns {{ body: Pos[], dir: Dir }[]}
 */
export function spawnPoints(grid, length) {
  const headX = 2 + length;
  const leon = Array.from({ length }, (_, i) => ({ x: headX - i, y: 2 }));
  const hugo = leon.map((p) => rotate180(grid, p));
  return [
    { body: leon, dir: 'right' },
    { body: hugo, dir: 'left' },
  ];
}

/** Pola, na których nie wolno stawiać ścian: otoczenie węży i korytarz przed głową. */
function protectedCells(grid, spawns) {
  const mask = new Uint8Array(grid.w * grid.h);
  const mark = (p) => {
    if (inBounds(grid, p)) mask[cellIndex(grid, p)] = 1;
  };

  for (const { body, dir } of spawns) {
    for (const seg of body) {
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) mark({ x: seg.x + dx, y: seg.y + dy });
      }
    }
    const side = DIR_VEC[dir].x !== 0 ? { x: 0, y: 1 } : { x: 1, y: 0 };
    let p = body[0];
    for (let i = 0; i < 14; i++) {
      p = step(p, dir);
      for (let k = -1; k <= 1; k++) mark({ x: p.x + side.x * k, y: p.y + side.y * k });
    }
  }
  return mask;
}

/** Flood fill od pola start. Zwraca maskę osiągalnych pól. */
export function reachable(grid, walls, start) {
  const seen = new Uint8Array(grid.w * grid.h);
  const stack = [start];
  seen[cellIndex(grid, start)] = 1;
  while (stack.length) {
    const p = stack.pop();
    for (const d of Object.keys(DIR_VEC)) {
      const q = step(p, /** @type {Dir} */ (d));
      if (!inBounds(grid, q)) continue;
      const i = cellIndex(grid, q);
      if (seen[i] || walls[i]) continue;
      seen[i] = 1;
      stack.push(q);
    }
  }
  return seen;
}

/**
 * @param {Grid} grid
 * @param {{ state: number }} rng
 * @param {{ body: Pos[], dir: Dir }[]} spawns
 * @param {{ density?: number, attempts?: number }} [options]
 * @returns {Uint8Array}
 */
export function generateMaze(grid, rng, spawns, { density = 0.08, attempts = 30 } = {}) {
  const size = grid.w * grid.h;
  const forbidden = protectedCells(grid, spawns);
  const target = Math.floor(size * density);

  for (let attempt = 0; attempt < attempts; attempt++) {
    const walls = new Uint8Array(size);
    let count = 0;

    for (let tries = 0; count < target && tries < 2000; tries++) {
      const horizontal = nextFloat(rng) < 0.5;
      const len = 2 + randInt(rng, 5);
      const x0 = randInt(rng, grid.w);
      const y0 = randInt(rng, grid.h);

      const cells = [];
      for (let i = 0; i < len; i++) {
        const p = horizontal ? { x: x0 + i, y: y0 } : { x: x0, y: y0 + i };
        if (!inBounds(grid, p)) break;
        cells.push(p);
      }
      if (cells.some((p) => forbidden[cellIndex(grid, p)])) continue;

      for (const p of cells) {
        for (const q of [p, rotate180(grid, p)]) {
          const i = cellIndex(grid, q);
          if (!walls[i]) {
            walls[i] = 1;
            count++;
          }
        }
      }
    }

    // Spawny muszą się „widzieć”, a zamknięte kieszenie zamieniamy w ściany.
    // Obszar osiągalny z jednego spawnu zawiera drugi, więc jest symetryczny.
    const start = spawns[0].body[0];
    const seen = reachable(grid, walls, start);
    if (!seen[cellIndex(grid, spawns[1].body[0])]) continue;
    for (let i = 0; i < size; i++) {
      if (!seen[i]) walls[i] = 1;
    }
    return walls;
  }

  return new Uint8Array(size);
}
