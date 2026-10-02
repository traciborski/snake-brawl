// Mecz: seria rund do WINS_TO_MATCH wygranych. Remis nie daje punktu.

import { WINS_TO_MATCH } from '../config.js';

/** @typedef {import('./types.js').RoundResult} RoundResult */

/**
 * @typedef {object} MatchState
 * @property {number} seed
 * @property {number} round       liczba rozegranych rund
 * @property {[number, number]} wins
 * @property {RoundResult[]} history
 * @property {0 | 1 | null} winner
 */

/** @param {number} seed @returns {MatchState} */
export function createMatch(seed) {
  return { seed: seed >>> 0, round: 0, wins: [0, 0], history: [], winner: null };
}

/** Ziarno kolejnej rundy: każda runda ma inny labirynt, ale cały mecz jest powtarzalny. */
export function nextRoundSeed(match) {
  return (match.seed + Math.imul(match.round + 1, 0x9e3779b9)) >>> 0;
}

/** @param {MatchState} match @param {RoundResult} result @returns {0 | 1 | null} */
export function recordRound(match, result) {
  match.round++;
  match.history.push(result);
  if (result.winner !== 'draw') {
    match.wins[result.winner]++;
    if (match.wins[result.winner] >= WINS_TO_MATCH) match.winner = result.winner;
  }
  return match.winner;
}
