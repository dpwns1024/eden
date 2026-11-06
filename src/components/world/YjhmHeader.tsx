'use client';
/**
 * YJHM 세계의 머리 · 폴더 바 (lib/worldStore.ts) — 메인(YjhmHome)과 다른 페이지(GlobalHeader)가 똑같은 것을 쓴다.
 * 「메뉴 들어가면 메인이랑 아예 다르다」(사용자 지적) — 그래서 다른 페이지도 메인과 같은 머리(GOLD MEDALIST 줄 + Hong Yejun.)와
 * 같은 맨 아래 폴더 바를 쓴다. 다른 페이지 머리는 제호만 조금 작다(.sub).
 * 오른쪽 위: 세계 전환 · 로그인(TopBar가 member 자리로 옮겨 그린다 — lib/htmlSlots.ts) → 번호 · 날짜 → BGM 한 줄(BgmPlayer가 bgm 자리로 옮겨 그린다).
 * 폴더 바는 폴더가 모두 왼쪽 · 오른쪽 칸은 비워 둔다(사용자가 다른 것을 넣을 자리). 모양은 yjhm.css.
 */
import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { SlotMenu } from '@/components/main/HtmlSlots';
import { setMemberSlot, clearMemberSlot, setBgmSlot, clearBgmSlot } from '@/lib/htmlSlots';
import { YJ_FONTS } from './yjhmFonts';

function useSlotRef(set: (el: Element) => void, clear: (el: Element) => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    set(el);
    return () => clear(el);
  }, [set, clear]);
  return ref;
}

/** 2026.03.05부터 센 날 (그날이 1일 — 사용자 요청) */
const DDAY_FROM = new Date(2026, 2, 5);
const dday = (now: Date) => Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - DDAY_FROM.getTime()) / 86400000) + 1;

/** 다른 페이지 제목 위 작은 줄 — 맨 아래 폴더 바에서 지금 켜진 폴더의 번호 · 이름 (예: 02 — PEOPLE).
 *  게시판마다 제목 줄을 고치지 않고 <html>에 글자를 걸어 두면 yjhm.css가 제목(.page-head) 위에 그린다 */
function useSectionLabel(on: boolean) {
  useEffect(() => {
    if (!on) return;
    const root = document.documentElement;
    const set = () => {
      const menu = document.querySelector('.yj-dock-menu .oh-menu');
      const items = menu ? [...menu.children] : [];
      const i = items.findIndex(el => el.matches('.oh-item.on, .oh-grp.on'));
      const item = i < 0 ? null : (items[i].matches('.oh-item') ? items[i] : items[i].querySelector('.oh-item'));
      const label = item?.textContent?.replace(/["\\]/g, '').trim();
      if (!label) { root.classList.remove('yj-has-sec'); root.style.removeProperty('--yj-sec'); return; }
      root.style.setProperty('--yj-sec', `"${String(i + 1).padStart(2, '0')} — ${label.toUpperCase()}"`);
      root.classList.add('yj-has-sec');
    };
    set();
    const dock = document.querySelector('.yj-dock');
    const mo = new MutationObserver(set);
    if (dock) mo.observe(dock, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'], characterData: true });
    return () => { mo.disconnect(); root.classList.remove('yj-has-sec'); root.style.removeProperty('--yj-sec'); };
  }, [on]);
}

/** main — 메인 1면 (제호가 크다). 아니면 다른 페이지 (제호만 작고 나머지는 같다) */
export function YjhmHeader({ main }: { main?: boolean }) {
  const memberRef = useSlotRef(setMemberSlot, clearMemberSlot);
  const bgmRef = useSlotRef(setBgmSlot, clearBgmSlot);
  useSectionLabel(!main);
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
        <div className="yj-bgm-slot" ref={bgmRef} />
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
