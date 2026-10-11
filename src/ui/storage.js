// Zapamiętywanie drobiazgów (imiona) w przeglądarce. Brak dostępu do localStorage
// (tryb prywatny, zablokowane dane) nie może psuć gry.

const PREFIX = 'snakeBrawl.';

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // trudno, następnym razem trzeba będzie wpisać od nowa
  }
}
