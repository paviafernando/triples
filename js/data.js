/* Triples — datos: jugadores, festejos y opciones del avatar */
'use strict';

var SKINS = ['#f7dcc4', '#efc6a3', '#e2ae85', '#c98f62', '#ad7249', '#8c5634', '#6c4026', '#4d2c1a'];
var HAIR_COLORS = ['#1a1310', '#3a2416', '#6b4423', '#a06c3a', '#d9b36b', '#efe0b0', '#8e8e8e', '#ececec', '#c0392b', '#2e86de', '#ff5fa2', '#7ed957'];
var EYE_COLORS = ['#3b2414', '#5b3a1e', '#2f6fb3', '#3f8f4f', '#7a7a7a'];
var KIT_COLORS = [
  ['#1d428a', '#ffc72c'], ['#552583', '#fdb927'], ['#ce1141', '#111111'], ['#111111', '#c4ced4'],
  ['#007a33', '#ffffff'], ['#75aadb', '#ffffff'], ['#00538c', '#b8c4ca'], ['#e03a3e', '#ffffff'],
  ['#0e2240', '#fec524'], ['#00788c', '#f9a01b'], ['#ff5fa2', '#ffffff'], ['#ffffff', '#1d428a'],
  ['#f58426', '#006bb6'], ['#5a2d81', '#63727a'], ['#000000', '#ff5fa2'], ['#2e7d32', '#ffd54d']
];
var SHOE_COLORS = ['#ffffff', '#111111', '#ce1141', '#ffc72c', '#1d428a', '#7ed957', '#ff5fa2', '#ff8a00'];

/* Opciones del editor (cada una: clave, nombre, lista de valores {v, n}) */
var HAIR_STYLES = [
  { v: 'pelado', n: 'Pelado' }, { v: 'rapado', n: 'Rapado' }, { v: 'corto', n: 'Corto' }, { v: 'rulos', n: 'Rulitos' },
  { v: 'afro', n: 'Afro' }, { v: 'trenzas', n: 'Trenzas' }, { v: 'largo', n: 'Largo' }, { v: 'peinado', n: 'Peinado al costado' },
  { v: 'entradas', n: 'Con entradas' }, { v: 'coronilla', n: 'Pelado arriba' }, { v: 'cresta', n: 'Cresta' },
  { v: 'rodete', n: 'Rodete' }, { v: 'flequillo', n: 'Flequillo' }, { v: 'colitas', n: 'Dos colitas' }
];
var BEARDS = [
  { v: 'no', n: 'Sin barba' }, { v: 'sombra', n: 'Sombra' }, { v: 'candado', n: 'Candado' },
  { v: 'completa', n: 'Barba completa' }, { v: 'bigote', n: 'Bigote' }, { v: 'tupida', n: 'Barba tupida' }
];
var FACES = [{ v: 'redonda', n: 'Redonda' }, { v: 'ancha', n: 'Ancha' }, { v: 'larga', n: 'Larga' }, { v: 'cuadrada', n: 'Cuadrada' }];
var BUILDS = [{ v: 0, n: 'Flaco' }, { v: 1, n: 'Atlético' }, { v: 2, n: 'Fuerte' }, { v: 3, n: 'Grandote' }];
var HEADBANDS = [{ v: 'no', n: 'Sin vincha' }, { v: '#ffffff', n: 'Vincha blanca' }, { v: '#111111', n: 'Vincha negra' }, { v: 'kit', n: 'Vincha del equipo' }, { v: '#ff5fa2', n: 'Vincha rosa' }];
var GLASSES = [{ v: 'no', n: 'Sin anteojos' }, { v: 'antiparras', n: 'Antiparras' }, { v: 'sol', n: 'De sol' }, { v: 'redondos', n: 'Redondos' }];
var ARMS = [{ v: 'no', n: 'Nada' }, { v: 'munequeras', n: 'Muñequeras' }, { v: 'manga', n: 'Manga en un brazo' }, { v: 'mangas', n: 'Mangas en los dos' }];
var EXTRAS = [{ v: 'no', n: 'Nada' }, { v: 'cadena', n: 'Cadena dorada' }, { v: 'protector', n: 'Protector bucal' }, { v: 'aro', n: 'Aro en la oreja' }, { v: 'corona', n: 'Coronita 👑' }, { v: 'rodilleras', n: 'Rodilleras' }];
var TATTOOS = [{ v: 'no', n: 'Sin tatuajes' }, { v: 'der', n: 'Brazo derecho' }, { v: 'izq', n: 'Brazo izquierdo' }, { v: 'dos', n: 'Los dos brazos' }, { v: 'cuello', n: 'Cuello' }, { v: 'todo', n: 'Brazos y cuello' }];

/* Festejos: los 5 que puede elegir tu jugador + los únicos de cada estrella */
var CELEBS = {
  baile: { e: '💃', n: 'Baile' },
  avion: { e: '✈️', n: 'Avioncito' },
  musculos: { e: '💪', n: 'Músculos' },
  saludo: { e: '🙌', n: 'Saludo al público' },
  corazon: { e: '🫶', n: 'Corazón' },
  noche: { e: '😴', n: 'Noche, noche', only: true },
  oreja: { e: '👂', n: '¡No los escucho!', only: true },
  tiza: { e: '👑', n: '¡El Rey!', only: true },
  hombros: { e: '🤷', n: 'Encogida de hombros', only: true },
  mamba: { e: '🐍', n: 'Mentón de Mamba', only: true },
  shimmy: { e: '🕺', n: 'Shimmy', only: true },
  murcielago: { e: '🦇', n: 'El murciélago', only: true },
  dedo: { e: '☝️', n: '¿Quién sale segundo?', only: true },
  doc: { e: '🥕', n: '¿Qué hay, doc?', only: true },
  mio: { e: '🦆', n: '¡Es mío, todo mío!', only: true },
  meep: { e: '💨', n: 'Meep meep', only: true },
  acme: { e: '🧨', n: 'Plan Acme', only: true },
  tornado: { e: '🌪️', n: 'Tornado', only: true },
  pio: { e: '🐤', n: '¡Pío pío!', only: true },
  guino: { e: '😉', n: 'Guiño', only: true },
  monstruo: { e: '👽', n: '¡Monstruo!', only: true }
};
var CUSTOM_CELEBS = ['baile', 'avion', 'musculos', 'saludo', 'corazon'];

function baseLook() {
  return {
    skin: 3, hair: 'corto', hairColor: 0, eyes: 0, beard: 'no', face: 'redonda',
    height: 190, weight: 88, build: 1, kit: 0, number: 10, jersey: 'YO', shoes: 0,
    headband: 'no', glasses: 'no', arms: 'no', extra: 'no', tattoo: 'no', celeb: 'baile'
  };
}
function mkLook(o) { var l = baseLook(); for (var k in o) l[k] = o[k]; return l; }

/* Estrellas: tiro (precisión), rango (fuerza justa de lejos), ritmo (rapidez para agarrar la pelota), clutch (money balls) */
var STARS = [
  { id: 'curry', name: 'Stephen Curry', short: 'Curry', tag: 'El mejor tirador de la historia',
    sk: { tiro: 99, rango: 99, ritmo: 95, clutch: 97 },
    look: mkLook({ skin: 3, hair: 'rulos', hairColor: 0, beard: 'sombra', face: 'larga', height: 188, weight: 84, build: 0, kit: 0, number: 30, jersey: 'CURRY', shoes: 0, extra: 'protector', celeb: 'noche' }) },
  { id: 'doncic', name: 'Luka Dončić', short: 'Dončić', tag: 'Triples imposibles de un pie',
    sk: { tiro: 88, rango: 95, ritmo: 78, clutch: 95 },
    look: mkLook({ skin: 1, hair: 'peinado', hairColor: 2, eyes: 2, beard: 'sombra', face: 'ancha', height: 201, weight: 104, build: 2, kit: 1, number: 77, jersey: 'DONCIC', shoes: 1, celeb: 'oreja' }) },
  { id: 'lebron', name: 'LeBron James', short: 'LeBron', tag: 'El Rey: fuerza y cabeza',
    sk: { tiro: 83, rango: 86, ritmo: 88, clutch: 90 },
    look: mkLook({ skin: 6, hair: 'entradas', hairColor: 0, beard: 'completa', face: 'cuadrada', height: 206, weight: 113, build: 3, kit: 1, number: 23, jersey: 'JAMES', shoes: 3, headband: '#ffffff', arms: 'munequeras', tattoo: 'dos', celeb: 'tiza' }) },
  { id: 'jordan', name: 'Michael Jordan', short: 'Jordan', tag: 'Su Majestad del aire',
    sk: { tiro: 86, rango: 82, ritmo: 93, clutch: 99 },
    look: mkLook({ skin: 6, hair: 'pelado', beard: 'no', face: 'larga', height: 198, weight: 98, build: 1, kit: 2, number: 23, jersey: 'JORDAN', shoes: 2, arms: 'munequeras', extra: 'aro', celeb: 'hombros' }) },
  { id: 'kobe', name: 'Kobe Bryant', short: 'Kobe', tag: 'Mentalidad Mamba',
    sk: { tiro: 88, rango: 86, ritmo: 90, clutch: 98 },
    look: mkLook({ skin: 5, hair: 'rapado', hairColor: 0, beard: 'sombra', face: 'larga', height: 198, weight: 96, build: 1, kit: 1, number: 24, jersey: 'BRYANT', shoes: 3, arms: 'manga', celeb: 'mamba' }) },
  { id: 'shaq', name: "Shaquille O'Neal", short: 'Shaq', tag: 'Gigante… pero de lejos ni ahí',
    sk: { tiro: 42, rango: 40, ritmo: 60, clutch: 70 },
    look: mkLook({ skin: 7, hair: 'pelado', beard: 'candado', face: 'ancha', height: 216, weight: 147, build: 3, kit: 1, number: 34, jersey: "O'NEAL", shoes: 1, celeb: 'shimmy' }) },
  { id: 'manu', name: 'Manu Ginóbili', short: 'Manu', tag: 'Magia argentina',
    sk: { tiro: 85, rango: 83, ritmo: 92, clutch: 94 },
    look: mkLook({ skin: 1, hair: 'coronilla', hairColor: 2, eyes: 1, beard: 'no', face: 'larga', height: 198, weight: 93, build: 0, kit: 3, number: 20, jersey: 'GINOBILI', shoes: 1, celeb: 'murcielago' }) },
  { id: 'bird', name: 'Larry Bird', short: 'Bird', tag: 'Ganó 3 concursos de triples seguidos',
    sk: { tiro: 96, rango: 90, ritmo: 84, clutch: 97 },
    look: mkLook({ skin: 0, hair: 'flequillo', hairColor: 4, eyes: 2, beard: 'bigote', face: 'larga', height: 206, weight: 100, build: 1, kit: 4, number: 33, jersey: 'BIRD', shoes: 0, celeb: 'dedo' }) },
  { id: 'bugs', name: 'Bugs Bunny', short: 'Bugs', tag: '¿Qué hay, doc? Tiro de zanahoria',
    sk: { tiro: 88, rango: 84, ritmo: 90, clutch: 92 },
    look: mkLook({ skin: 6, hair: 'corto', beard: 'no', face: 'larga', height: 200, weight: 80, build: 0, kit: 0, number: 1, jersey: 'BUGS', shoes: 0, celeb: 'doc' }) },
  { id: 'daffy', name: 'Daffy Duck', short: 'Daffy', tag: '¡Es mío! Todo para él',
    sk: { tiro: 78, rango: 80, ritmo: 84, clutch: 80 },
    look: mkLook({ skin: 0, hair: 'corto', beard: 'no', face: 'larga', height: 200, weight: 80, build: 1, kit: 0, number: 6, jersey: 'DAFFY', shoes: 0, celeb: 'mio' }) },
  { id: 'roadrunner', name: 'Road Runner', short: 'Correcaminos', tag: 'Meep meep: el más rápido de la pista',
    sk: { tiro: 84, rango: 70, ritmo: 99, clutch: 82 },
    look: mkLook({ skin: 0, hair: 'corto', beard: 'no', face: 'larga', height: 200, weight: 70, build: 0, kit: 0, number: 5, jersey: 'RUNNER', shoes: 0, celeb: 'meep' }) },
  { id: 'coyote', name: 'Wile E. Coyote', short: 'Coyote', tag: 'Sus planes Acme nunca salen bien',
    sk: { tiro: 35, rango: 50, ritmo: 60, clutch: 30 },
    look: mkLook({ skin: 0, hair: 'corto', beard: 'no', face: 'larga', height: 200, weight: 84, build: 1, kit: 0, number: 4, jersey: 'COYOTE', shoes: 0, celeb: 'acme' }) },
  { id: 'taz', name: 'Taz', short: 'Taz', tag: 'Tornado: mucha fuerza, poca puntería',
    sk: { tiro: 40, rango: 95, ritmo: 45, clutch: 60 },
    look: mkLook({ skin: 0, hair: 'corto', beard: 'no', face: 'ancha', height: 200, weight: 110, build: 3, kit: 0, number: 2, jersey: 'TAZ', shoes: 0, celeb: 'tornado' }) },
  { id: 'tweety', name: 'Tweety', short: 'Tweety', tag: 'Pajarito con mira de francotirador',
    sk: { tiro: 80, rango: 62, ritmo: 75, clutch: 70 },
    look: mkLook({ skin: 0, hair: 'corto', beard: 'no', face: 'redonda', height: 170, weight: 70, build: 0, kit: 0, number: 1, jersey: 'TWEETY', shoes: 0, celeb: 'pio' }) },
  { id: 'lola', name: 'Lola Bunny', short: 'Lola', tag: 'Tiro de Tune Squad, sin miedo',
    sk: { tiro: 85, rango: 76, ritmo: 84, clutch: 86 },
    look: mkLook({ skin: 1, hair: 'peinado', hairColor: 2, eyes: 2, beard: 'no', face: 'redonda', height: 185, weight: 66, build: 0, kit: 0, number: 10, jersey: 'LOLA', shoes: 0, celeb: 'guino' }) },
  { id: 'monstar', name: 'Monstar', short: 'Monstar', tag: 'Monstruo de otro planeta',
    sk: { tiro: 70, rango: 75, ritmo: 65, clutch: 72 },
    look: mkLook({ skin: 5, hair: 'rapado', beard: 'no', face: 'cuadrada', height: 210, weight: 110, build: 2, kit: 0, number: 0, jersey: 'MONSTAR', shoes: 0, celeb: 'monstruo' }) }
];

var CUSTOM_BASE_SK = { tiro: 70, rango: 70, ritmo: 70, clutch: 70 };
var SK_NAMES = { tiro: '🎯 Puntería', rango: '💪 Fuerza justa', ritmo: '⚡ Ritmo', clutch: '🔥 Money ball' };

/* Posiciones del concurso (de izquierda a derecha, vistas desde la cancha) */
var SPOTS = [
  { n: 'Esquina izquierda', a: -82 }, { n: 'Ala izquierda', a: -45 }, { n: 'Frente', a: 0 },
  { n: 'Ala derecha', a: 45 }, { n: 'Esquina derecha', a: 82 }
];

var DIFFS = {
  facil: { e: '🐣', n: 'Fácil', d: 'Más cerca, con guía y ayuda', dist: 4.3, corner: 4.2, help: 0.38, magnet: 0.11, time: 90, guide: true },
  normal: { e: '🏀', n: 'Normal', d: 'Línea de triple de verdad', dist: 7.24, corner: 6.71, help: 0.8, magnet: 0.035, time: 70, guide: false },
  pro: { e: '🔥', n: 'Pro', d: 'Como en la NBA, sin ayuda', dist: 7.5, corner: 6.8, help: 1.05, magnet: 0, time: 60, guide: false }
};

var ACHIEVEMENTS = [
  { id: 'first', e: '🏀', n: 'Primer triple' },
  { id: 'rack', e: '🖐️', n: 'Rack perfecto (5 de 5)' },
  { id: 'money', e: '💰', n: 'Money ball adentro' },
  { id: 'streak10', e: '🔥', n: '10 seguidos' },
  { id: 'swish5', e: '🌊', n: '5 limpios seguidos' },
  { id: 'c20', e: '🥉', n: '20 puntos en un concurso' },
  { id: 'c25', e: '🥈', n: '25 puntos en un concurso' },
  { id: 'c30', e: '🥇', n: '30 puntos en un concurso' },
  { id: 'beatcpu', e: '🤖', n: 'Le ganaste a la compu' },
  { id: 'sim', e: '📱', n: 'Embocaste en modo simulación' }
];
