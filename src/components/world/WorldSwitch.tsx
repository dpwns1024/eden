'use client';
/** 세계 전환 버튼 (lib/worldStore.ts) — 모든 페이지 왼쪽 아래 (layout.tsx). 누른 쪽 세계로 사이트 전체(디자인 · 목록)가 바뀐다 */
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
