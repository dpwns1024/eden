'use client';

import { useState, useEffect } from 'react';

export interface MemoItem {
  id: string;
  category: string;
  content: string;
  date: string;
}

const CATEGORIES = ['전체', '공지', 'ORIGINAL', '설정', '합작', '기타'];

const INITIAL_MEMOS: MemoItem[] = [
  {
    id: 'memo-1',
    category: '기타',
    content: `이미지만들어줘: 채팅 지문 그대로 복붙하고 하단에 이거 붙여서 보냄 (지피티랑 잼이나이! 근데 지피티가 좀더 취향이었음)\n\nPremium editorial flat lay lookbook photography, perfect 90-degree top-down view. Select only the clothing and a few carefully chosen personal belongings that best represent the character. Do NOT illustrate every item from the description. Curate the layout like a professional stylist.`,
    date: '2026.08.09',
  },
  {
    id: 'memo-2',
    category: 'ORIGINAL',
    content: `내용 : npc와 pc는 다른 시간선에 살고 있습니다(npc의 1일[첫만남] / pc의 30일[연애 중]. 이게 반대가 된다는 내용이라 오푸스로 하면 많이 먹먹합니다, 개인적으로 젬이오로 했는데도 좋았습니다!\n\n[처음]\nooc: 이전 스토리를 종료하고 새로운 IF 세계관으로 진행한다.\n\nNPC는 우연히 자신의 이상형인 PC를 만나 첫눈에 반한다. 이름을 묻고, 함께 보내는 시간이 늘어날수록 서로의 거리는 가까워진다. 그러나 행복한 순간들 속에서 PC는 가끔 이유를 알 수 없는 슬픈 표정을 짓거나, 이별을 앞둔 사람처럼 행동한다.`,
    date: '2026.08.09',
  },
  {
    id: 'memo-3',
    category: '설정',
    content: `*[OOC: 이전 롤플레이응 중단 및 신규 에피소드 출력\n지금부터 {{char}}와 {{user}}의 사복 스타일링에 대한 디테일한 분석과 에피소드를 전개하라. 아래 내용들을 {{char}}와 {{user}}의 기존 캐릭터 설정, 로어북, 쌓아온 서사, 기억을 100% 반영하여 절대 캐릭터 붕괴 없이 본래 성격과 말투에 맞게 디테일하게 출력할 것.`,
    date: '2026.08.09',
  },
];

export default function MemoPage() {
  const [memos, setMemos] = useState<MemoItem[]>([]);
  const [mounted, setMounted] = useState(false);

  const [selectedCat, setSelectedCat] = useState('전체');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inputCategory, setInputCategory] = useState('공지');
  const [inputContent, setInputContent] = useState('');

  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('ohome_grid_memos_v6');
      if (saved) {
        setMemos(JSON.parse(saved));
      } else {
        setMemos(INITIAL_MEMOS);
      }
    } catch {
      setMemos(INITIAL_MEMOS);
    }
  }, []);

  const saveMemos = (newList: MemoItem[]) => {
    setMemos(newList);
    try {
      localStorage.setItem('ohome_grid_memos_v6', JSON.stringify(newList));
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
    setInputCategory(memo.category || '공지');
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
    <div style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'sans-serif' }}>
      {/* 1. 컨트롤 바 (상단 배너 좌우 폭에 정확히 일치) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          width: '100%',
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
              setInputCategory('공지');
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

      {/* 2. 작성 / 수정 폼 */}
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

      {/* 3. 메모 카드 그리드 (배너 폭을 정확히 3등분하여 100% 꽉 채움) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          alignItems: 'start',
          width: '100%',
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
            선택한 카테고리에 메모가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
