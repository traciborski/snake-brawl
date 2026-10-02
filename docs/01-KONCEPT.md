# Snake Brawl — Koncept gry (wersja robocza)

> Etap 1 z 4: **Koncept** → Architektura → Plan → Kod
> Status: do akceptacji. Punkty oznaczone ❓ czekają na decyzję.

## 1. Jedno zdanie

Arcade'owy pojedynek dwóch węży na jednej klawiaturze: rośniesz, zjadając jedzenie,
strzelasz, żeby zablokować rywala, a wygrywa ten, kto przetrwa rundę.

## 2. Ustalenia

| Obszar     | Decyzja                                          |
|------------|--------------------------------------------------|
| Baza       | Rozwijamy obecny pomysł Snake Brawl (piszemy od nowa) |
| Gracze     | 2 graczy lokalnie, jedna klawiatura (bez bota na start) |
| Platforma  | Przeglądarka na PC, sterowanie klawiaturą         |
| Klimat     | Arcade dla wszystkich: szybko, rywalizacja, krótkie rundy |

## 3. Bohaterowie

- **Leon** — żółty wąż, sterowanie `W A S D` + strzał `Spacja` ❓ (albo `F`)
- **Hugo** — drugi wąż (kolor ❓), sterowanie `Strzałki` + strzał `Enter` ❓ (albo `/`)

## 4. Pętla rozgrywki

1. **Menu**: start, sterowanie, ustawienia meczu.
2. **Odliczanie** 3-2-1, oba węże startują w przeciwnych rogach planszy.
3. **Runda** trwa, dopóki jeden wąż żyje (albo do limitu czasu ❓ np. 90 s).
4. **Ekran wyniku rundy**: kto wygrał i aktualny stan meczu.
5. **Mecz** do 3 wygranych rund ❓ i ekran zwycięzcy, rewanż jednym klawiszem.

## 5. Zasady (propozycja)

**Ruch**
- Plansza w kratkę, ruch krok po kroku (klasyczny snake), stała prędkość.
- Śmierć: uderzenie w ścianę, w siebie, w ciało rywala.
- Zderzenie głowami: obaj giną i runda kończy się remisem.

**Jedzenie**
- Na planszy zawsze leży kilka owoców; zjedzenie daje +1 segment i punkty.

**Strzelanie** (wyróżnik gry)
- Pocisk leci prosto, ma cooldown (~0,3 s).
- Strzał kosztuje 1 segment własnego ogona ❓, więc długość to „amunicja”. Strzelanie nie jest wtedy darmowe.
- Trafienie w ciało rywala odcina mu ogon od miejsca trafienia.
- Trafienie w głowę ❓ zabija albo tylko ogłusza na chwilę.
- Pocisk niszczy pojedynczy blok ściany ❓.

**Labirynt**
- Mapa jest generowana losowo, ale symetrycznie, żeby było fair dla obu graczy.
- Spawny i ich okolice zawsze wolne, mapa zawsze przejezdna.

**Power-upy** ❓ (raczej po pierwszej wersji)
- Przyspieszenie, tarcza na jedno trafienie, potrójny strzał, duch (przenikanie ścian).

## 6. Czego NIE robimy w pierwszej wersji

- Gra online / multiplayer przez sieć
- Bot (AI), który może wrócić później jako tryb treningowy
- Wersja mobilna / sterowanie dotykiem
- Konta, tabela wyników online

## 7. Styl

- Grafika: pikselowa / neonowa ❓ na ciemnym tle, czytelne kolory graczy.
- Efekty: eksplozje cząsteczek, potrząsanie ekranem przy trafieniu.
- Dźwięk: krótkie efekty (strzał, jedzenie, śmierć) ❓ i muzyka później.
- Język interfejsu: polski.

## 8. Co zabieramy z obecnego kodu

- Pomysł: Leon i Hugo, labirynt, strzelanie do jedzenia/rywala, eksplozje.
- Kod: nie przenosimy wprost. Obecny `script.js` to jeden plik ze zmiennymi globalnymi
  i zdublowaną logiką gracza/bota, więc nowa wersja dostanie porządną architekturę (etap 2).

## 9. Otwarte pytania

1. Klawisze strzału dla obu graczy?
2. Czy strzał kosztuje segment ogona?
3. Trafienie w głowę: śmierć czy ogłuszenie?
4. Czy ściany da się niszczyć?
5. Limit czasu rundy i do ilu wygranych gramy mecz?
6. Styl graficzny: piksele czy neon?
7. Power-upy już w pierwszej wersji, czy później?
