# Snake Brawl: wystawienie gry w internecie

Gra składa się z dwóch części:

| Część | Gdzie | Koszt |
|-------|-------|-------|
| Gra (HTML, JS) | GitHub Pages | za darmo (repo musi być publiczne) |
| Serwer pokoi (przekazuje ruchy) | Cloudflare Workers + Durable Objects | za darmo w ramach darmowego planu |

Wszystko poniżej robi się **raz**. Potem każdy `git push` na `main` aktualizuje grę sam.

## 1. Repo publiczne

GitHub → repo `snake-brawl` → **Settings** → **General** → na dole **Danger Zone** →
**Change repository visibility** → **Public**.

## 2. GitHub Pages (gra)

GitHub → repo → **Settings** → **Pages**:
- **Source:** *Deploy from a branch*
- **Branch:** `main`, folder `/ (root)` → **Save**

Po 1–2 minutach gra działa pod adresem: **https://traciborski.github.io/snake-brawl/**
(tryb na jednym komputerze działa od razu, tryb online po kroku 3 i 4).

## 3. Cloudflare (serwer pokoi)

1. Załóż darmowe konto: https://dash.cloudflare.com/sign-up
2. Na swoim komputerze, w folderze z repo (potrzebny Node.js):

   ```bash
   npx wrangler login         # otworzy przeglądarkę, zaloguj się i zatwierdź
   npm run deploy:server      # czyli: npx wrangler deploy
   ```

   Przy pierwszym razie Cloudflare może poprosić o wybranie nazwy subdomeny `workers.dev`.
3. Na końcu wrangler wypisze adres, np. `https://snake-brawl.twoja-nazwa.workers.dev`.
   Otwórz go w przeglądarce: ma się pokazać *„Snake Brawl: serwer pokoi działa.”*

## 4. Adres serwera w grze

W `src/config.js` wpisz adres z kroku 3, zamieniając `https://` na `wss://`:

```js
export const ONLINE_SERVER = 'wss://snake-brawl.twoja-nazwa.workers.dev';
```

Potem `npm run build`, commit i push na `main` (albo po prostu podeślij adres Claude'owi).

Do szybkiego testu bez zmiany kodu można też podać adres w linku:
`https://traciborski.github.io/snake-brawl/?server=wss://snake-brawl.twoja-nazwa.workers.dev`

## 5. Gra z sąsiadami

1. Każdy otwiera https://traciborski.github.io/snake-brawl/ i wybiera **Gra przez internet**.
2. Jedna osoba klika **Utwórz pokój** i podaje pozostałym 4-znakowy kod.
3. Pozostali wpisują kod i klikają **Dołącz**.
4. Założyciel klika **Start**.

## Limity darmowego planu Cloudflare

Darmowy plan ma dzienny limit zapytań do Durable Objects. Gra wysyła ok. 20 wiadomości na sekundę
na gracza, co przy kilku meczach dziennie mieści się z zapasem (orientacyjnie kilka godzin gry
w 4 osoby dziennie). Po przekroczeniu limitu serwer wraca do działania następnego dnia.
