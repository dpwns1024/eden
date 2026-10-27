'use client';
/**
 * 페어별 홈 (v2.0 사용자 요청) — 사이트를 페어마다 다른 「세계」로 본다.
 * EVEDEN은 지금의 ARCH 디자인, YJHM(국가대표 사격선수 × 통역사 · 현대 일상 · 달달 로맨스)은 새 디자인.
 *
 * - 고른 세계는 방문자 브라우저마다 기억한다 (메인의 전환 버튼 · 기본 EVEDEN).
 * - 디자인: EVEDEN이면 환경설정의 게시판 디자인(ARCH) 그대로, YJHM이면 ARCH를 끄고 `ui-yjhm`을 켠다 (BoardSkinSync).
 * - 목록: 다른 세계 페어의 글은 숨긴다. 페어링 없는 글 · 세계에 안 묶인 페어의 글은 어느 쪽에서든 보인다.
 * - 글: 세계 페어의 글을 열면 그 세계로 바뀐다 (링크로 바로 들어와도 그 글의 디자인으로).
 *
 * 페어는 PAIRING 게시판의 이름으로 찾는다 (대소문자 · 앞뒤 공백 무시).
 */
import { useEffect, useMemo, useState } from 'react';
import type { Relation } from '@/lib/charStore';
import { usePairings, pairIdOf } from '@/lib/pairLink';

export type WorldKey = 'eveden' | 'yjhm';

export interface World { key: WorldKey; pair: string; label: string }

export const WORLDS: World[] = [
  { key: 'eveden', pair: 'EVEDEN', label: 'EVEDEN' },
  { key: 'yjhm', pair: 'YJHM', label: 'YJHM' },
];
export const DEFAULT_WORLD: WorldKey = 'eveden';

const KEY = 'ohome.world.v1';
const EVT = 'ohome-world';

export function currentWorld(): WorldKey {
  try {
    const v = localStorage.getItem(KEY);
    return WORLDS.some(w => w.key === v) ? (v as WorldKey) : DEFAULT_WORLD;
  } catch { return DEFAULT_WORLD; }
}

export function setWorld(k: WorldKey) {
  if (k === currentWorld()) return;
  try { localStorage.setItem(KEY, k); } catch { /* 저장이 막힌 브라우저 — 이번 화면에서만 */ }
  window.dispatchEvent(new CustomEvent(EVT, { detail: k }));
}

/** 세계가 바뀔 때 (이 탭 · 다른 탭) */
export function onWorldChange(cb: (k: WorldKey) => void): () => void {
  const h = () => cb(currentWorld());
  const s = (e: StorageEvent) => { if (e.key === KEY) h(); };
  window.addEventListener(EVT, h);
  window.addEventListener('storage', s);
  return () => { window.removeEventListener(EVT, h); window.removeEventListener('storage', s); };
}

/** 지금 세계 — 읽기 전(첫 그림)에는 loaded=false */
export function useWorld(): { world: WorldKey; loaded: boolean } {
  const [st, setSt] = useState<{ world: WorldKey; loaded: boolean }>({ world: DEFAULT_WORLD, loaded: false });
  useEffect(() => {
    setSt({ world: currentWorld(), loaded: true });
    return onWorldChange(world => setSt({ world, loaded: true }));
  }, []);
  return st;
}

const norm = (s: string) => s.trim().toUpperCase();

/** 페어 → 세계 (세계에 안 묶인 페어면 undefined) */
export const worldOfRel = (rel: Pick<Relation, 'name'> | undefined): WorldKey | undefined =>
  rel ? WORLDS.find(w => norm(w.pair) === norm(rel.name))?.key : undefined;

/** 세계 → 그 페어 (PAIRING에 아직 없으면 undefined) */
export const relOfWorld = (rels: Relation[], k: WorldKey): Relation | undefined => {
  const w = WORLDS.find(x => x.key === k);
  return w ? rels.find(r => norm(r.name) === norm(w.pair)) : undefined;
};

/**
 * 목록 거르기 — 다른 세계 페어의 글만 뺀다.
 * `show(p)`: 글(relId · 예전 말머리)을 받아 지금 세계에서 보일지. `rels`는 함께 쓰라고 돌려준다
 */
export function useWorldFilter() {
  const rels = usePairings();
  const { world } = useWorld();
  return useMemo(() => {
    const other = new Set(rels.filter(r => { const k = worldOfRel(r); return k && k !== world; }).map(r => r.id));
    const showPid = (pid: string | undefined) => !pid || !other.has(pid);
    return { rels, world, showPid, show: (p: { relId?: string; category?: string }) => showPid(pairIdOf(p, rels)) };
  }, [rels, world]);
}

/** 이 페어의 글을 보고 있다 — 세계 페어면 그 세계로 바꾼다 */
export function useFollowWorld(relId: string | undefined) {
  const rels = usePairings();
  const k = relId ? worldOfRel(rels.find(r => r.id === relId)) : undefined;
  useEffect(() => { if (k) setWorld(k); }, [k]);
}
