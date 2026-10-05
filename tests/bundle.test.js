import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bundle, OUT } from '../scripts/build.js';

test('dist/snake-brawl.js jest aktualny (uruchom `npm run build`)', () => {
  const committed = readFileSync(new URL(`../${OUT}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(committed, bundle());
});

test('sklejony skrypt ma poprawną składnię', () => {
  assert.doesNotThrow(() => new Function(bundle()));
});
