'use client';
// 공통 하단 HTML (v2.0 사용자 요청) — 메인이 아닌 모든 페이지 맨 아래에 그리는 HTML (lib/htmlPageStore.ts).
// 메인은 자기 HTML 블록 안에 푸터를 갖고 있으므로 그리지 않는다.
import React, { useEffect, useRef, useState } from 'react';
import { useAppPathname } from '@/lib/routeAlias';
import { useSiteFooter } from '@/lib/htmlPageStore';
import { useHtmlSlots, stripScripts } from '@/components/main/HtmlSlots';

export function SiteFooter() {
  const pathname = useAppPathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [footer] = useSiteFooter();
  const html = stripScripts(footer).trim();
  const ref = useRef<HTMLDivElement>(null);
  const slots = useHtmlSlots(ref, [html, pathname, mounted]);
  if (!mounted || !pathname || pathname === '/' || !html) return null;
  return (
    <>
      <div ref={ref} className="site-foot-html" dangerouslySetInnerHTML={{ __html: html }} />
      {slots}
    </>
  );
}
