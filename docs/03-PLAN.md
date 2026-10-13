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
- [x] Ściany: czerwona zabija, czarna odbija, niebieska i krawędź przenoszą na drugą stronę
- [x] Zderzenie głowami zabija obu, wjazd w ogon rywala zabija wjeżdżającego, własne ciało odbija
- **Testy:** każdy rodzaj odbicia, wzrost po zjedzeniu.

## Krok 3: Strzelanie
- [x] `game/bullets.js`: 1 segment = 10 strzałów, cooldown, lot 3 pola na 2 ticki
- [x] Trafienie w ciało odcina ogon, trafienie w głowę zabija, własne pociski niegroźne
- [x] Pocisk 3× szybszy od węża, znika na ścianie i krawędzi; dwa pociski się znoszą
- **Testy:** każda z reguł strzelania osobno.

## Krok 4: Runda i mecz
- [x] Koniec rundy: śmierć jednego (wygrana drugiego) albo obu naraz (remis), bez limitu czasu
- [x] `game/match.js`: mecz do 3 wygranych, remis bez punktu
- **Testy:** wyniki rund i meczu.

## Krok 5: Przeglądarka: pętla, sterowanie, rysowanie
- [x] `core/loop.js`: stały krok 55 ms + `requestAnimationFrame`
- [x] `input/keyboard.js`: WASD+Spacja, strzałki+Enter, `preventDefault`
- [x] `render/*`: skalowanie, plansza, ściany (cache), węże, pociski, owoce, HUD
- **Sprawdzenie:** dwie osoby mogą zagrać rundę.

## Krok 6: Sceny
- [x] Menu → Odliczanie → Gra → Wynik rundy → Koniec meczu → Rewanż
- [x] Pauza `P`, wyjście `Esc`, wyciszenie `M`
- **Sprawdzenie:** pełny mecz od menu do rewanżu.

## Krok 7: Oprawa
- [x] Cząsteczki, potrząsanie ekranem
- [x] Dźwięki Web Audio: strzał, jedzenie, trafienie, odbicia, śmierć, odliczanie
- **Sprawdzenie:** lista kontrolna poniżej.

## Krok 8: Imiona i 2–4 graczy (wspólne dla obu trybów)
- [x] Menu z wyborem trybu, formularz z imionami (zapamiętywane)
- [x] Logika dla 2–4 węży: 4 rogi, labirynt symetryczny w obu osiach, osłony startowe
- [x] Wygrywa ostatni żywy wąż; HUD, wyniki rund i meczu dla 2–4 graczy
- [x] Kontroler trybu (`app.controller`): sceny gry wspólne dla offline i online
- **Testy:** 3–4 graczy, ostatni żywy wygrywa, martwy wąż nie blokuje, imiona.

## Krok 9: Gra przez internet, lokalnie
- [x] `server/room.js`: pokoje, poczekalnia, start, przekazywanie ruchów, rozłączenia
- [x] Lokalny serwer pokoi w `npm start` (WebSocket bez zależności)
- [x] Klient: łączenie, lockstep z opóźnieniem 3 klatek, czekanie na brakujące ruchy
- [x] Scena online: utwórz pokój / dołącz kodem, poczekalnia, start, powrót po meczu
- **Testy:** logika pokoju, bufor lockstep, rozłączenie w trakcie rundy.
- **Sprawdzenie:** mecz na dwóch kartach przeglądarki przez `npm start`.
  ✅ Test automatyczny w 3 przeglądarkach: identyczny stan u wszystkich, rozłączenie, rewanż.

## Krok 10: Wystawienie w internecie (Cloudflare)
- [x] Przygotowane: `server/worker.js`, `wrangler.toml` (pliki gry + pokoje), instrukcja [04-WYSTAWIENIE.md](04-WYSTAWIENIE.md)
- [x] Sprawdzone lokalnie w środowisku Cloudflare (`wrangler dev`): mecz w 3 przeglądarkach
- [ ] Konto Cloudflare i podpięcie repo (Workers Builds: automatyczne budowanie po pushu na `main`), robi właściciel repo
- **Sprawdzenie:** mecz z sąsiadami.

## Krok 11: Telefon (dotyk)
- [x] `input/touch.js`: przesunięcie palcem = skręt, przycisk STRZAŁ (stuknięcie i przytrzymanie)
- [x] Sterowanie włącza się po pierwszym dotknięciu, przycisk tylko w trakcie rundy
- [x] Prośba o obrócenie telefonu, pełny ekran, brak przewijania i przybliżania w trakcie rundy
- **Testy:** gesty i przycisk (Node), telefon w emulacji z prawdziwymi zdarzeniami dotyku.

## Krok 12: Dołączanie w trakcie meczu
- [x] Serwer wpuszcza do trwającego meczu od rundy `maxRound + 2` (`joined`, `late`)
- [x] Klienci zgłaszają wyniki rund (`result`), dołączający odtwarza z nich stan meczu
- [x] Lockstep i liczba węży w rundzie zależą od rundy dołączenia gracza
- **Testy:** logika pokoju, lockstep, symulacja 3 klientów z opóźnieniami (identyczny stan).

## Krok 13: Lista aktywnych pokoi
- [x] `pokoje.html`: kod, gracze, stan pokoju, *Dołącz*, odświeżanie co 3 s, wygląda dobrze na telefonie
- [x] `GET /api/pokoje`: lokalnie z pamięci, na Cloudflare z Durable Object z listą (zgłoszenia + wygasanie)
- [x] Przycisk *Lista pokoi* w formularzu gry przez internet
- **Testy:** opis pokoju i zmiany, kolejność listy, wygasanie wpisów, endpoint lokalny i workera.
  ✅ Sprawdzone w `wrangler dev` i w przeglądarce (dwa pokoje, dołączenie z listy, wyjście gracza).

## Krok 14: Offline 1–4 graczy i trening
- [x] Wybór liczby graczy (1–4, zapamiętywany), klawisze dla graczy 3 (IJKL + U) i 4 (numpad)
- [x] Trening: runda trwa, dopóki wąż żyje, wynik = owoce i czas, rekord w przeglądarce
- **Testy:** koniec rundy w treningu, własne pociski i ciało niegroźne, unikalne klawisze, kontroler.

## Krok 15: Pokój publiczny 4B i 6 węży online
- [x] Pokój publiczny `4B`: zawsze istnieje, przycisk ze stanem w menu, na górze listy pokoi
- [x] Online do 6 graczy: miejsca startu na środkach boków, środkowa osłona, 2 nowe kolory, HUD na 6
- [x] Korytarz przed każdym wężem aż do osłony (bez czerwonych ścian na starcie)
- **Testy:** pokój publiczny, lista z pustym 4B, limit 6, 6 węży na planszy.
  ✅ Sprawdzone w `wrangler dev`: 6 przeglądarek w 4B, start meczu, „6/6 · pełny” w menu.

## Lista kontrolna ręczna (przed uznaniem wersji 1.0)
- [ ] Obaj gracze sterują jednocześnie, a szybkie skręty nie giną
- [ ] Strzałki i Spacja nie przewijają strony
- [ ] Co 10. strzał skraca strzelającego o segment, AMMO w pasku się zgadza
- [ ] Własny pocisk przelatuje przez strzelającego
- [ ] Trafienie w ogon odcina go, a w głowę zabija
- [ ] Czerwona ściana zabija, czarna odbija, krawędź przenosi na przeciwną krawędź
- [ ] Niebieska ściana w środku przenosi za bliźniaczą ścianę po drugiej stronie planszy
- [ ] Pocisk znika na każdej ścianie i krawędzi
- [ ] Strzał w głowę obu naraz daje remis
- [ ] Mecz kończy się po 3 wygranych i rewanż działa
- [ ] Gra skaluje się do okna i jest ostra na ekranach HiDPI
- [ ] Na telefonie: skręty palcem, STRZAŁ, prośba o obrócenie w pionie
