'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAppPathname } from '@/lib/routeAlias';
import { useMainStore, WidgetConf, widgetLabel } from '@/lib/mainStore';
import { WidgetFrame } from '@/components/main/WidgetFrame';
import { renderWidget } from '@/components/main/widgets';
import { ConfirmModal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useMainZoom } from '@/lib/useMainZoom';
import { useSiteHeader } from '@/lib/htmlPageStore';
import { useHtmlSlots, stripScripts } from '@/components/main/HtmlSlots';
import { useWorld } from '@/lib/worldStore';
import { YjhmHeader } from '@/components/world/YjhmHeader';

const EDITABLE = ['banner', 'menu_pc', 'menu'];

export function GlobalHeader() {
  const pathname = useAppPathname();
  const [mounted, setMounted] = useState(false);
  const { state, editOn, updateWidget, removeWidget } = useMainStore();
  const [wrapEl, setWrapEl] = useState<HTMLElement | null>(null);
  useMainZoom(wrapEl, editOn);
  const toast = useToast();
  const [ctx, setCtx] = useState<{ id: string; x: number; y: number } | null>(null);
  const [delAsk, setDelAsk] = useState<WidgetConf | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  /* 공통 상단 HTML (v2.0 사용자 요청) — 설정해 두면 메인이 아닌 모든 페이지 맨 위에 이것을 그린다.
     메인 HTML의 상단(로고·메뉴·로그인)을 다른 페이지에서도 그대로 이어 보이게 하려는 것 —
     그때는 배너·메뉴 위젯 대신 이것만 나온다 (lib/htmlPageStore.ts) */
  const [siteHead] = useSiteHeader();
  const headHtml = stripScripts(siteHead).trim();
  const headRef = useRef<HTMLDivElement>(null);
  const headSlots = useHtmlSlots(headRef, [headHtml, pathname, mounted]);
  const { world } = useWorld();   // 페어별 홈 (lib/worldStore.ts) — YJHM이면 ARCH 공통 상단 대신 YJHM 머리

  if (!mounted || !pathname || pathname === '/' || pathname === '') {
    return null;
  }

  if (world === 'yjhm') return <div className="yj-head-wrap"><YjhmHeader /></div>;

  if (headHtml) {
    return (
      <>
        <div ref={headRef} className="site-head-html" dangerouslySetInnerHTML={{ __html: headHtml }} />
        {headSlots}
      </>
    );
  }

  const enabled = state.widgets.filter(w => w.enabled);
  const topBanner = enabled.filter(w => w.type === 'banner');
  const topMenu = enabled.filter(w => w.type === 'menu' || (w.type as string) === 'menu_pc');

  const headerWidgets = [...topBanner, ...topMenu];

  if (headerWidgets.length === 0) return null;

  const getWidgetClass = (type: string) => {
    if (type === 'menu') return 'wgt-hide-pc';
    if (type === 'menu_pc') return 'wgt-hide-mobile';
    return undefined;
  };

  const mOrder = (id: string) => {
    const list = state.mobileOrder || [];
    const i = list.indexOf(id);
    return i === -1 ? 99 : i;
  };

  // MainPage.tsx의 canvasH 계산 방식과 100% 동일하게 배너 높이 계산
  // 메뉴 위젯 제외, 배너(topBanner)의 ay + h 기준 계산 후 + 40
  const absMode = enabled.length > 0 && enabled.every(w => w.ax != null && w.ay != null);
  
  const canvasH = absMode
    ? Math.max(300, ...topBanner.map(w => (w.ay ?? 0) + (w.h ?? 200))) + 40
    : undefined;

  return (
    <section ref={setWrapEl} className="page page-main-wrap" onClick={() => setCtx(null)} style={{ paddingBottom: 0 }}>
      <div
        className={`main-grid ${absMode ? 'abs' : ''}`}
        style={{ marginTop: 0, ...(canvasH ? { height: canvasH } : {}) }}
      >
        {headerWidgets.map(w => (
          <WidgetFrame
            key={w.id}
            conf={w}
            mobileOrder={mOrder(w.id)}
            className={getWidgetClass(w.type)}
            onCtx={(id, x, y) => {
              if (state.widgets.find(v => v.id === id)?.z == null) {
                const zs = enabled.map(v => v.z ?? 0);
                updateWidget(id, { z: Math.max(...zs, 0) + 1 });
              }
              setCtx({ id, x, y });
            }}
          >
            {renderWidget(w)}
          </WidgetFrame>
        ))}
      </div>

      {ctx && (() => {
        const me = enabled.find(w => w.id === ctx.id);
        if (!me) return null;
        return (
          <div className="ctx-menu on" style={{ left: ctx.x, top: ctx.y }} onClick={e => e.stopPropagation()}>
            <div className="ctx-ttl">{widgetLabel(state.widgets, me)}</div>
            <div className="sep" />
            {EDITABLE.includes(me.type as any) && (
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('ohome-widget-edit', { detail: { id: me.id } }));
                  setCtx(null);
                }}
              >
                설정
              </button>
            )}
            <button
              className="danger"
              onClick={() => {
                setDelAsk(me);
                setCtx(null);
              }}
            >
              위젯 삭제
            </button>
          </div>
        );
      })()}

      <ConfirmModal
        open={delAsk !== null}
        title={`「${delAsk ? widgetLabel(state.widgets, delAsk) : ''}」 위젯을 삭제할까요?`}
        body="위젯이 삭제됩니다."
        onClose={() => setDelAsk(null)}
        buttons={[
          {
            label: 'DELETE',
            kind: 'accent',
            onClick: () => {
              if (delAsk) removeWidget(delAsk.id);
              setDelAsk(null);
              toast('위젯이 삭제되었습니다');
            },
          },
          { label: 'CANCEL', kind: 'ghost', onClick: () => setDelAsk(null) },
        ]}
      />
    </section>
  );
}
