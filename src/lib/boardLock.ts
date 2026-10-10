'use client';
/**
 * 게시판 비밀번호 — 비밀번호는 서버(Firestore 보안 규칙)가 대조한다.
 *
 * 정답은 `board_secrets/{게시판}`에 해시로만 저장되고, 규칙상 **누구도 읽을 수 없다**.
 * 방문자가 입력한 값의 해시를 `board_unlocks`에 쓰면 규칙이 서버에서 정답과 비교해
 * 맞을 때만 기록을 허용한다. 그 기록이 있는 방문자에게만 잠긴 게시판 글이 내려간다.
 * 그래서 F12(네트워크·저장소·소스)로는 비밀번호도, 잠긴 글도 볼 수 없다.
 * 비밀번호를 바꾸면 해시가 달라져 예전 통과 기록은 자동으로 무효가 된다.
 */
import { getSetting } from './settingStore';
import { serverConfig } from './serverConfig';

const BOARDS_KEY = 'ohome.boards.v1';

/** 이 홈이 게시판 비밀번호를 쓸 수 있는가 — Firebase 연결에서만 (보안 규칙이 대조를 맡는다) */
export const boardLockSupported = () => serverConfig()?.kind === 'firebase';

/** 비밀번호가 걸린 게시판 id 목록 (게시판 설정의 locked 표시 — 비밀번호 자체는 여기 없다) */
export function lockedBoardIds(): Set<string> {
  if (!boardLockSupported()) return new Set();
  const boards = getSetting<{ id: string; locked?: boolean }[]>(BOARDS_KEY, []);
  return new Set((Array.isArray(boards) ? boards : []).filter(b => b && b.locked).map(b => b.id));
}

/** 비밀번호 → 서버에 보내는 키 (SHA-256). 게시판 id를 섞어 게시판마다 다른 값이 되게 한다 */
export async function boardKey(boardId: string, password: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`ohome-board|${boardId}|${password}`));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
