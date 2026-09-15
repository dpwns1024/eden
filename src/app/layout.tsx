'use client';

import { useState, useEffect } from 'react';
import './globals.css';
import { ThemeProvider } from '@/lib/ThemeProvider';
import { AuthProvider, useAuth } from '@/lib/auth';
import { MainStoreProvider, useMainStore } from '@/lib/mainStore';
import { BgmStoreProvider } from '@/lib/bgmStore';
import { FontProvider } from '@/lib/fontStore';
import { ToastProvider } from '@/components/ui/Toast';
import { TopBar } from '@/components/shell/TopBar';
import { GlobalHeader } from '@/components/shell/GlobalHeader';
import { BgmPlayer } from '@/components/shell/BgmPlayer';
import { TipLayer } from '@/components/ui/TipLayer';
import { CursorLayer } from '@/components/shell/CursorLayer';
import { ImgProtect } from '@/components/shell/ImgProtect';
import { SetupGate } from '@/components/shell/SetupGate';
import { DocTitle } from '@/components/shell/DocTitle';
import { DocIcon } from '@/components/shell/DocIcon';
import { SettingSync } from '@/components/shell/SettingSync';
import { ListSync } from '@/components/shell/ListSync';
import { UploadBusy } from '@/components/shell/UploadBusy';
import { SpellCheck } from '@/components/shell/SpellCheck';
import { PageFrame } from '@/lib/pageRefresh';
import { ServerBoot } from '@/components/shell/ServerBoot';

function SecurityGate({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = useAuth();
  const store = useMainStore() as Record<string, any>;
  
  const [passInput, setPassInput] = useState('');
  const [isPassed, setIsPassed] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (sessionStorage.getItem('site_pass_ok') === 'true') {
      setIsPassed(true);
    }
  }, []);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    
    // store 객체 내 sitePassword 또는 settings 객체 안전 접근
    const targetPassword = 
      store?.settings?.sitePassword ?? 
      store?.sitePassword ?? 
      store?.config?.sitePassword;

    if (passInput && passInput === targetPassword) {
      sessionStorage.setItem('site_pass_ok', 'true');
      setIsPassed(true);
    } else {
      alert('비밀번호가 올바르지 않습니다.');
    }
  };

  if (!isMounted) return null;

  // 관리자 접속(isAdmin/user) 상태이거나 비밀번호 인증 성공 시 전체 통과
  if (isAdmin || user || isPassed) {
    return <>{children}</>;
  }

  // 비로그인 방문자 접속 차단 화면
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 999999,
      background: '#0f172a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontFamily: 'sans-serif'
    }}>
      <form onSubmit={handleAuth} style={{
        background: '#1e293b',
        padding: '32px',
        borderRadius: '12px',
        border: '1px solid #334155',
        textAlign: 'center',
        width: '280px'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#f8fafc' }}>🔒 Access Restricted</h3>
        <input
          type="password"
          value={passInput}
          onChange={(e) => setPassInput(e.target.value)}
          placeholder="Password"
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '6px',
            border: '1px solid #475569',
            background: '#0f172a',
            color: '#fff',
            marginBottom: '12px',
            boxSizing: 'border-box'
          }}
        />
        <button type="submit" style={{
          width: '100%',
          padding: '10px',
          borderRadius: '6px',
          border: 'none',
          background: '#607CA0',
          color: '#fff',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}>
          Enter
        </button>
      </form>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var m=JSON.parse(localStorage.getItem('ohome.themeCss.v1'));if(m){var s=document.documentElement.style;for(var k in m)s.setProperty(k,m[k]);}}catch(e){}})();`,
        }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Noto+Serif+KR:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ServerBoot>
          <ThemeProvider>
            <AuthProvider>
              <ToastProvider>
                <FontProvider>
                  <MainStoreProvider>
                    <BgmStoreProvider>
                      <SetupGate>
                        <SecurityGate>
                          <TopBar />
                          <GlobalHeader />
                          <main id="appMain">
                            <PageFrame>
                              {children}
                            </PageFrame>
                          </main>
                          <BgmPlayer />
                          <TipLayer />
                          <CursorLayer />
                          <ImgProtect />
                          <DocTitle />
                          <DocIcon />
                          <SettingSync />
                          <ListSync />
                          <UploadBusy />
                          <SpellCheck />
                        </SecurityGate>
                      </SetupGate>
                    </BgmStoreProvider>
                  </MainStoreProvider>
                </FontProvider>
              </ToastProvider>
            </AuthProvider>
          </ThemeProvider>
        </ServerBoot>
      </body>
    </html>
  );
}
