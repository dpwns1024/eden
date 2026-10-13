'use client';
/**
 * 탭 문서 페이지 (v2.0 사용자 요청 — ARCH 소개 페이지를 「개요 · 분류 · 요원 · 맵」 탭으로).
 *
 * HTML 페이지(`/page`)는 디자인을 전부 HTML이 정해서, 글 한 줄 고치려 해도 코드를 만져야 했다.
 * 탭 문서는 같은 모양(ARCH 소개 HTML의 클래스 — .arx .ar-*)을 그대로 쓰되 내용을 **칸별 데이터**로 들고,
 * 관리자가 페이지에서 바로 고친다 (components/archdoc/ArchDocView.tsx).
 *
 * 저장은 사이트 설정 한 칸(섹션 id → 문서). 아직 저장된 문서가 없고 그 섹션의 HTML이 ARCH 소개
 * 모양(.ar-sec)이면 HTML을 읽어 문서로 바꿔 보여 준다(htmlToArchDoc) — 다시 입력할 필요 없이 바로 탭이 된다.
 * 처음 고쳐 저장하는 순간부터 문서가 따로 저장되고, 원래 HTML은 지우지 않고 남겨 둔다(되돌리기용).
 */
import { useCallback, useEffect, useState } from 'react';
import { getSetting, setSetting, onSettingChange } from './settingStore';
import { newId } from './postStore';
import { cloneAegisNodes, upgradeAegisNodes } from './aegisMap';
import type { ArchMapNode } from './aegisMap';

export const ARCH_DOC_KEY = 'ohome.archdoc.v1';

export interface ArchFact { k: string; v: string; bad?: boolean }
export interface ArchCard {
  id: string;
  kL: string; kR: string;              // 위 작은 글씨 (왼쪽 · 오른쪽)
  title: string; sub: string;          // 은빛 큰 제목 · 아래 한글
  body: string;                        // 본문 (HTML — 에디터)
  radar?: { label: string; trace: string } | null;   // 오른쪽 레이더 (본부 카드)
  quote?: { label: string; text: string } | null;    // 인용 띠
  facts: ArchFact[];                   // 아래 2열 정보
}
export interface ArchMoreRow { k: string; v: string }
/** 분류 카드 오른쪽 위 「상세」 버튼 — 누르면 작은 창에 항목별 설명 */
export interface ArchMore { label: string; title: string; rows: ArchMoreRow[] }
export interface ArchRank {
  id: string;
  key: string;                         // 버튼 글자 (SS · S · A-B · C · H)
  en: string; name: string; alias: string;   // 영문 이름 · 한글 이름 · 별칭('원소의 군주')
  grade: string;                       // 오른쪽 위 작은 글씨 (비우면 없음)
  /** 카드 위 「RANK · 」 뒤 글씨 — 비우면 버튼 글자 (하모니처럼 버튼은 H, 등급은 S-C일 때) */
  tag?: string;
  body: string;
  /** 버튼 앞에 구분선 — 직급이 아닌 부서(하모니)처럼 따로 묶을 때 */
  apart?: boolean;
}
export interface ArchRanks { caption: string; items: ArchRank[] }
export interface ArchClass {
  id: string;
  icon: string;                        // 미리 만든 아이콘 키(ICONS) · 'none' · 또는 'svg:<svg…>'
  title: string; sub: string; body: string; letter: string;
  /** 상세 버튼. undefined = 손댄 적 없음(기본값이 있으면 그것), null = 관리자가 뺐음 */
  more?: ArchMore | null;
}
export type ArchBlock =
  | { id: string; type: 'head'; num: string; title: string; sub: string; doc: string }
  | { id: string; type: 'cards'; cards: ArchCard[] }
  | { id: string; type: 'classes'; items: ArchClass[]; grade?: { letters: string[]; on: number; caption: string } | null;
      /** 직급 체계 — 등급 띠와 같은 모양의 버튼 줄, 누르면 아래 설명. undefined = 손댄 적 없음(기본값), null = 뺐음 */
      ranks?: ArchRanks | null }
  | { id: string; type: 'text'; html: string }
  | { id: string; type: 'image'; src: string; caption: string }
  /** 아이기스 단면 지도 (MAP 탭) — 그림은 코드, 시설 설명은 nodes */
  | { id: string; type: 'map'; caption: string; nodes: ArchMapNode[] }
  | { id: string; type: 'html'; html: string };
export interface ArchTab { id: string; label: string; blocks: ArchBlock[] }
export interface ArchDoc {
  title: string;
  doc: string;                         // 제목 오른쪽 아래 작은 문서 번호 (줄바꿈 가능)
  tabs: ArchTab[];
  /** true면 탭 문서를 쓰지 않고 원래 HTML 페이지로 (관리자가 되돌린 경우) */
  useHtml?: boolean;
  /** 문서 형식 판 — 이보다 낮으면 migrateDoc이 고친다 */
  rev?: number;
}

/** 분류 카드 아이콘 — ARCH 소개 HTML에 있던 것과 같은 그림 */
export const ICONS: Record<string, { label: string; svg: string }> = {
  // 센티넬 — 원소 고리: 여섯 조각(6원소) 중 한 조각만 빛나고, 가운데 네 갈래 섬광은 갑작스러운 각성 (v2.0 사용자 선택 S3)
  sentinel: { label: '센티넬 (원소 고리 · 섬광)', svg: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1"><circle cx="20" cy="20" r="15" stroke-dasharray="12.71 3" transform="rotate(-84 20 20)" stroke-opacity=".6"/><path d="M21.57 5.08A15 15 0 0 1 32.22 11.3" stroke-width="2.2"/><path d="M20 11.5 21.8 18.2 28.5 20 21.8 21.8 20 28.5 18.2 21.8 11.5 20 18.2 18.2Z" stroke-width="1.1"/><circle cx="20" cy="20" r="1.3" fill="currentColor" stroke="none"/></svg>' },
  // 가이드 — 같은 고리, 빛나는 조각은 센티넬의 정반대 자리. 작게 줄인 섬광을 네 꺾쇠가 붙잡는다(안정) (v2.0 사용자 선택 GB)
  guide: { label: '가이드 (원소 고리 · 꺾쇠)', svg: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1"><circle cx="20" cy="20" r="15" stroke-dasharray="12.71 3" transform="rotate(-84 20 20)" stroke-opacity=".6"/><path d="M18.43 34.92A15 15 0 0 1 7.78 28.7" stroke-width="2.2"/><path d="M12.5 16V12.5H16M27.5 16V12.5H24M12.5 24V27.5H16M27.5 24V27.5H24" stroke-width="1.1"/><path d="M20 15.2 21 19 24.8 20 21 21 20 24.8 19 21 15.2 20 19 19Z" fill="currentColor" stroke="none"/></svg>' },
  hexarrow: { label: '육각 화살 (예전 센티넬)', svg: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1"><path d="M20 3 34 11v18L20 37 6 29V11Z"/><path d="M20 10v20M13 16l7-6 7 6" stroke-width="1.2"/><circle cx="20" cy="20" r="3" fill="currentColor" stroke="none"/></svg>' },
  target: { label: '조준 원 (예전 가이드)', svg: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1"><circle cx="20" cy="20" r="16"/><circle cx="20" cy="20" r="9" stroke-dasharray="2 2.5"/><path d="M20 4v6M20 30v6M4 20h6M30 20h6"/><circle cx="20" cy="20" r="2.4" fill="currentColor" stroke="none"/></svg>' },
  bond: { label: '결속 (두 원)', svg: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1"><circle cx="12" cy="20" r="8"/><circle cx="28" cy="20" r="8"/><path d="M4 20h32" stroke-dasharray="1.5 2.5"/></svg>' },
  diamond: { label: '마름모', svg: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1"><path d="M20 4 36 20 20 36 4 20Z"/><path d="M20 12 28 20 20 28 12 20Z" stroke-dasharray="2 2"/></svg>' },
  shield: { label: '방패', svg: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1"><path d="M20 4 33 9v10c0 9-6 14-13 17C13 33 7 28 7 19V9Z"/><path d="M20 11v18M14 18h12" stroke-width="1.2"/></svg>' },
};
/** 그림 비교용 — 공백 무시, `<path …></path>`(HTML로 읽으면 이렇게 나온다)와 `<path …/>`를 같게 */
const svgKey = (s: string) => s.replace(/\s+/g, '').replace(/><\/(path|circle|line|rect|polygon|polyline|ellipse)>/g, '/>').toLowerCase();
/** ARCH 소개 HTML에 있던 예전 센티넬·가이드 그림 → 지금의 센티넬·가이드 마크 키 */
const legacyKey = (raw: string): string | null => {
  const k = svgKey(raw);
  if (k === svgKey(ICONS.hexarrow.svg)) return 'sentinel';
  if (k === svgKey(ICONS.target.svg)) return 'guide';
  return null;
};
/** 아이콘 값 → 미리 만든 아이콘 키. 예전 그림이 그대로(svg:…) 저장된 것도 센티넬·가이드로 알아본다 */
export const iconKeyOf = (icon: string): string =>
  (icon.startsWith('svg:') ? (legacyKey(icon.slice(4)) ?? icon) : icon);
export const iconSvg = (icon: string): string => {
  if (!icon.startsWith('svg:')) return ICONS[icon]?.svg ?? '';
  // 예전 그림이 그대로 저장된 문서도 새 마크로 보여 준다
  const lk = legacyKey(icon.slice(4));
  return lk ? ICONS[lk].svg : icon.slice(4);
};

/** 가이드 카드의 기본 상세 — 「가이딩」 규약 (v2.0 사용자 요청). 관리자가 고치거나 빼면 그 값이 우선 */
export const GUIDE_MORE: ArchMore = {
  label: '가이딩(Guiding) 상세 규약',
  title: "'가이딩(Guiding)' 상세 규약",
  rows: [
    { k: '방식', v: "가이딩은 가이드와의 '신체 접촉'을 통해 이루어집니다." },
    { k: '효율', v: '가벼운 접촉도 가능하지만, 스킨십의 농도가 깊어질수록 효과가 극대화됩니다. 이 설정 때문에 센티넬과 가이드의 관계는 필연적으로 깊고 애틋해질 수밖에 없습니다.' },
    { k: '쾌락', v: "가이딩을 받을 때 센티넬이 느끼는 안정감과 쾌락은 '극상'이라고 표현될 정도로 강렬합니다. 이는 두 사람의 관계를 더욱 특별하게 만드는 장치입니다." },
    { k: '속성 버프', v: '가이드가 부여하는 속성 버프는 스킨십의 정도에 따라 그 효과가 결정됩니다. 파트너와의 접촉이 깊고 길어질수록 버프의 강도와 지속 시간이 함께 증가합니다.' },
  ],
};
/** 이 분류 카드의 상세 버튼 — 손댄 적 없는 가이드 카드는 기본 규약 */
export const moreOf = (it: ArchClass): ArchMore | null =>
  // 처음 탭 문서를 저장할 때 아이콘이 그림 그대로(svg:…) 저장된 문서가 있다(v2.0 사용자 제보 — 버튼이 안 보였다)
  it.more !== undefined ? it.more : (iconKeyOf(it.icon) === 'guide' ? GUIDE_MORE : null);

/** 직급 체계 기본값 (v2.0 사용자 요청) — ARCH 분류 블록(센티넬·가이드 카드 + 등급 띠)에 손대지 않았으면 이걸 보여 준다 */
export const DEFAULT_RANKS: ArchRanks = {
  caption: 'RANK SYSTEM · ARCH STANDARD',
  items: [
    { id: 'rk-ss', key: 'SS', en: 'ARCH PRIMA', name: '아크 프리마', alias: '원소의 군주', grade: '',
      body: '기관을 이끄는 간부들. 각 속성의 정점에 선 단 한 명의 존재 (총 6명).' },
    { id: 'rk-s', key: 'S', en: 'VANGUARD', name: '뱅가드', alias: '선봉대', grade: '',
      body: '최정예 베테랑 현장 리더.' },
    { id: 'rk-ab', key: 'A-B', en: 'AGENT', name: '에이전트', alias: '요원', grade: '',
      body: 'ARCH의 주력이 되는 실전 멤버.' },
    { id: 'rk-c', key: 'C', en: 'ACOLYTE', name: '애콜라이트', alias: '신입', grade: '',
      body: '훈련과 성장이 필요한 신입 요원.' },
    { id: 'rk-h', key: 'H', en: 'HARMONY', name: '하모니 부서', alias: '가이드 지원 · 관리', grade: '', tag: 'S-C', apart: true,
      body: "모든 가이드가 소속된 지원 및 관리 부서. 하모니 부서 안에서도 따로 C~S급이 나뉘며, 아크의 가이드는 '무속성'과 '속성 가이드'들로 나뉘어 있습니다. 속성 가이드는 가장 희귀한 포지션이기에 무조건 S급으로 배정받습니다." },
  ],
};
/** 이 분류 블록의 직급 체계 — 손대지 않은 ARCH 분류 블록(센티넬·가이드 카드가 있는)은 기본값 */
type ClassesBlock = Extract<ArchBlock, { type: 'classes' }>;
/** ARCH 분류 블록인가 — 센티넬·가이드 카드가 함께 있는 */
const isArchClasses = (b: ClassesBlock) => {
  const keys = b.items.map(it => iconKeyOf(it.icon));
  return keys.includes('sentinel') && keys.includes('guide');
};
export function ranksOf(b: ClassesBlock): ArchRanks | null {
  if (b.ranks !== undefined) return b.ranks;
  return isArchClasses(b) ? DEFAULT_RANKS : null;
}
/** 등급 띠(S A B C D) — 손대지 않은 ARCH 분류 블록에선 뺀다 (v2.0 사용자 요청 — 직급 체계가 대신한다).
 *  관리자가 직급 체계나 등급 띠를 한 번이라도 고치면 그때부터는 저장된 값대로 */
export function gradeOf(b: ClassesBlock): ClassesBlock['grade'] {
  return b.ranks === undefined && isArchClasses(b) ? null : (b.grade ?? null);
}
export const blankRank = (): ArchRank => ({ id: newId(), key: 'X', en: 'RANK', name: '', alias: '', grade: '', body: '' });

/* ── 저장된 문서 고치기 ── */
export const DOC_REV = 4;
const isMapTab = (t: ArchTab) => /^(맵|map)$/i.test(t.label.trim()) || t.blocks.some(b => b.type === 'head' && /^map$/i.test(b.title.trim()));
/**
 * 예전 판으로 저장된 문서를 지금 판으로 (한 번만 — 관리자가 열면 저장된다).
 *  rev 2 (v2.0 사용자 요청): ARCH 분류 블록의 S~D 등급 띠를 빼고, 직급 카드 오른쪽 위 글씨를 지우고,
 *  하모니(H)는 카드 위를 RANK · S-C로. 관리자가 고친 이름·설명 등 나머지는 그대로 둔다.
 *  rev 3 (v2.0 사용자 요청): MAP 탭에 아이기스 단면 지도 — 비어 있는 이미지 칸을 지도로 바꾸고, 없으면 끝에 붙인다.
 *  rev 4 (v2.0 사용자 요청): 지도가 섬 · 본부 · 숙소 세 장으로 — 예전 구역 글씨를 층으로, 새 시설(위치만)을 덧붙인다.
 */
export function migrateDoc(d: ArchDoc): ArchDoc {
  const rev = d.rev ?? 1;
  if (rev >= DOC_REV) return d;
  let tabs = d.tabs;
  if (rev < 2) {
    tabs = tabs.map(t => ({
      ...t,
      blocks: t.blocks.map(b => {
        if (b.type !== 'classes' || !isArchClasses(b)) return b;
        const ranks = b.ranks ? {
          ...b.ranks,
          items: b.ranks.items.map(r => ({ ...r, grade: '', tag: r.tag || (r.key === 'H' ? 'S-C' : undefined) })),
        } : b.ranks;
        return { ...b, grade: null, ranks };
      }),
    }));
  }
  if (rev < 3) {
    tabs = tabs.map(t => {
      if (!isMapTab(t) || t.blocks.some(b => b.type === 'map')) return t;
      const map = blankBlock('map');
      const at = t.blocks.findIndex(b => b.type === 'image' && !b.src);
      const blocks = at >= 0 ? t.blocks.map((b, i) => (i === at ? map : b)) : [...t.blocks, map];
      return { ...t, blocks };
    });
  }
  if (rev < 4) {
    tabs = tabs.map(t => ({ ...t, blocks: t.blocks.map(b => (b.type === 'map' ? { ...b, nodes: upgradeAegisNodes(b.nodes) } : b)) }));
  }
  return { ...d, tabs, rev: DOC_REV };
}

/* ── 저장 ── */
export function useArchDocs(): [Record<string, ArchDoc>, (id: string, doc: ArchDoc | null) => void, boolean] {
  const [map, setMap] = useState<Record<string, ArchDoc>>({});
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const read = () => {
      const v = getSetting<Record<string, ArchDoc>>(ARCH_DOC_KEY, {});
      setMap(v && typeof v === 'object' ? v : {});
    };
    read(); setLoaded(true);
    return onSettingChange(k => { if (k === ARCH_DOC_KEY) read(); });
  }, []);
  const save = useCallback((id: string, doc: ArchDoc | null) => {
    const cur = getSetting<Record<string, ArchDoc>>(ARCH_DOC_KEY, {});
    const next = { ...(cur && typeof cur === 'object' ? cur : {}) };
    if (doc) next[id] = doc; else delete next[id];
    setMap(next);
    setSetting(ARCH_DOC_KEY, next);
  }, []);
  return [map, save, loaded];
}

/* ── 빈 칸 만들기 ── */
export const blankCard = (): ArchCard => ({ id: newId(), kL: 'SECTION', kR: '', title: 'TITLE', sub: '', body: '', radar: null, quote: null, facts: [] });
export const blankClass = (): ArchClass => ({ id: newId(), icon: 'diamond', title: 'NAME', sub: '', body: '', letter: '' });
export function blankBlock(type: ArchBlock['type'], num = ''): ArchBlock {
  const id = newId();
  switch (type) {
    case 'head': return { id, type, num, title: 'SECTION', sub: '', doc: '' };
    case 'cards': return { id, type, cards: [blankCard()] };
    case 'classes': return { id, type, items: [blankClass()], grade: null };
    case 'text': return { id, type, html: '' };
    case 'image': return { id, type, src: '', caption: '' };
    case 'map': return { id, type, caption: '', nodes: cloneAegisNodes() };
    default: return { id, type: 'html', html: '' };
  }
}
export const BLOCK_LABEL: Record<ArchBlock['type'], string> = {
  head: '섹션 제목', cards: '정보 카드', classes: '분류 카드', text: '글', image: '이미지', map: '지도', html: 'HTML',
};

/* ── ARCH 소개 HTML → 탭 문서 ── */
const txt = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
/** 제목 안의 작은 글씨를 뺀 글자만 */
const ownText = (el: Element | null | undefined) => {
  if (!el) return '';
  const c = el.cloneNode(true) as Element;
  c.querySelectorAll('small').forEach(s => s.remove());
  return txt(c);
};

function iconOf(svg: SVGElement | null): string {
  if (!svg) return 'none';
  const raw = svg.outerHTML;
  const legacy = legacyKey(raw);
  if (legacy) return legacy;
  const hit = Object.entries(ICONS).find(([, v]) => svgKey(v.svg) === svgKey(raw));
  return hit ? hit[0] : `svg:${raw}`;
}

function parseCard(a: Element): ArchCard {
  const ks = a.querySelectorAll('.ar-c-k > span');
  const h3 = a.querySelector('h3');
  const radar = a.querySelector('.ar-radar');
  const quote = a.querySelector('.ar-quote');
  let quoteText = '';
  if (quote) {
    const q = quote.cloneNode(true) as Element;
    q.querySelectorAll('small').forEach(s => s.remove());
    quoteText = txt(q);
  }
  return {
    id: newId(),
    kL: txt(ks[0]), kR: txt(ks[1]),
    title: ownText(h3), sub: txt(h3?.querySelector('small')),
    body: Array.from(a.querySelectorAll('p')).filter(p => !p.closest('.ar-quote')).map(p => p.outerHTML).join(''),
    radar: radar ? { label: txt(radar.querySelector('span')), trace: txt(radar.querySelector('em')) } : null,
    quote: quote ? { label: txt(quote.querySelector('small')), text: quoteText } : null,
    facts: Array.from(a.querySelectorAll('.ar-facts > div')).map(d => ({
      k: txt(d.querySelector('small')), v: txt(d.querySelector('b')), ...(d.querySelector('b.bad') ? { bad: true } : {}),
    })),
  };
}

/**
 * ARCH 소개 HTML을 탭 문서로 — `.ar-sec` 모양이 아니면 null.
 * 섹션 하나가 탭 하나다. 기관 카드(.ar-about)가 든 섹션은 「개요」, 분류 카드(.ar-cls)가 든 섹션은 「분류」,
 * 그 밖에는 섹션의 한글 부제를 탭 이름으로. ARCH 소개 모양이면 「요원 · 맵」 빈 탭을 뒤에 붙인다.
 * 알아보지 못한 덩어리는 HTML 칸으로 그대로 옮겨 아무것도 잃지 않는다.
 */
export function htmlToArchDoc(html: string): ArchDoc | null {
  if (typeof window === 'undefined' || !/class="[^"]*\bar-sec\b/.test(html)) return null;
  const dom = new DOMParser().parseFromString(html, 'text/html');
  const secs = Array.from(dom.querySelectorAll('section.ar-sec'));
  if (!secs.length) return null;
  const pt = dom.querySelector('.ar-ptitle');
  const docLines = pt?.querySelector('.doc')?.innerHTML.split(/<br\s*\/?>/i).map(s => s.replace(/<[^>]+>/g, '').trim()).filter(Boolean) ?? [];
  const tabs: ArchTab[] = secs.map(sec => {
    const sh = sec.querySelector('.ar-sh');
    const blocks: ArchBlock[] = [];
    if (sh) {
      blocks.push({ id: newId(), type: 'head', num: txt(sh.querySelector('.ar-sn')),
        title: txt(sh.querySelector('div > b')), sub: txt(sh.querySelector('div > small')), doc: txt(sh.querySelector('em')) });
    }
    Array.from(sec.children).forEach(el => {
      if (el === sh) return;
      if (el.classList.contains('ar-about')) {
        blocks.push({ id: newId(), type: 'cards', cards: Array.from(el.querySelectorAll(':scope > .ar-card')).map(parseCard) });
      } else if (el.classList.contains('ar-cls')) {
        blocks.push({ id: newId(), type: 'classes', grade: null,
          items: Array.from(el.querySelectorAll(':scope > .ar-cl')).map(c => ({
            id: newId(), icon: iconOf(c.querySelector('svg')), title: txt(c.querySelector('b')),
            sub: txt(c.querySelector('small')), body: txt(c.querySelector('p')), letter: txt(c.querySelector('.bg')),
          })) });
      } else if (el.classList.contains('ar-grade')) {
        const last = blocks[blocks.length - 1];
        const spans = Array.from(el.querySelectorAll('span'));
        const g = { letters: spans.map(s => txt(s)), on: Math.max(0, spans.findIndex(s => s.classList.contains('s'))),
          caption: Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent ?? '').join(' ').replace(/\s+/g, ' ').trim() };
        if (last?.type === 'classes') last.grade = g;
        else blocks.push({ id: newId(), type: 'classes', items: [], grade: g });
      } else if (el.classList.contains('ar-card')) {
        blocks.push({ id: newId(), type: 'cards', cards: [parseCard(el)] });
      } else {
        blocks.push({ id: newId(), type: 'html', html: el.outerHTML });
      }
    });
    const label = sec.querySelector('.ar-about') ? '개요'
      : sec.querySelector('.ar-cls') ? '분류'
      : (txt(sh?.querySelector('div > small')) || txt(sh?.querySelector('div > b')) || '탭');
    return { id: newId(), label, blocks };
  });
  if (dom.querySelector('.ar-about')) {
    const n = tabs.length;
    if (!tabs.some(t => t.label === '요원')) {
      tabs.push({ id: newId(), label: '요원', blocks: [
        { id: newId(), type: 'head', num: String(n + 1).padStart(2, '0'), title: 'AGENTS', sub: '요원 명부', doc: '' },
        { id: newId(), type: 'text', html: '' },
      ] });
    }
    if (!tabs.some(t => t.label === '맵')) {
      tabs.push({ id: newId(), label: '맵', blocks: [
        { id: newId(), type: 'head', num: String(tabs.length + 1).padStart(2, '0'), title: 'MAP', sub: '구역도', doc: '' },
        blankBlock('map'),
      ] });
    }
  }
  return { title: txt(pt?.querySelector('h1')) || 'ARCH', doc: docLines.join('\n'), tabs };
}

/** 새 탭 문서 (HTML이 ARCH 소개 모양이 아닐 때 관리자가 직접 시작) */
export const blankDoc = (title: string): ArchDoc => ({
  title, doc: '',
  tabs: [{ id: newId(), label: '개요', blocks: [blankBlock('head', '01'), blankBlock('text')] }],
});
