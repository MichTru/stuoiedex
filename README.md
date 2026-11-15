# Stuoiedex

Il "Pokédex" dei clienti del Bar Stuoie: check-in, catture, missioni, medaglie, premi veri, classifiche e squadre, in stile videogioco retrò.

- `docs/masterprompt.md` — il progetto completo
- `docs/proposta.md` — database, ruoli, economia, curva dei livelli, schermate
- `supabase/schema.sql` — tabelle, sicurezza e funzioni server
- `supabase/seed.sql` — catalogo iniziale (tipi, pezzi del personaggio, oggetti, medaglie, premi, missioni)
- `supabase/tests/` — prove su Postgres locale (`./supabase/tests/run.sh`)
- `design/gen.py` — generatore delle schermate di prova in pixel art

## Configurare Supabase

1. Crea un progetto su Supabase.
2. Nell'SQL editor esegui `supabase/schema.sql`, poi `supabase/seed.sql`.
3. In Database › Extensions attiva `pg_cron` ed esegui di nuovo l'ultimo blocco di `schema.sql` per pianificare i lavori giornalieri.
4. Aggiungi il proprietario: `insert into staff (user_id, role) values ('<id utente>', 'owner');`
