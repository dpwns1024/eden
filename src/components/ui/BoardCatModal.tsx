'use client';
// EVEDEN 게시판 카테고리 관리 창 (관리자) — 이름 고치기 · 추가 · 삭제 · 순서(▲). 프롬프트 CATEGORY 창과 같은 모양
import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { KInput } from '@/components/ui/Kit';
import { useToast } from '@/components/ui/Toast';
import { newId } from '@/lib/postStore';
import { BoardCat, CatBoard, useBoardCats } from '@/lib/boardCats';

export function BoardCatModal({ board, open, onClose }: { board: CatBoard; open: boolean; onClose: () => void }) {
  const [cats, saveCats] = useBoardCats(board);
  const toast = useToast();
  const [draft, setDraft] = useState<BoardCat[]>([]);
  useEffect(() => { if (open) setDraft(cats.map(c => ({ ...c }))); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = () => {
    saveCats(draft.map(c => ({ ...c, name: c.name.trim() })).filter(c => c.name));
    onClose();
    toast('카테고리를 저장했습니다');
  };
  return (
    <Modal open={open} onClose={onClose} small className="pr-modal" title="CATEGORY"
      desc="카테고리를 지우면 그 글은 「ETC」로 옮겨집니다 — 글 수정에서 다른 카테고리를 고르세요"
      actions={<>
        <button className="btn btn-ghost" onClick={onClose}>CANCEL</button>
        <button className="btn btn-dark" onClick={save}>SAVE</button>
      </>}>
      <div className="pr-form">
        {draft.map((c, i) => (
          <div key={c.id} className="pr-catrow">
            <KInput placeholder="카테고리 이름" value={c.name} onChange={e => setDraft(d => d.map(x => (x.id === c.id ? { ...x, name: e.target.value } : x)))} />
            <button type="button" className="btn btn-ghost" disabled={i === 0} aria-label="위로"
              onClick={() => setDraft(d => { const n = [...d]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; })}>▲</button>
            <button type="button" className="btn btn-ghost" aria-label="삭제" onClick={() => setDraft(d => d.filter(x => x.id !== c.id))}>✕</button>
          </div>
        ))}
        <button type="button" className="btn btn-ghost" onClick={() => setDraft(d => [...d, { id: newId(), name: '' }])}>＋ 카테고리 추가</button>
      </div>
    </Modal>
  );
}
