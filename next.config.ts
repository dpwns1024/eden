import type { NextConfig } from "next";

/* 요약 주소 (v2.0) — 주소창에는 오른쪽 주소가 보인다. src/lib/routeAlias.ts의 ROUTE_ALIASES와 같게 유지 */
const ROUTE_ALIASES: [canon: string, pub: string][] = [
  ["/page", "/arch"],
  ["/chars", "/profile"],
  ["/rels", "/pairing"],
  ["/trpg", "/report"],
  ["/rp", "/comms"],
  ["/diary", "/journal"],
];

const nextConfig: NextConfig = {
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
