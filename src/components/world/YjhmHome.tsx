'use client';
/**
 * YJHM 메인 화면 (lib/worldStore.ts) — 국가대표 사격선수 × 통역사 · 현대 일상 · 달달 로맨스.
 * 지금은 구조만 — 머리(로고 · 메뉴 · 로그인) · 히어로(페어 이름 · 캐치프레이즈) · 두 사람 · 최근 기록 · 푸터.
 * 내용은 PAIRING의 YJHM 페어와 그 페어로 쓴 글(FIELD REPORT · 갤러리 · JOURNAL · 리스트)에서 읽는다.
 * 디자인(yjhm.css)은 레퍼런스가 오면 바꾼다.
 */
import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useLocalList, BOARD_SEED, Post } from '@/lib/postStore';
import { Character, CHAR_SEED, relPath } from '@/lib/charStore';
import { BackupPost, BACKUP_SEED, backupNos, backupPath, TrpgLog, TRPG_SEED } from '@/lib/galleryStore';
import { DiaryPost, DIARY_SEED } from '@/lib/diaryStore';
import { logPath } from '@/lib/logPath';
import { usePairings, pairIdOf } from '@/lib/pairLink';
import { relOfWorld } from '@/lib/worldStore';
import { BlobImg } from '@/lib/blobStore';
import { YjhmHeader } from './YjhmHeader';

interface Rec { id: string; kind: string; title: string; date: string; href: string }

export function YjhmHome() {
  const { user, isAdmin } = useAuth();
  const rels = usePairings();
  const rel = relOfWorld(rels, 'yjhm');
  const [chars] = useLocalList<Character>('ohome.chars.v1', CHAR_SEED);
  const [logs] = useLocalList<TrpgLog>('ohome.trpg.v1', TRPG_SEED);
  const [gal] = useLocalList<BackupPost>('ohome.backup.v1', BACKUP_SEED);
  const [diary] = useLocalList<DiaryPost>('ohome.diary.v1', DIARY_SEED);
  const [posts] = useLocalList<Post>('ohome.board.v1', BOARD_SEED);

  // 최근 기록 — 이 페어로 쓴 글 중 볼 수 있는 것, 최신 6개
  const mine = (p: { relId?: string; category?: string }) => !!rel && pairIdOf(p, rels) === rel.id;
  const can = (v: string) => isAdmin || v === 'public' || (v === 'member' && !!user);
  const nos = backupNos(gal);
  const recs: Rec[] = !rel ? [] : [
    ...logs.filter(l => mine(l) && can(l.visibility)).map(l => ({ id: l.id, kind: 'REPORT', title: l.title, date: l.date ?? '', href: logPath(l) })),
    ...gal.filter(p => mine(p) && can(p.visibility)).map(p => ({ id: p.id, kind: 'GALLERY', title: p.title, date: p.date, href: backupPath(p, nos) })),
    ...diary.filter(p => mine(p) && can(p.visibility)).map(p => ({ id: p.id, kind: 'JOURNAL', title: p.title, date: p.date, href: `/diary#${p.id}` })),
    ...posts.filter(p => mine(p) && !p.secret).map(p => ({ id: p.id, kind: 'BOARD', title: p.title, date: p.date, href: `/board/${p.id}` })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  const members = (rel?.members ?? []).map(m => ({ m, c: chars.find(c => c.id === m.charId) })).filter(x => x.c);

  return (
    <div className="yj-main">
      <div className="yj-wrap">
        <YjhmHeader />

        <section className="yj-hero">
          <p className="yj-eyebrow">SHOOTER × INTERPRETER</p>
          <h1>{rel?.name ?? 'YJHM'}</h1>
          <p className="yj-catch">{rel?.catchphrase || '과녁 너머의 당신에게, 오늘의 말을 건넨다'}</p>
          {rel && <Link className="yj-btn" href={relPath(rel)}>OUR STORY →</Link>}
          {!rel && <p className="yj-note">PAIRING 게시판에 「YJHM」 페어를 올리면 이 자리에 내용이 채워집니다</p>}
        </section>

        {members.length > 0 && (
          <section className="yj-pair">
            {members.map(({ m, c }) => (
              <Link key={c!.id} className="yj-person" href={`/chars/${c!.id}`}>
                <div className="yj-ph">{c!.thumbId ? <BlobImg fileRef={c!.thumbId} ph="" /> : <span>{c!.name.slice(0, 1)}</span>}</div>
                <b style={{ color: c!.color || undefined }}>{c!.name}</b>
                <small>{c!.sub}</small>
                {m.quote && <q>{m.quote}</q>}
              </Link>
            ))}
          </section>
        )}

        <section className="yj-recent">
          <h2>RECENT DAYS</h2>
          {recs.length ? (
            <ul>
              {recs.map(r => (
                <li key={`${r.kind}-${r.id}`}>
                  <Link href={r.href}><em>{r.kind}</em><span>{r.title}</span><time>{r.date.slice(0, 10)}</time></Link>
                </li>
              ))}
            </ul>
          ) : <p className="yj-note">아직 이 페어로 쓴 글이 없습니다</p>}
        </section>

        <footer className="yj-foot">© YJHM · our ordinary days</footer>
      </div>
    </div>
  );
}
