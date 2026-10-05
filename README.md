# Snake Brawl

Arcade'owy pojedynek dwóch węży na jednej klawiaturze. Rośniesz, zjadając owoce,
strzelasz kawałkami własnego ogona, a rundę wygrywa ten, kto przetrwa. Mecz gramy do 3 wygranych.

| Gracz | Ruch      | Strzał   |
|-------|-----------|----------|
| Leon  | `W A S D` | `Spacja` |
| Hugo  | strzałki  | `Enter`  |

`P` pauza · `Esc` menu · `M` dźwięk

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

## Dokumentacja

1. [Koncept](docs/01-KONCEPT.md): zasady gry
2. [Architektura](docs/02-ARCHITEKTURA.md): jak zbudowany jest kod
3. [Plan](docs/03-PLAN.md): kroki i lista kontrolna
