# Snake Brawl — Architektura

> Etap 2 z 4: Koncept → **Architektura** → Plan → Kod
> Status: ✅ zaakceptowana. Bazuje na [01-KONCEPT.md](01-KONCEPT.md).

## 1. Technologia

| Co            | Wybór                                   | Dlaczego |
|---------------|-----------------------------------------|----------|
| Język         | JavaScript (ES modules) + typy w JSDoc  | Działa w przeglądarce bez kompilacji. JSDoc daje podpowiedzi w edytorze |
| Grafika       | Canvas 2D, jeden `<canvas>`             | Gra na kratce nie potrzebuje WebGL ani silnika |
| Dźwięk        | Web Audio API, dźwięki syntezowane w kodzie | Bez plików audio i bez licencji |
| Zależności    | **Zero** bibliotek w grze               | Mniej do utrzymania, gra startuje od razu |
| Testy         | `node --test` (wbudowany w Node 22)     | Logika gry jest czysta, więc testujemy ją bez przeglądarki |
| Uruchamianie  | Dwuklik w `index.html` albo `npm start` (serwer w Node) | `index.html` ładuje `dist/snake-brawl.js`, czyli moduły sklejone przez `npm run build` w jeden zwykły skrypt, bo przeglądarki blokują ES modules z `file://` |
| Publikacja    | Pliki statyczne (np. GitHub Pages)      | Nie ma backendu |

## 2. Główna zasada: logika oddzielona od wyświetlania

```
 klawiatura ──► INPUT ──komendy──► SYMULACJA (czysta logika) ──zdarzenia──► RENDER / AUDIO
                                        │                                    ▲
                                        └────────────── stan ────────────────┘
```

- **Symulacja** (`src/game/`) nie zna DOM, canvasu, czasu systemowego ani `Math.random`.
  Dostaje stan i komendy graczy, zwraca nowy stan i listę zdarzeń.
  Dzięki temu jest **deterministyczna** i w pełni testowalna w Node.
- **Render** tylko czyta stan i rysuje. Nigdy go nie zmienia.
- **Zdarzenia** (np. `ate`, `shot`, `bodyHit`, `stunned`, `died`) łączą logikę z efektami:
  render dodaje eksplozje i potrząsanie ekranem, audio gra dźwięki.
  Logika nie wie, że efekty istnieją.

## 3. Czas: stały krok symulacji

- Symulacja chodzi w stałych **tickach co 50 ms (20 Hz)**, niezależnie od FPS monitora.
- Rysowanie odbywa się w `requestAnimationFrame` (60+ FPS), z akumulatorem czasu.
- Wszystkie czasy z konceptu wyrażamy w tickach (w `config.js`):

| Parametr                 | Wartość | Ticki |
|--------------------------|---------|-------|
| Ruch węża                | 10 pól/s | co 2 ticki |
| Ruch pocisku             | 20 pól/s | 1 pole/tick |
| Cooldown strzału         | 0,3 s   | 6 |
| Odbicia pocisku          | 3, przy 4. ścianie znika | – |
| Czas rundy               | 90 s    | 1800 |
| Odliczanie               | 3 s     | 60 |

## 4. Struktura plików

```
index.html              jeden <canvas>, ładuje src/main.js
style.css
package.json            skrypty: start, build, test (bez zależności)
scripts/serve.js        mini serwer statyczny (dist/ skleja na bieżąco)
scripts/build.js        skleja src/ w dist/snake-brawl.js (bez zależności)
dist/snake-brawl.js     WYGENEROWANY, commitowany, ładowany przez index.html
src/
  main.js               start aplikacji: canvas, input, pętla, pierwsza scena
  config.js             wszystkie stałe: rozmiary, ticki, kolory, klawisze
  core/
    loop.js             pętla z akumulatorem: update(tick) + render(alpha)
    rng.js              deterministyczny generator losowy z ziarnem (mulberry32)
    scenes.js           maszyna stanów scen (enter / update / render / exit)
  game/                 ◄── CZYSTA LOGIKA, bez DOM
    types.js            definicje typów JSDoc (Stan, Wąż, Pocisk, Zdarzenie…)
    grid.js             kierunki, pozycje, pomocnicze funkcje kratki
    maze.js             generowanie symetrycznego labiryntu + test spójności
    round.js            createRound(seed), stepRound(stan, komendy) → zdarzenia, ruch węży
    snake.js            skręty, odbicie (zawrócenie węża), odcinanie ogona, śmierć
    bullets.js          strzał (koszt segmentu), lot, kolizje pocisków
    food.js             losowanie owoców na wolnych polach
    match.js            wynik rundy, licznik meczu, zwycięzca
  input/
    keyboard.js         nasłuch klawiszy, kolejka kierunków na gracza
  render/
    renderer.js         skalowanie canvasu do okna, HiDPI
    view.js             widok rundy: plansza + obiekty + efekty + HUD
    board.js            tło, kratka, ściany (cache off-screen)
    entities.js         węże (poświata), pociski (przygasają z każdym odbiciem), owoce
    effects.js          cząsteczki, shake (stan tylko wizualny)
    hud.js              wynik meczu, czas, długości
    text.js             napisy pikselowe, panele nakładek
  audio/
    sfx.js              syntezowane efekty, reagują na zdarzenia
  scenes/
    menu.js             tytuł, sterowanie, „naciśnij Spację”
    countdown.js        3-2-1
    play.js             runda: łączy input → stepRound → efekty
    roundEnd.js         kto wygrał rundę
    matchEnd.js         zwycięzca meczu, rewanż
tests/
    rng.test.js, maze.test.js, snake.test.js, bullets.test.js, match.test.js
```

Obecny `script.js` usuwamy przy przepisywaniu (zostaje w historii gita).

## 5. Model danych (szkic)

```js
/** Stan rundy: jedyne źródło prawdy dla logiki */
RoundState = {
  tick: 0,
  rng,                          // stan generatora z ziarnem
  grid: { w: 48, h: 27 },       // 16:9, pole 20 px → 960×540
  walls: Uint8Array,            // 1 = ściana, indeks y*w + x
  snakes: [Snake, Snake],       // [Leon, Hugo]
  bullets: Bullet[],
  food: Pos[],                  // zawsze 3
  timeLeft: 1800,               // w tickach
  result: null | { winner: 0 | 1 | 'draw' },
}

Snake = {
  id: 0 | 1,
  body: Pos[],                  // [0] = głowa
  dir: Dir, nextDirs: Dir[],    // kolejka max 2 skrętów
  growPending: 0,
  cooldown: 0,
  alive: true,
}

Bullet = { owner: 0 | 1, pos: Pos, dir: Dir, bounces: 0 }

Commands = [{ turn?: Dir, shoot: boolean }, { … }]   // na gracza, na tick
```

`MatchState` (wynik meczu, numer rundy) leży poziom wyżej, w `match.js`, a rundę tworzy się od nowa.

## 6. Kolejność w jednym ticku (`stepRound`)

Kolejność jest ważna dla uczciwości: oba węże są przetwarzane **równocześnie**.

1. **Komendy**: przyjmij skręt (bez zawracania) i żądanie strzału.
2. **Timery**: zmniejsz cooldown i czas rundy.
3. **Strzały**: jeśli długość > 1 i cooldown = 0, to zabierz
   segment z ogona i stwórz pocisk na polu przed głową.
4. **Pociski**: przesuń każdy o 1 pole. Ściana przed pociskiem → zawraca w miejscu
   (po 3 odbiciach kolejna ściana go niszczy). Potem inny pocisk i węże
   (głowa → śmierć, ciało → odcięcie ogona).
5. **Węże** (co 2. tick): policz obie nowe głowy naraz. Przeszkoda (ściana, ciało,
   głowa w głowę, zamiana miejscami) → wąż się odbija, czyli odwraca ciało i nie rusza się
   w tym ticku. Odbity wąż nie zwalnia ogona, więc sprawdzamy ponownie, aż nic się nie zmieni.
   Na koniec głowa w pocisk → śmierć.
6. **Jedzenie**: zjedzenie daje `growPending++`, uzupełnij owoce do 3.
7. **Koniec rundy**: sprawdź śmierć lub upływ czasu i ustaw `result`.

Funkcja zwraca listę zdarzeń z tego ticka.
Kolizje sprawdzamy po każdym przesunięciu o 1 pole, więc nic nie „przeskoczy” przez wroga.

## 7. Sceny (maszyna stanów)

```
MENU ──Spacja──► COUNTDOWN ──3 s──► PLAY ──koniec rundy──► ROUND_END
  ▲                  ▲                                         │
  │                  └──────────── mecz trwa ──────────────────┤
  └──── Esc ──── MATCH_END ◄────── ktoś ma 3 wygrane ──────────┘
                    │
                    └──Spacja (rewanż)──► COUNTDOWN
```

Każda scena ma `enter()`, `update(tick)`, `render(ctx, alpha)`, `exit()`.
`Esc` w trakcie gry wraca do menu, a `P` pauzuje.

## 8. Sterowanie: szczegóły

- Klawisze są przypisane w `config.js` (`Leon: WASD + Space`, `Hugo: strzałki + Enter`).
- Każdy gracz ma **kolejkę 2 skrętów**, więc szybkie „w górę i w lewo” między tickami nie ginie.
- Dla klawiszy gry wołamy `preventDefault()`, żeby strzałki i Spacja nie przewijały strony.
- Ghosting: niektóre klawiatury nie łapią wielu klawiszy naraz. Dlatego klawisze strzału
  są daleko od siebie, a w razie problemów zmiana mapowania to jedna linia w configu.

## 9. Grafika

- Logiczna rozdzielczość to 960×540. Canvas skalujemy do okna, zachowując proporcje,
  i wyłączamy wygładzanie (piksele).
- Neon: `shadowBlur` jest kosztowny, więc poświatę robimy na warstwie off-screen albo przez
  pre-renderowane sprite'y segmentów.
- Efekty (cząsteczki, shake) to stan **tylko wizualny** w `render/effects.js`. Nie wpływa na logikę.

## 10. Testowanie

- **Automatyczne** (`npm test`): całe `src/game/`. Przykłady:
  labirynt jest symetryczny i spójny, strzał zabiera segment, trafienie w głowę ogłusza,
  zderzenie głowami daje remis, po 1800 tickach wygrywa dłuższy.
  Dzięki ziarnu RNG każdy scenariusz jest powtarzalny.
- **Ręczne**: lista kontrolna rozgrywki w przeglądarce (w planie, etap 3).

## 11. Gotowość na „później”

- **Power-upy**: nowy typ obiektu na planszy + modyfikatory w `Snake`, krok w `stepRound`.
- **Bot**: generuje `Commands` z odczytu stanu, tak jak klawiatura. Logika się nie zmienia.
- **Online**: deterministyczna symulacja z komendami to dobra baza (lockstep), ale to odległa przyszłość.
