'use client';
/**
 * FIELD REPORT 글 주소 (v2.0 사용자 요청 — 「/report/mv55d7vk0ksn 이 못생겼다」).
 * 글의 번호(№)로 짧게: 기본 섹션은 /report/003, 추가 섹션은 /report/003?s=섹션 (섹션마다 번호가 따로 매겨진다).
 * 예전 주소(/report/<글 id>)도 그대로 열린다 — 이미 공유한 링크가 깨지지 않게.
 */
import { MAIN_SEC } from './sectionStore';

type LogLike = { id: string; no: number; secId?: string };

/** 주소에 쓰는 번호 — 3자리 (003) */
export const logSlug = (l: LogLike) => String(l.no).padStart(3, '0');

/** 글 상세 주소 (원래 주소 /trpg — 주소창에는 /report로 보인다) */
export function logPath(l: LogLike): string {
  const sec = l.secId && l.secId !== MAIN_SEC ? `?s=${encodeURIComponent(l.secId)}` : '';
  return `/trpg/${logSlug(l)}${sec}`;
}

/** 주소의 글 표시(id 또는 번호) → 글. 번호는 섹션 안에서 찾는다 */
export function findLogByRef<T extends LogLike>(logs: T[], ref: string, sec?: string | null): T | undefined {
  const byId = logs.find(x => x.id === ref);
  if (byId) return byId;
  if (!/^\d{1,6}$/.test(ref)) return undefined;
  const n = Number(ref);
  const s = sec || MAIN_SEC;
  return logs.find(x => x.no === n && (x.secId ?? MAIN_SEC) === s);
}
