'use client';
// 게시판 글쓰기/수정 (4.2 / 5.2 다중 게시판) — MD/HTML 모드 선택 + 실시간 미리보기 + 접기/비밀글/공지 설정
// ?edit=<글 id> 로 진입하면 수정 모드 (작성자·관리자만)
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLocalList, BOARD_SEED, Post, newId, FoldType } from '@/lib/postStore';
import { useBoards, boardHref, MAIN_BOARD_ID } from '@/lib/boardStore';
import { renderBody } from '@/lib/sanitize';
import { KInput, KTextarea, KSelect, KCheck } from '@/components/ui/Kit';
import { CropEditor, CropImg, CropValue } from '@/components/ui/CropEditor';
import { RichEditor } from '@/components/ui/RichEditor';
import { liftInlineImages } from '@/lib/blobStore';
import { useToast } from '@/components/ui/Toast';
import { PageTitle, EditableDesc } from '@/components/ui/PageText';
import { usePairings, pairIdOf, pairOptions, NO_PAIR } from '@/lib/pairLink';
import { useBoardCats, useCatMode, catIdOf, catOptions, NO_CAT } from '@/lib/boardCats';

function WriteInner() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const params = useSearchParams();
  const editPid = params.get('edit');
  const [posts, setPosts, postsLoaded] = useLocalList<Post>('ohome.board.v1', BOARD_SEED);
  const editing = editPid ? posts.find(p => p.id === editPid) : undefined;
  const bid = editing?.boardId ?? params.get('b') ?? MAIN_BOARD_ID;
  const { boards } = useBoards();
  const board = boards.find(b => b.id === bid) ?? boards[0];
  const [title, setTitle] = useState('');
  const [writeMode, setWriteMode] = useState<'editor' | 'md' | 'html'>('editor'); // 에디터가 기본
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);   // 본문 속 사진을 올리는 중
  // 페어링 (v2.0 사용자 요청 — 게시판마다 만들던 말머리 대신 PAIRING 게시판의 페어를 고른다).
  // 고르기 전에는 고치는 글의 페어링(예전 글은 말머리 글자가 페어링 이름과 같으면 그 페어링)
  const rels = usePairings();
  const [pickedRel, setRelId] = useState<string>();
  const relId = pickedRel ?? (editing && pairIdOf(editing, rels)) ?? NO_PAIR;
  const relOut = relId === NO_PAIR ? undefined : relId;
  // EVEDEN 말머리 (v2.0 사용자 요청 — 모든 게시판 공통 · lib/boardCats.ts) — EVEDEN 세계에서만 고르고, 아니면 원래 값 유지
  const catMode = useCatMode();
  const cats = useBoardCats();
  const [pickedCat, setCatId] = useState<string>();
  const catId = pickedCat ?? (editing && catIdOf(editing, cats)) ?? NO_CAT;
  const catOut = catId === NO_CAT ? undefined : catId;
  const [secret, setSecret] = useState(false);
  const [notice, setNotice] = useState(false);
  // 태그 (v2.0 사용자 요청) — 쉼표로 구분해 입력, 저장할 때 배열로
  const [tagsText, setTagsText] = useState('');
  const parseTags = (s: string) =>
    [...new Set(s.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean))];
  const [foldType, setFoldType] = useState<FoldType | 'none'>('none');
  const [foldLabel, setFoldLabel] = useState('');
  // 티켓 스킨 대표 이미지 (v1.9) — 본문에 삽입한 이미지 중 선택 + 16:9 썸네일 크롭
  const [thumbSrc, setThumbSrc] = useState<string | undefined>(undefined);
  const [thumbCrop, setThumbCrop] = useState<CropValue | undefined>(undefined);
  const [cropOpen, setCropOpen] = useState(false);
  // 본문 이미지 목록 — HTML <img> + Markdown 이미지
  const bodyImages = useMemo(() => {
    const out: string[] = [];
    for (const m of body.matchAll(/<img[^>]*src=["']([^"']+)["']/gi)) out.push(m[1]);
    for (const m of body.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)) out.push(m[1]);
    return [...new Set(out)];
  }, [body]);
  // 대표로 지정한 이미지가 본문에서 삭제되면 해제
  useEffect(() => {
    if (thumbSrc && !bodyImages.includes(thumbSrc)) { setThumbSrc(undefined); setThumbCrop(undefined); }
  }, [bodyImages, thumbSrc]);

  // 수정 모드 — 저장본 로드가 끝나면 폼을 한 번 채움 (본문은 저장 모드 그대로: md→Markdown, html→HTML)
  const hydrated = useRef(false);
  useEffect(() => {
    if (!editPid || !postsLoaded || hydrated.current) return;
    const p = posts.find(x => x.id === editPid);
    if (!p) return;
    hydrated.current = true;
    setTitle(p.title); setBody(p.body);
    // 에디터로 쓴 글은 에디터로 다시 연다 — 예전에는 무조건 HTML 소스가 떠서
    // 에디터로 쓴 글을 수정하면 갑자기 태그가 보였다 (authored 없는 옛 글은 지금까지대로 HTML)
    setWriteMode(p.mode === 'md' ? 'md' : (p.authored === 'editor' ? 'editor' : 'html'));
    setSecret(p.secret); setNotice(p.notice);
    setFoldType(p.fold?.type ?? 'none'); setFoldLabel(p.fold?.label ?? '');
    setTagsText((p.tags ?? []).join(', '));
    setThumbSrc(p.thumbSrc); setThumbCrop(p.thumbCrop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editPid, postsLoaded, posts]);

  const preview = useMemo(() => renderBody(writeMode === 'md' ? 'md' : 'html', body), [writeMode, body]);

  if (!user) {
    return (
      <section className="page page-arch page-rel-edit page-board-write">
        <div className="page-head"><PageTitle>WRITE</PageTitle><p>글쓰기는 로그인 후 이용할 수 있습니다</p></div>
      </section>
    );
  }

  const post = async () => {
    if (!title.trim() || !body.trim()) { toast('제목과 내용을 입력해 주세요'); return; }
    if (saving) return;
    // 복사해 온 HTML에 글자로 박힌 사진은 파일로 올리고 주소로 바꾼다 — 그대로 두면 글 하나가
    // 문서 한도(1MB)를 넘어 저장이 거부된다 (사용자 제보: 로그 HTML 2.5MB 중 사진 한 장이 2.4MB)
    let body2 = body;
    try {
      setSaving(true);
      body2 = await liftInlineImages(body);
    } catch (e) {
      toast(`본문 속 사진을 올리지 못했습니다 — ${e instanceof Error ? e.message : ''}`);
      setSaving(false);
      return;
    }
    setSaving(false);
    if (new TextEncoder().encode(body2).length > 900_000) {
      toast('본문이 너무 큽니다(약 900KB 초과) — 글을 나누거나 줄여 주세요');
      return;
    }
    if (editing) {
      // 수정 — 작성자 본인만 (관리자도 타인 글은 삭제만, v1.9). 작성자/날짜/댓글/소속 게시판은 유지
      if (editing.authorId !== user.id) { toast('수정은 작성자 본인만 할 수 있습니다'); return; }
      setPosts(posts.map(p => (p.id === editing.id ? {
        ...p,
        title: title.trim(), body: body2,
        mode: writeMode === 'md' ? 'md' : 'html',
        authored: writeMode === 'editor' ? 'editor' : undefined,
        category: '', relId: relOut, catId: catOut,
        secret, notice: isAdmin ? notice : p.notice,
        tags: parseTags(tagsText),
        fold: foldType === 'none' ? null : { type: foldType, label: foldType === 'custom' ? foldLabel : undefined },
        thumbSrc, thumbCrop,
      } : p)));
      toast('수정되었습니다');
      router.push(`/board/${editing.id}`);
      return;
    }
    const p: Post = {
      id: newId(), title: title.trim(), body: body2,
      mode: writeMode === 'md' ? 'md' : 'html', category: '', relId: relOut, catId: catOut,
      author: user.nickname, authorId: user.id, date: new Date().toISOString(),
      secret, notice: isAdmin && notice,
      tags: parseTags(tagsText),
      fold: foldType === 'none' ? null : { type: foldType, label: foldType === 'custom' ? foldLabel : undefined },
      comments: [],
      boardId: board.id,   // 소속 게시판 (5.2 다중 게시판)
      thumbSrc, thumbCrop,
    };
    setPosts([p, ...posts]);
    toast('등록되었습니다');
    router.push(`/board/${p.id}`);
  };

  return (
    <section className="page page-arch page-rel-edit page-board-write">
      {/* 큰 글씨 — 추가 게시판이면 그 이름(메뉴 관리 타이틀·이름이 우선), 누르면 그 게시판으로 복귀
          (v2.0 사용자 제보 — 「글쓰기에서 큰제목을 눌러도 안 돌아가고, 제목도 원래 것이 뜬다」) */}
      <div className="page-head"><PageTitle href={boardHref(board.id)}>{board.id === MAIN_BOARD_ID ? (editing ? 'EDIT' : 'WRITE') : board.name}</PageTitle><EditableDesc k="board-write-desc" def="에디터 / Markdown / HTML — 스크립트는 저장 시 자동 제거" /></div>
      <div className="write-grid">
        {/* 좌: 본문 */}
        <div className="panel" style={{ padding: 24 }}>
          <div className="form-row">
            <label className="k-label" style={{ width: 60 }}>제목</label>
            <KInput value={title} onChange={e => setTitle(e.target.value)} style={{ flex: 1 }} />
          </div>
          <div className="form-row">
            <label className="k-label" style={{ width: 60 }}>모드</label>
            <div className="mini-seg">
              <button className={writeMode === 'editor' ? 'on' : ''} onClick={() => setWriteMode('editor')}>에디터</button>
              <button className={writeMode === 'md' ? 'on' : ''} onClick={() => setWriteMode('md')}>Markdown</button>
              <button className={writeMode === 'html' ? 'on' : ''} onClick={() => setWriteMode('html')}>HTML</button>
            </div>
          </div>
          {writeMode === 'editor' ? (
            <RichEditor value={body} onChange={setBody} placeholder='내용을 작성하세요 — 이미지 삽입 가능 (스크립트 불허 6.3)' />
          ) : (
            <>
              <KTextarea
                style={{ minHeight: 220, fontFamily: writeMode === 'html' ? 'ui-monospace, Consolas, monospace' : undefined }}
                placeholder={writeMode === 'md' ? '마크다운으로 작성...' : '<div>HTML 코드를 작성/붙여넣기...</div>'}
                value={body} onChange={e => setBody(e.target.value)}
              />
              <div className="preview-box" style={{ marginTop: 14 }}>
                <div className="pv-label">PREVIEW — 실시간 미리보기</div>
                <div className="post-body" dangerouslySetInnerHTML={{ __html: preview }} />
              </div>
            </>
          )}
          {/* 티켓 스킨 대표 이미지 — 본문에 삽입한 이미지 리스트에서 선택, 클릭 시 16:9 썸네일 위치 지정 (v1.9) */}
          {board.skin === 'ticket' && bodyImages.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <label className="k-label" style={{ marginBottom: 7 }}>대표 이미지 (티켓 썸네일)</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {bodyImages.map(src => (
                  <div key={src}
                    data-tip={thumbSrc === src ? '썸네일 위치 조정' : '대표로 선택'}
                    onClick={() => { if (thumbSrc !== src) { setThumbSrc(src); setThumbCrop(undefined); } setCropOpen(true); }}
                    style={{
                      width: 104, aspectRatio: '16/9', borderRadius: 8, overflow: 'hidden', cursor: 'var(--cur-pointer,pointer)',
                      position: 'relative', flexShrink: 0,
                      outline: thumbSrc === src ? '2px solid var(--accent)' : '1px solid var(--line)', outlineOffset: 2,
                    }}>
                    <CropImg src={src} crop={thumbSrc === src ? thumbCrop : undefined} />
                    {thumbSrc === src && (
                      <span style={{
                        position: 'absolute', right: 4, top: 4, fontSize: 9, fontWeight: 700, letterSpacing: '.08em',
                        background: 'var(--accent)', color: '#fff', padding: '2px 6px', borderRadius: 999,
                      }}>대표</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* 우: 설정 */}
        <div>
          <div className="panel widget" style={{ marginBottom: 14 }}>
            <h4>설정</h4>
            <div className="form-row">
              <label className="k-label" style={{ width: 60 }}>페어링</label>
              <KSelect minWidth={130} value={relId} onChange={setRelId} options={pairOptions(rels)} />
            </div>
            {catMode && (
              <div className="form-row">
                <label className="k-label" style={{ width: 60 }}>말머리</label>
                <KSelect minWidth={130} value={catId} onChange={setCatId} options={catOptions(cats)} />
              </div>
            )}
            {/* 태그 (v2.0 사용자 요청) — 목록의 작성자 왼쪽에 나열되고 검색에 걸린다 */}
            <div className="form-row">
              <label className="k-label" style={{ width: 60 }}>태그</label>
              <KInput value={tagsText} onChange={e => setTagsText(e.target.value)}
                placeholder="쉼표로 구분" style={{ flex: 1 }} />
            </div>
            <div style={{ display: 'grid', gap: 9 }}>
              <KCheck label="비밀글 (관리자와 나만 열람)" checked={secret} onChange={setSecret} />
              {isAdmin && <KCheck label="공지로 고정" checked={notice} onChange={setNotice} />}
            </div>
          </div>
          <div className="panel widget" style={{ marginBottom: 14 }}>
            <h4>접기 (6.2)</h4>
            <div style={{ display: 'grid', gap: 9 }}>
              <KCheck label="스포일러 접기" checked={foldType === 'spoiler'}
                onChange={v => setFoldType(v ? 'spoiler' : 'none')} />
              <KCheck label="수위 주의 접기" checked={foldType === 'adult'}
                onChange={v => setFoldType(v ? 'adult' : 'none')} />
              <KCheck label="직접 입력 문구" checked={foldType === 'custom'}
                onChange={v => setFoldType(v ? 'custom' : 'none')} />
              {foldType === 'custom' && (
                <KInput placeholder="접기 문구" value={foldLabel} onChange={e => setFoldLabel(e.target.value)} />
              )}
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-onbk"
              onClick={() => router.push(editing ? `/board/${editing.id}` : boardHref(board.id))}>CANCEL</button>
            <button className="btn btn-accent" onClick={post} disabled={saving}>{saving ? '사진 올리는 중…' : editing ? 'SAVE' : 'POST'}</button>
          </div>
        </div>
      </div>

      {/* 대표 썸네일 위치 지정 — 16:9 (티켓 스킨) */}
      {cropOpen && thumbSrc && (
        <CropEditor open src={thumbSrc} aspect="16:9" initial={thumbCrop}
          onClose={() => setCropOpen(false)}
          onApply={c => { setThumbCrop(c); setCropOpen(false); }} />
      )}
    </section>
  );
}

export default function BoardWritePage() {
  // useSearchParams는 Suspense 경계 필요 (Next App Router)
  return <Suspense fallback={<section className="page" />}><WriteInner /></Suspense>;
}
