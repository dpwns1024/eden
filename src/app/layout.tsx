'use client';

import { useState, useEffect } from 'react';
import './globals.css';
import { ThemeProvider } from '@/lib/ThemeProvider';
import { AuthProvider } from '@/lib/auth';
import { MainStoreProvider } from '@/lib/mainStore';
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passInput, setPassInput] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  // ⚠️ 사용하실 비밀번호를 입력하세요.
  const PASSWORD = '원하는비밀번호';

  useEffect(() => {
    setIsMounted(true);
    const auth = localStorage.getItem('site_pass_ok');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (passInput === PASSWORD) {
      localStorage.setItem('site_pass_ok', 'true');
      setIsAuthenticated(true);
    } else {
      alert('비밀번호가 올바르지 않습니다.');
    }
  };

  if (!isMounted) return null;

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
        {!isAuthenticated ? (
          /* 비밀번호 미인증 시: 하위 컴포넌트 아예 안 그리고 이 화면만 고정 */
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
        ) : (
          /* 비밀번호 인증 성공 시에만 원본 앱 렌더링 */
          <ServerBoot>
            <ThemeProvider>
              <AuthProvider>
                <ToastProvider>
                  <FontProvider>
                    <MainStoreProvider>
                      <BgmStoreProvider>
                        <SetupGate>
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
                        </SetupGate>
                      </BgmStoreProvider>
                    </MainStoreProvider>
                  </FontProvider>
                </ToastProvider>
              </AuthProvider>
            </ThemeProvider>
          </ServerBoot>
        )}
      </body>
    </html>
  );
}
