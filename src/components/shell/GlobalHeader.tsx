'use client';

import React, { useState, useEffect, useRef } from 'react';
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

  const containerRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const enabled = state.widgets.filter(w => w.enabled);
  const topBanner = enabled.filter(w => w.type === 'banner');
  const topMenu = enabled.filter(w => w.type === 'menu' || (w.type as string) === 'menu_pc');
  const headerWidgets = [...topBanner, ...topMenu];

  const absMode = headerWidgets.length > 0 && headerWidgets.every(w => w.ax != null && w.ay != null);

  // 화면에 실제 렌더링된 요소의 하단 Y좌표를 측정하여 헤더 높이로 설정
  useEffect(() => {
    if (!mounted || !containerRef.current || !absMode) return;

    const measure = () => {
      const el = containerRef.current;
      if (!el) return;

      const children = Array.from(el.children) as HTMLElement[];
      if (children.length === 0) return;

      let maxBottom = 0;
      const containerTop = el.getBoundingClientRect().top;

      children.forEach(child => {
        const rect = child.getBoundingClientRect();
        const bottom = rect.bottom - containerTop;
        if (bottom > maxBottom) {
          maxBottom = bottom;
        }
      });

      if (maxBottom > 0) {
        setContentHeight(Math.ceil(maxBottom) + 8);
      }
    };

    measure();

    const ro = new ResizeObserver(() => measure());
    ro.observe(containerRef.current);
    Array.from(containerRef.current.children).forEach(c => ro.observe(c));

    const imgs = containerRef.current.querySelectorAll('img');
    imgs.forEach(img => {
      if (!img.complete) {
        img.addEventListener('load', measure, { once: true });
      }
    });

    return () => ro.disconnect();
  }, [mounted, pathname, headerWidgets, absMode]);

  if (!mounted || !pathname || pathname === '/' || pathname === '') {
    return null;
  }

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
        ref={containerRef}
        className={`main-grid ${absMode ? 'abs' : ''}`}
        style={{
          position: 'relative',
          width: '100%',
          marginTop: 0,
          ...(absMode && contentHeight ? { height: contentHeight } : {}),
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
