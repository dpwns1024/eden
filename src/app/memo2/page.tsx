'use client';

import { useState, useEffect } from 'react';

export interface MemoItem {
  id: string;
  category: string;
  content: string;
  date: string;
  likes?: number;
  isLiked?: boolean;
}

const CATEGORIES = ['전체', 'OOC', '프롬', '기타'];
const VALID_CATEGORIES = ['OOC', '프롬', '기타'];
const STORAGE_KEY = 'ohome_memos_final';

export default function MemoPage() {
  const [memos, setMemos] = useState<MemoItem[]>([]);
  const [mounted, setMounted] = useState(false);

  const [selectedCat, setSelectedCat] = useState('전체');

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
      'ohome_memos',
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
        return {
          ...m,
          category: cat,
          likes: m.likes ?? 0,
          isLiked: m.isLiked ?? false,
        };
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

  const handleCancelForm = () => {
    setEditingId(null);
    setInputContent('');
    setInputCategory('OOC');
  };

  const handleSave = () => {
    if (!inputContent.trim()) {
      alert('내용을 입력해 주세요.');
      return;
    }

    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

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
        likes: 0,
        isLiked: false,
      };
      saveMemos([newMemo, ...memos]);
    }

    handleCancelForm();
  };

  const handleEditClick = (memo: MemoItem) => {
    setEditingId(memo.id);
    const cat = VALID_CATEGORIES.includes(memo.category) ? memo.category : 'OOC';
    setInputCategory(cat);
    setInputContent(memo.content);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDeleteClick = (id: string) => {
    if (confirm('이 포스트를 삭제하시겠습니까?')) {
      const updated = memos.filter((m) => m.id !== id);
      saveMemos(updated);
      if (editingId === id) {
        handleCancelForm();
      }
    }
  };

  const handleLikeClick = (id: string) => {
    const updated = memos.map((m) => {
      if (m.id === id) {
        const isLiked = !m.isLiked;
        const likes = (m.likes || 0) + (isLiked ? 1 : -1);
        return { ...m, isLiked, likes: Math.max(0, likes) };
      }
      return m;
    });
    saveMemos(updated);
  };

  const filteredMemos = memos.filter(
    (m) => selectedCat === '전체' || m.category === selectedCat
  );

  if (!mounted) return null;

  return (
    <div style={{ maxWidth: 580, margin: '0 auto', padding: '20px 16px', fontFamily: 'sans-serif', color: '#1E293B' }}>
      
      {/* 1. 상단 작성/수정 피드 카드 */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: 18,
          marginBottom: 20,
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>
            {editingId ? '✏️ 포스트 수정 중' : '💬 새 피드 작성'}
          </span>
          {editingId && (
            <button
              onClick={handleCancelForm}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                fontSize: 12,
                color: '#94A3B8',
                cursor: 'pointer',
              }}
            >
              취소
            </button>
          )}
        </div>

        <textarea
          value={inputContent}
          onChange={(e) => setInputContent(e.target.value)}
          placeholder="무슨 생각을 하고 계신가요?"
          rows={3}
          style={{
            width: '100%',
            padding: '8px 0',
            border: 'none',
            fontSize: 14,
            lineHeight: 1.6,
            boxSizing: 'border-box',
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            color: '#1E293B',
          }}
        />

        <div
          style={{
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            paddingTop: 12,
            borderTop: '1px solid #F1F5F9',
            marginTop: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#64748B' }}>카테고리:</span>
            <select
              value={inputCategory}
              onChange={(e) => setInputCategory(e.target.value)}
              style={{
                padding: '4px 10px',
                borderRadius: 20,
                border: '1px solid #CBD5E1',
                fontSize: 12,
                backgroundColor: '#F8FAFC',
                color: '#334155',
                outline: 'none',
                fontWeight: 600,
              }}
            >
              {VALID_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSave}
            style={{
              padding: '7px 18px',
              borderRadius: 20,
              border: 'none',
              backgroundColor: '#3B82F6',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(59,130,246,0.2)',
            }}
          >
            {editingId ? '수정완료' : '게시'}
          </button>
        </div>
      </div>

      {/* 2. 카테고리 필터 탭 */}
      <div
        style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          padding: '0 4px',
        }}
      >
        <div style={{ display: 'flex', gap: 6, backgroundColor: '#F1F5F9', padding: 4, borderRadius: 20 }}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCat === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                style={{
                  padding: '5px 14px',
                  borderRadius: 16,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  backgroundColor: isSelected ? '#3B82F6' : 'transparent',
                  color: isSelected ? '#FFFFFF' : '#64748B',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>
          총 {filteredMemos.length}개
        </span>
      </div>

      {/* 3. SNS 피드 리스트 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {filteredMemos.map((memo) => {
          const isExpanded = !!expandedIds[memo.id];
          const isLongContent = memo.content.length > 120 || memo.content.split('\n').length > 4;

          return (
            <div
              key={memo.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: '18px 20px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              }}
            >
              {/* 프로필 + 카테고리 + 작성일 + 메뉴 */}
              <div
                style={{
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      backgroundColor: '#94A3B8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      color: '#FFF',
                      fontWeight: 700,
                    }}
                  >
                    M
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>MEMO</span>
                      <span
                        style={{
                          backgroundColor: '#EFF6FF',
                          color: '#2563EB',
                          border: '1px solid #BFDBFE',
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '1px 7px',
                          borderRadius: 10,
                        }}
                      >
                        {memo.category}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>{memo.date}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleEditClick(memo)}
                    style={{
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#94A3B8',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDeleteClick(memo.id)}
                    style={{
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#94A3B8',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    삭제
                  </button>
                </div>
              </div>

              {/* 본문 */}
              <div
                style={{
                  position: 'relative',
                  maxHeight: isExpanded ? 'none' : '120px',
                  overflow: 'hidden',
                  transition: 'max-height 0.2s ease',
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 13.5,
                    lineHeight: 1.65,
                    color: '#334155',
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'break-word',
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
                      height: 32,
                      backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,1))',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </div>

              {/* 더보기 / 접기 */}
              {isLongContent && (
                <button
                  onClick={() => toggleExpand(memo.id)}
                  style={{
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#3B82F6',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '2px 0 10px 0',
                  }}
                >
                  {isExpanded ? '접기 ▲' : '더보기 ▼'}
                </button>
              )}

              {/* 좋아요 반응 바 */}
              <div
                style={{
                  display: 'flex',
                  gap: 16,
                  alignItems: 'center',
                  paddingTop: 10,
                  marginTop: 6,
                  borderTop: '1px solid #F8FAFC',
                }}
              >
                <button
                  onClick={() => handleLikeClick(memo.id)}
                  style={{
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: memo.isLiked ? '#EF4444' : '#94A3B8',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {memo.isLiked ? '❤️' : '🤍'} {memo.likes || 0}
                </button>
              </div>
            </div>
          );
        })}

        {filteredMemos.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 0',
              color: '#94A3B8',
              fontSize: 14,
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              border: '1px solid #E2E8F0',
            }}
          >
            등록된 포스트가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
