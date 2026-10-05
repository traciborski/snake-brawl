// Widok rundy: plansza + obiekty + efekty + HUD. Wspólny dla odliczania, gry i wyników.

import { drawBoard } from './board.js';
import { drawBullets, drawFood, drawSnake } from './entities.js';
import { drawHud } from './hud.js';

/**
 * @param {{ renderer: import('./renderer.js').Renderer, effects: import('./effects.js').Effects,
 *           round: import('../game/types.js').RoundState, match: import('../game/match.js').MatchState,
 *           roundNumber: number }} app
 * @param {number} time ms
 */
export function drawRoundView(app, time) {
  const { renderer, effects, round, match } = app;
  const { ctx } = renderer;
  renderer.begin();

  ctx.save();
  effects.applyShake(ctx);
  drawBoard(ctx, round, renderer.scale);
  drawFood(ctx, round, time);
  for (const snake of round.snakes) drawSnake(ctx, snake);
  drawBullets(ctx, round);
  effects.draw(ctx);
  ctx.restore();

  drawHud(ctx, round, match, app.roundNumber, time);
}
