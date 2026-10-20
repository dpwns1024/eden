/**
 * 아이기스 3D 홀로그램 지도 (사용자 요청 — 고퀄리티 3D 홀로그램 도시처럼). three.js로 그리고, AegisScene.tsx가 띄운다.
 *  - 모든 건물은 발광 선(가산 혼합) + 아주 옅은 유리 면 + 블룸(빛 번짐)으로 그린다.
 *  - 섬 · 바다 격자 · 주변 도시(시드 고정 난수) · 도로와 그 위를 흐르는 빛 · 현수교 · 떠다니는 입자.
 *  - 지휘본부: 단면 좌표의 방 칸을 입체 방으로 세우고 방마다 소품. 옥상 돔 · 코어 탑 · 헬기 착륙장, 위에 하늘정원 부유섬.
 *  - 거주구역: 일곱 숙소동(층 띠 · 창 · 발코니 · 옥상 설비 · 연결 다리), 가운데 정원.
 *  - 화면(site · hq · res)마다 카메라가 날아가고, 고른 시설은 주황(또는 캐릭터 대표색)으로 빛난다.
 * 시설 이름표는 React가 그리고(data-k), 자리는 여기서 매 프레임 투영해 옮긴다.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { AEGIS_SPOTS, RES_TOWERS, type AegisView } from '@/lib/aegisMap';
import {
  ISLAND, ISLETS, ptsOf, mapXZ, HQX, HQZ, HQ_S, HQ_D, hqW, zOf, rectsOf, HQ_BANDS, RX, RZ, RES_S, RES_V, resW, anchorOf, type P3,
} from './layout';

export type View = 'site' | AegisView;
type Lv = 'a' | 'b' | 'c' | 'g';
type Cat = 'hq' | 'res' | 'city';

const COL = { a: 0x58d6ff, b: 0x2a9ae6, c: 0x1c6ea8, g: 0xbff2ff, f: 0x1a7cc0, hot: 0xff9a36 };
const BASE = { a: 0.85, b: 0.42, c: 0.16, g: 0.85, f: 0.014 };

/** 시드 고정 난수 — 주변 도시가 매번 같게 */
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ───────── 선 · 면 모으기 ───────── */
/** 한 덩어리(파트)의 선과 면. 좌표는 그 파트의 '설계 좌표'(x · 깊이 y · 높이 z)로 받아 월드로 옮긴다 */
class Kit {
  L: Record<Lv, number[]> = { a: [], b: [], c: [], g: [] };
  F: THREE.BufferGeometry[] = [];
  box3 = new THREE.Box3();
  constructor(private ox: number, private oy: number, private oz: number, private s: number, private sv: number) {}
  v(x: number, y: number, z: number): P3 { return [this.ox + x * this.s, this.oy + z * this.sv, this.oz + y * this.s]; }
  private push(lv: Lv, p: P3) { this.L[lv].push(...p); this.box3.expandByPoint(new THREE.Vector3(...p)); }
  seg(p: P3, q: P3, lv: Lv = 'b') { this.push(lv, this.v(...p)); this.push(lv, this.v(...q)); }
  path(a: P3[], lv: Lv = 'b', closed = false) {
    for (let i = 0; i < a.length - 1; i++) this.seg(a[i], a[i + 1], lv);
    if (closed && a.length > 2) this.seg(a[a.length - 1], a[0], lv);
  }
  box(x: number, y: number, z: number, w: number, d: number, h: number, lv: Lv = 'b', fill = true) {
    const c: P3[] = [[x, y, z], [x + w, y, z], [x + w, y + d, z], [x, y + d, z]];
    const t = c.map(([a, b]) => [a, b, z + h] as P3);
    this.path(c, lv, true); this.path(t, lv, true);
    c.forEach((p, i) => this.seg(p, t[i], lv));
    if (fill) {
      const [cx, cy, cz] = this.v(x + w / 2, y + d / 2, z + h / 2);
      this.F.push(new THREE.BoxGeometry(Math.max(w * this.s, 0.01), Math.max(h * this.sv, 0.01), Math.max(d * this.s, 0.01)).translate(cx, cy, cz));
    }
  }
  ring(cx: number, cy: number, z: number, rx: number, ry = rx, n = 24): P3[] {
    return Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * rx, cy + Math.sin((i / n) * Math.PI * 2) * ry, z] as P3);
  }
  cyl(cx: number, cy: number, z: number, r: number, h: number, lv: Lv = 'b', ry = r, fill = true, n = 24) {
    const lo = this.ring(cx, cy, z, r, ry, n), hi = this.ring(cx, cy, z + h, r, ry, n);
    this.path(lo, lv, true); this.path(hi, lv, true);
    for (let i = 0, st = Math.max(1, Math.round(n / 6)); i < n; i += st) this.seg(lo[i], hi[i], lv === 'a' ? 'b' : 'c');
    if (fill) {
      const [px, py, pz] = this.v(cx, cy, z + h / 2);
      this.F.push(new THREE.CylinderGeometry(r * this.s, r * this.s, h * this.sv, 20, 1, false).scale(1, 1, ry / r).translate(px, py, pz));
    }
  }
  tree(x: number, y: number, z: number, k = 1) {
    this.seg([x, y, z], [x, y, z + 12 * k], 'c');
    const a = this.ring(x, y, z + 12 * k, 15 * k, 15 * k, 12), b = this.ring(x, y, z + 26 * k, 10 * k, 10 * k, 12);
    const top: P3 = [x, y, z + 44 * k];
    this.path(a, 'g', true); this.path(b, 'g', true);
    for (let i = 0; i < 12; i += 3) { this.seg(a[i], b[i], 'g'); this.seg(b[i], top, 'g'); }
  }
}

interface Part {
  key: string; cat: Cat; group: THREE.Group;
  mats: Record<Lv | 'f', THREE.LineBasicMaterial | THREE.MeshBasicMaterial>;
  pick?: THREE.Mesh; center: THREE.Vector3;
}
const lineMat = (c: number, o: number) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false });
function makePart(kit: Kit, key: string, cat: Cat, pickable: boolean): Part {
  const group = new THREE.Group();
  const mats = {
    a: lineMat(COL.a, BASE.a), b: lineMat(COL.b, BASE.b), c: lineMat(COL.c, BASE.c), g: lineMat(COL.g, BASE.g),
    f: new THREE.MeshBasicMaterial({ color: COL.f, transparent: true, opacity: BASE.f, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  };
  (['c', 'b', 'a', 'g'] as Lv[]).forEach(lv => {
    if (!kit.L[lv].length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(kit.L[lv], 3));
    group.add(new THREE.LineSegments(g, mats[lv]));
  });
  if (kit.F.length) {
    const merged = mergeGeometries(kit.F.map(g => g.index ? g.toNonIndexed() : g), false);
    kit.F.forEach(g => g.dispose());
    if (merged) group.add(new THREE.Mesh(merged, mats.f));
  }
  const center = kit.box3.getCenter(new THREE.Vector3());
  let pick: THREE.Mesh | undefined;
  if (pickable && !kit.box3.isEmpty()) {
    const sz = kit.box3.getSize(new THREE.Vector3());
    pick = new THREE.Mesh(new THREE.BoxGeometry(sz.x + 0.5, sz.y + 0.5, sz.z + 0.5), new THREE.MeshBasicMaterial({ visible: false }));
    pick.position.copy(center);
    pick.userData.key = key;
    group.add(pick);
  }
  return { key, cat, group, mats, pick, center };
}

/* ───────── 섬 · 바다 · 주변 도시 ───────── */
const ISL = ptsOf(ISLAND).map(([x, y]) => mapXZ(x, y));
function inPoly(x: number, z: number, poly: [number, number][]) {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) ins = !ins;
  }
  return ins;
}
const inset = (poly: [number, number][], f: number, c: [number, number] = [0, 0]) => poly.map(([x, z]) => [c[0] + (x - c[0]) * f, c[1] + (z - c[1]) * f] as [number, number]);
const SEA = -40;

function buildIsland(): Kit {
  const k = new Kit(0, 0, 0, 1, 1);
  const top = ISL.map(([x, z]) => [x, z, 0] as P3), bot = ISL.map(([x, z]) => [x, z, SEA] as P3);
  k.path(top, 'a', true);
  k.path(bot, 'c', true);
  top.forEach((p, i) => { if (i % 2 === 0) k.seg(p, bot[i], 'c'); });
  [0.86, 0.7, 0.52].forEach((f, i) => k.path(inset(ISL, f, [-20, 10]).map(([x, z]) => [x, z, -i * 0.01] as P3), 'c', true));
  ISLETS.forEach(d => {
    const p = ptsOf(d).map(([x, y]) => mapXZ(x, y));
    k.path(p.map(([x, z]) => [x, z, -26] as P3), 'b', true);
    k.path(p.map(([x, z]) => [x, z, SEA] as P3), 'c', true);
    p.forEach(([x, z], i) => { if (i % 3 === 0) k.seg([x, z, -26], [x, z, SEA], 'c'); });
  });
  return k;
}
function islandFill(): THREE.Mesh {
  const shape = new THREE.Shape(ISL.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2);
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x0f5f99, transparent: true, opacity: 0.035, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
}
function buildSea(): THREE.LineSegments {
  const p: number[] = [];
  for (let v = -1200; v <= 1200; v += 40) { p.push(-1200, SEA, v, 1200, SEA, v, v, SEA, -1200, v, SEA, 1200); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  return new THREE.LineSegments(g, lineMat(0x1a5f95, 0.18));
}

/** 주변 도시 — 섬 안 빈터에 시드 고정으로 세운 건물들 */
function buildCity(): Kit {
  const k = new Kit(0, 0, 0, 1, 1);
  const r = rng(7);
  const busy = (x: number, z: number) =>
    (Math.abs(x - HQX) < 68 && Math.abs(z - HQZ) < 34) || (Math.abs(x - RX) < 40 && Math.abs(z - RZ) < 40) ||
    Math.hypot(x - (HQX + RX) / 2, z - (HQZ + RZ) / 2) < 30;
  const placed: [number, number, number][] = [];
  for (let n = 0; n < 900 && placed.length < 110; n++) {
    const x = -300 + r() * 620, z = -200 + r() * 410;
    const w = 6 + r() * 10, d = 6 + r() * 10, rad = Math.max(w, d) * 0.75 + 3;
    if (!inPoly(x, z, inset(ISL, 0.9, [-20, 10])) || busy(x, z)) continue;
    if (placed.some(([px, pz, pr]) => Math.hypot(px - x, pz - z) < pr + rad)) continue;
    placed.push([x, z, rad]);
    const nearC = Math.max(0, 1 - Math.hypot(x + 20, z) / 260);
    const h = 5 + r() * 14 + nearC * nearC * 40 * r();
    const style = r();
    const x0 = x - w / 2, y0 = z - d / 2;
    if (style < 0.16) {
      // 원통 탑
      const rr = Math.min(w, d) / 2;
      k.cyl(x, z, 0, rr, h, 'b', rr, true, 16);
      for (let zz = 4; zz < h; zz += 4) k.path(k.ring(x, z, zz, rr, rr, 16), 'c', true);
      k.seg([x, z, h], [x, z, h + 6 + r() * 8], 'g');
    } else if (style < 0.5) {
      // 계단식 탑 + 첨탑
      let bw = w, bd = d, zb = 0;
      const tiers = 2 + Math.floor(r() * 2);
      for (let t = 0; t < tiers; t++) {
        const th = h / tiers;
        k.box(x - bw / 2, z - bd / 2, zb, bw, bd, th, t === tiers - 1 ? 'a' : 'b');
        for (let zz = zb + 3; zz < zb + th; zz += 3) k.path([[x - bw / 2, z + bd / 2, zz], [x + bw / 2, z + bd / 2, zz], [x + bw / 2, z - bd / 2, zz]], 'c');
        zb += th; bw *= 0.72; bd *= 0.72;
      }
      if (r() < 0.6) k.seg([x, z, zb], [x, z, zb + 8 + r() * 14], 'g');
    } else {
      // 상자 + 창 격자
      k.box(x0, y0, 0, w, d, h, h > 18 ? 'a' : 'b');
      for (let zz = 3; zz < h; zz += 3) k.path([[x0, y0 + d, zz], [x0 + w, y0 + d, zz], [x0 + w, y0, zz]], 'c');
      for (let xx = 2.5; xx < w; xx += 2.5) k.seg([x0 + xx, y0 + d, 0], [x0 + xx, y0 + d, h], 'c');
      if (r() < 0.4) k.box(x0 + w * 0.2, y0 + d * 0.2, h, w * 0.3, d * 0.3, 2.5, 'b');
    }
  }
  // 현수교 — 섬 동쪽 끝 → 작은 섬
  const A: P3 = [318, 6, 0], B: P3 = [372, -24, -26];
  const at = (t: number, dz = 0): P3 => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t + dz];
  const side = (o: number): P3 => [o * 0.48, o * 0.86, 0];
  [-3, 3].forEach(o => {
    const s = side(o), sh = (p: P3): P3 => [p[0] + s[0], p[1] + s[1], p[2]];
    k.path(Array.from({ length: 11 }, (_, i) => sh(at(i / 10, 2))), 'a');
    [0.18, 0.82].forEach(t => k.seg(sh(at(t, -10)), sh(at(t, 24)), 'a'));
    // 케이블 — 양 끝에서 탑 꼭대기로 오르고, 탑 사이는 아래로 처진다
    const ch = (t: number) => t < 0.18 ? 2 + (t / 0.18) * 22 : t > 0.82 ? 2 + ((1 - t) / 0.18) * 22 : 8 + 16 * ((t - 0.5) / 0.32) ** 2;
    const cab = Array.from({ length: 21 }, (_, i) => sh(at(i / 20, ch(i / 20))));
    cab.forEach((p, i) => { if (i % 2 === 0) k.seg(p, sh(at(i / 20, 2)), 'c'); });
  });
  return k;
}

/** 도로 — 둘레 길 · 본부 ↔ 숙소 · 북쪽 부두 · 동쪽 다리 */
function roads(): THREE.Vector3[][] {
  const ringRoad = inset(ISL, 0.8, [-20, 10]).map(([x, z]) => new THREE.Vector3(x, 0.3, z));
  ringRoad.push(ringRoad[0].clone());
  const L = (a: [number, number][]) => a.map(([x, z]) => new THREE.Vector3(x, 0.3, z));
  return [
    ringRoad,
    L([[HQX + 50, HQZ + 20], [(HQX + RX) / 2, HQZ + 20], [(HQX + RX) / 2, RZ], [RX - 40, RZ]]),
    L([[HQX, HQZ - 20], [HQX, -130], [-150, -170]]),
    L([[RX + 40, RZ], [200, RZ], [318, 6]]),
    L([[HQX - 55, HQZ], [-230, 0], [-262, 60]]),
    L([[RX, RZ + 40], [RX, 140], [120, 170]]),
  ];
}

/* ───────── 지휘본부 ───────── */
const hqKit = () => new Kit(HQX - 500 * HQ_S, 0, HQZ - (HQ_D / 2) * HQ_S, HQ_S, HQ_S);
const D = HQ_D, X0 = 110, X1 = 890, UX0 = 150, RZT = zOf(300);

function hqShell(): Kit {
  const k = hqKit();
  HQ_BANDS.forEach((b, i) => {
    const zb = zOf(b.bot), zt = zOf(b.top), xl = b.bot > 880 ? UX0 : X0;
    k.path([[xl, 0, zb], [X1, 0, zb], [X1, D, zb], [xl, D, zb]], 'a', true);
    k.box(xl, 0, zb - 3, X1 - xl, D, 3, 'c');
    for (let x = xl + 39; x < X1; x += 39) k.seg([x, D, zb], [x, D, zt], 'c');
    for (let y = 25; y < D; y += 25) { k.seg([X1, y, zb], [X1, y, zt], 'c'); k.seg([xl, y, zb], [xl, y, zt], 'c'); }
    if (i === 0) k.path([[X0, 0, zt], [X1, 0, zt], [X1, D, zt], [X0, D, zt]], 'a', true);
  });
  [[X0, 0], [X1, 0], [X1, D], [X0, D]].forEach(([x, y]) => k.seg([x, y, 0], [x, y, RZT], 'a'));
  [[UX0, 0], [X1, 0], [X1, D], [UX0, D]].forEach(([x, y]) => k.seg([x, y, 0], [x, y, zOf(1160)], 'b'));
  k.path([[X0 + 6, 6, RZT + 10], [X1 - 6, 6, RZT + 10], [X1 - 6, D - 6, RZT + 10], [X0 + 6, D - 6, RZT + 10]], 'c', true);
  // 칸막이
  HQ_BANDS.forEach(b => {
    const xs = Object.values(AEGIS_SPOTS).flatMap(s => rectsOf(s.cell)).filter(r => r.y0 > b.top && r.y1 < b.bot).sort((p, q) => p.x0 - q.x0);
    for (let i = 1; i < xs.length; i++) {
      if (xs[i].x0 - xs[i - 1].x1 > 30) continue;
      const wx = (xs[i - 1].x1 + xs[i].x0) / 2;
      k.path([[wx, 0, zOf(b.bot)], [wx, D, zOf(b.bot)], [wx, D, zOf(b.top)], [wx, 0, zOf(b.top)]], 'c', true);
    }
  });
  // 외부 비상계단
  for (let z = zOf(580); z < zOf(470); z += 18) k.path([[X1, 150, z], [X1 + 44, 150, z + 9], [X1, 180, z + 18]], 'c');
  // 공조기
  k.box(640, 30, RZT, 46, 34, 16, 'c');
  k.box(640, 120, RZT, 30, 30, 22, 'c');
  return k;
}

/** 방마다 소품 (단면 좌표: x0~x1 · 바닥 z · 천장까지 h) */
function props(k: Kit, spot: string, x0: number, x1: number, z: number, h: number) {
  const W = x1 - x0, cx = (x0 + x1) / 2;
  const table = (x: number, y: number) => {
    k.cyl(x, y, z + 14, 13, 2, 'b');
    k.seg([x, y, z], [x, y, z + 14], 'c');
    k.path(k.ring(x - 22, y, z + 8, 6, 6, 10), 'c', true);
    k.path(k.ring(x + 22, y, z + 8, 6, 6, 10), 'c', true);
  };
  switch (spot) {
    case 'lounge':
      k.box(x0 + 16, 12, z, W - 32, 22, 14);
      k.box(x1 - 58, 70, z, 38, 80, 22);
      [48, 112].forEach(dx => { table(x0 + dx, 80); table(x0 + dx + 30, 150); });
      break;
    case 'dining':
      [55, 135].forEach(y => {
        k.box(x0 + 30, y, z + 12, W - 60, 22, 3);
        k.box(x0 + 34, y - 14, z, W - 68, 8, 7, 'c');
        k.box(x0 + 34, y + 28, z, W - 68, 8, 7, 'c');
      });
      break;
    case 'igarden':
      k.box(x0 + 18, 14, z, W - 36, 34, 10);
      [[50, 110, 1.1], [120, 70, 1.3], [190, 125, 1.05], [80, 165, 0.85], [210, 40, 1.1]].forEach(([dx, y, s]) => k.tree(x0 + dx, y, z, s));
      break;
    case 'resonance':
      for (let i = 0; i < 5; i++) {
        const x = x0 + 110 + i * 140;
        k.cyl(x, 80, z, 24, 50, 'a');
        k.path(k.ring(x, 80, z + 30, 27), 'g', true);
        k.seg([x, 80, z + 50], [x, 80, z + h - 2], 'c');
        k.box(x - 24, 150, z, 48, 18, 14, 'c');
      }
      break;
    case 'hdiv':
    case 'sdiv': {
      const rows = spot === 'sdiv' ? [70, 140] : [55, 130];
      const n = Math.floor((spot === 'sdiv' ? 340 : W - 40) / 72);
      rows.forEach(y => { for (let i = 0; i < n; i++) {
        const x = x0 + 28 + i * 72;
        k.box(x, y, z, 52, 24, 12);
        k.box(x + 12, y + 2, z + 12, 28, 3, 14, 'g', false);
      } });
      if (spot === 'sdiv') {
        k.box(x0 + 420, 10, z, W - 450, 22, 74);
        for (let x = x0 + 450; x < x1 - 30; x += 30) k.seg([x, 32, z], [x, 32, z + 74], 'c');
        [450, 580].forEach(dx => k.box(x0 + dx, 110, z, 100, 16, 9, 'c'));
      }
      break;
    }
    case 'harmony':
      k.box(x0 + 26, 26, z, 120, 26, 15);
      k.box(x0 + 26, 52, z, 26, 70, 15);
      table(x0 + 110, 105);
      k.seg([x1 - 40, 40, z], [x1 - 40, 40, z + 54], 'c');
      k.path(k.ring(x1 - 40, 40, z + 54, 12), 'g', true);
      k.tree(x1 - 40, 150, z, 0.8);
      break;
    case 'rst':
      for (let i = 0; i < 4; i++) k.box(x0 + 18 + i * 52, 10, z, 40, 18, 66);
      k.box(x0 + 60, 120, z, 110, 30, 13);
      break;
    case 'medbay':
      for (let i = 0; i < 4; i++) {
        const x = x0 + 30 + i * 82;
        k.box(x, 40, z, 34, 66, 12);
        k.box(x + 4, 42, z + 12, 26, 12, 4, 'c');
        k.path([[x - 8, 30, z + 50], [x + 42, 30, z + 50], [x + 42, 116, z + 50], [x - 8, 116, z + 50]], 'c', true);
      }
      k.seg([x1 - 60, 2, z + 52], [x1 - 60, 2, z + 76], 'g');
      k.seg([x1 - 72, 2, z + 64], [x1 - 48, 2, z + 64], 'g');
      break;
    case 'ward':
      for (let i = 0; i < 6; i++) {
        const x = x0 + 22 + i * 58;
        k.box(x, 18, z, 30, 62, 11);
        k.path([[x + 42, 6, z], [x + 42, 96, z], [x + 42, 96, z + 56], [x + 42, 6, z + 56]], 'c', true);
      }
      break;
    case 'stabil':
      k.cyl(cx, 100, z, 40, 56, 'g');
      k.path(k.ring(cx, 100, z + 1, 62, 62, 32), 'c', true);
      k.path(k.ring(cx, 100, z + 28, 41), 'c', true);
      break;
    case 'lobby':
      k.box(cx - 66, 70, z, 132, 24, 16);
      [x0 + 34, x1 - 34].forEach(x => k.cyl(x, 160, z, 8, h - 4, 'b'));
      k.box(cx - 60, D, z + h - 26, 120, 46, 5, 'a');
      k.seg([cx - 54, D + 40, z], [cx - 54, D + 40, z + h - 26], 'c');
      k.seg([cx + 54, D + 40, z], [cx + 54, D + 40, z + h - 26], 'c');
      break;
    case 'mech':
      [70, 145, 220].forEach(dx => k.cyl(x0 + dx, 90, z, 27, 60, 'b'));
      k.path([[x0 + 70, 90, z + 76], [x0 + 330, 90, z + 76], [x0 + 330, 60, z + 76]], 'c');
      [70, 145, 220].forEach(dx => k.seg([x0 + dx, 90, z + 60], [x0 + dx, 90, z + 76], 'c'));
      k.box(x1 - 150, 30, z, 110, 90, 44);
      break;
    case 'aqua':
      k.box(x0 + 18, 18, z, W - 36, 160, 72, 'g');
      for (let y = 40; y < 178; y += 34) k.path(Array.from({ length: 13 }, (_, i) => [x0 + 18 + (i * (W - 36)) / 12, y + (i % 2 ? 6 : -6), z + 64] as P3), 'c');
      [60, 120, 170].forEach(dx => k.path([[x0 + dx, 100, z], [x0 + dx - 6, 100, z + 20], [x0 + dx + 4, 100, z + 38], [x0 + dx - 2, 100, z + 52]], 'g'));
      break;
    case 'armory':
      for (let i = 0; i < 5; i++) {
        const x = x0 + 34 + i * 62;
        k.box(x, 26, z, 10, 120, 74);
        for (let y = 40; y < 140; y += 20) k.seg([x + 12, y, z + 12], [x + 12, y, z + 66], 'c');
      }
      break;
    case 'gate': {
      k.cyl(cx, 100, z, 64, 6, 'b');
      const vr = (r: number) => Array.from({ length: 32 }, (_, i) => [cx + Math.cos((i / 32) * Math.PI * 2) * r * 0.7, 100, z + 50 + Math.sin((i / 32) * Math.PI * 2) * r] as P3);
      k.path(vr(42), 'g', true); k.path(vr(30), 'g', true);
      break;
    }
    case 'arena':
      [40, 72, 96].forEach((r, i) => k.path(k.ring(cx, 100, z + 1, r * 1.6, r, 40), i === 1 ? 'g' : 'c', true));
      [[x0 + 30, 20], [x1 - 30, 20], [x0 + 30, 180], [x1 - 30, 180]].forEach(([x, y]) => k.cyl(x, y, z, 8, h - 4, 'b'));
      break;
  }
}

/** 옥상 · 하늘 시설 (돔 · 코어 · 헬기 · 하늘정원) */
function roofPart(spot: string): Kit {
  const k = hqKit(), MY = D / 2;
  if (spot === 'dome') {
    const c = { x: 226, z: RZT }, r = 92;
    const sp = (th: number, ph: number): P3 => [c.x + r * Math.cos(th) * Math.cos(ph), MY + r * 0.95 * Math.cos(th) * Math.sin(ph), c.z + r * Math.sin(th)];
    [0, 0.4, 0.8, 1.15, 1.4].forEach((th, i) => k.path(Array.from({ length: 40 }, (_, j) => sp(th, (j / 40) * Math.PI * 2)), i === 0 ? 'a' : 'b', true));
    for (let j = 0; j < 12; j++) k.path(Array.from({ length: 13 }, (_, i) => sp((i / 12) * (Math.PI / 2), (j / 12) * Math.PI * 2)), 'b');
    k.cyl(c.x, MY, c.z, r * 0.6, 4, 'g', r * 0.57, false);
    const [px, py, pz] = k.v(c.x, MY, c.z);
    k.F.push(new THREE.SphereGeometry(r * HQ_S, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1, 0.95).translate(px, py, pz));
  } else if (spot === 'core') {
    k.cyl(500, MY, RZT, 22, 64, 'a');
    for (let z = RZT + 8; z < RZT + 64; z += 8) k.path(k.ring(500, MY, z, 22, 22, 20), 'c', true);
    k.cyl(500, MY, RZT + 64, 30, 8, 'b');
    k.cyl(500, MY, RZT + 74, 62, 8, 'a', 56);
    k.path(k.ring(500, MY, RZT + 78, 80, 72, 40), 'g', true);
    k.seg([500, MY, RZT + 82], [500, MY, RZT + 124], 'a');
    k.seg([486, MY, RZT + 104], [514, MY, RZT + 104], 'b');
  } else if (spot === 'heli') {
    const px = 726, pw = 160;
    k.box(px, 20, RZT + 14, pw, 160, 4, 'b');
    [[px + 10, 30], [px + pw - 10, 30], [px + 10, 170], [px + pw - 10, 170]].forEach(([x, y]) => k.seg([x, y, RZT], [x, y, RZT + 14], 'c'));
    k.path(k.ring(806, 100, RZT + 19, 62, 62, 36), 'g', true);
    k.seg([786, 76, RZT + 19], [786, 124, RZT + 19], 'g'); k.seg([826, 76, RZT + 19], [826, 124, RZT + 19], 'g'); k.seg([786, 100, RZT + 19], [826, 100, RZT + 19], 'g');
    k.box(786, 140, RZT + 22, 44, 22, 18, 'a');
    k.seg([786, 151, RZT + 32], [736, 151, RZT + 36], 'b');
    k.seg([808, 151, RZT + 40], [808, 151, RZT + 44], 'b');
  } else if (spot === 'sky') {
    const top = zOf(60), mid = zOf(100), tip = zOf(146);
    const T = k.ring(500, MY, top, 126, 92, 40), M = k.ring(500, MY, mid, 82, 60, 40);
    const P: P3 = [500, MY, tip];
    k.path(T, 'a', true); k.path(M, 'b', true);
    for (let i = 0; i < 40; i += 4) { k.seg(T[i], M[i], 'c'); k.seg(M[i], P, 'c'); }
    for (let i = 0; i < 8; i++) {
      const an = (i / 8) * Math.PI * 2, x = 500 + Math.cos(an) * 46, y = MY + Math.sin(an) * 34;
      k.seg([x, y, top], [x, y, top + (i % 3 === 2 ? 22 : 40)], 'a');
    }
    k.path(k.ring(500, MY, top + 40, 52, 40, 32), 'b', true);
    k.tree(420, 60, top, 0.9); k.tree(585, 140, top, 1.05); k.tree(560, 40, top, 0.75); k.tree(440, 150, top, 0.8);
    const [px, py, pz] = k.v(500, MY, (top + tip) / 2);
    k.F.push(new THREE.ConeGeometry(126 * HQ_S, (top - tip) * HQ_S, 24, 1, false).rotateX(Math.PI).scale(1, 1, 92 / 126).translate(px, py, pz));
  }
  return k;
}

/* ───────── 거주구역 ───────── */
const resKit = () => new Kit(RX - 160 * RES_S, 0, RZ - 160 * RES_S, RES_S, RES_V);
function tower(k: Kit, t: (typeof RES_TOWERS)[number]) {
  const x = t.cx - 32, y = t.cy - 32, w = 64, d = 64, h = t.h;
  k.box(x - 5, y - 5, 0, w + 10, d + 10, 4, 'c');
  k.box(x, y, 0, w, d, h, 'a');
  for (let z = 7; z < h - 2; z += 7) k.path([[x, y + d, z], [x + w, y + d, z], [x + w, y, z], [x, y, z], [x, y + d, z]], 'c');
  for (let i = 8; i < w; i += 8) { k.seg([x + i, y + d, 0], [x + i, y + d, h], 'c'); k.seg([x + w, y + i, 0], [x + w, y + i, h], 'c'); k.seg([x + i, y, 0], [x + i, y, h], 'c'); k.seg([x, y + i, 0], [x, y + i, h], 'c'); }
  for (let z = 21; z < h - 8; z += 21) {
    k.path([[x + 8, y + d, z], [x + 8, y + d + 6, z], [x + w - 8, y + d + 6, z], [x + w - 8, y + d, z]], 'b');
    k.path([[x + w, y + 8, z], [x + w + 6, y + 8, z], [x + w + 6, y + d - 8, z], [x + w, y + d - 8, z]], 'b');
  }
  k.box(x + 20, y + d, 10, 24, 10, 2, 'b');
  k.box(x + 8, y + 8, h, 22, 18, 8, 'b');
  k.box(x + 44, y + 8, h, 12, 12, 5, 'c');
  if (t.key) { k.seg([t.cx, t.cy, h], [t.cx, t.cy, h + 30], 'g'); k.path(k.ring(t.cx, t.cy, h + 2, 40, 40, 32), 'g', true); }
}
function resBase(): Kit {
  const k = resKit();
  const plate: P3[] = ([[24, 0], [296, 0], [320, 24], [320, 296], [296, 320], [24, 320], [0, 296], [0, 24]] as [number, number][]).map(([x, y]) => [x, y, 0]);
  k.path(plate, 'a', true);
  k.path(plate.map(([x, y]) => [x, y, -26] as P3), 'c', true);
  plate.forEach(p => k.seg(p, [p[0], p[1], -26], 'c'));
  k.path(([[30, 12], [290, 12], [308, 30], [308, 290], [290, 308], [30, 308], [12, 290], [12, 30]] as [number, number][]).map(([x, y]) => [x, y, 0.5] as P3), 'c', true);
  RES_TOWERS.filter(t => !t.key).forEach(t => tower(k, t));
  k.box(82, 42, 58, 46, 16, 8, 'b');
  k.box(82, 262, 50, 46, 16, 8, 'b');
  ([[14, 110], [14, 210], [110, 14], [210, 14], [306, 110], [306, 210], [110, 306], [230, 300], [300, 230]] as [number, number][]).forEach(([x, y]) => k.tree(x, y, 0, 0.45));
  ([[150, 40], [150, 100], [40, 150], [100, 150], [200, 200], [250, 250], [290, 290]] as [number, number][]).forEach(([x, y]) => { k.seg([x, y, 0], [x, y, 16], 'c'); k.seg([x, y, 16], [x, y, 17], 'g'); });
  return k;
}
function yardPart(): Kit {
  const k = resKit();
  k.path(k.ring(160, 160, 0.5, 70, 70, 40), 'a', true);
  k.path(k.ring(160, 160, 0.5, 30, 30, 28), 'g', true);
  k.path(k.ring(160, 160, 4, 18, 18, 20), 'b', true);
  k.seg([160, 160, 0], [160, 160, 14], 'g');
  ([[105, 105], [215, 105], [105, 215], [215, 215]] as [number, number][]).forEach(([x, y]) => k.tree(x, y, 0, 0.45));
  const [px, py, pz] = k.v(160, 160, 0.3);
  k.F.push(new THREE.CircleGeometry(70 * RES_S, 40).rotateX(-Math.PI / 2).translate(px, py, pz));
  return k;
}

/* ───────── 카메라 자리 ───────── */
const CAM: Record<View, { pos: THREE.Vector3; tgt: THREE.Vector3 }> = {
  site: { pos: new THREE.Vector3(250, 300, 470), tgt: new THREE.Vector3(-10, 0, 10) },
  hq: { pos: new THREE.Vector3(HQX + 100, 72, HQZ + 196), tgt: new THREE.Vector3(HQX, 30, HQZ) },
  res: { pos: new THREE.Vector3(RX + 118, 112, RZ + 142), tgt: new THREE.Vector3(RX, 20, RZ) },
};
const FOCUS: Record<View, Record<Cat, number>> = {
  site: { hq: 1, res: 1, city: 1 },
  hq: { hq: 1, res: 0.14, city: 0.15 },
  res: { hq: 0.15, res: 1, city: 0.15 },
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
  private view: View = 'site';
  private sel: string | null = null;
  private selColor = new THREE.Color(COL.hot);
  private live = new Set<string>();
  private fly = 1;              // 카메라 이동 진행(0~1) — 1이면 멈춤
  private flyFrom = { pos: new THREE.Vector3(), tgt: new THREE.Vector3() };
  private flyTo = { pos: new THREE.Vector3(), tgt: new THREE.Vector3() };
  private focus: Record<Cat, number> = { hq: 1, res: 1, city: 1 };
  private pulses!: { pts: THREE.Points; paths: { p: THREE.Vector3[]; len: number[]; total: number }[]; t: Float32Array; v: Float32Array; who: Uint16Array };
  private dust!: THREE.Points;
  private scan!: THREE.LineLoop;
  private sky?: Part;
  private raf = 0;
  private running = true;
  private clock = new THREE.Clock();
  private ro: ResizeObserver;
  private io: IntersectionObserver;
  private idle = 0;
  private down: { x: number; y: number } | null = null;
  private ray = new THREE.Raycaster();
  private v3 = new THREE.Vector3();

  constructor(private host: HTMLElement, private labels: HTMLElement, private cb: WorldCb) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 1);
    host.prepend(this.renderer.domElement);
    this.renderer.domElement.className = 'am3-gl';
    this.scene.background = new THREE.Color(0x01040b);   // 지우기 색은 합성 단계에서 감마가 두 번 걸려 밝아지므로 배경은 장면 쪽에
    this.scene.fog = new THREE.FogExp2(0x01040b, 0.0011);

    this.camera.position.copy(CAM.site.pos);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(CAM.site.tgt);
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.08, enablePan: false, enableZoom: false, rotateSpeed: 0.6, minPolarAngle: 0.25, maxPolarAngle: 1.45, autoRotate: true, autoRotateSpeed: 0.35 });
    this.controls.addEventListener('start', () => { this.idle = -1; this.controls.autoRotate = false; this.fly = 1; });
    this.controls.addEventListener('end', () => { this.idle = 0; });

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.8, 0.22, 0.28);
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

  private add(kit: Kit, key: string, cat: Cat, pickable = false) {
    const p = makePart(kit, key, cat, pickable);
    this.parts.push(p);
    this.scene.add(p.group);
    return p;
  }

  private build() {
    this.scene.add(buildSea());
    this.scene.add(islandFill());
    this.add(buildIsland(), 'island', 'city');
    this.add(buildCity(), 'city', 'city');
    // 도로 + 흐르는 빛
    const rs = roads();
    const roadGeo = new THREE.BufferGeometry();
    const rp: number[] = [];
    rs.forEach(p => { for (let i = 0; i < p.length - 1; i++) rp.push(p[i].x, p[i].y, p[i].z, p[i + 1].x, p[i + 1].y, p[i + 1].z); });
    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
    this.scene.add(new THREE.LineSegments(roadGeo, lineMat(0x2fb6ff, 0.55)));
    const paths = rs.map(p => {
      const len = [0];
      for (let i = 1; i < p.length; i++) len.push(len[i - 1] + p[i].distanceTo(p[i - 1]));
      return { p, len, total: len[len.length - 1] };
    });
    const N = 160, r = rng(3);
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    const t = new Float32Array(N), v = new Float32Array(N), who = new Uint16Array(N);
    const warm = new THREE.Color(0xffa040), cool = new THREE.Color(0x8fe6ff);
    for (let i = 0; i < N; i++) {
      who[i] = Math.floor(r() * paths.length); t[i] = r(); v[i] = (0.02 + r() * 0.05) * (r() < 0.5 ? -1 : 1) * (200 / paths[who[i]].total);
      const c = r() < 0.35 ? warm : cool;
      col.set([c.r, c.g, c.b], i * 3);
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: 3.2, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
    this.scene.add(pts);
    this.pulses = { pts, paths, t, v, who };
    // 떠다니는 입자
    const DN = 700, dp = new Float32Array(DN * 3);
    for (let i = 0; i < DN; i++) dp.set([-450 + r() * 900, SEA + r() * 220, -320 + r() * 640], i * 3);
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ size: 1.1, color: 0x7fd8ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.scene.add(this.dust);

    // 지휘본부
    this.add(hqShell(), 'hq:shell', 'hq');
    for (const [spot, s] of Object.entries(AEGIS_SPOTS)) {
      if (s.view !== 'hq') continue;
      const rects = rectsOf(s.cell);
      const k = rects.length ? hqKit() : roofPart(spot);
      rects.forEach(rc => {
        const zb = zOf(rc.y1), zt = zOf(rc.y0);
        k.box(rc.x0 + 2, 2, zb + 1, rc.x1 - rc.x0 - 4, D - 4, zt - zb - 2, 'c');
        props(k, spot, rc.x0, rc.x1, zb, zt - zb);
      });
      const p = this.add(k, spot, 'hq', true);
      if (spot === 'sky') this.sky = p;
    }
    // 본부 전체를 고르는 상자 (섬 화면)
    const hb = hqKit();
    hb.box(X0, 0, zOf(1160), X1 - X0, D, zOf(36) - zOf(1160), 'c', false);
    const hqAll = makePart(new Kit(0, 0, 0, 1, 1), 'site:hq', 'hq', false);
    const sz = hb.box3.getSize(new THREE.Vector3());
    hqAll.pick = new THREE.Mesh(new THREE.BoxGeometry(sz.x + 20, sz.y, sz.z + 20), new THREE.MeshBasicMaterial({ visible: false }));
    hqAll.pick.position.copy(hb.box3.getCenter(new THREE.Vector3()));
    hqAll.pick.userData.key = 'site:hq';
    hqAll.group.add(hqAll.pick);
    this.parts.push(hqAll); this.scene.add(hqAll.group);
    // 훑는 고리
    const ring = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 64 }, (_, i) => new THREE.Vector3(Math.cos((i / 64) * Math.PI * 2) * 62, 0, Math.sin((i / 64) * Math.PI * 2) * 26)));
    this.scan = new THREE.LineLoop(ring, lineMat(0x9fe8ff, 0.7));
    this.scan.position.set(HQX, 0, HQZ);
    this.scene.add(this.scan);

    // 거주구역
    this.add(resBase(), 'res:base', 'res');
    this.add(yardPart(), 'quarters', 'res', true);
    RES_TOWERS.filter(t => t.key).forEach(t => { const k = resKit(); tower(k, t); this.add(k, t.key!, 'res', true); });
    const rb = resKit();
    rb.box(0, 0, 0, 320, 320, 140, 'c', false);
    const resAll = makePart(new Kit(0, 0, 0, 1, 1), 'site:res', 'res', false);
    const rsz = rb.box3.getSize(new THREE.Vector3());
    resAll.pick = new THREE.Mesh(new THREE.BoxGeometry(rsz.x, rsz.y, rsz.z), new THREE.MeshBasicMaterial({ visible: false }));
    resAll.pick.position.copy(rb.box3.getCenter(new THREE.Vector3()));
    resAll.pick.userData.key = 'site:res';
    resAll.group.add(resAll.pick);
    this.parts.push(resAll); this.scene.add(resAll.group);
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
    this.selColor.set(color && /^#|^rgb/.test(color) ? color : COL.hot);
    this.paint();
  }
  setLive(spots: string[]) { this.live = new Set(spots); }

  /** 색 · 밝기 다시 칠하기 (화면 · 고른 시설이 바뀔 때) */
  private paint() {
    for (const p of this.parts) {
      const on = p.key === this.sel;
      (['a', 'b', 'c', 'g'] as Lv[]).forEach(lv => {
        const m = p.mats[lv] as THREE.LineBasicMaterial;
        m.color.set(on ? this.selColor : COL[lv]);
        if (on && lv === 'c') m.color.multiplyScalar(0.8);
      });
      (p.mats.f as THREE.MeshBasicMaterial).color.set(on ? this.selColor : COL.f);
    }
  }
  private applyFocus() {
    for (const p of this.parts) {
      const f = this.focus[p.cat], on = p.key === this.sel;
      (['a', 'b', 'c', 'g'] as Lv[]).forEach(lv => { p.mats[lv].opacity = Math.min(1, BASE[lv] * f * (on ? 1.6 : 1) + (on ? 0.15 : 0)); });
      p.mats.f.opacity = BASE.f * f * (on ? 6 : 1);
    }
  }

  /* ── 누르기 ── */
  private hitAt(e: PointerEvent): string | null {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), this.camera);
    const want = (k: string) => this.view === 'site' ? k.startsWith('site:')
      : !k.startsWith('site:') && this.live.has(k) && AEGIS_SPOTS[k]?.view === this.view;
    const cands = this.parts.filter(p => p.pick && want(p.key)).map(p => p.pick!);
    const hits = this.ray.intersectObjects(cands, false);
    if (!hits.length) return null;
    return hits[0].object.userData.key as string;
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
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
    this.camera.aspect = w / h;
    // 좁은 화면은 조금 물러선다
    this.camera.zoom = Math.min(1, (w / h) / 1.45 + 0.12);
    this.camera.updateProjectionMatrix();
  }

  private loop = () => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    const raw = this.clock.getDelta(), dt = Math.min(raw, 0.05), time = this.clock.elapsedTime;
    // 카메라 이동
    if (this.fly < 1) {
      this.fly = Math.min(1, this.fly + Math.min(raw, 0.25) / 1.4);
      const e = this.fly < 0.5 ? 4 * this.fly ** 3 : 1 - (-2 * this.fly + 2) ** 3 / 2;
      this.camera.position.lerpVectors(this.flyFrom.pos, this.flyTo.pos, e);
      this.controls.target.lerpVectors(this.flyFrom.tgt, this.flyTo.tgt, e);
    }
    if (this.idle >= 0 && this.view === 'site' && !this.controls.autoRotate) {
      this.idle += dt;
      if (this.idle > 6) this.controls.autoRotate = true;
    }
    // 초점 (다른 구역은 어둡게)
    const goal = FOCUS[this.view];
    (Object.keys(goal) as Cat[]).forEach(c => { this.focus[c] += (goal[c] - this.focus[c]) * Math.min(1, Math.min(raw, 0.25) * 4); });
    this.applyFocus();
    // 흐르는 빛
    const { pts, paths, t, v, who } = this.pulses;
    const pa = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < t.length; i++) {
      t[i] = (t[i] + v[i] * dt + 1) % 1;
      const P = paths[who[i]], d = t[i] * P.total;
      let j = 1; while (j < P.len.length - 1 && P.len[j] < d) j++;
      const a = P.p[j - 1], b = P.p[j], u = (d - P.len[j - 1]) / Math.max(P.len[j] - P.len[j - 1], 1e-6);
      pa.setXYZ(i, a.x + (b.x - a.x) * u, 0.8, a.z + (b.z - a.z) * u);
    }
    pa.needsUpdate = true;
    (pts.material as THREE.PointsMaterial).opacity = 0.35 + 0.6 * this.focus.city;
    this.dust.rotation.y = time * 0.01;
    // 본부를 훑는 고리 · 하늘정원 떠오름
    const sy = ((time * 9) % 140) - 36;
    this.scan.position.y = sy;
    (this.scan.material as THREE.LineBasicMaterial).opacity = 0.75 * this.focus.hq * Math.max(0, 1 - Math.abs(sy - 34) / 90);
    if (this.sky) this.sky.group.position.y = Math.sin(time * 0.8) * 1.2;
    this.controls.update();
    this.composer.render();
    this.placeLabels();
  };

  /** 이름표 자리 — 열쇠(data-k)의 월드 자리를 화면으로 */
  private placeLabels() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    this.labels.querySelectorAll<HTMLElement>('[data-k]').forEach(el => {
      const a = anchorOf(el.dataset.k!);
      if (!a) return;
      const off = el.dataset.k === 'sky' && this.sky ? this.sky.group.position.y : 0;
      this.v3.set(a[0], a[1] + off, a[2]).project(this.camera);
      const vis = this.v3.z < 1 && Math.abs(this.v3.x) < 1.1 && Math.abs(this.v3.y) < 1.1;
      el.style.transform = `translate3d(${((this.v3.x + 1) / 2) * w}px, ${((1 - this.v3.y) / 2) * h}px, 0)`;
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
