'use client';
/**
 * 아이기스 지도 (v2.0 사용자 요청 · lib/aegisMap.ts) — 3D 홀로그램 (사용자 요청: 고퀄리티 홀로그램 도시처럼, 디자인 전면 교체).
 *  바다 위 강철 이동 요새: 전경(site)엔 본부 · 숙소 두 이름표만, 본부(hq) · 숙소(res)에 들어가야 시설 이름표가 뜬다.
 *  그림은 aegis3d/world.ts(three.js), 배치는 aegis3d/layout.ts, 무대는 AegisScene.tsx.
 *  지도 위 건물 · 방을 누르거나 아래 목록을 고르면 그 시설이 주황(숙소동은 캐릭터 대표색)으로 빛나고 설명 카드가 나온다.
 *  끌어서 돌려 볼 수 있다. 섬 화면은 가만두면 천천히 돈다.
 */
import React, { useState } from 'react';
import { AEGIS_SPOTS, SPOT_ORDER, type AegisView, type ArchMapNode } from '@/lib/aegisMap';
import { useLocalList } from '@/lib/postStore';
import { CHAR_SEED, type Character } from '@/lib/charStore';
import { AegisScene } from './AegisScene';

type View = 'site' | AegisView;

/** 두 구역의 이름 — 이름표 · 머리줄 · 목록 · 도면 제목이 같이 쓴다 */
const SITE: Record<AegisView, { code: string; en: string; ko: string; hd: string; scale: string; ref: string }> = {
  hq: { code: 'SECTOR A · 01', en: 'ARCH COMMAND', ko: '통합 지휘본부', hd: 'COMMAND COMPLEX · DECK B5', scale: '1:500', ref: 'AG-A01' },
  res: { code: 'SECTOR R · 02', en: 'AGENT QUARTERS', ko: '요원 거주구역', hd: '8 TOWERS', scale: '1:800', ref: 'AG-R02' },
};
const ACC = '#b8d8ff';

function Paras({ text }: { text: string }) {
  return <>{text.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}</>;
}

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
function Ico({ name }: { name?: string }) {
  if (!name || !ICONS[name]) return null;
  return <svg className="am3-ic" viewBox="-13 -13 26 26" aria-hidden="true"><path d={ICONS[name]} /></svg>;
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
  const [sel, setSel] = useState<string | null>(null);  // 고른 자리(spot)
  const [chars] = useLocalList<Character>('ohome.chars.v1', CHAR_SEED);

  const listOf = (v: AegisView) => nodes
    .filter(n => AEGIS_SPOTS[n.spot]?.view === v)
    .sort((a, b) => SPOT_ORDER.indexOf(a.spot) - SPOT_ORDER.indexOf(b.spot));
  const list = view === 'site' ? [] : listOf(view);
  const cur = list.find(n => n.spot === sel) ?? list[0];
  const on = cur?.spot ?? null;
  const pick = (spot: string) => setSel(spot);
  const go = (v: View) => { setView(v); setSel(null); };
  /** 숙소동 강조 색 — 직접 정한 색 → 같은 이름 캐릭터의 대표색 → 기본 하늘색 */
  const colorOf = (n?: ArchMapNode) => (n ? (n.color?.trim() || findChar(chars, n)?.color || ACC) : ACC);
  const curColor = cur && AEGIS_SPOTS[cur.spot]?.big ? colorOf(cur) : null;
  const hd = view === 'site' ? null : SITE[view];

  return (
    <div className="am">
      <div className="ar-pn am-frame">
        <div className="am-hd">
          <span>
            {view === 'site' ? (caption || 'THE AEGIS · ARTIFICIAL ISLAND')
              : <><button type="button" className="am-crumb" onClick={() => go('site')}>‹ THE AEGIS</button><b> / {hd!.en}</b></>}
          </span>
          <span>{view === 'site' ? 'OPEN SEA — UNDISCLOSED' : hd!.hd}</span>
        </div>
        <div className="am-stage3">
          <AegisScene view={view} sel={view === 'site' ? null : on} color={curColor ?? undefined} live={nodes.map(n => n.spot)} go={go} pick={pick}>
            {view === 'site' && (['hq', 'res'] as const).map(k => (
              <button key={k} type="button" data-k={`site:${k}`} className={`am3-lb site${k === 'res' ? ' flip' : ''}`} onClick={() => go(k)}>
                <i className="pin" /><span><small>{SITE[k].code}</small><b>{SITE[k].en}</b><em>{SITE[k].ko}</em></span>
              </button>
            ))}
            {view !== 'site' && list.map(n => {
              const big = AEGIS_SPOTS[n.spot]?.big;
              const c = n.spot === on && big ? colorOf(n) : undefined;
              return (
                <button key={n.id} type="button" data-k={n.spot} className={`am3-lb${n.spot === on ? ' on' : ''}${big ? ' big' : ''}${n.code ? '' : ' pl'}`}
                  style={c ? ({ '--hot': c } as React.CSSProperties) : undefined} onClick={() => pick(n.spot)}>
                  <i className="pin" />
                  <span>{big ? <><b>{n.en}</b><em>{n.name}</em></> : <><Ico name={AEGIS_SPOTS[n.spot]?.icon} />{n.code && <small>{n.code}</small>}<em>{n.name}</em></>}</span>
                </button>
              );
            })}
          </AegisScene>
          <div className="am-holo" aria-hidden="true">
            <i className="am-scan" />
            <div className="am-tb">
              <b>{view === 'site' ? 'THE AEGIS' : hd!.en} — {view === 'site' ? 'MOBILE CITADEL' : 'SECTOR DETAIL'}</b>
              <span>SCALE {view === 'site' ? '1:20000' : hd!.scale}</span>
              <span>CAD REF {view === 'site' ? 'AG-00' : hd!.ref} · LIVE MODEL</span>
            </div>
            <div className="am-hint">DRAG TO ROTATE · SCROLL / PINCH TO ZOOM</div>
          </div>
          {view === 'hq' && <button type="button" className="am-arrow r" onClick={() => go('res')} aria-label="요원 거주구역으로"><span>QUARTERS</span><i>›</i></button>}
          {view === 'res' && <button type="button" className="am-arrow r" onClick={() => go('hq')} aria-label="통합 지휘본부로"><span>COMMAND</span><i>›</i></button>}
          {view !== 'site' && <button type="button" className="am-arrow l" onClick={() => go('site')} aria-label="섬 전체로"><i>‹</i><span>ISLAND</span></button>}
        </div>
      </div>

      <div className="am-dock">
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

        {view === 'site' ? (
          <article className="ar-pn ar-card am-card" key="site">
            <div className="ar-c-k"><span>SITE · OVERVIEW</span><span>OPEN SEA</span></div>
            <h3><span className="ar-silver">THE AEGIS</span><small>아크 본부 · 바다 위 이동 요새</small></h3>
            <div className="am-body"><p>본부나 숙소를 누르면 그 구역으로 들어가 시설이 보입니다. 끌어서 돌리고, 휠이나 두 손가락으로 확대 · 축소할 수 있어요.</p></div>
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
    </div>
  );
}
