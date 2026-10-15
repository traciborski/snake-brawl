// Pociski: strzał (1 segment ogona = 10 strzałów), lot i kolizje.
// Ściany działają na pocisk jak na węża: czarna odbija, czerwona niszczy, niebieska i krawędź
// przenoszą na drugą stronę. Pocisk ma zasięg (BULLET_RANGE pól) i najwyżej BULLET_MAX_BOUNCES
// odbić, żeby nie latał w kółko. Własne pociski przelatują przez strzelającego.

import { BULLET_CELLS, BULLET_MAX_BOUNCES, BULLET_PER_TICKS, BULLET_RANGE, SHOTS_PER_SEGMENT, SHOT_COOLDOWN, WALL } from '../config.js';
import { OPPOSITE, cellIndex, passThrough, samePos } from './grid.js';
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
  const bullet = { owner: snake.id, pos: { ...snake.body[0] }, dir: snake.dir, travel: 0, bounces: 0 };
  events.push({ type: 'shot', snake: snake.id, pos: { ...snake.body[0] } });

  // Pierwsze pole lotu: przed głową (albo za ścianą, od której pocisk się odbił)
  const first = nextCell(state, bullet);
  if (first.gone) {
    events.push({ type: 'bulletWall', pos: first.wallPos });
    return true;
  }
  applyMove(bullet, first, events);
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
 * Dokąd pocisk przeleci o jedno pole, tak jak wąż: przez krawędź i niebieskie ściany na drugą
 * stronę, od czarnej się odbija (zawraca i zostaje na swoim polu), na czerwonej znika.
 * Znika też po przeleceniu BULLET_RANGE pól i po zbyt wielu odbiciach.
 * @param {RoundState} state @param {Bullet} bullet
 * @returns {{ gone: boolean, pos: import('./types.js').Pos, dir: import('./types.js').Dir,
 *   bounced: boolean, teleported: boolean, wallPos: import('./types.js').Pos }}
 */
export function nextCell(state, bullet) {
  const { grid, walls } = state;
  const { pos, teleported } = passThrough(grid, walls, bullet.pos, bullet.dir);
  const wall = walls[cellIndex(grid, pos)];
  const travel = (bullet.travel ?? 0) + 1;
  const result = { gone: false, pos, dir: bullet.dir, bounced: false, teleported, wallPos: pos };
  if (wall === WALL.DEADLY || travel > BULLET_RANGE) return { ...result, gone: true };
  if (wall === WALL.BOUNCE) {
    if ((bullet.bounces ?? 0) >= BULLET_MAX_BOUNCES) return { ...result, gone: true };
    return { ...result, pos: bullet.pos, dir: OPPOSITE[bullet.dir], bounced: true, teleported: false };
  }
  return result;
}

/** Przesuwa pocisk zgodnie z nextCell (bez kolizji z innymi pociskami i wężami). */
function applyMove(bullet, move, events) {
  bullet.pos = move.pos;
  bullet.dir = move.dir;
  bullet.travel = (bullet.travel ?? 0) + 1;
  if (move.bounced) {
    bullet.bounces = (bullet.bounces ?? 0) + 1;
    events.push({ type: 'bulletBounce', pos: move.wallPos });
  }
  if (move.teleported) events.push({ type: 'bulletWarp', pos: move.pos });
}

/**
 * Jeden krok wszystkich pocisków o 1 pole (ściany jak dla węża, patrz nextCell).
 * Pociski, które wejdą na to samo pole albo się miną, znoszą się nawzajem.
 * @param {RoundState} state @param {GameEvent[]} events
 */
function stepBullets(state, events) {
  const gone = new Set();
  const moves = state.bullets.map((b) => {
    const move = nextCell(state, b);
    return { b, move, from: b.pos, to: move.pos };
  });

  for (const m of moves) {
    if (m.move.gone) {
      gone.add(m.b);
      events.push({ type: 'bulletWall', pos: m.move.wallPos });
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

  for (const m of moves) if (!gone.has(m.b)) applyMove(m.b, m.move, events);
  for (const m of moves) {
    if (!gone.has(m.b) && bulletHitsSnake(state, m.b, events)) gone.add(m.b);
  }
  state.bullets = state.bullets.filter((b) => !gone.has(b));
}
