'use client';
/**
 * 아이기스 지도 (v2.0 사용자 요청 · lib/aegisMap.ts) — 세 장.
 *  1) 섬 전체 — 위에서 본 인공섬. 본부 건물 · 숙소 단지 두 곳만 간략히. 누르면 그 건물로 확대되며 넘어간다.
 *  2) 본부 — 한 건물의 층별 단면 (상공의 하늘정원부터 바닷속 B7까지). 옆 화살표로 숙소 단지로.
 *  3) 숙소 단지 — 입체로 본 숙소동들. 이브 · 에덴 숙소동을 강조.
 * 칸이나 표시를 누르면(또는 아래 목록) 그 시설이 지도 아래(PC는 오른쪽) 카드로 나온다.
 */
import React, { useState } from 'react';
import { AEGIS_SPOTS, SPOT_ORDER, RES_TOWERS, resP, type AegisView, type ArchMapNode } from '@/lib/aegisMap';

type View = 'site' | AegisView;
type Pick = (spot: string) => void;

/** 섬 지도에서 두 건물의 자리 — 확대 · 축소 모션의 기준점(%) */
const ORIGIN: Record<AegisView, string> = { hq: '37.5% 47.5%', res: '72% 52%' };

function Paras({ text }: { text: string }) {
  return <>{text.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}</>;
}

const Defs = () => (
  <defs>
    <pattern id="amGrid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="rgba(190,208,228,.05)" /></pattern>
    <pattern id="amFl" width="10" height="9" patternUnits="userSpaceOnUse"><path d="M0 8.5H10" stroke="rgba(220,230,240,.05)" /></pattern>
    <pattern id="amHatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V7" stroke="rgba(255,150,160,.22)" /></pattern>
    <pattern id="amLeaf" width="11" height="11" patternUnits="userSpaceOnUse"><circle cx="5.5" cy="5.5" r="1.5" fill="rgba(160,220,190,.32)" /></pattern>
    <linearGradient id="amSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="rgba(120,170,230,.16)" /><stop offset="1" stopColor="rgba(120,170,230,.02)" /></linearGradient>
    <linearGradient id="amBeam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="rgba(184,216,255,.9)" /><stop offset="1" stopColor="rgba(184,216,255,0)" /></linearGradient>
    <radialGradient id="amGlow"><stop offset="0" stopColor="rgba(184,216,255,.35)" /><stop offset="1" stopColor="rgba(184,216,255,0)" /></radialGradient>
  </defs>
);

/* ───────── 1) 섬 전체 ───────── */
function SiteView({ go }: { go: (v: AegisView) => void }) {
  const isl = (o: number) => `M${250 - o * .6} ${220 - o} H${750 + o * .6} L${880 + o} ${350 - o * .4} V${700 + o * .4} L${750 + o * .6} ${830 + o} H${250 - o * .6} L${120 - o} ${700 + o * .4} V${350 - o * .4} Z`;
  const dorms: [number, number, string?][] = [[640, 410], [720, 410], [800, 410], [640, 520, 'hl'], [800, 520, 'hl'], [640, 630], [720, 630], [800, 630]];
  return (
    <>
      {[40, 85, 135].map((o, k) => <path key={o} className="am-l3" strokeDasharray={`${2 + k * 2} 6`} d={isl(o)} />)}
      <text className="am-tag dim" x="70" y="900">-20m</text><text className="am-tag dim" x="24" y="960">-60m</text>
      <path d={isl(0)} fill="rgba(184,216,255,.05)" stroke="rgba(184,216,255,.18)" strokeWidth="12" />
      <path className="am-hull" d={isl(0)} />
      <path className="am-l3" d={isl(-16)} />
      <rect x="226" y="690" width="280" height="96" rx="30" fill="url(#amLeaf)" stroke="rgba(160,220,190,.18)" />
      <rect x="600" y="712" width="240" height="64" rx="26" fill="url(#amLeaf)" stroke="rgba(160,220,190,.18)" />
      {/* 항구 */}
      <path className="am-line" d="M570 830 V902 M630 830 V892" />
      <path className="am-l2" d="M590 862 l10 -6 h16 l-4 6 z" />
      <text className="am-tag" x="600" y="930" textAnchor="middle">HARBOR</text>
      {/* 연결 보행로 */}
      <path className="am-l2" strokeDasharray="4 4" d="M520 494 H590 M520 506 H590" />

      {/* 본부 */}
      <g className="am-bld" onClick={() => go('hq')} role="button" aria-label="본부 건물 지도 열기">
        <rect className="am-hit" x="190" y="280" width="340" height="380" />
        <rect className="am-b" x="200" y="330" width="320" height="320" rx="8" />
        <rect className="am-l2" x="212" y="342" width="296" height="296" rx="4" />
        <circle className="am-b" cx="258" cy="598" r="44" />
        <path className="am-l2" d="M258 554 V642 M214 598 H302 M227 567 L289 629 M289 567 L227 629" />
        <circle className="am-l2" cx="258" cy="598" r="24" />
        <rect className="am-b" x="305" y="405" width="140" height="140" />
        <circle cx="375" cy="475" r="58" fill="url(#amGlow)" />
        <circle className="am-b" cx="375" cy="475" r="34" />
        <circle className="am-acc" cx="375" cy="475" r="18" />
        <path className="am-acc" d="M375 448 V502 M348 475 H402" />
        <circle className="am-dash" cx="375" cy="475" r="118" />
        <text className="am-tag" x="375" y="350" textAnchor="middle">▲ SKY GARDEN</text>
        <circle className="am-pulse" cx="375" cy="475" r="20" />
        <text className="am-zl" x="200" y="292">ARCH HQ</text>
        <text className="am-zs" x="200" y="318">본부 · 1–50F ›</text>
      </g>

      {/* 숙소 단지 */}
      <g className="am-bld" onClick={() => go('res')} role="button" aria-label="숙소 단지 지도 열기">
        <rect className="am-hit" x="580" y="290" width="280" height="410" />
        <rect className="am-l2" x="590" y="350" width="260" height="340" rx="8" />
        <circle cx="720" cy="520" r="32" fill="url(#amLeaf)" stroke="rgba(160,220,190,.3)" />
        <path className="am-l2" d="M720 362 V488 M720 552 V678 M602 520 H688 M752 520 H838" />
        {dorms.map(([x, y, hl]) => (
          <rect key={`${x}-${y}`} className={hl ? 'am-b am-hl' : 'am-b'} x={x - 28} y={y - 28} width="56" height="56" />
        ))}
        <circle className="am-pulse" cx="720" cy="520" r="20" />
        <text className="am-zl" x="590" y="312">RESIDENCE</text>
        <text className="am-zs" x="590" y="338">숙소 단지 ›</text>
      </g>

      <g transform="translate(930 90)"><circle className="am-l2" r="24" /><path d="M0 -19 L5 0 L0 19 L-5 0 Z" fill="rgba(184,216,255,.6)" /><text className="am-tag" y="-32" textAnchor="middle">N</text></g>
      <path className="am-line" d="M800 950 H940 M800 944 V956 M870 947 V953 M940 944 V956" /><text className="am-tag dim" x="870" y="978" textAnchor="middle">200m</text>
    </>
  );
}

/* ───────── 2) 본부 — 층별 단면 ───────── */
const FLOORS: [number, string][] = [[179, '50F'], [241, '41–49F'], [315, '31–40F'], [378, '21–30F'], [432, '11–20F'], [486, '6–10F'], [538, '4–5F']];
function HqView() {
  const wave = 'M0 690 ' + Array.from({ length: 20 }, () => 'q12.5 -6 25 0 t25 0').join(' ');
  return (
    <>
      {/* 바다 · 섬 몸통 */}
      <rect x="0" y="690" width="1000" height="310" fill="url(#amSea)" />
      <path className="am-sea" d={wave} />
      <path className="am-hull body" d="M40 660 H960 V700 L995 990 H5 L40 700 Z" />
      <rect x="0" y="690" width="1000" height="300" fill="rgba(90,140,210,.07)" />
      <path className="am-sea dim" strokeDasharray="6 6" d="M40 690 H960" />
      <text className="am-tag" x="56" y="682">SEA LEVEL</text>
      <path className="am-line" d="M28 660 H972" />
      {[760, 820, 880, 940].map(y => <path key={y} className="am-l3" d={`M${40 - (y - 700) * .12} ${y} H${960 + (y - 700) * .12}`} />)}

      {/* 저층부 (1–3F) + 훈련 돔 */}
      <rect className="am-b" x="120" y="560" width="760" height="100" />
      <path className="am-l2" d="M330 593 H880 M330 626 H880 M520 660 V634 H600 V660" />
      <text className="am-tag" x="866" y="650" textAnchor="end">1–3F · LOBBY</text>
      <path className="am-b" d="M137 560 A88 88 0 0 1 313 560 Z" />
      <path className="am-l2" d="M225 472 V560 M150 526 Q225 546 300 526 M168 496 Q225 512 282 496" />

      {/* 고층부 */}
      <rect className="am-b" x="360" y="150" width="400" height="410" />
      <rect x="360" y="150" width="400" height="410" fill="url(#amFl)" />
      <rect x="570" y="400" width="190" height="56" fill="url(#amHatch)" stroke="rgba(255,140,150,.5)" />
      <rect x="360" y="456" width="400" height="52" fill="rgba(184,216,255,.06)" />
      <rect x="640" y="462" width="114" height="40" fill="url(#amLeaf)" />
      <path className="am-line" d="M360 200 H760 M360 274 H760 M360 348 H760 M360 400 H760 M360 456 H760 M360 508 H760 M560 200 V274 M570 400 V456 M560 508 V560" />
      <path className="am-b" d="M352 150 L372 130 H748 L768 150 Z" />
      <circle cx="560" cy="114" r="24" fill="url(#amGlow)" />
      <path className="am-acc" d="M560 130 V114 M552 121 H568" />
      {FLOORS.map(([y, t]) => <text key={t} className="am-tag" x="774" y={y}>{t}</text>)}

      {/* 상공 — 하늘정원 */}
      <circle cx="560" cy="66" r="80" fill="url(#amGlow)" opacity=".5" />
      <path className="am-hull rock" d="M450 58 Q560 72 670 58 L646 80 L600 88 L578 110 L554 96 L530 108 L500 82 L468 76 Z" />
      <path className="am-hull" d="M450 58 Q560 44 670 58 Q560 72 450 58 Z" />
      <path className="am-line" d="M490 56 V38 M506 54 V30 M612 54 V32 M628 56 V44" />
      <path className="am-l2" d="M548 52 V40 H572 V52 M544 40 L560 30 L576 40" />
      <ellipse cx="596" cy="57" rx="14" ry="3" fill="url(#amLeaf)" />
      <text className="am-tag dim" x="436" y="44" textAnchor="end">ALT 1,200m</text>

      {/* 지하 (바닷속) */}
      <path className="am-shaft" d="M540 660 V880 M580 660 V880" />
      <path className="am-l2" d="M580 751 H600" />
      <path className="am-glass" d="M600 716 H940 Q985 751 940 786 H600 Z" />
      <rect x="610" y="722" width="320" height="58" fill="url(#amLeaf)" opacity=".7" />
      <rect className="am-b" x="300" y="880" width="460" height="70" />
      <rect className="am-acc" x="312" y="892" width="436" height="46" />
      <text className="am-tag" x="60" y="755">B1–B3</text>
      <text className="am-tag dim" x="60" y="826">B4–B6</text>
      <text className="am-tag" x="60" y="919">B7</text>
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
            <span>{view === 'site' ? 'OPEN SEA — UNDISCLOSED' : view === 'hq' ? 'ARCH HQ · B7–50F' : 'RESIDENCE · 8 BLOCKS'}</span>
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
