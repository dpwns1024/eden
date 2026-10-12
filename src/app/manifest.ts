import type { MetadataRoute } from 'next';
import { siteMeta } from '@/lib/siteMeta';

/* 홈 화면에 추가했을 때 앱처럼 열리게 (v2.0 사용자 요청) — 사파리 주소창·도구 막대 없이 전체 화면.
   이름·아이콘은 사이트 설정(환경설정의 사이트 제목·탭 아이콘)을 따른다 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { title, favicon } = await siteMeta();
  return {
    name: title,
    short_name: title,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#07090d',
    theme_color: '#07090d',
    icons: favicon ? [{ src: favicon, sizes: 'any' }] : [{ src: '/favicon.ico', sizes: 'any' }],
  };
}
