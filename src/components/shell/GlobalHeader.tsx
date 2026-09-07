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

  // 마운트 전(SSR/초기 로딩)이거나 메인 페이지('/')일 경우 상단 헤더 출력 완전히 차단
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

  // 메뉴 위젯은 실제 버튼 영역 높이만 차지하므로 50px로 타이트하게 계산
  const getWidgetHeight = (w: WidgetConf) => {
    const isMenu = w.type === 'menu' || (w.type as string) === 'menu_pc';
    if (isMenu) {
      return Math.min(w.h ?? 50, 50);
    }
    return w.h ?? 200;
  };

  // 헤더 영역 캔버스 높이 계산 (메뉴 아래 불필요한 공백 제거)
  const headerCanvasH = absMode
    ? Math.max(...headerWidgets.map(w => (w.ay ?? 0) + getWidgetHeight(w))) + 8
    : undefined;

  return (
    <header
      className="global-header-wrap page"
      onClick={() => setCtx(null)}
      style={{
        width: '100%',
        margin: '0 auto 8px auto',
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
          ...(headerCanvasH ? { height: headerCanvasH } : {}),
        }}
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
