'use client';
/**
 * HTML 페이지 · 공통 상단 HTML (v2.0 사용자 요청).
 *
 *  · **HTML 페이지** — 메뉴에 붙이는 「HTML 한 장짜리 페이지」. 메인의 HTML 블록처럼 사용자 HTML을
 *    그대로 그린다(스크립트만 걷어 냄). 여러 개 만들 수 있어 섹션(`/page?s=…`)으로 나누고,
 *    본문은 섹션 id별로 설정 한 칸에 담는다 — 인트로 페이지와 같은 이유(글 하나뿐 · DB 구조 그대로).
 *  · **공통 상단 HTML** — 메인이 아닌 모든 페이지 맨 위에 그리는 HTML. 메인 HTML의 상단(로고·메뉴·로그인)을
 *    다른 페이지에서도 그대로 이어 보이게 하려는 것. 비어 있으면 원래대로 배너·메뉴 위젯이 나온다.
 *  · **공통 하단 HTML** — 같은 이유로 메인이 아닌 모든 페이지 맨 아래에 그리는 HTML(워터마크·푸터).
 *
 * 둘 다 `data-ohome="menu"` / `data-ohome="member"` 자리를 쓸 수 있다 (lib/htmlSlots.ts).
 */
import { useCallback, useEffect, useState } from 'react';
import { getSetting, setSetting, onSettingChange } from './settingStore';

export const HTML_PAGES_KEY = 'ohome.htmlpages.v1';
export const SITE_HEADER_KEY = 'ohome.siteheader.v1';
export const SITE_FOOTER_KEY = 'ohome.sitefooter.v1';

function useSettingValue<T>(key: string, fallback: T): [T, (v: T) => void, boolean] {
  const [v, setV] = useState<T>(fallback);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const read = () => setV(getSetting<T>(key, fallback));
    read(); setLoaded(true);
    return onSettingChange(k => { if (k === key) read(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const save = useCallback((next: T) => { setV(next); setSetting(key, next); }, [key]);
  return [v, save, loaded];
}

/** HTML 페이지 본문 — 섹션 id → HTML */
export function useHtmlPages(): [Record<string, string>, (id: string, html: string) => void, boolean] {
  const [map, setMap, loaded] = useSettingValue<Record<string, string>>(HTML_PAGES_KEY, {});
  const save = useCallback((id: string, html: string) => {
    const cur = getSetting<Record<string, string>>(HTML_PAGES_KEY, {});
    setMap({ ...(cur && typeof cur === 'object' ? cur : {}), [id]: html });
  }, [setMap]);
  return [map && typeof map === 'object' ? map : {}, save, loaded];
}

/** 공통 하단 HTML — 빈 문자열이면 쓰지 않는다 */
export function useSiteFooter(): [string, (html: string) => void, boolean] {
  const [v, save, loaded] = useSettingValue<string>(SITE_FOOTER_KEY, '');
  return [typeof v === 'string' ? v : '', save, loaded];
}

/** 공통 상단 HTML — 빈 문자열이면 쓰지 않는다 */
export function useSiteHeader(): [string, (html: string) => void, boolean] {
  const [v, save, loaded] = useSettingValue<string>(SITE_HEADER_KEY, '');
  return [typeof v === 'string' ? v : '', save, loaded];
}
