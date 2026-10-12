'use client';
/**
 * 서버에 저장된 글 공개범위를 지금 메뉴 설정에 맞추기 (v2.0 사용자 제보).
 *
 * 글의 서버 공개범위는 **저장할 때** 그 메뉴의 기준(visFloor)으로 정해진다. 그래서 메뉴를
 * 「관리자만」으로 두고 글을 올린 뒤 메뉴를 공개(+비밀번호)로 바꾸면, 글은 여전히 비공개로 남아
 * 비밀번호를 맞힌 방문자에게도 하나도 안 보였다 — 좁히는 쪽만 다시 적용하고 넓히는 쪽은 안 했기 때문.
 *
 * 공개범위는 글 자체의 값(비밀글·나만보기 등, 내용 안에 그대로 있다) + 메뉴 기준으로 언제든 다시
 * 계산할 수 있으므로, 다시 계산한 값과 **서버에 저장된 값이 다른 행만** 골라 고친다.
 * 글이 스스로 좁게 둔 것은 계산 결과도 좁으니 넓어지지 않는다 — 메뉴 때문에 좁아졌던 것만 풀린다.
 */
import { CONTENT_COLLECTIONS, metaOf, type Backend } from './backend/types';
import { visFloorOf, lockKeyOfItem } from './visFloor';

/** 고친 행 수. 이 기능이 없는 저장소면 null */
export async function syncStoredVis(be: Backend, uid: string | null): Promise<number | null> {
  if (!be.fetchVisMeta) return null;
  let n = 0;
  for (const coll of CONTENT_COLLECTIONS) {
    const [rows, meta] = await Promise.all([be.fetchList(coll), be.fetchVisMeta(coll)]);
    const stale = rows.filter(r => {
      const m = meta[r.id];
      if (!m) return false;
      const { visibility } = metaOf(r, uid, visFloorOf(coll, r));
      const lock = visibility === 'locked' ? lockKeyOfItem(coll, r) : null;
      return m.visibility !== visibility || (m.lockBoard ?? null) !== lock;
    });
    if (stale.length) n += await be.refreshVis(coll, stale, uid);
  }
  return n;
}
