// Połączenie z serwerem pokoi (WebSocket), wybór adresu serwera i linki zaproszeń do pokoju.

import { ONLINE_SERVER } from '../config.js';
import { ROOMS_API, normalizeCode } from './protocol.js';

/**
 * Adres serwera pokoi:
 * - z linku (?server=wss://…), gdy ktoś chce wskazać inny serwer,
 * - ten sam adres, z którego przyszła gra (Cloudflare albo `npm start`: gra i pokoje są razem),
 * - przy grze otwartej z dysku (file://) adres z config.js.
 * @returns {string | null}
 */
export function serverUrl() {
  const fromLink = new URLSearchParams(location.search).get('server');
  if (fromLink) return fromLink.replace(/\/+$/, '');
  if (location.protocol === 'http:' || location.protocol === 'https:') {
    return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
  }
  return ONLINE_SERVER || null;
}

/**
 * Lista aktywnych pokoi z serwera gry (z pokojami publicznymi, także pustymi) albo null,
 * gdy serwera nie ma albo nie odpowiada.
 * @returns {Promise<{ code: string, players: string[], playing: boolean, round: number | null,
 *   full: boolean, public: boolean, max: number }[] | null>}
 */
export async function fetchRooms() {
  const server = serverUrl();
  if (!server) return null;
  try {
    const res = await fetch(server.replace(/^ws/, 'http') + ROOMS_API, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()).rooms;
  } catch {
    return null;
  }
}

/**
 * Sesja w pokoju gry. Po połączeniu `onMessage` dostaje wszystkie wiadomości serwera.
 * @typedef {object} Session
 * @property {string} code
 * @property {any} lobby                  ostatni stan poczekalni
 * @property {(msg: object) => void} send
 * @property {() => void} close
 * @property {((msg: any) => void) | null} onMessage
 * @property {(() => void) | null} onClose  zerwanie połączenia (nie wywoływane po close())
 */

/**
 * Łączy z pokojem. Kończy się po pierwszym stanie poczekalni albo błędem
 * (np. { code: 'exists' | 'missing' | 'full' | 'playing' | 'network', msg }).
 * @returns {Promise<Session>}
 */
export function joinRoom(baseUrl, code, name, create) {
  return new Promise((resolve, reject) => {
    const networkError = { code: 'network', msg: 'Nie udało się połączyć z serwerem gry' };
    /** @type {WebSocket} */
    let ws;
    try {
      ws = new WebSocket(`${baseUrl}/room/${code}`);
    } catch {
      reject(networkError);
      return;
    }

    let settled = false;
    let closing = false;
    /** @type {Session} */
    const session = {
      code,
      lobby: null,
      onMessage: null,
      onClose: null,
      send: (msg) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
      },
      close: () => {
        closing = true;
        ws.close();
      },
    };

    ws.onopen = () => session.send({ t: 'hello', name, create });
    ws.onmessage = (e) => {
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      if (msg.t === 'lobby') session.lobby = msg;
      if (!settled) {
        if (msg.t === 'lobby') {
          settled = true;
          resolve(session);
        } else if (msg.t === 'error') {
          settled = true;
          reject(msg);
        }
        return;
      }
      session.onMessage?.(msg);
    };
    ws.onclose = () => {
      if (!settled) {
        settled = true;
        reject(networkError);
      } else if (!closing) {
        session.onClose?.();
      }
    };
  });
}

const ROOM_PARAM = 'pokoj';

/** Kod pokoju z linku zaproszenia (?pokoj=KOT7) albo null. */
export function roomFromLink() {
  return normalizeCode(new URLSearchParams(location.search).get(ROOM_PARAM));
}

/** Link zaproszenia do pokoju (z zachowaniem ?server=, jeśli był). */
export function roomLink(code) {
  const url = new URL(location.href);
  url.hash = '';
  url.searchParams.set(ROOM_PARAM, code);
  return url.toString();
}

/** Strona z listą aktywnych pokoi (z zachowaniem ?server=, jeśli był). */
export function roomsPage() {
  const url = new URL('/pokoje', location.href);
  const server = new URLSearchParams(location.search).get('server');
  if (server) url.searchParams.set('server', server);
  return url.toString();
}

/** Ustawia (albo czyści, gdy code = null) kod pokoju w pasku adresu, bez przeładowania strony. */
export function showRoomInAddressBar(code) {
  try {
    const url = new URL(location.href);
    if (code) url.searchParams.set(ROOM_PARAM, code);
    else url.searchParams.delete(ROOM_PARAM);
    history.replaceState(null, '', url);
  } catch {
    // np. strona otwarta z dysku w przeglądarce, która na to nie pozwala
  }
}
