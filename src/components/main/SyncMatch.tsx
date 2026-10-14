'use client';
/**
 * 가이드 매칭 연출 (v2.0 사용자 요청) — 메인의 ABOUT EVEDEN 버튼을 누르면 화면 위로 뜬다.
 *  1) 탐색 — 이브와 익명 가이드 요원들의 간략 프로필 창이 아무 데나 마구 떴다가 매칭에 실패하고 사라진다.
 *  2) 고정 — 이브 프로필은 왼쪽(모바일은 위)에 고정. 익명 가이드들이 차례로 들어와 동기화율이 낮게 나오고
 *     MATCH FAILED와 함께 창이 튕겨 나간다. 점점 빨라지고 겹친다.
 *  3) 발견 — 에덴 프로필이 들어오면 동기화율이 98.7%까지 오르고, 두 사람의 프로필 카드가 뜬다.
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

/** 익명 가이드 요원 — 매번 다른 번호 · 가린 이름 */
function anonGuide(): Profile {
  const n = String(Math.floor(rand(100, 9999))).padStart(4, '0');
  return {
    name: pick(['UNKNOWN', '██████', 'N/A', 'REDACTED', '███ ████', 'UNREGISTERED']),
    sub: pick(['미등록 가이드 · 익명', '외부 협력 가이드', 'ARCH 연수 가이드', '민간 가이드 · 익명']),
    color: '#8592a0', role: 'GUIDE', code: `G-${n}`,
    specs: [
      { label: 'CLASS', value: `GUIDE · ${pick(['C', 'B', 'B+', 'A-', 'A'])}` },
      { label: 'ORIGIN', value: pick(['SECTOR 4', 'SECTOR 9', 'OUTER RIM', 'UNDISCLOSED', 'CIVIL']) },
    ],
  };
}

function Photo({ p }: { p: Profile }) {
  return (
    <div className="sm-ph">
      {p.img ? <CroppedBlobImg fileRef={p.img} crop={p.crop} /> : <span className="sm-noimg">NO<br />IMAGE</span>}
    </div>
  );
}

/** 간략 프로필 데이터 창 */
function DataWin({ p, stamp }: { p: Profile; stamp?: string }) {
  return (
    <>
      <div className="sm-wh"><b>{p.role}</b><i /><span>{p.code}</span></div>
      <div className="sm-wb">
        <Photo p={p} />
        <div className="sm-wi">
          <strong>{p.name}</strong>
          <small>{p.sub}</small>
          <dl>{p.specs.slice(0, 2).map(s => <div key={s.label}><dt>{s.label}</dt><dd>{s.value}</dd></div>)}</dl>
        </div>
      </div>
      {stamp && <em className="sm-stamp">{stamp}</em>}
    </>
  );
}

/** 마지막 프로필 카드 */
function Card({ p, side }: { p: Profile; side: 'l' | 'r' }) {
  return (
    <div className={`sm-card ${side}`} style={{ '--c': p.color } as React.CSSProperties}>
      <div className="sm-wh"><b>{p.role}</b><i /><span>{p.code}</span></div>
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
    </div>
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
  const timers = useRef<number[]>([]);
  const raf = useRef(0);

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
    const mobile = window.innerWidth <= 620;
    // 창이 화면 밖으로 삐져나가지 않는 범위(%) — 창 폭의 절반 + 여유
    const half = ((mobile ? 176 : 232) / 2 / window.innerWidth) * 100 + 2;
    const spot = () => ({ x: rand(half, 100 - half), y: rand(mobile ? 14 : 16, mobile ? 86 : 84), r: rand(-7, 7) });
    const fling = () => {
      const a = rand(0, Math.PI * 2), d = rand(90, 140);
      return { fx: Math.cos(a) * d, fy: Math.sin(a) * d, fr: rand(-80, 80) };
    };

    // 1) 탐색 — 아무 데나 마구 뜨고 실패
    for (let i = 0; i < 16; i++) {
      const t = i * 135 + rand(0, 60);
      at(t, () => {
        const id = add({ kind: i % 3 === 0 ? 'eve' : 'anon', st: 'in', anon: anonGuide(), ...spot() });
        at(rand(340, 520), () => { patch(id, { st: 'fail' }); setTries(n => n + 1); });
        at(rand(640, 860), () => patch(id, { st: 'out' }));
        at(1100, () => drop(id));
      });
    }

    // 2) 고정 — 이브는 왼쪽에, 익명 가이드들이 차례로 들어와 실패하고 튕겨 나간다
    const tB = 2500;
    at(tB, () => { setPhase('lock'); add({ kind: 'eve', slot: 'l', st: 'in', x: 0, y: 0, r: 0 }); });
    let t = tB + 420;
    for (const d of [620, 560, 480, 420, 360, 310, 270, 240, 220, 200, 190]) {
      const t0 = t;
      at(t0, () => {
        const id = add({ kind: 'anon', slot: 'r', st: 'in', x: 0, y: 0, r: rand(-3, 3), ex: pick([-1, 1]) * rand(80, 160), anon: anonGuide() });
        setMeter({ v: rand(4, 71), st: 'run' });
        at(d * 0.55, () => { patch(id, { st: 'fail' }); setMeter(m => ({ ...m, st: 'fail' })); setTries(n => n + 1); });
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

    // 3) 발견 — 에덴이 들어오고 98.7%까지
    const tC = t + 300;
    at(tC, () => {
      setFlash(f => f + 1);
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
  const stampOf = (w: Win) => (w.st === 'fail' || w.st === 'fly' ? (w.kind === 'eve' ? 'NO MATCH' : 'MATCH FAILED') : undefined);
  const STATUS: Record<Phase, string> = {
    scan: 'SCANNING GUIDE REGISTRY',
    lock: `SUBJECT LOCKED — ${eve.name} · MATCHING`,
    found: 'CANDIDATE FOUND — SYNCHRONIZING',
    done: 'SYNCHRONIZED — PAIR CONFIRMED',
  };

  return createPortal(
    <div className={`sm-root sm-${phase}`} role="dialog" aria-modal="true" aria-label="가이드 매칭">
      <div className="sm-flash" key={flash} />
      <div className="sm-top">
        <span><i className="sm-dot" />{STATUS[phase]}</span>
        <span className="sm-tries">ATTEMPT <b>{String(tries).padStart(4, '0')}</b></span>
        {phase === 'done'
          ? <button type="button" className="sm-x" onClick={onClose}>CLOSE ✕</button>
          : <button type="button" className="sm-x" onClick={finish}>SKIP »</button>}
      </div>

      {phase !== 'done' && (
        <div className="sm-stage">
          {(phase === 'lock' || phase === 'found') && (
            <div className={`sm-meter ${meter.st}`}>
              <small>SYNC RATE</small>
              <b>{meter.v.toFixed(1)}<em>%</em></b>
              <span className="sm-bar"><i style={{ width: `${meter.v}%` }} /></span>
              <small className="sm-ms">{meter.st === 'fail' ? 'MATCH FAILED' : meter.st === 'ok' ? 'MATCHED' : 'ANALYZING…'}</small>
            </div>
          )}
          {wins.map(w => (
            <div key={w.id} className={`sm-pos${w.slot ? ` slot ${w.slot}` : ''}`}
              style={w.slot ? undefined : { left: `${w.x}%`, top: `${w.y}%` }}>
              <div className={`sm-win k-${w.kind} ${w.st}`}
                style={{
                  '--c': pOf(w).color, '--r': `${w.r}deg`, '--ex': `${w.ex ?? 0}px`,
                  '--fx': `${w.fx ?? 0}vw`, '--fy': `${w.fy ?? 0}vh`, '--fr': `${w.fr ?? 0}deg`,
                } as React.CSSProperties}>
                <DataWin p={pOf(w)} stamp={stampOf(w)} />
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
            <svg viewBox="0 0 200 40" aria-hidden="true"><path d="M0 20 Q 12.5 4 25 20 T 50 20 T 75 20 T 100 20 T 125 20 T 150 20 T 175 20 T 200 20" /></svg>
            <span>MATCHED · PAIR CONFIRMED</span>
          </div>
          <Card p={eden} side="r" />
        </div>
      )}
    </div>,
    document.body,
  );
}
