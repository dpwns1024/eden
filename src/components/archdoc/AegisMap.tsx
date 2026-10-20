'use client';
/**
 * 아이기스 지도 (v2.0 사용자 요청 · lib/aegisMap.ts) — 세 장.
 *  1) 섬 전체 — 비스듬히 내려다본 축측(axonometric) 홀로그램. 섬 지형 · 바다 격자 위에 통합 지휘본부 · 요원 거주구역을
 *     와이어프레임 입체로 세운다. 누르면 그 건물로 확대되며 넘어간다.
 * 세 장 모두 파란 홀로그램(발광 선 · 주사선 · 깜빡임)으로 그린다 — 색은 archdoc.css의 '홀로그램' 묶음.
 *  2) 지휘본부 — 층별 안내도 (방마다 칸 · 소품. 옥상 훈련 돔 · 코어 탑 · 헬기 착륙장, 코어 위 상공의 하늘정원부터 지하 B5까지). 옆 화살표로 거주구역으로.
 *  3) 거주구역 — 입체로 본 숙소동들. 양 끝의 이브 · 에덴 숙소동을 강조 — 고르면 그 캐릭터의 대표색으로 빛난다.
 * 칸이나 표시를 누르면(또는 아래 목록) 그 시설이 지도 아래(PC는 오른쪽) 카드로 나온다.
 */
import React, { useState } from 'react';
import { AEGIS_SPOTS, SPOT_ORDER, RES_TOWERS, resP, type AegisView, type ArchMapNode } from '@/lib/aegisMap';
import { useLocalList } from '@/lib/postStore';
import { CHAR_SEED, type Character } from '@/lib/charStore';
import { HQ_ART } from './aegisHqArt';

type View = 'site' | AegisView;
type Pick = (spot: string) => void;

const pts = (a: [number, number][]) => 'M' + a.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L') + ' Z';
const seg = (a: [number, number], b: [number, number]) => `M${a[0].toFixed(1)} ${a[1].toFixed(1)} L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
/** 섬 축측 투영 — 위에서 본 섬 좌표(1000×1000)를 비스듬히 내려다본 화면 좌표로. z는 높이 */
const sP = (x: number, y: number, z = 0): [number, number] => {
  const u = x - 530, v = y - 480;
  return [520 + (u - v) * 0.78, 560 + (u + v) * 0.4 - z];
};

/** 두 건물의 이름 — 섬 지도 · 머리줄 · 목록이 같이 쓴다. (gx, gy) = 섬 위 터, (x, y) = 투영된 화면 자리 */
const SITE_RAW: Record<AegisView, { gx: number; gy: number; code: string; en: string; ko: string; hd: string; view: string; scale: string; ref: string }> = {
  hq: { gx: 440, gy: 470, code: 'SECTOR A · 01', en: 'ARCH COMMAND', ko: '통합 지휘본부', hd: 'B5 – 11F · ROOF', view: 'SECTION VIEW', scale: '1:500', ref: 'AG-A01' },
  res: { gx: 600, gy: 505, code: 'SECTOR R · 02', en: 'AGENT QUARTERS', ko: '요원 거주구역', hd: '7 BLOCKS', view: 'AXONOMETRIC VIEW', scale: '1:800', ref: 'AG-R02' },
};
const SITE = Object.fromEntries(Object.entries(SITE_RAW).map(([k, v]) => {
  const [x, y] = sP(v.gx, v.gy);
  return [k, { ...v, x, y }];
})) as Record<AegisView, (typeof SITE_RAW)[AegisView] & { x: number; y: number }>;
/** 확대 · 축소 모션의 기준점(%) = 섬 지도에서 두 건물의 자리 */
const ORIGIN: Record<AegisView, string> = { hq: `${SITE.hq.x / 10}% ${SITE.hq.y / 10}%`, res: `${SITE.res.x / 10}% ${SITE.res.y / 10}%` };
const ACC = '#b8d8ff';

function Paras({ text }: { text: string }) {
  return <>{text.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}</>;
}

const Defs = () => (
  <defs>
    <pattern id="amGrid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="rgba(90,170,255,.07)" /></pattern>
        <pattern id="amHatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V7" stroke="rgba(255,150,160,.22)" /></pattern>
    <pattern id="amLeaf" width="11" height="11" patternUnits="userSpaceOnUse"><circle cx="5.5" cy="5.5" r="1.5" fill="rgba(160,220,190,.32)" /></pattern>
    <pattern id="amSoil" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r="1" fill="rgba(190,208,228,.07)" /><circle cx="10" cy="11" r="1" fill="rgba(190,208,228,.05)" /></pattern>
    <linearGradient id="amSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="rgba(70,150,255,.16)" /><stop offset="1" stopColor="rgba(70,150,255,.02)" /></linearGradient>
    <radialGradient id="amFade"><stop offset=".35" stopColor="#fff" /><stop offset="1" stopColor="#000" /></radialGradient>
    <mask id="amFadeM"><rect x="-200" y="200" width="1400" height="800" fill="url(#amFade)" /></mask>
    <radialGradient id="amPortal"><stop offset="0" stopColor="rgba(184,216,255,.45)" /><stop offset=".6" stopColor="rgba(184,216,255,.12)" /><stop offset="1" stopColor="rgba(184,216,255,0)" /></radialGradient>
    <radialGradient id="amGlow"><stop offset="0" stopColor="rgba(90,170,255,.32)" /><stop offset="1" stopColor="rgba(90,170,255,0)" /></radialGradient>
  </defs>
);

/* ───────── 1) 섬 전체 — 세계지도 모양 ───────── */
const ISLAND = 'M863 492 L857 506 L847 520 L841 534 L833 547 L820 558 L810 570 L806 584 L795 596 L774 603 L754 609 L744 620 L737 634 L724 644 L708 652 L691 659 L671 663 L646 659 L621 652 L603 651 L587 655 L567 645 L549 634 L535 642 L520 665 L502 676 L483 676 L462 682 L438 692 L414 696 L396 688 L381 677 L365 668 L348 660 L335 650 L318 642 L295 639 L272 634 L260 622 L254 608 L243 596 L228 586 L219 574 L217 559 L215 545 L216 532 L230 517 L252 503 L263 492 L259 481 L252 469 L253 457 L254 445 L252 432 L256 420 L267 411 L276 400 L275 385 L278 371 L292 362 L313 357 L329 350 L343 341 L358 333 L371 324 L381 307 L392 289 L410 280 L433 280 L455 279 L476 276 L498 276 L520 281 L541 285 L561 288 L579 297 L593 313 L607 324 L625 326 L646 325 L665 328 L682 334 L700 339 L714 348 L719 362 L723 376 L736 384 L753 390 L763 400 L766 413 L773 424 L785 433 L794 444 L804 455 L825 466 L851 478 Z';
const ISLETS = [
  'M221 300 L217 304 L214 308 L210 311 L204 314 L196 313 L192 315 L186 318 L178 320 L172 317 L166 315 L161 312 L157 308 L159 304 L161 300 L159 296 L160 293 L163 289 L167 286 L170 280 L179 280 L186 282 L192 285 L199 284 L203 287 L208 290 L211 293 L218 296 Z',
  'M877 262 L875 266 L871 270 L868 274 L860 275 L855 278 L850 281 L842 284 L834 283 L826 281 L818 280 L815 275 L814 270 L817 265 L809 262 L809 258 L809 253 L815 249 L817 244 L826 242 L834 242 L842 244 L849 244 L856 245 L860 249 L868 250 L875 253 L883 256 Z',
  'M898 648 L897 652 L893 655 L888 658 L885 661 L879 663 L873 661 L868 662 L863 663 L856 664 L851 661 L845 659 L842 656 L840 652 L846 648 L846 645 L846 642 L848 638 L853 636 L857 634 L861 630 L868 630 L874 631 L878 635 L884 636 L886 639 L889 642 L891 645 Z',
  'M166 714 L165 717 L163 720 L159 722 L155 723 L154 727 L149 729 L144 730 L139 728 L134 728 L130 725 L128 722 L128 719 L124 717 L122 714 L122 711 L123 708 L125 704 L128 701 L135 702 L140 702 L144 702 L149 700 L153 702 L158 703 L162 705 L168 707 L167 711 Z',
  'M909 454 L908 456 L906 458 L905 460 L902 461 L899 462 L897 463 L894 465 L891 465 L888 463 L884 463 L883 460 L882 458 L884 456 L881 454 L880 452 L881 449 L883 448 L884 445 L887 444 L891 444 L894 445 L897 445 L900 445 L901 447 L905 448 L907 449 L911 451 Z',
  'M244 604 L243 606 L242 607 L240 608 L238 610 L236 609 L234 610 L232 610 L230 611 L227 611 L226 610 L223 609 L222 607 L222 606 L224 604 L223 603 L224 601 L224 600 L226 599 L227 597 L229 596 L232 596 L234 598 L236 598 L238 599 L239 600 L240 601 L242 602 Z',
  'M812 700 L811 702 L811 703 L808 704 L807 706 L806 708 L803 709 L800 709 L797 708 L794 708 L793 706 L792 704 L791 703 L788 702 L788 700 L788 698 L789 696 L789 694 L792 693 L795 693 L798 693 L800 693 L803 693 L805 693 L808 693 L811 694 L813 696 L811 698 Z',
];
/** 축측 상자의 보이는 세 면(윗면 · 왼쪽 앞 · 오른쪽 앞)과 열두 모서리 */
function Box({ x, y, w, d, z0, z1, cls = '' }: { x: number; y: number; w: number; d: number; z0: number; z1: number; cls?: string }) {
  const P = sP, x1 = x + w, y1 = y + d;
  const b = [P(x, y, z0), P(x1, y, z0), P(x1, y1, z0), P(x, y1, z0)];
  const t = [P(x, y, z1), P(x1, y, z1), P(x1, y1, z1), P(x, y1, z1)];
  return (
    <g className={`am-hbox ${cls}`}>
      <path className="am-hf l" d={pts([b[3], b[2], t[2], t[3]])} />
      <path className="am-hf r" d={pts([b[1], b[2], t[2], t[1]])} />
      <path className="am-hf t" d={pts(t)} />
      <path className="am-h1" d={`${pts(b)} ${pts(t)} ${[0, 1, 2, 3].map(i => seg(b[i], t[i])).join(' ')}`} />
    </g>
  );
}

/** 지휘본부 — 11층 본체 + 지하 5층(점선) + 옥상 돔 · 코어 탑 · 헬기 착륙장 + 비스듬한 트러스 지붕 */
const HQ_B = { x: 400, y: 438, w: 80, d: 64, fl: 12, n: 11 };
const HQ_TOP = HQ_B.fl * HQ_B.n;
function HqModel() {
  const { x, y, w, d, fl } = HQ_B, x1 = x + w, y1 = y + d, H = HQ_TOP, P = sP;
  const floors: string[] = [], mull: string[] = [], base: string[] = [];
  for (let z = fl; z < H; z += fl) floors.push(seg(P(x, y1, z), P(x1, y1, z)), seg(P(x1, y, z), P(x1, y1, z)));
  for (let i = 8; i < w; i += 8) mull.push(seg(P(x + i, y1, 0), P(x + i, y1, H)));
  for (let i = 8; i < d; i += 8) mull.push(seg(P(x1, y + i, 0), P(x1, y + i, H)));
  for (let z = -fl; z >= -fl * 5; z -= fl) base.push(pts([P(x + 6, y + 6, z), P(x1 - 6, y + 6, z), P(x1 - 6, y1 - 6, z), P(x + 6, y1 - 6, z)]));
  // 트러스 지붕 — 앞뒤 두 레일이 오른쪽으로 갈수록 솟고, 사이를 지그재그로 엮는다
  const N = 10, rail = (yy: number, i: number) => P(x - 8 + (w + 22) * i / N, yy, H + 10 + 34 * i / N);
  const truss: string[] = [seg(rail(y - 6, 0), rail(y - 6, N)), seg(rail(y1 + 6, 0), rail(y1 + 6, N))];
  for (let i = 0; i <= N; i++) {
    truss.push(seg(rail(y - 6, i), rail(y1 + 6, i)));
    if (i < N) truss.push(seg(rail(i % 2 ? y - 6 : y1 + 6, i), rail(i % 2 ? y1 + 6 : y - 6, i + 1)));
  }
  truss.push(seg(P(x, y, H), rail(y - 6, 0)), seg(P(x, y1, H), rail(y1 + 6, 0)), seg(P(x1, y, H), rail(y - 6, N)), seg(P(x1, y1, H), rail(y1 + 6, N)));
  // 옥상 돔(왼쪽 끝) — 바닥 타원 + 위로 볼록한 갈비
  const [dx, dy] = P(x + 16, y + d / 2, H);
  const [hx, hy] = P(x1 - 14, y + d / 2, H);
  return (
    <g className="am-model">
      <path className="am-h3 dash" d={base.join(' ')} />
      <path className="am-h2 dash" d={[0, 1, 2, 3].map(i => {
        const c: [number, number][] = [[x + 6, y + 6], [x1 - 6, y + 6], [x1 - 6, y1 - 6], [x + 6, y1 - 6]];
        return seg(P(...c[i], 0), P(...c[i], -fl * 5));
      }).join(' ')} />
      <path className="am-h2 dash" d={pts([P(x - 16, y - 16), P(x1 + 16, y - 16), P(x1 + 16, y1 + 16), P(x - 16, y1 + 16)])} />
      <Box x={x} y={y} w={w} d={d} z0={0} z1={H} />
      <path className="am-h2" d={floors.join(' ')} />
      <path className="am-h3" d={mull.join(' ')} />
      <Box x={x + 32} y={y + 24} w={16} d={16} z0={H} z1={H + 52} cls="core" />
      <path className="am-h1" d={seg(P(x + 40, y + 32, H + 52), P(x + 40, y + 32, H + 84))} />
      <circle className="am-hdot" cx={P(x + 40, y + 32, H + 84)[0]} cy={P(x + 40, y + 32, H + 84)[1]} r="3" />
      <ellipse className="am-h2" cx={dx} cy={dy} rx="17" ry="9" />
      <path className="am-h2" d={`M${dx - 17} ${dy} Q${dx} ${dy - 30} ${dx + 17} ${dy} M${dx - 8} ${dy - 7} Q${dx} ${dy - 22} ${dx + 8} ${dy + 7}`} />
      <ellipse className="am-h2" cx={hx} cy={hy} rx="14" ry="7" />
      <text className="am-tg2" x={hx} y={hy + 4} textAnchor="middle">H</text>
      <path className="am-h2" d={truss.join(' ')} />
    </g>
  );
}
/** 거주구역 — 팔각 터 위 일곱 숙소동 (거주구역 지도의 RES_TOWERS를 줄여서) */
function ResModel() {
  const { gx, gy } = SITE.res, k = 0.22, P = sP;
  const plate: [number, number][] = [[24, 0], [296, 0], [320, 24], [320, 296], [296, 320], [24, 320], [0, 296], [0, 24]];
  const at = (cx: number, cy: number) => [gx + (cx - 160) * k, gy + (cy - 160) * k] as const;
  const [yx, yy] = P(...at(160, 160));
  return (
    <g className="am-model">
      <path className="am-h2" d={pts(plate.map(([px, py]) => P(...at(px, py), 0)))} />
      <path className="am-h3 dash" d={pts(plate.map(([px, py]) => P(...at(px, py), -14)))} />
      <ellipse className="am-h3" cx={yx} cy={yy} rx="17" ry="9" />
      {[...RES_TOWERS].sort((a, b) => a.cx + a.cy - (b.cx + b.cy)).map(t => {
        const [tx, ty] = at(t.cx - 32, t.cy - 32);
        return <Box key={t.tag} x={tx} y={ty} w={64 * k} d={64 * k} z0={0} z1={t.h * 0.42} cls={t.key ? 'key' : ''} />;
      })}
    </g>
  );
}

/** 건물 표식 — 바닥에서 퍼지는 고리 + 꺾인 지시선 + 이름. 지휘본부는 왼쪽 위, 거주구역은 오른쪽 위로 */
const CALLOUT: Record<AegisView, { top: [number, number]; y: number; tx: number; to: number; end?: boolean; hit: [number, number, number, number] }> = {
  hq: { top: sP(440, 470, HQ_TOP + 84), y: 262, tx: 150, to: 150, hit: [130, 150, 390, 410] },
  res: { top: sP(624, 481, 128 * 0.42), y: 420, tx: 940, to: 940, end: true, hit: [520, 300, 450, 340] },
};
function SiteMark({ k, go }: { k: AegisView; go: (v: AegisView) => void }) {
  const s = SITE[k], c = CALLOUT[k], [px, py] = c.top;
  return (
    <g className="am-node" onClick={() => go(k)} role="button" aria-label={`${s.ko} 지도 열기`}>
      <rect className="am-hit" x={c.hit[0]} y={c.hit[1]} width={c.hit[2]} height={c.hit[3]} />
      <ellipse className="am-pulse" cx={s.x} cy={s.y} rx="70" ry="36" />
      <ellipse className="am-mring dash" cx={s.x} cy={s.y} rx="92" ry="47" />
      <path className="am-lead" d={`M${px} ${py - 6} V${c.y} H${c.to}`} />
      <rect className="am-mcore" x={px - 5} y={c.y - 5} width="10" height="10" transform={`rotate(45 ${px} ${c.y})`} />
      <text className="am-mcode" x={c.tx} textAnchor={c.end ? 'end' : 'start'} y={c.y - 84}>{s.code}</text>
      <text className="am-zl" x={c.tx} textAnchor={c.end ? 'end' : 'start'} y={c.y - 44}>{s.en}</text>
      <text className="am-zs" x={c.tx} textAnchor={c.end ? 'end' : 'start'} y={c.y - 12}>{s.ko}</text>
    </g>
  );
}
function SiteView({ go }: { go: (v: AegisView) => void }) {
  const isl = ptsOf(ISLAND), C: [number, number] = [530, 480];
  const ring = (a: [number, number][], f: number, z = 0) => pts(a.map(([x, y]) => sP(C[0] + (x - C[0]) * f, C[1] + (y - C[1]) * f, z)));
  const SEA = -30;
  const grid: string[] = [];
  for (let v = -420; v <= 440; v += 40) grid.push(seg(sP(80, 480 + v, SEA), sP(980, 480 + v, SEA)));
  for (let u = -450; u <= 450; u += 40) grid.push(seg(sP(530 + u, 40, SEA), sP(530 + u, 920, SEA)));
  const walls = isl.filter((_, i) => i % 3 === 0).map(([x, y]) => seg(sP(x, y), sP(x, y, SEA))).join(' ');
  // 치수선 — 섬의 앞 두 변을 따라
  const dimX = [sP(215, 730, SEA), sP(865, 730, SEA)] as const, dimY = [sP(895, 276, SEA), sP(895, 700, SEA)] as const;
  const mid = (a: readonly [number, number], b: readonly [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const [mx, my] = mid(...dimX), [nx, ny] = mid(...dimY);
  const ang = Math.atan2(0.4, 0.78) * 180 / Math.PI;
  return (
    <>
      <path className="am-h3 sea" d={grid.join(' ')} mask="url(#amFadeM)" />
      <ellipse cx="520" cy="560" rx="420" ry="220" fill="url(#amGlow)" opacity=".5" />
      {ISLETS.map(d => <path key={d} className="am-h2 islet" d={pts(ptsOf(d).map(([x, y]) => sP(x, y, SEA + 6)))} />)}
      <path className="am-h3" d={walls} />
      <path className="am-h2" d={pts(isl.map(([x, y]) => sP(x, y, SEA)))} />
      <path className="am-hland" d={pts(isl.map(([x, y]) => sP(x, y)))} />
      {[0.8, 0.6, 0.4].map(f => <path key={f} className="am-h3 dash" d={ring(isl, f)} />)}
      <path className="am-road" d={`${seg(sP(440, 470), sP(600, 505))} ${seg(sP(440, 470), sP(330, 360))}`} />
      <path className="am-dimln" d={`${seg(dimX[0], dimX[1])} ${seg(dimY[0], dimY[1])} ${[dimX[0], dimX[1], dimY[0], dimY[1]].map(([x, y]) => `M${x} ${y - 8} V${y + 8}`).join(' ')}`} />
      <text className="am-tag" transform={`translate(${mx} ${my + 22}) rotate(${ang})`} textAnchor="middle">6.5 KM</text>
      <text className="am-tag" transform={`translate(${nx + 16} ${ny + 18}) rotate(${-ang})`} textAnchor="middle">4.2 KM</text>
      <ResModel />
      <HqModel />
      <SiteMark k="hq" go={go} />
      <SiteMark k="res" go={go} />
      {/* 축 표시 — 그림의 x · y · z 방향 */}
      <g className="am-axis" transform="translate(84 900)">
        <path d={`M0 0 L${0.78 * 50} ${0.4 * 50} M0 0 L${-0.78 * 50} ${0.4 * 50} M0 0 V-52`} />
        <text x={0.78 * 50 + 8} y={0.4 * 50 + 10}>X</text>
        <text x={-0.78 * 50 - 18} y={0.4 * 50 + 10}>Y</text>
        <text x="-5" y="-60">Z</text>
      </g>
    </>
  );
}
const ptsOf = (d: string) => [...d.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map(m => [+m[1], +m[2]] as [number, number]);

/* ───────── 2) 지휘본부 — 층별 안내도 (그림: aegisHqArt.ts · viewBox 0 0 1000 1190) ───────── */
export const HQ_H = 1190;
/** 시설 그림 기호 — 가운데 (0,0), 한 변 약 24 */
const ICONS: Record<string, string> = {
  talk: 'M-11 -8 H11 V5 H-2 L-7 10 V5 H-11 Z',
  desk: 'M-11 -3 H11 V9 H-11 Z M-5 -3 V-8 H5 V-3 M-11 3 H11',
  wave: 'M-12 0 H-8 L-5 -8 L-1 8 L3 -5 L6 0 H12',
  cross: 'M-3 -10 H3 V-3 H10 V3 H3 V10 H-3 V3 H-10 V-3 H-3 Z',
  bed: 'M-12 -7 V8 M12 8 V1 H-12 M-9 -2 H-4 V1 M-1 1 V-4 H9 Q12 -4 12 -1 V1',
  alert: 'M0 -10 L11 9 H-11 Z M0 -3 V3 M0 5.5 V6.5',
  cup: 'M-10 -5 H5 V3 Q5 9 -2.5 9 Q-10 9 -10 3 Z M5 -2 H8 Q11 -2 11 1 Q11 4 8 4 H5',
  fork: 'M-6 -10 V10 M-9 -10 V-4 Q-9 0 -6 0 Q-3 0 -3 -4 V-10 M6 10 V-10 Q11 -6 10 2 H6',
  leaf: 'M-9 9 Q-11 -9 10 -10 Q11 9 -9 9 Z M-9 9 L4 -4',
  fish: 'M-11 0 Q-3 -9 6 0 Q-3 9 -11 0 Z M6 0 L11 -5 V5 Z',
  target: 'M10 0 A10 10 0 1 1 -10 0 A10 10 0 1 1 10 0 Z M4 0 A4 4 0 1 1 -4 0 A4 4 0 1 1 4 0 Z',
  gear: 'M7 0 A7 7 0 1 1 -7 0 A7 7 0 1 1 7 0 Z M0 -12 V-8 M0 8 V12 M-12 0 H-8 M8 0 H12 M-8.5 -8.5 L-6 -6 M6 6 L8.5 8.5 M-8.5 8.5 L-6 6 M6 -6 L8.5 -8.5',
  door: 'M-9 10 V-10 H9 V10 M0 -10 V10 M-3 1 V2 M3 1 V2',
  blade: 'M-9 9 L8 -8 M5 -10 L10 -5 M-9 -9 L8 8 M5 10 L10 5 M-11 7 L-7 11 M-11 -7 L-7 -11',
  gate: 'M7 0 A7 11 0 1 1 -7 0 A7 11 0 1 1 7 0 Z M3.5 0 A3.5 6 0 1 1 -3.5 0 A3.5 6 0 1 1 3.5 0 Z',
  file: 'M-8 -11 H4 L9 -6 V11 H-8 Z M4 -11 V-6 H9 M-4 -1 H5 M-4 3 H5 M-4 7 H2',
};
function HqView() {
  return <g dangerouslySetInnerHTML={{ __html: HQ_ART }} />;
}
/** 본부 시설 글씨 — PC: 기호 원 + 영문(번호) · 한글 두 줄 / 폰: 번호 + 한글 한 줄 (작은 화면에서도 읽히게).
 *  세로 가운데는 dominant-baseline 대신 dy=".35em" — 아이폰 사파리는 tspan에 기준선을 물려주지 않아 글자가 어긋난다 */
function HqLabel({ n, x, y, kind, icon }: { n: ArchMapNode; x: number; y: number; kind: string; icon?: string }) {
  const badge = icon && ICONS[icon] && (
    <><circle className="am-bd" r="15" /><path className="am-ic" transform="scale(.85)" d={ICONS[icon]} /></>
  );
  if (kind === 'mini') {
    return <g transform={`translate(${x} ${y})`}><text className="am-tg2 am-lb" textAnchor="middle" dy=".35em">{n.en}</text></g>;
  }
  if (kind === 'text' || kind === 'center') {
    const top = kind === 'center' ? 30 : 0;
    return (
      <g transform={`translate(${x} ${y})`}>
        {kind === 'center' && badge}
        <g className="am-dsk">
          <text className="am-en2" y={top} textAnchor="middle">{n.code && <tspan className="am-cd">{n.code} </tspan>}{n.en}</text>
          <text className="am-ko2" y={top + 17} textAnchor="middle">{n.name}</text>
        </g>
        <text className="am-mob am-mnm" y={kind === 'center' ? 44 : 6} textAnchor="middle" dy=".35em">
          {n.code && <tspan className="am-cd am-mcode2">{n.code} </tspan>}{n.name}
        </text>
      </g>
    );
  }
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="am-dsk">
        {badge}
        <text className="am-en2" x="25" y="-5">{n.code && <tspan className="am-cd">{n.code} </tspan>}{n.en}</text>
        <text className="am-ko2" x="25" y="13">{n.name}</text>
      </g>
      <text className="am-mob am-mnm" x="-14" y="0" dy=".35em">
        {n.code && <tspan className="am-cd am-mcode2">{n.code} </tspan>}{n.name}
      </text>
    </g>
  );
}

/* ───────── 3) 거주구역 — 입체 ───────── */
function Tower({ cx, cy, h, tag, hl, tint }: { cx: number; cy: number; h: number; tag: string; hl: boolean; tint?: string }) {
  const x = cx - 32, y = cy - 32, w = 64, d = 64, P = resP;
  const win: string[] = [];
  for (let z = 14; z < h - 4; z += 14) win.push(seg(P(x, y + d, z), P(x + w, y + d, z)), seg(P(x + w, y, z), P(x + w, y + d, z)));
  const [rx, ry] = P(cx, cy, h);
  const line = tint ?? (hl ? 'rgba(184,216,255,.75)' : undefined);
  return (
    <g className={hl ? 'am-tw hl' : 'am-tw'}>
      <path className="am-b f-l" d={pts([P(x, y + d, 0), P(x + w, y + d, 0), P(x + w, y + d, h), P(x, y + d, h)])} style={line ? { stroke: line } : undefined} />
      <path className="am-b f-r" d={pts([P(x + w, y, 0), P(x + w, y + d, 0), P(x + w, y + d, h), P(x + w, y, h)])} style={line ? { stroke: line } : undefined} />
      <path className="am-l3 win" d={win.join(' ')} style={tint ? { stroke: tint, strokeOpacity: .35 } : undefined} />
      <path className="am-b f-t" d={pts([P(x, y, h), P(x + w, y, h), P(x + w, y + d, h), P(x, y + d, h)])}
        style={line ? { stroke: line, fill: tint ?? 'rgba(184,216,255,.26)', fillOpacity: tint ? .55 : 1 } : undefined} />
      {hl
        ? <path d={`M${rx} ${ry} V${ry - 64}`} stroke={tint ?? ACC} strokeWidth="3" strokeOpacity=".8" strokeDasharray={tint ? undefined : '2 4'} />
        : <text className="am-tag dim" x={rx} y={ry + 5} textAnchor="middle">{tag}</text>}
    </g>
  );
}
function ResView({ pick, on, has, tint }: { pick: Pick; on: string | null; has: (s: string) => boolean; tint: (spot: string) => string }) {
  const P = resP;
  const plate: [number, number][] = [[24, 0], [296, 0], [320, 24], [320, 296], [296, 320], [24, 320], [0, 296], [0, 24]];
  const faces: [[number, number], [number, number]][] = [[[320, 24], [320, 296]], [[320, 296], [296, 320]], [[296, 320], [24, 320]]];
  const [yx, yy] = P(160, 160, 0);
  const trees: [number, number][] = [[14, 110], [14, 210], [110, 14], [210, 14], [306, 110], [306, 210], [110, 306], [105, 105], [215, 105], [105, 215], [230, 300], [300, 230]];
  const order = [...RES_TOWERS].sort((a, b) => a.cx + a.cy - (b.cx + b.cy));
  const [wx, wy] = P(120, 330, 0), [wx2, wy2] = P(120, 400, 0);
  return (
    <>
      {faces.map(([a, b], i) => <path key={i} className="am-hull body" d={pts([P(...a, 0), P(...b, 0), P(...b, -26), P(...a, -26)])} />)}
      <path className="am-hull top" d={pts(plate.map(([x, y]) => P(x, y, 0)))} />
      <path className="am-l3" d={pts(([[30, 12], [290, 12], [308, 30], [308, 290], [290, 308], [30, 308], [12, 290], [12, 30]] as [number, number][]).map(([x, y]) => P(x, y, 0)))} />
      <path className="am-road" d={`${seg(P(160, 6), P(160, 160))} ${seg(P(6, 160), P(160, 160))} ${seg(P(160, 160), P(314, 314))}`} />
      <path className="am-l2" strokeDasharray="4 5" d={`${seg([wx, wy], [wx2, wy2])}`} />
      <text className="am-tag" x={wx2 - 10} y={wy2 + 6} textAnchor="end">← COMMAND</text>
      {trees.map(([x, y]) => { const [a, b] = P(x, y, 0); return <circle key={`${x}-${y}`} cx={a} cy={b} r="5" fill="url(#amLeaf)" stroke="rgba(160,220,190,.35)" />; })}
      {/* 가운데 정원 — 05 개인실 */}
      <ellipse className={`am-cell yard${has('quarters') ? '' : ' empty'}${on === 'quarters' ? ' on' : ''}`} cx={yx} cy={yy} rx="76" ry="44"
        onClick={has('quarters') ? () => pick('quarters') : undefined} />
      <ellipse cx={yx} cy={yy} rx="64" ry="36" fill="url(#amLeaf)" pointerEvents="none" />
      {order.map(t => {
        const live = !!t.key && has(t.key);
        const sel = !!t.key && on === t.key;
        const body = <Tower cx={t.cx} cy={t.cy} h={t.h} tag={t.tag} hl={!!t.key} tint={sel ? tint(t.key!) : undefined} />;
        return t.key
          ? <g key={t.tag} className={`am-hlg${live ? '' : ' empty'}${sel ? ' on' : ''}`} onClick={live ? () => pick(t.key!) : undefined}>{body}</g>
          : <React.Fragment key={t.tag}>{body}</React.Fragment>;
      })}
    </>
  );
}

/* ───────── 표시 (번호 · 이름) ───────── */
function Marks({ list, on, pick, tint }: { list: ArchMapNode[]; on: string | null; pick: Pick; tint: (spot: string) => string }) {
  return (
    <>
      {list.map(n => {
        const s = AEGIS_SPOTS[n.spot];
        if (!s) return null;
        const act = on === n.spot;
        const cls = `${s.big ? 'am-big' : n.code ? 'am-mk' : 'am-pl'}${act ? ' on' : ''}`;
        if (s.big) {
          const c = act ? tint(n.spot) : undefined;
          return (
            <g key={n.id} className={cls} transform={`translate(${s.lx} ${s.ly})`} onClick={() => pick(n.spot)}>
              <rect className="am-hit" x="-110" y="-130" width="220" height="140" />
              <rect className="am-dia" x="-7" y="-7" width="14" height="14" transform="rotate(45)" style={c ? { fill: c, stroke: c } : undefined} />
              <path className="am-l2" d="M0 -14 V-36" />
              <text className="am-en" y="-82" textAnchor="middle" style={c ? { fill: c } : undefined}>{n.en}</text>
              <text className="am-nm" y="-50" textAnchor="middle">{n.name}</text>
            </g>
          );
        }
        if (s.kind) {
          return (
            <g key={n.id} className={`am-hq${act ? ' on' : ''}`} onClick={() => pick(n.spot)}>
              <HqLabel n={n} x={s.lx} y={s.ly} kind={s.kind} icon={s.icon} />
              {s.lx2 !== undefined && <HqLabel n={n} x={s.lx2} y={s.ly2 ?? s.ly} kind={s.kind} icon={s.icon} />}
            </g>
          );
        }
        const mark = n.code ? <rect className="am-dia" x="-6" y="-6" width="12" height="12" transform="rotate(45)" /> : <circle r="5" />;
        if (s.dir === 'c') {
          return (
            <g key={n.id} className={cls} transform={`translate(${s.lx} ${s.ly})`} onClick={() => pick(n.spot)}>
              {mark}
              {n.code && <text className="am-code" y="-16" textAnchor="middle">{n.code}</text>}
              <text className="am-nm" y="34" textAnchor="middle">{n.name}</text>
            </g>
          );
        }
        const end = s.dir === 'l';
        return (
          <g key={n.id} className={cls} transform={`translate(${s.lx} ${s.ly})`} onClick={() => pick(n.spot)}>
            {mark}
            <text className="am-nm" x={end ? -16 : 16} y="0" textAnchor={end ? 'end' : 'start'} dy=".35em">
              {n.code && <tspan className="am-code">{n.code}</tspan>}
              <tspan dx={n.code ? 10 : 0}>{n.name}</tspan>
            </text>
          </g>
        );
      })}
    </>
  );
}

/** 이름에 그 낱말이 들어간 캐릭터 (영문은 낱말 단위로) */
function findChar(chars: Character[], n: ArchMapNode): Character | undefined {
  const ko = n.name.replace(/\s*숙소동\s*$/, '').trim();
  const en = n.en.trim();
  const enRe = en ? new RegExp(`(^|[^a-z])${en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'i') : null;
  return chars.find(c => {
    const hay = `${c.name} ${c.sub}`;
    return (!!ko && hay.includes(ko)) || (!!enRe && enRe.test(hay));
  });
}

export function AegisMap({ nodes, caption }: { nodes: ArchMapNode[]; caption?: string }) {
  const [view, setView] = useState<View>('site');
  const [last, setLast] = useState<AegisView>('hq');     // 섬 지도로 돌아갈 때 줄어들 기준
  const [sel, setSel] = useState<string | null>(null);  // 고른 자리(spot)
  const [chars] = useLocalList<Character>('ohome.chars.v1', CHAR_SEED);

  const listOf = (v: AegisView) => nodes
    .filter(n => AEGIS_SPOTS[n.spot]?.view === v)
    .sort((a, b) => SPOT_ORDER.indexOf(a.spot) - SPOT_ORDER.indexOf(b.spot));
  const list = view === 'site' ? [] : listOf(view);
  const cur = list.find(n => n.spot === sel) ?? list[0];
  const on = cur?.spot ?? null;
  const has = (spot: string) => nodes.some(n => n.spot === spot);
  const pick: Pick = spot => setSel(spot);
  const go = (v: View) => { if (v !== 'site') setLast(v); setView(v); setSel(null); };
  /** 숙소동 강조 색 — 직접 정한 색 → 같은 이름 캐릭터의 대표색 → 기본 하늘색 */
  const colorOf = (n?: ArchMapNode) => (n ? (n.color?.trim() || findChar(chars, n)?.color || ACC) : ACC);
  const tint = (spot: string) => colorOf(nodes.find(n => n.spot === spot));
  const curColor = cur && AEGIS_SPOTS[cur.spot]?.big ? colorOf(cur) : null;

  // 각 장의 자리 — 보이는 장은 제자리, 안 보이는 장은 확대 · 축소 · 옆으로 밀려 숨는다
  const style = (v: View): React.CSSProperties => {
    if (v === view) return { opacity: 1, transform: 'none', transformOrigin: v === 'site' ? ORIGIN[last] : ORIGIN[v as AegisView] };
    if (v === 'site') return { opacity: 0, transform: 'scale(2.6)', transformOrigin: ORIGIN[view as AegisView] };
    if (view === 'site') return { opacity: 0, transform: 'scale(.35)', transformOrigin: ORIGIN[v] };
    return { opacity: 0, transform: `translateX(${v === 'hq' ? -36 : 36}%)`, transformOrigin: '50% 50%' };
  };
  const layer = (v: View, body: React.ReactNode, label: string) => (
    <div className={`am-v${v === view ? ' cur' : ''}`} style={style(v)} aria-hidden={v !== view}>
      <svg className="am-svg" viewBox={`0 0 1000 ${v === 'hq' ? HQ_H : 1000}`} role="img" aria-label={label}>
        <Defs />
        <rect width="1000" height={v === 'hq' ? HQ_H : 1000} fill="url(#amGrid)" />
        {body}
      </svg>
    </div>
  );

  return (
    <div className="am">
      <div className="am-l">
        <div className="ar-pn am-frame">
          <div className="am-hd">
            <span>
              {view === 'site' ? (caption || 'THE AEGIS · ARTIFICIAL ISLAND')
                : <><button type="button" className="am-crumb" onClick={() => go('site')}>‹ THE AEGIS</button><b> / {SITE[view].en}</b></>}
            </span>
            <span>{view === 'site' ? 'OPEN SEA — UNDISCLOSED' : SITE[view].hd}</span>
          </div>
          <div className={`am-stage v-${view}`}>
            {layer('site', <SiteView go={go} />, '아이기스 섬 지도')}
            {layer('hq', <><HqView />
              {listOf('hq').map(n => {
                const s = AEGIS_SPOTS[n.spot];
                return s.cell ? <path key={n.id} d={s.cell} className={`am-cell${view === 'hq' && on === n.spot ? ' on' : ''}`} onClick={() => pick(n.spot)} /> : null;
              })}
              <Marks list={listOf('hq')} on={view === 'hq' ? on : null} pick={pick} tint={tint} /></>, '통합 지휘본부 층별 지도')}
            {layer('res', <><ResView pick={pick} on={view === 'res' ? on : null} has={has} tint={tint} />
              <Marks list={listOf('res')} on={view === 'res' ? on : null} pick={pick} tint={tint} /></>, '요원 거주구역 지도')}
            {/* 홀로그램 겹 — 주사선 · 훑는 빛 · 모서리 · 도면 제목 */}
            <div className="am-holo" aria-hidden="true">
              <i className="am-scan" />
              <div className="am-tb">
                <b>{view === 'site' ? 'THE AEGIS' : SITE[view].en} — {view === 'site' ? 'AXONOMETRIC VIEW' : SITE[view].view}</b>
                <span>SCALE {view === 'site' ? '1:20000' : SITE[view].scale}</span>
                <span>CAD REF {view === 'site' ? 'AG-00' : SITE[view].ref} · HOLOGRAPHIC MODEL</span>
              </div>
            </div>
            {view === 'hq' && <button type="button" className="am-arrow r" onClick={() => go('res')} aria-label="요원 거주구역으로"><span>QUARTERS</span><i>›</i></button>}
            {view === 'res' && <button type="button" className="am-arrow l" onClick={() => go('hq')} aria-label="통합 지휘본부로"><i>‹</i><span>COMMAND</span></button>}
          </div>
        </div>

        {view === 'site' ? (
          <div className="am-legend am-go">
            <button type="button" onClick={() => go('hq')}><em>A</em>{SITE.hq.ko}</button>
            <button type="button" onClick={() => go('res')}><em>R</em>{SITE.res.ko}</button>
          </div>
        ) : (
          <div className="am-legend" role="tablist" aria-label="시설 목록">
            {list.map(n => (
              <button key={n.id} type="button" role="tab" aria-selected={n.spot === on} className={`${n.spot === on ? 'on' : ''}${n.code ? '' : ' pl'}`} onClick={() => pick(n.spot)}>
                <em>{n.code || '·'}</em>{n.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {view === 'site' ? (
        <article className="ar-pn ar-card am-card" key="site">
          <div className="ar-c-k"><span>SITE · OVERVIEW</span><span>OPEN SEA</span></div>
          <h3><span className="ar-silver">THE AEGIS</span><small>아크 본부 · 인공섬</small></h3>
          <div className="am-body"><p>표식을 누르면 시설 내부 지도로 들어갑니다.</p></div>
          <div className="am-gobox">
            {(['hq', 'res'] as const).map(k => (
              <button key={k} type="button" onClick={() => go(k)}><small>{SITE[k].code}</small><b>{SITE[k].en}</b><span>{SITE[k].ko} ›</span></button>
            ))}
          </div>
          <span className="bg" aria-hidden="true">00</span>
        </article>
      ) : cur && (
        <article className="ar-pn ar-card am-card" key={cur.id} style={curColor ? { borderTop: `2px solid ${curColor}` } : undefined}>
          <div className="ar-c-k"><span>{cur.code ? `SECTOR · ${cur.code}` : 'LOCATION'}</span><span>{cur.zone}</span></div>
          <h3>
            <span className="ar-silver">{cur.en}</span>
            <small>{curColor && <i className="am-swatch" style={{ background: curColor }} />}{[cur.name, cur.alias].filter(Boolean).join(' · ')}</small>
          </h3>
          {cur.body && <div className="am-body"><Paras text={cur.body} /></div>}
          {cur.quote && cur.quote.text && (
            <div className="ar-quote am-quote"><div><small>FIELD NOTE</small>{cur.quote.text}{cur.quote.cite && <cite>— {cur.quote.cite}</cite>}</div></div>
          )}
          {cur.note && <p className="am-note">※ {cur.note}</p>}
          <span className="bg" aria-hidden="true">{cur.code || (view === 'hq' ? 'A' : 'R')}</span>
        </article>
      )}
    </div>
  );
}
