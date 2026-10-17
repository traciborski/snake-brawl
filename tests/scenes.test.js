// Ekrany z formularzami w Node, na udawanym DOM: łapie błędy typu „ekran się nie otwiera”.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OFFLINE_MAX_PLAYERS } from '../src/config.js';
import { createSetupScene, savedColors } from '../src/scenes/setup.js';

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

test('kolory graczy offline: zapamiętane bez powtórzeń, zły zapis z przeglądarki nie psuje gry', () => {
  assert.deepEqual(savedColors(['#00E5FF', '#00E5FF', 'zły', null]), ['#00E5FF', '#FFD700', '#39FF14', '#FF9100']);
  assert.equal(new Set(savedColors(undefined)).size, OFFLINE_MAX_PLAYERS);
});

test('koniec próby w treningu: po chwili przyciski JESZCZE RAZ i MENU (telefon nie ma Spacji)', async () => {
  const { createRoundEndScene } = await import('../src/scenes/roundEnd.js');
  const { createRound } = await import('../src/game/round.js');
  const { createMatch } = await import('../src/game/match.js');
  withFakeDom(() => {
    const round = createRound(5, { players: 1 });
    round.snakes[0].alive = false;
    round.snakes[0].death = 'wall';
    round.result = { winner: 'draw' };
    let shown = null;
    const went = [];
    const app = {
      round,
      match: createMatch(1, 1),
      players: [{ name: 'Ala', color: '#FFD700' }],
      controller: { canSkip: true, leave: () => went.push('menu') },
      audio: { play() {} },
      keyboard: { consumePressed: () => false },
      overlay: { show: (el) => (shown = el), hide: () => (shown = null) },
      scenes: { go: (name) => went.push(name) },
    };
    const scene = createRoundEndScene(app);
    scene.enter();
    scene.update();
    assert.equal(shown, null, 'nie od razu (żeby nie stuknąć przypadkiem)');
    for (let i = 0; i < 40; i++) scene.update();
    assert.ok(shown, 'przyciski widać');
    const buttons = shown.children.flat().filter((b) => b.tagName === 'BUTTON');
    assert.deepEqual(buttons.map((b) => b.children[0]), ['JESZCZE RAZ', 'MENU']);
    buttons[0].listeners.click[0]();
    assert.deepEqual(went, ['countdown']);
    buttons[1].listeners.click[0]();
    assert.deepEqual(went, ['countdown', 'menu']);
  });
});

test('odmiana: 1 owoc, 2 owoce, 5 owoców, 12 owoców, 22 owoce', async () => {
  const { fruits } = await import('../src/scenes/roundEnd.js');
  assert.deepEqual([0, 1, 2, 4, 5, 12, 14, 22, 25].map(fruits), ['0 owoców', '1 owoc', '2 owoce', '4 owoce', '5 owoców', '12 owoców', '14 owoców', '22 owoce', '25 owoców']);
});
