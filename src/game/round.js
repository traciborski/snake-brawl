// Runda: stan początkowy i jeden krok symulacji.
// Czysta logika: bez DOM, bez czasu systemowego, losowość tylko z RNG w stanie.

import {
  FOOD_COUNT,
  GRID_H,
  GRID_W,
  MAZE_DENSITY,
  ROUND_TICKS,
  SNAKE_MOVE_EVERY,
  START_LENGTH,
} from '../config.js';
import { createRng } from '../core/rng.js';
import { fire, moveBullets } from './bullets.js';
import { eatFood, refillFood } from './food.js';
import { isBlocked, samePos, step } from './grid.js';
import { generateMaze, spawnPoints } from './maze.js';
import { applyHit, createSnake, queueTurn, tickTimers } from './snake.js';

/** @typedef {import('./types.js').RoundState} RoundState */
/** @typedef {import('./types.js').Command} Command */
/** @typedef {import('./types.js').GameEvent} GameEvent */
/** @typedef {import('./types.js').Pos} Pos */

/**
 * @param {number} seed
 * @param {{ walls?: Uint8Array, foodCount?: number, w?: number, h?: number }} [options]
 * @returns {RoundState}
 */
export function createRound(seed, options = {}) {
  const grid = { w: options.w ?? GRID_W, h: options.h ?? GRID_H };
  const rng = createRng(seed);
  const spawns = spawnPoints(grid, START_LENGTH);
  const walls = options.walls ?? generateMaze(grid, rng, spawns, { density: MAZE_DENSITY });

  /** @type {RoundState} */
  const state = {
    tick: 0,
    rng,
    grid,
    walls,
    snakes: spawns.map((s, i) => createSnake(/** @type {0 | 1} */ (i), s.body, s.dir)),
    bullets: [],
    food: [],
    foodCount: options.foodCount ?? FOOD_COUNT,
    timeLeft: ROUND_TICKS,
    result: null,
  };
  refillFood(state);
  return state;
}

/**
 * Jeden tick symulacji. Modyfikuje stan i zwraca zdarzenia z tego ticka.
 * @param {RoundState} state
 * @param {Command[]} [commands]  komenda na gracza
 * @returns {GameEvent[]}
 */
export function stepRound(state, commands = []) {
  /** @type {GameEvent[]} */
  const events = [];
  if (state.result) return events;
  state.tick++;

  // 1. Komendy: skręty
  state.snakes.forEach((snake, i) => {
    if (!snake.alive) return;
    for (const dir of commands[i]?.turns ?? []) queueTurn(snake, dir);
  });

  // 2. Timery
  for (const snake of state.snakes) tickTimers(snake);
  state.timeLeft--;

  // 3. Strzały
  state.snakes.forEach((snake, i) => {
    if (commands[i]?.shoot) fire(state, snake, events);
  });

  // 4. Pociski
  moveBullets(state, events);

  // 5. Węże
  if (state.tick % SNAKE_MOVE_EVERY === 0) moveSnakes(state, events);

  // 6. Jedzenie
  eatFood(state, events);
  refillFood(state);

  // 7. Koniec rundy
  checkRoundEnd(state, events);
  return events;
}

/**
 * Oba węże ruszają się równocześnie: najpierw liczymy nowe pozycje,
 * potem rozstrzygamy kolizje na podstawie stanu „po ruchu”.
 */
function moveSnakes(state, events) {
  const plans = state.snakes.map((snake) => {
    if (!snake.alive || snake.stun > 0) return null;
    if (snake.nextDirs.length) snake.dir = snake.nextDirs.shift();
    const oldHead = snake.body[0];
    const head = step(oldHead, snake.dir);
    const grows = snake.growPending > 0;
    const body = [head, ...(grows ? snake.body : snake.body.slice(0, -1))];
    return { snake, oldHead, head, grows, body };
  });
  const bodies = state.snakes.map((s, i) => plans[i]?.body ?? s.body);

  /** @type {Map<number, 'wall' | 'self' | 'rival' | 'headOn'>} */
  const deaths = new Map();
  plans.forEach((plan, i) => {
    if (!plan) return;
    if (isBlocked(state.grid, state.walls, plan.head)) {
      deaths.set(i, 'wall');
      return;
    }
    if (bodies[i].slice(1).some((p) => samePos(p, plan.head))) {
      deaths.set(i, 'self');
      return;
    }
    for (let j = 0; j < state.snakes.length; j++) {
      if (j === i || !state.snakes[j].alive) continue;
      const other = plans[j];
      const headOn =
        other &&
        (samePos(other.head, plan.head) ||
          (samePos(other.head, plan.oldHead) && samePos(plan.head, other.oldHead)));
      if (headOn) {
        deaths.set(i, 'headOn');
        return;
      }
      if (bodies[j].some((p) => samePos(p, plan.head))) {
        deaths.set(i, 'rival');
        return;
      }
    }
  });

  for (const plan of plans) {
    if (!plan) continue;
    const cause = deaths.get(plan.snake.id);
    if (cause) {
      plan.snake.alive = false;
      events.push({ type: 'died', snake: plan.snake.id, pos: plan.head, cause });
      continue;
    }
    plan.snake.body = plan.body;
    if (plan.grows) plan.snake.growPending--;
  }

  // Głowa wjeżdżająca w pocisk
  for (const snake of state.snakes) {
    if (!snake.alive) continue;
    const i = state.bullets.findIndex((b) => samePos(b.pos, snake.body[0]));
    if (i < 0) continue;
    const [bullet] = state.bullets.splice(i, 1);
    applyHit(snake, 0, bullet.owner, events);
  }
}

function checkRoundEnd(state, events) {
  const alive = state.snakes.filter((s) => s.alive);
  let result = null;
  if (alive.length < state.snakes.length) {
    result = { winner: alive.length === 1 ? alive[0].id : 'draw', reason: 'ko' };
  } else if (state.timeLeft <= 0) {
    const [a, b] = state.snakes;
    const winner = a.body.length === b.body.length ? 'draw' : a.body.length > b.body.length ? a.id : b.id;
    result = { winner, reason: 'time' };
  }
  if (result) {
    state.result = result;
    events.push({ type: 'roundOver', result });
  }
}
