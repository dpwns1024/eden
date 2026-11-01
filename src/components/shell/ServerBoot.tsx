'use client';
// 서버 연결 부팅 (v2.0) — 앱이 그려지기 전에 런타임 설정(ohome.config.json → localStorage → env)을
// 한 번 읽어 Supabase 클라이언트를 확정한다. 확정 전에는 자식을 그리지 않아
// "로컬 모드로 한 번 그렸다가 서버 모드로 다시 그리는" 깜빡임을 막는다.
import React, { useEffect, useState } from 'react';
import { initSupabase } from '@/lib/supabase';
import { primeSettings } from '@/lib/settingStore';

export function ServerBoot({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  // 대기가 길어질 때만 표시 — 빠르게 끝나는 경우 스피너가 깜빡이는 게 더 거슬린다
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => { if (alive) setSlow(true); }, 400);
    // 백엔드 확정 → 사이트 설정(테마·메뉴·폰트…)을 한 번에 받아 캐시 → 그 다음에 화면을 그린다.
    // 각 스토어가 렌더 중 동기적으로 설정을 읽기 때문에 순서가 중요하다.
    // 상한 5초 — 일부 브라우저(iPad Safari 등)에서 서버 연결이 응답 없이 멈추면
    // 화면이 영영 안 뜨던 문제. 늦게 도착한 설정은 캐시에 채워진다.
    const boot = initSupabase().then(() => primeSettings()).catch(() => {});
    Promise.race([boot, new Promise(r => setTimeout(r, 5000))])
      .finally(() => { if (alive) { clearTimeout(t); setReady(true); } });
    return () => { alive = false; clearTimeout(t); };
  }, []);
  // 페이지 CSS가 붙기 전에 화면이 보이지 않게 (v2.0 사용자 제보 — 모바일에서 요원 명부 직접 링크로 들어오면
  // ARCH 로고가 화면 폭만큼 크게 떴다가 사라졌다). 첫 HTML엔 이 안쪽이 비어 있어 페이지별 CSS(archHome.css 등)가
  // <head>에 없고, 화면을 그리는 순간에야 React가 <link>를 넣는다. 느린 망에선 CSS가 오기 전에 먼저 그려져
  // 크기 지정이 CSS에만 있는 SVG가 원래 크기(화면 폭)로 보였다.
  // → React · Next가 넣는 스타일시트(data-precedence)가 <head>에 새로 들어오면, 다 붙을 때까지 본문을 숨긴다
  //   (html[data-css-wait] — globals.css). 감시 콜백은 그리기 전에 돌아서 덜 꾸며진 화면이 한 번도 안 보인다.
  //   페이지 이동 때 새로 받는 CSS도 같다. 4초 넘게 걸리면 그냥 보인다
  useEffect(() => {
    const root = document.documentElement;
    const waiting = new Set<HTMLLinkElement>();
    let t = 0;
    const show = () => { waiting.clear(); clearTimeout(t); root.removeAttribute('data-css-wait'); };
    const settle = (l: HTMLLinkElement) => { waiting.delete(l); if (!waiting.size) show(); };
    const watch = (l: HTMLLinkElement) => {
      if (waiting.has(l) || l.sheet || l.rel !== 'stylesheet' || !l.hasAttribute('data-precedence')) return;
      waiting.add(l);
      root.setAttribute('data-css-wait', '');
      clearTimeout(t);
      t = window.setTimeout(show, 4000);
      l.addEventListener('load', () => settle(l), { once: true });
      l.addEventListener('error', () => settle(l), { once: true });
    };
    const mo = new MutationObserver(recs => recs.forEach(r => r.addedNodes.forEach(n => {
      if (n instanceof HTMLLinkElement) watch(n);
    })));
    mo.observe(document.head, { childList: true });
    document.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][data-precedence]').forEach(watch);
    return () => { mo.disconnect(); show(); };
  }, []);
  // 배경(테마 그라데이션)은 body가 첫 페인트 전에 이미 칠하므로 여기서는 표시만 얹는다
  if (!ready) return slow ? <div className="boot-wait"><i /></div> : null;
  return <>{children}</>;
}
