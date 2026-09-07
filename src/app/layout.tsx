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
import { MenuGuard } from '@/components/shell/MenuGuard';
import { ServerBoot } from '@/components/shell/ServerBoot';
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
                  <main id="appMain"><PageFrame><MenuGuard>{children}</MenuGuard></PageFrame></main>
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
      </body>
    </html>
  );
}
