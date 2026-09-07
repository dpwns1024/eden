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

  // 불필요한 하단 여백 제거: 위젯들의 실제 y좌표 + height 중 가장 아래쪽 값 추출
  const calculateTotalHeight = () => {
    let maxBottom = 0;

    headerWidgets.forEach(w => {
      // ay(y좌표)가 없으면 0, h(높이)가 없으면 기본 위젯 높이 사용
      const top = w.ay ?? 0;
      const height = w.h ?? (w.type === 'menu' || (w.type as string) === 'menu_pc' ? 44 : 0);
      const bottom = top + height;
      if (bottom > maxBottom) {
        maxBottom = bottom;
      }
    });

    // 아무 값도 없거나 0일 때는 auto로 처리하여 여백 최소화
    return maxBottom;
  };

  const headerHeight = calculateTotalHeight();

  return (
    <header 
      className="global-header-wrap page" 
      onClick={() => setCtx(null)}
      style={{ margin: 0, padding: 0 }}
    >
      <div className="main-wrap" style={{ width: '100%', margin: '0 auto', padding: 0 }}>
        <div
          className="main-grid abs"
          style={{
            position: 'relative',
            width: '100%',
            // calculated 높이가 0보다 크면 그 높이 지정, 아니면 fit-content로 하단 밀착
            height: headerHeight > 0 ? `${headerHeight}px` : 'auto',
            marginBottom: 0,
            paddingBottom: 0,
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
