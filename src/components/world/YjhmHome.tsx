'use client';
/**
 * YJHM 메인 화면 (lib/worldStore.ts) — 국가대표 사격선수 × 통역사 · 현대 일상 · 달달 로맨스.
 * 「The Shooting Daily」 트랙 1면 (사용자 확정 시안 「R2 트랙 1면」 — R1 트랙 리스트 무드).
 *  속보 띠 → 외곽선 DAILY 제호 + 스티커 → 알약 메뉴 → 크기가 다른 칸을 맞물린 격자
 *  (머리기사 01 + 기사 본문 · 점수 · TICKET · 화보 · 페어 · 말풍선 녹취 · 수첩/리스트/투고) → 포토카드 → 대형 DAILY 푸터.
 * 머리기사 01은 관리자가 정한 그림 · 제목 · 본문을 고정해 싣는다 (lib/yjhmFrontStore — 이 자리에서 바로 편집).
 * 나머지 칸은 실제 글이다 — PAIRING의 YJHM 페어와 그 페어로 쓴 글(FIELD REPORT · 갤러리 · JOURNAL · 리스트)과 방명록.
 * 글마다 TRACK 번호(.02 · .03 …)를 최근 순으로 매기고, 어느 칸에 실려도 같은 번호를 단다. 모양은 yjhm.css.
 */
import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useLocalList, BOARD_SEED, GUEST_SEED, Post, GuestEntry } from '@/lib/postStore';
import { Character, CHAR_SEED, RelMember, charPath, relPath } from '@/lib/charStore';
import { BackupPost, BACKUP_SEED, backupNos, backupPath, TrpgLog, TRPG_SEED } from '@/lib/galleryStore';
import { DiaryPost, DIARY_SEED } from '@/lib/diaryStore';
import { logPath } from '@/lib/logPath';
import { usePairings, pairIdOf } from '@/lib/pairLink';
import { relOfWorld } from '@/lib/worldStore';
import { useYjhmFront, YjhmFront } from '@/lib/yjhmFrontStore';
import { putBlob } from '@/lib/blobStore';
import { CroppedBlobImg, CropValue } from '@/components/ui/CropEditor';
import { RichEditor } from '@/components/ui/RichEditor';
import { HtmlBody } from '@/components/ui/HtmlBody';
import { KInput } from '@/components/ui/Kit';
import { useToast } from '@/components/ui/Toast';
import { YjhmHeader } from './YjhmHeader';

type Kind = 'REPORT' | 'GALLERY' | 'JOURNAL' | 'LIST';
const DESK: Record<Kind, string> = { REPORT: '경기 기록', GALLERY: '화보', JOURNAL: '취재 수첩', LIST: '리스트' };
const DESK_EN: Record<Kind, string> = { REPORT: 'FIELD REPORT', GALLERY: 'PHOTO', JOURNAL: 'JOURNAL', LIST: 'NOTES' };

interface Story {
  id: string; kind: Kind; title: string; date: string; href: string;
  text: string;                     // 본문 발췌 (태그 · 마크다운 기호를 뺀 글)
  img?: string; crop?: CropValue;   // 대표 이미지 (없으면 망점 자리)
}

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
const two = (n: number) => String(n).padStart(2, '0');
/** 「취재 수첩 · 10.17」 — 날짜가 없는 글은 칸 이름만 */
const desk = (s: Story) => [DESK[s.kind], md(s.date)].filter(Boolean).join(' · ');

/** 머리기사 01 — 왼쪽은 고정 그림 · 오른쪽은 기사 본문. 관리자는 이 자리에서 바로 고친다 */
function Cover({ rel, members }: { rel?: { name: string; arts?: string[]; thumbId?: string; thumbCrop?: CropValue }; members: string[] }) {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [doc, save, loaded] = useYjhmFront();
  const [draft, setDraft] = useState<YjhmFront | null>(null);
  const [busy, setBusy] = useState(false);
  const cur = draft ?? doc;
  const img = cur.img ?? rel?.arts?.[0] ?? rel?.thumbId;
  const title = cur.title?.trim() || rel?.name || 'YJHM';
  const upload = async (f?: File) => {
    if (!f || !draft) return;
    setBusy(true);
    try { const ref = await putBlob(f); setDraft(d => d && { ...d, img: ref }); } catch (e) { toast(`올리지 못했습니다 — ${e instanceof Error ? e.message : ''}`); }
    setBusy(false);
  };
  const done = () => { if (draft) save(draft); setDraft(null); toast('저장되었습니다'); };

  return (
    <>
      <article className="yj-lead yj-box">
        <Dots className="yj-lead-pic" img={img} crop={cur.img ? undefined : rel?.thumbCrop} alt={`${title} 대표 그림`} />
        <b className="yj-lead-no" aria-hidden="true">01</b>
        <div className="yj-lead-cap">
          <span className="yj-kicker yj-blk">{cur.kicker?.trim() || 'COVER STORY'}</span>
          <h1><span>{title}</span></h1>
        </div>
      </article>

      <section className="yj-box yj-paper yj-story" aria-label="머리기사 본문">
        <div className="yj-story-h">
          <dl>
            <dt>Filed by |</dt><dd>YJHM 편집국</dd>
            <dt>Featuring |</dt><dd>{members.length ? members.join(', ') : 'SHOOTER × INTERPRETER'}</dd>
          </dl>
          {isAdmin && !draft && <button type="button" className="yj-pill" onClick={() => setDraft({ ...doc })}>✎ 편집</button>}
        </div>
        {draft ? (
          <div className="yj-story-edit">
            <label>대표 그림
              <input type="file" accept="image/*" disabled={busy} onChange={e => upload(e.target.files?.[0])} />
            </label>
            {busy && <small>올리는 중…</small>}
            <label>딱지<KInput value={draft.kicker ?? ''} placeholder="COVER STORY" onChange={e => setDraft({ ...draft, kicker: e.target.value })} /></label>
            <label>제목<KInput value={draft.title ?? ''} placeholder={rel?.name ?? 'YJHM'} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label>
            <RichEditor value={draft.html} onChange={html => setDraft(d => d && { ...d, html })} placeholder="기사 본문" />
            <div className="yj-story-btns">
              <button type="button" className="yj-pill yj-blk" disabled={busy} onClick={done}>저장</button>
              <button type="button" className="yj-pill" onClick={() => setDraft(null)}>취소</button>
            </div>
          </div>
        ) : loaded && !doc.html.trim() ? (
          <p className="yj-faint">{isAdmin ? '아직 기사 본문이 없습니다 — 오른쪽 위 ✎ 편집으로 그림과 본문을 정해 주세요' : '기사 본문을 준비 중입니다'}</p>
        ) : <HtmlBody html={doc.html} className="html-body yj-story-body" />}
      </section>
    </>
  );
}

/** 망점으로 인쇄된 사진 — 이미지가 없으면 망점 자리만 */
function Dots({ img, crop, label, alt, className }: { img?: string; crop?: CropValue; label?: string; alt?: string; className?: string }) {
  return (
    <span className={`yj-pic ${className ?? ''}`}>
      <CroppedBlobImg fileRef={img} crop={crop} ph="yj-ph-img" label={label} alt={alt ?? ''} />
      <i className="yj-pic-dots" />
    </span>
  );
}

/** 칸 머리 — 굵은 영문 · 한글 · 전체 링크 */
function Head({ en, ko, href, more = '전체' }: { en: string; ko: string; href?: string; more?: string }) {
  return (
    <div className="yj-h">
      <h2>{en} <small>{ko}</small></h2>
      {href && <Link href={href}>{more} ↗</Link>}
    </div>
  );
}

export function YjhmHome() {
  const { user, isAdmin } = useAuth();
  const rels = usePairings();
  const rel = relOfWorld(rels, 'yjhm');
  const [chars] = useLocalList<Character>('ohome.chars.v1', CHAR_SEED);
  const [logs] = useLocalList<TrpgLog>('ohome.trpg.v1', TRPG_SEED);
  const [gal] = useLocalList<BackupPost>('ohome.backup.v1', BACKUP_SEED);
  const [diary] = useLocalList<DiaryPost>('ohome.diary.v1', DIARY_SEED);
  const [posts] = useLocalList<Post>('ohome.board.v1', BOARD_SEED);
  const [guest] = useLocalList<GuestEntry>('ohome.guest.v1', GUEST_SEED);

  // 이 페어로 쓴 글 중 볼 수 있는 것
  const mine = (p: { relId?: string; category?: string }) => !!rel && pairIdOf(p, rels) === rel.id;
  const can = (v: string) => isAdmin || v === 'public' || (v === 'member' && !!user);
  const nos = backupNos(gal);
  const byDate = (a: Story, b: Story) => b.date.localeCompare(a.date);
  const reports: Story[] = logs.filter(l => mine(l) && can(l.visibility) && (!l.listHidden || isAdmin)).map(l => ({
    id: l.id, kind: 'REPORT' as const, title: l.title, date: l.date ?? '', href: logPath(l),
    text: plain(l.catchphrase), img: l.thumbId || l.thumbUrl, crop: l.thumbCrop,
  })).sort(byDate);
  const photos: Story[] = gal.filter(p => mine(p) && can(p.visibility)).map(p => ({
    id: p.id, kind: 'GALLERY' as const, title: p.title, date: p.date, href: backupPath(p, nos),
    text: plain(p.desc), img: p.images[0], crop: p.thumbCrop,
  })).sort(byDate);
  const journal: Story[] = diary.filter(p => mine(p) && can(p.visibility)).map(p => ({
    id: p.id, kind: 'JOURNAL' as const, title: p.title, date: p.date, href: `/diary#${p.id}`,
    text: plain(p.body), img: p.imgIds[0],
  })).sort(byDate);
  const notes: Story[] = posts.filter(p => mine(p) && !p.secret).map(p => ({
    id: p.id, kind: 'LIST' as const, title: p.title, date: p.date, href: `/board/${p.id}`,
    text: plain(p.body), img: p.thumbSrc, crop: p.thumbCrop,
  })).sort(byDate);
  // 머리기사(01) — 가장 최근의 사진 있는 글, 없으면 가장 최근 글. 나머지는 최근 순으로 02, 03 …
  // 01은 고정 머리기사 — 글은 최근 순으로 02, 03 …
  const all = [...reports, ...photos, ...journal, ...notes].sort(byDate);
  const trackOf = new Map(all.map((s, i) => [s, `.${two(i + 2)}`]));
  const track = (s: Story) => trackOf.get(s) ?? '';
  // TICKET — 가장 최근 취재 수첩(없으면 리스트) · 화보 칸 — 가장 최근 화보
  const ticket = journal[0] ?? notes[0];
  const feature = photos[0];
  const letters = guest.filter(g => !g.secret).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

  const members = (rel?.members ?? []).map(m => ({ m, c: chars.find(c => c.id === m.charId) })).filter((x): x is { m: RelMember; c: Character } => !!x.c);
  const quotes = members.filter(x => x.m.quote);

  const now = new Date();
  const front = {
    date: `${now.getFullYear()}.${two(now.getMonth() + 1)}.${two(now.getDate())} ${['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][now.getDay()]}`,
    issue: String(all.length).padStart(4, '0'),
    ticker: all.map(s => s.title.trim()).filter(Boolean).slice(0, 6).map((t, i) => `${i ? '' : 'BREAKING ✦ '}${t}`),
  };
  if (!front.ticker.length) front.ticker = ['BREAKING ✦ 창간 준비호', rel?.name ?? 'YJHM', '두 사람의 기록만 싣습니다'];

  return (
    <div className="yj-main">
      <YjhmHeader front={front} />

      <div className="yj-wrap">
        <div className="yj-grid">
          {/* 머리기사 01 — 관리자가 정한 그림 · 제목 · 기사 본문 */}
          <Cover rel={rel} members={members.map(x => x.c.name)} />

          {/* 점수판 — 경기 기록 */}
          <section className="yj-score yj-blk" aria-label="경기 기록">
            <div className="yj-score-h"><b>FIELD REPORT</b><Link href="/trpg">경기 기록 ↗</Link></div>
            <b className="yj-score-n">{two(reports.length)}<small>건</small></b>
            <div className="yj-score-l">
              {reports.length ? reports.slice(0, 3).map(s => (
                <Link key={s.id} href={s.href}>{[md(s.date), s.title].filter(Boolean).join(' · ')}</Link>
              )) : <span>아직 실린 기록이 없습니다</span>}
            </div>
          </section>

          {/* TICKET — 취재 수첩 한 장 */}
          <article className="yj-ticket yj-box yj-paper">
            <div className="yj-ticket-h">
              <span>BOARDING · {ticket ? desk(ticket) : '취재 수첩'}</span>
              {ticket && <b>{track(ticket)}</b>}
            </div>
            {ticket ? (
              <Link href={ticket.href}>
                <b className="yj-ticket-t">TICKET</b>
                <b>{ticket.title}</b>
                {ticket.text && <small>{cut(ticket.text, 70)}</small>}
              </Link>
            ) : (
              <Link href="/diary"><b className="yj-ticket-t">TICKET</b><small>아직 실린 수첩이 없습니다</small></Link>
            )}
            <i className="yj-notch l" /><i className="yj-notch r" />
          </article>

          {/* 화보 한 장 */}
          <article className="yj-feature yj-box">
            <span className="yj-feature-pic">
              <Dots img={feature?.img ?? rel?.arts?.[1]} crop={feature?.crop} alt={feature ? `${feature.title} 화보` : ''} />
              {feature && <b className="yj-blk">{track(feature)}</b>}
            </span>
            {feature ? (
              <Link href={feature.href}>
                <small>Filed by | {desk(feature)}</small>
                <b>{feature.title}</b>
              </Link>
            ) : (
              <Link href="/gallery"><small>Filed by | 화보</small><b>아직 실린 화보가 없습니다</b></Link>
            )}
          </article>

          {/* 오늘의 페어 */}
          <section className="yj-pair yj-box yj-paper" aria-label="오늘의 페어">
            <div className="yj-pair-faces">
              {(members.length ? members.slice(0, 2) : [null, null]).map((x, i) => x ? (
                <Link key={x.c.id} href={charPath(x.c)} aria-label={x.c.name} className={`f${i}`}>
                  <Dots img={x.c.thumbId} crop={x.m.faceCrop ?? x.c.thumbCrop} label={x.c.name.slice(0, 2)} alt={x.c.name} />
                </Link>
              ) : <span key={i} className={`f${i}`}><Dots label={['YJ', 'HM'][i]} /></span>)}
            </div>
            <div className="yj-pair-t">
              <span>LINER NOTES · 오늘의 페어</span>
              {rel ? <Link className="yj-bub" href={relPath(rel)}>{rel.name}</Link> : <b className="yj-bub">YJHM</b>}
              <div className="yj-chips">
                <span className="yj-pill">경기 기록 <b>{two(reports.length)}</b></span>
                <span className="yj-pill">화보 <b>{two(photos.length)}</b></span>
                <span className="yj-pill">취재 수첩 <b>{two(journal.length)}</b></span>
              </div>
            </div>
          </section>

          {/* 말풍선 녹취 */}
          <section className="yj-comms" aria-label="대화 녹취">
            <div className="yj-rule"><h2>COMMS</h2><span>대화 녹취</span><i /></div>
            {quotes.length ? quotes.map(({ m, c }, i) => (
              <p key={c.id} className={i % 2 ? 'yj-say r yj-blk' : 'yj-say'}><b>{c.name}</b> {m.quote}</p>
            )) : <p className="yj-say">{rel?.catchphrase || '두 사람의 한마디가 이 자리에 실립니다'}</p>}
          </section>

          {/* 취재 수첩 · 리스트 · 독자 투고 */}
          <section className="yj-list yj-box yj-paper" aria-label="취재 수첩">
            <Head en="JOURNAL" ko="취재 수첩" href="/diary" />
            {journal.length ? journal.slice(0, 3).map(s => (
              <Link key={s.id} href={s.href}><time>{md(s.date)}</time><span>{s.title}</span></Link>
            )) : <p className="yj-faint">아직 실린 수첩이 없습니다</p>}
          </section>
          <section className="yj-list yj-box yj-paper" aria-label="리스트">
            <Head en="NOTES" ko="리스트" href="/board" />
            {notes.length ? notes.slice(0, 3).map(s => (
              <Link key={s.id} href={s.href}><time>{md(s.date)}</time><span>{s.title}</span></Link>
            )) : <p className="yj-faint">아직 실린 글이 없습니다</p>}
          </section>
          <section className="yj-letters" aria-label="독자 투고">
            <Head en="LETTERS" ko="독자 투고" href="/guest" more="방명록" />
            {letters.length ? letters.map(g => (
              <p key={g.id}>&ldquo;{cut(plain(g.body), 60)}&rdquo; <small>— {g.author}</small></p>
            )) : <p className="yj-faint">첫 투고를 기다립니다</p>}
          </section>
        </div>

        {/* 포토카드 */}
        {photos.length > 0 && (
          <section className="yj-cards" aria-label="화보">
            <div className="yj-rule"><h2>PHOTO CARDS</h2><span>화보</span><i /><Link className="yj-pill" href="/gallery">전체 ↗</Link></div>
            <div className="yj-cards-row">
              {photos.slice(0, 6).map((s, i) => (
                <Link key={s.id} href={s.href} aria-label={s.title}>
                  <span className="yj-card yj-box">
                    <Dots img={s.img} crop={s.crop} alt="" />
                    <b>{two(i + 1)}</b>
                  </span>
                  <small>{s.title}</small>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <footer className="yj-foot yj-foot-main">
        <div><span>℗ &amp; © YJHM 편집국</span><span>두 사람의 기록만 싣습니다</span></div>
        <b aria-hidden="true">DAILY<span> · {front.issue}</span></b>
      </footer>
    </div>
  );
}
