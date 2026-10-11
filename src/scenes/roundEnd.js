import { BOARD_Y, CELL, COLORS, GRID_H, KEYS, TICKS_PER_SECOND, VIEW_W } from '../config.js';
import { recordRound } from '../game/match.js';
import { formatTime } from '../render/hud.js';
import { load, save } from '../ui/storage.js';
import { drawRoundView } from '../render/view.js';
import { blink, dimScreen, drawPanel, drawScore, drawText } from '../render/text.js';

const MIN_TICKS = 1 * TICKS_PER_SECOND; // nie da się przeklikać od razu
const AUTO_TICKS = 4 * TICKS_PER_SECOND;

const DEATH = {
  shot: 'Strzał w głowę',
  wall: 'Rywal wjechał w czerwoną ścianę',
  body: 'Rywal wjechał w ogon',
  crash: 'Zderzenie głowami',
  left: 'Rywal wyszedł z gry',
};

const SOLO_DEATH = {
  wall: 'Czerwona ściana',
  left: 'Koniec treningu',
};

/**
 * Trening: wynik to zjedzone owoce, najlepszy zapamiętujemy w przeglądarce.
 * @param {import('../game/types.js').RoundState} round
 */
function describeSolo(round) {
  const snake = round.snakes[0];
  const best = load('soloBest', 0);
  const record = snake.eaten > best;
  if (record) save('soloBest', snake.eaten);
  return {
    title: record ? 'NOWY REKORD!' : 'KONIEC PRÓBY',
    subtitle: `OWOCE: ${snake.eaten}   CZAS: ${formatTime(round.tick)}`,
    color: record ? COLORS.food : COLORS.text,
    detail: `${SOLO_DEATH[snake.death] ?? 'Wąż odpadł'} · rekord: ${Math.max(best, snake.eaten)} owoców`,
  };
}

/**
 * @param {import('../game/types.js').RoundState} round
 * @param {{ name: string, color: string }[]} players
 */
function describe(round, players) {
  const { winner } = round.result;
  const duel = round.snakes.length === 2;
  if (winner === 'draw') {
    const crash = round.snakes.every((s) => s.death === 'crash');
    const detail = crash ? 'Zderzenie głowami' : duel ? 'Obaj odpadli w tym samym momencie' : 'Wszyscy odpadli naraz';
    return { title: 'REMIS!', subtitle: '', color: COLORS.text, detail };
  }
  const p = players[winner];
  const loser = round.snakes.find((s) => !s.alive);
  const detail = duel ? DEATH[loser.death] : 'Ostatni na placu boju';
  return { title: p.name.toUpperCase(), subtitle: 'WYGRYWA RUNDĘ!', color: p.color, detail };
}

/** @param {any} app */
export function createRoundEndScene(app) {
  let ticks = 0;
  let info = { title: '', subtitle: '', color: COLORS.text, detail: '' };
  let solo = false;

  const next = () => {
    // Online: gdy w pokoju zostało mniej niż dwóch graczy, mecz kończy się powrotem do poczekalni
    if (app.controller.shouldEndMatch?.()) return app.controller.rematch();
    app.scenes.go(app.match.winner !== null ? 'matchEnd' : 'countdown');
  };

  return {
    enter() {
      const result = app.round.result;
      app.controller.roundEnded?.(app.match.round, result);
      recordRound(app.match, result);
      solo = app.round.snakes.length === 1;
      info = solo ? describeSolo(app.round) : describe(app.round, app.players);
      ticks = 0;
      if (app.match.winner === null) app.audio.play('round');
    },

    update() {
      const k = app.keyboard;
      if (k.consumePressed(KEYS.back)) return app.controller.leave();
      if (k.consumePressed(KEYS.mute)) app.audio.toggleMute();
      ticks++;
      // Online wszyscy przechodzą dalej po tym samym czasie, bez przeklikiwania
      const skip = app.controller.canSkip && ticks >= MIN_TICKS && k.consumePressed(KEYS.confirm);
      // Trening czeka na gracza (żeby zdążył przeczytać wynik)
      if ((!solo && ticks >= AUTO_TICKS) || skip) next();
    },

    render() {
      const time = performance.now();
      drawRoundView(app, time);
      const { ctx } = app.renderer;
      const cy = BOARD_Y + (GRID_H * CELL) / 2;
      dimScreen(ctx, 0.5);
      drawPanel(ctx, VIEW_W / 2, cy + 20, 640, 260, info.color === COLORS.text ? undefined : info.color);

      drawText(ctx, info.title, VIEW_W / 2, cy - 70, { size: 28, color: info.color, glow: 16 });
      if (info.subtitle) drawText(ctx, info.subtitle, VIEW_W / 2, cy - 30, { size: 16, color: COLORS.text });
      drawText(ctx, info.detail, VIEW_W / 2, cy + 5, { size: 10, color: COLORS.dim });
      if (!solo) drawScore(ctx, app.match.wins, app.players, VIEW_W / 2, cy + 55);

      if (app.controller.canSkip && ticks >= MIN_TICKS && blink(time)) {
        const hint = solo ? 'SPACJA — kolejna próba    ESC — menu' : 'SPACJA — dalej';
        drawText(ctx, hint, VIEW_W / 2, cy + 115, { size: 10, color: COLORS.text });
      }
    },
  };
}
