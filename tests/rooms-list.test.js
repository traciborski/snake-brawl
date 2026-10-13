import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIST_TTL_MS, Room, listRooms } from '../server/room.js';
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
  assert.deepEqual(room.summary(), { code: 'KOT7', players: ['Ala', 'Bartek'], playing: false, round: null, full: false, public: false, max: 6 });

  a.send({ t: 'start' });
  assert.equal(room.summary().playing, true);
  assert.equal(room.summary().round, 1);
  a.send({ t: 'result', r: 0, w: 1 });
  assert.equal(room.summary().round, 2);

  for (const name of ['Celina', 'Darek', 'Ewa', 'Franek']) client(room, name);
  assert.equal(room.summary().full, true);
  assert.equal(changes.length, 8, 'zmiana przy każdym dołączeniu, starcie i wyniku rundy');

  a.conn.closed();
  assert.deepEqual(changes.at(-1).players, ['Bartek', 'Celina', 'Darek', 'Ewa', 'Franek']);
});

test('pusty pokój znika z listy (ostatnia zmiana zgłasza null)', () => {
  const room = new Room('ABCD');
  const seen = [];
  room.onChange = () => seen.push(room.summary());
  const a = client(room, 'Ala', true);
  a.conn.closed();
  assert.equal(seen.at(-1), null);
});

test('kolejność listy: pokój publiczny (zawsze, nawet pusty), wolne poczekalnie, trwające mecze, pełne', () => {
  const rooms = [
    { code: 'ZZZZ', players: ['a'], playing: false, round: null, full: true, at: 1 },
    { code: 'BBBB', players: ['a'], playing: true, round: 2, full: false, at: 1 },
    { code: 'CCCC', players: ['a'], playing: false, round: null, full: false, at: 1 },
    { code: 'AAAA', players: ['a'], playing: false, round: null, full: false, at: 1 },
  ];
  const sorted = listRooms(rooms);
  assert.deepEqual(sorted.map((r) => r.code), ['4B', 'AAAA', 'CCCC', 'BBBB', 'ZZZZ']);
  assert.deepEqual(sorted[0], { code: '4B', players: [], playing: false, round: null, full: false, public: true, max: 6 });
  assert.equal('at' in sorted[1], false);
  // Gdy w 4B ktoś jest, na liście jest jego prawdziwy opis (bez dubla)
  const busy = listRooms([{ code: '4B', players: ['Ala'], playing: true, round: 2, full: false }]);
  assert.deepEqual(busy.map((r) => [r.code, r.players.length]), [['4B', 1]]);
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
  const codes = async () => (await get()).map((r) => r.code);
  assert.deepEqual(await codes(), ['4B', 'KOT7']);
  assert.deepEqual((await get())[1], { code: 'KOT7', players: ['Ala'], playing: false, round: null, full: false, public: false, max: 6 });

  // Pokój bez wieści dłużej niż LIST_TTL_MS (np. po restarcie serwera) znika
  list.storage.map.get('KOT7').at -= LIST_TTL_MS + 1;
  assert.deepEqual(await codes(), ['4B']);
  assert.equal(list.storage.map.size, 0);

  const post = await worker.fetch(new Request('https://gra/api/pokoje', { method: 'POST', body: '{}' }), env);
  assert.equal(post.status, 405, 'z zewnątrz listy nie da się zmienić');
});

test('npm start: strona /pokoje i dane /api/pokoje', async () => {
  const server = createGameServer();
  await new Promise((ok) => server.listen(0, ok));
  const { port } = /** @type {any} */ (server.address());
  let ws = null;
  try {
    const page = await fetch(`http://localhost:${port}/pokoje`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /AKTYWNE POKOJE/);

    ws = new WebSocket(`ws://localhost:${port}/room/KOT7`);
    await new Promise((ok) => (ws.onopen = ok));
    const lobby = new Promise((ok) => (ws.onmessage = ok));
    ws.send(JSON.stringify({ t: 'hello', name: 'Ala', create: true }));
    await lobby;
    const data = await (await fetch(`http://localhost:${port}/api/pokoje`)).json();
    assert.deepEqual(data.rooms.map((r) => r.code), ['4B', 'KOT7']);
  } finally {
    ws?.close();
    server.closeAllConnections?.();
    await new Promise((ok) => server.close(ok));
  }
});
