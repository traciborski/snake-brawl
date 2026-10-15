// Przewidywanie (rollback) w grze online: symulacja trzech komputerów z wahaniami łącza jak na Wi-Fi.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../server/room.js';
import { INPUT_DELAY, Lockstep } from '../src/net/lockstep.js';
import { Rollback } from '../src/net/rollback.js';
import { cloneRound, createRound, stepRound } from '../src/game/round.js';
import { createRng, nextFloat } from '../src/core/rng.js';

const TICK = 55;

test('cloneRound: kopia liczy się dalej tak samo, a oryginał zostaje nietknięty', () => {
  const a = createRound(42, { players: 3 });
  const before = JSON.stringify(a.snakes);
  const b = cloneRound(a);
  for (let i = 0; i < 40; i++) stepRound(b, [{ turns: i % 7 === 0 ? ['down'] : [], shoot: i % 5 === 0 }, {}, { sword: i === 3 }]);
  assert.equal(JSON.stringify(a.snakes), before);
  const c = cloneRound(a);
  for (let i = 0; i < 40; i++) stepRound(c, [{ turns: i % 7 === 0 ? ['down'] : [], shoot: i % 5 === 0 }, {}, { sword: i === 3 }]);
  assert.equal(JSON.stringify(c), JSON.stringify(b));
});

/** Trzy komputery, serwer pokoju, łącze z rozrzutem i skokami opóźnienia (kolejność w połączeniu zachowana). */
function simulate({ oneWay, jitter, spikes, seconds }) {
  const rand = (() => {
    const r = createRng(99);
    return () => nextFloat(r);
  })();
  const room = new Room('TEST', { random: () => 0.5 });
  const net = [];
  let now = 0;
  const clients = oneWay.map((ow, i) => ({ i, ow, up: 0, down: 0, rng: createRng(i + 1), confirmed: new Map(), frozen: 0, turnsSeen: [] }));
  const delay = (c) => c.ow + rand() * jitter + (rand() < spikes ? 80 + rand() * 120 : 0);
  for (const c of clients) {
    c.socket = {
      send: (text) => {
        const msg = JSON.parse(text);
        if (msg.t !== 'input') return;
        c.down = Math.max(now + delay(c), c.down);
        net.push({ at: c.down, fn: () => c.lock.receive(msg) });
      },
      close() {},
    };
    c.conn = room.connect(c.socket);
    c.conn.receive(JSON.stringify({ t: 'hello', name: 'g' + c.i, create: c.i === 0 }));
  }
  room.phase = 'game';
  room.players = [...room.members];
  for (const c of clients) {
    c.lock = new Lockstep(clients.length, c.i, undefined, { maxAhead: 8 });
    c.rb = new Rollback(c.lock);
    c.rb.startRound(0, createRound(1234, { players: clients.length }));
    c.rb.onConfirm = (state) => c.confirmed.set(state.tick, JSON.stringify(state));
    c.start = c.i * 23;
  }
  for (now = 0; now < seconds * 1000; now++) {
    net.sort((a, b) => a.at - b.at);
    while (net.length && net[0].at <= now) net.shift().fn();
    for (const c of clients) {
      if (now < c.start || (now - c.start) % TICK !== 0) continue;
      c.lock.tick();
      while (c.lock.canSend()) {
        const r = nextFloat(c.rng);
        const cmd = { turns: r < 0.12 ? [['up', 'left', 'down', 'right'][Math.floor(r * 33)]] : [], shoot: r > 0.9, sword: r > 0.985 };
        const text = JSON.stringify(c.lock.makeInput(cmd));
        c.up = Math.max(now + delay(c), c.up);
        net.push({ at: c.up, fn: () => c.conn.receive(text) });
      }
      const { advanced } = c.rb.update();
      if (!advanced) c.frozen++;
    }
    if (clients.every((c) => c.rb.confirmed.result)) break;
  }
  return clients;
}

for (const [label, net] of [
  ['Wi-Fi', { oneWay: [20, 30, 40], jitter: 30, spikes: 0.02 }],
  ['jeden słabszy', { oneWay: [20, 25, 60], jitter: 40, spikes: 0.04 }],
]) {
test(`rollback (${label}): ten sam potwierdzony stan u wszystkich, a obraz nie staje`, () => {
  const clients = simulate({ ...net, seconds: 90 });
  const [a, b, c] = clients;
  const common = [...a.confirmed.keys()].filter((k) => b.confirmed.has(k) && c.confirmed.has(k));
  assert.ok(common.length > 40, `wspólne klatki: ${common.length}`);
  assert.ok(a.rb.confirmed.result, 'runda się rozstrzygnęła');
  for (const k of common) {
    assert.equal(b.confirmed.get(k), a.confirmed.get(k), `klatka ${k}`);
    assert.equal(c.confirmed.get(k), a.confirmed.get(k), `klatka ${k}`);
  }
  for (const cl of clients) {
    const ticks = Math.max(1, cl.lock.clock);
    assert.ok(cl.frozen / ticks < 0.02, `gracz ${cl.i}: obraz stał przez ${cl.frozen} z ${ticks} ticków`);
    console.log(`gracz ${cl.i}: obraz stał ${cl.frozen} z ${ticks} ticków`);
  }
});
}

test('rollback: własny skręt widać na ekranie od razu po INPUT_DELAY, bez czekania na sieć', () => {
  const lock = new Lockstep(2, 0, undefined, { maxAhead: 8 });
  const rb = new Rollback(lock);
  rb.startRound(0, createRound(7, { players: 2, walls: new Uint8Array(48 * 27) }));
  const dirBefore = rb.display.snakes[0].dir;
  const turn = dirBefore === 'right' ? 'down' : 'up';
  lock.tick();
  lock.makeInput({ turns: [turn] });
  rb.update();
  // Gracz 1 milczy (sieć), a mimo to po kilku tickach nasz wąż jedzie w nową stronę
  for (let i = 0; i < 3; i++) {
    lock.tick();
    lock.makeInput({});
    rb.update();
  }
  assert.equal(rb.display.snakes[0].dir, turn);
  assert.equal(rb.confirmed.tick, INPUT_DELAY, 'potwierdzony stan czeka na gracza 1 (puste są tylko pierwsze klatki)');
});
