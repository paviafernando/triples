/* Triples — app: pantallas, jugadores, partida, tele + celulares */
'use strict';
var $ = function (s) { return document.querySelector(s); };
var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
var rnd = function (n) { return Math.floor(Math.random() * n); }, pick = function (a) { return a[rnd(a.length)]; };
var gauss = function () { var u = 1 - Math.random(), v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
var QS = new URLSearchParams(location.search);
var HUB = (QS.get('hub') || '').replace(/\D/g, '').slice(0, 4) || null;
var HUB_URL = 'https://pf-juegos.vercel.app';
var PREFIX = 'triples-';
var ANIMALS = ['🦄', '🐱', '🐶', '🦊', '🐼', '🐸', '🦁', '🐵', '🐧', '🐰', '🐯', '🐻', '🐨', '🐙', '🦖', '🐝'];
var IS_TOUCH = matchMedia('(pointer:coarse)').matches;

var toastT;
function toast(t, ms) { var e = $('#toast'); e.innerHTML = t; e.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { e.classList.remove('show'); }, ms || 2400); }

/* ================= GUARDADO ================= */
var KEY = 'triples-v1';
var S = (function () { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } })();
S.prefs = S.prefs || { theme: 'normal', sfx: true, crowd: true, voice: true };
if (S.prefs.music == null) S.prefs.music = true;
if (!S.prefs.cam) S.prefs.cam = 'arcade';
window.T3 = window.T3 || {}; window.T3.style = S.prefs.cam;
S.profiles = S.profiles || {};
S.roster = S.roster || [];
S.mode = S.mode || 'prac'; S.diff = S.diff || 'facil'; S.input = S.input || (IS_TOUCH ? 'swipe' : 'meter'); S.rival = S.rival || 'no'; S.rotate = S.rotate !== false;
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
function newProfile(name, av, id) {
  id = id || 'p' + Math.random().toString(36).slice(2, 9);
  if (!S.profiles[id]) S.profiles[id] = { id: id, name: name, av: av, coins: 0, look: baseLook(), sk: { tiro: 70, rango: 70, ritmo: 70, clutch: 70 }, pick: 'me', best: {}, prac: { made: 0, att: 0, streak: 0 }, ach: {} };
  var p = S.profiles[id]; p.name = name; p.av = av;
  if (!p.look) p.look = baseLook();
  if (p.look.jersey === 'YO' || !p.look.jersey) p.look.jersey = name.toUpperCase().slice(0, 10);
  return p;
}
S.roster = S.roster.filter(function (id) { return S.profiles[id]; });

/* ================= SONIDO ================= */
var AC = null, noiseBuf = null, crowdNode = null;
function ac() { try { if (!AC) { AC = new (window.AudioContext || window.webkitAudioContext)(); Audio2.on.sfx = S.prefs.sfx; Audio2.on.crowd = S.prefs.crowd; Audio2.on.music = S.prefs.music; Audio2.init(AC); Audio2.music(musicFor()); } if (AC.state === 'suspended') AC.resume(); } catch (e) {} return AC; }
function musicFor() { if (cur === 'game' && G) { if (celeb) return 'celeb'; var p = G.players[G.turn]; return p && p.streak >= 3 ? 'fire' : 'game'; } return 'menu'; }
function syncMusic() { if (AC) Audio2.music(musicFor()); }
function noise() { if (!noiseBuf) { noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate); var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } var s = AC.createBufferSource(); s.buffer = noiseBuf; return s; }
function tone(f, d, type, v, when, f2) {
  if (!S.prefs.sfx || !ac()) return;
  var t = AC.currentTime + (when || 0), o = AC.createOscillator(), g = AC.createGain();
  o.type = type || 'triangle'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v || 0.14, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + d);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + 0.05);
}
function nz(d, type, f, q, v, when, f2) {
  if (!S.prefs.sfx || !ac()) return;
  var t = AC.currentTime + (when || 0), s = noise(), bq = AC.createBiquadFilter(), g = AC.createGain();
  bq.type = type; bq.frequency.setValueAtTime(f, t); if (f2) bq.frequency.exponentialRampToValueAtTime(f2, t + d); bq.Q.value = q || 1;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + Math.min(0.03, d / 4)); g.gain.exponentialRampToValueAtTime(0.001, t + d);
  s.connect(bq); bq.connect(g); g.connect(AC.destination); s.start(t, Math.random()); s.stop(t + d + 0.05);
}
var SFX = {
  key: function () { if (Audio2.play('click', 0.5)) return; tone(520, 0.06, 'sine', 0.08); },
  ok: function () { tone(660, 0.1, 'triangle', 0.12); tone(990, 0.12, 'triangle', 0.1, 0.07); },
  release: function () { if (Audio2.play('lanzar', 0.7)) return; nz(0.18, 'bandpass', 900, 1.5, 0.45, 0, 2800); tone(220, 0.08, 'sine', 0.08); },
  swish: function () { if (Audio2.play('swish', 1)) return; nz(0.35, 'bandpass', 2600, 0.8, 0.5, 0, 1400); nz(0.25, 'highpass', 5000, 0.7, 0.18, 0.05); },
  rim: function (k) { k = k || 0.7; if (Audio2.play(Math.random() < 0.5 ? 'aro' : 'aro2', 0.35 + k * 0.65, 0.95 + Math.random() * 0.1)) return; [610, 1190, 1730, 2410].forEach(function (f, i) { tone(f, 0.35 - i * 0.05, 'sine', 0.09 * k, 0); }); nz(0.05, 'highpass', 3000, 1, 0.2 * k); },
  board: function () { if (Audio2.play('tablero', 1)) return; nz(0.18, 'lowpass', 400, 1, 0.5); tone(110, 0.16, 'sine', 0.2); },
  floor: function (k) { if (Audio2.play('pique', 0.3 + (k || 0.6) * 0.7, 0.95 + Math.random() * 0.1)) return; tone(95, 0.14, 'sine', 0.3 * (k || 0.6), 0, 60); nz(0.06, 'lowpass', 600, 1, 0.2 * (k || 0.6)); },
  buzzer: function () { tone(170, 1.1, 'sawtooth', 0.12); tone(173, 1.1, 'square', 0.06); },
  cheer: function (k) { Audio2.excite(Math.min(1, 0.45 + (k || 1) * 0.5)); if (Audio2.play((k || 1) >= 0.85 ? 'festejo_grande' : 'festejo', Math.min(1, 0.55 + (k || 1) * 0.4))) return; nz(1.8 * (k || 1), 'bandpass', 1100, 0.6, 0.35 * (k || 1), 0); nz(1.5 * (k || 1), 'bandpass', 2200, 0.8, 0.15, 0.1); },
  aww: function () { Audio2.excite(0.45); if (Audio2.play(Math.random() < 0.5 ? 'uhh' : 'uhh2', 0.8)) return; nz(0.9, 'bandpass', 700, 1.2, 0.22, 0, 350); },
  coin: function () { if (Audio2.play('moneda', 0.6)) return; tone(988, 0.07, 'square', 0.06); tone(1319, 0.12, 'square', 0.06, 0.07); },
  money: function () { [1047, 1319, 1568, 2093].forEach(function (f, i) { tone(f, 0.15, 'square', 0.06, i * 0.07); }); },
  win: function () { [523, 659, 784, 1047, 784, 1047].forEach(function (f, i) { tone(f, 0.16, 'square', 0.07, i * 0.11); }); },
  tick: function () { tone(1400, 0.05, 'square', 0.08); },
  arm: function () { tone(880, 0.08, 'sine', 0.12); }
};
function crowdAmb(on) {
  if (window.Audio2) { Audio2.on.crowd = S.prefs.crowd; Audio2.on.sfx = S.prefs.sfx; if (ac()) Audio2.crowd(on); return; }
  try {
    if (!on || !S.prefs.crowd || !S.prefs.sfx || !ac()) { if (crowdNode) { crowdNode.s.stop(); crowdNode = null; } return; }
    if (crowdNode) return;
    var s = noise(), bq = AC.createBiquadFilter(), g = AC.createGain(); s.loop = true; bq.type = 'bandpass'; bq.frequency.value = 600; bq.Q.value = 0.5; g.gain.value = 0.035;
    s.connect(bq); bq.connect(g); g.connect(AC.destination); s.start(); crowdNode = { s: s, g: g };
  } catch (e) {}
}
/* Locutor: frases pregrabadas (voz neuronal es_AR) en assets/voz/*.mp3 */
var VOZ = {}, vozQ = [], vozBusy = false, vozAvail = [], vozViejas = ['bienvenida','ya','adentro','adentro2','adentro3','limpita','tablero','bailo','money','fuego','racha','casi','corta','larga','rack','diez','tiempo','record','muybien','genia','moneyrack','siguiente','gano','otra','curry','doncic','lebron','jordan','kobe','shaq','manu','bird','turno','nombre_emi','nombre_papa','nombre_mama'];
function vozBuf(id) {
  if (VOZ[id] !== undefined) return VOZ[id];
  VOZ[id] = null;
  if (!ac() || vozAvail.indexOf(id) < 0) return null;
  fetch('/assets/voz/' + id + '.mp3').then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); }).then(function (b) { return new Promise(function (res, rej) { AC.decodeAudioData(b, res, rej); }); }).then(function (buf) { VOZ[id] = buf; }).catch(function () { VOZ[id] = false; });
  return null;
}
function nameClip(n) { var k = 'nombre_' + String(n || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, ''); return vozAvail.indexOf(k) >= 0 ? k : null; }
function voz(ids, force) {
  if (!S.prefs.voice || !ac()) return;
  ids = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
  if (!ids.length) return;
  if (force) { vozQ = []; }
  else if (vozBusy && vozQ.length > 1) return; // no amontonar frases
  ids.forEach(function (id) { vozBuf(id); });
  vozQ = vozQ.concat(ids); if (!vozBusy) vozNext();
}
function vozNext() {
  var id = vozQ.shift(); if (!id) { vozBusy = false; return; }
  vozBusy = true;
  var tries = 0;
  (function wait() {
    var b = VOZ[id];
    if (b === false || tries > 40) { vozNext(); return; }
    if (!b) { tries++; setTimeout(wait, 50); return; }
    var src = AC.createBufferSource(), g = AC.createGain(); g.gain.value = 0.9; src.buffer = b; src.connect(g); g.connect(AC.destination);
    src.onended = function () { setTimeout(vozNext, 60); }; src.start();
  })();
}
document.addEventListener('pointerdown', function () { if (ac()) vozAvail.forEach(function (id) { vozBuf(id); }); }, { once: true });
var voice = null;
function say(t, rate) {
  if (!S.prefs.robot) return; // la voz robótica del navegador queda apagada: usamos las frases grabadas
  if (!S.prefs.voice || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(t), vs = speechSynthesis.getVoices();
    if (!voice) voice = vs.filter(function (v) { return /es[-_](AR|419|US|MX)/i.test(v.lang); })[0] || vs.filter(function (v) { return /^es/i.test(v.lang); })[0];
    if (voice) u.voice = voice;
    u.lang = voice ? voice.lang : 'es-AR'; u.rate = rate || 1.05; u.pitch = 1.05;
    speechSynthesis.speak(u);
  } catch (e) {}
}
var vib = function (p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} };
function confetti(n) {
  var cs = S.prefs.theme === 'princess' ? ['#ff5fa2', '#ffd23f', '#b06ae0', '#fff', '#7ee0ff'] : ['#ff4d6d', '#ffd54d', '#2fd27a', '#3fa7ff', '#b86bff', '#ff8a3d'];
  for (var i = 0; i < (n || 80); i++) {
    var d = document.createElement('i'); d.className = 'cf';
    d.style.left = Math.random() * 100 + 'vw'; d.style.background = pick(cs);
    d.style.animationDuration = 1.6 + Math.random() * 1.8 + 's'; d.style.animationDelay = Math.random() * 0.5 + 's';
    d.style.borderRadius = Math.random() < 0.5 ? '50%' : '2px';
    document.body.appendChild(d); (function (d) { setTimeout(function () { d.remove(); }, 4200); })(d);
  }
}

/* ================= NAVEGACIÓN + CONTROL REMOTO ================= */
var cur = 'start', stack = [];
var RENDER = {};
function show(id, push) {
  if (push !== false && cur !== id) stack.push(cur);
  $$('.screen').forEach(function (s) { s.classList.toggle('hidden', s.id !== id); });
  cur = id;
  syncMusic();
  if (RENDER[id]) RENDER[id]();
  setTimeout(function () { var f = $('#' + id + ' .big'); if (f && !IS_TOUCH) try { f.focus({ preventScroll: true }); } catch (e) {} }, 30);
  broadcast();
}
function back() { var p = stack.pop() || 'start'; show(p, false); }
function ovOpen() { return !$('#ov').classList.contains('hidden'); }
function scopeEl() {
  if (!$('#calib').classList.contains('hidden')) return $('#calib');
  if (ovOpen()) return $('#ov');
  if (!$('#celeb').classList.contains('hidden')) return null;
  return $('#' + cur);
}
function pressDigit(dig) {
  document.body.classList.add('teclas');
  if (celeb) { if (dig === '0') endCeleb(); return true; }
  var sc = scopeEl(); if (!sc) return false;
  if (cur === 'game' && !ovOpen() && $('#calib').classList.contains('hidden')) { if (gameDigit(dig)) return true; }
  var b = Array.prototype.slice.call(sc.querySelectorAll('[data-k="' + dig + '"]')).filter(function (el) { return el.offsetParent !== null && !el.disabled; })[0];
  if (b) { b.click(); return true; }
  return false;
}
function pressBack() {
  if (celeb) { endCeleb(); return; }
  if (!$('#calib').classList.contains('hidden')) { closeCalib(); return; }
  if (ovOpen()) { var c = $('#ov [data-act="resume"]'); if (c) c.click(); return; }
  if (cur === 'game') { act('pause'); return; }
  if (cur === 'start') { if (HUB) goHub(); return; }
  if (cur === 'edit') { act('edDone'); return; }
  back();
}
function moveFocus(dir) {
  var sc = scopeEl(); if (!sc) return;
  var els = Array.prototype.slice.call(sc.querySelectorAll('button:not([disabled]),input')).filter(function (e) { return e.offsetParent; });
  if (!els.length) return;
  var c = els.indexOf(document.activeElement) >= 0 ? document.activeElement : null;
  if (!c) { els[0].focus(); return; }
  var r = c.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, best = null, bs = 1e9;
  els.forEach(function (e) {
    if (e === c) return;
    var b = e.getBoundingClientRect(), dx = b.left + b.width / 2 - cx, dy = b.top + b.height / 2 - cy;
    var main = { up: -dy, down: dy, left: -dx, right: dx }[dir];
    if (main <= 4) return;
    var s = main + (dir === 'up' || dir === 'down' ? Math.abs(dx) : Math.abs(dy)) * 2.2;
    if (s < bs) { bs = s; best = e; }
  });
  if (best) best.focus();
}
var keyDownAt = 0, keyHeld = false;
document.addEventListener('keydown', function (e) {
  ac();
  if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) { if (e.key === 'Enter') { var b = $('#' + cur + ' .big'); if (b) b.click(); } return; }
  var k = e.key || '', kc = e.keyCode;
  var dig = /^[0-9]$/.test(k) ? k : (kc >= 48 && kc <= 57) ? String(kc - 48) : (kc >= 96 && kc <= 105) ? String(kc - 96) : '';
  if (dig) {
    e.preventDefault();
    if (cur === 'game' && dig === '0' && !ovOpen() && !celeb) { if (!e.repeat) shootKeyDown(); return; }
    if (!e.repeat) pressDigit(dig); return;
  }
  if (k === ' ' && cur === 'game' && !ovOpen()) { e.preventDefault(); if (!e.repeat) shootKeyDown(); return; }
  if (['GoBack', 'BrowserBack', 'Escape', 'Backspace'].indexOf(k) >= 0 || kc === 10009 || kc === 461) { e.preventDefault(); pressBack(); return; }
  var dirs = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
  if (dirs[k]) { e.preventDefault(); if (cur === 'game' && !ovOpen() && G && S.mode === 'prac' && (k === 'ArrowLeft' || k === 'ArrowRight')) { gameDigit(String(Math.max(1, Math.min(5, G.spot + 1 + (k === 'ArrowRight' ? 1 : -1))))); return; } moveFocus(dirs[k]); return; }
  if (k === 'Enter' && cur === 'game' && !ovOpen() && document.activeElement === document.body) { e.preventDefault(); shootKeyDown(); }
});
document.addEventListener('keyup', function (e) {
  var k = e.key || '', kc = e.keyCode;
  if ((k === '0' || kc === 48 || kc === 96 || k === ' ' || k === 'Enter') && cur === 'game') shootKeyUp();
});

/* ================= PANTALLA COMPLETA ================= */
var fsEl = function () { return document.fullscreenElement || document.webkitFullscreenElement; };
var fsOk = function () { return !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen); };
var standalone = function () { return matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches || navigator.standalone; };
var isIOS = function () { return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); };
function enterFS() {
  if (fsEl()) return;
  var d = document.documentElement;
  try {
    if (d.requestFullscreen) { var p = d.requestFullscreen({ navigationUI: 'hide' }); if (p && p.catch) p.catch(function () {}); }
    else if (d.webkitRequestFullscreen) d.webkitRequestFullscreen();
    else if (isIOS() && !standalone()) toast('En iPhone: tocá <b>Compartir → “Agregar a inicio”</b> y abrilo desde ahí para jugar en pantalla completa.', 6000);
  } catch (e) {}
}
function toggleFS() { if (fsEl()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } else enterFS(); }
function syncFS() { var b = $('#fsBtn'), on = !!fsEl(); b.textContent = on ? '🗗' : '⛶'; b.classList.toggle('on', on); }
document.addEventListener('fullscreenchange', syncFS); document.addEventListener('webkitfullscreenchange', syncFS);
$('#fsBtn').onclick = function (e) { e.stopPropagation(); toggleFS(); };
if (standalone() || (!fsOk() && !isIOS())) $('#fsBtn').classList.add('hidden');

/* ================= OPCIONES ================= */
function applyPrefs() {
  document.body.classList.toggle('princess', S.prefs.theme === 'princess');
  document.body.classList.toggle('arcade', S.prefs.cam === 'arcade');
  document.querySelector('meta[name=theme-color]').content = S.prefs.theme === 'princess' ? '#6a2a6a' : '#0b1026';
}
RENDER.opts = function () {
  var o = S.prefs, i = 1;
  $('#optRow').innerHTML = [
    ['theme', o.theme === 'princess' ? '👑 Modo princesa' : '🏀 Modo normal', true],
    ['sfx', o.sfx ? '🔊 Sonidos' : '🔇 Sonidos', o.sfx],
    ['crowd', o.crowd ? '🏟️ Público' : '🤫 Público', o.crowd],
    ['music', o.music ? '🎶 Música' : '🔇 Música', o.music],
    ['voice', o.voice ? '🗣️ Voz' : '🤐 Voz', o.voice]
  ].map(function (x) { return '<button class="pill' + (x[2] ? ' on' : '') + '" data-opt="' + x[0] + '" data-k="' + (i++) + '">' + x[1] + '</button>'; }).join('') +
    (Sim.supported() && IS_TOUCH ? '<button class="pill" data-act="calib" data-k="5">📱 Calibrar simulación</button>' : '');
  $('#optInfo').textContent = S.prefs.theme === 'princess' ? 'En modo princesa la money ball es un arcoíris 🌈' : 'La money ball (la última de cada rack) es la blanca, azul y roja y vale 2.';
};

/* ================= JUGADORES (¿Quién juega?) ================= */
function roster() { return S.roster.map(function (id) { return S.profiles[id]; }).filter(Boolean); }
function allPlayers() {
  var list = roster().map(function (p) { return { id: p.id, name: p.name, av: p.av }; });
  pads.forEach(function (pd) { if (pd.ready) list.push({ id: pd.id, name: pd.name, av: pd.av, phone: true }); });
  return list;
}
var editMode = false;
RENDER.start = function () {
  var ids = {}; S.roster.forEach(function (id) { ids[id] = 1; });
  var phones = []; pads.forEach(function (p) { if (p.ready) phones.push(p); });
  var locals = Object.keys(S.profiles).map(function (k) { return S.profiles[k]; }).filter(function (p) { return !phones.some(function (x) { return x.id === p.id; }) && p.id.indexOf('ph-') !== 0; });
  if (!locals.length) editMode = false;
  $('#who').classList.toggle('editing', editMode);
  var n = 1, html = '';
  locals.forEach(function (p) {
    var k = n <= 6 ? ' data-k="' + (n++) + '"' : '';
    html += '<button class="wb' + (ids[p.id] ? ' on' : '') + '" ' + (editMode ? 'data-edit' : 'data-toggle') + '="' + p.id + '"' + k + '><span class="av">' + esc(p.av) + '</span><span class="ck">' + (editMode ? '✏️' : ids[p.id] ? '✓' : '') + '</span><span class="nm">' + esc(p.name) + '</span><small>' + p.coins + ' 🪙 · 🏆 ' + bestOf(p) + '</small></button>';
  });
  phones.forEach(function (p) { html += '<div class="wb on"><span class="av">' + esc(p.av) + '</span><span class="ck">📱</span><span class="nm">' + esc(p.name) + '</span><small>' + ((S.profiles[p.id] || {}).coins || 0) + ' 🪙</small></div>'; });
  if (!editMode) html += '<button class="wb add" data-act="newPlayer" data-k="7"><span class="av">➕</span><span class="nm">Nuevo</span><small>jugador</small></button>';
  $('#who').innerHTML = html;
  var ps = allPlayers();
  $('#whoTitle').textContent = editMode ? '✏️ Editar jugadores' : ps.length > 1 ? '¿Quién juega? (' + ps.length + ')' : '¿Quién juega?';
  $('#whoHint').textContent = editMode ? 'Tocá un jugador para cambiarle el nombre, reiniciarlo o borrarlo' : !locals.length && !phones.length ? '¡Creá tu jugador para empezar!' : 'Tocá para sumar o sacar · con el celu se suman solos';
  $('#whoTools').innerHTML = locals.length ? '<button class="pill' + (editMode ? ' on' : '') + '" data-act="editMode" data-k="8">' + (editMode ? '✔ Listo' : '✏️ Editar') + '</button>' : '';
  $('#btnPlay').classList.toggle('off', !ps.length);
  $('#btnPlay').textContent = ps.length ? '▶ Jugar' + (ps.length > 1 ? ' (' + ps.length + ')' : '') : '➕ Crear jugador';
};
function bestOf(p) { var b = p.best || {}; return Math.max(b.facil || 0, b.normal || 0, b.pro || 0); }
var newAv = ANIMALS[0], editId = null;
function openNewPlayer(id) {
  editId = id || null;
  var pr = editId && S.profiles[editId];
  newAv = pr ? pr.av : pick(ANIMALS);
  $('#newpTitle').textContent = pr ? 'Editar jugador' : 'Nuevo jugador';
  $('#editExtra').classList.toggle('hidden', !pr);
  $('#avs').innerHTML = ANIMALS.map(function (a) { return '<button class="avb' + (a === newAv ? ' on' : '') + '" data-av="' + a + '">' + a + '</button>'; }).join('');
  $('#newName').value = pr ? pr.name : '';
  $('#avPrev').textContent = newAv;
  show('newp');
  if (!IS_TOUCH) setTimeout(function () { $('#newName').focus(); }, 60);
}

/* ================= MODO ================= */
var INPUTS = { swipe: '👆 Deslizar', meter: '⏱️ Medidor', sim: '📱 Simulación' };
RENDER.mode = function () {
  $('#modes').innerHTML = [['prac', '🎯', 'Práctica', 'Elegí la posición y tirá todo lo que quieras. Rack perfecto = festejo.'], ['conc', '🏆', 'Concurso', '5 racks contra reloj. La última de cada rack es la money ball (vale 2).']]
    .map(function (m, i) { return '<button class="card' + (S.mode === m[0] ? ' on' : '') + '" data-mode="' + m[0] + '" data-k="' + (i + 1) + '"><span class="e">' + m[1] + '</span><b>' + m[2] + '</b><small>' + m[3] + '</small></button>'; }).join('');
  var k = 3;
  $('#diffs').innerHTML = '<span class="lbl">Dificultad</span>' + Object.keys(DIFFS).map(function (d) { return '<button class="pill' + (S.diff === d ? ' on' : '') + '" data-diff="' + d + '" data-k="' + (k++) + '">' + DIFFS[d].e + ' ' + DIFFS[d].n + '</button>'; }).join('');
  var sims = Sim.supported() && IS_TOUCH;
  if (S.input === 'sim' && !sims) S.input = IS_TOUCH ? 'swipe' : 'meter';
  var rivalName = S.rival === 'no' ? 'Sin rival' : '🤖 ' + starById(S.rival).short;
  $('#moreOpts').innerHTML = '<button class="pill" data-act="cycleInput" data-k="6">Tirar: ' + INPUTS[S.input] + '</button>' +
    (S.mode === 'conc' ? '<button class="pill" data-act="cycleRival" data-k="7">Rival: ' + rivalName + '</button>' : '<button class="pill' + (S.rotate ? ' on' : '') + '" data-act="toggleRotate" data-k="7">🔄 Cambiar de posición: ' + (S.rotate ? 'sí' : 'no') + '</button>') +
    '<button class="pill" data-act="opts" data-k="9">⚙️ Opciones</button>';
};
function starById(id) { for (var i = 0; i < STARS.length; i++) if (STARS[i].id === id) return STARS[i]; return null; }

/* ================= ELEGIR JUGADOR ================= */
var pickQ = [], pickI = 0, pickSel = {};
function startPicking() {
  var ps = allPlayers();
  if (!ps.length) return openNewPlayer();
  pickQ = ps; pickI = 0; pickSel = {};
  ps.forEach(function (p) { var pr = S.profiles[p.id]; pickSel[p.id] = (pr && pr.pick && pr.pick !== 'me') ? pr.pick : 'lebron'; });
  show('pick');
}
function playerLook(pid, sel) {
  if (sel === 'me') { var pr = S.profiles[pid]; return pr ? pr.look : baseLook(); }
  return starById(sel).look;
}
function playerSkills(pid, sel) { if (sel === 'me') { var pr = S.profiles[pid]; return pr ? pr.sk : CUSTOM_BASE_SK; } return starById(sel).sk; }
function skBars(sk) { return '<div class="bars">' + Object.keys(SK_NAMES).map(function (k) { return '<div class="bar">' + SK_NAMES[k].split(' ')[0] + '<i><u style="width:' + sk[k] + '%"></u></i></div>'; }).join('') + '</div>'; }
RENDER.pick = function () {
  var p = pickQ[pickI]; if (!p) return;
  var sel = pickSel[p.id];
  $('#pickTitle').innerHTML = (pickQ.length > 1 ? esc(p.av) + ' ' + esc(p.name) + ', ' : '') + '¿con quién tirás?';
  var opts = STARS.filter(function (s) { return Arcade.has(s.id); }).map(function (s) { return { id: s.id, name: s.short, tag: s.tag }; });
  if (!opts.some(function (o) { return o.id === sel; }) && opts.length) { sel = pickSel[p.id] = opts[0].id; }
  $('#pgrid').innerHTML = opts.map(function (o, i) {
    var sk = playerSkills(p.id, o.id);
    return '<button class="pc' + (sel === o.id ? ' on' : '') + '" data-pick="' + o.id + '" data-k="' + (i + 1) + '"><canvas width="240" height="240" data-face="' + o.id + '"></canvas><b>' + esc(o.id === 'me' ? (S.profiles[p.id] ? S.profiles[p.id].name : 'Yo') : o.name) + '</b><small>' + esc(o.tag) + '</small>' + skBars(sk) + '</button>';
  }).join('');
  $$('#pgrid canvas').forEach(function (cv) { var fid = cv.getAttribute('data-face'); portrait(cv, playerLook(p.id, fid), null, fid); });
};
function portrait(cv, look, bg, id) {
  if (id && Arcade.portrait(cv, id)) return;
  var c = cv.getContext('2d'), w = cv.width, h = cv.height; c.clearRect(0, 0, w, h);
  c.save(); c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, 7); c.clip();
  c.fillStyle = bg || 'rgba(255,255,255,.14)'; c.fillRect(0, 0, w, h);
  var u = w / 4.6; var B = bodyOf(look);
  drawPlayer(c, look, { x: w / 2, y: h * 0.5 + B.hy * u, u: u, view: 'front', pose: standPose(B), shadow: false });
  c.restore();
}

/* ================= EDITOR DEL AVATAR ================= */
var edPid = null, edTab = 0, edT0 = 0, edCeleb = false;
var ED_TABS = [
  { n: '🧍 Cuerpo', rows: ['height', 'weight', 'build', 'skin', 'shoes'] },
  { n: '🙂 Cara', rows: ['face', 'eyes', 'beard', 'glasses'] },
  { n: '💇 Pelo', rows: ['hair', 'hairColor', 'headband'] },
  { n: '👕 Equipo', rows: ['kit', 'number', 'jersey'] },
  { n: '⌚ Accesorios', rows: ['arms', 'extra', 'tattoo'] },
  { n: '🎉 Festejo', rows: ['celeb', 'see'] },
  { n: '⭐ Mejorar', rows: ['up_tiro', 'up_rango', 'up_ritmo', 'up_clutch'] }
];
var ED_DEF = {
  height: { n: 'Altura', list: range(150, 230, 5), fmt: function (v) { return (v / 100).toFixed(2).replace('.', ',') + ' m'; } },
  weight: { n: 'Peso', list: range(45, 160, 5), fmt: function (v) { return v + ' kg'; } },
  build: { n: 'Contextura', opts: BUILDS },
  skin: { n: 'Color de piel', list: range(0, SKINS.length - 1, 1), sw: function (v) { return SKINS[v]; } },
  shoes: { n: 'Zapatillas', list: range(0, SHOE_COLORS.length - 1, 1), sw: function (v) { return SHOE_COLORS[v]; } },
  face: { n: 'Forma de cara', opts: FACES },
  eyes: { n: 'Ojos', list: range(0, EYE_COLORS.length - 1, 1), sw: function (v) { return EYE_COLORS[v]; } },
  beard: { n: 'Barba', opts: BEARDS },
  glasses: { n: 'Anteojos', opts: GLASSES },
  hair: { n: 'Corte de pelo', opts: HAIR_STYLES },
  hairColor: { n: 'Color de pelo', list: range(0, HAIR_COLORS.length - 1, 1), sw: function (v) { return HAIR_COLORS[v]; } },
  headband: { n: 'Vincha', opts: HEADBANDS },
  kit: { n: 'Colores', list: range(0, KIT_COLORS.length - 1, 1), sw: function (v) { return KIT_COLORS[v][0] + '"></span><span class="sw" style="background:' + KIT_COLORS[v][1]; } },
  number: { n: 'Número', list: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 20, 21, 23, 24, 30, 32, 33, 34, 41, 77, 99] },
  arms: { n: 'Brazos', opts: ARMS },
  extra: { n: 'Extra', opts: EXTRAS },
  tattoo: { n: 'Tatuajes', opts: TATTOOS },
  celeb: { n: 'Festejo', opts: CUSTOM_CELEBS.map(function (k) { return { v: k, n: CELEBS[k].e + ' ' + CELEBS[k].n }; }) }
};
function range(a, b, s) { var r = []; for (var x = a; x <= b; x += s) r.push(x); return r; }
function upCost(v) { return 15 + (v - 70) * 4; }
function openEditor(pid) {
  edPid = pid || (roster()[0] || {}).id;
  if (!edPid) { openNewPlayer(); return; }
  edTab = 0; edT0 = performance.now(); edCeleb = false;
  show('edit');
}
RENDER.edit = function () {
  var pr = S.profiles[edPid]; if (!pr) return;
  $('#edTitle').innerHTML = esc(pr.av) + ' Jugador de ' + esc(pr.name) + ' <span class="coins" style="font-size:.6em">' + pr.coins + ' 🪙</span>';
  $('#edTabs').innerHTML = ED_TABS.map(function (t, i) { return '<button class="pill' + (i === edTab ? ' on' : '') + '" data-tab="' + i + '">' + t.n + '</button>'; }).join('');
  var L = pr.look, html = '';
  ED_TABS[edTab].rows.forEach(function (key, i) {
    var k = ' data-k="' + (i + 1) + '"';
    if (key === 'jersey') { html += '<div class="erow"><span class="k">Nombre en la espalda</span><input id="edJersey" maxlength="10" value="' + esc(L.jersey) + '"></div>'; return; }
    if (key === 'see') { html += '<div class="erow"><span class="k">Probar</span><span class="v"></span><button class="pill on" data-act="edSee"' + k + '>▶ Ver festejo</button></div>'; return; }
    if (key.indexOf('up_') === 0) {
      var s = key.slice(3), v = pr.sk[s], cost = upCost(v);
      html += '<div class="erow"><span class="k">' + SK_NAMES[s] + '</span><span class="v">' + v + (v >= 95 ? ' ⭐ máx.' : '') + '</span>' + (v < 95 ? '<button class="pill' + (pr.coins >= cost ? ' on' : '') + '" data-up="' + s + '"' + k + '>+3 · ' + cost + ' 🪙</button>' : '') + '</div>'; return;
    }
    var d = ED_DEF[key], val = L[key], txt;
    if (d.opts) { var o = d.opts.filter(function (x) { return x.v === val; })[0]; txt = o ? o.n : String(val); }
    else if (d.sw) txt = '<span class="sw" style="background:' + d.sw(val) + '"></span>';
    else txt = d.fmt ? d.fmt(val) : String(val);
    html += '<div class="erow"><span class="k">' + d.n + '</span><button class="ar" data-ed="' + key + '" data-dir="-1">◀</button><span class="v">' + txt + '</span><button class="ar" data-ed="' + key + '" data-dir="1"' + k + '>▶</button></div>';
  });
  $('#edRows').innerHTML = html;
  var inp = $('#edJersey'); if (inp) inp.oninput = function () { pr.look.jersey = inp.value.toUpperCase(); save(); };
  sizeEdCanvas();
};
function edCycle(key, dir) {
  var pr = S.profiles[edPid], d = ED_DEF[key], list = d.opts ? d.opts.map(function (o) { return o.v; }) : d.list;
  var i = list.indexOf(pr.look[key]); if (i < 0) i = 0;
  pr.look[key] = list[(i + dir + list.length) % list.length];
  if (key === 'celeb') { edCeleb = true; edT0 = performance.now(); }
  save(); SFX.key(); RENDER.edit();
}
function sizeEdCanvas() { var cv = $('#edCv'), r = cv.parentNode.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.max(10, r.width * dpr); cv.height = Math.max(10, r.height * dpr); }
var edLast = 0;
function drawEditor(now) {
  var pr = S.profiles[edPid]; if (!pr) return;
  var dtE = edLast ? Math.min(0.05, (now - edLast) / 1000) : 0.016; edLast = now;
  if (window.T3 && T3.ready) {
    $('#edCv').style.visibility = 'hidden';
    var tE = (now - edT0) / 1000; if (edCeleb && tE > 6) edCeleb = false;
    T3.editor($('#edPrev'), pr.look, edCeleb ? tE : null, dtE, edTab === 3 && Math.floor(tE / 3) % 2 === 1);
    return;
  }
  var cv = $('#edCv'), c = cv.getContext('2d'), w = cv.width, h = cv.height;
  c.clearRect(0, 0, w, h);
  var t = (now - edT0) / 1000;
  var L = pr.look, B = bodyOf(L), u = Math.min(h / (B.hy + B.R + 2.2), w / 9);
  var g = c.createRadialGradient(w / 2, h * 0.45, 10, w / 2, h * 0.45, h * 0.6); g.addColorStop(0, 'rgba(255,255,255,.22)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  var showBack = !edCeleb && (Math.floor(t / 4) % 3 === 2) && edTab === 3;
  var pose = edCeleb ? celebPose(L, t) : (function () { var p = standPose(B); p.tilt = Math.sin(t * 1.4) * 0.04; return p; })();
  drawPlayer(c, L, { x: w / 2, y: h - u * 1.0, u: u, view: showBack ? 'back' : 'front', pose: pose, t: t, princess: S.prefs.theme === 'princess' });
  c.fillStyle = 'rgba(255,255,255,.8)'; c.font = '800 ' + Math.round(u * 0.55) + 'px sans-serif'; c.textAlign = 'left';
  c.fillText((L.height / 100).toFixed(2).replace('.', ',') + ' m · ' + L.weight + ' kg', u * 0.4, u * 0.9);
  if (edCeleb && t > 5.6) edCeleb = false;
}

/* ================= PARTIDA ================= */
var G = null;
var cv = $('#cv'), ctx = cv.getContext('2d');
document.addEventListener('arcadeready', function () { if (RENDER[cur] && cur !== 'game') RENDER[cur](); if (G) portrait($('#hudPortrait'), P().look, null, P().star && P().star.id); });
function sizeCanvas() { var dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(cv.clientWidth * dpr); cv.height = Math.round(cv.clientHeight * dpr); }
window.addEventListener('resize', function () { if (cur === 'game') sizeCanvas(); if (cur === 'edit') sizeEdCanvas(); });

function newRacks(moneySpot) { var r = []; for (var i = 0; i < 5; i++) r.push({ res: [], left: 5, money: i === moneySpot }); return r; }
function startGame() {
  var ps = pickQ.map(function (p) {
    var sel = pickSel[p.id] || 'me', pr = S.profiles[p.id];
    if (pr) { pr.pick = sel; }
    var star = sel === 'me' ? null : starById(sel);
    return { id: p.id, name: p.name, av: p.av, phone: !!p.phone, sel: sel, star: star, look: playerLook(p.id, sel), sk: playerSkills(p.id, sel), label: star ? star.short : (pr ? pr.name : p.name), score: 0, made: 0, att: 0, streak: 0, best: 0, swishRun: 0, coins: 0 };
  });
  save();
  G = { mode: S.mode, diff: S.diff, input: S.input, players: ps, turn: 0, spot: S.mode === 'conc' ? 0 : 2, phase: 'intro', racks: newRacks(-1), ball: 0, time: DIFFS[S.diff].time, running: false, msgT: 0, shooter: null, meter: null, swipe: null, cpu: S.mode === 'conc' && S.rival !== 'no' ? starById(S.rival) : null, results: [] };
  show('game'); sizeCanvas(); enterFS();
  crowdAmb(true);
  beginTurn();
}
function P() { return G.players[G.turn]; }
function beginTurn() {
  var p = P();
  G.spot = G.mode === 'conc' ? 0 : (G.spot || 2); G.ball = 0; G.time = DIFFS[G.diff].time; G.running = false;
  G.racks = newRacks(-1); p.score = 0; p.made = 0; p.att = 0; p.streak = 0; Audio2.setBase(0.25); syncMusic();
  G.shooter = { pos: Court.spotPos(G.spot, G.diff), look: p.look, pose: shotPose(p.look, 0, 0), hasBall: false, money: false };
  Court.setSpot(G.spot, G.diff, true); Court.clearBall();
  portrait($('#hudPortrait'), p.look, null, p.star && p.star.id);
  updateHUD();
  if (G.mode === 'conc') {
    G.phase = 'intro';
    showOv('<div class="res-e">🏆</div><h1>' + esc(p.av) + ' ' + esc(p.name) + '</h1><p class="sub">tira con <b>' + esc(p.label) + '</b> · ' + DIFFS[G.diff].time + ' segundos · ' + DIFFS[G.diff].e + ' ' + DIFFS[G.diff].n + '</p><h2>Elegí tu rack de money balls 💰</h2><p class="sub">Todas las pelotas de ese rack valen 2</p><div class="row">' +
      SPOTS.map(function (s, i) { return '<button class="pill' + (i === 4 ? ' on' : '') + '" data-money="' + i + '" data-k="' + (i + 1) + '">' + (i + 1) + ' · ' + s.n + '</button>'; }).join('') + '</div><button class="big" data-money="4" data-k="0">▶ ¡A tirar!</button>');
    voz(['turno', nameClip(p.name), p.star ? p.star.id : null, 'moneyrack'], true);
  } else {
    G.phase = 'pickup'; G.phaseT = 0;
    if (G.players.length > 1) voz(['turno', nameClip(p.name), p.star ? p.star.id : null], true); else voz(['bienvenida'], true);
  }
  broadcast();
}
function setMoneyRack(i) {
  hideOv(); G.racks = newRacks(i); G.running = true; G.phase = 'pickup'; G.phaseT = 0;
  bigMsg('¡YA!'); SFX.buzzer(); voz('ya', true); updateHUD(); broadcast();
}
function isMoney(spot, idx) { var r = G.racks[spot]; return r.money || idx === 4; }
function pickupTime() { var r = P().sk.ritmo; return G.mode === 'conc' ? 0.95 - r / 100 * 0.6 : 0.6; }

/* ---------- entrada del tiro ---------- */
function canShoot() { if (G && G.phase === 'pickup' && cur === 'game' && !ovOpen() && !celeb) { G.phase = 'ready'; G.shooter.hasBall = true; G.shooter.money = isMoney(G.spot, G.ball); } return G && cur === 'game' && G.phase === 'ready' && !ovOpen() && !celeb; }
function armShot() { if (!canShoot()) return false; G.phase = 'set'; G.setT = 0; return true; }
// medidor (control remoto / teclado / botón sostenido)
function meterStart() {
  if (!canShoot() && !(G && G.phase === 'set')) return;
  if (G.phase === 'ready') armShot();
  G.meter = { t0: performance.now(), T: G.diff === 'facil' ? 1.0 : G.diff === 'pro' ? 0.7 : 0.82 };
  SFX.tick();
}
function meterVal() { if (!G || !G.meter) return 0; return (performance.now() - G.meter.t0) / 1000 / G.meter.T; }
function meterZone() { var tiro = P().sk.tiro; return G.diff === 'facil' ? 0.34 : (0.1 + tiro / 100 * 0.1) * (G.diff === 'pro' ? 0.8 : 1); }
function meterRelease() {
  if (!G || !G.meter) return;
  var m = meterVal(); G.meter = null;
  var e = Math.max(-1, Math.min(1, (m - 1) / 0.3));
  shootWith({ pe: e * 0.02, ae: (Math.random() < 0.5 ? -1 : 1) * Math.abs(e) * Math.random() * 1.1, kind: 'meter', e: e, spin: -(6 + (1 - Math.min(1, Math.abs(e))) * 10 + Math.random() * 3) });
}
var meterTap = false;
function shootKeyDown() {
  ac(); keyDownAt = performance.now(); keyHeld = true;
  if (G && G.meter) { meterRelease(); meterTap = false; return; }
  if (canShoot()) { meterStart(); meterTap = true; }
}
function shootKeyUp() {
  keyHeld = false;
  if (G && G.meter && meterTap && performance.now() - keyDownAt > 200) { meterRelease(); meterTap = false; }
}
/* Aplica habilidad + dificultad y lanza */
function shootWith(inp) {
  if (!G || (G.phase !== 'ready' && G.phase !== 'set')) return;
  var p = P(), sk = p.sk, D = DIFFS[G.diff], money = isMoney(G.spot, G.ball);
  var k = (1.25 - sk.tiro / 100 * 0.5) * D.help;
  var noiseK = D.help * (money ? (1.3 - sk.clutch / 100 * 0.6) : 1);
  var pe = (inp.pe || 0) * k + gauss() * ((1 - sk.tiro / 100) * 0.012 + (1 - sk.rango / 100) * 0.01) * noiseK;
  var ae = (inp.ae || 0) * k + gauss() * (1 - sk.tiro / 100) * 2.2 * noiseK;
  if (G.diff === 'facil') { pe *= 0.8; }
  G.lastIn = { pe: pe, ae: ae, kind: inp.kind };
  G.phase = 'shoot'; G.shootT = 0; G.meter = null;
  SFX.release();
  var from = Court.handWorld(G.shooter);
  var token = {};
  G.token = token;
  var spot = G.spot, idx = G.ball;
  setTimeout(function () {
    if (G.token !== token) return;
    G.shooter.hasBall = false;
    Court.launch({ from: from, pe: pe, ae: ae, arc: G.diff === 'facil' ? 54 : 50, money: money, magnet: D.magnet, spin: inp.spin, rot: inp.rot }, {
      rim: function (k2) { SFX.rim(k2); },
      board: function () { SFX.board(); },
      floor: function (k2) { SFX.floor(k2); },
      made: function (b) { if (G.token === token) shotResult(true, b, spot, idx, money); },
      miss: function (b) { if (G.token === token) shotResult(false, b, spot, idx, money); }
    });
    G.phase = 'flight';
  }, 140);
  if (G.input === 'sim' || inp.kind === 'sim') { if (!p.simDone) { p.simDone = true; } }
  broadcast();
}

function shotResult(made, b, spot, idx, money) {
  var p = P(), pr = S.profiles[p.id];
  var rack = G.racks[spot];
  rack.res[idx] = made ? (money ? 'm' : 'ok') : 'no'; G.lastMade = made;
  rack.left = Math.max(0, 4 - idx);
  p.att++;
  var pts = made ? (money ? 2 : 1) : 0;
  if (made) {
    p.made++; p.streak++; p.score += pts; p.best = Math.max(p.best, p.streak);
    Audio2.setBase(Math.min(0.7, 0.25 + p.streak * 0.07)); syncMusic();
    p.swishRun = b.swish ? p.swishRun + 1 : 0;
    var coins = money ? 2 : 1; p.coins += coins; if (pr) pr.coins += coins;
    if (b.swish) { SFX.swish(); } else SFX.swish();
    Court.cheer(money ? 1 : 0.6); SFX.cheer(money ? 0.9 : 0.45);
    if (money) SFX.money();
    var txt = money ? '+2 💰' : b.swish ? '¡LIMPITA!' : b.board ? '¡De tablero!' : b.touched > 2 ? '¡Bailó y entró!' : '¡ADENTRO!';
    if (p.streak === 3) { txt = '¡ESTÁ ON FIRE!'; }
    bigMsg(txt, money ? 'MONEY BALL' : p.streak >= 3 ? '🔥 ' + p.streak + ' seguidas' : '');
    ach(p, 'first'); if (money) ach(p, 'money'); if (p.streak >= 10) ach(p, 'streak10'); if (p.swishRun >= 5) ach(p, 'swish5'); if (G.lastIn && G.lastIn.kind === 'sim') ach(p, 'sim');
    if (money) voz('money'); else if (p.streak === 3) voz('fuego', true); else if (p.streak === 6) voz('racha', true);
    else if (b.touched > 2) voz('bailo'); else if (b.board && Math.random() < 0.7) voz('tablero'); else if (b.swish && Math.random() < 0.4) voz('limpita');
    else if (Math.random() < (G.diff === 'facil' ? 0.6 : 0.3)) voz(pick(G.diff === 'facil' ? ['muybien', 'adentro', 'genia', 'adentro3'] : ['adentro', 'adentro2', 'adentro3']));
    vibPad(p, made);
  } else {
    p.streak = 0; p.swishRun = 0;
    Audio2.setBase(0.25); syncMusic();
    SFX.aww();
    var L = G.lastIn || { pe: 0, ae: 0 }, why = '';
    if (Math.abs(L.ae) > 0.75 && Math.abs(L.ae) / 0.8 > Math.abs(L.pe) / 0.007) why = L.ae > 0 ? 'Se fue a la derecha ➡️' : '⬅️ Se fue a la izquierda';
    else if (L.pe < -0.005) why = 'Quedó corta ⬇️'; else if (L.pe > 0.005) why = 'Se pasó de largo ⬆️'; else why = 'Uhh, casi…';
    bigMsg(b.touched ? '¡Casi!' : '¡Afuera!', why);
    if (b.touched && Math.random() < 0.4) voz('casi'); else if (Math.random() < 0.25) voz(L.pe < -0.005 ? 'corta' : L.pe > 0.005 ? 'larga' : null);
    vibPad(p, false);
  }
  if (pr && G.mode === 'prac') { pr.prac.att++; if (made) pr.prac.made++; pr.prac.streak = Math.max(pr.prac.streak || 0, p.streak); }
  save();
  G.phase = 'result'; G.resT = 0;
  updateHUD(); broadcast();
}
function ach(p, id) {
  var pr = S.profiles[p.id]; if (!pr) return; pr.ach = pr.ach || {};
  if (pr.ach[id]) return; pr.ach[id] = Date.now(); save();
  var a = ACHIEVEMENTS.filter(function (x) { return x.id === id; })[0];
  if (a) setTimeout(function () { toast('🏅 Trofeo: ' + a.e + ' ' + a.n); SFX.coin(); }, 900);
}
function nextBall() {
  var p = P();
  G.ball++;
  if (G.ball >= 5) {
    var rack = G.racks[G.spot];
    var perfect = rack.res.every(function (r) { return r === 'ok' || r === 'm'; }) && rack.res.length === 5;
    if (perfect) {
      p.coins += 5; var pr = S.profiles[p.id]; if (pr) { pr.coins += 5; save(); }
      ach(p, 'rack');
      startCeleb(p, function () { afterRack(); });
      return;
    }
    afterRack(); return;
  }
  G.phase = 'pickup'; G.phaseT = 0;
}
function afterRack() {
  if (G.mode === 'conc') {
    if (G.spot >= 4) { endTurn(); return; }
    G.spot++; G.ball = 0; moveTo(G.spot);
  } else {
    if (G.players.length > 1) { G.turn = (G.turn + 1) % G.players.length; var p = P(); G.shooter.look = p.look; portrait($('#hudPortrait'), p.look, null, p.star && p.star.id); toast('Turno de ' + esc(p.av) + ' ' + esc(p.name)); voz(['turno', nameClip(p.name)], true); }
    G.racks[G.spot] = { res: [], left: 5, money: false };
    G.ball = 0;
    if (S.rotate) { G.spot = (G.spot + 1) % 5; G.racks[G.spot] = { res: [], left: 5, money: false }; moveTo(G.spot); }
    else { G.phase = 'pickup'; G.phaseT = 0; }
  }
  updateHUD(); broadcast();
}
function moveTo(i) {
  G.prevSpot = G.spot; G.spot = i; G.ball = 0; G.racks[i].res = []; G.racks[i].left = 5;
  G.shooter.pos = Court.spotPos(i, G.diff); G.shooter.hasBall = false;
  Court.setSpot(i, G.diff, false); Court.clearBall();
  G.phase = 'moving'; G.phaseT = 0; updateHUD();
}
function gameDigit(dig) {
  if (!G) return false;
  if (G.phase === 'intro') return false;
  if (G.mode === 'prac' && /[1-5]/.test(dig)) {
    var i = +dig - 1; if (i === G.spot && G.phase !== 'moving') return true;
    G.token = null; G.racks[i] = { res: [], left: 5, money: false }; moveTo(i); broadcast(); return true;
  }
  if (G.mode === 'prac' && dig === '6') { S.rotate = !S.rotate; save(); updateHUD(); toast(S.rotate ? '🔄 Cambia de posición en cada rack' : '📍 Se queda en la misma posición'); return true; }
  if (dig === '7') { cycleGameInput(); return true; }
  return false;
}
function cycleGameInput() {
  var list = ['meter', 'swipe'].concat(Sim.supported() && IS_TOUCH ? ['sim'] : []);
  var i = list.indexOf(G.input); G.input = list[(i + 1) % list.length]; S.input = G.input; save();
  if (G.input === 'sim') startSimLocal(); else stopSimLocal();
  toast('Tirar: ' + INPUTS[G.input]); updateHUD();
}

/* ---------- final del turno / partida ---------- */
function endTurn() {
  G.running = false; G.phase = 'over';
  var p = P(), pr = S.profiles[p.id];
  var bonus = p.score;
  p.coins += bonus; if (pr) pr.coins += bonus;
  var rec = false;
  if (pr) { pr.best = pr.best || {}; if (p.score > (pr.best[G.diff] || 0)) { pr.best[G.diff] = p.score; rec = true; } }
  if (p.score >= 20) ach(p, 'c20'); if (p.score >= 25) ach(p, 'c25'); if (p.score >= 30) ach(p, 'c30');
  save();
  G.results.push({ id: p.id, name: p.name, av: p.av, label: p.label, look: p.look, starId: p.star && p.star.id, score: p.score, made: p.made, att: p.att });
  SFX.buzzer(); setTimeout(function () { SFX.win(); }, 1100); confetti(rec ? 120 : 50);
  voz(['tiempo', rec ? 'record' : null], true);
  var last = G.turn >= G.players.length - 1;
  showOv('<div class="res-e">' + (p.score >= 25 ? '🔥' : p.score >= 15 ? '🏀' : '👏') + '</div><h1>' + esc(p.av) + ' ' + esc(p.name) + ': ' + p.score + ' puntos</h1>' +
    (rec ? '<h2 style="color:var(--yel)">🏆 ¡Nuevo récord!</h2>' : '') +
    '<div class="gains"><div class="gain"><b>' + p.made + '/' + p.att + '</b>embocadas</div><div class="gain"><b>' + p.best + '</b>mejor racha</div><div class="gain"><b>+' + p.coins + ' 🪙</b>monedas</div><div class="gain"><b>' + ((pr && pr.best[G.diff]) || p.score) + '</b>récord ' + DIFFS[G.diff].n + '</div></div>' +
    '<button class="big" data-act="' + (last ? 'finish' : 'nextTurn') + '" data-k="0">' + (last ? (G.cpu || G.players.length > 1 ? '🏅 Ver podio' : '🔁 ¡Una más!') : '▶ Siguiente: ' + esc(G.players[G.turn + 1].name)) + '</button>' +
    (last && !G.cpu && G.players.length === 1 ? '<button class="pill" data-act="quit" data-k="9">🏠 Inicio</button>' : ''));
  broadcast();
}
function cpuContest(star) {
  var D = DIFFS[G.diff], score = 0, made = 0, moneySpot = rnd(5);
  for (var s = 0; s < 5; s++) for (var b = 0; b < 5; b++) {
    var money = s === moneySpot || b === 4, sk = star.sk;
    var e = gauss() * 0.22, k = (1.25 - sk.tiro / 100 * 0.5) * D.help, nk = D.help * (money ? (1.3 - sk.clutch / 100 * 0.6) : 1);
    var pe = e * 0.02 * k + gauss() * ((1 - sk.tiro / 100) * 0.012 + (1 - sk.rango / 100) * 0.01) * nk;
    var ae = gauss() * 0.15 * k + gauss() * (1 - sk.tiro / 100) * 2.2 * nk;
    var sp = Court.spotPos(s, G.diff), dir = [-sp[0], 0, -sp[2]], l = Math.hypot(dir[0], dir[2]);
    var from = [sp[0] + dir[0] / l * 0.25, star.look.height / 100 * 1.2 + 0.25, sp[2] + dir[2] / l * 0.25];
    var r = Court.simulate({ from: from, pe: pe, ae: ae, arc: 50, magnet: D.magnet });
    if (r.made) { made++; score += money ? 2 : 1; }
  }
  return { id: 'cpu', name: star.short, av: '🤖', label: star.short, look: star.look, starId: star.id, score: score, made: made, att: 25, cpu: true };
}
function finish() {
  if (G.mode === 'prac' || (G.players.length === 1 && !G.cpu)) { hideOv(); G.turn = 0; G.ball = 0; beginTurn(); return; }
  var res = G.results.slice();
  if (G.cpu) { var c = cpuContest(G.cpu); res.push(c); }
  res.sort(function (a, b) { return b.score - a.score; });
  if (G.cpu) { var cs = res.filter(function (r) { return r.cpu; })[0]; res.forEach(function (r) { if (!r.cpu && r.score > cs.score) ach({ id: r.id }, 'beatcpu'); }); }
  var order = [res[1], res[0], res[2]].filter(Boolean);
  var html = '<h1>🏅 Podio</h1><div class="podium">' + order.map(function (r) { var pl = res.indexOf(r) + 1; return '<div class="pod p' + pl + '"><canvas width="192" height="192" data-pod="' + res.indexOf(r) + '"></canvas>' + esc(r.av) + ' ' + esc(r.name) + '<small style="color:var(--soft)">' + esc(r.label) + '</small><div class="blk">' + r.score + '</div></div>'; }).join('') + '</div>' +
    (res.length > 3 ? '<p class="sub">' + res.slice(3).map(function (r, i) { return (i + 4) + '. ' + esc(r.av) + ' ' + esc(r.name) + ' ' + r.score; }).join(' · ') + '</p>' : '') +
    '<div class="row"><button class="big" data-act="again" data-k="0">🔁 ¡Otra!</button><button class="pill" data-act="quit" data-k="9">🏠 Inicio</button></div>';
  showOv(html);
  $$('#ov [data-pod]').forEach(function (cv2) { var rr = res[+cv2.getAttribute('data-pod')]; portrait(cv2, rr.look, null, rr.starId); });
  var w = res[0]; voz(['gano', w.cpu ? (starById(S.rival) || {}).id : nameClip(w.name)], true);
  SFX.win(); confetti(140);
}

/* ---------- festejo ---------- */
var celeb = null, celebId = null;
function startCeleb(p, done) {
  setTimeout(syncMusic, 0);
  G.phase = 'celeb';
  var look = p.look;
  celeb = { look: look, t0: performance.now(), done: done, name: CELEBS[look.celeb] ? CELEBS[look.celeb].n : '' };
  document.body.classList.add('celebrating');
  celebId = p.star && p.star.id; $('#celeb').classList.remove('hidden');
  $('#celebTxt').classList.remove('hidden');
  $('#celebTxt').innerHTML = '¡RACK PERFECTO!<small>' + (CELEBS[look.celeb] ? CELEBS[look.celeb].e + ' ' + celeb.name : '') + '</small>';
  var cc = $('#celeb'), dpr = Math.min(2, window.devicePixelRatio || 1); cc.width = innerWidth * dpr; cc.height = innerHeight * dpr;
  SFX.cheer(1.4); setTimeout(function () { SFX.win(); }, 200); confetti(100);
  voz('rack', true);
  vibPad(p, true, true);
  broadcast();
}
function endCeleb() {
  if (!celeb) return; var d = celeb.done; celeb = null; syncMusic();
  document.body.classList.remove('celebrating');
  if (window.T3 && T3.ready) T3.celebrate(false);
  $('#celeb').classList.add('hidden'); $('#celebTxt').classList.add('hidden');
  if (d) d();
}
function drawCeleb(now) {
  if (!celeb) return;
  var cc = $('#celeb'), c = cc.getContext('2d'), w = cc.width, h = cc.height, t = (now - celeb.t0) / 1000;
  if (t > 3.8) { endCeleb(); return; }
  if (celebId && Arcade.celeb(c, w, h, celebId, t)) return;
  var pr = S.prefs.theme === 'princess';
  var g = c.createRadialGradient(w / 2, h * 0.55, 10, w / 2, h * 0.55, Math.max(w, h) * 0.7);
  g.addColorStop(0, pr ? '#ffd1ea' : '#3d55b8'); g.addColorStop(1, pr ? '#6a2a6a' : '#070b1d'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  // rayos
  c.save(); c.translate(w / 2, h * 0.6); c.rotate(t * 0.3); c.fillStyle = 'rgba(255,255,255,.07)';
  for (var i = 0; i < 12; i++) { c.rotate(Math.PI / 6); c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.max(w, h), -80); c.lineTo(Math.max(w, h), 80); c.fill(); }
  c.restore();
  var L = celeb.look, B = bodyOf(L), u = Math.min(h / (B.hy + B.R + 4.2), w / (w > h ? 11 : 6.2));
  drawPlayer(c, L, { x: w / 2, y: h - u * 0.9, u: u, view: 'front', pose: celebPose(L, t), t: t, princess: pr });
  if (pr) { c.font = Math.round(u) + 'px serif'; for (var k = 0; k < 10; k++) { var a = t * 2 + k; c.globalAlpha = 0.5 + 0.5 * Math.sin(a * 3); c.fillText('✨', w / 2 + Math.cos(a) * w * 0.3, h * 0.5 + Math.sin(a * 1.3) * h * 0.3); } c.globalAlpha = 1; }
}

/* ---------- HUD ---------- */
var msgTimer;
function bigMsg(t, sub) { var e = $('#bigMsg'); e.innerHTML = esc(t) + (sub ? '<small>' + esc(sub) + '</small>' : ''); e.classList.remove('show'); void e.offsetWidth; e.classList.add('show'); }
function updateHUD() {
  if (!G) return;
  var p = P();
  $('#hudName').textContent = p.av + ' ' + p.name + (p.star ? ' · ' + p.label : '');
  $('#hudScore').textContent = G.mode === 'conc' ? p.score + ' pts' : p.made + '/' + p.att;
  $('#hudSpot').textContent = SPOTS[G.spot].n + (G.racks[G.spot].money ? ' · 💰 money' : '');
  $('#racks').innerHTML = G.racks.map(function (r, i) {
    var h = '';
    for (var b = 0; b < 5; b++) { var res = r.res[b], m = r.money || b === 4; h += '<i class="' + (m ? 'm ' : '') + (res === 'ok' || res === 'm' ? 'ok' : res === 'no' ? 'no' : '') + '"></i>'; }
    return '<div class="rk' + (i === G.spot ? ' cur' : '') + '">' + h + '</div>';
  }).join('');
  $('#pracBar').classList.toggle('hidden', G.mode !== 'prac');
  if (G.mode === 'prac') $('#pracBar').innerHTML = SPOTS.map(function (s, i) { return '<button class="pill' + (i === G.spot ? ' on' : '') + '" data-spot="' + i + '" data-k="' + (i + 1) + '">' + ['↙', '↖', '⬆', '↗', '↘'][i] + '</button>'; }).join('') + '<button class="pill' + (S.rotate ? ' on' : '') + '" data-act="rot" data-k="6">🔄</button><button class="pill" data-act="inputCycle" data-k="7">' + INPUTS[G.input].split(' ')[0] + '</button>';
  var pr = S.profiles[p.id];
  $('#stats').innerHTML = G.mode === 'prac' ? '🔥 Racha ' + p.streak + (p.att ? ' · ' + Math.round(p.made / p.att * 100) + '%' : '') + (pr && pr.prac.streak ? '<br>🏆 Mejor racha ' + pr.prac.streak : '') : (p.streak >= 3 ? '🔥 ' + p.streak + ' seguidas' : '');
  $('#hint').textContent = hintText();
  $('#simShade').classList.toggle('hidden', G.input !== 'sim');
}
function hintText() {
  if (!G) return '';
  if (G.input === 'swipe') return IS_TOUCH ? 'Tirá con un latigazo hacia arriba: rápido = fuerte, llená el anillo hasta la zona verde' : 'Arrastrá rápido hacia arriba con el mouse · o usá el 0 / espacio';
  if (G.input === 'meter') return IS_TOUCH ? 'Mantené apretado y soltá en la zona verde' : 'Apretá 0 para tirar y otra vez (o soltá) en la zona verde';
  return '';
}

/* ---------- loop ---------- */
var lastNow = performance.now();
function loop(now) {
  var dt = Math.min(0.05, (now - lastNow) / 1000); lastNow = now;
  if (cur === 'game' && G) { stepGame(dt); renderGame(now / 1000); }
  if (cur === 'edit') drawEditor(now);
  drawCeleb(now);
  requestAnimationFrame(loop);
}
function stepGame(dt) {
  Court.step(dt);
  var p = P(), sh = G.shooter;
  if (G.running && G.mode === 'conc' && G.phase !== 'celeb' && !ovOpen()) {
    var before = G.time; G.time = Math.max(0, G.time - dt);
    if (Math.ceil(before) !== Math.ceil(G.time) && G.time <= 5 && G.time > 0) SFX.tick();
    if (before > 10 && G.time <= 10) { voz('diez', true); Audio2.setBase(0.65); }
    if (G.time <= 0 && before > 0) {
      G.running = false;
      if (G.phase === 'flight' || G.phase === 'shoot') { G.buzzer = true; SFX.buzzer(); }
      else { endTurn(); return; }
    }
  }
  var tt = $('#hudTime');
  if (G.mode === 'conc') { tt.textContent = Math.ceil(G.time); tt.classList.toggle('low', G.time <= 10); } else tt.textContent = '';
  switch (G.phase) {
    case 'moving':
      sh.pose = shotPose(p.look, 0, 0); sh.hasBall = false;
      if (!Court.camMoving()) { G.phase = 'pickup'; G.phaseT = 0; }
      break;
    case 'pickup':
      G.phaseT += dt; sh.hasBall = false;
      var k = Math.min(1, G.phaseT / pickupTime());
      sh.pose = shotPose(p.look, 0, 0); sh.pose.rh = [0.9, bodyOf(p.look).sy - 2.2 + k * 1.2];
      if (k >= 1) { G.phase = 'ready'; sh.hasBall = true; sh.money = isMoney(G.spot, G.ball); sh.pose = shotPose(p.look, 0, 0); updateHUD(); broadcast(); }
      break;
    case 'ready':
      sh.pose = shotPose(p.look, 0, 0); sh.hasBall = true; sh.money = isMoney(G.spot, G.ball);
      sh.pose.crouch = 0.12 + Math.sin(performance.now() / 300) * 0.05;
      break;
    case 'set':
      G.setT = (G.setT || 0) + dt; sh.pose = shotPose(p.look, Math.min(1, G.setT / 0.25), 0); sh.hasBall = true;
      if (G.meter && meterVal() > 1.3) meterRelease();
      break;
    case 'shoot': case 'flight':
      G.shootT = (G.shootT || 0) + dt;
      var j = Math.sin(Math.min(1, G.shootT / 0.6) * Math.PI) * 0.9;
      sh.pose = shotPose(p.look, 1 + Math.min(1, G.shootT / 0.18), j);
      break;
    case 'result':
      G.resT += dt; G.shootT = (G.shootT || 0) + dt;
      sh.pose = shotPose(p.look, 2, Math.max(0, Math.sin(Math.min(1, G.shootT / 0.6) * Math.PI) * 0.9));
      if (G.buzzer) { if (G.resT > 0.9) { G.buzzer = false; endTurn(); } break; }
      if (G.mode === 'conc' && !G.running && G.time <= 0) { if (G.resT > 0.6) endTurn(); break; }
      if (G.resT > (G.mode === 'conc' ? 0.35 : 0.9)) nextBall();
      break;
  }
}
function renderGame(t) {
  var w = cv.width, h = cv.height;
  if (Arcade.render(ctx, w, h, G, P(), t, Math.min(0.05, t - (G._lt || t)))) {
    G._lt = t;
  } else {
    var rk = G.racks.map(function (r, i) { return { left: i === G.spot ? Math.max(0, 5 - G.ball - (G.shooter.hasBall || G.phase === 'set' ? 1 : 0) - (G.phase === 'shoot' || G.phase === 'flight' || G.phase === 'result' ? 1 : 0)) : (r.res.length ? 0 : 5), money: r.money }; });
    Court.render(ctx, w, h, t, { princess: S.prefs.theme === 'princess', diff: G.diff, racks: rk, spot: G.spot, shooter: G.shooter });
  }
  // medidor
  var sb = G.shooter.ballScreen;
  if (G.meter || (G.input === 'meter' && G.phase === 'ready')) {
    var mx = Math.min(w - 60, (sb ? sb[0] : w * 0.4) + w * 0.12), my = h * 0.38, mh = h * 0.32, mw = Math.max(18, w * 0.022);
    ctx.fillStyle = 'rgba(0,0,0,.45)'; rrect(ctx, mx - 6, my - 6, mw + 12, mh + 12, 12); ctx.fill();
    var z = meterZone(), top = my + mh * (1 - 1 / 1.3);
    // zona verde alrededor de m=1
    var zy0 = my + mh * (1 - (1 + z * 0.3) / 1.3), zy1 = my + mh * (1 - (1 - z * 0.3) / 1.3);
    ctx.fillStyle = 'rgba(60,196,124,.85)'; ctx.fillRect(mx, zy0, mw, zy1 - zy0);
    var m = Math.min(1.3, meterVal()), fy = my + mh * (1 - m / 1.3);
    ctx.fillStyle = m > 1 + z * 0.3 ? '#ff5a5a' : '#ffd23f'; ctx.fillRect(mx, fy, mw, my + mh - fy);
    ctx.fillStyle = '#fff'; ctx.fillRect(mx - 8, top - 2, mw + 16, 4);
  }
  // gesto de tiro (estela + anillo de potencia)
  var dtF = Math.min(0.05, t - (G._lf || t)); G._lf = t;
  if (G.input === 'swipe' && (G.phase === 'ready' || G.phase === 'set' || flick.busy())) {
    var pr = S.prefs.theme === 'princess', mon = isMoney(G.spot, G.ball), pP = P();
    flick.draw(ctx, dtF, { ballX: w / 2, ballY: h * 0.8, r: Math.min(w, h) * 0.055, fire: (pP.streak || 0) >= 3, zone: aimZone(),
      drawBall: function (c2, x, y, r) { Court.drawBallScreen(c2, x, y, r, 0, mon, pr); } });
  }
  G.aim = flick.preview();
  document.body.classList.toggle('flicking', flick.active);
  if (G.aim) { var sk0 = P().sk, D0 = DIFFS[G.diff]; G.aim.k = (1.25 - sk0.tiro / 100 * 0.5) * D0.help * (G.diff === 'facil' ? 0.8 : 1); }
}
function aimZone() { return G.diff === 'facil' ? [0.72, 1.28] : G.diff === 'pro' ? [0.94, 1.06] : [0.88, 1.12]; }
var flick = new Flick();

/* ---------- toque / mouse en la cancha ---------- */
cv.addEventListener('pointerdown', function (e) {
  ac(); if (!G || G.input === 'sim') return;
  var dpr = cv.width / cv.clientWidth, x = e.clientX * dpr, y = e.clientY * dpr;
  if (G.input === 'swipe') { if (!canShoot()) return; flick.start(x, y, cv.height); try { cv.setPointerCapture(e.pointerId); } catch (er) {} }
  else { if (G.meter) { meterRelease(); meterTap = false; } else if (canShoot()) { meterStart(); meterTap = true; keyDownAt = performance.now(); } }
});
cv.addEventListener('pointermove', function (e) {
  if (!G || !flick.active) return; var dpr = cv.width / cv.clientWidth;
  var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  for (var i = 0; i < evs.length; i++) flick.move(evs[i].clientX * dpr, evs[i].clientY * dpr);
  if (G.phase === 'ready' && flick.y0 - e.clientY * dpr > cv.height * 0.05) armShot();
});
function flickUp() {
  if (!G || !flick.active) return false;
  var r = flick.end();
  if (!r) { if (G.phase === 'set') G.phase = 'ready'; return true; }
  shootWith({ pe: r.pe, ae: r.ae, kind: 'swipe', spin: r.spin, rot: r.rot });
  return true;
}
cv.addEventListener('pointerup', function () {
  if (!G) return;
  if (flickUp()) return;
  if (G.meter && meterTap && performance.now() - keyDownAt > 200) { meterRelease(); meterTap = false; }
});
cv.addEventListener('pointercancel', function () { if (flick.active) { flick.cancel(); if (G && G.phase === 'set') G.phase = 'ready'; } });

/* ---------- simulación con el celu en este mismo dispositivo ---------- */
var simHold = null;
function startSimLocal() {
  Sim.ask().then(function (ok) {
    if (!ok && Sim.needsPermission()) { toast('Hace falta permiso para usar los sensores'); return; }
    if (!Sim.calibrated()) { openCalib(function () { startSimLocal(); }); return; }
    Sim.start({
      armed: function () { SFX.arm(); if (canShoot()) armShot(); $('#simShade').classList.add('armed'); $('#simTxt').textContent = '✅ ¡Listo! Tirá'; },
      disarm: function () { $('#simShade').classList.remove('armed'); $('#simTxt').textContent = '✋ Posición de tiro'; if (G && G.phase === 'set') G.phase = 'ready'; },
      shot: function (s) { $('#simShade').classList.remove('armed'); $('#simTxt').textContent = '🏀 ¡Salió!'; if (G && (G.phase === 'ready' || G.phase === 'set')) shootWith({ pe: s.pe, ae: s.ae, kind: 'sim', spin: s.spin }); }
    });
    $('#simTxt').textContent = '✋ Posición de tiro'; $('#simSub').textContent = 'Palma sobre la pantalla, levantá el celu como la pelota. Vibra cuando estás listo: ¡tirá!';
  });
}
function stopSimLocal() { Sim.stop(); }
$('#simExit').addEventListener('pointerdown', function () { simHold = setTimeout(function () { if (G) { G.input = S.input = IS_TOUCH ? 'swipe' : 'meter'; save(); stopSimLocal(); updateHUD(); toast('Saliste del modo simulación'); } }, 1100); });
['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { $('#simExit').addEventListener(ev, function () { clearTimeout(simHold); }); });

/* ================= CALIBRACIÓN ================= */
var calDone = null, calStep = 0, calSpeeds = [], calTimer = null, calStill0 = 0;
function openCalib(done) {
  calDone = done || null; calStep = 0; calSpeeds = [];
  $('#calib').classList.remove('hidden');
  renderCalib();
}
function closeCalib() { $('#calib').classList.add('hidden'); clearInterval(calTimer); if (calStep !== 9 && !(G && G.input === 'sim')) Sim.stop(); }
function renderCalib() {
  var st = $('#calStep'), b = $('#calBtns'), dot = $('#calDot');
  dot.classList.remove('ok');
  if (calStep === 0) {
    dot.textContent = '✋';
    st.innerHTML = 'Agarrá el celu con la <b>palma sobre la pantalla</b>, como si fuera la pelota. Así podés tirar de verdad.';
    b.innerHTML = '<button class="big" data-act="calGo" data-k="0">Empezar</button><button class="pill" data-act="calClose" data-k="9">Cancelar</button>';
  } else if (calStep === 1) {
    dot.textContent = '🏀';
    st.innerHTML = 'Levantalo a tu <b>posición de tiro</b>, mirando hacia el aro (la tele), y quedate <b>quieto</b>. Vas a escuchar “tic” y vibra.';
    b.innerHTML = '<button class="pill" data-act="calClose" data-k="9">Cancelar</button>';
  } else if (calStep === 2) {
    dot.textContent = calSpeeds.length + '/3';
    st.innerHTML = 'Ahora hacé <b>3 tiros buenos</b> (sin soltar el celu 😅). Volvé a la posición de tiro antes de cada uno.';
    b.innerHTML = '<button class="pill" data-act="calClose" data-k="9">Cancelar</button>';
  } else {
    dot.textContent = '✅'; dot.classList.add('ok');
    st.innerHTML = '¡Listo! Ya podés tirar en modo simulación.';
    b.innerHTML = '<button class="big" data-act="calEnd" data-k="0">▶ A jugar</button><button class="pill" data-act="calRedo" data-k="1">🔁 Calibrar de nuevo</button><button class="pill' + (Sim.cfg.flip ? ' on' : '') + '" data-act="calFlip" data-k="2">↔️ Invertir lados</button><button class="pill' + (Sim.cfg.compass ? ' on' : '') + '" data-act="calCompass" data-k="3">🧭 Brújula: ' + (Sim.cfg.compass ? 'sí' : 'no') + '</button><button class="pill" data-act="calSens" data-k="4">🎚️ Sensibilidad ' + Sim.cfg.sens + '</button>';
  }
}
function calGo() {
  Sim.ask().then(function () {
    calStep = 1; renderCalib(); calStill0 = 0;
    Sim.start({
      raw: function (r) {
        if (calStep !== 1) return;
        if (r.still) { if (!calStill0) calStill0 = performance.now(); if (performance.now() - calStill0 > 1300) { Sim.setRef(); vib(150); SFX.ok(); say('Bien. Ahora tirá tres veces'); calStep = 2; renderCalib(); } }
        else calStill0 = 0;
      },
      armed: function () { if (calStep === 2) SFX.arm(); },
      shot: function (s) {
        if (calStep !== 2) return; SFX.release(); calSpeeds.push(s.speed); $('#calDot').textContent = calSpeeds.length + '/3';
        if (calSpeeds.length >= 3) { Sim.setPower(calSpeeds); calStep = 3; SFX.win(); say('¡Listo!'); renderCalib(); }
      }
    });
    clearInterval(calTimer);
    calTimer = setInterval(function () { var L = Sim.live; $('#calLive').textContent = 'estado ' + L.st + ' · ángulo ' + L.ang + '° · mov ' + L.lin + ' · giro ' + L.rot + ' · vel ' + L.sp + (L.alpha != null ? ' · brújula ' + L.alpha + '°' : ''); $('#calDot').classList.toggle('ok', L.st === 'armed'); }, 150);
  });
}

/* ================= OVERLAY ================= */
function showOv(html) { $('#ov').innerHTML = html; $('#ov').classList.remove('hidden'); setTimeout(function () { var b = $('#ov .big'); if (b && !IS_TOUCH) b.focus(); }, 60); broadcast(); }
function hideOv() { $('#ov').classList.add('hidden'); $('#ov').innerHTML = ''; broadcast(); }

/* ================= ACCIONES ================= */
function act(a, el) {
  ac();
  switch (a) {
    case 'hub': goHub(); break;
    case 'back': back(); break;
    case 'play': if (!allPlayers().length) { openNewPlayer(); return; } show('mode'); break;
    case 'newPlayer': openNewPlayer(); break;
    case 'editMode': editMode = !editMode; RENDER.start(); break;
    case 'savePlayer': {
      var nm = $('#newName').value.trim().slice(0, 12); if (!nm) { toast('Escribí tu nombre'); $('#newName').focus(); return; }
      var pr = newProfile(nm, newAv, editId || undefined); if (!editId && S.roster.indexOf(pr.id) < 0) S.roster.push(pr.id);
      save(); SFX.ok(); stack = []; show('start', false); break;
    }
    case 'resetPlayer': if (editId && confirmAct('¿Reiniciar los puntajes de ' + S.profiles[editId].name + '?')) { var p0 = S.profiles[editId]; p0.coins = 0; p0.best = {}; p0.prac = { made: 0, att: 0, streak: 0 }; p0.ach = {}; p0.sk = { tiro: 70, rango: 70, ritmo: 70, clutch: 70 }; save(); toast('Puntajes reiniciados'); } break;
    case 'delPlayer': if (editId && confirmAct('¿Borrar a ' + S.profiles[editId].name + '?')) { delete S.profiles[editId]; S.roster = S.roster.filter(function (x) { return x !== editId; }); save(); stack = []; show('start', false); } break;
    case 'toPick': startPicking(); break;
    case 'cycleInput': { var l = ['meter', 'swipe'].concat(Sim.supported() && IS_TOUCH ? ['sim'] : []); S.input = l[(l.indexOf(S.input) + 1) % l.length]; save(); RENDER.mode(); if (S.input === 'sim') toast('📱 Agarrá el celu con la palma en la pantalla y tirá como si fuera la pelota'); break; }
    case 'cycleRival': { var ids = ['no'].concat(STARS.filter(function (s) { return Arcade.has(s.id); }).map(function (s) { return s.id; })); S.rival = ids[(ids.indexOf(S.rival) + 1) % ids.length]; save(); RENDER.mode(); break; }
    case 'toggleRotate': S.rotate = !S.rotate; save(); RENDER.mode(); break;
    case 'editMe': {
      var who = cur === 'pick' && pickQ[pickI] ? pickQ[pickI].id : (roster()[0] || {}).id;
      if (who && who.indexOf('ph-') === 0 && !S.profiles[who]) who = null;
      openEditor(who); break;
    }
    case 'opts': show('opts'); break;
    case 'pickOk': {
      pickI++; SFX.ok();
      if (pickI >= pickQ.length) { startGame(); } else RENDER.pick();
      break;
    }
    case 'edDone': save(); back(); break;
    case 'edNextTab': edTab = (edTab + 1) % ED_TABS.length; RENDER.edit(); break;
    case 'edPrevTab': edTab = (edTab + ED_TABS.length - 1) % ED_TABS.length; RENDER.edit(); break;
    case 'edSee': edCeleb = true; edT0 = performance.now(); SFX.cheer(0.6); break;
    case 'pause':
      if (!G) return;
      showOv('<h1>⏸️ Pausa</h1><div class="row"><button class="big" data-act="resume" data-k="0">▶ Seguir</button></div><div class="row"><button class="pill" data-act="inputCycle" data-k="1">Tirar: ' + INPUTS[G.input] + '</button><button class="pill" data-act="toggleSfx" data-k="2">' + (S.prefs.sfx ? '🔊' : '🔇') + ' Sonido</button><button class="pill" data-act="toggleTheme" data-k="3">' + (S.prefs.theme === 'princess' ? '👑 Princesa' : '🏀 Normal') + '</button>' + (Sim.supported() && IS_TOUCH ? '<button class="pill" data-act="calib" data-k="4">📱 Calibrar</button>' : '') + '<button class="pill" data-act="quit" data-k="8">🚪 Terminar</button>' + (HUB ? '<button class="pill" data-act="hub" data-k="9">🏠 Todos los juegos</button>' : '') + '</div>');
      break;
    case 'resume': hideOv(); updateHUD(); break;
    case 'inputCycle': cycleGameInput(); if (ovOpen()) act('pause'); break;
    case 'toggleSfx': S.prefs.sfx = !S.prefs.sfx; Audio2.setOn('sfx', S.prefs.sfx); save(); crowdAmb(S.prefs.sfx); act('pause'); break;
    case 'toggleCam': S.prefs.cam = S.prefs.cam === 'arcade' ? 'tele' : 'arcade'; if (window.T3) T3.style = S.prefs.cam; save(); applyPrefs(); act('pause'); break;
    case 'toggleTheme': S.prefs.theme = S.prefs.theme === 'princess' ? 'normal' : 'princess'; save(); applyPrefs(); act('pause'); break;
    case 'quit': hideOv(); stopSimLocal(); crowdAmb(false); G = null; stack = []; show('start', false); break;
    case 'nextTurn': hideOv(); G.turn++; beginTurn(); break;
    case 'finish': finish(); break;
    case 'again': hideOv(); G.turn = 0; G.results = []; beginTurn(); break;
    case 'rot': gameDigit('6'); break;
    case 'calib': openCalib(); break;
    case 'calGo': calGo(); break;
    case 'calClose': closeCalib(); break;
    case 'calRedo': calStep = 0; Sim.stop(); renderCalib(); break;
    case 'calFlip': Sim.cfg.flip = !Sim.cfg.flip; Sim.saveCfg(); renderCalib(); break;
    case 'calCompass': Sim.cfg.compass = !Sim.cfg.compass; Sim.saveCfg(); renderCalib(); break;
    case 'calSens': { var ss = [0.8, 1, 1.25, 1.5]; Sim.cfg.sens = ss[(ss.indexOf(Sim.cfg.sens) + 1) % ss.length]; Sim.saveCfg(); renderCalib(); break; }
    case 'calEnd': { var d = calDone; calDone = null; $('#calib').classList.add('hidden'); clearInterval(calTimer); if (!(G && G.input === 'sim')) Sim.stop(); if (d) d(); break; }
  }
}
function confirmAct(msg) { try { return window.confirm(msg); } catch (e) { return true; } }
document.addEventListener('click', function (e) {
  var b = e.target.closest ? e.target.closest('button') : null; if (!b || b.id === 'fsBtn') return;
  if (document.body.classList.contains('pad') && !b.closest('#calib')) return;
  var d = b.dataset;
  if (d.act) { act(d.act, b); return; }
  if (d.toggle) { var id = d.toggle, i = S.roster.indexOf(id); if (i >= 0) S.roster.splice(i, 1); else S.roster.push(id); save(); SFX.key(); RENDER.start(); return; }
  if (d.edit) { openNewPlayer(d.edit); return; }
  if (d.av) { newAv = d.av; $('#avPrev').textContent = newAv; $$('#avs .avb').forEach(function (x) { x.classList.toggle('on', x === b); }); return; }
  if (d.mode) { S.mode = d.mode; save(); RENDER.mode(); SFX.key(); return; }
  if (d.diff) { S.diff = d.diff; save(); RENDER.mode(); SFX.key(); return; }
  if (d.opt === 'cam') { S.prefs.cam = S.prefs.cam === 'arcade' ? 'tele' : 'arcade'; if (window.T3) T3.style = S.prefs.cam; save(); applyPrefs(); RENDER.opts(); SFX.key(); return; }
  if (d.opt) { var o = d.opt; if (o === 'theme') S.prefs.theme = S.prefs.theme === 'princess' ? 'normal' : 'princess'; else S.prefs[o] = !S.prefs[o]; Audio2.setOn(o === 'theme' ? 'x' : o, S.prefs[o]); save(); applyPrefs(); RENDER.opts(); SFX.key(); return; }
  if (d.pick) { pickSel[pickQ[pickI].id] = d.pick; SFX.key(); RENDER.pick(); return; }
  if (d.tab) { edTab = +d.tab; RENDER.edit(); return; }
  if (d.ed) { edCycle(d.ed, +d.dir); return; }
  if (d.up) { var pr = S.profiles[edPid], s = d.up, cost = upCost(pr.sk[s]); if (pr.coins < cost) { toast('Te faltan ' + (cost - pr.coins) + ' 🪙. ¡Embocá más!'); return; } pr.coins -= cost; pr.sk[s] = Math.min(95, pr.sk[s] + 3); save(); SFX.money(); RENDER.edit(); return; }
  if (d.money != null) { setMoneyRack(+d.money); return; }
  if (d.spot != null) { gameDigit(String(+d.spot + 1)); return; }
});

/* ================= RED: TELE ================= */
var pads = new Map();
var peer = null, code = null;
function goHub() { pads.forEach(function (p) { try { p.conn.send({ t: 'home' }); } catch (e) {} }); setTimeout(function () { location.href = HUB_URL + '/?tv'; }, 250); }
function sendPad(id, m) { var p = pads.get(id); try { if (p && p.conn && p.conn.open) p.conn.send(m); } catch (e) {} }
function vibPad(p, made, big) { if (p.phone) sendPad(p.id, { t: 'vib', p: big ? [80, 60, 80, 60, 200] : made ? [40, 50, 40] : [180] }); }
var bT = null;
function broadcast() {
  clearTimeout(bT);
  bT = setTimeout(function () {
    pads.forEach(function (pd) {
      if (!pd.ready) return;
      var st = { t: 'state', screen: ovOpen() ? 'ov' : cur };
      if (G && cur === 'game') { var p = P(); st.myTurn = p.id === pd.id || !p.phone; st.mine = p.id === pd.id; st.turnName = p.av + ' ' + p.name; st.phase = G.phase; st.score = p.score; st.input = G.input; }
      sendPad(pd.id, st);
    });
  }, 40);
}
function startHost() {
  if (!window.Peer || !navigator.onLine) return;
  code = HUB || sessionStorage.getItem('tr-code') || String(1000 + rnd(9000));
  var tries = 0;
  var open = function () {
    peer = new Peer(PREFIX + code, { debug: 0 });
    peer.on('open', function () {
      sessionStorage.setItem('tr-code', code);
      var url = location.origin + '/?c=' + code + (HUB ? '&hub=' + HUB : '');
      try { var q = qrcode(0, 'M'); q.addData(url); q.make(); $('#qr').innerHTML = q.createSvgTag({ cellSize: 6, margin: 1, scalable: true }); } catch (e) {}
      $('#joinUrl').textContent = location.host + '/?c=' + code; $('#joinCode').textContent = code;
      if (!IS_TOUCH || innerWidth > 900) $('#joinBox').classList.remove('hidden');
    });
    peer.on('error', function (e) { if (e.type === 'unavailable-id' && tries++ < 6) { peer.destroy(); setTimeout(function () { if (tries > 4) code = String(1000 + rnd(9000)); open(); }, 1200); } });
    peer.on('disconnected', function () { setTimeout(function () { if (!peer.destroyed && peer.disconnected) peer.reconnect(); }, 1500); });
    peer.on('connection', function (conn) {
      conn.on('data', function (d) { onPad(conn, d); });
      conn.on('close', function () { pads.forEach(function (p, id) { if (p.conn === conn) { pads.delete(id); toast('📱 ' + esc(p.name) + ' se desconectó'); refreshPlayers(); } }); });
    });
  };
  open();
}
function refreshPlayers() { if (cur === 'start') RENDER.start(); broadcast(); }
function onPad(conn, d) {
  if (!d || !d.t) return;
  if (d.t === 'hello') {
    var id = 'ph-' + String(d.pid || '').slice(0, 30), prev = pads.get(id);
    pads.set(id, { id: id, name: String(d.name || 'Jugador').slice(0, 12), av: String(d.av || '🙂').slice(0, 4), conn: conn, ready: true });
    newProfile(pads.get(id).name, pads.get(id).av, id); save();
    conn.send({ t: 'welcome', id: id });
    if (!prev) { toast('📱 ' + esc(d.av) + ' ' + esc(d.name) + ' se sumó'); SFX.ok(); }
    refreshPlayers(); return;
  }
  var pd = null; pads.forEach(function (x) { if (x.conn === conn) pd = x; }); if (!pd) return;
  var p = G && cur === 'game' ? P() : null;
  var mine = p && (p.id === pd.id || !p.phone);
  switch (d.t) {
    case 'key': if (/^[0-9]$/.test(d.k)) { if (cur === 'game' && d.k === '0' && !ovOpen()) { shootKeyDown(); setTimeout(shootKeyUp, 60); } else pressDigit(d.k); } else if (d.k === 'back') pressBack(); break;
    case 'armed': if (mine && canShoot()) armShot(); break;
    case 'disarm': if (mine && G.phase === 'set' && !G.meter) G.phase = 'ready'; break;
    case 'shot': if (mine && G && (G.phase === 'ready' || G.phase === 'set')) shootWith({ pe: +d.pe || 0, ae: +d.ae || 0, kind: d.kind === 'sim' ? 'sim' : 'swipe', spin: d.spin != null ? Math.max(-26, Math.min(0, +d.spin)) : undefined }); break;
    case 'press': if (mine) { if (G.meter) meterRelease(); else if (canShoot()) { meterStart(); meterTap = false; } } break;
    case 'release': if (mine && G.meter) meterRelease(); break;
  }
}

/* ================= RED: CELULAR (MANDO) ================= */
function startPad(c0) {
  document.body.classList.add('pad');
  $$('.screen').forEach(function (s) { s.classList.add('hidden'); });
  $('#pad').classList.remove('hidden');
  if (HUB) $$('#pad .hubBtn').forEach(function (b) { b.classList.remove('hidden'); });
  $('#pad header').appendChild($('#fsBtn'));
  var goHubPad = function () { location.href = HUB_URL + '/?j=' + HUB; };
  var pid = localStorage.getItem('tr-pid'); if (!pid) { pid = Math.random().toString(36).slice(2, 10); localStorage.setItem('tr-pid', pid); }
  var me = { name: QS.get('pn') || localStorage.getItem('tr-name') || '', av: QS.get('pa') || localStorage.getItem('tr-av') || '' };
  var conn = null, st = {}, connected = false, tries = 0, mode = localStorage.getItem('tr-padmode') || 'swipe', peerP;
  var send = function (m) { try { if (conn && conn.open) conn.send(m); } catch (e) {} };
  $('#pKeys').innerHTML = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map(function (k) { return '<button data-pk="' + k + '">' + k + '</button>'; }).join('') + '<button data-pk="back" style="grid-column:span 5">↩ Volver / Pausa</button>';
  var render = function () {
    $('#pAv').textContent = me.av || '🙂'; $('#pName').textContent = me.name || 'Jugador';
    $('#pDot').className = 'dot' + (connected ? ' ok' : '');
    var inGame = st.screen === 'game';
    var s = $('#pStatus'); s.classList.remove('turn');
    if (!connected) s.textContent = 'Conectando con la tele…';
    else if (!inGame) s.textContent = st.screen === 'ov' ? '📺 Mirá la tele · usá los números' : '📺 Usá los números para elegir en la tele';
    else if (st.mine) { s.textContent = '⭐ ¡Te toca! ' + (st.score != null ? st.score + ' pts' : ''); s.classList.add('turn'); }
    else if (st.myTurn) s.textContent = 'Tira ' + st.turnName + ' (podés tirar vos)';
    else s.textContent = 'Turno de ' + st.turnName;
    $('#pModes').innerHTML = [['swipe', '👆 Deslizar'], ['meter', '⏱️ Botón'], ['sim', '📱 Simulación']].filter(function (m) { return m[0] !== 'sim' || Sim.supported(); }).map(function (m) { return '<button class="pill' + (mode === m[0] ? ' on' : '') + '" data-pm="' + m[0] + '">' + m[1] + '</button>'; }).join('');
    var shoot = inGame && st.myTurn;
    $('#pSwipe').classList.toggle('hidden', !(shoot && mode === 'swipe'));
    $('#pMeter').classList.toggle('hidden', !(shoot && mode === 'meter'));
    $('#pSim').classList.toggle('hidden', !(shoot && mode === 'sim'));
    $('#pModes').classList.toggle('hidden', !shoot);
    $('#pKeys').classList.toggle('hidden', !!(shoot && mode === 'sim' && Sim.running()));
    if (mode !== 'sim' || !shoot) { if (Sim.running()) Sim.stop(); }
    if (shoot && mode === 'sim') renderSim();
    if (shoot && mode === 'swipe' && !sw) { var r = area.getBoundingClientRect(); if (r.height) placeBand(r.top + r.height * 0.84 - 45); }
  };
  var renderSim = function () {
    var box = $('#pSim');
    if (!Sim.running()) { box.classList.remove('armed'); box.innerHTML = '<div style="font-size:60px">📱✋</div><b style="font-size:20px">Agarrá el celu con la palma sobre la pantalla y tirá como si fuera la pelota</b><button class="big" id="pSimGo">▶ Activar</button>' + (Sim.calibrated() ? '<button class="pill" id="pSimCal">🔁 Calibrar</button>' : ''); $('#pSimGo').onclick = simGo; if ($('#pSimCal')) $('#pSimCal').onclick = function () { Sim.ask().then(function () { openCalib(function () { simGo(); }); }); }; }
  };
  var simGo = function () {
    Sim.ask().then(function (ok) {
      if (!ok && Sim.needsPermission()) { toast('Hace falta permiso para los sensores'); return; }
      if (!Sim.calibrated()) { openCalib(function () { simGo(); }); return; }
      var box = $('#pSim');
      box.innerHTML = '<div style="font-size:70px" id="pSimE">✋</div><b id="pSimT" style="font-size:22px">Posición de tiro</b><small style="color:var(--soft)">Vibra (y hace tic) cuando estás listo. Para salir, mantené apretado:</small><button class="pill" id="pSimStop">✋ Salir</button>';
      var hold; $('#pSimStop').onpointerdown = function () { hold = setTimeout(function () { Sim.stop(); render(); }, 900); }; $('#pSimStop').onpointerup = function () { clearTimeout(hold); };
      Sim.start({
        armed: function () { SFX.arm(); box.classList.add('armed'); $('#pSimE').textContent = '🏀'; $('#pSimT').textContent = '¡Listo! Tirá'; send({ t: 'armed' }); },
        disarm: function () { box.classList.remove('armed'); $('#pSimE').textContent = '✋'; $('#pSimT').textContent = 'Posición de tiro'; send({ t: 'disarm' }); },
        shot: function (s) { SFX.release(); box.classList.remove('armed'); $('#pSimE').textContent = '💨'; $('#pSimT').textContent = '¡Salió!'; send({ t: 'shot', kind: 'sim', pe: s.pe, ae: s.ae, spin: s.spin }); }
      });
      $('#pKeys').classList.add('hidden');
    });
  };
  // deslizar en el celu
  var sw = null, area = $('#pSwipe'), pcv = $('#pSwipeCv'), pctx = pcv.getContext('2d'), pf = new Flick(), pLast = 0;
  var pScale = function () { return pcv.width / pcv.clientWidth; };
  var fitP = function () { var dpr = Math.min(2, devicePixelRatio || 1); pcv.width = Math.round(pcv.clientWidth * dpr); pcv.height = Math.round(pcv.clientHeight * dpr); };
  var padLoop = function (now) {
    if (!$('#pSwipe').classList.contains('hidden')) {
      if (pcv.width !== Math.round(pcv.clientWidth * Math.min(2, devicePixelRatio || 1))) fitP();
      var dt = Math.min(0.05, (now - (pLast || now)) / 1000); pLast = now;
      pctx.clearRect(0, 0, pcv.width, pcv.height);
      pf.draw(pctx, dt, { ballX: pcv.width / 2, ballY: pcv.height * 0.78, r: Math.min(pcv.width, pcv.height) * 0.09, fire: false, zone: [0.88, 1.12], drawBall: function (c2, x, y, r) { Court.drawBallScreen(c2, x, y, r, 0, false, false); } });
    }
    requestAnimationFrame(padLoop);
  };
  requestAnimationFrame(padLoop);
  area.addEventListener('pointerdown', function (e) { ac(); var k = pScale(), r = pcv.getBoundingClientRect(); sw = 1; pf.start((e.clientX - r.left) * k, (e.clientY - r.top) * k, innerHeight * k); try { area.setPointerCapture(e.pointerId); } catch (er) {} });
  area.addEventListener('pointermove', function (e) { if (!sw) return; var k = pScale(), r = pcv.getBoundingClientRect(), evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; for (var i = 0; i < evs.length; i++) pf.move((evs[i].clientX - r.left) * k, (evs[i].clientY - r.top) * k); });
  area.addEventListener('pointerup', function () {
    if (!sw) return; sw = null;
    var res = pf.end(); if (!res) return;
    SFX.release(); vib(20);
    send({ t: 'shot', kind: 'swipe', pe: res.pe, ae: res.ae, spin: res.spin });
  });
  area.addEventListener('pointercancel', function () { sw = null; pf.cancel(); });
  var placeBand = function () {};
  // botón (medidor en la tele)
  var pm = $('#pMeter');
  pm.addEventListener('pointerdown', function (e) { e.preventDefault(); ac(); vib(15); send({ t: 'press' }); });
  pm.addEventListener('pointerup', function () { send({ t: 'release' }); });
  $('#pad').addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('button') : null; if (!b) return;
    if (b.dataset.pk) { vib(15); SFX.key(); send({ t: 'key', k: b.dataset.pk }); }
    if (b.dataset.pm) { mode = b.dataset.pm; localStorage.setItem('tr-padmode', mode); if (mode !== 'sim') Sim.stop(); render(); if (mode === 'sim') toast('📱 Palma sobre la pantalla, celu en posición de tiro… ¡y tirá!', 4000); }
  });
  var askProfile = function () {
    if (me.av) return connect0();
    $('#pStatus').textContent = '¿Quién sos?';
    var box = document.createElement('div');
    box.innerHTML = '<div class="avs">' + ANIMALS.map(function (a) { return '<button class="avb" data-pav="' + a + '">' + a + '</button>'; }).join('') + '</div><input class="inp" id="pNm" maxlength="12" placeholder="Tu nombre" style="width:100%;margin-top:10px"><button class="big" id="pOk" style="width:100%;margin-top:10px">¡Listo!</button>';
    $('#pStatus').parentNode.insertBefore(box, $('#pModes'));
    var av = pick(ANIMALS);
    Array.prototype.forEach.call(box.querySelectorAll('.avb'), function (b) { b.classList.toggle('on', b.dataset.pav === av); b.onclick = function () { av = b.dataset.pav; Array.prototype.forEach.call(box.querySelectorAll('.avb'), function (x) { x.classList.toggle('on', x === b); }); }; });
    box.querySelector('#pOk').onclick = function () { me.av = av; me.name = (box.querySelector('#pNm').value.trim() || 'Jugador').slice(0, 12); localStorage.setItem('tr-av', me.av); localStorage.setItem('tr-name', me.name); box.remove(); connect0(); };
  };
  function connect0() {
    render();
    if (!window.Peer) { $('#pStatus').textContent = 'Sin internet no se puede usar el celu como mando 📴'; return; }
    peerP = new Peer({ debug: 0 });
    peerP.on('open', dial);
    peerP.on('error', function (e) { if (e.type === 'peer-unavailable' && tries++ < 25) setTimeout(dial, 1500); });
    peerP.on('disconnected', function () { setTimeout(function () { if (!peerP.destroyed && peerP.disconnected) peerP.reconnect(); }, 1500); });
  }
  function dial() {
    var c = peerP.connect(PREFIX + c0, { reliable: true, serialization: 'json' });
    conn = c;
    c.on('open', function () { connected = true; tries = 0; c.send({ t: 'hello', pid: pid, name: me.name, av: me.av }); render(); vib(30); });
    c.on('data', function (m) {
      if (m.t === 'state') { var was = st.mine; st = m; if (st.mine && !was) { vib([60, 40, 60]); } render(); }
      else if (m.t === 'vib') vib(m.p);
      else if (m.t === 'home' && HUB) goHubPad();
    });
    c.on('close', function () { connected = false; render(); if (HUB) setTimeout(goHubPad, 1200); else setTimeout(dial, 2000); });
  }
  $$('#pad .hubBtn').forEach(function (b) { b.onclick = goHubPad; });
  document.addEventListener('pointerdown', function () { try { if (navigator.wakeLock) navigator.wakeLock.request('screen').catch(function () {}); } catch (e) {} }, { once: true });
  window.__padTest = function (m) { st = m; connected = true; render(); };
  askProfile();
}

/* ================= ARRANQUE ================= */
applyPrefs();
var padCode = (QS.get('c') || '').replace(/\D/g, '').slice(0, 4);
if (padCode.length === 4) startPad(padCode);
else {
  if (HUB || QS.has('tv')) document.body.classList.add('teclas');
  if (HUB) $$('.hubBtn').forEach(function (b) { b.classList.remove('hidden'); });
  show('start', false);
  startHost();
  window.addEventListener('online', function () { if (!peer) startHost(); });
}
document.addEventListener('pointerdown', function () { ac(); }, { once: true });
if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = function () { voice = null; };
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(function () {});
requestAnimationFrame(loop);
window.__tr = { S: S, get G() { return G; }, Court: Court, act: act, shootWith: shootWith, startCeleb: startCeleb };
