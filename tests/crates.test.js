import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CRATE_AMMO, WALL } from '../src/config.js';
import { collectAmmo, explodeCrate, refillCrate } from '../src/game/crates.js';
import { refillFood } from '../src/game/food.js';
import { addSnake, cloneRound, createRound, stepRound } from '../src/game/round.js';
import { emptyRound, place, wall } from './helpers.js';

const bullet = (x, y, dir = 'right', owner = 0) => ({ owner, pos: { x, y }, dir });

test('runda ma jedną deterministyczną skrzynkę na wolnym polu, poza drogą startową', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const s = createRound(seed, { players: 6 });
    assert.deepEqual(s, createRound(seed, { players: 6 }));
    assert.ok(s.crate);
    assert.equal(s.walls[s.crate.y * s.grid.w + s.crate.x], WALL.NONE);
    assert.ok(!s.food.some((p) => p.x === s.crate.x && p.y === s.crate.y));
    const pos = { ...s.crate };
    const rng = s.rng.state;
    refillCrate(s);
    assert.deepEqual(s.crate, pos);
    assert.equal(s.rng.state, rng);
    for (let i = 0; i < 4; i++) {
      assert.equal(stepRound(s).some((e) => e.type === 'crateExploded'), false);
    }
  }
});

test('pocisk detonuje skrzynkę na pierwszym polu strzału i podczas lotu, także na drugim podkroku', () => {
  for (const mode of ['strzał', 'lot', 'drugi podkrok']) {
    const s = emptyRound();
    s.crate = { x: 15, y: 10 };
    if (mode === 'strzał') place(s, 0, [[14, 10], [13, 10]], 'right');
    else {
      place(s, 0, [[5, 5]], 'right');
      s.bullets.push(bullet(mode === 'lot' ? 14 : 13, 10));
      if (mode === 'drugi podkrok') s.tick = 1;
    }
    const events = stepRound(s, mode === 'strzał' ? [{ shoot: true }] : []);
    assert.equal(events.filter((e) => e.type === 'crateExploded').length, 1, mode);
    assert.deepEqual(s.ammoPickups, [{ x: 15, y: 10 }]);
    assert.equal(s.bullets.length, 0);
    assert.ok(s.crate);
    assert.notDeepEqual(s.crate, { x: 15, y: 10 });
  }
});

test('wybuch niszczy wszystkie rodzaje ścian i obiekty w kwadracie 5×5, ale nic poza nim', () => {
  const s = emptyRound();
  s.crate = { x: 15, y: 10 };
  wall(s, 13, 8, WALL.BOUNCE);
  wall(s, 17, 12, WALL.DEADLY);
  wall(s, 14, 9, WALL.PORTAL);
  wall(s, 18, 10, WALL.BOUNCE);
  s.food = [{ x: 13, y: 12 }, { x: 18, y: 10 }];
  s.ammoPickups = [{ x: 17, y: 8 }, { x: 19, y: 10 }];
  s.bullets = [bullet(15, 11), bullet(18, 10)];
  const events = [];
  explodeCrate(s, 0, events);
  for (const [x, y] of [[13, 8], [17, 12], [14, 9]]) assert.equal(s.walls[y * s.grid.w + x], WALL.NONE);
  assert.equal(s.walls[10 * s.grid.w + 18], WALL.BOUNCE);
  assert.deepEqual(s.food, [{ x: 18, y: 10 }]);
  assert.deepEqual(s.ammoPickups, [{ x: 19, y: 10 }, { x: 15, y: 10 }]);
  assert.deepEqual(s.bullets, [bullet(18, 10)]);
  assert.equal(events[0].cells.length, 25);
});

test('dwa pociski trafiające skrzynkę naraz wywołują jeden wybuch, bez ocalałych pocisków w zasięgu', () => {
  const s = emptyRound();
  s.crate = { x: 15, y: 10 };
  s.bullets = [bullet(14, 10), bullet(16, 10, 'left', 1), bullet(13, 9), bullet(19, 10)];
  const events = stepRound(s);
  assert.equal(events.filter((e) => e.type === 'crateExploded').length, 1);
  assert.deepEqual(s.bullets.map((b) => b.pos), [{ x: 20, y: 10 }]);
  assert.deepEqual(s.ammoPickups, [{ x: 15, y: 10 }]);
});

test('wybuch zabija także strzelającego i rozstrzyga remis', () => {
  const s = emptyRound();
  s.crate = { x: 15, y: 10 };
  place(s, 0, [[14, 10], [13, 10]], 'right');
  place(s, 1, [[17, 12]], 'up');
  const events = stepRound(s, [{ shoot: true }]);
  assert.ok(s.snakes.every((sn) => !sn.alive && sn.death === 'explosion'));
  assert.equal(events.filter((e) => e.type === 'died').length, 2);
  assert.deepEqual(s.result, { winner: 'draw' });
});

test('wybuch odcina ogon od pierwszego trafionego segmentu i nie zabija odległej głowy', () => {
  const s = emptyRound();
  s.crate = { x: 15, y: 10 };
  const snake = place(s, 0, [[19, 10], [18, 10], [17, 10], [16, 10]], 'right');
  const events = [];
  explodeCrate(s, null, events);
  assert.ok(snake.alive);
  assert.deepEqual(snake.body, [{ x: 19, y: 10 }, { x: 18, y: 10 }]);
  assert.equal(events.find((e) => e.type === 'bodyHit').cells.length, 2);
});

test('wjazd głową detonuje skrzynkę i zabija węża; miecz sam nie detonuje', () => {
  const s = emptyRound();
  s.crate = { x: 15, y: 10 };
  place(s, 0, [[14, 10], [13, 10]], 'right');
  assert.ok(!stepRound(s, [{ sword: true }]).some((e) => e.type === 'crateExploded'));
  const events = stepRound(s);
  assert.ok(events.some((e) => e.type === 'crateExploded'));
  assert.equal(s.snakes[0].death, 'explosion');
  assert.deepEqual(s.ammoPickups, [{ x: 15, y: 10 }]);
});

test('wybuch przy krawędzi jest przycięty i nie sięga przeciwnej strony', () => {
  const s = emptyRound();
  s.crate = { x: 0, y: 0 };
  place(s, 0, [[s.grid.w - 1, 0]], 'left');
  wall(s, s.grid.w - 1, 1, WALL.PORTAL);
  const events = [];
  explodeCrate(s, 0, events);
  assert.ok(s.snakes[0].alive);
  assert.equal(s.walls[s.grid.w + s.grid.w - 1], WALL.PORTAL);
  assert.equal(events[0].cells.length, 9);
});

test('zderzenie dwóch głów na skrzynce też detonuje ją, bez podwójnych zdarzeń śmierci', () => {
  const s = emptyRound();
  s.crate = { x: 15, y: 10 };
  place(s, 0, [[14, 10]], 'right');
  place(s, 1, [[16, 10]], 'left');
  s.tick = 1;
  const events = stepRound(s);
  assert.equal(events.filter((e) => e.type === 'crateExploded').length, 1);
  assert.equal(events.filter((e) => e.type === 'died').length, 2);
  assert.deepEqual(s.result, { winner: 'draw' });
});

test('zebranie paczki dodaje 10 strzałów także samej głowie, bez wzrostu i kosztu ogona', () => {
  const s = emptyRound();
  const snake = place(s, 0, [[10, 10]], 'right');
  snake.ammo = 3;
  s.ammoPickups = [{ x: 11, y: 10 }];
  s.tick = 1;
  const events = stepRound(s);
  assert.equal(snake.ammo, 3 + CRATE_AMMO);
  assert.equal(snake.body.length, 1);
  assert.equal(snake.growPending, 0);
  assert.equal(snake.eaten, 0);
  assert.deepEqual(s.ammoPickups, []);
  assert.ok(events.some((e) => e.type === 'ammoCollected'));
  stepRound(s, [{ shoot: true }]);
  assert.equal(snake.ammo, 2 + CRATE_AMMO);
  assert.equal(snake.body.length, 1);
  collectAmmo(s, []);
  assert.equal(snake.ammo, 2 + CRATE_AMMO);
});

test('brak miejsca wstrzymuje nową skrzynkę, a owoce nie zajmują skrzynki ani paczek', () => {
  const s = emptyRound();
  s.crate = null;
  s.walls.fill(WALL.BOUNCE);
  refillCrate(s);
  assert.equal(s.crate, null);
  wall(s, 20, 15, WALL.NONE);
  s.ammoPickups = [{ x: 20, y: 15 }];
  refillCrate(s);
  assert.equal(s.crate, null);
  s.ammoPickups = [];
  refillCrate(s);
  assert.deepEqual(s.crate, { x: 20, y: 15 });
  wall(s, 21, 15, WALL.NONE);
  s.ammoPickups = [{ x: 21, y: 15 }];
  s.foodCount = 3;
  refillFood(s);
  assert.deepEqual(s.food, []);
});

test('wybuch w przewidywaniu nie zmienia ścian, skrzynki, paczek ani RNG stanu potwierdzonego', () => {
  const s = emptyRound();
  s.crate = { x: 15, y: 10 };
  s.bullets = [bullet(14, 10)];
  s.ammoPickups = [{ x: 14, y: 11 }];
  wall(s, 17, 12, WALL.PORTAL);
  const before = structuredClone(s);
  const a = cloneRound(s);
  const b = cloneRound(s);
  assert.deepEqual(stepRound(a), stepRound(b));
  assert.deepEqual(a, b);
  assert.deepEqual(s, before);
  assert.notEqual(a.walls, s.walls);
  assert.equal(a.walls[12 * s.grid.w + 17], WALL.NONE);
  assert.equal(s.walls[12 * s.grid.w + 17], WALL.PORTAL);
});

test('dołączający wąż omija miejsce startu ze skrzynką', () => {
  const s = emptyRound({ players: 1 });
  const reference = emptyRound();
  s.crate = { ...reference.snakes[1].body[0] };
  addSnake(s, 1);
  assert.notDeepEqual(s.snakes[1].body[0], s.crate);
});
