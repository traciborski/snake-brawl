import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepRound } from '../src/game/round.js';
import { bulletStepsAt } from '../src/game/bullets.js';
import { SHOT_COOLDOWN, WALL } from '../src/config.js';
import { emptyRound, place, pos, run, wall } from './helpers.js';

const FIRE = [{ shoot: true }];
const bullet = (owner, x, y, dir) => ({ owner, pos: { x, y }, dir });

test('strzał kosztuje segment i tworzy pocisk przed głową', () => {
  const s = emptyRound();
  place(s, 0, [[10, 10], [9, 10], [8, 10]], 'right');
  const events = stepRound(s, FIRE);
  assert.ok(events.some((e) => e.type === 'shot'));
  assert.equal(s.snakes[0].body.length, 2);
  // pole przed głową (11) + 1 pole lotu w pierwszym ticku (12)
  assert.deepEqual(s.bullets.map((b) => [b.pos.x, b.pos.y]), [[12, 10]]);
});

test('pocisk leci 3 pola na 2 ticki (3× szybciej niż wąż)', () => {
  assert.deepEqual([1, 2, 3, 4].map(bulletStepsAt), [1, 2, 1, 2]);
  const s = emptyRound();
  s.bullets.push(bullet(0, 10, 15, 'right'));
  run(s, 4);
  assert.equal(s.bullets[0].pos.x, 16);
});

test('z samą głową nie da się strzelić', () => {
  const s = emptyRound();
  place(s, 0, [[10, 10]], 'right');
  const events = stepRound(s, FIRE);
  assert.equal(events.length, 0);
  assert.equal(s.bullets.length, 0);
});

test('cooldown blokuje kolejny strzał przez 0,3 s', () => {
  const s = emptyRound();
  place(s, 0, [[10, 10], [9, 10], [8, 10], [7, 10], [6, 10]], 'right');
  let shots = 0;
  for (let i = 0; i <= SHOT_COOLDOWN; i++) {
    shots += stepRound(s, FIRE).filter((e) => e.type === 'shot').length;
  }
  assert.equal(shots, 2); // tick 0 i tick SHOT_COOLDOWN
});

test('trafienie w ogon rywala odcina mu ogon od trafionego segmentu', () => {
  const s = emptyRound();
  place(s, 1, [[14, 6], [14, 7], [14, 8], [14, 9], [14, 10], [14, 11]], 'up');
  s.bullets.push(bullet(0, 12, 10, 'right'));
  const events = run(s, 2);
  const hit = events.find((e) => e.type === 'bodyHit');
  assert.ok(hit);
  assert.equal(hit.snake, 1);
  assert.equal(hit.by, 0);
  // pocisk trafił w (14,10) jeszcze przed ruchem Hugo, potem Hugo pojechał w górę
  assert.deepEqual(pos(s.snakes[1]), [[14, 5], [14, 6], [14, 7], [14, 8]]);
  assert.equal(s.snakes[1].alive, true);
  assert.equal(s.bullets.length, 0);
});

test('trafienie w głowę rywala wygrywa rundę', () => {
  const s = emptyRound();
  place(s, 0, [[10, 10], [9, 10], [8, 10]], 'right');
  place(s, 1, [[16, 10], [17, 10], [18, 10]], 'left');
  const events = run(s, 3, FIRE);
  const died = events.find((e) => e.type === 'died');
  assert.ok(died);
  assert.deepEqual([died.snake, died.by, died.cause], [1, 0, 'shot']);
  assert.equal(s.snakes[1].death, 'shot');
  assert.deepEqual(s.result, { winner: 0 });
});

test('pocisk lecący na głowę z naprzeciwka zabija', () => {
  const s = emptyRound();
  place(s, 1, [[20, 10], [21, 10], [22, 10]], 'left');
  s.bullets.push(bullet(0, 17, 10, 'right'));
  const events = run(s, 2);
  assert.ok(events.some((e) => e.type === 'died' && e.snake === 1));
});

test('własne pociski przelatują przez strzelającego bez śladu', () => {
  const s = emptyRound();
  const leon = place(s, 0, [[10, 10], [9, 10], [8, 10], [7, 10], [6, 10]], 'right');
  // od tyłu przez całe ciało
  s.bullets.push(bullet(0, 3, 10, 'right'));
  // prosto w głowę
  s.bullets.push(bullet(0, 14, 10, 'left'));
  const events = run(s, 6);
  assert.ok(!events.some((e) => e.type === 'bodyHit' || e.type === 'died'));
  assert.equal(leon.body.length, 5);
  assert.equal(leon.alive, true);
});

test('obaj trafieni w głowę w tym samym ticku: remis', () => {
  const s = emptyRound();
  place(s, 0, [[10, 10], [9, 10], [8, 10]], 'right');
  place(s, 1, [[30, 20], [31, 20], [32, 20]], 'left');
  s.bullets.push(bullet(1, 12, 10, 'left'));
  s.bullets.push(bullet(0, 28, 20, 'right'));
  run(s, 2);
  assert.deepEqual(s.result, { winner: 'draw' });
});

for (const [name, kind] of [['czarnej', WALL.BOUNCE], ['czerwonej', WALL.DEADLY], ['niebieskiej', WALL.PORTAL]]) {
  test(`pocisk znika na ${name} ścianie`, () => {
    const s = emptyRound();
    wall(s, 22, 15, kind);
    s.bullets.push(bullet(0, 20, 15, 'right'));
    const events = run(s, 2);
    assert.ok(events.some((e) => e.type === 'bulletWall'));
    assert.equal(s.bullets.length, 0);
  });
}

test('pocisk znika na krawędzi planszy', () => {
  const s = emptyRound();
  s.bullets.push(bullet(0, 0, 10, 'left'));
  const events = run(s, 1);
  assert.ok(events.some((e) => e.type === 'bulletWall'));
  assert.equal(s.bullets.length, 0);
});

test('strzał prosto w przyległą ścianę od razu gaśnie', () => {
  const s = emptyRound();
  const leon = place(s, 0, [[10, 10], [9, 10], [8, 10]], 'right');
  wall(s, 11, 10);
  const events = stepRound(s, FIRE);
  assert.ok(events.some((e) => e.type === 'bulletWall'));
  assert.equal(s.bullets.length, 0);
  assert.equal(leon.body.length, 2);
});

test('dwa pociski lecące na siebie znoszą się (spotkanie i minięcie)', () => {
  for (const gap of [1, 2]) {
    const s = emptyRound();
    s.bullets.push(bullet(0, 20, 15, 'right'));
    s.bullets.push(bullet(1, 20 + gap, 15, 'left'));
    const events = run(s, 1);
    assert.ok(events.some((e) => e.type === 'bulletClash'), `gap ${gap}`);
    assert.equal(s.bullets.length, 0);
  }
});

test('pociski przelatują nad owocami', () => {
  const s = emptyRound();
  s.food = [{ x: 21, y: 15 }];
  s.bullets.push(bullet(0, 20, 15, 'right'));
  run(s, 2);
  assert.deepEqual(s.food, [{ x: 21, y: 15 }]);
  assert.equal(s.bullets[0].pos.x, 23);
});
