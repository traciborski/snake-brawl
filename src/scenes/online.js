// Gra przez internet: imię, utworzenie pokoju albo dołączenie kodem, poczekalnia.

import { DEFAULT_NAMES, MAX_PLAYERS, NAME_MAX, PLAYER_COLORS, VIEW_W } from '../config.js';
import { joinRoom, serverUrl } from '../net/client.js';
import { normalizeCode, randomCode } from '../net/protocol.js';
import { attachSession, leaveOnline } from '../modes/online.js';
import { drawText } from '../render/text.js';
import { h } from '../ui/dom.js';
import { load, save } from '../ui/storage.js';
import { cleanName } from './setup.js';

/** Ile razy próbujemy nowego kodu, gdy wylosowany jest zajęty. */
const CREATE_ATTEMPTS = 5;

/** @param {any} app */
export function createOnlineScene(app) {
  let busy = false;

  /** Formularz: imię + utwórz / dołącz. */
  function showForm(error = '') {
    const server = serverUrl();
    const name = h('input', {
      value: load('onlineName', load('names', DEFAULT_NAMES)[0]),
      maxLength: NAME_MAX,
      'aria-label': 'Twoje imię',
    });
    const code = h('input', { placeholder: 'KOD', maxLength: 4, 'aria-label': 'Kod pokoju', style: { width: '6em', textTransform: 'uppercase' } });
    const message = h('p', { className: 'hint error' }, error || (server ? '' : 'Serwer gry online nie jest jeszcze ustawiony.'));

    const go = async (create) => {
      if (busy || !server) return;
      const playerName = cleanName(name.value, 0);
      save('onlineName', playerName);
      const joinCode = create ? null : normalizeCode(code.value);
      if (!create && !joinCode) {
        message.textContent = 'Wpisz 4-znakowy kod pokoju';
        code.focus();
        return;
      }
      busy = true;
      message.textContent = create ? 'Tworzę pokój…' : 'Łączę…';
      try {
        let session = null;
        for (let i = 0; !session; i++) {
          try {
            session = await joinRoom(server, create ? randomCode() : joinCode, playerName, create);
          } catch (err) {
            if (!(create && err.code === 'exists' && i < CREATE_ATTEMPTS)) throw err;
          }
        }
        attachSession(app, session);
        showLobby();
      } catch (err) {
        message.textContent = err?.msg ?? 'Coś poszło nie tak';
      } finally {
        busy = false;
      }
    };

    const panel = h(
      'form',
      {
        className: 'panel',
        onsubmit: (e) => {
          e.preventDefault();
          go(!code.value.trim());
        },
        onkeydown: (e) => e.code === 'Escape' && app.scenes.go('menu'),
      },
      h('h2', {}, 'GRA PRZEZ INTERNET'),
      h('div', { className: 'row' }, h('span', { style: { width: '7em' } }, 'Imię'), name),
      h(
        'div',
        { className: 'buttons' },
        h('button', { type: 'button', onclick: () => go(true), disabled: !server }, 'UTWÓRZ POKÓJ'),
      ),
      h('p', { className: 'hint' }, 'albo dołącz do znajomych:'),
      h(
        'div',
        { className: 'row', style: { justifyContent: 'center' } },
        code,
        h('button', { type: 'button', onclick: () => go(false), disabled: !server }, 'DOŁĄCZ'),
      ),
      message,
      h('div', { className: 'buttons' }, h('button', { type: 'button', onclick: () => app.scenes.go('menu') }, 'WSTECZ')),
    );
    app.overlay.show(panel);
    name.select();
  }

  /** Poczekalnia: kod pokoju, lista graczy, start dla założyciela. */
  function showLobby() {
    const lobby = app.session?.lobby;
    if (!lobby) return showForm();
    const isHost = lobby.host === lobby.you;
    const canStart = lobby.players.length >= 2;

    const rows = lobby.players.map((p, i) =>
      h(
        'div',
        { className: 'row' },
        h('span', { className: 'swatch', style: { background: PLAYER_COLORS[i], boxShadow: `0 0 8px ${PLAYER_COLORS[i]}` } }),
        h('span', { style: { color: PLAYER_COLORS[i] } }, p.name),
        h('small', {}, [p.id === lobby.host ? '★ założyciel' : '', p.id === lobby.you ? ' (Ty)' : ''].join('')),
      ),
    );

    const panel = h(
      'div',
      { className: 'panel', onkeydown: (e) => e.code === 'Escape' && leaveOnline(app) },
      h('h2', {}, `POKÓJ  ${lobby.code}`),
      h('p', { className: 'hint' }, 'Podaj ten kod znajomym, żeby dołączyli.'),
      rows,
      h('p', { className: 'hint' }, `${lobby.players.length} / ${MAX_PLAYERS} graczy`),
      h(
        'div',
        { className: 'buttons' },
        h('button', { type: 'button', onclick: () => leaveOnline(app) }, 'WYJDŹ'),
        isHost && h('button', { type: 'button', autofocus: true, disabled: !canStart, onclick: () => app.session?.send({ t: 'start' }) }, 'START'),
      ),
      h(
        'p',
        { className: 'hint' },
        isHost ? (canStart ? 'Kliknij START, gdy wszyscy są.' : 'Czekamy na co najmniej jednego gracza…') : 'Czekamy, aż założyciel zacznie mecz…',
      ),
    );
    app.overlay.show(panel);
  }

  return {
    /** @param {{ lobby?: boolean, error?: string }} [params] */
    enter(params = {}) {
      app.onLobby = () => showLobby();
      if (params.lobby && app.session) showLobby();
      else showForm(params.error);
    },

    exit() {
      app.onLobby = null;
      app.overlay.hide();
    },

    render() {
      app.renderer.begin();
      drawText(app.renderer.ctx, 'GRA PRZEZ INTERNET', VIEW_W / 2, 70, { size: 20, color: PLAYER_COLORS[1], glow: 12 });
      drawText(app.renderer.ctx, '2–4 graczy, każdy na swoim komputerze', VIEW_W / 2, 105, { size: 10, color: '#7a80a8' });
    },
  };
}
