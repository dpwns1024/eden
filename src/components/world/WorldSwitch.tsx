'use client';
/** 세계 전환 버튼 (lib/worldStore.ts) — 메인 화면 왼쪽 아래. 누른 쪽 세계로 사이트 전체(디자인 · 목록)가 바뀐다 */
import React from 'react';
import { WORLDS, setWorld, type WorldKey } from '@/lib/worldStore';

export function WorldSwitch({ world }: { world: WorldKey }) {
  return (
    <div className={`world-switch ws-${world}`} role="group" aria-label="홈 전환">
      {WORLDS.map(w => (
        <button key={w.key} type="button" className={w.key === world ? 'on' : ''}
          aria-pressed={w.key === world} onClick={() => setWorld(w.key)}>{w.label}</button>
      ))}
    </div>
  );
}
