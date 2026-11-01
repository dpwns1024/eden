'use client';
/**
 * 보호 설정 (v2.0 사용자 요청 — 「F12로 보이는 것도 가릴 수 있는 건 다 가리기」).
 *
 * 사이트 설정(settings 컬렉션)은 화면을 그리려고 **누구에게나** 내려간다. 그래서 설정에 담기던
 * 「글 같은 내용」 — ARCH 탭 문서 · HTML 페이지 · 인트로 · 스케줄러 일정 — 은 메뉴를 회원 전용 ·
 * 관리자 전용 · 비밀번호로 막아도 F12로 그대로 보였다.
 *
 * 이제 이 키들은 **조각으로 나눠 콘텐츠 컬렉션 `vault`에** 저장한다. 조각마다 그 내용이 걸린 메뉴
 * 주소(href)를 적어 두면, 다른 글과 똑같이 저장할 때 메뉴 기준(visFloor)으로 공개범위가 정해지고
 * 서버(보안 규칙)가 볼 수 있는 사람에게만 내준다.
 *   · ARCH 탭 문서 · HTML 페이지 — 페이지(섹션)마다 한 조각 (`/page?s=…` 메뉴 기준)
 *   · 잠긴 요원 상세 프로필 — 요원마다 한 조각, 그 요원의 비밀번호(agent.{id})로 잠근다
 *   · 인트로 — 한 조각 (`/intro` 메뉴 기준)
 *   · 스케줄러 — 일정마다 한 조각 (일정의 공개범위 + 그 스케줄러 메뉴 기준). 카테고리 같은 틀은 공개로 남긴다
 * 설정 자리에는 표시(`__vault`)와 공개해도 되는 틀(base)만 남는다.
 *
 * 나누고 합치는 일은 Firebase 백엔드가 설정 읽기·쓰기 안에서 한다 — 화면 · 백업 · 이미지 정리는
 * 예전처럼 「설정 값 하나」를 주고받는다 (관리자는 전부 합친 값을, 방문자는 볼 수 있는 조각만 합친 값을 받는다).
 */
import type { ListItem } from './backend/types';
import { MAIN_SEC, sectionHref } from './sectionStore';
import { agentLockKey, lockedAgentIds } from './menuLock';
import { PROTECTED_SETTING_KEYS } from './settingStore';

export const VAULT_COLL = 'vault';

const [ARCH, PAGES, INTRO, SCHED] = PROTECTED_SETTING_KEYS;
export const VAULT_KEYS = new Set<string>(PROTECTED_SETTING_KEYS);

/** vault 문서 하나 — data에 그대로 저장된다 */
export interface VaultItem extends ListItem {
  key: string;          // 어느 설정 키의 조각인가
  part: string;         // 조각 이름 (섹션 id · 일정 id …)
  href: string;         // 이 조각이 걸린 메뉴 주소 — 공개범위 기준 (lib/visFloor.ts)
  lockKey?: string;     // 메뉴와 별도로 거는 비밀번호 (요원 프로필)
  visibility?: string;  // 조각 자체의 공개범위 (스케줄러 일정) — 메뉴 기준보다 넓어지지는 않는다
  value: unknown;
}

/** 설정 자리에 남기는 표시 — 이게 있으면 내용은 vault에 있다 */
export interface VaultMark { __vault: 1; base: unknown }
export const isVaultMark = (v: unknown): v is VaultMark =>
  !!v && typeof v === 'object' && (v as { __vault?: unknown }).__vault === 1;

/** 문서 id — `/`를 쓸 수 없어 영문·숫자·점·하이픈만 남기고 나머지는 `_xxxx`로 (1:1) */
const docId = (key: string, part: string) =>
  `${key}~${part}`.replace(/[^A-Za-z0-9.-]/g, c => `_${c.charCodeAt(0).toString(16).padStart(4, '0')}`);

const item = (key: string, part: string, href: string, value: unknown, extra: Partial<VaultItem> = {}): VaultItem =>
  ({ id: docId(key, part), key, part, href, value, ...extra });

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => !!v && typeof v === 'object' && !Array.isArray(v);

/* ── ARCH 탭 문서 — 잠긴 요원의 상세 프로필 HTML은 따로 뺀다 ── */
type Agent = { id: string; html?: string };
function eachAgent(doc: unknown, fn: (a: Agent) => void) {
  const tabs = isRec(doc) && Array.isArray(doc.tabs) ? doc.tabs : [];
  for (const t of tabs) {
    const blocks = isRec(t) && Array.isArray(t.blocks) ? t.blocks : [];
    for (const b of blocks) {
      if (!isRec(b) || b.type !== 'roster' || !Array.isArray(b.groups)) continue;
      for (const g of b.groups) if (isRec(g) && Array.isArray(g.agents)) g.agents.forEach(a => { if (isRec(a)) fn(a as Agent); });
    }
  }
}

/** 설정 값 → 공개 틀 + 조각들 */
export function vaultSplit(key: string, value: unknown): { base: unknown; items: VaultItem[] } {
  const items: VaultItem[] = [];
  if (key === ARCH || key === PAGES) {
    const map = isRec(value) ? value : {};
    const locked = key === ARCH ? new Set(lockedAgentIds()) : new Set<string>();
    for (const [sec, v] of Object.entries(map)) {
      const href = sectionHref('page', sec);
      if (key === ARCH && locked.size) {
        const doc = JSON.parse(JSON.stringify(v)) as unknown;   // 원본을 건드리지 않게 복사
        eachAgent(doc, a => {
          if (!locked.has(a.id) || !a.html) return;
          items.push(item(key, `${sec}~ag~${a.id}`, href, a.html, { lockKey: agentLockKey(a.id) }));
          a.html = '';
        });
        items.push(item(key, sec, href, doc));
      } else {
        items.push(item(key, sec, href, v));
      }
    }
    return { base: {}, items };
  }
  if (key === INTRO) {
    items.push(item(key, '_', '/intro', value));
    return { base: null, items };
  }
  if (key === SCHED) {
    const st = isRec(value) ? value : {};
    const events = Array.isArray(st.events) ? st.events : [];
    events.forEach((ev, i) => {
      if (!isRec(ev) || typeof ev.id !== 'string') return;
      const sec = typeof ev.secId === 'string' ? ev.secId : MAIN_SEC;
      items.push(item(key, ev.id, sectionHref('sched', sec), ev, {
        visibility: typeof ev.visibility === 'string' ? ev.visibility : 'public', sort: i,
      }));
    });
    return { base: { ...st, events: [] }, items };
  }
  return { base: value, items };
}

/** 공개 틀 + (볼 수 있는) 조각들 → 설정 값. 볼 수 있는 조각이 하나도 없는 인트로는 null */
export function vaultMerge(key: string, base: unknown, rows: VaultItem[]): unknown {
  if (key === ARCH || key === PAGES) {
    const out: Rec = {};
    const agentHtml = new Map<string, string>();
    for (const r of rows) {
      const m = /^(.*)~ag~(.+)$/.exec(r.part);
      if (m) agentHtml.set(`${m[1]}|${m[2]}`, String(r.value ?? ''));
      else out[r.part] = r.value;
    }
    if (agentHtml.size) {
      // 받은 조각을 그대로 고치면 다른 곳(저장 diff 기준)이 쥐고 있는 값까지 바뀐다 — 복사해서 채운다
      for (const sec of Object.keys(out)) out[sec] = JSON.parse(JSON.stringify(out[sec]));
      for (const [sec, doc] of Object.entries(out)) {
        eachAgent(doc, a => { const h = agentHtml.get(`${sec}|${a.id}`); if (h != null) a.html = h; });
      }
    }
    return out;
  }
  if (key === INTRO) return rows[0]?.value ?? null;
  if (key === SCHED) {
    const events = [...rows].sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0)).map(r => r.value);
    return { ...(isRec(base) ? base : {}), events };
  }
  return base;
}
