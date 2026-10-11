import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.js';
import { generateMaze, reachable, spawnPoints } from '../src/game/maze.js';
import { cellIndex, rotate180 } from '../src/game/grid.js';

const grid = { w: 48, h: 27 };
const spawns = spawnPoints(grid, 3);

test('spawny są symetryczne względem środka', () => {
  spawns[0].body.forEach((p, i) => assert.deepEqual(rotate180(grid, p), spawns[1].body[i]));
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
        assert.equal(w, walls[cellIndex(grid, rotate180(grid, p))], `asymetria w ${x},${y}`);
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
