'use client';

import { useState, useEffect } from 'react';

export interface MemoItem {
  id: string;
  category: string;
  content: string;
  date: string;
}

const CATEGORIES = ['전체', 'OOC', '프롬', '기타'];
const VALID_CATEGORIES = ['OOC', '프롬', '기타'];
const STORAGE_KEY = 'ohome_memos_final';

export default function MemoPage() {
  const [memos, setMemos] = useState<MemoItem[]>([]);
  const [mounted, setMounted] = useState(false);

  const [selectedCat, setSelectedCat] = useState('전체');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inputCategory, setInputCategory] = useState('OOC');
  const [inputContent, setInputContent] = useState('');

  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMounted(true);
    
    const previousKeys = [
      STORAGE_KEY,
      'ohome_grid_memos_v6',
      'ohome_grid_memos_v5',
      'ohome_grid_memos_v4',
      'ohome_grid_memos_v3',
      'ohome_grid_memos_v2',
      'ohome_grid_memos',
      'ohome_memos'
    ];

    let recoveredData: MemoItem[] | null = null;

    for (const key of previousKeys) {
      try {
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            recoveredData = parsed;
            break;
          }
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (recoveredData) {
      const cleanedData = recoveredData.map((m) => {
        let cat = m.category;
        if (!VALID_CATEGORIES.includes(cat)) {
          if (cat === '공지' || cat === 'ORIGINAL') cat = 'OOC';
          else if (cat === '설정') cat = '프롬';
          else cat = '기타';
        }
        return { ...m, category: cat };
      });
      setMemos(cleanedData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanedData));
    } else {
      setMemos([]);
    }
  }, []);

  const saveMemos = (newList: MemoItem[]) => {
    setMemos(newList);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    } catch (e) {
      console.error(e);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = () => {
    if (!inputContent.trim()) {
      alert('메모 내용을 입력해 주세요.');
      return;
    }

    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

    const targetCategory = VALID_CATEGORIES.includes(inputCategory) ? inputCategory : 'OOC';

    if (editingId) {
      const updated = memos.map((m) =>
        m.id === editingId
          ? { ...m, category: targetCategory, content: inputContent.trim() }
          : m
      );
      saveMemos(updated);
    } else {
      const newMemo: MemoItem = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        category: targetCategory,
        content: inputContent.trim(),
        date: dateStr,
      };
      saveMemos([newMemo, ...memos]);
    }

    setInputContent('');
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleEditClick = (memo: MemoItem) => {
    setEditingId(memo.id);
    const cat = VALID_CATEGORIES.includes(memo.category) ? memo.category : 'OOC';
    setInputCategory(cat);
    setInputContent(memo.content);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClick = (id: string) => {
    if (confirm('이 메모를 삭제하시겠습니까?')) {
      const updated = memos.filter((m) => m.id !== id);
      saveMemos(updated);
      if (editingId === id) {
        setEditingId(null);
        setInputContent('');
        setIsFormOpen(false);
      }
    }
  };

  const handleCancelForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setInputContent('');
  };

  const filteredMemos = memos.filter(
    (m) => selectedCat === '전체' || m.category === selectedCat
  );

  if (!mounted) return null;

  return (
    /* 좌우 padding을 76px로 조절하여 상단 배너 안쪽으로 정밀 안착시킵니다 */
    <div style={{ width: '100%', padding: '0 76px', boxSizing: 'border-box', fontFamily: 'sans-serif' }}>
      
      {/* 1. 상단 컨트롤 바 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              backgroundColor: '#EBECEE',
              padding: '5px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              color: '#55585D',
            }}
          >
            총 {filteredMemos.length}개
          </div>

          <div
            style={{
              display: 'inline-flex',
              gap: 2,
              backgroundColor: '#EBECEE',
              padding: 3,
              borderRadius: 12,
            }}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCat === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCat(cat)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 9,
                    border: 'none',
                    fontSize: 11.5,
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#575E65' : 'transparent',
                    color: isSelected ? '#FFFFFF' : '#78818B',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => {
            if (isFormOpen) {
              handleCancelForm();
            } else {
              setEditingId(null);
              setInputCategory('OOC');
              setInputContent('');
              setIsFormOpen(true);
            }
          }}
          style={{
            padding: '6px 14px',
            borderRadius: 20,
            border: '1px solid #D8DCE0',
            backgroundColor: '#FFFFFF',
            fontSize: 12,
            fontWeight: 600,
            color: '#44484E',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          {isFormOpen ? '✕ 닫기' : '+ 새 메모'}
        </button>
      </div>

      {/* 2. 작성 / 수정 폼 */}
      {isFormOpen && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            padding: 16,
            marginBottom: 16,
            border: '1px solid #E5E7EB',
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>
              {editingId ? '메모 수정' : '새 메모 작성'}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#666' }}>카테고리:</span>
              <select
                value={inputCategory}
                onChange={(e) => setInputCategory(e.target.value)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid #D1D5DB',
                  fontSize: 12,
                  backgroundColor: '#FFF',
                  outline: 'none',
                }}
              >
                {VALID_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <textarea
            value={inputContent}
            onChange={(e) => setInputContent(e.target.value)}
            placeholder="메모를 입력하세요..."
            rows={4}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: 8,
              border: '1px solid #D1D5DB',
              fontSize: 12.5,
              lineHeight: 1.5,
              boxSizing: 'border-box',
              resize: 'vertical',
              marginBottom: 10,
              fontFamily: 'inherit',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
            <button
              onClick={handleCancelForm}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: '#F3F4F6',
                color: '#4B5563',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              취소
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '5px 14px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: '#374151',
                color: '#FFFFFF',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {editingId ? '수정 완료' : '저장'}
            </button>
          </div>
        </div>
      )}

      {/* 3. 5열 정렬 메모 카드 그리드 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: 10,
          alignItems: 'stretch',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {filteredMemos.map((memo) => {
          const isExpanded = !!expandedIds[memo.id];
          const isLongContent = memo.content.length > 50 || memo.content.split('\n').length > 3;

          return (
            <div
              key={memo.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 14,
                padding: '14px 12px 10px 12px',
                border: '1px solid #ECEEEF',
                boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxSizing: 'border-box',
                minWidth: 0,
                minHeight: '210px',
              }}
            >
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: 8 }}>
                  <span
                    style={{
                      border: '1px solid #B0B7C0',
                      color: '#606770',
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '2px 7px',
                      borderRadius: 8,
                    }}
                  >
                    {memo.category}
                  </span>
                </div>

                <div
                  style={{
                    position: 'relative',
                    maxHeight: isExpanded ? 'none' : '110px',
                    overflow: 'hidden',
                    transition: 'max-height 0.2s ease',
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11.5,
                      lineHeight: 1.5,
                      color: '#333333',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {memo.content}
                  </div>

                  {!isExpanded && isLongContent && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 28,
                        background: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,1))',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                </div>

                {isLongContent && (
                  <button
                    onClick={() => toggleExpand(memo.id)}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#78818B',
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '4px 0 0 0',
                      alignSelf: 'flex-start',
                    }}
                  >
                    {isExpanded ? '접기 ▲' : '더보기 ▼'}
                  </button>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: 8,
                  marginTop: 8,
                  borderTop: '1px solid #F3F4F6',
                }}
              >
                <span style={{ fontSize: 9.5, color: '#A0A5AA' }}>{memo.date}</span>

                <div style={{ display: 'flex', gap: 3 }}>
                  <button
                    onClick={() => handleEditClick(memo)}
                    style={{
                      border: 'none',
                      backgroundColor: '#F3F4F6',
                      color: '#6B7280',
                      fontSize: 9.5,
                      padding: '2px 5px',
                      borderRadius: 4,
                      cursor: 'pointer',
                    }}
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDeleteClick(memo.id)}
                    style={{
                      border: 'none',
                      backgroundColor: '#F3F4F6',
                      color: '#6B7280',
                      fontSize: 9.5,
                      padding: '2px 5px',
                      borderRadius: 4,
                      cursor: 'pointer',
                    }}
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredMemos.length === 0 && (
          <div
            style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '50px 0',
              color: '#9CA3AF',
              fontSize: 13,
            }}
          >
            등록된 메모가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
