// Gra na jednym komputerze: liczba graczy (1–4) i ich imiona. Jeden gracz = trening.

import {
  DEFAULT_NAMES,
  KEYMAPS,
  NAME_MAX,
  OFFLINE_DEFAULT_PLAYERS,
  OFFLINE_MAX_PLAYERS,
  OFFLINE_MIN_PLAYERS,
  PLAYER_COLORS,
  SOLO_HELP,
  VIEW_W,
} from '../config.js';
import { randomSeed } from '../core/rng.js';
import { createMatch } from '../game/match.js';
import { drawText } from '../render/text.js';
import { h } from '../ui/dom.js';
import { load, save } from '../ui/storage.js';
import { createOfflineController } from '../modes/offline.js';

const COUNT_HINTS = {
  1: 'Trening: sam na planszy, bez punktów. Zbieraj owoce, omijaj czerwone ściany.',
  4: 'Gracz 4 potrzebuje klawiatury numerycznej.',
};

/** Liczba graczy w dozwolonym zakresie (np. zapamiętana w przeglądarce). */
export function clampPlayers(n) {
  const count = Math.round(Number(n));
  if (!Number.isFinite(count)) return OFFLINE_DEFAULT_PLAYERS;
  return Math.min(OFFLINE_MAX_PLAYERS, Math.max(OFFLINE_MIN_PLAYERS, count));
}

/** Czyści imię: bez zbędnych spacji, przycięte, a puste zastąpione domyślnym. */
export function cleanName(raw, i) {
  const name = String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
  return name || DEFAULT_NAMES[i];
}

/** @param {any} app */
export function createSetupScene(app) {
  return {
    enter() {
      const saved = load('names', DEFAULT_NAMES);
      let count = clampPlayers(load('offlinePlayers', OFFLINE_DEFAULT_PLAYERS));
      // Pola na imiona wszystkich czterech graczy: przy zmianie liczby graczy wpisane imiona zostają
      const inputs = DEFAULT_NAMES.map((fallback, i) =>
        h('input', { value: saved[i] ?? fallback, maxLength: NAME_MAX, placeholder: fallback, 'aria-label': `Imię gracza ${i + 1}` }),
      );

      const start = (e) => {
        e.preventDefault();
        const names = inputs.slice(0, count).map((input, i) => cleanName(input.value, i));
        save('names', inputs.map((input, i) => cleanName(input.value, i)));
        save('offlinePlayers', count);
        app.controller = createOfflineController(app);
        app.players = names.map((name, i) => ({ name, color: PLAYER_COLORS[i] }));
        app.match = createMatch(randomSeed(), names.length);
        app.scenes.go('countdown');
      };

      const countButtons = [];
      for (let n = OFFLINE_MIN_PLAYERS; n <= OFFLINE_MAX_PLAYERS; n++) {
        countButtons.push(h('button', { type: 'button', className: 'count', onclick: () => setCount(n) }, String(n)));
      }
      const rows = inputs.map((input, i) =>
        h(
          'div',
          { className: 'row' },
          h('span', { className: 'swatch', style: { background: PLAYER_COLORS[i], boxShadow: `0 0 8px ${PLAYER_COLORS[i]}` } }),
          input,
          h('small', {}, KEYMAPS[i].help),
        ),
      );
      const hint = h('p', { className: 'hint' });

      function setCount(n) {
        count = n;
        countButtons.forEach((b, i) => b.classList.toggle('selected', i + OFFLINE_MIN_PLAYERS === n));
        rows.forEach((row, i) => (row.hidden = i >= n));
        rows[0].querySelector('small').textContent = n === 1 ? SOLO_HELP : KEYMAPS[0].help;
        hint.textContent = COUNT_HINTS[n] ?? '';
      }

      const form = h(
        'form',
        {
          className: 'panel',
          onsubmit: start,
          onkeydown: (e) => {
            if (e.code === 'Escape') app.scenes.go('menu');
            // Szybki wybór liczby graczy cyframi, gdy nie piszemy w polu
            const digit = /^Digit([1-4])$/.exec(e.code);
            if (digit && !(e.target instanceof HTMLInputElement)) setCount(Number(digit[1]));
          },
        },
        h('h2', {}, 'GRACZE'),
        h('div', { className: 'row', style: { justifyContent: 'center' } }, h('span', {}, 'Ilu graczy?'), countButtons),
        rows,
        hint,
        h(
          'div',
          { className: 'buttons' },
          h('button', { type: 'button', onclick: () => app.scenes.go('menu') }, 'WSTECZ'),
          h('button', { type: 'submit' }, 'START'),
        ),
        h('p', { className: 'hint' }, 'Enter — start · Esc — menu'),
      );
      setCount(count);
      app.overlay.show(form);
      inputs[0].select();
    },

    exit() {
      app.overlay.hide();
    },

    render() {
      app.renderer.begin();
      drawText(app.renderer.ctx, 'GRA NA JEDNYM KOMPUTERZE', VIEW_W / 2, 80, { size: 20, color: PLAYER_COLORS[0], glow: 12 });
    },
  };
}
