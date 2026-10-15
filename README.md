# Snake Brawl

Arcade'owa walka węży: w 1–4 osoby na jednej klawiaturze (sam = trening) albo w 2–6 osób przez internet.
Rośniesz, zjadając owoce, strzelasz kawałkami własnego ogona, a rundę wygrywa ostatni żywy wąż.
Mecz gramy do 3 wygranych.

| Tryb | Sterowanie |
|------|------------|
| Jeden komputer, gracz 1 | `W A S D` + lewy `Ctrl` / `Spacja` (strzał) + lewy `Shift` (miecz) |
| Jeden komputer, gracz 2 | strzałki + `Enter` + prawy `Shift` |
| Jeden komputer, gracz 3 | `I J K L` + `U` + `O` |
| Jeden komputer, gracz 4 | numpad `8 4 5 6` + `0` + `,` |
| Trening (sam) | dowolny z tych zestawów |
| Przez internet | każdy steruje swoim wężem dowolnym z tych zestawów |
| Telefon / tablet | przesunięcie palcem = skręt, przyciski **STRZAŁ** i **MIECZ** (telefon poziomo, pełny ekran po stuknięciu) |

`P` pauza (tylko offline) · `Esc` menu · `M` dźwięk

## Uruchomienie

**Granie:** otwórz `index.html` dwuklikiem, nic więcej nie trzeba.

**Praca nad kodem** (Node.js 20+, bez instalowania zależności):

```bash
npm start      # http://localhost:8080, zawsze świeży kod z src/
npm test       # testy logiki gry + sprawdzenie, czy dist/ jest aktualny
npm run build  # po zmianach w src/: odświeża dist/snake-brawl.js
```

Kod źródłowy to ES modules w `src/`. Przeglądarki blokują moduły otwierane z dysku
(`file://`), dlatego `index.html` ładuje sklejony plik `dist/snake-brawl.js`.
Po zmianach w `src/` trzeba uruchomić `npm run build` i zacommitować `dist/`
(jeśli się zapomni, `npm test` o tym przypomni).

## Gra przez internet

- **Lokalnie / w domu:** `npm start` uruchamia też serwer pokoi. Otwórz http://localhost:8080
  w kilku kartach (albo z innych komputerów w tej samej sieci: `http://ADRES-KOMPUTERA:8080`),
  wybierz *Gra przez internet*, utwórz pokój i wyślij link zaproszenia (albo kod).
- **W internecie:** gra i serwer pokoi razem na Cloudflare Workers. Cloudflare sam buduje
  i wystawia grę po każdym pushu na `main` (instrukcja: [docs/04-WYSTAWIENIE.md](docs/04-WYSTAWIENIE.md)).
  Repo może zostać prywatne.
- **Pokój publiczny 4B:** zawsze otwarty, wchodzi się z menu głównego jednym kliknięciem.
- **Lista otwartych pokoi:** `adres-gry/pokoje` (w grze przycisk *Lista pokoi*).

## Dokumentacja

1. [Koncept](docs/01-KONCEPT.md): zasady gry
2. [Architektura](docs/02-ARCHITEKTURA.md): jak zbudowany jest kod
3. [Plan](docs/03-PLAN.md): kroki i lista kontrolna
4. [Wystawienie](docs/04-WYSTAWIENIE.md): Cloudflare Workers
