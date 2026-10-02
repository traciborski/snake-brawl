// Deterministyczny generator losowy (mulberry32). Stan to zwykły obiekt,
// więc da się go skopiować, zapisać i odtworzyć tę samą rozgrywkę.

/** @param {number} seed */
export function createRng(seed) {
  return { state: seed >>> 0 };
}

/** Liczba z przedziału [0, 1). */
export function nextFloat(rng) {
  rng.state = (rng.state + 0x6d2b79f5) >>> 0;
  let t = rng.state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Liczba całkowita z przedziału [0, n). */
export function randInt(rng, n) {
  return Math.floor(nextFloat(rng) * n);
}

/** Ziarno do nowego meczu. Jedyne miejsce, gdzie wchodzi prawdziwa losowość. */
export function randomSeed() {
  return (Math.random() * 0x100000000) >>> 0;
}
