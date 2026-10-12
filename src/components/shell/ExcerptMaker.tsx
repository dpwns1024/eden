'use client';
/**
 * 발췌 이미지 만들기 (v2.0 사용자 요청 — 관리자 전용, 시험판).
 *
 * 글을 드래그해 고르면 고른 곳 아래에 「발췌 이미지」 버튼이 뜬다. 누르면 고른 부분(글·인용구·이미지)을
 * 홈페이지 배경 위 카드에 다시 그려 PNG로 만든다 → 미리보기 창에서 저장·공유.
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

  const make = async () => {
    const r = rangeRef.current;
    if (!r || busy) return;
    setBusy(true);
    // 화면 밖 카드 — ARCH 글 모양(.page-arch .post-body)을 그대로 빌려 쓴다
    const card = document.createElement('div');
    card.className = 'excerpt-card page-arch';
    const bs = getComputedStyle(document.body);
    const bgImg = getComputedStyle(document.body, '::before').backgroundImage;
    card.style.backgroundColor = bs.backgroundColor && bs.backgroundColor !== 'rgba(0, 0, 0, 0)' ? bs.backgroundColor : '#07090d';
    card.style.backgroundImage = [bgImg && bgImg !== 'none' ? bgImg : '', bs.backgroundImage !== 'none' ? bs.backgroundImage : '']
      .filter(Boolean).join(',') || 'none';
    const frame = document.createElement('div');
    frame.className = 'ex-frame';
    const body = document.createElement('div');
    body.className = 'post-body ex-body';
    body.appendChild(r.cloneContents());
    // 복제된 이미지가 늦게 뜨는 칸(지연 로딩)이면 바로 그리게
    body.querySelectorAll('img').forEach(im => { im.loading = 'eager'; im.removeAttribute('srcset'); });
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
          onClick={() => void make()}>
          {busy ? '만드는 중…' : '✂ 발췌 이미지'}
        </button>
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
