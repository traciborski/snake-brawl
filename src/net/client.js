// Połączenie z serwerem pokoi (WebSocket) i wybór adresu serwera.

import { ONLINE_SERVER } from '../config.js';

const LOCAL_HOST_RE = /^(localhost|127\.0\.0\.1|\[::1\]|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|.+\.local)$/;

/**
 * Adres serwera: z linku (?server=…), lokalny przy `npm start`, a w internecie z config.js.
 * @returns {string | null}
 */
export function serverUrl() {
  const fromLink = new URLSearchParams(location.search).get('server');
  if (fromLink) return fromLink.replace(/\/+$/, '');
  const isHttp = location.protocol === 'http:' || location.protocol === 'https:';
  if (isHttp && LOCAL_HOST_RE.test(location.hostname)) {
    return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
  }
  return ONLINE_SERVER || null;
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
