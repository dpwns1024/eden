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

/* ── 캐릭터 · 페어 게시판에서 보이는 세계 (v2.0 사용자 요청 — 「캐릭터랑 페어링도 내가 설정한 테마에서만」) ──
   수정 화면의 「보이는 세계」: 자동(비움) · 모든 세계('all') · 한 세계.
   자동이면 페어는 이름으로 묶인 세계(EVEDEN · YJHM 페어), 캐릭터는 자기가 들어 있는 그런 페어들의 세계.
   어느 세계에도 안 묶이면 모든 세계에서 보인다. undefined = 모든 세계 */
export type WorldPick = 'all' | WorldKey;

/** 이 페어가 보이는 세계 */
export function relWorlds(rel: Pick<Relation, 'name' | 'world'>): WorldKey[] | undefined {
  if (rel.world === 'all') return undefined;
  if (rel.world) return [rel.world];
  const k = worldOfRel(rel);
  return k ? [k] : undefined;
}

/** 이 캐릭터가 보이는 세계 — 자동이면 소속 페어들의 세계를 모은다 */
export function charWorlds(c: { id: string; world?: WorldPick }, rels: Relation[]): WorldKey[] | undefined {
  if (c.world === 'all') return undefined;
  if (c.world) return [c.world];
  const ks = new Set<WorldKey>();
  rels.filter(r => r.members?.some(m => m.charId === c.id)).forEach(r => relWorlds(r)?.forEach(k => ks.add(k)));
  return ks.size ? [...ks] : undefined;
}

/** 지금 세계에서 이 캐릭터 · 페어를 보일지 */
export function useWorldShow() {
  const rels = usePairings();
  const { world } = useWorld();
  return useMemo(() => ({
    world,
    showRel: (r: Pick<Relation, 'name' | 'world'>) => { const ks = relWorlds(r); return !ks || ks.includes(world); },
    showChar: (c: { id: string; world?: WorldPick }) => { const ks = charWorlds(c, rels); return !ks || ks.includes(world); },
  }), [rels, world]);
}

/** 수정 화면의 「보이는 세계」 고르기 칸 값들 */
export const WORLD_PICKS: { value: '' | WorldPick; label: string }[] = [
  { value: '', label: '보이는 세계: 자동 (페어 따라)' },
  { value: 'all', label: '보이는 세계: 모든 세계' },
  ...WORLDS.map(w => ({ value: w.key, label: `보이는 세계: ${w.label}만` })),
];

/** 이 페어의 글을 보고 있다 — 세계 페어면 그 세계로 바꾼다 */
export function useFollowWorld(relId: string | undefined) {
  const rels = usePairings();
  const rel = relId ? rels.find(r => r.id === relId) : undefined;
  const ks = rel ? relWorlds(rel) : undefined;
  const k = ks?.length === 1 ? ks[0] : undefined;
  useEffect(() => { if (k) setWorld(k); }, [k]);
}
