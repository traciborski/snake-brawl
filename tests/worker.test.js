import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../server/worker.js';

test('worker: strona główna i zła ścieżka nie dotykają pokoi', async () => {
  const env = { ROOMS: { idFromName: () => assert.fail('nie powinno tworzyć pokoju') } };
  const res = await worker.fetch(new Request('https://example.com/'), env);
  assert.equal(res.status, 200);
  assert.match(await res.text(), /serwer pokoi działa/);
});

test('worker: pokój wymaga WebSocketu, a kod trafia do właściwego Durable Object', async () => {
  const names = [];
  const env = {
    ROOMS: {
      idFromName: (name) => (names.push(name), name),
      get: () => ({ fetch: async () => new Response('ok-z-pokoju') }),
    },
  };
  const plain = await worker.fetch(new Request('https://example.com/room/KOT7'), env);
  assert.equal(plain.status, 426);
  const ws = await worker.fetch(new Request('https://example.com/room/KOT7', { headers: { Upgrade: 'websocket' } }), env);
  assert.equal(await ws.text(), 'ok-z-pokoju');
  assert.deepEqual(names, ['KOT7']);
});
