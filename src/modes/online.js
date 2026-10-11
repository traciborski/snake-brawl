// Gra przez internet: komendy wszystkich graczy przez serwer (lockstep).

import { BOARD_Y, COLORS, PLAYER_COLORS, TICKS_PER_SECOND, VIEW_W } from '../config.js';
import { createMatch } from '../game/match.js';
import { Lockstep } from '../net/lockstep.js';
import { mergeCommands } from '../input/touch.js';
import { showRoomInAddressBar } from '../net/client.js';
import { drawPanel, drawText } from '../render/text.js';

/** Ile ticków przestoju, zanim pokażemy „czekam na…” (żeby nie migało przy zwykłym pingu). */
const STALL_NOTICE = 10;

/**
 * Podłącza sesję do aplikacji: obsługuje start meczu, ruchy i rozłączenia.
 * @param {any} app @param {import('../net/client.js').Session} session
 */
export function attachSession(app, session) {
  app.session = session;
  session.onMessage = (msg) => {
    if (msg.t === 'start') startMatch(app, session, msg);
    else if (msg.t === 'lobby') app.onLobby?.(msg);
    else app.controller.receive?.(msg);
  };
  session.onClose = () => {
    app.session = null;
    app.scenes.go('online', { error: 'Połączenie z serwerem zostało zerwane' });
  };
}

/** Wyjście z pokoju i powrót do menu. */
export function leaveOnline(app) {
  app.session?.close();
  app.session = null;
  showRoomInAddressBar(null);
  app.scenes.go('menu');
}

function startMatch(app, session, { seed, players }) {
  const me = players.findIndex((p) => p.id === session.lobby?.you);
  app.players = players.map((p, i) => ({ name: p.name, color: PLAYER_COLORS[i] }));
  app.match = createMatch(seed, players.length);
  app.controller = createOnlineController(app, session, me);
  app.scenes.go('countdown');
}

/** @param {any} app @param {import('../net/client.js').Session} session @param {number} me */
export function createOnlineController(app, session, me) {
  const lock = new Lockstep(app.players.length, me);
  let stalled = 0;
  let steps = 0;

  return {
    canPause: false,
    canSkip: false,
    maxSteps: 2, // kto został w tyle, nadrabia najwyżej jedną klatkę na tick
    matchEndTicks: 8 * TICKS_PER_SECOND,
    rematchHint: 'Za chwilę powrót do poczekalni   ESC — wyjście',
    me,

    receive(msg) {
      if (msg.t === 'input') lock.receive(msg);
      else if (msg.t === 'left') lock.markLeft(msg.p, msg.r, msg.f);
    },

    startRound(r) {
      lock.startRound(r);
      stalled = 0;
    },

    /** Raz na tick: upływ czasu i wysłanie własnej komendy (z klawiatury tylko pierwszej). */
    beforeTick() {
      lock.tick();
      let first = true;
      while (lock.canSend()) {
        const cmd = first ? mergeCommands(app.keyboard.consumeMerged(), app.touch.consume()) : {};
        session.send(lock.makeInput(cmd));
        first = false;
      }
      steps = 0;
    },

    commands() {
      // Drugi krok w tym samym ticku tylko wtedy, gdy symulacja jest za zegarem
      if (!lock.due() || (steps > 0 && lock.behind() === 0)) return null;
      const commands = lock.take();
      stalled = commands ? 0 : stalled + 1;
      if (commands) steps++;
      return commands;
    },

    /** Mniej niż dwóch graczy w pokoju: mecz nie ma sensu, wracamy do poczekalni. */
    shouldEndMatch: () => lock.activePlayers() < 2,

    drawStatus(ctx) {
      if (stalled < STALL_NOTICE) return;
      const names = lock.waitingFor().map((p) => app.players[p].name);
      if (!names.length) return;
      drawPanel(ctx, VIEW_W / 2, BOARD_Y + 30, 520, 40);
      drawText(ctx, `Czekam na: ${names.join(', ')}`, VIEW_W / 2, BOARD_Y + 30, { size: 10, color: COLORS.text });
    },

    leave: () => leaveOnline(app),

    rematch() {
      session.send({ t: 'lobby' });
      app.scenes.go('online', { lobby: true });
    },
  };
}
