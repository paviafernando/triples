// Triples 3D — jugador cabezón armado sobre el esqueleto de Mixamo (animaciones de captura de movimiento).
// Las piezas del cuerpo se pegan a los huesos, así cualquier animación de Mixamo (idle, correr, samba…) lo mueve.
import * as THREE from '../../vendor/three.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const matCache = new Map();
function mat(color, rough = 0.6, metal = 0, extra = {}) {
  const k = color + '|' + rough + '|' + metal + '|' + JSON.stringify(extra);
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial(Object.assign({ color, roughness: rough, metalness: metal }, extra)));
  return matCache.get(k);
}
function shade(hex, f) { const c = new THREE.Color(hex); const h = {}; c.getHSL(h); c.setHSL(h.h, h.s, clamp(h.l + f, 0, 1)); return '#' + c.getHexString(); }

/* ----- texturas de la camiseta y tatuajes ----- */
function numberTex(num, name, c1, c2, back) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256; const c = cv.getContext('2d');
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  const stroke = shade(c1, -0.25);
  if (back && name) {
    const nm = String(name).toUpperCase().slice(0, 10);
    c.font = `900 ${Math.min(56, 360 / Math.max(4, nm.length))}px "Arial Black", Impact, sans-serif`;
    c.fillStyle = c2; c.fillText(nm, 128, 46);
  }
  c.font = `900 ${back ? 150 : 128}px "Arial Black", Impact, sans-serif`;
  c.lineWidth = 14; c.strokeStyle = stroke; c.strokeText(String(num), 128, back ? 160 : 136);
  c.fillStyle = c2; c.fillText(String(num), 128, back ? 160 : 136);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const tatCache = new Map();
function tattooMat(skin) {
  if (tatCache.has(skin)) return tatCache.get(skin);
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256; const c = cv.getContext('2d');
  c.fillStyle = skin; c.fillRect(0, 0, 128, 256);
  c.strokeStyle = 'rgba(20,20,35,.75)'; c.lineWidth = 5; c.lineCap = 'round';
  for (let i = 0; i < 7; i++) { const y = 20 + i * 34; c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(40, y - 22, 80, y + 22, 128, y); c.stroke(); c.beginPath(); c.arc(30 + (i % 3) * 34, y + 14, 7, 0, 5); c.stroke(); }
  c.fillStyle = 'rgba(20,20,35,.6)'; c.beginPath(); c.moveTo(64, 120); c.lineTo(84, 150); c.lineTo(64, 180); c.lineTo(44, 150); c.fill();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping;
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.55 }); tatCache.set(skin, m); return m;
}

/* ----- geometrías básicas ----- */
function capsuleBetween(a, b, r1, r2, material) {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length();
  const g = new THREE.Group();
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, len, 16, 1, true), material);
  cyl.position.y = len / 2; g.add(cyl);
  const s1 = new THREE.Mesh(new THREE.SphereGeometry(r1, 16, 12), material); g.add(s1);
  const s2 = new THREE.Mesh(new THREE.SphereGeometry(r2, 16, 12), material); s2.position.y = len; g.add(s2);
  g.position.copy(a);
  g.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  return g;
}
function sphere(r, material, ws = 24, hs = 16) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), material); m.castShadow = true; return m; }
function shell(r, material, phiS, phiL, thS, thL) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20, phiS, phiL, thS, thL), material); m.castShadow = true; return m; }

/* ----- medidas ----- */
export function bodyMetrics(look) {
  const bmi = look.weight / Math.pow(look.height / 100, 2);
  const g = clamp(0.8 + look.build * 0.1 + (bmi - 24) * 0.035, 0.72, 1.5);
  return { s: look.height / 178, g };
}

/* ======================= JUGADOR ======================= */
export class Player {
  constructor(base, clips, look, D) {
    this.D = D; // datos (SKINS, HAIR_COLORS, ...)
    this.root = new THREE.Group();
    this.rig = base.clone(true);
    this.root.add(this.rig);
    this.bones = {};
    this.rig.traverse(o => { const n = o.name.replace(/^mixamorig:?/, ''); if (o.name.indexOf('mixamorig') === 0) this.bones[n] = o; });
    this.mixer = new THREE.AnimationMixer(this.rig);
    this.actions = {};
    for (const c of clips) { const a = this.mixer.clipAction(c); this.actions[c.name] = a; }
    this.cur = null;
    this.poseW = 0; this.pose = null; this.face = { eyes: 'open', mouth: 'smile', look: 0 };
    this.parts = new THREE.Group();
    this.build(look);
    this.play('idle', 0);
  }
  b(n) { return this.bones[n]; }
  play(name, fade = 0.25, once = false, speed = 1) {
    const a = this.actions[name]; if (!a) return;
    if (this.cur === a && !once) return;
    a.reset(); a.enabled = true; a.setEffectiveTimeScale(speed); a.setEffectiveWeight(1);
    a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat); a.clampWhenFinished = once;
    if (this.cur && this.cur !== a) this.cur.crossFadeTo(a, fade, false);
    a.play(); this.cur = a; this.curName = name;
  }
  /* ---------- armado del cuerpo según el look ---------- */
  build(look) {
    this.look = look;
    // limpiar piezas anteriores
    if (this.attached) for (const o of this.attached) o.parent && o.parent.remove(o);
    this.attached = [];
    const D = this.D;
    const skin = D.SKINS[look.skin], hairC = D.HAIR_COLORS[look.hairColor];
    const kit = D.KIT_COLORS[look.kit % D.KIT_COLORS.length];
    const shoeC = D.SHOE_COLORS[look.shoes % D.SHOE_COLORS.length];
    const { s, g } = bodyMetrics(look); this.g = g;
    // armar en reposo (T-pose) sin escala, después escalar
    this.mixer.stopAllAction(); this.cur = null;
    this.root.scale.setScalar(1); this.root.position.set(0, 0, 0); this.root.quaternion.identity();
    this.rig.traverse(o => { if (o.userData.restQ) o.quaternion.copy(o.userData.restQ); else o.userData.restQ = o.quaternion.clone(); if (o.userData.restP) o.position.copy(o.userData.restP); else o.userData.restP = o.position.clone(); });
    this.root.updateMatrixWorld(true);
    const P = n => this.b(n).getWorldPosition(new THREE.Vector3());
    const attach = (boneName, obj) => { this.root.add(obj); obj.updateMatrixWorld(true); this.b(boneName).attach(obj); this.attached.push(obj); return obj; };
    const mSkin = mat(skin, 0.55), mKit = mat(kit[0], 0.7), mTrim = mat(kit[1], 0.6), mSock = mat('#f4f4f4', 0.8), mShoe = mat(shoeC, 0.45), mSole = mat(shoeC === '#ffffff' ? '#d9d9d9' : '#f7f7f7', 0.6);
    const tat = look.tattoo;
    const armMat = side => { // side: 'R' | 'L'
      const sleeve = look.arms === 'mangas' || (look.arms === 'manga' && side === 'R');
      if (sleeve) return mat(kit[1] === '#ffffff' ? '#151515' : kit[0], 0.7);
      const t = tat === 'dos' || tat === 'todo' || (tat === 'der' && side === 'R') || (tat === 'izq' && side === 'L');
      return t ? tattooMat(skin) : mSkin;
    };
    const wR = 0.052 * g, legR = 0.07 * g;
    for (const S of ['Right', 'Left']) {
      const side = S[0];
      // hombro / deltoide
      const sh = sphere(0.066 * g, mSkin); sh.position.copy(P(S + 'Arm')); attach(S + 'Arm', sh);
      attach(S + 'Arm', capsuleBetween(P(S + 'Arm'), P(S + 'ForeArm'), 0.058 * g, wR, armMat(side)));
      attach(S + 'ForeArm', capsuleBetween(P(S + 'ForeArm'), P(S + 'Hand'), wR, 0.042 * g, armMat(side)));
      if (look.arms === 'munequeras' || look.arms === 'mangas') {
        const wb = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * g, 0.05 * g, 0.07, 16), mat(look.headband !== 'no' && look.headband !== 'kit' ? look.headband : kit[1], 0.8));
        const a = P(S + 'ForeArm'), b2 = P(S + 'Hand'); wb.position.lerpVectors(a, b2, 0.82); wb.quaternion.setFromUnitVectors(V(0, 1, 0), b2.clone().sub(a).normalize()); attach(S + 'ForeArm', wb);
      }
      // mano (mitón + pulgar)
      const hand = new THREE.Group(); const hp = P(S + 'Hand'), ip = P(S + 'HandIndex1');
      const palm = sphere(0.05, mSkin); palm.scale.set(1.35, 0.7, 1.1); hand.add(palm);
      const thumb = sphere(0.022, mSkin); thumb.position.set(0, 0, 0.045); hand.add(thumb);
      hand.position.copy(hp).lerp(ip, 0.55); attach(S + 'Hand', hand);
      this['hand' + side] = hand;
      // dedo índice para el festejo de Bird
      const idx = capsuleBetween(ip, ip.clone().add(V(side === 'R' ? -0.09 : 0.09, 0, 0)), 0.014, 0.012, mSkin); idx.visible = false; attach(S + 'HandIndex1', idx); this['finger' + side] = idx;
      // piernas
      attach(S + 'UpLeg', capsuleBetween(P(S + 'UpLeg'), P(S + 'Leg'), legR * 1.1, legR * 0.85, mSkin));
      attach(S + 'Leg', capsuleBetween(P(S + 'Leg'), P(S + 'Foot'), legR * 0.85, 0.045 * g, mSkin));
      if (look.extra === 'rodilleras') { const kp = new THREE.Mesh(new THREE.CylinderGeometry(legR * 1.0, legR * 1.0, 0.11, 16), mat('#202020', 0.8)); kp.position.copy(P(S + 'Leg')).add(V(0, -0.04, 0)); attach(S + 'Leg', kp); }
      // media
      const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * g, 0.048 * g, 0.16, 16), mSock); sock.position.copy(P(S + 'Foot')).add(V(0, 0.08, 0)); attach(S + 'Leg', sock);
      // zapatilla
      const shoe = new THREE.Group();
      const up = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.27, 2, 2, 2), mShoe); up.position.set(0, 0.01, 0.06); shoe.add(up);
      const toe = sphere(0.055, mShoe); toe.scale.set(1, 0.7, 1); toe.position.set(0, 0.005, 0.18); shoe.add(toe);
      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.3), mSole); sole.position.set(0, -0.035, 0.065); shoe.add(sole);
      shoe.traverse(o => o.isMesh && (o.castShadow = true));
      shoe.position.copy(P(S + 'Foot')).add(V(0, -0.03, 0)); attach(S + 'Foot', shoe);
      // muslo con el short
      const th = capsuleBetween(P(S + 'UpLeg').add(V(0, 0.04, 0)), P(S + 'UpLeg').lerp(P(S + 'Leg'), 0.55), legR * 1.45, legR * 1.3, mKit); attach(S + 'UpLeg', th);
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(legR * 1.33, legR * 1.33, 0.025, 16, 1, true), mTrim);
      const a2 = P(S + 'UpLeg'), b3 = P(S + 'Leg'); stripe.position.lerpVectors(a2, b3, 0.52); attach(S + 'UpLeg', stripe);
    }
    // cadera (short)
    const hipPts = [V(0.0, 0.84), V(0.15 * g, 0.86), V(0.17 * g, 0.95), V(0.165 * g, 1.07), V(0.0, 1.08)].map(p => new THREE.Vector2(p.x, p.y));
    const hips = new THREE.Mesh(new THREE.LatheGeometry(hipPts, 24), mKit); hips.scale.z = 0.72; hips.castShadow = true; attach('Hips', hips);
    // camiseta (musculosa)
    const jPts = [[0.0, 1.0], [0.16, 1.0], [0.17, 1.1], [0.175, 1.22], [0.17, 1.33], [0.13, 1.42], [0.085, 1.475], [0.06, 1.48]].map(p => new THREE.Vector2(p[0] * (p[1] < 1.44 ? g : 1), p[1]));
    const jersey = new THREE.Mesh(new THREE.LatheGeometry(jPts, 28), mKit); jersey.scale.z = 0.74; jersey.castShadow = true; attach('Spine1', jersey);
    const hem = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.012, 8, 24), mTrim); hem.rotation.x = Math.PI / 2; hem.position.set(0, 1.47, 0); hem.scale.y = 0.74; attach('Spine2', hem);
    // número adelante y atrás (con nombre)
    const front = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshStandardMaterial({ map: numberTex(look.number, '', kit[0], kit[1], false), transparent: true, roughness: 0.7 }));
    front.position.set(0, 1.24, 0.172 * g * 0.74 + 0.004); attach('Spine1', front);
    const backN = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.26), new THREE.MeshStandardMaterial({ map: numberTex(look.number, look.jersey, kit[0], kit[1], true), transparent: true, roughness: 0.7 }));
    backN.position.set(0, 1.25, -(0.172 * g * 0.74 + 0.004)); backN.rotation.y = Math.PI; attach('Spine1', backN);
    if (look.extra === 'cadena') { const ch = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.008, 8, 28), mat('#f5c542', 0.25, 0.9)); ch.position.set(0, 1.44, 0.03); ch.rotation.x = Math.PI / 2 + 0.5; attach('Spine2', ch); }
    // cuello
    attach('Neck', capsuleBetween(P('Neck').add(V(0, -0.03, 0)), P('Head').add(V(0, 0.03, 0)), 0.055 * Math.min(g, 1.2), 0.05 * Math.min(g, 1.2), mSkin));
    // cabeza
    const head = this.makeHead(look, skin, hairC, kit);
    head.position.copy(P('Head')).add(V(0, 0.19, 0.025)); attach('Head', head);
    this.head = head;
    // escala final: la cabeza no crece con la altura (los bajitos quedan más cabezones)
    this.root.updateMatrixWorld(true);
    this.root.scale.setScalar(s);
    head.scale.multiplyScalar(1 / Math.sqrt(s));
    this.s = s;
    this.hipsRest = this.b('Hips').userData.restP;
    this.setFace(this.face);
    this.play('idle', 0);
  }
  makeHead(look, skin, hairC, kit) {
    const R = 0.235, D = this.D, H = new THREE.Group();
    const fw = { redonda: [1, 1], ancha: [1.13, 0.95], larga: [0.9, 1.08], cuadrada: [1.06, 1] }[look.face] || [1, 1];
    const mSkin = mat(skin, look.hair === 'pelado' ? 0.32 : 0.55), mHair = mat(hairC, 0.85), mDark = mat('#2a1a12', 0.6);
    const skull = sphere(R, mSkin, 40, 28); skull.scale.set(fw[0], fw[1], 0.98); H.add(skull);
    if (look.face === 'cuadrada') { const jaw = new THREE.Mesh(new THREE.BoxGeometry(R * 1.5, R * 0.8, R * 1.4), mSkin); jaw.position.set(0, -R * 0.45, 0.02); H.add(jaw); }
    for (const sx of [-1, 1]) { const ear = sphere(R * 0.2, mat(shade(skin, -0.04), 0.6)); ear.scale.set(0.6, 1, 0.8); ear.position.set(sx * R * fw[0] * 0.98, -0.01, 0); H.add(ear);
      if (look.extra === 'aro' && sx > 0) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.004, 6, 16), mat('#f5c542', 0.2, 1)); ring.position.set(sx * R * fw[0] * 1.03, -0.05, 0.01); ring.rotation.y = Math.PI / 2; H.add(ring); } }
    const F = new THREE.Group(); H.add(F); this.faceG = F; const zf = R * 0.93;
    // ojos
    const eyeW = mat('#ffffff', 0.25), iris = mat(D.EYE_COLORS[look.eyes || 0], 0.3), pup = mat('#0d0d0d', 0.2), hl = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    this.eyes = [];
    for (const sx of [-1, 1]) {
      const e = new THREE.Group(); e.position.set(sx * R * 0.36, R * 0.08, zf - 0.01);
      const w = sphere(R * 0.2, eyeW); w.scale.set(1, 1.15, 0.55); e.add(w);
      const ir = sphere(R * 0.11, iris); ir.scale.z = 0.5; ir.position.z = R * 0.09; e.add(ir);
      const p = sphere(R * 0.06, pup); p.scale.z = 0.5; p.position.z = R * 0.12; e.add(p);
      const h = new THREE.Mesh(new THREE.SphereGeometry(R * 0.025, 8, 6), hl); h.position.set(R * 0.04, R * 0.05, R * 0.14); e.add(h);
      // párpado (ojo cerrado) y ojo feliz ^
      const lid = shell(R * 0.205, mat(skin, 0.55), 0, Math.PI * 2, 0, Math.PI * 0.62); lid.scale.set(1, 1.15, 0.58); lid.visible = false; e.add(lid);
      const happy = new THREE.Mesh(new THREE.TorusGeometry(R * 0.13, R * 0.028, 8, 16, Math.PI), mDark); happy.position.z = R * 0.06; happy.visible = false; e.add(happy);
      const closed = new THREE.Mesh(new THREE.TorusGeometry(R * 0.13, R * 0.025, 8, 16, Math.PI), mDark); closed.rotation.z = Math.PI; closed.position.set(0, R * 0.02, R * 0.08); closed.visible = false; e.add(closed);
      F.add(e); this.eyes.push({ g: e, w, ir, p, h, lid, happy, closed });
      // ceja
      const br = new THREE.Mesh(new THREE.BoxGeometry(R * 0.36, R * 0.07, R * 0.06), mat(look.hair === 'pelado' || look.hair === 'rapado' ? shade(hairC === '#ececec' ? '#777777' : hairC, 0) : hairC, 0.9));
      br.position.set(sx * R * 0.36, R * 0.37, zf - 0.005); br.rotation.z = sx * -0.12; F.add(br); e.userData.brow = br;
    }
    // nariz
    const nose = sphere(R * 0.12, mat(shade(skin, -0.05), 0.55)); nose.scale.set(1, 0.85, 0.9); nose.position.set(0, -R * 0.08, zf + R * 0.03); F.add(nose);
    // barba (antes que la boca)
    this.makeBeard(F, look, R, hairC, skin, fw);
    // bocas (se muestra una por expresión)
    const mouthC = mat('#5a1620', 0.5), teeth = mat('#ffffff', 0.3), tongue = mat('#ff6f8a', 0.5), guard = mat('#3fa7ff', 0.3);
    const my = -R * 0.42, mz = zf + 0.005;
    const smile = new THREE.Mesh(new THREE.TorusGeometry(R * 0.26, R * 0.035, 8, 20, Math.PI * 0.8), mouthC); smile.rotation.z = Math.PI + Math.PI * 0.1; smile.position.set(0, my + R * 0.2, mz - 0.01); smile.scale.y = 0.75;
    const open = new THREE.Group(); { const m = new THREE.Mesh(new THREE.CircleGeometry(R * 0.22, 24, 0, Math.PI), mouthC); m.rotation.z = Math.PI; m.position.z = 0.002; open.add(m); const t = new THREE.Mesh(new THREE.PlaneGeometry(R * 0.36, R * 0.07), look.extra === 'protector' ? guard : teeth); t.position.set(0, -R * 0.03, 0.004); open.add(t); const tg = new THREE.Mesh(new THREE.CircleGeometry(R * 0.1, 16), tongue); tg.position.set(0, -R * 0.16, 0.003); tg.scale.y = 0.6; open.add(tg); open.position.set(0, my + R * 0.06, mz + 0.008); }
    const grin = new THREE.Group(); { const m = new THREE.Mesh(new THREE.CircleGeometry(R * 0.3, 24, 0, Math.PI), mouthC); m.rotation.z = Math.PI; m.scale.y = 0.6; grin.add(m); const t = new THREE.Mesh(new THREE.PlaneGeometry(R * 0.5, R * 0.08), look.extra === 'protector' ? guard : teeth); t.position.set(0, -R * 0.035, 0.002); grin.add(t); grin.position.set(0, my + R * 0.06, mz + 0.008); }
    const tongueOut = new THREE.Group(); { const s2 = smile.clone(); s2.position.set(0, R * 0.14, -0.008); tongueOut.add(s2); const tg = sphere(R * 0.11, tongue); tg.scale.set(1, 1.3, 0.5); tg.position.set(R * 0.05, -R * 0.08, 0.01); tongueOut.add(tg); tongueOut.position.set(0, my + R * 0.06, mz); }
    const oMouth = new THREE.Mesh(new THREE.CircleGeometry(R * 0.09, 20), mouthC); oMouth.scale.y = 1.25; oMouth.position.set(0, my + R * 0.02, mz + 0.008);
    const jaw = new THREE.Group(); { const m = new THREE.Mesh(new THREE.PlaneGeometry(R * 0.5, R * 0.14), mouthC); jaw.add(m); const t = new THREE.Mesh(new THREE.PlaneGeometry(R * 0.44, R * 0.07), teeth); t.position.set(0, -R * 0.02, 0.002); jaw.add(t); jaw.position.set(0, my + R * 0.02, mz + 0.008); }
    const flat = new THREE.Mesh(new THREE.BoxGeometry(R * 0.36, R * 0.05, R * 0.03), mouthC); flat.position.set(0, my + R * 0.04, mz);
    const smirk = flat.clone(); smirk.rotation.z = 0.25; smirk.position.x = R * 0.04;
    this.mouths = { smile, open, shout: open, grin, tongue: tongueOut, o: oMouth, jaw, flat, smirk };
    for (const k in this.mouths) { F.add(this.mouths[k]); this.mouths[k].visible = false; }
    if (look.extra === 'protector') { const gp = sphere(R * 0.07, guard); gp.scale.set(1.2, 0.7, 0.6); gp.position.set(R * 0.26, my + R * 0.06, mz); F.add(gp); this.guardSmile = gp; }
    this.makeHair(H, look, R, hairC, fw);
    // vincha
    if (look.headband !== 'no') {
      const hb = new THREE.Mesh(new THREE.TorusGeometry(R * 1.0, R * 0.09, 10, 40), mat(look.headband === 'kit' ? kit[0] : look.headband, 0.8));
      hb.rotation.x = Math.PI / 2 - 0.25; hb.position.set(0, R * 0.52, -0.01); hb.scale.set(fw[0] * 1.02, 1.0, 1); H.add(hb);
    }
    // anteojos
    if (look.glasses !== 'no') this.makeGlasses(F, look.glasses, R, zf);
    if (look.extra === 'corona') { const cr = new THREE.Group(); const gold = mat('#ffd23f', 0.25, 0.8); const band = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.34, R * 0.38, R * 0.18, 20, 1, true), gold); cr.add(band); for (let i = 0; i < 5; i++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(R * 0.07, R * 0.2, 8), gold); const a = i / 5 * Math.PI * 2; sp.position.set(Math.cos(a) * R * 0.34, R * 0.18, Math.sin(a) * R * 0.34); cr.add(sp); } const gem = sphere(R * 0.05, mat('#ff5fa2', 0.2)); gem.position.set(0, 0, R * 0.38); cr.add(gem); cr.position.set(0, R * 1.02, -0.02); cr.rotation.x = -0.15; H.add(cr); }
    H.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return H;
  }
  makeBeard(F, look, R, hairC, skin, fw) {
    const b = look.beard; if (!b || b === 'no') return;
    const mH = mat(hairC, 0.95);
    if (b === 'sombra') { const sh = shell(R * 1.006, new THREE.MeshStandardMaterial({ color: '#2a1a10', transparent: true, opacity: 0.22, roughness: 1 }), 0.05 * Math.PI, 0.9 * Math.PI, 0.6 * Math.PI, 0.38 * Math.PI); sh.scale.set(fw[0], fw[1], 0.98); F.add(sh); return; }
    if (b === 'completa' || b === 'tupida') {
      const big = b === 'tupida' ? 1.08 : 1.03;
      const sh = shell(R * big, mH, 0.02 * Math.PI, 0.96 * Math.PI, 0.55 * Math.PI, 0.45 * Math.PI); sh.scale.set(fw[0], fw[1] * (b === 'tupida' ? 1.12 : 1), 0.98); F.add(sh);
      if (b === 'tupida') { const ch = sphere(R * 0.35, mH); ch.position.set(0, -R * 0.95, R * 0.45); ch.scale.set(1.2, 0.8, 0.8); F.add(ch); }
      const hole = new THREE.Mesh(new THREE.CircleGeometry(R * 0.2, 20), mat(skin, 0.55)); hole.scale.y = 0.55; hole.position.set(0, -R * 0.4, R * big * 0.94 + 0.006); F.add(hole);
    }
    if (b === 'candado') { const sh = shell(R * 1.03, mH, 0.32 * Math.PI, 0.36 * Math.PI, 0.66 * Math.PI, 0.3 * Math.PI); F.add(sh); }
    if (b === 'bigote' || b === 'candado' || b === 'tupida' || b === 'completa') {
      const mu = new THREE.Mesh(new THREE.CapsuleGeometry(R * 0.06, R * 0.3, 6, 12), mH); mu.rotation.z = Math.PI / 2; mu.position.set(0, -R * 0.25, R * 0.97); F.add(mu);
    }
  }
  makeHair(H, look, R, hairC, fw) {
    const st = look.hair, mH = mat(hairC, 0.85), add = (m) => { H.add(m); return m; };
    const cap = (r, th, tilt, op) => { const m = shell(R * r, op ? new THREE.MeshStandardMaterial({ color: hairC, roughness: 1, transparent: true, opacity: op }) : mH, 0, Math.PI * 2, 0, Math.PI * th); m.rotation.x = -tilt; m.scale.set(fw[0], fw[1], 1); return add(m); };
    switch (st) {
      case 'pelado': break;
      case 'rapado': cap(1.012, 0.48, 0.32, 0.8); break;
      case 'corto': cap(1.05, 0.46, 0.3); break;
      case 'entradas': { cap(1.04, 0.42, 0.42); break; }
      case 'rulos': { const c = cap(1.05, 0.45, 0.3); for (let i = 0; i < 46; i++) { const th = Math.acos(1 - Math.random() * 0.72), ph = Math.random() * Math.PI * 2; const v = new THREE.Vector3(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)); v.applyAxisAngle(V(1, 0, 0), -0.3); if (v.z > 0.55 && v.y < 0.75) continue; const b = sphere(R * (0.15 + Math.random() * 0.06), mH, 10, 8); b.position.copy(v.multiplyScalar(R * 1.06)); b.position.x *= fw[0]; add(b); } break; }
      case 'afro': { const a = sphere(R * 1.32, mat(hairC, 1), 28, 20); a.position.set(0, R * 0.34, -R * 0.32); add(a); break; }
      case 'trenzas': { cap(1.05, 0.48, 0.3); for (let i = 0; i < 12; i++) { const a = Math.PI * (0.15 + i / 11 * 0.7) + Math.PI; const x = Math.cos(a) * R * 0.95, z = Math.sin(a) * R * 0.95; const t = new THREE.Mesh(new THREE.CapsuleGeometry(R * 0.05, R * 1.2, 4, 8), mH); t.position.set(x * fw[0], -R * 0.35, z - R * 0.05); add(t); } break; }
      case 'largo': { cap(1.06, 0.5, 0.25); const back = new THREE.Mesh(new THREE.CapsuleGeometry(R * 0.85, R * 0.9, 8, 16), mH); back.scale.z = 0.45; back.position.set(0, -R * 0.35, -R * 0.55); add(back); break; }
      case 'peinado': { cap(1.05, 0.44, 0.3); const sw = sphere(R * 0.7, mH); sw.scale.set(1.25, 0.55, 1.1); sw.position.set(R * 0.2, R * 0.82, R * 0.22); sw.rotation.z = -0.25; add(sw); break; }
      case 'coronilla': { const t = new THREE.Mesh(new THREE.TorusGeometry(R * 0.95, R * 0.17, 10, 32, Math.PI * 1.25), mH); t.rotation.x = Math.PI / 2; t.rotation.z = Math.PI * 0.875; t.position.y = R * 0.15; t.scale.set(fw[0], 1, 1); add(t); break; }
      case 'cresta': { cap(1.012, 0.46, 0.3, 0.5); const m = new THREE.Mesh(new THREE.BoxGeometry(R * 0.22, R * 0.5, R * 1.7), mH); m.position.set(0, R * 0.95, -R * 0.08); add(m); break; }
      case 'rodete': { cap(1.05, 0.46, 0.3); const b = sphere(R * 0.36, mH); b.position.set(0, R * 1.1, -R * 0.2); add(b); break; }
      case 'flequillo': { cap(1.06, 0.48, 0.25); const f = sphere(R * 0.75, mH); f.scale.set(1.25, 0.42, 0.55); f.position.set(0, R * 0.55, R * 0.62); add(f); break; }
      case 'colitas': { cap(1.05, 0.46, 0.3); for (const sx of [-1, 1]) { const c = sphere(R * 0.33, mH); c.scale.set(0.8, 1.15, 0.8); c.position.set(sx * R * 1.18, R * 0.25, -R * 0.1); add(c); const tie = sphere(R * 0.1, mat('#ff5fa2', 0.4)); tie.position.set(sx * R * 0.98, R * 0.32, -R * 0.08); add(tie); } break; }
    }
  }
  makeGlasses(F, st, R, zf) {
    if (st === 'antiparras') { const fr = mat('#1b1b1b', 0.4), gl = new THREE.MeshStandardMaterial({ color: '#9fd3ff', transparent: true, opacity: 0.45, roughness: 0.1 }); for (const sx of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(R * 0.5, R * 0.36, R * 0.12), gl); l.position.set(sx * R * 0.36, R * 0.08, zf + R * 0.05); F.add(l); const fm = new THREE.Mesh(new THREE.TorusGeometry(R * 0.22, R * 0.035, 6, 20), fr); fm.scale.y = 0.75; fm.position.copy(l.position); fm.position.z += R * 0.05; F.add(fm); } const strap = new THREE.Mesh(new THREE.TorusGeometry(R * 1.01, R * 0.04, 6, 40), fr); strap.rotation.x = Math.PI / 2; strap.position.y = R * 0.08; F.add(strap); return; }
    if (st === 'sol') { const g = mat('#0e0e0e', 0.15, 0.3); for (const sx of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(R * 0.46, R * 0.28, R * 0.05), g); l.position.set(sx * R * 0.36, R * 0.08, zf + R * 0.12); F.add(l); } const br = new THREE.Mesh(new THREE.BoxGeometry(R * 0.3, R * 0.05, R * 0.04), g); br.position.set(0, R * 0.14, zf + R * 0.12); F.add(br); return; }
    const m = mat('#333333', 0.4); for (const sx of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(R * 0.2, R * 0.03, 6, 24), m); r.position.set(sx * R * 0.36, R * 0.08, zf + R * 0.1); F.add(r); }
  }
  setFace(f) {
    this.face = Object.assign({ eyes: 'open', mouth: 'smile', look: 0 }, f);
    if (!this.eyes) return;
    for (const e of this.eyes) {
      const open = this.face.eyes === 'open' || this.face.eyes === 'wide';
      e.w.visible = e.ir.visible = e.p.visible = e.h.visible = open;
      e.happy.visible = this.face.eyes === 'happy'; e.closed.visible = this.face.eyes === 'closed';
      e.lid.visible = false;
      e.ir.position.x = e.p.position.x = (this.face.look || 0) * 0.012;
      e.g.scale.setScalar(this.face.eyes === 'wide' ? 1.18 : 1);
    }
    for (const k in this.mouths) this.mouths[k].visible = false;
    const m = this.mouths[this.face.mouth] || this.mouths.smile; m.visible = true;
    if (this.guardSmile) this.guardSmile.visible = this.face.mouth === 'smile' || this.face.mouth === 'smirk';
  }
  /* ---------- poses procedurales encima de la animación ---------- */
  // dir en espacio del personaje: x = izquierda del jugador (+x), y = arriba, z = adelante
  aim(bone, child, dir, w) {
    const B = this.b(bone), C = this.b(child); if (!B || !C || w <= 0) return;
    const p = B.getWorldPosition(_a), c = C.getWorldPosition(_b);
    const cur = _c.subVectors(c, p).normalize();
    const tgt = _d.copy(dir).normalize().applyQuaternion(this.root.getWorldQuaternion(_q0));
    _q1.setFromUnitVectors(cur, tgt);
    const wq = B.getWorldQuaternion(_q2); const nq = _q3.copy(_q1).multiply(wq);
    const pq = B.parent.getWorldQuaternion(_q4).invert();
    nq.premultiply(pq);
    B.quaternion.slerp(nq, clamp(w, 0, 1));
    B.updateMatrixWorld(true);
  }
  turn(bone, x, y, z, w = 1) { const B = this.b(bone); if (!B) return; _e.set(x * w, y * w, z * w); _q0.setFromEuler(_e); B.quaternion.multiply(_q0); B.updateMatrixWorld(true); }
  applyPose(p, w) {
    if (!p || w <= 0) return;
    this.root.updateMatrixWorld(true);
    if (p.spine) this.turn('Spine', p.spine[0], p.spine[1] || 0, p.spine[2] || 0, w);
    if (p.chest) this.turn('Spine2', p.chest[0], p.chest[1] || 0, p.chest[2] || 0, w);
    if (p.shR) this.turn('RightShoulder', 0, 0, -p.shR, w);
    if (p.shL) this.turn('LeftShoulder', 0, 0, p.shL, w);
    if (p.rA) this.aim('RightArm', 'RightForeArm', p.rA, w);
    if (p.rF) this.aim('RightForeArm', 'RightHand', p.rF, w);
    if (p.rH) this.aim('RightHand', 'RightHandMiddle1', p.rH, w);
    if (p.lA) this.aim('LeftArm', 'LeftForeArm', p.lA, w);
    if (p.lF) this.aim('LeftForeArm', 'LeftHand', p.lF, w);
    if (p.lH) this.aim('LeftHand', 'LeftHandMiddle1', p.lH, w);
    if (p.rU) this.aim('RightUpLeg', 'RightLeg', p.rU, w);
    if (p.rL) this.aim('RightLeg', 'RightFoot', p.rL, w);
    if (p.lU) this.aim('LeftUpLeg', 'LeftLeg', p.lU, w);
    if (p.lL) this.aim('LeftLeg', 'LeftFoot', p.lL, w);
    if (p.head) this.turn('Head', p.head[0], p.head[1] || 0, p.head[2] || 0, w);
    if (p.neck) this.turn('Neck', p.neck[0], p.neck[1] || 0, p.neck[2] || 0, w);
  }
  update(dt, poseFn, t) {
    this.mixer.update(dt);
    // la raíz de las animaciones de Mixamo se mueve: la dejamos en su lugar (sin desplazarse por la cancha)
    const hips = this.b('Hips'); if (hips && this.lockHips !== false) { hips.position.x = this.hipsRest ? this.hipsRest.x : hips.position.x; hips.position.z = this.hipsRest ? this.hipsRest.z : hips.position.z; }
    if (poseFn) { const r = poseFn(this, t) || {}; if (r.pose) this.applyPose(r.pose, r.w == null ? 1 : r.w); if (r.y != null) this.rig.position.y = r.y / this.s; else this.rig.position.y = 0; if (r.face) this.setFaceIfChanged(r.face); if (r.finger != null) { this.fingerR.visible = !!r.finger; } }
    else this.rig.position.y = 0;
  }
  setFaceIfChanged(f) { const k = f.eyes + f.mouth + (f.look || 0); if (k !== this._fk) { this._fk = k; this.setFace(f); } }
  handWorld(side = 'R', out = new THREE.Vector3()) { return (side === 'R' ? this.handR : this.handL).getWorldPosition(out); }
}
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3();
const _q0 = new THREE.Quaternion(), _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), _q4 = new THREE.Quaternion();
const _e = new THREE.Euler();

/* ======================= POSES ======================= */
// Ayudas: R = derecha del jugador (-x), L = izquierda (+x). z = adelante.
const lerpN = (a, b, k) => a + (b - a) * k;
export function shotPoseFn(phase, k) {
  // phase: 'hold' | 'set' (k 0..1) | 'release' (k 0..1 desde que soltó) | 'land'
  return (pl) => {
    if (phase === 'hold') return { pose: { rA: V(-0.25, -0.55, 0.8), rF: V(0.2, 0.5, 0.85), lA: V(0.3, -0.55, 0.75), lF: V(-0.25, 0.5, 0.85), rU: V(0, -1, 0.15), rL: V(0, -1, -0.2), lU: V(0, -1, 0.15), lL: V(0, -1, -0.2) }, w: 1, y: -0.03, face: { eyes: 'open', mouth: 'flat' } };
    if (phase === 'set') {
      const e = k;
      return { pose: { rA: V(-0.25, lerpN(-0.55, 0.45, e), lerpN(0.8, 0.8, e)), rF: V(0.05, lerpN(0.5, 1, e), lerpN(0.85, 0.15, e)), rH: V(0, lerpN(0.3, 0.2, e), lerpN(0.9, -0.9, e)), lA: V(0.35, lerpN(-0.55, 0.35, e), 0.75), lF: V(-0.5, lerpN(0.5, 0.85, e), 0.35), rU: V(0, -1, lerpN(0.15, 0.4, e)), rL: V(0, -1, lerpN(-0.2, -0.45, e)), lU: V(0, -1, lerpN(0.15, 0.4, e)), lL: V(0, -1, lerpN(-0.2, -0.45, e)), spine: [lerpN(0, 0.12, e), 0, 0] }, w: 1, y: lerpN(-0.03, -0.12, e), face: { eyes: 'open', mouth: 'flat' } };
    }
    if (phase === 'release') {
      const j = Math.sin(clamp(k, 0, 1) * Math.PI); const e = clamp(k * 3, 0, 1);
      return { pose: { rA: V(-0.12, lerpN(0.45, 0.95, e), lerpN(0.8, 0.4, e)), rF: V(0, lerpN(1, 0.85, e), lerpN(0.15, 0.55, e)), rH: V(0, lerpN(0.2, -0.6, e), lerpN(-0.9, 0.8, e)), lA: V(0.35, 0.5, 0.75), lF: V(-0.3, 0.9, 0.3), rU: V(0, -1, 0.05), rL: V(0, -1, -0.05 - j * 0.3), lU: V(0, -1, 0.05), lL: V(0, -1, -0.05 - j * 0.3), spine: [-0.05, 0, 0] }, w: 1, y: j * 0.45, face: { eyes: 'open', mouth: 'o' } };
    }
    return null;
  };
}
export function pickupPoseFn(k, side) {
  const s = side || 1; // 1 = rack a la derecha del jugador
  return () => ({ pose: { spine: [0.35 * Math.sin(k * Math.PI), 0, 0], rA: V(-0.5 * s, -0.8, 0.4), rF: V(-0.3 * s, -0.9, 0.3), rU: V(0, -1, 0.25 * Math.sin(k * Math.PI)), lU: V(0, -1, 0.25 * Math.sin(k * Math.PI)), rL: V(0, -1, -0.3 * Math.sin(k * Math.PI)), lL: V(0, -1, -0.3 * Math.sin(k * Math.PI)) }, w: 1, y: -0.12 * Math.sin(k * Math.PI) });
}
// Festejos: devuelven {pose, y, face, clip?, fx?}
export const CELEB3D = {
  baile: { clip: 'SambaDance', face: { eyes: 'happy', mouth: 'grin' } },
  avion: t => { const w = Math.sin(t * 3); return { pose: { rA: V(-1, -w * 0.4, 0.05), rF: V(-1, -w * 0.4, 0.05), lA: V(1, w * 0.4, 0.05), lF: V(1, w * 0.4, 0.05), chest: [0, 0, w * 0.25], head: [0, 0, w * 0.15] }, face: { eyes: 'happy', mouth: 'open' }, run: true }; },
  musculos: t => { const f = 0.15 * Math.sin(t * 7); return { pose: { rA: V(-1, 0.05 + f, 0.1), rF: V(-0.1, 1, 0.15), lA: V(1, 0.05 - f, 0.1), lF: V(0.1, 1, 0.15), rU: V(-0.15, -1, 0.2), lU: V(0.15, -1, 0.2), rL: V(0, -1, -0.15), lL: V(0, -1, -0.15) }, y: -0.08, face: { eyes: 'open', mouth: 'shout' } }; },
  saludo: t => { const w = Math.sin(t * 9); return { pose: { rA: V(-0.5, 0.85, 0.2), rF: V(-0.3 + w * 0.5, 1, 0.1), lA: V(0.5, 0.85, 0.2), lF: V(0.3 - w * 0.5, 1, 0.1) }, y: Math.max(0, Math.sin(t * 5)) * 0.35, face: { eyes: 'happy', mouth: 'open' } }; },
  corazon: t => ({ pose: { rA: V(-0.5, -0.3, 0.8), rF: V(0.7, 0.55, 0.3), lA: V(0.5, -0.3, 0.8), lF: V(-0.7, 0.55, 0.3), head: [0, 0, Math.sin(t * 2.5) * 0.15] }, face: { eyes: 'happy', mouth: 'smile' }, fx: 'hearts' }),
  noche: t => { if (t % 3.2 < 0.7) return { pose: { rA: V(-0.4, 0.9, 0.1), rF: V(-0.2, 1, 0), lA: V(0.4, 0.9, 0.1), lF: V(0.2, 1, 0) }, y: Math.sin((t % 3.2) / 0.7 * Math.PI) * 0.35, face: { eyes: 'open', mouth: 'shout' } };
    return { pose: { rA: V(-0.3, -0.35, 0.85), rF: V(0.9, 0.9, 0.1), lA: V(0.6, -0.1, 0.75), lF: V(-0.3, 1, 0.1), head: [0, 0, -0.38], neck: [0, 0, -0.15] }, face: { eyes: 'closed', mouth: 'smile' }, fx: 'zzz' }; },
  oreja: t => { const s = Math.sin(t * 2.5); return { pose: { rA: V(-0.9, 0.45, 0.1), rF: V(0.4, 1, 0.1), rH: V(0, 1, 0.4), lA: V(0.6, -0.8, 0.2), lF: V(0.5, -0.8, 0.3), head: [0, 0, 0.25 + s * 0.06], chest: [0, s * 0.15, 0] }, face: { eyes: 'open', mouth: 'tongue', look: -1 } }; },
  tiza: t => { const k = (t % 3.2) / 3.2;
    if (k < 0.35) { const a = k / 0.35; return { pose: { rA: V(-0.2, -0.5, 0.85), rF: V(0.3, 0.2, 0.9), lA: V(0.2, -0.5, 0.85), lF: V(-0.3, 0.2, 0.9), rU: V(0, -1, 0.5 * a), lU: V(0, -1, 0.5 * a), rL: V(0, -1, -0.5 * a), lL: V(0, -1, -0.5 * a), spine: [0.25 * a, 0, 0] }, y: -0.18 * a, face: { eyes: 'open', mouth: 'flat' } }; }
    const b = clamp((k - 0.35) / 0.1, 0, 1); return { pose: { rA: V(-0.55, lerpN(-0.3, 1, b), 0.3), rF: V(-0.4, 1, 0.2), lA: V(0.55, lerpN(-0.3, 1, b), 0.3), lF: V(0.4, 1, 0.2), head: [-0.3 * b, 0, 0] }, y: b * 0.35 * (1 - clamp((k - 0.6) * 3, 0, 1)), face: { eyes: 'open', mouth: 'shout' }, fx: 'chalk', fxK: (k - 0.35) / 0.65 }; },
  hombros: t => { const k = Math.abs(Math.sin(t * 1.7)); return { pose: { shR: 0.35 * k, shL: 0.35 * k, rA: V(-0.85, -0.5, 0.15), rF: V(-0.6, 0.15, 0.8), rH: V(-0.5, 0, 0.5), lA: V(0.85, -0.5, 0.15), lF: V(0.6, 0.15, 0.8), lH: V(0.5, 0, 0.5), head: [0, 0, 0.12 * Math.sin(t * 1.7)] }, face: { eyes: 'open', mouth: k > 0.5 ? 'smirk' : 'tongue' } }; },
  mamba: t => ({ pose: { rA: V(-0.35, -0.5, 0.8), rF: V(0.95, 0.15, 0.25), lA: V(0.35, -0.55, 0.8), lF: V(-0.95, 0.2, 0.15), head: [-0.25 + Math.sin(t * 2) * 0.04, 0, 0] }, face: { eyes: 'open', mouth: 'jaw' }, fx: 'snake' }),
  shimmy: t => { const s = Math.sin(t * 16); return { pose: { chest: [0, s * 0.35, 0], rA: V(-0.9, -0.3, 0.3), rF: V(-0.2, 0.8, 0.5), lA: V(0.9, -0.3, 0.3), lF: V(0.2, 0.8, 0.5), rU: V(-0.25, -1, 0.3), lU: V(0.25, -1, 0.3), rL: V(0, -1, -0.3), lL: V(0, -1, -0.3) }, y: -0.12, face: { eyes: 'happy', mouth: 'grin' } }; },
  murcielago: t => { const k = (t % 3.2) / 3.2;
    if (k < 0.42) return { pose: { rA: V(-0.6, 0.6, 0.4), rF: V(-0.4, 0.9, 0.3), head: [-0.2, 0.3, 0] }, face: { eyes: 'wide', mouth: 'o', look: -1 }, fx: 'bat', fxK: k };
    if (k < 0.55) return { pose: { rA: V(0.3, 0.9, 0.5), rF: V(0.6, 0.6, 0.6), chest: [0, 0.4, 0] }, face: { eyes: 'open', mouth: 'shout' }, fx: 'bat', fxK: k };
    const w = Math.sin(t * 9); return { pose: { rA: V(-0.4, 0.9, 0.2), rF: V(-0.2, 1, 0), lA: V(0.4, 0.9 - w * 0.2, 0.2), lF: V(0.2, 1, 0) }, y: Math.abs(w) * 0.3, face: { eyes: 'happy', mouth: 'shout' }, fx: 'bat', fxK: k }; },
  dedo: t => ({ pose: { rA: V(-0.25, 1, 0.1), rF: V(-0.05, 1, 0.05), rH: V(0, 1, 0.1), lA: V(0.25, -1, 0.05), lF: V(0.1, -1, 0.15), head: [-0.08, -0.2, 0] }, face: { eyes: 'open', mouth: 'smirk', look: -1 }, finger: true, fx: 'bubble' })
};
