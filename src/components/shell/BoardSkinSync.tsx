'use client';
// 게시판 디자인(lib/boardSkin.ts — ARCH 고정)을 <html> 클래스로 — 늘 `ui-arch`, 쓰는 글꼴(Jost·JetBrains Mono)도 함께 불러 둔다.
// 페어별 홈 (lib/worldStore.ts) — YJHM 세계면 그 위에 `ui-yjhm`을 더한다 (components/world/yjhm.css)
import { useEffect } from 'react';
import { boardSkin } from '@/lib/boardSkin';
import { currentWorld, onWorldChange } from '@/lib/worldStore';
import '@/components/world/yjhm.css';
import '@/components/world/yjhmArch.gen.css';
import '@/components/world/yjhmBoard.css';

const FONT_ID = 'ui-arch-fonts';
const FONT_URL = 'https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap';   // 인용구 딱지가 500

export function BoardSkinSync() {
  useEffect(() => {
    const apply = () => {
      const on = boardSkin() === 'arch';
      document.documentElement.classList.toggle('ui-arch', on);
      document.documentElement.classList.toggle('ui-yjhm', currentWorld() === 'yjhm');
      if (on && !document.getElementById(FONT_ID)) {
        const l = document.createElement('link');
        l.id = FONT_ID; l.rel = 'stylesheet'; l.href = FONT_URL;
        document.head.appendChild(l);
      }
    };
    apply();
    const offW = onWorldChange(apply);
    return () => { offW(); document.documentElement.classList.remove('ui-arch', 'ui-yjhm'); };
  }, []);
  return null;
}
