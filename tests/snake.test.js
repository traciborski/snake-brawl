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

const bounced = (events, id) => events.some((e) => e.type === 'bounced' && e.snake === id);

test('ściana odbija: wąż zawraca (ogon staje się głową) i żyje', () => {
  const s = emptyRound();
  place(s, 0, [[10, 10], [9, 10], [8, 10]], 'right');
  wall(s, 11, 10);
  const events = run(s, 2);
  assert.ok(bounced(events, 0));
  assert.equal(s.snakes[0].alive, true);
  assert.deepEqual(pos(s.snakes[0]), [[8, 10], [9, 10], [10, 10]]);
  assert.equal(s.snakes[0].dir, 'left');
  assert.equal(s.result, null);
  run(s, 2);
  assert.deepEqual(pos(s.snakes[0])[0], [7, 10]);
});

test('krawędź planszy odbija', () => {
  const s = emptyRound();
  place(s, 0, [[0, 5], [1, 5], [2, 5]], 'left');
  const events = run(s, 2);
  assert.ok(bounced(events, 0));
  assert.equal(s.snakes[0].alive, true);
  assert.equal(s.snakes[0].dir, 'right');
});

test('wąż z samą głową odbija się, zmieniając kierunek', () => {
  const s = emptyRound();
  place(s, 0, [[0, 5]], 'left');
  run(s, 2);
  assert.deepEqual(pos(s.snakes[0]), [[0, 5]]);
  assert.equal(s.snakes[0].dir, 'right');
});

test('odbicie kasuje zakolejkowane skręty', () => {
  const s = emptyRound();
  const snake = place(s, 0, [[10, 10], [9, 10], [8, 10]], 'right');
  wall(s, 11, 10);
  wall(s, 10, 9);
  // skręt w górę też trafia w ścianę
  run(s, 2, [{ turns: ['up', 'right'] }]);
  assert.deepEqual(snake.nextDirs, []);
});

test('własne ciało odbija', () => {
  const s = emptyRound();
  // wąż zawinięty w „U”: skręt w prawo wjeżdża w jego własny środek
  place(s, 0, [[10, 10], [10, 9], [11, 9], [11, 10], [11, 11]], 'down');
  const events = run(s, 2, [{ turns: ['right'] }]);
  assert.ok(bounced(events, 0));
  assert.equal(s.snakes[0].alive, true);
});

test('wjazd w pole, które ogon właśnie opuszcza, jest dozwolony', () => {
  const s = emptyRound();
  place(s, 0, [[10, 10], [10, 11], [11, 11], [11, 10]], 'up');
  const events = run(s, 2, [{ turns: ['right'] }]);
  assert.ok(!bounced(events, 0));
  assert.deepEqual(pos(s.snakes[0])[0], [11, 10]);
});

test('ciało rywala odbija, rywal jedzie dalej', () => {
  const s = emptyRound();
  place(s, 0, [[10, 10], [9, 10], [8, 10]], 'right');
  place(s, 1, [[11, 12], [11, 11], [11, 10], [11, 9]], 'down');
  const events = run(s, 2);
  assert.ok(bounced(events, 0));
  assert.ok(!bounced(events, 1));
  assert.deepEqual(pos(s.snakes[1])[0], [11, 13]);
  assert.equal(s.result, null);
});

test('zderzenie głowami na tym samym polu: obaj się odbijają', () => {
  const s = emptyRound();
  place(s, 0, [[10, 10], [9, 10], [8, 10]], 'right');
  place(s, 1, [[12, 10], [13, 10], [14, 10]], 'left');
  const events = run(s, 2);
  assert.ok(bounced(events, 0) && bounced(events, 1));
  assert.equal(s.snakes[0].dir, 'left');
  assert.equal(s.snakes[1].dir, 'right');
  assert.equal(s.result, null);
});

test('zderzenie głowami przy zamianie miejsc: obaj się odbijają', () => {
  const s = emptyRound();
  place(s, 0, [[10, 10], [9, 10], [8, 10]], 'right');
  place(s, 1, [[11, 10], [12, 10], [13, 10]], 'left');
  const events = run(s, 2);
  assert.ok(bounced(events, 0) && bounced(events, 1));
});

test('odbity wąż nie zwalnia ogona, więc rywal jadący w jego ogon też się odbija', () => {
  const s = emptyRound();
  // Leon odbija się od ściany, Hugo celuje w pole jego ogona
  place(s, 0, [[10, 10], [9, 10], [8, 10]], 'right');
  wall(s, 11, 10);
  place(s, 1, [[8, 11], [8, 12], [8, 13]], 'up');
  const events = run(s, 2);
  assert.ok(bounced(events, 0));
  assert.ok(bounced(events, 1));
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
