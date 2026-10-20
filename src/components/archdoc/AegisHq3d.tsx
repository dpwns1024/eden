/**
 * 지휘본부 입체도 (사용자 요청 — MAP 탭 지휘본부 장을 단면도 대신 홀로그램 축측 입체로).
 * 시설 자리(lib/aegisMap.ts의 AEGIS_SPOTS)는 예전 단면 좌표(가로 0–1000 · 세로 0–1190) 그대로 두고, 여기서 입체로 옮긴다:
 *  단면 가로 x → 건물 너비, 단면 세로 y → 높이(z = 880 − y, 지면 0), 깊이는 D로 새로 준다.
 *  방(사각 칸)은 앞면 유리가 누를 칸이 되고, 옥상 시설(하늘정원 · 코어 탑 · 돔 · 헬기 착륙장)은 입체 꼭짓점의 볼록 껍질이 누를 칸이 된다.
 * 그림은 고정이라 한 번만 만들어 둔다. 색 · 굵기는 archdoc.css의 홀로그램 묶음(.am-h* · .am-hf*).
 */
import React from 'react';
import { AEGIS_SPOTS, type AegisSpot } from '@/lib/aegisMap';

export type Pt = [number, number];
export const pts = (a: Pt[]) => 'M' + a.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L') + ' Z';
export const seg = (a: Pt, b: Pt) => `M${a[0].toFixed(1)} ${a[1].toFixed(1)} L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
const line = (a: Pt[]) => 'M' + a.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L');

/** 볼록 껍질 (monotone chain) */
export function hull(p: Pt[]): Pt[] {
  const a = [...p].sort((u, v) => u[0] - v[0] || u[1] - v[1]);
  const cr = (o: Pt, b: Pt, c: Pt) => (b[0] - o[0]) * (c[1] - o[1]) - (b[1] - o[1]) * (c[0] - o[0]);
  const lo: Pt[] = [], up: Pt[] = [];
  for (const q of a) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of a.reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

/* ───────── 투영 ───────── */
export const HQ3D_H = 1270;
const D = 200;                              // 건물 깊이
const X0 = 110, X1 = 890, UX0 = 150;        // 지상 · 지하 외벽
const zOf = (sy: number) => 880 - sy;
/** 축측 투영 — x는 오른쪽으로 살짝 내려가고, 깊이 y는 앞(왼쪽 아래)으로 온다. 보이는 면 = 윗면 · 앞면(y 큰 쪽) · 오른면(x 큰 쪽) */
export const hP = (x: number, y: number, z: number): Pt => [80 + x * 0.95 - y * 0.46, 806 + x * 0.1 + y * 0.28 - z];

/* ───────── 선 · 면 모으기 — 종류별로 한 path에 담아 DOM을 가볍게 ───────── */
type Lv = 'a' | 'b' | 'c' | 'd' | 'g';
class Ink {
  l: Record<Lv, string[]> = { a: [], b: [], c: [], d: [], g: [] };
  f: Record<'fl' | 'fr' | 'ft' | 'fg', string[]> = { fl: [], fr: [], ft: [], fg: [] };
  hit: Pt[] = [];
  /** 이 모양의 꼭짓점을 누를 칸(볼록 껍질)에 보탤지 */
  grab = false;
  put(lv: Lv, d: string) { this.l[lv].push(d); }
  keep(p: Pt[]) { if (this.grab) this.hit.push(...p); }
}

function box(k: Ink, x: number, y: number, z: number, w: number, d: number, h: number, lv: Lv = 'b') {
  const b = [hP(x, y, z), hP(x + w, y, z), hP(x + w, y + d, z), hP(x, y + d, z)];
  const t = [hP(x, y, z + h), hP(x + w, y, z + h), hP(x + w, y + d, z + h), hP(x, y + d, z + h)];
  k.f.fl.push(pts([b[3], b[2], t[2], t[3]]));
  k.f.fr.push(pts([b[1], b[2], t[2], t[1]]));
  k.f.ft.push(pts(t));
  k.put(lv, `${pts(t)} ${seg(b[1], b[2])} ${seg(b[2], b[3])} ${seg(b[1], t[1])} ${seg(b[2], t[2])} ${seg(b[3], t[3])}`);
  k.put('c', `${seg(b[0], b[1])} ${seg(b[0], b[3])} ${seg(b[0], t[0])}`);
  k.keep([...b, ...t]);
}
/** 수평 타원 둘레 */
const ring = (cx: number, cy: number, z: number, rx: number, ry = rx, n = 28): Pt[] =>
  Array.from({ length: n }, (_, i) => hP(cx + Math.cos((i / n) * Math.PI * 2) * rx, cy + Math.sin((i / n) * Math.PI * 2) * ry, z));
function cyl(k: Ink, cx: number, cy: number, z: number, r: number, h: number, lv: Lv = 'b', ry = r) {
  const lo = ring(cx, cy, z, r, ry), hi = ring(cx, cy, z + h, r, ry);
  let a = 0, b = 0;
  lo.forEach((p, i) => { if (p[0] < lo[a][0]) a = i; if (p[0] > lo[b][0]) b = i; });
  k.f.ft.push(pts(hi));
  k.put(lv, `${pts(hi)} ${seg(lo[a], hi[a])} ${seg(lo[b], hi[b])}`);
  k.put('c', pts(lo));
  k.keep([...lo, ...hi]);
}
function tree(k: Ink, x: number, y: number, z: number, s = 1) {
  k.put('c', seg(hP(x, y, z), hP(x, y, z + 18 * s)));
  k.put('g', `${pts(ring(x, y, z + 24 * s, 16 * s, 16 * s, 16))} ${pts(ring(x, y, z + 34 * s, 11 * s, 11 * s, 14))}`);
  k.f.fg.push(pts(ring(x, y, z + 24 * s, 16 * s, 16 * s, 16)));
  k.keep(ring(x, y, z + 34 * s, 16 * s));
}

/* ───────── 방마다 소품 ───────── */
function props(k: Ink, spot: string, x0: number, x1: number, z: number, h: number) {
  const W = x1 - x0, cx = (x0 + x1) / 2;
  const table = (x: number, y: number) => {
    cyl(k, x, y, z + 14, 13, 2, 'b');
    k.put('c', seg(hP(x, y, z), hP(x, y, z + 14)));
    k.put('c', `${pts(ring(x - 22, y, z + 8, 6, 6, 12))} ${pts(ring(x + 22, y, z + 8, 6, 6, 12))}`);
  };
  switch (spot) {
    case 'lounge':
      box(k, x0 + 16, 12, z, W - 32, 22, 14);
      box(k, x1 - 58, 70, z, 38, 80, 22);
      [48, 112].forEach(dx => { table(x0 + dx, 80); table(x0 + dx + 30, 150); });
      break;
    case 'dining':
      [55, 135].forEach(y => {
        box(k, x0 + 30, y, z + 12, W - 60, 22, 3);
        k.put('c', `${seg(hP(x0 + 36, y + 11, z), hP(x0 + 36, y + 11, z + 12))} ${seg(hP(x1 - 36, y + 11, z), hP(x1 - 36, y + 11, z + 12))}`);
        box(k, x0 + 34, y - 14, z, W - 68, 8, 7, 'c');
        box(k, x0 + 34, y + 28, z, W - 68, 8, 7, 'c');
      });
      break;
    case 'igarden':
      box(k, x0 + 18, 14, z, W - 36, 34, 10);
      [[50, 110, 1.15], [120, 70, 1.4], [190, 125, 1.1], [80, 165, 0.9], [210, 40, 1.2]].forEach(([dx, y, s]) => tree(k, x0 + dx, y, z, s));
      break;
    case 'resonance':
      for (let i = 0; i < 5; i++) {
        const x = x0 + 110 + i * 140;
        cyl(k, x, 80, z, 24, 50, 'b');
        k.put('g', pts(ring(x, 80, z + 30, 26)));
        k.put('d', seg(hP(x, 80, z + 50), hP(x, 80, z + h - 2)));
        box(k, x - 24, 150, z, 48, 18, 14, 'c');
      }
      break;
    case 'hdiv':
    case 'sdiv': {
      const rows = spot === 'sdiv' ? [70, 140] : [55, 130];
      const n = Math.floor((spot === 'sdiv' ? 340 : W - 40) / 72);
      rows.forEach(y => { for (let i = 0; i < n; i++) {
        const x = x0 + 28 + i * 72;
        box(k, x, y, z, 52, 24, 12);
        box(k, x + 12, y + 2, z + 12, 28, 3, 14, 'c');
      } });
      if (spot === 'sdiv') {
        box(k, x0 + 420, 10, z, W - 450, 22, 74);
        const lk: string[] = [];
        for (let x = x0 + 450; x < x1 - 30; x += 30) lk.push(seg(hP(x, 32, z), hP(x, 32, z + 74)));
        k.put('c', lk.join(' '));
        [450, 580].forEach(dx => box(k, x0 + dx, 110, z, 100, 16, 9, 'c'));
      }
      break;
    }
    case 'harmony':
      box(k, x0 + 26, 26, z, 120, 26, 15);
      box(k, x0 + 26, 52, z, 26, 70, 15);
      table(x0 + 110, 105);
      k.put('c', seg(hP(x1 - 40, 40, z), hP(x1 - 40, 40, z + 54)));
      k.put('g', pts(ring(x1 - 40, 40, z + 54, 12)));
      tree(k, x1 - 40, 150, z, 0.8);
      break;
    case 'rst':
      for (let i = 0; i < 4; i++) box(k, x0 + 18 + i * 52, 10, z, 40, 18, 66);
      box(k, x0 + 60, 120, z, 110, 30, 13);
      break;
    case 'medbay':
      for (let i = 0; i < 4; i++) {
        const x = x0 + 30 + i * 82;
        box(k, x, 40, z, 34, 66, 12);
        box(k, x + 4, 42, z + 12, 26, 12, 4, 'c');
        k.put('d', pts([hP(x - 8, 30, z + 50), hP(x + 42, 30, z + 50), hP(x + 42, 116, z + 50), hP(x - 8, 116, z + 50)]));
      }
      k.put('g', `${seg(hP(x1 - 60, 0, z + 52), hP(x1 - 60, 0, z + 76))} ${seg(hP(x1 - 72, 0, z + 64), hP(x1 - 48, 0, z + 64))}`);
      break;
    case 'ward':
      for (let i = 0; i < 6; i++) {
        const x = x0 + 22 + i * 58;
        box(k, x, 18, z, 30, 62, 11);
        k.put('c', pts([hP(x + 42, 6, z), hP(x + 42, 96, z), hP(x + 42, 96, z + 56), hP(x + 42, 6, z + 56)]));
      }
      break;
    case 'stabil':
      cyl(k, cx, 100, z, 40, 56, 'g');
      k.put('d', pts(ring(cx, 100, z, 62)));
      k.put('c', `${pts(ring(cx, 100, z + 28, 41))}`);
      break;
    case 'lobby':
      box(k, cx - 66, 70, z, 132, 24, 16);
      [x0 + 34, x1 - 34].forEach(x => cyl(k, x, 160, z, 8, h - 4, 'b'));
      box(k, cx - 60, D, z + h - 26, 120, 46, 5);
      k.put('c', `${seg(hP(cx - 54, D + 40, z), hP(cx - 54, D + 40, z + h - 26))} ${seg(hP(cx + 54, D + 40, z), hP(cx + 54, D + 40, z + h - 26))}`);
      break;
    case 'mech':
      [70, 145, 220].forEach(dx => cyl(k, x0 + dx, 90, z, 27, 60, 'b'));
      k.put('c', `${line([hP(x0 + 70, 90, z + 66), hP(x0 + 70, 90, z + 76), hP(x0 + 330, 90, z + 76), hP(x0 + 330, 60, z + 76)])} ${seg(hP(x0 + 145, 90, z + 60), hP(x0 + 145, 90, z + 76))} ${seg(hP(x0 + 220, 90, z + 60), hP(x0 + 220, 90, z + 76))}`);
      box(k, x1 - 150, 30, z, 110, 90, 44);
      break;
    case 'aqua': {
      box(k, x0 + 18, 18, z, W - 36, 160, 72, 'g');
      const wv: string[] = [];
      for (let y = 40; y < 178; y += 34) wv.push(line(Array.from({ length: 13 }, (_, i) => hP(x0 + 18 + i * (W - 36) / 12, y + (i % 2 ? 6 : -6), z + 64))));
      k.put('c', wv.join(' '));
      [60, 120, 170].forEach(dx => k.put('c', line([hP(x0 + dx, 100, z), hP(x0 + dx - 6, 100, z + 20), hP(x0 + dx + 4, 100, z + 38), hP(x0 + dx - 2, 100, z + 52)])));
      break;
    }
    case 'armory':
      for (let i = 0; i < 5; i++) {
        const x = x0 + 34 + i * 62;
        box(k, x, 26, z, 10, 120, 74);
        const bl: string[] = [];
        for (let y = 40; y < 140; y += 20) bl.push(seg(hP(x + 12, y, z + 12), hP(x + 12, y, z + 66)));
        k.put('c', bl.join(' '));
      }
      break;
    case 'gate': {
      cyl(k, cx, 100, z, 64, 6, 'b');
      const vr = (r: number) => Array.from({ length: 30 }, (_, i) => hP(cx + Math.cos((i / 30) * Math.PI * 2) * r * 0.7, 100, z + 50 + Math.sin((i / 30) * Math.PI * 2) * r));
      k.put('g', `${pts(vr(42))} ${pts(vr(30))}`);
      k.f.fg.push(pts(vr(30)));
      break;
    }
    case 'arena':
      [40, 72, 96].forEach((r, i) => k.put(i === 1 ? 'g' : 'c', pts(ring(cx, 100, z + 1, r * 1.6, r, 40))));
      [[x0 + 30, 20], [x1 - 30, 20], [x0 + 30, 180], [x1 - 30, 180]].forEach(([x, y]) => cyl(k, x, y, z, 8, h - 4, 'b'));
      break;
  }
}

/* ───────── 칸 · 층 ───────── */
const rectsOf = (cell?: string) => [...(cell ?? '').matchAll(/M(\d+) (\d+)H(\d+)V(\d+)/g)].map(m => ({ x0: +m[1], y0: +m[2], x1: +m[3], y1: +m[4] }));
const BANDS = [
  { tag: '11F', top: 300, bot: 390 }, { tag: '10F', top: 390, bot: 470 }, { tag: '7–9F', top: 470, bot: 580 },
  { tag: '4–6F', top: 580, bot: 690 }, { tag: '2–3F', top: 690, bot: 790 }, { tag: '1F', top: 790, bot: 880 },
  { tag: 'B1', top: 880, bot: 970 }, { tag: 'B2–B4', top: 970, bot: 1070 }, { tag: 'B5', top: 1070, bot: 1160 },
];
const front = (x0: number, x1: number, zb: number, zt: number) => pts([hP(x0, D, zb), hP(x1, D, zb), hP(x1, D, zt), hP(x0, D, zt)]);

/* ───────── 옥상 · 하늘 ───────── */
const RZ = zOf(300), MY = D / 2;
function roof(k: Ink, hits: Record<string, string>) {
  const take = (spot: string, draw: () => void) => { k.grab = true; k.hit = []; draw(); hits[spot] = pts(hull(k.hit)); k.grab = false; };
  // 난간
  k.put('c', pts([hP(X0 + 6, 6, RZ + 10), hP(X1 - 6, 6, RZ + 10), hP(X1 - 6, D - 6, RZ + 10), hP(X0 + 6, D - 6, RZ + 10)]));
  // 돔 — 반구 와이어 (위도 고리 · 경선)
  take('dome', () => {
    const c = { x: 226, y: MY, z: RZ }, r = 92;
    const sp = (th: number, ph: number) => hP(c.x + r * Math.cos(th) * Math.cos(ph), c.y + r * 0.95 * Math.cos(th) * Math.sin(ph), c.z + r * Math.sin(th));
    const lat = [0, 0.45, 0.9, 1.25].map(th => pts(Array.from({ length: 36 }, (_, i) => sp(th, (i / 36) * Math.PI * 2))));
    const mer = Array.from({ length: 8 }, (_, j) => line(Array.from({ length: 13 }, (_, i) => sp((i / 12) * Math.PI, (j / 8) * Math.PI))));
    k.put('b', `${lat[0]} ${mer.join(' ')}`);
    k.put('c', lat.slice(1).join(' '));
    k.f.ft.push(lat[0]);
    k.keep(Array.from({ length: 24 }, (_, i) => sp((i % 6) * 0.3, (Math.floor(i / 6) / 4 + (i % 2) / 8) * Math.PI * 2)).concat(Array.from({ length: 36 }, (_, i) => sp(0, (i / 36) * Math.PI * 2)), [sp(Math.PI / 2, 0)]));
  });
  // 공조기 · 안테나
  box(k, 640, 30, RZ, 46, 34, 16, 'c');
  box(k, 640, 120, RZ, 30, 30, 22, 'c');
  // 코어 탑 — 기둥 · 원반 · 돛대
  take('core', () => {
    cyl(k, 500, MY, RZ, 22, 64, 'a');
    cyl(k, 500, MY, RZ + 64, 30, 8, 'b');
    cyl(k, 500, MY, RZ + 74, 62, 8, 'a', 56);
    k.put('b', `${seg(hP(500, MY, RZ + 82), hP(500, MY, RZ + 118))} ${seg(hP(486, MY, RZ + 104), hP(514, MY, RZ + 104))}`);
    k.keep([hP(500, MY, RZ + 118)]);
  });
  // 헬기 착륙장 — 다리 위 판 · H · 헬기
  take('heli', () => {
    const px = 726, pw = 160;
    box(k, px, 20, RZ + 14, pw, 160, 4, 'b');
    [[px + 10, 30], [px + pw - 10, 30], [px + 10, 170], [px + pw - 10, 170]].forEach(([x, y]) => k.put('c', seg(hP(x, y, RZ), hP(x, y, RZ + 14))));
    k.put('g', pts(ring(806, 100, RZ + 18, 62, 62, 36)));
    k.put('b', `${seg(hP(786, 76, RZ + 18), hP(786, 124, RZ + 18))} ${seg(hP(826, 76, RZ + 18), hP(826, 124, RZ + 18))} ${seg(hP(786, 100, RZ + 18), hP(826, 100, RZ + 18))}`);
    box(k, 786, 140, RZ + 22, 44, 22, 18, 'b');
    k.put('b', `${seg(hP(786, 151, RZ + 32), hP(740, 151, RZ + 36))} ${seg(hP(750, 120, RZ + 44), hP(870, 182, RZ + 44))} ${seg(hP(760, 182, RZ + 44), hP(860, 120, RZ + 44))} ${seg(hP(808, 151, RZ + 40), hP(808, 151, RZ + 44))}`);
  });
  // 하늘정원 — 코어 위에 떠 있는 섬 (뒤집힌 원뿔 바위 · 신전 기둥 · 나무)
  take('sky', () => {
    const top = zOf(60), mid = zOf(100), tip = zOf(146);
    const T = ring(500, MY, top, 126, 92, 40), M = ring(500, MY, mid, 82, 60, 40);
    const P = hP(500, MY, tip);
    k.f.ft.push(pts(T));
    k.put('a', pts(T));
    k.put('b', pts(M));
    k.put('c', [0, 5, 10, 15, 20, 25, 30, 35].map(i => `${seg(T[i], M[i])} ${seg(M[i], P)}`).join(' '));
    let a = 0, b = 0;
    T.forEach((p, i) => { if (p[0] < T[a][0]) a = i; if (p[0] > T[b][0]) b = i; });
    k.put('b', `${seg(T[a], M[a])} ${seg(M[a], P)} ${seg(T[b], M[b])} ${seg(M[b], P)}`);
    k.keep([...T, P]);
    // 신전 — 기둥 고리 + 지붕판 (몇 개는 부서진 기둥)
    const col: string[] = [];
    for (let i = 0; i < 8; i++) {
      const an = (i / 8) * Math.PI * 2, x = 500 + Math.cos(an) * 46, y = MY + Math.sin(an) * 34;
      col.push(seg(hP(x, y, top), hP(x, y, top + (i % 3 === 2 ? 22 : 40))));
    }
    k.put('b', col.join(' '));
    k.put('c', pts(ring(500, MY, top + 40, 52, 40, 32)));
    tree(k, 420, 60, top, 0.9);
    tree(k, 585, 140, top, 1.05);
    tree(k, 560, 40, top, 0.75);
    k.put('d', `${seg(hP(500, MY, RZ + 118), P)}`);
  });
}

/* ───────── 그림 전체 ───────── */
function build() {
  const k = new Ink();
  const hits: Record<string, string> = {};
  const glow: Record<string, string> = {};
  // 땅판 · 해수면
  const G = [hP(40, -60, 0), hP(960, -60, 0), hP(960, D + 70, 0), hP(40, D + 70, 0)];
  k.f.ft.push(pts(G));
  k.put('b', pts(G));
  k.put('c', `${seg(G[1], hP(960, -60, -12))} ${seg(G[2], hP(960, D + 70, -12))} ${seg(G[3], hP(40, D + 70, -12))} ${line([hP(40, D + 70, -12), hP(960, D + 70, -12), hP(960, -60, -12)])}`);
  const gl: string[] = [];
  for (let x = 80; x < 960; x += 40) if (x < X0 || x > X1) gl.push(seg(hP(x, -60, 0), hP(x, D + 70, 0)));
  for (let y = -40; y < D + 70; y += 40) if (y < 0 || y > D) gl.push(seg(hP(40, y, 0), hP(960, y, 0)));
  k.put('c', gl.join(' '));
  const sea = (y: number) => line(Array.from({ length: 22 }, (_, i) => hP(910 + (i % 2 ? 6 : -6), y - 80 + i * 18, -22)));
  k.put('c', [D + 110, D + 150].map(sea).join(' '));
  k.put('d', pts([hP(UX0 - 30, -30, -22), hP(X1 + 30, -30, -22), hP(X1 + 30, D + 30, -22), hP(UX0 - 30, D + 30, -22)]));
  // 지하 외곽 (점선 모서리)
  const ub = zOf(1160);
  k.put('d', [[UX0, 0], [X1, 0], [X1, D], [UX0, D]].map(([x, y]) => seg(hP(x, y, 0), hP(x, y, ub))).join(' '));
  // 층판 · 외벽 · 칸막이 · 유리
  BANDS.forEach(bd => {
    const zb = zOf(bd.bot), zt = zOf(bd.top), xl = bd.bot > 880 ? UX0 : X0;
    const slab = [hP(xl, 0, zb), hP(X1, 0, zb), hP(X1, D, zb), hP(xl, D, zb)];
    k.f.ft.push(pts(slab));
    k.put('a', `${seg(slab[3], slab[2])} ${seg(slab[2], slab[1])}`);
    k.put('c', `${seg(slab[0], slab[1])} ${seg(slab[0], slab[3])}`);
    k.f.fl.push(pts([hP(xl, 0, zb), hP(X1, 0, zb), hP(X1, 0, zt), hP(xl, 0, zt)]));
    k.f.fr.push(pts([hP(X1, 0, zb), hP(X1, D, zb), hP(X1, D, zt), hP(X1, 0, zt)]));
    const mu: string[] = [];
    for (let y = 25; y < D; y += 25) mu.push(seg(hP(X1, y, zb), hP(X1, y, zt)));
    for (let x = xl + 39; x < X1; x += 39) mu.push(seg(hP(x, D, zb + 4), hP(x, D, zb + 14)));
    k.put('c', mu.join(' '));
    // 칸막이 — 같은 층 칸 사이
    const xs = Object.values(AEGIS_SPOTS).flatMap(s => rectsOf(s.cell)).filter(r => r.y0 > bd.top && r.y1 < bd.bot).sort((a, b) => a.x0 - b.x0);
    for (let i = 1; i < xs.length; i++) {
      const wx = (xs[i - 1].x1 + xs[i].x0) / 2;
      if (xs[i].x0 - xs[i - 1].x1 > 30) continue;
      k.f.fl.push(pts([hP(wx, 0, zb), hP(wx, D, zb), hP(wx, D, zt), hP(wx, 0, zt)]));
      k.put('c', `${seg(hP(wx, D, zb), hP(wx, D, zt))} ${seg(hP(wx, 0, zt), hP(wx, D, zt))}`);
    }
  });
  // 지붕판 · 건물 모서리
  const R = [hP(X0, 0, RZ), hP(X1, 0, RZ), hP(X1, D, RZ), hP(X0, D, RZ)];
  k.f.ft.push(pts(R));
  k.put('a', `${pts(R)} ${[[X0, D], [X1, D], [X1, 0]].map(([x, y]) => seg(hP(x, y, 0), hP(x, y, RZ))).join(' ')}`);
  k.put('c', seg(hP(X0, 0, 0), hP(X0, 0, RZ)));
  // 외부 비상계단 (7–9F 오른쪽)
  const st: string[] = [];
  for (let z = zOf(580); z < zOf(470); z += 18) st.push(seg(hP(X1, 150, z), hP(X1 + 44, 150, z + 9)), seg(hP(X1 + 44, 150, z + 9), hP(X1, 180, z + 18)));
  k.put('c', st.join(' '));
  // 방 소품 · 누를 칸
  for (const [spot, s] of Object.entries(AEGIS_SPOTS)) {
    if (s.view !== 'hq') continue;
    const rs = rectsOf(s.cell);
    if (!rs.length) continue;
    hits[spot] = rs.map(r => front(r.x0, r.x1, zOf(r.y1), zOf(r.y0))).join(' ');
    glow[spot] = rs.map(r => {
      const zb = zOf(r.y1), zt = zOf(r.y0);
      return `${pts([hP(r.x0, 0, zb), hP(r.x1, 0, zb), hP(r.x1, D, zb), hP(r.x0, D, zb)])} ${pts([hP(r.x0, 0, zb), hP(r.x1, 0, zb), hP(r.x1, 0, zt), hP(r.x0, 0, zt)])}`;
    }).join(' ');
    rs.forEach(r => props(k, spot, r.x0, r.x1, zOf(r.y1), zOf(r.y0) - zOf(r.y1)));
  }
  roof(k, hits);
  // 층 이름표 — 건물 왼쪽 앞
  const tags = [{ t: 'ROOF', z: RZ + 14 }, ...BANDS.map(b => ({ t: b.tag, z: (zOf(b.top) + zOf(b.bot)) / 2 }))].map(({ t, z }) => {
    const [x, y] = hP(z < 0 ? UX0 : X0, D, z);
    return { t, x: x - 34, y };
  });
  return { k, hits, glow, tags };
}
const ART = build();

/** 본부 자리 — 예전 단면 좌표의 표시 자리를 입체 앞면(옥상 시설은 건물 깊이 가운데)으로 옮기고, 누를 칸은 입체 칸으로 */
export const HQ_SPOTS: Record<string, AegisSpot> = Object.fromEntries(Object.entries(AEGIS_SPOTS).filter(([, s]) => s.view === 'hq').map(([key, s]) => {
  const y = s.ly < 300 ? MY : D;
  const [lx, ly] = hP(s.lx, y, zOf(s.ly));
  const two = s.lx2 !== undefined ? hP(s.lx2, y, zOf(s.ly2 ?? s.ly)) : null;
  return [key, { ...s, lx, ly, ...(two ? { lx2: two[0], ly2: two[1] } : {}), cell: ART.hits[key] ?? s.cell }];
}));
/** 고른 방의 바닥 · 뒷벽 — 고르면 빛난다 */
export const HQ_GLOW = ART.glow;

export function HqArt3d() {
  const { k, tags } = ART;
  return (
    <g className="am-model hq">
      <rect x="0" y="0" width="1000" height={HQ3D_H} fill="url(#amSea)" opacity=".35" />
      <path className="am-hf l" d={k.f.fl.join(' ')} />
      <path className="am-hf r" d={k.f.fr.join(' ')} />
      <path className="am-hf t" d={k.f.ft.join(' ')} />
      <path className="am-hf g" d={k.f.fg.join(' ')} />
      <path className="am-h3" d={k.l.c.join(' ')} />
      <path className="am-h3 dash" d={k.l.d.join(' ')} />
      <path className="am-h2" d={k.l.b.join(' ')} />
      <path className="am-hacc" d={k.l.g.join(' ')} />
      <path className="am-h1" d={k.l.a.join(' ')} />
      {tags.map(t => (
        <g key={t.t} transform={`translate(${t.x.toFixed(1)} ${t.y.toFixed(1)})`}>
          <rect className="am-tagb" x={-t.t.length * 4.6 - 6} y="-10" width={t.t.length * 9.2 + 12} height="20" rx="2" />
          <text className="am-pt" textAnchor="middle" dy=".35em">{t.t}</text>
        </g>
      ))}
      <text className="am-tg2" x={hP(40, D + 70, 0)[0] + 6} y={hP(40, D + 70, 0)[1] + 22}>GROUND</text>
      <text className="am-tg2" x={hP(960, D + 150, -22)[0] - 10} y={hP(960, D + 150, -22)[1] + 24} textAnchor="end">SEA</text>
    </g>
  );
}
