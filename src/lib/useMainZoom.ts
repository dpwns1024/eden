'use client';
import { useEffect } from 'react';

export const MAIN_CANVAS_W = 1120;

/** PC 메인 캔버스(1120px 고정 설계)를 창 폭에 맞춰 비율 축소 — 좁은 창에서도 잘리지 않고 배치 그대로.
 *  편집모드·모바일(≤620px 세로 스택)에서는 1. */
export function useMainZoom(wrap: HTMLElement | null, editOn: boolean) {
  useEffect(() => {
    if (!wrap) return;
    const apply = () => {
      let z = 1;
      if (!editOn && window.innerWidth > 620) {
        const cs = getComputedStyle(wrap);
        const avail = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        z = Math.min(1, avail / MAIN_CANVAS_W);
      }
      wrap.style.setProperty('--main-zoom', String(Math.max(0.2, z)));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(wrap);
    window.addEventListener('resize', apply);
    return () => { ro.disconnect(); window.removeEventListener('resize', apply); };
  }, [wrap, editOn]);
}
