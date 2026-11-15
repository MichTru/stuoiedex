// Catalogo di partenza (uguale a supabase/seed.sql). Usato dalla modalità demo.

export const TYPES = [
  ['Spritz', '#F2712B'], ['Caffè', '#7A4A2A'], ['Calcio', '#2E8B57'], ['Carte', '#C8102E'],
  ['Chiacchiera', '#B8860B'], ['Nottambulo', '#3B3F8F'], ['Mattiniero', '#C99A06'], ['Birra', '#A86F0C'],
  ['Bianchino', '#6E7F3A'], ['Saggio', '#5A6178'],
].map(([name, color], i) => ({ id: i + 1, name, color }));

const COLORS = {
  pelle: [['Chiarissima', '#F6D5BC'], ['Chiara', '#F1C6A3'], ['Media', '#E2A87F'], ['Olivastra', '#C68863'], ['Scura', '#8D5A3B'], ['Molto scura', '#5C3A26']],
  colore_capelli: [['Nero', '#141414'], ['Castano', '#4A2E1C'], ['Biondo', '#E8C14A'], ['Rosso', '#B8452B'], ['Grigio', '#8A8A8A'], ['Bianco', '#E6E6E6'], ['Blu', '#2D4BC0'], ['Rosa', '#E06AA8']],
  colore_maglia: [['Rosso Stuoie', '#C8102E'], ['Blu Stuoie', '#1B2F6E'], ['Verde', '#2E8B57'], ['Arancio', '#F2712B'], ['Nero', '#22252F'], ['Bianco', '#F3F5FA'], ['Giallo', '#F2B200'], ['Viola', '#6B3FA0']],
};
const SHAPES = {
  corporatura: ['Snella', 'Media', 'Robusta'],
  viso: ['Tondo', 'Ovale', 'Squadrato'],
  occhi: ['Puntini', 'Grandi', 'Socchiusi', 'Felici'],
  sopracciglia: ['Sottili', 'Folte', 'Arrabbiate'],
  bocca: ['Sorriso', 'Ghigno', 'Seria', 'Risata'],
  capelli: ['Rasati', 'Corti', 'Ciuffo', 'Ricci', 'Lunghi', 'Coda', 'Raccolti', 'Calvo', 'Cresta'],
  barba: ['Nessuna', 'Baffi', 'Pizzetto', 'Corta', 'Folta'],
  maglia: ['T-shirt', 'Camicia', 'Felpa', 'Maglione', 'Giacca', 'Canotta'],
  pantaloni: ['Jeans', 'Pantaloncini', 'Tuta', 'Gonna'],
  scarpe: ['Scarpe da ginnastica', 'Stivali', 'Ciabatte'],
  posa: ['Fermo', 'Saluto', 'Brindisi', 'Braccia conserte'],
};

export const PARTS = [];
let pid = 1;
for (const [kind, list] of Object.entries(COLORS)) list.forEach(([name, color], i) => PARTS.push({ id: pid++, kind, name, color, sort: i + 1 }));
for (const [kind, list] of Object.entries(SHAPES)) list.forEach((name, i) => PARTS.push({ id: pid++, kind, name, color: null, sort: i + 1 }));

export const ITEMS = [
  ['cornice', 'Cornice di legno', 'cornice-legno', 1], ['cappello', 'Berretto rosso', 'berretto-rosso', 2],
  ['occhiali', 'Occhiali da sole', 'occhiali-sole', 3], ['sciarpa', 'Sciarpa rossoblù', 'sciarpa-rossoblu', 5],
  ['mano', 'Tazzina', 'tazzina', 7], ['sfondo', 'Bancone', 'sfondo-bancone', 9],
  ['cornice', "Cornice d'argento", 'cornice-argento', 10], ['cappello', 'Coppola', 'coppola', 12],
  ['mano', 'Mazzo di carte', 'mazzo-carte', 15], ['sfondo', 'Piazza di sera', 'sfondo-piazza', 18],
  ['cornice', "Cornice d'oro", 'cornice-oro', 20], ['cappello', 'Cresta del gallo', 'cresta-gallo', 25],
  ['cornice', 'Cornice leggendaria', 'cornice-leggenda', 30],
  ['cappello', 'Corona del beccaccino', 'corona-beccaccino', null], ['cappello', 'Corona della briscola', 'corona-briscola', null],
  ['mano', 'Coppa del mese', 'coppa-mese', null], ['sfondo', 'Stuoiedex completo', 'sfondo-dex', null],
].map(([slot, name, key, unlock_level], i) => ({ id: i + 1, slot, name, asset: `items/${key}.png`, unlock_level }));

export const BADGES = [
  ['prima_visita', 'Primo passo'], ['habitue', 'Habitué'], ['di_casa', 'Di casa'], ['prima_cattura', 'Prima cattura'],
  ['collezionista', 'Collezionista'], ['tifoso', 'Tifoso'], ['compleanno', 'Buon compleanno'],
  ['campione_beccaccino', 'Re del beccaccino'], ['campione_briscola', 'Asso di briscola'], ['campione_del_mese', 'Campione del mese'],
].map(([code, name], i) => ({ id: i + 1, code, name }));

export const TITLES = ['Habitué', 'Di casa', 'Colonna del bar', 'Acchiappatutti', 'Re del beccaccino', 'Asso di briscola', 'Campione del mese', 'Primo gallo']
  .map((name, i) => ({ id: i + 1, name }));
