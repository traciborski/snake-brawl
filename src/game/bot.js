// Prosty bot offline: wybiera bezpieczny ruch, zbiera owoce i atakuje, gdy ma okazję.

import { BULLET_RANGE, CRATE_RADIUS, SWORD_RADIUS, WALL } from '../config.js';
import { createRng, randInt } from '../core/rng.js';
import { cellIndex, OPPOSITE, passThrough, samePos } from './grid.js';

const DIRECTIONS = ['up', 'down', 'left', 'right'];

/**
 * Komenda bota dla jednego ticka. Wybór jest deterministyczny, więc testy i rewanże
 * z tym samym stanem dają ten sam ruch.
 * @param {import('./types.js').RoundState} state
 * @param {number} id
 * @param {'easy' | 'medium' | 'hard'} difficulty
 * @returns {import('./types.js').Command}
 */
export function chooseBotCommand(state, id, difficulty = 'medium') {
  const snake = state.snakes[id];
  if (!snake?.alive) return {};

  const heading = snake.nextDirs.at(-1) ?? snake.dir;
  const directions = [heading, ...DIRECTIONS.filter((dir) => dir !== heading && dir !== OPPOSITE[heading])];
  const options = directions.map((dir) => {
    const { pos } = passThrough(state.grid, state.walls, snake.body[0], dir);
    const blocked = isDangerous(state, snake, pos);
    return { dir, pos, blocked, score: scoreDirection(state, snake, dir, pos, difficulty) };
  });
  const safe = options.filter((option) => !option.blocked);
  const choices = safe.length ? safe : options;
  const best = difficulty === 'easy'
    ? choices[randInt(botRng(state, id), choices.length)]
    : chooseBest(choices, state, id);

  const turns = snake.nextDirs.length === 0 && best.dir !== snake.dir ? [best.dir] : [];
  return {
    turns,
    shoot: shouldShoot(state, snake, difficulty),
    sword: shouldSwing(state, snake, difficulty),
  };
}

function isDangerous(state, snake, pos) {
  if (state.walls[cellIndex(state.grid, pos)] === WALL.DEADLY) return true;
  if (state.crates.some((crate) => crate.pos && samePos(crate.pos, pos))) return true;
  if (state.bullets.some((bullet) => bullet.owner !== snake.id && samePos(bullet.pos, pos))) return true;
  for (const other of state.snakes) {
    if (!other.alive) continue;
    const bodyLength = other.body.length - (other.growPending ? 0 : 1);
    if (other.body.slice(0, bodyLength).some((part) => samePos(part, pos))) return true;
  }
  return false;
}

function scoreDirection(state, snake, dir, pos, difficulty) {
  let score = countExits(state, snake, pos) * (difficulty === 'hard' ? 3 : 1);
  const distances = state.food.map((food) => distance(state.grid, pos, food));
  if (distances.length) score -= Math.min(...distances) * (difficulty === 'hard' ? 0.8 : 1.2);
  if (state.walls[cellIndex(state.grid, pos)] === WALL.BOUNCE) score -= 4;
  if (dir !== snake.dir) score -= 0.5;
  return score;
}

function countExits(state, snake, pos) {
  return DIRECTIONS.filter((dir) => dir !== OPPOSITE[snake.dir] && !isDangerous(state, snake, passThrough(state.grid, state.walls, pos, dir).pos)).length;
}

function distance(grid, a, b) {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return Math.min(dx, grid.w - dx) + Math.min(dy, grid.h - dy);
}

function chooseBest(choices, state, id) {
  const bestScore = Math.max(...choices.map((option) => option.score));
  const best = choices.filter((option) => option.score === bestScore);
  return best[randInt(botRng(state, id), best.length)];
}

function botRng(state, id) {
  const seed = (state.rng.state ^ Math.imul(state.tick + 1, 0x9e3779b9) ^ Math.imul(id + 1, 0x85ebca6b)) >>> 0;
  return createRng(seed);
}

function shouldShoot(state, snake, difficulty) {
  if (difficulty === 'easy' || snake.cooldown > 0 || (snake.ammo === 0 && snake.body.length <= 1)) return false;
  const range = difficulty === 'hard' ? BULLET_RANGE : 8;
  let pos = snake.body[0];
  let dir = snake.dir;
  for (let i = 0; i < range; i++) {
    const move = passThrough(state.grid, state.walls, pos, dir);
    const wall = state.walls[cellIndex(state.grid, move.pos)];
    if (wall === WALL.DEADLY) return false;
    if (wall === WALL.BOUNCE) {
      dir = OPPOSITE[dir];
      continue;
    }
    pos = move.pos;
    const hit = state.snakes.some((other) =>
      other.alive && other.id !== snake.id && other.body.some((part) => samePos(part, pos)),
    );
    if (hit) return true;
  }
  return false;
}

function shouldSwing(state, snake, difficulty) {
  if (snake.swordCooldown > 0 || snake.swordTicks > 0) return false;
  const range = difficulty === 'easy' ? 1 : SWORD_RADIUS;
  return state.snakes.some((other) => {
    if (!other.alive || other.id === snake.id) return false;
    const dx = Math.min(Math.abs(other.body[0].x - snake.body[0].x), state.grid.w - Math.abs(other.body[0].x - snake.body[0].x));
    const dy = Math.min(Math.abs(other.body[0].y - snake.body[0].y), state.grid.h - Math.abs(other.body[0].y - snake.body[0].y));
    return dx * dx + dy * dy <= range * range;
  });
}
