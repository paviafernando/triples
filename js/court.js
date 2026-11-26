/* Triples — cancha en 3D (canvas 2D con perspectiva propia) y física de la pelota */
'use strict';

var RIM = { x: 0, y: 3.05, z: 0, r: 0.2286 };
var BALL_R = 0.12, GRAV = 9.81;
var BOARD = { z: -0.38, x0: -0.915, x1: 0.915, y0: 2.9, y1: 3.97 };

function v3(x, y, z) { return [x, y, z]; }
function vsub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function vadd(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function vmul(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
function vdot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function vlen(a) { return Math.sqrt(vdot(a, a)); }
function vnorm(a) { var l = vlen(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
function vcross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }

/* Semilla fija para el público */
function srand(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

var Court = (function () {
  var C = {};
  var cam = { eye: [0, 2, 9], tgt: [0, 2.6, 0], f: [0, 0, -1], r: [1, 0, 0], u: [0, 1, 0], F: 800, cx: 0, cy: 0, w: 0, h: 0 };
  var camFrom = null, camTo = null, camT = 1;
  var crowd = [];
  (function () {
    var R = srand(7), cols = ['#ff4d6d', '#ffd54d', '#3fa7ff', '#2fd27a', '#ffffff', '#b86bff', '#ff8a3d', '#1d428a', '#552583', '#fdb927'];
    for (var row = 0; row < 9; row++) {
      for (var i = 0; i < 70; i++) {
        var x = -17 + i * 0.5 + (row % 2) * 0.25, z = -6 - row * 0.8, y = 0.9 + row * 0.62;
        crowd.push({ p: [x, y, z], c: cols[Math.floor(R() * cols.length)], s: 0.85 + R() * 0.3, ph: R() * 6.28, skin: SKINS[Math.floor(R() * SKINS.length)] });
      }
    }
    for (var side = -1; side <= 1; side += 2) for (var r2 = 0; r2 < 7; r2++) for (var k = 0; k < 34; k++) {
      crowd.push({ p: [side * (11 + r2 * 0.8), 0.9 + r2 * 0.62, -5.5 + k * 0.55], c: cols[Math.floor(R() * cols.length)], s: 0.85 + R() * 0.3, ph: R() * 6.28, skin: SKINS[Math.floor(R() * SKINS.length)] });
    }
  })();

  C.spotPos = function (i, diff) {
    var d = DIFFS[diff] || DIFFS.normal, a = SPOTS[i].a * Math.PI / 180;
    var dist = Math.abs(SPOTS[i].a) > 70 ? d.corner + 0.05 : d.dist + 0.12;
    return [Math.sin(a) * dist, 0, Math.cos(a) * dist];
  };
  function camFor(i, diff) {
    var s = C.spotPos(i, diff), dir = vnorm([s[0], 0, s[2]]), side = [dir[2], 0, -dir[0]];
    var eye = vadd(vadd(s, vmul(dir, 5.6)), vmul(side, 1.3)); eye[1] = 3.4;
    return { eye: eye, tgt: [s[0] * 0.3, 2.2, s[2] * 0.3] };
  }
  C.setSpot = function (i, diff, instant) {
    var to = camFor(i, diff);
    if (instant) { cam.eye = to.eye; cam.tgt = to.tgt; camT = 1; camTo = to; return; }
    camFrom = { eye: cam.eye.slice(), tgt: cam.tgt.slice() }; camTo = to; camT = 0;
  };
  C.view = function (eye, tgt) { cam.eye = eye; cam.tgt = tgt; camT = 1; };
  function updCam(dt) {
    if (camT < 1 && camFrom) {
      camT = Math.min(1, camT + dt / 0.9); var k = ease(camT);
      // giro alrededor del aro (interpolación angular para que la cámara "camine" por el arco)
      var a0 = Math.atan2(camFrom.eye[0], camFrom.eye[2]), a1 = Math.atan2(camTo.eye[0], camTo.eye[2]);
      var r0 = Math.hypot(camFrom.eye[0], camFrom.eye[2]), r1 = Math.hypot(camTo.eye[0], camTo.eye[2]);
      var a = lerp(a0, a1, k), r = lerp(r0, r1, k);
      cam.eye = [Math.sin(a) * r, lerp(camFrom.eye[1], camTo.eye[1], k), Math.cos(a) * r];
      cam.tgt = [lerp(camFrom.tgt[0], camTo.tgt[0], k), lerp(camFrom.tgt[1], camTo.tgt[1], k), lerp(camFrom.tgt[2], camTo.tgt[2], k)];
    }
    cam.f = vnorm(vsub(cam.tgt, cam.eye)); cam.r = vnorm(vcross(cam.f, [0, 1, 0])); cam.u = vcross(cam.r, cam.f);
  }
  C.camMoving = function () { return camT < 1; };
  C.camProgress = function () { return ease(camT); };
  C.camState = function () { return { eye: cam.eye, tgt: cam.tgt }; };
  C.netKick = function () { return netKick; };
  C.rimShake = function () { return rimShake; };
  C.cheerLevel = function () { return cheer; };
  function toCam(p) { var d = vsub(p, cam.eye); return [vdot(d, cam.r), vdot(d, cam.u), vdot(d, cam.f)]; }
  function proj(p) { var q = toCam(p); if (q[2] < 0.05) return null; return [cam.cx + q[0] * cam.F / q[2], cam.cy - q[1] * cam.F / q[2], q[2]]; }
  C.proj = proj;
  /* polígono en el mundo → pantalla con recorte contra el plano cercano */
  function polyPath(c, pts, close) {
    var q = pts.map(toCam), out = [], near = 0.2;
    for (var i = 0; i < q.length; i++) {
      var a = q[i], b = q[(i + 1) % q.length];
      if (a[2] >= near) out.push(a);
      if (!close && i === q.length - 1) break;
      if ((a[2] >= near) !== (b[2] >= near)) { var t = (near - a[2]) / (b[2] - a[2]); out.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t), near]); }
    }
    if (out.length < 2) return false;
    c.beginPath();
    out.forEach(function (p, i) { var x = cam.cx + p[0] * cam.F / p[2], y = cam.cy - p[1] * cam.F / p[2]; if (i) c.lineTo(x, y); else c.moveTo(x, y); });
    if (close) c.closePath();
    return true;
  }
  function line3(c, pts) { // polilínea abierta con recorte por segmento
    for (var i = 0; i < pts.length - 1; i++) { if (polyPath(c, [pts[i], pts[i + 1]], false)) c.stroke(); }
  }
  function floorLine(c, pts) { c.beginPath(); var started = false; for (var i = 0; i < pts.length; i++) { var p = proj(pts[i]); if (!p) { started = false; continue; } if (started) c.lineTo(p[0], p[1]); else { c.moveTo(p[0], p[1]); started = true; } } c.stroke(); }
  function arc(cx, cz, r, a0, a1, n, y) { var pts = []; for (var i = 0; i <= n; i++) { var a = lerp(a0, a1, i / n); pts.push([cx + Math.sin(a) * r, y || 0.002, cz + Math.cos(a) * r]); } return pts; }

  /* ---------------- estado de la pelota y el aro ---------------- */
  var ball = null, netK = 0, netKick = 0, rimShake = 0, events = null;
  C.ball = function () { return ball; };
  C.clearBall = function () { ball = null; };

  /* velocidad para llegar a target desde p con ángulo th */
  function solveShot(p, target, th) {
    var dx = target[0] - p[0], dz = target[2] - p[2], D = Math.hypot(dx, dz), h = target[1] - p[1];
    var den = 2 * Math.cos(th) * Math.cos(th) * (D * Math.tan(th) - h);
    var v = Math.sqrt(GRAV * D * D / Math.max(0.1, den));
    var yaw = Math.atan2(dx, dz);
    return { v: v, yaw: yaw, th: th, D: D };
  }
  C.solveShot = solveShot;

  /* Lanza la pelota. o: {from, pe (error de fuerza, fracción), ae (error lateral, grados), arc (grados), money, magnet, kind} */
  C.launch = function (o, cb) {
    var p = o.from.slice(), tgt = [RIM.x, RIM.y, RIM.z - 0.03];
    var s = solveShot(p, tgt, (o.arc || 50) * Math.PI / 180);
    var v = s.v * (1 + (o.pe || 0)), yaw = s.yaw + (o.ae || 0) * Math.PI / 180, th = s.th + (o.pa || 0) * Math.PI / 180;
    var hv = v * Math.cos(th);
    ball = { p: p, v: [Math.sin(yaw) * hv, v * Math.sin(th), Math.cos(yaw) * hv], rot: o.rot || 0, spin: o.spin != null ? o.spin : -8, money: o.money, t: 0, made: false, through: false, touched: 0, board: 0, done: false, magnet: o.magnet || 0, floor: 0, rest: 0 };
    events = cb || {};
    return ball;
  };

  function hitRim(b) {
    var dx = b.p[0] - RIM.x, dz = b.p[2] - RIM.z, d = Math.hypot(dx, dz) || 1e-6;
    var cp = [RIM.x + dx / d * RIM.r, RIM.y, RIM.z + dz / d * RIM.r];
    var n = vsub(b.p, cp), dist = vlen(n);
    var rt = 0.012; // grosor del aro
    if (dist < BALL_R + rt) {
      n = vmul(n, 1 / (dist || 1e-6));
      var vn = vdot(b.v, n);
      if (vn < 0) {
        b.v = vsub(b.v, vmul(n, (1 + 0.55) * vn));
        // fricción tangencial
        var vt = vsub(b.v, vmul(n, vdot(b.v, n))); b.v = vsub(b.v, vmul(vt, 0.12));
        var back = Math.max(0, -b.spin) / 20;           // cuánto contraefecto trae
        b.v[0] *= 1 - back * 0.25; b.v[2] *= 1 - back * 0.25; // rebote más suave
        b.spin = -b.spin * 0.55 + (Math.random() - 0.5) * 6;  // al pegar en el aro el giro se invierte y se desordena
        b.touched++; rimShake = 1;
        if (events.rim) events.rim(Math.min(1, -vn / 4));
      }
      b.p = vadd(cp, vmul(n, BALL_R + rt + 0.001));
    }
  }
  function hitBoard(b) {
    if (b.p[2] - BALL_R < BOARD.z && b.p[2] > BOARD.z - 0.3 && b.p[0] > BOARD.x0 - BALL_R && b.p[0] < BOARD.x1 + BALL_R && b.p[1] > BOARD.y0 - BALL_R && b.p[1] < BOARD.y1 + BALL_R && b.v[2] < 0) {
      b.p[2] = BOARD.z + BALL_R; b.v[2] = -b.v[2] * 0.6; b.v[0] *= 0.9; b.v[1] *= 0.9; b.v[1] += b.spin * 0.015; b.spin = -b.spin * 0.5; b.board++;
      if (events.board) events.board();
    }
    // aro unido al tablero (el soporte): si pasa muy atrás, rebota
  }
  function stepBall(dt) {
    var b = ball; if (!b || b.done) return;
    var sub = 6, h = dt / sub;
    for (var i = 0; i < sub; i++) {
      var prevY = b.p[1];
      // ayuda (imán) en fácil: corrige un poquito cuando baja cerca del aro
      if (b.magnet && b.v[1] < 0 && b.p[1] > RIM.y && b.p[1] < RIM.y + 1.4 && !b.through) {
        var hx = RIM.x - b.p[0], hz = RIM.z - b.p[2], hd = Math.hypot(hx, hz);
        if (hd < 0.75) { var k = b.magnet * 60 * h; b.v[0] += hx * k; b.v[2] += hz * k; }
      }
      b.v[1] -= GRAV * h;
      if (b.through) { b.v[0] *= 0.97; b.v[2] *= 0.97; if (b.p[1] > RIM.y - 0.45) b.v[1] = Math.max(b.v[1], -2.2); }
      b.p = vadd(b.p, vmul(b.v, h));
      b.rot += b.spin * h;
      b.spin *= (1 - 0.12 * h); // el aire frena un poco el giro
      if (b.through) b.spin *= (1 - 3 * h); // la red lo frena
      if (!b.through) { hitRim(b); hitBoard(b); }
      // ¿entró? cruza el plano del aro bajando, dentro del aro
      if (!b.through && prevY >= RIM.y && b.p[1] < RIM.y && b.v[1] < 0) {
        var dd = Math.hypot(b.p[0] - RIM.x, b.p[2] - RIM.z);
        if (dd < RIM.r - 0.035) {
          b.through = true; b.made = true; netKick = 1; b.swish = !b.touched && !b.board;
          b.v[0] *= 0.3; b.v[2] *= 0.3;
          if (events.made) events.made(b);
        }
      }
      // piso
      if (b.p[1] < BALL_R) {
        b.p[1] = BALL_R;
        if (b.v[1] < -0.6) { b.v[1] = -b.v[1] * 0.62; b.floor++;
          var hz = Math.hypot(b.v[0], b.v[2]) || 1, pull = b.spin * 0.03; b.v[0] += b.v[0] / hz * pull; b.v[2] += b.v[2] / hz * pull; b.spin *= 0.6; if (events.floor) events.floor(Math.min(1, -b.v[1] / 5)); }
        else b.v[1] = 0;
        b.v[0] *= 0.85; b.v[2] *= 0.85;
      }
    }
    b.t += dt;
    if (!b.made && !b.missed && (b.floor > 0 || b.t > 4 || (b.p[1] < RIM.y - 0.5 && b.v[1] < 0 && Math.hypot(b.p[0], b.p[2]) > 0.4))) { b.missed = true; if (events.miss) events.miss(b); }
    if ((b.made || b.missed) && (b.floor >= 2 || b.t > 3.2) && !b.done) { b.done = true; if (events.done) events.done(b); }
  }

  C.step = function (dt) { updCam(dt); cheer = Math.max(0, cheer - dt * 0.5); stepBall(dt); netK += dt; netKick = Math.max(0, netKick - dt * 1.6); rimShake = Math.max(0, rimShake - dt * 4); };

  /* ---------------- dibujo ---------------- */
  var cheer = 0; C.cheer = function (k) { cheer = Math.max(cheer, k || 1); };
  C.render = function (c, w, h, t, S) {
    cam.w = w; cam.h = h; cam.cx = w / 2; cam.cy = h * (w > h ? 0.4 : 0.46); cam.F = w > h ? h * 0.98 : Math.min(w * 1.25, h * 1.25);
    var princess = S.princess;
    // fondo del estadio
    var g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, princess ? '#3a1840' : '#0b1026'); g.addColorStop(0.55, princess ? '#6a2a6a' : '#1b2350'); g.addColorStop(1, princess ? '#2a1030' : '#0b1026');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    // luces del techo
    for (var L = -3; L <= 3; L++) { var lp = proj([L * 4, 14, -8]); if (lp) { var rg = c.createRadialGradient(lp[0], lp[1], 0, lp[0], lp[1], cam.F * 0.12); rg.addColorStop(0, 'rgba(255,255,230,.55)'); rg.addColorStop(1, 'rgba(255,255,230,0)'); c.fillStyle = rg; c.fillRect(lp[0] - cam.F * 0.12, lp[1] - cam.F * 0.12, cam.F * 0.24, cam.F * 0.24); } }
    // tribunas (bloque oscuro) y público
    c.fillStyle = princess ? '#4a1d4f' : '#141a3a';
    if (polyPath(c, [[-18, 0, -5.4], [18, 0, -5.4], [18, 7, -13], [-18, 7, -13]], true)) c.fill();
    [-1, 1].forEach(function (sd) { c.fillStyle = princess ? '#4a1d4f' : '#141a3a'; if (polyPath(c, [[sd * 10.6, 0, -6], [sd * 10.6, 0, 14], [sd * 17, 5, 14], [sd * 17, 5, -6]], true)) c.fill(); });
    var cr = [];
    for (var i = 0; i < crowd.length; i++) { var q = proj([crowd[i].p[0], crowd[i].p[1] + (cheer > 0.05 ? Math.abs(Math.sin(t * 9 + crowd[i].ph)) * 0.35 * cheer : Math.sin(t * 1.3 + crowd[i].ph) * 0.03), crowd[i].p[2]]); if (q) cr.push([q, crowd[i]]); }
    cr.sort(function (a, b) { return b[0][2] - a[0][2]; });
    for (var j = 0; j < cr.length; j++) {
      var q2 = cr[j][0], m = cr[j][1], s = 0.26 * cam.F / q2[2] * m.s;
      if (s < 0.6) continue;
      c.fillStyle = m.c; c.fillRect(q2[0] - s, q2[1], s * 2, s * 2.2);
      c.fillStyle = m.skin; c.beginPath(); c.arc(q2[0], q2[1] - s * 0.3, s * 0.75, 0, 6.3); c.fill();
      if (cheer > 0.3 && s > 3) { c.fillStyle = m.skin; c.fillRect(q2[0] - s * 1.3, q2[1] - s * 1.6, s * 0.4, s * 1.4); c.fillRect(q2[0] + s * 0.9, q2[1] - s * 1.6, s * 0.4, s * 1.4); }
    }
    // piso
    var woodA = princess ? '#f7c6dc' : '#d79b5a', woodB = princess ? '#eaa8c8' : '#c4823f';
    c.fillStyle = woodA; if (polyPath(c, [[-9, 0, -1.6], [9, 0, -1.6], [9, 0, 14], [-9, 0, 14]], true)) c.fill();
    c.fillStyle = princess ? '#3a1840' : '#1a2047'; if (polyPath(c, [[-30, 0, -1.6], [30, 0, -1.6], [30, 0, -5.4], [-30, 0, -5.4]], true)) c.fill();
    [-1, 1].forEach(function (sd) { c.fillStyle = princess ? '#3a1840' : '#1a2047'; if (polyPath(c, [[sd * 9, 0, -5.4], [sd * 9, 0, 30], [sd * 30, 0, 30], [sd * 30, 0, -5.4]], true)) c.fill(); });
    // tablas
    c.strokeStyle = woodB; c.lineWidth = 1;
    for (var px = -9; px <= 9; px += 0.6) floorLine(c, [[px, 0.001, -1.6], [px, 0.001, 14]]);
    // pintura (la llave)
    c.fillStyle = princess ? 'rgba(255,95,162,.55)' : 'rgba(29,66,138,.75)';
    if (polyPath(c, [[-2.44, 0.001, -1.6], [2.44, 0.001, -1.6], [2.44, 0.001, 4.19], [-2.44, 0.001, 4.19]], true)) c.fill();
    // líneas
    c.strokeStyle = '#fff'; c.lineWidth = Math.max(2, cam.F / 260); c.lineCap = 'round';
    floorLine(c, [[-7.5, 0.002, -1.6], [7.5, 0.002, -1.6]]);
    floorLine(c, [[-2.44, 0.002, -1.6], [-2.44, 0.002, 4.19], [2.44, 0.002, 4.19], [2.44, 0.002, -1.6]]);
    floorLine(c, arc(0, 4.19, 1.8, -Math.PI / 2, Math.PI / 2, 24));
    floorLine(c, arc(0, 0, 1.25, -Math.PI / 2, Math.PI / 2, 16));
    var D = DIFFS[S.diff] || DIFFS.normal, a3 = Math.asin(Math.min(0.999, D.corner / D.dist));
    var z3 = Math.cos(a3) * D.dist;
    c.strokeStyle = princess ? '#fff4b0' : '#fff';
    floorLine(c, [[-D.corner, 0.002, -1.6], [-D.corner, 0.002, z3]].concat(arc(0, 0, D.dist, -a3, a3, 48)).concat([[D.corner, 0.002, z3], [D.corner, 0.002, -1.6]]));
    // logo al medio
    var mid = proj([0, 0, 12]); if (mid) { c.strokeStyle = 'rgba(255,255,255,.7)'; floorLine(c, arc(0, 14, 1.8, Math.PI / 2 + 0.01, Math.PI * 1.5 - 0.01, 20)); }

    // racks
    var draws = [];
    for (var si = 0; si < SPOTS.length; si++) {
      var sp = C.spotPos(si, S.diff), dir = vnorm([sp[0], 0, sp[2]]), side = [dir[2], 0, -dir[0]];
      var rp = vadd(vadd(sp, vmul(side, -0.85)), vmul(dir, 0.15));
      var rack = S.racks ? S.racks[si] : null;
      draws.push({ z: toCam(rp)[2], f: drawRack.bind(null, c, rp, side, rack, si === S.spot, princess, si) });
    }
    // aro y tablero (parte de atrás, después la de adelante)
    var hz = toCam([0, RIM.y, 0])[2];
    draws.push({ z: hz + 0.6, f: function () { drawBoard(c, princess, t); } });
    draws.push({ z: hz + 0.05, f: function () { drawRimNet(c, -1, t); } });
    draws.push({ z: hz - 0.05, f: function () { drawRimNet(c, 1, t); } });
    if (ball) { var bz = toCam(ball.p)[2]; var near = Math.hypot(ball.p[0], ball.p[2]) < 0.45 && ball.p[1] < RIM.y + 0.15 && ball.p[1] > RIM.y - 0.7; draws.push({ z: near ? hz : bz, f: function () { drawBall(c, ball.p, ball.rot, ball.money, princess); } }); }
    if (S.shooter) { var shz = toCam(S.shooter.pos)[2]; draws.push({ z: shz, f: function () { drawShooter(c, S.shooter, t, princess); } }); }
    draws.sort(function (a, b) { return b.z - a.z; });
    draws.forEach(function (d) { d.f(); });
  };

  function drawBoard(c, princess, t) {
    // poste
    c.fillStyle = '#2b2f3a';
    if (polyPath(c, [[-0.12, 0, -2.6], [0.12, 0, -2.6], [0.12, 3.4, -2.6], [-0.12, 3.4, -2.6]], true)) c.fill();
    c.strokeStyle = '#2b2f3a'; c.lineWidth = Math.max(3, cam.F / 120);
    line3(c, [[0, 3.3, -2.6], [0, 3.35, -0.5]]);
    c.fillStyle = '#1d428a'; if (polyPath(c, [[-0.9, 0, -2.6], [0.9, 0, -2.6], [0.9, 0.9, -2.9], [-0.9, 0.9, -2.9]], true)) c.fill();
    // tablero de vidrio
    var B = BOARD;
    c.fillStyle = 'rgba(210,230,255,.28)';
    if (polyPath(c, [[B.x0, B.y0, B.z], [B.x1, B.y0, B.z], [B.x1, B.y1, B.z], [B.x0, B.y1, B.z]], true)) { c.fill(); c.strokeStyle = princess ? '#ff8ac0' : '#fff'; c.lineWidth = Math.max(2, cam.F / 200); c.stroke(); }
    c.strokeStyle = princess ? '#ff5fa2' : '#ff4d2e'; c.lineWidth = Math.max(2, cam.F / 260);
    if (polyPath(c, [[-0.305, 3.05, B.z + 0.005], [0.305, 3.05, B.z + 0.005], [0.305, 3.5, B.z + 0.005], [-0.305, 3.5, B.z + 0.005]], true)) c.stroke();
    // brazo del aro
    c.strokeStyle = '#ff6a1a'; c.lineWidth = Math.max(2, cam.F / 220); line3(c, [[0, 3.05, B.z], [0, 3.05, -RIM.r]]);
  }
  function rimPts(y, r, n) { var p = []; for (var i = 0; i <= n; i++) { var a = i / n * Math.PI * 2; p.push([RIM.x + Math.cos(a) * r, y, RIM.z + Math.sin(a) * r]); } return p; }
  function drawRimNet(c, front, t) {
    // red: 12 hilos que van del aro a un anillo más chico abajo
    var n = 12, sway = netKick, sh = rimShake * 0.02 * Math.sin(t * 60);
    c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = Math.max(1, cam.F / 600);
    for (var i = 0; i < n; i++) {
      var a = i / n * Math.PI * 2, isFront = Math.sin(a) > 0; // z>0 = hacia la cámara de frente al tablero
      if ((front > 0) !== isFront) continue;
      var top = [Math.cos(a) * RIM.r, RIM.y + sh, Math.sin(a) * RIM.r];
      var r2 = 0.13 + sway * 0.05, dy = 0.42 + sway * 0.12;
      var mid = [Math.cos(a + 0.26) * (RIM.r * 0.75), RIM.y - dy * 0.5 - sway * 0.1, Math.sin(a + 0.26) * (RIM.r * 0.75)];
      var bot = [Math.cos(a) * r2, RIM.y - dy, Math.sin(a) * r2];
      line3(c, [top, mid, bot]);
      var a2 = a + Math.PI * 2 / n;
      var mid2 = [Math.cos(a2 - 0.26) * (RIM.r * 0.75), RIM.y - dy * 0.5 - sway * 0.1, Math.sin(a2 - 0.26) * (RIM.r * 0.75)];
      line3(c, [top, mid2]);
    }
    // aro
    var pts = rimPts(RIM.y + sh, RIM.r, 32).filter(function (p) { return front > 0 ? p[2] >= -0.01 : p[2] <= 0.01; });
    c.strokeStyle = '#ff5a14'; c.lineWidth = Math.max(3, cam.F / 140);
    var pp = pts.map(proj).filter(Boolean);
    c.beginPath(); pp.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.stroke();
  }
  function drawRack(c, p, side, rack, active, princess, si) {
    var a = vadd(p, vmul(side, -0.5)), b = vadd(p, vmul(side, 0.5));
    c.strokeStyle = active ? '#ffd54d' : '#8a93b5'; c.lineWidth = Math.max(2, cam.F / 300);
    line3(c, [[a[0], 0, a[2]], [a[0], 0.9, a[2]], [b[0], 0.9, b[2]], [b[0], 0, b[2]]]);
    line3(c, [[a[0], 0.5, a[2]], [b[0], 0.5, b[2]]]);
    if (!rack) return;
    for (var i = 0; i < 5; i++) {
      if (rack.left <= i) continue;
      var k = (i + 0.5) / 5, bp = [lerp(a[0], b[0], k), 0.9 + BALL_R, lerp(a[2], b[2], k)];
      drawBall(c, bp, i, rack.money || i === 4, princess);
    }
  }
  function drawBall(c, p, rot, money, princess) {
    var q = proj(p); if (!q) return;
    var r = BALL_R * cam.F / q[2]; if (r < 0.5) return;
    // sombra en el piso
    var sp = proj([p[0], 0.001, p[2]]);
    if (sp) { c.fillStyle = 'rgba(0,0,0,' + Math.max(0.05, 0.35 - p[1] * 0.05) + ')'; ell(c, sp[0], sp[1], r * 1.0, r * 0.35); c.fill(); }
    c.save(); c.translate(q[0], q[1]); c.rotate(rot);
    if (money) {
      var cols = princess ? ['#ff4d6d', '#ff9f1c', '#ffe14d', '#3cd070', '#3fa7ff', '#9b5cff'] : ['#d6213a', '#ffffff', '#1d4fbf', '#ffffff', '#d6213a', '#1d4fbf'];
      for (var i = 0; i < 6; i++) { c.fillStyle = cols[i]; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r, i * Math.PI / 3, (i + 1) * Math.PI / 3); c.closePath(); c.fill(); }
    } else {
      var g = c.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
      g.addColorStop(0, '#ffa04a'); g.addColorStop(1, '#d4570f'); c.fillStyle = g; ell(c, 0, 0, r, r); c.fill();
    }
    c.strokeStyle = 'rgba(20,10,5,.75)'; c.lineWidth = Math.max(1, r * 0.09);
    c.beginPath(); c.moveTo(-r, 0); c.lineTo(r, 0); c.moveTo(0, -r); c.lineTo(0, r); c.stroke();
    c.beginPath(); c.arc(-r * 1.35, 0, r * 0.95, -0.85, 0.85); c.stroke(); c.beginPath(); c.arc(r * 1.35, 0, r * 0.95, Math.PI - 0.85, Math.PI + 0.85); c.stroke();
    c.restore();
    c.fillStyle = 'rgba(255,255,255,.25)'; ell(c, q[0] - r * 0.35, q[1] - r * 0.4, r * 0.3, r * 0.18, -0.6); c.fill();
  }
  C.drawBall = drawBall;

  function drawShooter(c, sh, t, princess) {
    var q = proj(sh.pos); if (!q) return;
    var u = 0.2 * cam.F / q[2]; // 1 u ≈ 20 cm
    var pose = sh.pose;
    drawPlayer(c, sh.look, { x: q[0], y: q[1], u: u, view: 'back', pose: pose, t: t, princess: princess });
    // pelota en la mano (si la tiene)
    if (sh.hasBall && pose && pose.ball) {
      var B = bodyOf(sh.look);
      var bx = q[0] + pose.ball[0] * u, by = q[1] - (pose.ball[1] + (pose.jump || 0)) * u;
      var r = BALL_R * cam.F / q[2] * 1.15;
      // la dibujamos de frente con la misma función, en pantalla
      c.save(); c.translate(bx, by);
      var pseudo = { p: null };
      c.restore();
      drawBallScreen(c, bx, by, r, t * 0.5, sh.money, princess);
      sh.ballScreen = [bx, by, r];
    }
  }
  function drawBallScreen(c, x, y, r, rot, money, princess, fire) {
    var BI = window.BALL_IMGS || {}, key = fire ? 'pelota_fuego' : money ? (princess ? 'pelota_arcoiris' : 'pelota_money') : 'pelota';
    if (BI[key]) {
      c.save(); c.translate(x, y);
      if (fire) { c.drawImage(BI[key], -r * 2.2, -r * 1.1, r * 2.2 * 1.2, r * 2.2 * 1.2 * BI[key].height / BI[key].width); c.restore(); return; }
      c.rotate(rot); var s = r * 2.15; c.drawImage(BI[key], -s / 2, -s / 2, s, s); c.restore(); return;
    }
    c.save(); c.translate(x, y); c.rotate(rot);
    if (money) {
      var cols = princess ? ['#ff4d6d', '#ff9f1c', '#ffe14d', '#3cd070', '#3fa7ff', '#9b5cff'] : ['#d6213a', '#ffffff', '#1d4fbf', '#ffffff', '#d6213a', '#1d4fbf'];
      for (var i = 0; i < 6; i++) { c.fillStyle = cols[i]; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r, i * Math.PI / 3, (i + 1) * Math.PI / 3); c.closePath(); c.fill(); }
    } else { var g = c.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r); g.addColorStop(0, '#ffa04a'); g.addColorStop(1, '#d4570f'); c.fillStyle = g; ell(c, 0, 0, r, r); c.fill(); }
    c.strokeStyle = 'rgba(20,10,5,.75)'; c.lineWidth = Math.max(1, r * 0.09);
    c.beginPath(); c.moveTo(-r, 0); c.lineTo(r, 0); c.moveTo(0, -r); c.lineTo(0, r); c.stroke();
    c.beginPath(); c.arc(-r * 1.35, 0, r * 0.95, -0.85, 0.85); c.stroke(); c.beginPath(); c.arc(r * 1.35, 0, r * 0.95, Math.PI - 0.85, Math.PI + 0.85); c.stroke();
    c.restore();
  }
  C.drawBallScreen = drawBallScreen;

  /* Convierte un punto de pantalla del tirador a mundo (aprox.) para soltar la pelota desde la mano */
  C.handWorld = function (sh) {
    if (window.T3 && window.T3.ready && window.T3.handWorld) { var hw = window.T3.handWorld(); if (hw) return hw; }
    var B = bodyOf(sh.look), s = sh.pos, dir = vnorm([-s[0], 0, -s[2]]);
    var hgt = (sh.look.height / 100) * 1.2 + 0.25 + (sh.pose && sh.pose.jump ? sh.pose.jump * 0.2 : 0);
    return vadd(vadd(s, vmul(dir, 0.25)), [0, hgt, 0]);
  };

  /* Simulación rápida (para la compu y para las pruebas): ¿entra con estos errores? */
  C.simulate = function (o) {
    var save = ball, ev = events, res = null;
    C.launch(o, { done: function (b) { res = b; } });
    for (var i = 0; i < 2000 && !res; i++) stepBall(1 / 120);
    var out = res || ball; ball = save; events = ev;
    return { made: !!out.made, swish: !!out.swish, rim: out.touched, board: out.board };
  };
  return C;
})();
