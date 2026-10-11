// Gra i serwer pokoi na Cloudflare Workers. Pliki gry (folder site/) Cloudflare serwuje sam,
// a tutaj trafia reszta: /room/KOD i /api/pokoje. Każdy pokój to osobny Durable Object (jedna
// instancja na kod pokoju), a logika pokoju jest wspólna z lokalnym serwerem (room.js).
// Lista aktywnych pokoi to jeden dodatkowy Durable Object, któremu pokoje zgłaszają swój stan.
//
//   npm run deploy:server      (konfiguracja w wrangler.toml)

// Uwaga: worker może eksportować tylko klasy i obsługę żądań, stałe trzymamy w room.js
import { LIST_TTL_MS, Room, sortRooms } from './room.js';
import { ROOM_PATH_RE, ROOMS_API } from '../src/net/protocol.js';

/** Co tyle niepusty pokój potwierdza liście, że wciąż istnieje. */
const HEARTBEAT_MS = 60 * 1000;

/** @param {any} env */
function roomList(env) {
  return env.ROOM_LIST.get(env.ROOM_LIST.idFromName('lista'));
}

export class RoomObject {
  /** @param {any} state @param {any} env */
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.code = '????';
    /** @type {Room | null} */
    this.room = null;
    /** Zgłoszenia do listy idą po kolei, żeby starsze nie nadpisało nowszego */
    this.reporting = Promise.resolve();
  }

  /** Wysyła liście pokoi aktualny opis pokoju (albo null, gdy pokój zniknął). */
  report() {
    const body = JSON.stringify({ code: this.code, room: this.room?.summary() ?? null });
    this.reporting = this.reporting
      .then(() => roomList(this.env).fetch('https://lista/', { method: 'POST', body }))
      .catch(() => {});
  }

  async alarm() {
    if (!this.room || this.room.isEmpty) return;
    this.report();
    await this.state.storage.setAlarm(Date.now() + HEARTBEAT_MS);
  }

  /** @param {Request} request */
  async fetch(request) {
    this.code = ROOM_PATH_RE.exec(new URL(request.url).pathname)?.[1] ?? '????';
    if (!this.room) {
      this.room = new Room(this.code);
      this.room.onChange = () => this.report();
      await this.state.storage.setAlarm(Date.now() + HEARTBEAT_MS);
    }
    const room = this.room;

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
      if (this.room === room && room.isEmpty) this.room = null;
    };
    server.addEventListener('message', (e) => conn.receive(e.data));
    server.addEventListener('close', closed);
    server.addEventListener('error', closed);

    // @ts-ignore odpowiedź 101 z WebSocketem to rozszerzenie Cloudflare
    return new Response(null, { status: 101, webSocket: client });
  }
}

/** Lista aktywnych pokoi: kod → opis pokoju i czas ostatniego zgłoszenia. */
export class RoomListObject {
  /** @param {any} state */
  constructor(state) {
    this.storage = state.storage;
  }

  /** @param {Request} request */
  async fetch(request) {
    if (request.method === 'POST') {
      const { code, room } = await request.json();
      if (typeof code !== 'string') return new Response(null, { status: 400 });
      if (room) await this.storage.put(code, { ...room, at: Date.now() });
      else await this.storage.delete(code);
      return new Response(null, { status: 204 });
    }
    const now = Date.now();
    const rooms = [];
    for (const [code, room] of await this.storage.list()) {
      if (now - room.at > LIST_TTL_MS) await this.storage.delete(code);
      else rooms.push(room);
    }
    return listResponse(rooms);
  }
}

function listResponse(rooms) {
  return new Response(JSON.stringify({ rooms: sortRooms(rooms) }), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export default {
  /** @param {Request} request @param {{ ROOMS: any, ROOM_LIST: any }} env */
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === ROOMS_API) {
      if (request.method !== 'GET') return new Response(null, { status: 405 });
      return roomList(env).fetch('https://lista/');
    }
    const match = ROOM_PATH_RE.exec(path);
    if (!match) return new Response('Nie znaleziono', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Oczekiwano połączenia WebSocket', { status: 426 });
    }
    return env.ROOMS.get(env.ROOMS.idFromName(match[1])).fetch(request);
  },
};
