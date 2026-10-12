'use client';
// HTML 블록 안의 메뉴 자리 (lib/htmlSlots.ts) — 사이트 메뉴를 사용자 HTML 디자인 안에 그린다.
// 모양은 일부러 거의 비워 둔다(globals.css의 .oh-menu 기본값만) — 색·글꼴·간격은 HTML 쪽 CSS가 정한다.
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useAppPathname, toPublicHref } from '@/lib/routeAlias';
import { useAuth } from '@/lib/auth';
import { useBoards } from '@/lib/boardStore';
import { useMenuSettings, buildMenu, boardEntries } from '@/lib/menuStore';
import { useSections, sectionMenuEntries } from '@/lib/sectionStore';
import { useCustomLinks, linkEntries } from '@/lib/linkStore';
import { SLOT_ATTR, setMemberSlot, clearMemberSlot } from '@/lib/htmlSlots';

/** 사용자 HTML에서 스크립트만 걷어 낸다 — HTML 블록·HTML 페이지·공통 상단 공통 */
export const stripScripts = (h?: string) =>
  (h ? h.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') : '');

/**
 * 그려진 사용자 HTML 안의 자리(data-ohome)를 찾아 채운다 — 메뉴는 여기서 포털로 그리고,
 * 로그인 자리는 상단 바(TopBar)가 가져가도록 등록한다. HTML이 바뀌면 자리도 새로 생기므로 deps로 다시 찾는다.
 * 돌려준 노드를 컴포넌트 안 아무 데나 렌더하면 된다.
 */
export function useHtmlSlots(boxRef: React.RefObject<HTMLElement | null>, deps: React.DependencyList): React.ReactNode {
  const [menuSlots, setMenuSlots] = useState<Element[]>([]);
  useEffect(() => {
    const box = boxRef.current;
    setMenuSlots(box ? Array.from(box.querySelectorAll(`[${SLOT_ATTR}="menu"]`)) : []);
    const member = box?.querySelector(`[${SLOT_ATTR}="member"]`) ?? null;
    if (member) setMemberSlot(member);
    return () => { if (member) clearMemberSlot(member); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return menuSlots.map((el, i) => createPortal(<SlotMenu />, el, `menu-${i}`));
}

/**
 * 생성되는 구조 — HTML 쪽 CSS에서 이 클래스로 꾸민다
 *   nav.oh-menu
 *     a.oh-item(.on)                     단독 메뉴 (HOME 포함)
 *     div.oh-grp(.open)(.on)
 *       button.oh-item                   상위 메뉴 — 마우스를 올리거나 누르면 펼침
 *       div.oh-sub > a.oh-link(.on)      하위 메뉴
 */
export function SlotMenu() {
  const pathname = useAppPathname();
  const { user, isAdmin } = useAuth();
  const [menuSet, , menuLoaded] = useMenuSettings();
  const { boards, loaded: boardsLoaded } = useBoards();
  const { map: secMap } = useSections();
  const { links } = useCustomLinks();
  const [open, setOpen] = useState<string | null>(null);
  const ref = useRef<HTMLElement>(null);

  // 바깥을 누르거나 페이지를 옮기면 접는다
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => { if (!ref.current?.contains(e.target as Node)) setOpen(null); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  useEffect(() => { setOpen(null); }, [pathname]);
  // 펼친 하위 메뉴가 화면 밖으로 나가면 안쪽으로 당긴다 (v2.0 — 모바일에서 상위 메뉴 아래 가운데에 띄우면서
  // 화면 가장자리 메뉴의 상자가 잘렸다). 위치 이동은 애니메이션이 덮지 않게 transform 대신 margin으로
  useEffect(() => {
    const sub = ref.current?.querySelector<HTMLElement>('.oh-grp.open > .oh-sub');
    if (!sub) return;
    sub.style.marginLeft = '';
    const r = sub.getBoundingClientRect();
    const pad = 8;
    const shift = r.left < pad ? pad - r.left : r.right > window.innerWidth - pad ? window.innerWidth - pad - r.right : 0;
    if (shift) sub.style.marginLeft = `${Math.round(shift)}px`;
  }, [open]);

  if (!menuLoaded || !boardsLoaded) return <nav className="oh-menu" ref={ref} />;
  const items = [
    { label: 'HOME', href: '/' },
    ...buildMenu(menuSet, [...boardEntries(boards), ...sectionMenuEntries(secMap), ...linkEntries(links)],
      { loggedIn: !!user, isAdmin }),
  ];
  const isOn = (href: string) => href.split('?')[0] === pathname;
  const ext = (href: string) => /^https?:\/\//.test(href);

  return (
    <nav className="oh-menu" ref={ref}>
      {items.map(m => (m.children ? (
        <div key={m.label} className={`oh-grp${open === m.label ? ' open' : ''}${m.children.some(c => isOn(c.href)) ? ' on' : ''}`}>
          <button type="button" className="oh-item" aria-expanded={open === m.label}
            onClick={() => setOpen(o => (o === m.label ? null : m.label))}>{m.label}</button>
          <div className="oh-sub">
            {m.children.map(c => (ext(c.href)
              ? <a key={c.href} className="oh-link" href={c.href} target="_blank" rel="noreferrer">{c.label}</a>
              : <Link key={c.href} className={`oh-link${isOn(c.href) ? ' on' : ''}`} href={toPublicHref(c.href)}>{c.label}</Link>))}
          </div>
        </div>
      ) : m.href && (ext(m.href)
        ? <a key={m.href} className="oh-item" href={m.href} target="_blank" rel="noreferrer">{m.label}</a>
        : <Link key={m.href} className={`oh-item${isOn(m.href) ? ' on' : ''}`} href={toPublicHref(m.href)}>{m.label}</Link>)))}
    </nav>
  );
}
