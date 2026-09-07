'use client';

import React from 'react';
import { useMainStore, WidgetConf } from '@/lib/mainStore';
import { BannerWidget, MenuListWidget } from '@/components/main/widgets';

export function TopHeader() {
  const { widgets } = useMainStore();

  // mainStore에서 배너 설정값을 가져오고, 없으면 기본값 적용
  const bannerConf = widgets.find(
    (w) => w.type.toLowerCase() === 'banner'
  ) ?? {
    id: 'banner',
    type: 'banner',
    x: 0,
    y: 0,
    w: 12,
    h: 4,
    settings: {},
  };

  return (
    <header className="global-top-header">
      <style jsx>{`
        .global-top-header {
          width: 100%;
          max-width: 1080px; /* 메인 페이지 컨테이너 너비 */
          margin: 0 auto 24px auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
      `}</style>

      {/* 상단 배너 */}
      <BannerWidget conf={bannerConf as WidgetConf} />

      {/* 상단 메뉴 */}
      <MenuListWidget />
    </header>
  );
}
