import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SWIPE_PX, Touch, mergeCommands, swipeDir } from '../src/input/touch.js';

/** Zdarzenie wskaźnika jak z przeglądarki. */
const ptr = (type, props) => Object.assign(new Event(type), { pointerType: 'touch', pointerId: 1, ...props });

function setup() {
  const target = new EventTarget();
  const touch = new Touch(target);
  const send = (type, props) => target.dispatchEvent(ptr(type, props));
  return { touch, send };
}

test('kierunek przesunięcia: dominująca oś, za krótkie się nie liczy', () => {
  assert.equal(swipeDir(SWIPE_PX - 1, 0), null);
  assert.equal(swipeDir(30, 5), 'right');
  assert.equal(swipeDir(-30, 10), 'left');
  assert.equal(swipeDir(5, 40), 'down');
  assert.equal(swipeDir(-3, -40), 'up');
});

test('pierwsze dotknięcie włącza sterowanie dotykiem (mysz nie)', () => {
  const { touch, send } = setup();
  send('pointerdown', { pointerType: 'mouse', clientX: 0, clientY: 0 });
  assert.equal(touch.active, false);
  let fired = 0;
  touch.onFirstTouch.push(() => fired++);
  send('pointerdown', { clientX: 0, clientY: 0 });
  send('pointerdown', { clientX: 0, clientY: 0 });
  assert.equal(touch.active, true);
  assert.equal(fired, 1);
});

test('przesunięcie palcem w trakcie rundy daje skręty, także kilka bez odrywania palca', () => {
  const { touch, send } = setup();
  touch.setVisible(true);
  send('pointerdown', { clientX: 100, clientY: 100 });
  send('pointermove', { clientX: 100, clientY: 70 }); // w górę
  send('pointermove', { clientX: 60, clientY: 70 }); // w lewo
  send('pointermove', { clientX: 61, clientY: 71 }); // drgnięcie: nic
  assert.deepEqual(touch.consume(), { turns: ['up', 'left'], shoot: false, sword: false });
  assert.deepEqual(touch.consume().turns, [], 'skręty zużyte');
});

test('poza rundą przesunięcia nic nie robią', () => {
  const { touch, send } = setup();
  send('pointerdown', { clientX: 100, clientY: 100 });
  send('pointermove', { clientX: 100, clientY: 20 });
  assert.deepEqual(touch.consume().turns, []);
});

test('przycisk STRZAŁ: stuknięcie i przytrzymanie', () => {
  const target = new EventTarget();
  const button = new EventTarget();
  const touch = new Touch(target, /** @type {any} */ (button));
  touch.setVisible(true);
  button.dispatchEvent(ptr('pointerdown', {}));
  button.dispatchEvent(ptr('pointerup', {}));
  assert.equal(touch.consume().shoot, true, 'krótkie stuknięcie nie ginie');
  assert.equal(touch.consume().shoot, false);
  button.dispatchEvent(ptr('pointerdown', {}));
  assert.equal(touch.consume().shoot, true);
  assert.equal(touch.consume().shoot, true, 'przytrzymany strzela dalej');
  button.dispatchEvent(ptr('pointerup', {}));
  assert.equal(touch.consume().shoot, false);
});

test('łączenie komend z klawiatury i dotyku', () => {
  assert.deepEqual(mergeCommands({ turns: ['up'], shoot: false, sword: false }, { turns: ['left'], shoot: true, sword: false }), {
    turns: ['up', 'left'],
    shoot: true,
    sword: false,
  });
  assert.equal(mergeCommands({ sword: true }, {}).sword, true);
  assert.deepEqual(mergeCommands({}, {}), { turns: [], shoot: false, sword: false });
});
