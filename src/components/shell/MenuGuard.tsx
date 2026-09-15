'use client';

/**
 * 비공개 메뉴 접근 차단 및 홈 입장 비밀번호(게이트) 통과 여부를 검사하는 가드 컴포넌트.
 * - 로그인 회원 / 관리자: 비밀번호 입력 없이 즉시 통과
 * - 비로그인 방문자: 어떤 경로(/gallery 포함)로 들어오든 전면 고정 레이어로 완전 차단
 */
import React, { Suspense, useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useMenuSettings, hrefAccess } from '@/lib/menuStore';
import { useSiteSettings } from '@/lib/siteStore';
import { PageTitle } from '@/components/ui/PageText';
import { KInput } from '@/components/ui/Kit';

function GuardInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const { user, isAdmin, ready } = useAuth();
  const [menuSet, , loadedMenu] = useMenuSettings();
  const [site, , loadedSite] = useSiteSettings();

  const [isPassed, setIsPassed] = useState<boolean>(false);
  const [inputPw, setInputPw] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 브라우저 세션 스토리지 확인
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const passed = sessionStorage.getItem('site_gate_passed');
      if (passed === 'true') {
        setIsPassed(true);
      }
    }
  }, []);

  const s = sp.get('s');
  const b = sp.get('b');
  const path = pathname + (s ? `?s=${s}` : b ? `?b=${b}` : '');

  // Auth 및 설정 로딩 완료 전에는 아무것도 노출하지 않음
  if (!ready || !loadedMenu || !loadedSite) {
    return <section className="page" />;
  }

  // 비밀번호 파라미터 추출
  const siteObj = (site || {}) as Record<string, any>;
  const gatePassword = 
    siteObj.homePassword ?? 
    siteObj.settings?.homePassword ?? 
    siteObj.sitePassword ?? 
    siteObj.settings?.sitePassword ?? '';

  const isProtected = Boolean(gatePassword && String(gatePassword).trim() !== '');

  // 💡 관리자 또는 로그인한 회원은 무조건 통과 (비밀번호 모달 패스)
  const isBypassed = Boolean(user) || Boolean(isAdmin) || isPassed;

  // 비로그인 방문자면서 비밀번호 미인증 상태일 때 전면 차단 레이어 띄우기
  const showGateModal = isProtected && !isBypassed;

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPw && String(inputPw).trim() === String(gatePassword).trim()) {
      sessionStorage.setItem('site_gate_passed', 'true');
      setIsPassed(true);
      setErrorMsg('');
    } else {
      setErrorMsg('비밀번호가 일치하지 않습니다.');
    }
  };

  // 🔒 개별 메뉴 권한 판정
  const vis = hrefAccess(menuSet, path);
  const ok = vis === 'all' || (vis === 'member' && !!user) || (vis === 'admin' && isAdmin);

  return (
    <>
      {/* 1. 비밀번호 통과 미완료 시 아래의 콘텐츠 접근을 100% 렌더링 차단 및 고정 레이어로 은폐 */}
      {showGateModal ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            backgroundColor: 'var(--bg, #0f172a)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
          }}
        >
          <div
            className="panel"
            style={{
              maxWidth: 380,
              width: '100%',
              padding: '32px 24px',
              textAlign: 'center',
            }}
          >
            <PageTitle style={{ marginBottom: 12 }}>ACCESS RESTRICTED</PageTitle>
            <p style={{ fontSize: 13, color: 'var(--faint)', marginBottom: 24, lineHeight: 1.5 }}>
              이 사이트는 보호되어 있습니다.<br />입장 비밀번호를 입력해 주세요.
            </p>
            <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <KInput
                type="password"
                placeholder="비밀번호 입력"
                value={inputPw}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputPw(e.target.value)}
                autoFocus
              />
              {errorMsg && (
                <small style={{ color: 'var(--accent, #e5484d)', fontSize: 12 }}>
                  {errorMsg}
                </small>
              )}
              <button type="submit" className="btn btn-dark" style={{ marginTop: 8, padding: '10px 0' }}>
                ENTER
              </button>
            </form>
          </div>
        </div>
      ) : !ok ? (
        <section className="page">
          <div className="page-head">
            <PageTitle>PRIVATE</PageTitle>
            <p>{vis === 'admin' ? '관리자만 볼 수 있는 곳입니다' : '로그인한 회원만 볼 수 있는 곳입니다'}</p>
          </div>
        </section>
      ) : (
        children
      )}
    </>
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
