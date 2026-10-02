import { COLORS, KEYS, PLAYERS, VIEW_W } from '../config.js';
import { randomSeed } from '../core/rng.js';
import { createMatch } from '../game/match.js';
import { blink, drawText } from '../render/text.js';

/** @param {any} app */
export function createMenuScene(app) {
  return {
    enter() {
      app.effects.clear();
    },

    update() {
      const k = app.keyboard;
      if (k.consumePressed(KEYS.mute)) app.audio.toggleMute();
      if (k.consumePressed(KEYS.confirm)) {
        app.match = createMatch(randomSeed());
        app.scenes.go('countdown');
      }
    },

    render() {
      const { ctx } = app.renderer;
      const time = performance.now();
      app.renderer.begin();

      // Tło: wolno przesuwające się neonowe paski
      ctx.save();
      for (let i = 0; i < 12; i++) {
        const y = ((time / 30 + i * 60) % 720) - 60;
        ctx.globalAlpha = 0.06;
        ctx.fillStyle = i % 2 ? PLAYERS[0].color : PLAYERS[1].color;
        ctx.fillRect(0, y, VIEW_W, 4);
      }
      ctx.restore();

      drawText(ctx, 'SNAKE', VIEW_W / 2, 120, { size: 56, color: PLAYERS[0].color, glow: 24 });
      drawText(ctx, 'BRAWL', VIEW_W / 2, 190, { size: 56, color: PLAYERS[1].color, glow: 24 });
      drawText(ctx, 'LEON  vs  HUGO', VIEW_W / 2, 250, { size: 14, color: COLORS.dim });

      const colX = [VIEW_W / 2 - 220, VIEW_W / 2 + 220];
      PLAYERS.forEach((p, i) => {
        drawText(ctx, p.name.toUpperCase(), colX[i], 320, { size: 20, color: p.color, glow: 10 });
        drawText(ctx, p.help, colX[i], 355, { size: 10, color: COLORS.text });
      });

      drawText(ctx, 'Strzał kosztuje 1 segment ogona.', VIEW_W / 2, 410, { size: 10, color: COLORS.dim });
      drawText(ctx, 'Ogon = odcięty. Głowa = ogłuszona.', VIEW_W / 2, 432, { size: 10, color: COLORS.dim });

      if (blink(time)) {
        drawText(ctx, 'SPACJA / ENTER  —  START', VIEW_W / 2, 500, { size: 16, color: COLORS.text, glow: 8 });
      }
      const sound = app.audio.muted ? 'WYŁ' : 'WŁ';
      drawText(ctx, `P pauza   ESC menu   M dźwięk: ${sound}`, VIEW_W / 2, 560, { size: 8, color: COLORS.dim });
    },
  };
}
