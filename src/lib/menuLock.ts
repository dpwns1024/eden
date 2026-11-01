'use client';
/**
 * 메뉴 비밀번호 — 비밀번호는 서버(Firestore 보안 규칙)가 대조한다.
 *
 * 정답은 `board_secrets/{잠금키}`에 해시로만 저장되고, 규칙상 **누구도 읽을 수 없다**.
 * 방문자가 입력한 값의 해시를 `board_unlocks`에 쓰면 규칙이 서버에서 정답과 비교해
 * 맞을 때만 기록을 허용한다. 그 기록이 있는 방문자에게만 잠긴 메뉴의 글이 내려간다.
 * 그래서 F12(네트워크·저장소·소스)로는 비밀번호도, 잠긴 글도 볼 수 없다.
 * 비밀번호를 바꾸면 해시가 달라져 예전 통과 기록은 자동으로 무효가 된다.
 *
 * 처음엔 게시판 단위였다가 메뉴 단위로 넓혔다 — 규칙의 컬렉션·칸 이름(board_secrets ·
 * board_unlocks · lockBoard)은 이미 게시한 규칙을 다시 붙여넣지 않아도 되게 그대로 둔다.
 * 거기 들어가는 값은 이제 게시판 id가 아니라 메뉴 주소에서 만든 잠금키(lockKeyOf)다.
 */
import { useEffect, useState } from 'react';
import { getSetting, onSettingChange } from './settingStore';
import { serverConfig } from './serverConfig';
import { currentMenuSettings, defaultTree } from './menuStore';
import { SECTION_META } from './sectionStore';

/** 비밀번호가 걸린 메뉴 주소 목록 (사이트 설정 — 비밀번호 자체는 여기 없다) */
export const MENU_LOCKS_KEY = 'ohome.menulocks.v1';

/** 이 홈이 메뉴 비밀번호를 쓸 수 있는가 — Firebase 연결에서만 (보안 규칙이 대조를 맡는다) */
export const menuLockSupported = () => serverConfig()?.kind === 'firebase';

/** 비밀번호를 걸 수 있는 메뉴 — 글이 서버 목록(컬렉션)에 저장되는 곳만.
 *  스케줄러·소개처럼 사이트 설정에 담기는 메뉴는 누구나 읽는 설정이라 서버에서 가릴 수 없다 */
const LOCKABLE = new Set([
  '/board', '/guest', '/memo', '/prompt', '/rp', '/rels', '/tchars', '/comm-apply',
  ...(['gallery', 'roadview', 'trpg', 'dotori', 'playlog', 'comm', 'diary', 'threads', 'chars'] as const)
    .map(k => SECTION_META[k].href),
]);
export const isLockableHref = (href: string) => LOCKABLE.has(href.split('?')[0]);

/** 지금 잠긴 메뉴 주소들 */
export function lockedHrefs(): string[] {
  if (!menuLockSupported()) return [];
  const v = getSetting<string[]>(MENU_LOCKS_KEY, []);
  return Array.isArray(v) ? v.filter(h => typeof h === 'string') : [];
}

/** 잠긴 메뉴 주소 — 설정이 바뀌면 다시 그린다 (메뉴 관리 화면용) */
export function useLockedHrefs(): string[] {
  const [v, setV] = useState<string[]>([]);
  useEffect(() => {
    const read = () => setV(lockedHrefs());
    read();
    return onSettingChange(k => { if (k === MENU_LOCKS_KEY) read(); });
  }, []);
  return v;
}

/** 메뉴 주소 → 서버 문서 id로 쓸 잠금키. 영문·숫자·하이픈만 남기고 나머지는 `_xxxx`로 —
 *  문서 id에 `/`를 쓸 수 없고, 서로 다른 주소가 같은 키가 되면 안 되므로 1:1로 바꾼다 */
export const lockKeyOf = (href: string) =>
  href.replace(/^\//, '').replace(/[^A-Za-z0-9-]/g, c => `_${c.charCodeAt(0).toString(16).padStart(4, '0')}`);

/** 비밀번호가 걸린 FIELD REPORT 글 id 목록 (v2.0 보안 점검 — 사이트 설정. 비밀번호 자체는 여기 없다).
 *  글마다 비밀번호도 메뉴 비밀번호와 똑같이 서버가 대조한다 — 정답 해시는 board_secrets/trpglog.{id} */
export const LOG_LOCKS_KEY = 'ohome.loglocks.v1';
/** 글 비밀번호의 잠금키 — 메뉴 잠금키(lockKeyOf)는 영문·숫자·하이픈·밑줄뿐이라 점(.)이 든 이 키와 겹칠 수 없다 */
export const logLockKey = (id: string) => `trpglog.${id}`;
export function lockedLogIds(): string[] {
  if (!menuLockSupported()) return [];
  const v = getSetting<string[]>(LOG_LOCKS_KEY, []);
  return Array.isArray(v) ? v.filter(h => typeof h === 'string') : [];
}

/** 가입코드의 잠금키 — board_secrets/__invite (밑줄은 lockKeyOf가 _005f로 바꾸므로 메뉴 키와 겹치지 않는다) */
export const INVITE_LOCK_KEY = '__invite';

/** 보안 점검 후속 정리 기록 (components/shell/SecurityMigrate.tsx) */
export const SEC_MIG_KEY = 'ohome.secmig.v1';
/** 정식 회원 증명(members)을 서버가 확인하는가 — 새 보안 규칙을 붙여넣은 뒤 관리자가 접속해
 *  기존 회원을 옮겨 담는 데 성공하면 켜진다. 그 전엔 가입코드를 예전처럼 화면에서 비교한다
 *  (옛 규칙에서는 회원 증명을 쓸 수 없어 가입이 막히므로) */
export const memberProofOn = (): boolean =>
  menuLockSupported() && !!getSetting<{ members?: number }>(SEC_MIG_KEY, {})?.members;

/** 비밀번호가 걸린 요원 상세 프로필 id 목록 (v2.0 사용자 요청 — 사이트 설정. 비밀번호 자체는 여기 없다).
 *  ⚠ 프로필 HTML은 사이트 설정(누구나 읽는 곳)에 들어 있어 서버가 내용을 가려 주지는 못한다 —
 *  비밀번호 대조만 서버가 하고, 내용은 화면에서 가린다 */
export const AGENT_LOCKS_KEY = 'ohome.agentlocks.v1';
/** 요원 프로필의 잠금키 — 점(.)이 들어 메뉴 잠금키(lockKeyOf)와 겹치지 않는다 */
export const agentLockKey = (id: string) => `agent.${id}`;
export function lockedAgentIds(): string[] {
  if (!menuLockSupported()) return [];
  const v = getSetting<string[]>(AGENT_LOCKS_KEY, []);
  return Array.isArray(v) ? v.filter(h => typeof h === 'string') : [];
}
/** 잠긴 요원 id — 설정이 바뀌면 다시 그린다 */
export function useLockedAgentIds(): string[] {
  const [v, setV] = useState<string[]>([]);
  useEffect(() => {
    const read = () => setV(lockedAgentIds());
    read();
    return onSettingChange(k => { if (k === AGENT_LOCKS_KEY) read(); });
  }, []);
  return v;
}

/** 서버가 아는 잠금키 전체 — 메뉴 비밀번호 + 글 비밀번호 + 요원 프로필 비밀번호 (가입코드는 뺀다) */
export const lockedKeys = (): Set<string> =>
  new Set([...lockedHrefs().map(lockKeyOf), ...lockedLogIds().map(logLockKey), ...lockedAgentIds().map(agentLockKey)]);

/**
 * 공통 비밀번호 (v2.0 사용자 요청 — 「사이트 비번 하나로 통일」).
 *
 * 켜면 모든 잠금(메뉴 · FIELD REPORT 글 · 요원 프로필)의 정답 해시가 **같은 값**이 된다:
 * 잠금키 대신 COMMON_LOCK_KEY를 섞어 만든 해시. 그래서
 *   · 보안 규칙은 그대로 — 여전히 board_secrets/{잠금키}의 해시와 비교할 뿐이다
 *   · 방문자가 한 곳에서 맞히면 같은 해시로 다른 잠금의 통과 기록도 한꺼번에 만든다 (한 번 입력으로 전부 열림)
 *   · 새로 잠글 때 관리자가 비밀번호를 다시 칠 필요가 없다 — 해시를 관리자만 읽는 문서
 *     (members/__sitepw — members 규칙: 본인 · 관리자만 읽기, 관리자만 쓰기)에 둬서 그대로 옮겨 적는다
 * 사이트 설정에는 「켜짐」 표시만 남는다 (비밀번호도 해시도 없음). 가입코드는 따로다.
 */
export const SITE_PW_KEY = 'ohome.sitepw.v1';
export const COMMON_LOCK_KEY = '__common';
/** 공통 비밀번호를 쓰는가 */
export const sitePwOn = (): boolean => menuLockSupported() && !!getSetting<{ on?: boolean }>(SITE_PW_KEY, {})?.on;
export function useSitePwOn(): boolean {
  const [v, setV] = useState(false);
  useEffect(() => {
    const read = () => setV(sitePwOn());
    read();
    return onSettingChange(k => { if (k === SITE_PW_KEY) read(); });
  }, []);
  return v;
}
/** 화면에서 「공통 비밀번호로 잠그기」를 고른 자리에 넣는 표시값 — 실제 비밀번호가 아니다 */
export const SITE_PW_TOKEN = '\u0000site';

/**
 * 이 주소를 다스리는 잠긴 메뉴 주소 — 없으면 null.
 * 메뉴 공개범위(hrefEntry)와 같은 방식: 걸쳐 있는 메뉴 중 **가장 구체적인 주소**가 이긴다.
 * `/gallery`를 잠가도 메뉴에 따로 올린 `/gallery?s=fan`은 그 항목의 설정을 따른다.
 * extra — 판정에 후보로 더 넣을 주소 (잠금을 푸는 중인 메뉴가 다스리던 글을 찾을 때)
 */
export function governingLock(path: string, extra: string[] = []): string | null {
  const locks = [...lockedHrefs(), ...extra];
  if (!locks.length) return null;
  const s = currentMenuSettings();
  const menuHrefs = (s.tree ?? defaultTree()).flatMap(g => (g.href ? [g.href] : g.items.map(it => it.href)));
  const covers = (href: string) => path === href || path.startsWith(`${href}/`) || path.startsWith(`${href}?`);
  let best: string | null = null;
  for (const h of [...menuHrefs, ...locks]) if (covers(h) && (!best || h.length > best.length)) best = h;
  return best && locks.includes(best) ? best : null;
}

/** 비밀번호 → 서버에 보내는 키 (SHA-256). 잠금키를 섞어 메뉴마다 다른 값이 되게 한다
 *  (공통 비밀번호는 잠금키 자리에 COMMON_LOCK_KEY를 넣어 모든 잠금이 같은 값이 된다) */
export async function lockHash(key: string, password: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`ohome-board|${key}|${password}`));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
