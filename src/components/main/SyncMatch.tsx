'use client';
/**
 * LOST EDEN — 가이드 매칭 연출 (v2.0 사용자 요청). 메인의 LOST EDEN 버튼을 누르면 화면 위로 뜬다.
 * 모양은 사용자가 준 참고 영상(경보 화면 · 브라운관 결 · 색 번짐 글리치)을 따랐다 — syncMatch.css.
 *  1) 페어 — 이브는 가이드 아담과 페어를 맺고 있다 (푸른 신호 · 동기화율 91.4% · LINKED).
 *  2) 소실 — 아담의 신호가 끊기고(SIGNAL LOST) 순직(K.I.A.) — 사진 · 정보가 찾을 수 없는 기록으로 바뀌고 창이 꺼진다.
 *     화면은 붉은 경보로, 동기화율은 0으로 떨어진다.
 *  3) 재배정 — 갈 곳 잃은 이브(왼쪽 · 모바일은 위에 고정)에게 익명 가이드들이 차례로 붙지만 낮은 동기화율로
 *     MATCH FAILED와 함께 튕겨 나간다. 점점 빨라지고 겹친다. 실패할 때마다 화면이 튄다.
 *  4) 발견 — 에덴이 들어오면 푸른 신호로 바뀌고 동기화율이 98.7%까지.
 *  5) 매칭 성공 — 곧바로 두 사람의 기밀 파일 페이지(/eveden)로. SKIP도 그 페이지로.
 * 이브 · 에덴 · 아담 정보는 lib/pairChars.ts — 익명 요원들은 모두 GUIDE.
 * 프로필 창에는 한 줄 소개(대사)를 넣지 않는다 — 이름과 프로필 칸 두 개만.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { usePairProfiles, type PairProfile } from '@/lib/pairChars';
import { CroppedBlobImg } from '@/components/ui/CropEditor';
import './syncMatch.css';

const FINAL = 98.7;
/** 아담과의 페어 — 처음에 보이는 동기화율 */
const ADAM_SYNC = 91.4;
/** 매칭에 성공하면 넘어가는 두 사람의 기밀 파일 */
export const PAIR_FILE_HREF = '/eveden';

type Profile = PairProfile;
type Kind = 'eve' | 'anon' | 'eden' | 'adam';
/** in 뜸 · link 페어 중 · lost 신호 끊김 · kia 순직(정보 소실) · fail 매칭 실패 · out 꺼짐 · fly 튕겨 나감 */
type WinState = 'in' | 'link' | 'lost' | 'kia' | 'fail' | 'out' | 'fly';
interface Win {
  id: number; kind: Kind; slot?: 'l' | 'r';
  x: number; y: number; r: number; st: WinState;
  ex?: number; fx?: number; fy?: number; fr?: number;
  anon?: Profile;
}
type Phase = 'paired' | 'lost' | 'lock' | 'found' | 'open';
type MeterSt = 'idle' | 'run' | 'fail' | 'ok';

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

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
    name: pick(['UNKNOWN', '██████', 'N/A', 'REDACTED', '███ ████', 'UNREGISTERED']), sub: '',
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
      {p.img ? <CroppedBlobImg fileRef={p.img} crop={p.crop} />
        // eslint-disable-next-line @next/next/no-img-element
        : p.src ? <img src={p.src} alt="" />
          : <span className="sm-noimg">NO<br />IMAGE</span>}
    </div>
  );
}

const FOOT: Partial<Record<WinState, string>> = { link: 'LINKED.', lost: 'NO SIGNAL.', kia: 'DECEASED.', fail: 'REJECTED.', fly: 'REJECTED.' };
const STAMP: Partial<Record<WinState, string>> = { lost: 'SIGNAL LOST', kia: 'K.I.A.', fail: 'MATCH FAILED', fly: 'MATCH FAILED' };

/** 간략 프로필 데이터 창 — 위 칠한 띠 · 사진 · 이름 · 두 칸 · 아래 상태 상자.
 *  순직(kia)하면 이름 · 칸이 찾을 수 없는 기록으로 바뀐다 */
function DataWin({ p, st }: { p: Profile; st: WinState }) {
  const gone = st === 'kia';
  return (
    <>
      <div className="sm-wh"><b>{p.role}</b><span>{gone ? 'G-████' : p.code}</span></div>
      <div className="sm-wb">
        <Photo p={p} />
        <div className="sm-wi">
          <strong>{gone ? 'DATA NOT FOUND' : p.name}</strong>
          <dl>{p.specs.slice(0, 2).map(s => <div key={s.label}><dt>{s.label}</dt><dd>{gone ? 'NOT FOUND' : s.value}</dd></div>)}</dl>
        </div>
      </div>
      <div className="sm-wf"><span>{FOOT[st] ?? 'STANDBY.'}</span><i /></div>
      {STAMP[st] && <em className={`sm-stamp${st === 'kia' ? ' kia' : ''}`}>{STAMP[st]}</em>}
    </>
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
  const router = useRouter();
  const { eve, eden, adam } = usePairProfiles();

  const [phase, setPhase] = useState<Phase>('paired');
  const [wins, setWins] = useState<Win[]>([]);
  const [meter, setMeter] = useState<{ v: number; st: MeterSt; label?: string }>({ v: 0, st: 'idle' });
  // 가운데 경보 문구 — 장면마다 시간표가 바꾼다
  const [msg, setMsg] = useState('PAIR LINK STABLE');
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
  // 기밀 파일로 — 매칭 성공 · SKIP · 움직임 줄이기
  const openFile = () => {
    stop();
    router.push(PAIR_FILE_HREF);
  };

  // 연출 시간표 — 열 때마다 새로 짠다
  useEffect(() => {
    if (!open) return;
    setPhase('paired'); setWins([]); setMeter({ v: 0, st: 'idle' }); setTries(0); setMsg('PAIR LINK STABLE');
    router.prefetch(PAIR_FILE_HREF);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { openFile(); return; }

    let seq = 0;
    const at = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };
    const add = (w: Omit<Win, 'id'>) => { const id = ++seq; setWins(ws => [...ws, { ...w, id }]); return id; };
    const patch = (id: number, p: Partial<Win>) => setWins(ws => ws.map(w => (w.id === id ? { ...w, ...p } : w)));
    const drop = (id: number) => setWins(ws => ws.filter(w => w.id !== id));
    const fail = () => { setTries(n => n + 1); setAlarm(n => n + 1); setJolt(n => n + 1); };
    // 동기화율을 from → to로 (끝에 st · label)
    const count = (from: number, to: number, dur: number, st: MeterSt, label?: string, shake = 0) => {
      cancelAnimationFrame(raf.current);
      const t0 = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - k, 3);
        const jitter = k < 1 && shake ? rand(-shake, shake) : 0;
        setMeter({ v: Math.max(0, Math.min(100, from + (to - from) * e + jitter)), st: k < 1 ? 'run' : st, label: k < 1 ? undefined : label });
        if (k < 1) raf.current = requestAnimationFrame(step);
      };
      raf.current = requestAnimationFrame(step);
    };
    const mobile = window.innerWidth <= 620;
    // 창이 화면 밖으로 삐져나가지 않는 범위(%) — 창 폭의 절반 + 여유
    const half = ((mobile ? 176 : 232) / 2 / window.innerWidth) * 100 + 2;
    const spot = () => ({ x: rand(half, 100 - half), y: rand(mobile ? 16 : 18, mobile ? 84 : 82), r: rand(-6, 6) });
    const fling = () => {
      const a = rand(0, Math.PI * 2), d = rand(90, 140);
      return { fx: Math.cos(a) * d, fy: Math.sin(a) * d, fr: rand(-80, 80) };
    };

    // 1) 페어 — 이브 × 아담
    add({ kind: 'eve', slot: 'l', st: 'in', x: 0, y: 0, r: 0 });
    let adamId = 0;
    at(260, () => { adamId = add({ kind: 'adam', slot: 'r', st: 'in', x: 0, y: 0, r: 0, ex: 120 }); });
    at(700, () => { patch(adamId, { st: 'link' }); count(0, ADAM_SYNC, 900, 'ok', 'LINKED.'); });

    // 2) 소실 — 신호가 흔들리다 끊기고, 순직 · 정보 소실, 창이 꺼진다
    at(2300, () => count(ADAM_SYNC, 63, 500, 'run', undefined, 4));
    at(2850, () => {
      setFlash(f => f + 1); setJolt(n => n + 1);
      setPhase('lost'); setMsg('GUIDE SIGNAL LOST');
      patch(adamId, { st: 'lost' });
      count(63, 0, 700, 'fail', 'SEVERED.', 3);
    });
    at(3700, () => { setJolt(n => n + 1); setAlarm(n => n + 1); setMsg('GUIDE K.I.A. — DATA NOT FOUND'); patch(adamId, { st: 'kia' }); });
    at(4900, () => patch(adamId, { st: 'out' }));
    at(5150, () => { drop(adamId); setAlarm(n => n + 1); setMsg('NO GUIDE ASSIGNED'); setMeter({ v: 0, st: 'idle' }); });

    // 3) 재배정 — 갈 곳 잃은 이브에게 가이드들이 붙지만 다 튕겨 나간다
    const tB = 5600;
    at(tB, () => { setPhase('lock'); setMsg('MATCH FAILED'); });
    let t = tB;
    for (const d of [560, 500, 440, 380, 330, 290, 250, 230, 210, 190]) {
      const t0 = t;
      at(t0, () => {
        const id = add({ kind: 'anon', slot: 'r', st: 'in', x: 0, y: 0, r: rand(-3, 3), ex: pick([-1, 1]) * rand(80, 160), anon: anonGuide() });
        setMeter({ v: rand(4, 71), st: 'run' });
        at(d * 0.55, () => { patch(id, { st: 'fail' }); setMeter(m => ({ ...m, st: 'fail', label: 'REJECTED.' })); fail(); });
        at(d, () => patch(id, { st: 'fly', ...fling() }));
        at(d + 800, () => drop(id));
      });
      t += d;
    }
    // 그 사이사이 뒤쪽에서 떴다가 바로 튕겨 나가는 창들 — 엉망인 느낌
    for (let i = 0; i < 8; i++) {
      at(tB + 300 + rand(0, t - tB - 500), () => {
        const id = add({ kind: 'anon', st: 'in', anon: anonGuide(), ...spot() });
        at(rand(200, 320), () => patch(id, { st: 'fail' }));
        at(rand(380, 520), () => patch(id, { st: 'fly', ...fling() }));
        at(1400, () => drop(id));
      });
    }

    // 4) 발견 — 푸른 신호로 바뀌고, 에덴이 들어와 98.7%까지
    const tC = t + 300;
    at(tC, () => {
      setFlash(f => f + 1); setJolt(n => n + 1);
      setPhase('found'); setMsg('COMPATIBLE GUIDE FOUND');
      setMeter({ v: 0, st: 'run' });
      add({ kind: 'eden', slot: 'r', st: 'in', x: 0, y: 0, r: 0, ex: 140 });
    });
    at(tC + 450, () => count(0, FINAL, 1700, 'ok', 'MATCHED.', .6));
    // 5) 매칭 성공 — 번쩍이고 곧바로 기밀 파일로
    at(tC + 2500, () => { setFlash(f => f + 1); setJolt(n => n + 1); setPhase('open'); setMsg('ACCESSING PAIR FILE'); });
    at(tC + 3000, () => router.push(PAIR_FILE_HREF));
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

  const pOf = (w: Win) => (w.kind === 'eve' ? eve : w.kind === 'eden' ? eden : w.kind === 'adam' ? adam : w.anon!);
  const STATUS: Record<Phase, string> = {
    paired: `PAIR LINK ACTIVE > ${eve.name} × ${adam.name}`.toUpperCase(),
    lost: 'GUIDE SIGNAL LOST > PAIR DISSOLVED',
    lock: 'SUBJECT UNPAIRED > REASSIGNING GUIDE...',
    found: 'SIGNAL ACQUIRED > SYNCHRONIZING...',
    open: 'ACCESS GRANTED > OPENING PAIR FILE...',
  };
  const blue = phase === 'paired' || phase === 'found' || phase === 'open';
  const meterText = meter.label ?? (meter.st === 'fail' ? 'REJECTED.' : meter.st === 'ok' ? 'MATCHED.' : meter.st === 'idle' ? 'NO LINK.' : 'ANALYZING.');

  return createPortal(
    <div className={`sm-root sm-${phase}`} role="dialog" aria-modal="true" aria-label="LOST EDEN — 가이드 매칭">
      {/* 바탕 — 붉은 경보 / 푸른 신호 두 장을 겹쳐 두고 바꾼다 */}
      <div className="sm-bg red" /><div className="sm-bg blue" />
      <i className="sm-cn tl" /><i className="sm-cn tr" /><i className="sm-cn bl" /><i className="sm-cn br" />

      {/* 왼쪽 위 단말기 글씨 */}
      <div className="sm-term">
        <p>SUBJECT ID_{eve.code} {eve.name.toUpperCase()}&nbsp;&nbsp;&nbsp;AEGIS LINK 52° 31′ N 7° 19′ E</p>
        <p>STATUS: &gt; {STATUS[phase]}<i className="sm-cur" /></p>
        <p>
          {phase === 'paired' ? `PARTNER ${adam.code} · LINKED`
            : phase === 'lost' ? `PARTNER ${adam.code} · K.I.A.`
              : `ATTEMPT ${String(tries).padStart(4, '0')}   ${blue ? 'MATCH 0001' : `FAILED ${String(tries).padStart(4, '0')}`}`}
        </p>
      </div>
      <button type="button" className="sm-x" onClick={openFile}>SKIP »</button>

      <div className="sm-stage" ref={stageRef}>
        {/* 가운데 경보 — 실패할 때마다 다시 깜빡인다 */}
        <div className={`sm-alarm${blue ? ' ok' : ''}`} key={`${phase}${alarm}`}>
          <Warn />
          <small>{blue ? 'NOTICE' : 'ATTENTION'}</small>
          <b>{msg}</b>
        </div>
        <div className={`sm-meter ${meter.st}`}>
          <small>SYNC RATE</small>
          <b>{meter.v.toFixed(1)}<em>%</em></b>
          <span className="sm-bar"><i style={{ width: `${meter.v}%` }} /></span>
          <span className="sm-ms">{meterText}</span>
        </div>
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

      {/* 번쩍임 · 화면 튐(색 번짐 띠) */}
      <div className="sm-flash" key={`f${flash}`} />
      <div className="sm-glitch" key={`g${jolt}`} />
    </div>,
    document.body,
  );
}
