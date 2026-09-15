import { NextResponse } from 'next/server';

export function middleware(request) {
  // 쿠키나 세션에서 인증 여부 확인 (예: 'authenticated' 쿠키)
  const isAuthenticated = request.cookies.get('authenticated')?.value === 'true';

  const { pathname } = request.nextUrl;

  // 비밀번호 입력 페이지 및 정적 리소스(이미지, API 등) 제외 설정
  if (
    pathname.startsWith('/login') || 
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 인증되지 않은 사용자가 어디로 들어가든 로그인/비밀번호 페이지로 리다이렉트
  if (!isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/login'; // 비밀번호 입력 페이지 경로
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // 메인, 게시판, 글 상세 페이지 등 모든 경로에 미들웨어 적용
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};v
