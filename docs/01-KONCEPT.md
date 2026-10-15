# Snake Brawl — Koncept gry

> Etap 1 z 4: **Koncept** → Architektura → Plan → Kod
> Status: ✅ zaakceptowany

## 1. Jedno zdanie

Arcade'owa walka węży, w 1–4 osoby na jednej klawiaturze albo w 2–6 osób przez internet:
rośniesz, zjadając jedzenie, strzelasz kawałkami własnego ogona, a rundę wygrywa ostatni
żywy wąż (strzał w głowę i czerwona ściana eliminują).

## 2. Ustalenia

| Obszar     | Decyzja                                                  |
|------------|----------------------------------------------------------|
| Baza       | Rozwijamy pomysł Snake Brawl, kod piszemy od nowa        |
| Gracze     | Offline: 1–4 na jednej klawiaturze (1 = trening). Online: 2–6, każdy na swoim komputerze |
| Platforma  | Przeglądarka na PC, klawiatura                           |
| Klimat     | Arcade dla wszystkich: szybko, rywalizacja, krótkie rundy |
| Styl       | Pikselowa kratka z neonową poświatą na ciemnym tle       |
| Język UI   | Polski                                                   |

## 3. Gracze i sterowanie

- Na starcie każdy gracz wpisuje imię (do 12 znaków). Gra je zapamiętuje.
- **Każdy wybiera kolor węża** obok imienia: kliknięcie w kwadracik zmienia kolor na następny,
  którego nie ma nikt inny. Do wyboru 8 neonowych kolorów: żółty `#FFD700`, cyjan `#00E5FF`,
  zielony `#39FF14`, pomarańczowy `#FF9100`, fioletowy `#B388FF`, biały `#FFFFFF`,
  limonkowy `#C6FF00`, morski `#1DE9B6` (żaden nie myli się ze ścianami ani jedzeniem).
  Domyślnie gracze mają je w tej kolejności. Gra pamięta wybór.
- Online kolor wybiera się przy imieniu, a w poczekalni można go jeszcze zmienić (kliknięciem
  w swój kwadracik). Serwer pilnuje, żeby się nie powtarzał: jeśli ktoś już ma wybrany kolor,
  dostajesz pierwszy wolny. W trakcie meczu kolory się nie zmieniają.

| Gracz (offline) | Ruch | Strzał | Miecz |
|-----------------|------|--------|-------|
| 1 | `W A S D` | `Spacja` | lewy `Shift` (albo `E`) |
| 2 | strzałki | `Enter` | prawy `Shift` (albo prawy `Ctrl`) |
| 3 | `I J K L` | `U` | `O` |
| 4 | klawiatura numeryczna `8 4 5 6` (albo `2` w dół) | `0` | `,` (numpad) |
| Trening (sam) | dowolny z tych zestawów |
| Online | każdy steruje swoim wężem dowolnym z tych zestawów |

**Telefon i tablet** (ta sama strona, bez osobnej wersji): sterowanie dotykiem włącza się samo
po pierwszym dotknięciu ekranu. Przesunięcie palcem w dowolnym miejscu skręca węża, a przycisk
**STRZAŁ** w prawym dolnym rogu (można go przytrzymać) strzela, a mniejszy przycisk **MIECZ** nad
nim tnie. Przyciski widać tylko na ekranie grającego dotykiem i tylko w trakcie rundy. Gra prosi
o trzymanie telefonu poziomo i przy pierwszym stuknięciu przechodzi na pełny ekran (i wraca na
niego przy kolejnym stuknięciu, jeśli ktoś z niego wyszedł). Przeglądarki nie pozwalają włączyć
pełnego ekranu bez stuknięcia. iPhone w ogóle nie daje stronom pełnego ekranu: tam trzeba
dodać grę do ekranu początkowego („Udostępnij → Do ekranu początkowego”), wtedy otwiera się
jak aplikacja, bez paska przeglądarki. Na jednym urządzeniu dotyk steruje graczem 1, więc telefon nadaje się głównie
do gry przez internet.

## 4. Mecz i runda

1. **Menu**: wybór trybu (jeden komputer / internet), potem liczba graczy (offline 1–4) i imiona.
2. **Odliczanie** 3-2-1, węże startują w rogach planszy (przy dwóch graczach w przeciwległych),
   piąty i szósty (online) na środku lewego i prawego boku; długość 3.
3. **Runda** nie ma limitu czasu: trwa, aż zostanie najwyżej jeden żywy wąż.
4. **Wynik rundy**:
   - wąż ginie od strzału w głowę albo czerwonej ściany i dalej tylko ogląda;
   - ostatni żywy wygrywa rundę;
   - jeśli ostatni odpadną w tym samym momencie, jest remis.
5. **Mecz** gramy do 3 wygranych rund (remis nie daje punktu). Potem ekran zwycięzcy
   i rewanż jednym klawiszem.
6. **Trening** (offline, jeden gracz): sam wąż na planszy, bez rund i punktów. Próba trwa,
   dopóki wąż żyje (w pojedynkę zabija tylko czerwona ściana). Wynik to zjedzone owoce i czas,
   gra pamięta rekord. Spacja zaczyna kolejną próbę na nowym labiryncie.

## 5. Zasady

**Ruch**
- Plansza w kratkę, ruch krok po kroku ze stałą prędkością (ok. 9 kratek/s).
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
- Cooldown ok. 0,3 s. Pocisk leci prosto, **3× szybciej niż wąż** (ok. 27 pól/s).
- **Trafienie w ciało** odcina ogon od trafionego segmentu do końca.
- **Trafienie w głowę** zabija rywala, więc strzelający wygrywa rundę. Wjazd głową w cudzy pocisk też.
- **Własne pociski są niegroźne**: przelatują przez strzelającego bez śladu.
- **Ściany działają na pocisk tak samo jak na węża:** czarna go odbija (zawraca), czerwona niszczy,
  a niebieska i krawędź planszy przenoszą na drugą stronę. Odbity pocisk może wrócić i trafić
  rywala (strzelającego przelatuje bez szkody).
- Pocisk ma **zasięg jednej szerokości planszy** (48 pól) i znika po **3 odbiciach**, żeby nie latał w kółko.
- Ściany są niezniszczalne.
- Dwa pociski, które się spotkają, znoszą się nawzajem. Pociski przelatują nad owocami.

**Miecz (atak z bliska)**
- Drugi przycisk ataku. Po wciśnięciu wokół głowy wiruje ostrze przez ok. 0,45 s i tnie wszystko
  w **kole o promieniu 3 pól** wokół głowy (także przez krawędź planszy, ściany nie zasłaniają):
  - głowa rywala w zasięgu → rywal ginie,
  - ciało rywala w zasięgu → ogon odcięty od pierwszego trafionego segmentu,
  - cudze pociski w zasięgu → zniszczone (miecz to też tarcza).
- Ostrze tnie przez cały czas wirowania, także rywala, który dopiero wjedzie w zasięg.
- Własny wąż i własne pociski są bezpieczne. Dwa miecze naraz w swoim zasięgu: giną obaj.
- Nic nie kosztuje, ale kolejne cięcie dopiero po **ok. 4 s**. Pasek obok wygranych w górnym
  pasku pokazuje, kiedy miecz jest gotowy (pełny i świeci).

**Labirynt**
- Generowany losowo, ale symetrycznie w obu osiach, żeby wszystkie cztery rogi (i oba środki boków)
  były w identycznej sytuacji.
- Na środku górnego i dolnego brzegu oraz na środku planszy stoją stałe czarne osłony: węże
  z sąsiednich miejsc startu jadą w tym samym rzędzie i nie mogą mieć się od razu na muszce.
  Przed każdym wężem aż do osłony jest wolny korytarz, więc na starcie nie wpadnie w czerwoną ścianę.
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
- **Pokój publiczny `4B`** istnieje zawsze (na razie jeden). Widać go w menu głównym
  (przycisk *Pokój publiczny 4B* ze stanem, np. „2/6 · czekają!”) i na górze listy pokoi.
  Wchodzi się bez zakładania i bez kodu: wpisujesz imię i jesteś. Mecz zaczyna gospodarz,
  czyli ten, kto jest w pokoju najdłużej.
- **Lista pokoi** (`adres-gry/pokoje`, w grze przycisk *Lista pokoi*): wszystkie otwarte pokoje
  z kodem, graczami i stanem (poczekalnia albo trwający mecz z numerem rundy). Przycisk *Dołącz*
  otwiera zaproszenie do pokoju, pełne pokoje są oznaczone. Lista odświeża się sama co kilka sekund.
- 2–6 graczy, ta sama mechanika co offline (przy 5–6 wężach na planszy leży 5 owoców). Bez pauzy i bez przeklikiwania ekranów wyników
  (wszyscy przechodzą dalej w tym samym momencie).
- **Dołączanie w trakcie meczu:** kto wejdzie do pokoju, gdy trwa mecz (i jest wolne miejsce),
  czeka w poczekalni z napisem „Trwa mecz. Dołączysz od rundy N…” i wchodzi do gry od najbliższej
  wolnej rundy (zwykle następnej albo jeszcze kolejnej), z zerem wygranych.
- Rozłączenie: wąż gracza ginie, reszta gra dalej.
- Po meczu wszyscy wracają do poczekalni, skąd założyciel może zacząć rewanż.

## 8. Poza pierwszą wersją (później)

- Power-upy: przyspieszenie, tarcza, potrójny strzał, duch.
- Bot (AI) jako tryb treningowy.
- Muzyka, kilka gotowych map, ustawienia meczu.
- Wersja mobilna, tabele wyników, rollback w grze online.
