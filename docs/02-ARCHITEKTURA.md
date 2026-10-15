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
| Publikacja    | Cloudflare Workers: pliki gry (folder `site/`) + serwer pokoi (Durable Objects) pod jednym adresem | Jedno wystawienie, repo może zostać prywatne, gra łączy się z serwerem pod tym samym adresem |

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

- Symulacja chodzi w stałych **tickach co 55 ms (ok. 18 Hz)**, niezależnie od FPS monitora.
- Rysowanie odbywa się w `requestAnimationFrame` (60+ FPS), z akumulatorem czasu.
- Wszystkie czasy z konceptu wyrażamy w tickach (w `config.js`):

| Parametr                 | Wartość | Ticki |
|--------------------------|---------|-------|
| Ruch węża                | ok. 9 pól/s | co 2 ticki |
| Ruch pocisku             | ok. 27 pól/s | 3 pola na 2 ticki (1, 2, 1, 2…) |
| Cooldown strzału         | ok. 0,33 s | 6 |
| Odliczanie               | 3 s     | 60 |

## 4. Struktura plików

```
index.html              jeden <canvas>, ładuje src/main.js
pokoje.html             strona z listą aktywnych pokoi (osobna, bez canvasa)
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
    grid.js             kierunki, pozycje, obrót o 180°, portale (passThrough)
    maze.js             generowanie symetrycznego labiryntu + test spójności
    round.js            createRound(seed), stepRound(stan, komendy) → zdarzenia, ruch węży
    snake.js            skręty, odbicie (zawrócenie węża), odcinanie ogona, śmierć
    bullets.js          strzał (1 segment = 10 strzałów), lot, kolizje pocisków
    sword.js            miecz: wirowanie wokół głowy, cięcie w kole o promieniu 3 pól
    food.js             losowanie owoców na wolnych polach
    match.js            wynik rundy, licznik meczu, zwycięzca
  input/
    keyboard.js         nasłuch klawiszy, kolejka kierunków na zestaw klawiszy
    touch.js            dotyk: przesunięcie palcem = skręt, przycisk STRZAŁ; te same komendy co klawiatura
  modes/
    offline.js          kontroler trybu: jeden komputer
    online.js           kontroler trybu: internet (lockstep)
  net/
    client.js           połączenie z serwerem pokoi
    lockstep.js         bufor komend (runda, klatka), opóźnienie, rozłączenia
  ui/
    dom.js              nakładka HTML: formularze i przyciski
    storage.js          zapamiętane imiona (localStorage)
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
    menu.js             tytuł, zasady, wybór trybu
    setup.js            liczba graczy 1–4 i imiona (offline)
    online.js           pokój: utworzenie, dołączenie, poczekalnia
    countdown.js        3-2-1
    play.js             runda: łączy input → stepRound → efekty
    roundEnd.js         kto wygrał rundę
    matchEnd.js         zwycięzca meczu, rewanż
server/
    room.js             logika pokoju (wspólna dla Cloudflare i lokalnego serwera)
    worker.js           Cloudflare Worker + Durable Objects (pokoje i lista pokoi)
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
  walls: Uint8Array,            // 0 puste, 1 czarna, 2 czerwona, 3 niebieska; indeks y*w + x
  snakes: [Snake, Snake],       // [Leon, Hugo]
  bullets: Bullet[],
  food: Pos[],                  // zawsze 3
  result: null | { winner: 0 | 1 | 'draw' },   // bez limitu czasu
}

Snake = {
  id: 0 | 1,
  body: Pos[],                  // [0] = głowa
  dir: Dir, nextDirs: Dir[],    // kolejka max 2 skrętów
  growPending: 0,
  cooldown: 0, ammo: 0,         // ammo: strzały z „zjedzonego” segmentu
  alive: true, death: null,     // null | 'shot' | 'wall'
}

Bullet = { owner: 0 | 1, pos: Pos, dir: Dir }

Commands = [{ turn?: Dir, shoot: boolean }, { … }]   // na gracza, na tick
```

`MatchState` (wynik meczu, numer rundy) leży poziom wyżej, w `match.js`, a rundę tworzy się od nowa.

## 6. Kolejność w jednym ticku (`stepRound`)

Kolejność jest ważna dla uczciwości: oba węże są przetwarzane **równocześnie**.

1. **Komendy**: przyjmij skręt (bez zawracania) i żądanie strzału.
2. **Timery**: zmniejsz cooldown.
3. **Strzały**: jeśli cooldown = 0 i jest amunicja albo segment do zabrania (bez amunicji
   zabierz segment z ogona i daj 10 strzałów), stwórz pocisk na polu przed głową.
4. **Pociski**: przesuń o 1 lub 2 pola (3 pola na 2 ticki), sprawdzając kolizje po każdym polu.
   Ściany jak dla węża (`nextCell`): czarna odbija, czerwona niszczy, niebieska i krawędź przenoszą;
   po 48 polach lotu albo przy 4. odbiciu pocisk znika. Potem inny pocisk i węże poza strzelającym
   (głowa → śmierć, ciało → odcięcie ogona).
5. **Węże** (co 2. tick): policz obie nowe głowy naraz (`passThrough`: krawędź
   przenosi na przeciwną krawędź, niebieska ściana za jej bliźniaczkę
   po drugiej stronie planszy). Czerwona ściana → śmierć. Głowa w głowę albo zamiana
   miejscami → giną obaj. Głowa w ciało innego węża → ginie wjeżdżający. Czarna ściana albo
   własne ciało → wąż się odbija, czyli odwraca ciało i nie rusza się w tym ticku. Odbity wąż nie zwalnia ogona, więc sprawdzamy ponownie, aż nic się nie zmieni.
   Na koniec głowa w cudzy pocisk → śmierć.
6. **Jedzenie**: zjedzenie daje `growPending++`, uzupełnij owoce do 3.
7. **Koniec rundy**: ktoś zginął → ustaw `result` (obaj naraz → remis).

Funkcja zwraca listę zdarzeń z tego ticka.
Kolizje sprawdzamy po każdym przesunięciu o 1 pole, więc nic nie „przeskoczy” przez wroga.

## 7. Sceny (maszyna stanów)

```
MENU ─1─► SETUP (imiona) ──────────────┐
  │                                    ▼
  └─2─► ONLINE (pokój, poczekalnia) ─► COUNTDOWN ──3 s──► PLAY ──koniec rundy──► ROUND_END
                ▲                         ▲                                          │
                │                         └──────────── mecz trwa ───────────────────┤
                └── online: powrót ── MATCH_END ◄──────── ktoś ma 3 wygrane ─────────┘
                    do poczekalni         │
                                          └── offline: Spacja (rewanż) ──► COUNTDOWN
```

Każda scena ma `enter()`, `update(tick)`, `render(ctx, alpha)`, `exit()`.
Sceny gry są wspólne dla obu trybów. Różnice zamyka **kontroler trybu** (`app.controller`):

| Kontroler        | `commands()` (komendy na tick)                | `leave()` (Esc) | `rematch()` | pauza / przeklikiwanie |
|------------------|-----------------------------------------------|-----------------|-------------|------------------------|
| `modes/offline`  | z klawiatury, zestaw klawiszy i = gracz i     | menu            | nowy mecz   | tak                    |
| `modes/online`   | od wszystkich graczy z sieci albo `null` (czekamy) | wyjście z pokoju | poczekalnia | nie                    |

Formularze (imiona, kod pokoju, poczekalnia, przyciski menu) to **nakładka HTML** nad canvasem
(`src/ui/`), skalowana razem z nim. Klawiatura gry ignoruje klawisze wciskane w polach i przyciskach.

## 8. Sterowanie: szczegóły

- Zestawy klawiszy są w `config.js` (`KEYMAPS`: WASD + Spacja, strzałki + Enter, IJKL + U,
  numpad 8456 + 0). Offline zestaw i steruje graczem i, w treningu i online wszystkie zestawy
  sterują własnym wężem.
- Trening to zwykła runda z jednym wężem: `checkRoundEnd` kończy ją dopiero, gdy wąż zginie.
  Wynik (`snake.eaten`, czas z `round.tick`) i rekord (`localStorage`) pokazuje ekran końca rundy.
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
  labirynt jest symetryczny i spójny, strzał zabiera segment, trafienie w głowę zabija, czerwona ściana zabija, niebieska przenosi,
  zderzenie głowami zabija obu, wjazd w ogon rywala zabija wjeżdżającego, własny pocisk jest niegroźny.
  Dzięki ziarnu RNG każdy scenariusz jest powtarzalny.
- **Ręczne**: lista kontrolna rozgrywki w przeglądarce (w planie, etap 3).

## 11. Gotowość na „później”

- **Power-upy**: nowy typ obiektu na planszy + modyfikatory w `Snake`, krok w `stepRound`.
- **Bot**: generuje `Commands` z odczytu stanu, tak jak klawiatura. Logika się nie zmienia.
- **Rollback** w grze online: zamiast czekać na ruchy innych, zgadujemy je i cofamy kilka ticków,
  gdy przyjdą prawdziwe. Stan rundy jest mały, więc ponowne przeliczenie jest tanie.

## 12. Gra przez internet

**Elementy**

```
 przeglądarka A ──┐                                   ┌── przeglądarka B
   (gra z         │  WebSocket   ┌────────────────┐   │   (ta sama gra)
    Cloudflare)   └─────────────►│ serwer: pokój  │◄──┘
                                 │ KOT7 (relay)   │◄───── przeglądarka C, D
                                 └────────────────┘
```

- `server/room.js`: logika pokoju (poczekalnia, start, przekazywanie ruchów, rozłączenia).
  Czysta, bez sieci, testowana w Node.
- `server/worker.js`: Cloudflare Worker + Durable Object (jeden obiekt na pokój) opakowuje `room.js`.
  Pliki gry z folderu `site/` (składanego przez `node scripts/build.js --site`) Cloudflare serwuje sam.
- **Pokoje publiczne** (`PUBLIC_ROOMS` w `src/net/protocol.js`, na razie `4B`): adres `/room/4B`
  pasuje obok zwykłych 4-znakowych kodów. Taki `Room` jest od razu „założony”, więc wchodzi się
  bez `create`. Pusty pokój publiczny nie zgłasza się na listę, a `listRooms` dokłada go zawsze
  (na górze). Menu gry pobiera listę co 5 s i pokazuje jego stan na przycisku.
- **Lista pokoi** (`/pokoje`, dane z `GET /api/pokoje`): na Cloudflare każdy pokój zgłasza swój
  opis (`Room.summary()`: kod, imiona, poczekalnia/mecz, runda, pełny) do jednego Durable Object
  z listą przy każdej zmianie i co minutę (alarm). Wpis bez wieści od 3 minut znika, więc po
  restarcie serwera lista sama się czyści. Lokalnie `npm start` czyta pokoje prosto z pamięci.
- `scripts/serve.js`: lokalnie `npm start` ma ten sam serwer pokoi (minimalny WebSocket bez
  zależności, `scripts/ws.js`), więc grę online da się testować na dwóch kartach przeglądarki.
- `src/net/`: klient po stronie gry (połączenie, lockstep). `src/modes/online.js`: kontroler trybu.

**Lockstep**
- Każdy komputer liczy tę samą symulację z tych samych komend. Serwer tylko przekazuje komendy
  i ustala ziarno meczu. Stan gry nigdy nie idzie przez sieć.
- Komendy są numerowane `(runda, klatka)`. Komenda wysłana w klatce `f` działa w klatce `f + 2`
  (opóźnienie 110 ms ukrywa ping). Pierwsze 2 klatki rundy są puste u wszystkich.
- **Tempo wyznacza lokalny zegar** (tick co 55 ms): każdy wysyła dokładnie jedną komendę na tick,
  a symulacja nigdy nie wyprzedza zegara. Gra online biegnie więc tak samo szybko jak offline.
  Własny skręt działa dokładnie 2 ticki (110 ms) po wciśnięciu, jeśli ruchy innych są na czas.
- **Zegar nie ucieka symulacji** dalej niż o 1 klatkę (`MAX_AHEAD`). Kto zaczął rundę chwilę
  wcześniej i czeka na innych, ma zatrzymany zegar, zamiast wysyłać komendy coraz dalej
  w przyszłość (to wydłużało opóźnienie jego skrętów nawet do 220 ms).
- Symulacja robi krok tylko, gdy ma komendy wszystkich graczy na daną klatkę. Gdy kogoś brakuje,
  gra czeka (krótki przestój zamiast rozjazdu). Kto został w tyle, nadrabia najwyżej jedną
  dodatkową klatkę na tick.
- W karcie w tle przeglądarka wstrzymuje animację, więc online logika biegnie wtedy na zegarze
  z Web Workera (`core/loop.js`), żeby inni nie czekali na nasze ruchy.
- Ekrany między rundami trwają tyle samo u wszystkich i nie da się ich przeklikać.

**Protokół (JSON przez WebSocket)**

| Kierunek | Wiadomość | Znaczenie |
|----------|-----------|-----------|
| klient → serwer | `hello { name, create }` | dołączenie do pokoju z adresu `/room/KOD` (albo założenie go) |
| serwer → klient | `lobby { you, host, players, playing, public }` | stan poczekalni (`playing`: trwa mecz, `public`: pokój publiczny) |
| klient → serwer | `start` | założyciel zaczyna mecz |
| serwer → wszyscy | `start { seed, players }` | początek meczu; kolejność graczy = kolory i rogi |
| klient → serwer | `input { r, f, d, s, m }` | ruch: runda, klatka, skręty (`d`), strzał (`s`), miecz (`m`) |
| serwer → wszyscy | `input { p, r, f, d, s, m }` | ruch gracza `p` |
| serwer → wszyscy | `left { p, r, f }` | gracz `p` się rozłączył: od klatki `(r, f)` jego wąż ginie |
| klient → serwer | `result { r, w }` | wynik rundy `r` (`w`: numer zwycięzcy albo `null`) |
| serwer → wszyscy | `result { r, w }` | pierwszy zgłoszony wynik rundy, dla dołączających w trakcie |
| serwer → wszyscy | `joined { p, id, name, r }` | nowy gracz `p` dołączył w trakcie meczu, gra od rundy `r` |
| serwer → klient | `late { seed, r, players, results }` | dla dołączającego: ziarno, jego runda, gracze z rundami startu, dotychczasowe wyniki |
| klient → serwer | `lobby` | koniec meczu, powrót do poczekalni |
| serwer → klient | `error { msg }` | np. pokój nie istnieje albo jest pełny |

Rozłączenie działa deterministycznie: serwer podaje pierwszą klatkę, której gracz już nie wysłał,
a wszyscy stosują je w tym samym miejscu, bo i tak nie mogli jej jeszcze policzyć.

**Dołączenie w trakcie meczu** też jest deterministyczne. Serwer zna najwyższą rundę, z której
dostał ruch (`maxRound`), i wpuszcza nowego gracza od rundy `maxRound + 2`: nikt nie mógł jej
jeszcze zacząć, bo wiadomość `joined` dotrze do każdego przed jego ruchami z tej rundy.
Od tej rundy wszyscy liczą węża więcej (`playersInRound`). Dołączający czeka w poczekalni,
aż pozna wyniki wszystkich wcześniejszych rund, odtwarza z nich stan meczu (`replayMatch`)
i startuje razem z innymi.
