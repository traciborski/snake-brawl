// Miecz: atak z bliska. Po wciśnięciu wokół głowy wiruje ostrze (przez SWORD_TICKS ticków)
// i w kole o promieniu SWORD_RADIUS pól wokół głowy:
// - głowa rywala → śmierć,
// - ciało rywala → odcięcie ogona od pierwszego segmentu w zasięgu (jak trafienie pociskiem),
// - cudze pociski → zniszczone.
// Ściany nie zasłaniają. Zasięg liczy się też przez krawędź planszy (plansza jest „zawinięta”).
// Własny wąż i własne pociski są bezpieczne. Wszystkie miecze tnące w tym samym ticku działają
// naraz, więc dwa węże z mieczami w swoim zasięgu giną oba.

import { SWORD_COOLDOWN, SWORD_RADIUS, SWORD_TICKS } from '../config.js';
import { kill } from './snake.js';

/** @typedef {import('./types.js').RoundState} RoundState */
/** @typedef {import('./types.js').Snake} Snake */
/** @typedef {import('./types.js').Pos} Pos */
/** @typedef {import('./types.js').GameEvent} GameEvent */

/** @param {Snake} snake */
export function canSwing(snake) {
  return snake.alive && snake.swordCooldown === 0;
}

/** Wciśnięcie miecza: ostrze zaczyna wirować. @returns {boolean} czy zadziałało */
export function swing(snake, events) {
  if (!canSwing(snake)) return false;
  snake.swordTicks = SWORD_TICKS;
  snake.swordCooldown = SWORD_COOLDOWN;
  events.push({ type: 'swordSwing', snake: snake.id, pos: { ...snake.body[0] } });
  return true;
}

/** Czy pole p leży w kole miecza wokół pola center (z zawinięciem przez krawędzie). */
export function inSwordRange(grid, center, p) {
  const ax = Math.abs(p.x - center.x);
  const ay = Math.abs(p.y - center.y);
  const dx = Math.min(ax, grid.w - ax);
  const dy = Math.min(ay, grid.h - ay);
  return dx * dx + dy * dy <= SWORD_RADIUS * SWORD_RADIUS;
}

/**
 * Cięcia wszystkich wirujących mieczy w tym ticku (po ruchu węży i pocisków).
 * @param {RoundState} state @param {GameEvent[]} events
 */
export function applySwords(state, events) {
  const swords = state.snakes.filter((s) => s.alive && s.swordTicks > 0);
  if (!swords.length) return;

  // Najpierw zbieramy wszystkie trafienia (miecze działają naraz), potem je stosujemy
  /** @type {Map<Snake, { by: number, index: number }>} */
  const cuts = new Map();
  const goneBullets = new Set();
  for (const sword of swords) {
    const center = sword.body[0];
    for (const target of state.snakes) {
      if (target === sword || !target.alive) continue;
      const index = target.body.findIndex((p) => inSwordRange(state.grid, center, p));
      if (index < 0) continue;
      const prev = cuts.get(target);
      if (!prev || index < prev.index) cuts.set(target, { by: sword.id, index });
    }
    for (const b of state.bullets) {
      if (b.owner !== sword.id && inSwordRange(state.grid, center, b.pos)) goneBullets.add(b);
    }
  }

  for (const b of goneBullets) events.push({ type: 'bulletClash', pos: { ...b.pos } });
  state.bullets = state.bullets.filter((b) => !goneBullets.has(b));

  for (const [target, { by, index }] of cuts) {
    if (index === 0) kill(target, 'sword', by, events);
    else events.push({ type: 'bodyHit', snake: target.id, by, cells: target.body.splice(index) });
  }

  for (const sword of swords) sword.swordTicks--;
}
