'use client';
/**
 * EVEDEN 세계의 게시판 카테고리 (v2.0 사용자 요청) — RECORDS(FIELD REPORT · COMMS ARCHIVE · JOURNAL)와
 * SIGHTINGS(갤러리)는 EVEDEN 세계에선 전부 EVEDEN 글뿐이라 페어링 탭이 쓸모없다.
 * 그래서 EVEDEN에서는 페어링 대신 관리자가 게시판마다 만든 카테고리로 탭을 나누고, 글쓰기에서 카테고리를 고른다.
 * YJHM 세계는 예전처럼 페어링 탭 그대로 (글의 relId는 세계 구분용으로 계속 쓴다).
 *
 * 목록은 설정 한 칸(ohome.boardcats.v1)에 게시판별로, 글에는 카테고리 id(catId)로 — 이름을 바꿔도 안 끊긴다.
 * 프롬프트(/prompt)는 따로 자기 카테고리(메모 설정 promptCats)를 쓴다.
 */
import { useCallback, useEffect, useState } from 'react';
import { getSetting, setSetting, onSettingChange } from './settingStore';
import { useWorld } from './worldStore';

export type CatBoard = 'trpg' | 'rp' | 'diary' | 'gallery';
export interface BoardCat { id: string; name: string }

const KEY = 'ohome.boardcats.v1';
export const NO_CAT = 'none';

const read = (): Partial<Record<CatBoard, BoardCat[]>> => getSetting(KEY, {});

/** 이 게시판의 카테고리 목록 · 저장 */
export function useBoardCats(board: CatBoard): [BoardCat[], (next: BoardCat[]) => void] {
  const [cats, setCats] = useState<BoardCat[]>([]);
  useEffect(() => {
    setCats(read()[board] ?? []);
    return onSettingChange(k => { if (k === KEY) setCats(read()[board] ?? []); });
  }, [board]);
  const save = useCallback((next: BoardCat[]) => setSetting(KEY, { ...read(), [board]: next }), [board]);
  return [cats, save];
}

/** 지금 페어링 대신 카테고리로 나눌지 — EVEDEN 세계일 때 */
export function useCatMode(): boolean {
  return useWorld().world === 'eveden';
}

/** 글의 카테고리 id — 지워진 카테고리면 없음 */
export const catIdOf = (p: { catId?: string }, cats: BoardCat[]) =>
  p.catId && cats.some(c => c.id === p.catId) ? p.catId : undefined;

/** 탭에 띄울 것 — 만든 카테고리 전부(순서대로) · 카테고리 없는 글 수 */
export function catTabs<T extends { catId?: string }>(items: T[], cats: BoardCat[]) {
  const counts: Record<string, number> = {};
  items.forEach(it => { const k = catIdOf(it, cats) ?? NO_CAT; counts[k] = (counts[k] ?? 0) + 1; });
  return { tabs: cats.map(c => ({ id: c.id, name: c.name, n: counts[c.id] ?? 0 })), none: counts[NO_CAT] ?? 0 };
}

/** 'all' · 카테고리 id · NO_CAT 탭으로 걸러 보기 */
export const inCatTab = (tab: string, p: { catId?: string }, cats: BoardCat[]) => {
  const id = catIdOf(p, cats);
  return tab === 'all' || (tab === NO_CAT ? !id : id === tab);
};

/** 글의 카테고리 이름 (뱃지) — 없으면 '' */
export const catNameOf = (p: { catId?: string }, cats: BoardCat[]) =>
  cats.find(c => c.id === catIdOf(p, cats))?.name ?? '';

/** 글쓰기 화면의 카테고리 고르기 칸 */
export const catOptions = (cats: BoardCat[]) =>
  [{ value: NO_CAT, label: '카테고리 없음' }, ...cats.map(c => ({ value: c.id, label: c.name }))];
