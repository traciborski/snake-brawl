// Wąż: tworzenie, skręty, odbicie, reakcja na trafienie.

import { DIR_VEC, OPPOSITE } from './grid.js';

/** @typedef {import('./types.js').Snake} Snake */
/** @typedef {import('./types.js').Dir} Dir */
/** @typedef {import('./types.js').Pos} Pos */
/** @typedef {import('./types.js').GameEvent} GameEvent */

export const MAX_QUEUED_TURNS = 2;

/** @param {0 | 1} id @param {Pos[]} body @param {Dir} dir @returns {Snake} */
export function createSnake(id, body, dir) {
  return {
    id,
    body: body.map((p) => ({ ...p })),
    dir,
    nextDirs: [],
    growPending: 0,
    cooldown: 0,
    alive: true,
  };
}

/**
 * Dodaje skręt do kolejki. Ignoruje zawracanie i powtórzenie kierunku.
 * @param {Snake} snake @param {Dir} dir @returns {boolean}
 */
export function queueTurn(snake, dir) {
  const last = snake.nextDirs.length ? snake.nextDirs[snake.nextDirs.length - 1] : snake.dir;
  if (dir === last || dir === OPPOSITE[last]) return false;
  if (snake.nextDirs.length >= MAX_QUEUED_TURNS) return false;
  snake.nextDirs.push(dir);
  return true;
}

/** @param {Snake} snake */
export function tickTimers(snake) {
  if (snake.cooldown > 0) snake.cooldown--;
}

/** @param {Snake} snake */
export function canShoot(snake) {
  return snake.alive && snake.cooldown === 0 && snake.body.length > 1;
}

/**
 * Odbicie od przeszkody: wąż zawraca, czyli ogon staje się głową
 * i dalej jedzie w stronę, w którą „patrzył” ogon.
 * @param {Snake} snake
 */
export function bounce(snake) {
  snake.nextDirs = [];
  if (snake.body.length === 1) {
    snake.dir = OPPOSITE[snake.dir];
    return;
  }
  snake.body.reverse();
  const [head, neck] = snake.body;
  const dx = head.x - neck.x;
  const dy = head.y - neck.y;
  snake.dir = /** @type {Dir} */ (
    Object.keys(DIR_VEC).find((d) => DIR_VEC[d].x === dx && DIR_VEC[d].y === dy) ?? OPPOSITE[snake.dir]
  );
}

/**
 * Trafienie pociskiem w segment o indeksie `index`.
 * Głowa → śmierć, ciało → odcięcie ogona od trafionego segmentu.
 * @param {Snake} snake @param {number} index @param {number} by @param {GameEvent[]} events
 */
export function applyHit(snake, index, by, events) {
  if (index === 0) {
    snake.alive = false;
    events.push({ type: 'died', snake: snake.id, by, pos: { ...snake.body[0] } });
    return;
  }
  const cells = snake.body.splice(index);
  events.push({ type: 'bodyHit', snake: snake.id, by, cells });
}

/** Indeks segmentu węża na danym polu albo -1. */
export function segmentAt(snake, pos) {
  return snake.body.findIndex((p) => p.x === pos.x && p.y === pos.y);
}
