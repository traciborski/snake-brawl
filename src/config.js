// Wszystkie stałe gry w jednym miejscu. Czasy logiki są w tickach (1 tick = 50 ms).

export const TICK_MS = 50;
export const TICKS_PER_SECOND = 1000 / TICK_MS;

// Plansza
export const GRID_W = 48;
export const GRID_H = 27;
export const CELL = 20;

// Widok: pasek HUD nad planszą
export const HUD_H = 60;
export const BOARD_Y = HUD_H;
export const VIEW_W = GRID_W * CELL; // 960
export const VIEW_H = HUD_H + GRID_H * CELL; // 600

// Rozgrywka
export const SNAKE_MOVE_EVERY = 2; // 10 pól/s
export const START_LENGTH = 3;
export const SHOT_COOLDOWN = 6; // 0,3 s
export const BULLET_MAX_BOUNCES = 3; // pocisk odbija się 3 razy, przy 4. ścianie znika
export const ROUND_TICKS = 90 * TICKS_PER_SECOND;
export const COUNTDOWN_TICKS = 3 * TICKS_PER_SECOND;
export const FOOD_COUNT = 3;
export const WINS_TO_MATCH = 3;
export const MAZE_DENSITY = 0.08;

// Gracze: kody klawiszy (KeyboardEvent.code), niezależne od układu klawiatury
export const PLAYERS = [
  {
    name: 'Leon',
    color: '#FFD700',
    keys: {
      up: ['KeyW'],
      down: ['KeyS'],
      left: ['KeyA'],
      right: ['KeyD'],
      shoot: ['Space'],
    },
    help: 'W A S D  +  SPACJA',
  },
  {
    name: 'Hugo',
    color: '#00E5FF',
    keys: {
      up: ['ArrowUp'],
      down: ['ArrowDown'],
      left: ['ArrowLeft'],
      right: ['ArrowRight'],
      shoot: ['Enter', 'NumpadEnter'],
    },
    help: 'STRZAŁKI  +  ENTER',
  },
];

// Klawisze globalne
export const KEYS = {
  confirm: ['Space', 'Enter', 'NumpadEnter'],
  back: ['Escape'],
  pause: ['KeyP'],
  mute: ['KeyM'],
};

// Kolory
export const COLORS = {
  background: '#05060f',
  board: '#090b1c',
  gridDot: '#1b2040',
  border: '#7c4dff',
  wallEdge: '#b388ff',
  wallGlow: '#7c4dff',
  wallFill: '#1a1240',
  food: '#ff2e88',
  text: '#e8ecff',
  dim: '#7a80a8',
  danger: '#ff3d5a',
};

export const FONT = '"Press Start 2P", monospace';
