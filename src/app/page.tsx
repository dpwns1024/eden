import { Suspense } from 'react';
import { ArchHome } from '@/components/main/ArchHome';

/** 메인 — 위젯 캔버스 대신 코드로 그린 ARCH 메인 화면 (components/main/ArchHome.tsx).
 *  ABOUT ARCH 화면을 주소(?view=arch)로 고르므로 Suspense로 감싼다 */
export default function MainPage() {
  return (
    <Suspense fallback={null}>
      <ArchHome />
    </Suspense>
  );
}
