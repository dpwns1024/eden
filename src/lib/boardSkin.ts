'use client';
/**
 * 게시판 디자인 (v2.0 사용자 요청) — default: 기본 / arch: ARCH 스타일.
 * 켜면 <html>에 `ui-arch` 클래스가 붙고, ARCH로 옮긴 게시판의 CSS(globals.css의 `html.ui-arch …`)가 적용된다.
 * 레이아웃은 그대로 두고 모양(색·글꼴·테두리)만 ARCH HTML 페이지처럼 바꾼다.
 * 지금 ARCH로 옮긴 게시판: 캐릭터 — 앞으로 게시판을 하나씩 같은 방식으로 늘린다.
 *
 * 페어별 홈 (lib/worldStore.ts): ARCH는 EVEDEN 세계의 디자인이다 — YJHM 세계에선 꺼지고 그쪽 디자인(ui-yjhm)이 켜진다.
 * 화면이 보는 값(boardSkin · useBoardSkin)은 세계까지 따진 것, 환경설정이 보는 값은 siteBoardSkin.
 */
import { useEffect, useState } from 'react';
import { getSetting, setSetting, onSettingChange } from './settingStore';
import { currentWorld, onWorldChange } from './worldStore';

export const BOARD_UI_KEY = 'ohome.boardui.v1';
export type BoardSkin = 'default' | 'arch';
/** 환경설정에 저장된 게시판 디자인 (세계와 상관없이) */
export function siteBoardSkin(): BoardSkin {
  return getSetting<{ skin?: BoardSkin }>(BOARD_UI_KEY, {})?.skin === 'arch' ? 'arch' : 'default';
}
/** 지금 화면의 게시판 디자인 — ARCH는 EVEDEN 세계에서만 */
export function boardSkin(): BoardSkin {
  return siteBoardSkin() === 'arch' && currentWorld() === 'eveden' ? 'arch' : 'default';
}
export function setBoardSkin(skin: BoardSkin) {
  setSetting(BOARD_UI_KEY, { skin });
}

/** 게시판 디자인 — 화면에서 모양뿐 아니라 배치·문구까지 바꿀 때 (설정이 바뀌면 다시 그린다) */
export function useBoardSkin(): BoardSkin {
  const [s, setS] = useState<BoardSkin>('default');
  useEffect(() => {
    const read = () => setS(boardSkin());
    read();
    const off = onSettingChange(k => { if (k === BOARD_UI_KEY) read(); });
    const offW = onWorldChange(read);
    return () => { off(); offW(); };
  }, []);
  return s;
}
