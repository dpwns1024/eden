'use client';
/**
 * YJHM 메인 화면 (lib/worldStore.ts) — 국가대표 사격선수 × 통역사 · 현대 일상 · 달달 로맨스.
 * 「필름」 1면 (사용자 확정 시안 Z3) — 미색 바탕 + 은은한 과녁 링 위에
 *  머리(Hong Yejun.) → 기울어진 35mm 필름 띠가 천천히 흐름(첫 칸은 관리자가 고정한 대표 그림, 이어서 사진 있는 글)
 *  → 아래 줄 왼쪽 SCRAP(최근 글 리스트) · 가운데 비움 · 오른쪽 GUESTBOOK(말풍선) → 맨 아래 폴더 메뉴 바 + 가운데 한마디.
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
import { useYjhmFront, YjhmFront } from '@/lib/yjhmFrontStore';
import { putBlob, useBlobUrl } from '@/lib/blobStore';
import { CroppedBlobImg, CropEditor, CropValue } from '@/components/ui/CropEditor';
import { useToast } from '@/components/ui/Toast';
import { YjhmHeader, YjhmDock } from './YjhmHeader';

type Kind = 'REPORT' | 'GALLERY' | 'JOURNAL' | 'LIST';
const KIND_EN: Record<Kind, string> = { REPORT: 'MATCH', GALLERY: 'PHOTO', JOURNAL: 'DIARY', LIST: 'NOTE' };

interface Story {
  id: string; kind: Kind; title: string; date: string; href: string;
  img?: string; crop?: CropValue;   // 대표 이미지 (필름 칸에 실린다)
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
/** 2026.03.05부터 센 날 (그날이 1일 — 사용자 요청) */
const DDAY_FROM = new Date(2026, 2, 5);
const dday = (now: Date) => Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - DDAY_FROM.getTime()) / 86400000) + 1;
/** 2026-10-28… → 10.28 */
const md = (d: string) => (d.length >= 10 ? `${d.slice(5, 7)}.${d.slice(8, 10)}` : d);

/** 필름 한 칸 비율 (가로/세로) — 위치 조정 창도 이 비율로 */
const FRAME_ASPECT = 408 / 268;
/** 칸이 이보다 적으면 빈 칸으로 채워 띠가 끊기지 않게 */
const MIN_FRAMES = 6;

interface Frame { key: string; img?: string; crop?: CropValue; href?: string; title?: string; cover?: boolean }

/** 필름 한 칸 — 가장자리 인쇄(필름 이름 · 프레임 번호 · 감도 · DX 바코드) + 사진 */
function FilmCell({ f, n }: { f: Frame; n: number }) {
  const pic = <CroppedBlobImg fileRef={f.img} crop={f.crop} ph="yj-film-ph" alt={f.title ?? ''} />;
  return (
    <div className="yj-cell">
      <i className="yj-perf" /><i className="yj-perf b" />
      <span className="yj-ep t" style={{ left: '7%' }}>{n % 2 ? 'SAFETY FILM' : 'PANCHRO 400'}</span>
      {n % 3 === 2 && <i className="yj-dx" />}
      <span className="yj-ep t" style={{ left: '68%' }}>{n}&nbsp; ▸ {n}A</span>
      {f.href
        ? <Link className="yj-fr" href={f.href} aria-label={f.title} tabIndex={-1}>{pic}</Link>
        : <span className="yj-fr">{pic}</span>}
      <span className="yj-ep b" style={{ left: '7%' }}>▶ {n}</span>
      <span className="yj-ep b" style={{ left: '57%' }}>{n % 2 ? 'ISO 400 / 27°' : `▶ ${n}A`}</span>
    </div>
  );
}

/** 흐르는 필름 띠 — 같은 칸 묶음을 두 번 이어 붙여 끝없이 흐르게 한다 */
function Film({ frames }: { frames: Frame[] }) {
  const cells = frames.map((f, i) => <FilmCell key={f.key} f={f} n={i + 1} />);
  return (
    <div className="yj-film" aria-label="사진 필름">
      <div className="yj-track">
        <div className="yj-roll">{cells}</div>
        <div className="yj-roll" aria-hidden="true">{frames.map((f, i) => <FilmCell key={`b-${f.key}`} f={f} n={i + 1} />)}</div>
      </div>
    </div>
  );
}

/** 관리자 — 필름 첫 칸(대표 그림) 바꾸기 · 위치 조정 */
function CoverEdit({ doc, save }: { doc: YjhmFront; save: (next: YjhmFront) => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [crop, setCrop] = useState(false);
  const src = useBlobUrl(doc.img);
  const upload = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    try { save({ ...doc, img: await putBlob(f), crop: undefined }); toast('대표 그림을 바꿨습니다'); }
    catch (e) { toast(`올리지 못했습니다 — ${e instanceof Error ? e.message : ''}`); }
    setBusy(false);
  };
  return (
    <div className="yj-cover-edit">
      <label className="yj-tape">{busy ? '올리는 중…' : '대표 그림'}
        <input type="file" accept="image/*" disabled={busy} onChange={e => upload(e.target.files?.[0])} />
      </label>
      {src && <button type="button" className="yj-tape" onClick={() => setCrop(true)}>위치 조정</button>}
      {src && crop && (
        <CropEditor open src={src} aspect={FRAME_ASPECT} aspectLabel="필름 한 칸" initial={doc.crop}
          onClose={() => setCrop(false)}
          onApply={c => { save({ ...doc, crop: c }); setCrop(false); }} />
      )}
    </div>
  );
}

export function YjhmHome() {
  const { user, isAdmin } = useAuth();
  const rels = usePairings();
  const rel = relOfWorld(rels, 'yjhm');
  const [front, saveFront] = useYjhmFront();
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
  const all: Story[] = [
    ...logs.filter(l => mine(l) && can(l.visibility) && (!l.listHidden || isAdmin)).map(l => ({
      id: l.id, kind: 'REPORT' as const, title: l.title, date: l.date ?? '', href: logPath(l), img: l.thumbId || l.thumbUrl, crop: l.thumbCrop,
    })),
    ...gal.filter(p => mine(p) && can(p.visibility)).map(p => ({
      id: p.id, kind: 'GALLERY' as const, title: p.title, date: p.date, href: backupPath(p, nos), img: p.images[0], crop: p.thumbCrop,
    })),
    ...diary.filter(p => mine(p) && can(p.visibility)).map(p => ({
      id: p.id, kind: 'JOURNAL' as const, title: p.title, date: p.date, href: `/diary#${p.id}`, img: p.imgIds[0],
    })),
    ...posts.filter(p => mine(p) && !p.secret).map(p => ({
      id: p.id, kind: 'LIST' as const, title: p.title, date: p.date, href: `/board/${p.id}`, img: p.thumbSrc, crop: p.thumbCrop,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  // 필름 — 첫 칸은 관리자가 고정한 대표 그림, 이어서 사진 있는 글 (최근 순)
  const coverImg = front.img ?? rel?.arts?.[0] ?? rel?.thumbId;
  const frames: Frame[] = [
    { key: 'cover', img: coverImg, crop: front.crop ?? (front.img ? undefined : rel?.thumbCrop), title: front.title || rel?.name, cover: true },
    ...all.filter(s => s.img).slice(0, 9).map(s => ({ key: s.id, img: s.img, crop: s.crop, href: s.href, title: s.title })),
  ];
  while (frames.length < MIN_FRAMES) frames.push({ key: `empty-${frames.length}` });

  const letters = guest.filter(g => !g.secret).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 2);
  const members = (rel?.members ?? []).map(m => ({ m, c: chars.find(c => c.id === m.charId) })).filter((x): x is { m: RelMember; c: Character } => !!x.c);
  const said = members.find(x => x.m.quote?.trim());
  const quote = said ? { who: said.c.name, text: said.m.quote!.trim() } : rel?.catchphrase ? { who: 'YJHM', text: rel.catchphrase } : undefined;

  return (
    <div className="yj-main yj-film-home">
      <i className="yj-rings" aria-hidden="true" />
      <YjhmHeader front={{ no: `NO.${String(dday(new Date())).padStart(4, '0')}` }} />

      <div className="yj-film-wrap">
        <Film frames={frames} />
        {isAdmin && <CoverEdit doc={front} save={saveFront} />}
      </div>

      <div className="yj-lower">
        <section className="yj-scrap" aria-label="스크랩">
          <Link className="yj-tape" href="/trpg">SCRAP · {all.length}</Link>
          <div className="yj-scrap-l">
            {all.length ? all.slice(0, 4).map(s => (
              <Link key={s.id} href={s.href}><time>{md(s.date)}</time><span>{s.title}</span><em>{KIND_EN[s.kind]}</em></Link>
            )) : <p className="yj-faint">아직 실린 글이 없습니다</p>}
          </div>
        </section>
        <section className="yj-gb" aria-label="방명록">
          <Link className="yj-tape" href="/guest">GUESTBOOK</Link>
          <div className="yj-gb-l">
            {letters.length ? letters.map((g, i) => (
              <React.Fragment key={g.id}>
                <Link href="/guest" className={i % 2 ? 'me' : ''}>{cut(plain(g.body), 40)}</Link>
                <small>{g.author} · {md(g.date)}</small>
              </React.Fragment>
            )) : <Link href="/guest">첫 응원을 남겨 주세요</Link>}
          </div>
        </section>
      </div>

      <YjhmDock quote={quote} />
    </div>
  );
}
