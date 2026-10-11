// Wąż: tworzenie, skręty, odbicie, reakcja na trafienie.

import { OPPOSITE, dirBetween } from './grid.js';

/** @typedef {import('./types.js').Snake} Snake */
/** @typedef {import('./types.js').Dir} Dir */
/** @typedef {import('./types.js').Pos} Pos */
/** @typedef {import('./types.js').GameEvent} GameEvent */

export const MAX_QUEUED_TURNS = 2;

/** @param {number} id @param {Pos[]} body @param {Dir} dir @returns {Snake} */
export function createSnake(id, body, dir) {
  return {
    id,
    body: body.map((p) => ({ ...p })),
    dir,
    nextDirs: [],
    growPending: 0,
    eaten: 0,
    cooldown: 0,
    ammo: 0,
    alive: true,
    death: null,
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
  return snake.alive && snake.cooldown === 0 && (snake.ammo > 0 || snake.body.length > 1);
}

/**
 * Odbicie od przeszkody: wąż zawraca, czyli ogon staje się głową
 * i dalej jedzie w stronę, w którą „patrzył” ogon.
 * @param {Snake} snake @param {import('./types.js').Grid} grid
 */
export function bounce(snake, grid) {
  snake.nextDirs = [];
  if (snake.body.length === 1) {
    snake.dir = OPPOSITE[snake.dir];
    return;
  }
  snake.body.reverse();
  // Przy przeskoku przez portal segmenty nie sąsiadują: wtedy po prostu zawracamy
  snake.dir = dirBetween(grid, snake.body[1], snake.body[0]) ?? OPPOSITE[snake.dir];
}

/** Śmierć węża. @param {Snake} snake @param {'shot' | 'wall' | 'crash' | 'body' | 'left'} cause */
export function kill(snake, cause, by, events) {
  snake.alive = false;
  snake.death = cause;
  events.push({ type: 'died', snake: snake.id, by, pos: { ...snake.body[0] }, cause });
}

/**
 * Trafienie pociskiem w segment o indeksie `index`.
 * Głowa → śmierć, ciało → odcięcie ogona od trafionego segmentu.
 * @param {Snake} snake @param {number} index @param {number} by @param {GameEvent[]} events
 */
export function applyHit(snake, index, by, events) {
  if (index === 0) {
    kill(snake, 'shot', by, events);
    return;
  }
  const cells = snake.body.splice(index);
  events.push({ type: 'bodyHit', snake: snake.id, by, cells });
}

/** Indeks segmentu węża na danym polu albo -1. */
export function segmentAt(snake, pos) {
  return snake.body.findIndex((p) => p.x === pos.x && p.y === pos.y);
}
