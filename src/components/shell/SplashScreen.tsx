'use client';
import React, { Component, useEffect, useRef, useState } from 'react';
import { getSplashConf, splashSeenThisSession, markSplashSeen } from '@/lib/splashStore';
import { useBlobUrl } from '@/lib/blobStore';

const ZOOM = 1.8;
const T_CRACK = 0.22;
const T_HOLD = 0.55;
const T_FLY = 1.7;

type Pt = { x: number; y: number };

export function coverRect(vw: number, vh: number, iw: number, ih: number) {
  const s = Math.max(vw / iw, vh / ih);
  const dw = iw * s, dh = ih * s;
  return { ox: (vw - dw) / 2, oy: (vh - dh) / 2, dw, dh };
}

class SplashBoundary extends Component<{ children: React.ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? null : this.props.children; }
}

function Reticle({ hot }: { hot: boolean }) {
  const c = hot ? '#ff3b30' : '#0d0d0d';
  const ticks: React.ReactNode[] = [];
  for (let i = 1; i <= 5; i++) {
    const p = i * 9;
    ticks.push(
      <line key={`r${i}`} x1={p} y1={-2} x2={p} y2={2} />,
      <line key={`l${i}`} x1={-p} y1={-2} x2={-p} y2={2} />,
      <line key={`t${i}`} x1={-2} y1={-p} x2={2} y2={-p} />,
      <line key={`d${i}`} x1={-(2.4 + i * 1.5)} y1={p} x2={2.4 + i * 1.5} y2={p} />,
    );
  }
  return (
    <svg viewBox="-100 -100 200 200" className="sp-reticle" aria-hidden>
      <g stroke="#0b0b0b" strokeWidth="5">
        <line x1="0" y1="-100" x2="0" y2="-56" />
        <line x1="0" y1="100" x2="0" y2="56" />
        <line x1="-100" y1="0" x2="-56" y2="0" />
        <line x1="100" y1="0" x2="56" y2="0" />
      </g>
      <g stroke={c} strokeWidth="0.7">
        <line x1="0" y1="-56" x2="0" y2="56" />
        <line x1="-56" y1="0" x2="56" y2="0" />
        {ticks}
      </g>
      <g fill={c} fontSize="4.6" fontFamily="ui-monospace,monospace" textAnchor="middle">
        <text x="18" y="8">2</text><text x="36" y="8">4</text>
        <text x="-9" y="19.5">2</text><text x="-9" y="37.5">4</text>
      </g>
      {hot && <circle r="1.5" fill="#ff3b30" />}
      {hot && <circle r="8" fill="none" stroke="#ff3b30" strokeWidth="0.6" className="sp-lock" />}
    </svg>
  );
}

/* ───────── 3D 유리 파쇄 엔진 (canvas) ───────── */
function runShatter(canvas: HTMLCanvasElement, img: HTMLImageElement, at: Pt, done: () => void) {
  const W = window.innerWidth, H = window.innerHeight;
  const small = Math.min(W, H) < 700;
  const u = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
  const Wd = Math.round(W * u), Hd = Math.round(H * u);
  canvas.width = Wd; canvas.height = Hd;
  const ctx = canvas.getContext('2d');
  if (!ctx) { done(); return () => {}; }

  const src = document.createElement('canvas');
  src.width = Wd; src.height = Hd;
  const cv = coverRect(W, H, img.naturalWidth, img.naturalHeight);
  src.getContext('2d')!.drawImage(img, cv.ox * u, cv.oy * u, cv.dw * u, cv.dh * u);

  const rnd = (a: number, b: number) => a + Math.random() * (b - a);
  const I = { x: at.x * u, y: at.y * u };
  const diag = Math.hypot(Wd, Hd);
  const maxR = Math.max(
    Math.hypot(I.x, I.y), Math.hypot(Wd - I.x, I.y),
    Math.hypot(I.x, Hd - I.y), Math.hypot(Wd - I.x, Hd - I.y),
  ) * 1.08;

  // 방사형 균열 + 동심 균열 격자
  const NR = small ? 15 : 21;
  const step = (Math.PI * 2) / NR;
  const a0 = rnd(0, step);
  const ang = Array.from({ length: NR }, (_, i) => a0 + i * step + rnd(-0.38, 0.38) * step);
  const K = small ? 9 : 11;
  const r0 = 11 * u;
  const g = Math.pow(maxR / r0, 1 / (K - 1));
  const V: Pt[][] = Array.from({ length: K }, (_, k) => ang.map(a => {
    const r = r0 * Math.pow(g, k) * (k === K - 1 ? 1 : rnd(0.86, 1.14));
    const aa = a + rnd(-0.045, 0.045);
    return { x: I.x + Math.cos(aa) * r, y: I.y + Math.sin(aa) * r };
  }));

  type Edge = { a: Pt; b: Pt; d: number; cat: 0 | 1 | 2 };
  const edges: Edge[] = [];
  const addEdge = (a: Pt, b: Pt, cat: 0 | 1 | 2) => {
    if (Math.max(a.x, b.x) < 0 || Math.max(a.y, b.y) < 0 || Math.min(a.x, b.x) > Wd || Math.min(a.y, b.y) > Hd) return;
    edges.push({ a, b, cat, d: Math.min(Math.hypot(a.x - I.x, a.y - I.y), Math.hypot(b.x - I.x, b.y - I.y)) });
  };
  const tris: Pt[][] = [];
  for (let i = 0; i < NR; i++) {
    const j = (i + 1) % NR;
    tris.push([I, V[0][i], V[0][j]]);
    addEdge(I, V[0][i], 0);
  }
  for (let k = 0; k < K; k++) for (let i = 0; i < NR; i++) {
    const j = (i + 1) % NR;
    if (k < 4 && Math.random() < 0.75 - k * 0.15) addEdge(V[k][i], V[k][j], 1);
    if (k < K - 1) addEdge(V[k][i], V[k + 1][i], 0);
  }
  for (let k = 0; k < K - 1; k++) for (let i = 0; i < NR; i++) {
    const j = (i + 1) % NR;
    const a = V[k][i], b = V[k][j], c = V[k + 1][j], d = V[k + 1][i];
    if (k >= K - 4) {
      const s = rnd(0.3, 0.7), t = rnd(0.3, 0.7);
      const p = {
        x: (a.x * (1 - s) + b.x * s) * (1 - t) + (d.x * (1 - s) + c.x * s) * t,
        y: (a.y * (1 - s) + b.y * s) * (1 - t) + (d.y * (1 - s) + c.y * s) * t,
      };
      tris.push([a, b, p], [b, c, p], [c, d, p], [d, a, p]);
    } else if (Math.random() < 0.5) {
      tris.push([a, b, c], [a, c, d]);
    } else {
      tris.push([a, b, d], [b, c, d]);
    }
  }

  type Shard = {
    s: Pt[]; c: Pt; loc: Pt[]; bx: number; by: number; bw: number; bh: number;
    dir: Pt; pw: number; q: number; facet: number; open: number;
    vx: number; vy: number; vz: number; wx: number; wy: number; wz: number;
    hx: number; hy: number; hz: number; delay: number; z: number;
  };
  const shards: Shard[] = [];
  for (const t of tris) {
    const minx = Math.min(t[0].x, t[1].x, t[2].x), maxx = Math.max(t[0].x, t[1].x, t[2].x);
    const miny = Math.min(t[0].y, t[1].y, t[2].y), maxy = Math.max(t[0].y, t[1].y, t[2].y);
    if (maxx < 0 || maxy < 0 || minx > Wd || miny > Hd) continue;
    const bx = Math.max(0, Math.floor(minx)), by = Math.max(0, Math.floor(miny));
    const bw = Math.min(Wd, Math.ceil(maxx)) - bx, bh = Math.min(Hd, Math.ceil(maxy)) - by;
    if (bw < 1 || bh < 1) continue;
    const c = { x: (t[0].x + t[1].x + t[2].x) / 3, y: (t[0].y + t[1].y + t[2].y) / 3 };
    const dist = Math.hypot(c.x - I.x, c.y - I.y) || 1;
    const dir = { x: (c.x - I.x) / dist, y: (c.y - I.y) / dist };
    const pw = Math.exp(-dist / (0.32 * diag));
    const speed = (160 + 1050 * pw) * rnd(0.7, 1.3) * u;
    const away = Math.random() < 0.18;
    shards.push({
      s: t, c, loc: t.map(p => ({ x: p.x - c.x, y: p.y - c.y })), bx, by, bw, bh, dir, pw,
      q: (c.x + c.y) / (Wd + Hd),
      facet: rnd(0, 0.08),
      open: (1.2 + 5 * pw) * u * rnd(0.6, 1.3),
      vx: dir.x * speed, vy: dir.y * speed - rnd(0, 260) * u,
      vz: away ? rnd(100, 380) * u : -(110 + 1050 * pw) * rnd(0.6, 1.4) * u,
      wx: rnd(-1, 1) * (1.5 + 7 * pw), wy: rnd(-1, 1) * (1.5 + 7 * pw), wz: rnd(-1, 1) * (0.6 + 3.5 * pw),
      hx: rnd(-0.06, 0.06), hy: rnd(-0.06, 0.06), hz: rnd(-0.03, 0.03),
      delay: (dist / maxR) * 0.16 + rnd(0, 0.04),
      z: 0,
    });
  }

  // 탄흔 — 검은 구멍 + 가루처럼 부서진 유리
  const hole = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2, r = rnd(6, 11) * u;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  });
  const specks = Array.from({ length: 80 }, () => {
    const a = rnd(0, Math.PI * 2), r = (9 + Math.pow(Math.random(), 1.6) * 34) * u;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r, s: rnd(0.8, 3.2) * u, rot: rnd(0, 6.3), al: rnd(0.35, 1) };
  });

  // 유리 가루 파티클
  const NP = small ? 90 : 170;
  const parts = Array.from({ length: NP }, (_, n) => {
    const burst = n < NP * 0.6;
    const o = burst || !shards.length ? I : shards[Math.floor(Math.random() * shards.length)].c;
    const a = rnd(0, Math.PI * 2), sp = rnd(150, burst ? 1400 : 700) * u;
    return {
      t0: burst ? rnd(0, 0.03) : T_CRACK + T_HOLD + rnd(0, 0.15),
      x: o.x, y: o.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rnd(0, 300) * u,
      vz: -rnd(80, 1500) * u, size: rnd(1.2, burst ? 4.5 : 7) * u,
      rot: rnd(0, 6.3), wr: rnd(-14, 14), life: rnd(0.7, 1.6),
      sh: [rnd(0, 2), rnd(2, 4), rnd(4, 6.2)],
    };
  });

  const F = 900 * u;
  const G = 1500 * u;
  const cx0 = Wd / 2, cy0 = Hd / 2;
  const Lx = -0.45, Ly = -0.75, Lz = -1;
  const Ll = Math.hypot(Lx, Ly, Lz);
  let Hx = Lx / Ll, Hy = Ly / Ll, Hz = Lz / Ll - 1;
  const Hl = Math.hypot(Hx, Hy, Hz); Hx /= Hl; Hy /= Hl; Hz /= Hl;
  const tE = T_CRACK + T_HOLD;
  const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

  const affine = (s: Pt[], d: Pt[]) => {
    const x1 = s[1].x - s[0].x, y1 = s[1].y - s[0].y, x2 = s[2].x - s[0].x, y2 = s[2].y - s[0].y;
    const det = x1 * y2 - x2 * y1;
    if (Math.abs(det) < 1e-6) return null;
    const u1 = d[1].x - d[0].x, v1 = d[1].y - d[0].y, u2 = d[2].x - d[0].x, v2 = d[2].y - d[0].y;
    const a = (u1 * y2 - u2 * y1) / det, c = (u2 * x1 - u1 * x2) / det;
    const b = (v1 * y2 - v2 * y1) / det, dd = (v2 * x1 - v1 * x2) / det;
    return [a, b, c, dd, d[0].x - a * s[0].x - c * s[0].y, d[0].y - b * s[0].x - dd * s[0].y] as const;
  };

  let cam = { sc: 1, sx: 0, sy: 0 };
  const camPt = (x: number, y: number) => ({ x: I.x + (x - I.x) * cam.sc + cam.sx, y: I.y + (y - I.y) * cam.sc + cam.sy });
  const setCam = () => ctx.setTransform(cam.sc, 0, 0, cam.sc, I.x * (1 - cam.sc) + cam.sx, I.y * (1 - cam.sc) + cam.sy);

  const drawCracks = (R: number, alpha = 1) => {
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const e of edges) if (e.d < R) { ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y); }
    ctx.strokeStyle = `rgba(0,0,0,${0.55 * alpha})`; ctx.lineWidth = 2.4 * u; ctx.stroke();
    const al = [0.92, 0.55, 0.4], lw = [1.25, 0.85, 0.7];
    for (let cat = 0; cat < 3; cat++) {
      ctx.beginPath();
      for (const e of edges) if (e.cat === cat && e.d < R) { ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y); }
      ctx.strokeStyle = `rgba(255,255,255,${al[cat] * alpha})`; ctx.lineWidth = lw[cat] * u;
      if (cat === 0) { ctx.shadowColor = 'rgba(255,255,255,.8)'; ctx.shadowBlur = 5 * u; }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  };

  const drawHole = (alpha: number) => {
    setCam();
    ctx.globalAlpha = alpha;
    const haze = ctx.createRadialGradient(I.x, I.y, 0, I.x, I.y, 48 * u);
    haze.addColorStop(0, 'rgba(255,255,255,.22)'); haze.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = haze; ctx.fillRect(I.x - 48 * u, I.y - 48 * u, 96 * u, 96 * u);
    ctx.fillStyle = '#fff';
    for (const p of specks) {
      ctx.globalAlpha = alpha * p.al;
      ctx.beginPath();
      for (let v = 0; v < 3; v++) {
        const a = p.rot + v * 2.1;
        const x = I.x + p.x + Math.cos(a) * p.s, y = I.y + p.y + Math.sin(a) * p.s;
        if (v) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.fill();
    }
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    hole.forEach((p, i) => (i ? ctx.lineTo(I.x + p.x, I.y + p.y) : ctx.moveTo(I.x + p.x, I.y + p.y)));
    ctx.closePath(); ctx.fillStyle = '#000'; ctx.fill();
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  };

  const drawShard = (sh: Shard, X: number, Y: number, Z: number, rx: number, ry: number, rz: number,
    dark: number, glow: number, edgeA: number, alpha: number) => {
    if (F + Z < 0.12 * F || alpha <= 0.01) return;
    const ca = Math.cos(rx), sa = Math.sin(rx), cb = Math.cos(ry), sb = Math.sin(ry), cc = Math.cos(rz), sc = Math.sin(rz);
    const d: Pt[] = [];
    let offscreen = true;
    for (const v of sh.loc) {
      const y1 = v.y * ca, z1 = v.y * sa;
      const x2 = v.x * cb + z1 * sb, z2 = -v.x * sb + z1 * cb;
      const x3 = x2 * cc - y1 * sc, y3 = x2 * sc + y1 * cc;
      const k = F / (F + Z + z2);
      const p = camPt(cx0 + (X + x3 - cx0) * k, cy0 + (Y + y3 - cy0) * k);
      if (p.x > -50 && p.y > -50 && p.x < Wd + 50 && p.y < Hd + 50) offscreen = false;
      d.push(p);
    }
    if (offscreen) return;
    const A = affine(sh.s, d);
    if (!A) return;
    const nx = -ca * sb * cc - sa * sc, ny = -ca * sb * sc + sa * cc, nz = -ca * cb;
    const spec = Math.pow(Math.abs(nx * Hx + ny * Hy + nz * Hz), 60);
    const face = Math.abs(nz);

    ctx.save();
    ctx.globalAlpha = alpha;
    if (Z < -0.45 * F) ctx.filter = `blur(${Math.min(7, (-Z / F - 0.45) * 22) * u}px)`;
    ctx.setTransform(A[0], A[1], A[2], A[3], A[4], A[5]);
    ctx.beginPath();
    ctx.moveTo(sh.s[0].x, sh.s[0].y); ctx.lineTo(sh.s[1].x, sh.s[1].y); ctx.lineTo(sh.s[2].x, sh.s[2].y);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(src, sh.bx, sh.by, sh.bw, sh.bh, sh.bx, sh.by, sh.bw, sh.bh);
    const shade = Math.min(0.8, dark + (1 - face) * 0.3);
    if (shade > 0.01) { ctx.fillStyle = `rgba(0,0,0,${shade})`; ctx.fillRect(sh.bx, sh.by, sh.bw, sh.bh); }
    const wht = Math.min(0.6, sh.facet + glow + spec * 0.38);
    if (wht > 0.01) { ctx.fillStyle = `rgba(255,255,255,${wht})`; ctx.fillRect(sh.bx, sh.by, sh.bw, sh.bh); }
    ctx.restore();

    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(d[0].x, d[0].y); ctx.lineTo(d[1].x, d[1].y); ctx.lineTo(d[2].x, d[2].y);
    ctx.closePath();
    ctx.strokeStyle = `rgba(255,255,255,${Math.min(1, edgeA + spec)})`;
    ctx.lineWidth = (1 + spec * 1.2) * u;
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  const start = performance.now();
  let raf = 0;
  const frame = () => {
    const t = (performance.now() - start) / 1000;
    if (t >= tE + T_FLY) { done(); return; }

    const shakeA = t < 0.45 ? 14 * u * Math.pow(1 - t / 0.45, 2)
      : t > tE && t < tE + 0.25 ? 7 * u * Math.pow(1 - (t - tE) / 0.25, 2) : 0;
    cam = {
      sc: 1 + 0.03 * Math.pow(Math.max(0, 1 - t / 0.35), 2),
      sx: rnd(-1, 1) * shakeA, sy: rnd(-1, 1) * shakeA,
    };

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, Wd, Hd);
    const back = t < tE ? 1 : 0;
    if (back > 0) { ctx.fillStyle = `rgba(0,0,0,${back})`; ctx.fillRect(0, 0, Wd, Hd); }

    if (t < T_CRACK) {
      setCam();
      ctx.drawImage(src, 0, 0);
      drawCracks(maxR * ease(t / T_CRACK));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      drawHole(Math.min(1, t / 0.03));
    } else if (t < tE) {
      const th = (t - T_CRACK) / T_HOLD, e = ease(th);
      const sweep = -0.25 + 1.5 * th;
      for (const sh of shards) {
        const boost = Math.exp(-Math.pow((sh.q - sweep) / 0.07, 2));
        drawShard(sh, sh.c.x + sh.dir.x * sh.open * e, sh.c.y + sh.dir.y * sh.open * e, -(3 + 16 * sh.pw) * u * e,
          sh.hx * e, sh.hy * e, sh.hz * e, 0, boost * 0.18, 0.75 * boost, 1);
      }
      setCam();
      drawCracks(maxR);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      drawHole(1);
    } else {
      for (const sh of shards) sh.z = sh.vz * Math.max(0, t - tE - sh.delay);
      const order = [...shards].sort((a, b) => b.z - a.z);
      for (const sh of order) {
        const te = Math.max(0, t - tE - sh.delay);
        const Z = -(3 + 16 * sh.pw) * u + sh.z;
        const near = Z < -0.6 * F ? Math.max(0, (Z + 0.88 * F) / (0.28 * F)) : 1;
        const fade = te > 1.15 ? Math.max(0, 1 - (te - 1.15) / 0.45) : 1;
        drawShard(sh,
          sh.c.x + sh.dir.x * sh.open + sh.vx * te,
          sh.c.y + sh.dir.y * sh.open + sh.vy * te + 0.5 * G * te * te,
          Z, sh.hx + sh.wx * te, sh.hy + sh.wy * te, sh.hz + sh.wz * te,
          Math.min(0.7, te * 0.75), 0.04, 0.7, near * fade);
      }
      if (t < tE + 0.06) drawHole(1 - (t - tE) / 0.06);
    }

    ctx.fillStyle = '#fff';
    for (const p of parts) {
      const te = t - p.t0;
      if (te < 0 || te > p.life) continue;
      const Z = p.vz * te;
      if (F + Z < 0.15 * F) continue;
      const k = F / (F + Z);
      const pt = camPt(cx0 + (p.x + p.vx * te - cx0) * k, cy0 + (p.y + p.vy * te + 0.5 * G * te * te - cy0) * k);
      const r = p.rot + p.wr * te;
      ctx.globalAlpha = (1 - te / p.life) * (0.4 + 0.6 * Math.pow(Math.abs(Math.sin(r)), 6));
      ctx.beginPath();
      for (let v = 0; v < 3; v++) {
        const a = r + p.sh[v];
        const x = pt.x + Math.cos(a) * p.size * k, y = pt.y + Math.sin(a) * p.size * k;
        if (v) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (t < 0.18) {
      const p = camPt(I.x, I.y);
      const gl = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 280 * u);
      gl.addColorStop(0, `rgba(255,255,255,${0.9 * (1 - t / 0.18)})`);
      gl.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gl; ctx.fillRect(0, 0, Wd, Hd);
    }
    if (t < 0.07) { ctx.fillStyle = `rgba(255,255,255,${0.85 * (1 - t / 0.07)})`; ctx.fillRect(0, 0, Wd, Hd); }

    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}

/* ───────── 스코프 화면 ───────── */
export function SplashView({ bgUrl, targetX, targetY, targetSize, label, onFire, onDone }: {
  bgUrl: string; targetX: number; targetY: number; targetSize: number; label?: string;
  onFire?: () => void; onDone: () => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [vp, setVp] = useState({ w: 0, h: 0 });
  const [pos, setPos] = useState<Pt | null>(null);
  const [touch, setTouch] = useState(false);
  const [impact, setImpact] = useState<Pt | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const im = new Image();
    im.onload = () => setImg(im);
    im.src = bgUrl;
    return () => { im.onload = null; };
  }, [bgUrl]);

  useEffect(() => {
    const f = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    f();
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);

  useEffect(() => {
    if (!impact || !img || !canvasRef.current) return;
    return runShatter(canvasRef.current, img, impact, () => doneRef.current());
  }, [impact, img]);

  if (!img || !vp.w) return <div className="splash-overlay" />;

  const cv = coverRect(vp.w, vp.h, img.naturalWidth, img.naturalHeight);
  const target = { x: cv.ox + (targetX / 100) * cv.dw, y: cv.oy + (targetY / 100) * cv.dh };
  const hitR = Math.max(22, targetSize / 2);
  const aim = pos ?? { x: vp.w / 2, y: vp.h / 2 };
  const isHit = (p: Pt) => Math.hypot(p.x - target.x, p.y - target.y) <= hitR;
  const hit = isHit(aim);
  const R = Math.round(Math.min(170, Math.max(110, Math.min(vp.w, vp.h) * 0.27)));

  const track = (e: React.PointerEvent) => {
    if (impact) return;
    setTouch(e.pointerType !== 'mouse');
    setPos({ x: e.clientX, y: e.clientY });
  };

  return (
    <div
      className={`splash-overlay ${impact ? 'is-shatter' : ''}`}
      style={{ cursor: impact ? 'default' : 'none' }}
      onPointerMove={track}
      onPointerDown={track}
      onPointerUp={e => {
        if (impact) return;
        const p = { x: e.clientX, y: e.clientY };
        setPos(p);
        if (isHit(p)) { setImpact(p); onFire?.(); }
      }}
    >
      {!impact && (
        <>
          <div
            className="sp-lens"
            style={{
              left: aim.x - R, top: aim.y - R, width: R * 2, height: R * 2,
              backgroundImage: `url("${bgUrl}")`,
              backgroundSize: `${cv.dw * ZOOM}px ${cv.dh * ZOOM}px`,
              backgroundPosition: `${R - (aim.x - cv.ox) * ZOOM}px ${R - (aim.y - cv.oy) * ZOOM}px`,
            }}
          >
            <Reticle hot={hit} />
          </div>
          <div className={`sp-hud ${hit ? 'hot' : ''}`}>
            {hit
              ? <><b>TARGET LOCKED</b><span>{touch ? 'RELEASE TO FIRE' : 'CLICK TO FIRE'}</span></>
              : <span>{label || 'FIND THE TARGET'}</span>}
          </div>
        </>
      )}
      {impact && <canvas ref={canvasRef} className="sp-canvas" />}
    </div>
  );
}

function SplashInner() {
  const conf = getSplashConf();
  const bgUrl = useBlobUrl(conf.bgBlobId);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (conf.enabled && conf.bgBlobId && !splashSeenThisSession()) {
      setShow(true);
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [conf.enabled, conf.bgBlobId]);

  if (!show || !bgUrl) return null;
  return (
    <SplashView
      bgUrl={bgUrl}
      targetX={conf.targetX}
      targetY={conf.targetY}
      targetSize={conf.targetSize}
      label={conf.targetLabel}
      onFire={markSplashSeen}
      onDone={() => { setShow(false); document.body.style.overflow = ''; }}
    />
  );
}

export function SplashScreen() {
  return <SplashBoundary><SplashInner /></SplashBoundary>;
}
