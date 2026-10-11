// Symetryczny labirynt: każda ściana ma lustrzane odbicia w obu osiach (a więc też obraz
// po obrocie o 180°), więc gracze w każdym z czterech rogów mają identyczną sytuację.
// Okolice spawnów są zawsze wolne, a wszystkie wolne pola są osiągalne.

import { nextFloat, randInt } from '../core/rng.js';
import { WALL } from '../config.js';
import { DIR_VEC, cellIndex, inBounds, passThrough, rotate180, step } from './grid.js';

const mirrorX = (grid, p) => ({ x: grid.w - 1 - p.x, y: p.y });
const mirrorY = (grid, p) => ({ x: p.x, y: grid.h - 1 - p.y });

/** Pole i jego trzy lustrzane odbicia. */
export function symmetric(grid, p) {
  return [p, mirrorX(grid, p), mirrorY(grid, p), rotate180(grid, p)];
}

/** @typedef {import('./types.js').Grid} Grid */
/** @typedef {import('./types.js').Pos} Pos */
/** @typedef {import('./types.js').Dir} Dir */

/**
 * Pozycje startowe w czterech rogach, kolejno: lewy górny, prawy dolny, prawy górny, lewy dolny.
 * Przy dwóch graczach zajmują więc przeciwległe rogi.
 * @param {Grid} grid
 * @param {number} length
 * @returns {{ body: Pos[], dir: Dir }[]}
 */
export function spawnPoints(grid, length) {
  const headX = 2 + length;
  const tl = Array.from({ length }, (_, i) => ({ x: headX - i, y: 2 }));
  return [
    { body: tl, dir: 'right' },
    { body: tl.map((p) => rotate180(grid, p)), dir: 'left' },
    { body: tl.map((p) => mirrorX(grid, p)), dir: 'left' },
    { body: tl.map((p) => mirrorY(grid, p)), dir: 'right' },
  ];
}

/**
 * Stałe czarne osłony na środku górnego i dolnego brzegu: węże z sąsiednich rogów
 * startują naprzeciw siebie w tym samym rzędzie, więc nie mogą mieć się od razu na muszce.
 */
function startCovers(grid) {
  const cells = [];
  for (const x of [Math.floor(grid.w / 2) - 1, Math.floor(grid.w / 2)]) {
    for (const y of [1, 2, 3]) cells.push(...symmetric(grid, { x, y }));
  }
  return cells;
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

/** Flood fill od pola start, poruszając się jak wąż (przez portale i krawędź). Zwraca maskę osiągalnych pól. */
export function reachable(grid, walls, start) {
  const seen = new Uint8Array(grid.w * grid.h);
  const stack = [start];
  seen[cellIndex(grid, start)] = 1;
  while (stack.length) {
    const p = stack.pop();
    for (const d of Object.keys(DIR_VEC)) {
      const { pos: q } = passThrough(grid, walls, p, /** @type {Dir} */ (d));
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
    for (const p of startCovers(grid)) walls[cellIndex(grid, p)] = WALL.BOUNCE;
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

      // Każdy odcinek ma jeden rodzaj: czarna, czerwona albo niebieska, po równo
      const kind = 1 + randInt(rng, 3);
      for (const p of cells) {
        for (const q of symmetric(grid, p)) {
          const i = cellIndex(grid, q);
          if (!walls[i]) {
            walls[i] = kind;
            count++;
          }
        }
      }
    }

    // Wszystkie spawny muszą być połączone, a zamknięte kieszenie zamieniamy w ściany.
    // Obszar osiągalny z jednego spawnu zawiera pozostałe, więc jest symetryczny.
    const seen = reachable(grid, walls, spawns[0].body[0]);
    if (spawns.some((s) => !seen[cellIndex(grid, s.body[0])])) continue;
    let total = 0;
    for (let i = 0; i < size; i++) {
      if (!seen[i] && !walls[i]) walls[i] = WALL.BOUNCE;
      if (walls[i]) total++;
    }
    // Za duże zamknięte kieszenie psują planszę: losujemy od nowa
    if (total > size * density * 1.6) continue;
    return walls;
  }

  return new Uint8Array(size);
}
