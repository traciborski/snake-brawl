import { COLORS, PLAYER_COLORS, VIEW_W } from '../config.js';
import { blink, drawText } from '../render/text.js';
import { h } from '../ui/dom.js';
import { fetchRooms, serverUrl, showRoomInAddressBar } from '../net/client.js';
import { PUBLIC_ROOMS } from '../net/protocol.js';

/** Co ile odświeżamy w menu stan pokoju publicznego. */
const PUBLIC_REFRESH_MS = 5000;

/** Stan pokoju publicznego w jednej linijce, np. „2/6 · trwa mecz”. */
export function publicRoomStatus(room) {
  if (!room) return '';
  const count = `${room.players.length}/${room.max}`;
  if (room.full) return `${count} · pełny`;
  if (room.playing) return `${count} · trwa mecz`;
  return room.players.length ? `${count} · czekają!` : `${count} · pusty`;
}

/** @param {any} app */
export function createMenuScene(app) {
  let timer = 0;

  return {
    enter() {
      app.effects.clear();
      showRoomInAddressBar(null);
      const buttons = [
        h('button', { type: 'button', onclick: () => app.scenes.go('setup'), autofocus: true }, '1  GRA NA JEDNYM KOMPUTERZE'),
        h('button', { type: 'button', onclick: () => app.scenes.go('online') }, '2  GRA PRZEZ INTERNET'),
      ];
      // Pokój publiczny widać od razu w menu (gdy jest serwer gry): wchodzi się jednym kliknięciem
      const code = PUBLIC_ROOMS[0];
      const status = h('small', { className: 'room-status' });
      if (serverUrl()) {
        buttons.push(
          h('button', { type: 'button', onclick: () => app.scenes.go('online', { invite: code }) }, `3  POKÓJ PUBLICZNY ${code}  `, status),
        );
        const refresh = async () => {
          const rooms = await fetchRooms();
          status.textContent = publicRoomStatus(rooms?.find((r) => r.code === code));
        };
        refresh();
        timer = setInterval(refresh, PUBLIC_REFRESH_MS);
      }
      const menu = h('div', { className: 'menu-buttons', onkeydown: (e) => onKey(e, buttons) }, buttons);
      app.overlay.show(menu, { position: 'low' });
    },

    exit() {
      clearInterval(timer);
      app.overlay.hide();
    },

    render() {
      const { ctx } = app.renderer;
      const time = performance.now();
      app.renderer.begin();

      // Tło: wolno przesuwające się neonowe paski w kolorach graczy
      ctx.save();
      for (let i = 0; i < 12; i++) {
        const y = ((time / 30 + i * 60) % 720) - 60;
        ctx.globalAlpha = 0.06;
        ctx.fillStyle = PLAYER_COLORS[i % PLAYER_COLORS.length];
        ctx.fillRect(0, y, VIEW_W, 4);
      }
      ctx.restore();

      drawText(ctx, 'SNAKE', VIEW_W / 2, 90, { size: 56, color: PLAYER_COLORS[0], glow: 24 });
      drawText(ctx, 'BRAWL', VIEW_W / 2, 160, { size: 56, color: PLAYER_COLORS[1], glow: 24 });

      drawText(ctx, 'CZERWONA zabija   CZARNA odbija   NIEBIESKA przenosi', VIEW_W / 2, 225, { size: 10, color: COLORS.text });
      drawText(ctx, 'Strzał w głowę eliminuje. Trafiony ogon odpada.', VIEW_W / 2, 250, { size: 10, color: COLORS.dim });
      drawText(ctx, '1 segment ogona = 10 strzałów. Własne pociski są niegroźne.', VIEW_W / 2, 272, { size: 10, color: COLORS.dim });

      if (blink(time, 1600)) {
        drawText(ctx, 'wybierz tryb gry', VIEW_W / 2, 330, { size: 10, color: COLORS.dim });
      }
      const sound = app.audio.muted ? 'WYŁ' : 'WŁ';
      drawText(ctx, `P pauza   ESC menu   M dźwięk: ${sound}`, VIEW_W / 2, 580, { size: 8, color: COLORS.dim });
    },
  };

  /** Strzałki/WS przesuwają wybór, 1/2/3 wybierają od razu, M wycisza. */
  function onKey(e, buttons) {
    const i = buttons.indexOf(document.activeElement);
    if (['ArrowDown', 'KeyS'].includes(e.code)) buttons[(i + 1) % buttons.length].focus();
    else if (['ArrowUp', 'KeyW'].includes(e.code)) buttons[(i - 1 + buttons.length) % buttons.length].focus();
    else if (e.code === 'Digit1' || e.code === 'Numpad1') buttons[0].click();
    else if (e.code === 'Digit2' || e.code === 'Numpad2') buttons[1].click();
    else if ((e.code === 'Digit3' || e.code === 'Numpad3') && buttons[2]) buttons[2].click();
    else if (e.code === 'KeyM') app.audio.toggleMute();
    else return;
    e.preventDefault();
  }
}
