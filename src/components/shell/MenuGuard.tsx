'use client';

/**
 * 비공개 메뉴 접근 차단 및 홈 입장 비밀번호(게이트) 통과 여부를 검사하는 가드 컴포넌트.
 * - 로그인 회원 / 관리자: 비밀번호 입력 없이 즉시 통과
 * - 비로그인 방문자: URL 상관없이 1번 비밀번호 입력창 강제 노출
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
  const [hasCheckedSession, setHasCheckedSession] = useState(false);

  // 1. 세션 스토리지 통과 내역 확인
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const passed = sessionStorage.getItem('site_gate_passed');
        if (passed === 'true') {
          setIsPassed(true);
        }
      }
    } catch (e) {
      console.warn('Storage access restricted by browser settings');
    } finally {
      setHasCheckedSession(true);
    }
  }, []);

  const s = sp.get('s');
  const b = sp.get('b');
  const path = pathname + (s ? `?s=${s}` : b ? `?b=${b}` : '');

  // 🔒 Auth, 메뉴, 사이트 DB 설정이 '완전히' 로드되기 전에는 절대 아래 로직으로 안 넘어가고 빈 화면(대기) 유지
  if (!ready || !loadedMenu || !loadedSite || !hasCheckedSession) {
    return <section className="page" style={{ minHeight: '100vh', background: 'var(--bg, #0f172a)' }} />;
  }

  // 1. 관리자 및 로그인 사용자는 홈 입장 비밀번호 절차 완전히 패스
  if (user || isAdmin) {
    const vis = hrefAccess(menuSet, path);
    const ok = vis === 'all' || (vis === 'member' && !!user) || (vis === 'admin' && isAdmin);
    if (ok) return <>{children}</>;

    return (
      <section className="page">
        <div className="page-head">
          <PageTitle>PRIVATE</PageTitle>
          <p>{vis === 'admin' ? '관리자만 볼 수 있는 곳입니다' : '로그인한 회원만 볼 수 있는 곳입니다'}</p>
        </div>
      </section>
    );
  }

  // 2. DB / 로컬 스토리지에서 사이트 비밀번호 객체 추출
  const siteObj = (site || {}) as Record<string, any>;
  let localSiteObj: any = {};
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localSiteObj = JSON.parse(localStorage.getItem('ohome.site.v1') || '{}');
    }
  } catch (e) {}

  const rawPw = 
    siteObj.homePassword ?? 
    siteObj.settings?.homePassword ?? 
    siteObj.sitePassword ?? 
    siteObj.settings?.sitePassword ?? 
    siteObj.password ?? 
    localSiteObj.homePassword ??
    localSiteObj.settings?.homePassword ??
    localSiteObj.sitePassword ??
    localSiteObj.password ??
    '';

  const gatePassword = String(rawPw).trim();

  // 🔒 비로그인 방문자면서 비밀번호가 존재하고, 아직 인증(isPassed)되지 않은 경우
  // 메인, 갤러리, 게시판 등 URL을 불문하고 입장을 강제 차단하고 모달 노출
  if (gatePassword !== '' && !isPassed) {
    const handlePasswordSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (inputPw && inputPw.trim() === gatePassword) {
        try {
          if (typeof window !== 'undefined' && window.sessionStorage) {
            sessionStorage.setItem('site_gate_passed', 'true');
          }
        } catch (e) {}
        setIsPassed(true);
        setErrorMsg('');
      } else {
        setErrorMsg('비밀번호가 일치하지 않습니다.');
      }
    };

    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9999999,
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
    );
  }

  // 3. 개별 메뉴 접근 권한 판정
  const vis = hrefAccess(menuSet, path);
  const ok = vis === 'all' || (vis === 'member' && !!user) || (vis === 'admin' && isAdmin);
  if (ok) return <>{children}</>;

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
