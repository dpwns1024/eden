'use client';
/**
 * 딱지 글씨 가운데 맞춤 (v2.0 사용자 요청 — 「홈페이지 안의 모든 딱지도 박스랑 글씨 정렬 맞춰」).
 *
 * 작은 딱지(CLASSIFIED · 뱃지 · 칩 …)는 글꼴마다 글자 잉크가 줄 상자 안에서 위아래로 치우쳐 있고(대문자는 위로 몰림),
 * 넓은 자간은 마지막 글자 뒤에도 붙어 글자가 왼쪽으로 쏠린다. CSS 숫자로는 글꼴 · 기기마다 달라 맞출 수 없어서,
 * 화면에서 글자의 실제 잉크 위치(canvas measureText)를 재고, 딱지 안쪽 상자의 한가운데에 오도록
 * 좌우 · 위아래 여백을 같은 만큼 옮긴다(한쪽에 더한 만큼 반대쪽에서 빼 딱지 크기는 그대로).
 * 글자만 든 딱지만 다룬다 — 아이콘 · 다른 요소가 섞인 칩은 건드리지 않는다.
 */
import { useEffect } from 'react';

const SEL = [
  '.cls-tag', '.pill', '.typ', '.g-badge', '.gi-tag', '.rel-bn .bn-m em', '.cat-badge', '.dt-badge', '.b-badge', '.cm-badge',
  '[data-box-head] > [data-box-tag]',
].join(',');
const ORIG = 'tagfixOrig';

let ctx: CanvasRenderingContext2D | null = null;

function restore(el: HTMLElement) {
  const o = el.dataset[ORIG];
  if (o == null) return;
  const v = JSON.parse(o) as Record<string, string>;
  for (const k of Object.keys(v)) el.style.setProperty(k, v[k]);
  delete el.dataset[ORIG];
}

function fix(el: HTMLElement) {
  if (el.childElementCount || !el.offsetWidth) return;
  const raw = el.textContent?.trim() ?? '';
  if (!raw || raw.includes('\n')) return;
  const cs = getComputedStyle(el);
  if (cs.transform !== 'none') return;   // 돌린 딱지는 상자 재기가 어긋난다
  ctx ??= document.createElement('canvas').getContext('2d');
  if (!ctx) return;
  const text = cs.textTransform === 'uppercase' ? raw.toUpperCase() : cs.textTransform === 'lowercase' ? raw.toLowerCase() : raw;
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const ls = parseFloat(cs.letterSpacing) || 0;
  const c2 = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  const lsCanvas = 'letterSpacing' in c2;
  if (lsCanvas) c2.letterSpacing = `${ls}px`;
  const m = ctx.measureText(text);

  // 글자 기준선 · 글자 시작 자리 — 글자 앞에 크기 0인 표시를 잠깐 넣어 잰다
  const probe = document.createElement('span');
  probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline;padding:0;margin:0;border:0';
  el.insertBefore(probe, el.firstChild);
  const p = probe.getBoundingClientRect();
  probe.remove();

  const r = el.getBoundingClientRect();
  const s = el.offsetWidth ? r.width / el.offsetWidth : 1;   // 확대 · 축소(zoom) 보정
  const inkL = p.left - m.actualBoundingBoxLeft * s;
  const inkR = p.left + (m.actualBoundingBoxRight + (lsCanvas ? 0 : ls * (text.length - 1))) * s;
  const inkT = p.top - m.actualBoundingBoxAscent * s;
  const inkB = p.top + m.actualBoundingBoxDescent * s;
  const boxCx = r.left + (el.clientLeft + el.clientWidth / 2) * s;
  const boxCy = r.top + (el.clientTop + el.clientHeight / 2) * s;
  const dx = (boxCx - (inkL + inkR) / 2) / s;
  const dy = (boxCy - (inkT + inkB) / 2) / s;
  if (Math.abs(dx) < 0.3 && Math.abs(dy) < 0.3) return;

  const keys = ['padding-left', 'padding-right', 'padding-top', 'padding-bottom', 'display'];
  el.dataset[ORIG] = JSON.stringify(Object.fromEntries(keys.map(k => [k, el.style.getPropertyValue(k)])));
  if (cs.display === 'inline') el.style.setProperty('display', 'inline-block');   // 인라인은 위아래 여백이 글자를 옮기지 못한다
  const pl = parseFloat(cs.paddingLeft), pr = parseFloat(cs.paddingRight), pt = parseFloat(cs.paddingTop), pb = parseFloat(cs.paddingBottom);
  if (Math.abs(dx) >= 0.3) {
    el.style.setProperty('padding-left', `${Math.max(0, pl + dx)}px`);
    el.style.setProperty('padding-right', `${Math.max(0, pr - dx)}px`);
  }
  if (Math.abs(dy) >= 0.3) {
    el.style.setProperty('padding-top', `${Math.max(0, pt + dy)}px`);
    el.style.setProperty('padding-bottom', `${Math.max(0, pb - dy)}px`);
  }
}

export function TagAlign() {
  useEffect(() => {
    const seen = new WeakMap<Element, string>();
    const scan = () => {
      document.querySelectorAll<HTMLElement>(SEL).forEach(el => {
        const cs = getComputedStyle(el);
        const key = `${el.textContent}|${cs.font}|${cs.letterSpacing}|${el.offsetWidth}x${el.offsetHeight}`;
        if (seen.get(el) === key) return;
        restore(el);
        fix(el);
        const c2 = getComputedStyle(el);
        seen.set(el, `${el.textContent}|${c2.font}|${c2.letterSpacing}|${el.offsetWidth}x${el.offsetHeight}`);
      });
    };
    let timer = 0;
    const later = () => { clearTimeout(timer); timer = window.setTimeout(scan, 150); };
    const reset = () => {
      document.querySelectorAll<HTMLElement>(SEL).forEach(el => restore(el));
      later();
    };
    const mo = new MutationObserver(later);
    mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', reset);
    document.fonts?.ready.then(reset).catch(() => {});
    later();
    return () => { mo.disconnect(); window.removeEventListener('resize', reset); clearTimeout(timer); };
  }, []);
  return null;
}
