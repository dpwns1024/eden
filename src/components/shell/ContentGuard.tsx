'use client';
// 복사·소스 보기 억제 (v2.0 사용자 요청 — 「관리자 빼고 우클릭·드래그 금지, F12 막기」)
//
// 관리자가 아닌 모든 방문자(회원 포함)에게:
//   · 우클릭 메뉴 · 글자 드래그(선택) · 이미지 끌어가기 · 복사(Ctrl+C) 막기
//   · F12 · Ctrl+Shift+I/J/C(개발자 도구) · Ctrl+U(소스 보기) · Ctrl+S(저장) · Ctrl+P(인쇄) 막기
// 입력칸·에디터 안에서는 그대로 둔다 — 글·댓글을 쓰고 고치는 데 선택·복사·붙여넣기가 필요하다.
//
// ⚠ 이건 **겁주기용 문턱**이다. 브라우저 메뉴로 개발자 도구를 여는 것까지 웹페이지가 막을 수는 없다.
// 진짜 보호(비밀번호·잠긴 글·비공개 글)는 서버 보안 규칙이 맡는다 — 개발자 도구를 열어도
// 서버가 내주지 않은 것은 볼 수 없다 (lib/menuLock.ts · firebase/firestore.rules).
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';

/** 선택·복사·우클릭을 허용하는 곳 — 입력칸과 에디터 */
const EDITABLE = 'input, textarea, select, [contenteditable=""], [contenteditable="true"], .re-content';
const editable = (t: EventTarget | null) =>
  t instanceof Element ? !!t.closest(EDITABLE) : t instanceof Text ? !!t.parentElement?.closest(EDITABLE) : false;

/** 개발자 도구·소스 보기·저장·인쇄 단축키인가.
 *  맥은 ⌥를 누르면 e.key가 특수문자로 바뀌므로 자판 위치(e.code)로 본다 */
export function isBlockedKey(e: KeyboardEvent): boolean {
  if (e.key === 'F12') return true;
  const mod = e.ctrlKey || e.metaKey;
  if (!mod) return false;
  const c = e.code;
  if (e.shiftKey && (c === 'KeyI' || c === 'KeyJ' || c === 'KeyC' || c === 'KeyK')) return true;   // 개발자 도구
  if (e.metaKey && e.altKey && (c === 'KeyI' || c === 'KeyJ' || c === 'KeyC' || c === 'KeyU')) return true;   // 맥 개발자 도구·소스
  if (!e.shiftKey && !e.altKey && (c === 'KeyU' || c === 'KeyS' || c === 'KeyP')) return true;   // 소스 보기·저장·인쇄
  return false;
}

export function ContentGuard() {
  const { isAdmin, ready } = useAuth();
  const on = ready && !isAdmin;

  useEffect(() => {
    if (!on) return;
    const root = document.documentElement;
    root.classList.add('content-guard');
    const stop = (e: Event) => { if (!editable(e.target)) e.preventDefault(); };
    // 순서 바꾸기처럼 일부러 끌게 만든 것(draggable)은 살린다
    const onDrag = (e: DragEvent) => {
      const t = e.target;
      if (t instanceof Element && t.closest('[draggable="true"]')) return;
      if (!editable(t)) e.preventDefault();
    };
    const onKey = (e: KeyboardEvent) => {
      if (isBlockedKey(e)) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener('contextmenu', stop, true);
    window.addEventListener('selectstart', stop, true);
    window.addEventListener('copy', stop, true);
    window.addEventListener('cut', stop, true);
    window.addEventListener('dragstart', onDrag, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      root.classList.remove('content-guard');
      window.removeEventListener('contextmenu', stop, true);
      window.removeEventListener('selectstart', stop, true);
      window.removeEventListener('copy', stop, true);
      window.removeEventListener('cut', stop, true);
      window.removeEventListener('dragstart', onDrag, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [on]);

  // 콘솔을 연 사람에게 한 번 경고 (페이스북 「멈추세요!」 방식) — 남이 시킨 코드를 붙여넣는 사고 방지
  useEffect(() => {
    if (!on) return;
    try {
      console.log('%c멈추세요!', 'color:#d11c20;font-size:40px;font-weight:900');
      console.log('%c이곳은 개발자용 기능입니다. 누군가 여기에 무언가를 붙여넣으라고 했다면 계정을 빼앗으려는 시도일 수 있습니다.',
        'font-size:14px');
    } catch { /* 무시 */ }
  }, [on]);

  return null;
}

/** 로그 본문처럼 따로 띄우는 문서(iframe) 안에 넣을 같은 억제 코드 — 바깥 페이지의 감시는 iframe 안까지 닿지 않는다 */
export const GUARD_SNIPPET = `<style>html,body{-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important}img{-webkit-user-drag:none!important}</style><script>(function(){
function s(e){e.preventDefault()}
['contextmenu','selectstart','copy','cut','dragstart'].forEach(function(t){addEventListener(t,s,true)});
addEventListener('keydown',function(e){var c=e.code,m=e.ctrlKey||e.metaKey;
if(e.key==='F12'||(m&&e.shiftKey&&/^Key[IJCK]$/.test(c))||(e.metaKey&&e.altKey&&/^Key[IJCU]$/.test(c))||(m&&!e.shiftKey&&!e.altKey&&/^Key[USP]$/.test(c))){e.preventDefault();e.stopPropagation()}},true);
})();</scr${''}ipt>`;
