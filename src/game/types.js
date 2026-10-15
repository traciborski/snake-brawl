// Definicje typów (JSDoc) używane w logice gry. Plik nie zawiera kodu.

/** @typedef {'up' | 'down' | 'left' | 'right'} Dir */
/** @typedef {{ x: number, y: number }} Pos */
/** @typedef {{ w: number, h: number }} Grid */

/**
 * @typedef {object} Snake
 * @property {number} id         numer gracza (0–5)
 * @property {Pos[]} body        body[0] to głowa
 * @property {Dir} dir           aktualny kierunek
 * @property {Dir[]} nextDirs    kolejka skrętów (max 2)
 * @property {number} growPending
 * @property {number} eaten      zjedzone owoce w tej rundzie (wynik treningu)
 * @property {number} cooldown   ticki do kolejnego strzału
 * @property {number} swordTicks     ile ticków jeszcze wiruje miecz (0 = nie wiruje)
 * @property {number} swordCooldown  ticki do kolejnego cięcia mieczem
 * @property {number} ammo       strzały z już „zjedzonego” segmentu
 * @property {boolean} alive
 * @property {null | 'shot' | 'wall' | 'crash' | 'body' | 'sword' | 'left'} death   przyczyna śmierci
 *   (crash = zderzenie głowami, body = wjazd w rywala, sword = cięcie mieczem, left = rozłączenie online)
 */

/** @typedef {{ owner: number, pos: Pos, dir: Dir, travel?: number, bounces?: number }} Bullet  travel: przelecone pola */

/** @typedef {{ winner: number | 'draw' }} RoundResult */

/**
 * @typedef {object} RoundState
 * @property {number} tick
 * @property {{ state: number }} rng
 * @property {Grid} grid
 * @property {Uint8Array} walls    rodzaj pola (WALL z config.js), indeks y * w + x
 * @property {Snake[]} snakes
 * @property {Bullet[]} bullets
 * @property {Pos[]} food
 * @property {number} foodCount
 * @property {RoundResult | null} result
 */

/** @typedef {{ turns?: Dir[], shoot?: boolean, sword?: boolean, quit?: boolean }} Command */

/**
 * Zdarzenia zwracane przez stepRound, czytane przez render i audio.
 * @typedef {(
 *   { type: 'shot', snake: number, pos: Pos } |
 *   { type: 'bulletWall', pos: Pos } |
 *   { type: 'bulletClash', pos: Pos } |
 *   { type: 'bulletBounce', pos: Pos } |
 *   { type: 'bulletWarp', pos: Pos } |
 *   { type: 'swordSwing', snake: number, pos: Pos } |
 *   { type: 'bodyHit', snake: number, by: number, cells: Pos[] } |
 *   { type: 'bounced', snake: number, pos: Pos } |
 *   { type: 'teleported', snake: number, pos: Pos } |
 *   { type: 'ate', snake: number, pos: Pos } |
 *   { type: 'died', snake: number, by: number | null, pos: Pos, cause: 'shot' | 'wall' | 'crash' | 'body' | 'sword' | 'left' } |
 *   { type: 'roundOver', result: RoundResult }
 * )} GameEvent
 */

export {};
