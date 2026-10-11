import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INPUT_DELAY, Lockstep, MAX_AHEAD } from '../src/net/lockstep.js';
import { createRound, stepRound } from '../src/game/round.js';

/** Jeden tick: upływ czasu i próba kroku. */
const tickTake = (lock) => {
  lock.tick();
  return lock.take();
};

test('pierwsze klatki rundy są puste, potem czekamy na komendy wszystkich', () => {
  const lock = new Lockstep(2, 0);
  lock.startRound(0);
  for (let f = 0; f < INPUT_DELAY; f++) assert.deepEqual(tickTake(lock), [{}, {}]);
  assert.equal(tickTake(lock), null);
  assert.deepEqual(lock.waitingFor(), [0, 1]);
});

test('własna komenda działa dokładnie INPUT_DELAY ticków później, jedna komenda na tick', () => {
  const lock = new Lockstep(1, 0);
  lock.startRound(0);
  // Tick 1 (tak jak w grze: najpierw upływ czasu, potem wysłanie, potem krok)
  lock.tick();
  assert.equal(lock.canSend(), true);
  const msg = lock.makeInput({ turns: ['up'], shoot: true });
  assert.deepEqual(msg, { t: 'input', r: 0, f: INPUT_DELAY, d: 'u', s: 1 });
  assert.equal(lock.canSend(), false, 'jedna komenda na tick');
  assert.deepEqual(lock.take(), [{}]);
  // Komenda z ticku 1 wykonuje się w ticku 1 + INPUT_DELAY
  for (let t = 2; t <= 1 + INPUT_DELAY; t++) {
    lock.tick();
    if (lock.canSend()) lock.makeInput({});
    const cmds = lock.take();
    if (t < 1 + INPUT_DELAY) assert.deepEqual(cmds, [{}]);
    else assert.deepEqual(cmds, [{ turns: ['up'], shoot: true }]);
  }
});

test('gdy czekamy na innych, zegar staje i nie wysyłamy komend coraz dalej w przyszłość', () => {
  const lock = new Lockstep(2, 0);
  lock.startRound(0);
  const sent = [];
  for (let t = 0; t < 10; t++) {
    lock.tick();
    while (lock.canSend()) sent.push(lock.makeInput({}).f);
    lock.take();
  }
  // Gracz 1 milczy: symulacja stoi na klatce INPUT_DELAY, a my wysłaliśmy tylko trochę do przodu
  assert.equal(lock.frame, INPUT_DELAY);
  assert.equal(lock.sent - 1, lock.frame + INPUT_DELAY + MAX_AHEAD, 'najdalsza wysłana klatka');
  assert.equal(lock.behind(), 1);
});

test('krok, gdy przyjdą komendy wszystkich; echo własnej komendy jest pomijane', () => {
  const lock = new Lockstep(2, 1);
  lock.startRound(0);
  for (let f = 0; f < INPUT_DELAY; f++) tickTake(lock);
  lock.makeInput({ turns: ['left'] });
  lock.tick();
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
  for (let f = 0; f < INPUT_DELAY; f++) tickTake(lock);
  lock.makeInput({});
  assert.deepEqual(tickTake(lock)[1], { turns: ['down'], shoot: false });
});

test('rozłączony gracz: od podanej klatki dostaje komendę quit, nie czekamy na niego', () => {
  const lock = new Lockstep(3, 0);
  lock.startRound(2);
  for (let f = 0; f < INPUT_DELAY; f++) tickTake(lock);
  lock.markLeft(2, 2, INPUT_DELAY + 1);
  lock.makeInput({});
  lock.receive({ p: 1, r: 2, f: INPUT_DELAY, d: '', s: 0 });
  lock.receive({ p: 2, r: 2, f: INPUT_DELAY, d: '', s: 0 });
  assert.deepEqual(tickTake(lock)[2], { turns: [], shoot: false });
  lock.makeInput({});
  lock.receive({ p: 1, r: 2, f: INPUT_DELAY + 1, d: '', s: 0 });
  assert.deepEqual(tickTake(lock)[2], { quit: true });
  assert.equal(lock.activePlayers(), 2);
});

test('dwa komputery z tymi samymi komendami liczą identyczną grę', () => {
  // Symulacja dwóch klientów, którzy wymieniają się komendami przez „serwer” z opóźnieniem
  const seed = 99;
  const clients = [0, 1].map((me) => ({ lock: new Lockstep(2, me), round: createRound(seed), snapshots: new Map() }));
  const wire = [];
  clients.forEach((c) => c.lock.startRound(0));
  for (let tick = 0; tick < 600; tick++) {
    clients.forEach((c, me) => {
      c.lock.tick();
      while (c.lock.canSend()) {
        const cmd = { turns: tick % (7 + me) === 0 ? [['up', 'left', 'down', 'right'][tick % 4]] : [], shoot: tick % 5 === me };
        wire.push({ p: me, at: tick + 2 + me, msg: c.lock.makeInput(cmd) });
      }
    });
    for (const w of wire.filter((x) => x.at === tick)) clients.forEach((c) => c.lock.receive({ p: w.p, ...w.msg }));
    clients.forEach((c) => {
      // jak w grze: krok na tick, drugi tylko przy zaległości
      for (let i = 0; i < 2 && !c.round.result; i++) {
        if (i > 0 && c.lock.behind() === 0) break;
        const cmds = c.lock.take();
        if (!cmds) break;
        stepRound(c.round, cmds);
        c.snapshots.set(c.round.tick, JSON.stringify(c.round));
      }
    });
  }
  assert.ok(clients[0].round.tick > 400, 'gra posuwa się mimo opóźnień');
  assert.ok(clients[0].round.tick <= 600, 'i nigdy nie wyprzedza czasu rzeczywistego');
  // Ten sam stan w każdej klatce, którą policzyli obaj
  const common = [...clients[0].snapshots.keys()].filter((t) => clients[1].snapshots.has(t));
  assert.ok(common.length > 400);
  for (const t of common) assert.equal(clients[0].snapshots.get(t), clients[1].snapshots.get(t), `klatka ${t}`);
});

test('tempo: symulacja nie wyprzedza zegara, nawet gdy komendy są dostępne', () => {
  const lock = new Lockstep(2, 0);
  lock.startRound(0);
  // wszystkie komendy rywala na zapas
  for (let f = INPUT_DELAY; f < 50; f++) lock.receive({ p: 1, r: 0, f, d: '', s: 0 });
  let steps = 0;
  for (let t = 0; t < 30; t++) {
    lock.tick();
    while (lock.canSend()) lock.makeInput({});
    while (lock.take()) steps++;
  }
  assert.equal(steps, 30, 'dokładnie jeden krok na tick');
});

test('gracz dołączający w trakcie meczu: brak węża i komend przed jego rundą', () => {
  const lock = new Lockstep(2, 0);
  lock.addPlayer(3);
  assert.equal(lock.playersInRound(2), 2);
  assert.equal(lock.playersInRound(3), 3);
  lock.startRound(2);
  lock.tick();
  assert.equal(lock.take().length, 2, 'w rundzie 2 dwa węże');
  lock.startRound(3);
  lock.tick();
  assert.equal(lock.take().length, 3, 'od rundy 3 trzy');
  for (let f = 1; f < INPUT_DELAY; f++) tickTake(lock);
  lock.makeInput({});
  lock.tick();
  lock.receive({ p: 1, r: 3, f: INPUT_DELAY, d: '', s: 0 });
  assert.deepEqual(lock.waitingFor(), [2], 'czekamy też na nowego gracza');
});

test('dołączający z listą rund startowych widzi to samo co pozostali', () => {
  const lock = new Lockstep(3, 2, [0, 0, 3]);
  assert.equal(lock.playersInRound(0), 2);
  assert.equal(lock.playersInRound(5), 3);
});

test('komenda quit zabija węża (przyczyna: left)', () => {
  const s = createRound(1, { players: 2 });
  const events = stepRound(s, [{}, { quit: true }]);
  assert.equal(s.snakes[1].death, 'left');
  assert.ok(events.some((e) => e.type === 'died' && e.cause === 'left'));
  assert.deepEqual(s.result, { winner: 0 });
});
