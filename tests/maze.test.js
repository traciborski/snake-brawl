import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.js';
import { generateMaze, reachable, spawnPoints, symmetric } from '../src/game/maze.js';
import { cellIndex } from '../src/game/grid.js';

const grid = { w: 48, h: 27 };
const spawns = spawnPoints(grid, 3);

test('sześć spawnów: cztery rogi i środki boków są swoimi lustrzanymi odbiciami', () => {
  assert.equal(spawns.length, 6);
  spawns[0].body.forEach((p, i) => {
    const [, mx, my, rot] = symmetric(grid, p);
    assert.deepEqual(rot, spawns[1].body[i]);
    assert.deepEqual(mx, spawns[2].body[i]);
    assert.deepEqual(my, spawns[3].body[i]);
  });
  spawns[4].body.forEach((p, i) => {
    const [, mx, my] = symmetric(grid, p);
    assert.deepEqual(mx, spawns[5].body[i]);
    assert.deepEqual(my, p, 'środek boku leży na osi symetrii');
  });
});

for (const seed of [1, 2, 3, 42, 1234, 99999]) {
  test(`labirynt (ziarno ${seed}) jest symetryczny, spójny i ma wolne spawny`, () => {
    const walls = generateMaze(grid, createRng(seed), spawns);

    let wallCount = 0;
    const kinds = new Set();
    for (let y = 0; y < grid.h; y++) {
      for (let x = 0; x < grid.w; x++) {
        const p = { x, y };
        const w = walls[cellIndex(grid, p)];
        if (w) wallCount++;
        kinds.add(w);
        for (const q of symmetric(grid, p)) assert.equal(w, walls[cellIndex(grid, q)], `asymetria w ${x},${y}`);
      }
    }
    assert.ok(wallCount > 0, 'labirynt nie może być pusty');
    assert.deepEqual([...kinds].sort(), [0, 1, 2, 3], 'są wszystkie trzy rodzaje ścian');
    assert.ok(wallCount < grid.w * grid.h * 0.2, 'za dużo ścian');

    for (const { body } of spawns) {
      for (const p of body) assert.equal(walls[cellIndex(grid, p)], 0);
    }

    const seen = reachable(grid, walls, spawns[0].body[0]);
    for (let i = 0; i < walls.length; i++) {
      assert.ok(walls[i] || seen[i], `pole ${i} jest nieosiągalne`);
    }
  });
}

test('ten sam seed daje ten sam labirynt', () => {
  assert.deepEqual(generateMaze(grid, createRng(5), spawns), generateMaze(grid, createRng(5), spawns));
});
