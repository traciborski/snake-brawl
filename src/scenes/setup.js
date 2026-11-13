// Gra na jednym komputerze: liczba graczy (1–4) i ich imiona. Jeden gracz = trening.

import {
  DEFAULT_NAMES,
  BOT_MAX_COUNT,
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
import { createBotController } from '../modes/bots.js';
import { nextColor, pickColor } from '../net/protocol.js';
import { paintSwatch, swatch } from '../ui/swatch.js';

const COUNT_HINTS = {
  1: 'Trening: sam na planszy, bez punktów. Zbieraj owoce, omijaj czerwone ściany.',
  4: 'Gracz 4 potrzebuje klawiatury numerycznej.',
};
const BOT_DIFFICULTY_NAMES = { easy: 'łatwy', medium: 'średni', hard: 'trudny' };
const BOT_DIFFICULTIES = Object.keys(BOT_DIFFICULTY_NAMES);

function botCountLabel(n) {
  if (n === 1) return '1 bot';
  return `${n} ${n <= 4 ? 'boty' : 'botów'}`;
}

export function clampBots(n) {
  const count = Math.round(Number(n));
  if (!Number.isFinite(count)) return 2;
  return Math.min(BOT_MAX_COUNT, Math.max(1, count));
}

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

/** Zapamiętane kolory graczy offline, bez powtórzeń (powtórzony dostaje pierwszy wolny). */
export function savedColors(saved) {
  const colors = [];
  for (let i = 0; i < OFFLINE_MAX_PLAYERS; i++) colors.push(pickColor(saved?.[i] ?? PLAYER_COLORS[i], colors));
  return colors;
}

/** @param {any} app */
export function createSetupScene(app) {
  let botMode = false;

  return {
    enter(params = {}) {
      botMode = !!params.bots;
      const saved = load('names', DEFAULT_NAMES);
      let count = botMode
        ? clampBots(load('botCount', 3))
        : clampPlayers(load('offlinePlayers', OFFLINE_DEFAULT_PLAYERS));
      const savedDifficulty = load('botDifficulty', 'medium');
      let difficulty = BOT_DIFFICULTIES.includes(savedDifficulty) ? savedDifficulty : 'medium';
      // Pola na imiona wszystkich czterech graczy: przy zmianie liczby graczy wpisane imiona zostają
      const inputs = DEFAULT_NAMES.slice(0, OFFLINE_MAX_PLAYERS).map((fallback, i) =>
        h('input', { value: saved[i] ?? fallback, maxLength: NAME_MAX, placeholder: fallback, 'aria-label': `Imię gracza ${i + 1}` }),
      );

      // Kolory: klik w kwadracik zmienia na następny, którego nie ma żaden inny gracz
      const colors = savedColors(load('colors', PLAYER_COLORS));

      const start = (e) => {
        e.preventDefault();
        const names = inputs.slice(0, botMode ? 1 : count).map((input, i) => cleanName(input.value, i));
        save('names', inputs.map((input, i) => cleanName(input.value, i)));
        save(botMode ? 'botCount' : 'offlinePlayers', count);
        save('colors', colors.slice(0, botMode ? 1 : count));
        if (botMode) {
          save('botDifficulty', difficulty);
          const taken = [colors[0]];
          app.players = [
            { name: names[0], color: colors[0] },
            ...Array.from({ length: count }, (_, i) => {
              const color = pickColor(PLAYER_COLORS[i + 1], taken);
              taken.push(color);
              return { name: `Bot ${i + 1}`, color };
            }),
          ];
          app.controller = createBotController(app, difficulty);
        } else {
          app.players = names.map((name, i) => ({ name, color: colors[i] }));
          app.controller = createOfflineController(app);
        }
        app.match = createMatch(randomSeed(), app.players.length);
        app.scenes.go('countdown');
      };

      // Zajęte są tylko kolory widocznych graczy (ukryci 3. i 4. gracz niczego nie blokują)
      const swatches = colors.map((c, i) =>
        swatch(c, () => {
          const visibleCount = botMode ? 1 : count;
          colors[i] = nextColor(colors[i], colors.slice(0, visibleCount).filter((_, j) => j !== i));
          paintSwatch(swatches[i], colors[i]);
        }),
      );

      const countButtons = [];
      const maxCount = botMode ? BOT_MAX_COUNT : OFFLINE_MAX_PLAYERS;
      for (let n = 1; n <= maxCount; n++) {
        countButtons.push(h('button', { type: 'button', className: 'count', onclick: () => setCount(n) }, String(n)));
      }
      const rows = inputs.map((input, i) =>
        h(
          'div',
          { className: 'row' },
          swatches[i],
          input,
          h('small', {}, KEYMAPS[i].help),
        ),
      );
      const hint = h('p', { className: 'hint' });
      const colorHint = h('p', { className: 'hint' }, 'Kliknij kwadracik, żeby zmienić kolor węża.');
      const difficultyButtons = BOT_DIFFICULTIES.map((level) =>
        h('button', {
          type: 'button',
          className: 'count',
          onclick: () => setDifficulty(level),
        }, level === 'easy' ? 'ŁATWY' : level === 'medium' ? 'ŚREDNI' : 'TRUDNY'),
      );

      function setDifficulty(level) {
        difficulty = level;
        difficultyButtons.forEach((button, i) => button.classList.toggle('selected', BOT_DIFFICULTIES[i] === level));
        hint.textContent = `${botCountLabel(count)} · trudność: ${BOT_DIFFICULTY_NAMES[level]}`;
      }

      function setCount(n) {
        count = botMode ? clampBots(n) : clampPlayers(n);
        // Nowo widoczny gracz z kolorem kogoś innego dostaje pierwszy wolny
        const visibleCount = botMode ? 1 : count;
        for (let i = 0; i < visibleCount; i++) {
          colors[i] = pickColor(colors[i], colors.slice(0, i));
          paintSwatch(swatches[i], colors[i]);
        }
        countButtons.forEach((b, i) => b.classList.toggle('selected', i + 1 === count));
        rows.forEach((row, i) => (row.hidden = i >= visibleCount));
        rows[0].querySelector('small').textContent = botMode || count === 1 ? SOLO_HELP : KEYMAPS[0].help;
        hint.textContent = botMode ? `${botCountLabel(count)} · trudność: ${BOT_DIFFICULTY_NAMES[difficulty]}` : COUNT_HINTS[count] ?? '';
      }

      const form = h(
        'form',
        {
          className: 'panel',
          onsubmit: start,
          onkeydown: (e) => {
            if (e.code === 'Escape') app.scenes.go('menu');
            // Szybki wybór liczby graczy cyframi, gdy nie piszemy w polu
            const digit = /^Digit([1-5])$/.exec(e.code);
            if (digit && !(e.target instanceof HTMLInputElement) && Number(digit[1]) <= maxCount) setCount(Number(digit[1]));
          },
        },
        h('h2', {}, botMode ? 'GRA Z BOTAMI' : 'GRACZE'),
        h('div', { className: 'row', style: { justifyContent: 'center' } }, h('span', {}, botMode ? 'Ilu botów?' : 'Ilu graczy?'), countButtons),
        rows,
        botMode && h(
          'div',
          { className: 'row', style: { justifyContent: 'center' } },
          h('span', {}, 'Trudność'),
          difficultyButtons,
        ),
        colorHint,
        hint,
        h(
          'div',
          { className: 'buttons' },
          h('button', { type: 'button', onclick: () => app.scenes.go('menu') }, 'WSTECZ'),
          h('button', { type: 'submit' }, 'START'),
        ),
        h('p', { className: 'hint' }, 'Enter — start · Esc — menu'),
      );
      setDifficulty(difficulty);
      setCount(count);
      app.overlay.show(form);
      inputs[0].select();
    },

    exit() {
      app.overlay.hide();
    },

    render() {
      app.renderer.begin();
      drawText(app.renderer.ctx, botMode ? 'GRA Z BOTAMI' : 'GRA NA JEDNYM KOMPUTERZE', VIEW_W / 2, 80, { size: 20, color: PLAYER_COLORS[0], glow: 12 });
    },
  };
}
