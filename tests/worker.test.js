import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../server/worker.js';

test('worker: ścieżka spoza pokoi to 404 (pliki gry serwuje Cloudflare z folderu site/)', async () => {
  const env = { ROOMS: { idFromName: () => assert.fail('nie powinno tworzyć pokoju') } };
  const res = await worker.fetch(new Request('https://example.com/README.md'), env);
  assert.equal(res.status, 404);
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
