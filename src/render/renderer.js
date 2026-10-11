// Canvas: skalowanie do okna (z zachowaniem proporcji) i ostrość na ekranach HiDPI.
// Cały kod rysujący posługuje się współrzędnymi logicznymi VIEW_W × VIEW_H.

import { COLORS, VIEW_H, VIEW_W } from '../config.js';

export class Renderer {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
    this.scale = 1;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const margin = 0.96;
    const fit = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H) * margin;
    const cssW = Math.max(1, Math.floor(VIEW_W * fit));
    const cssH = Math.max(1, Math.floor(VIEW_H * fit));
    const dpr = window.devicePixelRatio || 1;

    // Nakładka HTML skaluje się razem z canvasem
    this.canvas.parentElement?.style.setProperty('--u', `${cssW / VIEW_W}px`);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.scale = this.canvas.width / VIEW_W;
  }

  /** Początek klatki: czyści ekran i ustawia skalę logiczną. */
  begin() {
    const { ctx } = this;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}
