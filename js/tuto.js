/* Triples — tutoriales animados de cada forma de tirar + gráficos en vivo de la calibración */
'use strict';
var Tuto = (function () {
  var U = {}, imgs = {};
  ['deslizar', 'simulacion', 'medidor', 't_mano', 't_gomera', 't_celu', 't_celu_tiro', 't_control'].forEach(function (k) { var im = new Image(); im.onload = function () { imgs[k] = im; }; im.src = '/assets/ui/' + k + '.webp'; });
  var demos = { pull: new Pull(), swipe: new Flick() }, st = {};
  var lerp = function (a, b, k) { return a + (b - a) * k; };
  var ease = function (k) { return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; };
  function ball(c, x, y, r, rot) { Court.drawBallScreen(c, x, y, r, rot || 0, false, false); }
  function hoop(c, x, y, s) {
    c.save(); c.strokeStyle = '#ff5a14'; c.lineWidth = s * 0.08; c.beginPath(); c.ellipse(x, y, s * 0.55, s * 0.14, 0, 0, 7); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 2;
    for (var i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(x + i * s * 0.16, y + 4); c.lineTo(x + i * s * 0.09, y + s * 0.7); c.stroke(); }
    c.fillStyle = 'rgba(210,235,255,.25)'; c.strokeStyle = '#fff'; c.lineWidth = 3; c.fillRect(x + s * 0.55, y - s * 1.1, s * 0.12, s * 1.3); c.strokeRect(x + s * 0.55, y - s * 1.1, s * 0.12, s * 1.3);
    c.restore();
  }
  function label(c, txt, x, y, size, col) { c.save(); c.font = '900 ' + size + 'px Impact, "Arial Black", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = size * 0.18; c.strokeStyle = 'rgba(0,0,0,.7)'; c.fillStyle = col || '#ffd23f'; if (window.T) txt = T(txt); c.strokeText(txt, x, y); c.fillText(txt, x, y); c.restore(); }
  function flight(c, k, x0, y0, x1, y1, r) { // pelota volando al aro
    var x = lerp(x0, x1, k), y = lerp(y0, y1, k) - Math.sin(k * Math.PI) * (y0 - y1 + r * 6) * 0.9;
    ball(c, x, y, r * lerp(1, 0.6, k), k * 12);
  }
  /* mode: pull | swipe | meter | sim — dibuja una demo en loop (t en segundos) */
  U.demo = function (c, w, h, mode, t) {
    c.clearRect(0, 0, w, h);
    var g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1d1650'); g.addColorStop(1, '#3a1d63'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    var r = Math.min(w, h) * 0.06, hx = w * 0.78, hy = h * 0.24, bx = w * 0.38, by = h * 0.68;
    hoop(c, hx, hy, r * 3);
    var L = 3.6, k = (t % L) / L, T0 = t % L;
    if (mode === 'pull') {
      var P = demos.pull, start = 0.35, pullEnd = 1.5, rel = 1.75;
      if (T0 < start) { st.pull = 0; P.cancel(); P.draw(c, 1 / 60, { ballX: bx, ballY: by, r: r, drawBall: function (cc, x, y, rr) { ball(cc, x, y, rr); } }); hand(c, bx, by + r * 0.4 + (1 - T0 / start) * r * 3, r); }
      else if (T0 < rel) {
        if (!st.pull) { P.start(bx, by, h); st.pull = 1; }
        var e = ease(Math.min(1, (T0 - start) / (pullEnd - start))), fx = bx + e * r * 0.9, fy = by + e * h * 0.22;
        P.move(fx, fy); P.draw(c, 1 / 60, { ballX: bx, ballY: by, r: r, zone: [0.88, 1.12], drawBall: function (cc, x, y, rr) { ball(cc, x, y, rr); } }); hand(c, fx, fy + r * 0.5, r);
        if (T0 > pullEnd) label(c, '¡Soltá!', w / 2, h * 0.12, r * 1.5, '#3cff8a');
      } else {
        if (st.pull === 1) { P.end(); st.pull = 2; }
        P.draw(c, 1 / 60, { ballX: bx, ballY: by, r: r, drawBall: function () {} });
        var kk = Math.min(1, (T0 - rel) / 1.2); flight(c, kk, bx, by, hx, hy, r); if (kk >= 1) label(c, '¡ADENTRO!', w / 2, h * 0.12, r * 1.5);
      }
      badge(c, imgs.t_gomera, w * 0.1, h * 0.14, r * 2.4);
      label(c, 'estirá hacia abajo', w * 0.5, h * 0.92, r * 1.05, '#fff');
    } else if (mode === 'swipe') {
      var F = demos.swipe, s0 = 0.5, s1 = 0.72;
      if (T0 < s0) { st.sw = 0; F.cancel(); F.draw(c, 1 / 60, { ballX: bx, ballY: by, r: r, drawBall: function (cc, x, y, rr) { ball(cc, x, y, rr); } }); hand(c, bx, by + r * 0.4, r); }
      else if (T0 < s1) {
        if (!st.sw) { F.start(bx, by, h); st.sw = 1; }
        var e2 = (T0 - s0) / (s1 - s0), fy2 = by - e2 * e2 * h * 0.34, fx2 = bx + e2 * r * 0.6;
        F.move(fx2, fy2); F.draw(c, 1 / 60, { ballX: bx, ballY: by, r: r, zone: [0.88, 1.12], drawBall: function (cc, x, y, rr) { ball(cc, x, y, rr); } }); hand(c, fx2, fy2 + r * 0.4, r);
      } else {
        if (st.sw === 1) { F.end(); st.sw = 2; }
        F.draw(c, 1 / 60, { ballX: bx, ballY: by, r: r, drawBall: function () {} });
        var k3 = Math.min(1, (T0 - s1) / 1.2); flight(c, k3, bx, by - h * 0.3, hx, hy, r); if (k3 >= 1) label(c, '¡ADENTRO!', w / 2, h * 0.12, r * 1.5);
      }
      label(c, 'latigazo rápido hacia arriba', w * 0.5, h * 0.92, r * 1.05, '#fff');
    } else if (mode === 'meter') {
      var mx = w * 0.12, my = h * 0.2, mh = h * 0.6, mw = r * 0.8, press1 = 0.4, press2 = 1.2;
      c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
      c.fillStyle = 'rgba(60,220,120,.8)'; c.fillRect(mx, my + mh * 0.18, mw, mh * 0.12);
      var fill = T0 < press1 ? 0 : Math.min(1, (T0 - press1) / (press2 - press1)) * 0.78;
      c.fillStyle = fill > 0.7 ? '#3cff8a' : '#ffd23f'; c.fillRect(mx, my + mh * (1 - fill), mw, mh * fill);
      var down = (T0 > press1 && T0 < press1 + 0.15) || (T0 > press2 && T0 < press2 + 0.15);
      key0(c, mx + mw + r * 1.6, h * 0.62, r, down);
      if (T0 < press2) ball(c, bx + r, by, r); else { var k4 = Math.min(1, (T0 - press2) / 1.2); flight(c, k4, bx + r, by, hx, hy, r); if (k4 >= 1) label(c, '¡ADENTRO!', w / 2, h * 0.12, r * 1.5); }
      label(c, T0 < press2 ? (T0 < press1 ? 'apretá 0' : 'soltá en lo verde') : '¡justo!', w * 0.55, h * 0.92, r * 1.05, '#fff');
    } else if (mode === 'sim') {
      var sx = w * 0.3, a0 = 0.7, a1 = 1.6, a2 = 1.85, py;
      var low = h * 0.78, mid = h * 0.42, high = h * 0.2;
      if (T0 < a0) py = lerp(low, mid, ease(T0 / a0)); else if (T0 < a1) py = mid; else if (T0 < a2) py = lerp(mid, high, (T0 - a1) / (a2 - a1)); else py = high + (T0 - a2) * 10;
      var tilt = T0 < a1 ? 0 : Math.min(0.6, (T0 - a1) * 3);
      if (T0 > a0 && T0 < a1) { c.save(); c.strokeStyle = 'rgba(60,255,138,' + (0.5 + 0.5 * Math.sin(T0 * 30)) + ')'; c.lineWidth = 4; c.beginPath(); c.arc(sx, py, r * 2.2, 0, 7); c.stroke(); c.restore(); label(c, 'quieto… ¡bzz!', w * 0.5, h * 0.12, r * 1.2, '#3cff8a'); }
      if (T0 > a1 && T0 < a2 + 0.2) { c.save(); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 3; for (var i = 0; i < 3; i++) { c.beginPath(); c.moveTo(sx - r * 1.5 + i * r, py + r * 2); c.lineTo(sx - r * 1.5 + i * r, py + r * 3.5); c.stroke(); } c.restore(); }
      var phim = (T0 > a1 ? imgs.t_celu_tiro : imgs.t_celu) || imgs.simulacion;
      if (phim && py < h + r * 3) { c.save(); c.translate(sx, py); c.rotate(-tilt); var sh = r * 4, sw = sh * phim.width / phim.height; c.drawImage(phim, -sw / 2, -sh / 2, sw, sh); c.restore(); }
      if (T0 > a2) { var k5 = Math.min(1, (T0 - a2) / 1.2); flight(c, k5, sx, high, hx, hy, r); if (k5 >= 1) label(c, '¡ADENTRO!', w / 2, h * 0.12, r * 1.5); }
      label(c, T0 < a0 ? 'subí el celu a la frente' : T0 < a1 ? 'quedate quieto' : '¡tirá como una pelota!', w * 0.6, h * 0.92, r * 1.05, '#fff');
    }
  };
  function hand(c, x, y, r) {
    var im = imgs.t_mano;
    if (im) { var hh = r * 3.6, ww = hh * im.width / im.height; c.save(); c.translate(x, y - r * 0.3); c.rotate(Math.PI); c.drawImage(im, -ww * 0.49, -hh * 0.99, ww, hh); c.restore(); return; }
    if (!imgs.deslizar) return; var s = r * 3; c.save(); c.globalAlpha = 0.95; c.drawImage(imgs.deslizar, x - s * 0.55, y - s * 0.15, s, s); c.restore();
  }
  function badge(c, im, x, y, sz) { if (!im) return; var hh = sz, ww = hh * im.width / im.height; c.save(); c.globalAlpha = 0.9; c.drawImage(im, x - ww / 2, y - hh / 2, ww, hh); c.restore(); }
  function key0(c, x, y, r, down) {
    var im = imgs.t_control;
    if (im) { var hh = r * 5, ww = hh * im.width / im.height; c.save(); c.translate(x, y + (down ? 3 : 0)); if (down) { c.shadowColor = '#ffd23f'; c.shadowBlur = 25; } c.drawImage(im, -ww / 2, -hh / 2, ww, hh); c.restore(); return; }
    c.save(); c.translate(x, y + (down ? 3 : 0)); c.fillStyle = down ? '#c9a000' : '#ffd23f'; c.strokeStyle = '#2b1600'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, r * 1.1, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#2b1600'; c.font = '900 ' + r * 1.2 + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('0', 0, 2); c.restore(); }

  /* Gráficos en vivo de la calibración: nivel de burbuja (inclinación vs posición guardada), barra de movimiento y progreso */
  U.gauge = function (c, w, h, L, step, prog) {
    c.clearRect(0, 0, w, h);
    var cx = w * 0.3, cy = h * 0.5, R = Math.min(w * 0.26, h * 0.42);
    // nivel
    c.save(); c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fill();
    var lim = 32; c.strokeStyle = 'rgba(60,255,138,.7)'; c.lineWidth = 4; c.beginPath(); c.arc(cx, cy, R * 0.35, 0, 7); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.2)'; c.beginPath(); c.moveTo(cx - R, cy); c.lineTo(cx + R, cy); c.moveTo(cx, cy - R); c.lineTo(cx, cy + R); c.stroke();
    var ang = L.ang || 0, dir = L.dir || 0, d = Math.min(1, ang / (lim / 0.35 * 1.2)) * R;
    var ok = L.ok || step === 1 && L.lin < 1.3 && L.rot < 45;
    c.fillStyle = ok ? '#3cff8a' : '#ffd23f'; c.shadowColor = c.fillStyle; c.shadowBlur = 16;
    c.beginPath(); c.arc(cx + Math.cos(dir) * d, cy + Math.sin(dir) * d, R * 0.16, 0, 7); c.fill(); c.shadowBlur = 0;
    if (prog > 0) { c.strokeStyle = '#3cff8a'; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath(); c.arc(cx, cy, R + 8, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2); c.stroke(); }
    c.restore();
    label(c, step === 1 ? 'quietud' : 'posición', cx, cy + R + 22, 16, '#fff');
    // barra de movimiento (aceleración) y última velocidad
    var bx = w * 0.62, bw = w * 0.1, bh = h * 0.8, by = h * 0.1, lin = Math.min(1, (L.lin || 0) / 25), th = 6.5 / 25;
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(bx, by, bw, bh);
    c.fillStyle = lin > th ? '#ff9f1c' : '#3fa7ff'; c.fillRect(bx, by + bh * (1 - lin), bw, bh * lin);
    c.fillStyle = '#fff'; c.fillRect(bx - 6, by + bh * (1 - th), bw + 12, 3);
    label(c, 'movimiento', bx + bw / 2, by + bh + 22, 16, '#fff');
    var sp = Math.min(1, (L.sp || 0) / 5), sx = w * 0.82;
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(sx, by, bw, bh);
    c.fillStyle = '#3cff8a'; c.fillRect(sx, by + bh * (1 - sp), bw, bh * sp);
    label(c, 'fuerza', sx + bw / 2, by + bh + 22, 16, '#fff');
    if (L.st === 'armed') label(c, '¡LISTO! TIRÁ', w * 0.5, 22, 22, '#3cff8a');
  };
  return U;
})();
