// Przewidywanie w grze online (rollback): ekran nie czeka na ruchy innych graczy.
//
// - Stan potwierdzony liczymy tylko z prawdziwych komend wszystkich graczy (jak w lockstepie),
//   więc jest identyczny na każdym komputerze i to on rozstrzyga rundę.
// - Na ekranie jest stan przewidywany: kopia potwierdzonego, policzona dalej aż do bieżącego
//   ticka. Nasze komendy znamy, a brakujące cudze zastępujemy „nic nie robi” (jedzie prosto).
// - Gdy przyjdą prawdziwe komendy, potwierdzony stan idzie do przodu, a przewidywany liczymy
//   od nowa. Cudzy wąż, który skręcił wcześniej, niż przewidzieliśmy, przeskakuje wtedy na
//   właściwe miejsce, ale gra się nie zatrzymuje.
// - Przewidujemy najwyżej lock.maxAhead klatek do przodu. Dalej zegar staje (czekamy).
// Czysta logika: bez sieci i bez rysowania.

import { cloneRound, stepRound } from '../game/round.js';

/** Zdarzenia, które od razu pokazujemy z przewidywania (własny strzał i miecz bez czekania na sieć). */
const INSTANT = new Set(['shot', 'swordSwing']);

export class Rollback {
  /** @param {import('./lockstep.js').Lockstep} lock */
  constructor(lock) {
    this.lock = lock;
    /** @type {import('../game/types.js').RoundState | null} */
    this.confirmed = null;
    /** @type {import('../game/types.js').RoundState | null} stan na ekranie */
    this.display = null;
    this.shownFrame = 0;
    /** @type {((state: import('../game/types.js').RoundState) => void) | null} po każdej potwierdzonej klatce (testy) */
    this.onConfirm = null;
  }

  /** @param {number} r @param {import('../game/types.js').RoundState} round */
  startRound(r, round) {
    this.lock.startRound(r);
    this.confirmed = round;
    this.display = cloneRound(round);
    this.shownFrame = 0;
  }

  /**
   * Po ticku zegara (lock.tick() i wysłanie własnej komendy robi kontroler).
   * @returns {{ events: import('../game/types.js').GameEvent[], advanced: boolean }}
   *   zdarzenia do efektów i dźwięków; advanced = czy obraz poszedł do przodu
   */
  update() {
    const { lock } = this;
    const me = lock.me;
    const events = [];
    let commands;
    while (!this.confirmed.result && (commands = lock.take())) {
      for (const e of stepRound(this.confirmed, commands)) {
        // Własny strzał i miecz pokazaliśmy już z przewidywania
        if (!(INSTANT.has(e.type) && e.snake === me)) events.push(e);
      }
      this.onConfirm?.(this.confirmed);
    }

    const target = lock.clock;
    const advanced = target > this.shownFrame;
    if (this.confirmed.result) {
      this.display = this.confirmed;
      this.shownFrame = target;
      return { events, advanced };
    }

    const display = cloneRound(this.confirmed);
    for (let f = lock.frame; f < target; f++) {
      const step = stepRound(display, lock.commandsAt(f));
      if (f >= this.shownFrame) {
        for (const e of step) if (INSTANT.has(e.type) && e.snake === me) events.push(e);
      }
    }
    // Koniec rundy rozstrzyga tylko stan potwierdzony
    display.result = null;
    this.display = display;
    this.shownFrame = Math.max(this.shownFrame, target);
    return { events, advanced };
  }
}
