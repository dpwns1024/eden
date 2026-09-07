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

  // 메뉴 버튼의 Y 위치(ay) + 메뉴 높이(44px)를 기준으로 실제 헤더 높이 계산
  const getCalculatedHeaderHeight = () => {
    if (!absMode) return undefined;

    const menuYList = topMenu.map(w => w.ay ?? 0);
    if (menuYList.length > 0) {
      const maxMenuY = Math.max(...menuYList);
      return maxMenuY + 44; // 메뉴 버튼 하단선 + 여백 4px
    }

    // 메뉴가 없을 경우 배너 높이 기본값 적용
    const bannerYList = topBanner.map(w => (w.ay ?? 0) + 200);
    return bannerYList.length > 0 ? Math.max(...bannerYList) : undefined;
  };

  const headerCanvasH = getCalculatedHeaderHeight();

  // WidgetFrame에 574px 같은 과도한 높이가 전달되지 않도록 높이값 재조정
  const getAdjustedConf = (w: WidgetConf): WidgetConf => {
    const isMenu = w.type === 'menu' || (w.type as string) === 'menu_pc';
    if (isMenu) {
      return { ...w, h: 44 };
    }
    if (w.type === 'banner') {
      const menuY = topMenu.length > 0 ? (topMenu[0].ay ?? 200) : 200;
      return { ...w, h: menuY };
    }
    return w;
  };

  return (
    <header
      className="global-header-wrap page"
      onClick={() => setCtx(null)}
      style={{
        width: '100%',
        margin: '0 auto',
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
          ...(headerCanvasH ? { height: `${headerCanvasH}px` } : {}),
        }}
      >
        {headerWidgets.map(w => {
          const adjustedConf = getAdjustedConf(w);
          return (
            <WidgetFrame
              key={w.id}
              conf={adjustedConf}
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
