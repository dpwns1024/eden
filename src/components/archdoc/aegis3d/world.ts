/**
 * 아이기스 3D 홀로그램 지도 (사용자 요청 — 바다 위를 떠다니는 강철 이동 요새). three.js로 그리고, AegisScene.tsx가 띄운다.
 *  - 육각 그물 방패 돔 + 바다 위 금빛 돔 포탑 6기와 아치 다리(시안 C-3 그대로 고정). 돔은 보호막이라 모든 건물은 그 안에 든다.
 *  - 원형 강철 플랫폼: 뱃머리 쪽 본부 단지(관제탑 · 업무동 · 의료동 · 공용동 · 훈련 돔 · 공명연구실 · 비행 갑판), 선미 쪽 숙소 단지, 둘을 셔틀 선로로.
 *  - 갑판 아래 · 물속: 기계실(반응로) · 무기고 · 출전 게이트 · 수중 식물원 · 봉인 구역. 본부 화면에선 선체가 반투명해져 보인다.
 *  - 건물은 꽉 찬 어두운 면 + 굵은 실선(외곽) · 점선(층 띠). 색은 하늘색 하나, 포인트는 금색(포탑 돔 · 관제 고리 · 헬기장) · 빨강(격리 · 봉인)만.
 *  - 시설(spot)마다 따로 고를 수 있게 덩어리(파트)를 나눈다. 고른 시설은 주황(숙소동은 캐릭터 대표색)으로 빛난다.
 * 시설 이름표는 React가 그리고(data-k), 자리는 여기서 매 프레임 투영해 옮긴다.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { AEGIS_SPOTS, type AegisView } from '@/lib/aegisMap';
import {
  R0, DOME_K, TURRET_R, RP, DECK, Y, HQ_B, RES_B, CORE, HQ_PODIUM, RES_PODIUM, RES_TWR, anchorOf, type P3,
} from './layout';

export type View = 'site' | AegisView;
/** 선 종류 — a 굵은 실선 · b 점선 · c 옅은 점선 · g 금색 포인트 · r 빨강 포인트 */
type Lv = 'a' | 'b' | 'c' | 'g' | 'r';
type Cat = 'hq' | 'res' | 'base';

const COL: Record<Lv, number> = { a: 0x5ad8ff, b: 0x2c8fd0, c: 0x1d6496, g: 0xffb444, r: 0xff4a5a };
const OPA: Record<Lv, number> = { a: 0.92, b: 0.72, c: 0.5, g: 0.95, r: 0.95 };
const WID: Record<Lv, number> = { a: 2.1, b: 1.4, c: 1.2, g: 2.1, r: 2.1 };
const HOT = 0xff9a36;
const FILL = 0x06182b, FILL2 = 0x0a2138;

const circ = (cx: number, y: number, cz: number, r: number, n = 32, rz = r): P3[] =>
  Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * r, y, cz + Math.sin((i / n) * Math.PI * 2) * rz]);

/* ───────── 한 덩어리(파트)의 선 · 면 모으기 ───────── */
class Kit {
  L: Record<Lv, number[]> = { a: [], b: [], c: [], g: [], r: [] };
  F: THREE.BufferGeometry[] = [];
  box3 = new THREE.Box3();
  private v = new THREE.Vector3();
  seg(p: P3, q: P3, lv: Lv = 'a') { this.L[lv].push(...p, ...q); this.box3.expandByPoint(this.v.set(...p)); this.box3.expandByPoint(this.v.set(...q)); }
  poly(a: P3[], lv: Lv = 'a', closed = true) { for (let i = 0; i < a.length - (closed ? 0 : 1); i++) this.seg(a[i], a[(i + 1) % a.length], lv); }
  fill(g: THREE.BufferGeometry) { this.F.push(g.index ? g.toNonIndexed() : g); }
  /** 팔각 타워 — 위로 조금 좁아지고, 층 띠는 점선, 꼭대기 관 */
  tower(x: number, z: number, y0: number, w: number, d: number, h: number, o: { taper?: number; crown?: boolean; band?: number } = {}) {
    const { taper = 0.88, crown = true, band = 7 } = o, k = 1 / Math.cos(Math.PI / 8);
    const oct = (y: number, s: number) => Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; return [x + Math.cos(a) * (w / 2) * s * k, y, z + Math.sin(a) * (d / 2) * s * k] as P3; });
    const lo = oct(y0, 1), hi = oct(y0 + h, taper);
    this.poly(lo); this.poly(hi); lo.forEach((p, i) => this.seg(p, hi[i]));
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
    for (let i = 0; i < 24; i += 4) this.seg(lo[i], hi[i], lv === 'a' ? 'b' : lv);
    for (let k = 1; k <= bands; k++) this.poly(circ(x, y + (h * k) / (bands + 1), z, r, 24), 'b');
    this.fill(new THREE.CylinderGeometry(r, r, h, 24).translate(x, y + h / 2, z));
  }
  /** 공중 통로 */
  bridge(a: [number, number], b: [number, number], y: number) {
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), nx = (-dz / L) * 3, nz = (dx / L) * 3;
    [1, -1].forEach(s => { this.seg([a[0] + nx * s, y, a[1] + nz * s], [b[0] + nx * s, y, b[1] + nz * s]); this.seg([a[0] + nx * s, y + 5, a[1] + nz * s], [b[0] + nx * s, y + 5, b[1] + nz * s]); });
    this.fill(new THREE.BoxGeometry(L, 5, 6).rotateY(-Math.atan2(dz, dx)).translate((a[0] + b[0]) / 2, y + 2.5, (a[1] + b[1]) / 2));
  }
}

interface Part { key: string; cat: Cat; group: THREE.Group; mats: Partial<Record<Lv, LineMaterial>>; pick?: THREE.Mesh }

/* ───────── 고정 부분: 방패 돔 · 바다 위 포탑 · 바다 ───────── */
function sea(): THREE.LineSegments {
  const p: number[] = [];
  for (let v = -1400; v <= 1400; v += 50) p.push(-1400, -30, v, 1400, -30, v, v, -30, -1400, v, -30, 1400);
  for (let r = 300; r < 900; r += 120) { const c = circ(0, -30, 0, r, 96); c.forEach((q, i) => p.push(...q, ...c[(i + 1) % c.length])); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x154f7a, transparent: true, opacity: 0.35, depthWrite: false }));
}
function shieldDome(): THREE.LineSegments {
  const geo = new THREE.IcosahedronGeometry(R0, 3), pos = geo.getAttribute('position'), keep: number[] = [];
  for (let i = 0; i < pos.count; i += 3) {
    const tri = [0, 1, 2].map(j => new THREE.Vector3().fromBufferAttribute(pos, i + j));
    if (tri.every(v => v.y > -2)) tri.forEach((v, j) => { const w = tri[(j + 1) % 3]; keep.push(v.x, v.y * DOME_K, v.z, w.x, w.y * DOME_K, w.z); });
  }
  geo.dispose();
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(keep, 3));
  const m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x5ccaff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.renderOrder = 5;
  return m;
}
/** 바다 위 돔 포탑 6기 + 플랫폼으로 가는 아치 다리 */
function turrets(k: Kit) {
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6, c = Math.cos(a), s = Math.sin(a), x = c * TURRET_R, z = s * TURRET_R;
    // 아치 다리
    const A: P3 = [c * 212, 0, s * 212], B: P3 = [c * 280, 0, s * 280], y = -10, h = 14;
    k.seg([A[0], y + h, A[2]], [B[0], y + h, B[2]]);
    for (let n = 0; n < 4; n++) {
      const P = (t: number): P3 => [A[0] + (B[0] - A[0]) * t, 0, A[2] + (B[2] - A[2]) * t];
      k.poly(Array.from({ length: 9 }, (_, j) => { const t = (n + j / 8) / 4, v = P(t); return [v[0], y + h * 0.35 + Math.sin((j / 8) * Math.PI) * h * 0.5, v[2]] as P3; }), 'b', false);
      const p = P(n / 4); k.seg([p[0], y - 4, p[2]], [p[0], y + h, p[2]], 'b');
    }
    // 원통 기둥 · 돌출 회랑 · 성가퀴 · 금빛 돔
    k.cyl(x, -30, z, 8, 46, 'a', 5);
    k.poly(circ(x, 14, z, 10, 32)); k.poly(circ(x, 16, z, 10, 32));
    k.fill(new THREE.CylinderGeometry(10, 10, 2, 24).translate(x, 15, z));
    k.dome(x, 17.4, z, 8.4, 'g');
    k.seg([x, 25.8, z], [x, 30, z], 'g');
  }
}

/* ───────── 플랫폼 (선체) ───────── */
const NS = 24;
const ring = (r: number, y: number) => circ(0, y, 0, r, NS);
function hullKit(k: Kit) {
  const lv: [number, number][] = [[RP, Y], [RP, DECK], [RP * 0.95, -30], [RP * 0.8, -55]];
  lv.forEach(([r, y]) => k.poly(ring(r, y)));
  for (let i = 0; i < NS; i++) k.poly(lv.map(([r, y]) => ring(r, y)[i]), 'a', false);
  for (let y = -24; y < DECK; y += 7) k.poly(ring(RP * (0.95 + ((y + 30) / 50) * 0.05), y), 'b');
  k.fill(new THREE.CylinderGeometry(RP, RP, 4, NS).translate(0, DECK + 2, 0));
  k.fill(new THREE.CylinderGeometry(RP, RP * 0.95, 50, NS).translate(0, -5, 0));
  k.fill(new THREE.CylinderGeometry(RP * 0.95, RP * 0.8, 25, NS).translate(0, -42.5, 0));
}
function deckKit(k: Kit) {
  for (let x = -220; x <= 220; x += 24) { const h = Math.sqrt(Math.max(0, (RP - 4) ** 2 - x * x)); k.seg([x, Y + 0.3, -h], [x, Y + 0.3, h], 'c'); }
  k.poly(ring(RP - 3, Y + 7));
  ring(RP - 3, Y).forEach((p, i) => { k.seg(p, [p[0], Y + 7, p[2]], 'b'); if (i % 4 === 0) { k.seg(p, [p[0], Y + 22, p[2]]); k.poly(circ(p[0], Y + 22, p[2], 2.5, 8)); } });
  // 추진기 — 선미 네 기
  [-78, -26, 26, 78].forEach(z => {
    const x0 = -Math.sqrt(RP * RP - z * z) + 6;
    for (let n = 0; n < 4; n++) k.poly(circ(0, 0, 0, 13 - n * 2, 24).map(([a, , b]) => [x0 - 8 - n * 6, -10 + b, z + a] as P3));
    k.fill(new THREE.CylinderGeometry(13, 10, 24, 24).rotateZ(Math.PI / 2).translate(x0 - 14, -10, z));
  });
  for (let n = 0; n < 7; n++) { const z = -60 + n * 20; k.poly(Array.from({ length: 30 }, (_, i) => [-262 - i * 14, -29.5, z * (1 + i * 0.03)] as P3), 'c', false); }
  // 셔틀 선로 (숙소 ↔ 본부)
  [-1, 1].forEach(s => k.seg([-108, Y + 22, s * 3], [-78, Y + 22, s * 3]));
  for (let x = -104; x < -78; x += 12) { k.seg([x, Y, 0], [x, Y + 22, 0]); k.fill(new THREE.BoxGeometry(2, 22, 2).translate(x, Y + 11, 0)); }
  k.fill(new THREE.BoxGeometry(30, 2, 7).translate(-93, Y + 21, 0));
}

/* ───────── 본부 단지 ───────── */
const OPS = { x: -15, z: -58, w: 34, d: 24 }, MED = { x: -15, z: 58, w: 40, d: 26 }, COM = { x: -55, z: 0 };
function hqBase(k: Kit) {
  k.podium(HQ_PODIUM, Y, 10);
  k.bridge([CORE.x - 12, -10], [OPS.x + 10, OPS.z + 12], HQ_B + 40);
  k.bridge([CORE.x - 12, 10], [MED.x + 12, MED.z - 13], HQ_B + 28);
  k.bridge([CORE.x + 14, -8], [76, -32], HQ_B + 18);
  k.bridge([CORE.x + 14, 8], [76, 38], HQ_B + 18);
  k.bridge([CORE.x - 14, 0], [COM.x + 18, 0], HQ_B + 14);
}
/** 시설마다 그리는 법 (본부) */
const HQ_DRAW: Record<string, (k: Kit) => void> = {
  lobby: k => { k.slab(CORE.x, CORE.z, HQ_B, 48, 42, 12, 6); },
  core: k => {
    const B = HQ_B + 12;
    const top = k.tower(CORE.x, CORE.z, B, 30, 26, 58, { band: 6 });
    k.poly(circ(CORE.x, B + 40, CORE.z, 28, 48, 24)); k.poly(circ(CORE.x, B + 45, CORE.z, 28, 48, 24));
    k.poly(circ(CORE.x, B + 42.5, CORE.z, 28.4, 48, 24.4), 'g');
    k.fill(new THREE.CylinderGeometry(28, 28, 5, 48).scale(1, 1, 24 / 28).translate(CORE.x, B + 42.5, CORE.z));
    k.seg([CORE.x, top, CORE.z], [CORE.x, top + 8, CORE.z]); k.poly(circ(CORE.x, top + 5, CORE.z, 3, 10));
  },
  sky: k => {
    const SY = 140, x = CORE.x, z = CORE.z;
    const T = circ(x, SY, z, 26, 24, 20), M = circ(x, SY - 10, z, 17, 24, 13), P: P3 = [x, SY - 22, z];
    k.poly(T); k.poly(M); T.forEach((p, i) => { if (i % 3 === 0) { k.seg(p, M[i], 'b'); k.seg(M[i], P, 'b'); } });
    k.fill(new THREE.ConeGeometry(26, 22, 24).rotateX(Math.PI).scale(1, 1, 20 / 26).translate(x, SY - 11, z));
    circ(x, SY, z, 9, 8).forEach(([px, , pz], i) => k.seg([px, SY, pz], [px, SY + (i % 3 === 1 ? 4 : 9), pz]));
    k.poly(circ(x, SY + 9, z, 10, 16), 'b');
  },
  sdiv: k => k.slab(OPS.x, OPS.z, HQ_B, OPS.w, OPS.d, 22),
  hdiv: k => k.slab(OPS.x, OPS.z, HQ_B + 22, OPS.w, OPS.d, 22),
  rst: k => { k.slab(OPS.x, OPS.z, HQ_B + 44, OPS.w, OPS.d, 20); k.slab(OPS.x + 6, OPS.z, HQ_B + 64, 14, 12, 6); },
  harmony: k => k.tower(-50, -45, HQ_B, 22, 20, 42, { taper: 0.9 }),
  medbay: k => k.slab(MED.x, MED.z, HQ_B, MED.w, MED.d, 20),
  ward: k => { k.slab(MED.x, MED.z, HQ_B + 20, MED.w, MED.d, 18); k.seg([MED.x, HQ_B + 42, MED.z + MED.d / 2], [MED.x, HQ_B + 54, MED.z + MED.d / 2]); k.seg([MED.x - 6, HQ_B + 48, MED.z + MED.d / 2], [MED.x + 6, HQ_B + 48, MED.z + MED.d / 2]); },
  stabil: k => [[-52, 50], [-52, 74]].forEach(([x, z]) => { k.cyl(x, HQ_B, z, 8, 14, 'r'); k.dome(x, HQ_B + 14, z, 8, 'r'); }),
  lounge: k => k.slab(COM.x - 9, COM.z, HQ_B, 18, 40, 12, 6),
  dining: k => k.slab(COM.x + 9, COM.z, HQ_B, 18, 40, 12, 6),
  igarden: k => {
    const y0 = HQ_B + 12, r = 14;
    for (let n = 0; n <= 8; n++) { const a = (Math.PI * n) / 8; k.seg([COM.x - 18, y0 + Math.sin(a) * r, Math.cos(a) * r], [COM.x + 18, y0 + Math.sin(a) * r, Math.cos(a) * r], n % 4 ? 'b' : 'a'); }
    for (let x = COM.x - 18; x <= COM.x + 18; x += 12) k.poly(Array.from({ length: 9 }, (_, n) => { const a = (Math.PI * n) / 8; return [x, y0 + Math.sin(a) * r, Math.cos(a) * r] as P3; }), 'a', false);
    k.fill(new THREE.CylinderGeometry(r, r, 36, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2).translate(COM.x, y0, 0));
  },
  dome: k => k.dome(95, HQ_B, -50, 30),
  resonance: k => {
    k.slab(95, 52, HQ_B, 40, 32, 18, 6);
    [[-12, -9], [12, -9], [-12, 9], [12, 9]].forEach(([a, b]) => { const x = 95 + a, z = 52 + b; k.seg([x, HQ_B + 18, z], [x, HQ_B + 42, z]); for (let n = 0; n < 4; n++) k.poly(circ(x, HQ_B + 23 + n * 5, z, 3.4 - n * 0.6, 12), 'b'); k.fill(new THREE.CylinderGeometry(1.4, 2.4, 24, 8).translate(x, HQ_B + 30, z)); });
  },
  heli: k => {
    [[180, -34], [180, 34]].forEach(([x, z]) => {
      k.poly(circ(x, Y + 0.5, z, 16, 32));
      k.seg([x - 6, Y + 0.5, z - 7], [x - 6, Y + 0.5, z + 7], 'g'); k.seg([x + 6, Y + 0.5, z - 7], [x + 6, Y + 0.5, z + 7], 'g'); k.seg([x - 6, Y + 0.5, z], [x + 6, Y + 0.5, z], 'g');
    });
    k.slab(158, 0, Y, 14, 20, 8, 4);
  },
  // ── 갑판 아래 · 물속
  mech: k => {
    k.cyl(CORE.x, -14, CORE.z, 12, 26, 'a', 3);
    [18, 24].forEach(r => k.poly(circ(CORE.x, 0, CORE.z, r, 32), 'b'));
    k.poly(circ(CORE.x, -1, CORE.z, 18.4, 32), 'g');
  },
  armory: k => { for (let n = 0; n < 5; n++) k.slab(OPS.x - 22 + n * 11, OPS.z, -16, 7, 28, 30, 6); },
  gate: k => {
    for (let n = 0; n < 3; n++) k.poly(circ(0, 0, 0, 16 - n * 4, 32).map(([a, , b]) => [196 - n * 3, -6 + b, a] as P3), n === 1 ? 'g' : 'a');
    for (let x = 150; x < 192; x += 10) k.poly(circ(0, 0, 0, 10, 16).map(([a, , b]) => [x, -6 + b, a] as P3), 'b');
    k.fill(new THREE.CylinderGeometry(10, 10, 42, 16, 1, true).rotateZ(Math.PI / 2).translate(171, -6, 0));
  },
  aqua: k => {
    const x = 60, z = 70;
    for (let n = 0; n < 5; n++) { const th = (n / 5) * (Math.PI / 2); k.poly(circ(x, -55 - Math.sin(th) * 24, z, Math.cos(th) * 26, 32), n ? 'b' : 'a'); }
    for (let j = 0; j < 8; j++) { const ph = (j / 8) * Math.PI * 2; k.poly(Array.from({ length: 7 }, (_, i) => { const th = (i / 6) * (Math.PI / 2); return [x + Math.cos(ph) * Math.cos(th) * 26, -55 - Math.sin(th) * 24, z + Math.sin(ph) * Math.cos(th) * 26] as P3; }), 'b', false); }
    k.fill(new THREE.SphereGeometry(26, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1, 24 / 26, 1).translate(x, -55, z));
  },
  arena: k => {
    const x = -40, VY = -140;
    for (let n = 0; n < 4; n++) k.seg([x + (n - 1.5) * 10, -55, 0], [x + (n - 1.5) * 18, VY + 40, 0], 'b');
    k.cyl(x, VY, 0, 30, 40, 'a', 3);
    [8, 20, 32].forEach(h => k.poly(circ(x, VY + h, 0, 34, 48), 'r'));
  },
};

/* ───────── 숙소 단지 ───────── */
function resTower(k: Kit, t: (typeof RES_TWR)[number]) {
  const top = k.tower(t.x, t.z, RES_B, 20, 18, t.h, { taper: 0.9 });
  if (t.key) { k.seg([t.x, top, t.z], [t.x, top + 8, t.z]); k.poly(circ(t.x, top + 2, t.z, 12, 32), 'b'); }
}

/* ───────── 카메라 · 초점 ───────── */
const CAM: Record<View, { pos: THREE.Vector3; tgt: THREE.Vector3 }> = {
  site: { pos: new THREE.Vector3(470, 320, 500), tgt: new THREE.Vector3(0, 30, 0) },
  hq: { pos: new THREE.Vector3(330, 215, 300), tgt: new THREE.Vector3(30, 42, 0) },
  res: { pos: new THREE.Vector3(-400, 180, 230), tgt: new THREE.Vector3(-160, 45, 0) },
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
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(36, 1, 1, 4000);
  private controls: OrbitControls;
  private parts: Part[] = [];
  private lineMats: LineMaterial[] = [];
  private fill = new THREE.MeshBasicMaterial({ color: FILL, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  private hullFill = new THREE.MeshBasicMaterial({ color: FILL2, transparent: true, opacity: 1, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
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
    this.scene.fog = new THREE.FogExp2(0x01040b, 0.0012);

    this.camera.position.copy(CAM.site.pos);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(CAM.site.tgt);
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.08, enablePan: false, enableZoom: false, rotateSpeed: 0.6, minPolarAngle: 0.2, maxPolarAngle: 1.5, autoRotate: true, autoRotateSpeed: 0.35 });
    this.controls.addEventListener('start', () => { this.idle = -1; this.controls.autoRotate = false; this.fly = 1; });
    this.controls.addEventListener('end', () => { this.idle = 0; });

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.45, 0.25, 0.6);
    this.composer.addPass(this.bloom);
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
      const dashed = lv === 'b' || lv === 'c';
      const m = new LineMaterial({ color: COL[lv], linewidth: WID[lv], dashed, dashSize: 2.2, gapSize: 1.6, transparent: true, opacity: OPA[lv], depthWrite: false });
      m.resolution.set(this.w, this.h);
      const l = new LineSegments2(g, m);
      if (dashed) l.computeLineDistances();
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
    this.tick.push(t => { (shield.material as THREE.LineBasicMaterial).opacity = (0.26 + 0.07 * Math.sin(t * 1.4)) * (0.35 + 0.65 * this.focus.base ** 2); });

    const tk = new Kit(); turrets(tk); this.add(tk, 'turrets', 'base');
    const hk = new Kit(); hullKit(hk); this.add(hk, 'hull', 'base', false, this.hullFill);
    const dk = new Kit(); deckKit(dk); this.add(dk, 'deck', 'base');
    // 추진기 불빛
    [-78, -26, 26, 78].forEach(z => {
      const x0 = -Math.sqrt(RP * RP - z * z) + 6;
      const glow = new THREE.Mesh(new THREE.CircleGeometry(8, 24).rotateY(Math.PI / 2).translate(x0 - 27, -10, z), new THREE.MeshBasicMaterial({ color: 0x8fdcff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      glow.renderOrder = 3; this.scene.add(glow);
      this.tick.push(t => { glow.material.opacity = 0.45 + 0.2 * Math.sin(t * 6 + z); });
    });
    // 셔틀
    const tram = new THREE.Mesh(new THREE.BoxGeometry(12, 5, 6), new THREE.MeshBasicMaterial({ color: 0xbfeaff }));
    tram.renderOrder = 3; this.scene.add(tram);
    this.tick.push(t => { tram.position.set(-93 + Math.sin(t * 0.6) * 9, Y + 25.5, 0); });

    // 본부 단지
    const hb = new Kit(); hqBase(hb); this.add(hb, 'hq:base', 'hq');
    for (const [spot, draw] of Object.entries(HQ_DRAW)) {
      const k = new Kit(); draw(k);
      const p = this.add(k, spot, 'hq', true);
      if (spot === 'sky') this.tick.push(t => { p.group.position.y = Math.sin(t * 0.8) * 1.2; });
    }
    // 관제탑 경고등 · 반응로 맥동 · 봉인 고리 회전
    const bea = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 8).translate(CORE.x, HQ_B + 12 + 58 + 5 + 9, CORE.z), new THREE.MeshBasicMaterial({ color: COL.g }));
    bea.renderOrder = 3; this.scene.add(bea);
    this.tick.push(t => { bea.visible = Math.sin(t * 4) > 0; });
    const core = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 12).translate(CORE.x, -1, CORE.z), new THREE.MeshBasicMaterial({ color: 0x8fdcff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
    core.renderOrder = 3; this.scene.add(core);
    this.tick.push(t => { core.scale.setScalar(1 + 0.1 * Math.sin(t * 3)); (core.material as THREE.MeshBasicMaterial).opacity = 0.6 * this.xray; });

    // 숙소 단지
    const rb = new Kit(); rb.podium(RES_PODIUM, Y, 8);
    rb.poly(circ(-160, RES_B + 0.4, 0, 12, 32), 'b');
    RES_TWR.filter(t => !t.key).forEach(t => resTower(rb, t));
    this.add(rb, 'quarters', 'res', true);
    RES_TWR.filter(t => t.key).forEach(t => { const k = new Kit(); resTower(k, t); this.add(k, t.key!, 'res', true); });

    // 섬 화면에서 고르는 큰 상자
    this.addPick('site:hq', 'hq', [-80, Y, -97], [200, 160, 97]);
    this.addPick('site:res', 'res', [-214, Y, -98], [-106, 110, 98]);
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
      el.style.transform = `translate3d(${((this.v3.x + 1) / 2) * this.w}px, ${((1 - this.v3.y) / 2) * this.h}px, 0)`;
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
