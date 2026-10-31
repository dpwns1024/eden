'use client';
/**
 * 버튼 글자 가운데 맞춤 보정 (v2.0 사용자 요청 — "버튼 글자가 왼쪽으로 조금씩 몰려 있다").
 *
 * 자간(letter-spacing)은 마지막 글자 뒤에도 붙는다. 그래서 자간을 넓게 준 버튼은 글자 덩어리의
 * 오른쪽에 자간만큼 빈칸이 더 생기고, 가운데 정렬해도 글자가 그만큼 왼쪽으로 쏠려 보인다.
 * 사이트 버튼·메뉴뿐 아니라 사용자 HTML 안의 버튼(값을 미리 알 수 없음)까지 한 번에 고치려고,
 * 화면에서 직접 재서 「좌우 여백 차이 = 자간」인 것만 골라 같은 크기의 text-indent로 앞을 채운다.
 * 왼쪽 정렬된 넓은 버튼처럼 원래 좌우가 다른 것은 차이가 자간과 달라서 건드리지 않는다.
 */
import { useEffect } from 'react';

const SEL = 'button, a, .btn, [role=button]';
const MIN_LS = 1; // 1px 미만 자간은 눈에 안 띈다 — 재지 않음

/** 글자의 눈에 보이는 좌우 여백 — 글자 범위 끝에 붙은 자간은 빈칸이므로 오른쪽 여백에 넣는다
 *  (변형·확대 애니메이션 중이어도 원래 크기 기준으로) */
function gaps(el: HTMLElement, ls: number): [number, number] | null {
  const r = el.getBoundingClientRect();
  if (r.width < 8 || r.height < 8 || !el.offsetWidth) return null;
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let first: Text | null = null, last: Text | null = null, n: Node | null;
  while ((n = w.nextNode())) if (n.textContent?.trim()) { if (!first) first = n as Text; last = n as Text; }
  if (!first || !last) return null;
  const rg = document.createRange();
  rg.setStart(first, 0);
  rg.setEnd(last, last.length);
  const t = rg.getBoundingClientRect();
  const s = r.width / el.offsetWidth || 1;
  return [(t.left - r.left) / s, (r.right - t.right) / s + ls];
}

/** 들여쓰기를 바꾸는 순간엔 transition을 끈다 — `transition: all`인 버튼은 들여쓰기마저 천천히 움직여
 *  바로 다시 잴 때 중간값이 잡힌다. 바꾼 뒤 레이아웃을 확정하고 원래 transition을 돌려준다(애니메이션 없음). */
function setIndent(el: HTMLElement, px: number | null) {
  const prev = el.style.transition;
  el.style.transition = 'none';
  if (px == null) {
    el.style.textIndent = '';
    el.style.removeProperty('--lsfix');
    delete el.dataset.lsfix;
  } else {
    el.style.textIndent = `${px}px`;
    el.style.setProperty('--lsfix', `${px}px`); // 밑줄 같은 장식이 글자를 따라오게 (globals.css)
    el.dataset.lsfix = '1';
  }
  void el.offsetWidth;
  el.style.transition = prev;
}
const undo = (el: HTMLElement) => setIndent(el, null);

/**
 * 한글 자간 (v2.0 사용자 요청 — 「넓은 자간은 한글에선 띄어 보인다」). ARCH는 영문 라벨 · 버튼에 넓은 자간(.2~.5em)을 주는데,
 * 같은 칸에 한글이 들어가면(로그인 · 비밀번호 입력 · 입장 …) 한 글자씩 떨어져 보였다. 자간 규칙은 칸마다 달라
 * CSS로는 한글만 고를 수 없으니, 화면에서 「자기 글자에 한글이 있고 자간이 .1em보다 넓은」 칸을 찾아 표시해 두고
 * CSS(globals.css의 [data-ko])가 한글에 맞는 좁은 자간으로 덮는다. 입력칸은 안내 글씨(placeholder)를 본다.
 */
const HANGUL = /[\u3131-\u318e\uac00-\ud7a3]/;
const ownText = (el: Element) => {
  let t = '';
  for (const n of el.childNodes) if (n.nodeType === 3) t += n.nodeValue;
  return t;
};
function markKo() {
  if (!document.documentElement.classList.contains('ui-arch')) return;
  document.querySelectorAll<HTMLElement>('body *:not(script):not(style):not(svg *)').forEach(el => {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      const ko = HANGUL.test(el.placeholder || '');
      if (ko !== (el.dataset.koPh === '1')) { if (ko) el.dataset.koPh = '1'; else delete el.dataset.koPh; }
      return;
    }
    const ko = HANGUL.test(ownText(el));
    if (!ko) { if (el.dataset.ko) delete el.dataset.ko; return; }
    if (el.dataset.ko) return;
    const cs = getComputedStyle(el);
    if ((parseFloat(cs.letterSpacing) || 0) > parseFloat(cs.fontSize) * 0.1) el.dataset.ko = '1';
  });
}

export function LetterSpacingFix() {
  useEffect(() => {
    const seen = new WeakMap<Element, string>();
    const scan = () => {
      markKo();
      document.querySelectorAll<HTMLElement>(SEL).forEach(el => {
        const txt = el.innerText?.trim() ?? '';
        if (!txt || txt.length > 40 || txt.includes('\n')) return;
        if (el.style.textIndent && !el.dataset.lsfix) return; // 직접 지정한 들여쓰기는 존중
        const cs = getComputedStyle(el);
        const ls = parseFloat(cs.letterSpacing) || 0;
        const key = `${txt}|${ls}`;
        if (seen.get(el) === key) return;
        if (el.dataset.lsfix) undo(el); // 자간이 바뀌었다 — 걷고 처음부터 다시 잰다
        if (ls < MIN_LS) { seen.set(el, key); return; }
        const g = gaps(el, ls);
        if (!g) return; // 아직 안 보임 — 다음에 다시
        const [L, R] = g;
        const d = R - L;
        if (L < 1 || Math.abs(d - ls) > Math.max(1, ls * 0.7)) { seen.set(el, key); return; }
        setIndent(el, ls);
        // 자식 블록이 들여쓰기를 물려받는 등 오히려 나빠지면 되돌린다
        const g2 = gaps(el, ls);
        if (g2 && Math.abs(g2[1] - g2[0]) > Math.abs(d)) undo(el);
        seen.set(el, key);
      });
    };
    let timer = 0;
    const later = () => { clearTimeout(timer); timer = window.setTimeout(scan, 120); };
    // 화면 폭이 바뀌면 자간(em 단위)도 바뀔 수 있다 — 붙였던 보정을 걷고 다시 잰다
    const reset = () => {
      document.querySelectorAll<HTMLElement>('[data-lsfix]').forEach(el => { undo(el); seen.delete(el); });
      later();
    };
    const mo = new MutationObserver(later);
    mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', reset);
    // 디자인(스킨)이 늦게 붙으며 자간이 transition으로 커지는 버튼 — 다 커진 뒤 다시 잰다
    document.addEventListener('transitionend', later, true);
    document.fonts?.ready.then(reset).catch(() => {});
    later();
    return () => { mo.disconnect(); window.removeEventListener('resize', reset); document.removeEventListener('transitionend', later, true); clearTimeout(timer); };
  }, []);
  return null;
}
