'use client';
/**
 * 이브 × 에덴 기밀 파일 (v2.0 사용자 요청) — 메인 LOST EDEN의 가이드 매칭 연출이 98.7%로 성공하면 넘어오는 페이지.
 * 지금은 레이아웃 시안 — 두 사람의 대상자 기록(캐릭터 프로필 칸 그대로)만 실제 데이터이고,
 * 페어 기록 · 현장 메모는 검게 가린 줄(기록 준비 중)로 자리만 잡아 두었다. 스타일은 pairFile.css.
 */
import React from 'react';
import Link from 'next/link';
import { usePairProfiles, type PairProfile } from '@/lib/pairChars';
import { CroppedBlobImg } from '@/components/ui/CropEditor';
import { ARCH_FONTS } from '@/lib/archFonts';
import './pairFile.css';

const SYNC = '98.7';

/** 검게 가린 줄 — 폭(%)만 받는다 */
const X = ({ w }: { w: number }) => <i className="pf-x" style={{ width: `${w}%` }} aria-label="비공개" />;

function Photo({ p, className }: { p: PairProfile; className?: string }) {
  return (
    <div className={`pf-ph ${className ?? ''}`}>
      {p.img ? <CroppedBlobImg fileRef={p.img} crop={p.crop} /> : <span className="pf-noimg">NO IMAGE</span>}
    </div>
  );
}

/** 대상자 기록 한 장 */
function Dossier({ p, n }: { p: PairProfile; n: string }) {
  return (
    <article className="pf-dos" style={{ '--c': p.color } as React.CSSProperties}>
      <header className="pf-dh"><b>{p.role}</b><span>SUBJECT {n} · {p.code}</span></header>
      <div className="pf-db">
        <div className="pf-photo">
          <Photo p={p} />
          <em>PHOTO · ATTACHED</em>
        </div>
        <div className="pf-di">
          <strong>{p.name}</strong>
          {p.specs.length > 0 ? (
            <dl>{p.specs.map(s => <div key={s.label}><dt>{s.label}</dt><dd>{s.value}</dd></div>)}</dl>
          ) : (
            <dl><div><dt>RECORD</dt><dd><X w={60} /></dd></div><div><dt>STATUS</dt><dd><X w={40} /></dd></div></dl>
          )}
        </div>
      </div>
      <div className="pf-eval">
        <small>PSYCH EVALUATION</small>
        <p><X w={92} /><X w={78} /><X w={54} /></p>
      </div>
    </article>
  );
}

export default function PairFilePage() {
  const { eve, eden } = usePairProfiles();
  const LOG: [number, number, string][] = [[46, 100, '██.█'], [58, 70, '██.█'], [38, 90, '██.█'], [64, 80, '██.█']];

  return (
    <div className="pf-root">
      <link rel="stylesheet" href={ARCH_FONTS} precedence="default" />
      <div className="pf-scan" aria-hidden="true" />
      <div className="pf-wrap">
        <nav className="pf-crumb">
          <Link href="/">← MAIN</Link>
          <span>ARCH <i>›</i> CLASSIFIED <i>›</i> <b>PAIR FILE</b></span>
        </nav>

        {/* 제목 · 기밀 도장 */}
        <header className="pf-head">
          <div className="pf-ttl">
            <small>PAIR DOSSIER <i>//</i> FILE NO. EV-ED-0987</small>
            <h1>{eden.name}<em>×</em>{eve.name}</h1>
            <p>GUIDE — SENTINEL PAIR <i>·</i> SYNC RATE {SYNC}% <i>·</i> STATUS <b>ACTIVE</b></p>
          </div>
          <div className="pf-stamp"><b>CLASSIFIED</b><span>LEVEL 4 · EYES ONLY</span></div>
        </header>

        {/* 페어 요약 — 매칭 연출과 같게 이브는 오른쪽(모바일은 아래), 에덴은 왼쪽 */}
        <section className="pf-pair">
          <div className="pf-who l" style={{ '--c': eden.color } as React.CSSProperties}>
            <Photo p={eden} className="sm" />
            <div><small>{eden.role}</small><b>{eden.name}</b><span>{eden.code}</span></div>
          </div>
          <div className="pf-sync">
            <small>SYNC RATE</small>
            <b>{SYNC}<em>%</em></b>
            <span className="pf-bar"><i style={{ width: `${SYNC}%` }} /></span>
            <span className="pf-ok">SYNCHRONIZED</span>
          </div>
          <div className="pf-who r" style={{ '--c': eve.color } as React.CSSProperties}>
            <div><small>{eve.role}</small><b>{eve.name}</b><span>{eve.code}</span></div>
            <Photo p={eve} className="sm" />
          </div>
        </section>
        <dl className="pf-meta">
          <div><dt>MATCH ID</dt><dd>EV-ED-0987</dd></div>
          <div><dt>MATCHED ON</dt><dd>████.██.██</dd></div>
          <div><dt>HANDLER</dt><dd>ARCH-PRIMA</dd></div>
          <div><dt>ATTEMPTS</dt><dd>0027</dd></div>
          <div><dt>CLEARANCE</dt><dd>LV.4</dd></div>
        </dl>

        {/* 01 대상자 기록 */}
        <section className="pf-sec">
          <h2 className="pf-sh"><span>01</span><b>SUBJECT FILES<small>대상자 기록</small></b><i /></h2>
          <div className="pf-subjects">
            <Dossier p={eden} n="B" />
            <Dossier p={eve} n="A" />
          </div>
        </section>

        {/* 02 페어 기록 — 자리만 */}
        <section className="pf-sec">
          <h2 className="pf-sh"><span>02</span><b>PAIR RECORD<small>페어 기록</small></b><i /><em>기록 준비 중</em></h2>
          <div className="pf-record">
            <div className="pf-pn pf-log">
              <header><b>SYNC LOG</b><span>RESTRICTED</span></header>
              <ol>
                {LOG.map(([a, b, v], i) => (
                  <li key={i}><span>████.██.██</span><X w={a} /><X w={b} /><em>{v}%</em></li>
                ))}
                <li className="on"><span>████.██.██</span><b>PAIR CONFIRMED</b><em>{SYNC}%</em></li>
              </ol>
            </div>
            <div className="pf-pn pf-notes">
              <header><b>FIELD NOTES</b><span>EYES ONLY</span></header>
              <p><X w={96} /><X w={88} /><X w={92} /><X w={60} /></p>
              <p><X w={84} /><X w={94} /><X w={42} /></p>
            </div>
          </div>
        </section>

        <footer className="pf-foot">
          <span>THIS FILE IS CLASSIFIED UNDER ARCH PROTOCOL. ALL ACCESS IS LOGGED.</span>
          <span>HASH 0x7E4D · {SYNC} · END OF FILE</span>
        </footer>
      </div>
    </div>
  );
}
