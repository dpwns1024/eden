'use client';
/**
 * YJHM 메인 화면 (lib/worldStore.ts) — 국가대표 사격선수 × 통역사 · 현대 일상 · 달달 로맨스.
 * 「The Shooting Daily」 트랙 1면 (사용자 확정 시안 「R2 트랙 1면」 — R1 트랙 리스트 무드).
 *  속보 띠 → 외곽선 DAILY 제호 + 스티커 → 알약 메뉴 → 크기가 다른 칸을 맞물린 격자
 *  (머리기사 01 · TRACKS · 점수 · TICKET · 화보 · 페어 · 말풍선 녹취 · 수첩/리스트/투고) → 포토카드 → 대형 DAILY 푸터.
 * 칸은 모두 실제 글이다 — PAIRING의 YJHM 페어와 그 페어로 쓴 글(FIELD REPORT · 갤러리 · JOURNAL · 리스트)과 방명록.
 * 글마다 TRACK 번호(.01 · .02 …)를 최근 순으로 매기고, 어느 칸에 실려도 같은 번호를 단다. 모양은 yjhm.css.
 */
import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useLocalList, BOARD_SEED, GUEST_SEED, Post, GuestEntry } from '@/lib/postStore';
import { Character, CHAR_SEED, RelMember, charPath, relPath } from '@/lib/charStore';
import { BackupPost, BACKUP_SEED, backupNos, backupPath, TrpgLog, TRPG_SEED } from '@/lib/galleryStore';
import { DiaryPost, DIARY_SEED } from '@/lib/diaryStore';
import { logPath } from '@/lib/logPath';
import { usePairings, pairIdOf } from '@/lib/pairLink';
import { relOfWorld } from '@/lib/worldStore';
import { CroppedBlobImg, CropValue } from '@/components/ui/CropEditor';
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

/** 별 딱지 (머리기사) — 톱니 별 */
const BURST = Array.from({ length: 40 }, (_, i) => {
  const r = i % 2 ? 46 : 60, a = (Math.PI * i) / 20 - Math.PI / 2;
  return `${(60 + r * Math.cos(a)).toFixed(1)},${(60 + r * Math.sin(a)).toFixed(1)}`;
}).join(' ');

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
  const recent = [...reports, ...photos, ...journal, ...notes].sort(byDate);
  const lead = recent.find(s => s.img) ?? recent[0];
  const all = lead ? [lead, ...recent.filter(s => s !== lead)] : recent;
  const trackOf = new Map(all.map((s, i) => [s, `.${two(i + 1)}`]));
  const track = (s: Story) => trackOf.get(s) ?? '';
  const tracks = all.slice(1, 6);
  // TICKET — 머리기사가 아닌 가장 최근 취재 수첩(없으면 리스트) · 화보 칸 — 머리기사가 아닌 가장 최근 화보
  const ticket = journal.find(s => s !== lead) ?? notes.find(s => s !== lead);
  const feature = photos.find(s => s !== lead);
  const letters = guest.filter(g => !g.secret).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

  const members = (rel?.members ?? []).map(m => ({ m, c: chars.find(c => c.id === m.charId) })).filter((x): x is { m: RelMember; c: Character } => !!x.c);
  const quotes = members.filter(x => x.m.quote);

  const now = new Date();
  const front = {
    date: `${now.getFullYear()}.${two(now.getMonth() + 1)}.${two(now.getDate())} ${['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][now.getDay()]}`,
    issue: String(all.length).padStart(4, '0'),
    names: members.length ? members.map(x => x.c.name) : ['YJ', 'HM'],
    ticker: all.slice(0, 6).map((s, i) => `${i ? '' : 'BREAKING ✦ '}${s.title}`),
  };
  if (!front.ticker.length) front.ticker = ['BREAKING ✦ 창간 준비호', rel?.name ?? 'YJHM', '두 사람의 기록만 싣습니다'];

  return (
    <div className="yj-main">
      <YjhmHeader front={front} />

      <div className="yj-wrap">
        <div className="yj-grid">
          {/* 머리기사 01 */}
          <article className="yj-lead yj-box">
            <Dots className="yj-lead-pic" img={lead?.img ?? rel?.arts?.[0] ?? rel?.thumbId} crop={lead?.img ? lead.crop : rel?.thumbCrop}
              alt={lead ? `${lead.title} 대표 사진` : '페어 대표 그림'} />
            <b className="yj-lead-no" aria-hidden="true">01</b>
            {lead && (
              <span className="yj-burst" role="img" aria-label={`${md(lead.date)} 발행`}>
                <svg viewBox="0 0 120 120" aria-hidden="true"><polygon points={BURST} /></svg>
                <b>NEW<br />{md(lead.date)}</b>
              </span>
            )}
            <div className="yj-lead-cap">
              <span className="yj-kicker yj-blk">{lead ? `${DESK_EN[lead.kind]}${lead.kind === 'REPORT' ? ' · 단독' : ''}` : '창간 준비호'}</span>
              <h1>{lead ? <Link href={lead.href}><span>{lead.title}</span></Link> : <span>{rel?.name ?? 'YJHM'}</span>}</h1>
            </div>
          </article>

          <div className="yj-side">
            <section className="yj-box yj-paper yj-credit" aria-label="머리기사 크레딧">
              <dl>
                <dt>Filed by |</dt><dd>{lead ? `${DESK[lead.kind]} · ${lead.date.slice(0, 10).replace(/-/g, '.')}` : 'YJHM 편집국'}</dd>
                <dt>Featuring |</dt><dd>{members.length ? members.map(x => x.c.name).join(', ') : 'SHOOTER × INTERPRETER'}</dd>
                <dt>Venue |</dt><dd>{rel?.name ?? 'THE SHOOTING DAILY'}</dd>
              </dl>
              <p>{lead?.text ? cut(lead.text, 160) : rel?.catchphrase || (rel ? '아직 이 페어로 쓴 글이 없습니다' : 'PAIRING 게시판에 「YJHM」 페어를 올리면 이 지면이 채워집니다')}</p>
              {lead && <Link className="yj-pill yj-blk" href={lead.href}>기사 전문 ↗</Link>}
            </section>

            <section className="yj-box yj-tracks" aria-label="이번 호 수록 기사">
              <div className="yj-tracks-h"><h2>TRACKS</h2><span>이번 호 수록 기사</span></div>
              {tracks.length ? tracks.map(s => (
                <Link key={`${s.kind}-${s.id}`} href={s.href}>
                  <b className="yj-tno">{track(s)}</b>
                  <span><b>{s.title}</b> <small>{DESK[s.kind]} · {md(s.date)}</small></span>
                  <i aria-hidden="true">↗</i>
                </Link>
              )) : <p className="yj-faint">아직 실린 기사가 없습니다</p>}
            </section>
          </div>

          {/* 점수판 — 경기 기록 */}
          <section className="yj-score yj-blk" aria-label="경기 기록">
            <div className="yj-score-h"><b>FIELD REPORT</b><Link href="/trpg">경기 기록 ↗</Link></div>
            <b className="yj-score-n">{two(reports.length)}<small>건</small></b>
            <div className="yj-score-l">
              {reports.length ? reports.slice(0, 3).map(s => (
                <Link key={s.id} href={s.href}>{md(s.date)} · {s.title}</Link>
              )) : <span>아직 실린 기록이 없습니다</span>}
            </div>
          </section>

          {/* TICKET — 취재 수첩 한 장 */}
          <article className="yj-ticket yj-box yj-paper">
            <div className="yj-ticket-h">
              <span>BOARDING · {ticket ? `${DESK[ticket.kind]} · ${md(ticket.date)}` : '취재 수첩'}</span>
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
                <small>Filed by | 화보 · {md(feature.date)}</small>
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
