'use client';
/**
 * YJHM 세계의 머리 (lib/worldStore.ts) — 메인(YjhmHome)과 다른 페이지 맨 위(GlobalHeader)가 같이 쓴다.
 * 「The Shooting Daily」 신문 제호 — 메인은 1면 제호(상단 띠 · 큰 제호 · 지면 메뉴), 다른 페이지는 한 줄 제호.
 * 로그인 영역은 상단 바(TopBar)가 member 자리로 옮겨 그린다 (lib/htmlSlots.ts). 모양은 yjhm.css.
 */
import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { SlotMenu } from '@/components/main/HtmlSlots';
import { setMemberSlot, clearMemberSlot } from '@/lib/htmlSlots';

/** YJHM 화면들이 쓰는 웹폰트 (Oswald · Noto Serif KR · Noto Sans KR · IBM Plex Mono) */
const YJ_FONTS = 'https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Noto+Serif+KR:wght@400;600;900&family=Noto+Sans+KR:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap';

/** front — 메인 1면 제호에 찍을 날짜 · 호수 (없으면 한 줄 제호) */
export function YjhmHeader({ front }: { front?: { date: string; issue: string } }) {
  const memberRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = memberRef.current;
    if (!el) return;
    setMemberSlot(el);
    return () => clearMemberSlot(el);
  }, []);
  const fonts = <link rel="stylesheet" href={YJ_FONTS} precedence="default" />;

  if (front) {
    return (
      <header className="yj-front">
        {fonts}
        <div className="yj-strip">
          <span>{front.date}</span>
          <span className="yj-strip-mid">YJHM EDITION · NO. {front.issue}</span>
          <div className="yj-member" ref={memberRef} />
        </div>
        <Link className="yj-mast" href="/">
          <b>THE SHOOTING DAILY</b>
          <small>사 격 일 보 · 두 사람의 기록만 싣습니다</small>
        </Link>
        <nav className="yj-menu" aria-label="지면 메뉴"><SlotMenu /></nav>
      </header>
    );
  }
  return (
    <header className="yj-top">
      {fonts}
      <Link className="yj-brand" href="/">THE SHOOTING DAILY<small>사 격 일 보</small></Link>
      <nav className="yj-menu" aria-label="지면 메뉴"><SlotMenu /></nav>
      <div className="yj-member" ref={memberRef} />
    </header>
  );
}
