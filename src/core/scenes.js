// Maszyna stanów scen. Scena to obiekt z opcjonalnymi enter / update / render / exit.

/**
 * @typedef {object} Scene
 * @property {(params?: any) => void} [enter]
 * @property {() => void} [update]            raz na tick logiki
 * @property {(alpha: number, dt: number) => void} [render]   raz na klatkę
 * @property {() => void} [exit]
 */

export class SceneManager {
  /** @param {{ keyboard: { reset(): void } }} app */
  constructor(app) {
    this.app = app;
    /** @type {Record<string, Scene>} */
    this.scenes = {};
    /** @type {Scene | null} */
    this.current = null;
    this.name = '';
  }

  /** @param {string} name @param {Scene} scene */
  register(name, scene) {
    this.scenes[name] = scene;
  }

  /** @param {string} name @param {any} [params] */
  go(name, params) {
    const next = this.scenes[name];
    if (!next) throw new Error(`Nieznana scena: ${name}`);
    this.current?.exit?.();
    this.app.keyboard.reset();
    this.current = next;
    this.name = name;
    next.enter?.(params);
  }

  update() {
    this.current?.update?.();
  }

  render(alpha, dt) {
    this.current?.render?.(alpha, dt);
  }
}
