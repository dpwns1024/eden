import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/lib/ThemeProvider';
import { AuthProvider } from '@/lib/auth';
import { MainStoreProvider } from '@/lib/mainStore';
import { BgmStoreProvider } from '@/lib/bgmStore';
import { FontProvider } from '@/lib/fontStore';
import { ToastProvider } from '@/components/ui/Toast';
import { TopBar } from '@/components/shell/TopBar';
import { GlobalHeader } from '@/components/shell/GlobalHeader';
import { SiteFooter } from '@/components/shell/SiteFooter';
import { BgmPlayer } from '@/components/shell/BgmPlayer';
import { TipLayer } from '@/components/ui/TipLayer';
import { CursorLayer } from '@/components/shell/CursorLayer';
import { ImgProtect } from '@/components/shell/ImgProtect';
import { LetterSpacingFix } from '@/components/shell/LetterSpacingFix';
import { BoardSkinSync } from '@/components/shell/BoardSkinSync';
import { SetupGate } from '@/components/shell/SetupGate';
import { DocTitle } from '@/components/shell/DocTitle';
import { DocIcon } from '@/components/shell/DocIcon';
import { SettingSync } from '@/components/shell/SettingSync';
import { ListSync } from '@/components/shell/ListSync';
import { UploadBusy } from '@/components/shell/UploadBusy';
import { SpellCheck } from '@/components/shell/SpellCheck';
import { PageFrame } from '@/lib/pageRefresh';
import { MenuGuard } from '@/components/shell/MenuGuard';
import { ServerBoot } from '@/components/shell/ServerBoot';
import { SplashScreen } from '@/components/shell/SplashScreen';
import { siteMeta } from '@/lib/siteMeta';

export async function generateMetadata(): Promise<Metadata> {
  const { title, subtitle, crawlDesc, favicon } = await siteMeta();
  const description = crawlDesc?.trim() || subtitle?.trim() || '자캐놀이용 개인 아카이브';
  return {
    title,
    description,
    ...(favicon ? { icons: { icon: favicon } } : {}),
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary', title, description },
  };
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
                        <TopBar />
                        <GlobalHeader />
                        <main id="appMain">
                          {/* 공개범위·비밀번호 가드는 본문만 막는다 — 상단(메뉴·공통 상단 HTML)·하단·BGM은 그대로 두어
                              잠긴 화면에서도 메뉴로 돌아갈 수 있고 사이트 디자인(배경)이 유지된다 (v2.0 사용자 제보) */}
                          <MenuGuard>
                            <PageFrame>
                              {children}
                            </PageFrame>
                          </MenuGuard>
                        </main>
                        <SiteFooter />
                        <BgmPlayer />
                        <SplashScreen />
                        <TipLayer />
                        <CursorLayer />
                        <ImgProtect />
                        <LetterSpacingFix />
                        <BoardSkinSync />
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
      </body>
    </html>
  );
}
