// Pętla gry: logika w stałych tickach, rysowanie w każdej klatce.

/**
 * @param {{ tickMs: number, update: () => void, render: (alpha: number, dt: number) => void }} options
 */
export function startLoop({ tickMs, update, render }) {
  let last = performance.now();
  let acc = 0;

  function frame(now) {
    // Limit chroni przed „lawiną” ticków po powrocie do karty przeglądarki
    const dt = Math.min(now - last, 250);
    last = now;
    acc += dt;
    while (acc >= tickMs) {
      update();
      acc -= tickMs;
    }
    render(acc / tickMs, dt / 1000);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
