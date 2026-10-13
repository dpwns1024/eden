'use client';
/**
 * 아이기스 지도 (v2.0 사용자 요청 · lib/aegisMap.ts) — 세 장.
 *  1) 섬 전체 — 세계지도처럼 위에서 본 섬 실루엣 + 이어진 점. 본부 건물 · 숙소 단지 두 곳만. 누르면 그 건물로 확대되며 넘어간다.
 *  2) 본부 — 한 건물의 층별 단면 (코어 탑 위 하늘정원부터 바닷속 B5까지). 옆 화살표로 숙소 단지로.
 *  3) 숙소 단지 — 입체로 본 숙소동들. 이브 · 에덴 숙소동을 강조.
 * 칸이나 표시를 누르면(또는 아래 목록) 그 시설이 지도 아래(PC는 오른쪽) 카드로 나온다.
 */
import React, { useState } from 'react';
import { AEGIS_SPOTS, SPOT_ORDER, RES_TOWERS, resP, type AegisView, type ArchMapNode } from '@/lib/aegisMap';

type View = 'site' | AegisView;
type Pick = (spot: string) => void;

/** 섬 지도에서 두 건물의 자리 — 확대 · 축소 모션의 기준점(%) */
const ORIGIN: Record<AegisView, string> = { hq: '40% 47%', res: '65% 51%' };

function Paras({ text }: { text: string }) {
  return <>{text.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}</>;
}

const Defs = () => (
  <defs>
    <pattern id="amGrid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="rgba(190,208,228,.05)" /></pattern>
    <pattern id="amFl" y="300" width="10" height="24" patternUnits="userSpaceOnUse"><path d="M0 23.5H10" stroke="rgba(220,230,240,.07)" /></pattern>
    <pattern id="amHatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V7" stroke="rgba(255,150,160,.22)" /></pattern>
    <pattern id="amLeaf" width="11" height="11" patternUnits="userSpaceOnUse"><circle cx="5.5" cy="5.5" r="1.5" fill="rgba(160,220,190,.32)" /></pattern>
    <linearGradient id="amSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="rgba(120,170,230,.16)" /><stop offset="1" stopColor="rgba(120,170,230,.02)" /></linearGradient>
    <linearGradient id="amBeam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="rgba(184,216,255,.9)" /><stop offset="1" stopColor="rgba(184,216,255,0)" /></linearGradient>
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
const DOT: Record<string, [number, number]> = {
  hq: [400, 470], res: [650, 510], harbor: [538, 646], heli: [318, 392], beacon: [742, 420],
  i1: [186, 302], i2: [842, 262], i3: [868, 648], i4: [144, 714], i5: [894, 454],
};
const LINKS: [string, string][] = [['hq', 'res'], ['hq', 'harbor'], ['res', 'harbor'], ['hq', 'heli'], ['res', 'beacon'], ['heli', 'i1'], ['beacon', 'i2'], ['beacon', 'i5'], ['harbor', 'i3'], ['harbor', 'i4'], ['res', 'i3'], ['hq', 'i4']];
const ROUTES: [string, [number, number]][] = [['i1', [0, 190]], ['i2', [1000, 150]], ['i4', [0, 840]], ['harbor', [600, 1000]], ['i3', [1000, 780]], ['i5', [1000, 470]]];
function SiteView({ go }: { go: (v: AegisView) => void }) {
  const lp = (a: [number, number], b: [number, number]) => `M${a[0]} ${a[1]} L${b[0]} ${b[1]}`;
  return (
    <>
      {/* 경위선 */}
      {[200, 400, 600, 800].map(v => <path key={v} className="am-l3" d={`M0 ${v} H1000 M${v} 0 V1000`} />)}
      <ellipse cx="520" cy="500" rx="360" ry="260" fill="url(#amGlow)" opacity=".35" />
      {/* 땅 */}
      <path d={ISLAND} className="am-land" />
      {ISLETS.map(d => <path key={d} d={d} className="am-land" />)}
      {/* 두 건물의 터 */}
      <rect className="am-lot" x="352" y="424" width="96" height="92" rx="6" />
      <circle className="am-lot" cx="400" cy="470" r="22" />
      {[[618, 478], [650, 478], [682, 478], [618, 510], [682, 510], [618, 542], [650, 542], [682, 542]].map(([x, y]) => <rect key={`${x}-${y}`} className="am-lot" x={x - 11} y={y - 11} width="22" height="22" />)}
      {/* 이어진 길 */}
      {LINKS.map(([a, b]) => <path key={a + b} className="am-link" d={lp(DOT[a], DOT[b])} />)}
      {ROUTES.map(([a, b]) => <path key={a + b[0]} className="am-link route" d={lp(DOT[a], b)} />)}
      {Object.entries(DOT).filter(([k]) => k !== 'hq' && k !== 'res').map(([k, [x, y]]) => <circle key={k} className="am-dot" cx={x} cy={y} r="5" />)}
      <text className="am-tag" x="556" y="676">HARBOR</text>

      {/* 본부 · 숙소 */}
      {([['hq', 'ARCH HQ', '본부 건물 ›', -1], ['res', 'RESIDENCE', '숙소 단지 ›', 1]] as const).map(([k, en, ko, side]) => {
        const [x, y] = DOT[k];
        // 본부는 점 위, 숙소는 점 아래에 이름 (가운데 정렬 — 폰에서 글씨가 커져도 넘치지 않게)
        const [y1, y2] = side < 0 ? [y - 52, y - 26] : [y + 56, y + 82];
        return (
          <g key={k} className="am-node" onClick={() => go(k)} role="button" aria-label={`${ko.replace(' ›', '')} 지도 열기`}>
            <circle className="am-hit" cx={x} cy={y} r="70" />
            <circle cx={x} cy={y} r="46" fill="url(#amGlow)" />
            <circle className="am-pulse" cx={x} cy={y} r="14" />
            <circle className="am-dot big" cx={x} cy={y} r="10" />
            <text className="am-zl" x={x} y={y1} textAnchor="middle">{en}</text>
            <text className="am-zs" x={x} y={y2} textAnchor="middle">{ko}</text>
          </g>
        );
      })}

      <text className="am-tag dim" x="24" y="976">AEGIS · MOBILE CITADEL</text>
      <g transform="translate(930 90)"><circle className="am-l2" r="24" /><path d="M0 -19 L5 0 L0 19 L-5 0 Z" fill="rgba(184,216,255,.6)" /><text className="am-tag" y="-32" textAnchor="middle">N</text></g>
    </>
  );
}

/* ───────── 2) 본부 — 층별 단면 ───────── */
const FLOORS: [number, string][] = [[328, '13–14F'], [376, '11–12F'], [412, '10F'], [448, '8–9F'], [484, '7F'], [520, '5–6F'], [556, '4F']];
function HqView() {
  const wave = 'M0 664 ' + Array.from({ length: 20 }, () => 'q12.5 -6 25 0 t25 0').join(' ');
  return (
    <>
      {/* 바다 · 섬 몸통 */}
      <rect x="0" y="664" width="1000" height="336" fill="url(#amSea)" />
      <path className="am-sea" d={wave} />
      <path className="am-hull body" d="M40 640 H960 V680 L995 990 H5 L40 680 Z" />
      <rect x="0" y="664" width="1000" height="326" fill="rgba(90,140,210,.07)" />
      <path className="am-sea dim" strokeDasharray="6 6" d="M40 664 H960" />
      <text className="am-tag" x="56" y="658">SEA LEVEL</text>
      <path className="am-line" d="M28 640 H972" />
      {[760, 820, 880, 940].map(y => <path key={y} className="am-l3" d={`M${40 - (y - 680) * .11} ${y} H${960 + (y - 680) * .11}`} />)}

      {/* 저층부 (1–3F) + 훈련 돔 */}
      <rect className="am-b" x="120" y="564" width="760" height="76" />
      <path className="am-l2" d="M330 589 H880 M330 614 H880 M520 640 V618 H600 V640" />
      <text className="am-tag" x="866" y="632" textAnchor="end">1–3F · LOBBY</text>
      <path className="am-b" d="M137 564 A88 88 0 0 1 313 564 Z" />
      <path className="am-l2" d="M225 476 V564 M150 530 Q225 550 300 530 M168 500 Q225 516 282 500" />

      {/* 본관 (4–14F) */}
      <rect className="am-b" x="360" y="300" width="400" height="264" />
      <rect x="360" y="300" width="400" height="264" fill="url(#amFl)" />
      <rect x="360" y="468" width="400" height="24" fill="url(#amHatch)" stroke="rgba(255,140,150,.5)" />
      <rect x="360" y="492" width="400" height="48" fill="rgba(184,216,255,.06)" />
      <rect x="640" y="498" width="114" height="36" fill="url(#amLeaf)" />
      <path className="am-line" d="M360 348 H760 M360 396 H760 M360 420 H760 M360 468 H760 M360 492 H760 M360 540 H760 M560 300 V348 M560 540 V564" />
      <path className="am-line" d="M352 300 H768" />
      {FLOORS.map(([y, t]) => <text key={t} className="am-tag" x="774" y={y}>{t}</text>)}

      {/* 코어 탑 + 위 상공의 하늘정원 (처음 지도 모양) */}
      <path className="am-b" d="M548 193 H572 L590 300 H530 Z" />
      <path className="am-l2" d="M560 196 V300 M538 250 H582" />
      <ellipse className="am-b" cx="560" cy="184" rx="58" ry="9" />
      <path className="am-acc" d="M560 154 V176 M550 164 H570" />
      <circle cx="560" cy="164" r="22" fill="url(#amGlow)" />
      <path className="am-beam" d="M546 148 V172 M574 148 V172" />
      <circle cx="560" cy="96" r="84" fill="url(#amGlow)" opacity=".55" />
      <path className="am-hull" d="M440 64 Q560 42 680 64 Q646 124 560 146 Q474 124 440 64 Z" />
      <path className="am-line" d="M470 62 V38 M462 46 H478 M490 58 V44 M626 58 V40 M618 48 H634 M646 62 V46" />
      <path className="am-l2" d="M542 54 V40 H578 V54 M536 40 L560 28 L584 40" />
      <text className="am-tag dim" x="430" y="40" textAnchor="end">ALT 1,200m</text>
      <text className="am-tag dim" x="604" y="290">CORE TOWER</text>

      {/* 지하 (바닷속) */}
      <path className="am-shaft" d="M540 640 V812 M580 640 V812" />
      <path className="am-l2" d="M580 688 H600" />
      <path className="am-glass" d="M600 664 H940 Q985 688 940 712 H600 Z" />
      <rect x="610" y="670" width="320" height="36" fill="url(#amLeaf)" opacity=".7" />
      <rect className="am-b" x="300" y="812" width="460" height="72" />
      <rect className="am-acc" x="312" y="824" width="436" height="48" />
      <text className="am-tag" x="60" y="692">B1</text>
      <text className="am-tag dim" x="60" y="766">B2–B4</text>
      <text className="am-tag" x="60" y="852">B5</text>
    </>
  );
}

/* ───────── 3) 숙소 단지 — 입체 ───────── */
const pts = (a: [number, number][]) => 'M' + a.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L') + ' Z';
const seg = (a: [number, number], b: [number, number]) => `M${a[0].toFixed(1)} ${a[1].toFixed(1)} L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
function Tower({ cx, cy, h, tag, hl }: { cx: number; cy: number; h: number; tag: string; hl: boolean }) {
  const x = cx - 32, y = cy - 32, w = 64, d = 64, P = resP;
  const win: string[] = [];
  for (let z = 14; z < h - 4; z += 14) win.push(seg(P(x, y + d, z), P(x + w, y + d, z)), seg(P(x + w, y, z), P(x + w, y + d, z)));
  const [rx, ry] = P(cx, cy, h);
  return (
    <g className={hl ? 'am-tw hl' : 'am-tw'}>
      <path className="am-b f-l" d={pts([P(x, y + d, 0), P(x + w, y + d, 0), P(x + w, y + d, h), P(x, y + d, h)])} />
      <path className="am-b f-r" d={pts([P(x + w, y, 0), P(x + w, y + d, 0), P(x + w, y + d, h), P(x + w, y, h)])} />
      <path className="am-l3 win" d={win.join(' ')} />
      <path className="am-b f-t" d={pts([P(x, y, h), P(x + w, y, h), P(x + w, y + d, h), P(x, y + d, h)])} />
      {hl
        ? <rect x={rx - 2} y={ry - 64} width="4" height="64" fill="url(#amBeam)" />
        : <text className="am-tag dim" x={rx} y={ry + 5} textAnchor="middle">{tag}</text>}
    </g>
  );
}
function ResView({ pick, on, has }: { pick: Pick; on: string | null; has: (s: string) => boolean }) {
  const P = resP;
  const plate: [number, number][] = [[24, 0], [296, 0], [320, 24], [320, 296], [296, 320], [24, 320], [0, 296], [0, 24]];
  const faces: [[number, number], [number, number]][] = [[[320, 24], [320, 296]], [[320, 296], [296, 320]], [[296, 320], [24, 320]]];
  const [yx, yy] = P(160, 160, 0);
  const trees: [number, number][] = [[14, 110], [14, 210], [110, 14], [210, 14], [306, 110], [306, 210], [110, 306], [210, 306], [105, 105], [215, 105], [105, 215], [215, 215]];
  const order = [...RES_TOWERS].sort((a, b) => a.cx + a.cy - (b.cx + b.cy));
  const [hx, hy] = P(-60, 160, 0), [hx2, hy2] = P(0, 160, 0);
  return (
    <>
      {/* 땅 */}
      {faces.map(([a, b], i) => <path key={i} className="am-hull body" d={pts([P(...a, 0), P(...b, 0), P(...b, -26), P(...a, -26)])} />)}
      <path className="am-hull top" d={pts(plate.map(([x, y]) => P(x, y, 0)))} />
      <path className="am-l3" d={pts(([[30, 12], [290, 12], [308, 30], [308, 290], [290, 308], [30, 308], [12, 290], [12, 30]] as [number, number][]).map(([x, y]) => P(x, y, 0)))} />
      <path className="am-road" d={`${seg(P(160, 6), P(160, 314))} ${seg(P(6, 160), P(314, 160))}`} />
      <path className="am-l2" strokeDasharray="4 5" d={seg([hx, hy], [hx2, hy2])} />
      <text className="am-tag" x={hx - 8} y={hy - 8} textAnchor="end">← HQ</text>
      {trees.map(([x, y]) => { const [a, b] = P(x, y, 0); return <circle key={`${x}-${y}`} cx={a} cy={b} r="5" fill="url(#amLeaf)" stroke="rgba(160,220,190,.35)" />; })}
      {/* 가운데 정원 — 05 개인실 */}
      <ellipse className={`am-cell yard${has('quarters') ? '' : ' empty'}${on === 'quarters' ? ' on' : ''}`} cx={yx} cy={yy} rx="76" ry="44"
        onClick={has('quarters') ? () => pick('quarters') : undefined} />
      <ellipse cx={yx} cy={yy} rx="64" ry="36" fill="url(#amLeaf)" pointerEvents="none" />
      {/* 숙소동 */}
      {order.map(t => {
        const live = !!t.key && has(t.key);
        const body = <Tower cx={t.cx} cy={t.cy} h={t.h} tag={t.tag} hl={!!t.key} />;
        return t.key
          ? <g key={t.tag} className={`am-hlg${live ? '' : ' empty'}${on === t.key ? ' on' : ''}`} onClick={live ? () => pick(t.key!) : undefined}>{body}</g>
          : <React.Fragment key={t.tag}>{body}</React.Fragment>;
      })}
    </>
  );
}

/* ───────── 표시 (번호 · 이름) ───────── */
function Marks({ list, on, pick }: { list: ArchMapNode[]; on: string | null; pick: Pick }) {
  return (
    <>
      {list.map(n => {
        const s = AEGIS_SPOTS[n.spot];
        if (!s) return null;
        const act = on === n.spot ? ' on' : '';
        if (s.big) {
          return (
            <g key={n.id} className={`am-big${act}`} transform={`translate(${s.lx} ${s.ly})`} onClick={() => pick(n.spot)}>
              <rect x="-6" y="-6" width="12" height="12" transform="rotate(45)" />
              <text className="am-en" y="-18" textAnchor="middle">{n.en}</text>
              <text className="am-nm" y="30" textAnchor="middle">{n.name}</text>
            </g>
          );
        }
        const end = s.dir === 'l';
        return (
          <g key={n.id} className={`${n.code ? 'am-mk' : 'am-pl'}${act}`} transform={`translate(${s.lx} ${s.ly})`} onClick={() => pick(n.spot)}>
            {n.code ? <rect x="-6" y="-6" width="12" height="12" transform="rotate(45)" /> : <circle r="5" />}
            {n.code && <text className="am-code" x={end ? -16 : 16} y="7" textAnchor={end ? 'end' : 'start'}>{n.code}</text>}
            <text className="am-nm" x={(end ? -1 : 1) * (n.code ? 46 : 14)} y="6" textAnchor={end ? 'end' : 'start'}>{n.name}</text>
          </g>
        );
      })}
    </>
  );
}

export function AegisMap({ nodes, caption }: { nodes: ArchMapNode[]; caption?: string }) {
  const [view, setView] = useState<View>('site');
  const [last, setLast] = useState<AegisView>('hq');     // 섬 지도로 돌아갈 때 줄어들 기준
  const [sel, setSel] = useState<string | null>(null);  // 고른 자리(spot)

  const listOf = (v: AegisView) => nodes
    .filter(n => AEGIS_SPOTS[n.spot]?.view === v)
    .sort((a, b) => SPOT_ORDER.indexOf(a.spot) - SPOT_ORDER.indexOf(b.spot));
  const list = view === 'site' ? [] : listOf(view);
  const cur = list.find(n => n.spot === sel) ?? list[0];
  const on = cur?.spot ?? null;
  const has = (spot: string) => nodes.some(n => n.spot === spot);
  const pick: Pick = spot => setSel(spot);
  const go = (v: View) => { if (v !== 'site') setLast(v); setView(v); setSel(null); };

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
  const crumb = view === 'site' ? '' : view === 'hq' ? 'HQ' : 'RESIDENCE';

  return (
    <div className="am">
      <div className="am-l">
        <div className="ar-pn am-frame">
          <div className="am-hd">
            <span>
              {view === 'site' ? (caption || 'THE AEGIS · ARTIFICIAL ISLAND')
                : <><button type="button" className="am-crumb" onClick={() => go('site')}>‹ THE AEGIS</button><b> / {crumb}</b></>}
            </span>
            <span>{view === 'site' ? 'OPEN SEA — UNDISCLOSED' : view === 'hq' ? 'ARCH HQ · B5–14F' : 'RESIDENCE · 8 BLOCKS'}</span>
          </div>
          <div className={`am-stage v-${view}`}>
            {layer('site', <SiteView go={go} />, '아이기스 섬 지도')}
            {layer('hq', <><HqView />
              {listOf('hq').map(n => {
                const s = AEGIS_SPOTS[n.spot];
                return s.cell ? <path key={n.id} d={s.cell} className={`am-cell${on === n.spot ? ' on' : ''}`} onClick={() => pick(n.spot)} /> : null;
              })}
              <Marks list={view === 'hq' ? list : listOf('hq')} on={view === 'hq' ? on : null} pick={pick} /></>, '본부 건물 층별 지도')}
            {layer('res', <><ResView pick={pick} on={view === 'res' ? on : null} has={has} />
              <Marks list={listOf('res')} on={view === 'res' ? on : null} pick={pick} /></>, '숙소 단지 지도')}
            {view === 'hq' && <button type="button" className="am-arrow r" onClick={() => go('res')} aria-label="숙소 단지로"><span>RESIDENCE</span><i>›</i></button>}
            {view === 'res' && <button type="button" className="am-arrow l" onClick={() => go('hq')} aria-label="본부로"><i>‹</i><span>HQ</span></button>}
          </div>
        </div>

        {view === 'site' ? (
          <div className="am-legend am-go">
            <button type="button" onClick={() => go('hq')}><em>HQ</em>본부 건물</button>
            <button type="button" onClick={() => go('res')}><em>RES</em>숙소 단지</button>
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
          <div className="am-body"><p>건물을 누르면 내부 지도로 들어갑니다.</p></div>
          <div className="am-gobox">
            <button type="button" onClick={() => go('hq')}><small>BUILDING 01</small><b>ARCH HQ</b><span>본부 건물 · 층별 안내 ›</span></button>
            <button type="button" onClick={() => go('res')}><small>BUILDING 02</small><b>RESIDENCE</b><span>숙소 단지 ›</span></button>
          </div>
          <span className="bg" aria-hidden="true">00</span>
        </article>
      ) : cur && (
        <article className="ar-pn ar-card am-card" key={cur.id}>
          <div className="ar-c-k"><span>{cur.code ? `SECTOR · ${cur.code}` : 'LOCATION'}</span><span>{cur.zone}</span></div>
          <h3><span className="ar-silver">{cur.en}</span><small>{[cur.name, cur.alias].filter(Boolean).join(' · ')}</small></h3>
          {cur.body && <div className="am-body"><Paras text={cur.body} /></div>}
          {cur.quote && cur.quote.text && (
            <div className="ar-quote am-quote"><div><small>FIELD NOTE</small>{cur.quote.text}{cur.quote.cite && <cite>— {cur.quote.cite}</cite>}</div></div>
          )}
          {cur.note && <p className="am-note">※ {cur.note}</p>}
          <span className="bg" aria-hidden="true">{cur.code || (view === 'hq' ? 'HQ' : 'R')}</span>
        </article>
      )}
    </div>
  );
}
