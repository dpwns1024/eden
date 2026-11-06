'use client';
/**
 * YJHM 세계의 머리 · 폴더 바 (lib/worldStore.ts) — 메인(YjhmHome)과 다른 페이지(GlobalHeader)가 똑같은 것을 쓴다.
 * 「메뉴 들어가면 메인이랑 아예 다르다」(사용자 지적) — 그래서 다른 페이지도 메인과 같은 머리(GOLD MEDALIST 줄 + Hong Yejun.)와
 * 같은 맨 아래 폴더 바를 쓴다. 다른 페이지 머리는 제호만 조금 작다(.sub).
 * 오른쪽 위: 세계 전환 · 로그인(TopBar가 member 자리로 옮겨 그린다 — lib/htmlSlots.ts) → 번호 · 날짜 → BGM(yjhm.css가 이 자리로 옮긴다).
 * 폴더 바는 폴더가 모두 왼쪽 · 오른쪽 칸은 비워 둔다(사용자가 다른 것을 넣을 자리). 모양은 yjhm.css.
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

/** 2026.03.05부터 센 날 (그날이 1일 — 사용자 요청) */
const DDAY_FROM = new Date(2026, 2, 5);
const dday = (now: Date) => Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - DDAY_FROM.getTime()) / 86400000) + 1;

/** main — 메인 1면 (제호가 크다). 아니면 다른 페이지 (제호만 작고 나머지는 같다) */
export function YjhmHeader({ main }: { main?: boolean }) {
  const memberRef = useMemberRef();
  return (
    <header className={`yj-fh${main ? '' : ' sub'}`}>
      <link rel="stylesheet" href={YJ_FONTS} precedence="default" />
      <div className="yj-fh-l">
        <span className="yj-fh-k">GOLD MEDALIST — 10M AIR PISTOL</span>
        <Link className="yj-fh-n" href="/">Hong Yejun<i>.</i></Link>
      </div>
      <div className="yj-fh-r">
        <div className="yj-member" ref={memberRef} />
        <span className="yj-fh-meta">NO.{String(dday(new Date())).padStart(4, '0')}<i>·</i>2026.03.05</span>
      </div>
    </header>
  );
}

/** 맨 아래 폴더 바 — 폴더는 모두 왼쪽 (사용자 요청), 오른쪽 칸은 비워 둔다.
 *  메인에서는 가운데 위 경계에 한마디(이름 딱지 + 흰 띠)를 건다 — 관리자는 눌러서 고친다 */
export function YjhmDock({ quote, onEditQuote }: { quote?: { who: string; text: string }; onEditQuote?: () => void }) {
  const body = quote
    ? <><b className="yj-tape">{quote.who}</b><span><span>{quote.text}</span></span></>
    : <><b className="yj-tape">예준</b><span><span>한마디를 적어 주세요</span></span></>;
  return (
    <div className="yj-dock">
      {onEditQuote
        ? <button type="button" className="yj-quote edit" onClick={onEditQuote} data-tip="한마디 고치기">{body}</button>
        : quote && <p className="yj-quote">{body}</p>}
      <nav className="yj-dock-menu" aria-label="메뉴"><SlotMenu /></nav>
    </div>
  );
}
