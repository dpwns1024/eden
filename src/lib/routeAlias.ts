'use client';
/**
 * 요약 주소 (v2.0 사용자 요청) — 주소창에 보이는 주소만 바꾼다. 페이지 폴더·메뉴 설정·저장 데이터는 원래 주소 그대로.
 *
 *   /chars → /profile   (캐릭터 · PROFILE)
 *   /rels  → /pairing   (자관 · PAIRING)
 *   /gallery → /confirmed (갤러리 · CONFIRMED)
 *
 * next.config.ts가 요약 주소를 원래 페이지로 이어 주고(rewrite), 원래 주소로 들어오면 요약 주소로 바꿔 보낸다(redirect).
 * 화면 코드는 원래 주소 기준으로 판단하므로(메뉴 강조·페이지 제목·잠금·공개범위), 현재 주소는
 * usePathname 대신 useAppPathname으로 읽는다 — 요약 주소를 원래 주소로 되돌려 준다.
 * 목록은 next.config.ts의 ROUTE_ALIASES와 같아야 한다.
 */
import { usePathname } from 'next/navigation';

export { ROUTE_ALIASES, toCanonPath, toPublicHref } from './routeAliasCore';
import { toCanonPath } from './routeAliasCore';

/** 지금 페이지 주소 — 원래 주소 기준 */
export function useAppPathname(): string {
  return toCanonPath(usePathname() ?? '/');
}
