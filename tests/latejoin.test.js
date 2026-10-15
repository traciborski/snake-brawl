// Symulacja całego meczu online w Node: prawdziwa logika pokoju (server/room.js), lockstep,
// trzy „komputery” z opóźnieniami sieci. Trzeci gracz dołącza w trakcie meczu.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../server/room.js';
import { Lockstep } from '../src/net/lockstep.js';
import { createRound, stepRound } from '../src/game/round.js';
import { createMatch, nextRoundSeed, recordRound, replayMatch } from '../src/game/match.js';
import { createRng, nextFloat } from '../src/core/rng.js';

const ROUND_PAUSE = 15; // ticki między rundami (ekran wyniku + odliczanie)

function makeClient(name, delay, net) {
  const c = { name, delay, inbox: [], lock: null, match: null, round: null, pause: 0, snapshots: new Map(), late: null, me: -1, rng: createRng(name.length * 7919) };
  c.socket = { send: (text) => net.push({ to: c, at: net.now + delay, msg: JSON.parse(text) }), close() {} };
  return c;
}

function begin(c, match, me, joinRounds) {
  c.match = match;
  c.me = me;
  c.lock = new Lockstep(match.wins.length, me, joinRounds);
  c.pause = ROUND_PAUSE;
  c.round = null;
}

function handle(c, msg) {
  if (msg.t === 'lobby') c.you = msg.you;
  else if (msg.t === 'start') begin(c, createMatch(msg.seed, msg.players.length), msg.players.findIndex((p) => p.id === c.you));
  else if (msg.t === 'late') c.late = { ...msg, results: [...msg.results] };
  else if (msg.t === 'result' && c.late) c.late.results[msg.r] = msg.w;
  else if (msg.t === 'input') c.lock?.receive(msg);
  else if (msg.t === 'joined' && c.lock) {
    c.lock.addPlayer(msg.r);
    c.match.wins.push(0);
  }
  if (c.late) {
    const known = c.late.results.slice(0, c.late.r);
    if (known.length === c.late.r && !known.includes(undefined)) {
      const match = replayMatch(c.late.seed, c.late.players.length, known);
      const me = c.late.players.findIndex((p) => p.id === c.you);
      if (match.winner === null) begin(c, match, me, c.late.players.map((p) => p.r));
      c.late = null;
    }
  }
}

function tick(c, conn) {
  if (!c.match || c.match.winner !== null) return;
  if (!c.round) {
    if (--c.pause > 0) return;
    c.round = createRound(nextRoundSeed(c.match), { players: c.lock.playersInRound(c.match.round) });
    c.lock.startRound(c.match.round);
  }
  c.lock.tick();
  while (c.lock.canSend()) {
    const r = nextFloat(c.rng);
    const turns = r < 0.1 ? [['up', 'down', 'left', 'right'][Math.floor(r * 40)]] : [];
    conn.receive(JSON.stringify(c.lock.makeInput({ turns, shoot: r > 0.85 })));
  }
  for (let i = 0; i < 2 && !c.round.result; i++) {
    if (i > 0 && c.lock.behind() === 0) break;
    const cmds = c.lock.take();
    if (!cmds) break;
    stepRound(c.round, cmds);
    c.snapshots.set(`${c.match.round}:${c.round.tick}`, JSON.stringify(c.round.snakes));
  }
  if (c.round.result) {
    conn.receive(JSON.stringify({ t: 'result', r: c.match.round, w: c.round.result.winner }));
    recordRound(c.match, c.round.result);
    c.round = null;
    c.pause = ROUND_PAUSE;
  }
}

test('gracz dołączający w trakcie meczu liczy tę samą grę co pozostali', () => {
  const net = [];
  net.now = 0;
  const room = new Room('TEST', { random: () => 0.123 });
  const a = makeClient('Ala', 2, net);
  const b = makeClient('Bartek', 4, net);
  const c = makeClient('Celina', 3, net);
  const conns = new Map();
  const connect = (cl, create) => {
    const conn = room.connect(cl.socket);
    conns.set(cl, conn);
    conn.receive(JSON.stringify({ t: 'hello', name: cl.name, create }));
  };
  connect(a, true);
  connect(b, false);
  const deliver = () => {
    for (let i = 0; i < net.length; i++) {
      if (net[i].at <= net.now) {
        handle(net[i].to, net[i].msg);
        net.splice(i--, 1);
      }
    }
  };
  deliver();
  conns.get(a).receive(JSON.stringify({ t: 'start' }));

  let joinedRound = -1;
  for (net.now = 1; net.now < 40000; net.now++) {
    deliver();
    // Celina dołącza w trakcie pierwszej rundy: wejdzie od rundy 2, a po dwóch rundach
    // nikt nie może mieć jeszcze 3 wygranych, więc mecz na pewno na nią poczeka
    if (joinedRound < 0 && a.match && a.round?.tick > 20) {
      connect(c, false);
      joinedRound = room.joinRounds[2];
    }
    for (const cl of [a, b, c]) if (conns.has(cl)) tick(cl, conns.get(cl));
    const done = (cl) => cl.match && cl.match.winner !== null;
    if (done(a) && done(b) && done(c)) break;
  }

  assert.ok(joinedRound >= 2, 'Celina dołączyła w trakcie meczu');
  assert.ok(c.match, 'Celina weszła do gry');
  assert.equal(c.lock.playersInRound(joinedRound), 3);
  // Te same klatki od rundy dołączenia: identyczny stan u wszystkich trzech
  const common = [...c.snapshots.keys()].filter((k) => a.snapshots.has(k) && b.snapshots.has(k));
  assert.ok(common.length > 30, `wspólne klatki: ${common.length}`);
  for (const k of common) {
    assert.equal(c.snapshots.get(k), a.snapshots.get(k), `klatka ${k}`);
    assert.equal(b.snapshots.get(k), a.snapshots.get(k), `klatka ${k}`);
  }
  // Wynik meczu taki sam u wszystkich
  assert.deepEqual(c.match.wins, a.match.wins);
  assert.deepEqual(b.match.wins, a.match.wins);
});
