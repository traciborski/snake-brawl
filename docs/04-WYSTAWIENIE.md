# Snake Brawl: wystawienie gry w internecie

Całość stoi na **Cloudflare Workers**, pod jednym adresem:

| Część | Co robi |
|-------|---------|
| Pliki gry (`index.html`, `style.css`, `dist/snake-brawl.js`) | Cloudflare serwuje je jako zwykłą stronę |
| Serwer pokoi (`server/worker.js`, `/room/KOD`) | przekazuje ruchy między graczami (Durable Objects) |

Repo może zostać **prywatne**. Do internetu trafiają tylko trzy pliki gry (folder `site/`
składany automatycznie przy wystawianiu), a nie reszta repo. Darmowy plan Cloudflare wystarczy.

## 1. Konto Cloudflare

Załóż darmowe konto: https://dash.cloudflare.com/sign-up

## 2. Wystawienie (pierwszy raz i po każdej zmianie gry)

Na swoim komputerze, w folderze z repo (potrzebny Node.js):

```bash
npx wrangler login         # tylko pierwszy raz: otworzy przeglądarkę, zaloguj się i zatwierdź
npm run deploy:server      # skleja grę i wystawia ją razem z serwerem pokoi
```

Przy pierwszym razie Cloudflare może poprosić o wybranie nazwy subdomeny `workers.dev`.
Na końcu wrangler wypisze adres gry, np. **https://snake-brawl.twoja-nazwa.workers.dev**.

Po każdej zmianie w grze wystarczy znowu `npm run deploy:server`.

## 3. Gra z sąsiadami

1. Każdy otwiera adres gry i wybiera **Gra przez internet**.
2. Jedna osoba klika **Utwórz pokój** i podaje pozostałym 4-znakowy kod.
3. Pozostali wpisują kod i klikają **Dołącz**.
4. Założyciel klika **Start**.

Gra sama łączy się z serwerem pokoi pod tym samym adresem, nic nie trzeba konfigurować.

## Gra otwarta z dysku

Dwuklik w `index.html` działa offline. Żeby z takiej kopii grać też online, wpisz adres
w `src/config.js` (`ONLINE_SERVER = 'wss://snake-brawl.twoja-nazwa.workers.dev'`) i zrób `npm run build`.

## Limity darmowego planu Cloudflare

Darmowy plan ma dzienny limit zapytań do Durable Objects. Gra wysyła ok. 20 wiadomości na sekundę
na gracza, co według szacunków mieści kilka godzin gry w 4 osoby dziennie. Po przekroczeniu limitu
serwer pokoi wraca do działania następnego dnia (tryb na jednym komputerze działa zawsze).
