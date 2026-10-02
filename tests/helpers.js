import { createRound, stepRound } from '../src/game/round.js';
import { GRID_H, GRID_W } from '../src/config.js';

/** Pusta plansza bez ścian i bez jedzenia: idealna do testów reguł. */
export function emptyRound(options = {}) {
  return createRound(1, { walls: new Uint8Array(GRID_W * GRID_H), foodCount: 0, ...options });
}

/** Ustawia węża: body jako lista [x, y], głowa pierwsza. */
export function place(state, id, cells, dir) {
  const s = state.snakes[id];
  s.body = cells.map(([x, y]) => ({ x, y }));
  s.dir = dir;
  s.nextDirs = [];
  return s;
}

export function wall(state, x, y) {
  state.walls[y * state.grid.w + x] = 1;
}

/** Wykonuje n ticków z tymi samymi komendami (tylko pierwszy tick dostaje komendy). */
export function run(state, n, commands = []) {
  const events = [];
  for (let i = 0; i < n; i++) events.push(...stepRound(state, i === 0 ? commands : []));
  return events;
}

export const pos = (s) => s.body.map((p) => [p.x, p.y]);
