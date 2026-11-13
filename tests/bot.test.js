import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WALL } from '../src/config.js';
import { chooseBotCommand } from '../src/game/bot.js';
import { createBotController } from '../src/modes/bots.js';
import { emptyRound, place, wall } from './helpers.js';

test('bot wybiera deterministyczny ruch i nie zawraca', () => {
  const state = emptyRound();
  state.walls.fill(WALL.NONE);
  state.crates.forEach((crate) => { crate.pos = null; });
  place(state, 0, [[10, 10], [9, 10], [8, 10]], 'right');
  place(state, 1, [[25, 20], [26, 20], [27, 20]], 'left');
  wall(state, 11, 10, WALL.DEADLY);

  const first = chooseBotCommand(state, 0, 'medium');
  assert.deepEqual(chooseBotCommand(state, 0, 'medium'), first);
  assert.ok(['up', 'down'].includes(first.turns[0]));
});

test('średni i trudny bot strzelają do węża na linii strzału, łatwy nie strzela', () => {
  const state = emptyRound();
  state.walls.fill(WALL.NONE);
  state.crates.forEach((crate) => { crate.pos = null; });
  place(state, 0, [[5, 10], [4, 10], [3, 10]], 'right');
  place(state, 1, [[8, 10], [9, 10], [10, 10]], 'left');
  state.snakes[0].ammo = 1;

  assert.equal(chooseBotCommand(state, 0, 'easy').shoot, false);
  assert.equal(chooseBotCommand(state, 0, 'medium').shoot, true);
  assert.equal(chooseBotCommand(state, 0, 'hard').shoot, true);
});

test('bot używa miecza, gdy wróg jest w zasięgu', () => {
  const state = emptyRound();
  place(state, 0, [[5, 10]], 'right');
  place(state, 1, [[8, 10]], 'left');
  assert.equal(chooseBotCommand(state, 0, 'medium').sword, true);
  assert.equal(chooseBotCommand(state, 0, 'easy').sword, false);
});

test('kontroler botów łączy sterowanie człowieka i komendy AI', () => {
  const state = emptyRound({ players: 3 });
  const app = {
    players: [{}, {}, {}],
    round: state,
    keyboard: { consumeCommands: () => [{ turns: ['up'], shoot: false }] },
    touch: { consume: () => ({}) },
    scenes: { go() {} },
  };
  const commands = createBotController(app, 'hard').commands();
  assert.equal(commands.length, 3);
  assert.deepEqual(commands[0].turns, ['up']);
  assert.ok(commands[1]);
  assert.ok(commands[2]);
});
