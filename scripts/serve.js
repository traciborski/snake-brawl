// Mini serwer bez zależności: `npm start` → http://localhost:8080
// - pliki gry (dist/snake-brawl.js sklejany na bieżąco z src/, więc nie trzeba robić builda),
// - pokoje gry online pod ws://localhost:8080/room/KOD (ta sama logika co na Cloudflare),
// - lista aktywnych pokoi: strona /pokoje i dane /api/pokoje.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { bundle, OUT } from './build.js';
import { acceptWebSocket } from './ws.js';
import { Room, listRooms } from '../server/room.js';
import { ROOM_PATH_RE, ROOMS_API } from '../src/net/protocol.js';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

export function createGameServer() {
  /** @type {Map<string, Room>} */
  const roomsByCode = new Map();

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let path = decodeURIComponent(url.pathname);
    if (path === ROOMS_API) {
      const rooms = [...roomsByCode.values()].map((room) => room.summary()).filter(Boolean);
      res.writeHead(200, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ rooms: listRooms(rooms) }));
      return;
    }
    if (path.endsWith('/')) path += 'index.html';
    // Jak na Cloudflare: /pokoje to strona pokoje.html
    if (!extname(path)) path += '.html';

    const file = normalize(join(ROOT, path));
    if (file !== ROOT && !file.startsWith(ROOT + sep)) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    try {
      const body = path === `/${OUT}` ? bundle() : await readFile(file);
      res.writeHead(200, {
        'Content-Type': MIME[extname(file)] ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(body);
    } catch {
      res.writeHead(404).end('Not found');
    }
  });

  server.on('upgrade', (req, socket) => {
    const match = ROOM_PATH_RE.exec(new URL(req.url ?? '/', 'http://localhost').pathname);
    if (!match) {
      socket.end('HTTP/1.1 404 Not Found\r\n\r\n');
      return;
    }
    const ws = acceptWebSocket(req, socket);
    if (!ws) return;
    const code = match[1];
    const room = roomsByCode.get(code) ?? new Room(code);
    roomsByCode.set(code, room);
    const conn = room.connect(ws);
    ws.onmessage = (text) => conn.receive(text);
    ws.onclose = () => {
      conn.closed();
      if (room.isEmpty) roomsByCode.delete(code);
    };
  });

  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT) || 8080;
  createGameServer().listen(port, () => {
    console.log(`Snake Brawl: http://localhost:${port}`);
  });
}
