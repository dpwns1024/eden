'use client';
// EditableDesc 주입
// 그림백업게시판 (4.11) — 그리드 보기 고정 · 페어링 탭 · 로그/단일 뱃지 · 접기 썸네일 블러 (v2.0 — 리스트 보기는 뺐다)
import React, { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useSectionParam, filterSection, sectionSetter, secQuery } from '@/lib/sectionStore';
import { useLocalList } from '@/lib/postStore';
import { BackupPost, BACKUP_SEED, backupNos, backupPath } from '@/lib/galleryStore';
import { Pager } from '@/components/ui/Kit';
import { useBoardSkin } from '@/lib/boardSkin';
import { CroppedBlobImg } from '@/components/ui/CropEditor';
import { EditableDesc, PageTitle } from '@/components/ui/PageText';
import { useBoardSettings, boardBadgeStyle } from '@/lib/boardStore';
import { useMainStore } from '@/lib/mainStore';
import { useCardSort, mergeOrder } from '@/lib/cardSort';
import { usePairings, pairIdOf, pairNameOf, pairTabs, inPairTab, NO_PAIR } from '@/lib/pairLink';

const FOLD_LABEL = { spoiler: '스포일러', adult: '수위 주의' };

function BackupPageInner() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const { editOn } = useMainStore();
  const [postsAll, setPostsAll] = useLocalList<BackupPost>('ohome.backup.v1', BACKUP_SEED);
  const nos = backupNos(postsAll);   // 글 주소 번호 (/confirmed/003)
  const sec = useSectionParam('gallery');
  const posts = filterSection(postsAll, sec.id);
  const setPosts = sectionSetter(postsAll, sec.id, setPostsAll);

  // 페어링 탭 (v2.0 사용자 요청 — 말머리 대신 PAIRING 게시판의 페어로, FIELD REPORT와 같은 방식).
  // 'all' · 페어링 id · NO_PAIR(페어링 없음)
  const [fCat, setFCat] = useState<string>('all');
  const rels = usePairings();

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

  // 검색은 없앴다 (v2.0 사용자 요청 — PC·모바일 모두)
  const arch = useBoardSkin() === 'arch';   // ARCH 디자인 — 각진 카드·단말기 말투
  const [unveiled, setUnveiled] = useState<Record<string, boolean>>({});

  const readable = posts
    .filter(p => isAdmin || p.visibility === 'public' || (p.visibility === 'member' && user));
  // 탭 — 글이 있는 페어링만 PAIRING 목록 순서대로. 페어링 없는 글이 있으면 끝에 ETC
  const pidOf = (p: BackupPost) => pairIdOf(p, rels);
  const { tabs: cats, none: noCat } = pairTabs(readable, rels, pidOf);
  const tabOn = fCat === 'all' || (fCat === NO_PAIR ? noCat > 0 : cats.some(c => c.id === fCat));
  useEffect(() => { if (!tabOn) setFCat('all'); });   // 고른 페어링 글이 사라지면 전체로
  const visible = readable.filter(p => inPairTab(fCat, pidOf(p)));

  const sort = useCardSort(visible, next => setPosts(mergeOrder(posts, next)), editOn && isAdmin);

  const PER = 12;
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(visible.length / PER));
  const cur = Math.min(page, pages);
  const start = (cur - 1) * PER;
  const paged = visible.slice(start, start + PER);
  useEffect(() => { setPage(1); }, [fCat]);


  return (
    <section className="page page-arch page-gallery">
      <div className="page-head">
        <PageTitle>{sec.id === 'main' ? 'GALLERY' : sec.name}</PageTitle>
        <EditableDesc k="backup-desc" def="로그형(웹툰 스크롤) / 단일형(좌우 넘김) · 페어링별로 나눠 보기" />
      </div>
      <div className="toolrow">
        {/* 페어링 탭 — ARCH에선 목차 탭 줄 모양 (globals.css .arch-tabbar · JOURNAL · FIELD REPORT와 같은 모양) */}
        <div className="tag-row arch-tabbar">
          <div className={`tag ${fCat === 'all' ? 'on' : ''}`} onClick={() => setFCat('all')}>
            {arch ? 'ALL' : '전체'} <small>{readable.length}</small>
          </div>
          {cats.map(c => (
            <div key={c.id} className={`tag ${fCat === c.id ? 'on' : ''}`} onClick={() => setFCat(c.id)}>
              {c.name} <small>{c.n}</small>
            </div>
          ))}
          {noCat > 0 && cats.length > 0 && (
            <div className={`tag ${fCat === NO_PAIR ? 'on' : ''}`} onClick={() => setFCat(NO_PAIR)}>
              {arch ? 'ETC' : '기타'} <small>{noCat}</small>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {user && <button className="btn btn-dark" onClick={() => router.push('/gallery/write' + secQuery('gallery', sec.id))}>✎ WRITE</button>}
        </div>
      </div>

      <div className="g3" style={{ display: visible.length > 0 ? undefined : 'none' }}>
          {paged.map((p, si) => {
            const i = start + si;
            const folded = p.fold && !unveiled[p.id];
            const pair = pairNameOf(p, rels);
            return (
              <div key={p.id} className="panel g-item" {...sort(i)}
                onClick={() => { if (!folded && !editOn) router.push(backupPath(p, nos)); }}>
                <div className={`thumb ${folded ? 'veil' : ''}`}>
                  <div style={{ position: 'absolute', inset: 0 }}>
                    <CroppedBlobImg fileRef={p.images[0]} crop={p.thumbCrop} ph={p.phList[0] ?? 'cool'} />
                  </div>
                  {folded && (
                    <div className="cover" onClick={e => { e.stopPropagation(); setUnveiled(u => ({ ...u, [p.id]: true })); }}>
                      <div>
                        <b>{p.fold!.type === 'custom' ? (p.fold!.label || '접힘') : FOLD_LABEL[p.fold!.type]}</b><br />
                        <span>클릭하여 표시</span>
                      </div>
                    </div>
                  )}
                </div>
                {/* 제목 칸 — 페어링은 제목 옆, 아래엔 태그만 (장수·날짜·작성자는 표시하지 않음, v2.0 사용자 요청) */}
                <div className="info">
                  <div className="g-head">
                    <b>{p.title}</b>
                    {pair && <span className="typ" style={getPrefixStyle(pair)}>{pair}</span>}
                    {/* 태그는 페어링 옆 (v2.0 사용자 요청) */}
                    {(p.tags ?? []).map(t => <i key={t} className="tag-in">#{t}</i>)}
                  </div>
                </div>
              </div>
            );
          })}
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
