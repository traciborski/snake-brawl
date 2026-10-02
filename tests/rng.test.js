import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, nextFloat, randInt } from '../src/core/rng.js';

test('to samo ziarno daje ten sam ciąg', () => {
  const a = createRng(42);
  const b = createRng(42);
  for (let i = 0; i < 100; i++) assert.equal(nextFloat(a), nextFloat(b));
});

test('różne ziarna dają różne ciągi', () => {
  const a = createRng(1);
  const b = createRng(2);
  const sa = Array.from({ length: 5 }, () => nextFloat(a));
  const sb = Array.from({ length: 5 }, () => nextFloat(b));
  assert.notDeepEqual(sa, sb);
});

test('randInt mieści się w zakresie', () => {
  const r = createRng(7);
  for (let i = 0; i < 1000; i++) {
    const v = randInt(r, 5);
    assert.ok(Number.isInteger(v) && v >= 0 && v < 5);
  }
});
