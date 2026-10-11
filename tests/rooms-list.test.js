import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIST_TTL_MS, Room, sortRooms } from '../server/room.js';
import worker, { RoomListObject, RoomObject } from '../server/worker.js';
import { createGameServer } from '../scripts/serve.js';

function client(room, name, create = false) {
  const socket = { sent: [], send(text) { this.sent.push(JSON.parse(text)); }, close() {} };
  const conn = room.connect(socket);
  conn.receive(JSON.stringify({ t: 'hello', name, create }));
  return { socket, conn, send: (msg) => conn.receive(JSON.stringify(msg)) };
}

/** Udawany magazyn Durable Object (to, czego używa lista pokoi). */
function fakeStorage() {
  const map = new Map();
  return {
    map,
    alarm: null,
    async put(k, v) { map.set(k, v); },
    async delete(k) { map.delete(k); },
    async list() { return new Map(map); },
    async setAlarm(t) { this.alarm = t; },
  };
}

test('worker eksportuje tylko obsługę żądań i klasy (inaczej Cloudflare go nie uruchomi)', async () => {
  const mod = await import('../server/worker.js');
  for (const [name, value] of Object.entries(mod)) {
    assert.ok(typeof value === 'function' || name === 'default', `${name} nie może być eksportem workera`);
  }
});

test('opis pokoju: gracze, poczekalnia, mecz z numerem rundy, pełny', () => {
  const room = new Room('KOT7');
  assert.equal(room.summary(), null, 'nieutworzony pokój nie trafia na listę');
  const changes = [];
  room.onChange = () => changes.push(room.summary());

  const a = client(room, 'Ala', true);
  client(room, 'Bartek');
  assert.deepEqual(room.summary(), { code: 'KOT7', players: ['Ala', 'Bartek'], playing: false, round: null, full: false });

  a.send({ t: 'start' });
  assert.equal(room.summary().playing, true);
  assert.equal(room.summary().round, 1);
  a.send({ t: 'result', r: 0, w: 1 });
  assert.equal(room.summary().round, 2);

  client(room, 'Celina');
  client(room, 'Darek');
  assert.equal(room.summary().full, true);
  assert.equal(changes.length, 6, 'zmiana przy każdym dołączeniu, starcie i wyniku rundy');

  a.conn.closed();
  assert.deepEqual(changes.at(-1).players, ['Bartek', 'Celina', 'Darek']);
});

test('pusty pokój znika z listy (ostatnia zmiana zgłasza null)', () => {
  const room = new Room('ABCD');
  const seen = [];
  room.onChange = () => seen.push(room.summary());
  const a = client(room, 'Ala', true);
  a.conn.closed();
  assert.equal(seen.at(-1), null);
});

test('kolejność listy: wolne poczekalnie, trwające mecze, pełne', () => {
  const rooms = [
    { code: 'ZZZZ', players: ['a'], playing: false, round: null, full: true, at: 1 },
    { code: 'BBBB', players: ['a'], playing: true, round: 2, full: false, at: 1 },
    { code: 'CCCC', players: ['a'], playing: false, round: null, full: false, at: 1 },
    { code: 'AAAA', players: ['a'], playing: false, round: null, full: false, at: 1 },
  ];
  const sorted = sortRooms(rooms);
  assert.deepEqual(sorted.map((r) => r.code), ['AAAA', 'CCCC', 'BBBB', 'ZZZZ']);
  assert.equal('at' in sorted[0], false);
});

test('Cloudflare: pokój zgłasza się do listy, lista zwraca go i usuwa stare wpisy', async () => {
  const list = new RoomListObject({ storage: fakeStorage() });
  const env = {
    ROOM_LIST: { idFromName: (n) => n, get: () => ({ fetch: (url, init) => list.fetch(new Request(url, init)) }) },
  };
  const storage = fakeStorage();
  const roomObject = new RoomObject({ storage }, env);
  // Bez WebSocketPair (jest tylko na Cloudflare) sprawdzamy samo zgłaszanie stanu
  roomObject.code = 'KOT7';
  roomObject.room = new Room('KOT7');
  roomObject.room.onChange = () => roomObject.report();
  client(roomObject.room, 'Ala', true);
  await roomObject.reporting;

  const get = async () => (await (await worker.fetch(new Request('https://gra/api/pokoje'), env)).json()).rooms;
  assert.deepEqual(await get(), [{ code: 'KOT7', players: ['Ala'], playing: false, round: null, full: false }]);

  // Pokój bez wieści dłużej niż LIST_TTL_MS (np. po restarcie serwera) znika
  list.storage.map.get('KOT7').at -= LIST_TTL_MS + 1;
  assert.deepEqual(await get(), []);
  assert.equal(list.storage.map.size, 0);

  const post = await worker.fetch(new Request('https://gra/api/pokoje', { method: 'POST', body: '{}' }), env);
  assert.equal(post.status, 405, 'z zewnątrz listy nie da się zmienić');
});

test('npm start: strona /pokoje i dane /api/pokoje', async () => {
  const server = createGameServer();
  await new Promise((ok) => server.listen(0, ok));
  const { port } = /** @type {any} */ (server.address());
  try {
    const page = await fetch(`http://localhost:${port}/pokoje`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /AKTYWNE POKOJE/);

    const ws = new WebSocket(`ws://localhost:${port}/room/KOT7`);
    await new Promise((ok) => (ws.onopen = ok));
    const lobby = new Promise((ok) => (ws.onmessage = ok));
    ws.send(JSON.stringify({ t: 'hello', name: 'Ala', create: true }));
    await lobby;
    const data = await (await fetch(`http://localhost:${port}/api/pokoje`)).json();
    assert.deepEqual(data.rooms.map((r) => r.code), ['KOT7']);
    ws.close();
  } finally {
    server.closeAllConnections?.();
    await new Promise((ok) => server.close(ok));
  }
});
