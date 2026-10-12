'use client';
/**
 * 메모 게시판 (백업 > MEMO) — v2.0 재정비.
 *
 * 예전엔 메모를 브라우저(localStorage)에만 저장해서 PC와 모바일 내용이 따로 놀았다.
 * 이제 서버의 메모 목록(memos 컬렉션)에 `kind: 'note'`로 함께 저장한다 — 스티커 메모(/memo)와 같은
 * 목록이라 그쪽은 note를 걸러 보고, 공개범위는 이 메뉴(/memo2)의 설정을 따른다(lib/visFloor.ts).
 * 이 기기에만 남아 있던 옛 메모는 처음 열 때 서버로 옮긴다.
 *
 * 접기/펴기: 글자 수로 짐작하지 않고 실제로 칸을 넘치는지 재서, 넘칠 때만 MORE 버튼을 단다.
 * 카드는 줄마다 높이를 맞추지 않으므로(align-items:start) 하나를 펴도 옆 카드는 그대로다.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useLocalList, newId } from '@/lib/postStore';
import { MEMO_SEED } from '@/lib/memoStore';
import { Modal, useConfirmDelete } from '@/components/ui/Modal';
import { KTextarea } from '@/components/ui/Kit';
import { PageTitle, EditableDesc } from '@/components/ui/PageText';
import { useToast } from '@/components/ui/Toast';
import { useBoardSkin } from '@/lib/boardSkin';

export interface MemoNote {
  id: string;
  kind: 'note';
  category: string;
  content: string;
  date: string;          // YYYY-MM-DD (옛 메모는 YYYY.MM.DD)
  authorId?: string;
}
type AnyMemo = { id: string; kind?: string; [k: string]: unknown };

const CATS = ['OOC', '프롬', '기타'];
const isNote = (m: AnyMemo): m is AnyMemo & MemoNote => m.kind === 'note';

/** 이 기기(localStorage)에 남아 있던 옛 메모 저장소 이름들 — 서버로 옮긴 뒤 지운다 */
const LEGACY_KEYS = ['ohome_memos_final', 'ohome_grid_memos_v6', 'ohome_grid_memos_v5', 'ohome_grid_memos_v4',
  'ohome_grid_memos_v3', 'ohome_grid_memos_v2', 'ohome_grid_memos', 'ohome_memos'];
const legacyCat = (c: unknown) => {
  const s = typeof c === 'string' ? c : '';
  if (CATS.includes(s)) return s;
  if (s === '공지' || s === 'ORIGINAL') return 'OOC';
  if (s === '설정') return '프롬';
  return '기타';
};
const fmt = (d: string) => (d || '').slice(0, 10).replace(/-/g, '.');
const today = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};

function NoteCard({ n, canEdit, onEdit, onDel }: {
  n: MemoNote; canEdit: boolean; onEdit: () => void; onDel: () => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [long, setLong] = useState(false);
  // 접힌 상태에서 실제로 넘치는지 잰다 (폭이 바뀌면 다시)
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el || open) return;
    const check = () => setLong(el.scrollHeight > el.clientHeight + 2);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [n.content, open]);

  return (
    <div className={`mn-card${open ? ' open' : ''}${long && !open ? ' clip' : ''}`}>
      <span className="mn-cat">{n.category}</span>
      <div className="mn-body" ref={bodyRef}>{n.content}</div>
      {long && (
        <button type="button" className="mn-more" onClick={() => setOpen(o => !o)}>{open ? 'LESS ▴' : 'MORE ▾'}</button>
      )}
      <div className="mn-foot">
        <span>{fmt(n.date)}</span>
        {canEdit && (
          <span className="mn-act">
            <button type="button" onClick={onEdit}>EDIT</button>
            <button type="button" onClick={onDel}>DEL</button>
          </span>
        )}
      </div>
    </div>
  );
}

export default function MemoBoardPage() {
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const del = useConfirmDelete();
  const arch = useBoardSkin() === 'arch';
  const [all, setAll, loaded] = useLocalList<AnyMemo>('ohome.memo.v1', MEMO_SEED as unknown as AnyMemo[]);
  const notes = all.filter(isNote) as MemoNote[];
  // 스티커 메모(/memo)는 그대로 두고 note만 바꾼다
  const setNotes = (next: MemoNote[]) => setAll([...(next as unknown as AnyMemo[]), ...all.filter(m => !isNote(m))]);

  const [cat, setCat] = useState('ALL');
  const [editId, setEditId] = useState<string | null>(null);   // 'new' = 새 메모
  const [fCat, setFCat] = useState('OOC');
  const [fText, setFText] = useState('');

  /* 이 기기에만 있던 옛 메모 → 서버로. 서버에 같은 id가 있으면 건너뛴다.
     ⚠ 이 기기 사본(localStorage)은 **지우지 않는다** (v2.0 사용자 제보 — PC 메모가 사라짐).
     예전엔 「서버에 없는 메모가 0개」면 사본을 지웠는데, id가 글자가 아닌(숫자 등) 옛 메모는 아예 세지 않아서
     하나도 옮기지 않고 사본만 지울 수 있었다. 사본은 작아서 남겨 둬도 되고, 다음에 열 때 다시 대조할 뿐이다. */
  const migrated = useRef(false);
  useEffect(() => {
    if (!loaded || !user || migrated.current) return;
    migrated.current = true;
    const have = new Set(notes.map(n => n.id));
    const found: MemoNote[] = [];
    for (const k of LEGACY_KEYS) {
      try {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) continue;
        arr.forEach((m: Record<string, unknown> | null, i: number) => {
          if (!m || typeof m !== 'object') return;
          const content = String(m.content ?? m.text ?? '').trim();
          if (!content) return;
          // id가 없거나 숫자여도 옮긴다 — 없으면 저장소 이름·순서로 늘 같은 id를 만들어 두 번 올라가지 않게
          const id = m.id != null && String(m.id) ? String(m.id) : `legacy-${k}-${i}`;
          if (have.has(id)) return;
          have.add(id);
          const d = typeof m.date === 'string' ? m.date.replace(/\./g, '-')
            : typeof m.date === 'number' ? new Date(m.date).toISOString().slice(0, 10) : today();
          found.push({ id, kind: 'note', category: legacyCat(m.category), content, date: d, authorId: user.id });
        });
      } catch { /* 무시 */ }
    }
    if (found.length) {
      setNotes([...found, ...notes]);
      toast(`이 기기에 있던 메모 ${found.length}개를 서버로 옮겼습니다 — 이제 PC·모바일 어디서나 보입니다`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, user]);

  const canEdit = (n: MemoNote) => isAdmin || (!!user && n.authorId === user.id);
  const shown = notes.filter(n => cat === 'ALL' || n.category === cat);

  const openNew = () => { setEditId('new'); setFCat(cat !== 'ALL' ? cat : 'OOC'); setFText(''); };
  const openEdit = (n: MemoNote) => { setEditId(n.id); setFCat(CATS.includes(n.category) ? n.category : '기타'); setFText(n.content); };
  const close = () => { setEditId(null); setFText(''); };
  const save = () => {
    const text = fText.trim();
    if (!text) { toast('메모 내용을 입력해 주세요'); return; }
    if (editId === 'new') {
      setNotes([{ id: newId(), kind: 'note', category: fCat, content: text, date: today(), authorId: user?.id }, ...notes]);
    } else {
      setNotes(notes.map(n => (n.id === editId ? { ...n, category: fCat, content: text } : n)));
    }
    close();
  };

  if (!loaded) return <section className="page page-arch page-memo2" />;

  return (
    <section className="page page-arch page-memo2">
      <div className="page-head">
        <PageTitle>MEMO</PageTitle>
        <EditableDesc k="memo2-desc" def="OOC · 프롬 · 기타 메모 — PC·모바일 어디서나 같은 내용" />
      </div>

      <div className="toolrow">
        <div className="mn-left">
          <span className="mn-count">{arch ? 'TOTAL' : '총'} {shown.length}</span>
          <div className="seg">
            {['ALL', ...CATS].map(c => (
              <button key={c} className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>
                {c === 'ALL' ? (arch ? 'ALL' : '전체') : c}
              </button>
            ))}
          </div>
        </div>
        {user && <button className="btn btn-dark" onClick={openNew}>＋ {arch ? 'NEW MEMO' : '새 메모'}</button>}
      </div>

      {shown.length > 0 ? (
        <div className="mn-grid">
          {shown.map(n => (
            <NoteCard key={n.id} n={n} canEdit={canEdit(n)} onEdit={() => openEdit(n)}
              onDel={() => del.ask('이 메모를 삭제하시겠습니까?', () => setNotes(notes.filter(x => x.id !== n.id)))} />
          ))}
        </div>
      ) : (
        <div className="panel" style={{ textAlign: 'center', padding: 44, fontSize: 13, color: 'var(--faint)' }}>등록된 메모가 없습니다</div>
      )}

      <Modal open={editId !== null} onClose={close} small dirty={!!fText.trim()}
        title={editId === 'new' ? (arch ? 'NEW MEMO' : '새 메모') : (arch ? 'EDIT MEMO' : '메모 수정')}
        actions={<>
          <button className="btn btn-ghost" onClick={close}>CANCEL</button>
          <button className="btn btn-dark" onClick={save}>SAVE</button>
        </>}>
        <div style={{ display: 'grid', gap: 10 }}>
          <div className="seg" style={{ justifySelf: 'start' }}>
            {CATS.map(c => <button key={c} className={fCat === c ? 'on' : ''} onClick={() => setFCat(c)}>{c}</button>)}
          </div>
          <KTextarea rows={8} placeholder="메모를 입력하세요" value={fText} onChange={e => setFText(e.target.value)} />
        </div>
      </Modal>
      {del.element}
    </section>
  );
}
