'use client';
/**
 * 기밀 처리 (v2.0 사용자 요청) — 관리자만 열 수 있고, 다른 사람(회원 포함)에게는 목록에 카드만 보이며
 * 누르거나 주소로 들어오면 붉은 「접근 권한 없음」 창이 뜬다.
 *
 * 보안: 기밀 캐릭터·자관은 공개범위가 「나만보기」(private)로 저장되므로 서버 규칙이 관리자 외엔
 * 문서 자체를 내주지 않는다(F12로도 못 본다). 목록 카드에 필요한 최소 정보(이름·색·대표 그림·위치)만
 * 관리자 화면이 공개 설정(ohome.classified.v1)에 따로 적어 두고, 방문자 목록은 그걸로 카드를 그린다.
 */
import { useEffect, useState } from 'react';
import type { CropValue } from '@/components/ui/CropEditor';
import { getSetting, onSettingChange, setSetting } from './settingStore';

export const CLASSIFIED_KEY = 'ohome.classified.v1';

/** 목록 카드에 필요한 것만 — 본문 · 프로필 · 탭 · 기록은 담지 않는다 */
export interface ClassifiedStub {
  id: string;
  slug?: string;
  secId?: string;
  name: string;
  color?: string;
  img?: string;          // 카드 그림 (리스트 썸네일 / 배너)
  crop?: CropValue;
  cropM?: CropValue;     // 모바일 배너 위치 (자관)
  thumb?: string;        // 자관 카드형 썸네일
  thumbCrop?: CropValue;
  ph?: string;           // 그림 없을 때 자리표시 클래스
  members?: { name: string; color: string }[];   // 자관 멤버 표시
  cp?: string;           // 자관 CP 표시
  after: string | null;  // 목록에서 바로 앞(기밀이 아닌) 항목 id — 방문자 목록에서 같은 자리에 끼운다
}
export interface ClassifiedState { chars: ClassifiedStub[]; rels: ClassifiedStub[] }
const EMPTY: ClassifiedState = { chars: [], rels: [] };

export function readClassified(): ClassifiedState {
  const v = getSetting<ClassifiedState>(CLASSIFIED_KEY, EMPTY);
  return { chars: Array.isArray(v?.chars) ? v.chars : [], rels: Array.isArray(v?.rels) ? v.rels : [] };
}

export function useClassified(): ClassifiedState {
  const [s, setS] = useState<ClassifiedState>(EMPTY);
  useEffect(() => {
    setS(readClassified());
    return onSettingChange(k => { if (k === CLASSIFIED_KEY) setS(readClassified()); });
  }, []);
  return s;
}

/** 관리자 화면에서 — 바뀌었을 때만 저장 */
export function saveClassified(kind: keyof ClassifiedState, stubs: ClassifiedStub[]): void {
  const cur = readClassified();
  if (JSON.stringify(cur[kind]) === JSON.stringify(stubs)) return;
  setSetting(CLASSIFIED_KEY, { ...cur, [kind]: stubs });
}

/** 기밀 카드의 바로 앞 항목 id — 기밀/나만보기는 방문자 목록에 없으니 건너뛴다 */
export function afterOf<T extends { id: string; visibility: string }>(all: T[], i: number): string | null {
  for (let k = i - 1; k >= 0; k--) if (all[k].visibility !== 'private') return all[k].id;
  return null;
}

/** 방문자 목록에 기밀 카드를 원래 자리에 끼운다 */
export function mergeStubs<T extends { id: string }>(shown: T[], stubs: ClassifiedStub[]): (T | ClassifiedStub & { stub: true })[] {
  const out: (T | ClassifiedStub & { stub: true })[] = [...shown];
  for (const s of stubs) {
    const row = { ...s, stub: true as const };
    if (s.after == null) {
      let at = 0;
      while (at < out.length && isStub(out[at]) && (out[at] as ClassifiedStub).after == null) at++;
      out.splice(at, 0, row); continue;
    }
    let at = out.findIndex(x => x.id === s.after);
    if (at < 0) { out.push(row); continue; }
    // 같은 자리에 기밀이 여럿이면 원래 순서대로 이어 붙인다
    while (at + 1 < out.length && isStub(out[at + 1]) && (out[at + 1] as ClassifiedStub).after === s.after) at++;
    out.splice(at + 1, 0, row);
  }
  return out;
}

export const isStub = (x: unknown): x is ClassifiedStub & { stub: true } =>
  !!x && typeof x === 'object' && (x as { stub?: boolean }).stub === true;

/** 주소의 id/별명이 기밀 항목인가 */
export const findStub = (stubs: ClassifiedStub[], key: string) =>
  stubs.find(s => s.id === key || (s.slug && s.slug === key));
