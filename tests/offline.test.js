import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KEYMAPS, OFFLINE_MAX_PLAYERS, WALL } from '../src/config.js';
import { clampPlayers } from '../src/scenes/setup.js';
import { createOfflineController } from '../src/modes/offline.js';
import { emptyRound, place, run, wall } from './helpers.js';

test('trening (jeden wąż): runda trwa, dopóki wąż żyje, i liczy zjedzone owoce', () => {
  const s = emptyRound({ players: 1 });
  place(s, 0, [[10, 10], [9, 10], [8, 10]], 'right');
  s.food = [{ x: 11, y: 10 }];
  run(s, 20);
  assert.equal(s.result, null, 'sam wąż nie wygrywa od razu');
  assert.equal(s.snakes[0].eaten, 1);

  wall(s, 25, 10, WALL.DEADLY);
  run(s, 20);
  assert.equal(s.snakes[0].alive, false);
  assert.deepEqual(s.result, { winner: 'draw' });
});

test('trening: własne pociski i własne ciało nie zabijają', () => {
  const s = emptyRound({ players: 1 });
  place(s, 0, [[10, 10], [9, 10], [8, 10], [7, 10]], 'right');
  run(s, 1, [{ shoot: true }]);
  run(s, 4, [{ turns: ['down'] }]);
  run(s, 2, [{ turns: ['left'] }]);
  run(s, 2, [{ turns: ['up'] }]);
  run(s, 40);
  assert.equal(s.snakes[0].alive, true);
  assert.equal(s.result, null);
});

test('cztery zestawy klawiszy, żaden klawisz się nie powtarza', () => {
  assert.equal(KEYMAPS.length, OFFLINE_MAX_PLAYERS);
  const codes = KEYMAPS.flatMap((m) => Object.values(m.keys).flat());
  assert.equal(new Set(codes).size, codes.length);
  for (const pause of ['KeyP', 'KeyM', 'Escape']) assert.ok(!codes.includes(pause), `${pause} jest zajęty`);
});

test('liczba graczy offline: 1–4, zła wartość z pamięci przeglądarki daje 2', () => {
  assert.equal(clampPlayers(1), 1);
  assert.equal(clampPlayers(7), 4);
  assert.equal(clampPlayers(0), 1);
  assert.equal(clampPlayers('xx'), 2);
});

test('kontroler offline: komenda na każdego gracza, w treningu wąż słucha wszystkich klawiszy', () => {
  const keyboard = {
    consumeCommands: () => KEYMAPS.map((_, i) => ({ turns: i === 1 ? ['up'] : [], shoot: i === 3 })),
    consumeMerged: () => ({ turns: ['up'], shoot: true }),
  };
  const touch = { consume: () => ({}) };
  const app = { keyboard, touch, players: [{}] };
  const solo = createOfflineController(app).commands();
  assert.equal(solo.length, 1);
  assert.deepEqual(solo[0].turns, ['up']);
  assert.equal(solo[0].shoot, true);

  app.players = [{}, {}, {}];
  const three = createOfflineController(app).commands();
  assert.equal(three.length, 3);
  assert.deepEqual(three[1].turns, ['up']);
});
