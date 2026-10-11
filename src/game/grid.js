// Kratka: kierunki, pozycje i pomocnicze funkcje.

import { WALL } from '../config.js';

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

/** Czy pole jest poza planszą albo jest ścianą (dowolnego rodzaju). */
export function isBlocked(grid, walls, p) {
  return !inBounds(grid, p) || walls[cellIndex(grid, p)] !== 0;
}

/** Zawija pozycję na drugą stronę planszy (krawędź działa jak portal). */
export function wrap(grid, p) {
  return { x: (p.x + grid.w) % grid.w, y: (p.y + grid.h) % grid.h };
}

/**
 * Pole, na które wjeżdża wąż z `from` w kierunku `dir`.
 * - Krawędź planszy: wyjazd z przeciwnej krawędzi.
 * - Niebieska ściana w środku: wyjazd zza jej bliźniaczki po drugiej stronie planszy
 *   (obraz po obrocie o 180°; labirynt jest symetryczny, więc zawsze istnieje),
 *   dalej w tym samym kierunku.
 * @param {Grid} grid @param {Uint8Array} walls @param {Pos} from @param {Dir} dir
 * @returns {{ pos: Pos, teleported: boolean }}
 */
export function passThrough(grid, walls, from, dir) {
  const isPortal = (p) => walls[cellIndex(grid, p)] === WALL.PORTAL;
  const next = step(from, dir);
  let teleported = !inBounds(grid, next);
  let pos = wrap(grid, next);
  if (isPortal(pos)) {
    pos = rotate180(grid, pos);
    for (let i = 0; i < grid.w + grid.h && isPortal(pos); i++) pos = wrap(grid, step(pos, dir));
    teleported = true;
  }
  return { pos, teleported };
}

/**
 * Kierunek od pola `from` do sąsiedniego pola `to`, także przez krawędź planszy.
 * Gdy pola nie sąsiadują (przeskok przez niebieską ścianę), zwraca null.
 * @returns {Dir | null}
 */
export function dirBetween(grid, from, to) {
  for (const d of /** @type {Dir[]} */ (Object.keys(DIR_VEC))) {
    if (samePos(wrap(grid, step(from, d)), to)) return d;
  }
  return null;
}
