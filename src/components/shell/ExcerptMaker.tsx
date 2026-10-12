'use client';
/**
 * 발췌 이미지 만들기 (v2.0 사용자 요청 — 관리자 전용, 시험판).
 *
 * 두 가지 방법으로 고른다.
 *   1. 드래그 — 글을 드래그해 고르면 고른 곳 아래에 「발췌 이미지」 버튼이 뜬다 (PC에 편함)
 *   2. 발췌 모드 — 왼쪽 아래 ✂ 버튼으로 켜고, 시작 문단 → 끝 문단을 차례로 누르면 그 사이가 통째로 골라진다
 *      (모바일에 편함). 문단·이미지·인용구·구분선이 각각 한 칸이다.
 * 고른 부분은 홈페이지 배경 위 카드에 다시 그려 PNG로 만든다 → 미리보기 창에서 저장·공유.
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

/** 고를 수 없는 곳 — 입력칸·에디터·창(모달)·메뉴 */
const BLOCKED = 'input, textarea, select, [contenteditable="true"], [contenteditable=""], .re-content, .mng-box, .topbar, .oh-menu, .excerpt-btn';
/** 발췌 모드에서 문단을 고를 수 있는 본문 — 이 안의 바로 아래 칸(문단·이미지·인용구…)이 한 칸 */
const ROOTS = '.page .prose:not(.re-content), .page .post-body';
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

const stamp = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
};

export function ExcerptMaker() {
  const { isAdmin, ready } = useAuth();
  const toast = useToast();
  const on = ready && isAdmin;
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const rangeRef = useRef<Range | null>(null);
  const [busy, setBusy] = useState(false);
  const [img, setImg] = useState<string | null>(null);
  // 발췌 모드 (탭으로 시작·끝 문단 고르기)
  const [mode, setMode] = useState(false);
  const [hasRoots, setHasRoots] = useState(false);
  // done — 끝 문단까지 골랐는가 (아니면 다음 누름이 끝 문단)
  const [pick, setPick] = useState<{ root: Element; a: Element; b: Element; done: boolean } | null>(null);
  const pickRef = useRef(pick);
  pickRef.current = pick;

  // 이 페이지에 고를 수 있는 본문이 있는가 — 있을 때만 ✂ 버튼을 보인다
  useEffect(() => {
    if (!on) return;
    const check = () => setHasRoots(!!document.querySelector(ROOTS));
    check();
    const t = window.setInterval(check, 1200);
    return () => window.clearInterval(t);
  }, [on]);

  /** 본문(root) 바로 아래 칸들 중 a~b 사이 (순서 무관) */
  const pickedBlocks = (p: { root: Element; a: Element; b: Element; done?: boolean } | null): Element[] => {
    if (!p) return [];
    const kids = Array.from(p.root.children);
    const i = kids.indexOf(p.a), j = kids.indexOf(p.b);
    if (i < 0 || j < 0) return [];
    return kids.slice(Math.min(i, j), Math.max(i, j) + 1);
  };
  // 고른 칸 표시
  useEffect(() => {
    const els = pickedBlocks(pick);
    els.forEach(e => e.classList.add('ex-picked'));
    return () => els.forEach(e => e.classList.remove('ex-picked'));
  }, [pick]);
  // 모드 중 본문 누르기 → 첫 번째는 시작, 두 번째는 끝, 그다음은 새 시작
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
      setPick(prev && !prev.done && prev.root === root ? { ...prev, b: blk, done: true } : { root, a: blk, b: blk, done: false });
    };
    document.addEventListener('click', onClick, true);
    return () => { document.removeEventListener('click', onClick, true); document.documentElement.classList.remove('ex-mode'); };
  }, [mode]);

  // 고른 범위를 지켜보다가 버튼 자리를 잡는다
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    const check = () => {
      raf = 0;
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) { setPos(null); return; }
      const r = sel.getRangeAt(0);
      const base = r.commonAncestorContainer;
      const el = base instanceof Element ? base : base.parentElement;
      if (!el || !el.closest('.page') || el.closest(BLOCKED) || !sel.toString().trim()) { setPos(null); return; }
      const rect = r.getBoundingClientRect();
      if (!rect.width && !rect.height) { setPos(null); return; }
      rangeRef.current = r.cloneRange();
      const below = rect.bottom + 46 < window.innerHeight;
      setPos({
        x: Math.max(60, Math.min(window.innerWidth - 60, rect.left + rect.width / 2)),
        y: below ? rect.bottom + 10 : Math.max(10, rect.top - 44),
      });
    };
    const soon = () => { if (!raf) raf = requestAnimationFrame(check); };
    document.addEventListener('selectionchange', soon);
    window.addEventListener('scroll', soon, { passive: true });
    window.addEventListener('resize', soon);
    return () => {
      document.removeEventListener('selectionchange', soon);
      window.removeEventListener('scroll', soon);
      window.removeEventListener('resize', soon);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [on]);

  const make = async (fromPick = false) => {
    if (busy) return;
    let frag: DocumentFragment;
    if (fromPick) {
      const els = pickedBlocks(pick);
      if (!els.length) return;
      frag = document.createDocumentFragment();
      els.forEach(e => { const c = e.cloneNode(true) as Element; c.classList.remove('ex-picked'); frag.appendChild(c); });
    } else {
      const r = rangeRef.current;
      if (!r) return;
      frag = r.cloneContents();
    }
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
    const body = document.createElement('div');
    body.className = 'post-body ex-body';
    body.appendChild(frag);
    // 복제된 이미지가 늦게 뜨는 칸(지연 로딩)이면 바로 그리게
    body.querySelectorAll('img').forEach(im => { im.loading = 'eager'; im.removeAttribute('srcset'); });
    /* 글씨 크기 들쭉날쭉 방지 (v2.0 사용자 제보 — 짧은 인용구만 작게 찍힘).
       ① 붙여 넣을 때 따라온 글자 크기·글꼴 지정을 지우고
       ② 아이폰 사파리의 「글자 자동 확대」를 끈다 — 넓은 칸의 글씨만 키워서 폭이 좁은(짧은) 인용구만 작아 보였다 */
    body.querySelectorAll<HTMLElement>('*').forEach(el => {
      el.style.removeProperty('font-size');
      el.style.removeProperty('font-family');
      el.style.removeProperty('line-height');
      if (el.tagName === 'FONT') { el.removeAttribute('size'); el.removeAttribute('face'); }
    });
    [card, body].forEach(el => { el.style.setProperty('-webkit-text-size-adjust', '100%'); el.style.setProperty('text-size-adjust', '100%'); });
    const foot = document.createElement('div');
    foot.className = 'ex-foot';
    foot.textContent = document.title || '';
    frame.appendChild(body);
    card.appendChild(frame);
    card.appendChild(foot);
    document.body.appendChild(card);
    try {
      const { toPng } = await import('html-to-image');
      // 화면 밖 위치(left:-30000px)는 찍을 때 빼야 한다 — 그대로 두면 그림 밖에 그려져 하얗게 나온다
      const opts = { pixelRatio: 2, cacheBust: false, imagePlaceholder: BLANK,
        style: { position: 'static', left: '0', top: '0', margin: '0' } as Partial<CSSStyleDeclaration> };
      let url: string;
      try { url = await toPng(card, opts); }
      catch { url = await toPng(card, { ...opts, skipFonts: true }); }   // 글꼴을 못 받아 오면 글꼴 없이라도
      setImg(url);
      window.getSelection()?.removeAllRanges();
      setPos(null);
    } catch (e) {
      toast(`이미지를 만들지 못했습니다 — ${e instanceof Error ? e.message : '알 수 없는 오류'}`);
    } finally {
      card.remove();
      setBusy(false);
    }
  };

  const save = () => {
    if (!img) return;
    const a = document.createElement('a');
    a.href = img;
    a.download = `excerpt-${stamp()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  const share = async () => {
    if (!img) return;
    try {
      const blob = await (await fetch(img)).blob();
      const file = new File([blob], `excerpt-${stamp()}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] });
      else save();
    } catch { /* 공유 취소 */ }
  };

  if (!on) return null;
  return (
    <>
      {pos && (
        <button type="button" className="excerpt-btn" style={{ left: pos.x, top: pos.y }}
          // 누르는 순간 고른 범위가 풀리지 않게
          onPointerDown={e => e.preventDefault()} onMouseDown={e => e.preventDefault()}
          onClick={() => void make(false)}>
          {busy ? '만드는 중…' : '✂ 발췌 이미지'}
        </button>
      )}
      {/* 발췌 모드 — ✂ 켜기/끄기, 켜면 아래 안내 막대 */}
      {hasRoots && (
        <button type="button" className={`excerpt-toggle${mode ? ' on' : ''}`} aria-label="발췌 모드"
          onClick={() => setMode(m => !m)}>✂</button>
      )}
      {mode && (
        <div className="excerpt-bar">
          <span>{!pick ? '시작 문단을 누르세요' : !pick.done ? '끝 문단을 누르세요 (한 칸이면 바로 만들기)' : `${pickedBlocks(pick).length}칸 선택됨`}</span>
          {pick && <button type="button" onClick={() => setPick(null)}>다시</button>}
          {pick && <button type="button" className="go" disabled={busy} onClick={() => void make(true)}>{busy ? '만드는 중…' : '이미지 만들기'}</button>}
          <button type="button" onClick={() => setMode(false)}>끄기</button>
        </div>
      )}
      <Modal open={!!img} onClose={() => setImg(null)} title="발췌 이미지"
        actions={<>
          <button className="btn btn-ghost" onClick={() => setImg(null)}>닫기</button>
          {typeof navigator !== 'undefined' && 'share' in navigator && <button className="btn btn-ghost" onClick={() => void share()}>공유</button>}
          <button className="btn btn-dark" onClick={save}>저장</button>
        </>}>
        {img && <img src={img} alt="발췌 이미지" className="excerpt-preview" />}
      </Modal>
    </>
  );
}
