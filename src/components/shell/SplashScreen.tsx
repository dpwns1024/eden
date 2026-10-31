'use client';
import React, { Component, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getSplashConf, splashSeenThisSession, markSplashSeen } from '@/lib/splashStore';
import { useBlobUrl } from '@/lib/blobStore';
import { ARCH_FONTS } from '@/lib/archFonts';

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

type Profile = { name: string; sub: string; rows: [string, string][] };

// 표적 거리 — 수십 미터 이내 (24~54m, 조준 높이에 따라 변함)
const rangeM = (aim: Pt, vp: { h: number }) => Math.round(24 + (aim.y / vp.h) * 30);

function Reticle({ hot }: { hot: boolean }) {
  const c = hot ? '#ff3b30' : '#0b1016';
  const marks: React.ReactNode[] = [];
  for (let i = 1; i <= 11; i++) {
    const p = i * 5, L = i % 2 === 0 ? 2.8 : 1.6;
    marks.push(
      <line key={`r${i}`} x1={p} y1={-L} x2={p} y2={L} />,
      <line key={`l${i}`} x1={-p} y1={-L} x2={-p} y2={L} />,
      <line key={`t${i}`} x1={-L} y1={-p} x2={L} y2={-p} />,
      <line key={`b${i}`} x1={-L} y1={p} x2={L} y2={p} />,
    );
  }
  const tree: React.ReactNode[] = [];
  [10, 20, 30, 40].forEach((y, k) => {
    for (let j = -(k + 1); j <= k + 1; j++) if (j) tree.push(<circle key={`d${y}_${j}`} cx={j * 5} cy={y} r={0.6} />);
  });
  return (
    <svg viewBox="-100 -100 200 200" className="sp-reticle" aria-hidden>
      <g stroke="#0b1016" strokeWidth="2.6">
        <line x1="0" y1="-100" x2="0" y2="-60" /><line x1="0" y1="100" x2="0" y2="60" />
        <line x1="-100" y1="0" x2="-60" y2="0" /><line x1="100" y1="0" x2="60" y2="0" />
      </g>
      <g stroke={c} strokeWidth="0.45" fill="none">
        <line x1="-60" y1="0" x2="-1.8" y2="0" /><line x1="1.8" y1="0" x2="60" y2="0" />
        <line x1="0" y1="-60" x2="0" y2="-1.8" /><line x1="0" y1="1.8" x2="0" y2="60" />
        {marks}
      </g>
      <g fill={c}>{tree}</g>
      <g fill={c} fontSize="3.4" fontFamily="'JetBrains Mono',ui-monospace,monospace" textAnchor="middle">
        {[2, 4, 6, 8].map(n => <text key={`nx${n}`} x={n * 5} y={6.6}>{n}</text>)}
        {[2, 4, 6, 8].map(n => <text key={`ny${n}`} x={-5.5} y={-n * 5 + 1.2}>{n}</text>)}
      </g>
      <circle r="0.85" fill={c} />
      {hot && <rect x="-6" y="-6" width="12" height="12" fill="none" stroke="#ff3b30" strokeWidth="0.5" className="sp-lock" />}
    </svg>
  );
}

function ScopeHud({ aim, R, hot, vp }: { aim: Pt; R: number; hot: boolean; vp: { w: number; h: number } }) {
  const S = (R + 130) * 2;
  const az = ((aim.x / vp.w) * 360).toFixed(1);
  const rng = rangeM(aim, vp);
  const elv = ((0.5 - aim.y / vp.h) * 2).toFixed(1);
  const fan: React.ReactNode[] = [];
  for (let i = 0; i <= 30; i++) {
    const a = ((-118 + i * 3) * Math.PI) / 180;
    const r1 = R + 36, r2 = R + (i % 5 === 0 ? 50 : 42);
    fan.push(<line key={i} x1={Math.cos(a) * r1} y1={Math.sin(a) * r1} x2={Math.cos(a) * r2} y2={Math.sin(a) * r2} />);
  }
  const tri = hot ? R + 14 : R + 56;
  return (
    <div className={`sp-hudring ${hot ? 'hot' : ''}`} style={{ left: aim.x - S / 2, top: aim.y - S / 2, width: S, height: S }}>
      <svg viewBox={`${-S / 2} ${-S / 2} ${S} ${S}`} aria-hidden>
        <circle r={R + 4} className="tube" />
        <circle r={R + 10} className="hair" />
        <g className="spin"><circle r={R + 21} className="seg" strokeDasharray="46 10 10 10 120 18 22 30 64 14" /></g>
        <g className="spin rev"><circle r={R + 28} className="dots" /></g>
        <g className="fan">{fan}</g>
        {[0, 90, 180, 270].map(d => (
          <g key={d} transform={`rotate(${d})`}>
            <path d="M 0 0 l 10 -5.5 l 0 11 z" className="tri" style={{ transform: `translateX(${tri}px)` }} />
            <line x1={R + 70} y1={0} x2={R + 122} y2={0} className="ext side" />
          </g>
        ))}
        {/* 글자는 네 방향 모두 같은 규칙 — 바깥 선(R+70~R+122)의 안쪽 끝에서 선과 9px 떨어져 붙는다
            (좌우는 선 위, 위아래는 선 오른쪽). 예전엔 RNG가 아래 선에 겹치고 AZ는 대각선에 떠 있었다 */}
        <text x={9} y={-R - 70} className="lb side">AZ {az}°</text>
        <text x={R + 70} y={-9} className="lb side">×{ZOOM.toFixed(1)}</text>
        <text x={9} y={R + 70} dominantBaseline="hanging" className="lb side">RNG {rng} M</text>
        <text x={-R - 70} y={-9} textAnchor="end" className="lb side">ELV {elv}</text>
      </svg>
    </div>
  );
}

const GLYPHS = '█▓▒░#%&@$01ABCDEFXZ';
function Decode({ text, delay = 0, dur = 420 }: { text: string; delay?: number; dur?: number }) {
  const [out, setOut] = useState('');
  useEffect(() => {
    let raf = 0;
    const start = performance.now() + delay;
    const tick = () => {
      const t = performance.now() - start;
      if (t >= 0) {
        const n = Math.floor(Math.min(1, t / dur) * text.length);
        let s = text.slice(0, n);
        for (let i = n; i < text.length; i++) s += text[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        setOut(s);
        if (n >= text.length) return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, delay, dur]);
  return <>{out || ' '}</>;
}

function ProfilePanels({ aim, R, vp, profile }: { aim: Pt; R: number; vp: { w: number; h: number }; profile: Profile }) {
  const compact = vp.w < 760;
  const rowsH = profile.rows.length * 21;
  type Box = { key: 'a' | 'b' | 'c' | 'm'; x: number; y: number; w: number; h: number };
  const boxes: Box[] = [];
  const top = compact ? 14 : 60;
  const cy = (y: number, h: number) => Math.max(top, Math.min(vp.h - h - 70, y));
  const cx = (x: number, w: number) => Math.max(12, Math.min(vp.w - w - 12, x));
  if (compact) {
    const phone = vp.w <= 620;
    const w = phone ? Math.min(vp.w - 32, 300) : Math.min(vp.w - 24, 360);
    const h = phone ? 104 + profile.rows.length * 18 : 124 + rowsH;
    const below = aim.y + R + 34 + h < vp.h - 64;
    boxes.push({ key: 'm', w, h, x: (vp.w - w) / 2, y: below ? aim.y + R + 34 : Math.max(14, aim.y - R - 34 - h) });
  } else {
    const gap = R + 80;
    const A = { w: 280, h: 124 }, B = { w: 280, h: 74 + rowsH }, C = { w: 280, h: 150 };
    const spR = vp.w - (aim.x + gap) - 16, spL = aim.x - gap - 16;
    const bR = spR >= B.w || spR >= spL;
    const split = (bR ? spL : spR) >= Math.max(A.w, C.w);
    const bx = cx(bR ? aim.x + gap : aim.x - gap - B.w, B.w);
    if (split) {
      const oR = !bR;
      boxes.push({ key: 'b', ...B, x: bx, y: cy(aim.y - B.h / 2 + 30, B.h) });
      const ay = cy(aim.y - R - 30, A.h);
      boxes.push({ key: 'a', ...A, x: cx(oR ? aim.x + gap : aim.x - gap - A.w, A.w), y: ay });
      boxes.push({ key: 'c', ...C, x: cx(oR ? aim.x + gap : aim.x - gap - C.w, C.w), y: Math.max(cy(aim.y + R * 0.45, C.h), ay + A.h + 18) });
    } else {
      // 한쪽에 세로로 쌓기 — 전체 묶음을 한 번에 배치해야 서로 겹치지 않는다
      const g = 18, total = A.h + B.h + C.h + g * 2;
      const y0 = Math.max(top, Math.min(vp.h - total - 70, aim.y - total / 2));
      const colX = cx(bx, Math.max(A.w, B.w, C.w));
      boxes.push({ key: 'a', ...A, x: colX, y: y0 });
      boxes.push({ key: 'b', ...B, x: colX, y: y0 + A.h + g });
      boxes.push({ key: 'c', ...C, x: colX, y: y0 + A.h + B.h + g * 2 });
    }
  }
  // 정수 픽셀 자리에 — 0.5px 자리에 놓이면 테두리와 꺾쇠가 따로 반올림돼 위아래 꺾쇠가 1px씩 엇갈려 보였다 (연결선도 같은 값으로)
  boxes.forEach(b => { b.x = Math.round(b.x); b.y = Math.round(b.y); });
  const order = { a: 0, b: 1, c: 2, m: 0 };
  const links = boxes.map(b => {
    const right = b.x + b.w / 2 > aim.x;
    const ax = compact ? b.x + b.w / 2 : right ? b.x : b.x + b.w;
    const ay = compact ? (b.y > aim.y ? b.y : b.y + b.h) : b.y + 21;
    const ang = Math.atan2(ay - aim.y, ax - aim.x);
    const sx = aim.x + Math.cos(ang) * (R + 21), sy = aim.y + Math.sin(ang) * (R + 21);
    const pts = compact
      ? `${sx},${sy} ${sx},${(sy + ay) / 2} ${ax},${(sy + ay) / 2} ${ax},${ay}`
      : `${sx},${sy} ${ax + (right ? -34 : 34)},${ay} ${ax},${ay}`;
    return { key: b.key, pts, sx, sy, ax, ay, d: order[b.key] * 0.12 };
  });
  const rng = rangeM(aim, vp);
  const elv = ((0.5 - aim.y / vp.h) * 2).toFixed(1);
  const ms = (key: Box['key']) => (0.3 + order[key] * 0.12) * 1000;

  // 머리줄 — ARCH 카드(소개 페이지 ar-card)처럼 왼쪽 항목 이름 · 오른쪽 분류 글자
  const head = (label: string, code: string) => <div className="hd"><span>{label}</span><em>{code}</em></div>;
  const idBlock = (k: Box['key']) => (
    <>
      <div className="nm"><Decode text={profile.name} delay={ms(k)} /></div>
      {profile.sub && <div className="sb"><Decode text={profile.sub} delay={ms(k) + 140} /></div>}
    </>
  );
  const rowsBlock = (k: Box['key']) => profile.rows.map(([a, v], i) => (
    <div className={`rw ${/^status$/i.test(a) ? 'alert' : ''}`} key={i}><b>{a}</b><span><Decode text={v} delay={ms(k) + 120 + i * 90} dur={300} /></span></div>
  ));

  return (
    <>
      <svg className="sp-links" aria-hidden>
        {links.map(l => (
          <g key={l.key} style={{ '--d': `${l.d}s` } as React.CSSProperties}>
            <polyline points={l.pts} pathLength={1} className="ln" />
            <circle cx={l.sx} cy={l.sy} r={2.6} className="nd" />
            <circle cx={l.ax} cy={l.ay} r={2.2} className="nd" />
          </g>
        ))}
      </svg>
      {boxes.map(b => (
        <div key={b.key} className={`sp-panel sp-panel-${b.key}`}
          style={{ left: b.x, top: b.y, width: b.w, '--d': `${0.16 + order[b.key] * 0.12}s` } as React.CSSProperties}>
          {b.key === 'a' && <>{head('TARGET ID', 'CH-02')}{idBlock('a')}</>}
          {b.key === 'b' && <>{head('PROFILE', 'CLASSIFIED')}<div className="mr">{rowsBlock('b')}</div></>}
          {b.key === 'c' && (
            <>
              {head('TELEMETRY', `×${ZOOM.toFixed(1)} · FFP`)}
              <div className="mr"><div className="rw"><b>DIST</b><span>{rng} M</span></div>
              <div className="rw"><b>WIND</b><span>2.1 M/S <svg className="ar" viewBox="0 0 10 10" aria-hidden><path d="M2 8 8 2M3.5 2H8v4.5" /></svg></span></div>
              <div className="rw"><b>ELEV</b><span>{elv} MIL</span></div></div>
              <div className="lk"><b>LOCK</b><div className="bar"><i /></div><span>100%</span></div>
            </>
          )}
          {b.key === 'm' && <>{head('TARGET ID', 'CLASSIFIED')}{idBlock('m')}<div className="mr">{rowsBlock('m')}</div></>}
        </div>
      ))}
    </>
  );
}

/* ───────── 3D 유리 파쇄 엔진 (canvas) ───────── */
function runShatter(canvas: HTMLCanvasElement, img: HTMLImageElement, at: Pt,
  box: { w: number; h: number }, cv: ReturnType<typeof coverRect>, done: () => void) {
  const W = box.w, H = box.h;
  const small = Math.min(W, H) < 700;
  const u = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
  const Wd = Math.round(W * u), Hd = Math.round(H * u);
  canvas.width = Wd; canvas.height = Hd;
  const ctx = canvas.getContext('2d');
  if (!ctx) { done(); return () => {}; }

  const src = document.createElement('canvas');
  src.width = Wd; src.height = Hd;
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

  // 불씨 (불속성) — 탄착점에서 튀어 천천히 떠오르며 깜빡이다 사그라든다
  const embers = Array.from({ length: small ? 44 : 72 }, () => {
    const a = rnd(0, Math.PI * 2), sp = rnd(90, 560) * u * Math.pow(Math.random(), 0.6);
    return {
      t0: rnd(0, 0.14), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rnd(40, 220) * u,
      life: rnd(1.1, 2.3), size: rnd(0.9, 2.6) * u, hue: rnd(14, 42), fl: rnd(9, 20), ph: rnd(0, 6.3),
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

  const drawCracks = (R: number, alpha = 1, heat = 0) => {
    ctx.lineCap = 'round';
    // 탄착점 가까운 균열은 달아오른 불빛 — 안쪽은 진하게, 바깥으로 갈수록 옅게 (heat가 식으며 사그라든다)
    if (heat > 0.01) {
      for (const [lim, a, w, bl] of [[0.16, 0.4, 3, 14], [0.07, 0.85, 2, 9]] as const) {
        ctx.beginPath();
        for (const e of edges) if (e.d < Math.min(R, maxR * lim)) { ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y); }
        ctx.strokeStyle = `rgba(255,${lim > 0.1 ? 84 : 150},${lim > 0.1 ? 36 : 80},${a * heat * alpha})`;
        ctx.lineWidth = w * u; ctx.shadowColor = 'rgba(255,64,24,.9)'; ctx.shadowBlur = bl * u;
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }
    ctx.beginPath();
    for (const e of edges) if (e.d < R) { ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y); }
    // 실제 유리 금처럼 — 가는 어두운 금 위에 아주 옅은 빛 한 줄 (예전엔 굵은 흰 선 + 흰 번짐이라 그림 위에 흰 줄이 그어진 듯했다)
    ctx.strokeStyle = `rgba(0,0,0,${0.32 * alpha})`; ctx.lineWidth = 1.4 * u; ctx.stroke();
    const al = [0.36, 0.2, 0.14], lw = [0.7, 0.55, 0.45];
    for (let cat = 0; cat < 3; cat++) {
      ctx.beginPath();
      for (const e of edges) if (e.cat === cat && e.d < R) { ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y); }
      ctx.strokeStyle = `rgba(225,238,255,${al[cat] * alpha})`; ctx.lineWidth = lw[cat] * u;
      ctx.stroke();
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
    // 조각 테두리 — 평소엔 아주 옅게, 빛을 받는 면(spec)만 반짝인다
    ctx.strokeStyle = `rgba(225,238,255,${Math.min(1, edgeA + spec)})`;
    ctx.lineWidth = (0.7 + spec * 1.2) * u;
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  const start = performance.now();
  let raf = 0;
  let revealed = false;
  const frame = () => {
    // 전체를 0.9배 속도로 — 원래 속도보다 살짝 느리게 (v2.0 사용자 요청: 0.3배 슬로모션은 과해 빼고 0.1배만)
    const t = ((performance.now() - start) / 1000) * 0.9;
    if (t >= tE + T_FLY) { document.body.classList.remove('sp-reveal'); done(); return; }
    // 금이 다 간 순간부터 뒤의 사이트를 흐릿하게 페이드 인 — 벌어지는 틈 사이로 사이트가 비친다
    if (!revealed && t >= T_CRACK) { revealed = true; document.body.classList.add('sp-reveal'); }

    const shakeA = t < 0.45 ? 14 * u * Math.pow(1 - t / 0.45, 2)
      : t > tE && t < tE + 0.25 ? 7 * u * Math.pow(1 - (t - tE) / 0.25, 2) : 0;
    cam = {
      sc: 1 + 0.03 * Math.pow(Math.max(0, 1 - t / 0.35), 2),
      sx: rnd(-1, 1) * shakeA, sy: rnd(-1, 1) * shakeA,
    };

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, Wd, Hd);
    // 틈 뒤 — 새까만 대신 사이트 바탕색(남색 검정)이 점점 옅어지며 사이트가 비친다
    const back = t < T_CRACK ? 1 : t < tE ? 1 - 0.6 * ease((t - T_CRACK) / T_HOLD) : 0;
    if (back > 0) { ctx.fillStyle = `rgba(5,7,10,${back})`; ctx.fillRect(0, 0, Wd, Hd); }

    if (t < T_CRACK) {
      setCam();
      ctx.drawImage(src, 0, 0);
      drawCracks(maxR * ease(t / T_CRACK), 1, 1);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      drawHole(Math.min(1, t / 0.03));
    } else if (t < tE) {
      const th = (t - T_CRACK) / T_HOLD, e = ease(th);
      const sweep = -0.25 + 1.5 * th;
      for (const sh of shards) {
        const boost = Math.exp(-Math.pow((sh.q - sweep) / 0.07, 2));
        drawShard(sh, sh.c.x + sh.dir.x * sh.open * e, sh.c.y + sh.dir.y * sh.open * e, -(3 + 16 * sh.pw) * u * e,
          sh.hx * e, sh.hy * e, sh.hz * e, 0, boost * 0.18, 0.4 * boost, 1);
      }
      setCam();
      drawCracks(maxR, 1, 1 - 0.65 * th);
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
          Math.min(0.7, te * 0.75), 0.04, 0.16, near * fade);
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

    ctx.globalCompositeOperation = 'lighter';
    for (const m of embers) {
      const te = t - m.t0;
      if (te < 0 || te > m.life) continue;
      const k = (1 - Math.exp(-2.4 * te)) / 2.4;   // 공기 저항으로 금방 느려진다
      const pt = camPt(I.x + m.vx * k, I.y + m.vy * k - 26 * u * te * te);
      const lf = 1 - te / m.life;
      const al = lf * (0.55 + 0.45 * Math.sin(m.ph + te * m.fl));
      const r = m.size * (0.6 + 0.4 * lf);
      ctx.fillStyle = `hsla(${m.hue},100%,55%,${0.22 * al})`;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, r * 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `hsla(${m.hue + 12},100%,${70 + 20 * lf}%,${al})`;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    const p0 = camPt(I.x, I.y);
    if (t < 0.5) {
      const k = t / 0.5, rr = (30 + 1100 * ease(k)) * u, a = Math.pow(1 - k, 2);
      ctx.beginPath(); ctx.arc(p0.x, p0.y, rr, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,228,214,${0.5 * a})`; ctx.lineWidth = (1 + 7 * (1 - k)) * u; ctx.stroke();
      ctx.beginPath(); ctx.arc(p0.x, p0.y, rr * 0.93, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,70,40,${0.35 * a})`; ctx.lineWidth = (1 + 3 * (1 - k)) * u; ctx.stroke();
    }
    if (t < 0.24) {
      const k = 1 - t / 0.24;
      const gl = ctx.createRadialGradient(p0.x, p0.y, 0, p0.x, p0.y, 320 * u);
      gl.addColorStop(0, `rgba(255,244,230,${0.95 * k})`);
      gl.addColorStop(0.18, `rgba(255,150,90,${0.5 * k})`);
      gl.addColorStop(0.5, `rgba(255,60,30,${0.16 * k})`);
      gl.addColorStop(1, 'rgba(255,60,30,0)');
      ctx.fillStyle = gl; ctx.fillRect(0, 0, Wd, Hd);
    }
    if (t < 0.06) { ctx.fillStyle = `rgba(255,236,224,${0.32 * (1 - t / 0.06)})`; ctx.fillRect(0, 0, Wd, Hd); }

    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => { cancelAnimationFrame(raf); document.body.classList.remove('sp-reveal'); };
}

/* ───────── 스코프 화면 ───────── */
export function SplashView({ bgUrl, targetX, targetY, targetSize, label, profile, onFire, onDone }: {
  bgUrl: string; targetX: number; targetY: number; targetSize: number; label?: string; profile?: Profile | null;
  onFire?: () => void; onDone: () => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [vp, setVp] = useState({ w: 0, h: 0, l: 0, t: 0 });
  const boxRef = useRef<HTMLDivElement | null>(null);
  const layoutRef = useRef<{ cv: ReturnType<typeof coverRect>; w: number; h: number } | null>(null);
  const [pos, setPos] = useState<Pt | null>(null);
  const [impact, setImpact] = useState<Pt | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  // 그림을 못 불러오면(지워진 파일 · 네트워크 끊김) 검은 바탕에서 멈추지 않고 바로 사이트로 —
  // 오류가 안 오고 늘어지는 경우도 8초 뒤엔 넘긴다
  useEffect(() => {
    const im = new Image();
    let ok = false;
    const skip = () => { if (!ok) doneRef.current(); };
    const t = setTimeout(skip, 8000);
    im.onload = () => { ok = true; clearTimeout(t); setImg(im); };
    im.onerror = () => { clearTimeout(t); skip(); };
    im.src = bgUrl;
    return () => { clearTimeout(t); im.onload = null; im.onerror = null; };
  }, [bgUrl]);

  // 오버레이의 실제 크기·위치로 계산 — iOS Safari는 주소창이 접히고 펴질 때 innerHeight가
  // 실제 화면과 어긋나 이미지가 짧게 깔리고 터치 좌표도 밀렸다
  useEffect(() => {
    const f = () => {
      const el = boxRef.current;
      const r = el ? el.getBoundingClientRect() : null;
      const next = r && r.width > 0
        ? { w: Math.round(r.width), h: Math.round(r.height), l: r.left, t: r.top }
        : { w: window.innerWidth, h: window.innerHeight, l: 0, t: 0 };
      setVp(v => (v.w === next.w && v.h === next.h && v.l === next.l && v.t === next.t ? v : next));
    };
    f();
    const ro = new ResizeObserver(f);
    if (boxRef.current) ro.observe(boxRef.current);
    window.addEventListener('resize', f);
    window.visualViewport?.addEventListener('resize', f);
    return () => { ro.disconnect(); window.removeEventListener('resize', f); window.visualViewport?.removeEventListener('resize', f); };
  }, [img]);

  useEffect(() => {
    if (!impact || !img || !canvasRef.current) return;
    const L = layoutRef.current;
    if (!L) return;
    return runShatter(canvasRef.current, img, impact, { w: L.w, h: L.h }, L.cv, () => doneRef.current());
  }, [impact, img]);

  // body 직속으로 띄운다 — 사이트 페이드 인(body > *)이 오버레이를 건드리지 않게
  if (!img || !vp.w) return createPortal(<div className="splash-overlay" ref={boxRef} />, document.body);

  // 모바일 전용: 스코프를 작게, 이미지를 화면 밖으로 확대 시야만큼 더 깔아 가장자리에서도 렌즈가 비지 않게
  const mobile = vp.w <= 620;
  const R = mobile
    ? Math.round(Math.min(80, Math.max(62, Math.min(vp.w, vp.h) * 0.18)))
    : Math.round(Math.min(138, Math.max(89, Math.min(vp.w, vp.h) * 0.219)));
  const m = mobile ? Math.ceil(R / ZOOM) + 4 : 0;
  // 모바일: 이미지 윗변을 화면 맨 위에 맞추고(위쪽 안 잘림) 아래쪽을 자른다.
  // 좌우·아래로는 확대 시야만큼 더 깔아 가장자리에서도 렌즈가 비지 않게
  const cv = (() => {
    if (!mobile) return coverRect(vp.w, vp.h, img.naturalWidth, img.naturalHeight);
    const sc = Math.max((vp.w + m * 2) / img.naturalWidth, (vp.h + m) / img.naturalHeight);
    const dw = img.naturalWidth * sc, dh = img.naturalHeight * sc;
    return { ox: (vp.w - dw) / 2, oy: 0, dw, dh };
  })();
  layoutRef.current = { cv, w: vp.w, h: vp.h };
  const target = { x: cv.ox + (targetX / 100) * cv.dw, y: cv.oy + (targetY / 100) * cv.dh };
  const hitR = Math.max(22, targetSize / 2);
  const aim = pos ?? { x: vp.w / 2, y: vp.h / 2 };
  const isHit = (p: Pt) => Math.hypot(p.x - target.x, p.y - target.y) <= hitR;
  const hit = isHit(aim);
  const track = (e: React.PointerEvent) => {
    if (impact) return;
    setPos({ x: e.clientX - vp.l, y: e.clientY - vp.t });
  };

  return createPortal(
    <div
      ref={boxRef}
      className={`splash-overlay ${impact ? 'is-shatter' : ''}`}
      style={{ cursor: impact ? 'default' : 'none' }}
      onPointerMove={track}
      onPointerDown={track}
      onPointerUp={e => {
        if (impact) return;
        const p = { x: e.clientX - vp.l, y: e.clientY - vp.t };
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
          <ScopeHud aim={aim} R={R} hot={hit} vp={vp} />
          {hit && profile && <ProfilePanels aim={aim} R={R} vp={vp} profile={profile} />}
          <div className="sp-corner tl">EVEDEN TACTICAL OPTICS<br /><span>WIND STABILIZER · ×{ZOOM.toFixed(1)} · FFP</span></div>
          <div className={`sp-corner tr ${hit ? 'hot' : ''}`}><i className="dot" />{hit ? 'LOCK' : 'SCAN'}<br /><span>CH-02</span></div>
          <div className={`sp-hud ${hit ? 'hot' : ''} ${mobile && aim.y > vp.h * 0.6 ? 'up' : ''}`}>
            {hit
              ? <span className="found">...찾았네.</span>
              : <span className="scan">{label || 'SCANNING'}</span>}
          </div>
        </>
      )}
      {impact && <canvas ref={canvasRef} className="sp-canvas" />}
    </div>,
    document.body,
  );
}

function SplashInner() {
  const conf = getSplashConf();
  const bgUrl = useBlobUrl(conf.bgBlobId);
  const [show, setShow] = useState(false);

  useEffect(() => {
    /* 메인(/)으로 들어왔을 때만 (v2.0 사용자 요청) — 공유받은 글·게시판 주소로 바로 들어오면 건너뛰고
       그 페이지(비밀번호 창 등)를 바로 보여 준다. 레이아웃에 한 번만 붙어 있으므로 들어온 첫 주소만 본다 */
    if (window.location.pathname !== '/') return;
    if (conf.enabled && conf.bgBlobId && !splashSeenThisSession()) {
      setShow(true);
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [conf.enabled, conf.bgBlobId]);

  // 그림 파일 자체를 못 받으면(bgUrl이 끝내 안 옴) 스크롤만 막힌 채 남지 않게 8초 뒤 접는다
  useEffect(() => {
    if (!show || bgUrl) return;
    const t = setTimeout(() => { setShow(false); document.body.style.overflow = ''; }, 8000);
    return () => clearTimeout(t);
  }, [show, bgUrl]);

  if (!show || !bgUrl) return null;
  return (
    <>
      {/* 스코프 글씨(JetBrains Mono) · 이름(Jost) — 사이트 ARCH 화면과 같은 글꼴 (한글은 Pretendard) */}
      <link rel="stylesheet" href={ARCH_FONTS} precedence="default" />
      <SplashView
        bgUrl={bgUrl}
        targetX={conf.targetX}
        targetY={conf.targetY}
        targetSize={conf.targetSize}
        label={conf.targetLabel}
        profile={conf.profileOn ? {
          name: conf.profileName,
          sub: conf.profileSub,
          rows: conf.profileRows.split('\n').map(l => l.split('|')).filter(p => p.length >= 2 && p[0].trim())
            .map(p => [p[0].trim(), p.slice(1).join('|').trim()] as [string, string]),
        } : null}
        onFire={markSplashSeen}
        onDone={() => { setShow(false); document.body.style.overflow = ''; }}
      />
    </>
  );
}

export function SplashScreen() {
  return <SplashBoundary><SplashInner /></SplashBoundary>;
}
