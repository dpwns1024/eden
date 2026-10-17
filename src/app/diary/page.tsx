'use client';
// 다이어리 (4.14) — 카드 목록 (v2.0 사용자 선택 · JOURNAL 시안 B): 큰 날짜 · 무드색 띠 · 첫 사진 · 세 줄 미리보기,
// 누르면 그 카드가 한 줄을 다 차지하며 그 자리에서 펼쳐진다 · 무드 필터 · 페이지네이션 · 공개범위(비공개는 관리자만)
// 오른쪽: 미니 달력(일기 쓴 날 무드색 점, 누르면 그 일기) + 달별 보관함
import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useSectionParam, filterSection, sectionSetter } from '@/lib/sectionStore';
import { useLocalList } from '@/lib/postStore';
import { DiaryPost, DIARY_SEED, Mood, MOOD_SEED } from '@/lib/diaryStore';
import { renderBody } from '@/lib/sanitize';
import { Pager } from '@/components/ui/Kit';
import { ConfirmModal } from '@/components/ui/Modal';
import { Lightbox } from '@/components/ui/Lightbox';
import { BlobImg } from '@/lib/blobStore';
import { EditableDesc, PageTitle } from '@/components/ui/PageText';

const PAGE_SIZE = 12;   // 카드 3열 × 4줄
const WD = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function DiaryBody({ p, onOpen }: { p: DiaryPost; onOpen: (ids: string[], idx: number) => void }) {
  const html = useMemo(() => renderBody('md', p.body), [p.body]);
  return (
    <div className="dy-body">
      <div className="post-body" data-ex-title={p.title} dangerouslySetInnerHTML={{ __html: html }} />
      {/* 이미지는 썸네일 리스트로 — 클릭하면 뷰어(좌우 넘김) (v1.9 사용자 확정) */}
      {p.imgIds.length > 0 && (
        <div className="dy-thumbs">
          {p.imgIds.map((id, i) => (
            <div key={id} className="dy-thumb" onClick={() => onOpen(p.imgIds, i)}>
              <BlobImg fileRef={id} ph="" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** 본문 첫머리 글자만 — 카드 미리보기용 */
function plain(md: string) {
  return renderBody('md', md).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
}

function DiaryCard({ p, mood, opened, isAdmin, onToggle, onImg, onEdit, onDel }: {
  p: DiaryPost; mood?: Mood; opened: boolean; isAdmin: boolean;
  onToggle: () => void; onImg: (ids: string[], idx: number) => void; onEdit: () => void; onDel: () => void;
}) {
  const ex = useMemo(() => plain(p.body), [p.body]);
  const [y, mo, d] = p.date.split('-').map(Number);
  const wd = WD[new Date(y, (mo || 1) - 1, d || 1).getDay()];
  const color = mood?.color ?? '#8592a0';
  return (
    <article id={p.id} className={`panel dy-card${opened ? ' open' : ''}`} style={{ '--mc': color } as React.CSSProperties}>
      <i className="dy-band" />
      <div className="dy-ch" onClick={onToggle}>
        <b className="dy-day">{String(d || '').padStart(2, '0')}</b>
        <span className="dy-dm">{MON[(mo || 1) - 1]} {y}<br />{wd}</span>
        <span className="dy-mi" style={{ color }}>{mood?.icon ?? '·'}</span>
      </div>
      {!opened && p.imgIds.length > 0 && (
        <div className="dy-cimg" onClick={onToggle}><BlobImg fileRef={p.imgIds[0]} ph="" /></div>
      )}
      <h3 className="dy-ct" onClick={onToggle}>
        {p.title}
        {p.visibility !== 'public' && <span className="pill">{p.visibility === 'member' ? '멤버' : '비공개'}</span>}
      </h3>
      {opened ? (
        <>
          <DiaryBody p={p} onOpen={onImg} />
          {isAdmin && (
            <div className="dy-adm">
              <button className="btn btn-ghost" onClick={onEdit}>EDIT</button>
              <button className="btn btn-ghost" onClick={onDel}>DELETE</button>
            </div>
          )}
        </>
      ) : ex && <p className="dy-ex" onClick={onToggle}>{ex}</p>}
      <div className="dy-cf" onClick={onToggle}>
        <span style={{ color }}>{mood ? `${mood.icon} ${mood.name}` : ''}</span>
        <span>{opened ? 'CLOSE ‹' : 'READ ›'}</span>
      </div>
    </article>
  );
}

function DiaryPageInner() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [postsAll, setPostsAll, loaded] = useLocalList<DiaryPost>('ohome.diary.v1', DIARY_SEED);
  // 여러 개로 만든 섹션 (v2.0) — 주소의 ?s= 가 가리키는 것만 보여 준다
  const sec = useSectionParam('diary');
  const posts = filterSection(postsAll, sec.id);
  // 저장은 이 섹션 자리만 교체 — 걸러진 목록을 그대로 넘겨도 다른 섹션이 지워지지 않는다
  const setPosts = sectionSetter(postsAll, sec.id, setPostsAll);
  const [moods] = useLocalList<Mood>('ohome.moods.v1', MOOD_SEED);
  const [open, setOpen] = useState<string | null>(null);
  const [fMood, setFMood] = useState('all');
  const [q] = useState('');   // 검색 칸은 없앴다 (v2.0 사용자 요청) — 걸러 내는 자리는 그대로 둔다
  const [page, setPage] = useState(1);
  const [delFor, setDelFor] = useState<DiaryPost | null>(null);
  const [lb, setLb] = useState<{ srcs: string[]; idx: number } | null>(null); // 이미지 뷰어 (v1.9)
  // 미니 캘린더 (4.14 달력 보기) — 달을 넘기면 그 달의 일기만 표시
  const now = new Date();
  const [view, setView] = useState<{ y: number; m: number }>({ y: now.getFullYear(), m: now.getMonth() });
  const [monthFilter, setMonthFilter] = useState(false);

  // 메인 위젯에서 특정 일기로 진입 — /diary#id (4.14)
  useEffect(() => {
    const h = window.location.hash.slice(1);
    if (h) setOpen(h);
  }, [loaded]);
  // 펼친 카드는 한 줄을 다 차지하며 자리가 바뀌므로 그 카드 위치로 데려간다
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => document.getElementById(open)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
    return () => clearTimeout(t);
  }, [open]);

  if (!loaded) return <section className="page page-arch page-diary" />;

  const query = q.trim().toLowerCase();
  const monthKey = `${view.y}-${String(view.m + 1).padStart(2, '0')}`;
  const canSee = (p: DiaryPost) => isAdmin || (p.visibility === 'public' || (p.visibility === 'member' && !!user));
  const visible = posts
    .filter(canSee)
    .filter(p => fMood === 'all' || p.moodId === fMood)
    .filter(p => !query || p.title.toLowerCase().includes(query))
    .filter(p => !monthFilter || p.date.startsWith(monthKey))
    .sort((a, b) => b.date.localeCompare(a.date));

  // 캘린더 표시용 — 보이는 달의 일기 (일 → 글 목록)
  const byDay = new Map<number, DiaryPost[]>();
  posts.filter(canSee).filter(p => p.date.startsWith(monthKey)).forEach(p => {
    const d = parseInt(p.date.slice(8, 10), 10);
    byDay.set(d, [...(byDay.get(d) ?? []), p]);
  });
  const firstDay = new Date(view.y, view.m, 1).getDay();
  const dim = new Date(view.y, view.m + 1, 0).getDate();
  const mv = (d: number) => {
    setView(v => { const nm = v.m + d; return { y: v.y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12 }; });
    setMonthFilter(true); setPage(1);
  };
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const shown = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const moodOf = (id: string) => moods.find(m => m.id === id);
  // 보관함 — 볼 수 있는 일기의 달별 개수 (최근 달부터)
  const archMap = new Map<string, number>();
  posts.filter(canSee).forEach(p => { const k = p.date.slice(0, 7); if (/^\d{4}-\d{2}$/.test(k)) archMap.set(k, (archMap.get(k) ?? 0) + 1); });
  const archive = [...archMap.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);
  const cnt = (mid: string) => posts
    .filter(p => isAdmin || (p.visibility === 'public' || (p.visibility === 'member' && !!user)))
    .filter(p => mid === 'all' || p.moodId === mid).length;

  return (
    <section className="page page-arch page-diary">
      <div className="page-head">
        <PageTitle>{sec.id === 'main' ? 'DIARY' : sec.name}</PageTitle>
        <EditableDesc k="diary-desc" def="무드 일기 — 클릭하면 그 자리에서 펼쳐집니다" />
      </div>

      {/* 무드 필터 + 달 필터 표시 + WRITE — 필터 줄 오른쪽 정렬 (v1.9 사용자 요청 · 검색 칸은 v2.0에 뺐다).
          그리드 밖(풀폭): 캘린더가 일기 패널과 같은 높이에서 시작 */}
      <div className="toolrow" style={{ marginBottom: 16 }}>
        {/* ARCH에선 목차 탭 줄 모양 (v2.0 사용자 요청 — globals.css .arch-tabbar) */}
        <div className="tag-row arch-tabbar">
          <div className={`tag ${fMood === 'all' ? 'on' : ''}`} onClick={() => { setFMood('all'); setPage(1); }}>
            전체 <small>{cnt('all')}</small>
          </div>
          {moods.map(m => (
            <div key={m.id} className={`tag ${fMood === m.id ? 'on' : ''}`} onClick={() => { setFMood(m.id); setPage(1); }}>
              <span style={{ color: m.color }}>{m.icon}</span> {m.name} <small>{cnt(m.id)}</small>
            </div>
          ))}
          {monthFilter && (
            <div className="tag on" onClick={() => { setMonthFilter(false); setPage(1); }}
              data-tip="달 필터 해제">
              {view.y}.{String(view.m + 1).padStart(2, '0')} ✕
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isAdmin && <button className="btn btn-dark" onClick={() => router.push('/diary/write')}>＋ WRITE</button>}
        </div>
      </div>

      {/* 좌 카드 목록 + 우 미니 달력 · 보관함 (4.14 달력 보기 · v2.0 시안 B) */}
      <div className="dy-layout">
      <div>
      <div className="dy-cards">
        {shown.map(p => (
          <DiaryCard key={p.id} p={p} mood={moodOf(p.moodId)} opened={open === p.id} isAdmin={isAdmin}
            onToggle={() => setOpen(o => (o === p.id ? null : p.id))}
            onImg={(ids, idx) => setLb({ srcs: ids, idx })}
            onEdit={() => router.push(`/diary/${p.id}/edit`)}
            onDel={() => setDelFor(p)} />
        ))}
      </div>
      {shown.length === 0 && <div className="panel"><p className="hint" style={{ padding: 16 }}>{query ? '검색 결과가 없습니다' : '일기가 없습니다'}</p></div>}

      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
        <Pager page={page} total={totalPages} onChange={setPage} />
      </div>
      </div>

      <div className="dy-side">
      {/* 우: 미니 캘린더 — 일기 쓴 날은 무드색 점, 달을 넘기면 그 달만 목록에 */}
      <div className="panel dy-cal">
        <div className="hd">
          <button type="button" onClick={() => mv(-1)}>‹</button>
          <b>{view.y}년 {view.m + 1}월</b>
          <button type="button" onClick={() => mv(1)}>›</button>
        </div>
        <div className="wk">{['일', '월', '화', '수', '목', '금', '토'].map(w => <span key={w}>{w}</span>)}</div>
        <div className="days">
          {Array.from({ length: firstDay }, (_, i) => <span key={`e${i}`} />)}
          {Array.from({ length: dim }, (_, i) => {
            const d = i + 1;
            const entries = byDay.get(d);
            return (
              <button type="button" key={d} className={entries ? 'has' : ''}
                data-tip={entries ? entries.map(p => p.title).join(' · ') : undefined}
                onClick={() => {
                  if (!entries) return;
                  setMonthFilter(true); setPage(1); setOpen(entries[0].id);
                }}>
                {d}
                <span className="dots">
                  {(entries ?? []).slice(0, 2).map(p => (
                    <i key={p.id} style={{ background: moodOf(p.moodId)?.color ?? 'var(--faint)' }} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {/* 달별 보관함 — 누르면 그 달만 */}
      {archive.length > 0 && (
        <div className="panel dy-arch">
          <h4>ARCHIVE</h4>
          {archive.map(([k, n]) => (
            <button key={k} type="button" className={monthFilter && k === monthKey ? 'on' : ''}
              onClick={() => { const [yy, mm] = k.split('-').map(Number); setView({ y: yy, m: mm - 1 }); setMonthFilter(true); setPage(1); }}>
              <span>{k.replace('-', ' · ')}</span><b>{n}</b>
            </button>
          ))}
        </div>
      )}
      </div>
      </div>

      <ConfirmModal open={delFor !== null} title="일기를 삭제하시겠습니까?"
        body={`"${delFor?.title}" — 삭제하면 복구할 수 없습니다.`}
        onClose={() => setDelFor(null)}
        buttons={[
          { label: 'DELETE', kind: 'accent', onClick: () => { setPosts(posts.filter(x => x.id !== delFor!.id)); setDelFor(null); } },
          { label: 'CANCEL', kind: 'ghost', onClick: () => setDelFor(null) },
        ]} />
      {/* 이미지 뷰어 — 썸네일 클릭 시 (v1.9 사용자 확정) */}
      {lb && <Lightbox srcs={lb.srcs} index={lb.idx} onClose={() => setLb(null)} />}
    </section>
  );
}

/** ?s= 를 읽으므로 Suspense 경계가 필요하다 (Next App Router) */
export default function DiaryPage() {
  return <Suspense fallback={<section className="page page-arch page-diary" />}><DiaryPageInner /></Suspense>;
}
