'use client';
/** 메인 — 고른 세계(lib/worldStore.ts)의 메인 화면 + 세계 전환 버튼. EVEDEN은 ARCH 메인, YJHM은 YJHM 메인 */
import React from 'react';
import { ArchHome } from '@/components/main/ArchHome';
import { useWorld } from '@/lib/worldStore';
import { YjhmHome } from './YjhmHome';
import { WorldSwitch } from './WorldSwitch';

export function MainHome() {
  const { world, loaded } = useWorld();
  // 고른 세계를 읽기 전엔 비워 둔다 — ARCH 메인이 잠깐 보였다 YJHM으로 바뀌는 깜빡임 방지
  if (!loaded) return null;
  return (
    <>
      {world === 'yjhm' ? <YjhmHome /> : <ArchHome />}
      <WorldSwitch world={world} />
    </>
  );
}
