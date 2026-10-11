// Owoce: zjadanie i uzupełnianie na losowych wolnych polach.

import { randInt } from '../core/rng.js';
import { cellIndex, samePos } from './grid.js';

/** @typedef {import('./types.js').RoundState} RoundState */
/** @typedef {import('./types.js').GameEvent} GameEvent */

/** @param {RoundState} state */
export function refillFood(state) {
  const { grid } = state;
  if (state.food.length >= state.foodCount) return;

  const taken = new Uint8Array(state.walls);
  const mark = (p) => {
    if (p.x >= 0 && p.y >= 0 && p.x < grid.w && p.y < grid.h) taken[cellIndex(grid, p)] = 1;
  };
  state.snakes.forEach((s) => s.body.forEach(mark));
  state.bullets.forEach((b) => mark(b.pos));
  state.food.forEach(mark);

  const free = [];
  for (let i = 0; i < taken.length; i++) if (!taken[i]) free.push(i);

  while (state.food.length < state.foodCount && free.length) {
    const k = randInt(state.rng, free.length);
    const i = free[k];
    free[k] = free[free.length - 1];
    free.pop();
    state.food.push({ x: i % grid.w, y: Math.floor(i / grid.w) });
  }
}

/** @param {RoundState} state @param {GameEvent[]} events */
export function eatFood(state, events) {
  for (const snake of state.snakes) {
    if (!snake.alive) continue;
    const i = state.food.findIndex((f) => samePos(f, snake.body[0]));
    if (i < 0) continue;
    const [pos] = state.food.splice(i, 1);
    snake.growPending++;
    snake.eaten++;
    events.push({ type: 'ate', snake: snake.id, pos });
  }
}
