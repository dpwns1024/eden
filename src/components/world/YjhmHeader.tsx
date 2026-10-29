'use client';
/**
 * YJHM 세계의 머리 (lib/worldStore.ts) — 메인(YjhmHome)과 다른 페이지 맨 위(GlobalHeader)가 같이 쓴다.
 * 「The Shooting Daily」 트랙 1면 제호 — 메인은 1면 제호(상단 띠 · 속보 띠 · 외곽선 DAILY 제호 + 스티커 · 알약 메뉴),
 * 다른 페이지는 한 줄 제호. 로그인 영역은 상단 바(TopBar)가 member 자리로 옮겨 그린다 (lib/htmlSlots.ts). 모양은 yjhm.css.
 */
import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { SlotMenu } from '@/components/main/HtmlSlots';
import { setMemberSlot, clearMemberSlot } from '@/lib/htmlSlots';

/** YJHM 화면들이 쓰는 웹폰트 (Archivo Black · Archivo Narrow · Rubik Bubbles · Noto Sans KR) */
const YJ_FONTS = 'https://fonts.googleapis.com/css2?family=Archivo+Black&family=Archivo+Narrow:ital,wght@0,500;0,700;1,700&family=Rubik+Bubbles&family=Noto+Sans+KR:wght@400;500;700;900&display=swap';

/** 스티커 옆 별 딱지 */
const STAR = Array.from({ length: 10 }, (_, i) => {
  const r = i % 2 ? 13 : 29, a = (Math.PI * i) / 5 - Math.PI / 2;
  return `${(30 + r * Math.cos(a)).toFixed(1)},${(31 + r * Math.sin(a)).toFixed(1)}`;
}).join(' ');

/** front — 메인 1면 제호에 찍을 날짜 · 호수 · 스티커 이름 · 속보 띠 글 (없으면 한 줄 제호) */
export function YjhmHeader({ front }: { front?: { date: string; issue: string; names: string[]; ticker: string[] } }) {
  const memberRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = memberRef.current;
    if (!el) return;
    setMemberSlot(el);
    return () => clearMemberSlot(el);
  }, []);
  const fonts = <link rel="stylesheet" href={YJ_FONTS} precedence="default" />;

  if (front) {
    const [a, b] = front.names;
    // 띠는 끝없이 흐르도록 같은 글을 두 번 잇는다
    const run = front.ticker.map((t, i) => <span key={i}>{i ? `✦ ${t}` : t}</span>);
    return (
      <header className="yj-front">
        {fonts}
        <div className="yj-strip">
          <span>{front.date}</span>
          <span className="yj-strip-mid">NO.{front.issue} · YJHM EDITION</span>
          <div className="yj-member" ref={memberRef} />
        </div>
        <div className="yj-ticker yj-blk" aria-hidden="true">
          <div>{run}<span>✦</span>{run}<span>✦</span></div>
        </div>
        <div className="yj-masthead">
          <Link className="yj-mast" href="/">
            <b>THE SHOOTING</b>
            <span>
              <b className="yj-out">DAILY</b>
              <small>사 격 일 보<br />두 사람의 기록만 싣습니다</small>
            </span>
          </Link>
          <div className="yj-sticker" style={{ '--yj-n': Math.max(3, a.length + (b ? 1 : 0), b?.length ?? 0) } as React.CSSProperties}
            role="img" aria-label={`${a}${b ? ` × ${b}` : ''} 스티커`}>
            <svg viewBox="0 0 60 60" aria-hidden="true"><polygon points={STAR} /></svg>
            <b>{a}{b ? '×' : ''}</b>
            {b && <b>{b}</b>}
            <small>SHOOTER × INTERPRETER</small>
          </div>
        </div>
        <nav className="yj-menu" aria-label="지면 안내"><SlotMenu /></nav>
      </header>
    );
  }
  return (
    <header className="yj-top">
      {fonts}
      <Link className="yj-brand" href="/">THE SHOOTING <span className="yj-out">DAILY</span><small>사 격 일 보</small></Link>
      <nav className="yj-menu" aria-label="지면 안내"><SlotMenu /></nav>
      <div className="yj-member" ref={memberRef} />
    </header>
  );
}
