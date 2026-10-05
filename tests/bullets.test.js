import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepRound } from '../src/game/round.js';
import { BULLET_MAX_BOUNCES, SHOT_COOLDOWN } from '../src/config.js';
import { emptyRound, place, pos, run, wall } from './helpers.js';

const FIRE = [{ shoot: true }];

test('strzał kosztuje segment i tworzy pocisk przed głową', () => {
  const s = emptyRound();
  place(s, 0, [[10, 10], [9, 10], [8, 10]], 'right');
  const events = stepRound(s, FIRE);
  assert.ok(events.some((e) => e.type === 'shot'));
  assert.equal(s.snakes[0].body.length, 2);
  // pole przed głową (11) + ruch w tym samym ticku (12)
  assert.deepEqual(s.bullets.map((b) => [b.pos.x, b.pos.y]), [[12, 10]]);
});

test('pocisk leci 1 pole na tick', () => {
  const s = emptyRound();
  place(s, 0, [[10, 10], [9, 10], [8, 10]], 'right');
  stepRound(s, FIRE);
  run(s, 3);
  assert.equal(s.bullets[0].pos.x, 15);
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

test('trafienie w ciało odcina ogon od trafionego segmentu', () => {
  const s = emptyRound();
  place(s, 0, [[10, 10], [9, 10], [8, 10]], 'right');
  place(s, 1, [[14, 6], [14, 7], [14, 8], [14, 9], [14, 10], [14, 11]], 'up');
  const events = run(s, 3, FIRE);
  const hit = events.find((e) => e.type === 'bodyHit');
  assert.ok(hit);
  assert.equal(hit.snake, 1);
  assert.equal(hit.by, 0);
  // Hugo zdążył się przesunąć o 1 pole w górę, pocisk trafił jego ostatni segment
  assert.deepEqual(pos(s.snakes[1]), [[14, 5], [14, 6], [14, 7], [14, 8], [14, 9]]);
  assert.equal(s.snakes[1].alive, true);
  assert.equal(s.bullets.length, 0);
});

test('trafienie w głowę zabija i kończy rundę', () => {
  const s = emptyRound();
  place(s, 0, [[10, 10], [9, 10], [8, 10]], 'right');
  place(s, 1, [[16, 10], [17, 10], [18, 10]], 'left');
  const events = run(s, 4, FIRE);
  const died = events.find((e) => e.type === 'died');
  assert.ok(died);
  assert.equal(died.snake, 1);
  assert.equal(died.by, 0);
  assert.equal(s.snakes[1].alive, false);
  assert.deepEqual(s.result, { winner: 0, reason: 'ko' });
});

test('wjazd głową w pocisk też zabija', () => {
  const s = emptyRound();
  place(s, 1, [[20, 10], [21, 10], [22, 10]], 'left');
  // pocisk stoi w miejscu po odbiciu od ściany na (18,10), Hugo w niego wjeżdża
  wall(s, 18, 10);
  s.bullets.push({ owner: 0, pos: { x: 19, y: 10 }, dir: 'left', bounces: 0 });
  const events = run(s, 2);
  assert.ok(events.some((e) => e.type === 'bulletBounce'));
  assert.ok(events.some((e) => e.type === 'died' && e.snake === 1));
});

test('obaj trafieni w głowę w tym samym ticku: remis', () => {
  const s = emptyRound();
  place(s, 0, [[10, 10], [9, 10], [8, 10]], 'right');
  place(s, 1, [[30, 20], [31, 20], [32, 20]], 'left');
  s.bullets.push({ owner: 1, pos: { x: 12, y: 10 }, dir: 'left', bounces: 0 });
  s.bullets.push({ owner: 0, pos: { x: 28, y: 20 }, dir: 'right', bounces: 0 });
  run(s, 2);
  assert.deepEqual(s.result, { winner: 'draw', reason: 'ko' });
});

test('pocisk odbija się od ściany i wraca', () => {
  const s = emptyRound();
  wall(s, 25, 15);
  s.bullets.push({ owner: 0, pos: { x: 23, y: 15 }, dir: 'right', bounces: 0 });
  const events = run(s, 3);
  // 24 → odbicie (zostaje na 24) → 23
  assert.ok(events.some((e) => e.type === 'bulletBounce'));
  assert.deepEqual(s.bullets[0].pos, { x: 23, y: 15 });
  assert.equal(s.bullets[0].dir, 'left');
  assert.equal(s.bullets[0].bounces, 1);
});

test('krawędź planszy też odbija', () => {
  const s = emptyRound();
  s.bullets.push({ owner: 0, pos: { x: 0, y: 10 }, dir: 'left', bounces: 0 });
  const events = run(s, 2);
  assert.ok(events.some((e) => e.type === 'bulletBounce'));
  assert.deepEqual(s.bullets[0].pos, { x: 1, y: 10 });
});

test(`pocisk odbija się ${BULLET_MAX_BOUNCES} razy, a przy kolejnej ścianie znika`, () => {
  const s = emptyRound();
  // korytarz: ściany na x=20 i x=23, pocisk lata pomiędzy
  wall(s, 20, 15);
  wall(s, 23, 15);
  s.bullets.push({ owner: 0, pos: { x: 21, y: 15 }, dir: 'right', bounces: 0 });
  const events = run(s, 30);
  assert.equal(events.filter((e) => e.type === 'bulletBounce').length, BULLET_MAX_BOUNCES);
  assert.equal(events.filter((e) => e.type === 'bulletWall').length, 1);
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
    s.bullets.push({ owner: 0, pos: { x: 20, y: 15 }, dir: 'right', bounces: 0 });
    s.bullets.push({ owner: 1, pos: { x: 20 + gap, y: 15 }, dir: 'left', bounces: 0 });
    const events = run(s, 1);
    assert.ok(events.some((e) => e.type === 'bulletClash'), `gap ${gap}`);
    assert.equal(s.bullets.length, 0);
  }
});

test('pocisk trafia także strzelającego', () => {
  const s = emptyRound();
  const leon = place(s, 0, [[10, 10], [9, 10], [8, 10], [7, 10], [6, 10]], 'right');
  // pocisk dogania węża od tyłu i odcina mu ostatni segment
  s.bullets.push({ owner: 0, pos: { x: 3, y: 10 }, dir: 'right', bounces: 0 });
  const events = run(s, 4);
  assert.ok(events.some((e) => e.type === 'bodyHit' && e.snake === 0 && e.by === 0));
  assert.equal(leon.body.length, 4);
});

test('pociski przelatują nad owocami', () => {
  const s = emptyRound();
  s.food = [{ x: 21, y: 15 }];
  s.bullets.push({ owner: 0, pos: { x: 20, y: 15 }, dir: 'right', bounces: 0 });
  run(s, 2);
  assert.deepEqual(s.food, [{ x: 21, y: 15 }]);
  assert.equal(s.bullets[0].pos.x, 22);
});
