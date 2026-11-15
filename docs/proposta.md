# Stuoiedex — proposta tecnica e di gioco

Fase 1 del masterprompt: database, ruoli, sicurezza, curva dei livelli e mappa delle schermate. Da confermare prima di scrivere l'app.

## Database

Il file `supabase/schema.sql` crea tutto; `supabase/seed.sql` carica il catalogo iniziale (tipi, oggetti, titoli, medaglie, premi, missioni). Testato su Postgres 16 con lo scenario in `supabase/tests`.

| Area | Tabelle |
|---|---|
| Clienti | `profiles`, `profile_items`, `profile_titles`, `profile_badges` |
| Personale | `staff` (ruoli `owner` e `barista`) |
| Catalogo | `creature_types`, `items`, `titles`, `badges`, `seasons`, `rewards` |
| Punti | `point_events` (registro unico), `checkins` |
| Social | `friendships`, `captures`, `teams` |
| Gioco | `missions`, `mission_progress`, `events`, `event_attendance`, `tournaments`, `tournament_pairs`, `tournament_matches` |
| Premi | `redemptions` |
| Bacheca e notifiche | `feed_posts`, `feed_reactions`, `notification_prefs`, `push_subscriptions`, `notification_outbox` |
| Configurazione | `settings`, `app_secrets` |

Scelte principali:

- **Registro unico dei punti.** Ogni XP, gettone e punto stagione è una riga di `point_events`. I totali sul profilo li ricalcola un trigger. Annullare un movimento significa marcarlo, mai cancellarlo: resta la storia completa.
- **Classifiche come viste** (`season_leaderboard`, `team_leaderboard`) calcolate dal registro: nessun totale da tenere allineato a mano. La stagione si chiude e la successiva parte da zero senza toccare XP e gettoni.
- **QR firmati.** Check-in e catture usano codici firmati con una chiave segreta che il client non vede, validi due minuti (più la finestra precedente per chi scansiona al cambio). Una foto del QR non serve a niente il giorno dopo.
- **Premi in due tempi.** Il cliente genera un codice valido cinque minuti; i gettoni si scalano solo quando il barista lo convalida. Un codice si usa una volta.

## Ruoli e sicurezza

- **Cliente**: legge le schede approvate, la bacheca, le classifiche e il catalogo. Modifica solo i campi personali della sua scheda (soprannome, descrizione, tipi, personaggio, foto, titolo, visibilità): i permessi sono per colonna, quindi XP, gettoni, livello e stato non sono scrivibili nemmeno con una chiamata manuale.
- **Barista**: approva schede, crea eventi e tornei, segna i presenti, convalida premi, pubblica annunci. Non può toccare punti né prezzi.
- **Proprietario**: tutto quello del barista più il suo gestionale, l'unico posto dove si cambiano valori dei punti, prezzi dei premi, missioni, medaglie, tipi, stagioni e personale, dove si assegnano o annullano punti a mano e si chiude la stagione.
- Row Level Security attiva su ogni tabella. Le azioni che valgono punti esistono solo come funzioni server; le funzioni interne (assegnare punti, medaglie, notifiche) non sono richiamabili dal client.
- Verificato nei test: un cliente non può alzarsi XP o stato, non può fare check-in finché non è approvato, non vede le schede in attesa né i movimenti degli altri, non può indossare oggetti non sbloccati né convalidare premi.
- Cancellazione account: elimina l'utente e a cascata tutti i suoi dati; se era capitano, la squadra passa al membro più anziano.

## Economia

| Azione | XP | Gettoni | Punti stagione |
|---|---|---|---|
| Check-in (uno al giorno) | 20 | 2 | 10 |
| Serie (terza visita in 8 giorni) | 15 | 1 | 5 |
| Cattura (prima volta per coppia, a entrambi) | 30 | 3 | 15 |
| Evento (serata partita, festa) | 40 | 4 | 20 |
| Vittoria torneo di carte | 100 | 10 | 50 |
| Missioni | 40–80 | 4–8 | 20–40 |

Premi di partenza: caffè 15 gettoni, cappuccino e brioche 30, aperitivo 40, piadina 50, sconto del 10% 60. Un cliente che viene tre volte a settimana arriva al primo caffè in circa due settimane. Tutti i valori li cambia solo il proprietario dal suo gestionale; il barista non vede né modifica punti e prezzi.

## Curva dei livelli

XP necessaria per il livello L: `25 × (L − 1)^1.8`, fino al livello 30. Stima su un cliente abituale (circa 130 XP a settimana tra presenze, serie, catture e missioni):

| Livello | XP totale | Quando, circa | Rarità |
|---|---|---|---|
| 2 | 25 | primo giorno | Comune |
| 3 | 87 | prima settimana | Comune |
| 5 | 303 | due settimane | Comune |
| 10 | 1.305 | due mesi e mezzo | Non comune |
| 15 | 2.890 | cinque mesi | Non comune |
| 20 | 5.008 | nove mesi | Raro |
| 25 | 7.626 | un anno e due mesi | Raro |
| 30 | 10.722 | un anno e sette mesi | Leggendario |

I primi livelli arrivano subito, ognuno con un oggetto per lo sprite; dal 10 in poi servono costanza e partecipazione agli eventi. Leggendario resta raro davvero: pochi clienti storici.

## Personaggio

Il cliente crea il suo personaggio scegliendo ogni pezzo: corporatura, pelle, viso, occhi, sopracciglia, bocca, capelli e colore, barba, maglia e colore, pantaloni, scarpe e posa. Tutti i pezzi base sono gratuiti e si cambiano quando si vuole. Gli oggetti sbloccati (cappelli, occhiali, sciarpe, cose in mano, sfondi, cornici) si indossano sopra e li disegno io. Il database controlla che ogni pezzo esista e che gli oggetti indossati siano davvero sbloccati.

## Far tornare la gente al bar

- **Invita un amico**: ogni cliente ha un codice invito. Chi si iscrive lo inserisce prima della prima visita; al suo primo check-in prendono 50 XP e 5 gettoni tutti e due.
- **Ci manchi**: dopo 14 giorni senza visite arriva una notifica, una volta sola per assenza; al ritorno il check-in vale un bonus di 30 XP e 3 gettoni.
- **Compleanno**: il cliente può indicare giorno e mese (niente anno). Quel giorno riceve 50 XP, 15 gettoni (il caffè è offerto), la medaglia Buon compleanno e una notifica.

Tutti i valori si cambiano dal gestionale del proprietario. I controlli girano ogni mattina in automatico.

## Eventi e tornei

- Il personale crea l'evento e sceglie se aprire le iscrizioni dall'app, con un numero massimo di posti.
- Per i tornei di carte ci si iscrive in coppia scegliendo il compagno, che riceve una notifica.
- Il personale genera il tabellone dalle coppie iscritte con un tocco, poi inserisce i risultati.
- La mattina dell'evento gli iscritti ricevono un promemoria con l'orario.

## Medaglie iniziali

Buon compleanno, Primo passo, Habitué (10 visite), Di casa (30), Colonna del bar (100, segreta), Prima cattura, Collezionista (10 catture), Stuoiedex completo (segreta), Re del beccaccino, Asso di briscola, Campione del mese, Tifoso (cinque serate partita in un mese). Quasi tutte sbloccano un titolo, quelle dei tornei e del mese anche un oggetto esclusivo.

## Mappa delle schermate

Cliente, con barra di navigazione in basso:

- **Stuoiedex**: griglia di tutti i clienti, sagome scure per chi non hai ancora catturato, filtro per tipo. Tocchi una scheda e si apre.
- **Scheda**: sprite grande con cornice di rarità, tipi, livello, titolo, descrizione, medaglie, squadra. Dalla propria: guardaroba e modifica.
- **Scanner** (pulsante centrale): un'unica fotocamera che riconosce da sola QR di check-in, QR di un cliente da catturare e QR di iscrizione.
- **Bacheca**: annunci fissati in alto, poi level up, medaglie e vincitori, con il brindisi come reazione.
- **Sfide**: missioni in corso con avanzamento, prossimi eventi, tornei con tabellone, classifica individuale e di squadra.
- **Io**: gettoni e premi riscattabili, QR personale per farsi catturare, amici e richieste, squadra, impostazioni (notifiche, suoni, vibrazione, privacy, cancella account).

Flussi a schermo intero: intro del primo avvio, editor dello sprite, animazione di cattura, level up, nuova medaglia, codice premio, riepilogo di fine stagione.

Personale (app separata nello stesso sito, accesso con ruolo):

- **Bancone**: QR di check-in a schermo intero e pulsante grande "Convalida premio" con fotocamera.
- **Schede da approvare**.
- **Eventi e tornei**: crea, segna i presenti, inserisci i risultati.
- **Annunci**.

Gestionale del proprietario (stesso accesso, visibile solo a lui):

- **Punti**: valori di check-in, serie, catture, eventi, tornei.
- **Premi**: prezzi, disponibilità, premi stagionali.
- **Missioni, medaglie, tipi, stagioni**.
- **Movimenti**: registro punti, assegnazione manuale, annullamento.
- **Personale**: aggiungere e togliere baristi.
- **Numeri**: clienti attivi, presenze per giorno, premi riscattati, missioni più completate.
