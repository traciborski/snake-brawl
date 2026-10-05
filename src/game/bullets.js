// Pociski: strzał (koszt segmentu), lot, odbicia od ścian i kolizje.

import { BULLET_MAX_BOUNCES, SHOT_COOLDOWN } from '../config.js';
import { OPPOSITE, isBlocked, samePos, step } from './grid.js';
import { applyHit, canShoot, segmentAt } from './snake.js';

/** @typedef {import('./types.js').RoundState} RoundState */
/** @typedef {import('./types.js').Snake} Snake */
/** @typedef {import('./types.js').Bullet} Bullet */
/** @typedef {import('./types.js').GameEvent} GameEvent */

/**
 * Strzał: zabiera segment z ogona i tworzy pocisk na polu przed głową.
 * Strzał prosto w przyległą ścianę od razu gaśnie (nie da się zastrzelić samego siebie z bliska).
 * @param {RoundState} state @param {Snake} snake @param {GameEvent[]} events
 * @returns {boolean} czy strzał padł
 */
export function fire(state, snake, events) {
  if (!canShoot(snake)) return false;
  snake.body.pop();
  snake.cooldown = SHOT_COOLDOWN;

  /** @type {Bullet} */
  const bullet = { owner: snake.id, pos: step(snake.body[0], snake.dir), dir: snake.dir, bounces: 0 };
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
 * Trafienie węża na polu pocisku.
 * @returns {boolean} true, jeśli pocisk kogoś trafił (i znika)
 */
export function bulletHitsSnake(state, bullet, events) {
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
 * Przesuwa wszystkie pociski o 1 pole. Pocisk, który trafia na ścianę, zawraca
 * (w tym ticku zostaje w miejscu). Po BULLET_MAX_BOUNCES odbiciach kolejna ściana go niszczy.
 * Pociski, które wejdą na to samo pole albo się miną, znoszą się nawzajem.
 * @param {RoundState} state @param {GameEvent[]} events
 */
export function moveBullets(state, events) {
  const gone = new Set();
  const moves = state.bullets.map((b) => {
    const from = b.pos;
    const next = step(from, b.dir);
    if (!isBlocked(state.grid, state.walls, next)) return { b, from, to: next };

    if (b.bounces >= BULLET_MAX_BOUNCES) {
      gone.add(b);
      events.push({ type: 'bulletWall', pos: next });
    } else {
      b.bounces++;
      b.dir = OPPOSITE[b.dir];
      events.push({ type: 'bulletBounce', pos: next });
    }
    return { b, from, to: from };
  });

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
