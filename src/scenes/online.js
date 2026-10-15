// Gra przez internet: imię, utworzenie pokoju albo dołączenie kodem, poczekalnia.

import { DEFAULT_NAMES, MAX_PLAYERS, NAME_MAX, PLAYER_COLORS, VIEW_W } from '../config.js';
import { joinRoom, roomLink, roomsPage, serverUrl, showRoomInAddressBar } from '../net/client.js';
import { PUBLIC_ROOMS, nextColor, normalizeCode, pickColor, randomCode } from '../net/protocol.js';
import { paintSwatch, swatch } from '../ui/swatch.js';
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

  /**
   * Formularz: imię + utwórz / dołącz. Z linku zaproszenia (inviteCode) kod jest już wpisany,
   * a Enter od razu dołącza.
   */
  function showForm(error = '', inviteCode = null) {
    const server = serverUrl();
    const name = h('input', {
      value: load('onlineName', load('names', DEFAULT_NAMES)[0]),
      maxLength: NAME_MAX,
      'aria-label': 'Twoje imię',
    });
    const code = h('input', {
      value: inviteCode ?? '',
      placeholder: 'KOD',
      maxLength: 4,
      'aria-label': 'Kod pokoju',
      style: { width: '6em', textTransform: 'uppercase' },
    });
    const message = h('p', { className: 'hint error' }, error || (server ? '' : 'Serwer gry online nie jest jeszcze ustawiony.'));
    // Wybrany kolor (gdy w pokoju ktoś już go ma, serwer da pierwszy wolny; w poczekalni można zmienić)
    let color = pickColor(load('onlineColor', PLAYER_COLORS[0]), []);
    const colorPick = swatch(color, () => {
      color = nextColor(color, []);
      paintSwatch(colorPick, color);
      save('onlineColor', color);
    });

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
            session = await joinRoom(server, create ? randomCode() : joinCode, playerName, create, color);
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
        onsubmit: (e) => e.preventDefault(),
        // Enter w polu: z wpisanym kodem dołącza, bez kodu tworzy pokój
        // (formularz z dwoma polami i bez przycisku „submit” sam się nie wysyła)
        onkeydown: (e) => {
          if (e.code === 'Escape') app.scenes.go('menu');
          if ((e.code === 'Enter' || e.code === 'NumpadEnter') && e.target instanceof HTMLInputElement) {
            e.preventDefault();
            go(!code.value.trim());
          }
        },
      },
      h('h2', {}, inviteCode ? (PUBLIC_ROOMS.includes(inviteCode) ? `POKÓJ PUBLICZNY ${inviteCode}` : `ZAPROSZENIE DO POKOJU ${inviteCode}`) : 'GRA PRZEZ INTERNET'),
      inviteCode && h('p', { className: 'hint' }, 'Wpisz swoje imię i wciśnij Enter, żeby dołączyć.'),
      h('div', { className: 'row' }, h('span', { style: { width: '7em' } }, 'Imię'), colorPick, name),
      h('p', { className: 'hint' }, 'Kliknij kwadracik, żeby zmienić kolor węża.'),
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
      h(
        'div',
        { className: 'buttons' },
        h('button', { type: 'button', onclick: () => app.scenes.go('menu') }, 'WSTECZ'),
        // Lista pokoi jest stroną serwera gry, więc tylko gdy gra przyszła z serwera (nie z dysku)
        server && location.protocol !== 'file:' && h('button', { type: 'button', onclick: () => location.assign(roomsPage()) }, 'LISTA POKOI'),
      ),
    );
    app.overlay.show(panel);
    name.select();
  }

  /** Poczekalnia: kod pokoju, lista graczy, start dla założyciela. */
  function showLobby() {
    const lobby = app.session?.lobby;
    if (!lobby) return showForm();
    showRoomInAddressBar(lobby.code);
    const playing = !!lobby.playing;
    const isHost = lobby.host === lobby.you && !playing;
    const canStart = lobby.players.length >= 2;
    // Dołączyliśmy w trakcie meczu: wchodzimy od rundy lateJoin.r (numerujemy od 1 dla ludzi)
    const status = playing
      ? app.lateJoin
        ? `Trwa mecz. Dołączysz od rundy ${app.lateJoin.r + 1}…`
        : 'Mecz właśnie się kończy, za chwilę wszyscy wrócą tutaj…'
      : isHost
        ? canStart
          ? 'Kliknij START, gdy wszyscy są.'
          : 'Czekamy na co najmniej jednego gracza…'
        : lobby.public
          ? 'Czekamy, aż gospodarz (pierwszy w pokoju) zacznie mecz…'
          : 'Czekamy, aż założyciel zacznie mecz…';

    const rows = lobby.players.map((p, i) =>
      h(
        'div',
        { className: 'row' },
        // Własny kolor można zmienić w poczekalni (serwer pilnuje, żeby się nie powtarzał)
        p.id === lobby.you && !playing
          ? swatch(p.color, () => {
              const next = nextColor(p.color, lobby.players.filter((o) => o.id !== p.id).map((o) => o.color));
              save('onlineColor', next);
              app.session?.send({ t: 'color', c: next });
            })
          : swatch(p.color ?? PLAYER_COLORS[i]),
        h('span', { style: { color: p.color ?? PLAYER_COLORS[i] } }, p.name),
        h('small', {}, [p.id === lobby.host ? (lobby.public ? '★ gospodarz' : '★ założyciel') : '', p.id === lobby.you ? ' (Ty)' : ''].join('')),
      ),
    );

    const panel = h(
      'div',
      { className: 'panel', onkeydown: (e) => e.code === 'Escape' && leaveOnline(app) },
      h('h2', {}, lobby.public ? `POKÓJ PUBLICZNY  ${lobby.code}` : `POKÓJ  ${lobby.code}`),
      h('p', { className: 'hint' }, 'Wyślij znajomym link (albo sam kod), żeby dołączyli:'),
      linkRow(lobby.code),
      rows,
      h('p', { className: 'hint' }, `${lobby.players.length} / ${MAX_PLAYERS} graczy`),
      h(
        'div',
        { className: 'buttons' },
        h('button', { type: 'button', onclick: () => leaveOnline(app) }, 'WYJDŹ'),
        isHost && h('button', { type: 'button', autofocus: true, disabled: !canStart, onclick: () => app.session?.send({ t: 'start' }) }, 'START'),
      ),
      h('p', { className: 'hint' }, status),
    );
    app.overlay.show(panel);
  }

  /** Link zaproszenia z przyciskiem kopiowania. */
  function linkRow(code) {
    const link = h('input', { value: roomLink(code), readOnly: true, 'aria-label': 'Link do pokoju', style: { width: '24em', fontSize: '0.7em' } });
    const copy = h('button', { type: 'button' }, 'KOPIUJ LINK');
    copy.addEventListener('click', async () => {
      link.select();
      try {
        await navigator.clipboard.writeText(link.value);
      } catch {
        document.execCommand?.('copy'); // starsze przeglądarki i strona z dysku
      }
      copy.textContent = 'SKOPIOWANO!';
      setTimeout(() => (copy.textContent = 'KOPIUJ LINK'), 1500);
    });
    return h('div', { className: 'row', style: { justifyContent: 'center' } }, link, copy);
  }

  return {
    /** @param {{ lobby?: boolean, error?: string, invite?: string }} [params] */
    enter(params = {}) {
      app.onLobby = () => showLobby();
      if (params.lobby && app.session) showLobby();
      else showForm(params.error, params.invite ?? null);
    },

    exit() {
      app.onLobby = null;
      app.overlay.hide();
    },

    render() {
      app.renderer.begin();
      drawText(app.renderer.ctx, 'GRA PRZEZ INTERNET', VIEW_W / 2, 70, { size: 20, color: PLAYER_COLORS[1], glow: 12 });
      drawText(app.renderer.ctx, `2–${MAX_PLAYERS} graczy, każdy na swoim komputerze`, VIEW_W / 2, 105, { size: 10, color: '#7a80a8' });
    },
  };
}
