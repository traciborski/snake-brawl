import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CRATE_AMMO, CRATE_AMMO_COUNT, CRATE_COUNT, WALL } from '../src/config.js';
import { crateAt, collectAmmo, explodeCrate, refillCrates } from '../src/game/crates.js';
import { refillFood } from '../src/game/food.js';
import { addSnake, cloneRound, createRound, stepRound } from '../src/game/round.js';
import { emptyRound, place, wall } from './helpers.js';

const bullet = (x, y, dir = 'right', owner = 0) => ({ owner, pos: { x, y }, dir });

function placeCrate(state, x, y, kind = 'ammo') {
  state.crates.forEach((crate) => { crate.pos = null; });
  const crate = state.crates.find((item) => item.kind === kind);
  crate.pos = { x, y };
  return crate;
}

test('runda ma 4 deterministyczne skrzynki: 2 zwykłe i 2 fałszywe', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const s = createRound(seed, { players: 6 });
    assert.deepEqual(s, createRound(seed, { players: 6 }));
    assert.equal(s.crates.length, CRATE_COUNT);
    assert.equal(s.crates.filter((c) => c.kind === 'ammo').length, CRATE_AMMO_COUNT);
    assert.equal(s.crates.filter((c) => c.kind === 'fake').length, CRATE_COUNT - CRATE_AMMO_COUNT);
    const positions = s.crates.map((c) => c.pos);
    assert.ok(positions.every(Boolean));
    assert.equal(new Set(positions.map((p) => `${p.x},${p.y}`)).size, CRATE_COUNT);
    for (const { pos } of s.crates) {
      assert.equal(s.walls[pos.y * s.grid.w + pos.x], WALL.NONE);
      assert.ok(!s.food.some((p) => p.x === pos.x && p.y === pos.y));
    }
    const rng = s.rng.state;
    refillCrates(s);
    assert.deepEqual(s.crates.map((c) => c.pos), positions);
    assert.equal(s.rng.state, rng);
    for (let i = 0; i < 4; i++) {
      assert.equal(stepRound(s).some((e) => e.type === 'crateExploded'), false);
    }
  }
});

test('pocisk detonuje zwykłą skrzynkę na pierwszym polu i podczas lotu', () => {
  for (const mode of ['strzał', 'lot', 'drugi podkrok']) {
    const s = emptyRound();
    const crate = placeCrate(s, 15, 10);
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
    assert.ok(crate.pos);
    assert.notDeepEqual(crate.pos, { x: 15, y: 10 });
  }
});

test('fałszywa skrzynka wybucha, ale nie zostawia amunicji', () => {
  const s = emptyRound();
  placeCrate(s, 15, 10, 'fake');
  s.bullets.push(bullet(14, 10));
  const events = stepRound(s);
  assert.ok(events.some((e) => e.type === 'crateExploded' && e.kind === 'fake'));
  assert.deepEqual(s.ammoPickups, []);
});

test('wybuch niszczy ściany i obiekty w kwadracie 5×5, ale nic poza nim', () => {
  const s = emptyRound();
  const crate = placeCrate(s, 15, 10);
  wall(s, 13, 8, WALL.BOUNCE);
  wall(s, 17, 12, WALL.DEADLY);
  wall(s, 14, 9, WALL.PORTAL);
  wall(s, 18, 10, WALL.BOUNCE);
  s.food = [{ x: 13, y: 12 }, { x: 18, y: 10 }];
  s.ammoPickups = [{ x: 17, y: 8 }, { x: 19, y: 10 }];
  s.bullets = [bullet(15, 11), bullet(18, 10)];
  const events = [];
  explodeCrate(s, 0, events, crate);
  for (const [x, y] of [[13, 8], [17, 12], [14, 9]]) assert.equal(s.walls[y * s.grid.w + x], WALL.NONE);
  assert.equal(s.walls[10 * s.grid.w + 18], WALL.BOUNCE);
  assert.deepEqual(s.food, [{ x: 18, y: 10 }]);
  assert.deepEqual(s.ammoPickups, [{ x: 19, y: 10 }, { x: 15, y: 10 }]);
  assert.deepEqual(s.bullets, [bullet(18, 10)]);
  assert.equal(events[0].cells.length, 25);
});

test('dwa pociski trafiające skrzynkę naraz wywołują jeden wybuch', () => {
  const s = emptyRound();
  placeCrate(s, 15, 10);
  s.bullets = [bullet(14, 10), bullet(16, 10, 'left', 1), bullet(13, 9), bullet(19, 10)];
  const events = stepRound(s);
  assert.equal(events.filter((e) => e.type === 'crateExploded').length, 1);
  assert.deepEqual(s.bullets.map((b) => b.pos), [{ x: 20, y: 10 }]);
  assert.deepEqual(s.ammoPickups, [{ x: 15, y: 10 }]);
});

test('wybuch zabija także strzelającego i rozstrzyga remis', () => {
  const s = emptyRound();
  placeCrate(s, 15, 10);
  place(s, 0, [[14, 10], [13, 10]], 'right');
  place(s, 1, [[17, 12]], 'up');
  const events = stepRound(s, [{ shoot: true }]);
  assert.ok(s.snakes.every((sn) => !sn.alive && sn.death === 'explosion'));
  assert.equal(events.filter((e) => e.type === 'died').length, 2);
  assert.deepEqual(s.result, { winner: 'draw' });
});

test('wybuch odcina ogon od pierwszego trafionego segmentu i nie zabija odległej głowy', () => {
  const s = emptyRound();
  const crate = placeCrate(s, 15, 10);
  const snake = place(s, 0, [[19, 10], [18, 10], [17, 10], [16, 10]], 'right');
  const events = [];
  explodeCrate(s, null, events, crate);
  assert.ok(snake.alive);
  assert.deepEqual(snake.body, [{ x: 19, y: 10 }, { x: 18, y: 10 }]);
  assert.equal(events.find((e) => e.type === 'bodyHit').cells.length, 2);
});

test('wjazd głową detonuje skrzynkę, miecz sam jej nie niszczy', () => {
  const s = emptyRound();
  placeCrate(s, 15, 10);
  place(s, 0, [[14, 10], [13, 10]], 'right');
  assert.ok(!stepRound(s, [{ sword: true }]).some((e) => e.type === 'crateExploded'));
  const events = stepRound(s);
  assert.ok(events.some((e) => e.type === 'crateExploded'));
  assert.equal(s.snakes[0].death, 'explosion');
  assert.deepEqual(s.ammoPickups, [{ x: 15, y: 10 }]);
});

test('wybuch przy krawędzi jest przycięty i nie sięga przeciwnej strony', () => {
  const s = emptyRound();
  const crate = placeCrate(s, 0, 0);
  place(s, 0, [[s.grid.w - 1, 0]], 'left');
  wall(s, s.grid.w - 1, 1, WALL.PORTAL);
  const events = [];
  explodeCrate(s, 0, events, crate);
  assert.ok(s.snakes[0].alive);
  assert.equal(s.walls[s.grid.w + s.grid.w - 1], WALL.PORTAL);
  assert.equal(events[0].cells.length, 9);
});

test('zderzenie dwóch głów na skrzynce też detonuje ją bez podwójnych zdarzeń śmierci', () => {
  const s = emptyRound();
  placeCrate(s, 15, 10);
  place(s, 0, [[14, 10]], 'right');
  place(s, 1, [[16, 10]], 'left');
  s.tick = 1;
  const events = stepRound(s);
  assert.equal(events.filter((e) => e.type === 'crateExploded').length, 1);
  assert.equal(events.filter((e) => e.type === 'died').length, 2);
  assert.deepEqual(s.result, { winner: 'draw' });
});

test('zebranie paczki dodaje 10 strzałów także samej głowie', () => {
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

test('brak miejsca wstrzymuje odradzanie, a owoce i paczki nie zajmują miejsca skrzynki', () => {
  const s = emptyRound();
  s.crates.forEach((crate) => { crate.pos = null; });
  s.walls.fill(WALL.BOUNCE);
  refillCrates(s);
  assert.equal(s.crates.filter((c) => c.pos).length, 0);
  wall(s, 20, 15, WALL.NONE);
  s.ammoPickups = [{ x: 20, y: 15 }];
  refillCrates(s);
  assert.equal(s.crates.filter((c) => c.pos).length, 0);
  s.ammoPickups = [];
  refillCrates(s);
  assert.equal(s.crates.filter((c) => c.pos).length, 1);
  assert.deepEqual(s.crates.find((c) => c.pos).pos, { x: 20, y: 15 });
  wall(s, 21, 15, WALL.NONE);
  s.ammoPickups = [{ x: 21, y: 15 }];
  s.foodCount = 3;
  refillFood(s);
  assert.deepEqual(s.food, []);
});

test('wybuch w przewidywaniu nie zmienia ścian, skrzynek, paczek ani RNG stanu potwierdzonego', () => {
  const s = emptyRound();
  placeCrate(s, 15, 10);
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
  assert.notEqual(a.crates[0], s.crates[0]);
});

test('dołączający wąż omija miejsce startu ze skrzynką', () => {
  const s = emptyRound({ players: 1 });
  const reference = emptyRound();
  const spawn = reference.snakes[1].body[0];
  const crate = placeCrate(s, spawn.x, spawn.y);
  addSnake(s, 1);
  assert.notDeepEqual(s.snakes[1].body[0], crate.pos);
  assert.ok(crateAt(s, spawn));
});
