# Snake Brawl — Koncept gry

> Etap 1 z 4: **Koncept** → Architektura → Plan → Kod
> Status: ✅ zaakceptowany

## 1. Jedno zdanie

Arcade'owy pojedynek dwóch węży na jednej klawiaturze: rośniesz, zjadając jedzenie,
strzelasz kawałkami własnego ogona, a rundę wygrywa ten, kto przetrwa.

## 2. Ustalenia

| Obszar     | Decyzja                                                  |
|------------|----------------------------------------------------------|
| Baza       | Rozwijamy pomysł Snake Brawl, kod piszemy od nowa        |
| Gracze     | 2 graczy lokalnie, jedna klawiatura                      |
| Platforma  | Przeglądarka na PC, klawiatura                           |
| Klimat     | Arcade dla wszystkich: szybko, rywalizacja, krótkie rundy |
| Styl       | Pikselowa kratka z neonową poświatą na ciemnym tle       |
| Język UI   | Polski                                                   |

## 3. Bohaterowie i sterowanie

| Gracz | Kolor              | Ruch       | Strzał   |
|-------|--------------------|------------|----------|
| Leon  | żółty `#FFD700`    | `W A S D`  | `Spacja` |
| Hugo  | cyjan `#00E5FF`    | strzałki   | `Enter`  |

## 4. Mecz i runda

1. **Menu**: start meczu, ekran sterowania.
2. **Odliczanie** 3-2-1, węże startują w przeciwległych rogach planszy, długość 3.
3. **Runda** trwa do śmierci węża albo 90 s.
4. **Wynik rundy**:
   - przeżył jeden wąż, więc on wygrywa;
   - obaj zginęli w tym samym momencie, więc jest remis;
   - po 90 s wygrywa dłuższy wąż, a przy równej długości jest remis.
5. **Mecz** gramy do 3 wygranych rund (remis nie daje punktu). Potem ekran zwycięzcy
   i rewanż jednym klawiszem.

## 5. Zasady

**Ruch**
- Plansza w kratkę, ruch krok po kroku ze stałą prędkością (~10 kratek/s).
- Nie można zawrócić w miejscu.
- Śmierć: ściana, krawędź planszy, własne ciało, ciało rywala.
- Zderzenie głowami (to samo pole albo zamiana miejscami) oznacza śmierć obu.

**Jedzenie**
- Na planszy zawsze leżą 3 owoce. Zjedzenie daje +1 segment.

**Strzelanie**
- Strzał kosztuje 1 segment ogona. Z samą głową (długość 1) nie można strzelać.
- Cooldown 0,3 s. Pocisk leci prosto, 2× szybciej niż wąż.
- **Trafienie w ciało** odcina ogon od trafionego segmentu do końca.
- **Trafienie w głowę** ogłusza: wąż stoi w miejscu 1 s i nie może strzelać.
  Przez kolejną 1 s jest odporny na ogłuszenie, żeby nie dało się go „zablokować”.
- Pociski trafiają każdego węża, także strzelającego.
- Pocisk znika na ścianie (ściany są niezniszczalne).
- Dwa pociski, które się spotkają, znoszą się nawzajem. Pociski przelatują nad owocami.

**Labirynt**
- Generowany losowo, ale symetrycznie (obrót o 180° wokół środka), żeby oba spawny były w identycznej sytuacji.
- Okolice spawnów są zawsze wolne, a każde wolne pole jest osiągalne.

## 6. Styl i oprawa

- Kratka w stylu pikselowym, węże i pociski z neonową poświatą, ciemne tło.
- Efekty: eksplozje cząsteczek, potrząsanie ekranem przy trafieniu,
  miganie ogłuszonego węża.
- Dźwięk: krótkie efekty (strzał, jedzenie, trafienie, śmierć), na razie bez muzyki.

## 7. Poza pierwszą wersją (później)

- Power-upy: przyspieszenie, tarcza, potrójny strzał, duch.
- Bot (AI) jako tryb treningowy.
- Muzyka, kilka gotowych map, ustawienia meczu.
- Gra online, wersja mobilna, tabele wyników.
