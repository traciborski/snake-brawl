// Wspólne dla gry i serwera: kody pokoi i zapis komend w wiadomościach sieciowych.

/** Bez liter i cyfr, które łatwo pomylić (O/0, I/1). */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 4;
/** Pokoje publiczne: zawsze istnieją, widać je w menu gry i na liście pokoi. */
export const PUBLIC_ROOMS = ['4B'];
export const ROOM_PATH_RE = new RegExp(`^/room/([A-Z2-9]{${CODE_LENGTH}}|${PUBLIC_ROOMS.join('|')})$`);
/** Lista aktywnych pokoi (JSON) dla strony /pokoje. */
export const ROOMS_API = '/api/pokoje';

/** Losowy kod pokoju, np. „KOT7”. */
export function randomCode(random = Math.random) {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  return code;
}

/** Kod wpisany przez gracza (albo nazwa pokoju publicznego): wielkie litery, bez spacji. Zwraca null, jeśli niepoprawny. */
export function normalizeCode(raw) {
  const code = String(raw ?? '').toUpperCase().replace(/\s+/g, '');
  return ROOM_PATH_RE.test(`/room/${code}`) ? code : null;
}

const DIR_TO_CHAR = { up: 'u', down: 'd', left: 'l', right: 'r' };
const CHAR_TO_DIR = { u: 'up', d: 'down', l: 'left', r: 'right' };

/**
 * Komenda gry → zwarta postać do wiadomości: { d: 'ul', s: 1, m: 1 } (max 3 skręty, s = strzał, m = miecz).
 * @param {import('../game/types.js').Command} cmd
 */
export function encodeCommand(cmd) {
  const d = (cmd.turns ?? []).slice(0, 3).map((t) => DIR_TO_CHAR[t]).join('');
  return { d, s: cmd.shoot ? 1 : 0, m: cmd.sword ? 1 : 0 };
}

/** @returns {import('../game/types.js').Command} */
export function decodeCommand({ d = '', s = 0, m = 0 }) {
  return { turns: [...d].map((c) => CHAR_TO_DIR[c]).filter(Boolean), shoot: !!s, sword: !!m };
}
