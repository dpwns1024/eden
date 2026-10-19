'use client';
/**
 * 발췌 이미지 만들기 (v2.0 사용자 요청 — 관리자 전용, 시험판).
 *
 * 발췌 모드 — 왼쪽 아래 ✂ 버튼으로 켜고, 넣을 문단을 하나씩 누른다 (다시 누르면 빠진다 — 누른 칸만 들어간다).
 * 문단·이미지·인용구·구분선이 각각 한 칸이다. PC·모바일 같은 방식 (드래그로 고르기는 없앴다 — 사용자 요청).
 * 고른 부분은 홈페이지 배경 위 카드에 다시 그려 PNG로 만든다 → 미리보기 창에서 저장·공유.
 * 카드 아래 글씨는 그 글의 제목 — 본문 칸(또는 그 바깥)의 data-ex-title (없으면 페이지 제목).
 *
 * - 고른 부분을 그대로 복제해(range.cloneContents) 화면 밖 카드에 넣고 html-to-image로 찍는다.
 * - 이미지가 섞이면 브라우저가 그 파일을 받아 와야 한다 — Firebase는 저장소 CORS가 열려 있어야
 *   한다(설치 가이드 5번). 못 받아 오면 그 자리는 비워 두고 글만 찍는다.
 * - 로그 파일처럼 틀(iframe) 안에 뜨는 본문은 바깥에서 고를 수 없어 지원하지 않는다.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

/** 발췌 모드에서 문단을 고를 수 있는 본문 — 이 안의 바로 아래 칸(문단·이미지·인용구…)이 한 칸 */
const ROOTS = '.page .prose:not(.re-content), .page .post-body';
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

const stamp = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
};

/* ── 인용구 딱지는 찍은 뒤 캔버스로 직접 그린다 (v2.0 사용자 제보) ──
   html-to-image는 그림 안에서 글을 다시 배치하는데, 기기마다 글자가 놓이는 높이가 화면과 반 px~1px씩 달라
   (PC는 딱지가 처지고 폰은 뜸) 화면에서 맞춘 딱지가 발췌에서만 어긋났다. 웹 글꼴(JetBrains Mono)도 그림에 실리지 않아
   PC에서는 딱지 글꼴이 바뀌었다. 그래서 카드에서는 딱지를 비워 두고, 찍힌 그림에서 대사 첫 줄 글자의 실제 위아래를 찾아
   그 가운데에 딱지(번짐 · 글자 포함)를 그린다 — 기기와 상관없이 글자 기준으로 맞는다 */
type QuoteTag = { x: number; y: number; w: number; first: number; label: string; bg: string; glow: string };
const PR = 2;   // toPng pixelRatio

/** 카드 안 인용구 딱지 자리 · 색 · 이름 (카드 왼쪽 위 기준 CSS px) */
function collectTags(card: HTMLElement): QuoteTag[] {
  const cr = card.getBoundingClientRect();
  return Array.from(card.querySelectorAll<HTMLElement>('.ex-body blockquote')).flatMap(bq => {
    const p = bq.querySelector<HTMLElement>(':scope > p:first-child');
    if (!p) return [];
    const ps = getComputedStyle(p, '::before');
    const raw = ps.content;
    if (!raw || raw === 'none' || raw === 'normal') return [];
    const bs = getComputedStyle(bq);
    const r = bq.getBoundingClientRect();
    const lh = parseFloat(getComputedStyle(p).lineHeight) || 22;
    const pt = parseFloat(bs.paddingTop) || 0;
    return [{
      x: r.left - cr.left, y: r.top - cr.top + pt, w: r.width, first: lh,
      label: raw.replace(/^["']|["']$/g, '').toUpperCase(),
      bg: ps.backgroundColor, glow: bs.getPropertyValue('--qx').trim() || '#8fb0d8',
    }];
  });
}

/** 찍힌 그림 위에 딱지를 그린다 */
async function drawTags(url: string, tags: QuoteTag[]): Promise<string> {
  if (!tags.length) return url;
  const img = new Image();
  img.src = url;
  await img.decode();
  const cv = document.createElement('canvas');
  cv.width = img.naturalWidth; cv.height = img.naturalHeight;
  const ctx = cv.getContext('2d');
  if (!ctx) return url;
  ctx.drawImage(img, 0, 0);
  try { await document.fonts.load(`500 ${9 * PR}px "JetBrains Mono"`, 'EDEN'); } catch { /* 없으면 대체 글꼴 */ }
  /* 대사 첫 줄을 찍힌 그림에서 찾는다 (v2.0 사용자 제보 — 딱지가 위아래로 어긋남).
     html-to-image는 찍을 때 글씨를 0.1px 줄여(15 → 14.9px) 문단 줄바꿈이 화면 밖 카드와 한 줄씩 달라질 수 있다 —
     카드에서 잰 자리만 믿으면 딱지가 그만큼 밀렸다. 그래서 그림에서 「대사 줄」을 직접 찾는다:
     대사 글자는 흰색(본문 회색보다 밝다)이고, 딱지 칸(왼쪽 50px)은 비어 있다 — 본문 줄은 왼쪽 끝부터 글자가 차 있다.
     줄 사이가 짧게 이어지는 대사 줄 묶음 = 인용구 하나, 그 첫 줄 가운데에 딱지를 놓는다 */
  const W = cv.width, H = cv.height;
  const all = ctx.getImageData(0, 0, W, H).data;
  const lum = (x: number, y: number) => { const i = (y * W + x) * 4; return all[i] + all[i + 1] + all[i + 2]; };
  const zx0 = Math.round(tags[0].x * PR), zx1 = Math.round((tags[0].x + 50) * PR);
  const tx0 = Math.round((tags[0].x + 62) * PR), tx1 = Math.min(W, Math.round((tags[0].x + 62 + 320) * PR));
  const kind: number[] = [];   // 0 빈 줄 · 1 대사 글자 · 2 본문 글자
  for (let y = 0; y < H; y++) {
    let z = 0, wht = 0;
    for (let x = zx0; x < zx1; x++) if (lum(x, y) > 500) z++;
    if (z > 3 * PR) { kind.push(2); continue; }   // 딱지 칸에 글자 — 본문 줄 (아래 세로선 한 줄은 빼고)
    for (let x = tx0; x < tx1; x++) if (lum(x, y) > 690) wht++;
    kind.push(wht > 0 ? 1 : 0);
  }
  const quoteLine = tags[0].first * PR;   // 대사 한 줄 높이 (그림 px)
  const firsts: { top: number; bot: number }[] = [];
  let lastBot = -1e9, sawBody = false;
  for (let y = 0; y < H; y++) {
    if (kind[y] === 2) { sawBody = true; continue; }
    if (kind[y] !== 1) continue;
    const top = y; while (y + 1 < H && kind[y + 1] === 1) y++;
    // 같은 인용구의 다음 줄이면 넘긴다 — 본문 없이 한 줄 높이 안에서 이어질 때
    if (!sawBody && top - lastBot < quoteLine * 0.8) { lastBot = y; continue; }
    firsts.push({ top, bot: y }); lastBot = y; sawBody = false;
  }
  // 첫 줄 아래쪽에 붙은 같은 줄 조각(쉼표 꼬리 등)까지 한 줄로 — 줄 높이의 절반 안의 대사 글자를 합친다
  for (const f of firsts) { for (let y = f.bot + 1; y < Math.min(H, f.top + quoteLine * 0.6); y++) if (kind[y] === 1) f.bot = y; }
  const byOrder = firsts.length === tags.length;
  tags.forEach((t, k) => {
    const want = (t.y + t.first / 2) * PR;   // 카드에서 잰 자리 (못 찾으면 이 자리)
    let hit = byOrder ? firsts[k] : undefined;
    if (!hit) {
      let best = 60 * PR;
      for (const f of firsts) { const dd = Math.abs((f.top + f.bot) / 2 - want); if (dd < best) { best = dd; hit = f; } }
    }
    let cy = want;
    if (hit) {
      // 쉼표 꼬리처럼 몇 점뿐인 줄은 빼고 글자 몸통의 위아래로
      const rows: number[] = [];
      for (let y = hit.top; y <= hit.bot; y++) { let n = 0; for (let x = tx0; x < tx1; x++) if (lum(x, y) > 690) n++; rows.push(n); }
      const lim = Math.max(1, Math.max(...rows) * 0.06);
      const a = rows.findIndex(n => n >= lim);
      let b = rows.length - 1; while (b > a && rows[b] < lim) b--;
      cy = hit.top + (a + b + 1) / 2;
    }
    const bw = 47 * PR, bh = 15 * PR, bx = Math.round(t.x * PR), by = Math.round(cy - bh / 2);
    // 번짐 — 화면의 box-shadow(0 0 10px -2px)처럼: 2px 작은 상자에서 흐린 그림자
    ctx.save();
    ctx.shadowColor = t.glow; ctx.shadowBlur = 10 * PR; ctx.fillStyle = t.glow;
    ctx.fillRect(bx + 2 * PR, by + 2 * PR, bw - 4 * PR, bh - 4 * PR);
    ctx.restore();
    ctx.fillStyle = t.bg && t.bg !== 'rgba(0, 0, 0, 0)' ? t.bg : '#c9d6e6';
    ctx.fillRect(bx, by, bw, bh);
    // 글자 — 자간 .2em, 상자 가운데(잉크 기준)
    ctx.font = `500 ${9 * PR}px "JetBrains Mono", "Noto Sans KR", monospace`;
    ctx.fillStyle = '#05070a'; ctx.textBaseline = 'alphabetic';
    const sp = 1.8 * PR, room = bw - 6 * PR;
    let chars = Array.from(t.label);
    const width = (cs: string[]) => cs.reduce((a, c) => a + ctx.measureText(c).width, 0) + sp * Math.max(0, cs.length - 1);
    if (width(chars) > room) { while (chars.length > 1 && width([...chars, '…']) > room) chars = chars.slice(0, -1); chars = [...chars, '…']; }
    const m = ctx.measureText(chars.join(''));
    const base = by + bh / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
    let x = bx + (bw - width(chars)) / 2;
    for (const c of chars) { ctx.fillText(c, x, base); x += ctx.measureText(c).width + sp; }
  });
  return cv.toDataURL('image/png');
}

/* ── 발췌 템플릿 (v2.0 사용자 요청) ──
   글만(지금 모양) · 가로(글 위에 사진 띠) · 세로(왼쪽 세로 사진 + 오른쪽 글). 사진은 그때그때 직접 고른다 —
   저장소에 올리지 않고 이 브라우저 안에서만 줄여(긴 변 1600px) 카드에 넣는다 */
type ExTpl = 'text' | 'wide' | 'side';
const TPL_KEY = 'ohome.excerpt.tpl';
const TPL_LABEL: Record<ExTpl, string> = { text: '글만', wide: '가로', side: '세로' };
/* 다 만든 그림에서 사진 위치 고치기 (v2.0 사용자 요청 — 결과 화면을 보면서 조절).
   찍은 그림(base)과 사진 칸 자리(rect, 그림 px)를 들고 있다가, 위치가 바뀌면 그 칸만 캔버스에 다시 그린다 —
   카드를 다시 찍지 않아 끌면 바로 따라온다. 그리는 법은 CSS object-fit: cover + object-position과 같다 */
type Shot = { base: HTMLImageElement; photo: HTMLImageElement; rect: { x: number; y: number; w: number; h: number }; tpl: ExTpl };
const coverOf = (s: Shot) => {
  const { w, h } = s.rect;
  const k = Math.max(w / s.photo.naturalWidth, h / s.photo.naturalHeight);
  return { dw: s.photo.naturalWidth * k, dh: s.photo.naturalHeight * k };
};
function drawShot(cv: HTMLCanvasElement, s: Shot, pos: number) {
  if (cv.width !== s.base.naturalWidth) cv.width = s.base.naturalWidth;
  if (cv.height !== s.base.naturalHeight) cv.height = s.base.naturalHeight;
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  ctx.drawImage(s.base, 0, 0);
  // 칸 가장자리는 바깥쪽 정수로 — 반 픽셀 남은 옛 사진 테두리가 비치지 않게
  const x = Math.floor(s.rect.x), y = Math.floor(s.rect.y);
  const w = Math.ceil(s.rect.x + s.rect.w) - x, h = Math.ceil(s.rect.y + s.rect.h) - y;
  const { dw, dh } = coverOf(s);
  const px = s.tpl === 'wide' ? 50 : pos, py = s.tpl === 'wide' ? pos : 50;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = '#0a0d12'; ctx.fillRect(x, y, w, h);
  ctx.drawImage(s.photo, s.rect.x + (s.rect.w - dw) * px / 100, s.rect.y + (s.rect.h - dh) * py / 100, dw, dh);
  ctx.restore();
}
/** 고른 사진을 긴 변 1600px 이하 JPEG로 — 큰 원본이 그대로 들어가 이미지 만들기가 느려지지 않게 */
async function shrinkImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image();
    im.src = url;
    await im.decode();
    const k = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight));
    const cv = document.createElement('canvas');
    cv.width = Math.round(im.naturalWidth * k); cv.height = Math.round(im.naturalHeight * k);
    cv.getContext('2d')?.drawImage(im, 0, 0, cv.width, cv.height);
    return cv.toDataURL('image/jpeg', 0.9);
  } finally { URL.revokeObjectURL(url); }
}

export function ExcerptMaker() {
  const { isAdmin, ready } = useAuth();
  const toast = useToast();
  const on = ready && isAdmin;
  const [busy, setBusy] = useState(false);
  const [img, setImg] = useState<string | null>(null);
  // 발췌 모드 (탭으로 문단 고르기 — 누른 칸만, 다시 누르면 빼기)
  const [mode, setMode] = useState(false);
  const [hasRoots, setHasRoots] = useState(false);
  // root — 고른 칸들이 든 본문, sel — 누른 칸들 (누른 순서, 만들 때는 글 순서로)
  const [pick, setPick] = useState<{ root: Element; sel: Element[] } | null>(null);
  const pickRef = useRef(pick);
  pickRef.current = pick;
  // 템플릿 · 직접 고른 사진 · 사진 위치(가로형은 위아래, 세로형은 좌우 — 0~100%)
  const [tpl, setTplState] = useState<ExTpl>('text');
  useEffect(() => { try { const v = localStorage.getItem(TPL_KEY); if (v === 'wide' || v === 'side') setTplState(v); } catch { /* */ } }, []);
  const setTpl = (v: ExTpl) => { setTplState(v); try { localStorage.setItem(TPL_KEY, v); } catch { /* */ } };
  const [exPhoto, setExPhoto] = useState<string | null>(null);
  const [exPos, setExPos] = useState(30);
  const photoRef = useRef<HTMLInputElement>(null);
  const [shot, setShot] = useState<Shot | null>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => { if (shot && cvRef.current) drawShot(cvRef.current, shot, exPos); }, [shot, exPos]);
  // 결과 그림에서 사진 끌기 — 사진 칸 안에서 누를 때만. 손가락이 움직인 만큼 사진이 따라오게 남는 길이로 나눈다
  const shotDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cv = e.currentTarget; const s = shot;
    if (!s) return;
    const r = cv.getBoundingClientRect(); const k = cv.width / r.width;
    const ix = (e.clientX - r.left) * k, iy = (e.clientY - r.top) * k;
    if (ix < s.rect.x || ix > s.rect.x + s.rect.w || iy < s.rect.y || iy > s.rect.y + s.rect.h) return;
    const v = s.tpl === 'wide'; const { dw, dh } = coverOf(s);
    const room = v ? dh - s.rect.h : dw - s.rect.w;
    if (room < 1) return;
    const start = v ? e.clientY : e.clientX; const base = exPos;
    cv.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const d = ((v ? ev.clientY : ev.clientX) - start) * k;
      setExPos(Math.max(0, Math.min(100, Math.round((base - d / room * 100) * 10) / 10)));
    };
    const up = () => { cv.removeEventListener('pointermove', move); cv.removeEventListener('pointerup', up); cv.removeEventListener('pointercancel', up); };
    cv.addEventListener('pointermove', move); cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  };
  // 저장 · 공유할 그림 — 사진을 옮겼으면 캔버스에서 지금 모습으로
  const outUrl = () => (shot && cvRef.current ? cvRef.current.toDataURL('image/png') : img);
  const closeImg = () => { setImg(null); setShot(null); };
  const onPhoto = async (f?: File) => {
    if (!f) return;
    try { setExPhoto(await shrinkImage(f)); setExPos(tpl === 'side' ? 50 : 30); }
    catch { toast('사진을 읽지 못했습니다'); }
  };

  // 이 페이지에 고를 수 있는 본문이 있는가 — 있을 때만 ✂ 버튼을 보인다
  useEffect(() => {
    if (!on) return;
    const check = () => setHasRoots(!!document.querySelector(ROOTS));
    check();
    const t = window.setInterval(check, 1200);
    return () => window.clearInterval(t);
  }, [on]);

  /** 본문(root) 바로 아래 칸들 중 누른 칸만, 글 순서대로 (v2.0 사용자 요청 — 시작~끝 사이 전부가 아니라 고른 문단만) */
  const pickedBlocks = (p: { root: Element; sel: Element[] } | null): Element[] => {
    if (!p) return [];
    return Array.from(p.root.children).filter(k => p.sel.includes(k));
  };
  // 고른 칸 표시
  useEffect(() => {
    const els = pickedBlocks(pick);
    els.forEach(e => e.classList.add('ex-picked'));
    return () => els.forEach(e => e.classList.remove('ex-picked'));
  }, [pick]);
  // 모드 중 본문 누르기 → 누른 칸을 넣고, 이미 고른 칸이면 뺀다 (다른 글 본문을 누르면 거기서 새로)
  useEffect(() => {
    if (!mode) { setPick(null); return; }
    document.documentElement.classList.add('ex-mode');
    const onClick = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (!t || t.closest('.excerpt-bar, .excerpt-toggle, .mng-box')) return;
      const root = t.closest(ROOTS);
      if (!root) return;
      let blk: Element | null = t;
      while (blk && blk.parentElement !== root) blk = blk.parentElement;
      if (!blk) return;
      e.preventDefault(); e.stopPropagation();   // 링크·그림 확대 대신 고르기
      // 상태 갱신 함수 안에서 다른 값을 바꾸면 개발 모드의 두 번 실행에 꼬인다 — 지금 값을 보고 한 번에 정한다
      const prev = pickRef.current;
      if (!prev || prev.root !== root) { setPick({ root, sel: [blk] }); return; }
      const sel = prev.sel.includes(blk) ? prev.sel.filter(x => x !== blk) : [...prev.sel, blk];
      setPick(sel.length ? { root, sel } : null);
    };
    document.addEventListener('click', onClick, true);
    return () => { document.removeEventListener('click', onClick, true); document.documentElement.classList.remove('ex-mode'); };
  }, [mode]);

  const make = async () => {
    if (busy) return;
    const els = pickedBlocks(pick);
    if (!els.length) return;
    const frag = document.createDocumentFragment();
    /* 화면에 보이는 간격 그대로 (v2.0 사용자 제보 — 엔터 친 곳이 없는데 발췌하면 문단 사이가 한 줄 벌어졌다).
       붙여 넣은 글에는 아주 작은 글씨(1px 등)로 된 줄이 숨어 있곤 하다 — 비어 있거나, 보이지 않는 공백 글자
       (ㅤ 한글 채움 문자 · 점자 빈칸 등)만 들어 있다. 화면에서는 높이가 거의 없어 안 보이지만,
       카드에서는 글씨 크기를 통일하면서 한 줄만큼 커졌다. 그래서
       ① 화면에서 반 줄보다 낮게 그려진 칸은 (그림 · 구분선이 아니면) 내용과 상관없이 빼고
       ② 칸 사이 간격은 화면에서 잰 값을 카드 글씨 크기에 맞춰 옮긴다 — 뺀 칸이 차지하던 자리도 그대로 남는다 */
    const rs = getComputedStyle(pick!.root);
    const pageFont = parseFloat(rs.fontSize) || 15;
    const line = parseFloat(rs.lineHeight) || pageFont * 1.8;
    const scale = 15 / pageFont;   // 카드 본문 글씨 15px (globals.css .excerpt-card .ex-body)
    const MEDIA = 'img,video,iframe,hr,svg,canvas,table';
    const media = (e: Element) => e.matches(MEDIA) || !!e.querySelector(MEDIA);
    // 보이는 글자가 없는가 — 공백 · 줄바꿈 없는 공백 · 폭 없는 글자 · ㅤ(한글 채움) · 점자 빈칸 · 전각 공백
    const INVISIBLE = /[\s\u00a0\u180e\u200b-\u200f\u2028\u2029\u2060\ufeff\u115f\u1160\u3164\u2800\u3000\uffa0]/g;
    const blankText = (e: Element) => !(e.textContent ?? '').replace(INVISIBLE, '');
    /* 화면 모양 따라 하기 (v2.0 — 숨은 줄이 어떤 꼴이든) — 복제본의 칸마다 화면에서 실제로 그려진
       표시 방식 · 여백 · 안쪽 여백 · 줄바꿈 규칙을 카드 비율로 옮긴다. 글씨 크기 · 줄 간격은 카드에서 통일하되
       (붙여 넣은 글의 제각각 크기 정리), 화면에서 아주 작게 그려진 글씨(숨은 줄)는 작게 그대로 둔다.
       화면에 없는 빈 줄 표시(::before 공백)는 카드에서도 붙이지 않는다 */
    const px = (v: string) => `${((parseFloat(v) || 0) * scale).toFixed(2)}px`;
    const copyLayout = (o: Element, c: HTMLElement, keep = false) => {
      if (o.matches(MEDIA)) return;
      const cs = getComputedStyle(o);
      const set = (k: string, v: string) => c.style.setProperty(k, v, 'important');
      set('display', cs.display);
      set('white-space', cs.whiteSpace);
      for (const side of ['top', 'right', 'bottom', 'left']) {
        set(`margin-${side}`, px(cs.getPropertyValue(`margin-${side}`)));
        set(`padding-${side}`, px(cs.getPropertyValue(`padding-${side}`)));
      }
      const fs = parseFloat(cs.fontSize);
      if (fs && (keep || fs < pageFont * 0.6)) {   // keep — HTML로 꾸민 상자: 글씨 크기를 통일하지 않고 화면 그대로 (작은 라벨이 커지던 것)
        set('font-size', px(cs.fontSize));
        set('line-height', cs.lineHeight.endsWith('px') ? px(cs.lineHeight) : 'normal');
      }
      // 인용구 딱지 · 색 선은 위 여백 기준으로 자리를 잡는다 (globals.css --qpt) — 비율대로 바뀐 위 여백을 알려 준다
      if (o.matches('blockquote')) { c.style.setProperty('--qpt', px(cs.paddingTop)); c.style.setProperty('--qpl', px(cs.paddingLeft)); }
      const before = getComputedStyle(o, '::before').content;
      if (!before || before === 'none' || before === 'normal') c.setAttribute('data-ex-nobefore', '');
    };
    const copyTree = (o: Element, c: HTMLElement, keep = false) => {
      const os = [o, ...Array.from(o.querySelectorAll('*'))];
      const cs = [c, ...Array.from(c.querySelectorAll<HTMLElement>('*'))];
      if (os.length !== cs.length) return;
      os.forEach((x, i) => copyLayout(x, cs[i], keep));
    };
    let prevEl: Element | null = null, prevBottom = 0;
    els.forEach(e => {
      const r = e.getBoundingClientRect();
      const isMedia = media(e);
      if (!isMedia && r.height < line * 0.5) return;   // 화면에서 안 보이는 칸
      const c = e.cloneNode(true) as HTMLElement;
      c.classList.remove('ex-picked');
      copyTree(e, c, e.matches(':is(div,section,table,figure,aside,article)[style]'));
      // 보이는 글자가 없는 빈 줄은 화면에서의 높이 그대로 — 글씨 크기를 통일해도 커지지 않게
      const pin = (el: HTMLElement, h: number) => {
        el.style.setProperty('height', `${(h * scale).toFixed(1)}px`, 'important');
        el.style.setProperty('min-height', '0', 'important');
        el.style.setProperty('overflow', 'hidden', 'important');
      };
      if (!isMedia && blankText(e)) pin(c, r.height);
      // 고른 칸 안쪽(문단을 감싼 칸이 있는 글)도 같은 기준 — 복제본은 구조가 같으니 같은 순서로 짝지어 본다
      const INNER = 'p,div,li,h1,h2,h3,h4,h5,h6,blockquote,section';
      const os = Array.from(e.querySelectorAll(INNER)), cs = Array.from(c.querySelectorAll<HTMLElement>(INNER));
      if (os.length === cs.length) {
        os.forEach((o, i) => {
          if (media(o)) return;
          const h = o.getBoundingClientRect().height;
          if (h < line * 0.5) cs[i].remove();
          else if (blankText(o)) pin(cs[i], h);
        });
      }
      /* 앞 칸과의 간격 — 바로 이어진 칸(사이에 안 보이는 칸만 있음)이면 화면에서 잰 그대로,
         사이를 건너뛰고 고른 칸이면 이 칸 바로 위 칸과의 간격(원래 문단 간격)을 쓴다 */
      let gapPx = 0;
      if (prevEl) {
        let next = true;
        for (let k = prevEl.nextElementSibling; k && k !== e; k = k.nextElementSibling) {
          if (media(k) || k.getBoundingClientRect().height >= line * 0.5) { next = false; break; }
        }
        if (next) gapPx = r.top - prevBottom;
        else {
          let k = e.previousElementSibling;
          while (k && !k.getClientRects().length) k = k.previousElementSibling;
          gapPx = k ? r.top - k.getBoundingClientRect().bottom : 0;
        }
      }
      const gap = Math.max(0, gapPx) * scale;
      c.style.setProperty('margin-top', `${gap.toFixed(1)}px`, 'important');
      c.style.setProperty('margin-bottom', '0', 'important');
      frag.appendChild(c);
      prevEl = e;
      prevBottom = r.bottom;
    });
    if (!frag.childNodes.length) return;
    setBusy(true);
    // 화면 밖 카드 — ARCH 글 모양(.page-arch .post-body)을 그대로 빌려 쓴다
    const card = document.createElement('div');
    card.className = 'excerpt-card page-arch';
    // ARCH면 홈페이지 바탕(격자·촘촘한 가로줄·빛·가장자리 어둠)을 CSS가 그린다 — 몸통 배경은 단색이라 그대로 쓰면 밋밋하다.
    // 그 밖의 디자인은 지금 페이지 배경을 빌려 온다
    if (!document.documentElement.classList.contains('ui-arch')) {
      const bs = getComputedStyle(document.body);
      const bgImg = getComputedStyle(document.body, '::before').backgroundImage;
      card.style.backgroundColor = bs.backgroundColor && bs.backgroundColor !== 'rgba(0, 0, 0, 0)' ? bs.backgroundColor : '#07090d';
      card.style.backgroundImage = [bgImg && bgImg !== 'none' ? bgImg : '', bs.backgroundImage !== 'none' ? bs.backgroundImage : '']
        .filter(Boolean).join(',') || 'none';
    }
    const frame = document.createElement('div');
    frame.className = 'ex-frame';
    // 템플릿 — 사진을 안 골랐으면 글만으로
    const useTpl: ExTpl = tpl !== 'text' && exPhoto ? tpl : 'text';
    if (tpl !== 'text' && !exPhoto) toast('사진을 고르지 않아 글만으로 만듭니다');
    let photoEl: HTMLImageElement | null = null;
    if (useTpl !== 'text') {
      card.classList.add(`ex-tpl-${useTpl}`);
      const box = document.createElement('div');
      box.className = useTpl === 'wide' ? 'ex-hero' : 'ex-side';
      photoEl = document.createElement('img');
      photoEl.src = exPhoto!;
      photoEl.alt = '';
      photoEl.style.objectPosition = useTpl === 'wide' ? `50% ${exPos}%` : `${exPos}% 50%`;
      box.appendChild(photoEl);
      frame.appendChild(box);
    }
    const body = document.createElement('div');
    body.className = 'post-body ex-body';
    body.appendChild(frag);
    // 복제된 이미지가 늦게 뜨는 칸(지연 로딩)이면 바로 그리게
    body.querySelectorAll('img').forEach(im => { im.loading = 'eager'; im.removeAttribute('srcset'); });
    /* 글씨 크기 들쭉날쭉 방지 (v2.0 사용자 제보 — 짧은 인용구만 작게 찍힘).
       ① 붙여 넣을 때 따라온 글자 크기·글꼴 지정을 지우고
       ② 아이폰 사파리의 「글자 자동 확대」를 끈다 — 넓은 칸의 글씨만 키워서 폭이 좁은(짧은) 인용구만 작아 보였다 */
    body.querySelectorAll<HTMLElement>('*').forEach(el => {
      // 화면 따라 하기에서 일부러 넣은 값(!important)은 남긴다 — 붙여 넣을 때 따라온 지정만 지운다
      if (el.style.getPropertyPriority('font-size') !== 'important') el.style.removeProperty('font-size');
      if (el.style.getPropertyPriority('line-height') !== 'important') el.style.removeProperty('line-height');
      el.style.removeProperty('font-family');
      if (el.tagName === 'FONT') { el.removeAttribute('size'); el.removeAttribute('face'); }
    });
    [card, body].forEach(el => { el.style.setProperty('-webkit-text-size-adjust', '100%'); el.style.setProperty('text-size-adjust', '100%'); });
    const foot = document.createElement('div');
    foot.className = 'ex-foot';
    // 글 제목 (v2.0 사용자 요청 — 홈 제목 대신). 본문 칸에 적어 둔 data-ex-title, 없으면 페이지 제목
    foot.textContent = pick?.root.closest('[data-ex-title]')?.getAttribute('data-ex-title')?.trim() || document.title || '';
    frame.appendChild(body);
    card.appendChild(frame);
    card.appendChild(foot);
    document.body.appendChild(card);
    let photoRect: Shot['rect'] | null = null;
    setShot(null);
    try {
      /* 글꼴이 다 온 뒤에 잰다 — 카드 글씨(Noto Sans KR 300)가 아직 안 왔으면 대체 글꼴로 줄이 늘어난 채 재어,
         찍을 때(글꼴을 넣어 그린다) 칸 높이 · 딱지 · 사진 자리가 어긋났다 (처음 만들 때만 가끔) */
      void card.offsetHeight;
      try { await document.fonts.ready; } catch { /* 못 기다려도 찍는다 */ }
      /* 틀 밖으로 나가는 칸 줄이기 (v2.0 사용자 제보 — HTML로 넣은 상자가 오른쪽으로 삐져나옴).
         카드는 화면 본문보다 좁아, 화면 폭에 맞춰 둔 고정 폭 · 왼쪽 들여쓰기(margin)가 있는 칸은 max-width만으로는 안 막혔다 —
         배치된 뒤 실제로 본문 오른쪽 끝을 넘는 칸의 폭을 남은 만큼으로 줄인다 (바깥 칸부터 차례로) */
      const lim = body.getBoundingClientRect().right;
      body.querySelectorAll<HTMLElement>('*').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > lim + 0.5) {
          el.style.setProperty('width', `${Math.max(0, lim - r.left).toFixed(1)}px`, 'important');
          el.style.setProperty('max-width', 'none', 'important');
          el.style.setProperty('min-width', '0', 'important');
        }
      });
      if (photoEl) {
        try { await photoEl.decode(); } catch { /* 못 읽어도 나머지는 찍는다 */ }
        /* 세로형은 4:5에 가깝게, 아래 빈 여백 없이 (v2.0 사용자 요청). 글씨를 줄이는 대신 카드 폭을 찾는다 —
           폭을 넓히면 글이 짧아지고(높이↓) 4:5 높이는 커지니, 둘이 만나는 폭을 반씩 좁혀 찾고 높이는 글 끝에 맞춘다.
           글씨 · 딱지 · 여백 비율이 그대로라 그림에서는 글씨 크기만 달라 보인다. 아주 짧거나(폭 640) 아주 길면(폭 1600) 그 폭에서 글 길이대로.
           가로형은 폭 · 사진 띠 높이만 고정하고 높이는 글 길이대로 */
        if (useTpl === 'side') {
          const over = (w: number) => { card.style.width = `${w}px`; return card.offsetHeight - w * 1.25; };
          let lo = 640, hi = 1600;
          if (over(lo) <= 0) hi = lo;
          else if (over(hi) < 0) {
            while (hi - lo > 2) { const mid = Math.round((lo + hi) / 2); if (over(mid) > 0) lo = mid; else hi = mid; }
          }
          over(hi);
        }
        // 사진 칸 높이를 px로 박아 둔다 — 찍을 때 높이 계열은 옮기지 않아(아래 FREE) 가로형 사진 띠가 납작해졌다
        // 사진도 같이 — 높이를 안 옮기면 그림은 제 비율대로 줄어 칸 위쪽에만 남는다
        const box = photoEl.parentElement as HTMLElement;
        const bh = `${box.getBoundingClientRect().height}px`;
        box.style.height = bh;
        photoEl.style.height = bh;
        const b = box.getBoundingClientRect(), c = card.getBoundingClientRect();
        photoRect = { x: (b.left - c.left) * PR, y: (b.top - c.top) * PR, w: b.width * PR, h: b.height * PR };
      }
      const { toPng } = await import('html-to-image');
      // 화면 밖 위치(left:-30000px)는 찍을 때 빼야 한다 — 그대로 두면 그림 밖에 그려져 하얗게 나온다
      /* 높이는 옮기지 않는다 (v2.0 사용자 제보 — 엔터 친 곳이 없는데 문단 사이가 한 줄 벌어졌다).
         html-to-image는 찍을 때 글씨를 0.1px 줄이면서(15 → 14.9px) 칸마다 높이는 화면 밖 카드에서 잰 값으로 고정한다 —
         마지막 줄이 짧은 문단은 글씨가 줄면 한 줄이 줄어드는데, 고정된 높이만큼 빈 줄이 남아 엔터처럼 보였다.
         높이 계열만 빼면 찍는 순간의 글씨에 맞춰 높이가 다시 정해진다 */
      const FREE = new Set(['height', 'block-size', 'min-block-size', 'max-block-size']);
      const includeStyleProperties = Array.from(getComputedStyle(document.documentElement)).filter(n => !FREE.has(n));
      const opts = { pixelRatio: PR, cacheBust: false, imagePlaceholder: BLANK, includeStyleProperties,
        // 카드 높이만은 화면 밖에서 잰 값 그대로 — 그림 크기와 같아야 위아래 여백이 똑같이 나뉜다
        style: { position: 'static', left: '0', top: '0', margin: '0', height: `${card.offsetHeight}px`,
          // 사진 템플릿은 위에 붙여 찍는다 — 가운데 맞춤이면 줄바꿈이 한 줄 달라질 때 사진 칸이 내려가, 결과 화면에서 사진을 다시 그리는 자리(photoRect)와 어긋난다
          ...(photoEl ? { justifyContent: 'flex-start' } : {}) } as Partial<CSSStyleDeclaration> };
      // 딱지 자리 · 색을 읽어 두고 카드에서는 비운다 — 찍은 뒤 캔버스로 그린다 (위 drawTags)
      const tags = collectTags(card);
      card.classList.add('ex-tags-later');
      let url: string;
      try { url = await toPng(card, opts); }
      catch { url = await toPng(card, { ...opts, skipFonts: true }); }   // 글꼴을 못 받아 오면 글꼴 없이라도
      try { url = await drawTags(url, tags); } catch { /* 못 그리면 딱지 없는 그림이라도 */ }
      if (photoEl && photoRect) {
        try {
          const base = new Image(); base.src = url; await base.decode();
          setShot({ base, photo: photoEl, rect: photoRect, tpl: useTpl });
        } catch { /* 못 읽으면 고치기 없이 그림만 */ }
      }
      setImg(url);
    } catch (e) {
      toast(`이미지를 만들지 못했습니다 — ${e instanceof Error ? e.message : '알 수 없는 오류'}`);
    } finally {
      card.remove();
      setBusy(false);
    }
  };

  const save = () => {
    const url = outUrl();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `excerpt-${stamp()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  const share = async () => {
    const url = outUrl();
    if (!url) return;
    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], `excerpt-${stamp()}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] });
      else save();
    } catch { /* 공유 취소 */ }
  };

  if (!on) return null;
  return (
    <>
      {/* 발췌 모드 — ✂ 켜기/끄기, 켜면 아래 안내 막대 */}
      {hasRoots && (
        <button type="button" className={`excerpt-toggle${mode ? ' on' : ''}`} aria-label="발췌 모드"
          onClick={() => setMode(m => !m)}>✂</button>
      )}
      {mode && (
        <div className="excerpt-bar">
          <span>{!pick ? '발췌할 문단을 누르세요' : `${pickedBlocks(pick).length}칸 선택됨 · 다시 누르면 빠져요`}</span>
          {/* 템플릿 (v2.0 사용자 요청) — 글만 · 가로(위 사진) · 세로(왼쪽 사진) */}
          <span className="ex-tpls" role="group" aria-label="발췌 템플릿">
            {(['text', 'wide', 'side'] as ExTpl[]).map(t => (
              <button key={t} type="button" className={tpl === t ? 'on' : ''} onClick={() => setTpl(t)}>{TPL_LABEL[t]}</button>
            ))}
          </span>
          {tpl !== 'text' && (
            <>
              <button type="button" className={exPhoto ? 'on' : ''} onClick={() => photoRef.current?.click()}>{exPhoto ? '사진 ✓' : '사진 고르기'}</button>
              <input ref={photoRef} type="file" accept="image/*" hidden onChange={e => { void onPhoto(e.target.files?.[0]); e.target.value = ''; }} />
            </>
          )}
          {pick && <button type="button" onClick={() => setPick(null)}>다시</button>}
          {pick && <button type="button" className="go" disabled={busy} onClick={() => void make()}>{busy ? '만드는 중…' : '이미지 만들기'}</button>}
          <button type="button" onClick={() => setMode(false)}>끄기</button>
        </div>
      )}
      <Modal open={!!img} onClose={closeImg} title="발췌 이미지"
        actions={<>
          <button className="btn btn-ghost" onClick={closeImg}>닫기</button>
          {typeof navigator !== 'undefined' && 'share' in navigator && <button className="btn btn-ghost" onClick={() => void share()}>공유</button>}
          <button className="btn btn-dark" onClick={save}>저장</button>
        </>}>
        {img && (shot
          ? <canvas ref={cvRef} className="excerpt-preview ex-live" aria-label="발췌 이미지" onPointerDown={shotDown}
              style={{ touchAction: shot.tpl === 'wide' ? 'none' : 'pan-y' }} />
          : <img src={img} alt="발췌 이미지" className="excerpt-preview" />)}
        {shot && <p className="ex-adj">사진을 끌어서 위치를 옮길 수 있어요</p>}
      </Modal>
    </>
  );
}
