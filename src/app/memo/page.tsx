'use client';

import React, { useState, useEffect } from 'react';

export interface MemoItem {
  id: string;
  category: string;
  content: string;
  source?: string;
  date: string;
}

const CATEGORIES = [
  { id: 'all', label: '전체' },
  { id: 'quote', label: '❝ 글귀' },
  { id: 'image', label: '📷 이미지' },
  { id: 'video', label: '▶ 영상' },
  { id: 'link', label: '🔗 링크' },
  { id: 'memo', label: '📝 메모' },
];

const INITIAL_MEMOS: MemoItem[] = [
  {
    id: 'memo-1',
    category: 'quote',
    content: `Premium editorial flat lay lookbook photography, perfect 90-degree top-down view. Select only the clothing and a few carefully chosen personal belongings that best represent the character. Do NOT illustrate every item from the description. Curate the layout like a professional stylist.`,
    source: 'Prompt Collection',
    date: '2026.08.09',
  },
  {
    id: 'memo-2',
    category: 'memo',
    content: `내용 : npc와 pc는 다른 시간선에 살고 있습니다(npc의 1일[첫만남] / pc의 30일[연애 중]). 이게 반대가 된다는 내용이라 오푸스로 하면 많이 먹먹합니다.\n\n[처음]\nooc: 이전 스토리를 종료하고 새로운 IF 세계관으로 진행한다.`,
    source: '',
    date: '2026.08.09',
  },
];

export default function MemoPage() {
  const [memos, setMemos] = useState<MemoItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [selectedCat, setSelectedCat] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formCat, setFormCat] = useState('quote');
  const [content, setContent] = useState('');
  const [source, setSource] = useState('');

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // 로컬스토리지 불러오기
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ohome.memos.v1');
      if (saved) {
        setMemos(JSON.parse(saved));
      } else {
        setMemos(INITIAL_MEMOS);
      }
    } catch (e) {
      setMemos(INITIAL_MEMOS);
    }
    setLoaded(true);
  }, []);

  const saveMemos = (nextMemos: MemoItem[]) => {
    setMemos(nextMemos);
    try {
      localStorage.setItem('ohome.memos.v1', JSON.stringify(nextMemos));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdd = () => {
    if (!content.trim()) {
      alert('메모 내용을 입력해 주세요.');
      return;
    }

    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

    const newMemo: MemoItem = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      category: formCat,
      content: content.trim(),
      source: source.trim(),
      date: dateStr,
    };

    saveMemos([newMemo, ...memos]);
    setContent('');
    setSource('');
    setIsFormOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('이 메모를 삭제하시겠습니까?')) {
      saveMemos(memos.filter((m) => m.id !== id));
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredMemos = memos.filter((m) =>
    selectedCat === 'all' ? true : m.category === selectedCat
  );

  if (!loaded) return <section className="page" />;

  return (
    <section className="page" style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 16px' }}>
      {/* 상단 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>MEMO</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, opacity: 0.6 }}>
            총 <span style={{ fontWeight: 'bold' }}>{filteredMemos.length}</span>개
          </p>
        </div>
        <button
          className="btn btn-dark"
          onClick={() => setIsFormOpen(!isFormOpen)}
          style={{ padding: '8px 18px', borderRadius: 999, fontSize: 13, cursor: 'pointer' }}
        >
          {isFormOpen ? '✕ 닫기' : '+ 새 메모'}
        </button>
      </div>

      {/* 작성 폼 */}
      {isFormOpen && (
        <div className="panel" style={{ padding: 20, marginBottom: 24, borderRadius: 16, border: '1px solid rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
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
                  backgroundColor: formCat === cat.id ? '#4a5568' : '#edf2f7',
                  color: formCat === cat.id ? '#ffffff' : '#4a5568',
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
              padding: '12px',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              fontSize: 13.5,
              lineHeight: 1.6,
              resize: 'vertical',
              outline: 'none',
              marginBottom: 10,
              boxSizing: 'border-box',
            }}
          />

          <input
            type="text"
            placeholder="출처/참고 (선택사항 - 작가, 책 제목 등)"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              fontSize: 12.5,
              outline: 'none',
              marginBottom: 16,
              boxSizing: 'border-box',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              type="button"
              className="btn"
              onClick={() => setIsFormOpen(false)}
              style={{ padding: '7px 16px', borderRadius: 999, fontSize: 12.5, cursor: 'pointer' }}
            >
              취소
            </button>
            <button
              type="button"
              className="btn btn-dark"
              onClick={handleAdd}
              style={{ padding: '7px 20px', borderRadius: 999, fontSize: 12.5, cursor: 'pointer' }}
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
            type="button"
            onClick={() => setSelectedCat(cat.id)}
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              border: 'none',
              fontSize: 12,
              fontWeight: selectedCat === cat.id ? 700 : 500,
              cursor: 'pointer',
              backgroundColor: selectedCat === cat.id ? '#4a5568' : '#e2e8f0',
              color: selectedCat === cat.id ? '#ffffff' : '#4a5568',
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
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 16,
          alignItems: 'start',
        }}
      >
        {filteredMemos.map((item) => {
          const isExpanded = expandedIds.has(item.id);
          const isLongText = item.content.length > 140 || item.content.split('\n').length > 5;
          const categoryObj = CATEGORIES.find((c) => c.id === item.category);

          return (
            <div
              key={item.id}
              className="panel"
              style={{
                padding: '18px 20px',
                borderRadius: 16,
                border: '1px solid rgba(0,0,0,0.06)',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
              }}
            >
              <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: 6,
                    backgroundColor: '#edf2f7',
                    color: '#4a5568',
                  }}
                >
                  {categoryObj?.label || '기타'}
                </span>
                <span style={{ fontSize: 11, opacity: 0.5 }}>{item.date}</span>
              </div>

              {/* 본문 높이 제어 (접기/펴기) */}
              <div
                style={{
                  fontSize: 13,
                  lineHeight: 1.65,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  maxHeight: isExpanded || !isLongText ? 'none' : '130px',
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
                      background: 'linear-gradient(transparent, rgba(255,255,255,0.95))',
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
                    color: '#6b46c1',
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
                  marginTop: 14,
                  paddingTop: 10,
                  borderTop: '1px solid rgba(0,0,0,0.06)',
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 11.5, opacity: 0.6, fontStyle: 'italic' }}>
                  {item.source ? `— ${item.source}` : ''}
                </span>

                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#a0aec0',
                    fontSize: 11.5,
                    cursor: 'pointer',
                  }}
                >
                  삭제
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredMemos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', opacity: 0.5 }}>
          <p style={{ fontSize: 13 }}>등록된 메모가 없습니다.</p>
        </div>
      )}
    </section>
  );
}
