/**
 * YJHM 세계의 메뉴 · 페이지 이름 (v2.0 사용자 요청 — 「메뉴 이름도 지금 테마에 맞게, 메인 · 서브 전부」).
 * 메뉴 관리에 적힌 이름(AGENTS · FIELD REPORT …)은 EVEDEN(ARCH) 것이라, YJHM 세계에서만 주소로 찾아 신문 지면 이름으로 바꿔 보인다.
 * 저장된 메뉴 설정은 건드리지 않는다 — EVEDEN으로 돌아가면 원래 이름. 여기 없는 주소(새로 만든 게시판 등)는 메뉴 관리 이름 그대로.
 */
/** 하위 메뉴 · 페이지 큰 제목 — 주소별 */
export const YJHM_PAGE: Record<string, string> = {
  '/': 'FRONT PAGE',
  '/chars': 'ROSTER',            // 선수단 명단 (PROFILE)
  '/rels': 'MIXED TEAM',         // 혼성 단체전 — 두 사람 (PAIRING)
  '/trpg': 'MATCH REPORT',       // 경기 기록 (FIELD REPORT)
  '/rp': 'TRANSCRIPT',           // 통역 녹취 (COMMS ARCHIVE)
  '/diary': 'PRESS NOTE',        // 취재 수첩 (JOURNAL)
  '/gallery': 'PHOTO',           // 화보 (CONFIRMED)
  '/gallery?s=gift': 'B-CUT',    // 미공개 컷 (UNCONFIRMED)
  // '/prompt'는 메뉴 관리 이름(PROMPT) 그대로 (사용자 요청)
  '/board': 'DRAFT',             // 초고 (LOG)
  '/memo2': 'MEMO PAD',          // 메모 (MEMO)
};

/** 상위 메뉴 — 첫 하위 메뉴의 주소로 찾는다 (그룹 이름은 사람마다 다르게 지어도 묶음은 같다) */
const YJHM_GROUP: Record<string, string> = {
  '/chars': 'PEOPLE', '/rels': 'PEOPLE',                        // AGENTS
  '/trpg': 'MATCH DAY', '/rp': 'MATCH DAY', '/diary': 'MATCH DAY', // RECORDS
  '/gallery': 'PHOTO DESK', '/prompt': 'PHOTO DESK',            // SIGHTINGS
  '/board': 'NEWSROOM', '/memo2': 'NEWSROOM',                    // B/U
};

/** 메뉴 하나의 YJHM 이름 — href가 있으면 하위(단독) 메뉴, 없으면 children 주소로 그룹 이름 */
export function yjhmMenuLabel(m: { label: string; href?: string; children?: { href: string }[] }): string {
  if (m.href) return YJHM_PAGE[m.href] ?? m.label;
  for (const c of m.children ?? []) { const g = YJHM_GROUP[c.href.split('?')[0]]; if (g) return g; }
  return m.label;
}
