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
/** 버튼 · 탭도 — 테두리나 바탕이 있는 「상자」이고 글자가 원래 가운데 놓이도록 만든 것만 (글자만 든 것).
 *  예전엔 자간 보정(LetterSpacingFix)이 자간만큼만 옮겨, 글자 옆 여백(O · L 모양)까지는 못 맞춰 1~2px씩 쏠렸다 (v2.0 사용자 제보 — ORIGINAL 탭) */
const BTN = 'button, a, .btn, [role=button]';
const ORIG = 'tagfixOrig';

/** 테두리나 바탕이 보이는 상자인지 — 메뉴 글자처럼 상자 없는 링크는 건드리지 않는다 */
const boxed = (cs: CSSStyleDeclaration) => {
  const vis = (c: string) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return false; const a = m[1].split(',')[3]; return a == null || parseFloat(a) > 0.02; };
  return (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none' && vis(cs.borderTopColor)) || vis(cs.backgroundColor);
};

let ctx: CanvasRenderingContext2D | null = null;

function restore(el: HTMLElement) {
  const o = el.dataset[ORIG];
  if (o == null) return;
  const v = JSON.parse(o) as Record<string, [string, string]>;
  for (const k of Object.keys(v)) el.style.setProperty(k, v[k][0], v[k][1]);
  delete el.dataset[ORIG];
}

function fix(el: HTMLElement, guard = false) {
  if (el.childElementCount || !el.offsetWidth) return;
  const raw = el.textContent?.trim() ?? '';
  if (!raw || raw.includes('\n')) return;
  // 한글은 건드리지 않는다 — canvas가 한글 글꼴(Pretendard 조각 글꼴)의 잉크를 잘못 재 오히려 어긋났다.
  // 화면 픽셀로 재 보면 한글 버튼 · 딱지는 이미 0.5px 안으로 가운데다
  if (/[\u3131-\u318e\uac00-\ud7a3]/.test(raw)) return;
  const cs = getComputedStyle(el);
  if (cs.transform !== 'none') return;   // 돌린 딱지는 상자 재기가 어긋난다
  if (guard && !boxed(cs)) return;
  ctx ??= document.createElement('canvas').getContext('2d');
  if (!ctx) return;
  // 재는 동안 변화 애니메이션(transition)을 끈다 — 켜 두면 방금 바꾼 들여쓰기 · 여백이 천천히 움직이는 중간값을 잰다
  const trans = el.style.getPropertyValue('transition');
  el.style.setProperty('transition', 'none');
  const done = () => { void el.offsetWidth; el.style.setProperty('transition', trans); };
  // 자간 보정(LetterSpacingFix)이 넣은 들여쓰기는 걷고 여기서 한 번에 맞춘다
  if (el.dataset.lsfix) { el.style.textIndent = ''; el.style.removeProperty('--lsfix'); delete el.dataset.lsfix; }
  const text = cs.textTransform === 'uppercase' ? raw.toUpperCase() : cs.textTransform === 'lowercase' ? raw.toLowerCase() : raw;
  // 10배 크기로 재서 나눈다 — 작은 글씨는 canvas가 잉크 높이를 정수 px로 반올림해 1px 가까이 틀렸다
  const K = 10;
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${parseFloat(cs.fontSize) * K}px ${cs.fontFamily}`;
  const ls = parseFloat(cs.letterSpacing) || 0;
  const c2 = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  const lsCanvas = 'letterSpacing' in c2;
  if (lsCanvas) c2.letterSpacing = `${ls * K}px`;
  const mk = ctx.measureText(text);
  const m = { actualBoundingBoxLeft: mk.actualBoundingBoxLeft / K, actualBoundingBoxRight: mk.actualBoundingBoxRight / K,
    actualBoundingBoxAscent: mk.actualBoundingBoxAscent / K, actualBoundingBoxDescent: mk.actualBoundingBoxDescent / K };

  const node = [...el.childNodes].find(n => n.nodeType === 3 && n.nodeValue?.trim()) as Text | undefined;
  if (!node) { done(); return; }

  // 지금 모습에서 글자 잉크 중심이 상자 안쪽 중심에서 얼마나 빗겨 있는지
  const measure = () => {
    // 글자 시작 자리 — 글자 범위(Range)의 왼쪽 끝
    const rg = document.createRange();
    rg.setStart(node, node.nodeValue!.length - node.nodeValue!.trimStart().length);
    rg.setEnd(node, node.nodeValue!.trimEnd().length);
    const lr = rg.getClientRects()[0];
    if (!lr) return null;
    // 기준선 — 글자를 잠깐 인라인 상자로 감싸고 그 안 맨 앞에 크기 0인 표시를 기준선에 놓아 잰다
    // (상자가 flex여도 감싼 안쪽은 보통 줄이라 표시가 정확히 기준선에 선다)
    // 사이트 CSS가 걸리지 않는 이름 없는 태그로 — span이면 「딱지 안 span」 규칙이 걸려 기준선이 바뀌었다
    const wrap = document.createElement('tag-align-w');
    const probe = document.createElement('tag-align-p');
    probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline;padding:0;margin:0;border:0';
    node.replaceWith(wrap); wrap.append(probe, node);
    const layoutBase = probe.getBoundingClientRect().top;
    wrap.replaceWith(node);
    // 브라우저는 글자 기준선을 CSS 1px 단위로 반올림해 그린다(배율과 상관없이 — 실측). 그려지는 자리로 잰다
    const base = Math.round(layoutBase + window.scrollY) - window.scrollY;
    const r = el.getBoundingClientRect();
    const s = el.offsetWidth ? r.width / el.offsetWidth : 1;   // 확대 · 축소(zoom) 보정
    const inkL = lr.left - m.actualBoundingBoxLeft * s;
    const inkR = lr.left + (m.actualBoundingBoxRight + (lsCanvas ? 0 : ls * (text.length - 1))) * s;
    const inkT = base - m.actualBoundingBoxAscent * s;
    const inkB = base + m.actualBoundingBoxDescent * s;
    const dy = (r.top + (el.clientTop + el.clientHeight / 2) * s - (inkT + inkB) / 2) / s;
    // 위아래는 반올림 뒤 기준선이 가장 가운데에 오는 정수 자리로 — 그 자리에 기준선이 오도록 옮길 양
    const target = Math.round(base + window.scrollY + dy * s) - window.scrollY;
    return {
      dx: (r.left + (el.clientLeft + el.clientWidth / 2) * s - (inkL + inkR) / 2) / s,
      dy: (target - layoutBase) / s,
    };
  };

  const keys = ['padding-left', 'padding-right', 'padding-top', 'padding-bottom', 'display'];
  el.dataset[ORIG] = JSON.stringify(Object.fromEntries(keys.map(k => [k, [el.style.getPropertyValue(k), el.style.getPropertyPriority(k)]])));
  // !important로 넣는다 — 여백을 CSS에서 !important로 박아 둔 딱지(갤러리 분류 딱지 등)는 그냥 넣으면 무시됐다 (v2.0 사용자 제보 — CHANGE · ORIGINAL)
  const put = (k: string, v: string) => el.style.setProperty(k, v, 'important');
  // 인라인은 위아래 여백이 글자를 옮기지 못해 inline-block으로 — 재기 「전에」 바꾼다(바꾸면 기준선이 달라져 먼저 잰 값이 빗나갔다)
  if (cs.display === 'inline') put('display', 'inline-block');
  // 한쪽에 더한 만큼 반대쪽에서 뺀다. 뺄 여백이 없으면(높이가 고정된 버튼 등) 더하기만 하고, 다음 재기에서 남은 만큼 더 옮긴다
  const move = (a: string, b: string, d: number) => {
    const c = getComputedStyle(el);
    const va = parseFloat(c.getPropertyValue(a)), vb = parseFloat(c.getPropertyValue(b));
    if (d > 0) { put(a, `${va + Math.min(d, vb) + (vb < d ? d - vb : 0)}px`); put(b, `${Math.max(0, vb - d)}px`); }
    else { put(b, `${vb + Math.min(-d, va) + (va < -d ? -d - va : 0)}px`); put(a, `${Math.max(0, va + d)}px`); }
  };
  const shift = (d: { dx: number; dy: number }) => {
    if (Math.abs(d.dx) >= 0.2) move('padding-left', 'padding-right', d.dx);
    if (Math.abs(d.dy) >= 0.2) move('padding-top', 'padding-bottom', d.dy);
  };

  const d1 = measure();
  // 버튼은 글자가 원래 가운데 근처일 때만 — 왼쪽 정렬로 둔 넓은 버튼은 그대로
  if (!d1 || (Math.abs(d1.dx) < 0.3 && Math.abs(d1.dy) < 0.3 && cs.display !== 'inline')
    || (guard && (Math.abs(d1.dx) > Math.max(4, ls + 2) || Math.abs(d1.dy) > 3))) { restore(el); done(); return; }
  shift(d1);
  // 두 번 더 재서 남은 차이까지 (높이가 고정된 상자는 한쪽만 늘리면 절반만 움직인다)
  for (let i = 0; i < 2; i++) { const d = measure(); if (!d || (Math.abs(d.dx) < 0.2 && Math.abs(d.dy) < 0.2)) break; shift(d); }
  done();
}

export function TagAlign() {
  useEffect(() => {
    let seen = new WeakMap<Element, string>();
    // 지금 모습의 열쇠 — 글자 · 글꼴 · 상자 크기(소수점까지) · 상자 안 글자 시작 자리. 하나라도 바뀌면 다시 잰다
    // (상자 크기만 보면 글꼴이 늦게 와서 글자만 옮겨 간 경우를 놓쳐, 옛 글꼴로 잰 값이 남았다)
    const keyOf = (el: HTMLElement) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      let off = '';
      if (!el.childElementCount && el.firstChild) {
        const rg = document.createRange(); rg.selectNodeContents(el);
        const q = rg.getBoundingClientRect();
        off = `${(q.left - r.left).toFixed(2)},${(q.top - r.top).toFixed(2)}`;
      }
      return `${el.textContent}|${cs.font}|${cs.letterSpacing}|${r.width.toFixed(2)}x${r.height.toFixed(2)}|${off}`;
    };
    const scan = () => {
      const run = (el: HTMLElement, guard: boolean) => {
        if (seen.get(el) === keyOf(el)) return;
        restore(el);
        fix(el, guard);
        seen.set(el, keyOf(el));
      };
      document.querySelectorAll<HTMLElement>(SEL).forEach(el => run(el, false));
      document.querySelectorAll<HTMLElement>(BTN).forEach(el => { if (!el.matches(SEL)) run(el, true); });
    };
    let timer = 0;
    const later = () => { clearTimeout(timer); timer = window.setTimeout(scan, 150); };
    // 화면 폭 · 글꼴이 바뀌면 처음부터 다시 잰다 (잰 기록도 지운다 — 남겨 두면 되돌린 채로 건너뛰었다)
    const reset = () => {
      seen = new WeakMap();
      document.querySelectorAll<HTMLElement>(`${SEL},${BTN}`).forEach(el => restore(el));
      later();
    };
    const mo = new MutationObserver(later);
    mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', reset);
    document.fonts?.ready.then(reset).catch(() => {});
    document.fonts?.addEventListener?.('loadingdone', reset);   // 늦게 붙는 글꼴(ARCH 웹폰트)이 도착하면 다시 잰다
    later();
    return () => { mo.disconnect(); window.removeEventListener('resize', reset); document.fonts?.removeEventListener?.('loadingdone', reset); clearTimeout(timer); };
  }, []);
  return null;
}
