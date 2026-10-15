// Lockstep: każdy komputer liczy tę samą symulację z tych samych komend.
// Komendy są numerowane (runda, klatka). Własna komenda działa INPUT_DELAY klatek później,
// żeby zdążyła dolecieć do innych. Krok symulacji robimy tylko, gdy mamy komendy wszystkich.
//
// Tempo wyznacza lokalny zegar (clock: ticki od początku rundy, co 55 ms):
// - wysyłamy dokładnie jedną komendę na tick: na klatkę, która wykona się INPUT_DELAY ticków później,
// - symulacja nie wyprzedza zegara (klatka < clock), więc gra nigdy nie biegnie szybciej
//   niż w trybie offline; kto został w tyle, nadrabia najwyżej o jedną klatkę na tick,
// - zegar nie ucieka symulacji dalej niż o MAX_AHEAD klatek. Gdy czekamy na ruchy innych
//   (np. zaczęliśmy rundę chwilę przed nimi), zegar staje, zamiast wysyłać nasze komendy
//   coraz dalej w przyszłość, co wydłużałoby opóźnienie naszych własnych skrętów.
// Czysta logika, bez sieci (wysyłaniem zajmuje się kontroler trybu online).

import { decodeCommand, encodeCommand } from './protocol.js';

export const INPUT_DELAY = 1; // 55 ms (z przewidywaniem, patrz rollback.js)
export const MAX_AHEAD = 1;
/**
 * Gracz dołączający w trakcie rundy przez pierwsze JOIN_GRACE klatek „nic nie robi” (nie czekamy
 * na jego komendy): w tym czasie odtwarza u siebie rundę i dogania zegar innych (ok. 1,1 s).
 */
export const JOIN_GRACE = 20;

/** @typedef {{ r: number, f: number }} JoinAt  od której rundy i klatki gracz ma węża */

export class Lockstep {
  /**
   * @param {number} players liczba graczy
   * @param {number} me mój numer gracza
   * @param {(JoinAt | number)[]} [joins] od kiedy gra każdy gracz (liczba = od początku tej rundy)
   * @param {{ maxAhead?: number }} [opts] o ile klatek zegar może wyprzedzić potwierdzoną symulację
   */
  constructor(players, me, joins = Array(players).fill(0), { maxAhead = MAX_AHEAD } = {}) {
    this.maxAhead = maxAhead;
    this.players = players;
    this.me = me;
    /** @type {JoinAt[]} */
    this.joins = joins.map((j) => (typeof j === 'number' ? { r: j, f: 0 } : { ...j }));
    /** @type {Map<string, import('../game/types.js').Command>} klucz `runda:klatka:gracz` */
    this.buffer = new Map();
    /** @type {Map<number, { r: number, f: number }>} od kiedy gracz jest poza grą */
    this.left = new Map();
    this.round = -1;
    this.frame = 0;
    this.sent = 0;
    this.clock = 0;
  }

  /** Początek rundy: pierwsze INPUT_DELAY klatek są puste u wszystkich. */
  startRound(r) {
    this.round = r;
    this.frame = 0;
    this.sent = INPUT_DELAY;
    this.clock = 0;
    for (const key of this.buffer.keys()) {
      if (Number(key.split(':')[0]) < r) this.buffer.delete(key);
    }
  }

  /** Upływ jednego ticka czasu rzeczywistego. */
  tick() {
    if (this.round >= 0 && this.clock - this.frame <= this.maxAhead) this.clock++;
  }

  /**
   * Czy wysłać kolejną własną komendę: jedna na tick. W ticku `clock` wykonuje się klatka
   * clock - 1, więc komenda na klatkę clock - 1 + INPUT_DELAY działa dokładnie INPUT_DELAY ticków później.
   */
  canSend() {
    return this.round >= 0 && this.sent < this.clock + INPUT_DELAY;
  }

  /** Czy symulacji wolno zrobić kolejny krok (nie wyprzedzamy zegara). */
  due() {
    return this.round >= 0 && this.frame < this.clock;
  }

  /** O ile klatek symulacja jest za zegarem (0 = na czas). */
  behind() {
    return Math.max(0, this.clock - this.frame - 1);
  }

  /** Zapisuje własną komendę na kolejną klatkę i zwraca wiadomość do wysłania. */
  makeInput(cmd) {
    const f = this.sent++;
    const enc = encodeCommand(cmd);
    this.buffer.set(`${this.round}:${f}:${this.me}`, decodeCommand(enc));
    return { t: 'input', r: this.round, f, ...enc };
  }

  /** Komenda innego gracza z serwera (własne echo pomijamy, bo już ją mamy). */
  receive({ p, r, f, d, s, m }) {
    if (p === this.me) return;
    this.buffer.set(`${r}:${f}:${p}`, decodeCommand({ d, s, m }));
  }

  /** Gracz się rozłączył: od klatki (r, f) jego wąż ginie. */
  markLeft(p, r, f) {
    this.left.set(p, { r, f });
  }

  isLeft(p, r = this.round, f = this.frame) {
    const at = this.left.get(p);
    return !!at && (r > at.r || (r === at.r && f >= at.f));
  }

  /** Nowy gracz dołącza w trakcie meczu: od rundy r, klatki f (f = 0: od początku rundy). */
  addPlayer(r, f = 0) {
    this.joins.push({ r, f });
    this.players++;
  }

  /** Ilu graczy ma węża w klatce f rundy r (dołączający pojawiają się w swojej klatce). */
  playersAt(r, f) {
    let n = 0;
    while (n < this.players && (this.joins[n].r < r || (this.joins[n].r === r && this.joins[n].f <= f))) n++;
    return n;
  }

  /** Ilu węży jest na starcie rundy r. */
  playersInRound(r) {
    return this.playersAt(r, 0);
  }

  /** Gracze, których wąż pojawia się w klatce f bieżącej rundy (dołączyli w trakcie rundy). */
  joiningAt(f) {
    const list = [];
    if (f === 0) return list;
    this.joins.forEach((j, p) => {
      if (j.r === this.round && j.f === f) list.push(p);
    });
    return list;
  }

  /** Czy komenda gracza p w klatce f jest z góry pusta (dopiero dołączył i jeszcze się ładuje). */
  graceAt(p, f) {
    const j = this.joins[p];
    return j.r === this.round && j.f > 0 && f < j.f + JOIN_GRACE;
  }

  /** Ilu graczy jeszcze gra (nie rozłączyło się). */
  activePlayers() {
    let n = 0;
    for (let p = 0; p < this.players; p++) if (!this.isLeft(p, Infinity, 0)) n++;
    return n;
  }

  /** Gracze, na których komendy czekamy w bieżącej klatce. */
  waitingFor() {
    const missing = [];
    for (let p = 0; p < this.playersAt(this.round, this.frame); p++) {
      if (this.frame < INPUT_DELAY || this.isLeft(p) || this.graceAt(p, this.frame)) continue;
      if (!this.buffer.has(`${this.round}:${this.frame}:${p}`)) missing.push(p);
    }
    return missing;
  }

  /**
   * Komendy na klatkę f do przewidywania: znane, a brakujące jako „nic nie robi” (jedzie prosto).
   * @returns {import('../game/types.js').Command[]}
   */
  commandsAt(f) {
    const commands = [];
    for (let p = 0; p < this.playersAt(this.round, f); p++) {
      if (this.isLeft(p, this.round, f)) commands.push({ quit: true });
      else commands.push(this.buffer.get(`${this.round}:${f}:${p}`) ?? {});
    }
    return commands;
  }

  /**
   * Komendy wszystkich graczy na bieżącą klatkę (i przejście do następnej)
   * albo null, jeśli czegoś jeszcze brakuje.
   * @returns {import('../game/types.js').Command[] | null}
   */
  take() {
    if (!this.due() || this.waitingFor().length) return null;
    const { round, frame } = this;
    const commands = [];
    for (let p = 0; p < this.playersAt(round, frame); p++) {
      const key = `${round}:${frame}:${p}`;
      if (this.isLeft(p)) commands.push({ quit: true });
      else commands.push(this.buffer.get(key) ?? {});
      this.buffer.delete(key);
    }
    this.frame++;
    return commands;
  }
}
