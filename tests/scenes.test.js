// Ekrany z formularzami w Node, na udawanym DOM: łapie błędy typu „ekran się nie otwiera”.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OFFLINE_MAX_PLAYERS } from '../src/config.js';
import { createSetupScene } from '../src/scenes/setup.js';

/** Minimalny element: tyle, ile używają h() i sceny. */
function fakeElement(tag) {
  const el = {
    tagName: tag.toUpperCase(),
    children: [],
    style: {},
    hidden: false,
    value: '',
    textContent: '',
    listeners: {},
    classList: { toggle() {}, add() {}, remove() {} },
    append(...kids) {
      el.children.push(...kids);
    },
    addEventListener(type, fn) {
      (el.listeners[type] ??= []).push(fn);
    },
    setAttribute() {},
    select() {},
    focus() {},
    querySelector: (sel) => el.children.find((c) => typeof c === 'object' && c.tagName === sel.toUpperCase()) ?? fakeElement(sel),
  };
  for (const key of ['type', 'className', 'maxLength', 'placeholder', 'autofocus', 'disabled', 'readOnly']) el[key] = '';
  return el;
}

function withFakeDom(fn) {
  const saved = globalThis.document;
  globalThis.document = /** @type {any} */ ({ createElement: fakeElement });
  try {
    return fn();
  } finally {
    globalThis.document = saved;
  }
}

test('ekran gry na jednym komputerze otwiera się i ma pola dla 1–4 graczy', () => {
  withFakeDom(() => {
    let shown = null;
    const app = { overlay: { show: (el) => (shown = el), hide() {} }, scenes: { go() {} } };
    createSetupScene(app).enter();
    assert.ok(shown, 'formularz pokazany');
    const inputs = [];
    const walk = (el) => {
      if (!el || typeof el !== 'object') return;
      if (el.tagName === 'INPUT') inputs.push(el);
      el.children?.forEach(walk);
    };
    walk(shown);
    assert.equal(inputs.length, OFFLINE_MAX_PLAYERS);
  });
});
