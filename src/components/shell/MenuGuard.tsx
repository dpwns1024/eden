'use client';

/**
 * 비공개 메뉴 접근 차단 가드 컴포넌트.
 * - 메뉴 공개범위(전체 / 회원만 / 관리자만)에 따라 페이지를 막는다
 * - 비밀번호를 건 메뉴는 방문자에게 비밀번호 입력 화면을 띄운다 (MenuLock — 대조는 서버가)
 */
import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppPathname } from '@/lib/routeAlias';
import { useAuth } from '@/lib/auth';
import { useMenuSettings, hrefAccess, menuLabelOf, menuLabelFor } from '@/lib/menuStore';
import { governingLock } from '@/lib/menuLock';
import { useLockOpen, MenuLockScreen } from '@/components/ui/MenuLock';
import { PageTitle } from '@/components/ui/PageText';

function GuardInner({ children }: { children: React.ReactNode }) {
  const pathname = useAppPathname();
  const sp = useSearchParams();
  const { user, isAdmin, ready } = useAuth();
  const [menuSet, , loadedMenu] = useMenuSettings();

  const s = sp.get('s');
  const b = sp.get('b');
  const path = pathname + (s ? `?s=${s}` : b ? `?b=${b}` : '');
  /* 비밀번호 메뉴 — 목록 페이지에서만 막는다. 상세(/board/123)는 주소만으로는 어느 게시판·섹션 글인지
     알 수 없고, 통과하지 않은 방문자에게는 서버가 글 자체를 내주지 않아 어차피 열리지 않는다 */
  const lockHref = loadedMenu && pathname.split('/').length === 2 ? governingLock(path) : null;
  const lock = useLockOpen(lockHref);

  // Auth 및 메뉴 설정 로딩 완료 시까지 대기
  if (!ready || !loadedMenu) {
    // 본문 자리만 비워 둔다 — 이제 상단·배경은 따로 그려지므로 여기서 배경을 칠하지 않는다
    return <section className="page" style={{ minHeight: '100vh' }} />;
  }

  const vis = hrefAccess(menuSet, path);
  const ok = vis === 'all' || (vis === 'member' && !!user) || (vis === 'admin' && isAdmin);
  if (ok) {
    if (lock === 'loading') return <section className="page" />;
    if (lock === 'locked' && lockHref) {
      const title = menuLabelOf(menuSet, lockHref) ?? menuLabelFor(lockHref) ?? 'LOCKED';
      return <MenuLockScreen lockHref={lockHref} title={title} />;
    }
    return <>{children}</>;
  }

  return (
    <section className="page">
      <div className="page-head">
        <PageTitle>PRIVATE</PageTitle>
        <p>{vis === 'admin' ? '관리자만 볼 수 있는 곳입니다' : '로그인한 회원만 볼 수 있는 곳입니다'}</p>
      </div>
    </section>
  );
}

export function MenuGuard({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<section className="page" />}>
      <GuardInner>{children}</GuardInner>
    </Suspense>
  );
}

function blockedView(vis: 'member' | 'admin') {
  return (
    <section className="page">
      <div className="page-head">
        <PageTitle>PRIVATE</PageTitle>
        <p>{vis === 'admin' ? '관리자만 볼 수 있는 곳입니다' : '로그인한 회원만 볼 수 있는 곳입니다'}</p>
      </div>
    </section>
  );
}

export function useHrefBlock(href?: string): React.ReactElement | null {
  const { user, isAdmin, ready } = useAuth();
  const [menuSet, , loaded] = useMenuSettings();
  if (!href || !loaded || !ready) return null;
  const vis = hrefAccess(menuSet, href);
  if (vis === 'all' || (vis === 'member' && !!user) || (vis === 'admin' && isAdmin)) return null;
  return blockedView(vis);
}
