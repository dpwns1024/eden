'use client';
/**
 * 프롬프트 (v2.0 사용자 요청) — 프롬프트를 적어 두고 버튼 한 번으로 복사, 사진(결과물)도 함께.
 *
 * 저장은 메모 목록(memos 컬렉션)에 `kind: 'prompt'`로 — 메모 게시판(/memo2)과 같은 방식이라 보안 규칙을
 * 다시 붙여넣지 않아도 된다. 스티커 메모(/memo)·메모 게시판은 kind로 걸러 보고, 저장할 땐 서로의 항목을
 * 그대로 둔다. 공개범위·비밀번호는 이 메뉴(/prompt)의 설정을 따른다 (lib/visFloor.ts).
 *
 * 리스트: 왼쪽에 세로 사진 크게(여러 장이면 아래 작은 사진으로 바꿔 보기) · 오른쪽에 제목 · 프롬프트 전문 · COPY (v2.0 사용자 요청).
 * 관리자는 ⠿ 손잡이를 끌어 순서를 바꾼다(검색 중에는 끔).
 * 사진은 올릴 때 메타데이터를 지운 사본으로 저장된다(putBlob → lib/imageClean.ts) — 프롬프트는 글로 따로 적는다.
 */
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useLocalList, newId } from '@/lib/postStore';
import { MEMO_SEED } from '@/lib/memoStore';
import { useBlobUrl, putBlob } from '@/lib/blobStore';
import { Modal, useConfirmDelete } from '@/components/ui/Modal';
import { KInput, Pager } from '@/components/ui/Kit';
import { DragList } from '@/components/ui/DragList';
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
const PER = 10;
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

/** 한 줄 — 왼쪽 세로 사진(여러 장이면 아래 작은 사진으로 바꿔 보기) · 오른쪽 제목 · 프롬프트 · COPY */
function PromptRow({ p, drag, canEdit, onCopy, onEdit, onDel }: {
  p: PromptItem; drag: boolean; canEdit: boolean;
  onCopy: () => void; onEdit: () => void; onDel: () => void;
}) {
  const imgs = p.images ?? [];
  const [cur, setCur] = useState(0);
  const at = Math.min(cur, Math.max(0, imgs.length - 1));
  return (
    <article className={`panel pr-row${imgs.length ? '' : ' no-img'}`}>
      {imgs.length > 0 && (
        <div className="pr-media">
          <span className="pr-main"><Img src={imgs[at]} /></span>
          {imgs.length > 1 && (
            <span className="pr-strip">
              {imgs.map((src, i) => (
                <button key={i} type="button" className={i === at ? 'on' : ''} onClick={() => setCur(i)} aria-label={`사진 ${i + 1}`}><Img src={src} /></button>
              ))}
            </span>
          )}
        </div>
      )}
      <div className="pr-body">
        <div className="pr-head">
          {drag && <span className="drag-h pr-drag" title="끌어서 순서 바꾸기">⠿</span>}
          {p.title ? <b className="pr-title">{p.title}</b> : <span className="pr-title pr-untitled">UNTITLED</span>}
          <span className="pr-dt">{fmt(p.date)}</span>
        </div>
        <div className="pr-text">{p.prompt}</div>
        <div className="pr-foot">
          {canEdit && <button type="button" className="pr-mini" onClick={onEdit}>EDIT</button>}
          {canEdit && <button type="button" className="pr-mini" onClick={onDel}>DEL</button>}
          <button type="button" className="pr-copy" onClick={onCopy}>COPY</button>
        </div>
      </div>
    </article>
  );
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
  // 순서 바꾸기 — 관리자, 검색 중이 아닐 때 (걸러 낸 목록에서 바꾸면 전체 순서가 어긋난다)
  const canSort = isAdmin && !ql;


  // 쓰기 창
  const [editId, setEditId] = useState<string | null>(null);   // 'new' = 새 프롬프트
  const [fTitle, setFTitle] = useState('');
  const [fPrompt, setFPrompt] = useState('');
  const [fImgs, setFImgs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const openNew = () => { setEditId('new'); setFTitle(''); setFPrompt(''); setFImgs([]); };
  const openEdit = (p: PromptItem) => { setEditId(p.id); setFTitle(p.title); setFPrompt(p.prompt); setFImgs(p.images ?? []); };
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
          <div className="pr-list">
            <DragList items={pageItems} keyOf={p => p.id} disabled={!canSort}
              onReorder={next => {
                // 이 쪽의 순서만 바꿔 전체 목록에 다시 끼운다
                const start = (pg - 1) * PER;
                setItems([...items.slice(0, start), ...next, ...items.slice(start + next.length)]);
              }}
              render={p => (
                <PromptRow p={p} drag={canSort} canEdit={canEdit(p)} onCopy={() => copy(p.prompt)} onEdit={() => openEdit(p)}
                  onDel={() => del.ask('이 프롬프트를 삭제하시겠습니까?', () => setItems(items.filter(x => x.id !== p.id)))} />
              )} />
          </div>
          <Pager page={pg} total={pages} block={8} onChange={setPage} />
        </>
      ) : (
        <div className="panel" style={{ textAlign: 'center', padding: 44, fontSize: 13, color: 'var(--faint)' }}>
          {ql ? `「${q.trim()}」 — 찾은 프롬프트가 없습니다` : '등록된 프롬프트가 없습니다'}
        </div>
      )}

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
