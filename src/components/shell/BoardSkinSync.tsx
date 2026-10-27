'use client';
// 게시판 디자인(lib/boardSkin.ts)을 <html> 클래스로 — ARCH면 `ui-arch`, 쓰는 글꼴(Jost·JetBrains Mono)도 함께 불러 둔다.
// 페어별 홈 (lib/worldStore.ts) — YJHM 세계면 ARCH 대신 `ui-yjhm` (components/world/yjhm.css)
import { useEffect } from 'react';
import { BOARD_UI_KEY, boardSkin } from '@/lib/boardSkin';
import { onSettingChange } from '@/lib/settingStore';
import { currentWorld, onWorldChange } from '@/lib/worldStore';
import '@/components/world/yjhm.css';

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
    const off = onSettingChange(k => { if (k === BOARD_UI_KEY) apply(); });
    const offW = onWorldChange(apply);
    return () => { off(); offW(); document.documentElement.classList.remove('ui-arch', 'ui-yjhm'); };
  }, []);
  return null;
}
