'use client';
/**
 * 이브 · 에덴 (v2.0) — 메인의 가이드 매칭 연출(SyncMatch)과 기밀 파일 페이지(/eveden)가 같이 쓴다.
 * 캐릭터 목록(ohome.chars.v1)에서 이름으로 찾고, 없으면 이름 · 대표색만.
 * 역할은 이야기대로 고정한다 — 이브 SENTINEL, 에덴 GUIDE.
 */
import { useLocalList } from '@/lib/postStore';
import { CHAR_SEED, type Character } from '@/lib/charStore';

export interface PairProfile {
  name: string; sub: string; color: string; role: string; code: string;
  img?: string; crop?: Character['thumbCrop']; specs: { label: string; value: string }[];
  /** 익명 요원 — 사진 대신 그리는 바코드 */
  bars?: string;
  /** 캐릭터 상세 페이지 id (있을 때만) */
  id?: string;
}

function profileOf(c: Character | undefined, fb: { name: string; color: string; role: string; code: string; sub: string }): PairProfile {
  if (!c) return { ...fb, specs: [] };
  return {
    ...fb, id: c.id, name: c.name || fb.name, sub: c.sub || fb.sub, color: c.color || fb.color,
    img: c.arts?.[0] ?? c.thumbId, crop: c.thumbCrop,
    specs: (c.specs ?? []).filter(s => s.label?.trim() && s.value?.trim()),
  };
}
const findChar = (chars: Character[], en: string, ko: string) =>
  chars.find(c => new RegExp(`^\\s*${en}\\s*$`, 'i').test(c.name)) ?? chars.find(c => `${c.name} ${c.sub}`.includes(ko));

export function usePairProfiles(): { eve: PairProfile; eden: PairProfile; loaded: boolean } {
  const [chars, , loaded] = useLocalList<Character>('ohome.chars.v1', CHAR_SEED);
  return {
    eve: profileOf(findChar(chars, 'EVE', '이브'), { name: 'EVE', color: '#D11C20', role: 'SENTINEL', code: 'S-0001', sub: '이브' }),
    eden: profileOf(findChar(chars, 'EDEN', '에덴'), { name: 'EDEN', color: '#607ca0', role: 'GUIDE', code: 'G-0001', sub: '에덴' }),
    loaded,
  };
}
