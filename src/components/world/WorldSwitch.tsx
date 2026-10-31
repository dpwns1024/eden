'use client';
/** 세계 전환 버튼 (lib/worldStore.ts) — 머리의 로그인 버튼 왼쪽 (TopBar가 로그인 영역과 함께 그린다).
 *  예전엔 화면 왼쪽 아래에 떠 있어 꼬리말을 가렸다 (v2.0 사용자 요청). 누른 쪽 세계로 사이트 전체(디자인 · 목록)가 바뀐다 */
import React from 'react';
import { WORLDS, setWorld, useWorld } from '@/lib/worldStore';

export function WorldSwitch() {
  const { world, loaded } = useWorld();
  if (!loaded) return null;   // 고른 세계를 읽기 전엔 그리지 않는다 (EVEDEN이 잠깐 켜져 보이는 깜빡임 방지)
  return (
    <div className={`world-switch ws-${world}`} role="group" aria-label="홈 전환">
      {WORLDS.map(w => (
        <button key={w.key} type="button" className={w.key === world ? 'on' : ''}
          aria-pressed={w.key === world} onClick={() => setWorld(w.key)}>{w.label}</button>
      ))}
    </div>
  );
}
