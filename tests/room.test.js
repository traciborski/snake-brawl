import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../server/room.js';
import { MAX_PLAYERS } from '../src/config.js';
import { createGameServer } from '../scripts/serve.js';
import { decodeCommand, encodeCommand, normalizeCode, randomCode } from '../src/net/protocol.js';

/** Udawane gniazdo: zapisuje wysłane wiadomości. */
function fakeSocket() {
  return {
    sent: [],
    closed: false,
    send(text) {
      this.sent.push(JSON.parse(text));
    },
    close() {
      this.closed = true;
    },
    last(type) {
      return [...this.sent].reverse().find((m) => m.t === type);
    },
  };
}

function client(room, name, create = false) {
  const socket = fakeSocket();
  const conn = room.connect(socket);
  conn.receive(JSON.stringify({ t: 'hello', name, create }));
  return { socket, conn, send: (msg) => conn.receive(JSON.stringify(msg)) };
}

test('założenie pokoju, dołączenie, poczekalnia z założycielem', () => {
  const room = new Room('KOT7');
  const a = client(room, 'Ala', true);
  const b = client(room, '  Bartek  ');
  const lobby = b.socket.last('lobby');
  assert.deepEqual(lobby.players.map((p) => p.name), ['Ala', 'Bartek']);
  assert.equal(lobby.host, a.socket.last('lobby').you);
  assert.notEqual(lobby.you, lobby.host);
});

test('błędy: pokój nie istnieje, kod zajęty, pokój pełny', () => {
  const room = new Room('ABCD');
  const ghost = client(room, 'X');
  assert.equal(ghost.socket.last('error').code, 'missing');
  assert.ok(ghost.socket.closed);

  client(room, 'A', true);
  assert.equal(client(room, 'B', true).socket.last('error').code, 'exists');
  for (const name of ['B', 'C', 'D', 'E', 'F']) client(room, name);
  assert.equal(room.members.length, MAX_PLAYERS);
  assert.equal(client(room, 'G').socket.last('error').code, 'full');

});

test('dołączenie w trakcie meczu: od rundy maxRound + 2, wszyscy się dowiadują', () => {
  const room = new Room('KOT7', { random: () => 0.25 });
  const a = client(room, 'A', true);
  const b = client(room, 'B');
  a.send({ t: 'start' });
  a.send({ t: 'input', r: 1, f: 10, d: '', s: 0 });
  a.send({ t: 'result', r: 0, w: 1 });
  a.send({ t: 'result', r: 0, w: 0 }); // drugi raz ten sam wynik: ignorowany
  const c = client(room, 'Celina');
  assert.equal(c.socket.last('error'), undefined);
  assert.equal(c.socket.last('lobby').playing, true);
  const late = c.socket.last('late');
  assert.equal(late.r, 3);
  assert.equal(late.seed, room.seed);
  assert.deepEqual(late.results, [1]);
  assert.deepEqual(late.players.map((p) => [p.name, p.r]), [['A', 0], ['B', 0], ['Celina', 3]]);
  assert.deepEqual(b.socket.last('joined'), { t: 'joined', p: 2, id: late.players[2].id, name: 'Celina', r: 3 });
  // dołączający gra normalnie: jego ruchy idą do wszystkich
  c.send({ t: 'input', r: 3, f: 2, d: 'u', s: 0 });
  assert.equal(a.socket.last('input').p, 2);
  // kolejne wyniki dostaje też on
  b.send({ t: 'result', r: 1, w: 'draw' });
  assert.deepEqual(c.socket.last('result'), { t: 'result', r: 1, w: 'draw' });
});

test('w trakcie meczu miejsca liczą się razem z graczami, którzy wyszli', () => {
  const room = new Room('KOT7');
  const a = client(room, 'A', true);
  const others = ['B', 'C', 'D', 'E', 'F'].map((n) => client(room, n));
  a.send({ t: 'start' });
  others[0].conn.closed(); // B wychodzi, ale jego wąż i miejsce zostają do końca meczu
  assert.equal(client(room, 'G').socket.last('error').code, 'full');
});

test('start: tylko założyciel, min. 2 graczy, wszyscy dostają to samo ziarno', () => {
  const room = new Room('KOT7', { random: () => 0.5 });
  const a = client(room, 'A', true);
  a.send({ t: 'start' });
  assert.equal(a.socket.last('start'), undefined, 'sam nie zacznie');
  const b = client(room, 'B');
  b.send({ t: 'start' });
  assert.equal(b.socket.last('start'), undefined, 'nie-założyciel nie zacznie');
  a.send({ t: 'start' });
  assert.deepEqual(a.socket.last('start'), b.socket.last('start'));
  assert.equal(a.socket.last('start').seed, 0x80000000);
});

test('ruchy idą do wszystkich z numerem gracza, złe ruchy są odrzucane', () => {
  const room = new Room('KOT7');
  const a = client(room, 'A', true);
  const b = client(room, 'B');
  a.send({ t: 'start' });
  b.send({ t: 'input', r: 0, f: 3, d: 'ul', s: 1, m: 1 });
  assert.deepEqual(a.socket.last('input'), { t: 'input', p: 1, r: 0, f: 3, d: 'ul', s: 1, m: 1 });
  b.send({ t: 'input', r: 0, f: 4, d: 'xyz' });
  b.send({ t: 'input', r: -1, f: 4 });
  assert.equal(a.socket.sent.filter((m) => m.t === 'input').length, 1);
});

test('rozłączenie w trakcie meczu: wszyscy dostają klatkę, od której wąż ginie', () => {
  const room = new Room('KOT7');
  const a = client(room, 'A', true);
  const b = client(room, 'B');
  const c = client(room, 'C');
  a.send({ t: 'start' });
  b.send({ t: 'input', r: 1, f: 40 });
  b.conn.closed();
  assert.deepEqual(a.socket.last('left'), { t: 'left', p: 1, r: 1, f: 41 });
  assert.deepEqual(c.socket.last('left'), { t: 'left', p: 1, r: 1, f: 41 });
});

test('po meczu powrót do poczekalni bez graczy, którzy wyszli; nowy założyciel', () => {
  const room = new Room('KOT7');
  const a = client(room, 'A', true);
  const b = client(room, 'B');
  a.send({ t: 'start' });
  a.conn.closed();
  b.send({ t: 'lobby' });
  const lobby = b.socket.last('lobby');
  assert.deepEqual(lobby.players.map((p) => p.name), ['B']);
  assert.equal(lobby.host, lobby.you);
});

test('protokół: kody pokoi i zapis komend', () => {
  assert.match(randomCode(), /^[A-Z2-9]{4}$/);
  assert.equal(normalizeCode(' kot7 '), 'KOT7');
  assert.equal(normalizeCode('KO'), null);
  assert.equal(normalizeCode('KOT0'), null); // 0 i 1 nie występują w kodach
  const cmd = { turns: ['up', 'left'], shoot: true, sword: true };
  assert.deepEqual(decodeCommand(encodeCommand(cmd)), cmd);
  assert.deepEqual(decodeCommand(encodeCommand({})), { turns: [], shoot: false, sword: false });
});

test('lokalny serwer: dwóch graczy przez prawdziwe WebSockety', async () => {
  const server = createGameServer();
  await new Promise((ok) => server.listen(0, ok));
  const { port } = /** @type {any} */ (server.address());
  const open = (code) =>
    new Promise((ok, fail) => {
      const ws = new WebSocket(`ws://localhost:${port}/room/${code}`);
      const inbox = [];
      ws.onmessage = (e) => inbox.push(JSON.parse(e.data));
      ws.onopen = () => ok({ ws, inbox });
      ws.onerror = fail;
    });
  const waitFor = async (inbox, type) => {
    for (let i = 0; i < 100; i++) {
      const m = inbox.find((x) => x.t === type);
      if (m) return m;
      await new Promise((r) => setTimeout(r, 10));
    }
    throw new Error(`brak wiadomości ${type}`);
  };

  try {
    const a = await open('TEST');
    a.ws.send(JSON.stringify({ t: 'hello', name: 'Ala', create: true }));
    await waitFor(a.inbox, 'lobby');
    const b = await open('TEST');
    b.ws.send(JSON.stringify({ t: 'hello', name: 'Bartek' }));
    const lobby = await waitFor(b.inbox, 'lobby');
    assert.equal(lobby.players.length, 2);

    a.ws.send(JSON.stringify({ t: 'start' }));
    const startA = await waitFor(a.inbox, 'start');
    const startB = await waitFor(b.inbox, 'start');
    assert.equal(startA.seed, startB.seed);

    b.ws.send(JSON.stringify({ t: 'input', r: 0, f: 3, d: 'r', s: 0 }));
    assert.deepEqual(await waitFor(a.inbox, 'input'), { t: 'input', p: 1, r: 0, f: 3, d: 'r', s: 0, m: 0 });

    b.ws.close();
    assert.equal((await waitFor(a.inbox, 'left')).p, 1);
    a.ws.close();
  } finally {
    server.close();
    server.closeAllConnections?.();
  }
});

test('pokój publiczny 4B istnieje zawsze: wchodzi się bez zakładania, pierwszy jest gospodarzem', () => {
  const room = new Room('4B');
  const a = client(room, 'Ala');
  assert.equal(a.socket.last('error'), undefined);
  const lobby = a.socket.last('lobby');
  assert.equal(lobby.public, true);
  assert.equal(lobby.host, lobby.you);
  const b = client(room, 'Bartek');
  a.conn.closed();
  // Gospodarz wyszedł: gospodarzem zostaje następny
  const after = b.socket.last('lobby');
  assert.equal(after.host, after.you);
  assert.equal(normalizeCode('4b'), '4B');
  assert.equal(normalizeCode('4C'), null);
});
