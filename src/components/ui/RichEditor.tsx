'use client';
// 리치 텍스트 에디터 (TipTap) — 프로필 탭 등 HTML 콘텐츠 작성용
import React, { useEffect, useRef, useState } from 'react';
import { useEditor, useEditorState, EditorContent, Mark, Node, mergeAttributes } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import { Slice, Fragment, type DOMOutputSpec } from '@tiptap/pm/model';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Blockquote from '@tiptap/extension-blockquote';
import { useLocalList } from '@/lib/postStore';
import { CHAR_SEED, type Character } from '@/lib/charStore';
import { putBlob } from '@/lib/blobStore';
import { useToast } from '@/components/ui/Toast';

/* 인용구 색 (v2.0 사용자 요청) — 인용구마다 색을 고른다. 저장은 data-tone + CSS 변수(--qc)로,
   보이는 모양(옅은 색 바탕·모서리 꺾쇠·밝은 글자)은 globals.css가 정한다. 색을 안 고르면 사이트 강조색 */
const ToneQuote = Blockquote.extend({
  addAttributes() {
    return {
      tone: {
        default: null,
        parseHTML: el => (el as HTMLElement).getAttribute('data-tone'),
        renderHTML: a => (a.tone && /^#[0-9a-f]{3,8}$/i.test(String(a.tone))
          ? { 'data-tone': a.tone, style: `--qc:${a.tone}` } : {}),
      },
    };
  },
});

const HEX = /^#[0-9a-f]{3,8}$/i;
/** 색을 안 고른 기본 인용구 색 (globals.css 인용구 --qc 기본값과 같게 — v2.0 사용자 요청 회색) */
const QUOTE_GRAY = '#a3acb6';
/** 접은글 · 박스칸 색 — data-tone에 적고 CSS 변수(--fx)로 넘긴다 (globals.css [data-fold] · [data-box]) */
const toneAttr = {
  default: null,
  parseHTML: (el: HTMLElement) => el.getAttribute('data-tone'),
  renderHTML: (a: Record<string, unknown>) => (a.tone && HEX.test(String(a.tone)) ? { 'data-tone': a.tone, style: `--fx:${a.tone}` } : {}),
};

/** 한글이 든 딱지 · 딱지 옆 글 — 자간을 좁게(globals.css ko) */
const HANGUL = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/;
/** 딱지 글자 — 대문자, 따옴표 · 역슬래시 · 줄바꿈은 뺀다 (CSS 문자열 --fl에 그대로 들어간다) */
const cleanLabel = (v: unknown, def: string) => String(v ?? '').replace(/["\\\n\r]/g, '').trim().toUpperCase().slice(0, 24) || def;
/** 에디터 안에서만 쓰는 모양 — 저장(renderHTML)과 달리 평범한 div로 그린다 */
const divView = (attrs: Record<string, string>) => ({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) => {
  const dom = document.createElement('div');
  Object.entries({ ...HTMLAttributes, ...attrs }).forEach(([k, v]) => { if (v != null && v !== false) dom.setAttribute(k, String(v)); });
  return { dom, contentDOM: dom };
};

/* 접은글 (v2.0 사용자 요청 — 시안 A 신호 막대). 저장은 <details data-fold><summary>제목</summary><div data-fold-body>…</div></details> —
   브라우저가 스스로 열고 닫아, 본문을 그리는 곳 어디서든 스크립트 없이 접힌다. 기본은 닫힘.
   에디터 안에서는 details/summary 대신 같은 모양의 div로 그린다 — summary 안은 브라우저에 따라 글을 고쳐 쓸 수 없었다(사용자 제보).
   딱지 글자(label)는 data-label + CSS 변수 --fl */
const Fold = Node.create({
  name: 'fold',
  group: 'block',
  content: 'foldTitle foldBody',
  defining: true,
  addAttributes() {
    return {
      tone: toneAttr,
      label: {
        default: 'FOLD',
        parseHTML: el => cleanLabel(el.getAttribute('data-label'), 'FOLD'),
        renderHTML: a => { const l = cleanLabel(a.label, 'FOLD'); return l === 'FOLD' ? {} : { 'data-label': l, style: `--fl:"${l}"` }; },
      },
    };
  },
  parseHTML() { return [{ tag: 'details[data-fold]' }]; },
  renderHTML({ HTMLAttributes }) { return ['details', mergeAttributes(HTMLAttributes, { 'data-fold': '' }), 0]; },
  addNodeView() { return divView({ 'data-fold': '' }); },
});
const FoldTitle = Node.create({
  name: 'foldTitle',
  content: 'inline*',
  defining: true,
  parseHTML() { return [{ tag: 'details[data-fold] > summary' }]; },
  renderHTML() { return ['summary', 0]; },
  addNodeView() { return divView({ 'data-fold-title': '' }); },
  addKeyboardShortcuts() {
    return {
      // 제목 맨 앞에서 지우기 — 앞 문단과 합쳐지며 앞 글이 통째로 지워졌다. 아무것도 하지 않는다
      Backspace: ({ editor }) => {
        const { empty, $from } = editor.state.selection;
        return empty && $from.parent.type.name === 'foldTitle' && $from.parentOffset === 0;
      },
      // 제목에서 엔터 — 줄을 나누지 않고 접힌 본문 첫 줄로
      Enter: ({ editor }) => {
        const { $from } = editor.state.selection;
        if ($from.parent.type.name !== 'foldTitle') return false;
        const pos = $from.after() + 2;
        if (pos > editor.state.doc.content.size) return false;
        editor.view.dispatch(editor.state.tr.setSelection(TextSelection.near(editor.state.doc.resolve(pos))));
        return true;
      },
    };
  },
});
const FoldBody = Node.create({
  name: 'foldBody',
  content: 'block+',
  defining: true,
  parseHTML() { return [{ tag: 'details[data-fold] > div[data-fold-body]' }]; },
  renderHTML() { return ['div', { 'data-fold-body': '' }, 0]; },
});
/* 박스칸 (v2.0 사용자 요청 — 시안 세 가지 모두): 꺾쇠(frame) · 딱지 머리(tag) · 단색 띠(band), 색은 고른 대로.
   딱지 머리는 머리줄 [딱지 글자][딱지 옆 글]을 진짜 칸으로 그리고(data-box-head — 고쳐 쓰기는 설정 줄에서), 본문은 data-box-body 안에 */
type BoxShape = 'frame' | 'tag' | 'band';
const BOX_LABEL: Record<BoxShape, string> = { frame: '꺾쇠', tag: '딱지', band: '띠' };
const Box = Node.create({
  name: 'box',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return {
      shape: {
        default: 'frame',
        parseHTML: el => { const v = el.getAttribute('data-box'); return v === 'tag' || v === 'band' ? v : 'frame'; },
        renderHTML: a => ({ 'data-box': a.shape }),
      },
      label: {
        default: 'MEMO',
        parseHTML: el => cleanLabel(el.getAttribute('data-label'), 'MEMO'),
        renderHTML: a => (a.shape === 'tag' ? { 'data-label': cleanLabel(a.label, 'MEMO') } : {}),
      },
      head: {
        default: '',
        parseHTML: el => (el.getAttribute('data-head') ?? '').slice(0, 60),
        renderHTML: a => (a.shape === 'tag' && a.head ? { 'data-head': String(a.head) } : {}),
      },
      tone: toneAttr,
    };
  },
  // 본문은 data-box-body 안 (예전 것 · 다른 모양은 박스 자체)
  parseHTML() { return [{ tag: 'div[data-box]', contentElement: (el: HTMLElement) => el.querySelector<HTMLElement>(':scope > [data-box-body]') ?? el }]; },
  renderHTML({ node, HTMLAttributes }) {
    if (node.attrs.shape !== 'tag') return ['div', HTMLAttributes, 0];
    const head = String(node.attrs.head ?? '').trim();
    const label = cleanLabel(node.attrs.label, 'MEMO');
    const row: DOMOutputSpec[] = [['span', { 'data-box-tag': HANGUL.test(label) ? 'ko' : '' }, label]];
    if (head) row.push(['span', { 'data-box-note': HANGUL.test(head) ? 'ko' : '' }, head]);
    return ['div', HTMLAttributes, ['div', { 'data-box-head': '', contenteditable: 'false' }, ...row], ['div', { 'data-box-body': '' }, 0]];
  },
});
/* 붙여넣기 (v2.0 사용자 요청 — PC · 모바일 모두): 바깥에서 가져온 글은 서식(글꼴 · 크기 · 색 · 굵기 · 링크 · 인라인 스타일)을 전부 버리고
   글자와 줄만 남겨 홈 서식(본문 문단)으로 넣는다. 줄 하나가 문단 하나, 빈 줄은 빈 문단. 에디터 안에서 복사한 것(data-pm-slice)은 그대로 */
const BLOCK_TAG = /^(P|DIV|H[1-6]|LI|BLOCKQUOTE|TR|PRE|SECTION|ARTICLE|HEADER|FOOTER|UL|OL|TABLE|DL|DT|DD|FIGURE|FIGCAPTION|ADDRESS|ASIDE|NAV|MAIN|DETAILS|SUMMARY)$/;
function pastedLines(html: string, text: string): string[] {
  let lines: string[] = [];
  if (html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script,style,head,title,meta,link,template').forEach(n => n.remove());
    let cur = '';
    const walk = (n: globalThis.Node, pre: boolean) => {
      if (n.nodeType === 3) { cur += pre ? (n.textContent ?? '') : (n.textContent ?? '').replace(/[\t\n\r ]+/g, ' '); return; }
      if (n.nodeType !== 1) return;
      const el = n as Element, tag = el.tagName;
      if (tag === 'BR') { lines.push(cur); cur = ''; return; }
      if (tag === 'HR') { if (cur) lines.push(cur); cur = ''; return; }
      const block = BLOCK_TAG.test(tag);
      if (block && cur) { lines.push(cur); cur = ''; }
      if (pre || tag === 'PRE') {
        // 미리 쓴 글(pre)은 줄바꿈이 글자 안에 있다
        const before = cur; cur = '';
        el.childNodes.forEach(c => walk(c, true));
        const parts = (before + cur).split(/\r?\n/); cur = parts.pop() ?? ''; lines.push(...parts);
      } else el.childNodes.forEach(c => walk(c, false));
      if (block && cur) { lines.push(cur); cur = ''; }
    };
    walk(doc.body, false);
    if (cur) lines.push(cur);
  } else {
    lines = text.replace(/\r\n?/g, '\n').split('\n');
  }
  // 줄 앞뒤 빈칸은 빼고, 보이지 않는 글자(ㅤ 한글 채움 · 폭 없는 글자 · 점자 빈칸 …)만 있는 줄은 빈 줄로. 처음 · 끝의 빈 줄은 뺀다
  const INVISIBLE = /^[\s\u00a0\u180e\u200b-\u200f\u2028\u2029\u2060\ufeff\u115f\u1160\u3164\u2800\u3000\uffa0]*$/;
  lines = lines.map(l => (INVISIBLE.test(l) ? '' : l.replace(/^[\s\u00a0]+|[\s\u00a0]+$/g, '')));
  while (lines.length && !lines[0]) lines.shift();
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  return lines;
}

/** 접은글은 닫힌 채로 저장 (예전에 열린 채 들어온 것도) */
const stripOpen = (html: string) => html.replace(/(<details\b[^>]*?) open=""/g, '$1');

// 외부 패키지 설치 없이 작동하는 자체 글자 색상 마크
const TextColor = Mark.create({
  name: 'textColor',
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: element => (element as HTMLElement).style.color || null,
        renderHTML: attributes => {
          if (!attributes.color) return {};
          return { style: `color: ${attributes.color}` };
        },
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[style*="color"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
});

function toDataUrl(f: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(f);
  });
}

function TBtn({ on, label, title, onClick }: { on?: boolean; label: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button type="button" data-tip={title} className={`re-btn ${on ? 'on' : ''}`}
      onMouseDown={e => e.preventDefault()} onClick={onClick}>
      {label}
    </button>
  );
}

export function RichEditor({ value, onChange, placeholder }: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [currentColor, setCurrentColor] = useState('#e03131');
  const [quoteOpen, setQuoteOpen] = useState(false);
  // 인용구 색 후보 — 내 캐릭터들의 대표색
  const [chars] = useLocalList<Character>('ohome.chars.v1', CHAR_SEED);
  const toneChips = chars.filter(c => c.own && /^#[0-9a-f]{3,8}$/i.test(c.color ?? ''))
    .slice(0, 8).map(c => ({ name: c.name, color: c.color }));

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ blockquote: false }),
      ToneQuote,
      Image,
      TextColor,
      Fold, FoldTitle, FoldBody, Box,
    ],
    content: value || '<p></p>',
    immediatelyRender: false,
    editorProps: {
      attributes: { class: 're-content prose' },
      // 바깥에서 붙여 넣은 글은 서식 없이 홈 서식으로 (위 pastedLines)
      handlePaste: (view, event) => {
        const cd = event.clipboardData;
        if (!cd) return false;
        const html = cd.getData('text/html');
        if (html && /data-pm-slice/.test(html)) return false;   // 에디터 안에서 복사 — 접은글 · 박스 그대로
        const text = cd.getData('text/plain');
        if (!html && !text) return false;   // 그림만 붙여 넣기 등은 원래대로
        const lines = pastedLines(html, text);
        if (!lines.length) return false;   // 글자가 없으면(그림만 등) 원래대로
        const { schema } = view.state;
        const paras = lines.map(l => schema.nodes.paragraph.create(null, l ? schema.text(l) : null));
        // 열린 조각(1, 1)으로 — 한 줄이면 지금 문단 안에 이어 붙고, 여러 줄이면 앞뒤 문단과 이어진다
        view.dispatch(view.state.tr.replaceSelection(new Slice(Fragment.from(paras), 1, 1)).scrollIntoView());
        return true;
      },
    },
    onUpdate: ({ editor: e }) => onChange(stripOpen(e.getHTML())),
  });
  // 커서가 박스 · 접은글 안이면 그 설정 줄을 띄운다 (커서만 옮겨도 다시 그리게)
  const ctx = useEditorState({
    editor,
    selector: ({ editor: e }) => e ? {
      box: e.isActive('box'), fold: e.isActive('fold'),
      shape: (e.getAttributes('box').shape as BoxShape | undefined) ?? 'frame',
      label: (e.getAttributes('box').label as string | undefined) ?? 'MEMO',
      head: (e.getAttributes('box').head as string | undefined) ?? '',
      boxTone: (e.getAttributes('box').tone as string | null) ?? null,
      foldTone: (e.getAttributes('fold').tone as string | null) ?? null,
      foldLabel: (e.getAttributes('fold').label as string | undefined) ?? 'FOLD',
    } : null,
  });

  useEffect(() => {
    if (editor && value !== stripOpen(editor.getHTML()) && !editor.isFocused) {
      editor.commands.setContent(value || '<p></p>', { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return <div className="re-wrap" style={{ minHeight: 200 }} />;

  const insertImage = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    try {
      const ref = await putBlob(f);
      const src = /^https?:/.test(ref) ? ref : await toDataUrl(f);
      editor.chain().focus().setImage({ src }).run();
    } catch (e) {
      toast(`이미지를 올리지 못했습니다 — ${e instanceof Error ? e.message : String(e)}`);
    }
    setBusy(false);
  };

  /* 인용구 색 — 커서가 인용구 안이면 그 인용구 색만 바꾸고, 밖이면 인용구로 만들면서 색을 입힌다 */
  const setQuoteTone = (tone: string | null) => {
    const chain = editor.chain().focus();
    if (!editor.isActive('blockquote')) chain.toggleBlockquote();
    chain.updateAttributes('blockquote', { tone }).run();
    setQuoteOpen(false);
  };
  const curTone = (editor.getAttributes('blockquote').tone as string | null) ?? null;

  /* 접은글 · 박스칸 넣기 — 박스는 고른 문단을 감싸고, 못 감싸면 빈 박스를 넣는다. 뒤에 빈 줄을 두어 밖으로 나가 쓸 수 있게 */
  const insertFold = () => {
    editor.chain().focus().insertContent([
      { type: 'fold', content: [
        { type: 'foldTitle', content: [{ type: 'text', text: '접은 글' }] },
        { type: 'foldBody', content: [{ type: 'paragraph' }] },
      ] },
      { type: 'paragraph' },
    ]).run();
  };
  const insertBox = () => {
    if (editor.isActive('box')) return;
    if (!editor.chain().focus().wrapIn('box').run()) {
      editor.chain().focus().insertContent([{ type: 'box', content: [{ type: 'paragraph' }] }, { type: 'paragraph' }]).run();
    }
  };
  const setBox = (a: Record<string, unknown>) => editor.chain().focus().updateAttributes('box', a).run();
  const setFoldTone = (tone: string | null) => editor.chain().focus().updateAttributes('fold', { tone }).run();
  /** 색 고르기 — 기본(사이트 강조색) · 내 캐릭터 대표색 · 직접 (인용구 색과 같은 후보) */
  const tonePicker = (cur: string | null, set: (t: string | null) => void) => (
    <>
      <button type="button" className={`re-qchip${!cur ? ' on' : ''}`} onMouseDown={e => e.preventDefault()} onClick={() => set(null)}>
        <i className="re-qtone" />기본
      </button>
      {toneChips.map(c => (
        <button key={c.name + c.color} type="button" className={`re-qchip${cur === c.color ? ' on' : ''}`}
          onMouseDown={e => e.preventDefault()} onClick={() => set(c.color)}>
          <i className="re-qtone" style={{ background: c.color }} />{c.name}
        </button>
      ))}
      <label className="re-qchip">
        <input type="color" value={cur ?? '#8fb0d8'} onChange={e => set(e.target.value)} />직접
      </label>
    </>
  );

  const handleColorChange = (color: string) => {
    setCurrentColor(color);
    if (editor) {
      editor.chain().focus().setMark('textColor', { color }).run();
    }
    setShowColorPicker(false);
  };

  return (
    <div className="re-wrap" style={{ position: 'relative' }}>
      <div className="re-toolbar">
        <TBtn title="굵게" label={<b>B</b>} on={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()} />
        <TBtn title="기울임" label={<i>I</i>} on={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()} />
        <TBtn title="취소선" label={<s>S</s>} on={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()} />
        
        {/* 글자 색상 버튼 */}
        <TBtn
          title="글자 색상"
          label={<span style={{ borderBottom: `3px solid ${currentColor}`, fontWeight: 'bold' }}>A</span>}
          onClick={() => setShowColorPicker(!showColorPicker)}
        />

        <span className="re-sep" />
        <TBtn title="제목" label="H2" on={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
        <TBtn title="소제목" label="H3" on={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
        <span className="re-sep" />
        <TBtn title="글머리 목록" label="•≡" on={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()} />
        <TBtn title="번호 목록" label="1≡" on={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()} />
        <TBtn title="인용" label="❝" on={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()} />
        <TBtn title="인용구 색" label={<span className="re-qtone" style={{ background: curTone ?? QUOTE_GRAY }} />}
          on={quoteOpen} onClick={() => setQuoteOpen(o => !o)} />
        <TBtn title="구분선" label="—" onClick={() => editor.chain().focus().setHorizontalRule().run()} />
        <TBtn title="접은글" label="접기" on={!!ctx?.fold} onClick={insertFold} />
        <TBtn title="박스칸 (고른 문단을 감싼다)" label="박스" on={!!ctx?.box} onClick={insertBox} />
        <span className="re-sep" />
        <TBtn title={busy ? '올리는 중…' : '이미지 올리기'} label={busy ? '⏳' : '🖼'}
          onClick={() => { if (!busy) fileRef.current?.click(); }} />
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; void insertImage(f); }} />
        
        <span className="re-sep re-hide-m" />
        <span className="re-hide-m" style={{ display: 'contents' }}>
          <TBtn title="실행 취소" label="↶" onClick={() => editor.chain().focus().undo().run()} />
          <TBtn title="다시 실행" label="↷" onClick={() => editor.chain().focus().redo().run()} />
        </span>
      </div>

      {/* 커서가 박스칸 · 접은글 안일 때 — 모양 · 딱지 글자 · 색 */}
      {ctx?.box && (
        <div className="re-ctx">
          <span className="re-ctx-h">박스</span>
          {(['frame', 'tag', 'band'] as BoxShape[]).map(k => (
            <button key={k} type="button" className={`re-qchip${ctx.shape === k ? ' on' : ''}`}
              onMouseDown={e => e.preventDefault()} onClick={() => setBox({ shape: k })}>{BOX_LABEL[k]}</button>
          ))}
          {ctx.shape === 'tag' && (
            <input className="re-ctx-in" value={ctx.label} maxLength={24} aria-label="딱지 글자"
              onChange={e => editor.chain().updateAttributes('box', { label: cleanLabel(e.target.value, '') }).run()} />
          )}
          {ctx.shape === 'tag' && (
            <input className="re-ctx-in re-ctx-wide" value={ctx.head} maxLength={60} placeholder="딱지 옆 글" aria-label="딱지 옆 글"
              onChange={e => editor.chain().updateAttributes('box', { head: e.target.value.replace(/[\n\r]/g, '') }).run()} />
          )}
          <span className="re-ctx-h">색</span>
          {tonePicker(ctx.boxTone, t => setBox({ tone: t }))}
          <button type="button" className="re-qchip" onMouseDown={e => e.preventDefault()}
            onClick={() => editor.chain().focus().lift('box').run()}>박스 풀기</button>
        </div>
      )}
      {ctx?.fold && !ctx.box && (
        <div className="re-ctx">
          <span className="re-ctx-h">접은글 딱지</span>
          <input className="re-ctx-in" value={ctx.foldLabel} maxLength={24} aria-label="접은글 딱지 글자"
            onChange={e => editor.chain().updateAttributes('fold', { label: cleanLabel(e.target.value, '') }).run()} />
          <span className="re-ctx-h">색</span>
          {tonePicker(ctx.foldTone, setFoldTone)}
        </div>
      )}

      {/* 인용구 색 고르기 — 기본(사이트 강조색) · 내 캐릭터 대표색 · 직접 */}
      {quoteOpen && (
        <div className="re-qpop">
          <button type="button" className={`re-qchip${!curTone ? ' on' : ''}`} onClick={() => setQuoteTone(null)}>
            <i className="re-qtone" style={{ background: QUOTE_GRAY }} />기본
          </button>
          {toneChips.map(c => (
            <button key={c.name + c.color} type="button" className={`re-qchip${curTone === c.color ? ' on' : ''}`} onClick={() => setQuoteTone(c.color)}>
              <i className="re-qtone" style={{ background: c.color }} />{c.name}
            </button>
          ))}
          <label className="re-qchip">
            <input type="color" value={curTone ?? QUOTE_GRAY} onChange={e => setQuoteTone(e.target.value)} />직접
          </label>
        </div>
      )}

      {/* 팔레트 레이어 */}
      {showColorPicker && (
        <div style={{
          position: 'absolute', top: 45, left: 100, zIndex: 10,
          background: '#fff', border: '1px solid #ccc', padding: 10,
          borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex', gap: 8, alignItems: 'center'
        }}>
          {['#17171a', '#D11C20', '#2f9e44', '#607CA0', '#f59f00', '#9c36b5'].map(c => (
            <button
              key={c}
              type="button"
              style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: c, border: 'none', cursor: 'pointer' }}
              onClick={() => handleColorChange(c)}
            />
          ))}
          <input
            type="color"
            value={currentColor}
            onChange={e => handleColorChange(e.target.value)}
            style={{ width: 28, height: 28, border: 'none', cursor: 'pointer', background: 'transparent' }}
          />
        </div>
      )}

      <div className="re-body">
        <EditorContent editor={editor} style={{ maxHeight: '400px', overflowY: 'auto' }} />
        {placeholder && editor.isEmpty && <div className="re-ph">{placeholder}</div>}
      </div>
    </div>
  );
}
