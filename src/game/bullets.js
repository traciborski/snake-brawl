// Pociski: strzał (1 segment ogona = 10 strzałów), lot i kolizje.
// Pocisk znika na każdej ścianie i na krawędzi planszy. Własne pociski przelatują przez strzelającego.

import { BULLET_CELLS, BULLET_PER_TICKS, SHOTS_PER_SEGMENT, SHOT_COOLDOWN } from '../config.js';
import { isBlocked, samePos, step } from './grid.js';
import { applyHit, canShoot, segmentAt } from './snake.js';

/** @typedef {import('./types.js').RoundState} RoundState */
/** @typedef {import('./types.js').Snake} Snake */
/** @typedef {import('./types.js').Bullet} Bullet */
/** @typedef {import('./types.js').GameEvent} GameEvent */

/** Ile pól pocisk przelatuje w danym ticku (rozkłada BULLET_CELLS równo na BULLET_PER_TICKS). */
export function bulletStepsAt(tick) {
  const at = (t) => Math.floor((t * BULLET_CELLS) / BULLET_PER_TICKS);
  return at(tick) - at(tick - 1);
}

/**
 * Strzał: tworzy pocisk na polu przed głową. Gdy skończy się amunicja, zabiera
 * segment z ogona i zamienia go na SHOTS_PER_SEGMENT strzałów.
 * @param {RoundState} state @param {Snake} snake @param {GameEvent[]} events
 * @returns {boolean} czy strzał padł
 */
export function fire(state, snake, events) {
  if (!canShoot(snake)) return false;
  if (snake.ammo === 0) {
    snake.body.pop();
    snake.ammo = SHOTS_PER_SEGMENT;
  }
  snake.ammo--;
  snake.cooldown = SHOT_COOLDOWN;

  /** @type {Bullet} */
  const bullet = { owner: snake.id, pos: step(snake.body[0], snake.dir), dir: snake.dir };
  events.push({ type: 'shot', snake: snake.id, pos: { ...snake.body[0] } });

  if (isBlocked(state.grid, state.walls, bullet.pos)) {
    events.push({ type: 'bulletWall', pos: bullet.pos });
    return true;
  }
  const other = state.bullets.findIndex((b) => samePos(b.pos, bullet.pos));
  if (other >= 0) {
    state.bullets.splice(other, 1);
    events.push({ type: 'bulletClash', pos: bullet.pos });
    return true;
  }
  if (!bulletHitsSnake(state, bullet, events)) state.bullets.push(bullet);
  return true;
}

/**
 * Trafienie węża (innego niż strzelający) na polu pocisku.
 * @returns {boolean} true, jeśli pocisk kogoś trafił (i znika)
 */
export function bulletHitsSnake(state, bullet, events) {
  for (const snake of state.snakes) {
    if (!snake.alive || snake.id === bullet.owner) continue;
    const index = segmentAt(snake, bullet.pos);
    if (index < 0) continue;
    applyHit(snake, index, bullet.owner, events);
    return true;
  }
  return false;
}

/** Przesuwa pociski o tyle pól, ile wypada w tym ticku, sprawdzając kolizje po każdym polu. */
export function moveBullets(state, events) {
  const steps = bulletStepsAt(state.tick);
  for (let i = 0; i < steps && state.bullets.length; i++) stepBullets(state, events);
}

/**
 * Jeden krok wszystkich pocisków o 1 pole. Ściana albo krawędź → pocisk znika.
 * Pociski, które wejdą na to samo pole albo się miną, znoszą się nawzajem.
 * @param {RoundState} state @param {GameEvent[]} events
 */
function stepBullets(state, events) {
  const gone = new Set();
  const moves = state.bullets.map((b) => ({ b, from: b.pos, to: step(b.pos, b.dir) }));

  for (const m of moves) {
    if (isBlocked(state.grid, state.walls, m.to)) {
      gone.add(m.b);
      events.push({ type: 'bulletWall', pos: m.to });
    }
  }

  for (let i = 0; i < moves.length; i++) {
    for (let j = i + 1; j < moves.length; j++) {
      const a = moves[i];
      const c = moves[j];
      if (gone.has(a.b) || gone.has(c.b)) continue;
      const meet = samePos(a.to, c.to);
      const cross = samePos(a.to, c.from) && samePos(c.to, a.from);
      if (meet || cross) {
        events.push({ type: 'bulletClash', pos: a.to });
        gone.add(a.b);
        gone.add(c.b);
      }
    }
  }

  for (const m of moves) m.b.pos = m.to;
  for (const m of moves) {
    if (!gone.has(m.b) && bulletHitsSnake(state, m.b, events)) gone.add(m.b);
  }
  state.bullets = state.bullets.filter((b) => !gone.has(b));
}
