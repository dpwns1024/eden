'use client';
/**
 * FIELD REPORT 글 주소 (v2.0 사용자 요청 — 「/report/mv55d7vk0ksn 이 못생겼다」).
 * 직접 정한 주소 이름(slug)이 있으면 그것(/report/silent-protocol), 없으면 글의 번호(№)로 짧게(/report/003).
 * 추가 섹션의 글은 뒤에 ?s=섹션 (섹션마다 번호·주소 이름이 따로다).
 * 예전 주소(/report/<글 id>)도 그대로 열린다 — 이미 공유한 링크가 깨지지 않게.
 */
import { MAIN_SEC } from './sectionStore';

type LogLike = { id: string; no: number; secId?: string; slug?: string };

/** 주소에 쓰는 이름 — 직접 정한 주소 이름, 없으면 3자리 번호 (003) */
export const logSlug = (l: LogLike) => l.slug || String(l.no).padStart(3, '0');

/** 입력한 주소 이름 정리 — 영문 소문자·숫자·하이픈만 (공유했을 때 주소가 깨진 글자로 보이지 않게).
 *  숫자만으로 된 이름은 글 번호와 헷갈리므로 쓸 수 없다 — 그땐 null */
export function normalizeLogSlug(raw: string): string | null {
  const s = raw.trim().toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  if (!s) return '';
  if (/^\d+$/.test(s)) return null;
  return s;
}

/** 글 상세 주소 (원래 주소 /trpg — 주소창에는 /report로 보인다) */
export function logPath(l: LogLike): string {
  const sec = l.secId && l.secId !== MAIN_SEC ? `?s=${encodeURIComponent(l.secId)}` : '';
  return `/trpg/${logSlug(l)}${sec}`;
}

/** 주소의 글 표시(id 또는 번호) → 글. 번호는 섹션 안에서 찾는다 */
export function findLogByRef<T extends LogLike>(logs: T[], ref: string, sec?: string | null): T | undefined {
  const byId = logs.find(x => x.id === ref);
  if (byId) return byId;
  const s = sec || MAIN_SEC;
  const inSec = (x: T) => (x.secId ?? MAIN_SEC) === s;
  const bySlug = logs.find(x => x.slug === ref && inSec(x));
  if (bySlug) return bySlug;
  if (!/^\d{1,6}$/.test(ref)) return undefined;
  const n = Number(ref);
  return logs.find(x => x.no === n && inSec(x));
}
