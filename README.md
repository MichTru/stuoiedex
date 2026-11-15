# Stuoiedex

Il "Pokédex" dei clienti del Bar Stuoie: check-in, catture, missioni, medaglie, premi veri, classifiche e squadre, in stile videogioco retrò.

- `docs/masterprompt.md` — il progetto completo
- `docs/proposta.md` — database, ruoli, economia, curva dei livelli, schermate
- `supabase/schema.sql` — tabelle, sicurezza e funzioni server
- `supabase/seed.sql` — catalogo iniziale (tipi, pezzi del personaggio, oggetti, medaglie, premi, missioni)
- `supabase/tests/` — prove su Postgres locale (`./supabase/tests/run.sh`)
- `design/gen.py` — generatore delle schermate di prova in pixel art
- `index.html` — app dei clienti
- `banco.html` — pannello del personale (da aprire sul tablet del bancone)
- `js/sprites.js` — personaggi e oggetti in pixel art

Senza Supabase configurato l'app parte in **modalità demo**: dati finti nel browser, accesso con qualsiasi email e codice, e due pulsanti nello scanner per simulare i QR.

## Configurare Supabase

1. Crea un progetto su Supabase.
2. Nell'SQL editor esegui `supabase/schema.sql`, poi `supabase/seed.sql`.
3. In Database › Extensions attiva `pg_cron` ed esegui di nuovo l'ultimo blocco di `schema.sql` per pianificare i lavori giornalieri.
4. In Authentication › Email Templates › Magic Link sostituisci il testo con un messaggio che contenga `{{ .Token }}`: l'app chiede il codice a 6 cifre, non il link.
5. Copia URL del progetto e chiave `anon` (Project Settings › API) in `js/config.js`.
6. Il proprietario entra una volta dall'app, poi nell'SQL editor: `insert into staff (user_id, role) select id, 'owner' from auth.users where email = '<sua email>';`
