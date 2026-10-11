import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMatch, nextRoundSeed, recordRound } from '../src/game/match.js';
import { createRound, stepRound } from '../src/game/round.js';

test('mecz kończy się po 3 wygranych', () => {
  const m = createMatch(1);
  assert.equal(recordRound(m, { winner: 0 }), null);
  assert.equal(recordRound(m, { winner: 1 }), null);
  assert.equal(recordRound(m, { winner: 0 }), null);
  assert.equal(recordRound(m, { winner: 0 }), 0);
  assert.deepEqual(m.wins, [3, 1]);
  assert.equal(m.round, 4);
});

test('remis nie daje punktu', () => {
  const m = createMatch(1);
  recordRound(m, { winner: 'draw' });
  assert.deepEqual(m.wins, [0, 0]);
  assert.equal(m.winner, null);
});

test('każda runda ma inne ziarno', () => {
  const m = createMatch(123);
  const a = nextRoundSeed(m);
  recordRound(m, { winner: 'draw' });
  assert.notEqual(nextRoundSeed(m), a);
});

test('symulacja jest deterministyczna', () => {
  const script = (i) => [
    { turns: i % 15 === 0 ? ['down'] : i % 15 === 7 ? ['right'] : [], shoot: i % 9 === 0 },
    { turns: i % 13 === 0 ? ['up'] : i % 13 === 6 ? ['left'] : [], shoot: i % 11 === 0 },
  ];
  const play = () => {
    const s = createRound(777);
    for (let i = 0; i < 400 && !s.result; i++) stepRound(s, script(i));
    return s;
  };
  assert.deepEqual(play(), play());
});
