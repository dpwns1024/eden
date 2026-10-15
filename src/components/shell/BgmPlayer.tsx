'use client';
// BGM 미니 플레이어 (4.1) — 유튜브 IFrame API, 화면은 숨기고 자체 컨트롤만 표시
// 기본 위치 오른쪽 아래 · 곡 리스트 팝업 (v1.9) · 페이지 이동에도 유지(레이아웃 상주)
// 브라우저 정책상 소리 재생은 사용자의 첫 클릭부터 시작
import React, { useEffect, useRef, useState } from 'react';
import { useBgm } from '@/lib/bgmStore';
import { ARCH_FONTS } from '@/lib/archFonts';
import './bgmDial.css';

/** 흐르는 글씨 — 재생 중이고 글자가 넘칠 때만 무한 스크롤, 평소엔 말줄임.
 *  넘침 판정은 숨김 측정용 스팬으로 — 마운트 직후(레이아웃·폰트 확정 전) 1회 측정만 하면
 *  짧은 제목도 흐르는 글씨로 오판되는 버그가 있어 ResizeObserver로 계속 재측정 */
function Marquee({ text, active, className }: { text: string; active: boolean; className?: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const measRef = useRef<HTMLSpanElement>(null);
  const [over, setOver] = useState(false);
  useEffect(() => {
    const box = boxRef.current, meas = measRef.current;
    if (!box || !meas) return;
    const m = () => setOver(meas.scrollWidth > box.clientWidth + 1);
    m();
    const ro = new ResizeObserver(m);
    ro.observe(box);
    ro.observe(meas);
    return () => ro.disconnect();
  }, [text]);
  const run = active && over;
  return (
    <div ref={boxRef} className={`mq ${className ?? ''} ${run ? 'run' : ''}`} style={{ position: 'relative' }}>
      <span ref={measRef} aria-hidden
        style={{ position: 'absolute', visibility: 'hidden', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
        {text}
      </span>
      {run ? <span className="mq-in"><span>{text}</span><span>{text}</span></span> : text}
    </div>
  );
}

/* 최소한의 YT IFrame API 타입 */
interface YTPlayer {
  loadVideoById: (id: string) => void;
  cueVideoById: (id: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  setVolume: (v: number) => void;
  destroy: () => void;
}
declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, opts: unknown) => YTPlayer; PlayerState: { ENDED: number } };
    onYouTubeIframeAPIReady?: () => void;
  }
}

// 곡 목록 픽토그램 (리스트 줄 + 음표) — 색은 CSS에서 currentColor(--bgm-ic) 연동
const ListIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M21 15V6" />
    <circle cx="18.5" cy="15.5" r="2.5" />
    <path d="M16 6H3" /><path d="M12 12H3" /><path d="M12 18H3" />
  </svg>
);

/* ARCH 디자인(시안 B · 주파수 다이얼) 아이콘 — 면(fill) 아이콘, 색은 currentColor */
const DI = {
  prev: <svg viewBox="0 0 24 24"><path d="M6 5h2.2v14H6zM19 5v14L9 12z" /></svg>,
  play: <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>,
  pause: <svg viewBox="0 0 24 24"><path d="M7 5h3.4v14H7zM13.6 5H17v14h-3.4z" /></svg>,
  next: <svg viewBox="0 0 24 24"><path d="M15.8 5H18v14h-2.2zM5 5v14l10-7z" /></svg>,
  list: <svg viewBox="0 0 24 24"><path d="M4 6h16v1.8H4zm0 5.1h16v1.8H4zm0 5.1h10v1.8H4z" /></svg>,
  fold: <svg viewBox="0 0 24 24"><path d="M7 6l6 6-6 6M12 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>,
  x: <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>,
};
/* 주파수판 — 87.5~108.5MHz. 곡마다 채널 하나씩 고르게 나눠 준다(곡이 하나면 98.0) */
const FM_LO = 87.5, FM_SPAN = 21;
const chFreq = (i: number, n: number) => (n > 1 ? 88.1 + (i * 19.8) / (n - 1) : 98);
const fmPos = (f: number) => ((f - FM_LO) / FM_SPAN) * 100;
const RULER_TICKS = Array.from({ length: 41 }, (_, k) => 88 + k * 0.5);
const RULER_LABELS = [88, 92, 96, 100, 104, 108];
const pad2 = (n: number) => String(n).padStart(2, '0');

export function BgmPlayer() {
  const { state } = useBgm();
  const { tracks, settings } = state;
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [volume, setVolume] = useState(settings.volume);
  // 접기 상태 — 방문자별 기억 (4.1)
  const [folded, setFolded] = useState(false);
  // 모바일 — 평소엔 오른쪽 가장자리의 작은 탭만, 누르면 오른쪽에서 패널이 밀려 나온다 (v2.0 사용자 요청)
  const [mOpen, setMOpen] = useState(false);
  const playerRef = useRef<YTPlayer | null>(null);
  const readyRef = useRef(false);       // onReady 이후에만 playVideo가 실제 동작 (그 전엔 무시됨)
  const startedRef = useRef(false);     // 한 번이라도 실제 재생 시작됨 — 첫 재생은 loadVideoById 경로 필수
  const rootRef = useRef<HTMLDivElement>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const volRef = useRef<HTMLDivElement>(null);
  const idxRef = useRef(0);
  idxRef.current = idx;
  const track = tracks[idx] ?? tracks[0];

  useEffect(() => { setVolume(settings.volume); playerRef.current?.setVolume(settings.volume); }, [settings.volume]);

  useEffect(() => {
    try { setFolded(localStorage.getItem('ohome.bgm.fold') === '1'); } catch { /* 무시 */ }
  }, []);
  useEffect(() => {
    if (!mOpen) return;
    const close = (e: Event) => { if (!rootRef.current?.contains(e.target as Node)) { setMOpen(false); setListOpen(false); } };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [mOpen]);
  const isMobile = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 620px)').matches;
  const setFold = (v: boolean) => {
    setFolded(v);
    setListOpen(false);
    try { localStorage.setItem('ohome.bgm.fold', v ? '1' : '0'); } catch { /* 무시 */ }
  };

  // YT API 로드 + 플레이어 생성
  useEffect(() => {
    if (!settings.enabled || tracks.length === 0) return;
    let cancelled = false;
    const create = () => {
      if (cancelled || !holderRef.current || playerRef.current) return;
      playerRef.current = new window.YT!.Player(holderRef.current, {
        width: 0, height: 0,
        videoId: tracks[0].videoId,
        playerVars: { controls: 0, disablekb: 1 },
        events: {
          onReady: () => {
            readyRef.current = true;
            // 자동 재생이 무장된 상태(첫 상호작용이 플레이어 준비보다 먼저)면 바로 시작
            if (armedRef.current) {
              armedRef.current = false;
              playAtRef.current(idxRef.current);
            }
          },
          onStateChange: (e: { data: number }) => {
            // 1=재생, 2=일시정지, 0=종료 — 버퍼링(3)·큐(5) 같은 과도 상태는 무시
            if (e.data === 0) {
              nextRef.current(); // 곡 종료 → 반복/다음 곡 (셔플 지원)
            } else if (e.data === 1) {
              startedRef.current = true;
              setPlaying(true);
            } else if (e.data === 2) {
              setPlaying(false);
            } else if (e.data === -1) {
              // 미시작(재생이 정책에 막힌 경우 포함) — "재생 중인 척" 하지 않기
              // (정상 시작 시에도 -1→3→1로 지나가므로 잠깐 ▶로 보였다가 1에서 복구됨)
              setPlaying(false);
              startedRef.current = false;
            }
          },
        },
      });
    };
    if (window.YT?.Player) create();
    else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); create(); };
      if (!document.getElementById('yt-iframe-api')) {
        const s = document.createElement('script');
        s.id = 'yt-iframe-api';
        s.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(s);
      }
    }
    return () => {
      cancelled = true;
      readyRef.current = false;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // 디자인(기본 ↔ ARCH)이 바뀌면 플레이어를 담는 칸도 새로 그려지므로 다시 만든다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.enabled, tracks.length > 0, settings.skin === 'arch']);

  const playAt = (i: number) => {
    const t = tracks[i];
    if (!t || !playerRef.current) { setIdx(i); return; }
    setIdx(i);
    startedRef.current = true;
    // loadVideoById는 로드 + 즉시 재생 — 큐만 된 첫 영상의 playVideo()가 무시되는
    // 유튜브 IFrame 이슈를 피하기 위해 첫 재생도 반드시 이 경로를 탄다
    playerRef.current.loadVideoById(t.videoId);
    playerRef.current.setVolume(volume);
    playerRef.current.playVideo();
    setPlaying(true); // 버튼 즉시 반영 (이벤트는 보정용)
  };
  const playAtRef = useRef(playAt);
  playAtRef.current = playAt;

  const next = () => {
    if (tracks.length === 0) return;
    const cur = idxRef.current;
    let n: number;
    if (settings.shuffle && tracks.length > 1) {
      do { n = Math.floor(Math.random() * tracks.length); } while (n === cur);
    } else {
      n = cur + 1;
      if (n >= tracks.length) {
        if (!settings.repeat) { setPlaying(false); return; }
        n = 0;
      }
    }
    playAt(n);
  };
  const nextRef = useRef(next);
  nextRef.current = next;

  // 입장 자동 재생 (4.1) — 브라우저 정책상 완전 자동재생은 불가하므로
  // 방문자의 "첫 상호작용(클릭/키)"과 동시에 재생을 시작 (1회만)
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const armedRef = useRef(false);
  useEffect(() => {
    if (!settings.autoplay || !settings.enabled || tracks.length === 0) return;
    const fire = (ev: Event) => {
      remove();
      // 플레이어 자체를 조작하는 클릭(재생/이전/다음 등)은 버튼 핸들러에 맡김 —
      // 여기서 먼저 재생을 시작하면 곧이어 오는 버튼 click이 "일시정지"로 뒤집힘
      if (rootRef.current?.contains(ev.target as Node)) return;
      if (playingRef.current) return;
      if (readyRef.current && playerRef.current) {
        // 첫 재생은 loadVideoById 경로 (큐 상태 playVideo 무시 이슈 회피)
        playAtRef.current(idxRef.current);
      } else {
        // 플레이어 준비 전(onReady 이전)에는 재생 명령이 무시됨 — 준비되는 즉시 재생하도록 무장
        armedRef.current = true;
      }
    };
    const remove = () => {
      window.removeEventListener('pointerdown', fire, true);
      window.removeEventListener('keydown', fire, true);
    };
    window.addEventListener('pointerdown', fire, true);
    window.addEventListener('keydown', fire, true);
    return remove;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.autoplay, settings.enabled, tracks.length]);

  const prev = () => playAt((idxRef.current - 1 + tracks.length) % tracks.length);

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (playing) {
      playerRef.current.pauseVideo();
      setPlaying(false); // 버튼 즉시 반영
    } else if (!readyRef.current) {
      armedRef.current = true; // 준비 전이면 무장 — onReady에서 즉시 재생
    } else if (!startedRef.current) {
      playAt(idxRef.current); // 첫 재생 — 큐 상태 playVideo 무시 이슈 회피
    } else {
      // 일시정지 후 재개 — 위치 유지를 위해 playVideo
      playerRef.current.setVolume(volume);
      playerRef.current.playVideo();
      setPlaying(true);
    }
  };

  const onVolDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    const set = (clientX: number) => {
      const r = volRef.current!.getBoundingClientRect();
      const v = Math.round(Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * 100);
      setVolume(v);
      playerRef.current?.setVolume(v);
    };
    set(e.clientX);
    const mv = (ev: PointerEvent) => set(ev.clientX);
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
  };

  // ARCH 볼륨 손잡이 — 오른쪽·위로 끌면 커지고 왼쪽·아래로 끌면 작아진다
  const onKnobDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const sx = e.clientX, sy = e.clientY, sv = volume;
    const mv = (ev: PointerEvent) => {
      const v = Math.round(Math.min(100, Math.max(0, sv + (ev.clientX - sx - (ev.clientY - sy)) * 0.7)));
      setVolume(v);
      playerRef.current?.setVolume(v);
    };
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
  };
  const stepVol = (d: number) => {
    const v = Math.min(100, Math.max(0, volume + d));
    setVolume(v);
    playerRef.current?.setVolume(v);
  };

  // 곡 목록 — 바깥을 누르면 닫힌다
  useEffect(() => {
    if (!listOpen) return;
    const close = (e: Event) => { if (!rootRef.current?.contains(e.target as Node)) setListOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [listOpen]);

  if (!settings.enabled || tracks.length === 0) return null;

  const holder = (
    <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}>
      <div ref={holderRef} />
    </div>
  );

  /* ═══ ARCH 디자인 — 시안 B · FREQUENCY DIAL (v2.0 사용자 확정) ═══
     곡마다 채널(CH.01~) · 주파수판 바늘이 지금 곡 자리로 미끄러진다 · 큰 동그란 재생 버튼 · 은빛 곡 이름.
     접으면 동그란 다이얼 하나(재생 중엔 바늘이 돈다) · 모바일은 오른쪽 아래 다이얼 → 누르면 카드가 펼쳐진다.
     재생 로직은 기본 디자인과 같은 것을 쓰고 화면만 다르다. 스타일은 bgmDial.css */
  if (settings.skin === 'arch') {
    const n = tracks.length;
    const cur = Math.min(idx, n - 1);
    const left = settings.position === 'bl';
    const pickOnRuler = (e: React.MouseEvent<HTMLDivElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      const f = FM_LO + ((e.clientX - r.left) / r.width) * FM_SPAN;
      let best = 0;
      for (let i = 1; i < n; i++) if (Math.abs(chFreq(i, n) - f) < Math.abs(chFreq(best, n) - f)) best = i;
      playAt(best);
    };
    return (
      <div ref={rootRef}
        className={`bgm-d ${folded ? 'folded' : ''} ${left ? 'is-left' : ''} ${mOpen ? 'm-open' : ''} ${playing ? 'is-playing' : ''}`}>
        <link rel="stylesheet" href={ARCH_FONTS} precedence="default" />
        {holder}
        {/* 접힘(PC) · 닫힘(모바일) — 동그란 다이얼 */}
        <button type="button" className="bd-dial" aria-label="BGM 펼치기" aria-expanded={mOpen} data-tip="펼치기"
          onClick={e => {
            e.stopPropagation();
            if (isMobile()) { setMOpen(true); setListOpen(false); } else setFold(false);
          }}>
          <i />
        </button>
        <div className="bd-card">
          <div className="bd-side">
            <button type="button" className={listOpen ? 'on' : ''} data-tip="BGM 리스트" aria-label="BGM 리스트"
              onClick={e => { e.stopPropagation(); setListOpen(o => !o); }}>{DI.list}</button>
            <button type="button" className={`bd-fold ${left ? 'l' : ''}`} data-tip="접기" aria-label="접기"
              onClick={e => { e.stopPropagation(); setFold(true); }}>{DI.fold}</button>
            <button type="button" className="bd-x" aria-label="BGM 닫기"
              onClick={e => { e.stopPropagation(); setMOpen(false); setListOpen(false); }}>{DI.x}</button>
          </div>
          <div className="bd-info">
            <div className="bd-ch"><em>CH.{pad2(cur + 1)}</em> · {chFreq(cur, n).toFixed(1)} MHz</div>
            {/* 흐르는 글씨는 제목만 — 설명은 항상 말줄임 */}
            <Marquee className="bd-tt" text={track?.title ?? ''} active={playing} />
            {track?.desc && <div className="bd-desc">{track.desc}</div>}
          </div>
          <div className="bd-ctl">
            <button type="button" onClick={prev} data-tip="이전" aria-label="이전">{DI.prev}</button>
            <button type="button" className="pp" onClick={togglePlay} data-tip={playing ? '일시정지' : '재생'}
              aria-label={playing ? '일시정지' : '재생'}>{playing ? DI.pause : DI.play}</button>
            <button type="button" onClick={next} data-tip="다음" aria-label="다음">{DI.next}</button>
          </div>
          <div className="bd-row">
            {/* 주파수판 — 누르면 가장 가까운 채널(곡)로 */}
            <div className="bd-ruler" onClick={pickOnRuler} data-tip="채널 고르기">
              <svg viewBox="0 0 210 20" preserveAspectRatio="none" aria-hidden="true">
                {RULER_TICKS.map(f => {
                  const x = (f - FM_LO) * 10, h = f % 4 === 0 ? 12 : f % 1 === 0 ? 7 : 4;
                  return <line key={f} x1={x} x2={x} y1={20 - h} y2={20} className={f % 4 === 0 ? 'mj' : ''} vectorEffect="non-scaling-stroke" />;
                })}
              </svg>
              {RULER_LABELS.map(f => <span key={f} className="lb" style={{ left: `${fmPos(f)}%` }}>{f}</span>)}
              {tracks.map((t, i) => <b key={t.id} className={`mk ${i === cur ? 'on' : ''}`} style={{ left: `${fmPos(chFreq(i, n))}%` }} />)}
              <i className="nd" style={{ left: `${fmPos(chFreq(cur, n))}%` }} />
            </div>
            {/* 볼륨 손잡이 — 끌어서 돌린다 (모바일은 기기 음량 버튼으로 — 숨김) */}
            <div className="bd-knob" role="slider" tabIndex={0} aria-label="볼륨" aria-valuemin={0} aria-valuemax={100} aria-valuenow={volume}
              data-tip={`볼륨 ${volume}`} onPointerDown={onKnobDrag}
              onKeyDown={e => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); stepVol(5); }
                if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); stepVol(-5); }
              }}>
              <i style={{ transform: `rotate(${-135 + volume * 2.7}deg)` }} />
            </div>
          </div>
        </div>
        {/* 채널 목록 — 카드 위로 펼쳐진다 */}
        {listOpen && (
          <div className="bd-list">
            <header>CHANNELS <i>·</i> {pad2(n)}</header>
            {tracks.map((t, i) => (
              <button type="button" key={t.id} className={`it ${i === cur ? 'on' : ''}`}
                onClick={() => { playAt(i); setListOpen(false); }}>
                <span>CH {pad2(i + 1)}</span>
                <span>{chFreq(i, n).toFixed(1)}</span>
                <span className="nm"><b>{t.title}</b>{t.desc && <small>{t.desc}</small>}</span>
                {i === cur && <em>ON AIR</em>}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`bgm ${folded ? 'folded' : ''} ${settings.position === 'bl' ? 'bgm-left' : ''} ${mOpen ? 'm-open' : ''} ${playing ? 'is-playing' : ''}`}
      style={settings.position === 'bl' ? { right: 'auto', left: 20 } : undefined}
      onClick={() => { if (folded && !isMobile()) setFold(false); }}
      data-tip={folded ? '펼치기' : undefined}
    >
      {/* 숨겨진 유튜브 플레이어 */}
      {holder}
      {/* 모바일 전용 탭 — 패널 왼쪽에 붙어 있어 닫혀 있을 땐 화면 끝에 조금만 보인다 (PC에선 숨김) */}
      <button type="button" className="bgm-tab" aria-label={mOpen ? 'BGM 닫기' : 'BGM 열기'} aria-expanded={mOpen}
        onClick={e => { e.stopPropagation(); setMOpen(o => !o); setListOpen(false); }}>
        <span className="eq"><i /><i /><i /></span>
      </button>
      <div className="disc" style={{ animationPlayState: playing ? 'running' : 'paused' }} />
      <div className="title">
        {/* 흐르는 글씨는 제목만 — 설명은 항상 말줄임 (정신없지 않게) */}
        <Marquee className="tt" text={track?.title ?? ''} active={playing} />
        {track?.desc && <div className="mq">{track.desc}</div>}
      </div>
      {/* 모바일 패널 닫기 (PC에선 숨김) */}
      <button type="button" className="bgm-x" aria-label="BGM 닫기"
        onClick={e => { e.stopPropagation(); setMOpen(false); setListOpen(false); }}>×</button>
      <div className="ctrl">
        <button onClick={prev} data-tip="이전">◂◂</button>
        <button onClick={togglePlay} data-tip={playing ? '일시정지' : '재생'}>{playing ? '❚❚' : '▶'}</button>
        <button onClick={next} data-tip="다음">▸▸</button>
        <button className="lst" data-tip="BGM 리스트" onClick={e => { e.stopPropagation(); setListOpen(o => !o); }}>
          <ListIcon />
        </button>
      </div>
      <div className="vol" ref={volRef} onPointerDown={onVolDrag} data-tip={`볼륨 ${volume}`}>
        <i style={{ width: `${volume}%` }} />
      </div>
      {/* 접기 — 디스크만 남김 (4.1) · 화살표는 접히는 방향(화면 가장자리 쪽) */}
      <button className="fold-btn" data-tip="접기" onClick={e => { e.stopPropagation(); setFold(true); }}>
        {settings.position === 'bl' ? '«' : '»'}
      </button>
      {/* 곡 목록 팝업 (v1.9) — 바깥 클릭 시 닫힘 */}
      {listOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: -1 }} onClick={() => setListOpen(false)} />
          <div className="bgm-list on">
            <div className="h">BGM LIST</div>
            {tracks.map((t, i) => (
              <div key={t.id} className={`it ${i === idx ? 'on' : ''}`}
                onClick={() => { playAt(i); setListOpen(false); }}>
                <b>{t.title}</b><small>{t.desc}</small>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
