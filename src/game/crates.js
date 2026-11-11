// Jedna wybuchowa skrzynka na planszy i amunicja pozostająca po wybuchu.

import { CRATE_AMMO, CRATE_RADIUS, WALL } from '../config.js';
import { randInt } from '../core/rng.js';
import { cellIndex, samePos, step, wrap } from './grid.js';
import { applyHit, kill } from './snake.js';

/** @param {import('./types.js').RoundState} state */
export function refillCrate(state) {
  if (state.crate) return;
  const taken = new Uint8Array(state.walls);
  const mark = (p) => { taken[cellIndex(state.grid, p)] = 1; };
  for (const snake of state.snakes) {
    snake.body.forEach(mark);
    // Nowa skrzynka nie pojawia się tuż przed jadącym wężem.
    if (snake.alive) {
      let p = snake.body[0];
      for (let i = 0; i <= CRATE_RADIUS; i++) {
        p = wrap(state.grid, step(p, snake.dir));
        mark(p);
      }
    }
  }
  state.food.forEach(mark);
  state.ammoPickups.forEach(mark);
  state.bullets.forEach((b) => mark(b.pos));
  const free = [];
  for (let i = 0; i < taken.length; i++) if (!taken[i]) free.push(i);
  if (!free.length) return;
  const i = free[randInt(state.rng, free.length)];
  state.crate = { x: i % state.grid.w, y: Math.floor(i / state.grid.w) };
}

/**
 * Wybuch obejmuje kwadrat 5×5, przy krawędzi przycięty do planszy.
 * Ściany zastępujemy nową tablicą: kopie rollbacku i cache renderera zachowują swój labirynt.
 * @param {import('./types.js').RoundState} state
 * @param {number | null} by
 * @param {import('./types.js').GameEvent[]} events
 */
export function explodeCrate(state, by, events) {
  if (!state.crate) return;
  const pos = state.crate;
  state.crate = null;
  const inside = (p) => Math.abs(p.x - pos.x) <= CRATE_RADIUS && Math.abs(p.y - pos.y) <= CRATE_RADIUS;
  const cells = [];
  state.walls = new Uint8Array(state.walls);
  for (let y = Math.max(0, pos.y - CRATE_RADIUS); y <= Math.min(state.grid.h - 1, pos.y + CRATE_RADIUS); y++) {
    for (let x = Math.max(0, pos.x - CRATE_RADIUS); x <= Math.min(state.grid.w - 1, pos.x + CRATE_RADIUS); x++) {
      const p = { x, y };
      cells.push(p);
      state.walls[cellIndex(state.grid, p)] = WALL.NONE;
    }
  }
  state.bullets = state.bullets.filter((b) => !inside(b.pos));
  state.food = state.food.filter((p) => !inside(p));
  state.ammoPickups = state.ammoPickups.filter((p) => !inside(p));
  events.push({ type: 'crateExploded', pos, cells });
  for (const snake of state.snakes) {
    if (!snake.alive) continue;
    const index = snake.body.findIndex(inside);
    if (index === 0) kill(snake, 'explosion', by, events);
    else if (index > 0) applyHit(snake, index, by, events);
  }
  state.ammoPickups.push({ ...pos });
}

/** @param {import('./types.js').RoundState} state @param {import('./types.js').GameEvent[]} events */
export function collectAmmo(state, events) {
  for (const snake of state.snakes) {
    if (!snake.alive) continue;
    const i = state.ammoPickups.findIndex((p) => samePos(p, snake.body[0]));
    if (i < 0) continue;
    const [pos] = state.ammoPickups.splice(i, 1);
    snake.ammo += CRATE_AMMO;
    events.push({ type: 'ammoCollected', snake: snake.id, pos });
  }
}
