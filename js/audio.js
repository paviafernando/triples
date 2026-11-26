/* Triples — audio: sonidos reales (assets/sfx/game), público dinámico y música arcade en loop */
'use strict';
var Audio2 = (function () {
  var A = { ctx: null, buf: {}, on: { sfx: true, crowd: true, music: true } };
  var BASE = '/assets/sfx/game/';
  var FILES = ['ambiente', 'festejo', 'festejo_grande', 'uhh', 'uhh2', 'aro', 'aro2', 'tablero', 'swish', 'pique', 'lanzar', 'moneda', 'click'];
  var master, sfxBus, crowdBus, musicBus, crowd = null, excite = 0.25, crowdTarget = 0.25;

  A.init = function (ctx) {
    if (A.ctx || !ctx) return;
    A.ctx = ctx;
    master = ctx.createDynamicsCompressor(); master.threshold.value = -10; master.ratio.value = 4; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
    crowdBus = ctx.createGain(); crowdBus.gain.value = 0; crowdBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.55; musicBus.connect(master);
    FILES.forEach(function (f) {
      fetch(BASE + f + '.mp3').then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); })
        .then(function (b) { return new Promise(function (res, rej) { ctx.decodeAudioData(b, res, rej); }); })
        .then(function (b) { A.buf[f] = b; if (f === 'ambiente' && A._wantCrowd) A.crowd(true); }).catch(function () {});
    });
    setInterval(tickCrowd, 100);
  };
  A.has = function (n) { return !!A.buf[n]; };
  A.play = function (n, vol, rate, delay) {
    if (!A.ctx || !A.buf[n] || !A.on.sfx) return false;
    var s = A.ctx.createBufferSource(), g = A.ctx.createGain();
    s.buffer = A.buf[n]; s.playbackRate.value = rate || 1; g.gain.value = vol == null ? 1 : vol;
    s.connect(g); g.connect(sfxBus); s.start(A.ctx.currentTime + (delay || 0));
    return true;
  };

  /* ---------- público: loop real + intensidad que sube y baja ---------- */
  A.crowd = function (on) {
    A._wantCrowd = on;
    if (!A.ctx) return;
    var t = A.ctx.currentTime;
    if (on && A.on.crowd && A.on.sfx && A.buf.ambiente && !crowd) {
      var s = A.ctx.createBufferSource(); s.buffer = A.buf.ambiente; s.loop = true;
      var f = A.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2500;
      s.connect(f); f.connect(crowdBus); s.start(0, Math.random() * 40);
      crowd = { s: s, f: f };
    }
    if (!on && crowd) { crowdBus.gain.setTargetAtTime(0, t, 0.4); var c = crowd; crowd = null; setTimeout(function () { try { c.s.stop(); } catch (e) {} }, 1500); }
  };
  // k: 0..1. Sube la emoción del público (embocar, racha, último segundo); vuelve sola a la calma
  A.excite = function (k) { crowdTarget = Math.max(crowdTarget, Math.min(1, k)); excite = Math.max(excite, Math.min(1, k)); };
  A.setBase = function (k) { A._base = k; };
  function tickCrowd() {
    if (!A.ctx || !crowd) return;
    var base = A._base == null ? 0.25 : A._base;
    crowdTarget += (base - crowdTarget) * 0.04;
    excite += (crowdTarget - excite) * 0.2;
    var wobble = 0.06 * Math.sin(Date.now() / 2300) + 0.04 * Math.sin(Date.now() / 900);
    var v = Math.max(0.05, 0.22 + excite * 0.75 + wobble);
    var t = A.ctx.currentTime;
    crowdBus.gain.setTargetAtTime(v, t, 0.25);
    crowd.f.frequency.setTargetAtTime(1400 + excite * 5500, t, 0.3);
    crowd.s.playbackRate.setTargetAtTime(1 + excite * 0.04, t, 0.5);
  }

  /* ---------- música arcade (secuenciador con WebAudio) ---------- */
  var M = { cur: null, step: 0, next: 0, timer: null, bus: null };
  var N = function (n) { return 440 * Math.pow(2, (n - 69) / 12); };
  // notas MIDI; 0 = silencio
  var TRACKS = {
    menu: { bpm: 108, swing: 0.12, vol: 0.9,
      kick:  'x.....x.x.....x.x.....x...x..x..',
      snare: '....x.......x.......x.......x..x',
      hat:   'x.x.x.xxx.x.x.x.x.x.x.xxx.x.x.xx',
      bass: [40,0,40,52,0,40,0,50, 0,47,0,45,43,0,40,0, 45,0,45,57,0,45,0,55, 0,52,0,50,48,0,47,0],
      chords: [[64,67,71,74],null,null,null,null,null,[64,67,71,74],null, null,null,null,null,null,null,null,null, [69,73,76,79],null,null,null,null,null,[69,73,76,79],null, null,null,null,null,[67,71,74,78],null,null,null],
      lead: [76,0,79,0,81,0,79,76, 0,74,76,0,71,0,0,0, 76,0,79,0,81,0,83,81, 0,79,81,0,84,0,83,0] },
    game: { bpm: 94, swing: 0.15, vol: 0.55,
      kick:  'x.......x.x.....x.......x.....x.',
      snare: '....x.......x.......x.......x...',
      hat:   'x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.',
      bass: [43,0,0,43,0,0,50,0, 0,0,48,0,46,0,0,0, 41,0,0,41,0,0,48,0, 0,0,46,0,45,0,0,0],
      pad: [[67,70,74],[65,69,72]] },
    fire: { bpm: 134, swing: 0, vol: 1,
      kick:  'x...x...x...x...x...x...x...x.x.',
      snare: '....x.......x.......x.......xxxx',
      hat:   'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      bass: [40,40,52,40,40,52,40,52, 43,43,55,43,43,55,43,55, 45,45,57,45,45,57,45,57, 47,47,59,47,50,50,62,50],
      lead: [76,79,83,79,76,79,83,88, 79,83,86,83,79,83,86,91, 81,84,88,84,81,84,88,93, 83,86,90,86,86,90,93,98], leadType: 'arp' },
    celeb: { bpm: 140, swing: 0, vol: 1,
      kick:  'x...x...x...x...x...x...x...x...',
      snare: '....x.......x.......x.....x.x.xx',
      hat:   'x.xxx.xxx.xxx.xxx.xxx.xxx.xxx.xx',
      bass: [48,0,48,60,48,0,48,60, 53,0,53,65,53,0,53,65, 55,0,55,67,55,0,55,67, 53,0,55,0,57,0,59,0],
      chords: [[72,76,79],null,null,null,[72,76,79],null,null,null, [77,81,84],null,null,null,[77,81,84],null,null,null, [79,83,86],null,null,null,[79,83,86],null,null,null, [77,81,84],null,[79,83,86],null,[84,88,91],null,null,null],
      lead: [84,0,84,86,88,0,84,0, 89,0,89,88,86,0,84,0, 86,0,86,88,91,0,86,0, 89,88,86,84,88,0,91,0] }
  };
  function noiseBuf() { if (M.nb) return M.nb; var b = A.ctx.createBuffer(1, A.ctx.sampleRate, A.ctx.sampleRate), d = b.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; M.nb = b; return b; }
  function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function kick(t, bus, v) { var o = A.ctx.createOscillator(), g = A.ctx.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); env(g, t, 0.003, 0.9 * v, 0.22); o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.3); }
  function snare(t, bus, v) {
    var s = A.ctx.createBufferSource(); s.buffer = noiseBuf(); var f = A.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.8; var g = A.ctx.createGain(); env(g, t, 0.002, 0.55 * v, 0.16); s.connect(f); f.connect(g); g.connect(bus); s.start(t, Math.random()); s.stop(t + 0.2);
    var o = A.ctx.createOscillator(), g2 = A.ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(160, t + 0.08); env(g2, t, 0.002, 0.35 * v, 0.09); o.connect(g2); g2.connect(bus); o.start(t); o.stop(t + 0.15);
  }
  function hat(t, bus, v, open) { var s = A.ctx.createBufferSource(); s.buffer = noiseBuf(); var f = A.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7500; var g = A.ctx.createGain(); env(g, t, 0.001, 0.18 * v, open ? 0.12 : 0.035); s.connect(f); f.connect(g); g.connect(bus); s.start(t, Math.random()); s.stop(t + 0.15); }
  function bass(t, n, bus, v, len) { var o = A.ctx.createOscillator(), f = A.ctx.createBiquadFilter(), g = A.ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = N(n); f.type = 'lowpass'; f.Q.value = 9; f.frequency.setValueAtTime(1600, t); f.frequency.exponentialRampToValueAtTime(260, t + len); env(g, t, 0.004, 0.32 * v, len); o.connect(f); f.connect(g); g.connect(bus); o.start(t); o.stop(t + len + 0.05); }
  function stab(t, notes, bus, v, len) { notes.forEach(function (n, i) { [-6, 6].forEach(function (det) { var o = A.ctx.createOscillator(), f = A.ctx.createBiquadFilter(), g = A.ctx.createGain(); o.type = 'square'; o.frequency.value = N(n); o.detune.value = det; f.type = 'lowpass'; f.frequency.value = 2600; env(g, t, 0.005, 0.035 * v, len); o.connect(f); f.connect(g); g.connect(bus); o.start(t); o.stop(t + len + 0.05); }); }); }
  function pad(t, notes, bus, v, len) { notes.forEach(function (n) { var o = A.ctx.createOscillator(), g = A.ctx.createGain(); o.type = 'triangle'; o.frequency.value = N(n); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.045 * v, t + len * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + len); o.connect(g); g.connect(bus); o.start(t); o.stop(t + len + 0.05); }); }
  function lead(t, n, bus, v, len, arp) { var o = A.ctx.createOscillator(), o2 = A.ctx.createOscillator(), f = A.ctx.createBiquadFilter(), g = A.ctx.createGain(); o.type = 'square'; o2.type = 'sawtooth'; o.frequency.value = o2.frequency.value = N(n); o2.detune.value = 9; f.type = 'lowpass'; f.frequency.value = arp ? 3800 : 3000; env(g, t, 0.006, (arp ? 0.05 : 0.075) * v, len); if (!arp) { var lfo = A.ctx.createOscillator(), lg = A.ctx.createGain(); lfo.frequency.value = 6; lg.gain.value = 9; lfo.connect(lg); lg.connect(o.detune); lfo.start(t); lfo.stop(t + len + 0.05); } o.connect(f); o2.connect(f); f.connect(g); g.connect(bus); o.start(t); o2.start(t); o.stop(t + len + 0.05); o2.stop(t + len + 0.05); }

  function schedule() {
    var tr = M.cur && TRACKS[M.cur]; if (!tr || !A.ctx) return;
    var sp = 60 / tr.bpm / 4, bus = M.bus;
    while (M.next < A.ctx.currentTime + 0.15) {
      var i = M.step % 32, t = M.next + (i % 2 ? tr.swing * sp : 0), v = tr.vol;
      if (tr.kick[i] === 'x') kick(t, bus, v);
      if (tr.snare[i] === 'x') snare(t, bus, v);
      if (tr.hat[i] === 'x') hat(t, bus, v * (i % 4 === 2 ? 1 : 0.6), i % 8 === 6 && M.cur === 'menu');
      if (tr.bass && tr.bass[i]) bass(t, tr.bass[i], bus, v, sp * 1.6);
      if (tr.chords && tr.chords[i]) stab(t, tr.chords[i], bus, v, sp * 1.5);
      if (tr.pad && i % 16 === 0) pad(t, tr.pad[(M.step / 16 | 0) % tr.pad.length], bus, v, sp * 16);
      if (tr.lead && tr.lead[i] && (M.cur !== 'menu' || (M.step / 32 | 0) % 2 === 1)) lead(t, tr.lead[i], bus, v, sp * (tr.leadType === 'arp' ? 0.9 : 1.7), tr.leadType === 'arp');
      M.step++; M.next += sp;
    }
  }
  A.music = function (name) {
    if (!A.ctx) { A._wantMusic = name; return; }
    if (name === M.cur) return;
    var t = A.ctx.currentTime;
    if (M.bus) { var old = M.bus; old.gain.setTargetAtTime(0.0001, t, 0.25); setTimeout(function () { try { old.disconnect(); } catch (e) {} }, 1500); }
    M.cur = name || null; M.bus = null;
    if (!name || !A.on.music) { clearInterval(M.timer); M.timer = null; return; }
    M.bus = A.ctx.createGain(); M.bus.gain.setValueAtTime(0.0001, t); M.bus.gain.exponentialRampToValueAtTime(1, t + 0.4); M.bus.connect(musicBus);
    M.step = 0; M.next = t + 0.05;
    if (!M.timer) M.timer = setInterval(schedule, 25);
  };
  A.current = function () { return M.cur; };
  A.setOn = function (k, v) { A.on[k] = v; if (k === 'music') { var c = M.cur; M.cur = null; A.music(v ? c || A._wantMusic : null); if (!v) M.cur = c; } if (k === 'crowd' || k === 'sfx') A.crowd(A._wantCrowd); };
  return A;
})();
