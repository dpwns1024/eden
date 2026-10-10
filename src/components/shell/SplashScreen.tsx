'use client';
import React, { Component, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { getSplashConf, splashSeenThisSession, markSplashSeen } from '@/lib/splashStore';
import { useBlobUrl } from '@/lib/blobStore';

const SCOPE_R = 130;
const HIT_DIST = 8;
const CRACK_MS = 500;
const FALL_MS = 900;

class SplashBoundary extends Component<{ children: React.ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? null : this.props.children; }
}

function useCracks(ix: number, iy: number) {
  return useMemo(() => {
    const lines: { angle: number; len: number; delay: number }[] = [];
    const COUNT = 16;
    for (let i = 0; i < COUNT; i++) {
      const base = (i / COUNT) * Math.PI * 2;
      lines.push({
        angle: base + (Math.random() - 0.5) * 0.35,
        len: 60 + Math.random() * 90,
        delay: Math.random() * 80,
      });
    }
    return lines;
  }, [ix, iy]); // eslint-disable-line react-hooks/exhaustive-deps
}

function useFragments(bgUrl: string, ix: number, iy: number) {
  return useMemo(() => {
    const COLS = 10;
    const ROWS = 7;
    const out: {
      key: string; left: number; top: number; w: number; h: number;
      bx: number; by: number; cols: number; rows: number;
      tx: number; ty: number; rot: number; delay: number;
    }[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const pw = 100 / COLS, ph = 100 / ROWS;
        const cx = c * pw + pw / 2, cy = r * ph + ph / 2;
        const dx = cx - ix, dy = cy - iy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const a = Math.atan2(dy, dx);
        const spread = 60 + Math.random() * 100;
        out.push({
          key: `${r}-${c}`, left: c * pw, top: r * ph, w: pw + 0.5, h: ph + 0.5,
          bx: -c * 100, by: -r * 100, cols: COLS, rows: ROWS,
          tx: Math.cos(a) * spread * (0.5 + Math.random()),
          ty: Math.sin(a) * spread * (0.5 + Math.random()) + 150 + Math.random() * 250,
          rot: (Math.random() - 0.5) * 540,
          delay: dist * 2.5 + Math.random() * 60,
        });
      }
    }
    return out;
  }, [bgUrl, ix, iy]); // eslint-disable-line react-hooks/exhaustive-deps
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
  const idle = useRef(true);

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
    if (phase !== 'scope' || !hit || !idle.current) return;
    idle.current = false;
    setImpactPt({ ...scope });
    setPhase('impact');
    markSplashSeen();
    setTimeout(() => setPhase('fall'), CRACK_MS);
    setTimeout(() => { setPhase('done'); setShow(false); document.body.style.overflow = ''; }, CRACK_MS + FALL_MS + 100);
  }, [phase, hit, scope]);

  const cracks = useCracks(impactPt.x, impactPt.y);
  const frags = useFragments(bgUrl ?? '', impactPt.x, impactPt.y);

  if (!show || phase === 'done' || !bgUrl) return null;

  return (
    <div
      ref={boxRef}
      className="splash-overlay"
      style={{ cursor: phase === 'scope' ? 'none' : undefined }}
      onMouseMove={e => onMove(e.clientX, e.clientY)}
      onTouchMove={e => { const t = e.touches[0]; if (t) onMove(t.clientX, t.clientY); }}
      onTouchEnd={() => fire()}
      onClick={fire}
    >
      {/* ── scope phase ── */}
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
            <svg viewBox="0 0 260 260" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="130" cy="130" r="128" stroke="rgba(0,0,0,.55)" strokeWidth="3" />
              <circle cx="130" cy="130" r="125" stroke="rgba(255,255,255,.08)" strokeWidth="0.5" />
              {/* crosshairs */}
              <line x1="130" y1="10" x2="130" y2="105" className={`sp-hair ${hit ? 'on' : ''}`} />
              <line x1="130" y1="155" x2="130" y2="250" className={`sp-hair ${hit ? 'on' : ''}`} />
              <line x1="10" y1="130" x2="105" y2="130" className={`sp-hair ${hit ? 'on' : ''}`} />
              <line x1="155" y1="130" x2="250" y2="130" className={`sp-hair ${hit ? 'on' : ''}`} />
              {/* mil-dot ticks on crosshairs */}
              {[35,55,75,95, 165,185,205,225].map(p => (
                <line key={`v${p}`} x1="127" y1={p} x2="133" y2={p} className={`sp-tick ${hit ? 'on' : ''}`} />
              ))}
              {[35,55,75,95, 165,185,205,225].map(p => (
                <line key={`h${p}`} x1={p} y1="127" x2={p} y2="133" className={`sp-tick ${hit ? 'on' : ''}`} />
              ))}
              {/* center diamond when on target */}
              {hit && <circle cx="130" cy="130" r="3" fill="#e53935" />}
            </svg>
          </div>
          {hit && <div className="sp-fire">FIRE</div>}
        </>
      )}

      {/* ── impact / fall ── */}
      {(phase === 'impact' || phase === 'fall') && (
        <>
          <div className="sp-flash" />
          {phase === 'impact' && (
            <div className="splash-bg" style={{ backgroundImage: `url(${bgUrl})` }} />
          )}
          <svg className="sp-cracks" viewBox="0 0 100 100" preserveAspectRatio="none">
            {cracks.map((c, i) => (
              <line key={i} x1={impactPt.x} y1={impactPt.y}
                x2={impactPt.x + Math.cos(c.angle) * c.len}
                y2={impactPt.y + Math.sin(c.angle) * c.len}
                className="sp-crack-line" style={{ animationDelay: `${c.delay}ms` }} />
            ))}
            <circle cx={impactPt.x} cy={impactPt.y} r="1.2" fill="#111" />
            <circle cx={impactPt.x} cy={impactPt.y} r="2.5" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="0.3" />
          </svg>
          {phase === 'fall' && frags.map(f => (
            <div key={f.key} className="splash-frag sp-falling" style={{
              left: `${f.left}%`, top: `${f.top}%`, width: `${f.w}%`, height: `${f.h}%`,
              backgroundImage: `url(${bgUrl})`,
              backgroundSize: `${f.cols * 100}% ${f.rows * 100}%`,
              backgroundPosition: `${f.bx}% ${f.by}%`,
              '--tx': `${f.tx}px`, '--ty': `${f.ty}px`, '--rot': `${f.rot}deg`, '--delay': `${f.delay}ms`,
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
