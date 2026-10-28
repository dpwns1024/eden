'use client';
/**
 * YJHM 메인 화면 (lib/worldStore.ts) — 국가대표 사격선수 × 통역사 · 현대 일상 · 달달 로맨스.
 * 「The Shooting Daily」 신문 1면 (사용자 확정 시안 「N1 과녁 컷」) — PC는 가로로 넓게 펼친다.
 *  제호 · 1면 톱(과녁 링으로 자른 원형 사진에 본문이 둘레를 따라 흐름) · 오늘의 페어 · 최근 기사
 *  · 경기 기록 · 취재 수첩 · 리스트 · 독자 투고 · 화보(링 컷) · 판권.
 * 칸은 모두 실제 글이다 — PAIRING의 YJHM 페어와 그 페어로 쓴 글(FIELD REPORT · 갤러리 · JOURNAL · 리스트)과 방명록.
 * 모양은 yjhm.css.
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

interface Story {
  id: string; kind: Kind; title: string; date: string; href: string;
  text: string;                     // 본문 발췌 (태그 · 마크다운 기호를 뺀 글)
  img?: string; crop?: CropValue;   // 대표 이미지 (없으면 페어 아트)
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

/** 과녁 컷 — 원형 사진을 종이색 과녁 링 · 사선 하나로 자른다. dot = 탄착점 옆에 찍을 글 */
function TargetCut({ img, crop, label, dot, className }: { img?: string; crop?: CropValue; label: string; dot?: string; className?: string }) {
  return (
    <div className={`yj-target ${className ?? ''}`} role="img" aria-label={label}>
      <CroppedBlobImg fileRef={img} crop={crop} ph="yj-ph-img" alt="" />
      <i className="yj-ring r1" /><i className="yj-ring r2" /><i className="yj-ring r3" /><i className="yj-ring r4" />
      <i className="yj-slash" />
      <span className="yj-rn n1">7</span><span className="yj-rn n2">8</span><span className="yj-rn n3">9</span><span className="yj-rn n4">10</span>
      <i className="yj-hole" />
      {dot && <span className="yj-hole-tag">{dot}</span>}
    </div>
  );
}

/** 단 머리 — 영문 · 한글 · 이중 괘선 */
function Head({ en, ko, href }: { en: string; ko: string; href?: string }) {
  return (
    <div className="yj-h">
      <h2>{en} <small>{ko}</small></h2>
      {href && <Link href={href}>전체 →</Link>}
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
  const all = [...reports, ...photos, ...journal, ...notes].sort(byDate);
  // 1면 톱 — 가장 최근의 사진 있는 글, 없으면 가장 최근 글
  const lead = all.find(s => s.img) ?? all[0];
  const latest = all.filter(s => s !== lead).slice(0, 6);
  const letters = guest.filter(g => !g.secret).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

  const members = (rel?.members ?? []).map(m => ({ m, c: chars.find(c => c.id === m.charId) })).filter((x): x is { m: RelMember; c: Character } => !!x.c);

  const now = new Date();
  const front = {
    date: `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${'일월화수목금토'[now.getDay()]}요일`,
    issue: String(all.length).padStart(4, '0'),
  };
  const leadText = lead ? cut(lead.text, 900) : '';

  return (
    <div className="yj-main">
      <div className="yj-wrap">
        <YjhmHeader front={front} />

        {/* 1면 톱 · 오늘의 페어 · 최근 기사 */}
        <div className="yj-top3">
          <article className="yj-lead">
            {lead ? (
              <>
                <span className="yj-kicker">{lead.kind === 'REPORT' ? '단독 · ' : ''}{DESK[lead.kind]} · {md(lead.date)}</span>
                <h1><Link href={lead.href}>{lead.title}</Link></h1>
                {rel?.catchphrase && <p className="yj-deck">{rel.catchphrase}</p>}
              </>
            ) : (
              <>
                <span className="yj-kicker">창간 준비호</span>
                <h1>{rel?.name ?? 'YJHM'}</h1>
                <p className="yj-deck">{rel?.catchphrase || (rel ? '아직 이 페어로 쓴 글이 없습니다' : 'PAIRING 게시판에 「YJHM」 페어를 올리면 이 지면이 채워집니다')}</p>
              </>
            )}
            <div className="yj-wrapbox">
              <TargetCut className="yj-target-lead"
                img={lead?.img ?? rel?.arts?.[0] ?? rel?.thumbId} crop={lead?.img ? lead.crop : rel?.thumbCrop}
                label={lead ? `${lead.title} 대표 사진 — 과녁 링 모양으로 잘려 있다` : '페어 대표 그림'}
                dot={lead ? md(lead.date) : undefined} />
              {leadText ? <p className="yj-body">{leadText}</p> : <p className="yj-body yj-faint">이 자리에 가장 최근 글의 본문이 실립니다.</p>}
              <div className="yj-clear" />
            </div>
            {lead && (
              <p className="yj-caption">
                ▲ {DESK[lead.kind]} 「{lead.title}」 · 붉은 점은 이 글이 올라온 날. <Link href={lead.href}>기사 전문 →</Link>
              </p>
            )}
          </article>

          <aside className="yj-impact" aria-label="오늘의 페어">
            <i>오늘의</i>
            <b className="yj-impact-t">IMPACT PAIR</b>
            <hr />
            {rel ? <Link className="yj-impact-name" href={relPath(rel)}>{rel.name}</Link> : <b className="yj-impact-name">YJHM</b>}
            <small>{members.map(x => x.c.name).join(' × ') || 'SHOOTER × INTERPRETER'}</small>
            <div className="yj-stats">
              <span><b>{reports.length}</b><small>경기 기록</small></span>
              <span><b className="yj-red">{photos.length}</b><small>화보</small></span>
              <span><b>{journal.length}</b><small>취재 수첩</small></span>
            </div>
            {members.length > 0 && (
              <div className="yj-faces">
                {members.map(({ c }) => (
                  <Link key={c.id} href={charPath(c)} aria-label={c.name}>
                    <CroppedBlobImg fileRef={c.thumbId} crop={c.thumbCrop} ph="yj-ph-img" label={c.name.slice(0, 1)} alt={c.name} />
                  </Link>
                ))}
              </div>
            )}
            {members.some(x => x.m.quote) && (
              <div className="yj-comms">
                <b>COMMS <small>대화 녹취</small></b>
                {members.filter(x => x.m.quote).map(({ m, c }) => <p key={c.id}><b>{c.name}</b> {m.quote}</p>)}
              </div>
            )}
          </aside>

          <section className="yj-latest" aria-label="최근 기사">
            <Head en="LATEST" ko="최근 기사" />
            {latest.length ? latest.map((s, i) => (
              <Link key={`${s.kind}-${s.id}`} href={s.href}>
                <b className="yj-no">{i + 1}</b>
                <span><b>{s.title}</b><small>{DESK[s.kind]} · {md(s.date)}</small></span>
              </Link>
            )) : <p className="yj-faint">아직 실린 기사가 없습니다</p>}
          </section>
        </div>

        {/* 단 — 경기 기록 · 취재 수첩 · 리스트 · 독자 투고 */}
        <div className="yj-cols">
          <section aria-label="경기 기록">
            <Head en="FIELD REPORT" ko="경기 기록" />
            {reports.length ? reports.slice(0, 5).map(s => (
              <Link key={s.id} className="yj-row" href={s.href}><time>{md(s.date)}</time><span>{s.title}{s.text && <small>{cut(s.text, 40)}</small>}</span></Link>
            )) : <p className="yj-faint">아직 실린 기록이 없습니다</p>}
          </section>
          <section aria-label="취재 수첩">
            <Head en="JOURNAL" ko="취재 수첩" href="/diary" />
            {journal.length ? journal.slice(0, 5).map(s => (
              <Link key={s.id} className="yj-row" href={s.href}><time>{md(s.date)}</time><span>{s.title}{s.text && <small>{cut(s.text, 40)}</small>}</span></Link>
            )) : <p className="yj-faint">아직 실린 수첩이 없습니다</p>}
          </section>
          <section aria-label="리스트">
            <Head en="NOTES" ko="리스트" href="/board" />
            {notes.length ? notes.slice(0, 5).map(s => (
              <Link key={s.id} className="yj-row" href={s.href}><time>{md(s.date)}</time><span>{s.title}</span></Link>
            )) : <p className="yj-faint">아직 실린 글이 없습니다</p>}
          </section>
          <section aria-label="독자 투고">
            <Head en="LETTERS" ko="독자 투고" href="/guest" />
            {letters.length ? letters.map(g => (
              <blockquote key={g.id}>&ldquo;{cut(plain(g.body), 70)}&rdquo; <small>— {g.author}</small></blockquote>
            )) : <p className="yj-faint">첫 투고를 기다립니다</p>}
          </section>
        </div>

        {/* 화보 — 링 컷 */}
        {photos.length > 0 && (
          <section className="yj-gallery" aria-label="화보">
            <Head en="GALLERY" ko="화보" />
            <div className="yj-gal">
              {photos.slice(0, 6).map(s => (
                <Link key={s.id} href={s.href}>
                  <span className="yj-gal-img">
                    <CroppedBlobImg fileRef={s.img} crop={s.crop} ph="yj-ph-img" alt="" />
                    <i className="yj-ring r2" />
                  </span>
                  <b>{s.title}</b>
                  {s.text && <small>{cut(s.text, 30)}</small>}
                </Link>
              ))}
            </div>
          </section>
        )}

        <footer className="yj-foot">
          <span>발행 · 편집인 YJHM 편집국 | 본지는 두 사람의 기록만 다룹니다</span>
          <b>THE SHOOTING DAILY</b>
        </footer>
      </div>
    </div>
  );
}
