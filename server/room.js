// Pokój gry online: poczekalnia, start meczu, przekazywanie ruchów, rozłączenia,
// dołączanie w trakcie meczu (od rundy, której nikt jeszcze nie zaczął).
// Czysta logika bez sieci: gniazdo to dowolny obiekt z send(tekst) i close().
// Używają jej lokalny serwer (scripts/serve.js) i Cloudflare (server/worker.js).

import { MAX_PLAYERS, NAME_MAX } from '../src/config.js';
import { PUBLIC_ROOMS } from '../src/net/protocol.js';

const DIRS_RE = /^[udlr]{0,3}$/;

/** @typedef {{ send(text: string): void, close(): void }} Socket */
/** @typedef {{ id: number, name: string, socket: Socket }} Member */

export class Room {
  /** @param {string} code @param {{ random?: () => number }} [opts] */
  constructor(code, { random = Math.random } = {}) {
    this.code = code;
    this.random = random;
    /** Pokój publiczny (np. „4B”) istnieje zawsze: można do niego wejść bez zakładania */
    this.isPublic = PUBLIC_ROOMS.includes(code);
    this.created = this.isPublic;
    /** @type {Member[]} kolejność = kolejność dołączenia; pierwszy to założyciel */
    this.members = [];
    /** @type {'lobby' | 'game'} */
    this.phase = 'lobby';
    /** @type {Member[]} gracze trwającego meczu (indeks = numer gracza w grze) */
    this.players = [];
    /** @type {Map<number, { r: number, f: number }>} ostatni przekazany ruch gracza */
    this.last = new Map();
    /** Ziarno trwającego meczu (dla graczy dołączających w trakcie) */
    this.seed = 0;
    /** Najwyższy numer rundy, z której przyszedł jakikolwiek ruch */
    this.maxRound = -1;
    /** @type {(number | 'draw')[]} wyniki rozegranych rund (zgłaszane przez graczy) */
    this.results = [];
    /** @type {number[]} od której rundy gra gracz o danym numerze */
    this.joinRounds = [];
    this.nextId = 1;
    /** Wywoływane po każdej zmianie widocznej na liście pokoi (gracze, mecz, runda) */
    this.onChange = () => {};
  }

  get isEmpty() {
    return this.members.length === 0;
  }

  /** Czy nikt więcej nie zmieści się do pokoju (w trakcie meczu liczą się też ci, którzy wyszli). */
  get isFull() {
    return this.members.length >= MAX_PLAYERS || (this.phase === 'game' && this.players.length >= MAX_PLAYERS);
  }

  /** Opis pokoju na liście aktywnych pokoi albo null, jeśli pokoju nie ma (nikt w nim nie jest). */
  summary() {
    if (!this.created || this.isEmpty) return null;
    const playing = this.phase === 'game';
    return {
      code: this.code,
      players: this.members.map((m) => m.name),
      playing,
      round: playing ? this.results.length + 1 : null,
      full: this.isFull,
      public: this.isPublic,
      max: MAX_PLAYERS,
    };
  }

  /**
   * Nowe połączenie. Zwraca obsługę kolejnych wiadomości i zamknięcia.
   * @param {Socket} socket
   */
  connect(socket) {
    /** @type {Member | null} */
    let member = null;
    return {
      receive: (text) => {
        const msg = parse(text);
        if (!msg) return;
        if (!member) {
          if (msg.t === 'hello') member = this.join(socket, msg);
          return;
        }
        this.message(member, msg);
      },
      closed: () => {
        if (member) this.leave(member);
        member = null;
      },
    };
  }

  /** @returns {Member | null} */
  join(socket, { name, create }) {
    const reject = (code, msg) => {
      send(socket, { t: 'error', code, msg });
      socket.close();
      return null;
    };
    if (create && this.created) return reject('exists', 'Pokój o tym kodzie już istnieje');
    if (!create && !this.created) return reject('missing', 'Nie ma pokoju o takim kodzie');
    if (this.isFull) return reject('full', `Pokój jest pełny (max ${MAX_PLAYERS} graczy)`);

    this.created = true;
    const member = { id: this.nextId++, name: cleanName(name), socket };
    this.members.push(member);
    this.broadcastLobby();
    if (this.phase === 'game') this.joinLate(member);
    this.onChange();
    return member;
  }

  /**
   * Dołączenie w trakcie meczu. Nowy gracz wchodzi od rundy maxRound + 2: nikt nie mógł jej
   * jeszcze utworzyć, bo do tego trzeba skończyć rundę maxRound + 1, a jej ruchy serwer
   * przekaże dopiero po tej wiadomości (kolejność wiadomości w połączeniu jest zachowana).
   * @param {Member} member
   */
  joinLate(member) {
    const r = this.maxRound + 2;
    const p = this.players.length;
    this.players.push(member);
    this.joinRounds.push(r);
    for (const m of this.members) {
      if (m !== member) send(m.socket, { t: 'joined', p, id: member.id, name: member.name, r });
    }
    send(member.socket, {
      t: 'late',
      seed: this.seed,
      r,
      players: this.players.map((m, i) => ({ id: m.id, name: m.name, r: this.joinRounds[i] })),
      results: this.results,
    });
  }

  /** @param {Member} member */
  message(member, msg) {
    switch (msg.t) {
      case 'start': {
        if (this.phase !== 'lobby' || member !== this.members[0] || this.members.length < 2) return;
        this.phase = 'game';
        this.players = [...this.members];
        this.joinRounds = this.players.map(() => 0);
        this.last.clear();
        this.maxRound = -1;
        this.results = [];
        const seed = Math.floor(this.random() * 0x100000000) >>> 0;
        this.seed = seed;
        const players = this.players.map((m) => ({ id: m.id, name: m.name }));
        this.broadcast({ t: 'start', seed, players });
        this.onChange();
        return;
      }
      case 'input': {
        const p = this.players.indexOf(member);
        if (this.phase !== 'game' || p < 0) return;
        const { r, f, d = '', s = 0 } = msg;
        if (!Number.isInteger(r) || !Number.isInteger(f) || r < 0 || f < 0) return;
        if (typeof d !== 'string' || !DIRS_RE.test(d)) return;
        this.last.set(member.id, { r, f });
        this.maxRound = Math.max(this.maxRound, r);
        this.broadcast({ t: 'input', p, r, f, d, s: s ? 1 : 0 });
        return;
      }
      case 'result': {
        // Wynik rundy (liczą go wszyscy tak samo, wystarczy pierwszy). Potrzebny dołączającym.
        const { r, w } = msg;
        if (this.phase !== 'game' || !Number.isInteger(r) || r < 0 || r > this.results.length) return;
        if (!(w === 'draw' || (Number.isInteger(w) && w >= 0 && w < this.players.length))) return;
        if (r < this.results.length) return;
        this.results.push(w);
        this.broadcast({ t: 'result', r, w });
        this.onChange();
        return;
      }
      case 'lobby': {
        // Koniec meczu: wszyscy wracają do poczekalni (wystarczy pierwszy, który o to poprosi)
        if (this.phase !== 'game') return;
        this.phase = 'lobby';
        this.players = [];
        this.broadcastLobby();
        this.onChange();
        return;
      }
    }
  }

  /** @param {Member} member */
  leave(member) {
    const i = this.members.indexOf(member);
    if (i < 0) return;
    this.members.splice(i, 1);

    const p = this.players.indexOf(member);
    if (this.phase === 'game' && p >= 0) {
      // Od pierwszej klatki, której gracz już nie wysłał, jego wąż ginie u wszystkich
      const last = this.last.get(member.id);
      const at = last ? { r: last.r, f: last.f + 1 } : { r: 0, f: 0 };
      this.broadcast({ t: 'left', p, ...at });
      if (this.members.length === 0) this.phase = 'lobby';
    } else if (this.phase === 'lobby') {
      this.broadcastLobby();
    }
    this.onChange();
  }

  broadcastLobby() {
    const players = this.members.map((m) => ({ id: m.id, name: m.name }));
    const host = this.members[0]?.id ?? null;
    const playing = this.phase === 'game';
    const isPublic = this.isPublic;
    for (const m of this.members) send(m.socket, { t: 'lobby', code: this.code, you: m.id, host, players, playing, public: isPublic });
  }

  broadcast(msg) {
    const text = JSON.stringify(msg);
    for (const m of this.members) m.socket.send(text);
  }
}

/** Pokój bez wieści dłużej niż tyle znika z listy pokoi (np. po restarcie serwera). */
export const LIST_TTL_MS = 3 * 60 * 1000;

/** Opis pustego pokoju publicznego (pusty pokój nie zgłasza się na listę, a publiczny ma być widać zawsze). */
function emptyPublicRoom(code) {
  return { code, players: [], playing: false, round: null, full: false, public: true, max: MAX_PLAYERS };
}

/**
 * Lista pokoi do pokazania: najpierw publiczne (zawsze, także puste), potem poczekalnie
 * z wolnym miejscem, trwające mecze, na końcu pełne; w grupie alfabetycznie.
 * Zostają tylko pola opisu (bez np. czasu zgłoszenia).
 */
export function listRooms(rooms) {
  const all = [...rooms];
  for (const code of PUBLIC_ROOMS) if (!all.some((r) => r.code === code)) all.push(emptyPublicRoom(code));
  const order = (r) => (r.public ? -1 : r.full ? 2 : r.playing ? 1 : 0);
  return all
    .map(({ code, players, playing, round, full }) => ({
      code,
      players,
      playing,
      round,
      full,
      public: PUBLIC_ROOMS.includes(code),
      max: MAX_PLAYERS,
    }))
    .sort((a, b) => order(a) - order(b) || a.code.localeCompare(b.code));
}

function send(socket, msg) {
  socket.send(JSON.stringify(msg));
}

function parse(text) {
  try {
    const msg = JSON.parse(String(text));
    return msg && typeof msg === 'object' && typeof msg.t === 'string' ? msg : null;
  } catch {
    return null;
  }
}

export function cleanName(raw) {
  const name = String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
  return name || 'Gracz';
}
