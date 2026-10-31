'use client';
/**
 * 저장된 HTML(공통 상단 · HTML 페이지 · 메인 HTML) 안의 사이트 안 링크도 화면 전환으로 (v2.0 사용자 제보).
 * 이런 링크는 Next의 <Link>가 아닌 그냥 <a>라 누르면 사이트 전체를 새로 받았다 — 그 사이 빈 화면 · 옛 테마 바탕이
 * 잠깐 보였다가 지금 화면이 떴다(머리의 ARCH 로고 → 메인 등). 이미 처리된 클릭(<Link> 등)·새 탭·다운로드·바깥 주소는 그대로 둔다.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function LinkIntercept() {
  const router = useRouter();
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a');
      if (!a || !(a instanceof HTMLAnchorElement)) return;
      const raw = a.getAttribute('href');
      if (!raw || raw.startsWith('#') || a.hasAttribute('download')) return;
      if (a.target && a.target !== '_self') return;
      let url: URL;
      try { url = new URL(a.href, location.href); } catch { return; }
      if (url.origin !== location.origin) return;
      if (url.pathname.startsWith('/api/') || /\.[a-z0-9]{2,5}$/i.test(url.pathname)) return;   // 파일 · API는 브라우저에 맡긴다
      // 같은 페이지 안의 #이동은 브라우저에 맡긴다
      if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
      e.preventDefault();
      router.push(url.pathname + url.search + url.hash);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [router]);
  return null;
}
