import { Suspense } from 'react';
import { MainHome } from '@/components/world/MainHome';

/** 메인 — 위젯 캔버스 대신 코드로 그린 메인 화면. 고른 세계(EVEDEN · YJHM)에 따라 ARCH 메인 / YJHM 메인 (components/world/MainHome.tsx).
 *  EVEDEN은 ARCH 메인 (components/main/ArchHome.tsx).
 *  ABOUT ARCH 화면을 주소(?view=arch)로 고르므로 Suspense로 감싼다 */
export default function MainPage() {
  return (
    <Suspense fallback={null}>
      <MainHome />
    </Suspense>
  );
}
