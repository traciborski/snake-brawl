import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepRound } from '../src/game/round.js';
import { emptyRound, place, pos, run, wall } from './helpers.js';

test('wąż rusza się o 1 pole co 2 ticki', () => {
  const s = emptyRound();
  place(s, 0, [[10, 10], [9, 10], [8, 10]], 'right');
  stepRound(s);
  assert.deepEqual(pos(s.snakes[0])[0], [10, 10]);
  stepRound(s);
  assert.deepEqual(pos(s.snakes[0]), [[11, 10], [10, 10], [9, 10]]);
});

test('zawracanie jest ignorowane', () => {
  const s = emptyRound();
  place(s, 0, [[10, 10], [9, 10], [8, 10]], 'right');
  run(s, 2, [{ turns: ['left'] }]);
  assert.deepEqual(pos(s.snakes[0])[0], [11, 10]);
  assert.ok(s.snakes[0].alive);
});

test('dwa szybkie skręty między ruchami nie giną (kolejka)', () => {
  const s = emptyRound();
  place(s, 0, [[10, 10], [9, 10], [8, 10]], 'right');
  // góra, a zaraz potem lewo: łącznie zawrotka w dwóch ruchach
  run(s, 4, [{ turns: ['up', 'left'] }]);
  assert.deepEqual(pos(s.snakes[0])[0], [9, 9]);
});

test('kolejka mieści maksymalnie 2 skręty', () => {
  const s = emptyRound();
  const snake = place(s, 0, [[10, 10], [9, 10], [8, 10]], 'right');
  stepRound(s, [{ turns: ['up', 'left', 'down'] }]);
  assert.deepEqual(snake.nextDirs, ['up', 'left']);
});

test('zjedzenie owocu wydłuża węża o 1', () => {
  const s = emptyRound();
  place(s, 0, [[10, 10], [9, 10], [8, 10]], 'right');
  s.food = [{ x: 11, y: 10 }];
  const events = run(s, 2);
  assert.ok(events.some((e) => e.type === 'ate' && e.snake === 0));
  assert.equal(s.food.length, 0);
  run(s, 2);
  assert.equal(s.snakes[0].body.length, 4);
});

test('owoce uzupełniają się do limitu na wolnych polach', () => {
  const s = emptyRound({ foodCount: 3 });
  assert.equal(s.food.length, 3);
  s.food.pop();
  stepRound(s);
  assert.equal(s.food.length, 3);
  for (const f of s.food) {
    for (const snake of s.snakes) assert.ok(!snake.body.some((p) => p.x === f.x && p.y === f.y));
  }
});

test('śmierć na ścianie', () => {
  const s = emptyRound();
  place(s, 0, [[10, 10], [9, 10], [8, 10]], 'right');
  wall(s, 11, 10);
  const events = run(s, 2);
  assert.equal(s.snakes[0].alive, false);
  assert.ok(events.some((e) => e.type === 'died' && e.cause === 'wall'));
  assert.deepEqual(s.result, { winner: 1, reason: 'ko' });
});

test('śmierć na krawędzi planszy', () => {
  const s = emptyRound();
  place(s, 0, [[0, 5], [1, 5], [2, 5]], 'left');
  run(s, 2);
  assert.equal(s.snakes[0].alive, false);
});

test('śmierć na własnym ciele', () => {
  const s = emptyRound();
  // wąż zawinięty w „U”: skręt w prawo wjeżdża w jego własny środek
  place(s, 0, [[10, 10], [10, 9], [11, 9], [11, 10], [11, 11]], 'down');
  const events = run(s, 2, [{ turns: ['right'] }]);
  assert.equal(s.snakes[0].alive, false);
  assert.ok(events.some((e) => e.type === 'died' && e.cause === 'self'));
});

test('wjazd w pole, które ogon właśnie opuszcza, jest bezpieczny', () => {
  const s = emptyRound();
  place(s, 0, [[10, 10], [10, 11], [11, 11], [11, 10]], 'up');
  run(s, 2, [{ turns: ['right'] }]);
  assert.equal(s.snakes[0].alive, true);
  assert.deepEqual(pos(s.snakes[0])[0], [11, 10]);
});

test('wjazd w ciało rywala zabija', () => {
  const s = emptyRound();
  place(s, 0, [[10, 10], [9, 10], [8, 10]], 'right');
  place(s, 1, [[11, 12], [11, 11], [11, 10], [11, 9]], 'down');
  run(s, 2);
  assert.equal(s.snakes[0].alive, false);
  assert.equal(s.snakes[1].alive, true);
  assert.deepEqual(s.result, { winner: 1, reason: 'ko' });
});

test('zderzenie głowami na tym samym polu: remis', () => {
  const s = emptyRound();
  place(s, 0, [[10, 10], [9, 10], [8, 10]], 'right');
  place(s, 1, [[12, 10], [13, 10], [14, 10]], 'left');
  const events = run(s, 2);
  assert.equal(s.snakes[0].alive, false);
  assert.equal(s.snakes[1].alive, false);
  assert.ok(events.every((e) => e.type !== 'died' || e.cause === 'headOn'));
  assert.deepEqual(s.result, { winner: 'draw', reason: 'ko' });
});

test('zderzenie głowami przy zamianie miejsc: remis', () => {
  const s = emptyRound();
  place(s, 0, [[10, 10], [9, 10], [8, 10]], 'right');
  place(s, 1, [[11, 10], [12, 10], [13, 10]], 'left');
  run(s, 2);
  assert.deepEqual(s.result, { winner: 'draw', reason: 'ko' });
});

test('po upływie czasu wygrywa dłuższy wąż', () => {
  const s = emptyRound();
  place(s, 0, [[10, 5], [9, 5], [8, 5], [7, 5]], 'right');
  place(s, 1, [[30, 20], [31, 20], [32, 20]], 'left');
  s.timeLeft = 1;
  stepRound(s);
  assert.deepEqual(s.result, { winner: 0, reason: 'time' });
});

test('po upływie czasu przy równych długościach jest remis', () => {
  const s = emptyRound();
  s.timeLeft = 1;
  stepRound(s);
  assert.deepEqual(s.result, { winner: 'draw', reason: 'time' });
});

test('po końcu rundy symulacja stoi', () => {
  const s = emptyRound();
  s.timeLeft = 1;
  stepRound(s);
  const tick = s.tick;
  assert.deepEqual(stepRound(s), []);
  assert.equal(s.tick, tick);
});
