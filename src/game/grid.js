// Kratka: kierunki, pozycje i pomocnicze funkcje.

/** @typedef {import('./types.js').Dir} Dir */
/** @typedef {import('./types.js').Pos} Pos */
/** @typedef {import('./types.js').Grid} Grid */

/** @type {Record<Dir, Pos>} */
export const DIR_VEC = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/** @type {Record<Dir, Dir>} */
export const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

/** @param {Pos} pos @param {Dir} dir @returns {Pos} */
export function step(pos, dir) {
  const v = DIR_VEC[dir];
  return { x: pos.x + v.x, y: pos.y + v.y };
}

/** @param {Pos} a @param {Pos} b */
export function samePos(a, b) {
  return a.x === b.x && a.y === b.y;
}

/** @param {Grid} grid @param {Pos} p */
export function inBounds(grid, p) {
  return p.x >= 0 && p.y >= 0 && p.x < grid.w && p.y < grid.h;
}

/** @param {Grid} grid @param {Pos} p */
export function cellIndex(grid, p) {
  return p.y * grid.w + p.x;
}

/** Obrót o 180° wokół środka planszy. @param {Grid} grid @param {Pos} p */
export function rotate180(grid, p) {
  return { x: grid.w - 1 - p.x, y: grid.h - 1 - p.y };
}

/** Czy pole jest poza planszą albo jest ścianą. */
export function isBlocked(grid, walls, p) {
  return !inBounds(grid, p) || walls[cellIndex(grid, p)] === 1;
}
