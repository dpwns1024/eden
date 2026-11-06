'use client';
/**
 * YJHM 메인 「필름」 1면에 관리자가 직접 고정하는 것들 — 설정 한 칸에 담는다 (서버 모드면 다른 설정과 같이 동기화).
 * 대표 그림(필름 첫 칸) · 필름에 실을 사진들 · 필름 보정 · 예준 한마디 · 스크랩(기사 오려 붙이기) · 방명록 말풍선.
 * 예전 「머리기사 01」 필드(kicker · title · html)는 그대로 둔다 (지금 화면은 title만 그림 설명으로 쓴다).
 */
import { useCallback, useEffect, useState } from 'react';
import { getRawSetting, setSetting } from './settingStore';
import type { CropValue } from '@/components/ui/CropEditor';

const KEY = 'ohome.yjhmfront.v1';

/** 필름 한 칸 (대표 그림 뒤로 이어지는 사진) */
export interface YjhmFrame {
  id: string;
  img?: string;      // blobStore 참조
  crop?: CropValue;
  href?: string;     // 누르면 갈 곳 (비우면 링크 없음)
  title?: string;    // 그림 설명 (화면에는 안 보이고 alt로)
}

/** 스크랩 — 기사를 오려 붙인 것처럼 관리자가 직접 적는다 */
export interface YjhmScrap {
  id: string;
  date: string;      // 2026.03.05 처럼 자유롭게
  source: string;    // 출처 (예: 스포츠일보 · 3면)
  title: string;     // 기사 제목
  body: string;      // 오려 낸 본문 몇 줄
  href?: string;     // 원문 링크 (선택)
}

/** 방명록 말풍선 — 메인에 실을 것을 관리자가 직접 적는다 */
export interface YjhmNote {
  id: string;
  who: string;
  text: string;
  date: string;
  me?: boolean;      // 남색 말풍선 (답장 쪽)
}

/** 필름 보정 — 필름 칸 사진에 씌우는 색 (가장자리 인쇄 이름도 같이 바뀐다) */
export type YjhmGrade = 'warm' | 'cool' | 'mono' | 'tungsten' | 'fade' | 'none';
export const YJHM_GRADES: { key: YjhmGrade; label: string; stock: string }[] = [
  { key: 'warm', label: '따뜻한 컬러', stock: 'COLOR 400' },
  { key: 'cool', label: '차가운 슬라이드', stock: 'CHROME 100' },
  { key: 'tungsten', label: '밤 텅스텐', stock: 'TUNGSTEN 800T' },
  { key: 'fade', label: '바랜 필름', stock: 'EXPIRED 200' },
  { key: 'mono', label: '흑백', stock: 'PANCHRO 400' },
  { key: 'none', label: '보정 없음', stock: 'SAFETY FILM' },
];
export const DEFAULT_GRADE: YjhmGrade = 'warm';

export interface YjhmFront {
  img?: string;     // 대표 그림 (blobStore 참조) — 필름 첫 칸
  crop?: CropValue; // 그림 위치
  kicker?: string;  // (예전 화면)
  title?: string;   // 대표 그림 설명
  html: string;     // (예전 화면)
  frames?: YjhmFrame[];          // 대표 그림 뒤로 이어지는 사진 — 비어 있으면 사진 있는 글이 자동으로 이어진다
  grade?: YjhmGrade;             // 필름 보정
  quote?: { who: string; text: string };   // 맨 아래 한마디
  scraps?: YjhmScrap[];
  notes?: YjhmNote[];            // 비어 있으면 방명록 최근 글
}

const EMPTY: YjhmFront = { html: '' };

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function useYjhmFront(): [YjhmFront, (next: YjhmFront) => void, boolean] {
  const [doc, setDoc] = useState<YjhmFront>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = getRawSetting(KEY);
      if (raw) setDoc({ ...EMPTY, ...JSON.parse(raw) });
    } catch { /* 기본값 */ }
    setLoaded(true);
  }, []);
  const save = useCallback((next: YjhmFront) => {
    setDoc(next);
    try { setSetting(KEY, next); } catch { /* 무시 */ }
  }, []);
  return [doc, save, loaded];
}
