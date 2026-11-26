'use client';
// 레이아웃(머리 · BGM · 상단 바 …)에서 난 오류 — 사이트 레이아웃 대신 이 문서를 통째로 그린다 (components/shell/ErrorScreen.tsx).
// 사이트 레이아웃 밖이라 글꼴과 딱지 맞춤을 여기서 따로 붙인다 — 사이트 화면과 같은 글꼴 · 같은 정렬로 보이게
import { ErrorScreen } from '@/components/shell/ErrorScreen';
import { TagAlign } from '@/components/shell/TagAlign';
import { YJ_FONTS } from '@/components/world/yjhmFonts';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="ko">
      <head>
        <title>오류</title>
        <link rel="stylesheet" href="/fonts/pretendard/pretendard.css?v=2" />
        <link rel="stylesheet" href="/fonts/jetbrains/jetbrains.css?v=2" />
        <link rel="stylesheet" href={YJ_FONTS} />
      </head>
      <body style={{ margin: 0 }}>
        <ErrorScreen error={error} />
        <TagAlign />
      </body>
    </html>
  );
}
