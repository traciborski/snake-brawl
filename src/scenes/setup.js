// Gra na jednym komputerze: wpisanie imion dwóch graczy.

import { DEFAULT_NAMES, KEYMAPS, NAME_MAX, OFFLINE_PLAYERS, PLAYER_COLORS, VIEW_W } from '../config.js';
import { randomSeed } from '../core/rng.js';
import { createMatch } from '../game/match.js';
import { drawText } from '../render/text.js';
import { h } from '../ui/dom.js';
import { load, save } from '../ui/storage.js';
import { createOfflineController } from '../modes/offline.js';

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
      const inputs = Array.from({ length: OFFLINE_PLAYERS }, (_, i) =>
        h('input', { value: saved[i] ?? DEFAULT_NAMES[i], maxLength: NAME_MAX, placeholder: DEFAULT_NAMES[i], 'aria-label': `Imię gracza ${i + 1}` }),
      );

      const start = (e) => {
        e.preventDefault();
        const names = inputs.map((input, i) => cleanName(input.value, i));
        save('names', names);
        app.controller = createOfflineController(app);
        app.players = names.map((name, i) => ({ name, color: PLAYER_COLORS[i] }));
        app.match = createMatch(randomSeed(), names.length);
        app.scenes.go('countdown');
      };

      const form = h(
        'form',
        { className: 'panel', onsubmit: start, onkeydown: (e) => e.code === 'Escape' && app.scenes.go('menu') },
        h('h2', {}, 'GRACZE'),
        inputs.map((input, i) =>
          h(
            'div',
            { className: 'row' },
            h('span', { className: 'swatch', style: { background: PLAYER_COLORS[i], boxShadow: `0 0 8px ${PLAYER_COLORS[i]}` } }),
            input,
            h('small', {}, KEYMAPS[i].help),
          ),
        ),
        h(
          'div',
          { className: 'buttons' },
          h('button', { type: 'button', onclick: () => app.scenes.go('menu') }, 'WSTECZ'),
          h('button', { type: 'submit' }, 'START'),
        ),
        h('p', { className: 'hint' }, 'Enter — start · Esc — menu'),
      );
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
