'use client';
/**
 * 발췌 이미지 만들기 (v2.0 사용자 요청 — 관리자 전용, 시험판).
 *
 * 발췌 모드 — 왼쪽 아래 ✂ 버튼으로 켜고, 시작 문단 → 끝 문단을 차례로 누르면 그 사이가 통째로 골라진다.
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

export function ExcerptMaker() {
  const { isAdmin, ready } = useAuth();
  const toast = useToast();
  const on = ready && isAdmin;
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
    const copyLayout = (o: Element, c: HTMLElement) => {
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
      if (fs && fs < pageFont * 0.6) {
        set('font-size', px(cs.fontSize));
        set('line-height', cs.lineHeight.endsWith('px') ? px(cs.lineHeight) : 'normal');
      }
      // 인용구 딱지 · 색 선은 위 여백 기준으로 자리를 잡는다 (globals.css --qpt) — 비율대로 바뀐 위 여백을 알려 준다
      if (o.matches('blockquote')) c.style.setProperty('--qpt', px(cs.paddingTop));
      const before = getComputedStyle(o, '::before').content;
      if (!before || before === 'none' || before === 'normal') c.setAttribute('data-ex-nobefore', '');
    };
    const copyTree = (o: Element, c: HTMLElement) => {
      const os = [o, ...Array.from(o.querySelectorAll('*'))];
      const cs = [c, ...Array.from(c.querySelectorAll<HTMLElement>('*'))];
      if (os.length !== cs.length) return;
      os.forEach((x, i) => copyLayout(x, cs[i]));
    };
    let prevBottom: number | null = null;
    els.forEach(e => {
      const r = e.getBoundingClientRect();
      const isMedia = media(e);
      if (!isMedia && r.height < line * 0.5) return;   // 화면에서 안 보이는 칸
      const c = e.cloneNode(true) as HTMLElement;
      c.classList.remove('ex-picked');
      copyTree(e, c);
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
      const gap = prevBottom === null ? 0 : Math.max(0, r.top - prevBottom) * scale;
      c.style.setProperty('margin-top', `${gap.toFixed(1)}px`, 'important');
      c.style.setProperty('margin-bottom', '0', 'important');
      frag.appendChild(c);
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
    try {
      const { toPng } = await import('html-to-image');
      // 화면 밖 위치(left:-30000px)는 찍을 때 빼야 한다 — 그대로 두면 그림 밖에 그려져 하얗게 나온다
      /* 높이는 옮기지 않는다 (v2.0 사용자 제보 — 엔터 친 곳이 없는데 문단 사이가 한 줄 벌어졌다).
         html-to-image는 찍을 때 글씨를 0.1px 줄이면서(15 → 14.9px) 칸마다 높이는 화면 밖 카드에서 잰 값으로 고정한다 —
         마지막 줄이 짧은 문단은 글씨가 줄면 한 줄이 줄어드는데, 고정된 높이만큼 빈 줄이 남아 엔터처럼 보였다.
         높이 계열만 빼면 찍는 순간의 글씨에 맞춰 높이가 다시 정해진다 */
      const FREE = new Set(['height', 'block-size', 'min-block-size', 'max-block-size']);
      const includeStyleProperties = Array.from(getComputedStyle(document.documentElement)).filter(n => !FREE.has(n));
      const opts = { pixelRatio: 2, cacheBust: false, imagePlaceholder: BLANK, includeStyleProperties,
        // 카드 높이만은 화면 밖에서 잰 값 그대로 — 그림 크기와 같아야 위아래 여백이 똑같이 나뉜다
        style: { position: 'static', left: '0', top: '0', margin: '0', height: `${card.offsetHeight}px` } as Partial<CSSStyleDeclaration> };
      let url: string;
      try { url = await toPng(card, opts); }
      catch { url = await toPng(card, { ...opts, skipFonts: true }); }   // 글꼴을 못 받아 오면 글꼴 없이라도
      setImg(url);
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
      {/* 발췌 모드 — ✂ 켜기/끄기, 켜면 아래 안내 막대 */}
      {hasRoots && (
        <button type="button" className={`excerpt-toggle${mode ? ' on' : ''}`} aria-label="발췌 모드"
          onClick={() => setMode(m => !m)}>✂</button>
      )}
      {mode && (
        <div className="excerpt-bar">
          <span>{!pick ? '시작 문단을 누르세요' : !pick.done ? '끝 문단을 누르세요 (한 칸이면 바로 만들기)' : `${pickedBlocks(pick).length}칸 선택됨`}</span>
          {pick && <button type="button" onClick={() => setPick(null)}>다시</button>}
          {pick && <button type="button" className="go" disabled={busy} onClick={() => void make()}>{busy ? '만드는 중…' : '이미지 만들기'}</button>}
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
