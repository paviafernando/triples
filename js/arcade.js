/* Triples — motor 2D estilo arcade (vista lateral tipo NBA Jam) con los dibujos de assets/arcade */
'use strict';
var Arcade = (function () {
  var A = { ready: false, imgs: {}, meta: null };
  var BASE = '/assets/arcade/';
  var fire = [], flash = 0, shake = 0, netKickPrev = 0;

  A.has = function (id) { return !!(A.meta && A.meta[id] && A.imgs[id + '1']); };
  A.load = function () {
    var x = new XMLHttpRequest(); x.open('GET', BASE + 'meta.json');
    x.onload = function () {
      try { A.meta = JSON.parse(x.responseText); } catch (e) { return; }
      var list = [['bg', 'cancha.webp'], ['net', 'red.webp']], pending = 0;
      Object.keys(A.meta).forEach(function (id) { if (id[0] !== '_') for (var i = 1; i <= 6; i++) list.push([id + i, id + '/' + i + '.webp']); });
      pending = list.length;
      list.forEach(function (it) {
        var im = new Image(); im.onload = function () { A.imgs[it[0]] = im; if (--pending === 0) done(); }; im.onerror = function () { if (--pending === 0) done(); }; im.src = BASE + it[1];
      });
    };
    x.send();
    function done() { A.ready = !!A.imgs.bg; document.dispatchEvent(new Event('arcadeready')); }
  };

  /* ---------- mundo (física) → fondo (px de la imagen 1920x1072) ---------- */
  function W2B(p) {
    var bg = A.meta._bg, ppm = (bg.floorY - bg.rim[1]) / 3.05;
    var d = p[0], sc = 1 + d * 0.035;       // d > 0: más cerca de la cámara
    var yy = p[1] <= 3.05 ? p[1] : 3.05 + (p[1] - 3.05) * 0.5; // el arco del tiro se achica arriba para que entre en pantalla
    return { x: bg.rim[0] - p[2] * ppm * 0.86 * sc, y: bg.floorY + d * 16 - yy * ppm * sc, s: sc, ppm: ppm };
  }
  A.W2B = W2B;
  var cam = { x: 960, s: 1, ox: 0, oy: 0 };
  function B2S(b) { return { x: (b.x - cam.ox) * cam.s, y: (b.y - cam.oy) * cam.s }; }

  /* ---------- dibujo ---------- */
  function frameFor(G, now) {
    var ph = G.phase;
    if (ph === 'set') return 2;
    if (ph === 'shoot') return 3;
    if (ph === 'flight') return (G.shootT || 0) < 0.12 ? 3 : 4;
    if (ph === 'result') { if ((G.shootT || 0) < 0.6) return 4; return G.lastMade ? 1 : 5; }
    return 1;
  }
  function drawSprite(c, id, f, fx, fy, k, flip, alpha) {
    var im = A.imgs[id + f], fr = A.meta[id][f - 1]; if (!im) return null;
    var w = fr.w * k, h = fr.h * k, x = fx + fr.dx * k, y = fy + fr.dy * k;
    c.save(); if (alpha != null) c.globalAlpha = alpha;
    c.drawImage(im, x, y, w, h); c.restore();
    return { x: x, y: y, w: w, h: h };
  }
  A.render = function (c, w, h, G, P, t, dt) {
    if (!A.ready || !P.star || !A.has(P.star.id)) return false;
    var bg = A.meta._bg, id = P.star.id;
    // cámara: el fondo cubre la pantalla; en vertical sigue al tirador y al aro
    var portrait = w < h * 1.2;
    cam.s = portrait ? h * 0.8 / bg.h : Math.max(w / bg.w, h / bg.h);
    var viewW = w / cam.s, viewH = h / cam.s;
    var sp = Court.spotPos(G.spot, G.diff), pPos = sp;
    if (G.phase === 'moving' && G.prevSpot != null && G.prevSpot !== G.spot) {
      var a = Court.spotPos(G.prevSpot, G.diff), k0 = Court.camProgress ? Court.camProgress() : 1;
      pPos = [lerp(a[0], sp[0], k0), 0, lerp(a[2], sp[2], k0)];
    }
    var pb = W2B(pPos);
    var bl = Court.ball(), tgt;
    if (viewW >= bg.w * 0.98) tgt = bg.w / 2;
    else if (bl && (G.phase === 'flight' || G.phase === 'result')) tgt = G.phase === 'result' && G.lastMade ? bg.rim[0] - 80 : W2B(bl.p).x;
    else tgt = pb.x + viewW * 0.28;
    if (cam.fx == null || G.phase === 'intro') cam.fx = tgt;
    cam.fx += (tgt - cam.fx) * Math.min(1, dt * (G.phase === 'flight' ? 5 : 2.5));
    var focus = Math.min(bg.w - viewW / 2, Math.max(viewW / 2, cam.fx));
    cam.ox = focus - viewW / 2; cam.oy = viewH > bg.h ? bg.h - viewH : bg.h - viewH;
    if (viewH > bg.h) { c.fillStyle = '#12142f'; c.fillRect(0, 0, w, (viewH - bg.h) * cam.s + 2); }
    if (shake > 0) { cam.ox += (Math.random() - 0.5) * shake * 14; cam.oy += (Math.random() - 0.5) * shake * 10; shake = Math.max(0, shake - dt * 3); }
    c.drawImage(A.imgs.bg, -cam.ox * cam.s, -cam.oy * cam.s, bg.w * cam.s, bg.h * cam.s);
    var princess = document.body.classList.contains('princess');
    if (princess) { c.fillStyle = 'rgba(255,95,162,.16)'; c.fillRect(0, 0, w, h); }

    // racks
    for (var i = 0; i < 5; i++) {
      if (i !== G.spot || G.phase === 'moving') continue;
      var r = G.racks[i], left = i === G.spot ? Math.max(0, 5 - G.ball - (G.shooter.hasBall || G.phase === 'set' ? 1 : 0) - (G.phase === 'shoot' || G.phase === 'flight' || G.phase === 'result' ? 1 : 0)) : (r.res.length ? 0 : 5);
      var s5 = Court.spotPos(i, G.diff), rb = W2B([s5[0] - 0.9, 0, s5[2] + 0.75]), rs = B2S(rb), scl = rb.s * cam.s, rp = rb.ppm * scl;
      c.strokeStyle = 'rgba(200,210,235,.9)'; c.lineWidth = Math.max(2, 0.04 * rp); c.lineCap = 'round';
      var rw = 0.9 * rp, rh = 0.75 * rp;
      c.beginPath(); c.moveTo(rs.x - rw / 2, rs.y); c.lineTo(rs.x - rw / 2, rs.y - rh); c.lineTo(rs.x + rw / 2, rs.y - rh); c.lineTo(rs.x + rw / 2, rs.y); c.stroke();
      for (var bI = 0; bI < 5; bI++) { if (bI < 5 - left) continue; var money = r.money || bI === 0; Court.drawBallScreen(c, rs.x - rw / 2 + (bI + 0.5) * rw / 5, rs.y - rh - 0.12 * rp, 0.12 * rp, bI, money, princess); }
    }

    // tirador
    var f = frameFor(G), sc = pb.s * cam.s, ps = B2S(pb);
    var kSpr = (bg.floorY - bg.rim[1]) / 3.05 * 2.25 / 420 * sc * (P.look.height / 200);
    var jump = 0;
    if (G.phase === 'flight' || G.phase === 'shoot' || (G.phase === 'result' && (G.shootT || 0) < 0.6)) jump = Math.sin(Math.min(1, (G.shootT || 0) / 0.6) * Math.PI) * 0.45 * pb.ppm * sc;
    if (G.phase === 'moving') jump = Math.abs(Math.sin(t * 12)) * 0.12 * pb.ppm * sc;
    var bob = (G.phase === 'ready' || G.phase === 'pickup') ? Math.sin(t * 6) * 3 * sc : 0;
    // sombra
    c.fillStyle = 'rgba(0,0,0,' + (0.35 - Math.min(0.2, jump / (pb.ppm * sc) * 0.3)) + ')';
    c.beginPath(); c.ellipse(ps.x, ps.y, 120 * kSpr * (1 - Math.min(0.3, jump / 400)), 26 * kSpr, 0, 0, 7); c.fill();
    // pelota detrás de la red si está cerca del aro
    var b = Court.ball(), nearRim = b && Math.hypot(b.p[0], b.p[2]) < 0.5 && b.p[1] < RIM.y + 0.2 && b.p[1] > RIM.y - 0.9;
    var squash = G.phase === 'set' ? 1 : 1;
    var box = drawSprite(c, id, f, ps.x, ps.y - jump + bob, kSpr * squash);
    // pelota en vuelo
    var onFire = (P.streak || 0) >= 3;
    if (b && !G.shooter.hasBall && G.phase !== 'set' && !(G.phase === 'flight' && (G.shootT || 0) < 0.12)) {
      var bb = W2B(b.p), bs = B2S(bb), br = 0.12 * bb.ppm * bb.s * cam.s * 1.35;
      // sombra de la pelota
      var sh = B2S(W2B([b.p[0], 0, b.p[2]])); c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(sh.x, sh.y, br, br * 0.3, 0, 0, 7); c.fill();
      if (onFire) spawnFire(bs.x, bs.y, br);
      if (nearRim) { drawFire(c, dt); Court.drawBallScreen(c, bs.x, bs.y, br, b.rot, b.money, princess); drawNet(c, true); }
      else { drawNet(c, false); drawFire(c, dt); Court.drawBallScreen(c, bs.x, bs.y, br, b.rot, b.money, princess); }
    } else { drawNet(c, false); if (onFire && box && (f === 1 || f === 2 || f === 3)) spawnFire(box.x + box.w * (f === 3 ? 0.62 : 0.75), box.y + box.h * (f === 3 ? 0.08 : 0.55), 18 * cam.s); drawFire(c, dt); }
    // destello al embocar
    var nk = Court.netKick ? Court.netKick() : 0;
    if (nk > 0.95 && netKickPrev <= 0.95) { flash = 1; shake = 0.6; }
    netKickPrev = nk;
    if (flash > 0) { c.fillStyle = 'rgba(255,255,255,' + flash * 0.35 + ')'; c.fillRect(0, 0, w, h); flash = Math.max(0, flash - dt * 3); }
    G.shooter.ballScreen = box ? [box.x + box.w, box.y + box.h * 0.4, 20] : null;
    return true;
  };
  function drawNet(c, over) {
    var bg = A.meta._bg, n = bg.net, nk = Court.netKick ? Court.netKick() : 0;
    var s = B2S({ x: n.x, y: n.y });
    var stretch = 1 + nk * 0.28;
    c.drawImage(A.imgs.net, s.x, s.y, n.w * cam.s, n.h * cam.s * stretch);
  }
  function spawnFire(x, y, r) { for (var i = 0; i < 3; i++) fire.push({ x: x + (Math.random() - 0.5) * r, y: y + (Math.random() - 0.5) * r, vx: (Math.random() - 0.5) * 40, vy: -60 - Math.random() * 80, life: 0.45, max: 0.45, r: r * (0.6 + Math.random() * 0.5) }); if (fire.length > 160) fire.splice(0, fire.length - 160); }
  function drawFire(c, dt) {
    c.save(); c.globalCompositeOperation = 'lighter';
    for (var i = fire.length - 1; i >= 0; i--) {
      var p = fire[i]; p.life -= dt; if (p.life <= 0) { fire.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; var k = p.life / p.max, rr = p.r * (0.6 + (1 - k) * 0.8);
      var g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
      g.addColorStop(0, 'rgba(255,255,200,' + k + ')'); g.addColorStop(0.4, 'rgba(255,170,30,' + k * 0.8 + ')'); g.addColorStop(1, 'rgba(255,40,0,0)');
      c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, rr, 0, 7); c.fill();
    }
    c.restore();
  }
  function lerp(a, b, k) { return a + (b - a) * k; }

  /* ---------- festejo a pantalla completa ---------- */
  A.celeb = function (c, w, h, id, t) {
    if (!A.has(id)) return false;
    var pr = document.body.classList.contains('princess');
    if (A.imgs.bg) { var s = Math.max(w / 1920, h / 1072) * 1.15; c.drawImage(A.imgs.bg, (w - 1920 * s) / 2, (h - 1072 * s) / 2, 1920 * s, 1072 * s); }
    c.fillStyle = pr ? 'rgba(90,20,80,.55)' : 'rgba(5,8,30,.55)'; c.fillRect(0, 0, w, h);
    // rayos
    c.save(); c.translate(w / 2, h * 0.62); c.rotate(t * 0.4); c.fillStyle = pr ? 'rgba(255,190,230,.16)' : 'rgba(255,220,120,.13)';
    for (var i = 0; i < 14; i++) { c.rotate(Math.PI / 7); c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.max(w, h), -90); c.lineTo(Math.max(w, h), 90); c.fill(); }
    c.restore();
    var fr = A.meta[id][5], im = A.imgs[id + 6];
    var k = Math.min(h * 0.78 / fr.h, w * 0.85 / fr.w);
    var pop = t < 0.35 ? 0.4 + 1.8 * t - (t > 0.25 ? (t - 0.25) * 2.2 : 0) : 1 + Math.sin(t * 7) * 0.025;
    var wob = Math.sin(t * 5) * 0.04;
    c.save(); c.translate(w / 2, h * 0.97); c.rotate(wob); c.scale(k * pop, k * pop * (1 + Math.sin(t * 10) * 0.02));
    c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(0, -4, fr.w * 0.42, 22, 0, 0, 7); c.fill();
    c.drawImage(im, -fr.w / 2, -fr.h, fr.w, fr.h); c.restore();
    return true;
  };
  /* ---------- retrato (cara del cuadro de frente) ---------- */
  A.portrait = function (cv, id) {
    if (!A.has(id)) return false;
    var c = cv.getContext('2d'), w = cv.width, h = cv.height, im = A.imgs[id + 6], fr = A.meta[id][5];
    c.clearRect(0, 0, w, h); c.save(); c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, 7); c.clip();
    c.fillStyle = 'rgba(255,255,255,.16)'; c.fillRect(0, 0, w, h);
    // la cabeza ocupa ~45% de arriba del cuadro de frente
    var sw = fr.w * 0.62, sx = (fr.w - sw) / 2, sh = sw;
    var s2 = im.naturalWidth / fr.w;
    c.drawImage(im, sx * s2, 0, sw * s2, sh * s2, w * 0.04, h * 0.06, w * 0.92, h * 0.92);
    c.restore(); return true;
  };
  return A;
})();
Arcade.load();
