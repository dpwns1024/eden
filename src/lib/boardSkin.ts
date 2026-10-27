'use client';
/**
 * 게시판 디자인 — ARCH로 고정 (v2.0 사용자 요청 — 「게시판 기본 레이아웃은 ARCH에서 고친 대로, 이제 그게 고정값」).
 * <html>에 늘 `ui-arch` 클래스가 붙고(BoardSkinSync), 게시판은 ARCH 배치 · 문구(단말기형 목록 · 가로 배너 등)로 그린다.
 * 예전엔 환경설정에서 기본 / ARCH를 골랐다 — 그 칸은 없앴고, 저장돼 있던 값은 더 이상 읽지 않는다.
 *
 * 페어별 홈 (lib/worldStore.ts): YJHM 세계에서도 게시판 레이아웃은 ARCH 그대로 — 그 위에 `ui-yjhm`이 더해져
 * 머리 · 푸터 · 메인 · 색만 YJHM 것으로 바뀐다.
 */
export type BoardSkin = 'default' | 'arch';

/** 지금 화면의 게시판 디자인 — 늘 ARCH */
export function boardSkin(): BoardSkin {
  return 'arch';
}

/** 게시판 디자인 — 화면에서 모양뿐 아니라 배치·문구까지 바꿀 때 (늘 ARCH) */
export function useBoardSkin(): BoardSkin {
  return 'arch';
}
