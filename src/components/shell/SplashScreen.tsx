'use client';
import React, { Component, useEffect, useRef, useState, useCallback } from 'react';
import { getSplashConf, splashSeenThisSession, markSplashSeen } from '@/lib/splashStore';
import { useBlobUrl } from '@/lib/blobStore';

const COLS = 16;
const ROWS = 10;
const ANIM_MS = 1200;

class SplashBoundary extends Component<{ children: React.ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? null : this.props.children; }
}

function SplashInner() {
  const conf = getSplashConf();
  const bgUrl = useBlobUrl(conf.bgBlobId);
  const [phase, setPhase] = useState<'idle' | 'shattering' | 'done'>('idle');
  const [show, setShow] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const clickPos = useRef({ x: 50, y: 50 });

  useEffect(() => {
    if (conf.enabled && conf.bgBlobId && !splashSeenThisSession()) {
      setShow(true);
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [conf.enabled, conf.bgBlobId]);

  const shatter = useCallback((cx: number, cy: number) => {
    clickPos.current = { x: cx, y: cy };
    setPhase('shattering');
    markSplashSeen();
    setTimeout(() => {
      setPhase('done');
      setShow(false);
      document.body.style.overflow = '';
    }, ANIM_MS + 100);
  }, []);

  if (!show || phase === 'done') return null;
  if (!bgUrl) return null;

  const fragments = [];
  const pw = 100 / COLS;
  const ph = 100 / ROWS;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cx = c * pw + pw / 2;
      const cy = r * ph + ph / 2;
      const dx = cx - clickPos.current.x;
      const dy = cy - clickPos.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      const spread = 120 + Math.random() * 200;
      const tx = Math.cos(angle) * spread * (0.6 + Math.random() * 0.8);
      const ty = Math.sin(angle) * spread * (0.6 + Math.random() * 0.8);
      const rot = (Math.random() - 0.5) * 360;
      const delay = dist * 3;

      fragments.push(
        <div
          key={`${r}-${c}`}
          className={phase === 'shattering' ? 'splash-frag shattering' : 'splash-frag'}
          style={{
            left: `${c * pw}%`,
            top: `${r * ph}%`,
            width: `${pw + 0.5}%`,
            height: `${ph + 0.5}%`,
            backgroundImage: `url(${bgUrl})`,
            backgroundSize: `${COLS * 100}% ${ROWS * 100}%`,
            backgroundPosition: `${-c * 100}% ${-r * 100}%`,
            ...(phase === 'shattering' ? {
              '--tx': `${tx}px`,
              '--ty': `${ty}px`,
              '--rot': `${rot}deg`,
              '--delay': `${delay}ms`,
            } as React.CSSProperties : {}),
          }}
        />,
      );
    }
  }

  return (
    <div ref={containerRef} className="splash-overlay" onClick={e => {
      if (phase !== 'idle') return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const cx = ((e.clientX - rect.left) / rect.width) * 100;
      const cy = ((e.clientY - rect.top) / rect.height) * 100;
      shatter(cx, cy);
    }}>
      {phase === 'idle' && (
        <>
          <div className="splash-bg" style={{ backgroundImage: `url(${bgUrl})` }} />
          <div
            className="splash-target"
            style={{
              left: `${conf.targetX}%`,
              top: `${conf.targetY}%`,
              width: conf.targetSize,
              height: conf.targetSize,
            }}
          >
            {conf.targetLabel && <span>{conf.targetLabel}</span>}
          </div>
        </>
      )}
      {phase === 'shattering' && fragments}
    </div>
  );
}

export function SplashScreen() {
  return <SplashBoundary><SplashInner /></SplashBoundary>;
}
