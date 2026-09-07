/* src/components/main/widgets.tsx */
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

/* --- 스토어 및 훅 불러오기 --- */
import { useMenuSettings, buildMenu, boardEntries, sectionMenuEntries, linkEntries } from '@/stores/menu';
import { useBoards } from '@/stores/board';
import { useAuth } from '@/stores/auth';
import { useSections } from '@/stores/section';
import { useCustomLinks } from '@/stores/customLink';
import { WidgetConf, WIDGET_META } from '@/types/widget';

/* --- 하위 위젯 컴포넌트 임포트 --- */
import { BannerWidget } from './BannerWidget';
import { MemoWidget } from './MemoWidget';
import { DiaryWidget } from './DiaryWidget';
import { LatestWidget } from './LatestWidget';
import { DdayWidget } from './DdayWidget';
import { TodoWidget } from './TodoWidget';
import { UpcomingWidget } from './UpcomingWidget';
import { FreeTextWidget } from './FreeTextWidget';
import { DecoWidget } from './DecoWidget';
import { MemoBoardWidget } from './MemoBoardWidget';
import { ApplyWidget } from './ApplyWidget';

/* ---------- 메뉴리스트 (모바일/PC 공용 렌더러) ---------- */
export function MenuListWidget({ conf }: { conf?: WidgetConf }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [menuSet, , menuLoaded] = useMenuSettings();
  const { boards, loaded: boardsLoaded } = useBoards();
  const { user: wUser, isAdmin: wIsAdmin } = useAuth();
  const { map: wSecMap } = useSections();
  const { links: wLinks } = useCustomLinks();

  const isPc = conf?.type === 'menu_pc';

  return (
    <div className={`panel menu-list ${isPc ? 'wgt-menu-pc' : 'wgt-menu'}`}>
      {(menuLoaded && boardsLoaded
        ? buildMenu(
            menuSet,
            [...boardEntries(boards), ...sectionMenuEntries(wSecMap), ...linkEntries(wLinks)],
            { loggedIn: !!wUser, isAdmin: wIsAdmin }
          )
        : []
      ).map((m) =>
        m.children ? (
          <div key={m.label} className={`mgrp ${open === m.label ? 'open' : ''}`}>
            <a onClick={() => setOpen((o) => (o === m.label ? null : m.label))}>{m.label}</a>
            <div className="msub">
              {m.children.map((c) => (
                <a key={c.href} onClick={() => router.push(c.href)}>
                  {c.label}
                </a>
              ))}
            </div>
          </div>
        ) : (
          <a key={m.label} onClick={() => router.push(m.href!)}>
            {m.label}
          </a>
        )
      )}
    </div>
  );
}

/* ---------- 타입별 위젯 렌더러 스위치 ---------- */
export function renderWidget(conf: WidgetConf) {
  if (!conf || !conf.type) return null;

  // TypeScript 객체 인덱싱 타입 에러 방지 안전 처리
  const metaMap = WIDGET_META as Record<string, { title?: string }>;

  switch (conf.type) {
    case 'banner':
      return <BannerWidget conf={conf} />;
    case 'menu':
    case 'menu_pc': // PC 메뉴 분기 추가
      return <MenuListWidget conf={conf} />;
    case 'memo':
      return <MemoWidget conf={conf} />;
    case 'diary':
      return <DiaryWidget />;
    case 'latest':
      return <LatestWidget />;
    case 'dday':
      return <DdayWidget conf={conf} />;
    case 'todo':
      return <TodoWidget conf={conf} />;
    case 'upcoming':
      return <UpcomingWidget />;
    case 'freetext':
      return <FreeTextWidget conf={conf} />;
    case 'deco':
      return <DecoWidget conf={conf} />;
    case 'memoboard':
      return <MemoBoardWidget />;
    case 'apply':
      return <ApplyWidget conf={conf} />;
    default:
      return (
        <div className="panel widget">
          <h4>{metaMap[conf.type]?.title ?? conf.type}</h4>
        </div>
      );
  }
}

export default renderWidget;
