'use client';
/**
 * 메뉴를 비공개로 두면 **글도 비공개로 저장한다** (v2.0 사용자 요청).
 *
 * 여태 메뉴 공개범위는 화면에서 가리는 것뿐이었다 — 글은 `visibility: 'public'`으로 저장돼 있어
 * 서버(RLS)가 누구에게든 그 행을 내줬다. 주소를 막아도 API를 직접 부르면 그대로 보인다는 뜻이다.
 * 그래서 **저장할 때** 그 글이 걸린 메뉴의 공개범위를 「최소 기준」으로 삼는다:
 *
 *   메뉴 전체 보임 → 글 그대로   ·   회원만 → 최소 `member`   ·   관리자만 → 최소 `private`
 *
 * 글 자체가 더 좁으면(비공개 글) 그대로 둔다 — **좁히기만 하고 넓히지 않는다.**
 * 글에 `visibility` 칸이 아예 없는 종류(게시판 글 등)도 여기서 정해지므로 타입을 안 고쳐도 된다.
 */
import { currentMenuSettings, hrefAccess } from './menuStore';
import { MAIN_SEC, sectionHref, type SectionKind } from './sectionStore';
import { MAIN_BOARD_ID } from './boardStore';
import type { Visibility } from './charStore';
import type { ListItem } from './backend/types';
import { governingLock, lockKeyOf } from './menuLock';

/** 컬렉션 → 그 목록이 걸린 메뉴. 섹션형은 종류만 주고 소속은 항목의 `secId`에서 읽는다 */
const AREA: Record<string, { kind?: SectionKind; href?: string; board?: boolean }> = {
  posts: { board: true },              // 게시판은 섹션이 아니라 `?b=`로 갈린다
  gallery: { kind: 'gallery' },
  roadview: { kind: 'roadview' },
  trpg_logs: { kind: 'trpg' },
  trpg_log_bodies: { kind: 'trpg' },   // 본문은 별도 문서 — 목록만 막으면 본문이 그대로 남는다
  dotori: { kind: 'dotori' },
  playlog: { kind: 'playlog' },
  commissions: { kind: 'comm' },
  diary: { kind: 'diary' },
  threads: { kind: 'threads' },
  guestbook: { href: '/guest' },
  memos: { href: '/memo' },
  rp_rooms: { href: '/rp' },
  characters: { kind: 'chars' },
  relations: { href: '/rels' },
  trpg_chars: { href: '/tchars' },
  applicants: { href: '/comm-apply' },
  qa_answers: { href: '/rels' },       // 자관 문답 답변 — 자관 안이 아니라 자기 문서라 따로 적는다
  rp_messages: { href: '/rp' },        // 역극 발화 — 같은 이유
};

/** 댓글 → 달린 곳의 메뉴. 댓글은 글과 따로 저장돼서, 달 때 소속(boardId·secId)을 함께 적어 둔다 */
function commentHref(item: ListItem): string | null {
  switch (item.target) {
    case 'post': return typeof item.boardId === 'string'
      ? (item.boardId === MAIN_BOARD_ID ? '/board' : `/board?b=${item.boardId}`) : null;
    // 소속을 안 적은 옛 댓글은 어디 것인지 모른다 — 기본 섹션으로 짐작하면 엉뚱한 범위가 걸린다
    case 'road': return typeof item.secId === 'string' ? sectionHref('roadview', item.secId) : null;
    case 'thread': return typeof item.secId === 'string' ? sectionHref('threads', item.secId) : null;
    case 'guest': return '/guest';
    default: return null;
  }
}

/** 이 항목이 걸린 메뉴 주소 — 어디에도 안 걸리는 컬렉션(알림 등)은 null */
export function areaHrefOf(coll: string, item: ListItem): string | null {
  if (coll === 'comments') return commentHref(item);
  const a = AREA[coll];
  if (!a) return null;
  if (a.href) return a.href;
  if (a.board) {
    const b = typeof item.boardId === 'string' ? item.boardId : MAIN_BOARD_ID;
    return b === MAIN_BOARD_ID ? '/board' : `/board?b=${b}`;
  }
  const s = typeof item.secId === 'string' ? item.secId : MAIN_SEC;
  return sectionHref(a.kind!, s);
}

/** 이 항목이 비밀번호 걸린 메뉴 소속이면 그 잠금키 (lib/menuLock.ts) */
export function lockKeyOfItem(coll: string, item: ListItem): string | null {
  const href = areaHrefOf(coll, item);
  const lock = href ? governingLock(href) : null;
  return lock ? lockKeyOf(lock) : null;
}

/** 이 항목을 저장할 때 지켜야 할 **최소** 공개범위.
 *  `locked` = 비밀번호 메뉴 — 회원·관리자·작성자, 그리고 비밀번호를 통과한 방문자만 (보안 규칙) */
export function visFloorOf(coll: string, item: ListItem): Visibility | 'locked' {
  const href = areaHrefOf(coll, item);
  const v = href ? hrefAccess(currentMenuSettings(), href) : 'all';
  if (v === 'admin') return 'private';
  if (v === 'member') return 'member';
  return lockKeyOfItem(coll, item) ? 'locked' : 'public';
}

const RANK: Record<string, number> = { public: 0, locked: 0.5, member: 1, private: 2 };

/** 둘 중 더 좁은 쪽 */
export const strictestVis = (a: string, b: string): string =>
  ((RANK[a] ?? 0) >= (RANK[b] ?? 0) ? a : b);
