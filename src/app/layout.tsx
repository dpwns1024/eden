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
import { ContentGuard } from '@/components/shell/ContentGuard';
import { ScrollTop } from '@/components/shell/ScrollTop';
import { ExcerptMaker } from '@/components/shell/ExcerptMaker';
import { SecurityMigrate } from '@/components/shell/SecurityMigrate';
import { LetterSpacingFix } from '@/components/shell/LetterSpacingFix';
import { BoardSkinSync } from '@/components/shell/BoardSkinSync';
import { QuoteNameSync } from '@/components/shell/QuoteNameSync';
import { ClassifiedSync } from '@/components/shell/ClassifiedSync';
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
    ...(favicon ? { icons: { icon: favicon, apple: favicon } } : {}),
    // 홈 화면에 추가 → 앱처럼(주소창 없이) 열기 (v2.0 사용자 요청). 아이폰 위쪽 상태 표시줄은 검게
    appleWebApp: { capable: true, title, statusBarStyle: 'black' },
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary', title, description },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* 아이폰 「홈 화면에 추가」로 연 경우 사파리가 아니라 앱처럼 — Next는 mobile-web-app-capable만 넣어 줘서
            예전 iOS를 위해 애플 이름으로도 직접 둔다 */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
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
                        <ContentGuard />
                        <ScrollTop />
                        <ExcerptMaker />
                        <SecurityMigrate />
                        <LetterSpacingFix />
                        <BoardSkinSync />
                        <QuoteNameSync />
                        <ClassifiedSync />
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
