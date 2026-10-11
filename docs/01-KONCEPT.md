# Snake Brawl — Koncept gry

> Etap 1 z 4: **Koncept** → Architektura → Plan → Kod
> Status: ✅ zaakceptowany

## 1. Jedno zdanie

Arcade'owy pojedynek dwóch węży na jednej klawiaturze: rośniesz, zjadając jedzenie,
strzelasz kawałkami własnego ogona, a rundę wygrywa ten, kto pierwszy trafi rywala w głowę
(albo komu rywal wjedzie w czerwoną ścianę).

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
3. **Runda** nie ma limitu czasu: trwa, aż któryś wąż zginie.
4. **Wynik rundy**:
   - jeden wąż zginął (strzał w głowę albo czerwona ściana), więc wygrywa drugi;
   - obaj zginęli w tym samym momencie, więc jest remis.
5. **Mecz** gramy do 3 wygranych rund (remis nie daje punktu). Potem ekran zwycięzcy
   i rewanż jednym klawiszem.

## 5. Zasady

**Ruch**
- Plansza w kratkę, ruch krok po kroku ze stałą prędkością (~10 kratek/s).
- Nie można zawrócić w miejscu klawiszem.
- **Trzy rodzaje ścian** (każdy to ok. 1/3 ścian):
  - 🔴 **czerwona** zabija,
  - ⚫ **czarna** odbija: wąż zawraca, czyli ogon staje się głową i wąż jedzie w przeciwną stronę,
  - 🔵 **niebieska** przenosi: wąż przeskakuje ją i wyjeżdża po jej drugiej stronie.
- **Krawędź planszy** działa jak niebieska ściana: wyjeżdżasz z drugiej strony planszy.
- Własne ciało, ciało rywala i zderzenie głowami **odbijają** (jak czarna ściana).

**Jedzenie**
- Na planszy zawsze leżą 3 owoce. Zjedzenie daje +1 segment.

**Strzelanie**
- **1 segment ogona = 10 strzałów.** Pierwszy strzał z dziesiątki zabiera segment z ogona,
  kolejne 9 jest „za darmo”. Z samą głową można strzelać tylko do końca bieżącej dziesiątki.
  Pasek u góry pokazuje pozostałą amunicję (AMMO).
- Cooldown 0,3 s. Pocisk leci prosto, **3× szybciej niż wąż** (30 pól/s).
- **Trafienie w ciało** odcina ogon od trafionego segmentu do końca.
- **Trafienie w głowę** zabija rywala, więc strzelający wygrywa rundę. Wjazd głową w cudzy pocisk też.
- **Własne pociski są niegroźne**: przelatują przez strzelającego bez śladu.
- Pocisk **znika** na każdej ścianie (dowolnego koloru) i na krawędzi planszy.
- Ściany są niezniszczalne.
- Dwa pociski, które się spotkają, znoszą się nawzajem. Pociski przelatują nad owocami.

**Labirynt**
- Generowany losowo, ale symetrycznie (obrót o 180° wokół środka), żeby oba spawny były w identycznej sytuacji.
- Okolice spawnów są zawsze wolne, a każde wolne pole jest osiągalne (licząc przejścia przez portale).

## 6. Styl i oprawa

- Kratka w stylu pikselowym, węże i pociski z neonową poświatą, ciemne tło.
- Efekty: eksplozje cząsteczek, potrząsanie ekranem przy trafieniu i odbiciu, błysk przy teleporcie.
- Dźwięk: krótkie efekty (strzał, jedzenie, trafienie, śmierć), na razie bez muzyki.

## 7. Poza pierwszą wersją (później)

- Power-upy: przyspieszenie, tarcza, potrójny strzał, duch.
- Bot (AI) jako tryb treningowy.
- Muzyka, kilka gotowych map, ustawienia meczu.
- Gra online, wersja mobilna, tabele wyników.
