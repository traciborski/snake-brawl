import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRound } from '../src/game/round.js';
import { GRID_H, GRID_W, WALL } from '../src/config.js';
import { cleanName } from '../src/scenes/setup.js';
import { place, run, wall } from './helpers.js';

const empty = (players) =>
  createRound(1, { players, walls: new Uint8Array(GRID_W * GRID_H), foodCount: 0 });

test('runda tworzy tyle węży, ilu jest graczy (1–6), każdy w innym miejscu startu', () => {
  for (const n of [1, 2, 3, 4, 5, 6]) {
    const s = createRound(7, { players: n });
    assert.equal(s.snakes.length, n);
    const heads = new Set(s.snakes.map((sn) => `${sn.body[0].x},${sn.body[0].y}`));
    assert.equal(heads.size, n);
  }
});

test('labirynt nie zależy od liczby graczy', () => {
  assert.deepEqual(createRound(7, { players: 2 }).walls, createRound(7, { players: 4 }).walls);
});

test('przy 3 graczach śmierć jednego nie kończy rundy, wygrywa ostatni żywy', () => {
  const s = empty(3);
  place(s, 0, [[10, 10], [9, 10], [8, 10]], 'right');
  place(s, 1, [[30, 20], [31, 20], [32, 20]], 'left');
  place(s, 2, [[20, 5], [19, 5], [18, 5]], 'right');
  wall(s, 11, 10, WALL.DEADLY);
  run(s, 2);
  assert.equal(s.snakes[0].alive, false);
  assert.equal(s.result, null);
  wall(s, 28, 20, WALL.DEADLY); // Hugo jest już na (29,20)
  run(s, 2);
  assert.deepEqual(s.result, { winner: 2 });
});

test('martwy wąż nie blokuje innych ani nie łapie pocisków', () => {
  const s = empty(3);
  place(s, 0, [[10, 10], [9, 10], [8, 10]], 'right');
  place(s, 1, [[30, 20], [31, 20], [32, 20]], 'left');
  place(s, 2, [[14, 12], [14, 13], [14, 14]], 'up');
  s.snakes[1].alive = false;
  place(s, 1, [[14, 10], [14, 9], [14, 8]], 'down');
  s.bullets.push({ owner: 0, pos: { x: 12, y: 10 }, dir: 'right' });
  run(s, 4);
  assert.equal(s.snakes[2].alive, true);
  assert.ok(s.bullets.length === 0 || s.bullets[0].pos.x > 14);
});

test('pocisk każdego gracza trafia pozostałych, ale nie jego samego', () => {
  const s = empty(4);
  place(s, 2, [[10, 10], [9, 10], [8, 10]], 'right');
  place(s, 3, [[16, 10], [17, 10], [18, 10]], 'left');
  const events = run(s, 3, [{}, {}, { shoot: true }, {}]);
  const died = events.find((e) => e.type === 'died');
  assert.deepEqual([died.snake, died.by], [3, 2]);
});

test('imiona: przycięte, bez nadmiarowych spacji, puste zastąpione domyślnym', () => {
  assert.equal(cleanName('  Ala   ma  kota ', 0), 'Ala ma kota');
  assert.equal(cleanName('Bardzo długie imię gracza', 0), 'Bardzo długi');
  assert.equal(cleanName('   ', 1), 'Gracz 2');
});

test('5–6 węży: wolne miejsca startu, więcej owoców, nikt nie ma rywala od razu na muszce', () => {
  for (const seed of [1, 7, 42, 999, 2024, 31337]) {
    const s = createRound(seed, { players: 6 });
    assert.equal(s.food.length, 5);
    for (const snake of s.snakes) {
      for (const p of snake.body) assert.equal(s.walls[p.y * s.grid.w + p.x], 0);
    }
    // Węże na środkach boków patrzą na siebie, ale między nimi zawsze stoi osłona
    const [left, right] = [s.snakes[4], s.snakes[5]];
    const y = left.body[0].y;
    let blocked = false;
    for (let x = left.body[0].x + 1; x < right.body[0].x; x++) if (s.walls[y * s.grid.w + x]) blocked = true;
    assert.ok(blocked, `ziarno ${seed}: brak osłony między środkami boków`);
    // Jadąc prosto, każdy wąż dojeżdża do osłony bez żadnej ściany po drodze
    for (const snake of s.snakes) {
      const dx = snake.dir === 'right' ? 1 : -1;
      let x = snake.body[0].x + dx;
      while (!s.walls[snake.body[0].y * s.grid.w + x]) x += dx;
      assert.equal(s.walls[snake.body[0].y * s.grid.w + x], WALL.BOUNCE, `ziarno ${seed}, wąż ${snake.id}`);
      assert.ok(Math.abs(x - s.grid.w / 2) <= 1, `ziarno ${seed}, wąż ${snake.id}: ściana przed osłoną (x=${x})`);
    }
  }
});
