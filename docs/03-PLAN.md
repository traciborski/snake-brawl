# Snake Brawl — Plan

> Etap 3 z 4: Koncept → Architektura → **Plan** → Kod
> Status: ✅ kroki 0–7 zrobione, zostaje ręczne granie wg listy kontrolnej.
> Bazuje na [01-KONCEPT.md](01-KONCEPT.md) i [02-ARCHITEKTURA.md](02-ARCHITEKTURA.md).

Każdy krok kończy się czymś, co da się sprawdzić testem albo w przeglądarce.

## Krok 0: Szkielet projektu
- [x] `package.json` (`npm start`, `npm test`), `scripts/serve.js`
- [x] Nowy `index.html` z jednym `<canvas>`, nowy `style.css`
- [x] Usunięcie starego `script.js`
- [x] `config.js` ze wszystkimi stałymi z architektury
- **Sprawdzenie:** `npm start` pokazuje pusty, ciemny ekran gry.

## Krok 1: Fundamenty logiki
- [x] `core/rng.js`: generator z ziarnem
- [x] `game/grid.js`: kierunki, pozycje, obrót o 180°
- [x] `game/maze.js`: symetryczny labirynt, chronione spawny, test spójności
- **Testy:** RNG powtarzalny, labirynt symetryczny, spójny, spawny wolne.

## Krok 2: Węże i jedzenie
- [x] `game/snake.js`: ruch co 2 ticki, kolejka 2 skrętów, zakaz zawracania, wzrost
- [x] `game/food.js`: 3 owoce na wolnych polach
- [x] `game/round.js`: `createRound`, `stepRound` (kroki 1, 2, 5, 6, 7)
- [x] Kolizje: ściana, krawędź, własne ciało, rywal, głowa w głowę, zamiana miejscami
- **Testy:** każdy rodzaj śmierci, remis przy zderzeniu głów, wzrost po zjedzeniu.

## Krok 3: Strzelanie
- [x] `game/bullets.js`: koszt segmentu, cooldown, lot 1 pole/tick
- [x] Trafienie w ciało odcina ogon, trafienie w głowę ogłusza (1 s) i daje odporność (1 s)
- [x] Pocisk znika na ścianie, dwa pociski się znoszą
- **Testy:** każda z reguł strzelania osobno.

## Krok 4: Runda i mecz
- [x] Koniec rundy: KO, remis, czas (dłuższy wygrywa)
- [x] `game/match.js`: mecz do 3 wygranych, remis bez punktu
- **Testy:** wyniki rund i meczu.

## Krok 5: Przeglądarka: pętla, sterowanie, rysowanie
- [x] `core/loop.js`: stały krok 50 ms + `requestAnimationFrame`
- [x] `input/keyboard.js`: WASD+Spacja, strzałki+Enter, `preventDefault`
- [x] `render/*`: skalowanie, plansza, ściany (cache), węże, pociski, owoce, HUD
- **Sprawdzenie:** dwie osoby mogą zagrać rundę.

## Krok 6: Sceny
- [x] Menu → Odliczanie → Gra → Wynik rundy → Koniec meczu → Rewanż
- [x] Pauza `P`, wyjście `Esc`, wyciszenie `M`
- **Sprawdzenie:** pełny mecz od menu do rewanżu.

## Krok 7: Oprawa
- [x] Cząsteczki, potrząsanie ekranem, miganie ogłuszonego węża
- [x] Dźwięki Web Audio: strzał, jedzenie, trafienie, ogłuszenie, śmierć, odliczanie
- **Sprawdzenie:** lista kontrolna poniżej.

## Lista kontrolna ręczna (przed uznaniem wersji 1.0)
- [ ] Obaj gracze sterują jednocześnie, a szybkie skręty nie giną
- [ ] Strzałki i Spacja nie przewijają strony
- [ ] Strzał skraca strzelającego, a z samą głową nie da się strzelić
- [ ] Trafienie w ogon odcina go, a w głowę ogłusza (wąż miga, stoi)
- [ ] Ogłuszonego węża nie da się ogłuszyć ponownie przez 1 s po odzyskaniu ruchu
- [ ] Zderzenie głowami daje remis
- [ ] Po 90 s wygrywa dłuższy wąż
- [ ] Mecz kończy się po 3 wygranych i rewanż działa
- [ ] Gra skaluje się do okna i jest ostra na ekranach HiDPI
