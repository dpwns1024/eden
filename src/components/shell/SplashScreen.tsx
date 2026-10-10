'use client';
import React, { Component, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { getSplashConf, splashSeenThisSession, markSplashSeen } from '@/lib/splashStore';
import { useBlobUrl } from '@/lib/blobStore';

const SCOPE_R = 130;
const HIT_DIST = 8;

class SplashBoundary extends Component<{ children: React.ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? null : this.props.children; }
}

interface CrackLine { pts: string; delay: number; w: number }
interface Shard {
  key: string; clip: string;
  tx: number; ty: number; rz: number; rx: number; ry: number;
  delay: number; dur: number; bright: number;
}

function buildCracks(ix: number, iy: number): CrackLine[] {
  const out: CrackLine[] = [];
  const RADIALS = 22;
  const radii = [5, 11, 20, 34, 52, 78, 115];

  for (let i = 0; i < RADIALS; i++) {
    const a = (i / RADIALS) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
    const len = 80 + Math.random() * 70;
    const segs = 5 + Math.floor(Math.random() * 3);
    let pts = `${ix},${iy}`;
    for (let s = 1; s <= segs; s++) {
      const t = s / segs;
      const dev = (Math.random() - 0.5) * 3;
      pts += ` ${ix + Math.cos(a) * len * t + Math.cos(a + Math.PI / 2) * dev},${iy + Math.sin(a) * len * t + Math.sin(a + Math.PI / 2) * dev}`;
    }
    out.push({ pts, delay: Math.random() * 50, w: 0.08 + Math.random() * 0.06 });

    if (Math.random() > 0.35) {
      const bt = 0.25 + Math.random() * 0.4;
      const bx = ix + Math.cos(a) * len * bt;
      const by = iy + Math.sin(a) * len * bt;
      const ba = a + (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.5);
      const bl = 12 + Math.random() * 25;
      let bpts = `${bx},${by}`;
      for (let s = 1; s <= 3; s++) {
        const t = s / 3;
        bpts += ` ${bx + Math.cos(ba) * bl * t + (Math.random() - 0.5) * 1.5},${by + Math.sin(ba) * bl * t + (Math.random() - 0.5) * 1.5}`;
      }
      out.push({ pts: bpts, delay: 30 + Math.random() * 80, w: 0.05 + Math.random() * 0.04 });
    }
  }

  for (const r of radii) {
    const segs = 36;
    let pts = '';
    for (let s = 0; s <= segs; s++) {
      const a = (s / segs) * Math.PI * 2;
      const jit = (Math.random() - 0.5) * r * 0.12;
      const px = ix + Math.cos(a) * (r + jit);
      const py = iy + Math.sin(a) * (r + jit);
      pts += (s ? ' ' : '') + `${px},${py}`;
    }
    out.push({ pts, delay: r * 0.8, w: 0.05 + Math.random() * 0.04 });
  }

  return out;
}

function buildShards(ix: number, iy: number): Shard[] {
  const radii = [4, 9, 16, 26, 40, 60, 88, 130];
  const SECTORS = 22;
  const out: Shard[] = [];

  for (let ri = 0; ri < radii.length - 1; ri++) {
    const r1 = radii[ri], r2 = radii[ri + 1];
    const jit = Math.max(0.4, 1.8 - ri * 0.22);

    for (let si = 0; si < SECTORS; si++) {
      const a1 = (si / SECTORS) * Math.PI * 2;
      const a2 = ((si + 1) / SECTORS) * Math.PI * 2;
      const midA = (a1 + a2) / 2;
      const midR = (r1 + r2) / 2;
      const j = () => (Math.random() - 0.5) * jit * 2;

      const pts = [
        { x: ix + Math.cos(a1) * r1 + j(), y: iy + Math.sin(a1) * r1 + j() },
        { x: ix + Math.cos(a2) * r1 + j(), y: iy + Math.sin(a2) * r1 + j() },
        { x: ix + Math.cos(a2) * r2 + j(), y: iy + Math.sin(a2) * r2 + j() },
        { x: ix + Math.cos(a1) * r2 + j(), y: iy + Math.sin(a1) * r2 + j() },
      ];

      const spread = 25 + midR * 0.5;
      out.push({
        key: `${ri}-${si}`,
        clip: `polygon(${pts.map(p => `${p.x}% ${p.y}%`).join(',')})`,
        tx: Math.cos(midA) * spread * (0.4 + Math.random() * 0.8),
        ty: Math.sin(midA) * spread * 0.3 + 80 + Math.random() * 160 + midR * 1.3,
        rz: (Math.random() - 0.5) * 400,
        rx: (Math.random() - 0.5) * 140,
        ry: (Math.random() - 0.5) * 140,
        delay: midR * 1.5 + Math.random() * 40,
        dur: 550 + Math.random() * 450,
        bright: 0.85 + Math.random() * 0.4,
      });
    }
  }
  return out;
}

function SplashInner() {
  const conf = getSplashConf();
  const bgUrl = useBlobUrl(conf.bgBlobId);
  const [phase, setPhase] = useState<'scope' | 'crack' | 'fall' | 'done'>('scope');
  const [show, setShow] = useState(false);
  const [scope, setScope] = useState({ x: 50, y: 50 });
  const [hit, setHit] = useState(false);
  const [impactPt, setImpactPt] = useState({ x: 50, y: 50 });
  const boxRef = useRef<HTMLDivElement>(null);
  const fired = useRef(false);

  const cracks = useMemo(() => buildCracks(impactPt.x, impactPt.y), [impactPt.x, impactPt.y]);
  const shards = useMemo(() => buildShards(impactPt.x, impactPt.y), [impactPt.x, impactPt.y]);

  useEffect(() => {
    if (conf.enabled && conf.bgBlobId && !splashSeenThisSession()) {
      setShow(true);
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [conf.enabled, conf.bgBlobId]);

  const toPercent = useCallback((cx: number, cy: number) => {
    const r = boxRef.current?.getBoundingClientRect();
    if (!r) return null;
    return { x: ((cx - r.left) / r.width) * 100, y: ((cy - r.top) / r.height) * 100 };
  }, []);

  const onMove = useCallback((cx: number, cy: number) => {
    if (phase !== 'scope') return;
    const p = toPercent(cx, cy);
    if (!p) return;
    setScope(p);
    const dx = p.x - conf.targetX, dy = p.y - conf.targetY;
    setHit(Math.sqrt(dx * dx + dy * dy) < HIT_DIST);
  }, [phase, conf.targetX, conf.targetY, toPercent]);

  const fire = useCallback(() => {
    if (phase !== 'scope' || !hit || fired.current) return;
    fired.current = true;
    setImpactPt({ ...scope });
    setPhase('crack');
    markSplashSeen();
    setTimeout(() => setPhase('fall'), 650);
    setTimeout(() => { setPhase('done'); setShow(false); document.body.style.overflow = ''; }, 650 + 1100 + 100);
  }, [phase, hit, scope]);

  if (!show || phase === 'done' || !bgUrl) return null;

  return (
    <div
      ref={boxRef}
      className={`splash-overlay ${phase === 'crack' ? 'sp-shake' : ''}`}
      style={{ cursor: phase === 'scope' ? 'none' : undefined }}
      onMouseMove={e => onMove(e.clientX, e.clientY)}
      onTouchMove={e => { const t = e.touches[0]; if (t) onMove(t.clientX, t.clientY); }}
      onTouchEnd={() => fire()}
      onClick={fire}
    >
      {/* ── scope phase ── */}
      {phase === 'scope' && (
        <>
          <div className="sp-scope-img" style={{
            backgroundImage: `url(${bgUrl})`,
            WebkitMaskImage: `radial-gradient(circle ${SCOPE_R}px at ${scope.x}% ${scope.y}%, #000 80%, transparent 100%)`,
            maskImage: `radial-gradient(circle ${SCOPE_R}px at ${scope.x}% ${scope.y}%, #000 80%, transparent 100%)`,
          }} />
          <div className="sp-scope-ring" style={{ left: `${scope.x}%`, top: `${scope.y}%`, width: SCOPE_R * 2, height: SCOPE_R * 2 }}>
            <svg viewBox="0 0 260 260" fill="none">
              <circle cx="130" cy="130" r="128" stroke="rgba(0,0,0,.55)" strokeWidth="3" />
              <circle cx="130" cy="130" r="125" stroke="rgba(255,255,255,.08)" strokeWidth="0.5" />
              <line x1="130" y1="10" x2="130" y2="105" className={`sp-hair ${hit ? 'on' : ''}`} />
              <line x1="130" y1="155" x2="130" y2="250" className={`sp-hair ${hit ? 'on' : ''}`} />
              <line x1="10" y1="130" x2="105" y2="130" className={`sp-hair ${hit ? 'on' : ''}`} />
              <line x1="155" y1="130" x2="250" y2="130" className={`sp-hair ${hit ? 'on' : ''}`} />
              {[35,55,75,95,165,185,205,225].map(p => (
                <line key={`v${p}`} x1="127" y1={p} x2="133" y2={p} className={`sp-tick ${hit ? 'on' : ''}`} />
              ))}
              {[35,55,75,95,165,185,205,225].map(p => (
                <line key={`h${p}`} x1={p} y1="127" x2={p} y2="133" className={`sp-tick ${hit ? 'on' : ''}`} />
              ))}
              {hit && <circle cx="130" cy="130" r="3" fill="#e53935" />}
            </svg>
          </div>
          {hit && <div className="sp-fire">FIRE</div>}
        </>
      )}

      {/* ── crack phase: cracks spread, image stays, bullet hole ── */}
      {phase === 'crack' && (
        <>
          <div className="sp-flash" />
          <div className="splash-bg" style={{ backgroundImage: `url(${bgUrl})` }} />
          <div className="sp-hole" style={{ left: `${impactPt.x}%`, top: `${impactPt.y}%` }} />
          <svg className="sp-cracks" viewBox="0 0 100 100" preserveAspectRatio="none">
            {cracks.map((c, i) => (
              <polyline key={i} points={c.pts} fill="none"
                stroke="rgba(255,255,255,.55)" strokeWidth={c.w}
                className="sp-crack-line" style={{ animationDelay: `${c.delay}ms` }} />
            ))}
          </svg>
        </>
      )}

      {/* ── fall phase: polar shards tumble away ── */}
      {phase === 'fall' && (
        <>
          <svg className="sp-cracks sp-cracks-fade" viewBox="0 0 100 100" preserveAspectRatio="none">
            {cracks.map((c, i) => (
              <polyline key={i} points={c.pts} fill="none"
                stroke="rgba(255,255,255,.4)" strokeWidth={c.w} />
            ))}
          </svg>
          <div className="sp-hole sp-hole-stay" style={{ left: `${impactPt.x}%`, top: `${impactPt.y}%` }} />
          {shards.map(s => (
            <div key={s.key} className="sp-shard" style={{
              backgroundImage: `url(${bgUrl})`,
              clipPath: s.clip,
              filter: `brightness(${s.bright})`,
              '--tx': `${s.tx}px`, '--ty': `${s.ty}px`,
              '--rx': `${s.rx}deg`, '--ry': `${s.ry}deg`, '--rz': `${s.rz}deg`,
              '--delay': `${s.delay}ms`, '--dur': `${s.dur}ms`,
            } as React.CSSProperties} />
          ))}
        </>
      )}
    </div>
  );
}

export function SplashScreen() {
  return <SplashBoundary><SplashInner /></SplashBoundary>;
}
