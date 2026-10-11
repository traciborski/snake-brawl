// Lockstep: każdy komputer liczy tę samą symulację z tych samych komend.
// Komendy są numerowane (runda, klatka). Własna komenda działa INPUT_DELAY klatek później,
// żeby zdążyła dolecieć do innych. Krok symulacji robimy tylko, gdy mamy komendy wszystkich.
//
// Tempo wyznacza lokalny zegar (clock: ticki od początku rundy, co 50 ms):
// - wysyłamy dokładnie jedną komendę na tick (na klatkę clock + INPUT_DELAY),
// - symulacja nie wyprzedza zegara (klatka < clock), więc gra nigdy nie biegnie szybciej
//   niż w trybie offline; kto został w tyle, nadrabia najwyżej o jedną klatkę na tick.
// Czysta logika, bez sieci (wysyłaniem zajmuje się kontroler trybu online).

import { decodeCommand, encodeCommand } from './protocol.js';

export const INPUT_DELAY = 2; // 100 ms

export class Lockstep {
  /** @param {number} players liczba graczy @param {number} me mój numer gracza */
  constructor(players, me) {
    this.players = players;
    this.me = me;
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
    if (this.round >= 0) this.clock++;
  }

  /** Czy wysłać kolejną własną komendę: jedna na tick, na klatkę clock + INPUT_DELAY. */
  canSend() {
    return this.round >= 0 && this.sent <= this.clock + INPUT_DELAY;
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
  receive({ p, r, f, d, s }) {
    if (p === this.me) return;
    this.buffer.set(`${r}:${f}:${p}`, decodeCommand({ d, s }));
  }

  /** Gracz się rozłączył: od klatki (r, f) jego wąż ginie. */
  markLeft(p, r, f) {
    this.left.set(p, { r, f });
  }

  isLeft(p, r = this.round, f = this.frame) {
    const at = this.left.get(p);
    return !!at && (r > at.r || (r === at.r && f >= at.f));
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
    for (let p = 0; p < this.players; p++) {
      if (this.frame < INPUT_DELAY || this.isLeft(p)) continue;
      if (!this.buffer.has(`${this.round}:${this.frame}:${p}`)) missing.push(p);
    }
    return missing;
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
    for (let p = 0; p < this.players; p++) {
      const key = `${round}:${frame}:${p}`;
      if (this.isLeft(p)) commands.push({ quit: true });
      else commands.push(this.buffer.get(key) ?? {});
      this.buffer.delete(key);
    }
    this.frame++;
    return commands;
  }
}
