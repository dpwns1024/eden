'use client';
// EditableDesc 주입
// 그림백업게시판 (4.11) — 갤러리/리스트 토글 · 로그/단일 뱃지 · 접기 썸네일 블러
import React, { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useSectionParam, filterSection, sectionSetter, secQuery } from '@/lib/sectionStore';
import { useLocalList, fmtDate } from '@/lib/postStore';
import { BackupPost, BACKUP_SEED } from '@/lib/galleryStore';
import { SearchBar, Pager } from '@/components/ui/Kit';
import { CroppedBlobImg } from '@/components/ui/CropEditor';
import { EditableDesc, PageTitle } from '@/components/ui/PageText';
import { useBoardSettings, boardBadgeStyle } from '@/lib/boardStore';
import { useMainStore } from '@/lib/mainStore';
import { useCardSort, mergeOrder } from '@/lib/cardSort';
import { useMenuSettings } from '@/lib/menuStore';

const FOLD_LABEL = { spoiler: '스포일러', adult: '수위 주의' };

function BackupPageInner() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const { editOn } = useMainStore();
  const [postsAll, setPostsAll] = useLocalList<BackupPost>('ohome.backup.v1', BACKUP_SEED);
  const sec = useSectionParam('gallery');
  const posts = filterSection(postsAll, sec.id);
  const setPosts = sectionSetter(postsAll, sec.id, setPostsAll);

  const [menuSet, , menuLoaded] = useMenuSettings();
  const [view, setView] = useState<'gal' | 'list'>('gal');
  const [viewInit, setViewInit] = useState(false);
  useEffect(() => {
    if (menuLoaded && !viewInit) { setView(menuSet.backupView); setViewInit(true); }
  }, [menuLoaded, viewInit, menuSet.backupView]);

  const { st: boardSet } = useBoardSettings();

  // 말머리 설정 탐색 및 알약 모양 배경/테두리 스타일 보장
  const findPrefixBadge = (cat?: string) => {
    if (!cat || !boardSet) return undefined;
    let found: any = undefined;
    const search = (obj: any) => {
      if (!obj || found) return;
      if (Array.isArray(obj)) {
        for (const item of obj) {
          if (item && typeof item === 'object' && (item.label === cat || item.name === cat || item.id === cat)) {
            found = item;
            return;
          }
          search(item);
        }
      } else if (typeof obj === 'object') {
        for (const k of Object.keys(obj)) search(obj[k]);
      }
    };
    search(boardSet);
    return found;
  };

  const getPrefixStyle = (cat?: string) => {
    const b = findPrefixBadge(cat);
    const customStyle = b ? boardBadgeStyle(b) : {};
    return {
      backgroundColor: b?.bg || b?.backgroundColor || '#eef0f2',
      borderColor: b?.border || b?.borderColor || '#607ca0',
      color: b?.color || b?.textColor || '#607ca0',
      borderWidth: '1px',
      borderStyle: 'solid',
      ...customStyle,
    };
  };

  const [q, setQ] = useState('');
  const [unveiled, setUnveiled] = useState<Record<string, boolean>>({});

  const visible = posts
    .filter(p => isAdmin || p.visibility === 'public' || (p.visibility === 'member' && user))
    .filter(p => !q || p.title.includes(q) || p.category.includes(q)
      || (p.tags ?? []).some(t => t.toLowerCase().includes(q.toLowerCase())));

  const sort = useCardSort(visible, next => setPosts(mergeOrder(posts, next)), editOn && isAdmin);

  const PER = view === 'gal' ? 12 : 20;
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(visible.length / PER));
  const cur = Math.min(page, pages);
  const start = (cur - 1) * PER;
  const paged = visible.slice(start, start + PER);
  useEffect(() => { setPage(1); }, [q, view]);

  const count = (p: BackupPost) => Math.max(p.images.length, p.phList.length);
  const meta = (p: BackupPost) =>
    `${count(p)}장 · ${fmtDate(p.madeDate ? p.madeDate + 'T00:00:00' : p.date)}`;

  return (
    <section className="page">
      <div className="page-head">
        <PageTitle>{sec.id === 'main' ? 'GALLERY' : sec.name}</PageTitle>
        <EditableDesc k="backup-desc" def="로그형(웹툰 스크롤) / 단일형(좌우 넘김) · 리스트/갤러리 보기 전환" />
      </div>
      <div className="toolrow">
        <div className="seg">
          <button className={view === 'gal' ? 'on' : ''} onClick={() => setView('gal')}>갤러리</button>
          <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>리스트</button>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <SearchBar onSearch={setQ} />
          {user && <button className="btn btn-dark" onClick={() => router.push('/gallery/write' + secQuery('gallery', sec.id))}>✎ WRITE</button>}
        </div>
      </div>

      <div className="g3" style={{ display: view === 'gal' && visible.length > 0 ? undefined : 'none' }}>
          {paged.map((p, si) => {
            const i = start + si;
            const folded = p.fold && !unveiled[p.id];
            return (
              <div key={p.id} className="panel g-item" {...sort(i)}
                onClick={() => { if (!folded && !editOn) router.push(`/gallery/${p.id}`); }}>
                <div className={`thumb ${folded ? 'veil' : ''}`}>
                  <div style={{ position: 'absolute', inset: 0 }}>
                    <CroppedBlobImg fileRef={p.images[0]} crop={p.thumbCrop} ph={p.phList[0] ?? 'cool'} />
                  </div>
                  {!folded && p.category && (
                    <span className="typ" style={getPrefixStyle(p.category)}>
                      {p.category}
                    </span>
                  )}
                  {folded && (
                    <div className="cover" onClick={e => { e.stopPropagation(); setUnveiled(u => ({ ...u, [p.id]: true })); }}>
                      <div>
                        <b>{p.fold!.type === 'custom' ? (p.fold!.label || '접힘') : FOLD_LABEL[p.fold!.type]}</b><br />
                        <span>클릭하여 표시</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="info">
                  <b>{p.title}</b>
                  <small>
                    {meta(p)}
                    {(p.tags ?? []).map(t => <i key={t} className="tag-in">#{t}</i>)}
                  </small>
                </div>
              </div>
            );
          })}
        </div>

      <div className="panel flush" style={{ display: view === 'list' && visible.length > 0 ? undefined : 'none' }}>
          {paged.map(p => (
            <div key={p.id} className="list-item" onClick={() => router.push(`/gallery/${p.id}`)}>
              <div className="th" style={{ position: 'relative' }}><CroppedBlobImg fileRef={p.images[0]} crop={p.thumbCrop} ph={p.phList[0] ?? 'cool'} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>
                  {p.title}
                  {p.fold
                    ? <span className="pill red" style={{ marginLeft: 6 }}>접힘</span>
                    : p.category && <span className="typ" style={{ ...getPrefixStyle(p.category), marginLeft: 6 }}>{p.category}</span>}
                </b>
                <small>
                  {meta(p)}
                  {(p.tags ?? []).map(t => <i key={t} className="tag-in">#{t}</i>)}
                </small>
              </div>
              <small>{p.author}</small>
            </div>
          ))}
        </div>
      {visible.length === 0 && (
        <div className="panel" style={{ textAlign: 'center', padding: 44, fontSize: 13, color: 'var(--faint)' }}>
          게시물이 없습니다
        </div>
      )}
      {visible.length > PER && <Pager page={cur} total={pages} onChange={setPage} />}
    </section>
  );
}

export default function BackupPage() {
  return <Suspense fallback={<section className="page" />}><BackupPageInner /></Suspense>;
}
