import type { NextConfig } from "next";

/* 요약 주소 (v2.0) — 주소창에는 오른쪽 주소가 보인다. src/lib/routeAlias.ts의 ROUTE_ALIASES와 같게 유지 */
const ROUTE_ALIASES: [canon: string, pub: string][] = [
  ["/chars", "/profile"],
  ["/rels", "/pairing"],
  ["/trpg", "/report"],
  ["/rp", "/comms"],
  ["/diary", "/journal"],
  ["/gallery", "/confirmed"],
];

/* 기본 보안 헤더 (v2.0 보안 점검) — 내용 정책(CSP 전체)은 Firebase·유튜브 BGM·웹폰트·사용자 HTML이
   여러 외부 주소를 쓰므로 걸지 않는다. 대신 다른 사이트가 이 홈을 몰래 틀(iframe)에 넣어
   클릭을 가로채는 것(클릭재킹)과 파일 형식 위장, 주소 유출, 카메라·마이크 접근을 막는다 */
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
];

const nextConfig: NextConfig = {
  // 응답에 「Next.js로 만든 사이트」라고 적지 않는다
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  // 요약 주소로 오면 원래 페이지를 보여 준다 (주소창은 요약 주소 그대로)
  async rewrites() {
    return ROUTE_ALIASES.flatMap(([canon, pub]) => [
      { source: pub, destination: canon },
      { source: `${pub}/:path*`, destination: `${canon}/:path*` },
    ]);
  },
  // 원래 주소로 오면(옛 링크·메뉴) 요약 주소로 바꿔 보낸다 — 쿼리(?s=)는 그대로 따라간다
  async redirects() {
    return ROUTE_ALIASES.flatMap(([canon, pub]) => [
      { source: canon, destination: pub, permanent: false },
      { source: `${canon}/:path*`, destination: `${pub}/:path*`, permanent: false },
    ]);
  },
};

export default nextConfig;
