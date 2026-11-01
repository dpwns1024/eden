// 그림 로드뷰(4.10)·그림백업(4.11)·TRPG 백업(4.3) 데이터 — localStorage (→ Supabase/R2 이전 예정)
import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import type { Comment, FoldType } from './postStore';
import type { CropValue } from '@/components/ui/CropEditor';
import type { Visibility } from './charStore';
import { getRawSetting, setSetting } from './settingStore';

/* ---------- 로드뷰 (4.10) ---------- */
export interface RoadItem {
  /** 소속 섹션 (v2.0) — 여러 개로 만들었을 때. 없으면 기본 섹션 */
  secId?: string;
  id: string;
  title: string;
  author: string;
  authorId: string;
  date: string;              // ISO
  imgUrl?: string;           // (구) URL — 새 업로드는 imgId 사용
  imgId?: string;            // IndexedDB 파일 id (blobStore — 새로고침에도 유지)
  ph: string;                // 데모 플레이스홀더 클래스
  narrow?: boolean;          // 원본 가로가 좁은 이미지 (가운데 정렬)
  ratio: string;             // aspect-ratio 값
  fold: { type: FoldType; label?: string } | null;
  comments: Comment[];
  no?: number;               // 그림 번호 (v1.9 — 제목 대신 번호로 식별, 알림도 번호 기준)
}

export const ROAD_SEED: RoadItem[] = [];

/* ---------- 그림백업 (4.11) ---------- */
export interface BackupPost {
  /** 소속 섹션 (v2.0) — 여러 개로 만들었을 때. 없으면 기본 섹션 */
  secId?: string;
  id: string;
  title: string;
  type: 'log' | 'single' | 'vlist';    // 로그형(틈 없이 세로) / 단일형(좌우 넘김) / 단일 세로정렬(갭 있는 세로, v1.9)
  images: string[];          // 파일 id 또는 URL (비어 있으면 데모 ph — blobStore 참조)
  thumbCrop?: CropValue;     // 대표(첫) 이미지의 썸네일 크롭 (6.1)
  phList: string[];          // 데모 플레이스홀더
  desc: string;
  category: string;          // 말머리 (예전 글 — 이제는 relId로 페어링을 고른다, lib/pairLink.ts)
  relId?: string;            // 페어링 연동 (v2.0 사용자 요청 — 탭 · 뱃지)
  catId?: string;            // EVEDEN 카테고리 (v2.0 사용자 요청 — lib/boardCats.ts)
  madeDate?: string;         // 제작일 (선택)
  date: string;
  author: string;
  authorId: string;
  visibility: Visibility;
  fold: { type: FoldType; label?: string } | null;
  /** 태그 (v2.0 사용자 요청) — 목록·카드에 나열되고 검색에 걸린다 */
  tags?: string[];
  /** 글 번호 (v2.0 사용자 요청 — 주소를 리포트처럼 /confirmed/003). 예전 글은 처음 저장할 때 만든 순서대로 매겨 둔다 */
  no?: number;
  /** 직접 정한 주소 이름 (/confirmed/silent-protocol) — 없으면 번호 */
  slug?: string;
}

export const BACKUP_SEED: BackupPost[] = [];

/* ---------- 갤러리 글 주소 (v2.0 사용자 요청 — 「/confirmed/mvgn4rl3zfts」 대신 리포트처럼 번호 · 주소 이름) ---------- */
/** 글을 만든 때 — 글 id 앞 8자는 만든 시각(newId: Date.now 36진수), 못 읽으면 날짜 */
const backupTime = (p: BackupPost) => {
  const t = parseInt(p.id.slice(0, 8), 36);
  return Number.isFinite(t) && t > 1e12 && t < 4e12 ? t : Date.parse(p.date) || 0;
};
/** 글마다 번호 — 정해 둔 번호는 그대로, 없는 예전 글은 만든 순서대로 그 뒤에 */
export function backupNos(posts: BackupPost[]): Map<string, number> {
  const m = new Map<string, number>();
  let max = 0;
  posts.forEach(p => { if (p.no) { m.set(p.id, p.no); max = Math.max(max, p.no); } });
  posts.filter(p => !p.no).sort((a, b) => backupTime(a) - backupTime(b) || a.id.localeCompare(b.id)).forEach(p => m.set(p.id, ++max));
  return m;
}
/** 번호가 없는 글에 지금 번호를 적어 둔다 — 저장할 때마다 불러, 글을 지워도 다른 글 번호(주소)가 밀리지 않게 */
export function freezeBackupNos(posts: BackupPost[]): BackupPost[] {
  if (posts.every(p => p.no)) return posts;
  const m = backupNos(posts);
  return posts.map(p => (p.no ? p : { ...p, no: m.get(p.id) }));
}
/** 주소에 쓰는 이름 — 직접 정한 주소 이름, 없으면 3자리 번호 (003) */
export const backupSlug = (p: BackupPost, nos?: Map<string, number>) =>
  p.slug || String(p.no ?? nos?.get(p.id) ?? 0).padStart(3, '0');
/** 글 상세 주소 (원래 주소 /gallery — 주소창에는 /confirmed로 보인다) */
export const backupPath = (p: BackupPost, nos?: Map<string, number>) => `/gallery/${backupSlug(p, nos)}`;
/** 주소의 글 표시(예전 id · 주소 이름 · 번호) → 글. 예전에 공유한 /confirmed/<id> 링크도 그대로 열린다 */
export function findBackupByRef(posts: BackupPost[], ref: string): BackupPost | undefined {
  const r = decodeURIComponent(ref);
  const byId = posts.find(x => x.id === r);
  if (byId) return byId;
  const bySlug = posts.find(x => x.slug === r);
  if (bySlug) return bySlug;
  if (!/^\d{1,6}$/.test(r)) return undefined;
  const n = Number(r), nos = backupNos(posts);
  return posts.find(x => nos.get(x.id) === n);
}

export const BACKUP_CATEGORIES = ['합작', '낙서', '커미션', '설정화'];

/* ---------- TRPG 백업 (4.3) ---------- */
export interface TrpgLog {
  /** 소속 섹션 (v2.0) — 여러 개로 만들었을 때. 없으면 기본 섹션 */
  secId?: string;
  id: string;
  no: number;                // 내부 순번 (정렬용 — 자동 부여)
  noText?: string;           // № 자리 표시 텍스트 (선택 — 비우면 자동 № 0XX)
  slug?: string;             // 주소 이름 (선택 — 비우면 번호: /report/003) (v2.0, lib/logPath.ts)
  title: string;             // 시나리오 타이틀 (필수)
  catchphrase?: string;      // 캐치프레이즈 한 줄 (선택)
  writer: string;            // 라이터 (필수)
  withText: string;          // 같이 간 사람 표기 (필수)
  relId?: string;            // 자관 연동 (필터)
  catId?: string;            // EVEDEN 카테고리 (v2.0 사용자 요청 — lib/boardCats.ts)
  date?: string;             // 선택
  ph: string;
  thumbUrl?: string;
  thumbId?: string;          // 업로드 썸네일 (IndexedDB)
  thumbCrop?: CropValue;     // 썸네일 크롭 좌표 (6.1)
  thumbColor?: { c1: string; c2?: string }; // 이미지 없을 때 단색/그라데이션
  serifTitle?: boolean;      // 타이틀 폰트 개별 지정 예시 (폰트 라이브러리는 후속)
  visibility: Visibility;
  /** 열람 비밀번호 (선택) — 권한이 없어도 비밀번호로 열람 가능.
   *  **Firebase에서는 더 이상 여기 적지 않는다** (누구나 받는 목록 문서라 F12로 보였다) — 서버가 대조하고
   *  여기엔 pwLock만 남는다(lib/logLock.ts). 옛 글에 남은 값은 관리자가 접속하면 서버 쪽으로 옮겨진다 */
  password?: string;
  pwLock?: boolean;          // 서버가 대조하는 열람 비밀번호가 걸려 있다 (v2.0 보안 점검)
  // 목록 표시 여부 (v2.0 사용자 요청) — 접근권한(누가 열 수 있는지)과는 별개로, 목록에 줄이 뜰지만 정하는
  // 스위치. 나만보기(private)여도 이걸 켜지 않으면 관리자 목록에서 사라지지 않는다 — 반대로 이걸 켜면
  // 전체공개여도 목록에서만 빠지고 직접 링크로는 그대로 열린다. 관리자는 편집모드에서 숨김 표시로 계속 본다
  listHidden?: boolean;
  /** 저장 규칙 판수 (v2.0) — 잠긴 메뉴의 목록을 열어 두는 규칙이 생겨 옛 문서를 한 번 다시 저장할 때 쓴다 */
  lv?: number;
  // (구버전 호환, v2.0) — 예전엔 본문이 이 문서에 그대로 있었다. 서버 모드에서 목록 문서는
  // listHidden으로 질의 단계부터 공개될 수 있어(metaOf), 본문처럼 민감한 내용을 같이 두면 새어 나간다
  // (list 권한이 있으면 같은 문서의 get도 함께 열리는 Firestore/RLS 특성 — 나만보기+목록표시가 이래서
  // 처음엔 안전하게 동작하지 않았다). 그래서 새 로그부터는 본문을 TrpgLogBody로 분리 저장하고,
  // 이 필드들은 아직 옮겨지지 않은 옛 로그를 읽을 때만 fallback으로 남겨 둔다 — 그런 로그를 한 번이라도
  // 수정해 저장하면 자동으로 분리되고 이 필드들은 비워진다.
  body?: string;
  bodyId?: string;
  bodyHtml?: boolean;
  originalFileId?: string;
  originalName?: string;
}

/** TRPG 로그 본문 — 목록 문서(TrpgLog)와 분리 저장 (v2.0, 위 주석 참조).
 *  id는 로그와 같은 값을 쓴다. visibility는 로그의 실제 열람 권한을 그대로 복사해 이 문서 자체의
 *  질의 조건으로 삼는다 — 목록 노출(listHidden)과 완전히 무관하게, 이 문서만 따로 보호된다. */
export interface TrpgLogBody {
  id: string;
  body: string;
  bodyId?: string;
  bodyHtml?: boolean;
  /** 사이트 에디터(RichEditor)로 쓴 본문 (v2.0 사용자 요청) — 로그 파일처럼 틀 안(iframe)에 띄우지 않고
   *  다른 게시판 글처럼 페이지 안에 바로 그린다(사이트 글꼴·색을 따라가 어두운 디자인에서도 읽힌다) */
  bodyRich?: boolean;
  originalFileId?: string;
  originalName?: string;
  visibility: Visibility;
  /** 어느 로그 백업 소속인지 (v2.0) — 목록 문서와 따로 저장되므로 소속도 따로 들고 있어야
   *  「메뉴가 비공개면 글도 비공개로」 판정이 본문 문서에도 걸린다. 없으면 기본 섹션. */
  secId?: string;
  /** 글 비밀번호가 걸려 있다 — 저장할 때 이 문서를 `locked`(잠금키 trpglog.{id})로 둔다 (lib/visFloor.ts) */
  pwLock?: boolean;
}

/** 본문 문서에 적을 열람 권한 — 비밀번호가 걸려 있으면 바닥값(public)으로 두고, 실제 잠금은
 *  저장 단계(visFloorOf → locked)가 건다. 비밀번호를 아는 방문자는 등급과 무관하게 열 수 있어야 하므로.
 *  (옛 방식 password는 서버 대조가 안 되는 저장소에서만 쓰인다 — 그때는 예전처럼 공개) */
export const bodyVisibility = (l: { visibility: Visibility; password?: string; pwLock?: boolean }): Visibility =>
  l.password || l.pwLock ? 'public' : l.visibility;

/** 본문 문서를 글 비밀번호로 잠글지 — 전체공개 글은 예전부터 비밀번호 없이 열렸다(비밀번호는 멤버공개·나만보기
 *  글을 권한 없는 사람에게 열어 주는 열쇠). 그래서 전체공개면 잠그지 않는다 */
export const bodyPwLock = (l: { visibility: Visibility; pwLock?: boolean }): boolean =>
  !!l.pwLock && l.visibility !== 'public';

export const TRPG_BODY_SEED: TrpgLogBody[] = [];

/** № 자리 표시 — 직접 입력한 텍스트가 있으면 그대로, 없으면 자동 № 0XX */
export const logNo = (l: TrpgLog) => l.noText || `№ ${String(l.no).padStart(3, '0')}`;

/** 본문이 HTML 문서인지 자동 판별 (4.3 — 확장자와 무관하게 내용 기준).
 *  직접 쓴 글에 태그처럼 보이는 문자가 섞이면 오판할 수 있으므로, 로그에 `bodyHtml`이
 *  지정돼 있으면 그 값이 우선한다(수정 화면의 「본문 표시」에서 지정). */
export const isHtmlBody = (s: string) => /<\s*(html|body|div|p|span|table|br|style|font)[^>]*>/i.test(s);

/** 이 로그를 HTML로 그릴지 — 지정값이 있으면 그대로, 없으면 내용으로 판별 */
export const showAsHtml = (l: { bodyHtml?: boolean }, body: string) => l.bodyHtml ?? isHtmlBody(body);

/** 로그 파일 인코딩 자동 판별 — UTF-8 우선, 깨짐 문자가 많으면 EUC-KR 재시도 (구형 로그 툴 대응) */
/** 글자만 있는 본문을 에디터로 옮길 때 — 줄바꿈을 문단으로 (꺾쇠는 글자로 남게 이스케이프) */
export const textToEditorHtml = (t: string) => t.split(/\n{2,}/)
  .map(par => `<p>${par.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>`).join('');

export async function decodeLogText(f: File): Promise<string> {
  const buf = await f.arrayBuffer();
  const utf8 = new TextDecoder('utf-8').decode(buf);
  const bad = (utf8.match(/�/g) || []).length;
  if (bad > 2) {
    try { return new TextDecoder('euc-kr').decode(buf); } catch { return utf8; }
  }
  return utf8;
}

/**
 * 로그 본문 저장 위치 결정.
 *
 * 서버 모드에서 본문을 Storage에 파일로 올리면, 다시 읽을 때 fetch가 필요해
 * **버킷 CORS 설정을 해야만** 본문이 보인다(설정 전에는 빈 본문처럼 보인다).
 * 본문은 텍스트라 문서에 그대로 담는 편이 안전하다 — 다만 Firestore 문서 상한이 1MB라
 * 아주 큰 로그만 파일로 보관한다(그 경우에는 CORS 설정이 필요하다).
 */
export async function saveLogBody(text: string): Promise<{ body: string; bodyId?: string }> {
  if (!text) return { body: '' };
  const { isServerMode } = await import('./backend');
  const { putBlob, liftInlineImages } = await import('./blobStore');
  // 본문에 글자로 박힌 사진은 먼저 파일로 빼낸다 — 사진 때문에 본문이 수 MB가 되는 일이 많다
  text = await liftInlineImages(text);
  const bytes = new TextEncoder().encode(text).length;
  if (isServerMode() && bytes < 700_000) return { body: text };
  return { body: '', bodyId: await putBlob(new Blob([text], { type: 'text/plain' })) };
}

/* ---------- TRPG 도토리 (4.15) — 시나리오 위시리스트 ---------- */
export type DotoriStatus = 'pledge' | 'undecided' | 'confirmed' | 'done';
export const DOTORI_STATUS_LABEL: Record<DotoriStatus, string> = {
  pledge: '공수표', undecided: '일정 미정', confirmed: '일정 확정', done: '완',
};

/* ---------- TRPG 설정 (환경설정 > TRPG 탭, v1.9) — 상태 카테고리 라벨 + 뱃지 색 ---------- */
export interface DotoriStatusStyle { label: string; bg: string; border: string; fg: string }
export interface TrpgSettings {
  statuses: Record<DotoriStatus, DotoriStatusStyle>;
}
export const DEFAULT_TRPG_SETTINGS: TrpgSettings = {
  statuses: {
    // 기존 하드코딩 뱃지 색 계승 (pledge: 반투명 잉크 → hex 근사 / confirmed: 포인트 레드)
    pledge: { label: '공수표', bg: '#23262b', border: '#b9bdc4', fg: '#ffffff' },
    undecided: { label: '일정 미정', bg: '#7a8089', border: '#7a8089', fg: '#ffffff' },
    confirmed: { label: '일정 확정', bg: '#a63a45', border: '#a63a45', fg: '#ffffff' },
    done: { label: '완', bg: '#3c434d', border: '#3c434d', fg: '#ffffff' },
  },
};

// 일정미정이 공수표보다 먼저 오게 (v2.0 사용자 요청)
export const DOTORI_STATUS_KEYS: DotoriStatus[] = ['undecided', 'pledge', 'confirmed', 'done'];

/** 도토리 상태 뱃지 스타일 (카드 우상단 — 공수표/일정 확정만 표시) */
export function dotoriBadgeStyle(st: DotoriStatusStyle): CSSProperties {
  return { background: st.bg, border: `1px solid ${st.border}`, color: st.fg };
}

const TRPG_SET_KEY = 'ohome.trpgset.v1';

export function useTrpgSettings(): [TrpgSettings, (patch: Partial<TrpgSettings>) => void, boolean] {
  const [st, setSt] = useState<TrpgSettings>(DEFAULT_TRPG_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = getRawSetting(TRPG_SET_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<TrpgSettings>;
        setSt({ statuses: { ...DEFAULT_TRPG_SETTINGS.statuses, ...(p.statuses ?? {}) } });
      }
    } catch { /* 기본값 */ }
    setLoaded(true);
  }, []);
  const patch = useCallback((p: Partial<TrpgSettings>) => {
    setSt(s => {
      const n = { ...s, ...p };
      try { setSetting(TRPG_SET_KEY, n); } catch { /* 무시 */ }
      return n;
    });
  }, []);
  return [st, patch, loaded];
}

export interface DotoriItem {
  /** 소속 섹션 (v2.0) — 여러 개로 만들었을 때. 없으면 기본 섹션 */
  secId?: string;
  id: string;
  name: string;              // 시나리오 이름 (필수)
  writer: string;            // 라이터
  rule: string;              // 룰(시스템)
  people: string;            // 인원 표기
  tags: string[];            // 태그 (복수)
  link?: string;             // 판매처/소개 페이지
  status: DotoriStatus;      // 카드에서 바로 전환
  imgId?: string;            // 16:9 이미지 (IndexedDB)
  thumbCrop?: CropValue;
  ph: string;                // 이미지 없을 때 플레이스홀더
  date: string;              // 등록일 ISO (정렬용)
}

export const DOTORI_SEED: DotoriItem[] = [];

/* ---------- TRPG 플레이기록 (4.16) — 표 형식 ---------- */
export interface PlayRecord {
  /** 소속 섹션 (v2.0) — 여러 개로 만들었을 때. 없으면 기본 섹션 */
  secId?: string;
  id: string;
  date?: string;             // Date (optional — 비우면 표 맨 아래)
  scenario: string;          // Scenario (필수)
  scenarioLink?: string;     // 시나리오 링크 — 표에서 이름 클릭 시 새 탭
  writer: string;
  withText: string;          // With
  role: string;              // PL·GM·HO1 등 짧은 표기
  playtime: string;          // 4h 30m 등 자유 표기
  url?: string;              // Url (optional) — 클립 아이콘, 새 탭
  logId?: string;            // 내 홈 로그 백업 연결 (모바일: Playtime 밑줄)
}

export const PLAYLOG_SEED: PlayRecord[] = [];

export const TRPG_SEED: TrpgLog[] = [];
