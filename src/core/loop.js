// Pętla gry: logika w stałych tickach, rysowanie w każdej klatce.
// Gdy karta jest w tle, przeglądarka wstrzymuje requestAnimationFrame. W grze online
// (runHidden) logika biegnie wtedy dalej na zegarze z Web Workera (zwykłe timery w tle
// są mocno spowalniane), żeby inni gracze nie czekali na nasze ruchy.

/**
 * @param {{ tickMs: number, update: () => void, render: (alpha: number, dt: number) => void,
 *           runHidden?: () => boolean }} options
 */
export function startLoop({ tickMs, update, render, runHidden = () => false }) {
  let last = performance.now();
  let acc = 0;

  /** Doganianie czasu: tyle ticków, ile wypada od ostatniego razu (z limitem). */
  function advance(now) {
    const dt = Math.min(now - last, 250);
    last = now;
    acc += dt;
    while (acc >= tickMs) {
      update();
      acc -= tickMs;
    }
    return dt;
  }

  function frame(now) {
    const dt = advance(now);
    render(acc / tickMs, dt / 1000);
    requestAnimationFrame(frame);
  }

  startBackgroundTicker(tickMs, () => {
    if (document.hidden && runHidden()) advance(performance.now());
  });
  document.addEventListener('visibilitychange', () => {
    // Po powrocie z tła nie nadrabiamy całego czasu naraz (offline gra po prostu stała)
    if (!document.hidden && !runHidden()) last = performance.now();
  });

  requestAnimationFrame(frame);
}

/** Zegar w osobnym wątku. Bez obsługi Workerów (albo gdy zablokowane) po prostu nic nie robi. */
function startBackgroundTicker(ms, onTick) {
  try {
    const code = `setInterval(() => postMessage(0), ${ms});`;
    const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
    const worker = new Worker(url);
    worker.onmessage = onTick;
    return worker;
  } catch {
    return null;
  }
}
