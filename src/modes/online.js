// Gra przez internet: komendy wszystkich graczy przez serwer (lockstep) z przewidywaniem (rollback):
// ekran nie czeka na cudze ruchy, a rundę rozstrzyga stan policzony z prawdziwych komend.

import { BOARD_Y, COLORS, PLAYER_COLORS, TICKS_PER_SECOND, TICK_MS, VIEW_W } from '../config.js';
import { createMatch, nextRoundSeed, replayMatch } from '../game/match.js';
import { createRound } from '../game/round.js';
import { INPUT_DELAY, JOIN_GRACE, Lockstep } from '../net/lockstep.js';
import { Rollback } from '../net/rollback.js';
import { mergeCommands } from '../input/touch.js';
import { showRoomInAddressBar } from '../net/client.js';
import { drawPanel, drawText } from '../render/text.js';

/** Ile ticków przestoju, zanim pokażemy „czekam na…” (żeby nie migało przy zwykłym pingu). */
const STALL_NOTICE = 10;
/** Najdalej tyle klatek przewidujemy (ok. 0,45 s); dalej gra czeka na brakujące ruchy. */
const MAX_PREDICT = 8;

/**
 * Podłącza sesję do aplikacji: obsługuje start meczu, ruchy i rozłączenia.
 * @param {any} app @param {import('../net/client.js').Session} session
 */
export function attachSession(app, session) {
  app.session = session;
  session.onMessage = (msg) => {
    if (msg.t === 'start') startMatch(app, session, msg);
    else if (msg.t === 'late') waitToJoin(app, session, msg);
    else if (msg.t === 'lobby') {
      // Mecz się skończył, zanim dołączający zdążył wejść: zwykła poczekalnia
      if (!msg.playing) app.lateJoin = null;
      app.onLobby?.(msg);
    } else if (msg.t === 'result' && app.lateJoin) {
      app.lateJoin.results[msg.r] = msg.w;
      tryLateStart(app, session);
    } else if (app.lateJoin && ['input', 'left', 'joined'].includes(msg.t)) {
      // Jeszcze wchodzimy do gry: ruchy przekażemy kontrolerowi, gdy powstanie
      app.lateJoin.pending.push(msg);
    } else app.controller.receive?.(msg);
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
  app.lateJoin = null;
  showRoomInAddressBar(null);
  app.scenes.go('menu');
}

function startMatch(app, session, { seed, players }) {
  app.lateJoin = null;
  const me = players.findIndex((p) => p.id === session.lobby?.you);
  app.players = players.map((p, i) => ({ name: p.name, color: p.color ?? PLAYER_COLORS[i] }));
  app.match = createMatch(seed, players.length);
  app.controller = createOnlineController(app, session, me);
  app.scenes.go('countdown');
}

/**
 * Dołączenie w trakcie meczu, od razu: serwer podaje rundę r i klatkę f, w której pojawi się nasz wąż,
 * oraz dotychczasowe ruchy tej rundy. Gdy znamy wyniki wcześniejszych rund (zwykle od razu),
 * odtwarzamy u siebie bieżącą rundę i wchodzimy do gry bez odliczania.
 */
function waitToJoin(app, session, { seed, r, f, players, results, left = [], log = [] }) {
  app.lateJoin = { seed, r, f, players, results: [...results], left, log, pending: [], at: performance.now() };
  app.onLobby?.(session.lobby);
  tryLateStart(app, session);
}

function tryLateStart(app, session) {
  const late = app.lateJoin;
  const known = late.results.slice(0, late.r);
  if (known.length < late.r || known.some((w) => w === undefined)) return;
  const match = replayMatch(late.seed, late.players.length, known);
  // Mecz rozstrzygnął się, zanim weszliśmy: czekamy na powrót wszystkich do poczekalni
  if (match.winner !== null) return;

  app.lateJoin = null;
  const me = late.players.findIndex((p) => p.id === session.lobby?.you);
  app.players = late.players.map((p, i) => ({ name: p.name, color: p.color ?? PLAYER_COLORS[i] }));
  app.match = match;
  const controller = createOnlineController(app, session, me, late.players.map((p) => ({ r: p.r, f: p.f ?? 0 })));
  app.controller = controller;
  for (const l of late.left) controller.receive({ t: 'left', ...l });
  for (const [p, f, d, s, m] of late.log) controller.receive({ t: 'input', p, r: late.r, f, d, s, m });
  for (const msg of late.pending) controller.receive(msg);

  // Bez odliczania, prosto do trwającej rundy (wąż pojawi się w klatce late.f)
  app.round = createRound(nextRoundSeed(match), { players: controller.playersInRound(late.r) });
  app.roundNumber = late.r + 1;
  app.effects.clear();
  // Nasz zegar: tam, gdzie są teraz inni (klatka z serwera + czas, który minął od wiadomości)
  const elapsed = Math.floor((performance.now() - late.at) / TICK_MS);
  controller.lateStart = { clock: Math.max(0, late.f - INPUT_DELAY + elapsed), firstOwn: late.f + JOIN_GRACE };
  app.scenes.go('play');
}

/**
 * @param {any} app @param {import('../net/client.js').Session} session @param {number} me
 * @param {({ r: number, f: number } | number)[]} [joins] od kiedy gra każdy gracz
 */
export function createOnlineController(app, session, me, joins) {
  const lock = new Lockstep(app.players.length, me, joins, { maxAhead: MAX_PREDICT });
  const rollback = new Rollback(lock);
  let stalled = 0;

  return {
    canPause: false,
    canSkip: false,
    matchEndTicks: 8 * TICKS_PER_SECOND,
    rematchHint: 'Za chwilę powrót do poczekalni   ESC — wyjście',
    me,

    receive(msg) {
      if (msg.t === 'input') lock.receive(msg);
      else if (msg.t === 'left') lock.markLeft(msg.p, msg.r, msg.f);
      else if (msg.t === 'joined') {
        // Nowy gracz w trakcie meczu: gra od rundy msg.r, do tego czasu nie ma węża
        lock.addPlayer(msg.r, msg.f ?? 0);
        app.players.push({ name: msg.name, color: msg.color ?? PLAYER_COLORS[msg.p] });
        app.match.wins.push(0);
      }
    },

    /** Ilu węży jest w danej rundzie (dołączający wchodzą od swojej rundy). */
    playersInRound: (r) => lock.playersInRound(r),

    /** Wynik rundy dla serwera: potrzebny graczom dołączającym w trakcie meczu. */
    roundEnded(r, result) {
      session.send({ t: 'result', r, w: result.winner });
    },

    /** Ustawiane przy dołączeniu w trakcie rundy: skąd zaczyna zegar i od której klatki wysyłamy ruchy. */
    lateStart: null,

    startRound(r) {
      rollback.startRound(r, app.round);
      if (this.lateStart) {
        lock.clock = this.lateStart.clock;
        lock.sent = Math.max(lock.sent, this.lateStart.firstOwn);
        this.lateStart = null;
      }
      app.round = rollback.display;
      stalled = 0;
    },

    /**
     * Raz na tick: upływ czasu, wysłanie własnej komendy (z klawiatury tylko pierwszej),
     * potwierdzenie tego, co już wiadomo, i przewidywany stan na ekran (app.round).
     * @returns {import('../game/types.js').GameEvent[]} zdarzenia do efektów i dźwięków
     */
    advance() {
      lock.tick();
      let first = true;
      while (lock.canSend()) {
        const cmd = first ? mergeCommands(app.keyboard.consumeMerged(), app.touch.consume()) : {};
        session.send(lock.makeInput(cmd));
        first = false;
      }
      const { events, advanced } = rollback.update();
      app.round = rollback.display;
      stalled = advanced ? 0 : stalled + 1;
      return events;
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
