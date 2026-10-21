'use client';
/**
 * 탭 문서 페이지 — 보기 + 관리자 편집 (lib/archDocStore.ts).
 *
 * 모양은 ARCH 소개 HTML과 같은 클래스(.arx .ar-*)를 그대로 쓴다 — CSS는 ./archdoc.css (HTML 안의 <style>을 옮김).
 * 맨 위 큰 제목 아래 목차 탭(환경설정 카테고리와 같은 모양), 탭마다 블록(섹션 제목 · 정보 카드 · 분류 카드 · 글 · 이미지 · HTML).
 * 관리자는 오른쪽 위 EDIT → 블록마다 ✎ 고치기 · ↑↓ 순서 · ✕ 지우기, 탭 이름·순서·추가, 아래 ＋ 블록 추가. SAVE로 저장.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArchDoc, ArchBlock, ArchCard, ArchClass, ArchFact, ArchMore, ArchRank, ArchRanks, ICONS, iconSvg, iconKeyOf, blankBlock, blankCard, blankClass,
  BLOCK_LABEL, moreOf, ranksOf, gradeOf, blankRank,
  layoutOf, elementalOf, headsOf, blankElemGroup, blankElement, DEFAULT_HEADS, ELEM_ICON_KEYS, ELEM_COLOR,
  type ArchElemGroup, type ArchElement, type ArchSubHead, type ArchAgent, type ArchAgentGroup, blankAgent, blankAgentGroup,
} from '@/lib/archDocStore';
import { newId } from '@/lib/postStore';
import { sanitizeHtml } from '@/lib/sanitize';
import { stripScripts } from '@/components/main/HtmlSlots';
import { useBlobUrl, putBlob } from '@/lib/blobStore';
import { Modal } from '@/components/ui/Modal';
import { KInput, KTextarea, KCheck, KSelect } from '@/components/ui/Kit';
import { RichEditor } from '@/components/ui/RichEditor';
import { useToast } from '@/components/ui/Toast';
import { AegisMap } from './AegisMap';
import { ColorField } from '@/components/ui/ColorField';
import { AEGIS_SPOTS, type ArchMapNode } from '@/lib/aegisMap';
import './archdoc.css';

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const move = <T,>(arr: T[], i: number, d: number): T[] => {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const n = arr.slice();
  [n[i], n[j]] = [n[j], n[i]];
  return n;
};

/* ───────────── 보기 ───────────── */

function Pending({ label }: { label: string }) {
  return (
    <div className="ar-pn ar-pending">
      <span>DATA PENDING</span>
      <small>{label}</small>
    </div>
  );
}

function CardView({ c }: { c: ArchCard }) {
  const head = (
    <h3><span className="ar-silver">{c.title}</span>{c.sub && <small>{c.sub}</small>}</h3>
  );
  const body = c.body ? <div className="ar-cbody" dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.body) }} /> : null;
  return (
    <article className="ar-pn ar-card">
      {(c.kL || c.kR) && <div className="ar-c-k"><span>{c.kL}</span><span>{c.kR}</span></div>}
      {c.radar ? (
        <div className="ar-aegis">
          <div>{head}{body}</div>
          <div className="ar-radar" aria-hidden="true">
            <i className="sw" /><i className="bp" /><span>{c.radar.label}</span><em>{c.radar.trace}</em>
          </div>
        </div>
      ) : <>{head}{body}</>}
      {c.quote && (c.quote.label || c.quote.text) && (
        <div className="ar-quote"><div><small>{c.quote.label}</small>{c.quote.text}</div></div>
      )}
      {c.facts.length > 0 && (
        <div className="ar-facts">
          {c.facts.map((f, i) => (
            <div key={i}><small>{f.k}</small><b className={f.bad ? 'bad' : undefined}>{f.v}</b></div>
          ))}
        </div>
      )}
    </article>
  );
}

function ImageView({ src, caption }: { src: string; caption: string }) {
  const url = useBlobUrl(src);
  return (
    <figure className="ar-pn ar-figure">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url && <img src={url} alt={caption} />}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

/* ───────────── 요원 명부 (AGENTS 탭 · v2.0 사용자 요청) ───────────── */
const ELEM_KO: Record<string, string> = { 'el-water': '물', 'el-fire': '불', 'el-grass': '풀', 'el-thunder': '번개', 'el-wind': '바람', 'el-ice': '얼음', none: '무' };
/** 요원 딱지 색 · 마크 — 원소 + 무속성(회색 · 일반 가이드 마크, v2.0 사용자 요청) */
const AG_COLOR: Record<string, string> = { ...ELEM_COLOR, none: '#A6A6A6' };
const AG_ICON: Record<string, string> = { none: 'guide' };
/** 원소 딱지 — 원소 색 바탕 + 원소 마크 */
function ElemBadge({ el }: { el: string }) {
  if (!ELEM_KO[el]) return null;
  return (
    <span className="ar-ag-el" style={{ '--ec': AG_COLOR[el] } as React.CSSProperties}>
      <i dangerouslySetInnerHTML={{ __html: ICONS[AG_ICON[el] ?? el]?.svg ?? '' }} />{el === 'none' ? '무속성' : `${ELEM_KO[el]} 속성`}
    </span>
  );
}
function AgentPhoto({ src, alt }: { src: string; alt: string }) {
  const url = useBlobUrl(src);
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt={alt} /> : <span className="ar-ag-noimg">NO IMAGE</span>;
}
/** 증명사진 카드 — 누르면 상세 프로필 창 */
function AgentCard({ a, onOpen }: { a: ArchAgent; onOpen: () => void }) {
  const has = !!a.html.trim();
  const style = AG_COLOR[a.element] ? { '--ec': AG_COLOR[a.element] } as React.CSSProperties : undefined;
  const body = (<>
      <span className="ph"><AgentPhoto src={a.photo} alt={a.name} /></span>
      <span className="tx">
        {/* 이름 옆에 등급 · 영문 (v2.0 사용자 요청) */}
        <span className="nm"><b>{a.name}</b>{a.en && <small>{a.en}</small>}</span>
        <ElemBadge el={a.element} />
      </span>
  </>);
  return (
    // <button>은 아이폰 사파리가 회색 기본 바탕 · 세로 가운데 정렬을 덧입혀 사진 위가 비었다 (v2.0 사용자 제보) — 일반 상자 + 버튼 역할로
    // 상세 프로필(HTML)을 안 쓴 요원은 눌러도 아무것도 안 뜬다 (v2.0 사용자 요청)
    has ? <div role="button" tabIndex={0} className="ar-ag" onClick={onOpen} aria-label={`${a.name} 상세 프로필`}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      style={style}>{body}</div>
      : <div className="ar-ag still" style={style}>{body}</div>
  );
}
/** 상세 프로필 창 — 위에 사진 · 이름 · 무리 · 원소, 아래에 관리자가 HTML로 쓴 내용 */
function AgentModal({ a, g, onClose }: { a: ArchAgent | null; g: ArchAgentGroup | null; onClose: () => void }) {
  return (
    <Modal open={!!a} onClose={onClose} className="ar-more-modal ar-ag-modal">
      {a && g && (
        <div className="ar-ag-pf">
          <div className="ar-ag-pf-h" style={{ '--gc': g.color } as React.CSSProperties}>
            <span className="ph"><AgentPhoto src={a.photo} alt={a.name} /></span>
            <div className="nm">
              <small>{g.title}{g.cls && <em>{g.cls}</em>}</small>
              <span className="nmr"><b>{a.name}</b>{a.en && <span className="en">{a.en}</span>}</span>
              <ElemBadge el={a.element} />
            </div>
          </div>
          {a.html.trim()
            ? <div className="ar-ag-pf-b" dangerouslySetInnerHTML={{ __html: stripScripts(a.html) }} />
            : <div className="ar-ag-pf-b pend">PROFILE · 기록 준비 중</div>}
          <div className="ar-more-foot"><button type="button" className="ar-more-close" onClick={onClose}>CLOSE</button></div>
        </div>
      )}
    </Modal>
  );
}
function RosterView({ groups }: { groups: ArchAgentGroup[] }) {
  const [open, setOpen] = useState<{ g: ArchAgentGroup; a: ArchAgent } | null>(null);
  return (
    <div className="ar-roster">
      {groups.map(g => (
        <section key={g.id} className="ar-ag-grp" style={{ '--gc': g.color } as React.CSSProperties}>
          <div className="ar-ag-gh"><b>{g.title}</b>{g.cls && <em>{g.cls}</em>}</div>
          <div className="ar-ag-list">
            {g.agents.map(a => <AgentCard key={a.id} a={a} onOpen={() => setOpen({ g, a })} />)}
          </div>
        </section>
      ))}
      <AgentModal a={open?.a ?? null} g={open?.g ?? null} onClose={() => setOpen(null)} />
    </div>
  );
}

/** 분류 카드 오른쪽 위 상세 버튼 + 작은 창 */
function MoreButton({ more }: { more: ArchMore }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="ar-more-btn" onClick={() => setOpen(true)}>{more.label || '상세'}<i>›</i></button>
      <Modal open={open} onClose={() => setOpen(false)} small className="ar-more-modal" title={more.title || more.label}>
        <dl className="ar-more-list">
          {more.rows.filter(r => r.k || r.v).map((r, i) => (
            <div key={i}><dt>{r.k}</dt><dd>{r.v}</dd></div>
          ))}
        </dl>
        <div className="ar-more-foot"><button type="button" className="ar-more-close" onClick={() => setOpen(false)}>CLOSE</button></div>
      </Modal>
    </>
  );
}

/** 분류 탭 소제목 (v2.0 사용자 요청 — 각성자 · 속성 각성자 · 직급 분류) — 섹션 제목보다 한 단계 작게 */
function SubHead({ h }: { h: ArchSubHead }) {
  if (!h[0] && !h[1]) return null;
  return (
    <div className="ar-subh">
      <span className="bar" aria-hidden="true" />
      <div><b>{h[0]}</b>{h[1] && <small>{h[1]}</small>}</div>
      <i />{h[2] && <em>{h[2]}</em>}
    </div>
  );
}

/** 마크 줄 — 누른 마크는 밝게 · 굵게 · 빛나게 (v2.0 사용자 요청) */
function Marks({ items, on, setOn, label }: {
  items: { id: string; icon: string; name: string }[]; on: number; setOn: (i: number) => void; label: string;
}) {
  return (
    <div className="ar-marks" role="tablist" aria-label={label}>
      {items.map((it, i) => (
        <button key={it.id} type="button" role="tab" aria-selected={i === on} className={i === on ? 'on' : undefined} onClick={() => setOn(i)}>
          <span className="mk" dangerouslySetInnerHTML={{ __html: iconSvg(it.icon) }} />
          <em>{it.name}</em>
        </button>
      ))}
    </div>
  );
}

/** 분류를 한 상자에 — 마크를 누르면 그 분류 설명 (v2.0 사용자 요청). 고른 분류는 옆 속성 상자와 함께 쓴다 */
function ClassSwitch({ items, on, setOn, linked }: { items: ArchClass[]; on: number; setOn: (i: number) => void; linked: boolean }) {
  const cur = items[Math.min(on, items.length - 1)];
  if (!cur) return null;
  const more = moreOf(cur);
  return (
    <div className="ar-pn ar-sw">
      <Marks items={items.map(it => ({ id: it.id, icon: it.icon, name: it.title }))} on={on} setOn={setOn} label="분류" />
      <div className="ar-sw-body" key={cur.id}>
        {more && <MoreButton more={more} />}
        <b>{cur.title}</b>{cur.sub && <small>{cur.sub}</small>}
        {cur.body && <p>{cur.body}</p>}
      </div>
      {cur.letter && <span className="bg" aria-hidden="true">{cur.letter}</span>}
    </div>
  );
}

const ELEM_SLOTS = 6;
/** 원소 칸 그림 — 원소 마크(el-*)면 그림, 아니면 적은 글자(예전 이모지) 그대로 */
function ElemIcon({ icon }: { icon: string }) {
  return ICONS[icon]
    ? <span className="mk" dangerouslySetInnerHTML={{ __html: ICONS[icon].svg }} />
    : <span>{icon || '·'}</span>;
}
/** 속성 상자 — 왼쪽 분류 상자에서 고른 분류의 속성(센티넬 → 속성 센티넬, 가이드 → 속성 가이드)을 보여 준다.
 *  원소는 여섯 칸 — 아직 적지 않은 칸은 「기록 준비 중」. 원소 칸을 누르면 아래에 힘의 특징 · 폭주 징후 */
function ElemBox({ group, from }: { group: ArchElemGroup; from: string }) {
  const [el, setEl] = useState(0);
  useEffect(() => { setEl(0); }, [group.id]);
  const e: ArchElement | undefined = group.elements[Math.min(el, group.elements.length - 1)];
  const slots = Math.max(ELEM_SLOTS, group.elements.length);
  // 속성 가이드는 폭주하지 않는다 — 두 번째 칸은 「힘의 역할」(같은 글씨색) (v2.0 사용자 요청)
  const role = iconKeyOf(group.icon) === 'guide';
  return (
    <div className="ar-pn ar-sw ar-elbox">
      <div className="ar-elbox-k"><span><i />LINKED · {from}</span><span>{group.elements.length} / {slots} ELEMENTS</span></div>
      <div className="ar-sw-body" key={group.id}>
        <b>{group.title}</b>{group.sub && <small>{group.sub}</small>}
        {group.body ? <p>{group.body}</p> : <p className="pend">기록 준비 중</p>}
        <div className="ar-els" role="tablist" aria-label="원소">
          {Array.from({ length: slots }, (_, i) => {
            const x = group.elements[i];
            return x ? (
              <button key={x.id} type="button" role="tab" aria-selected={x === e} className={`${x === e ? 'on' : ''}${ELEM_COLOR[x.icon] ? ' tint' : ''}`} onClick={() => setEl(i)}
                style={ELEM_COLOR[x.icon] ? { '--ec': ELEM_COLOR[x.icon] } as React.CSSProperties : undefined}>
                <ElemIcon icon={x.icon} /><em>{x.en}</em>
              </button>
            ) : (
              <button key={`p${i}`} type="button" className="pend" disabled aria-label="기록 준비 중"><span>·</span><em>{String(i + 1).padStart(2, '0')}</em></button>
            );
          })}
        </div>
        {e ? (
          <div className={`ar-el${ELEM_COLOR[e.icon] ? ' tint' : ''}`} key={e.id} style={ELEM_COLOR[e.icon] ? { '--ec': ELEM_COLOR[e.icon] } as React.CSSProperties : undefined}>
            <div className="ar-el-h">{ICONS[e.icon] && <span className="mk" dangerouslySetInnerHTML={{ __html: ICONS[e.icon].svg }} />}<b>{e.en}</b>{e.ko && <small>{e.ko}</small>}</div>
            <dl>
              {e.power && <div><dt>POWER · 힘의 특징</dt><dd>{e.power}</dd></div>}
              {e.overload && (role
                ? <div><dt>ROLE · 힘의 역할</dt><dd>{e.overload}</dd></div>
                : <div className="rd"><dt>OVERLOAD · 폭주 징후</dt><dd>{e.overload}</dd></div>)}
            </dl>
          </div>
        ) : <div className="ar-el pend">원소 기록 준비 중</div>}
      </div>
    </div>
  );
}

/** 각성자 | 속성 각성자 — 왼쪽에서 고른 분류에 맞는 속성이 오른쪽에 (같은 마크 그림끼리, 없으면 같은 순서) */
function ClassPair({ items, groups, hd }: { items: ArchClass[]; groups: ArchElemGroup[] | null; hd: ReturnType<typeof headsOf> }) {
  const [on, setOn] = useState(0);
  const cur = items[Math.min(on, items.length - 1)];
  const gi = cur && groups ? groups.findIndex(g => iconKeyOf(g.icon) === iconKeyOf(cur.icon)) : -1;
  const group = groups && groups.length ? groups[gi >= 0 ? gi : Math.min(on, groups.length - 1)] : null;
  return (
    <div className={`ar-cls2${group ? '' : ' one'}`}>
      {items.length > 0 && (
        <div className="ar-cls2-col">
          <SubHead h={hd.aw} />
          <div className={`ar-sw-wrap${group ? ' linked' : ''}`}>
            <ClassSwitch items={items} on={on} setOn={setOn} linked={!!group} />
            {/* 옆 속성 상자로 이어지는 선 (PC) — 상자 밖에 그려야 잘리지 않는다 */}
            {group && <span className="ar-link" aria-hidden="true"><i /><b /><i /></span>}
          </div>
        </div>
      )}
      {group && <div className="ar-cls2-col wide"><SubHead h={hd.el} /><ElemBox group={group} from={cur?.title ?? ''} /></div>}
    </div>
  );
}

/** 직급 체계 — 등급 띠와 같은 버튼 줄, 누른 직급의 설명이 아래 카드로 */
function RanksView({ ranks }: { ranks: ArchRanks }) {
  const [on, setOn] = useState(0);
  const cur = ranks.items[Math.min(on, ranks.items.length - 1)];
  if (!cur) return null;
  return (
    <div className="ar-ranks">
      <div className="ar-pn ar-grade ar-rank-bar" role="tablist" aria-label="직급 체계">
        {ranks.items.map((r, i) => (
          <React.Fragment key={r.id}>
            {r.apart && <b className="ar-rank-sep" aria-hidden="true" />}
            <button type="button" role="tab" aria-selected={i === on} className={i === on ? 's' : undefined} onClick={() => setOn(i)}>{r.key}</button>
          </React.Fragment>
        ))}
        <i /><span className="cap">{ranks.caption}</span>
      </div>
      {/* 버튼 줄 → 설명 카드 잇는 선 (PC — 각성자 · 속성 각성자와 같은 모양) */}
      <span className="ar-link" aria-hidden="true"><i /><b /><i /></span>
      <article className="ar-pn ar-card ar-rank-card" key={cur.id}>
        <div className="ar-c-k"><span>RANK · {cur.tag || cur.key}</span>{cur.grade && <span>{cur.grade}</span>}</div>
        <h3><span className="ar-silver">{cur.en}</span><small>{[cur.name, cur.alias && `‘${cur.alias}’`].filter(Boolean).join(' · ')}</small></h3>
        {cur.body && <p>{cur.body}</p>}
        {/* 뒤 큰 글자 — 분류 카드의 이니셜 워터마크와 같은 모양, 버튼 글자 그대로 */}
        {cur.key && <span className="bg" aria-hidden="true">{cur.key}</span>}
      </article>
    </div>
  );
}

function BlockView({ b }: { b: ArchBlock }) {
  switch (b.type) {
    case 'head':
      return (
        <div className="ar-sh">
          {b.num && <span className="ar-sn">{b.num}</span>}
          <div><b>{b.title}</b>{b.sub && <small>{b.sub}</small>}</div>
          <i />
          {b.doc && <em>{b.doc}</em>}
        </div>
      );
    case 'cards':
      return b.cards.length ? (
        <div className={`ar-about${b.cards.length === 1 ? ' one' : ''}`}>
          {b.cards.map(c => <CardView key={c.id} c={c} />)}
        </div>
      ) : null;
    case 'classes':
      if (layoutOf(b) === 'switch') {
        // 한 상자 + 속성 상자 보기 (v2.0 사용자 요청) — 각성자 | 속성 각성자, 아래 직급 분류
        const hd = headsOf(b), els = elementalOf(b);
        return (
          <>
            <ClassPair items={b.items} groups={els} hd={hd} />
            {gradeOf(b) && gradeOf(b)!.letters.length > 0 && (
              <div className="ar-pn ar-grade">
                {gradeOf(b)!.letters.map((l, i) => <span key={i} className={i === gradeOf(b)!.on ? 's' : undefined}>{l}</span>)}
                <i />{gradeOf(b)!.caption}
              </div>
            )}
            {ranksOf(b) && <><SubHead h={hd.rk} /><RanksView ranks={ranksOf(b)!} /></>}
          </>
        );
      }
      return (
        <>
          {b.items.length > 0 && (
            <div className="ar-cls">
              {b.items.map(it => (
                <div key={it.id} className={`ar-pn ar-cl${moreOf(it) ? ' has-more' : ''}`}>
                  {moreOf(it) && <MoreButton more={moreOf(it)!} />}
                  {it.icon !== 'none' && <span className="ar-ic" dangerouslySetInnerHTML={{ __html: iconSvg(it.icon) }} />}
                  <b>{it.title}</b>{it.sub && <small>{it.sub}</small>}
                  {it.body && <p>{it.body}</p>}
                  {it.letter && <span className="bg">{it.letter}</span>}
                </div>
              ))}
            </div>
          )}
          {gradeOf(b) && gradeOf(b)!.letters.length > 0 && (
            <div className="ar-pn ar-grade">
              {gradeOf(b)!.letters.map((l, i) => <span key={i} className={i === gradeOf(b)!.on ? 's' : undefined}>{l}</span>)}
              <i />{gradeOf(b)!.caption}
            </div>
          )}
          {ranksOf(b) && <RanksView ranks={ranksOf(b)!} />}
        </>
      );
    case 'text':
      return b.html.replace(/<[^>]+>/g, '').trim() || /<img/i.test(b.html)
        ? <div className="ar-pn ar-card ar-text"><div className="ar-cbody" dangerouslySetInnerHTML={{ __html: sanitizeHtml(b.html) }} /></div>
        : <Pending label="기록 준비 중" />;
    case 'image':
      return b.src ? <ImageView src={b.src} caption={b.caption} /> : <Pending label="자료 준비 중" />;
    case 'map':
      return b.nodes.length ? <AegisMap nodes={b.nodes} caption={b.caption} /> : <Pending label="자료 준비 중" />;
    case 'roster':
      return b.groups.some(g => g.agents.length) ? <RosterView groups={b.groups} /> : <Pending label="명부 준비 중" />;
    case 'html':
      return <div className="ar-rawhtml" dangerouslySetInnerHTML={{ __html: stripScripts(b.html) }} />;
  }
}

/* ───────────── 편집 창 ───────────── */

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`ad-field${wide ? ' wide' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function FactsEditor({ facts, onChange }: { facts: ArchFact[]; onChange: (f: ArchFact[]) => void }) {
  const set = (i: number, p: Partial<ArchFact>) => onChange(facts.map((f, j) => (j === i ? { ...f, ...p } : f)));
  return (
    <div className="ad-list">
      <div className="ad-sub">아래 정보 (2열)</div>
      {facts.map((f, i) => (
        <div key={i} className="ad-row">
          <KInput placeholder="항목 (예: TYPE)" value={f.k} onChange={e => set(i, { k: e.target.value })} />
          <KInput placeholder="값" value={f.v} onChange={e => set(i, { v: e.target.value })} />
          <KCheck label="빨강" checked={!!f.bad} onChange={v => set(i, { bad: v || undefined })} />
          <span className="ad-mini">
            <button type="button" onClick={() => onChange(move(facts, i, -1))}>↑</button>
            <button type="button" onClick={() => onChange(move(facts, i, 1))}>↓</button>
            <button type="button" onClick={() => onChange(facts.filter((_, j) => j !== i))}>✕</button>
          </span>
        </div>
      ))}
      <button type="button" className="btn btn-ghost ad-add" onClick={() => onChange([...facts, { k: '', v: '' }])}>＋ 정보 추가</button>
    </div>
  );
}

function CardEditor({ c, onChange }: { c: ArchCard; onChange: (c: ArchCard) => void }) {
  const set = (p: Partial<ArchCard>) => onChange({ ...c, ...p });
  return (
    <div className="ad-grid">
      <Field label="위 작은 글씨 (왼쪽)"><KInput value={c.kL} onChange={e => set({ kL: e.target.value })} /></Field>
      <Field label="위 작은 글씨 (오른쪽)"><KInput value={c.kR} onChange={e => set({ kR: e.target.value })} /></Field>
      <Field label="큰 제목"><KInput value={c.title} onChange={e => set({ title: e.target.value })} /></Field>
      <Field label="제목 아래 글씨"><KInput value={c.sub} onChange={e => set({ sub: e.target.value })} /></Field>
      <Field label="본문" wide><RichEditor value={c.body} onChange={html => set({ body: html })} placeholder="본문" /></Field>
      <div className="ad-field wide">
        <KCheck label="레이더 그림 넣기 (오른쪽)" checked={!!c.radar}
          onChange={v => set({ radar: v ? (c.radar ?? { label: c.title, trace: 'TRACE · NONE' }) : null })} />
        {c.radar && (
          <div className="ad-row">
            <KInput placeholder="점 옆 글씨" value={c.radar.label} onChange={e => set({ radar: { ...c.radar!, label: e.target.value } })} />
            <KInput placeholder="아래 글씨" value={c.radar.trace} onChange={e => set({ radar: { ...c.radar!, trace: e.target.value } })} />
          </div>
        )}
      </div>
      <div className="ad-field wide">
        <KCheck label="인용 띠 넣기" checked={!!c.quote}
          onChange={v => set({ quote: v ? (c.quote ?? { label: 'DESIGNATION', text: '' }) : null })} />
        {c.quote && (
          <div className="ad-row">
            <KInput placeholder="작은 글씨" value={c.quote.label} onChange={e => set({ quote: { ...c.quote!, label: e.target.value } })} />
            <KInput placeholder="문구" value={c.quote.text} onChange={e => set({ quote: { ...c.quote!, text: e.target.value } })} style={{ flex: 2 }} />
          </div>
        )}
      </div>
      <div className="ad-field wide"><FactsEditor facts={c.facts} onChange={facts => set({ facts })} /></div>
    </div>
  );
}

function ClassEditor({ it, onChange }: { it: ArchClass; onChange: (c: ArchClass) => void }) {
  const set = (p: Partial<ArchClass>) => onChange({ ...it, ...p });
  const opts = [
    ...Object.entries(ICONS).map(([k, v]) => ({ value: k, label: v.label })),
    ...(iconKeyOf(it.icon).startsWith('svg:') ? [{ value: it.icon, label: '원래 그림 (HTML에서 옮김)' }] : []),
    { value: 'none', label: '없음' },
  ];
  return (
    <div className="ad-grid">
      <Field label="아이콘">
        <div className="ad-row">
          <KSelect options={opts} value={iconKeyOf(it.icon)} onChange={v => set({ icon: v })} minWidth={180} />
          {it.icon !== 'none' && <span className="ad-icprev" dangerouslySetInnerHTML={{ __html: iconSvg(it.icon) }} />}
        </div>
      </Field>
      <Field label="뒤 큰 글자 (워터마크)"><KInput maxLength={3} value={it.letter} onChange={e => set({ letter: e.target.value })} /></Field>
      <Field label="이름"><KInput value={it.title} onChange={e => set({ title: e.target.value })} /></Field>
      <Field label="이름 아래 글씨"><KInput value={it.sub} onChange={e => set({ sub: e.target.value })} /></Field>
      <Field label="설명" wide><KTextarea rows={3} value={it.body} onChange={e => set({ body: e.target.value })} /></Field>
      <MoreEditor more={moreOf(it)} onChange={more => set({ more })} />
    </div>
  );
}

function MoreEditor({ more, onChange }: { more: ArchMore | null; onChange: (m: ArchMore | null) => void }) {
  const setRow = (i: number, p: Partial<{ k: string; v: string }>) =>
    more && onChange({ ...more, rows: more.rows.map((r, j) => (j === i ? { ...r, ...p } : r)) });
  return (
    <div className="ad-field wide">
      <KCheck label="오른쪽 위 상세 버튼 넣기 (누르면 작은 창)" checked={!!more}
        onChange={v => onChange(v ? (more ?? { label: '상세 규약', title: '', rows: [{ k: '', v: '' }] }) : null)} />
      {more && (
        <div className="ad-list" style={{ marginTop: 8 }}>
          <div className="ad-row">
            <KInput placeholder="버튼 글씨" value={more.label} onChange={e => onChange({ ...more, label: e.target.value })} />
            <KInput placeholder="창 제목 (비우면 버튼 글씨)" value={more.title} onChange={e => onChange({ ...more, title: e.target.value })} />
          </div>
          {more.rows.map((r, i) => (
            <div key={i} className="ad-row" style={{ alignItems: 'flex-start' }}>
              <KInput placeholder="항목 (예: 방식)" value={r.k} onChange={e => setRow(i, { k: e.target.value })} style={{ flex: '0 1 110px' }} />
              <KTextarea rows={2} placeholder="설명" value={r.v} onChange={e => setRow(i, { v: e.target.value })} style={{ flex: '1 1 240px' }} />
              <span className="ad-mini">
                <button type="button" onClick={() => onChange({ ...more, rows: move(more.rows, i, -1) })}>↑</button>
                <button type="button" onClick={() => onChange({ ...more, rows: move(more.rows, i, 1) })}>↓</button>
                <button type="button" onClick={() => onChange({ ...more, rows: more.rows.filter((_, j) => j !== i) })}>✕</button>
              </span>
            </div>
          ))}
          <button type="button" className="btn btn-ghost ad-add" onClick={() => onChange({ ...more, rows: [...more.rows, { k: '', v: '' }] })}>＋ 항목 추가</button>
        </div>
      )}
    </div>
  );
}

/** 속성 상자 편집 (v2.0) — 마크(속성 센티넬 · 속성 가이드)마다 소개 + 원소 목록 */
function ElementalEditor({ groups, onChange }: { groups: ArchElemGroup[] | null; onChange: (g: ArchElemGroup[] | null) => void }) {
  const icons = [...Object.entries(ICONS).map(([k, v]) => ({ value: k, label: v.label })), { value: 'none', label: '없음' }];
  return (
    <div className="ad-field wide" style={{ marginTop: 14 }}>
      <KCheck label="옆에 속성 상자 넣기 (마크로 전환 · 원소를 누르면 설명)" checked={!!groups}
        onChange={v => onChange(v ? (groups ?? [blankElemGroup()]) : null)} />
      {groups && (
        <div className="ad-list" style={{ marginTop: 8 }}>
          <ItemList items={groups} onChange={onChange} make={blankElemGroup} addLabel="마크 추가"
            title={(g: ArchElemGroup, i) => `마크 ${i + 1} — ${g.sub || g.title || '(이름 없음)'}`}
            render={(g: ArchElemGroup, sg: (v: ArchElemGroup) => void) => (
              <div className="ad-grid">
                <Field label="마크 그림">
                  <div className="ad-row">
                    <KSelect options={icons} value={g.icon} onChange={v => sg({ ...g, icon: v })} minWidth={180} />
                    {g.icon !== 'none' && <span className="ad-icprev" dangerouslySetInnerHTML={{ __html: iconSvg(g.icon) }} />}
                  </div>
                </Field>
                <Field label="영문 이름 (마크 아래 · 큰 제목)"><KInput value={g.title} onChange={e => sg({ ...g, title: e.target.value })} /></Field>
                <Field label="한글 이름"><KInput value={g.sub} onChange={e => sg({ ...g, sub: e.target.value })} /></Field>
                <Field label="소개" wide><KTextarea rows={3} value={g.body} onChange={e => sg({ ...g, body: e.target.value })} /></Field>
                <div className="ad-field wide">
                  <div className="ad-sub">원소 (칸을 누르면 아래에 설명)</div>
                  <ItemList items={g.elements} onChange={elements => sg({ ...g, elements })} make={blankElement} addLabel="원소 추가"
                    title={(x: ArchElement, i) => `${i + 1} — ${ICONS[x.icon] ? '' : `${x.icon} `}${x.en}${x.ko ? ` (${x.ko})` : ''}`}
                    render={(x: ArchElement, sx: (v: ArchElement) => void) => (
                      <div className="ad-grid">
                        <Field label="마크">
                          <div className="ad-row">
                            <KSelect minWidth={150} value={ICONS[x.icon] ? x.icon : '__text'}
                              onChange={v => sx({ ...x, icon: v === '__text' ? '' : v })}
                              options={[...ELEM_ICON_KEYS.map(k => ({ value: k, label: ICONS[k].label })), { value: '__text', label: '직접 입력 (글자 · 이모지)' }]} />
                            {ICONS[x.icon]
                              ? <span className="ad-icprev" style={{ color: ELEM_COLOR[x.icon] }} dangerouslySetInnerHTML={{ __html: ICONS[x.icon].svg }} />
                              : <KInput maxLength={4} placeholder="예: 🔥" value={x.icon} onChange={e => sx({ ...x, icon: e.target.value })} />}
                          </div>
                        </Field>
                        <Field label="영문 이름 (예: PYRE)"><KInput value={x.en} onChange={e => sx({ ...x, en: e.target.value })} /></Field>
                        <Field label="한글 이름 (예: 불)"><KInput value={x.ko} onChange={e => sx({ ...x, ko: e.target.value })} /></Field>
                        <Field label="힘의 특징" wide><KTextarea rows={2} value={x.power} onChange={e => sx({ ...x, power: e.target.value })} /></Field>
                        <Field label={iconKeyOf(g.icon) === 'guide' ? '힘의 역할' : '폭주 징후 (빨강)'} wide><KTextarea rows={2} value={x.overload} onChange={e => sx({ ...x, overload: e.target.value })} /></Field>
                      </div>
                    )} />
                </div>
              </div>
            )} />
        </div>
      )}
    </div>
  );
}

function RanksEditor({ ranks, onChange }: { ranks: ArchRanks | null; onChange: (r: ArchRanks | null) => void }) {
  return (
    <div className="ad-field wide" style={{ marginTop: 14 }}>
      <KCheck label="직급 체계 넣기 (버튼을 누르면 아래 설명)" checked={!!ranks}
        onChange={v => onChange(v ? (ranks ?? { caption: 'RANK SYSTEM', items: [blankRank()] }) : null)} />
      {ranks && (
        <div className="ad-list" style={{ marginTop: 8 }}>
          <div className="ad-row"><KInput placeholder="버튼 줄 오른쪽 글씨" value={ranks.caption} onChange={e => onChange({ ...ranks, caption: e.target.value })} /></div>
          <ItemList items={ranks.items} onChange={items => onChange({ ...ranks, items })} make={blankRank} addLabel="직급 추가"
            title={(r: ArchRank) => `${r.key} — ${r.name || r.en || '(이름 없음)'}`}
            render={(r: ArchRank, sr: (v: ArchRank) => void) => (
              <div className="ad-grid">
                <Field label="버튼 글자 (영어 · 예: SS)"><KInput maxLength={4} value={r.key} onChange={e => sr({ ...r, key: e.target.value })} /></Field>
                <Field label="카드 위 RANK 글씨 (비우면 버튼 글자)"><KInput value={r.tag ?? ''} placeholder={r.key} onChange={e => sr({ ...r, tag: e.target.value || undefined })} /></Field>
                <Field label="오른쪽 위 작은 글씨 (선택)"><KInput value={r.grade} onChange={e => sr({ ...r, grade: e.target.value })} /></Field>
                <Field label="영문 이름 (은빛 큰 글씨)"><KInput value={r.en} onChange={e => sr({ ...r, en: e.target.value })} /></Field>
                <Field label="한글 이름"><KInput value={r.name} onChange={e => sr({ ...r, name: e.target.value })} /></Field>
                <Field label="별칭 (예: 원소의 군주)"><KInput value={r.alias} onChange={e => sr({ ...r, alias: e.target.value })} /></Field>
                <div className="ad-field"><span>&nbsp;</span><KCheck label="앞에 구분선 (부서 등 따로 묶기)" checked={!!r.apart} onChange={v => sr({ ...r, apart: v || undefined })} /></div>
                <Field label="설명" wide><KTextarea rows={3} value={r.body} onChange={e => sr({ ...r, body: e.target.value })} /></Field>
              </div>
            )} />
        </div>
      )}
    </div>
  );
}

/** 카드·분류처럼 「여러 개를 순서대로」 고치는 목록 */
function ItemList<T extends { id: string }>({ items, onChange, render, title, make, addLabel }: {
  items: T[]; onChange: (v: T[]) => void; render: (it: T, set: (v: T) => void) => React.ReactNode;
  title: (it: T, i: number) => string; make: () => T; addLabel: string;
}) {
  const [open, setOpen] = useState<string | null>(items[0]?.id ?? null);
  return (
    <div className="ad-items">
      {items.map((it, i) => (
        <div key={it.id} className={`ad-item${open === it.id ? ' open' : ''}`}>
          <div className="ad-item-h">
            <button type="button" className="ad-item-t" onClick={() => setOpen(open === it.id ? null : it.id)}>
              {open === it.id ? '▾' : '▸'} {title(it, i)}
            </button>
            <span className="ad-mini">
              <button type="button" onClick={() => onChange(move(items, i, -1))}>↑</button>
              <button type="button" onClick={() => onChange(move(items, i, 1))}>↓</button>
              <button type="button" onClick={() => onChange(items.filter(x => x.id !== it.id))}>✕</button>
            </span>
          </div>
          {open === it.id && <div className="ad-item-b">{render(it, v => onChange(items.map(x => (x.id === it.id ? v : x))))}</div>}
        </div>
      ))}
      <button type="button" className="btn btn-ghost ad-add" onClick={() => { const n = make(); onChange([...items, n]); setOpen(n.id); }}>＋ {addLabel}</button>
    </div>
  );
}

function ImageEditor({ b, set }: { b: Extract<ArchBlock, { type: 'image' }>; set: (b: ArchBlock) => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const url = useBlobUrl(b.src);
  const pick = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    try { set({ ...b, src: await putBlob(f) }); } catch (e) { toast(`올리지 못했습니다 — ${e instanceof Error ? e.message : ''}`); }
    setBusy(false);
  };
  return (
    <div className="ad-grid">
      <div className="ad-field wide">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url && <img src={url} alt="" className="ad-imgprev" />}
        <div className="ad-row">
          <label className="btn btn-ghost">{busy ? '올리는 중…' : url ? '이미지 바꾸기' : '이미지 올리기'}
            <input type="file" accept="image/*" hidden onChange={e => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          {url && <button type="button" className="btn btn-ghost" onClick={() => set({ ...b, src: '' })}>빼기</button>}
        </div>
      </div>
      <Field label="설명 (선택)" wide><KInput value={b.caption} onChange={e => set({ ...b, caption: e.target.value })} /></Field>
    </div>
  );
}

/** 요원 명부 편집 — 무리(이름 · 등급 · 색) → 요원(사진 · 이름 · 원소 · 상세 HTML) */
function AgentPhotoField({ a, set }: { a: ArchAgent; set: (v: ArchAgent) => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const url = useBlobUrl(a.photo);
  const pick = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    try { set({ ...a, photo: await putBlob(f) }); } catch (e) { toast(`올리지 못했습니다 — ${e instanceof Error ? e.message : ''}`); }
    setBusy(false);
  };
  return (
    <div className="ad-field">
      <span>증명사진 (세로 3:4)</span>
      <div className="ad-row">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url && <img src={url} alt="" style={{ width: 48, height: 64, objectFit: 'cover', border: '1px solid rgba(190,208,228,.2)' }} />}
        <label className="btn btn-ghost">{busy ? '올리는 중…' : url ? '사진 바꾸기' : '사진 올리기'}
          <input type="file" accept="image/*" hidden onChange={e => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
        {url && <button type="button" className="btn btn-ghost" onClick={() => set({ ...a, photo: '' })}>빼기</button>}
      </div>
    </div>
  );
}
function RosterEditor({ b, set }: { b: Extract<ArchBlock, { type: 'roster' }>; set: (b: ArchBlock) => void }) {
  const elOpts = [{ value: '', label: '딱지 없음' }, { value: 'none', label: '무속성 (회색 · 가이드 마크)' }, ...ELEM_ICON_KEYS.map(k => ({ value: k, label: ICONS[k].label }))];
  return (
    <ItemList items={b.groups} onChange={groups => set({ ...b, groups })} make={blankAgentGroup} addLabel="무리 추가"
      title={(g: ArchAgentGroup) => `${g.title || '(이름 없음)'} — ${g.agents.length}명`}
      render={(g: ArchAgentGroup, sg: (v: ArchAgentGroup) => void) => (
        <div className="ad-grid">
          <Field label="무리 이름 (예: VANGUARD 1팀)"><KInput value={g.title} onChange={e => sg({ ...g, title: e.target.value })} /></Field>
          <Field label="오른쪽 등급 (예: S-CLASS)"><KInput value={g.cls} onChange={e => sg({ ...g, cls: e.target.value })} /></Field>
          <Field label="무리 색 (밑줄 · 등급 글씨)"><ColorField value={g.color} onChange={color => sg({ ...g, color })} /></Field>
          <div className="ad-field wide">
            <div className="ad-sub">요원</div>
            <ItemList items={g.agents} onChange={agents => sg({ ...g, agents })} make={blankAgent} addLabel="요원 추가"
              title={(a: ArchAgent, i) => `${i + 1} — ${a.name || '(이름 없음)'}${ELEM_KO[a.element] ? ` · ${ELEM_KO[a.element]}` : ''}`}
              render={(a: ArchAgent, sa: (v: ArchAgent) => void) => (
                <div className="ad-grid">
                  <AgentPhotoField a={a} set={sa} />
                  <Field label="원소"><KSelect minWidth={160} value={a.element} onChange={v => sa({ ...a, element: v })} options={elOpts} /></Field>
                  <Field label="이름"><KInput value={a.name} onChange={e => sa({ ...a, name: e.target.value })} /></Field>
                  <Field label="이름 아래 작은 글씨 (선택 · 예: CODE S-0001)"><KInput value={a.en ?? ''} onChange={e => sa({ ...a, en: e.target.value })} /></Field>
                  <Field label="상세 프로필 (HTML — 사진을 누르면 뜨는 창)" wide>
                    <KTextarea rows={10} value={a.html} onChange={e => sa({ ...a, html: e.target.value })}
                      placeholder={'<p>나이 · 키 · 소속 같은 정보를 HTML로 자유롭게</p>'} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }} />
                  </Field>
                </div>
              )} />
          </div>
        </div>
      )} />
  );
}

const SPOT_OPTS = Object.entries(AEGIS_SPOTS).map(([value, s]) => ({ value, label: s.label }));
const blankNode = (): ArchMapNode => ({ id: newId(), code: '', en: 'FACILITY', name: '', zone: '', spot: 'sdiv', body: '', quote: null });

/** 아이기스 지도 — 그림은 고정, 시설마다 그림 속 자리를 하나 고른다 */
function MapEditor({ b, set }: { b: Extract<ArchBlock, { type: 'map' }>; set: (b: ArchBlock) => void }) {
  return (
    <>
      <div className="ad-grid">
        <Field label="지도 위 제목 (비우면 THE AEGIS · CROSS SECTION)" wide><KInput value={b.caption} onChange={e => set({ ...b, caption: e.target.value })} /></Field>
      </div>
      <ItemList items={b.nodes} onChange={nodes => set({ ...b, nodes })} make={blankNode} addLabel="시설 추가"
        title={(n: ArchMapNode) => `${n.code || '—'} ${n.name || n.en || '(이름 없음)'}`}
        render={(n: ArchMapNode, sn: (v: ArchMapNode) => void) => (
          <div className="ad-grid">
            <Field label="번호 (예: 01)"><KInput maxLength={4} value={n.code} onChange={e => sn({ ...n, code: e.target.value })} /></Field>
            <Field label="그림 속 자리"><KSelect options={SPOT_OPTS} value={n.spot} onChange={v => sn({ ...n, spot: v })} minWidth={180} /></Field>
            <Field label="영문 이름 (은빛 큰 글씨)"><KInput value={n.en} onChange={e => sn({ ...n, en: e.target.value })} /></Field>
            <Field label="한글 이름"><KInput value={n.name} onChange={e => sn({ ...n, name: e.target.value })} /></Field>
            <Field label="다른 이름 (선택)"><KInput value={n.alias ?? ''} onChange={e => sn({ ...n, alias: e.target.value || undefined })} /></Field>
            <Field label="구역 (예: DECK 1)"><KInput value={n.zone} onChange={e => sn({ ...n, zone: e.target.value })} /></Field>
            <Field label="설명 (빈 줄로 문단 나눔)" wide><KTextarea rows={6} value={n.body} onChange={e => sn({ ...n, body: e.target.value })} /></Field>
            <Field label="현장 묘사 (선택)" wide><KTextarea rows={3} value={n.quote?.text ?? ''}
              onChange={e => sn({ ...n, quote: e.target.value ? { text: e.target.value, cite: n.quote?.cite ?? '' } : null })} /></Field>
            {n.quote && <Field label="현장 묘사 출처" wide><KInput value={n.quote.cite} onChange={e => sn({ ...n, quote: { text: n.quote!.text, cite: e.target.value } })} /></Field>}
            <Field label="덧붙임 (※ 뒤 작은 글씨 · 선택)" wide><KInput value={n.note ?? ''} onChange={e => sn({ ...n, note: e.target.value || undefined })} /></Field>
            {AEGIS_SPOTS[n.spot]?.big && (
              <Field label="강조 색 (#RRGGBB · 비우면 이름이 같은 캐릭터의 대표색)" wide>
                <div className="ad-row">
                  <KInput value={n.color ?? ''} placeholder="#b8d8ff" onChange={e => sn({ ...n, color: e.target.value.trim() || undefined })} />
                  <input type="color" value={/^#[0-9a-f]{6}$/i.test(n.color ?? '') ? n.color : '#b8d8ff'} onChange={e => sn({ ...n, color: e.target.value })} style={{ width: 44, height: 36, padding: 0, border: 0, background: 'none' }} />
                </div>
              </Field>
            )}
          </div>
        )} />
    </>
  );
}

function BlockEditor({ b, set }: { b: ArchBlock; set: (b: ArchBlock) => void }) {
  switch (b.type) {
    case 'head':
      return (
        <div className="ad-grid">
          <Field label="번호 (예: 01)"><KInput value={b.num} onChange={e => set({ ...b, num: e.target.value })} /></Field>
          <Field label="오른쪽 문서 번호 (선택)"><KInput value={b.doc} onChange={e => set({ ...b, doc: e.target.value })} /></Field>
          <Field label="영문 제목"><KInput value={b.title} onChange={e => set({ ...b, title: e.target.value })} /></Field>
          <Field label="한글 부제"><KInput value={b.sub} onChange={e => set({ ...b, sub: e.target.value })} /></Field>
        </div>
      );
    case 'cards':
      return (
        <ItemList items={b.cards} onChange={cards => set({ ...b, cards })} make={blankCard} addLabel="카드 추가"
          title={(c, i) => `카드 ${i + 1} — ${c.title || '(제목 없음)'}`}
          render={(c, sc) => <CardEditor c={c} onChange={sc} />} />
      );
    case 'classes': {
      const g = gradeOf(b);
      // 등급 띠·직급 체계 중 하나를 고치면 다른 하나도 지금 보이는 값으로 고정 — 기본값 판정이 풀리며 숨겨 둔 띠가 되살아나지 않게
      const setGrade = (grade: typeof g) => set({ ...b, grade, ranks: ranksOf(b) });
      return (
        <>
          <div className="ad-field wide" style={{ marginBottom: 12 }}>
            <span>보기</span>
            <KSelect value={layoutOf(b)} onChange={v => set({ ...b, layout: v as 'switch' | 'grid' })} minWidth={260}
              options={[{ value: 'switch', label: '한 상자 + 마크 전환 · 옆에 속성 상자' }, { value: 'grid', label: '카드 나란히 (예전)' }]} />
          </div>
          {layoutOf(b) === 'switch' && (
            <div className="ad-field wide" style={{ marginBottom: 12 }}>
              <span>소제목 (영문 · 한글 · 오른쪽 작은 글씨)</span>
              {([['aw', '분류 상자 위'], ['el', '속성 상자 위'], ['rk', '직급 위']] as const).map(([k, lb]) => {
                const hd = headsOf(b), h = hd[k];
                const setH = (i: number, v: string) => set({ ...b, heads: { ...hd, [k]: h.map((x, j) => (j === i ? v : x)) as ArchSubHead } });
                return (
                  <div key={k} className="ad-row">
                    <span className="ad-mini" style={{ flex: '0 0 84px', whiteSpace: 'nowrap' }}>{lb}</span>
                    <KInput placeholder={DEFAULT_HEADS[k][0]} value={h[0]} onChange={e => setH(0, e.target.value)} />
                    <KInput placeholder={DEFAULT_HEADS[k][1]} value={h[1]} onChange={e => setH(1, e.target.value)} />
                    <KInput placeholder="(선택)" value={h[2]} onChange={e => setH(2, e.target.value)} />
                  </div>
                );
              })}
            </div>
          )}
          <ItemList items={b.items} onChange={items => set({ ...b, items })} make={blankClass} addLabel="분류 추가"
            title={(c, i) => `${i + 1} — ${c.title || '(이름 없음)'}`}
            render={(c, sc) => <ClassEditor it={c} onChange={sc} />} />
          {layoutOf(b) === 'switch' && <ElementalEditor groups={elementalOf(b)} onChange={elemental => set({ ...b, elemental })} />}
          <div className="ad-field wide" style={{ marginTop: 14 }}>
            <KCheck label="아래 등급 띠 넣기 (S A B C D …)" checked={!!g}
              onChange={v => setGrade(v ? (g ?? { letters: ['S', 'A', 'B', 'C', 'D'], on: 0, caption: 'CLASS RATING' }) : null)} />
            {g && (
              <div className="ad-row">
                <KInput placeholder="글자 (띄어쓰기로 구분)" value={g.letters.join(' ')}
                  onChange={e => setGrade({ ...g, letters: e.target.value.split(/\s+/).filter(Boolean) })} />
                <KSelect value={String(g.on)} onChange={v => setGrade({ ...g, on: Number(v) })}
                  options={g.letters.map((l, i) => ({ value: String(i), label: `강조: ${l}` }))} minWidth={110} />
                <KInput placeholder="오른쪽 글씨" value={g.caption} onChange={e => setGrade({ ...g, caption: e.target.value })} style={{ flex: 2 }} />
              </div>
            )}
          </div>
          <RanksEditor ranks={ranksOf(b)} onChange={ranks => set({ ...b, ranks, grade: g })} />
        </>
      );
    }
    case 'text':
      return <RichEditor value={b.html} onChange={html => set({ ...b, html })} placeholder="내용을 입력하세요" />;
    case 'image':
      return <ImageEditor b={b} set={set} />;
    case 'map':
      return <MapEditor b={b} set={set} />;
    case 'roster':
      return <RosterEditor b={b} set={set} />;
    case 'html':
      return (
        <KTextarea value={b.html} onChange={e => set({ ...b, html: e.target.value })}
          style={{ minHeight: 320, fontFamily: 'var(--mono, Consolas, monospace)', fontSize: 12.5 }} />
      );
  }
}

/* ───────────── 페이지 ───────────── */

export function ArchDocView({ doc, canEdit, onSave, onUseHtml, fromHtml }: {
  doc: ArchDoc;
  canEdit: boolean;
  onSave: (d: ArchDoc) => void;
  /** 탭 문서를 끄고 원래 HTML 페이지로 */
  onUseHtml?: () => void;
  /** 아직 저장 전 — HTML을 읽어 만든 문서 */
  fromHtml?: boolean;
}) {
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState<ArchDoc>(doc);
  useEffect(() => { if (!edit) setDraft(doc); }, [doc, edit]);
  const cur = edit ? draft : doc;

  // 탭 — 주소(?tab=이름)에 남겨 링크로 바로 열 수 있게
  const want = params.get('tab');
  const [tabId, setTabId] = useState<string | null>(null);
  const tab = cur.tabs.find(t => t.id === tabId) ?? cur.tabs.find(t => t.label === want) ?? cur.tabs[0];
  const pickTab = (id: string) => {
    setTabId(id);
    const t = cur.tabs.find(x => x.id === id);
    if (!t || edit) return;
    const q = new URLSearchParams(params.toString());
    if (t.id === cur.tabs[0]?.id) q.delete('tab'); else q.set('tab', t.label);
    const s = q.toString();
    router.replace(s ? `?${s}` : window.location.pathname, { scroll: false });
  };

  const [editing, setEditing] = useState<ArchBlock | null>(null);
  const [headOpen, setHeadOpen] = useState(false);
  const [addType, setAddType] = useState<ArchBlock['type']>('text');
  const dirty = useMemo(() => edit && JSON.stringify(draft) !== JSON.stringify(doc), [edit, draft, doc]);

  const setTab = (fn: (t: typeof tab) => typeof tab) =>
    setDraft(d => ({ ...d, tabs: d.tabs.map(t => (t.id === tab.id ? fn(t) : t)) }));
  const setBlocks = (fn: (b: ArchBlock[]) => ArchBlock[]) => setTab(t => ({ ...t, blocks: fn(t.blocks) }));

  const save = () => { onSave(draft); setEdit(false); toast('저장되었습니다'); };
  const cancel = () => { setDraft(doc); setEdit(false); };

  if (!tab) return null;
  const tIdx = cur.tabs.findIndex(t => t.id === tab.id);

  return (
    <div className={`arx arp page-arch ad-root${edit ? ' ad-editing' : ''}`}>
      <div className="ar-wrap">
        {canEdit && (
          <div className="ad-bar ad-ui">
            {edit ? (
              <>
                <button className="btn btn-ghost" onClick={() => setHeadOpen(true)}>제목</button>
                {onUseHtml && <button className="btn btn-ghost" onClick={onUseHtml}>HTML로 되돌리기</button>}
                <button className="btn btn-ghost" onClick={cancel}>CANCEL</button>
                <button className="btn btn-dark" disabled={!dirty && !fromHtml} onClick={save}>SAVE</button>
              </>
            ) : (
              <button className="btn btn-ghost" onClick={() => { setDraft(clone(doc)); setEdit(true); }}>✎ EDIT</button>
            )}
          </div>
        )}

        <section className="ar-ptitle">
          <h1 className="ar-silver">{cur.title}</h1>
          {cur.doc && <div className="doc">{cur.doc.split('\n').map((l, i) => <React.Fragment key={i}>{i > 0 && <br />}{l}</React.Fragment>)}</div>}
        </section>

        {/* 목차 탭 */}
        <nav className="ar-pn ad-tabs" aria-label="목차">
          {cur.tabs.map(t => (
            <button key={t.id} type="button" className={t.id === tab.id ? 'on' : ''} onClick={() => pickTab(t.id)}>{t.label || '(이름 없음)'}</button>
          ))}
          {edit && (
            <button type="button" className="ad-tab-add" onClick={() => {
              const t = { id: newId(), label: '새 탭', blocks: [blankBlock('head', String(draft.tabs.length + 1).padStart(2, '0'))] };
              setDraft(d => ({ ...d, tabs: [...d.tabs, t] }));
              setTabId(t.id);
            }}>＋ 탭</button>
          )}
        </nav>
        {edit && (
          <div className="ad-tabtools ad-ui">
            <KInput value={tab.label} placeholder="탭 이름" onChange={e => setTab(t => ({ ...t, label: e.target.value }))} />
            <span className="ad-mini">
              <button type="button" disabled={tIdx <= 0} onClick={() => setDraft(d => ({ ...d, tabs: move(d.tabs, tIdx, -1) }))}>◀</button>
              <button type="button" disabled={tIdx >= cur.tabs.length - 1} onClick={() => setDraft(d => ({ ...d, tabs: move(d.tabs, tIdx, 1) }))}>▶</button>
              <button type="button" disabled={cur.tabs.length <= 1} onClick={() => {
                if (!window.confirm(`「${tab.label}」 탭과 안의 내용을 지울까요? (SAVE 전엔 CANCEL로 되돌릴 수 있습니다)`)) return;
                setDraft(d => ({ ...d, tabs: d.tabs.filter(t => t.id !== tab.id) }));
                setTabId(null);
              }}>탭 삭제</button>
            </span>
          </div>
        )}

        <section className="ar-sec" key={tab.id}>
          {tab.blocks.map((b, i) => (
            <div key={b.id} className={`ad-block ad-${b.type}`}>
              {edit && (
                <div className="ad-tools ad-ui">
                  <em>{BLOCK_LABEL[b.type]}</em>
                  <button type="button" onClick={() => setEditing(clone(b))}>✎</button>
                  <button type="button" onClick={() => setBlocks(bs => move(bs, i, -1))}>↑</button>
                  <button type="button" onClick={() => setBlocks(bs => move(bs, i, 1))}>↓</button>
                  <button type="button" onClick={() => setBlocks(bs => bs.filter(x => x.id !== b.id))}>✕</button>
                </div>
              )}
              <BlockView b={b} />
            </div>
          ))}
          {!tab.blocks.length && !edit && <Pending label="기록 준비 중" />}
          {edit && (
            <div className="ad-addblock ad-ui">
              <KSelect value={addType} onChange={v => setAddType(v as ArchBlock['type'])} minWidth={140}
                options={(Object.keys(BLOCK_LABEL) as ArchBlock['type'][]).map(k => ({ value: k, label: BLOCK_LABEL[k] }))} />
              <button type="button" className="btn btn-ghost" onClick={() => {
                const nb = blankBlock(addType);
                setBlocks(bs => [...bs, nb]);
                setEditing(clone(nb));
              }}>＋ 블록 추가</button>
            </div>
          )}
        </section>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing ? `${BLOCK_LABEL[editing.type]} 고치기` : ''}
        className="arch-modal ad-modal"
        actions={<>
          <button className="btn btn-ghost" onClick={() => setEditing(null)}>CANCEL</button>
          <button className="btn btn-dark" onClick={() => {
            if (editing) setBlocks(bs => bs.map(x => (x.id === editing.id ? editing : x)));
            setEditing(null);
          }}>적용</button>
        </>}>
        {editing && <BlockEditor b={editing} set={setEditing} />}
        <p className="ad-note">적용한 뒤 오른쪽 위 SAVE를 눌러야 저장됩니다</p>
      </Modal>

      <Modal open={headOpen} onClose={() => setHeadOpen(false)} title="페이지 제목" small className="arch-modal ad-modal"
        actions={<button className="btn btn-dark" onClick={() => setHeadOpen(false)}>적용</button>}>
        <div className="ad-grid">
          <Field label="큰 제목" wide><KInput value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} /></Field>
          <Field label="오른쪽 아래 문서 번호 (줄바꿈 가능)" wide>
            <KTextarea rows={2} value={draft.doc} onChange={e => setDraft(d => ({ ...d, doc: e.target.value }))} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
