'use client';
// 공통 하단 HTML (v2.0 사용자 요청) — 메인이 아닌 모든 페이지 맨 아래에 그리는 HTML (lib/htmlPageStore.ts).
// 메인은 자기 HTML 블록 안에 푸터를 갖고 있으므로 그리지 않는다.
import React, { useEffect, useRef, useState } from 'react';
import { useAppPathname } from '@/lib/routeAlias';
import { useSiteFooter } from '@/lib/htmlPageStore';
import { useHtmlSlots, stripScripts } from '@/components/main/HtmlSlots';
import { useWorld } from '@/lib/worldStore';

export function SiteFooter() {
  const pathname = useAppPathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [footer] = useSiteFooter();
  const html = stripScripts(footer).trim();
  const ref = useRef<HTMLDivElement>(null);
  const { world } = useWorld();   // 페어별 홈 (lib/worldStore.ts) — YJHM이면 하단 없음
  const slots = useHtmlSlots(ref, [html, pathname, mounted, world]);   // 세계가 바뀌면 하단이 새로 그려지므로 다시 찾는다
  if (!mounted || !pathname || pathname === '/') return null;
  // YJHM은 꼬리말을 두지 않는다 — 맨 아래는 폴더 바 (사용자 요청 — 「쓸데없는 하단 없애」)
  if (world === 'yjhm') return null;
  if (!html) return null;
  return (
    <>
      <div ref={ref} className="site-foot-html" dangerouslySetInnerHTML={{ __html: html }} />
      {slots}
    </>
  );
}
