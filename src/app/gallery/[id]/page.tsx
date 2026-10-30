'use client';
// 그림백업 상세 (4.11) — 로그형: 세로 스크롤 뷰어 / 단일형: 큰 이미지 + 썸네일 스트립 + 좌우 넘김
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useHrefBlock } from '@/components/shell/MenuGuard';
import { sectionHref, MAIN_SEC, useSectionTitle } from '@/lib/sectionStore';
import { useAuth } from '@/lib/auth';
import { useLocalList } from '@/lib/postStore';
import { BackupPost, BACKUP_SEED, findBackupByRef, backupNos, backupPath, freezeBackupNos } from '@/lib/galleryStore';
import { ConfirmModal } from '@/components/ui/Modal';
import { useBlobUrl } from '@/lib/blobStore';
import { sanitizeHtml } from '@/lib/sanitize';
import { PageTitle } from '@/components/ui/PageText';
import { Lightbox } from '@/components/ui/Lightbox';
import { useBoardSettings, boardBadgeStyle } from '@/lib/boardStore';
import { usePairings, pairIdOf, pairNameOf } from '@/lib/pairLink';
import { useFollowWorld } from '@/lib/worldStore';
import { useBoardCats, useCatMode, catOf } from '@/lib/boardCats';

export default function BackupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [posts, setPosts, loaded] = useLocalList<BackupPost>('ohome.backup.v1', BACKUP_SEED);
  const rels = usePairings();   // 제목 옆 페어링 뱃지 (v2.0 사용자 요청 — 말머리 대신)
  const [cur, setCur] = useState(0);
  const [delAsk, setDelAsk] = useState(false);
  const [lbOpen, setLbOpen] = useState(false); // 단일형 — 클릭 확대 보기
  const { st: boardSet } = useBoardSettings(); // 환경설정 > 게시판 관리 설정

  const p = findBackupByRef(posts, id);
  useFollowWorld(p && pairIdOf(p, rels));   // 세계 페어의 글이면 그 세계 디자인으로 (lib/worldStore.ts)
  const catMode = useCatMode();   // EVEDEN — 페어링 뱃지 대신 말머리 (lib/boardCats.ts)
  const boardCats = useBoardCats();
  const cat = p ? catOf(p, boardCats) : undefined;
  const nos = backupNos(posts);
  /* 이전·다음 글 (v2.0 사용자 요청) — 목록과 같은 순서·같은 소속(섹션)·볼 수 있는 글만 */
  const sibs = p ? posts.filter(x => (x.secId ?? MAIN_SEC) === (p.secId ?? MAIN_SEC)
    && (isAdmin || x.visibility === 'public' || (x.visibility === 'member' && !!user))) : [];
  const sIdx = p ? sibs.findIndex(x => x.id === p.id) : -1;
  const prevPost = sIdx > 0 ? sibs[sIdx - 1] : undefined;
  const nextPost = sIdx >= 0 && sIdx < sibs.length - 1 ? sibs[sIdx + 1] : undefined;
  // 다른 글로 넘어가면 그림 순서는 처음부터
  useEffect(() => { setCur(0); setLbOpen(false); }, [id]);

  // 말머리 설정 탐색 및 알약 모양 배경/테두리 스타일 적용
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
      borderRadius: '12px',
      padding: '2px 10px',
      fontSize: '11px',
      fontWeight: 600,
      display: 'inline-flex',
      alignItems: 'center',
      lineHeight: '1.2',
      ...customStyle,
    };
  };

  /* 이 글이 속한 곳이 비공개면 주소로 들어와도 열리지 않게 (v2.0 사용자 요청) */
  const blocked = useHrefBlock(p && sectionHref('gallery', p.secId ?? MAIN_SEC));
  const tt = useSectionTitle('gallery', p?.secId, 'GALLERY');
  if (blocked) return blocked;
  if (!loaded) return <section className="page" />;
  if (!p || (p.visibility === 'private' && !isAdmin) || (p.visibility === 'member' && !user)) {
    return (
      <section className="page page-arch page-gallery-detail">
        <div className="page-head"><PageTitle href={tt.href}>{tt.title}</PageTitle><p>게시물을 찾을 수 없거나 열람 권한이 없습니다</p></div>
      </section>
    );
  }

  const imgs: { url?: string; ph?: string }[] = p.images.length
    ? p.images.map(u => ({ url: u }))
    : p.phList.map(c => ({ ph: c }));

  const canManage = isAdmin || (!!p.authorId && p.authorId === user?.id);

  const Img = ({ im, ratio, natural }: { im: { url?: string; ph?: string }; ratio?: string; natural?: boolean }) => {
    const u = useBlobUrl(im.url);
    if (u) {
      return natural ? <img src={u} alt="" className="sv-img" />
        : <img src={u} alt="" style={{ maxWidth: '100%', height: 'auto', display: 'block', margin: '0 auto' }} />;
    }
    return <div className={`ph ${im.ph ?? ''}`}
      style={{ aspectRatio: natural ? '16/10' : ratio ?? '16/10', width: natural ? '100%' : undefined }}><span>IMAGE</span></div>;
  };

  return (
    <section className="page page-arch page-gallery-detail">
      <div className="page-head">
        <PageTitle href={tt.href}>{tt.title}</PageTitle>
        <div className="head-actions">
          {canManage && <button className="btn btn-dark" onClick={() => router.push(`${backupPath(p, nos)}/edit`)}>EDIT</button>}
          {canManage && <button className="btn btn-dark" onClick={() => setDelAsk(true)}>DELETE</button>}
        </div>
      </div>

      <div className="panel" style={{ padding: 20, maxWidth: 960, margin: '0 auto' }}>
        {/* 제목 옆에 갤러리 유형(단일) 대신 페어링 뱃지 (v2.0 — 말머리 대신 PAIRING의 페어) */}
        <h2 className="g-title" style={{ fontSize: 18, marginBottom: p.desc ? 8 : 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          {p.title}
          {catMode ? cat && (
            /* EVEDEN — 페어링 대신 말머리 (환경설정 말머리 이름 · 색) */
            <span className="g-badge" style={{ ...getPrefixStyle(cat.label), ...boardBadgeStyle(cat) }}>{cat.label}</span>
          ) : pairNameOf(p, rels) && (
            <span className="g-badge" style={getPrefixStyle(pairNameOf(p, rels))}>
              {pairNameOf(p, rels)}
            </span>
          )}
          {/* 태그는 페어링 옆 (v2.0 사용자 요청) */}
          {(p.tags ?? []).map(t => <i key={t} className="tag-in g-tag">#{t}</i>)}
        </h2>
        {p.desc && (
          <div className="post-body" data-ex-title={p.title} style={{ margin: '0 0 16px' }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(p.desc) }} />
        )}

        {p.type === 'log' ? (
          <div style={{ borderRadius: 10, overflow: 'hidden' }}>
            {imgs.map((im, i) => <Img key={i} im={im} />)}
          </div>
        ) : p.type === 'vlist' ? (
          <div style={{ display: 'grid', gap: 14 }}>
            {imgs.map((im, i) => (
              <div key={i} style={{ borderRadius: 10, overflow: 'hidden', cursor: im.url ? 'zoom-in' : undefined }}
                onClick={() => { if (im.url) { setCur(i); setLbOpen(true); } }}>
                <Img im={im} />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* 틀이 사진 크기에 맞춰 줄어든다 — 고정 16:10 상자에 검은 여백이 생기던 것 (v2.0 사용자 요청) */}
            <div className="single-viewer">
              <div className={`sv-frame ${imgs[cur].url ? '' : 'is-ph'}`}
                style={{ cursor: imgs[cur].url ? 'zoom-in' : undefined }}
                onClick={() => { if (imgs[cur].url) setLbOpen(true); }}>
                <Img im={imgs[cur]} natural />
                {imgs.length > 1 && (
                  <>
                    <button className="nav prev" aria-label="이전 사진"
                      onClick={e => { e.stopPropagation(); setCur(c => (c - 1 + imgs.length) % imgs.length); }}>◁</button>
                    <button className="nav next" aria-label="다음 사진"
                      onClick={e => { e.stopPropagation(); setCur(c => (c + 1) % imgs.length); }}>▷</button>
                  </>
                )}
              </div>
            </div>
            {imgs.length > 1 && (
              <div className="thumb-strip">
                {imgs.map((im, i) => (
                  <div key={i} className={`t ${i === cur ? 'on' : ''}`} onClick={() => setCur(i)}>
                    <Img im={im} ratio="4/3" />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {(prevPost || nextPost) && (
        <div className="g-nav">
          {prevPost ? <button className="btn btn-ghost" onClick={() => router.push(backupPath(prevPost, nos))}>‹ PREV</button> : <span />}
          {nextPost && <button className="btn btn-dark" onClick={() => router.push(backupPath(nextPost, nos))}>NEXT ›</button>}
        </div>
      )}

      {lbOpen && (p.type === 'single' || p.type === 'vlist') && p.images.length > 0 && (
        <Lightbox srcs={p.images} index={cur} onClose={() => setLbOpen(false)} />
      )}

      <ConfirmModal open={delAsk} title="게시물을 삭제하시겠습니까?" body="삭제한 게시물은 복구할 수 없습니다."
        onClose={() => setDelAsk(false)}
        buttons={[
          { label: 'DELETE', kind: 'accent', onClick: () => { setPosts(freezeBackupNos(posts).filter(x => x.id !== p.id)); router.push(tt.href); } },
          { label: 'CANCEL', kind: 'ghost', onClick: () => setDelAsk(false) },
        ]} />
    </section>
  );
}
