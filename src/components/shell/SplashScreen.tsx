'use client';
import React, { Component, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { getSplashConf, splashSeenThisSession, markSplashSeen } from '@/lib/splashStore';
import { useBlobUrl } from '@/lib/blobStore';

const SCOPE_R = 130;
const HIT_DIST = 8;
const CRACK_MS = 450;
const FALL_MS = 1100;
const FRAG_COLS = 18;
const FRAG_ROWS = 12;

class SplashBoundary extends Component<{ children: React.ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? null : this.props.children; }
}

function buildCracks(ix: number, iy: number) {
  const main: { pts: string; delay: number; w: number }[] = [];
  const COUNT = 20;
  for (let i = 0; i < COUNT; i++) {
    const a = (i / COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
    const len = 70 + Math.random() * 80;
    const segs = 4 + Math.floor(Math.random() * 3);
    let pts = `${ix},${iy}`;
    for (let s = 1; s <= segs; s++) {
      const t = s / segs;
      const dev = (Math.random() - 0.5) * 4;
      const px = ix + Math.cos(a) * len * t + Math.cos(a + Math.PI / 2) * dev;
      const py = iy + Math.sin(a) * len * t + Math.sin(a + Math.PI / 2) * dev;
      pts += ` ${px},${py}`;
    }
    main.push({ pts, delay: Math.random() * 60, w: 0.12 + Math.random() * 0.06 });
    if (Math.random() > 0.4) {
      const branchT = 0.3 + Math.random() * 0.4;
      const bx = ix + Math.cos(a) * len * branchT;
      const by = iy + Math.sin(a) * len * branchT;
      const ba = a + (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.6);
      const bl = 15 + Math.random() * 30;
      const bSegs = 2 + Math.floor(Math.random() * 2);
      let bpts = `${bx},${by}`;
      for (let s = 1; s <= bSegs; s++) {
        const t = s / bSegs;
        const dev = (Math.random() - 0.5) * 2;
        bpts += ` ${bx + Math.cos(ba) * bl * t + Math.cos(ba + Math.PI / 2) * dev},${by + Math.sin(ba) * bl * t + Math.sin(ba + Math.PI / 2) * dev}`;
      }
      main.push({ pts: bpts, delay: Math.random() * 100 + 40, w: 0.08 + Math.random() * 0.04 });
    }
  }
  return main;
}

function buildFrags(ix: number, iy: number) {
  const out: {
    key: string; left: number; top: number; w: number; h: number;
    bx: number; by: number;
    tx: number; ty: number; tz: number;
    rx: number; ry: number; rz: number;
    delay: number; dur: number;
  }[] = [];
  const pw = 100 / FRAG_COLS, ph = 100 / FRAG_ROWS;
  for (let r = 0; r < FRAG_ROWS; r++) {
    for (let c = 0; c < FRAG_COLS; c++) {
      const cx = c * pw + pw / 2, cy = r * ph + ph / 2;
      const dx = cx - ix, dy = cy - iy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const a = Math.atan2(dy, dx);
      const power = Math.max(0.3, 1 - dist / 120);
      const spread = (40 + Math.random() * 80) * power;
      out.push({
        key: `${r}-${c}`,
        left: c * pw, top: r * ph, w: pw + 0.3, h: ph + 0.3,
        bx: -c * 100, by: -r * 100,
        tx: Math.cos(a) * spread * (0.6 + Math.random() * 0.8),
        ty: Math.sin(a) * spread * 0.5 + 120 + Math.random() * 200 + dist * 0.8,
        tz: -(20 + Math.random() * 60) * power,
        rx: (Math.random() - 0.5) * 180,
        ry: (Math.random() - 0.5) * 180,
        rz: (Math.random() - 0.5) * 360,
        delay: dist * 1.8 + Math.random() * 40,
        dur: 700 + Math.random() * 500,
      });
    }
  }
  return out;
}

function SplashInner() {
  const conf = getSplashConf();
  const bgUrl = useBlobUrl(conf.bgBlobId);
  const [phase, setPhase] = useState<'scope' | 'impact' | 'fall' | 'done'>('scope');
  const [show, setShow] = useState(false);
  const [scope, setScope] = useState({ x: 50, y: 50 });
  const [hit, setHit] = useState(false);
  const [impactPt, setImpactPt] = useState({ x: 50, y: 50 });
  const boxRef = useRef<HTMLDivElement>(null);
  const fired = useRef(false);

  const cracks = useMemo(() => buildCracks(impactPt.x, impactPt.y), [impactPt.x, impactPt.y]);
  const frags = useMemo(() => buildFrags(impactPt.x, impactPt.y), [impactPt.x, impactPt.y]);

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
    setPhase('impact');
    markSplashSeen();
    setTimeout(() => setPhase('fall'), CRACK_MS);
    setTimeout(() => { setPhase('done'); setShow(false); document.body.style.overflow = ''; }, CRACK_MS + FALL_MS + 150);
  }, [phase, hit, scope]);

  if (!show || phase === 'done' || !bgUrl) return null;

  return (
    <div
      ref={boxRef}
      className={`splash-overlay ${phase === 'impact' || phase === 'fall' ? 'sp-shake' : ''}`}
      style={{ cursor: phase === 'scope' ? 'none' : undefined, perspective: '800px' }}
      onMouseMove={e => onMove(e.clientX, e.clientY)}
      onTouchMove={e => { const t = e.touches[0]; if (t) onMove(t.clientX, t.clientY); }}
      onTouchEnd={() => fire()}
      onClick={fire}
    >
      {phase === 'scope' && (
        <>
          <div
            className="sp-scope-img"
            style={{
              backgroundImage: `url(${bgUrl})`,
              WebkitMaskImage: `radial-gradient(circle ${SCOPE_R}px at ${scope.x}% ${scope.y}%, #000 80%, transparent 100%)`,
              maskImage: `radial-gradient(circle ${SCOPE_R}px at ${scope.x}% ${scope.y}%, #000 80%, transparent 100%)`,
            }}
          />
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

      {(phase === 'impact' || phase === 'fall') && (
        <>
          <div className="sp-flash" />
          {phase === 'impact' && (
            <div className="splash-bg" style={{ backgroundImage: `url(${bgUrl})` }} />
          )}
          <svg className="sp-cracks" viewBox="0 0 100 100" preserveAspectRatio="none">
            {cracks.map((c, i) => (
              <polyline key={i} points={c.pts} fill="none"
                stroke="rgba(255,255,255,.6)" strokeWidth={c.w}
                className="sp-crack-line" style={{ animationDelay: `${c.delay}ms` }} />
            ))}
            <circle cx={impactPt.x} cy={impactPt.y} r="1" fill="#111" />
            <circle cx={impactPt.x} cy={impactPt.y} r="2" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="0.2" />
          </svg>
          {phase === 'fall' && frags.map(f => (
            <div key={f.key} className="splash-frag sp-falling" style={{
              left: `${f.left}%`, top: `${f.top}%`, width: `${f.w}%`, height: `${f.h}%`,
              backgroundImage: `url(${bgUrl})`,
              backgroundSize: `${FRAG_COLS * 100}% ${FRAG_ROWS * 100}%`,
              backgroundPosition: `${f.bx}% ${f.by}%`,
              '--tx': `${f.tx}px`, '--ty': `${f.ty}px`, '--tz': `${f.tz}px`,
              '--rx': `${f.rx}deg`, '--ry': `${f.ry}deg`, '--rz': `${f.rz}deg`,
              '--delay': `${f.delay}ms`, '--dur': `${f.dur}ms`,
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
