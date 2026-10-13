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
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useLocalList, newId } from '@/lib/postStore';
import { MEMO_SEED } from '@/lib/memoStore';
import { Modal, useConfirmDelete } from '@/components/ui/Modal';
import { PageTitle, EditableDesc } from '@/components/ui/PageText';
import { Pager } from '@/components/ui/Kit';
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

/** 찾는 말을 <mark>로 — 대소문자 무시 */
function Hl({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const lo = text.toLowerCase();
  const out: React.ReactNode[] = [];
  let at = 0;
  for (let k = lo.indexOf(q); k >= 0; k = lo.indexOf(q, at)) {
    if (k > at) out.push(text.slice(at, k));
    out.push(<mark key={k}>{text.slice(k, k + q.length)}</mark>);
    at = k + q.length;
  }
  out.push(text.slice(at));
  return <>{out}</>;
}

/** 목록에 보일 두 줄 — 찾는 말이 뒤쪽에 있으면 그 근처부터 */
function snippet(text: string, q: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  const k = q ? flat.toLowerCase().indexOf(q) : -1;
  return k > 50 ? `…${flat.slice(k - 24)}` : flat;
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
  // 검색 (v2.0 사용자 요청) — 내용에서 찾고, 찾은 말은 목록·읽기 창 모두 하이라이트
  const [q, setQ] = useState('');
  const ql = q.trim().toLowerCase();
  const shown = notes.filter(n => (cat === 'ALL' || n.category === cat) && (!ql || n.content.toLowerCase().includes(ql)));
  /* 목록 + 읽기 창 (v2.0 사용자 선택 — 카드를 펼치면 한 칸만 길어져 읽기 불편했다).
     PC: 왼쪽 목록 · 오른쪽 읽기 창(고른 게 없으면 첫 메모). 폰: 목록 → 누르면 읽기 화면, BACK으로 목록 */
  const [selId, setSelId] = useState<string | null>(null);
  const [reading, setReading] = useState(false);   // 폰에서 읽기 화면을 보고 있는가
  // 목록은 한 쪽에 10개씩 (v2.0 사용자 요청) — 말머리·검색을 바꾸면 첫 쪽으로
  const PER = 10;
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [cat, ql]);
  const pages = Math.max(1, Math.ceil(shown.length / PER));
  const pg = Math.min(page, pages);
  const pageItems = shown.slice((pg - 1) * PER, pg * PER);
  // 고른 게 없거나 다른 쪽에 있으면 이 쪽의 첫 메모를 읽기 창에
  const sel = pageItems.find(n => n.id === selId) ?? pageItems[0] ?? null;
  const wrapRef = useRef<HTMLDivElement>(null);
  const pick = (id: string) => {
    setSelId(id);
    setReading(true);
    // 폰은 목록을 내려 둔 채 읽기 화면으로 바뀌므로 맨 위로
    if (window.matchMedia('(max-width:620px)').matches) {
      const top = (wrapRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY - 70;
      window.scrollTo({ top: Math.max(0, top) });
    }
  };
  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => toast('복사했습니다'), () => toast('복사하지 못했습니다'));
  };

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

      <div className="toolrow mn-tool">
        <div className="mn-left">
          <span className="mn-count">{arch ? 'TOTAL' : '총'} {shown.length}</span>
          <div className="seg">
            {['ALL', ...CATS].map(c => (
              <button key={c} className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>
                {c === 'ALL' ? (arch ? 'ALL' : '전체') : c}
              </button>
            ))}
          </div>
          <label className="mn-search">
            <span aria-hidden="true">⌕</span>
            <input type="search" value={q} placeholder="메모 검색" onChange={e => setQ(e.target.value)} />
            {q && <button type="button" aria-label="지우기" onClick={() => setQ('')}>✕</button>}
          </label>
        </div>
        {user && <button className="btn btn-dark" onClick={openNew}>＋ {arch ? 'NEW MEMO' : '새 메모'}</button>}
      </div>

      {shown.length > 0 ? (
        <div ref={wrapRef} className={`mn-wrap${reading ? ' m-read' : ''}`}>
          <div className="panel mn-list">
            {pageItems.map(n => (
              <button key={n.id} type="button" className={`mn-row${sel?.id === n.id ? ' on' : ''}`} onClick={() => pick(n.id)}>
                <span className="mn-meta"><span className="mn-cat">{n.category}</span><span className="mn-dt">{fmt(n.date)}</span></span>
                <span className="mn-snip"><Hl text={snippet(n.content, ql)} q={ql} /></span>
              </button>
            ))}
            <Pager page={pg} total={pages} onChange={p => { setPage(p); setSelId(null); }} />
          </div>
          {sel && (
            <article className="panel mn-reader">
              <button type="button" className="mn-back" onClick={() => setReading(false)}>‹ BACK TO LIST</button>
              <div className="mn-rhead">
                <span className="mn-cat">{sel.category}</span>
                <span className="mn-dt">{fmt(sel.date)}</span>
                <span className="mn-sp" />
                {isAdmin && <button type="button" className="mn-btn p" onClick={() => copy(sel.content)}>COPY</button>}
                {canEdit(sel) && <button type="button" className="mn-btn" onClick={() => openEdit(sel)}>EDIT</button>}
                {canEdit(sel) && (
                  <button type="button" className="mn-btn" onClick={() => del.ask('이 메모를 삭제하시겠습니까?', () => {
                    setNotes(notes.filter(x => x.id !== sel.id));
                    setSelId(null); setReading(false);
                  })}>DEL</button>
                )}
              </div>
              <div className="mn-text"><Hl text={sel.content} q={ql} /></div>
            </article>
          )}
        </div>
      ) : (
        <div className="panel" style={{ textAlign: 'center', padding: 44, fontSize: 13, color: 'var(--faint)' }}>
          {ql ? `「${q.trim()}」 — 찾은 메모가 없습니다` : '등록된 메모가 없습니다'}
        </div>
      )}

      <Modal open={editId !== null} onClose={close} small dirty={!!fText.trim()} className="mn-modal"
        title={editId === 'new' ? (arch ? 'NEW MEMO' : '새 메모') : (arch ? 'EDIT MEMO' : '메모 수정')}
        actions={<>
          <button className="btn btn-ghost" onClick={close}>CANCEL</button>
          <button className="btn btn-dark" onClick={save}>SAVE</button>
        </>}>
        <div style={{ display: 'grid', gap: 10 }}>
          <div className="seg" style={{ justifySelf: 'start' }}>
            {CATS.map(c => <button key={c} className={fCat === c ? 'on' : ''} onClick={() => setFCat(c)}>{c}</button>)}
          </div>
          {/* 글이 길어져도 창은 그대로, 칸 안에서만 스크롤 (v2.0 사용자 제보 — 창이 늘어나며 꺾쇠가 어긋났다) */}
          <textarea className="k-textarea mn-input" placeholder="메모를 입력하세요" value={fText} onChange={e => setFText(e.target.value)} />
        </div>
      </Modal>
      {del.element}
    </section>
  );
}
