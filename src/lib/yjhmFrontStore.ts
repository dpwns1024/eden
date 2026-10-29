'use client';
/**
 * YJHM 메인 머리기사 01 (v2.0 사용자 요청) — 새 글을 자동으로 올리지 않고 관리자가 정한 그림 · 제목 · 기사 본문을 고정해 싣는다.
 * 본문 하나뿐이라 introStore처럼 설정 한 칸에 담는다 (서버 모드면 다른 설정과 같이 동기화).
 */
import { useCallback, useEffect, useState } from 'react';
import { getRawSetting, setSetting } from './settingStore';

const KEY = 'ohome.yjhmfront.v1';

export interface YjhmFront {
  img?: string;     // 대표 그림 (blobStore 참조)
  kicker?: string;  // 그림 위 작은 딱지 (비우면 COVER STORY)
  title?: string;   // 그림 위 큰 제목 (비우면 페어 이름)
  html: string;     // 기사 본문 HTML
}

const EMPTY: YjhmFront = { html: '' };

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
