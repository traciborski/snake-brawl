import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepRound } from '../src/game/round.js';
import { inSwordRange } from '../src/game/sword.js';
import { KEYMAPS, SWORD_COOLDOWN, SWORD_RADIUS, SWORD_TICKS } from '../src/config.js';
import { emptyRound, place, run } from './helpers.js';

const SWORD = [{ sword: true }];

test(`zasięg miecza to koło o promieniu ${SWORD_RADIUS} pól (także przez krawędź planszy)`, () => {
  const grid = { w: 48, h: 27 };
  const c = { x: 10, y: 10 };
  assert.ok(inSwordRange(grid, c, { x: 13, y: 10 }));
  assert.ok(inSwordRange(grid, c, { x: 12, y: 12 })); // 4 + 4 <= 9
  assert.ok(!inSwordRange(grid, c, { x: 13, y: 11 })); // 9 + 1 > 9: róg kwadratu odpada
  assert.ok(!inSwordRange(grid, c, { x: 14, y: 10 }));
  assert.ok(inSwordRange(grid, { x: 1, y: 5 }, { x: 47, y: 5 }), 'przez krawędź');
});

test('miecz zabija rywala, którego głowa jest w zasięgu', () => {
  const s = emptyRound();
  place(s, 0, [[10, 10], [9, 10], [8, 10]], 'up');
  const rival = place(s, 1, [[12, 11], [13, 11], [14, 11]], 'right');
  const events = stepRound(s, SWORD);
  assert.ok(events.some((e) => e.type === 'swordSwing'));
  assert.equal(rival.alive, false);
  assert.equal(rival.death, 'sword');
  assert.deepEqual(s.result, { winner: 0 });
});

test('miecz odcina ogon rywala od pierwszego segmentu w zasięgu', () => {
  const s = emptyRound();
  place(s, 0, [[10, 10], [9, 10], [8, 10]], 'up');
  // Rywal leży poziomo w rzędzie 12, głowa daleko z prawej: w zasięgu są pola x = 8..12
  const cells = [];
  for (let x = 20; x >= 6; x--) cells.push([x, 12]);
  const rival = place(s, 1, cells, 'right');
  const events = stepRound(s, SWORD);
  assert.equal(rival.alive, true);
  const hit = events.find((e) => e.type === 'bodyHit');
  assert.equal(hit.by, 0);
  assert.deepEqual(hit.cells[0], { x: 12, y: 12 }, 'cięcie od pierwszego segmentu w zasięgu');
  assert.equal(rival.body.length, 8); // zostaje x = 20..13
});

test(`miecz wiruje ${SWORD_TICKS} ticków: rywal, który wjedzie w zasięg w tym czasie, też ginie`, () => {
  const s = emptyRound();
  place(s, 0, [[10, 10], [9, 10], [8, 10]], 'right');
  const rival = place(s, 1, [[15, 11], [16, 11], [17, 11]], 'left');
  stepRound(s, SWORD);
  assert.equal(rival.alive, true, 'na początku poza zasięgiem');
  run(s, SWORD_TICKS - 1);
  assert.equal(rival.alive, false);
  assert.equal(rival.death, 'sword');
});

test('po wirowaniu miecz nie tnie, a kolejne cięcie dopiero po cooldownie', () => {
  const s = emptyRound();
  const me = place(s, 0, [[10, 10], [9, 10], [8, 10]], 'up');
  place(s, 1, [[30, 20], [31, 20], [32, 20]], 'right');
  stepRound(s, SWORD);
  run(s, SWORD_TICKS);
  assert.equal(me.swordTicks, 0);
  const again = stepRound(s, SWORD);
  assert.ok(!again.some((e) => e.type === 'swordSwing'), 'za wcześnie');
  run(s, SWORD_COOLDOWN);
  const ready = stepRound(s, SWORD);
  assert.ok(ready.some((e) => e.type === 'swordSwing'));
});

test('miecz niszczy cudze pociski w zasięgu, własne zostawia, własnego węża nie rusza', () => {
  const s = emptyRound();
  const me = place(s, 0, [[10, 10], [9, 10], [8, 10]], 'up');
  place(s, 1, [[30, 20], [31, 20], [32, 20]], 'right');
  s.bullets.push({ owner: 1, pos: { x: 12, y: 8 }, dir: 'down' });
  s.bullets.push({ owner: 0, pos: { x: 8, y: 12 }, dir: 'down' });
  stepRound(s, SWORD);
  assert.deepEqual(s.bullets.map((b) => b.owner), [0]);
  assert.equal(me.alive, true);
  assert.equal(me.body.length, 3);
});

test('dwa miecze naraz w swoim zasięgu: giną oba (remis)', () => {
  const s = emptyRound();
  place(s, 0, [[10, 10], [9, 10], [8, 10]], 'up');
  place(s, 1, [[12, 10], [13, 10], [14, 10]], 'down');
  stepRound(s, [{ sword: true }, { sword: true }]);
  assert.deepEqual(s.result, { winner: 'draw' });
});

test('każdy gracz ma klawisz miecza, żaden się nie powtarza z innymi klawiszami', () => {
  const codes = KEYMAPS.flatMap((m) => Object.values(m.keys).flat());
  assert.equal(new Set(codes).size, codes.length);
  for (const m of KEYMAPS) assert.ok(m.keys.sword?.length, m.help);
});
