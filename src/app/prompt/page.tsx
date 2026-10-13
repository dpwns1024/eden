'use client';
/**
 * 프롬프트 (v2.0 사용자 요청) — 프롬프트를 적어 두고 버튼 한 번으로 복사, 사진(결과물)도 함께.
 *
 * 저장은 메모 목록(memos 컬렉션)에 `kind: 'prompt'`로 — 메모 게시판(/memo2)과 같은 방식이라 보안 규칙을
 * 다시 붙여넣지 않아도 된다. 스티커 메모(/memo)·메모 게시판은 kind로 걸러 보고, 저장할 땐 서로의 항목을
 * 그대로 둔다. 공개범위·비밀번호는 이 메뉴(/prompt)의 설정을 따른다 (lib/visFloor.ts).
 *
 * 카드: 사진 · 제목 · 프롬프트 미리보기 · COPY. 카드를 누르면 전문과 사진 전부를 큰 창에서 본다.
 * 사진은 올릴 때 메타데이터를 지운 사본으로 저장된다(putBlob → lib/imageClean.ts) — 프롬프트는 글로 따로 적는다.
 */
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useLocalList, newId } from '@/lib/postStore';
import { MEMO_SEED } from '@/lib/memoStore';
import { useBlobUrl, putBlob } from '@/lib/blobStore';
import { Modal, useConfirmDelete } from '@/components/ui/Modal';
import { KInput, Pager } from '@/components/ui/Kit';
import { PageTitle, EditableDesc } from '@/components/ui/PageText';
import { useToast } from '@/components/ui/Toast';

export interface PromptItem {
  id: string;
  kind: 'prompt';
  title: string;
  prompt: string;
  images: string[];     // 저장소 참조(공개 URL 또는 파일 id)
  date: string;         // YYYY-MM-DD
  authorId?: string;
}
type AnyMemo = { id: string; kind?: string; [k: string]: unknown };
const isPrompt = (m: AnyMemo): m is AnyMemo & PromptItem => m.kind === 'prompt';

const MAX_IMG = 6;
const PER = 12;
const fmt = (d: string) => (d || '').slice(0, 10).replace(/-/g, '.');
const today = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};

function Img({ src, className }: { src?: string; className?: string }) {
  const url = useBlobUrl(src);
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt="" className={className} draggable={false} /> : <div className={`pr-ph ${className ?? ''}`} />;
}

export default function PromptPage() {
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const del = useConfirmDelete();
  const [all, setAll, loaded] = useLocalList<AnyMemo>('ohome.memo.v1', MEMO_SEED as unknown as AnyMemo[]);
  const items = all.filter(isPrompt) as PromptItem[];
  // 스티커 메모·메모 게시판 항목은 그대로 두고 프롬프트만 바꾼다
  const setItems = (next: PromptItem[]) => setAll([...(next as unknown as AnyMemo[]), ...all.filter(m => !isPrompt(m))]);
  const canEdit = (p: PromptItem) => isAdmin || (!!user && p.authorId === user.id);

  const [q, setQ] = useState('');
  const ql = q.trim().toLowerCase();
  const shown = items.filter(p => !ql || p.title.toLowerCase().includes(ql) || p.prompt.toLowerCase().includes(ql));
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [ql]);
  const pages = Math.max(1, Math.ceil(shown.length / PER));
  const pg = Math.min(page, pages);
  const pageItems = shown.slice((pg - 1) * PER, pg * PER);

  const [viewId, setViewId] = useState<string | null>(null);
  const view = items.find(p => p.id === viewId) ?? null;

  // 쓰기 창
  const [editId, setEditId] = useState<string | null>(null);   // 'new' = 새 프롬프트
  const [fTitle, setFTitle] = useState('');
  const [fPrompt, setFPrompt] = useState('');
  const [fImgs, setFImgs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const openNew = () => { setEditId('new'); setFTitle(''); setFPrompt(''); setFImgs([]); };
  const openEdit = (p: PromptItem) => { setViewId(null); setEditId(p.id); setFTitle(p.title); setFPrompt(p.prompt); setFImgs(p.images ?? []); };
  const close = () => setEditId(null);
  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_IMG - fImgs.length;
    if (room <= 0) { toast(`사진은 ${MAX_IMG}장까지 넣을 수 있습니다`); return; }
    setBusy(true);
    try {
      const refs: string[] = [];
      for (const f of Array.from(files).slice(0, room)) refs.push(await putBlob(f));
      setFImgs(cur => [...cur, ...refs]);
    } catch (e) {
      toast(`사진을 올리지 못했습니다 — ${e instanceof Error ? e.message : ''}`);
    }
    setBusy(false);
  };
  const save = () => {
    const prompt = fPrompt.trim();
    if (!prompt) { toast('프롬프트를 입력해 주세요'); return; }
    const title = fTitle.trim();
    if (editId === 'new') {
      setItems([{ id: newId(), kind: 'prompt', title, prompt, images: fImgs, date: today(), authorId: user?.id }, ...items]);
    } else {
      setItems(items.map(p => (p.id === editId ? { ...p, title, prompt, images: fImgs } : p)));
    }
    close();
    toast('저장했습니다');
  };

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => toast('프롬프트를 복사했습니다'), () => toast('복사하지 못했습니다'));
  };

  if (!loaded) return <section className="page page-arch page-prompt" />;

  return (
    <section className="page page-arch page-prompt">
      <div className="page-head">
        <PageTitle>PROMPT</PageTitle>
        <EditableDesc k="prompt-desc" def="프롬프트 보관함 — 누르면 바로 복사" />
      </div>

      <div className="toolrow pr-tool">
        <div className="pr-left">
          <span className="pr-count">TOTAL {shown.length}</span>
          <label className="pr-search">
            <span aria-hidden="true">⌕</span>
            <input type="search" value={q} placeholder="제목 · 프롬프트 검색" onChange={e => setQ(e.target.value)} />
            {q && <button type="button" aria-label="지우기" onClick={() => setQ('')}>✕</button>}
          </label>
        </div>
        {user && <button className="btn btn-dark" onClick={openNew}>＋ NEW PROMPT</button>}
      </div>

      {pageItems.length > 0 ? (
        <>
          <div className="pr-grid">
            {pageItems.map(p => (
              <article key={p.id} className="panel pr-card">
                <button type="button" className="pr-open" onClick={() => setViewId(p.id)} aria-label="크게 보기">
                  {p.images?.length > 0 && (
                    <span className="pr-thumb">
                      <Img src={p.images[0]} />
                      {p.images.length > 1 && <em>+{p.images.length - 1}</em>}
                    </span>
                  )}
                  {p.title && <b className="pr-title">{p.title}</b>}
                  <span className="pr-text">{p.prompt}</span>
                </button>
                <div className="pr-foot">
                  <span className="pr-dt">{fmt(p.date)}</span>
                  <button type="button" className="pr-copy" onClick={() => copy(p.prompt)}>COPY</button>
                </div>
              </article>
            ))}
          </div>
          <Pager page={pg} total={pages} block={8} onChange={setPage} />
        </>
      ) : (
        <div className="panel" style={{ textAlign: 'center', padding: 44, fontSize: 13, color: 'var(--faint)' }}>
          {ql ? `「${q.trim()}」 — 찾은 프롬프트가 없습니다` : '등록된 프롬프트가 없습니다'}
        </div>
      )}

      {/* 크게 보기 — 사진 전부 + 프롬프트 전문 + COPY */}
      <Modal open={!!view} onClose={() => setViewId(null)} className="pr-modal" title={view?.title || 'PROMPT'}
        actions={view ? <>
          {canEdit(view) && <button className="btn btn-ghost" onClick={() => openEdit(view)}>EDIT</button>}
          {canEdit(view) && (
            <button className="btn btn-ghost" onClick={() => del.ask('이 프롬프트를 삭제하시겠습니까?', () => {
              setItems(items.filter(x => x.id !== view.id)); setViewId(null);
            })}>DEL</button>
          )}
          <button className="btn btn-dark" onClick={() => copy(view.prompt)}>COPY</button>
        </> : undefined}>
        {view && (
          <div className="pr-view">
            {view.images?.length > 0 && (
              <div className={`pr-imgs n${Math.min(view.images.length, 3)}`}>
                {view.images.map((src, i) => <Img key={i} src={src} />)}
              </div>
            )}
            <div className="pr-full">{view.prompt}</div>
            <span className="pr-dt">{fmt(view.date)}</span>
          </div>
        )}
      </Modal>

      {/* 쓰기 창 */}
      <Modal open={editId !== null} onClose={close} small className="pr-modal pr-edit" dirty={!!fPrompt.trim() || fImgs.length > 0}
        title={editId === 'new' ? 'NEW PROMPT' : 'EDIT PROMPT'}
        actions={<>
          <button className="btn btn-ghost" onClick={close}>CANCEL</button>
          <button className="btn btn-dark" disabled={busy} onClick={save}>{busy ? '사진 올리는 중…' : 'SAVE'}</button>
        </>}>
        <div className="pr-form">
          <KInput placeholder="제목 (선택)" value={fTitle} onChange={e => setFTitle(e.target.value)} />
          <div className="pr-up">
            {fImgs.map((src, i) => (
              <span key={src + i} className="pr-upimg">
                <Img src={src} />
                <button type="button" aria-label="사진 빼기" onClick={() => setFImgs(cur => cur.filter((_, j) => j !== i))}>✕</button>
              </span>
            ))}
            {fImgs.length < MAX_IMG && (
              <label className="pr-add">
                <span>＋</span><small>사진</small>
                <input type="file" accept="image/*" multiple hidden onChange={e => { void addFiles(e.target.files); e.target.value = ''; }} />
              </label>
            )}
          </div>
          <textarea className="k-textarea pr-input" placeholder="프롬프트를 입력하세요" value={fPrompt} onChange={e => setFPrompt(e.target.value)} />
        </div>
      </Modal>
      {del.element}
    </section>
  );
}
