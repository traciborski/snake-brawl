// Widok rundy: plansza + obiekty + efekty + HUD. Wspólny dla odliczania, gry i wyników.

import { drawBoard } from './board.js';
import { drawBullets, drawFood, drawSnake } from './entities.js';
import { drawHud } from './hud.js';

/**
 * @param {{ renderer: import('./renderer.js').Renderer, effects: import('./effects.js').Effects,
 *           round: import('../game/types.js').RoundState, match: import('../game/match.js').MatchState,
 *           roundNumber: number, players: { name: string, color: string }[] }} app
 * @param {number} time ms
 */
export function drawRoundView(app, time) {
  const { renderer, effects, round, match, players } = app;
  const { ctx } = renderer;
  renderer.begin();

  ctx.save();
  effects.applyShake(ctx);
  drawBoard(ctx, round, renderer.scale);
  drawFood(ctx, round, time);
  for (const snake of round.snakes) drawSnake(ctx, snake, players[snake.id].color);
  drawBullets(ctx, round, players);
  effects.draw(ctx);
  ctx.restore();

  drawHud(ctx, round, match, players, app.roundNumber);
}
