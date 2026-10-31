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
import { TagAlign } from '@/components/shell/TagAlign';
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
import { LinkIntercept } from '@/components/shell/LinkIntercept';
import { SplashScreen } from '@/components/shell/SplashScreen';
import { siteMeta } from '@/lib/siteMeta';
import { ARCH_FONTS } from '@/lib/archFonts';
import { YJ_FONTS } from '@/components/world/yjhmFonts';

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
    // 아래 스크립트가 첫 그림 전에 <html>의 style · class를 채운다 — 서버가 그린 것과 다른 게 정상이라 경고를 끈다
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* 아이폰 「홈 화면에 추가」로 연 경우 사파리가 아니라 앱처럼 — Next는 mobile-web-app-capable만 넣어 줘서
            예전 iOS를 위해 애플 이름으로도 직접 둔다 */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var m=JSON.parse(localStorage.getItem('ohome.themeCss.v1'));if(m){var s=document.documentElement.style;for(var k in m)s.setProperty(k,m[k]);}}catch(e){}})();`,
        }} />
        {/* 게시판 디자인(ARCH 고정) · 고른 세계(YJHM) 클래스도 첫 그림 전에 — BoardSkinSync가 붙이기 전 한 순간
            다른 세계 색으로 그려지던 것 방지 (lib/boardSkin.ts · lib/worldStore.ts).
            EVEDEN 전용 페이지(ARCH 소개 /arch · 기밀 파일 /eveden)는 주소로 바로 들어와도 EVEDEN으로 (useWorldOnly) */}
        <script dangerouslySetInnerHTML={{
          __html: `(function(){var c=document.documentElement.classList;c.add('ui-arch');try{if(/^\\/(arch|eveden)\\/?$/.test(location.pathname))localStorage.setItem('ohome.world.v1','eveden');else if(localStorage.getItem('ohome.world.v1')==='yjhm')c.add('ui-yjhm');}catch(e){}})();`,
        }} />
        {/* 환경설정 > 디자인에서 고른 역할 글꼴도 첫 그림 전에 — 변수와 그 글꼴 CSS를 저장해 둔 사본으로 (lib/fontStore.tsx).
            예전엔 화면을 그린 뒤에 적용돼 기본 글꼴로 잠깐 그렸다가 바뀌었다 (v2.0 사용자 제보).
            스크립트로 넣는 CSS는 blocking=render라야 글꼴이 오기 전 화면을 붙잡는다 */}
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var m=JSON.parse(localStorage.getItem('ohome.fontCss.v1'));if(!m)return;var s=document.documentElement.style,v=m.vars||{};for(var k in v)s.setProperty(k,v[k]);(m.links||[]).forEach(function(x){if(document.getElementById(x[0]))return;var l=document.createElement('link');l.id=x[0];l.rel='stylesheet';l.href=x[1];l.setAttribute('blocking','render');document.head.appendChild(l);});}catch(e){}})();`,
        }} />
        {/* YJHM 세계면 그 글꼴도 첫 그림 전에 (components/world/YjhmHeader.tsx) */}
        <script dangerouslySetInnerHTML={{
          __html: `(function(){if(!document.documentElement.classList.contains('ui-yjhm'))return;var l=document.createElement('link');l.rel='stylesheet';l.href=${JSON.stringify(YJ_FONTS)};l.setAttribute('blocking','render');document.head.appendChild(l);})();`,
        }} />
        {/* 본문 글꼴 Pretendard — 기기 글꼴(맑은 고딕 · 애플 산돌고딕 …)마다 굵기 · 폭이 달라 보이던 것을 홈에서 직접 내려 맞춘다
            (v2.0 사용자 요청). 쓰는 글자가 든 조각만 받는다(dynamic subset) */}
        {/* ?v= — /fonts/는 1년 동안 다시 받지 않게(immutable) 내려 주므로(next.config.ts), 파일을 고치면 번호를 올려야
            이미 방문한 브라우저도 새 파일을 받는다. v2 = font-display:block (예전 글꼴이 떴다가 바뀌던 것) */}
        <link rel="stylesheet" href="/fonts/pretendard/pretendard.css?v=2" />
        <link rel="stylesheet" href="/fonts/jetbrains/jetbrains.css?v=2" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* 글꼴은 display=block — 받기 전 잠깐(최대 3초) 글자를 비워 두고, 기기 글꼴(옛 글꼴)로 그렸다가 바뀌는 것을 막는다
            (v2.0 사용자 제보 — 「예전 글꼴이 떴다가 지금 글꼴로 바뀐다」). ARCH 글꼴(Jost 등)도 화면 조각이 붙인 뒤가 아니라 여기서 먼저 */}
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Noto+Serif+KR:wght@500;700&display=block"
          rel="stylesheet"
        />
        <link rel="stylesheet" href={ARCH_FONTS} />
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
                        <TagAlign />
                        <BoardSkinSync />
                        <QuoteNameSync />
                        <ClassifiedSync />
                        <DocTitle />
                        <DocIcon />
                        <SettingSync />
                        <ListSync />
                        <UploadBusy />
                        <SpellCheck />
                        <LinkIntercept />
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
