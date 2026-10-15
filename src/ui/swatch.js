// Kwadracik koloru gracza. Klikalny: każde kliknięcie zmienia kolor na następny wolny.

import { h } from './dom.js';

/** Maluje kwadracik na dany kolor (z poświatą). */
export function paintSwatch(el, color) {
  el.style.background = color;
  el.style.boxShadow = `0 0 8px ${color}`;
}

/**
 * @param {string} color
 * @param {(() => void) | null} onPick  kliknięcie (null = zwykły, nieklikalny kwadracik)
 */
export function swatch(color, onPick = null) {
  const el = onPick
    ? h('button', { type: 'button', className: 'swatch pick', title: 'Kliknij, żeby zmienić kolor', 'aria-label': 'Zmień kolor', onclick: onPick })
    : h('span', { className: 'swatch' });
  paintSwatch(el, color);
  return el;
}
