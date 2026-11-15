# Masterprompt: Stuoiedex

Sei un senior full-stack developer, game designer e product designer. Devi progettare e costruire **Stuoiedex**, il "Pokédex" dei clienti del **Bar Stuoie**, un bar di paese in Romagna. Ogni cliente abituale è un "Pokémon" con il suo sprite in pixel art. Fa check-in, cattura gli amici al bar, completa missioni, sale di livello, sblocca medaglie e oggetti, riscatta premi veri e compete in classifica, da solo e in squadra.

L'obiettivo è un'esperienza da app di livello 2026/2027: veloce, curata in ogni dettaglio, divertente da aprire ogni volta che si entra al bar. Non deve sembrare una tessera fedeltà travestita. Ogni azione deve dare una risposta immediata e soddisfacente (animazione, suono, vibrazione), e ogni ritorno al bar deve avere un motivo per aprire l'app.

## Utenti

- **Clienti** (solo maggiorenni): si iscrivono da soli, costruiscono il loro sprite, fanno check-in, catturano amici, completano missioni, seguono la bacheca e le classifiche, riscattano premi.
- **Personale del bar** (proprietario e baristi): approva le schede, gestisce missioni, eventi, tornei, premi e stagioni, assegna punti, convalida i riscatti, pubblica annunci.
- Lo Stuoiedex completo è sfogliabile da tutti gli iscritti (solo schede approvate).

## Primo avvio

- Al bancone c'è un QR di iscrizione. Il cliente lo scansiona, accede con email (codice OTP di Supabase Auth, niente password) e dichiara di essere maggiorenne.
- Segue un'intro breve in stile "laboratorio del Professore" del primo Pokémon, riscritta per il Bar Stuoie: il cliente sceglie soprannome, tipi e costruisce il suo sprite. Si deve poter saltare.
- Alla fine viene guidato a installare l'app sulla schermata home (necessario per le notifiche su iPhone) e ad attivare le notifiche, spiegando in una riga cosa riceverà.
- La scheda resta "in attesa" finché il personale non la approva; nel frattempo il cliente può già vedere la sua scheda e personalizzarla.

## Consenso e privacy

- Ogni cliente crea e controlla solo la propria scheda: nessuno può scrivere sulla scheda di un altro.
- Il cliente può nascondere la scheda o cancellare l'account in qualsiasi momento, con cancellazione reale di tutti i dati e delle foto.
- Dati minimi: email, soprannome, sprite, eventuale foto. Pagina privacy chiara e conforme al GDPR.
- Il personale può rifiutare o chiedere di modificare soprannomi e descrizioni inappropriati. Filtro base sulle parole offensive.

## La scheda

- **Sprite in pixel art** costruito con un editor (corpo, viso, capelli, colori) e composto a strati, così che gli oggetti sbloccati si indossino sopra. Foto reale facoltativa, visibile solo aprendo la scheda.
- Soprannome e breve descrizione stile Pokédex scritta dal cliente.
- **Tipo** (uno o due, da una lista curata dal bar: Spritz, Caffè, Calcio, Carte, Chiacchiera, Nottambulo, Mattiniero…), ognuno con colore e icona.
- **Rarità** che cresce col livello: Comune, Non comune, Raro, Leggendario. Rari e leggendari si riconoscono subito (cornice, brillio animato).
- Livello, medaglie, titolo attivo, squadra, amici, data della prima visita.

## Economia di gioco

Tre valori separati, per non far mai perdere progressi a chi riscatta un premio:

- **Esperienza (XP)**: si accumula per sempre, determina livello, rarità e oggetti sbloccati.
- **Gettoni**: si guadagnano insieme all'XP e si spendono per i premi veri.
- **Punti stagione**: contano per la classifica del mese e si azzerano a fine stagione.

Fonti:

- **Check-in**: QR mostrato a schermo intero su un tablet del bar, che cambia ogni pochi minuti (firmato lato server, non riutilizzabile da foto). Massimo uno al giorno.
- **Serie di presenze**: bonus per le visite ripetute nella settimana, con un giorno di tolleranza per non punire chi salta una sera.
- **Missioni**: create dal personale, con scadenza (es. "vieni a 3 serate partita questo mese", "cattura 3 nuovi amici", "gioca al torneo di carte").
- **Eventi**: serate partita, tornei di carte, feste; i punti li assegna il personale ai presenti.
- **Catture**: punti solo la prima volta per ogni coppia di clienti.
- Nessuna meccanica premia la quantità di alcol bevuta: si premiano presenza, compagnia e partecipazione.
- Limiti giornalieri di punti assegnabili dal personale e registro di ogni movimento, con possibilità di annullarlo.

## Amici e catture

- **Richiesta d'amicizia** dall'app.
- **Cattura al bar**: ogni cliente ha un QR personale dinamico; uno scansiona l'altro e lo "cattura", con animazione di cattura completa (lancio, oscillazioni, scatto finale). Funziona solo se entrambi hanno fatto check-in quel giorno.
- Lo Stuoiedex personale mostra i clienti catturati e quelli ancora da trovare (sagome scure), come nel gioco originale.

## Progressione e oggetti

- Ogni livello sblocca oggetti per lo sprite: cappelli, sciarpe, occhiali, sfondi, cornici.
- Alcune medaglie sbloccano oggetti esclusivi (es. vincere il torneo di carte dà un oggetto da campione che si ottiene solo così).
- Schermata dedicata al guardaroba con anteprima dello sprite.
- La curva dei livelli deve dare soddisfazioni rapide all'inizio e restare stimolante per i clienti più assidui: proponila tu e spiegala.

## Medaglie, titoli e premi

- **Medaglie** in stile medaglie delle palestre: presenze, catture, missioni, eventi, tornei, stagioni a tema. Alcune segrete, scoperte solo quando si ottengono.
- **Titoli** sbloccati dalle medaglie, uno visibile sulla scheda.
- **Premi veri** (caffè, aperitivo, dolce, sconti…) definiti dal personale con un costo in gettoni. Il riscatto genera un QR valido pochi minuti, il barista lo convalida dal suo pannello. Uso singolo. Premi non solo alcolici.
- **Premio del mese** per il primo della classifica, assegnato dal personale a fine stagione.

## Eventi del Bar Stuoie

- **Serate calcio**: eventi legati alle partite trasmesse al bar, con missioni di presenza. Niente pronostici.
- **Torneo di carte** (beccaccino, briscola) ricorrente: il personale crea il torneo, inserisce le coppie e i risultati; tabellone visibile in app, medaglia e oggetto dedicati al vincitore.
- **Stagioni a tema** (Natale, estate, sagra…): grafica dell'app che cambia a tema, missioni, medaglie e premi disponibili solo in quel periodo.

## Competizione

- **Classifica individuale** mensile sui punti stagione, con podio animato e posizione personale sempre visibile.
- **Squadre**: gruppi di amici con nome e stemma pixel, numero massimo di membri deciso dal personale, classifica a squadre sulla somma dei punti stagione.
- Aggiornamenti in tempo reale (Supabase Realtime).
- A fine stagione: riepilogo personale animato (presenze, catture, medaglie, posizione), da condividere come immagine.

## Bacheca del bar

Feed in tempo reale con:

- level up e cambi di rarità
- medaglie ottenute
- vincitori di eventi e tornei
- annunci del bar (serate, nuove missioni, nuovi premi), fissabili in alto dal personale

Reazioni rapide (es. un "brindisi") sui post, senza commenti liberi.

## Notifiche push

- Web Push tramite service worker, inviate da Supabase Edge Functions.
- Tipi: nuova missione o evento, annuncio del bar, medaglia ottenuta, sorpasso in classifica, richiesta d'amicizia, stagione in chiusura.
- Il cliente sceglie quali ricevere. Orari di silenzio di default, e mai più di poche notifiche al giorno.

## Pannello del personale

Accesso separato e protetto, pensato per essere usato al bancone in pochi secondi e da persone anziane: pulsanti grandi, poche schermate.

- QR di check-in a schermo intero
- convalida dei premi con la fotocamera
- approvazione schede e moderazione
- missioni, eventi, tornei, premi, annunci, stagioni a tema
- assegnazione e annullamento punti, registro movimenti
- statistiche semplici per il proprietario: clienti attivi, presenze per giorno, premi riscattati, missioni più completate

## Stile

- **Videogioco retrò**: pixel art, finestre e menu in stile Pokémon prima generazione, palette basata sul rosso e blu del Bar Stuoie, gallo dello stemma reinterpretato in pixel art.
- Font pixel per titoli e numeri, font leggibile per i testi; dimensioni generose e contrasto alto.
- Suoni 8-bit (cattura, level up, medaglia, riscatto) e vibrazione, entrambi disattivabili. Rispetto dell'impostazione "riduci movimento".
- Animazioni curate nei momenti chiave, transizioni fluide tra le schermate, rendering pixel nitido su ogni schermo.
- Interfaccia essenziale: niente testi di spiegazione superflui, niente contatori o numerazioni decorative.
- Mobile-first, installabile come PWA, apertura istantanea grazie alla cache; con rete assente mostra l'ultimo stato salvato.

## Tecnica

- Frontend statico pubblicato su **GitHub Pages**, TypeScript con un framework leggero a tua scelta (motivala), build con Vite.
- Backend **Supabase**: Auth, Postgres, Storage per foto e sprite, Realtime, Edge Functions per notifiche e operazioni sensibili.
- Progetto indipendente da altre app del bar.
- Row Level Security su tutte le tabelle. Ruoli distinti per clienti e personale. Check-in, catture, punti, livelli e riscatti calcolati e validati solo lato server, mai fidandosi del client.
- Foto ridimensionate e compresse prima del caricamento.
- Dati di esempio per provare l'app con decine di clienti finti.
- Codice ordinato, test per le funzioni che gestiscono punti e riscatti, istruzioni passo passo per configurare Supabase e pubblicare.

## Come procedere

1. Proponi schema del database, ruoli, policy di sicurezza, curva dei livelli e mappa delle schermate. Aspetta la mia conferma.
2. Costruisci il nucleo: iscrizione, intro, editor dello sprite, scheda, approvazione, Stuoiedex, check-in, pannello del personale base.
3. Poi economia di gioco, catture e amici, missioni ed eventi, premi, medaglie e oggetti, classifiche e squadre.
4. Poi bacheca, notifiche, tornei di carte, stagioni a tema, riepilogo di fine stagione.
5. Infine rifinitura grafica, suoni, animazioni, prestazioni e accessibilità.

Se un punto non è chiaro o vedi una soluzione migliore, chiedimelo prima di decidere da solo.
