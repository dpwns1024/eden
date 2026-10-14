'use client';
/**
 * 가이드 매칭 연출 (v2.0 사용자 요청) — 메인의 ABOUT EVEDEN 버튼을 누르면 화면 위로 뜬다.
 * 모양은 사용자가 준 참고 영상(붉은 경보 화면 · 브라운관 결 · 색 번짐 글리치)을 따랐다 — syncMatch.css.
 *  1) 탐색 — 이브와 익명 가이드 요원들의 간략 프로필 창이 아무 데나 마구 떴다가 매칭에 실패하고 사라진다.
 *  2) 고정 — 이브 프로필은 왼쪽(모바일은 위)에 고정. 익명 가이드들이 차례로 들어와 동기화율이 낮게 나오고
 *     MATCH FAILED와 함께 창이 튕겨 나간다. 점점 빨라지고 겹친다. 실패할 때마다 화면이 튄다.
 *  3) 발견 — 에덴 프로필이 들어오면 화면이 붉은 경보에서 푸른 신호로 바뀌고 동기화율이 98.7%까지 오른 뒤,
 *     두 사람의 프로필 카드가 뜬다.
 * 에덴 · 이브 정보는 캐릭터 목록(ohome.chars.v1)에서 이름으로 찾는다 — 없으면 이름 · 대표색만.
 * 역할은 이야기대로 고정한다 — 이브 SENTINEL, 에덴과 익명 요원들 GUIDE.
 * 이어지는 소개 화면은 아직 없다 — 지금은 마지막 카드에서 닫기만.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocalList } from '@/lib/postStore';
import { CHAR_SEED, type Character } from '@/lib/charStore';
import { CroppedBlobImg } from '@/components/ui/CropEditor';
import './syncMatch.css';

const FINAL = 98.7;

interface Profile {
  name: string; sub: string; color: string; role: string; code: string;
  img?: string; crop?: Character['thumbCrop']; specs: { label: string; value: string }[];
  /** 익명 요원 — 사진 대신 그리는 바코드 */
  bars?: string;
}
type Kind = 'eve' | 'anon' | 'eden';
type WinState = 'in' | 'fail' | 'out' | 'fly';
interface Win {
  id: number; kind: Kind; slot?: 'l' | 'r';
  x: number; y: number; r: number; st: WinState;
  ex?: number; fx?: number; fy?: number; fr?: number;
  anon?: Profile;
}
type Phase = 'scan' | 'lock' | 'found' | 'done';

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

/** 캐릭터 → 간략 프로필 (프로필 정보 칸을 그대로) */
function profileOf(c: Character | undefined, fb: { name: string; color: string; role: string; code: string; sub: string }): Profile {
  if (!c) return { ...fb, specs: [] };
  return {
    ...fb, name: c.name || fb.name, sub: c.sub || fb.sub, color: c.color || fb.color,
    img: c.arts?.[0] ?? c.thumbId, crop: c.thumbCrop,
    specs: (c.specs ?? []).filter(s => s.label?.trim() && s.value?.trim()),
  };
}
const findChar = (chars: Character[], en: string, ko: string) =>
  chars.find(c => new RegExp(`^\\s*${en}\\s*$`, 'i').test(c.name)) ?? chars.find(c => `${c.name} ${c.sub}`.includes(ko));

/** 세로 막대가 제멋대로인 바코드 (background 값) */
function barcode() {
  const stops: string[] = [];
  let x = 0;
  while (x < 100) {
    const w = rand(1.2, 5), g = rand(.8, 4);
    stops.push(`currentColor ${x.toFixed(1)}% ${(x + w).toFixed(1)}%`, `transparent ${(x + w).toFixed(1)}% ${(x + w + g).toFixed(1)}%`);
    x += w + g;
  }
  return `linear-gradient(90deg,${stops.join(',')})`;
}

/** 익명 가이드 요원 — 매번 다른 번호 · 가린 이름 */
function anonGuide(): Profile {
  const n = String(Math.floor(rand(100, 9999))).padStart(4, '0');
  return {
    name: pick(['UNKNOWN', '██████', 'N/A', 'REDACTED', '███ ████', 'UNREGISTERED']),
    sub: pick(['미등록 가이드 · 익명', '외부 협력 가이드', 'ARCH 연수 가이드', '민간 가이드 · 익명']),
    color: '#ff3b3b', role: 'GUIDE', code: `G-${n}`, bars: barcode(),
    specs: [
      { label: 'CLASS', value: `GUIDE · ${pick(['C', 'B', 'B+', 'A-', 'A'])}` },
      { label: 'ORIGIN', value: pick(['SECTOR 4', 'SECTOR 9', 'OUTER RIM', 'UNDISCLOSED', 'CIVIL']) },
    ],
  };
}

function Photo({ p }: { p: Profile }) {
  if (p.bars) {
    return <div className="sm-ph sm-bars"><i style={{ backgroundImage: p.bars }} /><span>NO RECORD</span></div>;
  }
  return (
    <div className="sm-ph">
      {p.img ? <CroppedBlobImg fileRef={p.img} crop={p.crop} /> : <span className="sm-noimg">NO<br />IMAGE</span>}
    </div>
  );
}

/** 간략 프로필 데이터 창 — 위 칠한 띠 · 사진 · 이름 · 두 칸 · 아래 상태 상자 */
function DataWin({ p, st }: { p: Profile; st: WinState }) {
  const failed = st === 'fail' || st === 'fly';
  return (
    <>
      <div className="sm-wh"><b>{p.role}</b><span>{p.code}</span></div>
      <div className="sm-wb">
        <Photo p={p} />
        <div className="sm-wi">
          <strong>{p.name}</strong>
          <small>{p.sub}</small>
          <dl>{p.specs.slice(0, 2).map(s => <div key={s.label}><dt>{s.label}</dt><dd>{s.value}</dd></div>)}</dl>
        </div>
      </div>
      <div className="sm-wf"><span>{failed ? 'REJECTED.' : 'STANDBY.'}</span><i /></div>
      {failed && <em className="sm-stamp">MATCH FAILED</em>}
    </>
  );
}

/** 마지막 프로필 카드 */
function Card({ p, side }: { p: Profile; side: 'l' | 'r' }) {
  return (
    <div className={`sm-card ${side}`} style={{ '--c': p.color } as React.CSSProperties}>
      <div className="sm-wh"><b>{p.role}</b><span>{p.code}</span></div>
      <div className="sm-cb">
        <Photo p={p} />
        <div className="sm-ci">
          <strong>{p.name}</strong>
          <small>{p.sub}</small>
          {p.specs.length > 0 && (
            <dl>{p.specs.slice(0, 4).map(s => <div key={s.label}><dt>{s.label}</dt><dd>{s.value}</dd></div>)}</dl>
          )}
        </div>
      </div>
      <div className="sm-wf"><span>VERIFIED.</span><i /></div>
    </div>
  );
}

/** 경고 삼각형 */
function Warn() {
  return (
    <svg viewBox="0 0 48 42" aria-hidden="true">
      <path d="M24 3 L45 39 H3 Z" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinejoin="round" />
      <path d="M24 15 V27" stroke="currentColor" strokeWidth="4" strokeLinecap="square" />
      <rect x="22" y="31" width="4" height="4" fill="currentColor" />
    </svg>
  );
}

export function SyncMatch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [chars] = useLocalList<Character>('ohome.chars.v1', CHAR_SEED);
  const eve = profileOf(findChar(chars, 'EVE', '이브'), { name: 'EVE', color: '#D11C20', role: 'SENTINEL', code: 'S-0001', sub: '이브' });
  const eden = profileOf(findChar(chars, 'EDEN', '에덴'), { name: 'EDEN', color: '#607ca0', role: 'GUIDE', code: 'G-0001', sub: '에덴' });

  const [phase, setPhase] = useState<Phase>('scan');
  const [wins, setWins] = useState<Win[]>([]);
  const [meter, setMeter] = useState<{ v: number; st: 'idle' | 'run' | 'fail' | 'ok' }>({ v: 0, st: 'idle' });
  const [tries, setTries] = useState(0);
  const [flash, setFlash] = useState(0);
  // 실패할 때마다 — 가운데 경보가 깜빡이고(alarm) 화면이 튄다(jolt)
  const [alarm, setAlarm] = useState(0);
  const [jolt, setJolt] = useState(0);
  const timers = useRef<number[]>([]);
  const raf = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);

  // 화면 튐 — 무대 전체가 몇 번 어긋나며 색이 번진다 (창들을 다시 그리지 않게 Web Animations로)
  useEffect(() => {
    if (!jolt) return;
    stageRef.current?.animate([
      { transform: 'translate(0,0)', filter: 'none' },
      { transform: 'translate(-9px,2px)', filter: 'drop-shadow(5px 0 rgba(0,255,230,.55)) drop-shadow(-5px 0 rgba(255,0,60,.6))' },
      { transform: 'translate(7px,-3px) skewX(-4deg)', filter: 'drop-shadow(-4px 0 rgba(0,255,230,.5)) drop-shadow(4px 0 rgba(255,0,60,.55))' },
      { transform: 'translate(-4px,1px)', filter: 'drop-shadow(2px 0 rgba(0,255,230,.4))' },
      { transform: 'translate(0,0)', filter: 'none' },
    ], { duration: 240, easing: 'steps(4, end)' });
  }, [jolt]);

  const stop = () => {
    timers.current.forEach(t => window.clearTimeout(t));
    timers.current = [];
    cancelAnimationFrame(raf.current);
  };
  const finish = () => {
    stop();
    setWins([]);
    setMeter({ v: FINAL, st: 'ok' });
    setPhase('done');
  };

  // 연출 시간표 — 열 때마다 새로 짠다
  useEffect(() => {
    if (!open) return;
    setPhase('scan'); setWins([]); setMeter({ v: 0, st: 'idle' }); setTries(0);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { finish(); return; }

    let seq = 0;
    const at = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };
    const add = (w: Omit<Win, 'id'>) => { const id = ++seq; setWins(ws => [...ws, { ...w, id }]); return id; };
    const patch = (id: number, p: Partial<Win>) => setWins(ws => ws.map(w => (w.id === id ? { ...w, ...p } : w)));
    const drop = (id: number) => setWins(ws => ws.filter(w => w.id !== id));
    const fail = (big: boolean) => { setTries(n => n + 1); setAlarm(n => n + 1); if (big) setJolt(n => n + 1); };
    const mobile = window.innerWidth <= 620;
    // 창이 화면 밖으로 삐져나가지 않는 범위(%) — 창 폭의 절반 + 여유
    const half = ((mobile ? 176 : 232) / 2 / window.innerWidth) * 100 + 2;
    const spot = () => ({ x: rand(half, 100 - half), y: rand(mobile ? 16 : 18, mobile ? 84 : 82), r: rand(-6, 6) });
    const fling = () => {
      const a = rand(0, Math.PI * 2), d = rand(90, 140);
      return { fx: Math.cos(a) * d, fy: Math.sin(a) * d, fr: rand(-80, 80) };
    };

    // 1) 탐색 — 아무 데나 마구 뜨고 실패
    for (let i = 0; i < 16; i++) {
      const t = i * 135 + rand(0, 60);
      at(t, () => {
        const id = add({ kind: i % 3 === 0 ? 'eve' : 'anon', st: 'in', anon: anonGuide(), ...spot() });
        at(rand(340, 520), () => { patch(id, { st: 'fail' }); fail(i % 4 === 1); });
        at(rand(640, 860), () => patch(id, { st: 'out' }));
        at(1100, () => drop(id));
      });
    }

    // 2) 고정 — 이브는 왼쪽에, 익명 가이드들이 차례로 들어와 실패하고 튕겨 나간다
    const tB = 2500;
    at(tB, () => { setPhase('lock'); setJolt(n => n + 1); add({ kind: 'eve', slot: 'l', st: 'in', x: 0, y: 0, r: 0 }); });
    let t = tB + 420;
    for (const d of [620, 560, 480, 420, 360, 310, 270, 240, 220, 200, 190]) {
      const t0 = t;
      at(t0, () => {
        const id = add({ kind: 'anon', slot: 'r', st: 'in', x: 0, y: 0, r: rand(-3, 3), ex: pick([-1, 1]) * rand(80, 160), anon: anonGuide() });
        setMeter({ v: rand(4, 71), st: 'run' });
        at(d * 0.55, () => { patch(id, { st: 'fail' }); setMeter(m => ({ ...m, st: 'fail' })); fail(true); });
        at(d, () => patch(id, { st: 'fly', ...fling() }));
        at(d + 800, () => drop(id));
      });
      t += d;
    }
    // 그 사이사이 뒤쪽에서 떴다가 바로 튕겨 나가는 창들 — 엉망인 느낌
    for (let i = 0; i < 9; i++) {
      at(tB + 500 + rand(0, t - tB - 700), () => {
        const id = add({ kind: 'anon', st: 'in', anon: anonGuide(), ...spot() });
        at(rand(200, 320), () => patch(id, { st: 'fail' }));
        at(rand(380, 520), () => patch(id, { st: 'fly', ...fling() }));
        at(1400, () => drop(id));
      });
    }

    // 3) 발견 — 화면이 푸른 신호로 바뀌고, 에덴이 들어와 98.7%까지
    const tC = t + 300;
    at(tC, () => {
      setFlash(f => f + 1);
      setJolt(n => n + 1);
      setPhase('found');
      setMeter({ v: 0, st: 'run' });
      add({ kind: 'eden', slot: 'r', st: 'in', x: 0, y: 0, r: 0, ex: 140 });
    });
    at(tC + 450, () => {
      const t0 = performance.now(), dur = 1700;
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - k, 3);
        // 마지막 구간은 숫자가 살짝 떨리며 올라간다
        const jitter = k < 1 && k > .55 ? rand(-.6, .6) : 0;
        setMeter({ v: Math.min(FINAL, FINAL * e + jitter), st: k < 1 ? 'run' : 'ok' });
        if (k < 1) raf.current = requestAnimationFrame(step);
      };
      raf.current = requestAnimationFrame(step);
    });
    at(tC + 2700, () => { setFlash(f => f + 1); setWins([]); setPhase('done'); });
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 열려 있는 동안 뒤 화면 스크롤을 막고, Esc로 닫는다
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement, prev = html.style.overflow;
    html.style.overflow = 'hidden';
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', key);
    return () => { html.style.overflow = prev; window.removeEventListener('keydown', key); };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const pOf = (w: Win) => (w.kind === 'eve' ? eve : w.kind === 'eden' ? eden : w.anon!);
  const STATUS: Record<Phase, string> = {
    scan: 'SEARCHING GUIDE REGISTRY...',
    lock: `SUBJECT LOCKED > MATCHING...`,
    found: 'SIGNAL ACQUIRED > SYNCHRONIZING...',
    done: 'PAIR CONFIRMED.',
  };
  const blue = phase === 'found' || phase === 'done';

  return createPortal(
    <div className={`sm-root sm-${phase}`} role="dialog" aria-modal="true" aria-label="가이드 매칭">
      {/* 바탕 — 붉은 경보 / 푸른 신호 두 장을 겹쳐 두고 바꾼다 */}
      <div className="sm-bg red" /><div className="sm-bg blue" />
      <i className="sm-cn tl" /><i className="sm-cn tr" /><i className="sm-cn bl" /><i className="sm-cn br" />

      {/* 왼쪽 위 단말기 글씨 */}
      <div className="sm-term">
        <p>SUBJECT ID_{eve.code} {eve.name.toUpperCase()}&nbsp;&nbsp;&nbsp;AEGIS LINK 52° 31′ N 7° 19′ E</p>
        <p>STATUS: &gt; {STATUS[phase]}<i className="sm-cur" /></p>
        <p>ATTEMPT {String(tries).padStart(4, '0')}&nbsp;&nbsp;&nbsp;{blue ? 'MATCH 0001' : `FAILED ${String(tries).padStart(4, '0')}`}</p>
      </div>
      {phase === 'done'
        ? <button type="button" className="sm-x" onClick={onClose}>CLOSE ✕</button>
        : <button type="button" className="sm-x" onClick={finish}>SKIP »</button>}

      {phase !== 'done' && (
        <div className="sm-stage" ref={stageRef}>
          {/* 가운데 경보 — 실패할 때마다 다시 깜빡인다 */}
          <div className={`sm-alarm${blue ? ' ok' : ''}`} key={blue ? 'ok' : `a${alarm}`}>
            <Warn />
            <small>{blue ? 'NOTICE' : 'ATTENTION'}</small>
            <b>{blue ? 'COMPATIBLE GUIDE FOUND' : phase === 'scan' ? 'NO COMPATIBLE GUIDE' : 'MATCH FAILED'}</b>
          </div>
          {(phase === 'lock' || phase === 'found') && (
            <div className={`sm-meter ${meter.st}`}>
              <small>SYNC RATE</small>
              <b>{meter.v.toFixed(1)}<em>%</em></b>
              <span className="sm-bar"><i style={{ width: `${meter.v}%` }} /></span>
              <span className="sm-ms">{meter.st === 'fail' ? 'REJECTED.' : meter.st === 'ok' ? 'MATCHED.' : 'ANALYZING.'}</span>
            </div>
          )}
          {wins.map(w => (
            <div key={w.id} className={`sm-pos${w.slot ? ` slot ${w.slot}` : ''}`}
              style={w.slot ? undefined : { left: `${w.x}%`, top: `${w.y}%` }}>
              <div className={`sm-win k-${w.kind} ${w.st}`}
                style={{
                  '--r': `${w.r}deg`, '--ex': `${w.ex ?? 0}px`,
                  '--fx': `${w.fx ?? 0}vw`, '--fy': `${w.fy ?? 0}vh`, '--fr': `${w.fr ?? 0}deg`,
                } as React.CSSProperties}>
                <DataWin p={pOf(w)} st={w.st} />
              </div>
            </div>
          ))}
        </div>
      )}

      {phase === 'done' && (
        <div className="sm-final">
          <Card p={eve} side="l" />
          <div className="sm-mid">
            <small>SYNC RATE</small>
            <b>{FINAL}<em>%</em></b>
            <span className="sm-ok">SYNCHRONIZED</span>
            <span className="sm-ms">PAIR CONFIRMED.</span>
          </div>
          <Card p={eden} side="r" />
        </div>
      )}

      {/* 번쩍임 · 화면 튐(색 번짐 띠) */}
      <div className="sm-flash" key={`f${flash}`} />
      <div className="sm-glitch" key={`g${jolt}`} />
    </div>,
    document.body,
  );
}
