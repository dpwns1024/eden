// 요약 주소 변환(순수 함수) — 서버·클라이언트 어디서나 import 가능. 설명은 routeAlias.ts
export const ROUTE_ALIASES: ReadonlyArray<readonly [canon: string, pub: string]> = [
  ['/page', '/arch'],
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

/** 요약 주소 → 원래 주소 (/profile/eden → /chars/eden) */
export const toCanonPath = (path: string) => swap(path, 1);
/** 원래 주소 → 요약 주소 (링크에 쓰면 들렀다 바뀌는 과정 없이 바로 요약 주소로 간다) */
export const toPublicHref = (href: string) => swap(href, 0);
