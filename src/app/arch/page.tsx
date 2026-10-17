import { Suspense } from 'react';
import { ArchHome } from '@/components/main/ArchHome';

/** ABOUT ARCH (v2.0 사용자 요청 — 주소 /arch). 메인과 같은 화면에서 소개를 펼쳐 둔 상태로 그린다.
 *  상단 바 · 머리 · 푸터는 메인으로 다룬다(lib/routeAliasCore.ts — /arch의 원래 주소는 「/」) */
export default function AboutArchPage() {
  return (
    <Suspense fallback={null}>
      <ArchHome about />
    </Suspense>
  );
}
