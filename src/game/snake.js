// Wąż: tworzenie, skręty, timery, reakcja na trafienie.

import { IMMUNITY_TICKS, STUN_TICKS } from '../config.js';
import { OPPOSITE } from './grid.js';

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
    stun: 0,
    immunity: 0,
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

/** Odlicza cooldown, ogłuszenie i odporność (odporność startuje po końcu ogłuszenia). */
export function tickTimers(snake) {
  if (snake.cooldown > 0) snake.cooldown--;
  if (snake.stun > 0) {
    snake.stun--;
    if (snake.stun === 0) snake.immunity = IMMUNITY_TICKS;
  } else if (snake.immunity > 0) {
    snake.immunity--;
  }
}

/** @param {Snake} snake */
export function canShoot(snake) {
  return snake.alive && snake.stun === 0 && snake.cooldown === 0 && snake.body.length > 1;
}

/**
 * Trafienie pociskiem w segment o indeksie `index`.
 * Głowa → ogłuszenie (jeśli wąż nie jest ogłuszony ani odporny), ciało → odcięcie ogona.
 * @param {Snake} snake @param {number} index @param {number} by @param {GameEvent[]} events
 */
export function applyHit(snake, index, by, events) {
  if (index === 0) {
    const pos = { ...snake.body[0] };
    if (snake.stun === 0 && snake.immunity === 0) {
      snake.stun = STUN_TICKS;
      snake.nextDirs = [];
      events.push({ type: 'stunned', snake: snake.id, by, pos });
    } else {
      events.push({ type: 'deflected', snake: snake.id, pos });
    }
    return;
  }
  const cells = snake.body.splice(index);
  events.push({ type: 'bodyHit', snake: snake.id, by, cells });
}

/** Indeks segmentu węża na danym polu albo -1. */
export function segmentAt(snake, pos) {
  return snake.body.findIndex((p) => p.x === pos.x && p.y === pos.y);
}
