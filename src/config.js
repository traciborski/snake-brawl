// Wszystkie stałe gry w jednym miejscu. Czasy logiki są w tickach (1 tick = 55 ms).

export const TICK_MS = 55; // 50 ms było odrobinę za szybko
export const TICKS_PER_SECOND = Math.round(1000 / TICK_MS); // ok. 18

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
export const SNAKE_MOVE_EVERY = 2; // ok. 9 pól/s
export const START_LENGTH = 3;
export const SHOT_COOLDOWN = 6; // ok. 0,33 s
export const SHOTS_PER_SEGMENT = 10; // jeden segment ogona = 10 strzałów
// Pocisk: 3 pola na 2 ticki = ok. 27 pól/s, czyli 3× szybciej niż wąż
export const BULLET_CELLS = 3;
export const BULLET_PER_TICKS = 2;
export const COUNTDOWN_TICKS = 3 * TICKS_PER_SECOND;
export const FOOD_COUNT = 3;
export const WINS_TO_MATCH = 3;
export const MAZE_DENSITY = 0.08;
// Udział rodzajów ścian w labiryncie: najwięcej czarnych, najmniej niebieskich
export const WALL_MIX = { bounce: 0.5, deadly: 0.3, portal: 0.2 };

// Rodzaje pól planszy. Krawędź planszy działa jak PORTAL.
export const WALL = {
  NONE: 0,
  BOUNCE: 1, // czarna: odbija
  DEADLY: 2, // czerwona: zabija
  PORTAL: 3, // niebieska: przenosi na jej drugą stronę
};

// Gracze
export const MAX_PLAYERS = 4;
export const OFFLINE_PLAYERS = 2;
export const NAME_MAX = 12;
// Kolory graczy: neonowe, inne niż ściany (czerwona, niebieska, szara) i jedzenie (różowe)
export const PLAYER_COLORS = ['#FFD700', '#00E5FF', '#39FF14', '#FF9100'];
export const DEFAULT_NAMES = ['Gracz 1', 'Gracz 2', 'Gracz 3', 'Gracz 4'];

// Zestawy klawiszy (KeyboardEvent.code, niezależne od układu klawiatury).
// Offline: zestaw i = gracz i. Online: oba zestawy sterują własnym wężem.
export const KEYMAPS = [
  {
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

// Adres serwera gry online, używany tylko, gdy gra jest otwarta z dysku (dwuklik w index.html),
// np. 'wss://snake-brawl.twoje-konto.workers.dev'. Gra otwarta z Cloudflare albo z `npm start`
// łączy się z serwerem pod tym samym adresem. Adres można też podać w linku: ?server=wss://...
export const ONLINE_SERVER = '';

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
  border: '#3d5afe',
  // [krawędź, środek] dla każdego rodzaju ściany
  walls: {
    1: ['#9aa0b8', '#000000'],
    2: ['#ff3d5a', '#4a0712'],
    3: ['#3d5afe', '#0c1450'],
  },
  food: '#ff2e88',
  text: '#e8ecff',
  dim: '#7a80a8',
  danger: '#ff3d5a',
};

export const FONT = '"Press Start 2P", monospace';
