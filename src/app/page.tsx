'use client';
// 메인 페이지 (4.0 위젯 시스템)
import React, { useEffect, useState } from 'react';
import { useMainStore, WidgetConf, WidgetType, WIDGET_META, MULTI_TYPES, widgetLabel } from '@/lib/mainStore';
import { WidgetFrame } from '@/components/main/WidgetFrame';
import { renderWidget } from '@/components/main/widgets';
import { MemberBox } from '@/components/main/MemberBox';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { KRadio } from '@/components/ui/Kit';
import { useToast } from '@/components/ui/Toast';

// 'menu_pc' (PC 전용 메뉴) 추가
const ADDABLE: (WidgetType | 'menu_pc')[] = ['menu_pc', 'menu', 'memo', 'dday', 'todo', 'upcoming', 'freetext', 'deco', 'diary', 'latest', 'apply'];
const EDITABLE: (WidgetType | 'menu_pc')[] = ['banner', 'menu_pc', 'menu', 'memo', 'dday', 'todo', 'freetext', 'deco', 'apply'];

export default function MainPage() {
  const { state, editOn, gridOn, updateWidget, addWidget, removeWidget } = useMainStore();
  const toast = useToast();
  const [ctx, setCtx] = useState<{ id: string; x: number; y: number } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState<WidgetType | 'menu_pc'>('menu_pc');
  const [addCol, setAddCol] = useState<'1' | '2' | '3'>('2');
  const [delAsk, setDelAsk] = useState<WidgetConf | null>(null);

  useEffect(() => {
    const open = () => setAddOpen(true);
    window.addEventListener('ohome-add-widget', open);
    return () => window.removeEventListener('ohome-add-widget', open);
  }, []);

  const enabled = state.widgets.filter(w => w.enabled);
  const byCol = (c: 1 | 2 | 3) => enabled.filter(w => w.col === c);
  const mOrder = (id: string) => {
    const i = state.mobileOrder.indexOf(id);
    return i === -1 ? 99 : i;
  };

  const zOp = (mode: 'top' | 'bottom' | 'up' | 'down') => {
    if (!ctx) return;
    const all = enabled.filter(w => w.z != null);
    const me = enabled.find(w => w.id === ctx.id);
    if (!me) return;
    const zs = all.map(w => w.z!);
    const cur = me.z ?? 0;
    if (mode === 'top') updateWidget(me.id, { z: (zs.length ? Math.max(...zs) : 0) + 1 });
    if (mode === 'bottom') updateWidget(me.id, { z: Math.max(0, (zs.length ? Math.min(...zs) : 1) - 1) });
    if (mode === 'up') {
      const hi = zs.filter(z => z > cur);
      if (hi.length) {
        const nz = Math.min(...hi);
        const other = all.find(w => w.z === nz)!;
        updateWidget(other.id, { z: cur });
        updateWidget(me.id, { z: nz });
      }
    }
    if (mode === 'down') {
      const lo = zs.filter(z => z < cur);
      if (lo.length) {
        const nz = Math.max(...lo);
        const other = all.find(w => w.z === nz)!;
        updateWidget(other.id, { z: cur });
        updateWidget(me.id, { z: nz });
      }
    }
    setCtx(null);
  };

  // 모바일 메뉴(menu)는 PC에서 숨김(wgt-hide-pc)
  // PC 메뉴(menu_pc)는 모바일에서 숨김(wgt-hide-mobile)
  const getWidgetClass = (type: string) => {
    if (type === 'menu') return 'wgt-hide-pc';
    if (type === 'menu_pc') return 'wgt-hide-mobile';
    return undefined;
  };

  const frame = (w: WidgetConf, className?: string) => (
    <WidgetFrame key={w.id} conf={w} mobileOrder={mOrder(w.id)} className={className ?? getWidgetClass(w.type)}
      onCtx={(id, x, y) => {
        if (state.widgets.find(v => v.id === id)?.z == null) {
          const zs = enabled.map(v => v.z ?? 0);
          updateWidget(id, { z: Math.max(...zs, 0) + 1 });
        }
        setCtx({ id, x, y });
      }}>
      {renderWidget(w)}
    </WidgetFrame>
  );

  const absMode = enabled.length > 0 && enabled.every(w => w.ax != null && w.ay != null);
  const gridRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (absMode) return;
    const t = setTimeout(() => {
      const gr = gridRef.current?.getBoundingClientRect();
      if (!gr || gr.width < 100) return;
      enabled.forEach(w => {
        if (w.ax != null) return;
        const el = document.querySelector(`[data-wid="${w.id}"]`);
        if (!el) return;
        const r = el.getBoundingClientRect();
        updateWidget(w.id, {
          ax: Math.round(r.left - gr.left), ay: Math.round(r.top - gr.top),
          w: w.w ?? Math.max(160, Math.round(r.width)), h: w.h ?? Math.max(80, Math.round(r.height)),
          tx: 0, ty: 0,
        }, { persist: true });
      });
    }, 250);
    return () => clearTimeout(t);
  }, [absMode, enabled.length]);

  const canvasH = absMode
    ? Math.max(400, ...enabled.map(w => (w.ay ?? 0) + (w.h ?? 200))) + 40
    : undefined;

  return (
    <section className="page page-main-wrap" onClick={() => setCtx(null)}>
      <div ref={gridRef} className={`main-grid ${absMode ? 'abs' : ''} ${gridOn ? 'gridlines' : ''}`}
        style={{ marginTop: 12, ...(canvasH ? { height: canvasH } : {}) }}>
        {absMode ? (
          enabled.map(w =>
            w.type === 'member'
              ? <WidgetFrame key={w.id} conf={w} mobileOrder={-1} onCtx={(id, x, y) => setCtx({ id, x, y })}><MemberBox /></WidgetFrame>
              : frame(w)
          )
        ) : (
          <>
            <div>
              {byCol(1).map(w => frame(w))}
            </div>
            <div>
              {byCol(2).map(w =>
                w.type === 'banner' ? frame(w) : null
              )}
              <div className="g2" style={{ marginTop: 10 }}>
                {byCol(2).filter(w => w.type !== 'banner').map(w => frame(w))}
              </div>
            </div>
            <div>
              {byCol(3).map(w =>
                w.type === 'member'
                  ? <WidgetFrame key={w.id} conf={w} mobileOrder={-1} onCtx={(id, x, y) => setCtx({ id, x, y })}><MemberBox /></WidgetFrame>
                  : frame(w)
              )}
            </div>
          </>
        )}
      </div>

      {ctx && (() => {
        const me = enabled.find(w => w.id === ctx.id);
        if (!me) return null;
        return (
          <div className="ctx-menu on" style={{ left: ctx.x, top: ctx.y }} onClick={e => e.stopPropagation()}>
            <div className="ctx-ttl">{widgetLabel(state.widgets, me)}</div>
            <div className="sep" />
            <button onClick={() => zOp('top')}>맨위로</button>
            <button onClick={() => zOp('up')}>위로</button>
            <button onClick={() => zOp('down')}>아래로</button>
            <button onClick={() => zOp('bottom')}>맨아래로</button>
            <button onClick={() => { updateWidget(me.id, { freeMove: !me.freeMove }); setCtx(null); }}>
              {me.freeMove ? '그리드 반영' : '그리드 무시'}
            </button>
            {(EDITABLE.includes(me.type as any) || !me.fixed) && <div className="sep" />}
            {EDITABLE.includes(me.type as any) && (
              <button onClick={() => {
                window.dispatchEvent(new CustomEvent('ohome-widget-edit', { detail: { id: me.id } }));
                setCtx(null);
              }}>설정</button>
            )}
            {!me.fixed && (
              <button className="danger" onClick={() => { setDelAsk(me); setCtx(null); }}>위젯 삭제</button>
            )}
          </div>
        );
      })()}

      <ConfirmModal open={delAsk !== null}
        title={`「${delAsk ? widgetLabel(state.widgets, delAsk) : ''}」 위젯을 삭제할까요?`}
        body="위젯이 삭제됩니다."
        onClose={() => setDelAsk(null)}
        buttons={[
          { label: 'DELETE', kind: 'accent', onClick: () => { if (delAsk) removeWidget(delAsk.id); setDelAsk(null); toast('위젯이 삭제되었습니다'); } },
          { label: 'CANCEL', kind: 'ghost', onClick: () => setDelAsk(null) },
        ]} />

      {/* 위젯 추가 모달 */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} small
        title="위젯 추가" desc="종류와 배치 열을 선택하세요"
        actions={<>
          <button className="btn btn-ghost" onClick={() => setAddOpen(false)}>CANCEL</button>
          <button className="btn btn-dark" onClick={() => {
            const id = addWidget(addType as WidgetType, Number(addCol) as 1 | 2 | 3);
            setAddOpen(false);
            toast('위젯이 추가되었습니다');
            setTimeout(() => document.querySelector(`[data-wid="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
          }}>ADD</button>
        </>}>
        <div style={{ display: 'grid', gap: 7, marginBottom: 14 }}>
          {ADDABLE.map(t => {
            const isMenuPc = t === 'menu_pc';
            const title = isMenuPc ? 'PC 메뉴' : (WIDGET_META[t as WidgetType]?.title ?? t);
            const desc = isMenuPc ? 'PC 전용 — 모바일에서는 숨겨짐' : (WIDGET_META[t as WidgetType]?.desc ?? '');
            const taken = !MULTI_TYPES.includes(t as WidgetType) && state.widgets.some(w => w.type === t);

            return (
              <KRadio key={t} name="wgt-type" value={t} current={addType} disabled={taken}
                onChange={v => setAddType(v as WidgetType | 'menu_pc')}
                label={<span>
                  <b style={{ fontSize: 12.5 }}>{title}</b>{' '}
                  <small style={{ color: 'var(--faint)', fontSize: 10.5 }}>{desc}</small>
                  {taken && <span className="pill" style={{ marginLeft: 6 }}>추가됨</span>}
                </span>} />
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <KRadio name="wgt-col" value="1" current={addCol} onChange={v => setAddCol(v as '1')} label="왼쪽 열" />
          <KRadio name="wgt-col" value="2" current={addCol} onChange={v => setAddCol(v as '2')} label="중앙 (배너 아래)" />
          <KRadio name="wgt-col" value="3" current={addCol} onChange={v => setAddCol(v as '3')} label="오른쪽 열" />
        </div>
      </Modal>
    </section>
  );
}
