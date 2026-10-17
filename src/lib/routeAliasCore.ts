// 요약 주소 변환(순수 함수) — 서버·클라이언트 어디서나 import 가능. 설명은 routeAlias.ts
export const ROUTE_ALIASES: ReadonlyArray<readonly [canon: string, pub: string]> = [
  ['/chars', '/profile'],
  ['/rels', '/pairing'],
  ['/trpg', '/report'],    // FIELD REPORT (v2.0 사용자 요청)
  ['/rp', '/comms'],       // COMMS ARCHIVE
  ['/diary', '/journal'],  // JOURNAL
  ['/gallery', '/confirmed'], // CONFIRMED (갤러리 · v2.0 사용자 요청)
];

const swap = (path: string, from: 0 | 1) => {
  for (const a of ROUTE_ALIASES) {
    const src = a[from], dst = a[from === 0 ? 1 : 0];
    if (path === src || path.startsWith(`${src}/`) || path.startsWith(`${src}?`) || path.startsWith(`${src}#`)) {
      return dst + path.slice(src.length);
    }
  }
  return path;
};

/** ABOUT ARCH (v2.0 사용자 요청) — 메인 화면의 소개. 따로 된 페이지(app/arch)지만 메인과 같은 화면이라
 *  원래 주소를 「/」로 본다 — 상단 바 · 머리 · 푸터 · 메뉴 공개범위가 메인과 똑같이 동작한다.
 *  (예전 요약 주소 /arch → /page(HTML 페이지)는 없앴다 — HTML 페이지는 /page 그대로) */
export const ABOUT_PATH = '/arch';
const isAbout = (path: string) => path === ABOUT_PATH || path.startsWith(`${ABOUT_PATH}?`) || path.startsWith(`${ABOUT_PATH}#`);

/** 요약 주소 → 원래 주소 (/profile/eden → /chars/eden) */
export const toCanonPath = (path: string) => (isAbout(path) ? `/${path.slice(ABOUT_PATH.length)}` : swap(path, 1));
/** 원래 주소 → 요약 주소 (링크에 쓰면 들렀다 바뀌는 과정 없이 바로 요약 주소로 간다) */
export const toPublicHref = (href: string) => swap(href, 0);
