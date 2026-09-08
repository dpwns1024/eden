'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { PageTitle } from '@/components/ui/PageText';
import { ConfirmModal } from '@/components/ui/Modal';

export interface MemoItem {
  id: string;
  category: string;
  content: string;
  source?: string;
  date: string;
  authorId?: string;
}

const CATEGORIES = [
  { id: 'all', label: '전체' },
  { id: 'quote', label: '❝ 글귀' },
  { id: 'image', label: '📷 이미지' },
  { id: 'video', label: '▶ 영상' },
  { id: 'link', label: '🔗 링크' },
  { id: 'memo', label: '📝 메모' },
];

const SEED_MEMOS: MemoItem[] = [
  {
    id: 'memo-1',
    category: 'quote',
    content: `Premium editorial flat lay lookbook photography, perfect 90-degree top-down view. Select only the clothing and a few carefully chosen personal belongings that best represent the character. Do NOT illustrate every item from the description. Curate the layout like a professional stylist.`,
    source: 'Prompt Collection',
    date: '2026-08-09T10:00:00.000Z',
  },
  {
    id: 'memo-2',
    category: 'memo',
    content: `내용 : npc와 pc는 다른 시간선에 살고 있습니다(npc의 1일[첫만남] / pc의 30일[연애 중]). 이게 반대가 된다는 내용이라 오푸스로 하면 많이 먹먹합니다.\n\n[처음]\nooc: 이전 스토리를 종료하고 새로운 IF 세계관으로 진행한다.`,
    source: '',
    date: '2026-08-09T11:30:00.000Z',
  },
];

export default function MemoPage() {
  const { user, isAdmin } = useAuth();
  const toast = useToast();

  const [memos, setMemos] = useState<MemoItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [selectedCat, setSelectedCat] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formCat, setFormCat] = useState('quote');
  const [content, setContent] = useState('');
  const [source, setSource] = useState('');

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // 로컬스토리지 데이터 로드
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ohome.memos.v1');
      if (saved) {
        setMemos(JSON.parse(saved));
      } else {
        setMemos(SEED_MEMOS);
      }
    } catch (e) {
      console.error(e);
      setMemos(SEED_MEMOS);
    } finally {
      setLoaded(true);
    }
  }, []);

  const saveMemos = (newMemos: MemoItem[]) => {
    setMemos(newMemos);
    try {
      localStorage.setItem('ohome.memos.v1', JSON.stringify(newMemos));
    } catch (e) {
      console.error(e);
    }
  };

  const filteredMemos = memos.filter((m) =>
    selectedCat === 'all' ? true : m.category === selectedCat
  );

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddMemo = () => {
    if (!content.trim()) {
      toast('메모 내용을 입력해 주세요.');
      return;
    }

    const newMemo: MemoItem = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      category: formCat,
      content: content.trim(),
      source: source.trim(),
      date: new Date().toISOString(),
      authorId: user?.id || '',
    };

    saveMemos([newMemo, ...memos]);
    setContent('');
    setSource('');
    setIsFormOpen(false);
    toast('새 메모가 등록되었습니다.');
  };

  const handleDelete = () => {
    if (!deleteTargetId) return;
    saveMemos(memos.filter((m) => m.id !== deleteTargetId));
    setDeleteTargetId(null);
    toast('메모가 삭제되었습니다.');
  };

  if (!loaded) return <section className="page" />;

  return (
    <section className="page" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <PageTitle>MEMO</PageTitle>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--faint)' }}>
            총 <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{filteredMemos.length}</span>개
          </p>
        </div>
        <button
          className="btn btn-dark"
          onClick={() => setIsFormOpen(!isFormOpen)}
          style={{ padding: '8px 18px', borderRadius: 999, fontSize: 13 }}
        >
          {isFormOpen ? '✕ 닫기' : '+ 새 메모'}
        </button>
      </div>

      {/* 작성 폼 */}
      {isFormOpen && (
        <div className="panel" style={{ padding: 22, marginBottom: 24, borderRadius: 16 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFormCat(cat.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 999,
                  border: 'none',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: formCat === cat.id ? 'var(--accent, #5c6b73)' : 'var(--bg-sub, #f0f0f0)',
                  color: formCat === cat.id ? '#ffffff' : 'var(--faint, #666666)',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <textarea
            placeholder="기록하고 싶은 내용을 입력하세요..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid var(--line, #e5e5e5)',
              backgroundColor: 'var(--bg-sub, #f9f9f9)',
              color: 'var(--fg, #333333)',
              fontSize: 13.5,
              lineHeight: 1.6,
              resize: 'vertical',
              outline: 'none',
              marginBottom: 10,
            }}
          />

          <input
            type="text"
            placeholder="출처/참고 (선택사항 - 작가, 책 제목 등)"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid var(--line, #e5e5e5)',
              backgroundColor: 'var(--bg-sub, #f9f9f9)',
              color: 'var(--fg, #333333)',
              fontSize: 12.5,
              outline: 'none',
              marginBottom: 16,
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              className="btn btn-ghost"
              onClick={() => setIsFormOpen(false)}
              style={{ padding: '7px 16px', borderRadius: 999, fontSize: 12.5 }}
            >
              취소
            </button>
            <button
              className="btn btn-dark"
              onClick={handleAddMemo}
              style={{ padding: '7px 20px', borderRadius: 999, fontSize: 12.5 }}
            >
              등록
            </button>
          </div>
        </div>
      )}

      {/* 카테고리 필터 탭 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCat(cat.id)}
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              border: 'none',
              fontSize: 12,
              fontWeight: selectedCat === cat.id ? 700 : 500,
              cursor: 'pointer',
              backgroundColor: selectedCat === cat.id ? 'var(--accent, #4a5568)' : 'var(--bg-sub, #e2e8f0)',
              color: selectedCat === cat.id ? '#ffffff' : 'var(--faint, #4a5568)',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 메모 카드 리스트 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 16,
          alignItems: 'start',
        }}
      >
        {filteredMemos.map((item) => {
          const isExpanded = expandedIds.has(item.id);
          const isLongText = item.content.length > 150 || item.content.split('\n').length > 5;
          const categoryObj = CATEGORIES.find((c) => c.id === item.category);
          const displayDate = item.date ? item.date.slice(0, 10).replace(/-/g, '.') : '';

          return (
            <div
              key={item.id}
              className="panel"
              style={{
                padding: '20px 22px',
                borderRadius: 16,
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
                position: 'relative',
              }}
            >
              <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: 6,
                    backgroundColor: 'var(--bg-sub, #f0f0f0)',
                    color: 'var(--faint, #666666)',
                  }}
                >
                  {categoryObj?.label || '기타'}
                </span>
                <span style={{ fontSize: 11, color: 'var(--faint, #aaa)' }}>{displayDate}</span>
              </div>

              {/* 본문 높이 제어 */}
              <div
                style={{
                  fontSize: 13,
                  lineHeight: 1.65,
                  color: 'var(--fg, #222)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  maxHeight: isExpanded || !isLongText ? 'none' : '140px',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {item.content}

                {isLongText && !isExpanded && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 40,
                      background: 'linear-gradient(transparent, var(--panel-bg, #ffffff))',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </div>

              {isLongText && (
                <button
                  type="button"
                  onClick={() => toggleExpand(item.id)}
                  style={{
                    marginTop: 8,
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent, #673AB7)',
                    fontSize: 12,
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    padding: 0,
                    textAlign: 'left',
                  }}
                >
                  {isExpanded ? '▲ 접기' : '▼ 더보기'}
                </button>
              )}

              <div
                style={{
                  marginTop: 16,
                  paddingTop: 10,
                  borderTop: '1px solid var(--line, #f0f0f0)',
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 11.5, color: 'var(--faint, #888)', fontStyle: 'italic' }}>
                  {item.source ? `— ${item.source}` : ''}
                </span>

                {(isAdmin || (user && item.authorId === user.id)) && (
                  <button
                    onClick={() => setDeleteTargetId(item.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--faint, #aaa)',
                      fontSize: 11.5,
                      cursor: 'pointer',
                    }}
                  >
                    삭제
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredMemos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--faint)' }}>
          <p style={{ fontSize: 13 }}>등록된 메모가 없습니다.</p>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTargetId}
        title="메모 삭제"
        body="이 메모를 삭제하시겠습니까?"
        onClose={() => setDeleteTargetId(null)}
        buttons={[
          { label: 'DELETE', kind: 'accent', onClick: handleDelete },
          { label: 'CANCEL', kind: 'ghost', onClick: () => setDeleteTargetId(null) },
        ]}
      />
    </section>
  );
}
