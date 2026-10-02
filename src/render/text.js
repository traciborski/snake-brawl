// Napisy pikselową czcionką z opcjonalną neonową poświatą.

import { COLORS, FONT, VIEW_H, VIEW_W } from '../config.js';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} str
 * @param {number} x
 * @param {number} y
 * @param {{ size?: number, color?: string, align?: CanvasTextAlign, glow?: number, alpha?: number }} [opts]
 */
export function drawText(ctx, str, x, y, opts = {}) {
  const { size = 16, color = COLORS.text, align = 'center', glow = 0, alpha = 1 } = opts;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  if (glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = glow;
  }
  ctx.fillText(str, x, y);
  ctx.restore();
}

/** Przyciemnia cały ekran (pod napisami nakładek). */
export function dimScreen(ctx, alpha = 0.6) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.restore();
}

/** Miganie: true przez połowę okresu. */
export function blink(time, periodMs = 800) {
  return time % periodMs < periodMs / 2;
}

/** Ciemny panel z neonową ramką pod napisami nakładek (środek cx, cy). */
export function drawPanel(ctx, cx, cy, w, h, color = COLORS.border) {
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
  ctx.restore();
}
