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

/** front — 메인 1면 제호에 찍을 날짜 · 호수 · 속보 띠 글 (없으면 한 줄 제호) */
export function YjhmHeader({ front }: { front?: { date: string; issue: string; ticker: string[] } }) {
  const memberRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = memberRef.current;
    if (!el) return;
    setMemberSlot(el);
    return () => clearMemberSlot(el);
  }, []);
  const fonts = <link rel="stylesheet" href={YJ_FONTS} precedence="default" />;

  if (front) {
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
          {/* 스티커 — 영문 YJ× / HM 고정 (Rubik Bubbles에 한글이 없다) · 조준선 말풍선(통역 × 사격) · 과녁 마이크 헤드셋 딱지 */}
          <div className="yj-sticker" role="img" aria-label="YJ × HM 스티커 — 조준선 말풍선과 통역 헤드셋 딱지">
            <svg className="yj-deco yj-deco-talk" viewBox="0 0 84 76" aria-hidden="true">
              <path d="M16 4h52a12 12 0 0 1 12 12v28a12 12 0 0 1-12 12H38l-14 14 3-14H16A12 12 0 0 1 4 44V16A12 12 0 0 1 16 4z" fill="#f2f1ec" stroke="#607ca0" strokeWidth="4.5" strokeLinejoin="round" />
              <circle cx="42" cy="30" r="13" fill="none" stroke="#2c3e57" strokeWidth="3.5" />
              <path d="M42 11v8M42 41v8M23 30h8M53 30h8" stroke="#2c3e57" strokeWidth="3.5" strokeLinecap="round" />
              <circle cx="42" cy="30" r="4.5" fill="#607ca0" />
            </svg>
            <svg className="yj-deco yj-deco-spark" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#607ca0" strokeWidth="3" strokeLinecap="round"><path d="M4 12h5M15 12h5M12 4v5" /></svg>
            <svg className="yj-deco yj-deco-phone" viewBox="0 0 80 84" aria-hidden="true">
              <path d="M14 46a26 26 0 0 1 52 0" fill="none" stroke="#607ca0" strokeWidth="6" strokeLinecap="round" />
              <rect x="6" y="40" width="16" height="24" rx="7" fill="#607ca0" stroke="#2c3e57" strokeWidth="3" />
              <rect x="58" y="40" width="16" height="24" rx="7" fill="#607ca0" stroke="#2c3e57" strokeWidth="3" />
              <path d="M14 64c0 10 8 14 18 14" fill="none" stroke="#2c3e57" strokeWidth="3.5" strokeLinecap="round" />
              <circle cx="40" cy="77" r="6.5" fill="#f2f1ec" stroke="#2c3e57" strokeWidth="3" />
              <circle cx="40" cy="77" r="2.5" fill="#607ca0" />
            </svg>
            <b>YJ×</b>
            <b>HM</b>
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
