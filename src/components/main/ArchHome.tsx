'use client';
/**
 * 메인 화면 (v2.0 사용자 요청) — 환경설정의 HTML 블록으로 그리던 ARCH 메인을 코드로 옮겼다.
 * 모양은 그 HTML 그대로(상단 정보 띠 · 헤더 · 히어로 · 푸터), 스타일은 archHome.css.
 * 메뉴는 이 자리에서 바로 그리고, 로그인 영역은 상단 바(TopBar)가 member 자리로 옮겨 그린다 (lib/htmlSlots.ts).
 */
import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { SlotMenu } from '@/components/main/HtmlSlots';
import { setMemberSlot, clearMemberSlot } from '@/lib/htmlSlots';
import { toPublicHref } from '@/lib/routeAlias';
import './archHome.css';

const FONTS = 'https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500&family=Saira+Semi+Condensed:wght@300;400;500;600&family=JetBrains+Mono:wght@300;400;500&family=Noto+Sans+KR:wght@300;400;500&family=Mrs+Saint+Delafield&display=swap';

/** ABOUT ARCH 버튼이 여는 곳 — ARCH 메뉴(HTML 페이지) */
const ABOUT_HREF = '/page';

/** 방패 표식 — 헤더 · 구분선 · 푸터 */
function Mark() {
  return (
    <svg className="mk" viewBox="0 0 200 200" aria-hidden="true">
      <path d="M100 18 L164 40 V102 C164 140 136 166 100 182 C64 166 36 140 36 102 V40 Z" fill="none" stroke="url(#arS)" strokeWidth="3" />
      <path d="M100 30 L154 48 V102 C154 134 130 156 100 170 C70 156 46 134 46 102 V48 Z" fill="none" stroke="rgba(220,230,240,.25)" strokeWidth="1" />
      <path d="M64 136 L100 62 L136 136" fill="none" stroke="url(#arS)" strokeWidth="7" strokeLinejoin="miter" />
      <rect x="22" y="112" width="156" height="1.6" fill="url(#arL)" />
      <path d="M100 40 L102.5 50 L100 60 L97.5 50 Z" fill="#fff" />
      <circle cx="100" cy="50" r="9" fill="url(#arG)" />
    </svg>
  );
}

/** 가는 선 ARCH 글자 — 헤더 · 푸터 */
function Wordmark() {
  return (
    <svg className="wm" viewBox="-44 -24 558 132" role="img" aria-label="ARCH">
      <path d="M0 100 L45 0 L90 100 M136 100 V0 H178 A25 25 0 0 1 178 52 H136 M174 52 L210 100 M343.2 16.5 A50 50 0 1 0 343.2 83.5 M390 0 V100 M470 0 V100 M390 50 H470"
        fill="none" stroke="url(#arS)" strokeWidth="4.5" strokeLinejoin="miter" />
      <rect x="-40" y="62.6" width="550" height="1.4" fill="url(#arL)" />
      <circle cx="45" cy="-14" r="2.2" fill="#fff" />
    </svg>
  );
}

/** 조준 원의 눈금 — 210°~330°, 6°마다 · 다섯 칸마다 긴 눈금 */
const TICKS = Array.from({ length: 21 }, (_, i) => {
  const a = ((210 + i * 6) * Math.PI) / 180, long = i % 5 === 0, r2 = long ? 144 : 138;
  const p = (r: number) => [(600 + r * Math.cos(a)).toFixed(1), (218 + r * Math.sin(a)).toFixed(1)];
  const [x1, y1] = p(133), [x2, y2] = p(r2);
  return { x1, y1, x2, y2, long };
});

/** 큰 ARCH 글자 — 글자마다 윤곽이 그려지는 시작 시각(d)이 다르다 */
const LETTERS: { d: string; paths: string[] }[] = [
  { d: '0.00s', paths: ['M0 160 L78 0 L122 0 L200 160 L152 160 L100 52 L48 160 Z', 'M80 106 H120 L126 120 H74 Z'] },
  { d: '0.18s', paths: ['M236 0 H280 V160 H236 Z', 'M288 0 H372 L400 28 V68 L372 96 H288 V58 H356 V38 H288 Z', 'M318 104 H364 L404 160 H356 Z'] },
  { d: '0.36s', paths: ['M590 0 H470 L436 34 V126 L470 160 H590 V116 H484 V44 H590 Z'] },
  { d: '0.54s', paths: ['M626 0 H670 V160 H626 Z', 'M746 0 H790 V160 H746 Z', 'M678 60 H738 V100 H678 Z'] },
];

function HeroLogo() {
  return (
    <svg className="ar-logo" viewBox="0 0 1200 400" role="img" aria-label="ARCH">
      <defs>
        <linearGradient id="arS" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" /><stop offset=".3" stopColor="#dfe6ee" /><stop offset=".5" stopColor="#8a96a3" />
          <stop offset=".62" stopColor="#eef2f6" /><stop offset=".85" stopColor="#a7b1bd" /><stop offset="1" stopColor="#6a7581" />
        </linearGradient>
        <linearGradient id="arL" x1="0" x2="1">
          <stop offset="0" stopColor="#dce6f0" stopOpacity="0" /><stop offset=".14" stopColor="#dce6f0" stopOpacity=".45" />
          <stop offset=".72" stopColor="#e8f0f8" stopOpacity=".8" /><stop offset=".82" stopColor="#fff" />
          <stop offset=".92" stopColor="#dce6f0" stopOpacity=".35" /><stop offset="1" stopColor="#dce6f0" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="arV" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dce6f0" stopOpacity="0" /><stop offset=".2" stopColor="#dce6f0" stopOpacity=".55" />
          <stop offset=".8" stopColor="#dce6f0" stopOpacity=".55" /><stop offset="1" stopColor="#dce6f0" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="arC" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dce6f0" stopOpacity=".6" /><stop offset="1" stopColor="#dce6f0" stopOpacity=".1" />
        </linearGradient>
        <linearGradient id="arK" x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="arG">
          <stop offset="0" stopColor="#fff" /><stop offset=".22" stopColor="#e2f1ff" />
          <stop offset=".55" stopColor="#9cc8ff" stopOpacity=".35" /><stop offset="1" stopColor="#9cc8ff" stopOpacity="0" />
        </radialGradient>
        <clipPath id="arCl"><rect x="110" y="228" width="980" height="28" /></clipPath>
        {/* 글자를 비스듬히 가르는 틈 */}
        <mask id="arMs" maskUnits="userSpaceOnUse" x="-200" y="-200" width="1400" height="600">
          <rect x="-200" y="-200" width="1400" height="600" fill="#fff" />
          <path d="M-60 176 L860 -24" stroke="#000" strokeWidth="7" />
        </mask>
      </defs>
      <circle className="ring2" cx="600" cy="218" r="152" fill="none" stroke="rgba(220,230,240,.1)" strokeDasharray="2 9" />
      <g className="rt">
        <circle cx="600" cy="218" r="133" fill="none" stroke="url(#arC)" strokeWidth="1" />
        {TICKS.map((t, i) => <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} className={t.long ? 'b' : undefined} />)}
      </g>
      <rect className="axl" x="599.5" y="12" width="1" height="376" fill="url(#arV)" />
      <g className="axd" fill="#e6edf4">
        <path d="M600 26 L603.2 44 L600 62 L596.8 44 Z" /><path d="M600 348 L603.2 366 L600 384 L596.8 366 Z" />
      </g>
      <rect className="hzl" x="110" y="241.4" width="980" height="1.2" fill="url(#arL)" />
      <g clipPath="url(#arCl)"><rect className="stk" x="0" y="240.6" width="220" height="2.8" fill="url(#arK)" /></g>
      <g className="lts">
        <g transform="translate(173.4 155.6) scale(1.08)" mask="url(#arMs)">
          {LETTERS.map(l => (
            <g key={l.d} style={{ '--d': l.d } as React.CSSProperties}>
              {l.paths.map(d => <path key={d} className="lt" pathLength={1} d={d} />)}
            </g>
          ))}
        </g>
      </g>
      <path className="lk l" d="M136 130 H116 V356 H136" fill="none" stroke="#9cc8ff" strokeWidth="2.4" />
      <path className="lk r" d="M1064 130 H1084 V356 H1064" fill="none" stroke="#9cc8ff" strokeWidth="2.4" />
      <g className="gl">
        <circle cx="1026.6" cy="242.0" r="30" fill="url(#arG)" />
        <ellipse cx="1026.6" cy="242.0" rx="70" ry="1.4" fill="#fff" opacity=".7" />
        <path d="M1026.6 212.0 L1029.6 239.0 L1056.6 242.0 L1029.6 245.0 L1026.6 272.0 L1023.6 245.0 L996.6 242.0 L1023.6 239.0 Z" fill="#fff" />
      </g>
    </svg>
  );
}

export function ArchHome() {
  // 로그인 영역 자리 — 상단 바가 알림 · 프로필을 이 안으로 옮겨 그린다
  const memberRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = memberRef.current;
    if (!el) return;
    setMemberSlot(el);
    return () => clearMemberSlot(el);
  }, []);

  return (
    <div className="arx ah-main">
      <link rel="stylesheet" href={FONTS} precedence="default" />
      <div className="ar-wrap">

        {/* 상단 정보 띠 */}
        <div className="ar-util">
          <span><i className="ar-dot" />AEGIS · MOBILE CITADEL</span>
          <span className="mid">POSITION <b>UNTRACEABLE</b><em>/</em>SEA STATE <b>3</b><em>/</em>DRIFT <b>2.4 KN</b></span>
          <span>ALL SECTORS <b className="ok">NOMINAL</b></span>
        </div>

        {/* 헤더 — 로고 · 메뉴 · 로그인 */}
        <header className="ar-top">
          <Link className="ar-brand" href="/">
            <Mark />
            <span><Wordmark /><small>ARCANE RESPONSE CONTROL HUB</small></span>
          </Link>
          <div className="ar-menu"><SlotMenu /></div>
          <div className="ar-member" ref={memberRef} />
        </header>

        {/* 히어로 */}
        <section className="ar-hero">
          <div className="ar-h-side l"><span>N 00°00′00″</span><span>E 000°00′00″</span><i /><b>SIGNAL — MASKED</b></div>
          <div className="ar-h-side r"><span>ESTABLISHED BY</span><b>ARCH-PRIMA</b><i /><span>HQ — THE AEGIS</span></div>
          <HeroLogo />
          <p className="ar-tag">ARCANE RESPONSE CONTROL HUB</p>
          <div className="ar-div"><i /><Mark /><i /></div>
          <h1 className="ar-h1">우리는 인류의 <b>유일한 방패</b>이자,<br />평범한 세상에는 속할 수 없는 <b>이방인</b>이다.</h1>
          <p className="ar-h-en">THE SOLE SHIELD OF HUMANITY — STRANGERS TO THE ORDINARY WORLD</p>
          <div className="ar-cta">
            <Link className="ar-btn p" href={toPublicHref(ABOUT_HREF)}>ABOUT ARCH<span>→</span></Link>
          </div>
        </section>

        {/* 푸터 */}
        <footer className="ar-foot">
          <div className="fb"><Mark /><Wordmark /></div>
          <span className="kr">본 페이지는 ARCH 내부 열람용 자료이며 무단 전재 및 재배포를 금합니다. · HQ — THE AEGIS</span>
          <span>© ARCH · ARCANE RESPONSE CONTROL HUB<br />SESSION 0x2F7A // END OF PAGE</span>
        </footer>

      </div>
    </div>
  );
}
