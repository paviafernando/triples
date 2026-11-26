// Triples 3D — estadio, cancha, aro, pelota, público y cámaras. Expone window.T3 para app.js (scripts clásicos).
import * as THREE from '../../vendor/three.js';
import { Player, shotPoseFn, pickupPoseFn, CELEB3D } from './player.js';

const D = { SKINS, HAIR_COLORS, EYE_COLORS, KIT_COLORS, SHOE_COLORS };
const Q = new URLSearchParams(location.search);
const LOW = Q.get('q') === 'low' || /SMART-TV|Tizen|Web0S|WebOS/i.test(navigator.userAgent);
const T3 = window.T3 = { ready: false, low: LOW };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;

let renderer, scene, camera, base, clips = [], courtMesh, courtTex, courtKey = '', ball, ballMats = {}, net, netKick = 0, rimMesh;
let crowdBody, crowdHead, crowdData = [], ledTex, ledCtx, ledCv, racks = [], confetti, fxGroup, chalk, sprites = {};
const players = new Map();
let celebT0 = 0, celebOn = false, lastT = 0;

/* ---------------- texturas pintadas a mano en canvas ---------------- */
function woodCourt(diff, princess) {
  const W = 2048, H = 2048, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  // mundo: x [-8, 8], z [-2.4, 13.6] → 128 px por metro
  const PX = W / 16, X = x => (x + 8) * PX, Z = z => (z + 2.4) * PX;
  const base = princess ? [242, 196, 214] : [214, 160, 98];
  // tablas a lo largo de la cancha
  const pw = 0.072 * PX;
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let x = 0; x < W; x += pw) {
    const k = 0.9 + rnd() * 0.18;
    c.fillStyle = `rgb(${base[0] * k | 0},${base[1] * k | 0},${base[2] * k | 0})`; c.fillRect(x, 0, pw + 1, H);
    // cortes de tabla
    for (let y = rnd() * 400; y < H; y += 300 + rnd() * 500) { c.fillStyle = 'rgba(60,30,10,.25)'; c.fillRect(x, y, pw, 2); }
    // veta
    c.strokeStyle = 'rgba(90,50,20,.07)'; c.lineWidth = 1;
    for (let i = 0; i < 3; i++) { const xx = x + rnd() * pw; c.beginPath(); c.moveTo(xx, 0); for (let y = 0; y < H; y += 64) c.lineTo(xx + Math.sin(y * 0.01 + i) * 2, y); c.stroke(); }
    c.fillStyle = 'rgba(40,20,5,.18)'; c.fillRect(x, 0, 1.5, H);
  }
  // pintura (llave) y círculo
  c.fillStyle = princess ? 'rgba(255,95,162,.78)' : 'rgba(23,59,140,.88)';
  c.fillRect(X(-2.44), Z(-1.6), 4.88 * PX, 5.79 * PX);
  // logo de media cancha
  c.save(); c.globalAlpha = 0.85; c.fillStyle = princess ? '#ff5fa2' : '#1b3c8c'; c.beginPath(); c.arc(X(0), Z(14), 1.8 * PX, 0, Math.PI * 2); c.fill(); c.restore();
  c.save(); c.translate(X(0), Z(11.6)); c.rotate(Math.PI); c.font = `900 ${0.9 * PX}px "Arial Black", Impact, sans-serif`; c.textAlign = 'center'; c.fillStyle = princess ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.35)'; c.fillText('TRIPLES', 0, 0); c.restore();
  // líneas
  c.strokeStyle = '#ffffff'; c.lineWidth = 0.05 * PX; c.lineCap = 'butt';
  const line = pts => { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(X(p[0]), Z(p[1])) : c.moveTo(X(p[0]), Z(p[1]))); c.stroke(); };
  line([[-7.5, -1.6], [7.5, -1.6]]);
  c.strokeRect(X(-2.44), Z(-1.6), 4.88 * PX, 5.79 * PX);
  c.beginPath(); c.arc(X(0), Z(4.19), 1.8 * PX, 0, Math.PI); c.stroke();
  c.setLineDash([0.3 * PX, 0.3 * PX]); c.beginPath(); c.arc(X(0), Z(4.19), 1.8 * PX, Math.PI, Math.PI * 2); c.stroke(); c.setLineDash([]);
  c.beginPath(); c.arc(X(0), Z(0), 1.25 * PX, 0, Math.PI); c.stroke();
  // línea de triple según dificultad
  const d = DIFFS[diff] || DIFFS.normal, a3 = Math.asin(Math.min(0.999, d.corner / d.dist)), z3 = Math.cos(a3) * d.dist;
  c.strokeStyle = princess ? '#fff6b8' : '#ffffff'; c.lineWidth = 0.06 * PX;
  c.beginPath(); c.moveTo(X(-d.corner), Z(-1.6)); c.lineTo(X(-d.corner), Z(z3));
  c.arc(X(0), Z(0), d.dist * PX, Math.PI / 2 + a3, Math.PI / 2 - a3, true); c.lineTo(X(d.corner), Z(-1.6)); c.stroke();
  // marcas de las 5 posiciones
  c.fillStyle = princess ? '#fff6b8' : '#ffd23f';
  for (let i = 0; i < 5; i++) { const p = Court.spotPos(i, diff); c.beginPath(); c.arc(X(p[0]), Z(p[2]), 0.11 * PX, 0, Math.PI * 2); c.fill(); }
  // laterales
  c.strokeStyle = '#ffffff'; c.lineWidth = 0.05 * PX; line([[-7.5, -1.6], [-7.5, 13.6]]); line([[7.5, -1.6], [7.5, 13.6]]);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;
}
function ballTex(kind) {
  const W = 512, H = 256, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
  if (kind === 'money') { const cols = ['#d6213a', '#ffffff', '#1d4fbf', '#ffffff', '#d6213a', '#1d4fbf', '#ffffff', '#1d4fbf']; for (let i = 0; i < 8; i++) { c.fillStyle = cols[i]; c.fillRect(i * W / 8, 0, W / 8 + 1, H); } }
  else if (kind === 'rainbow') { const cols = ['#ff4d6d', '#ff9f1c', '#ffe14d', '#3cd070', '#3fa7ff', '#9b5cff', '#ff5fa2', '#ffe14d']; for (let i = 0; i < 8; i++) { c.fillStyle = cols[i]; c.fillRect(i * W / 8, 0, W / 8 + 1, H); } }
  else { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#e2731f'); g.addColorStop(0.5, '#ee7d24'); g.addColorStop(1, '#d4661a'); c.fillStyle = g; c.fillRect(0, 0, W, H); }
  // granulado
  for (let i = 0; i < 9000; i++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.05)'; c.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
  // costuras
  c.strokeStyle = '#1b0f08'; c.lineWidth = 5;
  c.beginPath(); c.moveTo(0, H / 2); c.lineTo(W, H / 2); c.stroke();
  for (const u of [0, W / 2]) { c.beginPath(); c.moveTo(u + 1, 0); c.lineTo(u + 1, H); c.stroke(); }
  for (const u0 of [W / 4, 3 * W / 4]) { c.beginPath(); for (let v = 0; v <= H; v += 4) { const k = v / H; const u = u0 + Math.sin(k * Math.PI) * W * 0.11 * (u0 < W / 2 ? 1 : -1) * Math.cos(k * Math.PI * 2 - Math.PI) * -1; v ? c.lineTo(u, v) : c.moveTo(u, v); } c.stroke(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function netTex() {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const c = cv.getContext('2d');
  c.strokeStyle = '#ffffff'; c.lineWidth = 5;
  const n = 8, rows = 4;
  for (let i = -1; i <= n; i++) { c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32 + 32 * rows, 128); c.stroke(); c.beginPath(); c.moveTo(i * 32 + 32, 0); c.lineTo(i * 32 + 32 - 32 * rows, 128); c.stroke(); }
  const t = new THREE.CanvasTexture(cv); t.wrapS = THREE.RepeatWrapping; t.repeat.set(1.5, 1); return t;
}
function textSprite(txt, size = 128, bg) {
  const cv = document.createElement('canvas'); const c = cv.getContext('2d'); c.font = `900 ${size}px "Arial Black", sans-serif`;
  const w = Math.ceil(c.measureText(txt).width) + size * 0.6; cv.width = w; cv.height = size * 1.5;
  c.font = `900 ${size}px "Arial Black", "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
  if (bg) { c.fillStyle = bg; const r = size * 0.4; c.beginPath(); c.roundRect ? c.roundRect(0, 0, w, cv.height, r) : c.rect(0, 0, w, cv.height); c.fill(); c.fillStyle = '#222'; } else c.fillStyle = '#fff';
  c.fillText(txt, w / 2, cv.height / 2);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  s.scale.set(w / cv.height, 1, 1); return s;
}

/* ---------------- armado de la escena ---------------- */
function buildArena() {
  scene.background = new THREE.Color('#0a0f24');
  scene.fog = new THREE.Fog('#0a0f24', 22, 48);
  const hemi = new THREE.HemisphereLight('#dfe6ff', '#3a2615', 0.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff6e8', 2.4); sun.position.set(5, 16, 9); sun.target.position.set(0, 0, 4);
  if (!LOW) { sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 12, bottom: -6, near: 1, far: 40 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; }
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#9fb4ff', 0.6); fill.position.set(-8, 10, -6); scene.add(fill);
  // piso exterior
  const out = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: '#141a3a', roughness: 0.9 })); out.rotation.x = -Math.PI / 2; out.position.y = -0.01; out.receiveShadow = true; scene.add(out);
  // cancha
  courtMesh = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshStandardMaterial({ roughness: 0.32, metalness: 0.0 }));
  courtMesh.rotation.x = -Math.PI / 2; courtMesh.position.set(0, 0, 5.6); courtMesh.receiveShadow = true; scene.add(courtMesh);
  // tribunas
  const standMat = new THREE.MeshStandardMaterial({ color: '#1a2250', roughness: 0.8 });
  const seatMat = new THREE.MeshStandardMaterial({ color: '#25306b', roughness: 0.7 });
  const tiers = [];
  for (let r = 0; r < 10; r++) { const b = new THREE.Mesh(new THREE.BoxGeometry(40, 0.5 + r * 0.55, 0.85), r % 2 ? standMat : seatMat); b.position.set(0, (0.5 + r * 0.55) / 2, -5.4 - r * 0.85); scene.add(b); tiers.push({ y: 0.5 + r * 0.55, z: -5.4 - r * 0.85, side: 0 }); }
  for (const sx of [-1, 1]) for (let r = 0; r < 8; r++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.5 + r * 0.55, 24), r % 2 ? standMat : seatMat); b.position.set(sx * (10.2 + r * 0.85), (0.5 + r * 0.55) / 2, 6); scene.add(b); tiers.push({ y: 0.5 + r * 0.55, x: sx * (10.2 + r * 0.85), side: sx }); }
  // público (instancias)
  const cols = ['#ff4d6d', '#ffd54d', '#3fa7ff', '#2fd27a', '#ffffff', '#b86bff', '#ff8a3d', '#1d428a', '#552583', '#fdb927', '#ce1141', '#111111'];
  const pos = [];
  for (const t of tiers) {
    if (t.side === 0) for (let x = -19; x <= 19; x += 0.62) pos.push([x + (Math.random() - 0.5) * 0.12, t.y, t.z + 0.05]);
    else for (let z = -5.5; z <= 17.5; z += 0.62) pos.push([t.x, t.y, z + (Math.random() - 0.5) * 0.12]);
  }
  const n = LOW ? Math.min(pos.length, 900) : pos.length;
  crowdBody = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.2, 0.32, 4, 8), new THREE.MeshStandardMaterial({ roughness: 0.8 }), n);
  crowdHead = new THREE.InstancedMesh(new THREE.SphereGeometry(0.15, 10, 8), new THREE.MeshStandardMaterial({ roughness: 0.7 }), n);
  const col = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const p = pos[Math.floor(i * pos.length / n)];
    crowdData.push({ p, ph: Math.random() * 6.28, amp: 0.6 + Math.random() * 0.6, face: p[2] < -5 ? 0 : (p[0] > 0 ? -Math.PI / 2 : Math.PI / 2) });
    crowdBody.setColorAt(i, col.set(cols[i * 7 % cols.length]));
    crowdHead.setColorAt(i, col.set(SKINS[(i * 13) % SKINS.length]));
  }
  scene.add(crowdBody, crowdHead); updateCrowd(0, 0);
  // carteles LED
  ledCv = document.createElement('canvas'); ledCv.width = 2048; ledCv.height = 128; ledCtx = ledCv.getContext('2d');
  ledTex = new THREE.CanvasTexture(ledCv); ledTex.colorSpace = THREE.SRGBColorSpace; ledTex.wrapS = THREE.RepeatWrapping;
  drawLed('🏀 TRIPLES · CONCURSO DE TRIPLES · PF JUEGOS · ');
  const ledMat = new THREE.MeshBasicMaterial({ map: ledTex });
  const b1 = new THREE.Mesh(new THREE.BoxGeometry(18, 0.85, 0.15), [new THREE.MeshStandardMaterial({ color: '#111' }), new THREE.MeshStandardMaterial({ color: '#111' }), new THREE.MeshStandardMaterial({ color: '#111' }), new THREE.MeshStandardMaterial({ color: '#111' }), ledMat, new THREE.MeshStandardMaterial({ color: '#111' })]);
  b1.position.set(0, 0.45, -3.4); scene.add(b1);
  for (const sx of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(14, 0.85, 0.15), ledMat); b.position.set(sx * 9.0, 0.45, 6); b.rotation.y = -sx * Math.PI / 2; scene.add(b); }
  // haces de luz del techo (efecto)
  const beamMat = new THREE.MeshBasicMaterial({ color: '#fff7d6', transparent: true, opacity: 0.045, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  for (const [x, z] of [[-6, 2], [6, 2], [-4, 9], [4, 9], [0, -1]]) { const cone = new THREE.Mesh(new THREE.ConeGeometry(2.6, 16, 24, 1, true), beamMat); cone.position.set(x, 8, z); scene.add(cone);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), new THREE.MeshBasicMaterial({ color: '#fffbe8' })); lamp.position.set(x, 16, z); scene.add(lamp); }
  // pantalla gigante colgada
  const jumbo = new THREE.Group(); const jb = new THREE.Mesh(new THREE.BoxGeometry(5, 2.6, 5), new THREE.MeshStandardMaterial({ color: '#111522', roughness: 0.5 })); jumbo.add(jb);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 2.2), ledMat); scr.position.z = 2.51; jumbo.add(scr);
  jumbo.position.set(0, 12.5, 5); scene.add(jumbo);
  // pelota
  ballMats.normal = new THREE.MeshStandardMaterial({ map: ballTex('normal'), roughness: 0.75 });
  ballMats.money = new THREE.MeshStandardMaterial({ map: ballTex('money'), roughness: 0.6 });
  ballMats.rainbow = new THREE.MeshStandardMaterial({ map: ballTex('rainbow'), roughness: 0.6 });
  buildHoop(); buildRacks();
  ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 32, 24), ballMats.normal); ball.castShadow = true; scene.add(ball);
  fxGroup = new THREE.Group(); scene.add(fxGroup);
  buildConfetti();
}
function drawLed(txt) {
  const c = ledCtx; c.fillStyle = '#05060c'; c.fillRect(0, 0, 2048, 128);
  const g = c.createLinearGradient(0, 0, 2048, 0); g.addColorStop(0, '#ff9f1c'); g.addColorStop(0.5, '#ffd23f'); g.addColorStop(1, '#ff5fa2');
  c.fillStyle = g; c.font = '900 84px "Arial Black", sans-serif'; c.textBaseline = 'middle';
  const w = c.measureText(txt).width; for (let x = 0; x < 2048; x += w) c.fillText(txt, x, 66);
  // puntitos LED
  c.fillStyle = 'rgba(0,0,0,.35)'; for (let y = 0; y < 128; y += 6) c.fillRect(0, y, 2048, 2);
  ledTex.needsUpdate = true;
}
function buildHoop() {
  const g = new THREE.Group();
  const pad = new THREE.MeshStandardMaterial({ color: '#1d3fa8', roughness: 0.6 }), steel = new THREE.MeshStandardMaterial({ color: '#2c303a', roughness: 0.4, metalness: 0.6 });
  const baseB = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.95, 1.6), pad); baseB.position.set(0, 0.47, -3.1); baseB.castShadow = true; g.add(baseB);
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.1, 0.3), pad); pole.position.set(0, 2.3, -2.9); pole.castShadow = true; g.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 2.4), steel); arm.position.set(0, 3.55, -1.65); arm.castShadow = true; g.add(arm);
  const arm2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 2.8), steel); arm2.position.set(0, 3.0, -1.75); arm2.rotation.x = 0.35; g.add(arm2);
  // tablero de vidrio
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.83, 1.07, 0.03), new THREE.MeshStandardMaterial({ color: '#dff0ff', transparent: true, opacity: 0.22, roughness: 0.04, metalness: 0.2, envMapIntensity: 1.5 }));
  glass.position.set(0, (BOARD.y0 + BOARD.y1) / 2, BOARD.z - 0.015); g.add(glass);
  const white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 }), red = new THREE.MeshStandardMaterial({ color: '#ff3b1f', roughness: 0.4 });
  const frame = (w, h, x, y, m, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.035), m); b.position.set(x, y, z || BOARD.z - 0.005); g.add(b); };
  const cy = (BOARD.y0 + BOARD.y1) / 2;
  frame(1.83, 0.05, 0, BOARD.y1 - 0.025, white); frame(1.83, 0.05, 0, BOARD.y0 + 0.025, white); frame(0.05, 1.07, -0.89, cy, white); frame(0.05, 1.07, 0.89, cy, white);
  frame(0.61, 0.04, 0, 3.05 + 0.02, red, BOARD.z + 0.002); frame(0.61, 0.04, 0, 3.5, red, BOARD.z + 0.002); frame(0.04, 0.46, -0.285, 3.27, red, BOARD.z + 0.002); frame(0.04, 0.46, 0.285, 3.27, red, BOARD.z + 0.002);
  // aro
  rimMesh = new THREE.Mesh(new THREE.TorusGeometry(RIM.r, 0.011, 10, 40), new THREE.MeshStandardMaterial({ color: '#ff5a14', roughness: 0.35, metalness: 0.5 }));
  rimMesh.rotation.x = Math.PI / 2; rimMesh.position.set(0, RIM.y, 0); rimMesh.castShadow = true; g.add(rimMesh);
  const brk = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.2), rimMesh.material); brk.position.set(0, RIM.y - 0.02, -RIM.r - 0.07); g.add(brk);
  // red
  net = new THREE.Mesh(new THREE.CylinderGeometry(RIM.r - 0.005, 0.13, 0.42, 24, 6, true), new THREE.MeshStandardMaterial({ map: netTex(), transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.9, color: '#ffffff' }));
  net.material.alphaMap = net.material.map; net.position.set(0, RIM.y - 0.21, 0); g.add(net);
  net.userData.base = net.geometry.attributes.position.array.slice();
  scene.add(g);
}
function buildRacks() {
  const steel = new THREE.MeshStandardMaterial({ color: '#9aa3bf', roughness: 0.35, metalness: 0.7 });
  for (let i = 0; i < 5; i++) {
    const g = new THREE.Group(); const balls = [];
    for (const sx of [-0.5, 0.5]) { for (const sz of [-0.12, 0.12]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 8), steel); leg.position.set(sx, 0.45, sz); g.add(leg); } }
    for (const sz of [-0.12, 0.12]) { const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 8), steel); bar.rotation.z = Math.PI / 2; bar.position.set(0, 0.88, sz); g.add(bar); }
    for (let b = 0; b < 5; b++) { const m = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 24, 16), ballMats.normal || new THREE.MeshStandardMaterial()); m.position.set(-0.4 + b * 0.2, 0.88 + BALL_R * 0.9, 0); m.castShadow = true; g.add(m); balls.push(m); }
    g.traverse(o => o.isMesh && (o.castShadow = true));
    scene.add(g); racks.push({ g, balls });
  }
}
function placeRacks(diff) {
  for (let i = 0; i < 5; i++) {
    const sp = Court.spotPos(i, diff), l = Math.hypot(sp[0], sp[2]), dir = [sp[0] / l, 0, sp[2] / l], side = [dir[2], 0, -dir[0]];
    const r = racks[i].g; r.position.set(sp[0] - side[0] * 0.95 + dir[0] * 0.15, 0, sp[2] - side[2] * 0.95 + dir[2] * 0.15);
    r.rotation.y = Math.atan2(side[0], side[2]) - Math.PI / 2;
  }
}
function buildConfetti() {
  const n = 320, geo = new THREE.PlaneGeometry(0.06, 0.1);
  confetti = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), n);
  confetti.userData.p = [];
  const cols = ['#ff4d6d', '#ffd54d', '#2fd27a', '#3fa7ff', '#b86bff', '#ff8a3d', '#ffffff'], c = new THREE.Color();
  for (let i = 0; i < n; i++) { confetti.setColorAt(i, c.set(cols[i % cols.length])); confetti.userData.p.push({ x: 0, y: -99, z: 0, vx: 0, vy: 0, vz: 0, r: 0, vr: 0 }); }
  confetti.frustumCulled = false; scene.add(confetti);
}
function burstConfetti(center, colors) {
  const c = new THREE.Color();
  confetti.userData.p.forEach((p, i) => { p.x = center.x + (Math.random() - 0.5) * 6; p.y = center.y + 3 + Math.random() * 4; p.z = center.z + (Math.random() - 0.5) * 4; p.vx = (Math.random() - 0.5) * 0.6; p.vy = -0.6 - Math.random() * 0.9; p.vz = (Math.random() - 0.5) * 0.6; p.r = Math.random() * 6; p.vr = (Math.random() - 0.5) * 8; if (colors) confetti.setColorAt(i, c.set(colors[i % colors.length])); });
  if (confetti.instanceColor) confetti.instanceColor.needsUpdate = true;
}
const _m = new THREE.Matrix4(), _qq = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
function updateConfetti(dt) {
  confetti.userData.p.forEach((p, i) => {
    if (p.y > -50) { p.x += p.vx * dt + Math.sin(p.r) * 0.01; p.y += p.vy * dt; p.z += p.vz * dt; p.r += p.vr * dt; if (p.y < 0) p.y = -99; }
    _e.set(p.r, p.r * 0.7, 0); _qq.setFromEuler(_e); _p.set(p.x, p.y, p.z); _m.compose(_p, _qq, _s); confetti.setMatrixAt(i, _m);
  });
  confetti.instanceMatrix.needsUpdate = true;
}
function updateCrowd(t, cheer) {
  for (let i = 0; i < crowdData.length; i++) {
    const d = crowdData[i], j = cheer > 0.05 ? Math.abs(Math.sin(t * 8 * d.amp + d.ph)) * 0.35 * cheer : Math.sin(t * 1.2 + d.ph) * 0.02;
    _e.set(0, d.face, 0); _qq.setFromEuler(_e);
    _p.set(d.p[0], d.p[1] + 0.36 + j, d.p[2]); _m.compose(_p, _qq, _s); crowdBody.setMatrixAt(i, _m);
    _p.y += 0.45; _m.compose(_p, _qq, _s); crowdHead.setMatrixAt(i, _m);
  }
  crowdBody.instanceMatrix.needsUpdate = true; crowdHead.instanceMatrix.needsUpdate = true;
}

/* ---------------- jugadores ---------------- */
function lookKey(l) { return JSON.stringify(l); }
function getPlayer(look) {
  const k = lookKey(look);
  if (!players.has(k)) { const p = new Player(base, clips, look, D); p.root.traverse(o => { if (o.isMesh) o.castShadow = !LOW; }); scene.add(p.root); players.set(k, p); }
  return players.get(k);
}

/* ---------------- render del juego ---------------- */
let lastShooter = null, prevSpotPos = null, moveFrom = null, resultSince = -1, lastPhase = '';
T3.renderGame = function (G, P, t, w, h) {
  if (!T3.ready) return false;
  const dt = lastT ? Math.min(0.05, t - lastT) : 0.016; lastT = t;
  if (renderer.domElement.width !== Math.round(w) || renderer.domElement.height !== Math.round(h)) { renderer.setSize(w / renderer.getPixelRatio(), h / renderer.getPixelRatio(), false); }
  const princess = document.body.classList.contains('princess');
  const key = G.diff + (princess ? 'p' : 'n');
  if (key !== courtKey) { courtKey = key; if (courtTex) courtTex.dispose(); courtTex = woodCourt(G.diff, princess); courtMesh.material.map = courtTex; courtMesh.material.needsUpdate = true; placeRacks(G.diff); scene.background.set(princess ? '#3a1840' : '#0a0f24'); scene.fog.color.set(princess ? '#3a1840' : '#0a0f24'); drawLed(princess ? '👑 TRIPLES · MODO PRINCESA · 🌈 · ' : '🏀 TRIPLES · CONCURSO DE TRIPLES · PF JUEGOS · '); }
  // racks
  for (let i = 0; i < 5; i++) {
    const r = G.racks[i], left = i === G.spot ? Math.max(0, 5 - G.ball - (G.shooter.hasBall || G.phase === 'set' ? 1 : 0) - (G.phase === 'shoot' || G.phase === 'flight' || G.phase === 'result' ? 1 : 0)) : (r.res.length ? 0 : 5);
    racks[i].balls.forEach((b, j) => { b.visible = j >= 5 - left; b.material = (r.money || j === 0) ? (princess ? ballMats.rainbow : ballMats.money) : ballMats.normal; });
  }
  // jugador actual
  for (const p of players.values()) p.root.visible = false;
  const pl = getPlayer(P.look); pl.root.visible = true;
  if (lastShooter !== pl) { lastShooter = pl; }
  const sp = Court.spotPos(G.spot, G.diff);
  const face = (x, z) => Math.atan2(-x, -z);
  let px = sp[0], pz = sp[2];
  if (G.phase === 'moving' && G.prevSpot != null && G.prevSpot !== G.spot) {
    const k = Court.camProgress ? Court.camProgress() : 1, a = Court.spotPos(G.prevSpot, G.diff);
    const a0 = Math.atan2(a[0], a[2]), a1 = Math.atan2(sp[0], sp[2]), r0 = Math.hypot(a[0], a[2]), r1 = Math.hypot(sp[0], sp[2]);
    const an = lerp(a0, a1, k), rr = lerp(r0, r1, k); px = Math.sin(an) * rr; pz = Math.cos(an) * rr;
    pl.play('run', 0.2); pl.root.rotation.y = Math.atan2(Math.cos(an) * (a1 > a0 ? 1 : -1), -Math.sin(an) * (a1 > a0 ? 1 : -1));
  } else { pl.root.rotation.y = face(sp[0], sp[2]); }
  pl.root.position.set(px, 0, pz);
  const ph = G.phase; let poseFn = null;
  if (ph !== lastPhase) { lastPhase = ph; resultSince = t; }
  if (ph === 'moving') { /* corre */ }
  else if (ph === 'pickup') { pl.play('idle', 0.25); poseFn = pickupPoseFn(clamp(G.phaseT / 0.6, 0, 1), 1); }
  else if (ph === 'ready') { pl.play('idle', 0.25); poseFn = shotPoseFn('hold'); }
  else if (ph === 'set') { poseFn = shotPoseFn('set', clamp((G.setT || 0) / 0.25, 0, 1)); }
  else if (ph === 'shoot' || ph === 'flight') { poseFn = shotPoseFn('release', clamp((G.shootT || 0) / 0.6, 0, 1)); }
  else if (ph === 'result') {
    const k = clamp((G.shootT || 0) / 0.6, 0, 1);
    if (k < 1) poseFn = shotPoseFn('release', k);
    else if (G.lastMade) { const e = clamp((t - resultSince) * 3, 0, 1); poseFn = () => ({ pose: { rA: new THREE.Vector3(-0.3, 0.2 + e * 0.6, 0.6), rF: new THREE.Vector3(-0.1, 1, 0.2) }, w: 1, face: { eyes: 'happy', mouth: 'grin' } }); }
    else { pl.play('headShake', 0.2); poseFn = () => ({ face: { eyes: 'open', mouth: 'flat' } }); }
  }
  else if (ph === 'celeb') { /* lo maneja T3.celebrate */ }
  else { pl.play('idle', 0.3); }
  if (celebOn) poseFn = celebPose(pl, t);
  else if (ph !== 'result' && ph !== 'moving' && pl.curName !== 'idle') pl.play('idle', 0.3);
  pl.update(dt, poseFn, t);
  // pelota: en la mano o en el aire
  const b = Court.ball(), hasB = G.shooter.hasBall || ph === 'set' || (ph === 'shoot');
  ball.material = G.shooter.money || (b && b.money) ? (princess ? ballMats.rainbow : ballMats.money) : ballMats.normal;
  if (hasB && !celebOn) {
    pl.root.updateMatrixWorld(true);
    const hR = pl.handWorld('R', _p.clone()), hL = pl.handWorld('L', new THREE.Vector3());
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(pl.root.quaternion);
    if (ph === 'ready' || ph === 'pickup') ball.position.copy(hR).add(hL).multiplyScalar(0.5).addScaledVector(fwd, 0.08);
    else ball.position.copy(hR).add(new THREE.Vector3(0, BALL_R * 0.9, 0)).addScaledVector(fwd, 0.03);
    ball.visible = !(ph === 'pickup' && G.phaseT < 0.3);
    T3._hand = ball.position.clone();
  } else if (b) { ball.visible = true; ball.position.set(b.p[0], b.p[1], b.p[2]); ball.rotation.x = b.rot; }
  else ball.visible = false;
  // red
  const kick = Court.netKick ? Court.netKick() : 0; net.scale.set(1 - kick * 0.25, 1 + kick * 0.3, 1 - kick * 0.25); net.position.y = RIM.y - 0.21 * (1 + kick * 0.3);
  rimMesh.position.y = RIM.y + (Court.rimShake ? Court.rimShake() * 0.012 * Math.sin(t * 70) : 0);
  // público y efectos
  updateCrowd(t, Math.max(Court.cheerLevel ? Court.cheerLevel() : 0, celebOn ? 1 : 0));
  updateConfetti(dt); ledTex.offset.x = (t * 0.05) % 1;
  // cámara
  if (celebOn) {
    const ang = Math.atan2(-sp[0], -sp[2]) + Math.sin((t - celebT0) * 0.5) * 0.35;
    const dist = 3.2 * Math.max(1, pl.s * 0.95);
    camera.position.set(px + Math.sin(ang) * dist, 1.55 * pl.s, pz + Math.cos(ang) * dist);
    camera.lookAt(px, 1.25 * pl.s, pz);
    updateFx(pl, t - celebT0);
  } else {
    // cámara detrás del tirador, un poco al costado, mirando hacia el aro (sigue al jugador cuando cambia de posición)
    const l = Math.hypot(px, pz) || 1, dx = px / l, dz = pz / l, sx = dz, sz = -dx, portrait = w < h;
    const back = portrait ? 3.9 : 3.3, sideOff = portrait ? 0.55 : 1.0, k = portrait ? 0.42 : 0.5;
    camera.position.set(px + dx * back + sx * sideOff, portrait ? 2.55 : 2.35, pz + dz * back + sz * sideOff);
    camera.lookAt(px * (1 - k), portrait ? 2.25 : 2.1, pz * (1 - k));
    fxGroup.visible = false;
  }
  const asp = w / h; camera.aspect = asp; camera.fov = asp >= 1 ? 50 : 64; camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  return true;
};
T3.handWorld = function () { return T3._hand ? [T3._hand.x, T3._hand.y, T3._hand.z] : null; };

/* ---------------- festejos ---------------- */
let celebLook = null;
function celebPose(pl, t) {
  const c = CELEB3D[pl.look.celeb] || CELEB3D.baile, tt = t - celebT0;
  if (c.clip) { pl.play(c.clip, 0.3); return () => ({ face: c.face }); }
  if (pl.curName !== 'idle') pl.play('idle', 0.3);
  const r = c(tt); T3._fx = r; return () => r;
}
T3.celebrate = function (on, look) {
  celebOn = on; celebT0 = performance.now() / 1000; lastT = 0;
  if (on) { const sp = camera.position; burstConfetti(new THREE.Vector3(sp.x * 0.7, 0, sp.z * 0.7), document.body.classList.contains('princess') ? ['#ff5fa2', '#ffd23f', '#b06ae0', '#ffffff', '#7ee0ff'] : null); T3._fx = null; }
  else { for (const p of players.values()) p.play('idle', 0.3); }
};
function fxSprite(name, make) { if (!sprites[name]) { sprites[name] = make(); fxGroup.add(sprites[name]); } return sprites[name]; }
function updateFx(pl, tt) {
  fxGroup.visible = true; for (const k in sprites) sprites[k].visible = false; if (chalk) chalk.visible = false;
  const fx = T3._fx && T3._fx.fx; if (!fx) return;
  const head = pl.head.getWorldPosition(new THREE.Vector3()), s = pl.s;
  const right = new THREE.Vector3(-1, 0, 0).applyQuaternion(pl.root.quaternion);
  if (fx === 'zzz') { for (let i = 0; i < 3; i++) { const z = fxSprite('z' + i, () => textSprite('z', 96)); const k = (tt * 0.6 + i / 3) % 1; z.visible = true; z.material.opacity = 1 - k; z.position.copy(head).addScaledVector(right, -0.3 - k * 0.5).add(new THREE.Vector3(0, 0.25 + k * 0.7, 0)); z.scale.setScalar(0.25 + k * 0.2); z.scale.x *= 0.8; } }
  if (fx === 'hearts') { for (let i = 0; i < 5; i++) { const hsp = fxSprite('h' + i, () => textSprite('❤️', 96)); const k = (tt * 0.5 + i / 5) % 1; hsp.visible = true; hsp.material.opacity = 1 - k; hsp.position.copy(head).addScaledVector(right, Math.sin(i * 2.1 + tt) * 0.6).add(new THREE.Vector3(0, -0.3 + k * 1.4, 0)); hsp.scale.set(0.3, 0.3, 1); } }
  if (fx === 'snake') { const sn = fxSprite('snake', () => textSprite('🐍', 96)); sn.visible = true; sn.position.copy(head).addScaledVector(right, 0.6).add(new THREE.Vector3(0, 0.2 + Math.sin(tt * 3) * 0.08, 0)); sn.scale.set(0.35, 0.35, 1); }
  if (fx === 'bat') { const k = T3._fx.fxK, bt = fxSprite('bat', () => textSprite('🦇', 96)); bt.visible = k < 0.75; const x = k < 0.48 ? lerp(3, 0.2, k / 0.48) : lerp(0.2, -1.5, (k - 0.48) / 0.3); bt.position.copy(head).addScaledVector(right, x).add(new THREE.Vector3(0, k < 0.48 ? 0.45 + Math.sin(tt * 18) * 0.08 : 0.45 - (k - 0.48) * 4, 0)); bt.scale.set(0.4, 0.4, 1); }
  if (fx === 'bubble') { const bb = fxSprite('bubble', () => textSprite('¿Quién sale segundo?', 64, 'rgba(255,255,255,.95)')); bb.visible = true; bb.position.copy(head).addScaledVector(right, -0.9).add(new THREE.Vector3(0, 0.45, 0)); const sc = 0.32; bb.scale.set(sc * bb.material.map.image.width / bb.material.map.image.height, sc, 1); }
  if (fx === 'chalk') {
    if (!chalk) { const n = 220, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3)); chalk = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 0.09, transparent: true, opacity: 0.8, depthWrite: false })); chalk.userData.dir = Array.from({ length: n }, () => new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8 + 0.3, Math.random() - 0.5).normalize().multiplyScalar(0.5 + Math.random())); fxGroup.add(chalk); }
    const k = clamp(T3._fx.fxK || 0, 0, 1); chalk.visible = k > 0; chalk.material.opacity = 0.85 * (1 - k * 0.7);
    const a = chalk.geometry.attributes.position; const c0 = head.clone().add(new THREE.Vector3(0, 0.5, 0));
    chalk.userData.dir.forEach((d, i) => a.setXYZ(i, c0.x + d.x * k * 1.6, c0.y + d.y * k * 1.4 - k * k * 0.4, c0.z + d.z * k * 1.6)); a.needsUpdate = true;
  }
}

/* ---------------- retratos y editor (renderer aparte) ---------------- */
let studio = null;
function getStudio() {
  if (studio) return studio;
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  const sc = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(r); sc.environment = pm.fromScene(new THREE.RoomEnvironment(), 0.04).texture; sc.environmentIntensity = 0.55;
  sc.add(new THREE.HemisphereLight('#ffffff', '#55402a', 1.0));
  const key = new THREE.DirectionalLight('#fff1dc', 2.2); key.position.set(2, 4, 5); sc.add(key);
  const rim = new THREE.DirectionalLight('#a9c4ff', 1.4); rim.position.set(-3, 3, -4); sc.add(rim);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1.4, 40), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.12 })); floor.rotation.x = -Math.PI / 2; sc.add(floor);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  const pl = new Player(base, clips, baseLook(), D); sc.add(pl.root);
  studio = { r, sc, cam, pl, floor, key: '' };
  return studio;
}
T3.portrait = function (cv, look) {
  if (!T3.ready) return false;
  const st = getStudio(); const k = lookKey(look);
  if (st.key !== k) { st.pl.build(look); st.key = k; }
  st.pl.root.rotation.y = 0.35; st.pl.play('idle', 0); st.pl.mixer.setTime(0.6); st.pl.update(0, null, 0); st.floor.visible = false;
  st.pl.root.updateMatrixWorld(true);
  const hp = st.pl.head.getWorldPosition(new THREE.Vector3());
  st.r.setPixelRatio(1); st.r.setSize(cv.width, cv.height, false);
  st.cam.aspect = 1; st.cam.fov = 22; st.cam.position.set(hp.x + 0.35, hp.y + 0.05, hp.z + 2.2); st.cam.lookAt(hp.x, hp.y - 0.12, hp.z); st.cam.updateProjectionMatrix();
  st.r.setClearColor(0x000000, 0); st.r.render(st.sc, st.cam);
  const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height);
  c.save(); c.beginPath(); c.arc(cv.width / 2, cv.height / 2, cv.width / 2, 0, Math.PI * 2); c.clip(); c.fillStyle = 'rgba(255,255,255,.14)'; c.fillRect(0, 0, cv.width, cv.height); c.drawImage(st.r.domElement, 0, 0); c.restore();
  return true;
};
let edT = 0;
T3.editor = function (holder, look, celebSince, dt, showBack) {
  if (!T3.ready) return false;
  const st = getStudio(); const k = lookKey(look);
  if (st.key !== k) { st.pl.build(look); st.key = k; }
  if (st.r.domElement.parentNode !== holder) { holder.appendChild(st.r.domElement); st.r.domElement.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%'; }
  const w = holder.clientWidth, h = holder.clientHeight; const pr = Math.min(2, devicePixelRatio || 1);
  if (st.r.domElement.width !== Math.round(w * pr) || st.r.domElement.height !== Math.round(h * pr)) { st.r.setPixelRatio(pr); st.r.setSize(w, h, false); }
  edT += dt; st.floor.visible = true;
  let poseFn = null;
  if (celebSince != null) { const c = CELEB3D[look.celeb] || CELEB3D.baile; const tt = celebSince; if (c.clip) { st.pl.play(c.clip, 0.3); poseFn = () => ({ face: c.face }); } else { if (st.pl.curName !== 'idle') st.pl.play('idle', 0.3); const r = c(tt); poseFn = () => r; } }
  else if (st.pl.curName !== 'idle') st.pl.play('idle', 0.3);
  st.pl.root.rotation.y = showBack ? Math.PI + Math.sin(edT * 0.6) * 0.3 : Math.sin(edT * 0.6) * 0.45;
  st.pl.update(dt, poseFn, edT);
  const H = 2.25 * st.pl.s; st.cam.aspect = w / h; st.cam.fov = 30; const dist = H / (2 * Math.tan(15 * Math.PI / 180)) * (w / h < 0.8 ? 1.25 : 1.05) + 0.6;
  st.cam.position.set(0, H * 0.52, dist); st.cam.lookAt(0, H * 0.46, 0); st.cam.updateProjectionMatrix();
  st.r.setClearColor(0x000000, 0); st.r.render(st.sc, st.cam);
  return true;
};
T3.detachEditor = function () { if (studio && studio.r.domElement.parentNode) studio.r.domElement.parentNode.removeChild(studio.r.domElement); };

/* ---------------- arranque ---------------- */
async function init() {
  const holder = document.getElementById('game');
  const cv = document.createElement('canvas'); cv.id = 'gl'; cv.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%';
  holder.insertBefore(cv, holder.firstChild);
  renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: !LOW, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(LOW ? 1 : 1.75, devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = !LOW; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new THREE.RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.45;
  camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.1, 120);
  const loader = new THREE.GLTFLoader();
  const [sk, sb] = await Promise.all([loader.loadAsync('/assets/models/esqueleto.glb'), loader.loadAsync('/assets/models/samba.glb').catch(() => null)]);
  base = sk.scene;
  clips = sk.animations.slice();
  if (sb) for (const c of sb.animations) { c.tracks = c.tracks.filter(tr => !/Hips\.position/.test(tr.name)); clips.push(c); }
  buildArena();
  T3.ready = true;
  document.dispatchEvent(new Event('t3ready'));
}
init().catch(e => { console.warn('3D no disponible:', e); T3.failed = true; });
