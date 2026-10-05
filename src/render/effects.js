// Efekty czysto wizualne: cząsteczki i potrząsanie ekranem.
// Reagują na zdarzenia z symulacji, ale nigdy nie wpływają na logikę.

import { BOARD_Y, CELL, COLORS, PLAYERS, VIEW_W } from '../config.js';

/** @typedef {import('../game/types.js').GameEvent} GameEvent */
/** @typedef {import('../game/types.js').Pos} Pos */

const center = (p) => ({ x: p.x * CELL + CELL / 2, y: BOARD_Y + p.y * CELL + CELL / 2 });
const MAX_PARTICLES = 600;

export class Effects {
  constructor() {
    /** @type {{ x: number, y: number, vx: number, vy: number, life: number, max: number, size: number, color: string }[]} */
    this.particles = [];
    this.shake = 0;
  }

  clear() {
    this.particles = [];
    this.shake = 0;
  }

  /** Wybuch cząsteczek w punkcie (współrzędne ekranu). */
  burst(x, y, color, count, speed = 120, life = 0.5, size = 4) {
    for (let i = 0; i < count && this.particles.length < MAX_PARTICLES; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.7);
      const l = life * (0.6 + Math.random() * 0.4);
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: l, max: l, size, color });
    }
  }

  burstAt(pos, color, count, speed, life, size) {
    const c = center(pos);
    this.burst(c.x, c.y, color, count, speed, life, size);
  }

  addShake(amount) {
    this.shake = Math.max(this.shake, amount);
  }

  /** Konfetti na koniec meczu. */
  confetti(color) {
    for (let i = 0; i < 12; i++) this.burst(Math.random() * VIEW_W, 120 + Math.random() * 300, color, 12, 200, 1.2, 5);
  }

  /** @param {GameEvent[]} events */
  handle(events) {
    for (const e of events) {
      switch (e.type) {
        case 'shot':
          this.burstAt(e.pos, PLAYERS[e.snake].color, 6, 80, 0.2, 3);
          break;
        case 'bulletBounce':
          this.burstAt(e.pos, COLORS.wallEdge, 6, 80, 0.2, 3);
          break;
        case 'bulletWall':
          this.burstAt(e.pos, COLORS.wallEdge, 14, 120, 0.35, 3);
          break;
        case 'bulletClash':
          this.burstAt(e.pos, '#ffffff', 16, 160, 0.35, 3);
          this.addShake(3);
          break;
        case 'bodyHit':
          for (const cell of e.cells) this.burstAt(cell, PLAYERS[e.snake].color, 6, 110, 0.5, 4);
          this.addShake(5);
          break;
        case 'bounced':
          this.burstAt(e.pos, PLAYERS[e.snake].color, 8, 90, 0.25, 3);
          this.addShake(2);
          break;
        case 'ate':
          this.burstAt(e.pos, COLORS.food, 12, 100, 0.4, 3);
          break;
        case 'died':
          this.burstAt(e.pos, PLAYERS[e.snake].color, 50, 260, 0.9, 5);
          this.burstAt(e.pos, '#ffffff', 20, 180, 0.5, 3);
          this.addShake(12);
          break;
      }
    }
  }

  /** @param {number} dt sekundy */
  update(dt) {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - 3 * dt;
      p.vy *= 1 - 3 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    this.shake = Math.max(0, this.shake - dt * 40);
  }

  /** Przesuwa widok o losowy wektor (wywołać w ctx.save/restore). */
  applyShake(ctx) {
    if (this.shake <= 0) return;
    const s = this.shake;
    ctx.translate(Math.round((Math.random() * 2 - 1) * s), Math.round((Math.random() * 2 - 1) * s));
  }

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x - p.size / 2), Math.round(p.y - p.size / 2), p.size, p.size);
    }
    ctx.restore();
  }
}
