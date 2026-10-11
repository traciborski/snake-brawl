// Mecz: seria rund do WINS_TO_MATCH wygranych. Remis nie daje punktu. Od 2 do 4 graczy.

import { WINS_TO_MATCH } from '../config.js';

/** @typedef {import('./types.js').RoundResult} RoundResult */

/**
 * @typedef {object} MatchState
 * @property {number} seed
 * @property {number} round       liczba rozegranych rund
 * @property {number[]} wins       wygrane rundy na gracza
 * @property {RoundResult[]} history
 * @property {number | null} winner
 */

/** @param {number} seed @param {number} [players] @returns {MatchState} */
export function createMatch(seed, players = 2) {
  return { seed: seed >>> 0, round: 0, wins: Array(players).fill(0), history: [], winner: null };
}

/** Ziarno kolejnej rundy: każda runda ma inny labirynt, ale cały mecz jest powtarzalny. */
export function nextRoundSeed(match) {
  return (match.seed + Math.imul(match.round + 1, 0x9e3779b9)) >>> 0;
}

/** @param {MatchState} match @param {RoundResult} result @returns {number | null} */
export function recordRound(match, result) {
  match.round++;
  match.history.push(result);
  if (result.winner !== 'draw') {
    match.wins[result.winner]++;
    if (match.wins[result.winner] >= WINS_TO_MATCH) match.winner = result.winner;
  }
  return match.winner;
}
