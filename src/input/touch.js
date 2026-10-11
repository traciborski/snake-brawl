// Sterowanie dotykiem (telefon, tablet): przesunięcie palcem w dowolnym miejscu skręca węża,
// przycisk STRZAŁ (można przytrzymać) strzela. Daje te same komendy co klawiatura.
//
// Sterowanie włącza się samo przy pierwszym dotknięciu ekranu. Kto gra myszą i klawiaturą,
// nigdy go nie zobaczy. Przycisk widać tylko w trakcie rundy (setVisible).

/** @typedef {import('../game/types.js').Dir} Dir */
/** @typedef {import('../game/types.js').Command} Command */

/** Jak daleko (w pikselach ekranu) trzeba przesunąć palec, żeby skręcić. */
export const SWIPE_PX = 24;
const MAX_PENDING_TURNS = 3;

/** Kierunek przesunięcia albo null, jeśli palec przesunął się za mało. */
export function swipeDir(dx, dy, threshold = SWIPE_PX) {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

export class Touch {
  /**
   * @param {EventTarget} target  gdzie słuchać palców (okno)
   * @param {HTMLElement | null} fireButton
   */
  constructor(target, fireButton = null) {
    this.fireButton = fireButton;
    /** czy ktoś już grał dotykiem na tym urządzeniu */
    this.active = false;
    this.visible = false;
    /** @type {Map<number, { x: number, y: number }>} początek bieżącego ruchu każdego palca */
    this.swipes = new Map();
    /** @type {Dir[]} */
    this.turns = [];
    this.firing = false;
    this.fireTapped = false;
    /** @type {(() => void)[]} */
    this.onFirstTouch = [];

    target.addEventListener('pointerdown', (e) => this.down(/** @type {PointerEvent} */ (e)));
    target.addEventListener('pointermove', (e) => this.move(/** @type {PointerEvent} */ (e)));
    for (const type of ['pointerup', 'pointercancel']) {
      target.addEventListener(type, (e) => this.swipes.delete(/** @type {PointerEvent} */ (e).pointerId));
    }

    if (fireButton) {
      fireButton.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.firing = true;
        this.fireTapped = true;
      });
      for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
        fireButton.addEventListener(type, () => (this.firing = false));
      }
    }
  }

  /** @param {PointerEvent} e */
  down(e) {
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
    if (!this.active) {
      this.active = true;
      this.updateButton();
      for (const fn of this.onFirstTouch) fn();
    }
    if (!this.visible || e.target === this.fireButton) return;
    this.swipes.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  /** Każde przesunięcie o SWIPE_PX daje skręt; bez odrywania palca można skręcać dalej. */
  move(e) {
    const start = this.swipes.get(e.pointerId);
    if (!start) return;
    const dir = swipeDir(e.clientX - start.x, e.clientY - start.y);
    if (!dir) return;
    if (this.turns[this.turns.length - 1] !== dir && this.turns.length < MAX_PENDING_TURNS) this.turns.push(dir);
    this.swipes.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  /** Przycisk STRZAŁ i przesuwanie działają tylko w trakcie rundy. */
  setVisible(visible) {
    if (visible === this.visible) return;
    this.visible = visible;
    if (!visible) this.reset();
    this.updateButton();
  }

  updateButton() {
    if (this.fireButton) this.fireButton.hidden = !(this.active && this.visible);
  }

  /** @returns {Command} komenda na ten tick (jak z klawiatury) */
  consume() {
    const cmd = { turns: this.turns, shoot: this.firing || this.fireTapped };
    this.turns = [];
    this.fireTapped = false;
    return cmd;
  }

  reset() {
    this.swipes.clear();
    this.turns = [];
    this.firing = false;
    this.fireTapped = false;
  }
}

/** Łączy dwie komendy w jedną (np. klawiatura + dotyk). @param {Command} a @param {Command} b */
export function mergeCommands(a, b) {
  return { turns: [...(a.turns ?? []), ...(b.turns ?? [])], shoot: !!(a.shoot || b.shoot) };
}
