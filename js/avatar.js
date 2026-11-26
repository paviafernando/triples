/* Triples — avatares cabezones (frente y espalda) y festejos animados */
'use strict';

function shade(hex, f) { // f>0 aclara, f<0 oscurece
  var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (f >= 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } else { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
  return 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')';
}
function rrect(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
}
function ell(c, x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot || 0, 0, Math.PI * 2); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

/* Medidas del cuerpo en unidades u (u ≈ 1/10 de un jugador de 2 m), origen en los pies, y hacia arriba */
function bodyOf(look) {
  var hr = look.height / 200;
  var bmi = look.weight / Math.pow(look.height / 100, 2);
  var g = clamp(0.78 + look.build * 0.11 + (bmi - 24) * 0.03, 0.72, 1.45);
  var B = { hr: hr, g: g, legs: 3.3 * hr, torso: 2.7 * hr, R: 1.5 };
  B.waist = B.legs + 0.15;
  B.sy = B.legs + B.torso;          // altura de hombros
  B.sw = (0.92 + look.build * 0.12) * (0.9 + 0.1 * hr) * (0.85 + 0.25 * (g - 0.8)); // medio ancho de hombros
  B.hy = B.sy + 0.25 + B.R * 0.82;  // centro de la cabeza
  B.L1 = 1.25 * Math.sqrt(hr); B.L2 = 1.2 * Math.sqrt(hr);
  B.armW = 0.34 * g; B.legW = 0.42 * g;
  var f = { redonda: [1, 1], ancha: [1.13, 0.95], larga: [0.9, 1.08], cuadrada: [1.06, 1] }[look.face] || [1, 1];
  B.fw = f[0]; B.fh = f[1];
  return B;
}

function standPose(B) {
  return { lh: [-(B.sw + 0.35), B.sy - 2.25], rh: [B.sw + 0.35, B.sy - 2.25], tilt: 0, jump: 0, crouch: 0, mouth: 'smile', eyes: 'open', lift: 0, shim: 0, lean: 0 };
}

/* IK de dos segmentos: devuelve el codo. side = -1 (izq. de pantalla) / 1 */
function ik(sx, sy, tx, ty, L1, L2, side, bendUp) {
  var dx = tx - sx, dy = ty - sy, d = Math.sqrt(dx * dx + dy * dy);
  d = clamp(d, 0.01, L1 + L2 - 0.001);
  var a = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  var phi = Math.atan2(dy, dx);
  // elegimos el lado del codo: hacia afuera
  var s = side * (bendUp ? 1 : -1);
  var e1 = [sx + L1 * Math.cos(phi + a), sy + L1 * Math.sin(phi + a)];
  var e2 = [sx + L1 * Math.cos(phi - a), sy + L1 * Math.sin(phi - a)];
  var pickE = (e1[0] - sx) * side > (e2[0] - sx) * side ? e1 : e2;
  if (Math.abs(e1[0] - e2[0]) < 0.05) pickE = (e1[1] < e2[1]) ? e1 : e2;
  if (s < 0 && bendUp === 'down') pickE = e1[1] < e2[1] ? e1 : e2;
  var hand = [sx + (tx - sx) * (d / Math.max(0.01, Math.sqrt(dx * dx + dy * dy))), sy + (ty - sy) * (d / Math.max(0.01, Math.sqrt(dx * dx + dy * dy)))];
  return { e: pickE, h: hand };
}

/* ======================= DIBUJO ======================= */
/* o: {x, y, u, view:'front'|'back', pose, t, princess, shadow} */
function drawPlayer(c, look, o) {
  var B = bodyOf(look), u = o.u, view = o.view || 'front';
  var P = o.pose || standPose(B);
  var kit = KIT_COLORS[look.kit % KIT_COLORS.length], skin = SKINS[look.skin], hairC = HAIR_COLORS[look.hairColor];
  var jy = (P.jump || 0), cr = (P.crouch || 0);
  var X = function (lx) { return o.x + lx * u; };
  var Y = function (ly) { return o.y - (ly + jy) * u; };
  var mir = view === 'back' ? -1 : 1; // en la espalda la mano derecha del jugador queda a la derecha de la pantalla

  // sombra en el piso
  if (o.shadow !== false) { c.fillStyle = 'rgba(0,0,0,' + (0.28 - Math.min(0.18, jy * 0.06)) + ')'; ell(c, o.x, o.y, (B.sw + 0.5) * u * (1 - jy * 0.08), 0.35 * u); c.fill(); }

  var hipY = B.legs - cr, shY = B.sy - cr + (P.lift || 0) * 0.35, shim = P.shim || 0, lean = P.lean || 0;
  var leg = function (side) {
    var hx = side * 0.36 * B.g, fx = side * (0.42 * B.g + (P.spread || 0));
    var kneeX = (hx + fx) / 2 + side * cr * 0.55, kneeY = hipY / 2 + cr * 0.15;
    c.strokeStyle = skin; c.lineWidth = B.legW * u; c.lineCap = 'round';
    c.beginPath(); c.moveTo(X(hx), Y(hipY)); c.lineTo(X(kneeX), Y(kneeY)); c.lineTo(X(fx), Y(0.35)); c.stroke();
    if (look.extra === 'rodilleras') { c.fillStyle = '#222'; ell(c, X(kneeX), Y(kneeY), B.legW * 0.62 * u, 0.32 * u); c.fill(); }
    // media + zapatilla
    c.strokeStyle = '#fff'; c.lineWidth = B.legW * 1.02 * u; c.beginPath(); c.moveTo(X(fx), Y(0.75)); c.lineTo(X(fx), Y(0.32)); c.stroke();
    var sc = SHOE_COLORS[look.shoes % SHOE_COLORS.length];
    c.fillStyle = sc; ell(c, X(fx + side * 0.08), Y(0.2), 0.42 * u, 0.24 * u); c.fill();
    c.fillStyle = shade(sc === '#ffffff' ? '#cccccc' : sc, -0.35); c.fillRect(X(fx - 0.38 + side * 0.08), Y(0.07), 0.76 * u, 0.08 * u);
  };
  leg(-1); leg(1);

  // short
  var sw = B.sw, ww = 0.62 * B.g + 0.1;
  c.fillStyle = kit[0];
  c.beginPath(); c.moveTo(X(-ww - 0.05), Y(B.waist - cr)); c.lineTo(X(ww + 0.05), Y(B.waist - cr));
  c.lineTo(X(ww + 0.22), Y(hipY - 1.05)); c.lineTo(X(0.06), Y(hipY - 1.0)); c.lineTo(X(0), Y(hipY - 0.55));
  c.lineTo(X(-0.06), Y(hipY - 1.0)); c.lineTo(X(-ww - 0.22), Y(hipY - 1.05)); c.closePath(); c.fill();
  c.strokeStyle = kit[1]; c.lineWidth = 0.1 * u; c.beginPath(); c.moveTo(X(ww + 0.08), Y(B.waist - cr - 0.1)); c.lineTo(X(ww + 0.2), Y(hipY - 1.0)); c.moveTo(X(-ww - 0.08), Y(B.waist - cr - 0.1)); c.lineTo(X(-ww - 0.2), Y(hipY - 1.0)); c.stroke();

  // brazos (detrás o delante según la pose); primero el torso
  var sL = [-sw + shim, shY - 0.22], sR = [sw + shim, shY - 0.22];
  var armL = ik(sL[0], sL[1], P.lh[0], P.lh[1], B.L1, B.L2, -1, P.bendUp), armR = ik(sR[0], sR[1], P.rh[0], P.rh[1], B.L1, B.L2, 1, P.bendUp);

  // camiseta
  c.save();
  c.translate(X(0), Y(shY)); c.rotate(lean); c.translate(-X(0), -Y(shY));
  c.fillStyle = kit[0];
  c.beginPath();
  c.moveTo(X(-ww), Y(B.waist - cr));
  c.quadraticCurveTo(X(-sw - 0.05 + shim * 0.5), Y((B.waist + shY) / 2 - cr * 0.5), X(-sw + 0.25 + shim), Y(shY - 0.75));
  c.quadraticCurveTo(X(-sw + 0.2 + shim), Y(shY - 0.2), X(-sw + 0.42 + shim), Y(shY + 0.05));
  c.lineTo(X(-0.42 + shim), Y(shY + 0.05));
  if (view === 'front') c.lineTo(X(shim), Y(shY - 0.45)); else c.quadraticCurveTo(X(shim), Y(shY - 0.15), X(0.42 + shim), Y(shY + 0.05));
  c.lineTo(X(0.42 + shim), Y(shY + 0.05)); c.lineTo(X(sw - 0.42 + shim), Y(shY + 0.05));
  c.quadraticCurveTo(X(sw - 0.2 + shim), Y(shY - 0.2), X(sw - 0.25 + shim), Y(shY - 0.75));
  c.quadraticCurveTo(X(sw + 0.05 + shim * 0.5), Y((B.waist + shY) / 2 - cr * 0.5), X(ww), Y(B.waist - cr));
  c.closePath(); c.fill();
  c.strokeStyle = kit[1]; c.lineWidth = 0.09 * u; c.stroke();
  // número (y nombre en la espalda)
  var numY = (B.waist - cr + shY) / 2 + (view === 'back' ? -0.45 : 0.05);
  c.fillStyle = kit[1]; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = '900 ' + (view === 'back' ? 1.15 : 1.0) * u + 'px "Arial Black", Impact, sans-serif';
  c.lineWidth = 0.08 * u; c.strokeStyle = shade(kit[0], -0.4);
  c.strokeText(String(look.number), X(shim * 0.6), Y(numY)); c.fillText(String(look.number), X(shim * 0.6), Y(numY));
  if (view === 'back' && look.jersey) {
    var nm = String(look.jersey).toUpperCase().slice(0, 10);
    c.font = '800 ' + Math.min(0.5, 3.4 / Math.max(3, nm.length)) * u + 'px "Arial Black", Impact, sans-serif';
    c.fillText(nm, X(shim * 0.6), Y(numY + 0.82));
  }
  if (look.extra === 'cadena' && view === 'front') {
    c.strokeStyle = '#f5c542'; c.lineWidth = 0.09 * u; c.setLineDash([0.12 * u, 0.06 * u]);
    c.beginPath(); c.moveTo(X(-0.45 + shim), Y(shY + 0.02)); c.quadraticCurveTo(X(shim), Y(shY - 0.9), X(0.45 + shim), Y(shY + 0.02)); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#f5c542'; ell(c, X(shim), Y(shY - 0.62), 0.14 * u, 0.14 * u); c.fill();
  }
  c.restore();

  // cuello
  c.fillStyle = shade(skin, -0.12); rrect(c, X(-0.3 + shim), Y(shY + 0.42), 0.6 * u, 0.6 * u, 0.2 * u); c.fill();
  if ((look.tattoo === 'cuello' || look.tattoo === 'todo')) tattooNeck(c, X(shim), Y(shY + 0.15), u);

  // brazos
  var drawArm = function (s, a, side) {
    var tat = look.tattoo === 'dos' || look.tattoo === 'todo' || (look.tattoo === 'der' && side * mir < 0) || (look.tattoo === 'izq' && side * mir > 0);
    var sleeve = look.arms === 'mangas' || (look.arms === 'manga' && side * mir < 0);
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = skin; c.lineWidth = B.armW * u;
    c.beginPath(); c.moveTo(X(s[0]), Y(s[1])); c.lineTo(X(a.e[0]), Y(a.e[1])); c.lineTo(X(a.h[0]), Y(a.h[1])); c.stroke();
    if (sleeve) { c.strokeStyle = look.kit === 3 ? '#222' : kit[1] === '#ffffff' ? '#111' : kit[0]; c.lineWidth = B.armW * 1.05 * u; c.beginPath(); c.moveTo(X(lerp(s[0], a.e[0], 0.35)), Y(lerp(s[1], a.e[1], 0.35))); c.lineTo(X(a.e[0]), Y(a.e[1])); c.lineTo(X(lerp(a.e[0], a.h[0], 0.82)), Y(lerp(a.e[1], a.h[1], 0.82))); c.stroke(); }
    else if (tat) tattooArm(c, X(lerp(s[0], a.e[0], 0.3)), Y(lerp(s[1], a.e[1], 0.3)), X(lerp(a.e[0], a.h[0], 0.75)), Y(lerp(a.e[1], a.h[1], 0.75)), X(a.e[0]), Y(a.e[1]), u);
    if (look.arms === 'munequeras' || look.arms === 'mangas') { c.strokeStyle = look.headband !== 'no' && look.headband !== 'kit' ? look.headband : kit[1]; c.lineWidth = B.armW * 1.15 * u; c.lineCap = 'butt'; c.beginPath(); c.moveTo(X(lerp(a.e[0], a.h[0], 0.72)), Y(lerp(a.e[1], a.h[1], 0.72))); c.lineTo(X(lerp(a.e[0], a.h[0], 0.88)), Y(lerp(a.e[1], a.h[1], 0.88))); c.stroke(); c.lineCap = 'round'; }
    // mano
    c.fillStyle = skin; ell(c, X(a.h[0]), Y(a.h[1]), B.armW * 0.75 * u, B.armW * 0.75 * u); c.fill();
    if (P.finger && side === P.finger) { c.strokeStyle = skin; c.lineWidth = 0.13 * u; c.beginPath(); c.moveTo(X(a.h[0]), Y(a.h[1])); c.lineTo(X(a.h[0]), Y(a.h[1] + 0.6)); c.stroke(); }
  };
  drawArm(sL, armL, -1); drawArm(sR, armR, 1);
  // tirantes de la musculosa sobre el hombro
  c.strokeStyle = kit[0]; c.lineWidth = 0.32 * u; c.lineCap = 'round';
  c.beginPath(); c.moveTo(X(-0.5 + shim), Y(shY + 0.02)); c.lineTo(X(-sw + 0.42 + shim), Y(shY + 0.02)); c.moveTo(X(0.5 + shim), Y(shY + 0.02)); c.lineTo(X(sw - 0.42 + shim), Y(shY + 0.02)); c.stroke();

  // cabeza
  var hx = X(shim * 1.1 + lean * -2), hy = Y(B.hy - cr + (P.lift || 0) * 0.1);
  drawHead(c, look, hx, hy, B.R * u, { view: view, tilt: P.tilt || 0, mouth: P.mouth, eyes: P.eyes, t: o.t || 0, princess: o.princess, look2: P.look });

  if (P.fx) P.fx(c, X, Y, u, B, o.t || 0);
}

function tattooArm(c, x1, y1, x2, y2, ex, ey, u) {
  c.save(); c.strokeStyle = 'rgba(25,25,40,.62)'; c.lineWidth = 0.06 * u; c.lineCap = 'round';
  var seg = function (ax, ay, bx, by) {
    var n = 4;
    for (var i = 0; i < n; i++) {
      var t = (i + 0.5) / n, x = lerp(ax, bx, t), y = lerp(ay, by, t);
      c.beginPath(); c.arc(x, y, 0.09 * u, 0, Math.PI * 1.4); c.stroke();
      c.beginPath(); c.moveTo(x - 0.1 * u, y + 0.06 * u); c.lineTo(x + 0.1 * u, y - 0.04 * u); c.stroke();
    }
  };
  seg(x1, y1, ex, ey); seg(ex, ey, x2, y2);
  c.restore();
}
function tattooNeck(c, x, y, u) {
  c.save(); c.strokeStyle = 'rgba(25,25,40,.6)'; c.lineWidth = 0.05 * u;
  c.beginPath(); c.moveTo(x - 0.15 * u, y); c.lineTo(x, y - 0.18 * u); c.lineTo(x + 0.15 * u, y); c.moveTo(x, y - 0.18 * u); c.lineTo(x, y + 0.12 * u); c.stroke(); c.restore();
}

/* Cabeza: también se usa para los retratos. R = radio en píxeles */
function drawHead(c, look, x, y, R, o) {
  o = o || {};
  var view = o.view || 'front', skin = SKINS[look.skin], hairC = HAIR_COLORS[look.hairColor];
  var f = { redonda: [1, 1], ancha: [1.13, 0.95], larga: [0.9, 1.08], cuadrada: [1.06, 1] }[look.face] || [1, 1];
  var rx = R * f[0], ry = R * f[1];
  c.save(); c.translate(x, y); c.rotate(o.tilt || 0);
  hairBack(c, look.hair, rx, ry, hairC, view);
  // orejas
  c.fillStyle = shade(skin, -0.06);
  ell(c, -rx * 0.97, ry * 0.08, R * 0.17, R * 0.22); c.fill(); ell(c, rx * 0.97, ry * 0.08, R * 0.17, R * 0.22); c.fill();
  if (look.extra === 'aro') { c.strokeStyle = '#f5c542'; c.lineWidth = R * 0.05; c.beginPath(); c.arc((view === 'back' ? 1 : -1) * rx * 0.98, ry * 0.3, R * 0.07, 0, 7); c.stroke(); }
  // cara
  c.fillStyle = skin;
  if (look.face === 'cuadrada') { rrect(c, -rx, -ry, rx * 2, ry * 2, R * 0.72); } else ell(c, 0, 0, rx, ry);
  c.fill();
  // sombra suave abajo
  c.fillStyle = 'rgba(0,0,0,.06)'; ell(c, 0, ry * 0.45, rx * 0.85, ry * 0.5); c.fill();

  if (view === 'front') {
    beard(c, look.beard, rx, ry, R, hairC, skin);
    // cejas
    c.strokeStyle = look.hair === 'pelado' || look.hair === 'rapado' ? shade(hairC === '#ececec' ? '#888888' : hairC, 0) : hairC; c.lineWidth = R * 0.08; c.lineCap = 'round';
    var browUp = o.eyes === 'happy' ? -0.04 : o.mouth === 'jaw' ? 0.05 : 0;
    c.beginPath(); c.moveTo(-R * 0.55, -ry * (0.3 + browUp) - R * 0.02); c.quadraticCurveTo(-R * 0.36, -ry * (0.4 + browUp), -R * 0.17, -ry * (0.3 + browUp)); c.stroke();
    c.beginPath(); c.moveTo(R * 0.55, -ry * (0.3 + browUp) - R * 0.02); c.quadraticCurveTo(R * 0.36, -ry * (0.4 + browUp), R * 0.17, -ry * (0.3 + browUp)); c.stroke();
    eyes(c, o.eyes || 'open', R, ry, EYE_COLORS[look.eyes || 0], o.look2 || 0, o.t || 0);
    // nariz
    c.strokeStyle = shade(skin, -0.28); c.lineWidth = R * 0.05;
    c.beginPath(); c.moveTo(-R * 0.08, ry * 0.18); c.quadraticCurveTo(0, ry * 0.27, R * 0.08, ry * 0.18); c.stroke();
    mouth(c, o.mouth || 'smile', R, ry, look.extra === 'protector');
    if (look.beard === 'bigote' || look.beard === 'candado' || look.beard === 'tupida') {
      c.fillStyle = hairC; c.beginPath(); c.moveTo(-R * 0.32, ry * 0.4); c.quadraticCurveTo(0, ry * 0.22, R * 0.32, ry * 0.4); c.quadraticCurveTo(0, ry * 0.33, -R * 0.32, ry * 0.4); c.fill();
    }
    if (look.glasses !== 'no') glasses(c, look.glasses, R, ry, rx);
  }
  hairFront(c, look.hair, rx, ry, R, hairC, view, o.t || 0);
  if (look.hair === 'entradas' && view === 'front') { c.fillStyle = skin; ell(c, -rx * 0.42, -ry * 0.62, rx * 0.24, ry * 0.2, 0.5); c.fill(); ell(c, rx * 0.42, -ry * 0.62, rx * 0.24, ry * 0.2, -0.5); c.fill(); }
  if (look.headband !== 'no') {
    var hb = look.headband === 'kit' ? KIT_COLORS[look.kit % KIT_COLORS.length][0] : look.headband;
    c.fillStyle = hb; c.beginPath(); c.ellipse(0, -ry * 0.5, rx * 1.01, ry * 0.2, 0, Math.PI * 0.98, Math.PI * 2.02); c.ellipse(0, -ry * 0.62, rx * 0.98, ry * 0.16, 0, Math.PI * 2.02, Math.PI * 0.98, true); c.fill();
    if (view === 'back') { c.fillRect(-rx, -ry * 0.68, rx * 2, ry * 0.22); }
  }
  if (look.glasses === 'antiparras' && view === 'back') { c.fillStyle = '#222'; c.fillRect(-rx, -ry * 0.2, rx * 2, R * 0.1); }
  if (look.extra === 'corona') crown(c, 0, -ry * 0.98, R);
  c.restore();
}

function crown(c, x, y, R) {
  c.fillStyle = '#ffd23f'; c.strokeStyle = '#c99700'; c.lineWidth = R * 0.03;
  c.beginPath(); c.moveTo(x - R * 0.35, y + R * 0.1); c.lineTo(x - R * 0.4, y - R * 0.22); c.lineTo(x - R * 0.18, y - R * 0.05); c.lineTo(x, y - R * 0.32); c.lineTo(x + R * 0.18, y - R * 0.05); c.lineTo(x + R * 0.4, y - R * 0.22); c.lineTo(x + R * 0.35, y + R * 0.1); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#ff5fa2'; ell(c, x, y - R * 0.02, R * 0.06, R * 0.06); c.fill();
}

function eyes(c, st, R, ry, iris, lookX, t) {
  var ex = R * 0.36, ey = -ry * 0.08;
  [-1, 1].forEach(function (s) {
    var x = s * ex;
    if (st === 'closed') { c.strokeStyle = '#2a1a12'; c.lineWidth = R * 0.06; c.beginPath(); c.arc(x, ey, R * 0.13, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); return; }
    if (st === 'happy') { c.strokeStyle = '#2a1a12'; c.lineWidth = R * 0.07; c.beginPath(); c.arc(x, ey + R * 0.05, R * 0.14, 1.15 * Math.PI, 1.85 * Math.PI); c.stroke(); return; }
    if (st === 'wink' && s > 0) { c.strokeStyle = '#2a1a12'; c.lineWidth = R * 0.07; c.beginPath(); c.arc(x, ey + R * 0.05, R * 0.14, 1.15 * Math.PI, 1.85 * Math.PI); c.stroke(); return; }
    c.fillStyle = '#fff'; ell(c, x, ey, R * 0.19, R * 0.22); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = R * 0.02; c.stroke();
    var px = x + R * 0.05 * (lookX || 0);
    c.fillStyle = iris; ell(c, px, ey + R * 0.02, R * 0.12, R * 0.13); c.fill();
    c.fillStyle = '#111'; ell(c, px, ey + R * 0.02, R * 0.065, R * 0.07); c.fill();
    c.fillStyle = '#fff'; ell(c, px + R * 0.04, ey - R * 0.03, R * 0.035, R * 0.035); c.fill();
    if (st === 'wide') { c.strokeStyle = '#2a1a12'; c.lineWidth = R * 0.03; c.beginPath(); c.arc(x, ey, R * 0.21, 1.1 * Math.PI, 1.9 * Math.PI); c.stroke(); }
  });
}

function mouth(c, st, R, ry, guard) {
  var my = ry * 0.5;
  c.lineCap = 'round';
  if (st === 'open' || st === 'tongue' || st === 'grin' || st === 'shout') {
    var w = st === 'grin' ? 0.4 : st === 'shout' ? 0.26 : 0.32, h = st === 'shout' ? 0.3 : st === 'grin' ? 0.2 : 0.22;
    c.fillStyle = '#5a1620'; c.beginPath(); c.moveTo(-R * w, my - R * 0.03); c.quadraticCurveTo(0, my - R * 0.08, R * w, my - R * 0.03); c.quadraticCurveTo(0, my + R * h * 1.6, -R * w, my - R * 0.03); c.fill();
    c.fillStyle = guard ? '#3fa7ff' : '#fff'; c.fillRect(-R * w * 0.75, my - R * 0.05, R * w * 1.5, R * 0.07);
    if (st === 'tongue') { c.fillStyle = '#ff6f8a'; ell(c, R * 0.05, my + R * 0.22, R * 0.13, R * 0.16, 0.2); c.fill(); }
    else if (st !== 'grin') { c.fillStyle = '#ff6f8a'; ell(c, 0, my + R * h * 0.9, R * w * 0.55, R * 0.07); c.fill(); }
    return;
  }
  if (st === 'o') { c.fillStyle = '#5a1620'; ell(c, 0, my + R * 0.04, R * 0.1, R * 0.12); c.fill(); return; }
  if (st === 'jaw') { // mentón para afuera, dientes de abajo
    c.fillStyle = '#5a1620'; rrect(c, -R * 0.3, my - R * 0.02, R * 0.6, R * 0.13, R * 0.05); c.fill();
    c.fillStyle = '#fff'; c.fillRect(-R * 0.26, my + R * 0.02, R * 0.52, R * 0.07);
    return;
  }
  if (st === 'smirk') { c.strokeStyle = '#5a1620'; c.lineWidth = R * 0.06; c.beginPath(); c.moveTo(-R * 0.22, my + R * 0.02); c.quadraticCurveTo(R * 0.05, my + R * 0.1, R * 0.26, my - R * 0.06); c.stroke(); return; }
  if (st === 'flat') { c.strokeStyle = '#5a1620'; c.lineWidth = R * 0.06; c.beginPath(); c.moveTo(-R * 0.2, my + R * 0.04); c.lineTo(R * 0.2, my + R * 0.04); c.stroke(); return; }
  // sonrisa
  c.strokeStyle = '#5a1620'; c.lineWidth = R * 0.07;
  c.beginPath(); c.moveTo(-R * 0.27, my - R * 0.02); c.quadraticCurveTo(0, my + R * 0.18, R * 0.27, my - R * 0.02); c.stroke();
  if (guard) { c.fillStyle = '#3fa7ff'; ell(c, R * 0.3, my, R * 0.08, R * 0.05, -0.4); c.fill(); }
}

function beard(c, st, rx, ry, R, hc, skin) {
  if (st === 'no' || !st) return;
  c.save();
  if (st === 'sombra') { c.fillStyle = 'rgba(40,25,15,.2)'; c.beginPath(); c.ellipse(0, ry * 0.25, rx * 0.95, ry * 0.75, 0, 0.05 * Math.PI, 0.95 * Math.PI); c.fill(); c.restore(); return; }
  c.fillStyle = hc;
  if (st === 'candado') {
    c.beginPath(); c.ellipse(0, ry * 0.62, R * 0.34, R * 0.32, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = skin; c.beginPath(); c.ellipse(0, ry * 0.52, R * 0.22, R * 0.12, 0, 0, Math.PI * 2); c.fill();
  } else if (st === 'completa' || st === 'tupida') {
    var big = st === 'tupida' ? 1.15 : 1;
    c.beginPath(); c.moveTo(-rx * 0.97, ry * 0.05); c.quadraticCurveTo(-rx * 0.9, ry * 1.0 * big, 0, ry * 1.08 * big); c.quadraticCurveTo(rx * 0.9, ry * 1.0 * big, rx * 0.97, ry * 0.05);
    c.lineTo(rx * 0.72, ry * 0.25); c.quadraticCurveTo(rx * 0.45, ry * 0.32, R * 0.32, ry * 0.38); c.quadraticCurveTo(0, ry * 0.3, -R * 0.32, ry * 0.38);
    c.quadraticCurveTo(-rx * 0.45, ry * 0.32, -rx * 0.72, ry * 0.25); c.closePath(); c.fill();
    c.fillStyle = skin; ell(c, 0, ry * 0.54, R * 0.27, R * 0.13); c.fill();
  }
  c.restore();
}

function glasses(c, st, R, ry, rx) {
  var ey = -ry * 0.08;
  if (st === 'antiparras') {
    c.fillStyle = '#222'; c.fillRect(-rx * 1.02, ey - R * 0.06, rx * 2.04, R * 0.1);
    c.fillStyle = 'rgba(170,220,255,.45)'; c.strokeStyle = '#222'; c.lineWidth = R * 0.07;
    rrect(c, -R * 0.62, ey - R * 0.22, R * 0.54, R * 0.42, R * 0.15); c.fill(); c.stroke();
    rrect(c, R * 0.08, ey - R * 0.22, R * 0.54, R * 0.42, R * 0.15); c.fill(); c.stroke();
  } else if (st === 'sol') {
    c.fillStyle = '#111'; rrect(c, -R * 0.62, ey - R * 0.16, R * 0.52, R * 0.32, R * 0.12); c.fill(); rrect(c, R * 0.1, ey - R * 0.16, R * 0.52, R * 0.32, R * 0.12); c.fill();
    c.strokeStyle = '#111'; c.lineWidth = R * 0.05; c.beginPath(); c.moveTo(-R * 0.1, ey - R * 0.08); c.lineTo(R * 0.1, ey - R * 0.08); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-R * 0.5, ey - R * 0.1, R * 0.12, R * 0.05);
  } else {
    c.strokeStyle = '#333'; c.lineWidth = R * 0.05;
    c.beginPath(); c.arc(-R * 0.36, ey, R * 0.22, 0, 7); c.stroke(); c.beginPath(); c.arc(R * 0.36, ey, R * 0.22, 0, 7); c.stroke();
    c.beginPath(); c.moveTo(-R * 0.14, ey); c.lineTo(R * 0.14, ey); c.stroke();
  }
}

function hairBack(c, st, rx, ry, hc, view) {
  c.fillStyle = hc;
  if (st === 'afro') { ell(c, 0, -ry * 0.28, rx * 1.38, ry * 1.18); c.fill(); }
  else if (st === 'largo') { c.beginPath(); c.moveTo(-rx * 1.08, -ry * 0.2); c.lineTo(-rx * 1.12, ry * 1.25); c.quadraticCurveTo(0, ry * 1.45, rx * 1.12, ry * 1.25); c.lineTo(rx * 1.08, -ry * 0.2); c.closePath(); c.fill(); }
  else if (st === 'trenzas') {
    c.strokeStyle = hc; c.lineWidth = rx * 0.14; c.lineCap = 'round';
    for (var i = -3; i <= 3; i++) { if (view === 'front' && Math.abs(i) < 2) continue; c.beginPath(); c.moveTo(i * rx * 0.3, -ry * 0.2); c.lineTo(i * rx * 0.36, ry * 1.2); c.stroke(); }
  } else if (st === 'colitas') {
    ell(c, -rx * 1.25, -ry * 0.1, rx * 0.35, ry * 0.55, 0.4); c.fill(); ell(c, rx * 1.25, -ry * 0.1, rx * 0.35, ry * 0.55, -0.4); c.fill();
  }
}

function hairFront(c, st, rx, ry, R, hc, view, t) {
  c.save(); c.fillStyle = hc;
  var back = view === 'back';
  var cap = function (lowF, lowB) { // casquete: hasta lowF de la frente (adelante) o lowB atrás
    c.beginPath(); c.ellipse(0, 0, rx * 1.04, ry * 1.04, 0, Math.PI, Math.PI * 2);
    var low = back ? lowB : lowF;
    c.lineTo(rx * 1.04, ry * low * 0.6); c.quadraticCurveTo(rx * 0.9, ry * low * 0.2, rx * 0.75, -ry * (back ? -low : 0.42));
    c.quadraticCurveTo(0, -ry * (back ? -low - 0.1 : 0.62), -rx * 0.75, -ry * (back ? -low : 0.42));
    c.quadraticCurveTo(-rx * 0.9, ry * low * 0.2, -rx * 1.04, ry * low * 0.6); c.closePath(); c.fill();
  };
  switch (st) {
    case 'pelado':
      c.fillStyle = 'rgba(255,255,255,.22)'; ell(c, -rx * 0.35, -ry * 0.62, rx * 0.3, ry * 0.14, -0.4); c.fill(); break;
    case 'rapado':
      c.globalAlpha = 0.75; cap(0, 0.55); c.globalAlpha = 1; break;
    case 'corto': cap(0.05, 0.6); break;
    case 'entradas': cap(0.05, 0.6); break;
    case 'rulos':
      cap(0.08, 0.65);
      for (var i = 0; i < 9; i++) { var a = Math.PI * (1.05 + i * 0.1); ell(c, Math.cos(a) * rx * 1.0, Math.sin(a) * ry * 1.0, rx * 0.2, ry * 0.2); c.fill(); }
      break;
    case 'afro':
      if (!back) { c.beginPath(); c.ellipse(0, -ry * 0.28, rx * 1.38, ry * 1.18, 0, Math.PI * 1.02, Math.PI * 1.98); c.quadraticCurveTo(rx * 0.6, -ry * 0.62, 0, -ry * 0.58); c.quadraticCurveTo(-rx * 0.6, -ry * 0.62, -rx * 1.36, -ry * 0.3); c.fill(); }
      else { ell(c, 0, -ry * 0.1, rx * 1.38, ry * 1.25); c.fill(); }
      break;
    case 'trenzas': cap(0.05, 0.7); c.strokeStyle = shade(hc === '#1a1310' ? '#444444' : hc, -0.3); c.lineWidth = R * 0.03; for (var k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(k * rx * 0.3, -ry * 1.0); c.lineTo(k * rx * 0.36, -ry * 0.45); c.stroke(); } break;
    case 'largo': cap(0.1, 1.1); if (!back) { c.strokeStyle = shade(hc, -0.25); c.lineWidth = R * 0.04; c.beginPath(); c.moveTo(-rx * 0.1, -ry * 1.02); c.lineTo(-rx * 0.15, -ry * 0.55); c.stroke(); } break;
    case 'peinado':
      cap(0.08, 0.62);
      if (!back) { c.beginPath(); c.moveTo(-rx * 0.85, -ry * 0.55); c.quadraticCurveTo(-rx * 0.2, -ry * 1.35, rx * 1.08, -ry * 0.62); c.quadraticCurveTo(rx * 0.4, -ry * 0.75, -rx * 0.2, -ry * 0.48); c.closePath(); c.fill(); }
      else { ell(c, 0, -ry * 0.75, rx * 0.9, ry * 0.4); c.fill(); }
      break;
    case 'coronilla':
      // pelo solo a los costados y atrás
      c.beginPath(); c.ellipse(-rx * 0.85, -ry * 0.12, rx * 0.25, ry * 0.42, 0.2, 0, 7); c.fill();
      c.beginPath(); c.ellipse(rx * 0.85, -ry * 0.12, rx * 0.25, ry * 0.42, -0.2, 0, 7); c.fill();
      if (back) { c.beginPath(); c.ellipse(0, -ry * 0.05, rx * 0.95, ry * 0.35, 0, 0, 7); c.fill(); }
      c.fillStyle = 'rgba(255,255,255,.25)'; ell(c, -rx * 0.25, -ry * 0.7, rx * 0.3, ry * 0.12, -0.3); c.fill();
      break;
    case 'cresta':
      c.globalAlpha = 0.35; cap(0, 0.5); c.globalAlpha = 1;
      c.beginPath(); c.moveTo(-rx * 0.22, -ry * 0.55); c.quadraticCurveTo(0, -ry * 1.55, rx * 0.22, -ry * 0.55); c.closePath(); c.fill();
      if (back) { rrect(c, -rx * 0.22, -ry * 1.1, rx * 0.44, ry * 1.3, rx * 0.2); c.fill(); }
      break;
    case 'rodete': cap(0.08, 0.65); ell(c, 0, -ry * 1.12, rx * 0.36, ry * 0.3); c.fill(); break;
    case 'flequillo':
      cap(0.1, 0.7);
      if (!back) { c.beginPath(); c.moveTo(-rx * 0.95, -ry * 0.35); c.quadraticCurveTo(-rx * 0.3, -ry * 0.15, rx * 0.15, -ry * 0.42); c.quadraticCurveTo(rx * 0.6, -ry * 0.22, rx * 0.98, -ry * 0.35); c.lineTo(rx * 0.9, -ry * 0.75); c.lineTo(-rx * 0.9, -ry * 0.75); c.closePath(); c.fill(); }
      break;
    case 'colitas': cap(0.08, 0.6); c.fillStyle = '#ff5fa2'; ell(c, -rx * 1.0, -ry * 0.25, R * 0.1, R * 0.1); c.fill(); ell(c, rx * 1.0, -ry * 0.25, R * 0.1, R * 0.1); c.fill(); break;
  }
  c.restore();
}

/* ======================= FESTEJOS ======================= */
/* Cada festejo: función (t en segundos, B) → pose. Duran ~2.8 s y se repiten. */
var CELEB_POSES = {
  baile: function (t, B) {
    var p = standPose(B), w = Math.sin(t * 9);
    p.lh = [-(B.sw + 0.9), B.sy + 0.6 + w * 1.2]; p.rh = [B.sw + 0.9, B.sy + 0.6 - w * 1.2];
    p.shim = Math.sin(t * 9) * 0.25; p.tilt = Math.sin(t * 9) * 0.12; p.jump = Math.abs(Math.sin(t * 4.5)) * 0.3; p.mouth = 'grin'; p.eyes = 'happy'; return p;
  },
  avion: function (t, B) {
    var p = standPose(B), w = Math.sin(t * 3);
    p.lh = [-(B.sw + B.L1 + B.L2 - 0.1), B.sy - 0.2 + w * 0.9]; p.rh = [B.sw + B.L1 + B.L2 - 0.1, B.sy - 0.2 - w * 0.9];
    p.lean = -w * 0.15; p.tilt = -w * 0.2; p.mouth = 'open'; p.eyes = 'happy'; p.shim = Math.sin(t * 1.5) * 0.6; return p;
  },
  musculos: function (t, B) {
    var p = standPose(B), f = 0.2 * Math.sin(t * 7);
    p.lh = [-(B.sw + 0.5), B.sy + 1.1 + f]; p.rh = [B.sw + 0.5, B.sy + 1.1 - f]; p.bendUp = true;
    p.crouch = 0.15 + 0.1 * Math.sin(t * 7); p.mouth = 'shout'; p.eyes = 'open';
    p.fx = function (c, X, Y, u) { c.font = 1.2 * u + 'px serif'; c.textAlign = 'center'; c.fillText('💪', X(-(B.sw + 1.4)), Y(B.sy + 2.2 + f)); c.fillText('💪', X(B.sw + 1.4), Y(B.sy + 2.2 - f)); };
    return p;
  },
  saludo: function (t, B) {
    var p = standPose(B), w = Math.sin(t * 8);
    p.lh = [-(B.sw + 0.6 + w * 0.4), B.sy + 2.1]; p.rh = [B.sw + 0.6 - w * 0.4, B.sy + 2.1];
    p.jump = Math.max(0, Math.sin(t * 5)) * 0.6; p.mouth = 'open'; p.eyes = 'happy'; return p;
  },
  corazon: function (t, B) {
    var p = standPose(B);
    p.lh = [-0.25, B.sy - 0.4]; p.rh = [0.25, B.sy - 0.4]; p.tilt = Math.sin(t * 2.5) * 0.15; p.mouth = 'smile'; p.eyes = 'happy';
    p.fx = function (c, X, Y, u) { c.font = 0.9 * u + 'px serif'; c.textAlign = 'center'; for (var i = 0; i < 4; i++) { var k = (t * 0.6 + i / 4) % 1; c.globalAlpha = 1 - k; c.fillText('💖', X(Math.sin(i * 2.3 + t) * 1.8), Y(B.sy + 0.4 + k * 4.5)); } c.globalAlpha = 1; c.font = 1.3 * u + 'px serif'; c.fillText('❤️', X(0), Y(B.sy - 0.1)); };
    return p;
  },
  /* --- únicos de cada estrella --- */
  noche: function (t, B) { // Curry: manos juntas al costado de la cara, "a dormir"
    var p = standPose(B), k = clamp((t % 2.8) / 0.6, 0, 1);
    if (k < 1) { p.lh = [-(B.sw + 0.6), B.sy + 2]; p.rh = [B.sw + 0.6, B.sy + 2]; p.mouth = 'shout'; p.jump = k * 0.4; return p; }
    p.lh = [B.R * 0.75, B.hy - B.R * 0.75]; p.rh = [B.R * 0.95, B.hy - B.R * 0.45]; p.tilt = 0.38; p.eyes = 'closed'; p.mouth = 'smile';
    p.fx = function (c, X, Y, u) { c.fillStyle = '#fff'; c.font = '900 ' + 0.9 * u + 'px sans-serif'; c.textAlign = 'center'; for (var i = 0; i < 3; i++) { var z = (t * 0.7 + i / 3) % 1; c.globalAlpha = 1 - z; c.fillText('z', X(-B.R * 0.8 - z * 1.5), Y(B.hy + B.R + z * 2.4)); } c.globalAlpha = 1; };
    return p;
  },
  oreja: function (t, B) { // Dončić: "¡no los escucho!" y la lengua afuera
    var p = standPose(B), sway = Math.sin(t * 2.5);
    p.rh = [B.R * 1.15, B.hy + 0.05]; p.lh = [-(B.sw + 1.2), B.sy - 1.2 + sway * 0.3];
    p.tilt = -0.25 + sway * 0.06; p.mouth = 'tongue'; p.eyes = 'open'; p.look = 1; p.lean = sway * 0.05;
    p.fx = function (c, X, Y, u) { c.fillStyle = '#fff'; c.font = '900 ' + 0.7 * u + 'px sans-serif'; c.textAlign = 'center'; c.globalAlpha = 0.6 + 0.4 * Math.sin(t * 6); c.fillText('¿Eh?', X(B.R * 2.3), Y(B.hy + 1.2)); c.globalAlpha = 1; };
    return p;
  },
  tiza: function (t, B) { // LeBron: tira tiza al aire
    var p = standPose(B), k = (t % 2.8) / 2.8;
    if (k < 0.35) { var a = k / 0.35; p.lh = [-0.3, B.sy - 1.2 + a * 0.4]; p.rh = [0.3, B.sy - 1.2 + a * 0.4]; p.crouch = 0.5 * a; p.mouth = 'flat'; }
    else { var b = clamp((k - 0.35) / 0.12, 0, 1); p.lh = [lerp(-0.3, -(B.sw + 0.9), b), lerp(B.sy - 0.8, B.sy + 2.4, b)]; p.rh = [lerp(0.3, B.sw + 0.9, b), lerp(B.sy - 0.8, B.sy + 2.4, b)]; p.jump = b * 0.5 * (1 - Math.max(0, k - 0.6)); p.mouth = 'shout'; p.tilt = -0.15 * b; }
    p.fx = function (c, X, Y, u) {
      if (k < 0.35) return; var q = (k - 0.35) / 0.65;
      for (var i = 0; i < 40; i++) { var ang = i * 2.39, r = (0.5 + (i % 7) / 7) * q * 3.2; c.fillStyle = 'rgba(255,255,255,' + (0.75 * (1 - q * 0.8)) + ')'; ell(c, X(Math.cos(ang) * r), Y(B.sy + 2.8 + Math.sin(ang) * r * 0.6 + q), (0.25 + (i % 3) * 0.12) * u, (0.25 + (i % 3) * 0.12) * u); c.fill(); }
    };
    return p;
  },
  hombros: function (t, B) { // Jordan: la encogida de hombros
    var p = standPose(B), k = Math.abs(Math.sin(t * 1.7));
    p.lift = 0.9 * k; p.lh = [-(B.sw + 1.3), B.sy - 0.9 + k * 0.5]; p.rh = [B.sw + 1.3, B.sy - 0.9 + k * 0.5];
    p.tilt = 0.1 * Math.sin(t * 1.7); p.mouth = k > 0.5 ? 'smirk' : 'tongue'; p.eyes = 'open'; return p;
  },
  mamba: function (t, B) { // Kobe: mentón arriba, cara de Mamba, brazos cruzados
    var p = standPose(B), n = Math.sin(t * 2) * 0.05;
    p.lh = [B.sw * 0.6, B.sy - 1.0]; p.rh = [-B.sw * 0.6, B.sy - 1.05]; p.tilt = -0.0 + n; p.lift = 0.2; p.mouth = 'jaw'; p.eyes = 'open';
    p.fx = function (c, X, Y, u) { c.font = 0.9 * u + 'px serif'; c.textAlign = 'center'; c.globalAlpha = 0.85; c.fillText('🐍', X(B.sw + 1.4), Y(B.sy + 1.5 + Math.sin(t * 3) * 0.3)); c.globalAlpha = 1; };
    return p;
  },
  shimmy: function (t, B) { // Shaq: shimmy de hombros
    var p = standPose(B), s = Math.sin(t * 16);
    p.shim = s * 0.35; p.lh = [-(B.sw + 1.0) + s * 0.3, B.sy - 0.6]; p.rh = [B.sw + 1.0 + s * 0.3, B.sy - 0.6];
    p.crouch = 0.35; p.tilt = -s * 0.08; p.mouth = 'grin'; p.eyes = 'happy'; return p;
  },
  rascada: function (t, B) { // Ogro: se rasca la cabeza, ¿quién, yo?
    var p = standPose(B), w = Math.sin(t * 10);
    p.rh = [0.6 + w * 0.2, B.hy + 1.4]; p.lh = [-(B.sw + 1.4), B.sy - 0.2]; p.tilt = 0.12; p.mouth = 'grin'; p.eyes = 'wide'; return p;
  },
  murcielago: function (t, B) { // Manu: el murciélago en pleno partido
    var p = standPose(B), k = (t % 2.8) / 2.8;
    var bx = lerp(5, -1.2, clamp(k / 0.45, 0, 1)), by = B.hy + 2.2 + Math.sin(t * 14) * 0.25;
    if (k < 0.45) { p.rh = [B.sw + 1.0, B.sy + 1.2]; p.lh = [-(B.sw + 0.6), B.sy - 1.8]; p.mouth = 'o'; p.eyes = 'wide'; p.look = 1; }
    else if (k < 0.55) { p.rh = [-0.8, B.hy + 1.8]; p.lh = [-(B.sw + 0.6), B.sy - 1.8]; p.mouth = 'shout'; }
    else { var w = Math.sin(t * 9); p.rh = [B.sw + 0.5, B.sy + 2.0 + w * 0.3]; p.lh = [-(B.sw + 0.5), B.sy + 2.0 - w * 0.3]; p.mouth = 'shout'; p.eyes = 'happy'; p.jump = Math.abs(w) * 0.4; }
    p.fx = function (c, X, Y, u) { c.font = 1.0 * u + 'px serif'; c.textAlign = 'center'; if (k < 0.5) c.fillText('🦇', X(bx), Y(by)); else { c.globalAlpha = Math.max(0, 1 - (k - 0.5) * 3); c.fillText('🦇', X(-1.4 - (k - 0.5) * 4), Y(0.6)); c.globalAlpha = 1; } };
    return p;
  },
  dedo: function (t, B) { // Bird: dedo arriba antes de que entre
    var p = standPose(B);
    p.rh = [B.sw + 0.35, B.sy + 2.1]; p.finger = 1; p.lh = [-(B.sw + 0.35), B.sy - 2.2]; p.mouth = 'smirk'; p.tilt = -0.06; p.look = -1;
    p.fx = function (c, X, Y, u) {
      c.font = '800 ' + 0.55 * u + 'px sans-serif'; var txt = '¿Quién sale segundo?'; var w = c.measureText(txt).width + 0.6 * u;
      c.fillStyle = 'rgba(255,255,255,.95)'; rrect(c, X(-B.R * 0.6) - w, Y(B.hy + B.R + 1.4), w, 0.95 * u, 0.4 * u); c.fill();
      c.fillStyle = '#222'; c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText(txt, X(-B.R * 0.6) - 0.3 * u, Y(B.hy + B.R + 0.93)); c.textAlign = 'center';
    };
    return p;
  }
};

function celebPose(look, t) {
  var B = bodyOf(look), f = CELEB_POSES[look.celeb] || CELEB_POSES.baile;
  return f(t, B);
}

/* Pose de tiro (espalda). ph: 0 = con la pelota a la altura del pecho, 1 = armado arriba, 2 = soltó (brazo estirado), jump 0..1 */
function shotPose(look, ph, jump) {
  var B = bodyOf(look), p = standPose(B);
  p.mouth = 'flat';
  if (ph <= 1) {
    var k = ph;
    // mano de tiro = derecha del jugador (en la espalda, a la derecha de la pantalla)
    p.rh = [lerp(0.5, 0.45, k), lerp(B.sy - 0.9, B.hy + B.R * 0.9, k)];
    p.lh = [lerp(-0.45, -0.1, k), lerp(B.sy - 0.9, B.hy + B.R * 0.75, k)];
    p.crouch = (1 - k) * 0.25;
  } else {
    var r = clamp(ph - 1, 0, 1);
    p.rh = [0.4, B.hy + B.R + 1.6 * r + 0.3]; p.lh = [-0.6 - r * 0.4, B.hy + B.R * 0.6 - r * 0.5];
  }
  p.jump = jump || 0;
  p.ball = [p.rh[0] - 0.25, p.rh[1] + 0.45];
  return p;
}
