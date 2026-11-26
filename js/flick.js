/* Triples — gesto de tiro "flick" (estilo Football Strike / Worms):
   la fuerza sale de la velocidad del dedo + el largo del gesto; la dirección, del final del movimiento.
   Dibuja una estela que se afina, un anillo de potencia en vivo y chispas al soltar. */
'use strict';
function Flick(opts) {
  this.o = opts || {};
  this.pts = []; this.active = false; this.power = 0; this.peak = 0; this.vy = 0; this.vx = 0;
  this.ghost = []; this.sparks = []; this.lastTick = 0; this.ball = null; this.res = null; this.relT = -9;
}
Flick.IDEAL_D = 0.28;   // largo ideal (fracción del alto de pantalla)
Flick.IDEAL_V = 1.9;    // velocidad ideal (altos de pantalla por segundo)
Flick.prototype.start = function (x, y, H) {
  var now = performance.now() / 1000;
  this.H = H; this.x0 = x; this.y0 = y; this.active = true; this.pts = [{ x: x, y: y, t: now }];
  this.power = 0; this.peak = 0; this.vx = 0; this.vy = 0; this.res = null; this.ticks = {};
  this.ball = { x: x, y: y, vx: 0, vy: 0, sx: 1, sy: 1 };
};
Flick.prototype.move = function (x, y) {
  if (!this.active) return;
  var now = performance.now() / 1000, p = this.pts[this.pts.length - 1], dt = Math.max(0.004, now - p.t);
  var ivx = (x - p.x) / this.H / dt, ivy = (p.y - y) / this.H / dt;  // y hacia arriba positiva
  var k = Math.min(1, dt / 0.05);                                        // suavizado ~50 ms
  this.vx += (ivx - this.vx) * k; this.vy += (ivy - this.vy) * k;
  this.pts.push({ x: x, y: y, t: now, v: Math.hypot(ivx, ivy) });
  if (this.pts.length > 90) this.pts.shift();
  if (this.vy > this.peak) this.peak = this.vy;
  this.power = this.calc();
  // vibración suave al cruzar umbrales (como un "clic" de carga)
  var th = [0.5, 0.88, 1.15], self = this;
  th.forEach(function (v, i) { if (self.power >= v && !self.ticks[i]) { self.ticks[i] = 1; try { navigator.vibrate && navigator.vibrate(i === 2 ? 25 : 8); } catch (e) {} } });
};
Flick.prototype.calc = function () {
  var last = this.pts[this.pts.length - 1], d = Math.max(0, (this.y0 - last.y) / this.H);
  // velocidad reciente (últimos 110 ms): mezcla de la actual y el pico, así un latigazo corto también vale
  var now = last.t, sp = 0, n = 0;
  for (var i = this.pts.length - 1; i > 0 && now - this.pts[i].t < 0.11; i--) { sp += (this.pts[i - 1].y - this.pts[i].y) / this.H / Math.max(0.004, this.pts[i].t - this.pts[i - 1].t); n++; }
  sp = n ? sp / n : 0;
  var v = Math.max(sp, this.peak * 0.85);
  return 0.42 * Math.min(2.2, d / Flick.IDEAL_D) + 0.58 * Math.min(2.2, v / Flick.IDEAL_V);
};
/* Termina el gesto: devuelve {pe, ae, power} o null si fue muy corto */
Flick.prototype.end = function () {
  if (!this.active) return null; this.active = false;
  var last = this.pts[this.pts.length - 1], d = (this.y0 - last.y) / this.H;
  this.ghost = this.pts.slice(); this.relT = performance.now() / 1000;
  if (d < 0.05 || this.pts.length < 3) { this.res = null; return null; }
  var pw = this.calc();
  // dirección: 60 % el final del gesto, 40 % el total
  var a = this.pts[Math.max(0, this.pts.length - 6)], devEnd = Math.atan2(last.x - a.x, a.y - last.y), devAll = Math.atan2(last.x - this.x0, this.y0 - last.y);
  var dev = (devEnd * 0.6 + devAll * 0.4) * 180 / Math.PI;
  for (var i = 0; i < 26; i++) { var an = Math.random() * Math.PI * 2, s = 120 + Math.random() * 380; this.sparks.push({ x: last.x, y: last.y, vx: Math.cos(an) * s + this.vx * this.H * 0.15, vy: Math.sin(an) * s - this.vy * this.H * 0.2, life: 0.5 + Math.random() * 0.3, max: 0.8 }); }
  if (this.ball) { this.ball.vx = this.vx * this.H * 0.6; this.ball.vy = -Math.max(0.8, this.vy) * this.H * 0.9; this.ball.fly = true; }
  var vEnd = Math.max(0, this.vy), early = 0, ne = 0;
  for (var j = this.pts.length - 1; j > 0; j--) { var age = last.t - this.pts[j].t; if (age > 0.12 && age < 0.3) { early += (this.pts[j - 1].y - this.pts[j].y) / this.H / Math.max(0.004, this.pts[j].t - this.pts[j - 1].t); ne++; } }
  early = ne ? early / ne : vEnd;
  var snap = Math.max(0, Math.min(2, (vEnd - early) / Flick.IDEAL_V));           // aceleró al final = golpe de muñeca
  var curve = Math.abs(devEnd - devAll) * 180 / Math.PI;                       // trazo curvo
  var spin = -(3 + Math.min(2.4, vEnd / Flick.IDEAL_V) * 7 + snap * 6 + Math.min(30, curve) * 0.15);
  this.res = { power: pw, pe: (pw - 1) * 0.07, ae: dev * 0.12, spin: Math.max(-26, spin), rot: this.ball ? this.ball.rot || 0 : 0 };
  return this.res;
};
Flick.prototype.cancel = function () { this.active = false; this.pts = []; this.ghost = []; };
Flick.prototype.preview = function () { return this.active && this.pts.length > 2 ? { pe: (this.power - 1) * 0.07, power: this.power } : null; };

/* ---------- dibujo ---------- */
// opts: {ballX, ballY, r, fire, drawBall(ctx,x,y,r), zone:[min,max]}
Flick.prototype.draw = function (c, dt, o) {
  var now = performance.now() / 1000, fire = o.fire;
  // pelota "de mano": sigue al dedo con un resorte, se estira con la velocidad y sale volando al soltar
  var b = this.ball, r = o.r;
  if (!b) { b = { x: o.ballX, y: o.ballY }; }
  if (this.active) {
    var last = this.pts[this.pts.length - 1];
    b.x += (last.x - b.x) * Math.min(1, dt * 18); b.y += (last.y - b.y) * Math.min(1, dt * 18);
    var sp = Math.min(1, Math.hypot(this.vx, this.vy) / 4);
    b.sy = 1 + sp * 0.35; b.sx = 1 - sp * 0.2;
    b.rot = (b.rot || 0) - (this.vy * 9 + this.vx * 5) * dt; // rueda con el dedo
  } else if (b.fly) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.vy += this.H * 0.4 * dt; b.rot = (b.rot || 0) + (this.res ? this.res.spin : -10) * dt; b.sx = b.sy = Math.max(0, 1 - (now - this.relT) * 2.2);
    if (b.sx <= 0) { b.fly = false; this.ball = null; b = null; }
  } else { b = { x: o.ballX, y: o.ballY, sx: 1 + Math.sin(now * 5) * 0.03, sy: 1 - Math.sin(now * 5) * 0.03 }; }

  // estela: cinta que se afina, con brillo; la cola se desvanece por edad
  var trail = this.active ? this.pts : this.ghost, life = this.active ? 0.28 : Math.max(0, 0.28 - (now - this.relT));
  if (trail.length > 1 && life > 0) {
    var seg = [];
    for (var i = 0; i < trail.length; i++) { var age = (this.active ? now : this.relT) - trail[i].t; if (age < 0.28) seg.push(trail[i]); }
    if (!this.active) { var cut = Math.floor(seg.length * Math.min(1, (now - this.relT) / 0.28)); seg = seg.slice(cut); }
    if (seg.length > 1) {
      var W = r * 1.15;
      c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
      for (var pass = 0; pass < 2; pass++) {
        for (var j = 1; j < seg.length; j++) {
          var k = j / (seg.length - 1), p0 = seg[j - 1], p1 = seg[j], vel = Math.min(1, (p1.v || 0) / 4);
          var wd = W * (0.15 + 0.85 * k) * (0.7 + vel * 0.5);
          c.globalAlpha = (0.25 + 0.75 * k) * (this.active ? 1 : life / 0.28);
          if (pass === 0) { c.strokeStyle = fire ? 'rgba(255,90,0,.55)' : 'rgba(80,200,255,.45)'; c.lineWidth = wd * 2.1; c.shadowColor = fire ? '#ff6a00' : '#5fd0ff'; c.shadowBlur = 18; }
          else { c.strokeStyle = fire ? '#ffe08a' : '#ffffff'; c.lineWidth = wd * 0.8; c.shadowBlur = 0; }
          c.beginPath(); c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y); c.stroke();
        }
      }
      c.restore();
    }
  }
  // anillo de potencia alrededor del punto de inicio (como la barra de carga de Worms)
  if (this.active && this.pts.length > 1) {
    var R = r * 2.1, cx = this.x0, cy = this.y0, pw = Math.min(2, this.power), z = o.zone || [0.9, 1.1];
    var a0 = Math.PI * 0.75, span = Math.PI * 1.5, ang = function (v) { return a0 + span * Math.min(1, v / 2); };
    c.save(); c.lineCap = 'round';
    c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = r * 0.55; c.beginPath(); c.arc(cx, cy, R, a0, a0 + span); c.stroke();
    c.strokeStyle = 'rgba(60,220,120,.55)'; c.lineWidth = r * 0.55; c.beginPath(); c.arc(cx, cy, R, ang(z[0]), ang(z[1])); c.stroke();
    var good = pw >= z[0] && pw <= z[1], col = good ? '#3cff8a' : pw < z[0] ? '#ffd23f' : '#ff4d4d';
    c.strokeStyle = col; c.lineWidth = r * 0.34; c.shadowColor = col; c.shadowBlur = good ? 22 : 8;
    c.beginPath(); c.arc(cx, cy, R, a0, ang(pw)); c.stroke();
    // punta brillante
    var ea = ang(pw); c.fillStyle = '#fff'; c.beginPath(); c.arc(cx + Math.cos(ea) * R, cy + Math.sin(ea) * R, r * 0.22, 0, 7); c.fill();
    c.shadowBlur = 0; c.font = '900 ' + Math.round(r * 0.75) + 'px Impact, "Arial Black", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = col; c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 4;
    var lbl = pw < 0.35 ? '' : good ? '¡JUSTO!' : pw < z[0] ? 'MÁS' : '¡FUERTE!';
    if (lbl) { var ly = cy - R - r * 0.9; c.strokeText(lbl, cx, ly); c.fillText(lbl, cx, ly); }
    c.restore();
  }
  // chispas al soltar
  for (var s = this.sparks.length - 1; s >= 0; s--) {
    var q = this.sparks[s]; q.life -= dt; if (q.life <= 0) { this.sparks.splice(s, 1); continue; }
    q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 600 * dt; q.vx *= 0.96;
    var kk = q.life / q.max; c.fillStyle = fire ? 'rgba(255,' + (120 + 120 * kk | 0) + ',40,' + kk + ')' : 'rgba(255,255,' + (180 + 70 * kk | 0) + ',' + kk + ')';
    c.beginPath(); c.arc(q.x, q.y, Math.max(0.5, r * 0.12 * kk), 0, 7); c.fill();
  }
  // pelota
  if (b && o.drawBall) { c.save(); c.translate(b.x, b.y); c.rotate(this.active ? Math.atan2(this.vx, this.vy) * 0.5 : 0); c.scale(b.sx || 1, b.sy || 1); c.rotate(b.rot || 0); o.drawBall(c, 0, 0, r); c.restore(); }
};
Flick.prototype.busy = function () { return this.active || this.sparks.length > 0 || (this.ball && this.ball.fly) || (performance.now() / 1000 - this.relT) < 0.3; };
