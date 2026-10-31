'use client';
/**
 * 기밀 카드 정보 맞추기 (v2.0 사용자 요청 · lib/classified.ts) — 관리자 화면에서만 돈다.
 * 기밀로 표시한 캐릭터·자관의 목록 카드 정보(이름·색·그림·자리)를 공개 설정에 적어 두면
 * 방문자 목록이 그걸로 잠긴 카드를 그린다. 본문 · 프로필은 담지 않는다.
 */
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useLocalList } from '@/lib/postStore';
import { Character, CHAR_SEED, Relation, REL_SEED } from '@/lib/charStore';
import { cpLabelFor } from '@/lib/relqStore';
import { afterOf, saveClassified, type ClassifiedStub } from '@/lib/classified';
import { charWorlds, relWorlds } from '@/lib/worldStore';

function SyncInner() {
  const [chars, , cLoaded] = useLocalList<Character>('ohome.chars.v1', CHAR_SEED);
  const [rels, , rLoaded] = useLocalList<Relation>('ohome.rels.v1', REL_SEED);

  useEffect(() => {
    if (!cLoaded || !rLoaded) return;   // 보이는 세계(자동)는 소속 페어로 정해지니 페어까지 읽은 뒤에
    const own = chars.filter(c => c.own);
    const stubs: ClassifiedStub[] = [];
    own.forEach((c, i) => {
      if (!c.classified || c.visibility !== 'private') return;
      stubs.push({
        id: c.id, slug: c.slug, secId: c.secId, name: c.name, color: c.color,
        img: c.arts?.[0] ?? c.thumbId, crop: c.thumbCrop, ph: c.thumbClass, after: afterOf(own, i),
        worlds: charWorlds(c, rels),
      });
    });
    saveClassified('chars', stubs);
  }, [chars, rels, cLoaded, rLoaded]);

  useEffect(() => {
    if (!rLoaded || !cLoaded) return;
    const stubs: ClassifiedStub[] = [];
    rels.forEach((r, i) => {
      if (!r.classified || r.visibility !== 'private') return;
      const art = r.arts?.[0] ?? r.thumbId;
      const crop = r.listCrop || (art && r.artCrops?.[art]) || (art === r.thumbId ? r.thumbCrop : undefined) || undefined;
      stubs.push({
        id: r.id, slug: r.slug, name: r.name, img: art, crop, cropM: r.listCropM || crop,
        thumb: r.thumbId, thumbCrop: r.thumbCrop, ph: r.thumbClass, cp: cpLabelFor(r) || undefined,
        members: r.members.map(m => {
          const c = chars.find(x => x.id === m.charId);
          return { name: c?.name ?? '', color: c?.color ?? '#666' };
        }),
        after: afterOf(rels, i),
        worlds: relWorlds(r),
      });
    });
    saveClassified('rels', stubs);
  }, [rels, chars, rLoaded, cLoaded]);

  return null;
}

export function ClassifiedSync() {
  const { isAdmin } = useAuth();
  return isAdmin ? <SyncInner /> : null;
}
