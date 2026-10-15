// Dołączanie w trakcie rundy: trzy komputery w Node (prawdziwy serwer pokoju, lockstep, przewidywanie),
// z opóźnieniami sieci. Celina wchodzi w środku pierwszej rundy, od razu, bez czekania na kolejną.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../server/room.js';
import { INPUT_DELAY, JOIN_GRACE, Lockstep } from '../src/net/lockstep.js';
import { Rollback } from '../src/net/rollback.js';
import { createRound } from '../src/game/round.js';
import { createMatch, nextRoundSeed, recordRound, replayMatch } from '../src/game/match.js';
import { createRng, nextFloat } from '../src/core/rng.js';

const TICK = 55;
const ROUND_PAUSE = 15; // ticki między rundami (ekran wyniku + odliczanie)

function makeClient(name, delay, net) {
  const c = { name, delay, match: null, lock: null, rb: null, pause: 0, inRound: false, me: -1, late: null, snapshots: new Map(), rng: createRng(name.length * 7919) };
  c.socket = { send: (text) => net.push({ at: net.now + delay, fn: () => handle(c, JSON.parse(text)) }), close() {} };
  return c;
}

function begin(c, match, me, joins) {
  c.match = match;
  c.me = me;
  c.lock = new Lockstep(match.wins.length, me, joins, { maxAhead: 8 });
  c.rb = new Rollback(c.lock);
  c.rb.onConfirm = (s) => c.snapshots.set(`${c.match.round}:${s.tick}`, JSON.stringify(s.snakes));
  c.pause = ROUND_PAUSE;
  c.inRound = false;
}

function startRound(c) {
  c.rb.startRound(c.match.round, createRound(nextRoundSeed(c.match), { players: c.lock.playersInRound(c.match.round) }));
  c.inRound = true;
}

function handle(c, msg) {
  if (msg.t === 'lobby') c.you = msg.you;
  else if (msg.t === 'start') begin(c, createMatch(msg.seed, msg.players.length), msg.players.findIndex((p) => p.id === c.you));
  else if (msg.t === 'late') {
    // Jak w grze: wyniki wcześniejszych rund, odtworzenie bieżącej z zapisu ruchów, zegar tam, gdzie inni
    const match = replayMatch(msg.seed, msg.players.length, msg.results.slice(0, msg.r));
    begin(c, match, msg.players.findIndex((p) => p.id === c.you), msg.players.map((p) => ({ r: p.r, f: p.f })));
    for (const l of msg.left) c.lock.markLeft(l.p, l.r, l.f);
    for (const [p, f, d, s, m] of msg.log) c.lock.receive({ p, r: msg.r, f, d, s, m });
    startRound(c);
    c.lock.clock = msg.f - INPUT_DELAY;
    c.lock.sent = msg.f + JOIN_GRACE;
    c.joinedAt = { r: msg.r, f: msg.f };
  } else if (msg.t === 'input') c.lock?.receive(msg);
  else if (msg.t === 'joined' && c.lock) {
    c.lock.addPlayer(msg.r, msg.f);
    c.match.wins.push(0);
  }
}

function tick(c, conn) {
  if (!c.match || c.match.winner !== null) return;
  if (!c.inRound) {
    if (--c.pause > 0) return;
    startRound(c);
  }
  c.lock.tick();
  while (c.lock.canSend()) {
    const r = nextFloat(c.rng);
    const turns = r < 0.1 ? [['up', 'down', 'left', 'right'][Math.floor(r * 40)]] : [];
    conn.receive(JSON.stringify(c.lock.makeInput({ turns, shoot: r > 0.85, sword: r > 0.99 })));
  }
  const { advanced } = c.rb.update();
  if (!advanced) c.frozen = (c.frozen ?? 0) + 1;
  if (c.rb.confirmed.result) {
    conn.receive(JSON.stringify({ t: 'result', r: c.match.round, w: c.rb.confirmed.result.winner }));
    recordRound(c.match, c.rb.confirmed.result);
    c.inRound = false;
    c.pause = ROUND_PAUSE;
  }
}

test('gracz dołącza w środku rundy od razu, a wszyscy liczą tę samą grę', () => {
  const net = [];
  net.now = 0;
  const room = new Room('TEST', { random: () => 0.123 });
  const a = makeClient('Ala', 20, net);
  const b = makeClient('Bartek', 35, net);
  const c = makeClient('Celina', 28, net);
  const conns = new Map();
  const connect = (cl, create) => {
    const conn = room.connect(cl.socket);
    conns.set(cl, conn);
    conn.receive(JSON.stringify({ t: 'hello', name: cl.name, create }));
  };
  const deliver = () => {
    net.sort((x, y) => x.at - y.at);
    while (net.length && net[0].at <= net.now) net.shift().fn();
  };
  connect(a, true);
  connect(b, false);
  deliver();
  conns.get(a).receive(JSON.stringify({ t: 'start' }));

  let joinTime = -1;
  for (net.now = 1; net.now < 600000; net.now++) {
    deliver();
    // Celina wchodzi w trakcie pierwszej rundy (po ok. 2 s gry)
    if (joinTime < 0 && a.inRound && a.lock.clock > 40) {
      connect(c, false);
      joinTime = net.now;
    }
    for (const cl of [a, b, c]) if (conns.has(cl) && net.now % TICK === cl.delay % TICK) tick(cl, conns.get(cl));
    const done = (cl) => cl.match && cl.match.winner !== null;
    if (done(a) && done(b) && done(c)) break;
  }

  assert.ok(c.joinedAt, 'Celina weszła do gry');
  assert.equal(c.joinedAt.r, 0, 'od razu, w pierwszej rundzie');
  assert.ok(c.joinedAt.f > 30, `w środku rundy (klatka ${c.joinedAt.f})`);
  // Ten sam potwierdzony stan u wszystkich w każdej wspólnej klatce, także przed i po pojawieniu się jej węża
  const common = [...c.snapshots.keys()].filter((k) => a.snapshots.has(k) && b.snapshots.has(k));
  assert.ok(common.length > 100, `wspólne klatki: ${common.length}`);
  for (const k of common) {
    assert.equal(c.snapshots.get(k), a.snapshots.get(k), `klatka ${k}`);
    assert.equal(b.snapshots.get(k), a.snapshots.get(k), `klatka ${k}`);
  }
  const withC = common.filter((k) => JSON.parse(a.snapshots.get(k)).length === 3);
  assert.ok(withC.length > 50, 'wąż Celiny jest w grze');
  assert.deepEqual(c.match.wins, a.match.wins);
  assert.deepEqual(b.match.wins, a.match.wins);
});
