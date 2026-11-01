'use client';
/**
 * 인트로(소개) 페이지 (v2.0 사용자 요청) — **글 하나만 있는 페이지**.
 *
 * 목록도 댓글도 없이 본문 하나뿐이라, 글 테이블이 아니라 **설정 한 칸**에 담는다.
 * 그래서 DB 구조를 건드릴 일이 없고(포크 쓰는 사람이 SQL을 다시 실행하지 않아도 된다),
 * 다른 설정과 똑같이 서버에 동기화된다.
 */
import { useCallback, useEffect, useState } from 'react';
import { getRawSetting, setSetting, onSettingChange } from './settingStore';

const KEY = 'ohome.intro.v1';

export interface IntroDoc {
  /** 본문 HTML — 에디터로 쓰든 HTML로 직접 쓰든 저장 형태는 같다 */
  html: string;
  /** 어느 쪽으로 쓰고 있었는지 (v2.0 사용자 요청) — 다음에 열 때 그 모드로 연다.
   *  HTML로 짜 둔 글이 에디터로 열리면서 태그가 깎이는 일이 없게 하려는 것이다. */
  mode?: 'editor' | 'html';
}

const EMPTY: IntroDoc = { html: '', mode: 'editor' };

export function useIntro(): [IntroDoc, (next: IntroDoc) => void, boolean] {
  const [doc, setDoc] = useState<IntroDoc>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const read = () => {
      try {
        const raw = getRawSetting(KEY);
        setDoc(raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY);
      } catch { /* 기본값 */ }
    };
    read();
    setLoaded(true);
    // 보호 설정 — 로그인 · 비밀번호 통과 뒤 다시 받으면 내용이 달라진다 (lib/settingVault.ts)
    return onSettingChange(k => { if (k === KEY) read(); });
  }, []);
  const save = useCallback((next: IntroDoc) => {
    setDoc(next);
    try { setSetting(KEY, next); } catch { /* 무시 */ }
  }, []);
  return [doc, save, loaded];
}
