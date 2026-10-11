'use client';
/**
 * HTML 블록 안의 「자리」 (v2.0 사용자 요청) — 메뉴·로그인 영역을 사용자 HTML 디자인 안에 넣는다.
 *
 *   <div data-ohome="menu"></div>    ← 사이트 메뉴 (메뉴 관리 설정·공개범위 그대로)
 *   <div data-ohome="member"></div>  ← 로그인 버튼 / 알림 종 · 프로필 드롭다운
 *
 * 메뉴는 HTML 블록이 직접 채우고, 로그인 영역은 상단 바(TopBar)가 이 자리로 옮겨 그린다 —
 * 알림·드롭다운 로직을 둘로 나누지 않으려고. 그래서 「지금 화면에 있는 member 자리」를 여기 둔다.
 */
import { useSyncExternalStore } from 'react';

export const SLOT_ATTR = 'data-ohome';

let memberSlot: Element | null = null;
const subs = new Set<() => void>();

export function setMemberSlot(el: Element | null) {
  if (memberSlot === el) return;
  memberSlot = el;
  subs.forEach(f => f());
}

/** 이 자리가 지금 등록돼 있을 때만 비운다 — 다른 블록이 새로 등록한 자리를 지우지 않게 */
export function clearMemberSlot(el: Element) {
  if (memberSlot === el) setMemberSlot(null);
}

/** 지금 화면에 있는 로그인 영역 자리 — 없으면 null (상단 바에 그대로 그린다) */
export function useMemberSlot(): Element | null {
  return useSyncExternalStore(
    cb => { subs.add(cb); return () => { subs.delete(cb); }; },
    () => memberSlot,
    () => null,
  );
}

/** 이 HTML에 메뉴 자리가 있는가 — 있으면 메인에서는 메뉴 위젯 대신 그 자리에 메뉴를 그린다 */
export const htmlHasMenuSlot = (html: unknown) =>
  typeof html === 'string' && /data-ohome\s*=\s*["']?menu\b/i.test(html);
