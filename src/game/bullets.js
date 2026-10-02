// Pociski: strzał (koszt segmentu), lot i kolizje.

import { SHOT_COOLDOWN } from '../config.js';
import { isBlocked, samePos, step } from './grid.js';
import { applyHit, canShoot, segmentAt } from './snake.js';

/** @typedef {import('./types.js').RoundState} RoundState */
/** @typedef {import('./types.js').Snake} Snake */
/** @typedef {import('./types.js').Bullet} Bullet */
/** @typedef {import('./types.js').GameEvent} GameEvent */

/**
 * Strzał: zabiera segment z ogona i tworzy pocisk na polu przed głową.
 * @param {RoundState} state @param {Snake} snake @param {GameEvent[]} events
 * @returns {boolean} czy strzał padł
 */
export function fire(state, snake, events) {
  if (!canShoot(snake)) return false;
  snake.body.pop();
  snake.cooldown = SHOT_COOLDOWN;

  /** @type {Bullet} */
  const bullet = { owner: snake.id, pos: step(snake.body[0], snake.dir), dir: snake.dir };
  events.push({ type: 'shot', snake: snake.id, pos: { ...snake.body[0] } });

  const other = state.bullets.findIndex((b) => samePos(b.pos, bullet.pos));
  if (other >= 0) {
    state.bullets.splice(other, 1);
    events.push({ type: 'bulletClash', pos: bullet.pos });
    return true;
  }
  if (!bulletHitsCell(state, bullet, events)) state.bullets.push(bullet);
  return true;
}

/**
 * Sprawdza, co jest na polu pocisku: ściana, krawędź albo wąż.
 * @returns {boolean} true, jeśli pocisk znika
 */
export function bulletHitsCell(state, bullet, events) {
  if (isBlocked(state.grid, state.walls, bullet.pos)) {
    events.push({ type: 'bulletWall', pos: bullet.pos });
    return true;
  }
  for (const snake of state.snakes) {
    if (!snake.alive) continue;
    const index = segmentAt(snake, bullet.pos);
    if (index < 0) continue;
    applyHit(snake, index, bullet.owner, events);
    return true;
  }
  return false;
}

/**
 * Przesuwa wszystkie pociski o 1 pole. Pociski, które wejdą na to samo pole
 * albo się miną, znoszą się nawzajem.
 * @param {RoundState} state @param {GameEvent[]} events
 */
export function moveBullets(state, events) {
  const moves = state.bullets.map((b) => ({ b, from: b.pos, to: step(b.pos, b.dir) }));
  const gone = new Set();

  for (let i = 0; i < moves.length; i++) {
    for (let j = i + 1; j < moves.length; j++) {
      const a = moves[i];
      const c = moves[j];
      const meet = samePos(a.to, c.to);
      const cross = samePos(a.to, c.from) && samePos(c.to, a.from);
      if (meet || cross) {
        if (!gone.has(a.b) && !gone.has(c.b)) events.push({ type: 'bulletClash', pos: a.to });
        gone.add(a.b);
        gone.add(c.b);
      }
    }
  }

  for (const m of moves) m.b.pos = m.to;
  for (const m of moves) {
    if (!gone.has(m.b) && bulletHitsCell(state, m.b, events)) gone.add(m.b);
  }
  state.bullets = state.bullets.filter((b) => !gone.has(b));
}
