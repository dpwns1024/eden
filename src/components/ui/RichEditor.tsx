'use client';
// 리치 텍스트 에디터 (TipTap) — 프로필 탭 등 HTML 콘텐츠 작성용
import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, Mark, mergeAttributes } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { putBlob } from '@/lib/blobStore';
import { useToast } from '@/components/ui/Toast';

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

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      TextColor,
    ],
    content: value || '<p></p>',
    immediatelyRender: false,
    editorProps: {
      attributes: { class: 're-content prose' },
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML() && !editor.isFocused) {
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
        <TBtn title="구분선" label="—" onClick={() => editor.chain().focus().setHorizontalRule().run()} />
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

      {/* 팔레트 레이어 */}
      {showColorPicker && (
        <div style={{
          position: 'absolute', top: 45, left: 100, zIndex: 10,
          background: '#fff', border: '1px solid #ccc', padding: 10,
          borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex', gap: 8, alignItems: 'center'
        }}>
          {['#17171a', '#e03131', '#2f9e44', '#1971c2', '#f59f00', '#9c36b5'].map(c => (
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
