import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepRound } from '../src/game/round.js';
import { IMMUNITY_TICKS, SHOT_COOLDOWN, STUN_TICKS } from '../src/config.js';
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
  s.snakes[1].stun = 100; // stoi w miejscu
  const events = run(s, 3, FIRE);
  const hit = events.find((e) => e.type === 'bodyHit');
  assert.ok(hit);
  assert.equal(hit.snake, 1);
  assert.equal(hit.by, 0);
  assert.deepEqual(pos(s.snakes[1]), [[14, 6], [14, 7], [14, 8], [14, 9]]);
  assert.equal(s.bullets.length, 0);
});

test('trafienie w głowę ogłusza: wąż stoi i nie strzela', () => {
  const s = emptyRound();
  place(s, 0, [[10, 10], [9, 10], [8, 10]], 'right');
  place(s, 1, [[14, 10], [14, 9], [14, 8], [14, 7]], 'down');
  const events = stepRound(s, FIRE); // pocisk na 12
  events.push(...stepRound(s)); // pocisk 13, Hugo jedzie w dół → (14,11)
  // ustawiamy Hugo tak, żeby głowa stała na torze pocisku
  place(s, 1, [[14, 10], [14, 9], [14, 8], [14, 7]], 'down');
  events.push(...stepRound(s));
  const stun = events.find((e) => e.type === 'stunned');
  assert.ok(stun);
  const hugo = s.snakes[1];
  assert.equal(hugo.stun, STUN_TICKS);

  const before = pos(hugo);
  const shots = run(s, 4, [{}, { shoot: true }]).filter((e) => e.type === 'shot');
  assert.deepEqual(pos(hugo), before);
  assert.equal(shots.length, 0);
});

test('po ogłuszeniu wąż jest odporny przez 1 s, potem znowu można go ogłuszyć', () => {
  const s = emptyRound();
  const hugo = place(s, 1, [[30, 10], [31, 10], [32, 10]], 'left');
  hugo.stun = 1;
  stepRound(s);
  assert.equal(hugo.stun, 0);
  assert.equal(hugo.immunity, IMMUNITY_TICKS);

  // pocisk w głowę w trakcie odporności → odbity
  s.bullets.push({ owner: 0, pos: { x: hugo.body[0].x - 2, y: 10 }, dir: 'right' });
  const events = run(s, 2);
  assert.ok(events.some((e) => e.type === 'deflected'));
  assert.equal(hugo.stun, 0);

  run(s, IMMUNITY_TICKS);
  assert.equal(hugo.immunity, 0);
});

test('wjazd głową w pocisk też ogłusza', () => {
  const s = emptyRound();
  const hugo = place(s, 1, [[20, 10], [21, 10], [22, 10]], 'left');
  // pocisk stoi tuż przed Hugo i leci w tę samą stronę co on, ale znika na ścianie
  wall(s, 18, 10);
  s.bullets.push({ owner: 0, pos: { x: 19, y: 10 }, dir: 'right' });
  // pocisk wlatuje w głowę Hugo w ruchu pocisków
  const events = run(s, 1);
  assert.ok(events.some((e) => e.type === 'stunned' && e.snake === 1));
  assert.equal(hugo.stun, STUN_TICKS);
});

test('pocisk znika na ścianie', () => {
  const s = emptyRound();
  place(s, 0, [[10, 10], [9, 10], [8, 10]], 'right');
  wall(s, 14, 10);
  const events = run(s, 4, FIRE);
  assert.ok(events.some((e) => e.type === 'bulletWall'));
  assert.equal(s.bullets.length, 0);
});

test('pocisk znika na krawędzi planszy', () => {
  const s = emptyRound();
  s.bullets.push({ owner: 0, pos: { x: 0, y: 10 }, dir: 'left' });
  const events = run(s, 1);
  assert.ok(events.some((e) => e.type === 'bulletWall'));
  assert.equal(s.bullets.length, 0);
});

test('dwa pociski lecące na siebie znoszą się (spotkanie i minięcie)', () => {
  for (const gap of [1, 2]) {
    const s = emptyRound();
    s.bullets.push({ owner: 0, pos: { x: 20, y: 15 }, dir: 'right' });
    s.bullets.push({ owner: 1, pos: { x: 20 + gap, y: 15 }, dir: 'left' });
    const events = run(s, 1);
    assert.ok(events.some((e) => e.type === 'bulletClash'), `gap ${gap}`);
    assert.equal(s.bullets.length, 0);
  }
});

test('pocisk trafia także strzelającego', () => {
  const s = emptyRound();
  const leon = place(s, 0, [[10, 10], [9, 10], [8, 10], [7, 10], [6, 10]], 'right');
  // pocisk dogania węża od tyłu i odcina mu ostatni segment
  s.bullets.push({ owner: 0, pos: { x: 3, y: 10 }, dir: 'right' });
  const events = run(s, 4);
  assert.ok(events.some((e) => e.type === 'bodyHit' && e.snake === 0 && e.by === 0));
  assert.equal(leon.body.length, 4);
});

test('pociski przelatują nad owocami', () => {
  const s = emptyRound();
  s.food = [{ x: 21, y: 15 }];
  s.bullets.push({ owner: 0, pos: { x: 20, y: 15 }, dir: 'right' });
  run(s, 2);
  assert.deepEqual(s.food, [{ x: 21, y: 15 }]);
  assert.equal(s.bullets[0].pos.x, 22);
});
