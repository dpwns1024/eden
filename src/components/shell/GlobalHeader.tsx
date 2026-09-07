'use client';

import React, { useState } from 'react';
import { useMainStore, WidgetConf, widgetLabel } from '@/lib/mainStore';
import { renderWidget } from '@/components/main/widgets';
import { ConfirmModal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

const EDITABLE = ['banner', 'menu_pc', 'menu'];

export function GlobalHeader() {
  const { state, removeWidget } = useMainStore();
  const toast = useToast();
  const [ctx, setCtx] = useState<{ id: string; x: number; y: number } | null>(null);
  const [delAsk, setDelAsk] = useState<WidgetConf | null>(null);

  const enabled = state.widgets.filter(w => w.enabled);
  const topBanner = enabled.filter(w => w.type === 'banner');
  const topMenu = enabled.filter(w => w.type === 'menu' || (w.type as string) === 'menu_pc');

  if (topBanner.length === 0 && topMenu.length === 0) return null;

  const getWidgetClass = (type: string) => {
    if (type === 'menu') return 'wgt-hide-pc';
    if (type === 'menu_pc') return 'wgt-hide-mobile';
    return '';
  };

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setCtx({ id, x: e.clientX, y: e.clientY });
  };

  return (
    <header
      className="global-header-wrap page"
      onClick={() => setCtx(null)}
      style={{
        width: '100%',
        margin: '0 auto 12px auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        position: 'relative',
        zIndex: 100,
      }}
    >
      {topBanner.map(w => (
        <div
          key={w.id}
          data-wid={w.id}
          className={`wgt wgt-banner ${getWidgetClass(w.type)}`}
          onContextMenu={e => handleContextMenu(e, w.id)}
          style={{ width: '100%', position: 'relative' }}
        >
          {renderWidget(w)}
        </div>
      ))}

      {topMenu.map(w => (
        <div
          key={w.id}
          data-wid={w.id}
          className={`wgt wgt-menu ${getWidgetClass(w.type)}`}
          onContextMenu={e => handleContextMenu(e, w.id)}
          style={{ width: '100%', position: 'relative' }}
        >
          {renderWidget(w)}
        </div>
      ))}

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
