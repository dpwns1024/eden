'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useMainStore, WidgetConf, widgetLabel } from '@/lib/mainStore';
import { WidgetFrame } from '@/components/main/WidgetFrame';
import { renderWidget } from '@/components/main/widgets';
import { ConfirmModal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

const EDITABLE = ['banner', 'menu_pc', 'menu'];

export function GlobalHeader() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { state, updateWidget, removeWidget } = useMainStore();
  const toast = useToast();
  const [ctx, setCtx] = useState<{ id: string; x: number; y: number } | null>(null);
  const [delAsk, setDelAsk] = useState<WidgetConf | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !pathname || pathname === '/' || pathname === '') {
    return null;
  }

  const enabled = state.widgets.filter(w => w.enabled);
  const topBanner = enabled.filter(w => w.type === 'banner');
  const topMenu = enabled.filter(w => w.type === 'menu' || (w.type as string) === 'menu_pc');

  const headerWidgets = [...topBanner, ...topMenu];

  if (headerWidgets.length === 0) return null;

  const getWidgetClass = (type: string) => {
    if (type === 'menu') return 'wgt-hide-pc';
    if (type === 'menu_pc') return 'wgt-hide-mobile';
    return '';
  };

  const mOrder = (id: string) => {
    const list = state.mobileOrder || [];
    const i = list.indexOf(id);
    return i === -1 ? 99 : i;
  };

  const absMode = headerWidgets.length > 0 && headerWidgets.every(w => w.ax != null && w.ay != null);

  // 메뉴 버튼 시작 Y 위치 및 하단 위치 측정
  const menuYList = topMenu.map(w => w.ay ?? 0);
  const minMenuY = menuYList.length > 0 ? Math.min(...menuYList) : null;

  const menuBottomList = topMenu.map(w => (w.ay ?? 0) + (w.h && w.h < 100 ? w.h : 44));
  const maxMenuBottom = menuBottomList.length > 0 ? Math.max(...menuBottomList) : null;

  // 헤더 전체 높이 (메뉴 하단선 + 여백 8px)
  const getHeaderHeight = () => {
    if (!absMode) return undefined;
    if (maxMenuBottom !== null) {
      return maxMenuBottom + 8;
    }
    if (topBanner.length > 0) {
      return Math.max(...topBanner.map(w => (w.ay ?? 0) + (w.h ?? 200)));
    }
    return undefined;
  };

  const headerCanvasH = getHeaderHeight();

  // 배너가 길어져서 메뉴를 침범하지 않도록 높이를 메뉴 위치에 맞게 자동 커스텀
  const getAdjustedConf = (w: WidgetConf): WidgetConf => {
    if (w.type === 'banner' && minMenuY !== null) {
      const bannerTop = w.ay ?? 0;
      // 메뉴 시작선 + 16px (메인 페이지처럼 살짝 겹치는 정도)
      const targetH = Math.max(minMenuY - bannerTop + 16, 100);
      return { ...w, h: targetH };
    }
    if (w.type === 'menu' || (w.type as string) === 'menu_pc') {
      return { ...w, h: w.h && w.h < 100 ? w.h : 44 };
    }
    return w;
  };

  return (
    <header
      className="global-header-wrap page"
      onClick={() => setCtx(null)}
      style={{
        width: '100%',
        margin: '0 auto 8px auto',
        padding: 0,
        paddingBottom: 0,
        position: 'relative',
        zIndex: 100,
      }}
    >
      <div
        className={`main-grid ${absMode ? 'abs' : ''}`}
        style={{
          position: 'relative',
          width: '100%',
          marginTop: 0,
          padding: 0,
          paddingBottom: 0,
          ...(headerCanvasH ? { height: `${headerCanvasH}px` } : {}),
        }}
      >
        {headerWidgets.map(w => {
          const confToUse = getAdjustedConf(w);
          return (
            <WidgetFrame
              key={w.id}
              conf={confToUse}
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
          );
        })}
      </div>

      {ctx && (() => {
        const me = enabled.find(w => w.id === ctx.id);
        if (!me) return null;
        return (
          <div
            className="ctx-menu on"
            style={{
              position: 'fixed',
              left: ctx.x,
              top: ctx.y,
              zIndex: 9999,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="ctx-ttl">{widgetLabel(state.widgets, me)}</div>
            <div className="sep" />
            {EDITABLE.includes(me.type as string) && (
              <button
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent('ohome-widget-edit', {
                      detail: { id: me.id },
                    })
                  );
                  setCtx(null);
                }}
              >
                설정
              </button>
            )}
            {!me.fixed && (
              <button
                className="danger"
                onClick={() => {
                  setDelAsk(me);
                  setCtx(null);
                }}
              >
                위젯 삭제
              </button>
            )}
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
    </header>
  );
}
