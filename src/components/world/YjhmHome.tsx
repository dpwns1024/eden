'use client';
/**
 * YJHM 메인 화면 (lib/worldStore.ts) — 국가대표 사격선수 × 통역사 · 현대 일상 · 달달 로맨스.
 * 「필름」 1면 (사용자 확정 시안 Z3) — 미색 바탕 + 은은한 과녁 링 위에
 *  머리(Hong Yejun. · 오른쪽 위 BGM) → 기울어진 35mm 필름 띠가 천천히 흐름 → 아래 줄 왼쪽 SCRAP(최근 글 리스트) · 오른쪽 GUESTBOOK
 *  → 맨 아래 폴더 바(폴더는 왼쪽 · 오른쪽 칸은 비움) + 가운데 한마디.
 * 관리자가 이 자리에서 고치는 것 (lib/yjhmFrontStore.ts — 설정 한 칸):
 *  필름 — 대표 그림 + 이어지는 사진들 · 필름 보정 / GUESTBOOK — 말풍선 / 한마디.
 * SCRAP은 처음 시안 그대로 최근 글 리스트(날짜 · 제목 · 종류) — 직접 적는 스크랩으로 바꿨던 것은 되돌렸다 (사용자 요청).
 * 필름 가장자리에는 실제 필름에 찍히는 것만 (필름 이름 · 프레임 번호 · 감도 · DX 바코드). 모양은 yjhm.css.
 */
import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useLocalList, BOARD_SEED, GUEST_SEED, Post, GuestEntry } from '@/lib/postStore';
import { Character, CHAR_SEED, RelMember } from '@/lib/charStore';
import { BackupPost, BACKUP_SEED, backupNos, backupPath, TrpgLog, TRPG_SEED } from '@/lib/galleryStore';
import { DiaryPost, DIARY_SEED } from '@/lib/diaryStore';
import { logPath } from '@/lib/logPath';
import { usePairings, pairIdOf } from '@/lib/pairLink';
import { relOfWorld } from '@/lib/worldStore';
import {
  useYjhmFront, YjhmFront, YjhmFrame, YjhmNote, YjhmGrade, YJHM_GRADES, DEFAULT_GRADE, newId,
} from '@/lib/yjhmFrontStore';
import { putBlob, useBlobUrl } from '@/lib/blobStore';
import { CroppedBlobImg, CropEditor, CropValue } from '@/components/ui/CropEditor';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { YjhmHeader, YjhmDock } from './YjhmHeader';

/** 본문(HTML · 마크다운) → 한 줄 글 */
const plain = (s: string | undefined) => (s ?? '')
  .replace(/<(style|script)[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
  .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/[#>*_`~|]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n).trimEnd()}…` : s);
/** 2026-10-28… → 10.28 */
const md = (d: string) => (d.length >= 10 ? `${d.slice(5, 7)}.${d.slice(8, 10)}` : d);
const today = () => { const d = new Date(); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`; };
const ext = (href: string) => /^https?:\/\//.test(href);

/** 필름 한 칸 비율 (가로/세로) — 위치 조정 창도 이 비율로 */
const FRAME_ASPECT = 408 / 268;
/** 칸이 이보다 적으면 빈 칸으로 채워 띠가 끊기지 않게 */
const MIN_FRAMES = 6;

/** SCRAP 리스트 오른쪽 작은 글자 — 글 종류 */
type Kind = 'MATCH' | 'PHOTO' | 'DIARY' | 'NOTE';

interface Frame { key: string; img?: string; crop?: CropValue; href?: string; title?: string }

/** 필름 한 칸 — 가장자리 인쇄(필름 이름 · 프레임 번호 · 감도 · DX 바코드) + 보정한 사진 */
function FilmCell({ f, n, stock }: { f: Frame; n: number; stock: string }) {
  const pic = (
    <>
      <CroppedBlobImg fileRef={f.img} crop={f.crop} ph="yj-film-ph" alt={f.title ?? ''} />
      <i className="yj-grade" /><i className="yj-leak" /><i className="yj-grain" />
    </>
  );
  const fr = f.href
    ? (ext(f.href)
      ? <a className="yj-fr" href={f.href} target="_blank" rel="noreferrer" aria-label={f.title} tabIndex={-1}>{pic}</a>
      : <Link className="yj-fr" href={f.href} aria-label={f.title} tabIndex={-1}>{pic}</Link>)
    : <span className="yj-fr">{pic}</span>;
  return (
    <div className="yj-cell">
      <i className="yj-perf" /><i className="yj-perf b" />
      <span className="yj-ep t" style={{ left: '7%' }}>{n % 2 ? stock : 'SAFETY FILM'}</span>
      {n % 3 === 2 && <i className="yj-dx" />}
      <span className="yj-ep t" style={{ left: '68%' }}>{n}&nbsp; ▸ {n}A</span>
      {fr}
      <span className="yj-ep b" style={{ left: '7%' }}>▶ {n}</span>
      <span className="yj-ep b" style={{ left: '57%' }}>{n % 2 ? `ISO ${stock.match(/\d+/)?.[0] ?? '400'}` : `▶ ${n}A`}</span>
    </div>
  );
}

/** 흐르는 필름 띠 — 같은 칸 묶음을 두 번 이어 붙여 끝없이 흐르게 한다 */
function Film({ frames, grade }: { frames: Frame[]; grade: YjhmGrade }) {
  const stock = (YJHM_GRADES.find(g => g.key === grade) ?? YJHM_GRADES[0]).stock;
  const roll = (pre: string) => frames.map((f, i) => <FilmCell key={`${pre}${f.key}`} f={f} n={i + 1} stock={stock} />);
  return (
    <div className="yj-film" data-grade={grade} aria-label="사진 필름">
      <div className="yj-track">
        <div className="yj-roll">{roll('')}</div>
        <div className="yj-roll" aria-hidden="true">{roll('b-')}</div>
      </div>
    </div>
  );
}

/* ═════════ 관리자 편집 창들 ═════════ */

/** 사진 한 장 올리기 + 위치 조정 (필름 편집 창의 한 줄) */
function FramePick({ img, crop, onChange }: { img?: string; crop?: CropValue; onChange: (v: { img?: string; crop?: CropValue }) => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const src = useBlobUrl(img);
  const upload = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    try { onChange({ img: await putBlob(f), crop: undefined }); }
    catch (e) { toast(`올리지 못했습니다 — ${e instanceof Error ? e.message : ''}`); }
    setBusy(false);
  };
  return (
    <div className="yj-fp">
      <span className="yj-fp-pic"><CroppedBlobImg fileRef={img} crop={crop} ph="yj-film-ph" /></span>
      <label className="yj-btn">{busy ? '올리는 중…' : img ? '바꾸기' : '사진 올리기'}
        <input type="file" accept="image/*" disabled={busy} onChange={e => upload(e.target.files?.[0])} />
      </label>
      {src && <button type="button" className="yj-btn" onClick={() => setCropOpen(true)}>위치 조정</button>}
      {src && cropOpen && (
        <CropEditor open src={src} aspect={FRAME_ASPECT} aspectLabel="필름 한 칸" initial={crop}
          onClose={() => setCropOpen(false)}
          onApply={c => { onChange({ img, crop: c }); setCropOpen(false); }} />
      )}
    </div>
  );
}

/** 위 · 아래로 옮기기 · 지우기 */
function RowTools<T>({ list, i, set }: { list: T[]; i: number; set: (next: T[]) => void }) {
  const move = (d: number) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    set(next);
  };
  return (
    <span className="yj-rt">
      <button type="button" className="yj-btn ic" aria-label="위로" disabled={i === 0} onClick={() => move(-1)}>↑</button>
      <button type="button" className="yj-btn ic" aria-label="아래로" disabled={i === list.length - 1} onClick={() => move(1)}>↓</button>
      <button type="button" className="yj-btn ic del" aria-label="지우기" onClick={() => set(list.filter((_, k) => k !== i))}>✕</button>
    </span>
  );
}

function EditActions({ onCancel, onSave }: { onCancel: () => void; onSave: () => void }) {
  return (
    <>
      <button type="button" className="yj-btn" onClick={onCancel}>취소</button>
      <button type="button" className="yj-btn on" onClick={onSave}>저장</button>
    </>
  );
}

/** 필름 — 대표 그림 · 이어지는 사진들 · 보정 */
function FilmEdit({ doc, save, onClose }: { doc: YjhmFront; save: (d: YjhmFront) => void; onClose: () => void }) {
  const toast = useToast();
  const [d, setD] = useState<YjhmFront>(doc);
  const frames = d.frames ?? [];
  const setFrames = (next: YjhmFrame[]) => setD(v => ({ ...v, frames: next }));
  const patch = (i: number, p: Partial<YjhmFrame>) => setFrames(frames.map((f, k) => (k === i ? { ...f, ...p } : f)));
  const grade = d.grade ?? DEFAULT_GRADE;
  return (
    <Modal open title="필름 편집" className="yj-modal" dirty={d !== doc} onClose={onClose}
      desc="첫 칸은 대표 그림, 그 뒤로 아래 사진들이 순서대로 흐릅니다. 사진을 하나도 안 넣으면 사진 있는 글이 자동으로 이어집니다."
      actions={<EditActions onCancel={onClose} onSave={() => { save({ ...d, frames: frames.filter(f => f.img) }); toast('필름을 저장했습니다'); onClose(); }} />}>
      <div className="yj-ed">
        <h4>필름 보정</h4>
        <div className="yj-grades">
          {YJHM_GRADES.map(g => (
            <button key={g.key} type="button" className={`yj-gr${grade === g.key ? ' on' : ''}`} data-grade={g.key}
              onClick={() => setD(v => ({ ...v, grade: g.key }))}>
              <i /><b>{g.label}</b><small>{g.stock}</small>
            </button>
          ))}
        </div>

        <h4>1 · 대표 그림</h4>
        <div className="yj-ed-row">
          <FramePick img={d.img} crop={d.crop} onChange={v => setD(x => ({ ...x, ...v }))} />
          <input className="yj-in" placeholder="그림 설명 (화면에는 안 보임)" value={d.title ?? ''} onChange={e => setD(v => ({ ...v, title: e.target.value }))} />
        </div>

        <h4>이어지는 사진 · {frames.length}</h4>
        {frames.map((f, i) => (
          <div key={f.id} className="yj-ed-row">
            <b className="yj-ed-no">{i + 2}</b>
            <FramePick img={f.img} crop={f.crop} onChange={v => patch(i, v)} />
            <input className="yj-in" placeholder="누르면 갈 주소 (비우면 링크 없음)" value={f.href ?? ''} onChange={e => patch(i, { href: e.target.value.trim() || undefined })} />
            <RowTools list={frames} i={i} set={setFrames} />
          </div>
        ))}
        <button type="button" className="yj-btn add" onClick={() => setFrames([...frames, { id: newId() }])}>+ 사진 칸 더하기</button>
      </div>
    </Modal>
  );
}

/** 방명록 말풍선 */
function NoteEdit({ doc, save, onClose }: { doc: YjhmFront; save: (d: YjhmFront) => void; onClose: () => void }) {
  const toast = useToast();
  const [list, setList] = useState<YjhmNote[]>(doc.notes ?? []);
  const patch = (i: number, p: Partial<YjhmNote>) => setList(l => l.map((s, k) => (k === i ? { ...s, ...p } : s)));
  return (
    <Modal open title="방명록 편집" className="yj-modal" dirty={list !== (doc.notes ?? [])} onClose={onClose}
      desc="메인 GUESTBOOK 자리에 실을 말풍선입니다. 하나도 없으면 방명록 최근 글이 실립니다."
      actions={<EditActions onCancel={onClose} onSave={() => { save({ ...doc, notes: list.filter(n => n.text.trim()) }); toast('방명록을 저장했습니다'); onClose(); }} />}>
      <div className="yj-ed">
        {list.map((n, i) => (
          <div key={n.id} className="yj-ed-card">
            <div className="yj-ed-line">
              <input className="yj-in" placeholder="이름" value={n.who} onChange={e => patch(i, { who: e.target.value })} />
              <input className="yj-in sm" placeholder="날짜" value={n.date} onChange={e => patch(i, { date: e.target.value })} />
              <label className="yj-chk"><input type="checkbox" checked={!!n.me} onChange={e => patch(i, { me: e.target.checked })} />남색 말풍선</label>
              <RowTools list={list} i={i} set={setList} />
            </div>
            <textarea className="yj-in" rows={2} placeholder="말풍선 내용" value={n.text} onChange={e => patch(i, { text: e.target.value })} />
          </div>
        ))}
        <button type="button" className="yj-btn add"
          onClick={() => setList(l => [...l, { id: newId(), who: '', text: '', date: today().slice(5), me: l.length % 2 === 1 }])}>+ 말풍선 더하기</button>
      </div>
    </Modal>
  );
}

/** 한마디 */
function QuoteEdit({ doc, cur, save, onClose }: { doc: YjhmFront; cur?: { who: string; text: string }; save: (d: YjhmFront) => void; onClose: () => void }) {
  const toast = useToast();
  const [who, setWho] = useState(doc.quote?.who ?? cur?.who ?? '예준');
  const [text, setText] = useState(doc.quote?.text ?? cur?.text ?? '');
  return (
    <Modal open small title="한마디 편집" className="yj-modal" onClose={onClose}
      desc="맨 아래 폴더 바 가운데에 걸리는 한마디입니다. 내용을 비우면 페어 설정의 한마디가 실립니다."
      actions={<EditActions onCancel={onClose} onSave={() => {
        save({ ...doc, quote: text.trim() ? { who: who.trim() || '예준', text: text.trim() } : undefined });
        toast('한마디를 저장했습니다'); onClose();
      }} />}>
      <div className="yj-ed">
        <input className="yj-in" placeholder="이름 딱지" value={who} onChange={e => setWho(e.target.value)} />
        <input className="yj-in" placeholder="한마디" value={text} onChange={e => setText(e.target.value)} />
      </div>
    </Modal>
  );
}

type EditKind = 'film' | 'note' | 'quote' | null;

export function YjhmHome() {
  const { user, isAdmin } = useAuth();
  const rels = usePairings();
  const rel = relOfWorld(rels, 'yjhm');
  const [front, saveFront] = useYjhmFront();
  const [edit, setEdit] = useState<EditKind>(null);
  const [chars] = useLocalList<Character>('ohome.chars.v1', CHAR_SEED);
  const [logs] = useLocalList<TrpgLog>('ohome.trpg.v1', TRPG_SEED);
  const [gal] = useLocalList<BackupPost>('ohome.backup.v1', BACKUP_SEED);
  const [diary] = useLocalList<DiaryPost>('ohome.diary.v1', DIARY_SEED);
  const [posts] = useLocalList<Post>('ohome.board.v1', BOARD_SEED);
  const [guest] = useLocalList<GuestEntry>('ohome.guest.v1', GUEST_SEED);

  // 필름 — 첫 칸은 대표 그림. 관리자가 정한 사진이 있으면 그것만, 없으면 이 페어로 쓴 글 중 사진 있는 것 (최근 순)
  const mine = (p: { relId?: string; category?: string }) => !!rel && pairIdOf(p, rels) === rel.id;
  const can = (v: string) => isAdmin || v === 'public' || (v === 'member' && !!user);
  const nos = backupNos(gal);
  const picked = (front.frames ?? []).filter(f => f.img);
  // 이 페어로 쓴 글 전부 (최근 순) — SCRAP 리스트와, 관리자가 사진을 안 골랐을 때의 필름 칸
  const all: (Frame & { date: string; kind: Kind; title: string })[] = [
    ...logs.filter(l => mine(l) && can(l.visibility) && (!l.listHidden || isAdmin)).map(l => ({ key: l.id, kind: 'MATCH' as const, date: l.date ?? '', href: logPath(l), img: l.thumbId || l.thumbUrl, crop: l.thumbCrop, title: l.title })),
    ...gal.filter(p => mine(p) && can(p.visibility)).map(p => ({ key: p.id, kind: 'PHOTO' as const, date: p.date, href: backupPath(p, nos), img: p.images[0], crop: p.thumbCrop, title: p.title })),
    ...diary.filter(p => mine(p) && can(p.visibility)).map(p => ({ key: p.id, kind: 'DIARY' as const, date: p.date, href: `/diary#${p.id}`, img: p.imgIds[0], title: p.title })),
    ...posts.filter(p => mine(p) && !p.secret).map(p => ({ key: p.id, kind: 'NOTE' as const, date: p.date, href: `/board/${p.id}`, img: p.thumbSrc, crop: p.thumbCrop, title: p.title })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const auto = picked.length ? [] : all.filter(s => s.img);
  const frames: Frame[] = [
    { key: 'cover', img: front.img ?? rel?.arts?.[0] ?? rel?.thumbId, crop: front.crop ?? (front.img ? undefined : rel?.thumbCrop), title: front.title || rel?.name },
    ...(picked.length ? picked.map(f => ({ key: f.id, img: f.img, crop: f.crop, href: f.href, title: f.title })) : auto.slice(0, 9)),
  ];
  while (frames.length < MIN_FRAMES) frames.push({ key: `empty-${frames.length}` });

  // 방명록 — 관리자가 적은 말풍선, 없으면 방명록 최근 글
  const notes: YjhmNote[] = front.notes?.length ? front.notes.slice(0, 3) : guest.filter(g => !g.secret)
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 2)
    .map((g, i) => ({ id: g.id, who: g.author, text: cut(plain(g.body), 40), date: md(g.date), me: i % 2 === 1 }));

  // 한마디 — 관리자가 적은 것 → 예준의 한마디 → 다른 멤버의 한마디 → 페어 대사
  const members = (rel?.members ?? []).map(m => ({ m, c: chars.find(c => c.id === m.charId) })).filter((x): x is { m: RelMember; c: Character } => !!x.c);
  const said = members.find(x => x.m.quote?.trim() && x.c.name.includes('예준')) ?? members.find(x => x.m.quote?.trim());
  const auto1 = said ? { who: said.c.name.includes('예준') ? '예준' : said.c.name, text: said.m.quote!.trim() } : rel?.catchphrase ? { who: '예준', text: rel.catchphrase } : undefined;
  const quote = front.quote?.text ? front.quote : auto1;

  const editBtn = (k: EditKind, label = 'EDIT') => isAdmin && (
    <button type="button" className="yj-tape ghost" onClick={() => setEdit(k)}>{label}</button>
  );

  return (
    <div className="yj-main yj-film-home">
      <i className="yj-rings" aria-hidden="true" />
      <YjhmHeader main />

      <div className="yj-film-wrap">
        <Film frames={frames} grade={front.grade ?? DEFAULT_GRADE} />
        {isAdmin && <div className="yj-cover-edit">{editBtn('film', '필름 편집')}</div>}
      </div>

      <div className="yj-lower">
        <section className="yj-scrap" aria-label="스크랩">
          <Link className="yj-tape" href="/trpg">SCRAP · {all.length}</Link>
          <div className="yj-scrap-l">
            {all.length ? all.slice(0, 4).map(s => (
              <Link key={s.key} href={s.href ?? '/'}><time>{md(s.date)}</time><span>{s.title}</span><em>{s.kind}</em></Link>
            )) : <p className="yj-faint">아직 실린 글이 없습니다</p>}
          </div>
        </section>
        <section className="yj-gb" aria-label="방명록">
          <div className="yj-sec-h">{editBtn('note')}<Link className="yj-tape" href="/guest">GUESTBOOK</Link></div>
          <div className="yj-gb-l">
            {notes.length ? notes.map(n => (
              <React.Fragment key={n.id}>
                <Link href="/guest" className={n.me ? 'me' : ''}>{n.text}</Link>
                <small>{[n.who, n.date].filter(Boolean).join(' · ')}</small>
              </React.Fragment>
            )) : <Link href="/guest">첫 응원을 남겨 주세요</Link>}
          </div>
        </section>
      </div>

      <YjhmDock quote={quote} onEditQuote={isAdmin ? () => setEdit('quote') : undefined} />

      {edit === 'film' && <FilmEdit doc={front} save={saveFront} onClose={() => setEdit(null)} />}
      {edit === 'note' && <NoteEdit doc={front} save={saveFront} onClose={() => setEdit(null)} />}
      {edit === 'quote' && <QuoteEdit doc={front} cur={quote} save={saveFront} onClose={() => setEdit(null)} />}
    </div>
  );
}
