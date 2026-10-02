// Definicje typów (JSDoc) używane w logice gry. Plik nie zawiera kodu.

/** @typedef {'up' | 'down' | 'left' | 'right'} Dir */
/** @typedef {{ x: number, y: number }} Pos */
/** @typedef {{ w: number, h: number }} Grid */

/**
 * @typedef {object} Snake
 * @property {0 | 1} id
 * @property {Pos[]} body        body[0] to głowa
 * @property {Dir} dir           aktualny kierunek
 * @property {Dir[]} nextDirs    kolejka skrętów (max 2)
 * @property {number} growPending
 * @property {number} cooldown   ticki do kolejnego strzału
 * @property {number} stun       ticki ogłuszenia
 * @property {number} immunity   ticki odporności na ogłuszenie
 * @property {boolean} alive
 */

/** @typedef {{ owner: 0 | 1, pos: Pos, dir: Dir }} Bullet */

/** @typedef {{ winner: 0 | 1 | 'draw', reason: 'ko' | 'time' }} RoundResult */

/**
 * @typedef {object} RoundState
 * @property {number} tick
 * @property {{ state: number }} rng
 * @property {Grid} grid
 * @property {Uint8Array} walls    1 = ściana, indeks y * w + x
 * @property {Snake[]} snakes
 * @property {Bullet[]} bullets
 * @property {Pos[]} food
 * @property {number} foodCount
 * @property {number} timeLeft     w tickach
 * @property {RoundResult | null} result
 */

/** @typedef {{ turns?: Dir[], shoot?: boolean }} Command */

/**
 * Zdarzenia zwracane przez stepRound, czytane przez render i audio.
 * @typedef {(
 *   { type: 'shot', snake: number, pos: Pos } |
 *   { type: 'bulletWall', pos: Pos } |
 *   { type: 'bulletClash', pos: Pos } |
 *   { type: 'bodyHit', snake: number, by: number, cells: Pos[] } |
 *   { type: 'stunned', snake: number, by: number, pos: Pos } |
 *   { type: 'deflected', snake: number, pos: Pos } |
 *   { type: 'ate', snake: number, pos: Pos } |
 *   { type: 'died', snake: number, pos: Pos, cause: 'wall' | 'self' | 'rival' | 'headOn' } |
 *   { type: 'roundOver', result: RoundResult }
 * )} GameEvent
 */

export {};
