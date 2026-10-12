'use client';
/**
 * HTML 페이지 (v2.0 사용자 요청) — 메뉴에 붙이는 「HTML 한 장짜리 페이지」.
 *
 * 메인의 HTML 블록과 같은 방식으로 그린다: 사용자 HTML을 그대로(스크립트만 걷어 내고) 화면 폭 전체에.
 * 페이지 큰 제목·패널 같은 틀을 두지 않는다 — 디자인 전부를 HTML이 정하게 하려는 것이다.
 * 여러 개 만들 수 있다(섹션 `/page?s=…`). 본문은 lib/htmlPageStore.ts.
 * 관리자에게만 오른쪽 위 작은 EDIT 버튼이 보이고, 누르면 이 자리에서 HTML을 고친다.
 *
 * 탭 문서 (v2.0 사용자 요청): 이 섹션에 탭 문서가 있으면 HTML 대신 그것을 그린다(lib/archDocStore.ts).
 * 아직 없더라도 HTML이 ARCH 소개 모양이면 읽어서 탭 문서로 보여 준다 — 처음 SAVE하는 순간 따로 저장되고,
 * 원래 HTML은 그대로 남아 「HTML로 되돌리기」로 돌아갈 수 있다.
 */
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useSectionParam } from '@/lib/sectionStore';
import { useHtmlPages } from '@/lib/htmlPageStore';
import { useHtmlSlots, stripScripts } from '@/components/main/HtmlSlots';
import { Modal } from '@/components/ui/Modal';
import { KTextarea } from '@/components/ui/Kit';
import { useToast } from '@/components/ui/Toast';
import { useArchDocs, htmlToArchDoc, blankDoc, migrateDoc, DOC_REV, type ArchDoc } from '@/lib/archDocStore';
import { ArchDocView } from '@/components/archdoc/ArchDocView';

function HtmlPageInner() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const { id, name } = useSectionParam('page');
  const [pages, save, loaded] = useHtmlPages();
  const html = stripScripts(pages[id]);
  const boxRef = useRef<HTMLDivElement>(null);
  const slots = useHtmlSlots(boxRef, [html]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');

  // 탭 문서 — 저장된 것, 없으면 HTML을 읽어 만든 것
  const [docs, saveDoc, docsLoaded] = useArchDocs();
  const saved = docs[id];
  // 렌더 중에 바로 계산 — 효과로 미루면 원래 HTML이 한 번 번쩍 보인 뒤 탭으로 바뀐다
  const rawHtml = pages[id] ?? '';
  const auto = useMemo<ArchDoc | null>(() => (saved || !loaded ? null : htmlToArchDoc(rawHtml)), [saved, loaded, rawHtml]);
  const doc0 = saved ? (saved.useHtml ? null : saved) : auto;
  // 예전 판으로 저장된 문서는 지금 판으로 고쳐 보여 주고, 관리자가 열면 그대로 저장해 둔다 (lib/archDocStore.ts migrateDoc)
  const doc = useMemo(() => (doc0 ? migrateDoc(doc0) : null), [doc0]);
  useEffect(() => {
    if (isAdmin && saved && (saved.rev ?? 1) < DOC_REV) saveDoc(id, migrateDoc(saved));
  }, [isAdmin, saved, id, saveDoc]);

  if (loaded && docsLoaded && doc) {
    return (
      <section className="htmlpage htmlpage-doc">
        <ArchDocView doc={doc} canEdit={isAdmin} fromHtml={!saved}
          onSave={d => saveDoc(id, { ...d, useHtml: false })}
          onUseHtml={() => { saveDoc(id, { ...doc, useHtml: true }); toast('원래 HTML 페이지로 돌아갔습니다 — 탭 문서는 남겨 둡니다'); }} />
      </section>
    );
  }

  return (
    <section className="htmlpage">
      {isAdmin && (
        <div className="htmlpage-edit">
          <button className="btn btn-ghost" onClick={() => {
            saveDoc(id, saved ? { ...saved, useHtml: false } : (htmlToArchDoc(pages[id] ?? '') ?? blankDoc(name)));
          }}>탭 페이지로</button>
          <button className="btn btn-ghost" onClick={() => { setDraft(pages[id] ?? ''); setOpen(true); }}>
            ✎ EDIT
          </button>
        </div>
      )}
      {loaded && !html.trim() ? (
        <p className="hint htmlpage-empty">
          {isAdmin ? `「${name}」 페이지가 비어 있습니다 — 오른쪽 위 EDIT으로 HTML을 넣어 주세요` : '아직 준비 중입니다'}
        </p>
      ) : (
        <div ref={boxRef} className="htmlpage-body" dangerouslySetInnerHTML={{ __html: html }} />
      )}
      {slots}
      <Modal open={open} onClose={() => setOpen(false)} title={`HTML 페이지 — ${name}`}
        desc="메인 HTML 블록과 같은 방식 — 스크립트만 걷어 내고 그대로 그립니다. 메뉴·로그인 자리(data-ohome)도 쓸 수 있습니다">
        <KTextarea value={draft} onChange={e => setDraft(e.target.value)}
          style={{ minHeight: 420, fontFamily: 'var(--mono, Consolas, "D2Coding", monospace)', fontSize: 12.5, lineHeight: 1.6 }} />
        <div className="modal-actions" style={{ marginTop: 12 }}>
          <button className="btn btn-ghost" onClick={() => setOpen(false)}>CANCEL</button>
          <button className="btn btn-dark" onClick={() => { save(id, draft); setOpen(false); toast('저장되었습니다'); }}>SAVE</button>
        </div>
      </Modal>
    </section>
  );
}

export default function HtmlPage() {
  return (
    <Suspense fallback={<section className="htmlpage" />}>
      <HtmlPageInner />
    </Suspense>
  );
}
