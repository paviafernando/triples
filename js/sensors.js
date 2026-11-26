/* Triples — modo simulación: el celu en la palma (pantalla contra la mano) como si fuera la pelota.
   1) Calibración: se guarda la inclinación de la "posición de tiro" y hacia dónde está el aro (brújula).
   2) Cuando el celu queda quieto en esa posición → vibra (y hace "tic"): está armado.
   3) El empujón del tiro (acelerómetro) se integra para estimar la velocidad de la mano; cuando frena → soltó.
   4) La fuerza sale de la velocidad comparada con la de tus tiros de calibración; la dirección, del giro (brújula)
      y del movimiento hacia los costados. */
'use strict';

var Sim = (function () {
  var S = {}, on = false, cb = {}, st = 'idle', since = 0, lastT = 0;
  var g = null, lin = [0, 0, 0], rot = 0, alpha = null, alphaRel = 0;
  var vel = [0, 0, 0], peakA = 0, maxSp = 0, maxVel = [0, 0, 0], pushT0 = 0, pushAlpha = 0, peakRot = 0;
  var KEY = 'triples-sim-v1';
  var cfg = (function () { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } })();
  cfg.ref = cfg.ref || null; cfg.vt = cfg.vt || 2.4; cfg.flip = !!cfg.flip; cfg.compass = cfg.compass !== false; cfg.sens = cfg.sens || 1;
  function saveCfg() { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {} }
  S.cfg = cfg; S.saveCfg = saveCfg;
  S.live = { st: 'off', ang: 0, lin: 0, rot: 0, sp: 0, alpha: null, last: null, ok: false };

  function len(a) { return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]); }
  function angle(a, b) { var d = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / ((len(a) * len(b)) || 1); return Math.acos(Math.max(-1, Math.min(1, d))) * 180 / Math.PI; }
  function set(s) { if (st !== s) { st = s; since = performance.now(); S.live.st = s; if (cb.state) cb.state(s); } }
  function vib(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

  S.supported = function () { return 'DeviceMotionEvent' in window; };
  S.needsPermission = function () { return typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function'; };
  /* Tiene que llamarse desde un toque (iPhone pide permiso) */
  S.ask = function () {
    var ps = [];
    try { if (S.needsPermission()) ps.push(DeviceMotionEvent.requestPermission()); } catch (e) {}
    try { if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') ps.push(DeviceOrientationEvent.requestPermission()); } catch (e) {}
    return Promise.all(ps).then(function (r) { return r.every(function (x) { return x === 'granted'; }); }, function () { return false; });
  };

  function onOri(e) {
    var a = e.webkitCompassHeading != null ? e.webkitCompassHeading : e.alpha; // iPhone da rumbo de brújula
    if (a == null) return;
    alpha = e.webkitCompassHeading != null ? -a : a; S.live.alpha = Math.round(a);
  }
  function wrap(d) { while (d > 180) d -= 360; while (d < -180) d += 360; return d; }

  function onMotion(e) {
    var now = performance.now(), dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 0.016; lastT = now;
    var A = e.accelerationIncludingGravity; if (!A || A.x == null) return;
    var aig = [A.x, A.y, A.z];
    if (!g) g = aig.slice();
    var L = e.acceleration;
    if (L && L.x != null) lin = [L.x, L.y, L.z];
    else lin = [aig[0] - g[0], aig[1] - g[1], aig[2] - g[2]];
    var lm = len(lin);
    var R = e.rotationRate; rot = R ? Math.sqrt((R.alpha || 0) * (R.alpha || 0) + (R.beta || 0) * (R.beta || 0) + (R.gamma || 0) * (R.gamma || 0)) : 0;
    if (lm < 2.5) for (var i = 0; i < 3; i++) g[i] = g[i] * 0.88 + aig[i] * 0.12;
    var still = lm < 1.3 && rot < 45;
    var ang = cfg.ref ? angle(g, cfg.ref) : 0;
    S.live.ang = Math.round(ang); S.live.lin = Math.round(lm * 10) / 10; S.live.rot = Math.round(rot);
    var poseOK = !!cfg.ref && ang < 32 * cfg.sens;
    S.live.ok = poseOK;
    if (cb.raw) cb.raw({ g: g, lin: lin, lm: lm, rot: rot, still: still, ang: ang });

    switch (st) {
      case 'idle':
        if (still && poseOK) { if (!S._t0) S._t0 = now; if (now - S._t0 > 320) { S._t0 = 0; set('armed'); vib(70); if (cb.armed) cb.armed(); pushAlpha = alpha; } }
        else S._t0 = 0;
        break;
      case 'armed':
        if (lm > 6.5 / cfg.sens) { set('push'); vel = [0, 0, 0]; peakA = 0; maxSp = 0; peakRot = 0; pushT0 = now; }
        else if (!poseOK && lm < 3) { if (!S._t1) S._t1 = now; if (now - S._t1 > 450) { S._t1 = 0; set('idle'); if (cb.disarm) cb.disarm(); } }
        else { S._t1 = 0; if (still) pushAlpha = alpha; }
        break;
      case 'push':
        for (var k = 0; k < 3; k++) vel[k] += lin[k] * dt;
        var sp = len(vel); if (sp > maxSp) { maxSp = sp; maxVel = vel.slice(); }
        if (lm > peakA) peakA = lm;
        if (rot > peakRot) peakRot = rot;
        var along = (lin[0] * vel[0] + lin[1] * vel[1] + lin[2] * vel[2]) / (sp || 1);
        var el = now - pushT0;
        if ((el > 70 && (lm < peakA * 0.35 || along < -5)) || el > 480) release();
        break;
      case 'cool':
        if (now - since > 750) set('idle');
        break;
    }
  }

  function release() {
    set('cool');
    var sp = Math.max(0.2, maxSp), lat = maxVel[0] / sp * (cfg.flip ? -1 : 1);
    var turn = (cfg.compass && alpha != null && pushAlpha != null && cfg.refAlpha != null) ? wrap(alpha - cfg.refAlpha) : 0;
    var latDeg = Math.asin(Math.max(-1, Math.min(1, lat))) * 180 / Math.PI;
    var shot = { speed: sp, ratio: sp / cfg.vt, latDeg: latDeg, turn: turn, peak: peakA };
    // a entrada del juego: error de fuerza y error lateral (grados)
    shot.pe = (shot.ratio - 1) * 0.065;
    shot.ae = latDeg * 0.15 + (Math.abs(turn) < 60 ? turn * 0.35 : 0);
    shot.spin = -Math.max(3, Math.min(26, peakRot / 40)); // giro de muñeca (°/s) → efecto de la pelota
    S.live.sp = Math.round(sp * 100) / 100; S.live.last = shot;
    vib(25);
    if (cb.shot) cb.shot(shot);
  }

  S.start = function (callbacks) {
    cb = callbacks || {}; if (on) return; on = true; g = null; lastT = 0; set('idle');
    window.addEventListener('devicemotion', onMotion);
    window.addEventListener('deviceorientationabsolute', onOri);
    window.addEventListener('deviceorientation', onOri);
  };
  S.stop = function () {
    on = false; set('idle'); S.live.st = 'off';
    window.removeEventListener('devicemotion', onMotion);
    window.removeEventListener('deviceorientationabsolute', onOri);
    window.removeEventListener('deviceorientation', onOri);
  };
  S.running = function () { return on; };
  S.state = function () { return st; };
  /* Calibrar la posición: guardar la gravedad actual (quieto en posición de tiro) y el rumbo hacia el aro */
  S.setRef = function () { if (!g) return false; cfg.ref = g.slice(); cfg.refAlpha = alpha; saveCfg(); return true; };
  /* Calibrar la fuerza con varios tiros "buenos" */
  S.setPower = function (speeds) { if (!speeds.length) return; var s = speeds.slice().sort(function (a, b) { return a - b; }); cfg.vt = s[Math.floor(s.length / 2)]; saveCfg(); };
  S.calibrated = function () { return !!cfg.ref; };
  S.isStill = function () { return len(lin) < 1.3 && rot < 45; };
  S.faceUp = function () { return g && Math.abs(g[2]) > 7; };
  return S;
})();
