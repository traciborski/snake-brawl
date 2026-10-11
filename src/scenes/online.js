// Gra przez internet: na razie zaślepka (krok 2 planu).

import { PLAYER_COLORS, VIEW_W } from '../config.js';
import { drawText } from '../render/text.js';
import { h } from '../ui/dom.js';

/** @param {any} app */
export function createOnlineScene(app) {
  return {
    enter() {
      const panel = h(
        'div',
        { className: 'panel', onkeydown: (e) => e.code === 'Escape' && app.scenes.go('menu') },
        h('h2', {}, 'GRA PRZEZ INTERNET'),
        h('p', { className: 'hint' }, 'Już wkrótce.'),
        h('div', { className: 'buttons' }, h('button', { type: 'button', onclick: () => app.scenes.go('menu') }, 'WSTECZ')),
      );
      app.overlay.show(panel);
    },
    exit() {
      app.overlay.hide();
    },
    render() {
      app.renderer.begin();
      drawText(app.renderer.ctx, 'GRA PRZEZ INTERNET', VIEW_W / 2, 80, { size: 20, color: PLAYER_COLORS[1], glow: 12 });
    },
  };
}
