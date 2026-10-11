// Runda: stan początkowy i jeden krok symulacji.
// Czysta logika: bez DOM, bez czasu systemowego, losowość tylko z RNG w stanie.

import { FOOD_COUNT, GRID_H, GRID_W, MAZE_DENSITY, SNAKE_MOVE_EVERY, START_LENGTH, WALL } from '../config.js';
import { createRng } from '../core/rng.js';
import { fire, moveBullets } from './bullets.js';
import { eatFood, refillFood } from './food.js';
import { cellIndex, passThrough, samePos } from './grid.js';
import { generateMaze, spawnPoints } from './maze.js';
import { applyHit, bounce, createSnake, kill, queueTurn, tickTimers } from './snake.js';

/** @typedef {import('./types.js').RoundState} RoundState */
/** @typedef {import('./types.js').Command} Command */
/** @typedef {import('./types.js').GameEvent} GameEvent */
/** @typedef {import('./types.js').Pos} Pos */
/** @typedef {import('./types.js').Dir} Dir */

/**
 * @param {number} seed
 * @param {{ players?: number, walls?: Uint8Array, foodCount?: number, w?: number, h?: number }} [options]
 * @returns {RoundState}
 */
export function createRound(seed, options = {}) {
  const grid = { w: options.w ?? GRID_W, h: options.h ?? GRID_H };
  const rng = createRng(seed);
  // Labirynt zawsze chroni wszystkie cztery rogi, więc nie zależy od liczby graczy
  const spawns = spawnPoints(grid, START_LENGTH);
  const walls = options.walls ?? generateMaze(grid, rng, spawns, { density: MAZE_DENSITY });
  const players = options.players ?? 2;

  /** @type {RoundState} */
  const state = {
    tick: 0,
    rng,
    grid,
    walls,
    snakes: spawns.slice(0, players).map((s, i) => createSnake(i, s.body, s.dir)),
    bullets: [],
    food: [],
    foodCount: options.foodCount ?? FOOD_COUNT,
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

  // 1. Komendy: skręty (i wyjście z gry online: wąż gracza, który się rozłączył, ginie)
  state.snakes.forEach((snake, i) => {
    if (!snake.alive) return;
    if (commands[i]?.quit) return kill(snake, 'left', null, events);
    for (const dir of commands[i]?.turns ?? []) queueTurn(snake, dir);
  });

  // 2. Timery
  for (const snake of state.snakes) tickTimers(snake);

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
 * potem sprawdzamy przeszkody na podstawie stanu „po ruchu”.
 * - czerwona ściana → śmierć (wall),
 * - zderzenie głowami (to samo pole albo zamiana miejscami) → giną obaj (crash),
 * - głowa w ciało innego węża → ginie ten, kto wjechał (body),
 * - czarna ściana, własne ciało → odbicie (wąż zawraca w miejscu),
 * - krawędź i niebieska ściana → przeniesienie na drugą stronę (`passThrough`).
 * Odbity albo martwy wąż nie zwalnia pola ogona, więc sprawdzamy ponownie, aż nic się nie zmieni.
 */
function moveSnakes(state, events) {
  const { grid, walls } = state;
  const plans = state.snakes.map((snake) => {
    if (!snake.alive) return null;
    const dir = snake.nextDirs.length ? snake.nextDirs[0] : snake.dir;
    const oldHead = snake.body[0];
    const { pos: head, teleported } = passThrough(grid, walls, oldHead, dir);
    const grows = snake.growPending > 0;
    const body = [head, ...(grows ? snake.body : snake.body.slice(0, -1))];
    const cell = walls[cellIndex(grid, head)];
    return { snake, dir, oldHead, head, teleported, grows, body, dies: cell === WALL.DEADLY ? 'wall' : null, bounce: false };
  });
  const moving = (plan) => plan && !plan.bounce && !plan.dies;

  /** Co spotka głowę węża i: null (jedzie dalej), 'bounce' albo przyczyna śmierci. */
  const outcome = (i, bodies) => {
    const plan = plans[i];
    for (let j = 0; j < plans.length; j++) {
      if (j === i || !state.snakes[j].alive) continue;
      const other = plans[j];
      if (moving(other)) {
        if (samePos(other.head, plan.head)) return 'crash';
        if (samePos(other.head, plan.oldHead) && samePos(plan.head, other.oldHead)) return 'crash';
      }
      if (bodies[j].some((p) => samePos(p, plan.head))) return 'body';
    }
    if (walls[cellIndex(grid, plan.head)] !== WALL.NONE) return 'bounce';
    if (bodies[i].slice(1).some((p) => samePos(p, plan.head))) return 'bounce';
    return null;
  };

  for (let changed = true; changed; ) {
    changed = false;
    const bodies = state.snakes.map((s, i) => (moving(plans[i]) ? plans[i].body : s.body));
    // Najpierw wyniki dla wszystkich, potem zmiany: czołówka dotyczy obu węży naraz
    const results = plans.map((plan, i) => (moving(plan) ? outcome(i, bodies) : null));
    results.forEach((result, i) => {
      if (!result) return;
      if (result === 'bounce') plans[i].bounce = true;
      else plans[i].dies = result;
      changed = true;
    });
  }

  for (const plan of plans) {
    if (!plan) continue;
    const { snake } = plan;
    if (plan.dies) {
      // Głowa zostaje tam, gdzie wjechała (w ścianę albo w rywala)
      snake.body = plan.body;
      kill(snake, plan.dies, null, events);
      continue;
    }
    if (plan.bounce) {
      bounce(snake, grid);
      events.push({ type: 'bounced', snake: snake.id, pos: { ...plan.oldHead } });
      continue;
    }
    if (snake.nextDirs.length) snake.nextDirs.shift();
    snake.dir = plan.dir;
    snake.body = plan.body;
    if (plan.grows) snake.growPending--;
    if (plan.teleported) events.push({ type: 'teleported', snake: snake.id, pos: { ...plan.head } });
  }

  // Głowa wjeżdżająca w cudzy pocisk
  for (const snake of state.snakes) {
    if (!snake.alive) continue;
    const i = state.bullets.findIndex((b) => b.owner !== snake.id && samePos(b.pos, snake.body[0]));
    if (i < 0) continue;
    const [bullet] = state.bullets.splice(i, 1);
    applyHit(snake, 0, bullet.owner, events);
  }
}

/**
 * Runda kończy się, gdy zostanie najwyżej jeden żywy wąż. Nikt → remis.
 * Trening (jeden wąż): runda trwa, dopóki wąż żyje.
 */
function checkRoundEnd(state, events) {
  const alive = state.snakes.filter((s) => s.alive);
  if (alive.length > (state.snakes.length > 1 ? 1 : 0)) return;
  const result = { winner: alive.length === 1 ? alive[0].id : 'draw' };
  state.result = result;
  events.push({ type: 'roundOver', result });
}
