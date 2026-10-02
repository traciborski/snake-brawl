// Klawiatura: zamienia naciśnięcia klawiszy na komendy graczy dla symulacji.

/** @typedef {import('../game/types.js').Dir} Dir */
/** @typedef {import('../game/types.js').Command} Command */

const DIRS = new Set(['up', 'down', 'left', 'right']);
const MAX_PENDING_TURNS = 3;

export class Keyboard {
  /**
   * @param {Window} target
   * @param {{ keys: Record<string, string[]> }[]} players
   */
  constructor(target, players) {
    this.players = players;
    /** @type {Map<string, { player: number, action: string }>} */
    this.bindings = new Map();
    players.forEach((p, player) => {
      for (const [action, codes] of Object.entries(p.keys)) {
        for (const code of codes) this.bindings.set(code, { player, action });
      }
    });

    /** Klawisze trzymane teraz */
    this.down = new Set();
    /** Klawisze wciśnięte od ostatniego ticka (dla menu i skrótów) */
    this.pressed = new Set();
    /** @type {Dir[][]} */
    this.turns = players.map(() => []);
    this.shootTapped = players.map(() => false);
    /** @type {((e: KeyboardEvent) => void)[]} */
    this.listeners = [];

    target.addEventListener('keydown', (e) => this.onKeyDown(e));
    target.addEventListener('keyup', (e) => this.down.delete(e.code));
    target.addEventListener('blur', () => this.down.clear());
  }

  /** @param {(e: KeyboardEvent) => void} fn */
  onKey(fn) {
    this.listeners.push(fn);
  }

  /** @param {KeyboardEvent} e */
  onKeyDown(e) {
    const binding = this.bindings.get(e.code);
    // Strzałki i Spacja nie mogą przewijać strony
    if (binding) e.preventDefault();
    for (const fn of this.listeners) fn(e);

    this.down.add(e.code);
    if (e.repeat) return;
    this.pressed.add(e.code);

    if (!binding) return;
    if (binding.action === 'shoot') {
      this.shootTapped[binding.player] = true;
    } else if (DIRS.has(binding.action)) {
      const queue = this.turns[binding.player];
      if (queue.length < MAX_PENDING_TURNS) queue.push(/** @type {Dir} */ (binding.action));
    }
  }

  /**
   * Komendy na ten tick. Strzał: krótkie stuknięcie albo trzymanie klawisza
   * (wtedy strzela tak często, jak pozwala cooldown).
   * @returns {Command[]}
   */
  consumeCommands() {
    return this.players.map((p, i) => {
      const turns = this.turns[i];
      this.turns[i] = [];
      const held = p.keys.shoot.some((code) => this.down.has(code));
      const shoot = held || this.shootTapped[i];
      this.shootTapped[i] = false;
      return { turns, shoot };
    });
  }

  /** Czy któryś z klawiszy został wciśnięty od ostatniego ticka. Zużywa naciśnięcie. */
  consumePressed(codes) {
    for (const code of codes) {
      if (this.pressed.delete(code)) return true;
    }
    return false;
  }

  /** Wywoływane po każdym ticku: stare naciśnięcia nie „czekają” na kolejną scenę. */
  endTick() {
    this.pressed.clear();
  }

  reset() {
    this.pressed.clear();
    this.turns = this.players.map(() => []);
    this.shootTapped = this.players.map(() => false);
  }
}
