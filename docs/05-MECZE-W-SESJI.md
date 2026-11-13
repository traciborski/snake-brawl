# Mini-spec: wyniki sesji

- **Sesja** to kolejne mecze w jednym pokoju online. Kończy się, gdy pokój opustoszeje.
- **Mecz** nadal trwa do 3 wygranych rund. Każdy mecz zakończony zwycięstwem dodaje
  zwycięzcy +1 do wyniku sesji; remisy rund nie dają punktu.
- W poczekalni widać tabelę: gracz i liczba wygranych meczów. Przy remisie gracze są ex aequo.
- Historia pokazuje każdy zakończony mecz: numer, uczestników, wynik rund i zwycięzcę.
- Rewanż zachowuje tabelę i historię. Przerwany mecz nie jest liczony.
- Serwer pokoju przechowuje i rozsyła wyniki; po opróżnieniu pokoju sesja się zeruje.
- Wyniki są tymczasowe: nie obejmują rankingu między pokojami ani zapisu po restarcie.
