'use client';
/**
 * 페어링 연동 (v2.0 사용자 요청 — 게시판마다 따로 만들던 카테고리 · 말머리 · 무드 탭을 없애고,
 * PAIRING 게시판에 올라온 페어를 골라 쓰는 것으로 통일). FIELD REPORT · COMMS ARCHIVE가 쓰던 방식
 * (글에 relId · 목록 위 페어링 탭)을 갤러리 · JOURNAL · 리스트에도 똑같이 쓴다.
 *
 * 예전 글은 relId 없이 말머리 글자만 있다 — 그 글자가 페어링 이름과 같으면 그 페어링으로 본다.
 * 아니면 「페어링 없음」(ETC)으로, 수정 화면에서 페어링을 골라 저장하면 옮겨진다.
 */
import { useLocalList } from '@/lib/postStore';
import { Relation, REL_SEED } from '@/lib/charStore';

export const NO_PAIR = 'none';

/** PAIRING 게시판의 페어 목록 (자관 목록과 같은 곳) */
export function usePairings(): Relation[] {
  return useLocalList<Relation>('ohome.rels.v1', REL_SEED)[0];
}

/** 글의 페어링 id — relId, 없으면 예전 말머리 글자가 페어링 이름과 같을 때 그 페어링. 없으면 undefined.
 *  지워졌거나 이 방문자에게 안 보이는 페어링은 「페어링 없음」으로 (탭 없이 ALL에만 남지 않게) */
export function pairIdOf(p: { relId?: string; category?: string }, rels: Relation[]): string | undefined {
  if (p.relId) return rels.some(r => r.id === p.relId) ? p.relId : undefined;
  const c = p.category?.trim();
  return c ? rels.find(r => r.name.trim() === c)?.id : undefined;
}

/** 탭에 띄울 것 — 글이 있는 페어링만(PAIRING 목록 순서), 페어링 없는 글 수 */
export function pairTabs<T>(items: T[], rels: Relation[], idOf: (it: T) => string | undefined) {
  const counts: Record<string, number> = {};
  items.forEach(it => { const k = idOf(it) ?? NO_PAIR; counts[k] = (counts[k] ?? 0) + 1; });
  return { tabs: rels.filter(r => counts[r.id]).map(r => ({ id: r.id, name: r.name, n: counts[r.id] })), none: counts[NO_PAIR] ?? 0 };
}

/** 'all' · 페어링 id · NO_PAIR 탭으로 걸러 보기 */
export const inPairTab = (tab: string, pid: string | undefined) =>
  tab === 'all' || (tab === NO_PAIR ? !pid : pid === tab);

/** 글의 페어링 이름 (뱃지) — 없으면 '' */
export const pairNameOf = (p: { relId?: string; category?: string }, rels: Relation[]) => {
  const id = pairIdOf(p, rels);
  return id ? rels.find(r => r.id === id)?.name ?? '' : '';
};

/** 글쓰기 화면의 페어링 고르기 칸 */
export const pairOptions = (rels: Relation[]) =>
  [{ value: NO_PAIR, label: '페어링 없음' }, ...rels.map(r => ({ value: r.id, label: r.name }))];
