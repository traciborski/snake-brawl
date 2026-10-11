// Nakładka HTML nad canvasem: formularze (imiona, kod pokoju) i przyciski menu,
// których nie da się wygodnie zrobić na samym canvasie.

/**
 * Tworzy element: h('button', { type: 'submit', onclick }, 'START').
 * @param {string} tag
 * @param {Record<string, any>} [props]
 * @param {...(Node | string | null | undefined | (Node | string)[])} children
 */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'style') Object.assign(el.style, value);
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else if (key in el) el[key] = value;
    else el.setAttribute(key, value);
  }
  el.append(...children.flat().filter((c) => c != null && c !== false));
  return el;
}

export class Overlay {
  /** @param {HTMLElement} el */
  constructor(el) {
    this.el = el;
    this.hide();
  }

  /**
   * @param {HTMLElement} content
   * @param {{ position?: 'center' | 'low' }} [opts]
   */
  show(content, { position = 'center' } = {}) {
    this.el.className = `overlay ${position}`;
    this.el.replaceChildren(content);
    this.el.hidden = false;
    // Najpierw element z autofocus (o ile aktywny), potem pierwsze pole albo aktywny przycisk
    const target = content.querySelector('[autofocus]:not(:disabled)') ?? content.querySelector('input, button:not(:disabled)');
    /** @type {HTMLElement | null} */ (target)?.focus();
  }

  hide() {
    this.el.hidden = true;
    this.el.replaceChildren();
  }
}
