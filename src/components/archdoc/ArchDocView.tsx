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
} from '@/lib/archDocStore';
import { newId } from '@/lib/postStore';
import { sanitizeHtml } from '@/lib/sanitize';
import { stripScripts } from '@/components/main/HtmlSlots';
import { useBlobUrl, putBlob } from '@/lib/blobStore';
import { Modal } from '@/components/ui/Modal';
import { KInput, KTextarea, KCheck, KSelect } from '@/components/ui/Kit';
import { RichEditor } from '@/components/ui/RichEditor';
import { useToast } from '@/components/ui/Toast';
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
        <i />{ranks.caption}
      </div>
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
          <ItemList items={b.items} onChange={items => set({ ...b, items })} make={blankClass} addLabel="분류 추가"
            title={(c, i) => `${i + 1} — ${c.title || '(이름 없음)'}`}
            render={(c, sc) => <ClassEditor it={c} onChange={sc} />} />
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
