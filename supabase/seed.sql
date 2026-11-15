-- =====================================================================
-- Stuoiedex — dati iniziali (catalogo). Eseguire dopo schema.sql.
-- =====================================================================

insert into creature_types (name, color, icon) values
  ('Spritz',      '#F2712B', 'spritz'),
  ('Caffè',       '#7A4A2A', 'caffe'),
  ('Calcio',      '#2E8B57', 'pallone'),
  ('Carte',       '#C1272D', 'carte'),
  ('Chiacchiera', '#E8B923', 'fumetto'),
  ('Nottambulo',  '#3B3F8F', 'luna'),
  ('Mattiniero',  '#F5C542', 'sole'),
  ('Birra',       '#D99A1E', 'boccale'),
  ('Bianchino',   '#C9D6A3', 'calice'),
  ('Saggio',      '#8A8F98', 'gufo');

-- Stagione del mese corrente e stagione a tema di Natale
insert into seasons (name, starts_on, ends_on, theme) values
  (to_char(date_trunc('month', current_date), 'TMMonth YYYY'),
   date_trunc('month', current_date)::date,
   (date_trunc('month', current_date) + interval '1 month - 1 day')::date,
   null);

insert into titles (name) values
  ('Habitué'), ('Di casa'), ('Colonna del bar'), ('Acchiappatutti'),
  ('Re del beccaccino'), ('Asso di briscola'), ('Campione del mese'), ('Primo gallo');

-- Oggetti sbloccati dal livello (asset = percorso nello Storage "sprites")
insert into items (slot, name, asset, unlock_level) values
  ('cornice',  'Cornice di legno',      'items/cornice-legno.png',     1),
  ('cappello', 'Berretto rosso',        'items/berretto-rosso.png',    2),
  ('occhiali', 'Occhiali da sole',      'items/occhiali-sole.png',     3),
  ('sciarpa',  'Sciarpa rossoblù',      'items/sciarpa-rossoblu.png',  5),
  ('mano',     'Tazzina',               'items/tazzina.png',           7),
  ('sfondo',   'Bancone',               'items/sfondo-bancone.png',    9),
  ('cornice',  'Cornice d''argento',    'items/cornice-argento.png',  10),
  ('cappello', 'Coppola',               'items/coppola.png',          12),
  ('mano',     'Mazzo di carte',        'items/mazzo-carte.png',      15),
  ('sfondo',   'Piazza di sera',        'items/sfondo-piazza.png',    18),
  ('cornice',  'Cornice d''oro',        'items/cornice-oro.png',      20),
  ('cappello', 'Cresta del gallo',      'items/cresta-gallo.png',     25),
  ('cornice',  'Cornice leggendaria',   'items/cornice-leggenda.png', 30);

-- Oggetti esclusivi delle medaglie
insert into items (slot, name, asset) values
  ('cappello', 'Corona del beccaccino', 'items/corona-beccaccino.png'),
  ('cappello', 'Corona della briscola', 'items/corona-briscola.png'),
  ('mano',     'Coppa del mese',        'items/coppa-mese.png'),
  ('sfondo',   'Stuoiedex completo',    'items/sfondo-dex.png');

insert into badges (code, name, description, icon, secret, unlocks_item_id, unlocks_title_id) values
  ('prima_visita',        'Primo passo',        'Il primo check-in al Bar Stuoie',        'badges/primo-passo.png', false, null, (select id from titles where name = 'Primo gallo')),
  ('habitue',             'Habitué',            'Dieci visite',                           'badges/habitue.png',     false, null, (select id from titles where name = 'Habitué')),
  ('di_casa',             'Di casa',            'Trenta visite',                          'badges/di-casa.png',     false, null, (select id from titles where name = 'Di casa')),
  ('colonna_del_bar',     'Colonna del bar',    'Cento visite',                           'badges/colonna.png',     true,  null, (select id from titles where name = 'Colonna del bar')),
  ('prima_cattura',       'Prima cattura',      'Hai catturato il tuo primo amico',       'badges/prima-cattura.png', false, null, null),
  ('collezionista',       'Collezionista',      'Dieci clienti catturati',                'badges/collezionista.png', false, null, (select id from titles where name = 'Acchiappatutti')),
  ('stuoiedex_completo',  'Stuoiedex completo', 'Hai catturato tutti i clienti',          'badges/dex-completo.png', true,  (select id from items where name = 'Stuoiedex completo'), null),
  ('campione_beccaccino', 'Re del beccaccino',  'Vittoria in un torneo di beccaccino',    'badges/beccaccino.png',  false, (select id from items where name = 'Corona del beccaccino'), (select id from titles where name = 'Re del beccaccino')),
  ('campione_briscola',   'Asso di briscola',   'Vittoria in un torneo di briscola',      'badges/briscola.png',    false, (select id from items where name = 'Corona della briscola'), (select id from titles where name = 'Asso di briscola')),
  ('campione_del_mese',   'Campione del mese',  'Primo in classifica a fine stagione',    'badges/campione.png',    false, (select id from items where name = 'Coppa del mese'), (select id from titles where name = 'Campione del mese')),
  ('compleanno',          'Buon compleanno',    'Festeggiato al Bar Stuoie',              'badges/compleanno.png', false, null, null),
  ('tifoso',              'Tifoso',             'Cinque serate partita in un mese',       'badges/tifoso.png',      false, null, null);

insert into rewards (name, cost, alcoholic) values
  ('Caffè',               15, false),
  ('Cappuccino e brioche', 30, false),
  ('Aperitivo',           40, true),
  ('Piadina',             50, false),
  ('Sconto 10% sul conto', 60, false);

insert into missions (title, goal, target, xp, tokens, season_points, ends_at, badge_code) values
  ('Tre visite questa settimana', 'checkins',     3, 40, 4, 20, now() + interval '7 days',  null),
  ('Cattura tre nuovi amici',     'captures',     3, 60, 6, 30, now() + interval '30 days', null),
  ('Cinque serate partita',       'event_calcio', 5, 80, 8, 40, now() + interval '30 days', 'tifoso');

-- Pezzi del personaggio (pixel art nello Storage "sprites/parts/...")
insert into sprite_parts (kind, name, color, sort) values
  ('pelle', 'Chiarissima', '#F6D5BC', 1), ('pelle', 'Chiara', '#F1C6A3', 2), ('pelle', 'Media', '#E2A87F', 3),
  ('pelle', 'Olivastra', '#C68863', 4), ('pelle', 'Scura', '#8D5A3B', 5), ('pelle', 'Molto scura', '#5C3A26', 6),
  ('colore_capelli', 'Nero', '#141414', 1), ('colore_capelli', 'Castano', '#4A2E1C', 2), ('colore_capelli', 'Biondo', '#E8C14A', 3),
  ('colore_capelli', 'Rosso', '#B8452B', 4), ('colore_capelli', 'Grigio', '#8A8A8A', 5), ('colore_capelli', 'Bianco', '#E6E6E6', 6),
  ('colore_capelli', 'Blu', '#2D4BC0', 7), ('colore_capelli', 'Rosa', '#E06AA8', 8),
  ('colore_maglia', 'Rosso Stuoie', '#C8102E', 1), ('colore_maglia', 'Blu Stuoie', '#1B2F6E', 2), ('colore_maglia', 'Verde', '#2E8B57', 3),
  ('colore_maglia', 'Arancio', '#F2712B', 4), ('colore_maglia', 'Nero', '#22252F', 5), ('colore_maglia', 'Bianco', '#F3F5FA', 6),
  ('colore_maglia', 'Giallo', '#F2B200', 7), ('colore_maglia', 'Viola', '#6B3FA0', 8);

insert into sprite_parts (kind, name, asset, sort)
select k::part_kind, n, 'parts/' || k || '/' || lower(replace(n, ' ', '-')) || '.png', row_number() over (partition by k)
from (values
  ('corporatura','Snella'), ('corporatura','Media'), ('corporatura','Robusta'),
  ('viso','Tondo'), ('viso','Ovale'), ('viso','Squadrato'),
  ('occhi','Puntini'), ('occhi','Grandi'), ('occhi','Socchiusi'), ('occhi','Felici'),
  ('sopracciglia','Sottili'), ('sopracciglia','Folte'), ('sopracciglia','Arrabbiate'),
  ('bocca','Sorriso'), ('bocca','Ghigno'), ('bocca','Seria'), ('bocca','Risata'),
  ('capelli','Rasati'), ('capelli','Corti'), ('capelli','Ciuffo'), ('capelli','Ricci'), ('capelli','Lunghi'),
  ('capelli','Coda'), ('capelli','Raccolti'), ('capelli','Calvo'), ('capelli','Cresta'),
  ('barba','Nessuna'), ('barba','Baffi'), ('barba','Pizzetto'), ('barba','Corta'), ('barba','Folta'),
  ('maglia','T-shirt'), ('maglia','Camicia'), ('maglia','Felpa'), ('maglia','Maglione'), ('maglia','Giacca'), ('maglia','Canotta'),
  ('pantaloni','Jeans'), ('pantaloni','Pantaloncini'), ('pantaloni','Tuta'), ('pantaloni','Gonna'),
  ('scarpe','Scarpe da ginnastica'), ('scarpe','Stivali'), ('scarpe','Ciabatte'),
  ('posa','Fermo'), ('posa','Saluto'), ('posa','Brindisi'), ('posa','Braccia conserte')
) v(k, n);
