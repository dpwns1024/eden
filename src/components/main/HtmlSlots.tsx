'use client';
// HTML 블록 안의 메뉴 자리 (lib/htmlSlots.ts) — 사이트 메뉴를 사용자 HTML 디자인 안에 그린다.
// 모양은 일부러 거의 비워 둔다(globals.css의 .oh-menu 기본값만) — 색·글꼴·간격은 HTML 쪽 CSS가 정한다.
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useBoards } from '@/lib/boardStore';
import { useMenuSettings, buildMenu, boardEntries } from '@/lib/menuStore';
import { useSections, sectionMenuEntries } from '@/lib/sectionStore';
import { useCustomLinks, linkEntries } from '@/lib/linkStore';

/**
 * 생성되는 구조 — HTML 쪽 CSS에서 이 클래스로 꾸민다
 *   nav.oh-menu
 *     a.oh-item(.on)                     단독 메뉴 (HOME 포함)
 *     div.oh-grp(.open)(.on)
 *       button.oh-item                   상위 메뉴 — 마우스를 올리거나 누르면 펼침
 *       div.oh-sub > a.oh-link(.on)      하위 메뉴
 */
export function SlotMenu() {
  const pathname = usePathname();
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
              : <Link key={c.href} className={`oh-link${isOn(c.href) ? ' on' : ''}`} href={c.href}>{c.label}</Link>))}
          </div>
        </div>
      ) : m.href && (ext(m.href)
        ? <a key={m.href} className="oh-item" href={m.href} target="_blank" rel="noreferrer">{m.label}</a>
        : <Link key={m.href} className={`oh-item${isOn(m.href) ? ' on' : ''}`} href={m.href}>{m.label}</Link>)))}
    </nav>
  );
}
