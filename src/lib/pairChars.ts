'use client';
/**
 * 이브 · 에덴 · 아담 (v2.0) — 메인의 가이드 매칭 연출(SyncMatch)과 기밀 파일 페이지(/eveden)가 같이 쓴다.
 * 캐릭터 목록(ohome.chars.v1)에서 이름으로 찾고, 없으면 이름 · 대표색만.
 * 역할은 이야기대로 고정한다 — 이브 SENTINEL, 에덴 · 아담 GUIDE.
 * 아담(이브의 이전 가이드 · 순직)은 캐릭터 목록에 없을 수 있어 기본 프로필을 여기 적어 둔다 —
 * 목록에 ADAM이 생기면 그쪽 사진 · 프로필 칸을 쓴다. 사진만 따로 넣을 때는 ADAM_IMG (public/ 아래 경로).
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
  /** 사이트에 직접 넣어 둔 사진 주소 (public/ 아래) — 캐릭터 목록 사진이 없을 때 */
  src?: string;
}

/** 아담 사진 — public/ 아래에 넣은 파일 경로. 비어 있으면 실루엣 */
export const ADAM_IMG = '/img/adam.jpg';

type Fallback = { name: string; color: string; role: string; code: string; sub: string; specs?: PairProfile['specs']; src?: string };
function profileOf(c: Character | undefined, fb: Fallback): PairProfile {
  if (!c) return { ...fb, specs: fb.specs ?? [] };
  const specs = (c.specs ?? []).filter(s => s.label?.trim() && s.value?.trim());
  return {
    ...fb, id: c.id, name: c.name || fb.name, sub: c.sub || fb.sub, color: c.color || fb.color,
    img: c.arts?.[0] ?? c.thumbId, crop: c.thumbCrop,
    specs: specs.length ? specs : fb.specs ?? [],
  };
}
const findChar = (chars: Character[], en: string, ko: string) =>
  chars.find(c => new RegExp(`^\\s*${en}\\s*$`, 'i').test(c.name)) ?? chars.find(c => `${c.name} ${c.sub}`.includes(ko));

export function usePairProfiles(): { eve: PairProfile; eden: PairProfile; adam: PairProfile; loaded: boolean } {
  const [chars, , loaded] = useLocalList<Character>('ohome.chars.v1', CHAR_SEED);
  return {
    eve: profileOf(findChar(chars, 'EVE', '이브'), { name: 'EVE', color: '#D11C20', role: 'SENTINEL', code: 'S-0001', sub: '이브' }),
    eden: profileOf(findChar(chars, 'EDEN', '에덴'), { name: 'EDEN', color: '#607ca0', role: 'GUIDE', code: 'G-0001', sub: '에덴' }),
    adam: profileOf(findChar(chars, 'ADAM', '아담'), {
      name: 'ADAM', color: '#3fa9c8', role: 'GUIDE', code: 'G-0002', sub: '아담', src: ADAM_IMG || undefined,
      specs: [{ label: '소속', value: 'S-Class Guide / SUPPORT' }, { label: '속성', value: '물 (Aqua)' }],
    }),
    loaded,
  };
}
