'use client';
/**
 * EVEDEN 세계의 게시판 말머리 (v2.0 사용자 요청) — EVEDEN 세계에선 전부 EVEDEN 글뿐이라 페어링 탭이 쓸모없다.
 * 그래서 EVEDEN에서는 페어링 대신 말머리로 탭을 나누고, 글쓰기에서 말머리를 고른다.
 * 말머리 목록은 모든 게시판 공통 하나 — 환경설정 > 게시판 관리 > 말머리 (기본 게시판의 cats 자리에 저장).
 * 리스트 · FIELD REPORT · COMMS ARCHIVE · JOURNAL · 갤러리가 같은 목록을 쓰고, 뱃지 색도 그 설정 그대로.
 * YJHM 세계는 예전처럼 페어링 탭 그대로 (글의 relId는 세계 구분용으로 계속 쓴다).
 *
 * 글에는 말머리 id(catId)로 — 이름을 바꿔도 안 끊긴다. 예전 글(말머리 글자 category)은 이름이 같으면 그 말머리로 본다.
 */
import { useWorld } from './worldStore';
import { useBoards, MAIN_BOARD_ID, BoardBadge } from './boardStore';

export const NO_CAT = 'none';
type CatPost = { catId?: string; category?: string };

/** 모든 게시판 공통 말머리 */
export function useBoardCats(): BoardBadge[] {
  const { boards } = useBoards();
  return (boards.find(b => b.id === MAIN_BOARD_ID) ?? boards[0])?.cats ?? [];
}

/** 지금 페어링 대신 말머리로 나눌지 — EVEDEN 세계일 때 */
export function useCatMode(): boolean {
  return useWorld().world === 'eveden';
}

/** 글의 말머리 id — catId, 없으면 예전 말머리 글자가 같은 말머리. 지워진 말머리면 없음 */
export function catIdOf(p: CatPost, cats: BoardBadge[]): string | undefined {
  if (p.catId) return cats.some(c => c.id === p.catId) ? p.catId : undefined;
  const t = p.category?.trim();
  return t ? cats.find(c => c.label.trim() === t)?.id : undefined;
}

/** 글의 말머리 (뱃지) */
export const catOf = (p: CatPost, cats: BoardBadge[]) => cats.find(c => c.id === catIdOf(p, cats));

/** 탭에 띄울 것 — 말머리 전부(설정 순서대로) · 말머리 없는 글 수 */
export function catTabs<T extends CatPost>(items: T[], cats: BoardBadge[]) {
  const counts: Record<string, number> = {};
  items.forEach(it => { const k = catIdOf(it, cats) ?? NO_CAT; counts[k] = (counts[k] ?? 0) + 1; });
  return { tabs: cats.map(c => ({ id: c.id, name: c.label, n: counts[c.id] ?? 0 })), none: counts[NO_CAT] ?? 0 };
}

/** 'all' · 말머리 id · NO_CAT 탭으로 걸러 보기 */
export const inCatTab = (tab: string, p: CatPost, cats: BoardBadge[]) => {
  const id = catIdOf(p, cats);
  return tab === 'all' || (tab === NO_CAT ? !id : id === tab);
};

/** 글쓰기 화면의 말머리 고르기 칸 */
export const catOptions = (cats: BoardBadge[]) =>
  [{ value: NO_CAT, label: '말머리 없음' }, ...cats.map(c => ({ value: c.id, label: c.label }))];
