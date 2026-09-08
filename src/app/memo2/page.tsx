'use client';

import { useState, useEffect } from 'react';

export interface MemoItem {
  id: string;
  category: string;
  content: string;
  date: string;
}

// 1. 요청하신 카테고리 구성 (OOC / 프롬 / 기타)
const CATEGORIES = ['전체', 'OOC', '프롬', '기타'];
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

  // 이전 키에 저장되어 날아간 사용자 메모를 자동으로 복구하는 초기화 로직
  useEffect(() => {
    setMounted(true);
    
    // 이전에 변경되었던 모든 저장소 키 탐색
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
      setMemos(recoveredData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recoveredData));
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

    if (editingId) {
      const updated = memos.map((m) =>
        m.id === editingId
          ? { ...m, category: inputCategory, content: inputContent.trim() }
          : m
      );
      saveMemos(updated);
    } else {
      const newMemo: MemoItem = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        category: inputCategory,
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
    setInputCategory(memo.category || 'OOC');
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
    // 상단 배너와 100% 동일한 컨테이너 폭 유지
    <div style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'sans-serif' }}>
      
      {/* 1. 상단 컨트롤 바 (왼쪽 끝 = 배너 왼쪽 끝, 오른쪽 끝 = 배너 오른쪽 끝) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              backgroundColor: '#EBECEE',
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 12.5,
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
              padding: 4,
              borderRadius: 14,
            }}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCat === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCat(cat)}
                  style={{
                    padding: '5px 14px',
                    borderRadius: 10,
                    border: 'none',
                    fontSize: 12,
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
            padding: '7px 16px',
            borderRadius: 20,
            border: '1px solid #D8DCE0',
            backgroundColor: '#FFFFFF',
            fontSize: 12.5,
            fontWeight: 600,
            color: '#44484E',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          {isFormOpen ? '✕ 닫기' : '+ 새 메모'}
        </button>
      </div>

      {/* 2. 작성/수정 폼 */}
      {isFormOpen && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            border: '1px solid #E5E7EB',
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>
              {editingId ? '메모 수정' : '새 메모 작성'}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12.5, color: '#666' }}>카테고리:</span>
              <select
                value={inputCategory}
                onChange={(e) => setInputCategory(e.target.value)}
                style={{
                  padding: '5px 10px',
                  borderRadius: 8,
                  border: '1px solid #D1D5DB',
                  fontSize: 12.5,
                  backgroundColor: '#FFF',
                  outline: 'none',
                }}
              >
                {CATEGORIES.filter((c) => c !== '전체').map((cat) => (
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
            rows={5}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 8,
              border: '1px solid #D1D5DB',
              fontSize: 13,
              lineHeight: 1.6,
              boxSizing: 'border-box',
              resize: 'vertical',
              marginBottom: 12,
              fontFamily: 'inherit',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              onClick={handleCancelForm}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: '#F3F4F6',
                color: '#4B5563',
                fontSize: 12.5,
                cursor: 'pointer',
              }}
            >
              취소
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: '#374151',
                color: '#FFFFFF',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {editingId ? '수정 완료' : '저장'}
            </button>
          </div>
        </div>
      )}

      {/* 3. 메모 카드 그리드 (배너 폭을 넘지 않는 안전 규격) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 16,
          alignItems: 'start',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {filteredMemos.map((memo) => {
          const isExpanded = !!expandedIds[memo.id];
          const isLongContent = memo.content.length > 80 || memo.content.split('\n').length > 4;

          return (
            <div
              key={memo.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: '18px 16px 14px 16px',
                border: '1px solid #ECEEEF',
                boxShadow: '0 4px 16px rgba(0,0,0,0.025)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxSizing: 'border-box',
                minWidth: 0, // 텍스트 오버플로우 방지
              }}
            >
              <div>
                <div style={{ marginBottom: 10 }}>
                  <span
                    style={{
                      border: '1px solid #B0B7C0',
                      color: '#606770',
                      fontSize: 10.5,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 10,
                    }}
                  >
                    {memo.category || '기타'}
                  </span>
                </div>

                {/* 본문 높이 고정 & 더보기/접기 */}
                <div
                  style={{
                    position: 'relative',
                    maxHeight: isExpanded ? 'none' : '140px',
                    overflow: 'hidden',
                    transition: 'max-height 0.25s ease',
                  }}
                >
                  <div
                    style={{
                      fontSize: 12.5,
                      lineHeight: 1.6,
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
                        height: 36,
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
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '4px 0 0 0',
                    }}
                  >
                    {isExpanded ? '접기 ▲' : '더보기 ▼'}
                  </button>
                )}
              </div>

              {/* 카드 하단 정보 */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: 10,
                  marginTop: 10,
                  borderTop: '1px solid #F3F4F6',
                }}
              >
                <span style={{ fontSize: 11, color: '#A0A5AA' }}>{memo.date}</span>

                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => handleEditClick(memo)}
                    style={{
                      border: 'none',
                      backgroundColor: '#F3F4F6',
                      color: '#6B7280',
                      fontSize: 11,
                      padding: '2px 7px',
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
                      fontSize: 11,
                      padding: '2px 7px',
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
              padding: '60px 0',
              color: '#9CA3AF',
              fontSize: 13.5,
            }}
          >
            등록된 메모가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
