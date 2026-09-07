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

  // [수정 포인트 1] 서브 페이지에서 높이 값이 튀거나 찌그러지지 않도록 안전하게 고정
  const calculateTotalHeight = () => {
    let maxBottom = 0;

    headerWidgets.forEach(w => {
      const top = w.ay ?? 0;
      const isMenu = w.type === 'menu' || (w.type as string) === 'menu_pc';
      const height = isMenu ? 44 : (w.h ?? 280); 
      const bottom = top + height;
      if (bottom > maxBottom) {
        maxBottom = bottom;
      }
    });

    return maxBottom > 0 ? maxBottom : 300;
  };

  const headerHeight = calculateTotalHeight();

  return (
    <header
      className="global-header-wrap page"
      onClick={() => setCtx(null)}
      style={{
        width: '100%',
        margin: '0 auto',
        padding: 0,
        position: 'relative',
        zIndex: 10,
        display: 'block',
        clear: 'both',
      }}
    >
      {/* [수정 포인트 2] overflow: 'hidden'을 추가하여 서브 페이지에서 내부 요소가 튀어나가 위치가 어긋나는 현상 원천 차단 */}
      <div
        className="main-grid abs"
        style={{
          position: 'relative',
          width: '100%',
          height: `${headerHeight}px`,
          minHeight: `${headerHeight}px`,
          marginTop: 0,
          padding: 0,
          overflow: 'hidden', 
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
