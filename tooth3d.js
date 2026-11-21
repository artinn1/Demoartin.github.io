/* Dintele 3D procedural (Three.js) — molar realist: smalț lucios, 4 cuspizi, șanțuri, 3 rădăcini, culori de dentină.
   Poza e controlată din script.js prin window.toothState. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const S = window.toothState;
const canvas = document.getElementById('gl');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = matchMedia('(max-width: 899px)').matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (e) {
  document.documentElement.classList.add('no-webgl');
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
camera.position.z = 9;

/* ---------- Utilitare ---------- */
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const col = (r, g, b) => [r, g, b];
const lerpCol = (c1, c2, t) => [mix(c1[0], c2[0], t), mix(c1[1], c2[1], t), mix(c1[2], c2[2], t)];

/* Culori (spațiu liniar aproximativ): smalț alb-sidefat, dentină spre gât, cement la rădăcini */
const ENAMEL = col(0.97, 0.97, 0.95);
const ENAMEL_COOL = col(0.92, 0.96, 1.0);        // vârfurile cuspizilor: translucide, ușor albăstrui
const DENTIN = col(0.90, 0.82, 0.66);            // zona cervicală
const CEMENT = col(0.86, 0.76, 0.58);            // rădăcini
const CEMENT_TIP = col(0.78, 0.66, 0.46);

/* ---------- Coroană: superelipsoid pătrățos + cuspizi + șanțuri ---------- */
const CUSPS = [[-0.5, -0.42], [0.5, -0.42], [-0.5, 0.42], [0.5, 0.42]];
function makeCrown() {
  let g = new THREE.IcosahedronGeometry(1, isMobile ? 36 : 56);
  g.deleteAttribute('uv'); g.deleteAttribute('normal');
  g = mergeVertices(g, 1e-4);
  const p = g.attributes.position;
  const colors = new Float32Array(p.count * 3);

  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    // 1) formă pătrățoasă în plan (superelipsoid) — ca un molar real
    const q = 0.78;
    x = Math.sign(x) * Math.pow(Math.abs(x), q);
    z = Math.sign(z) * Math.pow(Math.abs(z), q);
    x *= 1.28; z *= 1.08;

    let tip = 0;
    if (y > 0) {
      y = Math.pow(y, 0.9) * 0.82;
      const w = smooth(0.12, 0.7, y);             // doar fața ocluzală e modelată
      // cuspizi: 4 ridicături gaussiene
      let bump = 0;
      for (const [cx, cz] of CUSPS) bump += Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / 0.2);
      // șanțuri în cruce + groapă centrală
      const fis = Math.exp(-(x * x) / 0.012) + Math.exp(-(z * z) / 0.016);
      const pit = Math.exp(-(x * x + z * z) / 0.06);
      // creastă marginală ușoară pe contur
      const edge = smooth(0.8, 1.15, Math.hypot(x / 1.28, z / 1.08));
      y += w * (0.27 * bump - 0.2 * fis - 0.1 * pit + 0.05 * edge);
      tip = Math.min(1, bump) * w;
    } else {
      // îngustare spre gât (linia cervicală) + rotunjire
      const k = 1 - 0.40 * smooth(0, 1, -y) ** 0.8;
      x *= k; z *= k; y *= 0.78;
    }
    p.setXYZ(i, x, y, z);

    // culoare: smalț sus → dentină spre gât
    let c = lerpCol(ENAMEL, ENAMEL_COOL, tip * 0.8);
    c = lerpCol(c, DENTIN, smooth(-0.05, -0.6, y));
    c = lerpCol(c, [c[0] * 0.93, c[1] * 0.95, c[2] * 1.0], smooth(0.1, 0.9, 1 - tip) * 0.35 * smooth(0, 0.7, y));
    colors[i * 3] = c[0]; colors[i * 3 + 1] = c[1]; colors[i * 3 + 2] = c[2];
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

/* ---------- Rădăcină: con curbat, vârf rotunjit ---------- */
function makeRoot(len, r0, bendX, bendZ) {
  const g = new THREE.CylinderGeometry(r0, 0.045, len, 40, 24, false);
  const p = g.attributes.position;
  const colors = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const t = (len / 2 - y) / len;                 // 0 sus → 1 jos
    p.setX(i, p.getX(i) + bendX * t * t);
    p.setZ(i, p.getZ(i) + bendZ * t * t);
    const c = lerpCol(CEMENT, CEMENT_TIP, smooth(0.3, 1, t));
    colors[i * 3] = c[0]; colors[i * 3 + 1] = c[1]; colors[i * 3 + 2] = c[2];
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

/* ---------- Material: smalț lucios, ud ---------- */
const toothMat = new THREE.MeshPhysicalMaterial({
  vertexColors: true,
  roughness: 0.3, metalness: 0,
  clearcoat: 0.9, clearcoatRoughness: 0.14,       // film de salivă
  sheen: 0.5, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xfff6e6),
  iridescence: 0.12, iridescenceIOR: 1.25,         // opalescența smalțului
  envMapIntensity: 1.35
});

const tooth = new THREE.Group();
const body = new THREE.Group();
body.position.y = 0.5;
tooth.add(body);
body.add(new THREE.Mesh(makeCrown(), toothMat));

const roots = [
  { x: -0.55, z: 0.12, len: 1.5, r: 0.3, bx: -0.22, bz: 0.04 },
  { x: 0.55, z: 0.12, len: 1.45, r: 0.3, bx: 0.22, bz: 0.04 },
  { x: 0.0, z: -0.5, len: 1.35, r: 0.26, bx: 0.0, bz: -0.2 }
];
roots.forEach(r => {
  const m = new THREE.Mesh(makeRoot(r.len, r.r, r.bx, r.bz), toothMat);
  m.position.set(r.x, -0.42 - r.len / 2, r.z);
  body.add(m);
});
scene.add(tooth);

/* ---------- Lumini ---------- */
scene.add(new THREE.HemisphereLight(0xffffff, 0xcfe3f5, 1.3));
const key = new THREE.DirectionalLight(0xfff8ee, 2.4); key.position.set(3, 5, 5); scene.add(key);
const rim = new THREE.DirectionalLight(0x9fd0ff, 1.8); rim.position.set(-5, 2, -3); scene.add(rim);
const fill = new THREE.PointLight(0x7cc0f5, 16, 0, 2); fill.position.set(-4, -2, 4); scene.add(fill);

/* ---------- Bule plutitoare (decor) ---------- */
const COUNT = isMobile ? 10 : 24;
const bubbleMat = new THREE.MeshPhysicalMaterial({
  color: 0xcfe8fb, roughness: 0.08, clearcoat: 1, transparent: true, opacity: 0.75, envMapIntensity: 1.2
});
const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 20, 20), bubbleMat, COUNT);
scene.add(bubbles);
const bd = Array.from({ length: COUNT }, () => ({
  r: 2.3 + Math.random() * 2.6, a: Math.random() * Math.PI * 2, sp: (0.05 + Math.random() * 0.12) * (Math.random() < .5 ? -1 : 1),
  y: (Math.random() - 0.5) * 4.2, z: (Math.random() - 0.5) * 3, s: 0.03 + Math.random() * 0.09, ph: Math.random() * 6
}));
const dummy = new THREE.Object3D();

/* ---------- Dimensiuni + resize ---------- */
let halfW = 1, halfH = 1, fit = 1;
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
  halfW = halfH * camera.aspect;
  fit = Math.min(1, halfW / 1.9);
}
addEventListener('resize', resize);
resize();

/* ---------- Mouse ---------- */
const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener('pointermove', e => {
  mouse.tx = (e.clientX / innerWidth) * 2 - 1;
  mouse.ty = (e.clientY / innerHeight) * 2 - 1;
}, { passive: true });

/* ---------- Bucla de randare ---------- */
const cur = { x: S.x, y: S.y, s: S.s, ry: S.ry, rx: S.rx, rz: S.rz, extra: S.extra };
let spin = 0, last = performance.now();
const L = (a, b, k) => a + (b - a) * k;

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const k = 1 - Math.pow(0.001, dt);

  cur.x = L(cur.x, S.x, k * 4); cur.y = L(cur.y, S.y, k * 4);
  cur.s = L(cur.s, S.s, k * 4); cur.ry = L(cur.ry, S.ry, k * 3);
  cur.rx = L(cur.rx, S.rx, k * 4); cur.rz = L(cur.rz, S.rz, k * 4);
  cur.extra = L(cur.extra, S.extra, k * 5);
  mouse.x = L(mouse.x, mouse.tx, k * 3); mouse.y = L(mouse.y, mouse.ty, k * 3);

  spin += S.vel * dt * 0.05;
  spin *= 0.94;
  const t = now / 1000;
  const bob = reduce ? 0 : Math.sin(t * 0.9) * 0.08;

  tooth.visible = cur.s > 0.015;
  tooth.position.set(cur.x * halfW, cur.y * halfH + bob, 0);
  tooth.scale.setScalar(Math.max(cur.s, 0.0001) * fit);
  tooth.rotation.set(
    cur.rx + mouse.y * 0.18,
    cur.ry + cur.extra + spin + (reduce ? 0 : t * 0.18) + mouse.x * 0.45,
    cur.rz + Math.sin(t * 0.6) * (reduce ? 0 : 0.03)
  );

  bubbles.position.copy(tooth.position);
  const grow = Math.min(1, cur.s * 1.4) * fit;
  for (let i = 0; i < COUNT; i++) {
    const b = bd[i];
    const a = b.a + t * b.sp;
    dummy.position.set(Math.cos(a) * b.r * grow, b.y * grow + Math.sin(t * 0.7 + b.ph) * 0.15, Math.sin(a) * b.r * 0.5 - 1.2 + b.z * 0.3);
    dummy.scale.setScalar(b.s * (0.6 + grow * 0.6));
    dummy.updateMatrix();
    bubbles.setMatrixAt(i, dummy.matrix);
  }
  bubbles.instanceMatrix.needsUpdate = true;
  bubbles.visible = tooth.visible;

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.documentElement.classList.add('gl-ready');
