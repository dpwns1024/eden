/**
 * 아이기스 3D 홀로그램 지도 (사용자 요청 — 바다 위를 떠다니는 강철 이동 요새). three.js로 그리고, AegisScene.tsx가 띄운다.
 *  - 육각 그물 방패 돔 + 바다 위 금빛 돔 포탑 6기. 돔은 보호막이라 모든 건물은 그 안에 든다.
 *  - 육각 강철 선체 위 이중 성벽 도시(시안 HEX · WALLS): 성벽엔 보루 탑 · 성문 · 문루뿐, 건물은 전부 갑판 위.
 *    가운데 모노리스(관제 · 지휘) + 안쪽 성벽 안 본부 부속동(공중 다리로 연결), 두 성벽 사이 숙소동(선미 두 고층동 = 에덴 · 이브).
 *  - 갑판 아래 · 물속: 기계실(반응로) · 무기고 · 출전 게이트 · 수중 식물원 · 봉인 구역. 본부 화면에선 선체가 반투명해져 보인다.
 *  - 건물은 꽉 찬 어두운 면 + 가는 발광 실선, 화면 전체를 LED 점 격자로 찍어 도트 느낌(DotShader). 본부 · 숙소로 들어가면 방패 돔은 사라진다.
 *  - 끌어서 돌리기, 휠(PC) · 두 손가락(폰)으로 확대 · 축소. 색은 하늘색 하나, 포인트는 금색(포탑 돔 · 관제 고리 · 헬기장) · 빨강(격리 · 봉인)만.
 *  - 시설(spot)마다 따로 고를 수 있게 덩어리(파트)를 나눈다. 고른 시설은 주황(숙소동은 캐릭터 대표색)으로 빛난다.
 * 시설 이름표는 React가 그리고(data-k), 자리는 여기서 매 프레임 투영해 옮긴다.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { AEGIS_SPOTS, type AegisView } from '@/lib/aegisMap';
import {
  HR, R0, DOME_K, TURRET_R, HULL_R, DECK, Y, WALL_OUT, WALL_IN, MONO, MONO_TOP, SKY_Y, sectorAng, HQ_BLD, RES_BLD, anchorOf, type P3, type ResBld,
} from './layout';

export type View = 'site' | AegisView;
/** 선 종류 — a 외곽 실선 · b 층 띠 · 갈빗대 · c 옅은 선 · g 금색 포인트 · r 빨강 포인트 · w 흰 이음새 */
type Lv = 'a' | 'b' | 'c' | 'g' | 'r' | 'w';
type Cat = 'hq' | 'res' | 'base';

const COL: Record<Lv, number> = { a: 0x5ad8ff, b: 0x2c8fd0, c: 0x1b5f8f, g: 0xffb444, r: 0xff4a5a, w: 0xd8f4ff };
const OPA: Record<Lv, number> = { a: 0.95, b: 0.7, c: 0.45, g: 1, r: 1, w: 1 };
const WID: Record<Lv, number> = { a: 1.3, b: 1, c: 0.9, g: 1.5, r: 1.5, w: 1.3 };
const HOT = 0xff9a36;
/** LED 점 화면 — 화면을 칸으로 나눠 칸마다 동그란 점 하나로 찍는다(선은 실선 그대로, 점 느낌은 화면 전체에서). 칸 크기는 CSS 픽셀 */
const DOT_CELL = 2.2, DOT_CELL_NARROW = 2;   // 좁은 화면(폰)은 점을 작게 — 그림이 작아 형태가 뭉개지지 않게
const DotShader = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null }, res: { value: new THREE.Vector2(1, 1) }, cell: { value: 4 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 res; uniform float cell; varying vec2 vUv;
    void main(){
      vec2 px = vUv * res;
      vec2 c = (floor(px / cell) + 0.5) * cell;
      vec3 dotc = texture2D(tDiffuse, c / res).rgb;
      float m = 1.0 - smoothstep(0.5, 0.9, length(px - c) / (cell * 0.5));
      vec3 o = texture2D(tDiffuse, vUv).rgb;
      gl_FragColor = vec4(o * 0.3 + dotc * m * 1.45 + vec3(0.002, 0.006, 0.013) * m, 1.0);
    }`,
};
const FILL = 0x06182b, FILL2 = 0x0a2138;

const ngon = (cx: number, y: number, cz: number, r: number, n: number, rot = 0): P3[] =>
  Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2 + rot; return [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r] as P3; });
const circ = (cx: number, y: number, cz: number, r: number, n = 32, rz = r): P3[] =>
  Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * r, y, cz + Math.sin((i / n) * Math.PI * 2) * rz]);

/* ───────── 한 덩어리(파트)의 선 · 면 모으기 ───────── */
class Kit {
  L: Record<Lv, number[]> = { a: [], b: [], c: [], g: [], r: [], w: [] };
  F: THREE.BufferGeometry[] = [];
  box3 = new THREE.Box3();
  private v = new THREE.Vector3();
  seg(p: P3, q: P3, lv: Lv = 'a') { this.L[lv].push(...p, ...q); this.box3.expandByPoint(this.v.set(...p)); this.box3.expandByPoint(this.v.set(...q)); }
  poly(a: P3[], lv: Lv = 'a', closed = true) { for (let i = 0; i < a.length - (closed ? 0 : 1); i++) this.seg(a[i], a[(i + 1) % a.length], lv); }
  fill(g: THREE.BufferGeometry) { this.F.push(g.index ? g.toNonIndexed() : g); }
  /** n각 기둥 — 위로 좁아짐 · 층 띠 · 면마다 세로 갈빗대 */
  prism(cx: number, cz: number, y0: number, r: number, h: number, n = 6, o: { taper?: number; rot?: number; band?: number; ribs?: number } = {}) {
    const { taper = 1, rot = 0, band = 10, ribs = 2 } = o;
    const lo = ngon(cx, y0, cz, r, n, rot), hi = ngon(cx, y0 + h, cz, r * taper, n, rot);
    this.poly(lo); this.poly(hi); lo.forEach((p, i) => this.seg(p, hi[i]));
    for (let y = band; y < h - 1; y += band) this.poly(ngon(cx, y0 + y, cz, r * (1 + (taper - 1) * (y / h)), n, rot), 'b');
    for (let q = 1; q <= ribs; q++) lo.forEach((p, i) => { const a = lo[(i + 1) % n], P = hi[i], A = hi[(i + 1) % n], t = q / (ribs + 1); this.seg([p[0] + (a[0] - p[0]) * t, p[1], p[2] + (a[2] - p[2]) * t], [P[0] + (A[0] - P[0]) * t, P[1], P[2] + (A[2] - P[2]) * t], 'c'); });
    this.fill(new THREE.CylinderGeometry(r * taper, r, h, n, 1).rotateY(-rot + Math.PI / 2).translate(cx, y0 + h / 2, cz));
    return y0 + h;
  }
  /** 상자 (rot만큼 돌림) — 층 띠 · 세로 갈빗대 */
  box(cx: number, cz: number, y0: number, w: number, d: number, h: number, rot = 0, band = 8) {
    const c = ([[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]] as const).map(([x, z]) => [cx + x * Math.cos(rot) - z * Math.sin(rot), cz + x * Math.sin(rot) + z * Math.cos(rot)] as [number, number]);
    this.poly(c.map(([x, z]) => [x, y0, z])); this.poly(c.map(([x, z]) => [x, y0 + h, z])); c.forEach(([x, z]) => this.seg([x, y0, z], [x, y0 + h, z]));
    for (let y = band; y < h - 1; y += band) this.poly(c.map(([x, z]) => [x, y0 + y, z]), 'b');
    for (let q = 1; q < 4; q++) ([[0, 1], [1, 2], [2, 3], [3, 0]] as const).forEach(([i, j]) => { const t = q / 4, x = c[i][0] + (c[j][0] - c[i][0]) * t, z = c[i][1] + (c[j][1] - c[i][1]) * t; this.seg([x, y0, z], [x, y0 + h, z], 'c'); });
    this.fill(new THREE.BoxGeometry(w, h, d).rotateY(-rot).translate(cx, y0 + h / 2, cz));
    return y0 + h;
  }
  /** 팔각 타워 — 위로 조금 좁아지고, 층 띠는 점선, 꼭대기 관 */
  tower(x: number, z: number, y0: number, w: number, d: number, h: number, o: { taper?: number; crown?: boolean; band?: number } = {}) {
    const { taper = 0.88, crown = true, band = 7 } = o, k = 1 / Math.cos(Math.PI / 8);
    const oct = (y: number, s: number) => Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; return [x + Math.cos(a) * (w / 2) * s * k, y, z + Math.sin(a) * (d / 2) * s * k] as P3; });
    const lo = oct(y0, 1), hi = oct(y0 + h, taper);
    this.poly(lo); this.poly(hi); lo.forEach((p, i) => this.seg(p, hi[i]));
    // 면마다 세로 갈빗대 둘
    lo.forEach((p, i) => { const q = lo[(i + 1) % 8], r = hi[i], u = hi[(i + 1) % 8]; [1 / 3, 2 / 3].forEach(t => this.seg([p[0] + (q[0] - p[0]) * t, p[1], p[2] + (q[2] - p[2]) * t], [r[0] + (u[0] - r[0]) * t, r[1], r[2] + (u[2] - r[2]) * t], 'b')); });
    for (let j = 1; j < h / band; j++) { const t = (j * band) / h; this.poly(oct(y0 + h * t, 1 + (taper - 1) * t), 'b'); }
    this.fill(new THREE.CylinderGeometry((w / 2) * taper * k, (w / 2) * k, h, 8).rotateY(Math.PI / 8).scale(1, 1, d / w).translate(x, y0 + h / 2, z));
    let top = y0 + h;
    if (crown) {
      const c = oct(top + 5, taper * 0.72);
      this.poly(c); hi.forEach((p, i) => this.seg(p, c[i]));
      this.fill(new THREE.CylinderGeometry((w / 2) * taper * 0.72 * k, (w / 2) * taper * k, 5, 8).rotateY(Math.PI / 8).scale(1, 1, d / w).translate(x, top + 2.5, z));
      top += 5;
    }
    return top;
  }
  /** 상자 건물 — 층 띠 점선 */
  slab(x: number, z: number, y0: number, w: number, d: number, h: number, band = 7) {
    const c: [number, number][] = [[x - w / 2, z - d / 2], [x + w / 2, z - d / 2], [x + w / 2, z + d / 2], [x - w / 2, z + d / 2]];
    this.poly(c.map(([a, b]) => [a, y0, b])); this.poly(c.map(([a, b]) => [a, y0 + h, b]));
    c.forEach(([a, b]) => this.seg([a, y0, b], [a, y0 + h, b]));
    for (let y = y0 + band; y < y0 + h - 2; y += band) this.poly(c.map(([a, b]) => [a, y, b]), 'b');
    this.fill(new THREE.BoxGeometry(w, h, d).translate(x, y0 + h / 2, z));
  }
  /** 기단 — 모서리 깎은 판 */
  podium(pts: [number, number][], y0: number, h: number) {
    this.poly(pts.map(([x, z]) => [x, y0, z])); this.poly(pts.map(([x, z]) => [x, y0 + h, z]));
    this.poly(pts.map(([x, z]) => [x, y0 + h / 2, z]), 'b');
    pts.forEach(([x, z]) => this.seg([x, y0, z], [x, y0 + h, z]));
    const sh = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    this.fill(new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false }).rotateX(-Math.PI / 2).translate(0, y0, 0));
  }
  /** 반구 (훈련 돔 · 격리 포드) */
  dome(x: number, y: number, z: number, r: number, lv: Lv = 'a') {
    this.poly(circ(x, y, z, r, 40), lv);
    for (let k = 1; k < 5; k++) { const th = (k / 5) * (Math.PI / 2); this.poly(circ(x, y + Math.sin(th) * r, z, Math.cos(th) * r, 32), lv === 'r' ? 'r' : 'b'); }
    for (let j = 0; j < 12; j++) { const ph = (j / 12) * Math.PI * 2; this.poly(Array.from({ length: 9 }, (_, i) => { const th = (i / 8) * (Math.PI / 2); return [x + Math.cos(ph) * Math.cos(th) * r, y + Math.sin(th) * r, z + Math.sin(ph) * Math.cos(th) * r] as P3; }), j % 3 ? (lv === 'r' ? 'r' : 'b') : lv, false); }
    this.fill(new THREE.SphereGeometry(r, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, y, z));
  }
  /** 원통 */
  cyl(x: number, y: number, z: number, r: number, h: number, lv: Lv = 'a', bands = 0) {
    const lo = circ(x, y, z, r, 24), hi = circ(x, y + h, z, r, 24);
    this.poly(lo, lv); this.poly(hi, lv);
    for (let i = 0; i < 24; i++) this.seg(lo[i], hi[i], i % 4 ? (lv === 'a' ? 'b' : lv) : lv);
    for (let k = 1; k <= bands; k++) this.poly(circ(x, y + (h * k) / (bands + 1), z, r, 24), 'b');
    this.fill(new THREE.CylinderGeometry(r, r, h, 24).translate(x, y + h / 2, z));
  }
  /** 공중 통로 */
  bridge(a: [number, number], b: [number, number], y: number, lv: Lv = 'a') {
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), nx = (-dz / L) * 3, nz = (dx / L) * 3;
    [1, -1].forEach(s => { this.seg([a[0] + nx * s, y, a[1] + nz * s], [b[0] + nx * s, y, b[1] + nz * s], lv); this.seg([a[0] + nx * s, y + 5, a[1] + nz * s], [b[0] + nx * s, y + 5, b[1] + nz * s], lv); });
    this.fill(new THREE.BoxGeometry(L, 5, 6).rotateY(-Math.atan2(dz, dx)).translate((a[0] + b[0]) / 2, y + 2.5, (a[1] + b[1]) / 2));
  }
}

interface Part { key: string; cat: Cat; group: THREE.Group; mats: Partial<Record<Lv, LineMaterial>>; pick?: THREE.Mesh }

/* ───────── 고정 부분: 바다 · 방패 돔 · 바다 위 포탑 ───────── */
function sea(): THREE.LineSegments {
  const p: number[] = [];
  for (let v = -2000; v <= 2000; v += 60) p.push(-2000, -40, v, 2000, -40, v, v, -40, -2000, v, -40, 2000);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x123f63, transparent: true, opacity: 0.4, depthWrite: false }));
}
function shieldDome(): THREE.LineSegments {
  const geo = new THREE.IcosahedronGeometry(R0, 4), pos = geo.getAttribute('position'), keep: number[] = [];
  for (let i = 0; i < pos.count; i += 3) {
    const tri = [0, 1, 2].map(j => new THREE.Vector3().fromBufferAttribute(pos, i + j));
    if (tri.every(v => v.y > -2)) tri.forEach((v, j) => { const w = tri[(j + 1) % 3]; keep.push(v.x, v.y * DOME_K, v.z, w.x, w.y * DOME_K, w.z); });
  }
  geo.dispose();
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(keep, 3));
  const m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x5ccaff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.renderOrder = 5;
  return m;
}
/** 바다 위 금빛 돔 포탑 6기 + 선체로 가는 다리 */
function turrets(k: Kit) {
  const rp = HULL_R * 0.87;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6, c = Math.cos(a), s = Math.sin(a), x = c * TURRET_R, z = s * TURRET_R;
    k.bridge([c * rp, s * rp], [c * (TURRET_R - 8), s * (TURRET_R - 8)], -6, 'b');
    k.prism(x, z, -40, 10, 56, 24, { band: 8, ribs: 0 });
    k.poly(ngon(x, 16, z, 12.5, 32)); k.fill(new THREE.CylinderGeometry(12.5, 12.5, 2, 24).translate(x, 17, z));
    k.dome(x, 18, z, 10, 'g'); k.seg([x, 28, z], [x, 34, z], 'g');
  }
}

/* ───────── 선체 · 갑판 · 성벽 ───────── */
function hullKit(k: Kit) {
  const R = HULL_R, bot = -90, lv: [number, number][] = [[R, Y], [R, DECK], [R * 0.95, -40], [R * 0.8, bot]];
  lv.forEach(([r, y]) => k.poly(ngon(0, y, 0, r, 6, HR)));
  for (let i = 0; i < 6; i++) k.poly(lv.map(([r, y]) => ngon(0, y, 0, r, 6, HR)[i]), 'a', false);
  for (let y = -34; y < DECK; y += 6) k.poly(ngon(0, y, 0, R * (0.95 + ((y + 40) / (DECK + 40)) * 0.05), 6, HR), 'c');
  const A = ngon(0, 0, 0, R, 6, HR);
  for (let i = 0; i < 6; i++) for (let n = 1; n < 16; n++) { const t = n / 16, j = (i + 1) % 6, x = A[i][0] + (A[j][0] - A[i][0]) * t, z = A[i][2] + (A[j][2] - A[i][2]) * t; k.seg([x, DECK, z], [x * 0.95, -40, z * 0.95], 'c'); }
  k.fill(new THREE.CylinderGeometry(R, R, Y - DECK, 6, 1, false, 0).translate(0, (Y + DECK) / 2, 0));
  k.fill(new THREE.CylinderGeometry(R, R * 0.95, DECK + 40, 6, 1, false, 0).translate(0, (DECK - 40) / 2, 0));
  k.fill(new THREE.CylinderGeometry(R * 0.95, R * 0.8, -bot - 40, 6, 1, false, 0).translate(0, (bot - 40) / 2, 0));
}
/** 한 변의 성벽을 성문 자리만 비우고 두 토막으로 — 성문엔 문루 둘 + 위를 잇는 다리 + 스캔선, 모서리엔 보루 탑 */
function hexWall(k: Kit, w: { R: number; h: number; t: number; gate: number }) {
  const C = ngon(0, 0, 0, w.R, 6, HR);
  for (let i = 0; i < 6; i++) {
    const a = C[i], b = C[(i + 1) % 6], dx = b[0] - a[0], dz = b[2] - a[2], L = Math.hypot(dx, dz), rot = Math.atan2(dz, dx);
    const at = (u: number): [number, number] => [a[0] + dx * u, a[2] + dz * u];
    const g = w.gate / 2 / L;
    ([[0, 0.5 - g], [0.5 + g, 1]] as const).forEach(([u0, u1]) => { const [mx, mz] = at((u0 + u1) / 2); k.box(mx, mz, Y, L * (u1 - u0), w.t, w.h, rot, 7); });
    const [lx, lz] = at(0.5 - g), [rx, rz] = at(0.5 + g), [cx, cz] = at(0.5);
    [[lx, lz], [rx, rz]].forEach(([x, z]) => k.prism(x, z, Y, w.t * 0.9, w.h + 14, 4, { band: 7, rot: rot + Math.PI / 4 }));
    k.box(cx, cz, Y + w.h - 2, w.gate, w.t, 10, rot, 5);
    k.seg([lx, Y + 8, lz], [rx, Y + 8, rz], 'r');
  }
  C.forEach(([x, , z]) => {
    const tp = k.prism(x, z, Y, w.t * 1.6, w.h + 34, 6, { band: 8, taper: 0.9, rot: HR });
    k.poly(ngon(x, tp + 1, z, w.t * 1.6 * 0.9 + 3, 6, HR), 'g'); k.seg([x, tp, z], [x, tp + 14, z]);
  });
}
function fortKit(k: Kit) {
  // 도로 — 탑에서 성문을 지나 바깥 성문까지 · 고리 도로 · 광장
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); [-6, 6].forEach(o => k.seg([c * 74 - s * o, Y + 0.4, s * 74 + c * o], [c * 300 - s * o, Y + 0.4, s * 300 + c * o], 'b')); }
  [110, 228].forEach(r => k.poly(ngon(0, Y + 0.4, 0, r, 6, HR), 'b'));
  hexWall(k, WALL_OUT);
  hexWall(k, WALL_IN);
  // 광장 기둥 (모서리 방향)
  for (let n = 0; n < 6; n++) { const a = sectorAng(n); k.prism(Math.cos(a) * 124, Math.sin(a) * 124, Y, 8, 22, 6, { band: 6, rot: HR }); }
  // 탑 ↔ 부속동 공중 다리
  for (let n = 0; n < 6; n++) { const a = sectorAng(n); k.bridge([Math.cos(a) * 52, Math.sin(a) * 52], [Math.cos(a) * 136, Math.sin(a) * 136], Y + 28 + (n % 2) * 10); }
  // 추진기 — 선미 면
  [-90, -30, 30, 90].forEach(z => {
    const x0 = -HULL_R * 0.866 * 0.97;
    for (let n = 0; n < 4; n++) k.poly(circ(0, 0, 0, 14 - n * 2, 24).map(([a, , b]) => [x0 - 6 - n * 6, -12 + b, z + a] as P3));
    k.fill(new THREE.CylinderGeometry(14, 11, 24, 24).rotateZ(Math.PI / 2).translate(x0 - 12, -12, z));
  });
}

/* ───────── 본부 구역 ───────── */
const hqBox = (k: Kit, s: string, w = 26, d = 34) => { const b = HQ_BLD[s]; return k.box(b.x, b.z, Y, w, d, b.h, b.rot, 8); };
const HQ_DRAW: Record<string, (k: Kit) => void> = {
  lobby: k => { k.prism(0, 0, Y, 72, 12, 6, { band: 6, rot: HR }); },
  core: k => {
    const { r, h, taper } = MONO, B = Y + 12;
    k.prism(0, 0, B, r, h - 12, 6, { taper, band: 14, ribs: 3, rot: HR });
    ngon(0, B, 0, r, 6, HR).forEach(([x, , z]) => k.seg([x * 1.06, B, z * 1.06], [x * taper * 1.06, Y + h, z * taper * 1.06], 'w'));
    [130, 270].forEach(y => {
      const rr = r * (1 - (1 - taper) * (y / h)) + 14;
      k.poly(ngon(0, Y + y, 0, rr, 6, HR)); k.poly(ngon(0, Y + y + 6, 0, rr, 6, HR), 'g');
      k.fill(new THREE.CylinderGeometry(rr, rr, 6, 6, 1, false, 0).translate(0, Y + y + 3, 0));
    });
    k.prism(0, 0, MONO_TOP, 18, 44, 6, { taper: 0.4, band: 8, rot: HR });
    k.seg([0, MONO_TOP + 44, 0], [0, MONO_TOP + 100, 0], 'w');
  },
  sky: k => {
    const SY = SKY_Y, T = ngon(0, SY, 0, 36, 6, HR), M = ngon(0, SY - 12, 0, 24, 6, HR), P: P3 = [0, SY - 30, 0];
    k.poly(T); k.poly(M); T.forEach((p, i) => { k.seg(p, M[i], 'b'); k.seg(M[i], P, 'b'); });
    k.fill(new THREE.ConeGeometry(36, 30, 6).rotateX(Math.PI).translate(0, SY - 15, 0));
    ngon(0, SY, 0, 22, 8).forEach(([px, , pz], i) => k.seg([px, SY, pz], [px, SY + (i % 3 === 1 ? 5 : 11), pz]));
    k.poly(ngon(0, SY + 11, 0, 23, 16), 'b');
  },
  heli: k => {
    const x = 155;
    [-14, 14].forEach(z => k.seg([x - 14, Y, z], [x - 14, Y + 20, z]));
    [-14, 14].forEach(z => k.seg([x + 14, Y, z], [x + 14, Y + 20, z]));
    k.prism(x, 0, Y + 20, 22, 3, 6, { band: 10, rot: HR });
    k.seg([x - 6, Y + 23.5, -7], [x - 6, Y + 23.5, 7], 'g'); k.seg([x + 6, Y + 23.5, -7], [x + 6, Y + 23.5, 7], 'g'); k.seg([x - 6, Y + 23.5, 0], [x + 6, Y + 23.5, 0], 'g');
  },
  dome: k => { const b = HQ_BLD.dome; k.dome(b.x, Y, b.z, 22); },
  resonance: k => {
    const b = HQ_BLD.resonance; k.box(b.x, b.z, Y, 30, 34, 16, b.rot, 6);
    [[-9, -10], [9, -10], [-9, 10], [9, 10]].forEach(([u, v]) => {
      const x = b.x + u * Math.cos(b.rot) - v * Math.sin(b.rot), z = b.z + u * Math.sin(b.rot) + v * Math.cos(b.rot);
      k.seg([x, Y + 16, z], [x, Y + 40, z]); for (let n = 0; n < 4; n++) k.poly(circ(x, Y + 21 + n * 5, z, 3.4 - n * 0.6, 12), 'b');
      k.fill(new THREE.CylinderGeometry(1.4, 2.4, 24, 8).translate(x, Y + 28, z));
    });
  },
  stabil: k => { const b = HQ_BLD.stabil; [-10, 10].forEach(v => { const x = b.x - v * Math.sin(b.rot), z = b.z + v * Math.cos(b.rot); k.cyl(x, Y, z, 8, 14, 'r'); k.dome(x, Y + 14, z, 8, 'r'); }); },
  igarden: k => {
    const b = HQ_BLD.igarden, r = 14, L = 34, c = Math.cos(b.rot), s = Math.sin(b.rot);
    const P = (u: number, a: number): P3 => [b.x + u * -s + Math.cos(a) * r * c, Y + Math.sin(a) * r, b.z + u * c + Math.cos(a) * r * s];
    for (let n = 0; n <= 8; n++) { const a = (Math.PI * n) / 8; k.seg(P(-L / 2, a), P(L / 2, a), n % 4 ? 'b' : 'a'); }
    for (let u = -L / 2; u <= L / 2 + 0.1; u += L / 3) k.poly(Array.from({ length: 9 }, (_, n) => P(u, (Math.PI * n) / 8)), 'a', false);
    k.fill(new THREE.CylinderGeometry(r, r, L, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(-b.rot).translate(b.x, Y, b.z));
  },
  medbay: k => { hqBox(k, 'medbay'); },
  ward: k => { hqBox(k, 'ward'); const b = HQ_BLD.ward; k.seg([b.x, Y + b.h + 2, b.z], [b.x, Y + b.h + 14, b.z]); k.seg([b.x - 6 * Math.sin(b.rot), Y + b.h + 8, b.z + 6 * Math.cos(b.rot)], [b.x + 6 * Math.sin(b.rot), Y + b.h + 8, b.z - 6 * Math.cos(b.rot)]); },
  lounge: k => { hqBox(k, 'lounge'); },
  dining: k => { hqBox(k, 'dining'); },
  rst: k => { hqBox(k, 'rst'); },
  harmony: k => { const b = HQ_BLD.harmony; k.prism(b.x, b.z, Y, 16, b.h, 8, { band: 8, taper: 0.9 }); },
  sdiv: k => { hqBox(k, 'sdiv'); },
  hdiv: k => { hqBox(k, 'hdiv'); const b = HQ_BLD.hdiv; k.box(b.x, b.z, Y + b.h, 14, 18, 8, b.rot, 4); },
  // ── 갑판 아래 · 물속 (본부 화면에서 선체가 비쳐 보인다)
  mech: k => { k.cyl(0, -30, 0, 16, 40, 'a', 3); [24, 32].forEach(r => k.poly(circ(0, -2, 0, r, 32), 'b')); k.poly(circ(0, -3, 0, 24.4, 32), 'g'); },
  armory: k => { const b = HQ_BLD.sdiv; for (let n = 0; n < 5; n++) { const u = (n - 2) * 11; k.box(b.x - u * Math.sin(b.rot), b.z + u * Math.cos(b.rot), -24, 7, 28, 32, b.rot, 6); } },
  gate: k => {
    for (let n = 0; n < 3; n++) k.poly(circ(0, 0, 0, 16 - n * 4, 32).map(([a, , b]) => [282 - n * 3, -8 + b, a] as P3), n === 1 ? 'g' : 'a');
    for (let x = 220; x < 278; x += 10) k.poly(circ(0, 0, 0, 10, 16).map(([a, , b]) => [x, -8 + b, a] as P3), 'b');
    k.fill(new THREE.CylinderGeometry(10, 10, 58, 16, 1, true).rotateZ(Math.PI / 2).translate(249, -8, 0));
  },
  aqua: k => {
    const x = 90, z = 120;
    for (let n = 0; n < 5; n++) { const th = (n / 5) * (Math.PI / 2); k.poly(circ(x, -90 - Math.sin(th) * 28, z, Math.cos(th) * 30, 32), n ? 'b' : 'a'); }
    for (let j = 0; j < 8; j++) { const ph = (j / 8) * Math.PI * 2; k.poly(Array.from({ length: 7 }, (_, i) => { const th = (i / 6) * (Math.PI / 2); return [x + Math.cos(ph) * Math.cos(th) * 30, -90 - Math.sin(th) * 28, z + Math.sin(ph) * Math.cos(th) * 30] as P3; }), 'b', false); }
    k.fill(new THREE.SphereGeometry(30, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1, 28 / 30, 1).translate(x, -90, z));
  },
  arena: k => {
    const x = -60, VY = -220;
    for (let n = 0; n < 4; n++) k.seg([x + (n - 1.5) * 12, -90, 0], [x + (n - 1.5) * 20, VY + 46, 0], 'b');
    k.cyl(x, VY, 0, 34, 46, 'a', 3);
    [8, 22, 36].forEach(h => k.poly(circ(x, VY + h, 0, 39, 48), 'r'));
  },
};

/* ───────── 숙소 구역 ───────── */
function resBld(k: Kit, b: ResBld) {
  if (b.key) { k.box(b.x, b.z, Y, 28, 28, b.h, b.rot, 8); k.poly(ngon(b.x, Y + b.h + 2, b.z, 22, 4, b.rot + Math.PI / 4), 'b'); k.seg([b.x, Y + b.h, b.z], [b.x, Y + b.h + 16, b.z]); }
  else k.box(b.x, b.z, Y, 20, 26, b.h, b.rot, 8);
}

/* ───────── 카메라 · 초점 ───────── */
const CAM: Record<View, { pos: THREE.Vector3; tgt: THREE.Vector3 }> = {
  site: { pos: new THREE.Vector3(860, 620, 980), tgt: new THREE.Vector3(0, 190, 0) },
  hq: { pos: new THREE.Vector3(470, 330, 520), tgt: new THREE.Vector3(0, 100, 0) },
  res: { pos: new THREE.Vector3(-820, 420, 560), tgt: new THREE.Vector3(-200, 50, 0) },
};
const FOCUS: Record<View, Record<Cat, number>> = {
  site: { hq: 1, res: 1, base: 1 },
  hq: { hq: 1, res: 0.35, base: 0.6 },
  res: { hq: 0.35, res: 1, base: 0.6 },
};

export interface WorldCb { pick: (spot: string) => void; go: (v: AegisView) => void }

export class AegisWorld {
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private dots: ShaderPass;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(34, 1, 1, 6000);
  private controls: OrbitControls;
  private parts: Part[] = [];
  private lineMats: LineMaterial[] = [];
  private fill = new THREE.MeshBasicMaterial({ color: FILL, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  private hullFill = new THREE.MeshBasicMaterial({ color: FILL2, transparent: true, opacity: 1, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  private domeVis = 1;          // 방패 돔 — 본부 · 숙소로 들어가면 사라진다
  private xray = 0;              // 0 = 선체 불투명, 1 = 반투명 (본부 화면)
  private view: View = 'site';
  private sel: string | null = null;
  private selColor = new THREE.Color(HOT);
  private live = new Set<string>();
  private fly = 1;
  private flyFrom = { pos: new THREE.Vector3(), tgt: new THREE.Vector3() };
  private flyTo = { pos: new THREE.Vector3(), tgt: new THREE.Vector3() };
  private focus: Record<Cat, number> = { hq: 1, res: 1, base: 1 };
  private tick: ((t: number) => void)[] = [];
  private raf = 0;
  private running = true;
  private clock = new THREE.Clock();
  private ro: ResizeObserver;
  private io: IntersectionObserver;
  private idle = 0;
  private down: { x: number; y: number } | null = null;
  private ray = new THREE.Raycaster();
  private v3 = new THREE.Vector3();
  private w = 1; private h = 1;

  constructor(private host: HTMLElement, private labels: HTMLElement, private cb: WorldCb) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 1);
    host.prepend(this.renderer.domElement);
    this.renderer.domElement.className = 'am3-gl';
    this.scene.background = new THREE.Color(0x01040b);   // 지우기 색은 합성 단계에서 감마가 두 번 걸려 밝아지므로 배경은 장면 쪽에
    this.scene.fog = new THREE.FogExp2(0x01040b, 0.0004);

    this.camera.position.copy(CAM.site.pos);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(CAM.site.tgt);
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.08, enablePan: false, enableZoom: true, zoomSpeed: 0.8, minDistance: 60, maxDistance: 2200, rotateSpeed: 0.6, minPolarAngle: 0.2, maxPolarAngle: 1.5, autoRotate: true, autoRotateSpeed: 0.35 });
    this.controls.addEventListener('start', () => { this.idle = -1; this.controls.autoRotate = false; this.fly = 1; });
    this.controls.addEventListener('end', () => { this.idle = 0; });

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.2, 0.45);
    this.composer.addPass(this.bloom);
    this.dots = new ShaderPass(DotShader);
    this.composer.addPass(this.dots);
    this.composer.addPass(new OutputPass());

    this.build();

    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', this.onDown);
    el.addEventListener('pointerup', this.onUp);
    el.addEventListener('pointermove', this.onMove);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.io = new IntersectionObserver(([e]) => {
      const was = this.running;
      this.running = e.isIntersecting && !document.hidden;
      if (this.running && !was) this.loop();
    });
    this.io.observe(host);
    this.resize();
    this.loop();
  }

  /** 파트 굽기 — 선은 굵은 선(LineSegments2), 면은 하나로 합쳐 불투명 */
  private add(k: Kit, key: string, cat: Cat, pickable = false, fillMat: THREE.Material = this.fill) {
    const group = new THREE.Group();
    const mats: Part['mats'] = {};
    (Object.keys(k.L) as Lv[]).forEach(lv => {
      if (!k.L[lv].length) return;
      const g = new LineSegmentsGeometry(); g.setPositions(k.L[lv]);
      const m = new LineMaterial({ color: COL[lv], linewidth: WID[lv], transparent: true, opacity: OPA[lv], depthWrite: false });
      m.resolution.set(this.w, this.h);
      const l = new LineSegments2(g, m);
      l.renderOrder = 2;
      group.add(l); mats[lv] = m; this.lineMats.push(m);
    });
    if (k.F.length) {
      const merged = mergeGeometries(k.F, false);
      k.F.forEach(g => g.dispose());
      if (merged) group.add(new THREE.Mesh(merged, fillMat));
    }
    let pick: THREE.Mesh | undefined;
    if (pickable && !k.box3.isEmpty()) {
      const sz = k.box3.getSize(new THREE.Vector3());
      pick = new THREE.Mesh(new THREE.BoxGeometry(sz.x + 2, sz.y + 2, sz.z + 2), new THREE.MeshBasicMaterial({ visible: false }));
      pick.position.copy(k.box3.getCenter(new THREE.Vector3()));
      pick.userData.key = key;
      group.add(pick);
    }
    const p: Part = { key, cat, group, mats, pick };
    this.parts.push(p);
    this.scene.add(group);
    return p;
  }
  /** 화면 전체를 고르는 큰 상자 (섬 화면에서 본부 · 숙소) */
  private addPick(key: string, cat: Cat, min: P3, max: P3) {
    const b = new THREE.Box3(new THREE.Vector3(...min), new THREE.Vector3(...max));
    const k = new Kit(); k.box3.copy(b);
    this.add(k, key, cat, true);
  }

  private build() {
    this.scene.add(sea());
    this.scene.add(shieldDome());
    const shield = this.scene.children[this.scene.children.length - 1] as THREE.LineSegments;
    // 구역 안(본부 · 숙소)에선 돔을 옅게 — 시설이 가려지지 않게
    this.tick.push(t => { (shield.material as THREE.LineBasicMaterial).opacity = (0.26 + 0.07 * Math.sin(t * 1.4)) * this.domeVis; shield.visible = this.domeVis > 0.01; });

    const tk = new Kit(); turrets(tk); this.add(tk, 'turrets', 'base');
    const hk = new Kit(); hullKit(hk); this.add(hk, 'hull', 'base', false, this.hullFill);
    const fk = new Kit(); fortKit(fk); this.add(fk, 'fort', 'base');
    // 추진기 불빛
    [-90, -30, 30, 90].forEach(z => {
      const glow = new THREE.Mesh(new THREE.CircleGeometry(9, 24).rotateY(Math.PI / 2).translate(-HULL_R * 0.866 * 0.97 - 25, -12, z), new THREE.MeshBasicMaterial({ color: 0x8fdcff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      glow.renderOrder = 3; this.scene.add(glow);
      this.tick.push(t => { glow.material.opacity = 0.45 + 0.2 * Math.sin(t * 6 + z); });
    });

    // 본부 구역 — 시설마다 한 덩어리
    for (const [spot, draw] of Object.entries(HQ_DRAW)) {
      const k = new Kit(); draw(k);
      const p = this.add(k, spot, 'hq', true);
      if (spot === 'sky') this.tick.push(t => { p.group.position.y = Math.sin(t * 0.8) * 2; });
    }
    // 첨탑 경고등 · 반응로 맥동
    const bea = new THREE.Mesh(new THREE.SphereGeometry(2.4, 8, 8).translate(0, MONO_TOP + 100, 0), new THREE.MeshBasicMaterial({ color: COL.g }));
    bea.renderOrder = 3; this.scene.add(bea);
    this.tick.push(t => { bea.visible = Math.sin(t * 4) > 0; });
    const core = new THREE.Mesh(new THREE.SphereGeometry(10, 16, 12).translate(0, -10, 0), new THREE.MeshBasicMaterial({ color: 0x8fdcff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
    core.renderOrder = 3; this.scene.add(core);
    this.tick.push(t => { core.scale.setScalar(1 + 0.1 * Math.sin(t * 3)); (core.material as THREE.MeshBasicMaterial).opacity = 0.6 * this.xray; });
    // 모노리스를 도는 육각 빛 고리 둘
    ([[Y + 330, 80, 0.2, COL.g], [Y + 200, 115, -0.14, COL.a]] as const).forEach(([y, r, sp, col]) => {
      const g = new THREE.Group(), pts = ngon(0, 0, 0, r, 6, HR).map(p => new THREE.Vector3(...p));
      [0, 3, 6].forEach(o => g.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts.map(p => p.clone().setY(o))), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.9 }))));
      g.position.y = y; this.scene.add(g);
      this.tick.push(t => { g.rotation.y = t * sp; g.children.forEach(c => { ((c as THREE.LineLoop).material as THREE.LineBasicMaterial).opacity = 0.9 * this.focus.hq; }); });
    });

    // 숙소 구역 — 섹터마다 한 덩어리('quarters'), 에덴 · 이브는 따로
    for (let n = 0; n < 6; n++) {
      const k = new Kit(); RES_BLD.filter(b => b.k === n && !b.key).forEach(b => resBld(k, b));
      this.add(k, 'quarters', 'res', true);
    }
    RES_BLD.filter(b => b.key).forEach(b => { const k = new Kit(); resBld(k, b); this.add(k, b.key!, 'res', true); });

    // 섬 화면에서 고르는 큰 상자
    // 반짝이는 흰 점 — 건물 선 위 아무 곳에, 두 무리가 번갈아 깜빡인다
    let seed = 9;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const src: number[] = [];
    this.parts.filter(p => p.cat !== 'base').forEach(p => p.group.children.forEach(c => {
      if (!(c instanceof LineSegments2)) return;
      const st = (c.geometry as LineSegmentsGeometry).attributes.instanceStart as THREE.InterleavedBufferAttribute;
      for (let i = 0; i < st.count; i++) if (rnd() < 0.05) src.push(st.getX(i), st.getY(i), st.getZ(i));
    }));
    [0, 1].forEach(n => {
      const pos = src.filter((_, i) => Math.floor(i / 3) % 2 === n);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const m = new THREE.PointsMaterial({ color: 0xffffff, size: 3, sizeAttenuation: false, transparent: true, opacity: 0.9, depthWrite: false });
      const pts = new THREE.Points(g, m); pts.renderOrder = 4; this.scene.add(pts);
      this.tick.push(t => { m.opacity = 0.25 + 0.7 * Math.max(0, Math.sin(t * 1.7 + n * Math.PI)); });
    });
    this.addPick('site:hq', 'hq', [-190, Y, -190], [190, SKY_Y + 20, 190]);
    // 숙소는 고리라 섹터마다 (에덴 · 이브 동 포함)
    for (let n = 0; n < 6; n++) {
      const b = new THREE.Box3(); RES_BLD.filter(v => v.k === n).forEach(v => { b.expandByPoint(new THREE.Vector3(v.x - 16, Y, v.z - 16)); b.expandByPoint(new THREE.Vector3(v.x + 16, Y + v.h + 10, v.z + 16)); });
      this.addPick('site:res', 'res', b.min.toArray() as P3, b.max.toArray() as P3);
    }
    this.paint();
  }

  /* ── 바깥에서 부르는 것 ── */
  setView(v: View) {
    if (v === this.view) return;
    this.view = v;
    this.flyFrom.pos.copy(this.camera.position); this.flyFrom.tgt.copy(this.controls.target);
    this.flyTo.pos.copy(CAM[v].pos); this.flyTo.tgt.copy(CAM[v].tgt);
    this.fly = 0;
    this.controls.autoRotate = v === 'site';
    this.paint();
  }
  setSelected(spot: string | null, color?: string) {
    this.sel = spot;
    this.selColor.set(color && /^#|^rgb/.test(color) ? color : HOT);
    this.paint();
  }
  setLive(spots: string[]) { this.live = new Set(spots); }

  private paint() {
    for (const p of this.parts) {
      const on = p.key === this.sel;
      (Object.keys(p.mats) as Lv[]).forEach(lv => p.mats[lv]!.color.set(on ? this.selColor : COL[lv]));
    }
  }
  private applyFocus() {
    for (const p of this.parts) {
      const f = this.focus[p.cat], on = p.key === this.sel;
      (Object.keys(p.mats) as Lv[]).forEach(lv => { p.mats[lv]!.opacity = Math.min(1, OPA[lv] * f + (on ? 0.1 : 0)); });
    }
    // 본부 화면: 선체를 반투명으로 (갑판 아래 시설이 보이게)
    this.hullFill.opacity = 1 - 0.8 * this.xray;
    this.hullFill.depthWrite = this.xray < 0.1;
  }

  /* ── 누르기 ── */
  private hitAt(e: PointerEvent): string | null {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), this.camera);
    const want = (k: string) => this.view === 'site' ? k.startsWith('site:')
      : !k.startsWith('site:') && this.live.has(k) && AEGIS_SPOTS[k]?.view === this.view;
    const hits = this.ray.intersectObjects(this.parts.filter(p => p.pick && want(p.key)).map(p => p.pick!), false);
    return hits.length ? (hits[0].object.userData.key as string) : null;
  }
  private onDown = (e: PointerEvent) => { this.down = { x: e.clientX, y: e.clientY }; };
  private onUp = (e: PointerEvent) => {
    if (!this.down || Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > 6) { this.down = null; return; }
    this.down = null;
    const k = this.hitAt(e);
    if (!k) return;
    if (k === 'site:hq') this.cb.go('hq');
    else if (k === 'site:res') this.cb.go('res');
    else this.cb.pick(k);
  };
  private moveT = 0;
  private onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || performance.now() - this.moveT < 60) return;
    this.moveT = performance.now();
    this.renderer.domElement.style.cursor = this.hitAt(e) ? 'pointer' : 'grab';
  };

  private resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    this.w = w; this.h = h;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
    this.bloom.strength = w < 640 ? 0.3 : 0.55;   // 좁은 화면은 선이 빽빽해 번짐이 하얗게 뭉친다
    const pr = this.renderer.getPixelRatio();
    this.dots.uniforms.res.value.set(w * pr, h * pr);
    this.dots.uniforms.cell.value = (w < 640 ? DOT_CELL_NARROW : DOT_CELL) * pr;
    this.lineMats.forEach(m => m.resolution.set(w, h));
    this.camera.aspect = w / h;
    this.camera.zoom = Math.min(1, w / h / 1.45 + 0.12);   // 좁은 화면은 조금 물러선다
    this.camera.updateProjectionMatrix();
  }

  private loop = () => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    const raw = this.clock.getDelta(), step = Math.min(raw, 0.25), time = this.clock.elapsedTime;
    if (this.fly < 1) {
      this.fly = Math.min(1, this.fly + step / 1.4);
      const e = this.fly < 0.5 ? 4 * this.fly ** 3 : 1 - (-2 * this.fly + 2) ** 3 / 2;
      this.camera.position.lerpVectors(this.flyFrom.pos, this.flyTo.pos, e);
      this.controls.target.lerpVectors(this.flyFrom.tgt, this.flyTo.tgt, e);
    }
    if (this.idle >= 0 && this.view === 'site' && !this.controls.autoRotate) {
      this.idle += raw;
      if (this.idle > 6) this.controls.autoRotate = true;
    }
    const goal = FOCUS[this.view];
    (Object.keys(goal) as Cat[]).forEach(c => { this.focus[c] += (goal[c] - this.focus[c]) * Math.min(1, step * 4); });
    this.xray += ((this.view === 'hq' ? 1 : 0) - this.xray) * Math.min(1, step * 4);
    this.domeVis += ((this.view === 'site' ? 1 : 0) - this.domeVis) * Math.min(1, step * 4);
    this.applyFocus();
    this.tick.forEach(f => f(time));
    this.controls.update();
    this.composer.render();
    this.placeLabels();
  };

  /** 이름표 자리 — 열쇠(data-k)의 월드 자리를 화면으로 */
  private placeLabels() {
    this.labels.querySelectorAll<HTMLElement>('[data-k]').forEach(el => {
      const a = anchorOf(el.dataset.k!);
      if (!a) return;
      this.v3.set(...a).project(this.camera);
      const vis = this.v3.z < 1 && Math.abs(this.v3.x) < 1.1 && Math.abs(this.v3.y) < 1.1;
      // 이름표가 무대 밖으로 잘리지 않게 (flip은 왼쪽으로 펼쳐진다)
      const cw = (el.querySelector('span') as HTMLElement | null)?.offsetWidth ?? 0;
      let x = ((this.v3.x + 1) / 2) * this.w;
      x = el.classList.contains('flip') ? Math.max(x, cw + 10) : Math.min(x, this.w - cw - 10);
      el.style.transform = `translate3d(${x}px, ${((1 - this.v3.y) / 2) * this.h}px, 0)`;
      el.style.opacity = vis ? '' : '0';
    });
  }

  dispose() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect(); this.io.disconnect();
    const el = this.renderer.domElement;
    el.removeEventListener('pointerdown', this.onDown);
    el.removeEventListener('pointerup', this.onUp);
    el.removeEventListener('pointermove', this.onMove);
    this.controls.dispose();
    this.scene.traverse(o => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach(x => x.dispose());
    });
    this.composer.dispose();
    this.renderer.dispose();
    el.remove();
  }
}
