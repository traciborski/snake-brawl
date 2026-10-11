# Snake Brawl: wystawienie gry w internecie

Całość stoi na **Cloudflare Workers**, pod jednym adresem:

| Część | Co robi |
|-------|---------|
| Pliki gry (`index.html`, `style.css`, `dist/snake-brawl.js`) | Cloudflare serwuje je jako zwykłą stronę |
| Serwer pokoi (`server/worker.js`, `/room/KOD`) | przekazuje ruchy między graczami (Durable Objects) |

Repo może zostać **prywatne**. Do internetu trafiają tylko trzy pliki gry (folder `site/`
składany automatycznie przy wystawianiu), a nie reszta repo. Darmowy plan Cloudflare wystarczy.
Po jednorazowym podpięciu repo Cloudflare sam buduje i wystawia grę po każdym pushu na `main`.

## 1. Konto Cloudflare

Załóż darmowe konto: https://dash.cloudflare.com/sign-up

## 2. Automatyczne budowanie z GitHuba (raz)

Cloudflare sam pobiera kod z GitHuba po każdym pushu na `main`, buduje grę
(`node scripts/build.js --site`, ustawione w `wrangler.toml`) i wystawia ją razem z serwerem pokoi.
Repo może być prywatne: Cloudflare dostaje dostęp tylko do wskazanego repo.

1. Panel Cloudflare → **Workers & Pages** → **Create** → **Import a repository**
   (*Connect GitHub*, zezwól aplikacji Cloudflare na dostęp do repo `snake-brawl`).
2. Wybierz repo `snake-brawl` i ustaw:
   - **Project / Worker name:** `snake-brawl` (musi być taka sama jak `name` w `wrangler.toml`,
     inaczej budowanie się nie uda),
   - **Build command:** puste (budowanie robi `wrangler.toml`),
   - **Deploy command:** `npx wrangler deploy` (domyślne),
   - **Root directory:** puste (główny folder repo),
   - **Branch:** `main`.
3. **Deploy**. Po minucie gra działa pod adresem w rodzaju
   **https://snake-brawl.twoja-nazwa.workers.dev** (widać go w panelu Workera).

Od teraz każdy push na `main` sam aktualizuje grę w internecie. Przebieg każdego budowania widać
w panelu Workera, w zakładce **Deployments** / **Builds**.

> Nazwy przycisków w panelu Cloudflare mogą się trochę różnić. Gdy Worker już istnieje, repo podpina się
> w **Settings → Builds → Connect**.

### Wystawienie ręczne (zapasowe)

Bez podpinania GitHuba też się da, z własnego komputera (potrzebny Node.js):

```bash
npx wrangler login         # tylko pierwszy raz: logowanie w przeglądarce
npm run deploy:server      # skleja grę i wystawia ją razem z serwerem pokoi
```

## 3. Gra z sąsiadami

1. Każdy otwiera adres gry i wybiera **Gra przez internet**.
2. Jedna osoba klika **Utwórz pokój**, potem **Kopiuj link** i wysyła link znajomym
   (albo podaje im 4-znakowy kod).
3. Pozostali otwierają link, wpisują imię i wciskają Enter (albo wpisują kod i klikają **Dołącz**).
4. Założyciel klika **Start**.

Gra sama łączy się z serwerem pokoi pod tym samym adresem, nic nie trzeba konfigurować.

## Gra otwarta z dysku

Dwuklik w `index.html` działa offline. Żeby z takiej kopii grać też online, wpisz adres
w `src/config.js` (`ONLINE_SERVER = 'wss://snake-brawl.twoja-nazwa.workers.dev'`) i zrób `npm run build`.

## Limity darmowego planu Cloudflare

Darmowy plan ma dzienny limit zapytań do Durable Objects. Gra wysyła ok. 20 wiadomości na sekundę
na gracza, co według szacunków mieści kilka godzin gry w 4 osoby dziennie. Po przekroczeniu limitu
serwer pokoi wraca do działania następnego dnia (tryb na jednym komputerze działa zawsze).
