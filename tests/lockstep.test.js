import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INPUT_DELAY, Lockstep } from '../src/net/lockstep.js';
import { createRound, stepRound } from '../src/game/round.js';

test('pierwsze klatki rundy są puste, potem czekamy na komendy wszystkich', () => {
  const lock = new Lockstep(2, 0);
  lock.startRound(0);
  for (let f = 0; f < INPUT_DELAY; f++) assert.deepEqual(lock.take(), [{}, {}]);
  assert.equal(lock.take(), null);
  assert.deepEqual(lock.waitingFor(), [0, 1]);
});

test('własna komenda działa INPUT_DELAY klatek później i nie wyprzedza symulacji', () => {
  const lock = new Lockstep(2, 0);
  lock.startRound(0);
  const msg = lock.makeInput({ turns: ['up'], shoot: true });
  assert.deepEqual(msg, { t: 'input', r: 0, f: INPUT_DELAY, d: 'u', s: 1 });
  assert.equal(lock.canSend(), false, 'już wysłaliśmy na klatkę frame + delay');
  lock.take();
  assert.equal(lock.canSend(), true);
});

test('krok, gdy przyjdą komendy wszystkich; echo własnej komendy jest pomijane', () => {
  const lock = new Lockstep(2, 1);
  lock.startRound(0);
  for (let f = 0; f < INPUT_DELAY; f++) lock.take();
  lock.makeInput({ turns: ['left'] });
  assert.deepEqual(lock.waitingFor(), [0]);
  lock.receive({ p: 0, r: 0, f: INPUT_DELAY, d: 'r', s: 0 });
  lock.receive({ p: 1, r: 0, f: INPUT_DELAY, d: 'u', s: 1 }); // echo: ignorowane
  assert.deepEqual(lock.take(), [
    { turns: ['right'], shoot: false },
    { turns: ['left'], shoot: false },
  ]);
});

test('komendy następnej rundy przychodzące za wcześnie są przechowane', () => {
  const lock = new Lockstep(2, 0);
  lock.startRound(0);
  lock.receive({ p: 1, r: 1, f: INPUT_DELAY, d: 'd', s: 0 });
  lock.startRound(1);
  for (let f = 0; f < INPUT_DELAY; f++) lock.take();
  lock.makeInput({});
  assert.deepEqual(lock.take()[1], { turns: ['down'], shoot: false });
});

test('rozłączony gracz: od podanej klatki dostaje komendę quit, nie czekamy na niego', () => {
  const lock = new Lockstep(3, 0);
  lock.startRound(2);
  for (let f = 0; f < INPUT_DELAY; f++) lock.take();
  lock.markLeft(2, 2, INPUT_DELAY + 1);
  lock.makeInput({});
  lock.receive({ p: 1, r: 2, f: INPUT_DELAY, d: '', s: 0 });
  lock.receive({ p: 2, r: 2, f: INPUT_DELAY, d: '', s: 0 });
  assert.deepEqual(lock.take()[2], { turns: [], shoot: false });
  lock.makeInput({});
  lock.receive({ p: 1, r: 2, f: INPUT_DELAY + 1, d: '', s: 0 });
  assert.deepEqual(lock.take()[2], { quit: true });
  assert.equal(lock.activePlayers(), 2);
});

test('dwa komputery z tymi samymi komendami liczą identyczną grę', () => {
  // Symulacja dwóch klientów, którzy wymieniają się komendami przez „serwer” z opóźnieniem
  const seed = 99;
  const clients = [0, 1].map((me) => ({ lock: new Lockstep(2, me), round: createRound(seed) }));
  const wire = [];
  clients.forEach((c) => c.lock.startRound(0));
  for (let tick = 0; tick < 600; tick++) {
    clients.forEach((c, me) => {
      while (c.lock.canSend()) {
        const cmd = { turns: tick % (7 + me) === 0 ? [['up', 'left', 'down', 'right'][tick % 4]] : [], shoot: tick % 5 === me };
        wire.push({ p: me, at: tick + 2 + me, msg: c.lock.makeInput(cmd) });
      }
    });
    for (const w of wire.filter((x) => x.at === tick)) clients.forEach((c) => c.lock.receive({ p: w.p, ...w.msg }));
    clients.forEach((c) => {
      const cmds = c.lock.take();
      if (cmds && !c.round.result) stepRound(c.round, cmds);
    });
  }
  assert.ok(clients[0].round.tick > 400, 'gra posuwa się mimo opóźnień');
  assert.deepEqual(clients[0].round, clients[1].round);
});

test('komenda quit zabija węża (przyczyna: left)', () => {
  const s = createRound(1, { players: 2 });
  const events = stepRound(s, [{}, { quit: true }]);
  assert.equal(s.snakes[1].death, 'left');
  assert.ok(events.some((e) => e.type === 'died' && e.cause === 'left'));
  assert.deepEqual(s.result, { winner: 0 });
});
