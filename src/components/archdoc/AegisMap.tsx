'use client';
/**
 * 아이기스 단면 지도 — 바다 위 이동 요새의 옆모습 (v2.0 사용자 요청 · lib/aegisMap.ts).
 * 위에서부터 하늘정원(부유섬) → 센트럴 코어(탑) → 상갑판 훈련 돔 → 선체 1~3층 → 해수면 → 해저층(특별통제 훈련장).
 * 칸이나 번호를 누르면(또는 아래 목록) 그 시설 설명이 지도 아래 카드로 나온다.
 */
import React, { useState } from 'react';
import { AEGIS_SPOTS, type ArchMapNode } from '@/lib/aegisMap';

function Paras({ text }: { text: string }) {
  return <>{text.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}</>;
}

export function AegisMap({ nodes, caption }: { nodes: ArchMapNode[]; caption?: string }) {
  const [on, setOn] = useState(0);
  const cur = nodes[Math.min(on, nodes.length - 1)];
  const bySpot = new Map(nodes.map((n, i) => [n.spot, i]));
  const pick = (i: number) => setOn(i);

  return (
    <div className="am">
      <div className="am-l">
      <div className="ar-pn am-frame">
        <div className="am-hd"><span>{caption || 'THE AEGIS · CROSS SECTION'}</span><span>OPEN SEA — UNDISCLOSED</span></div>
        <svg className="am-svg" viewBox="0 0 1000 900" role="img" aria-label="아이기스 단면 지도">
          <defs>
            <pattern id="amGrid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M50 0H0V50" fill="none" stroke="rgba(190,208,228,.05)" strokeWidth="1" />
            </pattern>
            <linearGradient id="amSea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="rgba(120,170,230,.16)" />
              <stop offset="1" stopColor="rgba(120,170,230,0)" />
            </linearGradient>
            <radialGradient id="amGlow"><stop offset="0" stopColor="rgba(184,216,255,.35)" /><stop offset="1" stopColor="rgba(184,216,255,0)" /></radialGradient>
          </defs>
          <rect width="1000" height="900" fill="url(#amGrid)" />

          {/* 바다 */}
          <rect x="0" y="690" width="1000" height="210" fill="url(#amSea)" />
          <path className="am-sea" d="M0 690 q25 -6 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0" />
          <path className="am-sea dim" d="M0 706 q25 -4 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0" />
          <text className="am-tag" x="24" y="682">SEA LEVEL</text>

          {/* 부유섬 → 탑 사이 반중력 기류 */}
          <path className="am-beam" d="M470 196 V240 M500 198 V238 M530 196 V240" />
          {/* 부유섬: 신전 폐허 · 부서진 기둥 */}
          <path className="am-line" d="M430 112 V86 M452 112 V78 M548 112 V80 M570 112 V92 M440 86 H462 M538 80 H560" />
          <path className="am-line thin" d="M476 112 V96 H524 V112 M482 96 L500 84 L518 96" />
          <circle cx="500" cy="140" r="70" fill="url(#amGlow)" opacity=".5" />

          {/* 센트럴 코어: 탑 · 관제 데크 · 안테나 */}
          <ellipse className="am-line" cx="500" cy="248" rx="58" ry="9" />
          <path className="am-line" d="M500 206 V239 M490 222 H510" />
          {/* 선체 (수면 위) */}
          <path className="am-hull" d="M150 430 H850 L800 700 H200 Z" />
          {/* 용골 (수면 아래) */}
          <path className="am-hull" d="M262 700 H738 L640 862 H360 Z" />
          {/* 층 나눔 */}
          <path className="am-line thin" d="M165 510 H835 M180 590 H820" />
          {/* 코어 승강로 — 탑에서 해저층까지 */}
          <path className="am-shaft" d="M500 430 V726" />
          {/* 훈련 돔 갈빗대 */}
          <path className="am-line thin" d="M290 336 V430 M226 362 Q290 400 354 362 M206 396 Q290 420 374 396" />
          {/* 층 표시 */}
          <text className="am-tag" x="862" y="476">DECK 1</text>
          <text className="am-tag" x="848" y="556">DECK 2</text>
          <text className="am-tag" x="834" y="640">DECK 3</text>
          <text className="am-tag" x="660" y="800">SUB-SEA</text>

          {/* 칸 — 누르면 그 시설 */}
          {Object.entries(AEGIS_SPOTS).map(([key, s]) => {
            const i = bySpot.get(key);
            const has = i !== undefined;
            return (
              <path key={key} d={s.cell} className={`am-cell${has ? '' : ' empty'}${has && i === on ? ' on' : ''}`}
                onClick={has ? () => pick(i!) : undefined} />
            );
          })}
          {/* 번호 표시 */}
          {nodes.map((n, i) => {
            const s = AEGIS_SPOTS[n.spot];
            if (!s) return null;
            return (
              <g key={n.id} className={`am-mk${i === on ? ' on' : ''}`} transform={`translate(${s.lx} ${s.ly})`} onClick={() => pick(i)}>
                <rect x="-7" y="-7" width="14" height="14" transform="rotate(45)" />
                <text className="am-code" x="16" y="6">{n.code}</text>
                <text className="am-nm" x="16" y="28">{n.name}</text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* 목록 — 폰에선 지도 속 이름이 작아 여기서 고른다 */}
      <div className="am-legend" role="tablist" aria-label="시설 목록">
        {nodes.map((n, i) => (
          <button key={n.id} type="button" role="tab" aria-selected={i === on} className={i === on ? 'on' : ''} onClick={() => pick(i)}>
            <em>{n.code}</em>{n.name}
          </button>
        ))}
      </div>
      </div>

      {cur && (
        <article className="ar-pn ar-card am-card" key={cur.id}>
          <div className="ar-c-k"><span>SECTOR · {cur.code}</span><span>{cur.zone}</span></div>
          <h3><span className="ar-silver">{cur.en}</span><small>{[cur.name, cur.alias].filter(Boolean).join(' · ')}</small></h3>
          <div className="am-body"><Paras text={cur.body} /></div>
          {cur.quote && cur.quote.text && (
            <div className="ar-quote am-quote"><div><small>FIELD NOTE</small>{cur.quote.text}{cur.quote.cite && <cite>— {cur.quote.cite}</cite>}</div></div>
          )}
          {cur.note && <p className="am-note">※ {cur.note}</p>}
          <span className="bg" aria-hidden="true">{cur.code}</span>
        </article>
      )}
    </div>
  );
}
