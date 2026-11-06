'use client';
/**
 * YJHM 세계의 머리 (lib/worldStore.ts) — 메인(YjhmHome)과 다른 페이지 맨 위(GlobalHeader)가 같이 쓴다.
 * 메인은 「필름」 1면 (사용자 확정 시안 Z3) — 위는 작은 GOLD MEDALIST 줄 + 큰 Hong Yejun. + 오른쪽 번호 · 날짜(2026.03.05 고정) · 로그인,
 * 메뉴는 화면 아래 폴더 바(YjhmDock — 가운데에 한마디가 걸린다). 다른 페이지는 한 줄 제호.
 * 로그인 영역은 상단 바(TopBar)가 member 자리로 옮겨 그린다 (lib/htmlSlots.ts). 모양은 yjhm.css.
 */
import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { SlotMenu } from '@/components/main/HtmlSlots';
import { setMemberSlot, clearMemberSlot } from '@/lib/htmlSlots';
import { YJ_FONTS } from './yjhmFonts';

function useMemberRef() {
  const memberRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = memberRef.current;
    if (!el) return;
    setMemberSlot(el);
    return () => clearMemberSlot(el);
  }, []);
  return memberRef;
}

/** front — 메인 1면 머리에 찍을 번호 (없으면 한 줄 제호) */
export function YjhmHeader({ front }: { front?: { no: string } }) {
  const memberRef = useMemberRef();
  const fonts = <link rel="stylesheet" href={YJ_FONTS} precedence="default" />;

  if (front) {
    return (
      <header className="yj-fh">
        {fonts}
        <div className="yj-fh-l">
          <span className="yj-fh-k">GOLD MEDALIST — 10M AIR PISTOL</span>
          <Link className="yj-fh-n" href="/">Hong Yejun<i>.</i></Link>
        </div>
        <div className="yj-fh-r">
          <span>{front.no}</span>
          <span>2026.03.05</span>
          <div className="yj-member" ref={memberRef} />
        </div>
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

/** 메인 아래 폴더 바 — 메뉴를 반씩 양쪽에 두고, 가운데 위 경계에 한마디(이름 딱지 + 흰 띠)를 건다 */
export function YjhmDock({ quote }: { quote?: { who: string; text: string } }) {
  return (
    <div className="yj-dock">
      {quote && (
        <p className="yj-quote"><b className="yj-tape">{quote.who}</b><span><span>{quote.text}</span></span></p>
      )}
      <nav className="yj-dock-menu" aria-label="메뉴"><SlotMenu split /></nav>
    </div>
  );
}
