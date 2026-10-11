'use client';
/**
 * 게시판 디자인 (v2.0 사용자 요청) — default: 기본 / arch: ARCH 스타일.
 * 켜면 <html>에 `ui-arch` 클래스가 붙고, ARCH로 옮긴 게시판의 CSS(globals.css의 `html.ui-arch …`)가 적용된다.
 * 레이아웃은 그대로 두고 모양(색·글꼴·테두리)만 ARCH HTML 페이지처럼 바꾼다.
 * 지금 ARCH로 옮긴 게시판: 캐릭터 — 앞으로 게시판을 하나씩 같은 방식으로 늘린다.
 */
import { getSetting, setSetting } from './settingStore';

export const BOARD_UI_KEY = 'ohome.boardui.v1';
export type BoardSkin = 'default' | 'arch';
export function boardSkin(): BoardSkin {
  return getSetting<{ skin?: BoardSkin }>(BOARD_UI_KEY, {})?.skin === 'arch' ? 'arch' : 'default';
}
export function setBoardSkin(skin: BoardSkin) {
  setSetting(BOARD_UI_KEY, { skin });
}
