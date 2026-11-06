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
  // YJHM 한마디 이름 딱지 · BGM 목록의 NOW 딱지 — 버튼이 아니라 글자만 든 상자 (사용자 제보 — YEJUN 딱지 위아래 어긋남)
  'html.ui-yjhm .yj-quote .yj-tape', 'html.ui-yjhm .by-it em',
  // YJHM 목록 위 탭(ALL 1 · YJHM 1 — 안에 작은 숫자 <small>) — 사용자 제보
  'html.ui-yjhm .arch-tabbar .tag',
].join(',');
/** YJHM 테이프 · 버튼 — 상자 자체를 화면 픽셀에 맞춘다 (사용자 요청 — 100% 배율에서 픽셀 단위로).
 *  글자 폭 때문에 상자 폭이 100.78px처럼 소수점이 되거나, 화면 높이에 따라 줄 위치가 664.25px처럼 걸치면
 *  상자 가장자리가 두 픽셀에 번져 그려져 글자가 0.5~1px 치우쳐 보였다.
 *  → 폭은 올림해 정수로, 자리는 translate로 가장 가까운 화면 픽셀에 붙인다(옆 상자는 밀지 않는다) */
const SNAP = [
  '.yj-tape', '.yj-quote > span', '.world-switch.ws-yjhm button', '.yj-fh .login-link', '.yj-btn', '.bgm-y .by-pp', '.by-it em',
  // 다른 페이지 · 창의 버튼 · 탭도 (게시판 글쓰기 · 탭 · 로그인 · 창 아래 버튼)
  '#appMain .page :is(.btn,.seg > button,.mini-seg > button,.arch-tabbar .tag)',
  '#appMain .page :is(.b-badge,.cat-badge,.dt-badge,.cm-badge,.g-badge,.gi-tag,.cls-tag,.typ,.pill)', '.modal-ov .mng-box :is(.btn,.seg > button)',
].map(x => `html.ui-yjhm ${x}`).join(',');
/** 가운데에 띄운 상자(translate -50%를 이미 쓰는 것) — 폭은 그대로 두고 margin으로 자리만 맞춘다 */
const SNAP_BOX = 'html.ui-yjhm .yj-quote';
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
const INK = 'tagInk';   // 상자 기준 글자 잉크 자리 (fix가 재 둔다)

function restore(el: HTMLElement) {
  delete el.dataset[INK];
  const o = el.dataset[ORIG];
  if (o == null) return;
  const v = JSON.parse(o) as Record<string, [string, string]>;
  for (const k of Object.keys(v)) el.style.setProperty(k, v[k][0], v[k][1]);
  delete el.dataset[ORIG];
}

const HANGUL = /[\u3131-\u318e\uac00-\ud7a3]/;
const yjhm = () => document.documentElement.classList.contains('ui-yjhm');

/** 글자 잉크를 「그려 보고」 픽셀로 잰다 — measureText의 잉크 값은 한글 글꼴(Pretendard 조각 글꼴)에서 틀렸다.
 *  화면에 이미 그려진 글자라 그 조각 글꼴은 받아져 있고, canvas도 같은 글꼴로 그린다. K배로 키워 그려 0.1px 단위로 */
let pcv: HTMLCanvasElement | null = null;
function pixelInk(text: string, font: (size: number) => string, size: number, ls: number) {
  const K = 4;
  pcv ??= document.createElement('canvas');
  const c = pcv.getContext('2d', { willReadFrequently: true }) as (CanvasRenderingContext2D & { letterSpacing?: string }) | null;
  if (!c) return null;
  const fs = size * K;
  const prep = () => { c.font = font(fs); if ('letterSpacing' in c) c.letterSpacing = `${ls * K}px`; c.textBaseline = 'alphabetic'; };
  prep();
  const W = Math.ceil(c.measureText(text).width + fs * 2), H = Math.ceil(fs * 3);
  pcv.width = W; pcv.height = H;
  prep();
  const ox = fs, oy = Math.round(fs * 2);
  c.clearRect(0, 0, W, H);
  c.fillText(text, ox, oy);
  const d = c.getImageData(0, 0, W, H).data;
  let x0 = W, x1 = -1, y0 = H, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (d[(y * W + x) * 4 + 3] < 128) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) return null;
  return { actualBoundingBoxLeft: (ox - x0) / K, actualBoundingBoxRight: (x1 + 1 - ox) / K,
    actualBoundingBoxAscent: (oy - y0) / K, actualBoundingBoxDescent: (y1 + 1 - oy) / K, lsIncluded: 'letterSpacing' in c };
}

/** 글자만 든 안쪽 요소(작은 숫자 <small> 등)인지 — 그림 · 입력 칸 · 줄바꿈이 섞이면 다루지 않는다 */
const textOnly = (el: Element): boolean => [...el.children].every(c =>
  !/^(IMG|SVG|CANVAS|VIDEO|INPUT|SELECT|TEXTAREA|BR|BUTTON|IFRAME)$/i.test(c.tagName) && !(c as HTMLElement).dataset?.[ORIG] && textOnly(c));

function fix(el: HTMLElement, guard = false) {
  if (!el.offsetWidth) return;
  // 안쪽 요소가 있으면 YJHM에서만 — 「ALL <small>1</small>」 같은 탭도 글자 전체를 한 덩어리로 가운데에 (사용자 제보)
  if (el.childElementCount && (!yjhm() || !textOnly(el))) return;
  const raw = el.textContent?.trim() ?? '';
  if (!raw || raw.includes('\n')) return;
  // 한글 — canvas measureText가 한글 글꼴의 잉크를 잘못 재 오히려 어긋났다. YJHM에서는 그려 본 픽셀로 재고(pixelInk),
  // 다른 세계는 예전처럼 건드리지 않는다
  if (HANGUL.test(raw) && !yjhm()) return;
  const cs = getComputedStyle(el);
  if (cs.transform !== 'none') return;   // 돌린 딱지는 상자 재기가 어긋난다
  // 바탕 없는 탭 · 버튼도 YJHM 맞춤 대상(SNAP)이면 — 고르면 바탕이 생기고, 자간 보정 들여쓰기가 남아 1px 쏠렸다
  if (guard && !boxed(cs) && !(yjhm() && el.matches(SNAP))) return;
  ctx ??= document.createElement('canvas').getContext('2d');
  if (!ctx) return;
  // 재는 동안 변화 애니메이션(transition)을 끈다 — 켜 두면 방금 바꾼 들여쓰기 · 여백이 천천히 움직이는 중간값을 잰다
  const trans = el.style.getPropertyValue('transition');
  el.style.setProperty('transition', 'none');
  const done = () => { void el.offsetWidth; el.style.setProperty('transition', trans); };
  // 자간 보정(LetterSpacingFix)이 넣은 들여쓰기는 걷고 여기서 한 번에 맞춘다
  if (el.dataset.lsfix) { el.style.textIndent = ''; el.style.removeProperty('--lsfix'); delete el.dataset.lsfix; }

  // 글자 덩어리마다 (글꼴 · 크기가 다를 수 있다) 잉크 치수
  const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  type Part = { node: Text; m: { actualBoundingBoxLeft: number; actualBoundingBoxRight: number; actualBoundingBoxAscent: number; actualBoundingBoxDescent: number }; extra: number };
  const parts: Part[] = [];
  const K = 10;   // 10배 크기로 재서 나눈다 — 작은 글씨는 canvas가 잉크 높이를 정수 px로 반올림해 1px 가까이 틀렸다
  for (let n = tw.nextNode() as Text | null; n; n = tw.nextNode() as Text | null) {
    const t0 = n.nodeValue?.trim();
    if (!t0) continue;
    const pcs = n.parentElement === el ? cs : getComputedStyle(n.parentElement!);
    const text = pcs.textTransform === 'uppercase' ? t0.toUpperCase() : pcs.textTransform === 'lowercase' ? t0.toLowerCase() : t0;
    const ls = parseFloat(pcs.letterSpacing) || 0;
    const font = (sz: number) => `${pcs.fontStyle} ${pcs.fontWeight} ${sz}px ${pcs.fontFamily}`;
    let m: Part['m'] | null;
    let extra = 0;
    if (HANGUL.test(text)) m = pixelInk(text, font, parseFloat(pcs.fontSize), ls);
    else {
      ctx.font = font(parseFloat(pcs.fontSize) * K);
      const c2 = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
      const lsCanvas = 'letterSpacing' in c2;
      if (lsCanvas) c2.letterSpacing = `${ls * K}px`;
      const mk = ctx.measureText(text);
      m = { actualBoundingBoxLeft: mk.actualBoundingBoxLeft / K, actualBoundingBoxRight: mk.actualBoundingBoxRight / K,
        actualBoundingBoxAscent: mk.actualBoundingBoxAscent / K, actualBoundingBoxDescent: mk.actualBoundingBoxDescent / K };
      if (!lsCanvas) extra = ls * (text.length - 1);
    }
    if (!m) { done(); return; }
    parts.push({ node: n, m, extra });
  }
  if (!parts.length) { done(); return; }

  let last: { l: number; r: number; t: number; b: number } | null = null;
  const keepInk = () => { if (last) el.dataset[INK] = JSON.stringify(last); };
  // 지금 모습에서 글자 잉크(모든 덩어리를 합친 것) 중심이 상자 안쪽 중심에서 얼마나 빗겨 있는지
  const measure = () => {
    const r = el.getBoundingClientRect();
    const s = el.offsetWidth ? r.width / el.offsetWidth : 1;   // 확대 · 축소(zoom) 보정
    let inkL = Infinity, inkR = -Infinity, inkT = Infinity, inkB = -Infinity, layoutBase = 0, base = 0;
    for (let i = 0; i < parts.length; i++) {
      const { node, m, extra } = parts[i];
      // 글자 시작 자리 — 글자 범위(Range)의 왼쪽 끝. 두 줄로 꺾였으면 다루지 않는다
      const rg = document.createRange();
      rg.setStart(node, node.nodeValue!.length - node.nodeValue!.trimStart().length);
      rg.setEnd(node, node.nodeValue!.trimEnd().length);
      const rs = rg.getClientRects();
      if (rs.length !== 1) return null;
      const lr = rs[0];
      // 기준선 — 글자를 잠깐 인라인 상자로 감싸고 그 안 맨 앞에 크기 0인 표시를 기준선에 놓아 잰다
      // (상자가 flex여도 감싼 안쪽은 보통 줄이라 표시가 정확히 기준선에 선다)
      // 사이트 CSS가 걸리지 않는 이름 없는 태그로 — span이면 「딱지 안 span」 규칙이 걸려 기준선이 바뀌었다
      const wrap = document.createElement('tag-align-w');
      const probe = document.createElement('tag-align-p');
      probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline;padding:0;margin:0;border:0';
      node.replaceWith(wrap); wrap.append(probe, node);
      const lb = probe.getBoundingClientRect().top;
      wrap.replaceWith(node);
      // 브라우저는 글자 기준선을 CSS 1px 단위로 반올림해 그린다(배율과 상관없이 — 실측). 그려지는 자리로 잰다
      const bs = Math.round(lb + window.scrollY) - window.scrollY;
      if (i === 0) { layoutBase = lb; base = bs; }
      inkL = Math.min(inkL, lr.left - m.actualBoundingBoxLeft * s);
      inkR = Math.max(inkR, lr.left + (m.actualBoundingBoxRight + extra) * s);
      inkT = Math.min(inkT, bs - m.actualBoundingBoxAscent * s);
      inkB = Math.max(inkB, bs + m.actualBoundingBoxDescent * s);
    }
    // 상자 기준 잉크 자리 — 홀짝 맞춤(parity)이 다음에 쓴다
    last = { l: inkL - r.left, r: inkR - r.left, t: inkT - r.top, b: inkB - r.top };
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

  const ls = parseFloat(cs.letterSpacing) || 0;
  const d1 = measure();
  // 버튼은 글자가 원래 가운데 근처일 때만 — 왼쪽 정렬로 둔 넓은 버튼은 그대로
  if (!d1 || (Math.abs(d1.dx) < 0.3 && Math.abs(d1.dy) < 0.3 && cs.display !== 'inline')
    || (guard && (Math.abs(d1.dx) > Math.max(4, ls + 2) || Math.abs(d1.dy) > 3))) { restore(el); if (d1) keepInk(); done(); return; }
  shift(d1);
  // 두 번 더 재서 남은 차이까지 (높이가 고정된 상자는 한쪽만 늘리면 절반만 움직인다)
  for (let i = 0; i < 2; i++) { const d = measure(); if (!d || (Math.abs(d.dx) < 0.2 && Math.abs(d.dy) < 0.2)) break; shift(d); }
  if (measure()) keepInk();
  done();
}

const SNAPPED = 'tagSnap';
/** 화면 픽셀(배율 1이면 1px, 2면 0.5px) 단위로 반올림 */
const px = (v: number) => { const d = window.devicePixelRatio || 1; return Math.round(v * d) / d; };

const PARITY = 'tagPar';
function unsnap(el: HTMLElement) {
  const p = el.dataset[PARITY];
  if (p != null) {
    const v = JSON.parse(p) as [string, string, string][];
    for (const [k, val, pr] of v) el.style.setProperty(k, val, pr);
    delete el.dataset[PARITY];
  }
  const o = el.dataset[SNAPPED];
  if (o == null) return;
  for (const [k, val, pr] of JSON.parse(o) as [string, string, string][]) el.style.setProperty(k, val, pr);
  delete el.dataset[SNAPPED];
}

/** 화면에 그려지는 글자 잉크의 화면 픽셀 범위 — 글자를 화면과 같은 소수점 자리 · 같은 크기(기기 배율)로 canvas에 그려 보고
 *  반 넘게 칠해진 픽셀만 센다. 글꼴 치수로 짐작하면 Y · W처럼 비스듬한 글자에서 1px씩 틀렸다 (사용자 제보 — YJHM 딱지) */
let rcv: HTMLCanvasElement | null = null;
function rasterInk(el: HTMLElement): { l: number; r: number; t: number; b: number } | null {
  const d = window.devicePixelRatio || 1;
  rcv ??= document.createElement('canvas');
  const c = rcv.getContext('2d', { willReadFrequently: true }) as (CanvasRenderingContext2D & { letterSpacing?: string }) | null;
  if (!c) return null;
  let L = Infinity, R = -Infinity, T = Infinity, B = -Infinity;
  const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode() as Text | null; n; n = tw.nextNode() as Text | null) {
    const t0 = n.nodeValue?.trim();
    if (!t0) continue;
    const pcs = getComputedStyle(n.parentElement!);
    const text = pcs.textTransform === 'uppercase' ? t0.toUpperCase() : pcs.textTransform === 'lowercase' ? t0.toLowerCase() : t0;
    const rg = document.createRange();
    rg.setStart(n, n.nodeValue!.length - n.nodeValue!.trimStart().length);
    rg.setEnd(n, n.nodeValue!.trimEnd().length);
    const rs = rg.getClientRects();
    if (rs.length !== 1) return null;
    const wrap = document.createElement('tag-align-w');
    const probe = document.createElement('tag-align-p');
    probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline;padding:0;margin:0;border:0';
    n.replaceWith(wrap); wrap.append(probe, n);
    const lb = probe.getBoundingClientRect().top;
    wrap.replaceWith(n);
    const base = Math.round((Math.round(lb + window.scrollY) - window.scrollY) * d);   // 그려지는 기준선(화면 픽셀)
    const fs = parseFloat(pcs.fontSize) * d, ls = (parseFloat(pcs.letterSpacing) || 0) * d;
    const prep = () => { c.font = `${pcs.fontStyle} ${pcs.fontWeight} ${fs}px ${pcs.fontFamily}`; if ('letterSpacing' in c) c.letterSpacing = `${ls}px`; c.textBaseline = 'alphabetic'; };
    prep();
    const pad = Math.ceil(fs);
    const W = Math.ceil(c.measureText(text).width + pad * 2), H = Math.ceil(fs * 2.5 + pad);
    rcv.width = W; rcv.height = H;
    prep();
    const x0 = rs[0].left * d, fx = x0 - Math.floor(x0);
    const oy = Math.round(fs * 1.6);
    c.clearRect(0, 0, W, H);
    c.fillText(text, pad + fx, oy);
    const px = c.getImageData(0, 0, W, H).data;
    let a = W, b = -1, t = H, u = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (px[(y * W + x) * 4 + 3] < 128) continue;
      if (x < a) a = x; if (x > b) b = x; if (y < t) t = y; if (y > u) u = y;
    }
    if (b < 0) continue;
    L = Math.min(L, Math.floor(x0) + a - pad); R = Math.max(R, Math.floor(x0) + b - pad + 1);
    T = Math.min(T, base + t - oy); B = Math.max(B, base + u - oy + 1);
  }
  return R > L ? { l: L, r: R, t: T, b: B } : null;
}

/** 정수 상자 안에서 글자가 반 픽셀 남는 경우(상자 폭 · 높이와 잉크의 홀짝이 달라서) — 모자란 쪽으로 상자를 1화면픽셀 늘린다.
 *  늘린 만큼 그쪽 여백도 더해 글자는 제자리에 둔다 (예: 왼쪽 10 · 오른쪽 9 → 10 · 10, 위 9 · 아래 8 → 9 · 9) */
function parity(el: HTMLElement) {
  if (!el.dataset[SNAPPED] || !el.offsetWidth) return;
  if (el.childElementCount && !textOnly(el)) return;
  const ink = rasterInk(el);
  if (!ink) return;
  const r = el.getBoundingClientRect();
  const d = window.devicePixelRatio || 1;
  const P = (v: number) => Math.round(v * d);
  const gl = ink.l - P(r.left), gr = P(r.right) - ink.r;
  const gt = ink.t - P(r.top), gb = P(r.bottom) - ink.b;
  const fixX = Math.abs(gl - gr) === 1, fixY = Math.abs(gt - gb) === 1;
  if (!fixX && !fixY) return;
  const cs = getComputedStyle(el);
  const keys = ['width', 'height', 'translate', 'padding-left', 'padding-right', 'padding-top', 'padding-bottom', 'margin-right', 'margin-bottom'];
  el.dataset[PARITY] = JSON.stringify(keys.map(k => [k, el.style.getPropertyValue(k), el.style.getPropertyPriority(k)]));
  const one = 1 / d;
  const put = (k: string, v: string) => el.style.setProperty(k, v, 'important');
  const [tx0, ty0] = (el.style.getPropertyValue('translate') || '0px 0px').split(' ').map(parseFloat);
  let tx = tx0 || 0, ty = ty0 || 0;
  // 늘린 만큼 margin을 줄여 차지하는 자리는 그대로 (옆 · 부모 줄이 밀리면 다른 상자가 다시 반 픽셀에 걸쳤다)
  if (fixX) {
    put('width', `${r.width + one}px`);
    put('margin-right', `${(parseFloat(cs.marginRight) || 0) - one}px`);
    if (gl < gr) { tx -= one; put('padding-left', `${parseFloat(cs.paddingLeft) + one}px`); }
    else put('padding-right', `${parseFloat(cs.paddingRight) + one}px`);
  }
  if (fixY) {
    put('height', `${r.height + one}px`);
    put('margin-bottom', `${(parseFloat(cs.marginBottom) || 0) - one}px`);
    if (gt < gb) { ty -= one; put('padding-top', `${parseFloat(cs.paddingTop) + one}px`); }
    else put('padding-bottom', `${parseFloat(cs.paddingBottom) + one}px`);
  }
  put('translate', `${tx.toFixed(3)}px ${ty.toFixed(3)}px`);
}

/** 폭을 정수로 · 자리를 화면 픽셀에. box면 margin으로(이미 translate를 쓰는 상자) */
function snap(el: HTMLElement, box = false) {
  unsnap(el);
  if (!el.offsetWidth) return;
  // 컴포넌트가 직접 준 폭 · 자리는 기억했다가 되돌린다
  el.dataset[SNAPPED] = JSON.stringify(['width', 'height', 'translate', 'margin-left', 'margin-top', 'margin-right', 'margin-bottom'].map(k => [k, el.style.getPropertyValue(k), el.style.getPropertyPriority(k)]));
  if (!box) {
    const w = el.getBoundingClientRect().width;
    const wi = Math.ceil(w - 0.01);
    // 늘린 만큼 오른쪽 margin을 줄여 차지하는 자리는 그대로 — 옆 상자 · 가운데 맞춘 줄이 밀리지 않게
    if (wi - w > 0.01) {
      const mr = parseFloat(getComputedStyle(el).marginRight) || 0;
      el.style.setProperty('width', `${wi}px`, 'important');
      el.style.setProperty('margin-right', `${mr - (wi - w)}px`, 'important');
    }
    // 높이도 정수로 (20.5px 딱지는 위아래 가장자리가 번져 글자가 반 픽셀 떠 보였다)
    const h = el.getBoundingClientRect().height;
    const hi = Math.ceil(h - 0.01);
    if (hi - h > 0.01) {
      const mb = parseFloat(getComputedStyle(el).marginBottom) || 0;
      el.style.setProperty('height', `${hi}px`, 'important');
      el.style.setProperty('margin-bottom', `${mb - (hi - h)}px`, 'important');
    }
  }
  const r = el.getBoundingClientRect();
  const sx = window.scrollX, sy = window.scrollY;
  const dx = px(r.left + sx) - (r.left + sx), dy = px(r.top + sy) - (r.top + sy);
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return;
  if (box) {
    const cs = getComputedStyle(el);
    el.style.setProperty('margin-left', `${parseFloat(cs.marginLeft) + dx}px`, 'important');
    el.style.setProperty('margin-top', `${parseFloat(cs.marginTop) + dy}px`, 'important');
  } else {
    el.style.setProperty('translate', `${dx.toFixed(3)}px ${dy.toFixed(3)}px`, 'important');
  }
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
      // 먼저 상자를 화면 픽셀에 붙이고(폭 · 자리), 그 상자 안에서 글자를 가운데로
      const snaps = [...document.querySelectorAll<HTMLElement>(SNAP)];
      // 맞추는 동안 변화 애니메이션(transition)을 끈다 — 켜 두면 바꾼 폭 · 자리가 천천히 움직여 중간값을 쟀다
      const trans = snaps.map(el => [el.style.getPropertyValue('transition'), el.style.getPropertyPriority('transition')]);
      snaps.forEach(el => el.style.setProperty('transition', 'none', 'important'));
      snaps.forEach(el => snap(el));
      const run = (el: HTMLElement, guard: boolean) => {
        if (seen.get(el) === keyOf(el)) return;
        restore(el);
        fix(el, guard);
        seen.set(el, keyOf(el));
      };
      document.querySelectorAll<HTMLElement>(SEL).forEach(el => run(el, false));
      document.querySelectorAll<HTMLElement>(BTN).forEach(el => { if (!el.matches(SEL)) run(el, true); });
      snaps.forEach(el => parity(el));
      // 가운데 상자(한마디)는 안쪽 딱지 폭이 정해진 뒤 자리만 — 그 안 딱지는 다시 한 번 픽셀에
      document.querySelectorAll<HTMLElement>(SNAP_BOX).forEach(el => {
        snap(el, true);
        el.querySelectorAll<HTMLElement>(SNAP).forEach(t => { snap(t); parity(t); });
      });
      void document.body.offsetWidth;
      snaps.forEach((el, i) => el.style.setProperty('transition', trans[i][0], trans[i][1]));
    };
    let timer = 0;
    const later = () => { clearTimeout(timer); timer = window.setTimeout(scan, 150); };
    // 화면 폭 · 글꼴이 바뀌면 처음부터 다시 잰다 (잰 기록도 지운다 — 남겨 두면 되돌린 채로 건너뛰었다)
    const reset = () => {
      seen = new WeakMap();
      document.querySelectorAll<HTMLElement>(`${SEL},${BTN}`).forEach(el => restore(el));
      document.querySelectorAll<HTMLElement>(`${SNAP},${SNAP_BOX}`).forEach(el => unsnap(el));
      later();
    };
    const mo = new MutationObserver(later);
    mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', reset);
    // 화면이 움직이며 들어오는 동안(페이지 · 창 등장 애니메이션) 잰 자리는 끝나면 달라진다 — 끝나면 다시
    document.addEventListener('animationend', later);
    document.fonts?.ready.then(reset).catch(() => {});
    document.fonts?.addEventListener?.('loadingdone', reset);   // 늦게 붙는 글꼴(ARCH 웹폰트)이 도착하면 다시 잰다
    later();
    return () => { mo.disconnect(); window.removeEventListener('resize', reset); document.removeEventListener('animationend', later); document.fonts?.removeEventListener?.('loadingdone', reset); clearTimeout(timer); };
  }, []);
  return null;
}
