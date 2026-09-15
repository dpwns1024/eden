'use client';

/**
 * 비공개 메뉴 접근 차단 및 홈 입장 비밀번호(게이트) 통과 여부를 검사하는 가드 컴포넌트.
 * - 로그인 회원 / 관리자: 비밀번호 입력 없이 즉시 통과
 * - 비로그인 방문자: URL/게시판 권한 불문하고 1회만 모달 팝업 노출 (중복 노출 방지)
 */
import React, { Suspense, useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useMenuSettings, hrefAccess } from '@/lib/menuStore';
import { useSiteSettings } from '@/lib/siteStore';
import { PageTitle } from '@/components/ui/PageText';

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

  // 1. 세션 스토리지 통과 내역 확인 (중복 팝업 방지용 세션 키 체크)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const passed = window.sessionStorage?.getItem('site_gate_passed');
        if (passed === 'true') {
          setIsPassed(true);
        }
      }
    } catch (e) {
      // Storage access blocked by browser
    } finally {
      setHasCheckedSession(true);
    }
  }, []);

  const s = sp.get('s');
  const b = sp.get('b');
  const path = pathname + (s ? `?s=${s}` : b ? `?b=${b}` : '');

  // Auth 및 DB 설정 로딩 완료 시까지 대기
  if (!ready || !loadedMenu || !loadedSite || !hasCheckedSession) {
    return <section className="page" style={{ minHeight: '100vh', background: 'var(--bg, #0f172a)' }} />;
  }

  // 2. 로그인 회원 / 관리자는 홈 입장 비번 절차 패스
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

  // 3. 비로그인 방문자 대상 비밀번호 파싱
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

  // 4. 단일 모달 통합: 비로그인 유저가 세션 통과를 안 했다면 딱 1번만 모달 출력
  if (!isPassed) {
    const handlePasswordSubmit = (e: React.FormEvent) => {
      e.preventDefault();

      const targetPw = gatePassword;
      
      if (inputPw && (targetPw === '' || inputPw.trim() === targetPw)) {
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
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 360,
            backgroundColor: '#ffffff',
            borderRadius: 16,
            padding: '36px 28px 28px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
          }}
        >
          <h3
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#111827',
              marginBottom: 6,
              letterSpacing: '-0.02em',
            }}
          >
            입장 비밀번호 입력
          </h3>
          <p
            style={{
              fontSize: 13,
              color: '#6b7280',
              marginBottom: 20,
              lineHeight: 1.4,
            }}
          >
            이 사이트는 접근 보호가 설정되어 있습니다.
          </p>
          <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              type="password"
              placeholder="비밀번호를 입력하세요"
              value={inputPw}
              onChange={(e) => setInputPw(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                height: 44,
                padding: '0 14px',
                fontSize: 14,
                color: '#1f2937',
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {errorMsg && (
              <small style={{ color: '#ef4444', fontSize: 12, textAlign: 'left', marginTop: -2 }}>
                {errorMsg}
              </small>
            )}
            <button
              type="submit"
              style={{
                width: '100%',
                height: 44,
                marginTop: 4,
                backgroundColor: '#5f80a6',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
            >
              입장하기
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 5. 세션 통과 완료 후 메인/게시판 정상 출력
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
