# Zasady pracy w tym repo

- Commituj i pushuj zawsze prosto do `main`. Bez nowych gałęzi i bez pull requestów.
- Przed commitem: `npm run build` (odświeża `dist/snake-brawl.js`) i `npm test`. Oba muszą przejść.
- Rozmawiamy po polsku. Teksty w grze, komentarze w kodzie i dokumentacja też są po polsku.
- Push na `main` = nowa wersja gry w internecie (Cloudflare sam buduje i wystawia, `wrangler.toml`).
- Przy zmianie zasad gry aktualizuj `docs/01-KONCEPT.md` (i architekturę/plan, jeśli dotyczy).
