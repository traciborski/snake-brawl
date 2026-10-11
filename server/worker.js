// Serwer gry online na Cloudflare Workers. Każdy pokój to osobny Durable Object
// (jedna instancja na kod pokoju), a logika pokoju jest wspólna z lokalnym serwerem (room.js).
//
//   npx wrangler deploy      (konfiguracja w wrangler.toml)

import { Room } from './room.js';
import { ROOM_PATH_RE } from '../src/net/protocol.js';

export class RoomObject {
  constructor() {
    /** @type {Room | null} */
    this.room = null;
  }

  /** @param {Request} request */
  async fetch(request) {
    const code = ROOM_PATH_RE.exec(new URL(request.url).pathname)?.[1] ?? '????';
    const room = (this.room ??= new Room(code));

    // @ts-ignore WebSocketPair istnieje w środowisku Cloudflare Workers
    const [client, server] = Object.values(new WebSocketPair());
    server.accept();
    const conn = room.connect({
      send: (text) => {
        try {
          server.send(text);
        } catch {
          // gniazdo już zamknięte
        }
      },
      close: () => {
        try {
          server.close(1000, 'koniec');
        } catch {
          // już zamknięte
        }
      },
    });
    const closed = () => {
      conn.closed();
      // Pusty pokój znika: ten sam kod może być użyty od nowa
      if (this.room?.isEmpty) this.room = null;
    };
    server.addEventListener('message', (e) => conn.receive(e.data));
    server.addEventListener('close', closed);
    server.addEventListener('error', closed);

    // @ts-ignore odpowiedź 101 z WebSocketem to rozszerzenie Cloudflare
    return new Response(null, { status: 101, webSocket: client });
  }
}

export default {
  /** @param {Request} request @param {{ ROOMS: any }} env */
  async fetch(request, env) {
    const match = ROOM_PATH_RE.exec(new URL(request.url).pathname);
    if (!match) {
      return new Response('Snake Brawl: serwer pokoi działa.', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
    }
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Oczekiwano połączenia WebSocket', { status: 426 });
    }
    return env.ROOMS.get(env.ROOMS.idFromName(match[1])).fetch(request);
  },
};
