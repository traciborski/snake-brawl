# Snake Brawl — Koncept gry

> Etap 1 z 4: **Koncept** → Architektura → Plan → Kod
> Status: ✅ zaakceptowany

## 1. Jedno zdanie

Arcade'owa walka węży, we dwóch na jednej klawiaturze albo w 2–4 osoby przez internet:
rośniesz, zjadając jedzenie, strzelasz kawałkami własnego ogona, a rundę wygrywa ostatni
żywy wąż (strzał w głowę i czerwona ściana eliminują).

## 2. Ustalenia

| Obszar     | Decyzja                                                  |
|------------|----------------------------------------------------------|
| Baza       | Rozwijamy pomysł Snake Brawl, kod piszemy od nowa        |
| Gracze     | Offline: 2 na jednej klawiaturze. Online: 2–4, każdy na swoim komputerze |
| Platforma  | Przeglądarka na PC, klawiatura                           |
| Klimat     | Arcade dla wszystkich: szybko, rywalizacja, krótkie rundy |
| Styl       | Pikselowa kratka z neonową poświatą na ciemnym tle       |
| Język UI   | Polski                                                   |

## 3. Gracze i sterowanie

- Na starcie każdy gracz wpisuje imię (do 12 znaków). Gra je zapamiętuje.
- Kolory graczy według kolejności: żółty `#FFD700`, cyjan `#00E5FF`, zielony `#39FF14`,
  pomarańczowy `#FF9100` (żaden nie myli się ze ścianami ani jedzeniem).

| Tryb    | Gracz 1             | Gracz 2            |
|---------|---------------------|--------------------|
| Offline | `W A S D` + `Spacja` | strzałki + `Enter` |
| Online  | każdy steruje swoim wężem dowolnym z tych zestawów | |

**Telefon i tablet** (ta sama strona, bez osobnej wersji): sterowanie dotykiem włącza się samo
po pierwszym dotknięciu ekranu. Przesunięcie palcem w dowolnym miejscu skręca węża, a przycisk
**STRZAŁ** w prawym dolnym rogu (można go przytrzymać) strzela. Przycisk widać tylko na ekranie
grającego dotykiem i tylko w trakcie rundy. Gra prosi o trzymanie telefonu poziomo i przechodzi
na pełny ekran. Na jednym urządzeniu dotyk steruje graczem 1, więc telefon nadaje się głównie
do gry przez internet.

## 4. Mecz i runda

1. **Menu**: wybór trybu (jeden komputer / internet), potem imiona.
2. **Odliczanie** 3-2-1, węże startują w rogach planszy (przy dwóch graczach w przeciwległych), długość 3.
3. **Runda** nie ma limitu czasu: trwa, aż zostanie najwyżej jeden żywy wąż.
4. **Wynik rundy**:
   - wąż ginie od strzału w głowę albo czerwonej ściany i dalej tylko ogląda;
   - ostatni żywy wygrywa rundę;
   - jeśli ostatni odpadną w tym samym momencie, jest remis.
5. **Mecz** gramy do 3 wygranych rund (remis nie daje punktu). Potem ekran zwycięzcy
   i rewanż jednym klawiszem.

## 5. Zasady

**Ruch**
- Plansza w kratkę, ruch krok po kroku ze stałą prędkością (~10 kratek/s).
- Nie można zawrócić w miejscu klawiszem.
- **Trzy rodzaje ścian** (ok. 50% czarnych, 30% czerwonych, 20% niebieskich):
  - 🔴 **czerwona** zabija,
  - ⚫ **czarna** odbija: wąż zawraca, czyli ogon staje się głową i wąż jedzie w przeciwną stronę,
  - 🔵 **niebieska** przenosi: każda niebieska ściana ma bliźniaczkę po przeciwnej stronie planszy
    (lustrzane odbicie, bo labirynt jest symetryczny). Wjeżdżasz w jedną, wyjeżdżasz zza drugiej
    i jedziesz dalej w tym samym kierunku.
- **Krawędź planszy** działa jak niebieska ściana: wyjeżdżasz z drugiej strony planszy.
- **Zderzenie głowami:** giną obaj (przy dwóch graczach to remis).
- **Głowa w ogon (ciało) rywala:** ginie ten, kto wjechał głową.
- **Własne ciało** odbija (jak czarna ściana).

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
- Generowany losowo, ale symetrycznie w obu osiach, żeby wszystkie cztery rogi były w identycznej sytuacji.
- Na środku górnego i dolnego brzegu stoją stałe czarne osłony: węże z sąsiednich rogów
  startują w tym samym rzędzie i nie mogą mieć się od razu na muszce.
- Okolice spawnów są zawsze wolne, a każde wolne pole jest osiągalne (licząc przejścia przez portale).

## 6. Styl i oprawa

- Kratka w stylu pikselowym, węże i pociski z neonową poświatą, ciemne tło.
- Efekty: eksplozje cząsteczek, potrząsanie ekranem przy trafieniu i odbiciu, błysk przy teleporcie.
- Dźwięk: krótkie efekty (strzał, jedzenie, trafienie, śmierć), na razie bez muzyki.

## 7. Gra przez internet

- **Gra i mały serwer pośredniczący** stoją razem na Cloudflare Workers, pod jednym adresem:
  wchodzisz na link i grasz, bez instalowania. Serwer przekazuje ruchy między graczami.
- **Pokój:** ktoś klika *Utwórz pokój* i dostaje kod (np. `KOT7`) oraz link zaproszenia
  (`adres-gry/?pokoj=KOT7`, przycisk *Kopiuj link*). Kto otworzy link, od razu widzi zaproszenie:
  wpisuje imię i dołącza Enterem. Można też wejść do gry i wpisać sam kod. W poczekalni widać graczy z imionami i kolorami, założyciel klika *Start*.
- 2–4 graczy, ta sama mechanika co offline. Bez pauzy i bez przeklikiwania ekranów wyników
  (wszyscy przechodzą dalej w tym samym momencie).
- Rozłączenie: wąż gracza ginie, reszta gra dalej.
- Po meczu wszyscy wracają do poczekalni, skąd założyciel może zacząć rewanż.

## 8. Poza pierwszą wersją (później)

- Power-upy: przyspieszenie, tarcza, potrójny strzał, duch.
- Bot (AI) jako tryb treningowy.
- Muzyka, kilka gotowych map, ustawienia meczu.
- Wersja mobilna, tabele wyników, rollback w grze online.
