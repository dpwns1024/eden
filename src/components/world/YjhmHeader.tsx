'use client';
/**
 * YJHM 세계의 머리 · 폴더 바 (lib/worldStore.ts) — 메인(YjhmHome)과 다른 페이지(GlobalHeader)가 똑같은 것을 쓴다.
 * 「메뉴 들어가면 메인이랑 아예 다르다」(사용자 지적) — 그래서 다른 페이지도 메인과 같은 머리(GOLD MEDALIST 줄 + Hong Yejun.)와
 * 같은 맨 아래 폴더 바를 쓴다. 다른 페이지 머리는 제호만 조금 작다(.sub).
 * 오른쪽 위: 세계 전환 · 로그인(TopBar가 member 자리로 옮겨 그린다 — lib/htmlSlots.ts) → 번호 · 날짜 → BGM 한 줄(BgmPlayer가 bgm 자리로 옮겨 그린다).
 * 폴더 바는 폴더가 모두 왼쪽 · 오른쪽 칸은 비워 둔다(사용자가 다른 것을 넣을 자리). 모양은 yjhm.css.
 */
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SlotMenu, useMenuItems } from '@/components/main/HtmlSlots';
import { useAppPathname, toPublicHref } from '@/lib/routeAlias';
import { YJHM_PAGE } from '@/lib/yjhmNames';
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

/** 다른 페이지 머리 줄의 지금 메뉴 — 맨 아래 폴더 바에서 켜진 폴더의 번호 · 이름 (예: 02 · PEOPLE) */
function useSection(on: boolean) {
  const [sec, setSec] = useState<{ no: string; label: string } | null>(null);
  useEffect(() => {
    if (!on) return;
    const read = () => {
      const menu = document.querySelector('.yj-dock-menu .oh-menu');
      const items = menu ? [...menu.children] : [];
      const i = items.findIndex(el => el.matches('.oh-item.on, .oh-grp.on'));
      const item = i < 0 ? null : (items[i].matches('.oh-item') ? items[i] : items[i].querySelector('.oh-item'));
      const label = item?.textContent?.trim();
      setSec(prev => {
        const next = label ? { no: String(i + 1).padStart(2, '0'), label: label.toUpperCase() } : null;
        return prev?.no === next?.no && prev?.label === next?.label ? prev : next;
      });
    };
    read();
    const dock = document.querySelector('.yj-dock');
    const mo = new MutationObserver(read);
    if (dock) mo.observe(dock, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'], characterData: true });
    return () => mo.disconnect();
  }, [on]);
  return sec;
}

/** 머리 탭 (사용자 확정 시안 A3 — 「큰 메뉴 말고 누른 메뉴의 하위 메뉴가 뜨게」) — 맨 아래 폴더 바에서 고른 폴더의 하위 메뉴들.
 *  지금 주소가 들어 있는 폴더를 찾아 그 하위 메뉴를 탭으로, 단독 메뉴면 그것 하나. 상세 주소(/chars/…)도 앞부분으로 찾는다.
 *  같은 주소에 ?s= 만 다른 메뉴(PHOTO · B-CUT)는 주소 뒤 물음표까지 맞춰 지금 탭을 고른다 */
function useTabs() {
  const items = useMenuItems();
  const path = useAppPathname();
  const [search, setSearch] = useState('');
  useEffect(() => { setSearch(window.location.search); }, [path]);
  if (!items) return null;
  const base = (h: string) => h.split('?')[0];
  const inside = (h: string) => { const b = base(h); return b !== '/' && (path === b || path.startsWith(`${b}/`)); };
  const ext = (h: string) => /^https?:\/\//.test(h);
  const grp = items.find(m => m.children?.some(c => !ext(c.href) && inside(c.href)));
  const list = grp ? grp.children!.filter(c => !ext(c.href)) : items.filter(m => m.href && !ext(m.href) && inside(m.href)).map(m => ({ href: m.href!, label: m.label }));
  if (!list.length) return null;
  // 지금 탭 — 주소가 맞는 것 중 ?s= 까지 맞는 것, 없으면 물음표 없는 것
  const hits = list.filter(c => inside(c.href));
  const q = new URLSearchParams(search).get('s');
  const on = hits.find(c => new URLSearchParams(c.href.split('?')[1] ?? '').get('s') === q) ?? hits.find(c => !c.href.includes('?')) ?? hits[0];
  return list.map(c => ({ href: c.href, label: YJHM_PAGE[c.href] ?? c.label, on: c === on }));
}

/** main — 메인 1면 (큰 제호 · 오른쪽 위 전환/로그인 → 번호 · 날짜 → BGM).
 *  다른 페이지 — 얇은 머리 한 줄: 작은 제호 · 지금 폴더의 하위 메뉴 탭(시안 A3) …… BGM · 전환/로그인.
 *  지금 탭은 흰 종이(본문)와 붙어 있다 — 본문이 탭 아래 한 장의 흰 종이 위에 놓인다 (yjhm.css .tabbed).
 *  그 아래 본문 제목(ROSTER. 등)으로 바로 이어진다 (사용자 지적 — 「제호 · 메뉴 이름 · 제목이 똑같이 반복되고 여백도 넓어 난잡하다」) */
export function YjhmHeader({ main }: { main?: boolean }) {
  const memberRef = useSlotRef(setMemberSlot, clearMemberSlot);
  const bgmRef = useSlotRef(setBgmSlot, clearBgmSlot);
  const sec = useSection(!main);
  const tabs = useTabs();
  if (!main) {
    return (
      <header className={tabs ? 'yj-fh sub tabbed' : 'yj-fh sub'}>
        <link rel="stylesheet" href={YJ_FONTS} precedence="default" />
        <div className="yj-fh-l">
          <Link className="yj-fh-n" href="/">Hong Yejun<i>.</i></Link>
          {tabs ? (
            <nav className="yj-tabs" aria-label={sec ? `${sec.label} 하위 메뉴` : '하위 메뉴'}>
              {tabs.map((t, i) => (
                <Link key={t.href} href={toPublicHref(t.href)} className={t.on ? 'on' : undefined} aria-current={t.on ? 'page' : undefined}>
                  <b>{String(i + 1).padStart(2, '0')}</b>{t.label.toUpperCase()}
                </Link>
              ))}
            </nav>
          ) : sec && <span className="yj-fh-sec"><b>{sec.no}</b>{sec.label}</span>}
        </div>
        <div className="yj-fh-r">
          <div className="yj-bgm-slot" ref={bgmRef} />
          <div className="yj-member" ref={memberRef} />
        </div>
      </header>
    );
  }
  return (
    <header className="yj-fh">
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
