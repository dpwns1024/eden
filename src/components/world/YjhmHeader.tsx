'use client';
/**
 * YJHM 세계의 머리 (lib/worldStore.ts) — 메인(YjhmHome)과 다른 페이지 맨 위(GlobalHeader)가 같이 쓴다.
 * 로고 · 메뉴 · 로그인 자리. 로그인 영역은 상단 바(TopBar)가 member 자리로 옮겨 그린다 (lib/htmlSlots.ts).
 * 디자인은 자리만 잡은 것 — 레퍼런스가 오면 yjhm.css에서 바꾼다.
 */
import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { SlotMenu } from '@/components/main/HtmlSlots';
import { setMemberSlot, clearMemberSlot } from '@/lib/htmlSlots';

export function YjhmHeader() {
  const memberRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = memberRef.current;
    if (!el) return;
    setMemberSlot(el);
    return () => clearMemberSlot(el);
  }, []);
  return (
    <header className="yj-top">
      <Link className="yj-brand" href="/">YJHM<small>our ordinary days</small></Link>
      <div className="yj-menu"><SlotMenu /></div>
      <div className="yj-member" ref={memberRef} />
    </header>
  );
}
