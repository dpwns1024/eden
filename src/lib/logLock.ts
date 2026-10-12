'use client';
/**
 * FIELD REPORT 글마다 거는 열람 비밀번호 (v2.0 보안 점검).
 *
 * 예전엔 비밀번호를 글 목록 문서에 **그대로** 적어 두고 화면에서 비교했다. 목록 문서는 누구나
 * 받아 가므로 F12(네트워크 탭)만 열면 비밀번호가 보였고, 본문도 비밀번호가 있으면 공개로 저장돼
 * 비밀번호 없이 읽을 수 있었다.
 *
 * 이제는 메뉴 비밀번호와 같은 길을 쓴다 (lib/menuLock.ts):
 *   · 정답은 `board_secrets/trpglog.{id}`에 해시로만 — 규칙상 누구도 읽을 수 없다
 *   · 본문 문서는 `locked` + lockBoard=trpglog.{id} 로 저장 — 비밀번호를 통과한 방문자·회원·관리자만 받는다
 *   · 목록 문서에는 「비밀번호 있음」 표시(pwLock)만 남는다
 * 서버 대조는 Firebase에서만 된다 — 그 밖의 저장 방식은 예전처럼 화면에서 비교한다.
 */
import { backend } from './backend';
import { getSetting, setSetting } from './settingStore';
import { LOG_LOCKS_KEY, logLockKey, menuLockSupported } from './menuLock';

/** 이 글에 열람 비밀번호가 걸려 있는가 (새 방식 pwLock · 옛 방식 password 모두) */
export const hasLogPw = (l: { password?: string; pwLock?: boolean }) => !!l.password || !!l.pwLock;

/** 글 비밀번호를 서버가 대조하는가 (Firebase) */
export const logPwOnServer = () => menuLockSupported();

/** 관리자: 글 비밀번호 설정(null·빈 값이면 해제). 성공해야 글을 저장한다 */
export async function setLogPassword(id: string, password: string | null): Promise<{ ok: boolean; error?: string }> {
  const be = backend();
  if (!be) return { ok: false, error: '서버에 연결돼 있지 않습니다.' };
  const r = await be.setLockPassword(logLockKey(id), password || null);
  if (!r.ok) return r;
  const cur = getSetting<string[]>(LOG_LOCKS_KEY, []);
  const ids = Array.isArray(cur) ? cur.filter(x => typeof x === 'string') : [];
  const next = password ? [...new Set([...ids, id])] : ids.filter(x => x !== id);
  if (next.length !== ids.length) setSetting(LOG_LOCKS_KEY, next);
  return { ok: true };
}

/** 방문자: 글 비밀번호 입력 — 맞으면 통과 기록이 생기고 본문이 내려온다 */
export async function unlockLog(id: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const be = backend();
  if (!be) return { ok: false, error: '서버에 연결돼 있지 않습니다.' };
  return be.unlockLock(logLockKey(id), password);
}
