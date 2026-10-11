# Snake Brawl

Arcade'owa walka węży: we dwóch na jednej klawiaturze albo w 2–4 osoby przez internet.
Rośniesz, zjadając owoce, strzelasz kawałkami własnego ogona, a rundę wygrywa ostatni żywy wąż.
Mecz gramy do 3 wygranych.

| Tryb | Sterowanie |
|------|------------|
| Jeden komputer, gracz 1 | `W A S D` + `Spacja` |
| Jeden komputer, gracz 2 | strzałki + `Enter` |
| Przez internet | każdy steruje swoim wężem dowolnym z tych zestawów |

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
  wybierz *Gra przez internet*, utwórz pokój i dołącz do niego kodem.
- **W internecie:** gra na GitHub Pages, serwer pokoi na Cloudflare Workers
  (instrukcja wystawienia: [docs/04-WYSTAWIENIE.md](docs/04-WYSTAWIENIE.md)).

## Dokumentacja

1. [Koncept](docs/01-KONCEPT.md): zasady gry
2. [Architektura](docs/02-ARCHITEKTURA.md): jak zbudowany jest kod
3. [Plan](docs/03-PLAN.md): kroki i lista kontrolna
