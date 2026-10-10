'use client';
// 서버 연결 부팅 (v2.0) — 앱이 그려지기 전에 런타임 설정(ohome.config.json → localStorage → env)을
// 한 번 읽어 Supabase 클라이언트를 확정한다. 확정 전에는 자식을 그리지 않아
// "로컬 모드로 한 번 그렸다가 서버 모드로 다시 그리는" 깜빡임을 막는다.
import React, { useEffect, useState } from 'react';
import { initSupabase } from '@/lib/supabase';
import { primeSettings } from '@/lib/settingStore';

export function ServerBoot({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  // 대기가 길어질 때만 표시 — 빠르게 끝나는 경우 스피너가 깜빡이는 게 더 거슬린다
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => { if (alive) setSlow(true); }, 400);
    // 백엔드 확정 → 사이트 설정(테마·메뉴·폰트…)을 한 번에 받아 캐시 → 그 다음에 화면을 그린다.
    // 각 스토어가 렌더 중 동기적으로 설정을 읽기 때문에 순서가 중요하다.
    // 상한 5초 — 일부 브라우저(iPad Safari 등)에서 서버 연결이 응답 없이 멈추면
    // 화면이 영영 안 뜨던 문제. 늦게 도착한 설정은 캐시에 채워진다.
    const boot = initSupabase().then(() => primeSettings()).catch(() => {});
    Promise.race([boot, new Promise(r => setTimeout(r, 5000))])
      .finally(() => { if (alive) { clearTimeout(t); setReady(true); } });
    return () => { alive = false; clearTimeout(t); };
  }, []);
  // 배경(테마 그라데이션)은 body가 첫 페인트 전에 이미 칠하므로 여기서는 표시만 얹는다
  if (!ready) return slow ? <div className="boot-wait"><i /></div> : null;
  return <>{children}</>;
}
