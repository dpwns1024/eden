'use client';
/**
 * 아이기스 지도 (v2.0 사용자 요청 · lib/aegisMap.ts) — 세 장.
 *  1) 섬 전체 — 세계지도처럼 위에서 본 섬 실루엣. 통합 지휘본부 · 요원 거주구역 두 곳의 표식만. 누르면 그 건물로 확대되며 넘어간다.
 *  2) 지휘본부 — 층별 안내도처럼 간략히 꾸민 단면 (옥상 왼쪽 끝 훈련 돔 · 한가운데 코어 탑, 그 위 상공의 하늘정원부터 지하 B2까지). 옆 화살표로 거주구역으로.
 *  3) 거주구역 — 입체로 본 숙소동들. 양 끝의 이브 · 에덴 숙소동을 강조 — 고르면 그 캐릭터의 대표색으로 빛난다.
 * 칸이나 표시를 누르면(또는 아래 목록) 그 시설이 지도 아래(PC는 오른쪽) 카드로 나온다.
 */
import React, { useState } from 'react';
import { AEGIS_SPOTS, SPOT_ORDER, RES_TOWERS, resP, type AegisView, type ArchMapNode } from '@/lib/aegisMap';
import { useLocalList } from '@/lib/postStore';
import { CHAR_SEED, type Character } from '@/lib/charStore';

type View = 'site' | AegisView;
type Pick = (spot: string) => void;

/** 두 건물의 이름 — 섬 지도 · 머리줄 · 목록이 같이 쓴다 */
const SITE: Record<AegisView, { x: number; y: number; code: string; en: string; ko: string; hd: string }> = {
  hq: { x: 440, y: 470, code: 'SECTOR A · 01', en: 'ARCH COMMAND', ko: '통합 지휘본부', hd: 'B2 – 10F · ROOF' },
  res: { x: 600, y: 505, code: 'SECTOR R · 02', en: 'AGENT QUARTERS', ko: '요원 거주구역', hd: '7 BLOCKS' },
};
/** 확대 · 축소 모션의 기준점(%) = 섬 지도에서 두 건물의 자리 */
const ORIGIN: Record<AegisView, string> = { hq: `${SITE.hq.x / 10}% ${SITE.hq.y / 10}%`, res: `${SITE.res.x / 10}% ${SITE.res.y / 10}%` };
const ACC = '#b8d8ff';

function Paras({ text }: { text: string }) {
  return <>{text.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}</>;
}

const Defs = () => (
  <defs>
    <pattern id="amGrid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="rgba(190,208,228,.05)" /></pattern>
        <pattern id="amHatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V7" stroke="rgba(255,150,160,.22)" /></pattern>
    <pattern id="amLeaf" width="11" height="11" patternUnits="userSpaceOnUse"><circle cx="5.5" cy="5.5" r="1.5" fill="rgba(160,220,190,.32)" /></pattern>
    <pattern id="amSoil" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r="1" fill="rgba(190,208,228,.07)" /><circle cx="10" cy="11" r="1" fill="rgba(190,208,228,.05)" /></pattern>
    <linearGradient id="amSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="rgba(120,170,230,.16)" /><stop offset="1" stopColor="rgba(120,170,230,.02)" /></linearGradient>
    <radialGradient id="amGlow"><stop offset="0" stopColor="rgba(184,216,255,.35)" /><stop offset="1" stopColor="rgba(184,216,255,0)" /></radialGradient>
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
/** 건물 표식 — 겹 원 · 눈금 · 마름모. 지휘본부는 이름이 위, 거주구역은 아래 */
function SiteMark({ k, go }: { k: AegisView; go: (v: AegisView) => void }) {
  const s = SITE[k], up = k === 'hq';
  const ty = (v: number) => (up ? -v : v);
  return (
    <g className="am-node" transform={`translate(${s.x} ${s.y})`} onClick={() => go(k)} role="button" aria-label={`${s.ko} 지도 열기`}>
      <rect className="am-hit" x="-150" y={up ? -160 : -60} width="300" height="220" />
      <circle r="62" fill="url(#amGlow)" />
      <circle className="am-mring dash" r="40" />
      <circle className="am-mring" r="27" />
      <path className="am-mtick" d="M0 -50 V-34 M0 34 V50 M-50 0 H-34 M34 0 H50" />
      <rect className="am-mcore" x="-10" y="-10" width="20" height="20" transform="rotate(45)" />
      <rect className="am-mdot" x="-3.5" y="-3.5" width="7" height="7" transform="rotate(45)" />
      <path className="am-mtick" d={`M0 ${ty(56)} V${ty(74)}`} />
      <text className="am-mcode" y={up ? -148 : 158} textAnchor="middle">{s.code}</text>
      <text className="am-zl" y={up ? -112 : 112} textAnchor="middle">{s.en}</text>
      <text className="am-zs" y={up ? -84 : 140} textAnchor="middle">{s.ko}</text>
    </g>
  );
}
function SiteView({ go }: { go: (v: AegisView) => void }) {
  const { hq, res } = SITE;
  const blocks: [number, number][] = [[-30, -30], [0, -30], [30, -30], [-30, 0], [30, 0], [-30, 30], [30, 30]];
  return (
    <>
      {[200, 400, 600, 800].map(v => <path key={v} className="am-l3" d={`M0 ${v} H1000 M${v} 0 V1000`} />)}
      <ellipse cx="520" cy="500" rx="360" ry="260" fill="url(#amGlow)" opacity=".35" />
      <path d={ISLAND} className="am-land" />
      {ISLETS.map(d => <path key={d} d={d} className="am-land" />)}
      {/* 두 건물의 터 */}
      <rect className="am-lot" x={hq.x - 44} y={hq.y - 42} width="88" height="84" rx="6" />
      {blocks.map(([dx, dy]) => <rect key={`${dx}${dy}`} className="am-lot" x={res.x + dx - 10} y={res.y + dy - 10} width="20" height="20" />)}
      <SiteMark k="hq" go={go} />
      <SiteMark k="res" go={go} />
      <text className="am-tag dim" x="24" y="976">AEGIS · MOBILE CITADEL</text>
      <g transform="translate(930 90)"><circle className="am-l2" r="24" /><path d="M0 -19 L5 0 L0 19 L-5 0 Z" fill="rgba(184,216,255,.6)" /><text className="am-tag" y="-32" textAnchor="middle">N</text></g>
    </>
  );
}

/* ───────── 2) 지휘본부 — 층별 안내도 ───────── */
/** 방 그림 기호 — 가운데 (0,0), 한 변 약 24 */
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
  fish: 'M-11 0 Q-3 -9 6 0 Q-3 9 -11 0 Z M6 0 L11 -5 V5 Z M-5 -1 V-1.5',
  target: 'M10 0 A10 10 0 1 1 -10 0 A10 10 0 1 1 10 0 Z M4 0 A4 4 0 1 1 -4 0 A4 4 0 1 1 4 0 Z',
};
/** 층 — [윗선, 아랫선, 이름표] */
const LEVELS: [number, number, string][] = [
  [250, 326, '9–10F'], [326, 402, '7–8F'], [402, 462, '6F'], [462, 538, '4–5F'], [538, 598, '3F'],
  [598, 658, '2F'], [658, 714, '1F'], [714, 784, 'B1'], [784, 854, 'B2'],
];
/** 방 상자 — 칸 안쪽으로 6 들여서 */
const ROOMS: [number, number, number, number][] = [
  [140, 492, 250, 326], [548, 852, 250, 326], [140, 492, 326, 402], [548, 852, 326, 402], [140, 492, 402, 462], [548, 852, 402, 462],
  [140, 492, 462, 538], [548, 852, 462, 538], [140, 492, 538, 598], [548, 852, 538, 598], [140, 316, 598, 658], [316, 492, 598, 658],
  [548, 852, 598, 658], [140, 492, 658, 714], [548, 852, 658, 714], [140, 492, 714, 784], [548, 900, 714, 784], [140, 492, 784, 854], [548, 852, 784, 854],
];
const plaque = (x: number, y: number) => `M${x - 52} ${y} L${x - 40} ${y - 17} H${x + 40} L${x + 52} ${y} L${x + 40} ${y + 17} H${x - 40} Z`;
function stairs(t: number, b: number) {
  const n = 5, w = 40 / n, h = (b - t - 10) / n;
  let d = `M856 ${b - 5}`;
  for (let i = 0; i < n; i++) d += ` h${w} v${-h}`;
  return d;
}
function HqView() {
  const wave = 'M0 730 ' + Array.from({ length: 20 }, () => 'q12.5 -6 25 0 t25 0').join(' ');
  return (
    <>
      {/* 바다 · 섬 */}
      <rect x="0" y="730" width="1000" height="270" fill="url(#amSea)" />
      <path className="am-sea" d={wave} />
      <rect x="120" y="714" width="800" height="286" className="am-earth" />
      <rect x="120" y="714" width="800" height="286" fill="url(#amSoil)" />
      <path className="am-line" d="M100 714 H940 M120 714 V1000 M920 714 V1000" />
      <text className="am-tag" x="960" y="744" textAnchor="middle" dominantBaseline="central">SEA</text>

      {/* 건물 — 굵은 외곽선 + 층 바닥 */}
      <rect className="am-bldg" x="140" y="250" width="760" height="604" />
      {ROOMS.map(([x0, x1, y0, y1]) => <rect key={`${x0}-${y0}`} className="am-room" x={x0 + 6} y={y0 + 6} width={x1 - x0 - 12} height={y1 - y0 - 12} rx="6" />)}
      <rect x="146" y="544" width="340" height="48" rx="6" fill="url(#amHatch)" />
      <rect x="554" y="544" width="292" height="48" rx="6" fill="url(#amHatch)" />
      <rect x="770" y="606" width="74" height="44" rx="6" fill="url(#amLeaf)" />
      <path className="am-glass" d="M900 724 Q946 749 900 774 Z" />
      <rect x="760" y="720" width="134" height="58" fill="url(#amLeaf)" opacity=".7" />
      {LEVELS.map(([t]) => <path key={t} className="am-slab" d={`M140 ${t} H900`} />)}
      <path className="am-slab" d="M120 854 H920" />
      {/* 계단 (2F~10F) */}
      <path className="am-slab" d="M852 250 V714" />
      {LEVELS.slice(0, 6).map(([t, b]) => <path key={t} className="am-stair" d={stairs(t, b)} />)}
      {/* 가운데 코어 (승강로) */}
      <rect className="am-core" x="492" y="250" width="56" height="604" />
      {LEVELS.map(([t, b]) => (
        <path key={t} className="am-l2" d={`M512 ${(t + b) / 2 - 3} l8 -8 l8 8 M512 ${(t + b) / 2 + 3} l8 8 l8 -8`} />
      ))}
      {/* 1F 로비 */}
      <text className="am-room-t" x="164" y="686" dominantBaseline="central">LOBBY</text>
      <path className="am-l2" d="M670 714 V690 H730 V714" />
      <text className="am-room-t dim" x="164" y="749" dominantBaseline="central">MECH.</text>
      {/* 층 이름표 */}
      {[[250, 250, 'ROOF'] as const, ...LEVELS].map(([t, b, n]) => {
        const y = n === 'ROOF' ? 222 : (t + b) / 2;
        return (
          <g key={n}>
            <path className="am-plq" d={plaque(72, y)} />
            <text className="am-plqt" x="72" y={y} textAnchor="middle" dominantBaseline="central">{n}</text>
          </g>
        );
      })}

      {/* 옥상 — 왼쪽 끝 훈련 돔 */}
      <path className="am-bldg" d="M146 250 A84 84 0 0 1 314 250 Z" />
      <path className="am-l2" d="M230 166 V250 M156 214 Q230 232 304 214 M178 186 Q230 200 282 186" />
      {/* 옥상 — 오른쪽 정원 난간 */}
      <path className="am-l2" d="M700 250 V232 H880 V250 M730 232 V250 M760 232 V250 M790 232 V250 M820 232 V250 M850 232 V250" />
      <rect x="704" y="238" width="172" height="10" fill="url(#amLeaf)" />
      {/* 옥상 — 가운데 코어 탑 + 위 상공의 하늘정원 */}
      <path className="am-bldg" d="M506 184 H534 L552 250 H488 Z" />
      <ellipse className="am-bldg" cx="520" cy="176" rx="58" ry="9" />
      <circle cx="520" cy="154" r="24" fill="url(#amGlow)" />
      <path className="am-acc" d="M520 142 V168 M510 154 H530" />
      <path className="am-beam" d="M506 140 V166 M534 140 V166" />
      <circle cx="520" cy="88" r="88" fill="url(#amGlow)" opacity=".55" />
      <path className="am-hull" d="M400 58 Q520 36 640 58 Q604 116 520 138 Q436 116 400 58 Z" />
      <path className="am-line" d="M440 56 V32 M432 40 H448 M460 52 V38 M586 52 V34 M578 42 H594 M606 56 V40" />
      <path className="am-l2" d="M502 48 V34 H538 V48 M496 34 L520 22 L544 34" />
      <text className="am-tag dim" x="388" y="40" textAnchor="end" dominantBaseline="central">ALT 1,200m</text>
    </>
  );
}

/* ───────── 3) 거주구역 — 입체 ───────── */
const pts = (a: [number, number][]) => 'M' + a.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L') + ' Z';
const seg = (a: [number, number], b: [number, number]) => `M${a[0].toFixed(1)} ${a[1].toFixed(1)} L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
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
        if (s.room) {
          return (
            <g key={n.id} className={`${cls} am-rl`} transform={`translate(${s.lx} ${s.ly})`} onClick={() => pick(n.spot)}>
              {s.icon && ICONS[s.icon] && <path className="am-ico" d={ICONS[s.icon]} transform="translate(12 0)" />}
              <text x={s.icon ? 34 : 0} y="0" dominantBaseline="central">
                {n.code && <tspan className="am-code" dominantBaseline="central">{n.code}</tspan>}
                <tspan className="am-nm" dx={n.code ? 9 : 0} dominantBaseline="central">{n.name}</tspan>
              </text>
              {/* 코어 양쪽을 다 쓰는 층 — 오른쪽 칸에는 영문 이름을 작게 */}
              {s.cell?.includes(' M') && <text className="am-room-sub" x={566 - s.lx} y="0" dominantBaseline="central">{n.en}</text>}
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
            <text x={end ? -16 : 16} y="0" textAnchor={end ? 'end' : 'start'} dominantBaseline="central">
              {n.code && <tspan className="am-code" dominantBaseline="central">{n.code}</tspan>}
              <tspan className="am-nm" dx={n.code ? 10 : 0} dominantBaseline="central">{n.name}</tspan>
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
      <svg className="am-svg" viewBox="0 0 1000 1000" role="img" aria-label={label}>
        <Defs />
        <rect width="1000" height="1000" fill="url(#amGrid)" />
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
