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
    content: `이미지만들어줘: 채팅 지문 그대로 복붙하고 하단에 이거 붙여서 보냄 (지피티랑 잼이나이! 근데 지피티가 좀더 취향이었음)\n\nPremium editorial flat lay lookbook photography, perfect 90-degree top-down view.`,
    date: '2026.08.09',
  },
  {
    id: 'memo-2',
    category: 'ORIGINAL',
    content: `내용 : npc와 pc는 다른 시간선에 살고 있습니다(npc의 1일[첫만남] / pc의 30일[연애 중].\n\n[처음]\nooc: 이전 스토리를 종료하고 새로운 IF 세계관으로 진행한다.`,
    date: '2026.08.09',
  },
  {
    id: 'memo-3',
    category: '설정',
    content: `*[OOC: 이전 롤플레이응 중단 및 신규 에피소드 출력\n지금부터 {{char}}와 {{user}}의 사복 스타일링에 대한 디테일한 분석과 에피소드를 전개하라.`,
    date: '2026.08.09',
  },
];

export default function MemoPage() {
  const [memos, setMemos] = useState<MemoItem[]>([]);
  const [mounted, setMounted] = useState(false);

  // 카테고리 필터
  const [selectedCat, setSelectedCat] = useState('전체');

  // 작성/수정 폼 상태
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inputCategory, setInputCategory] = useState('공지');
  const [inputContent, setInputContent] = useState('');

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('ohome_grid_memos_v2');
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
      localStorage.setItem('ohome_grid_memos_v2', JSON.stringify(newList));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = () => {
    if (!inputContent.trim()) {
      alert('메모 내용을 입력해 주세요.');
      return;
    }

    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

    if (editingId) {
      // 수정
      const updated = memos.map((m) =>
        m.id === editingId
          ? { ...m, category: inputCategory, content: inputContent.trim() }
          : m
      );
      saveMemos(updated);
    } else {
      // 등록
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

  // 선택된 카테고리에 맞는 메모만 필터링
  const filteredMemos = memos.filter(
    (m) => selectedCat === '전체' || m.category === selectedCat
  );

  if (!mounted) return null;

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '30px 20px', fontFamily: 'sans-serif' }}>
      {/* 1. 상단 컨트롤 영역 (카테고리 탭 / 개수 / 새 메모 버튼) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* 개수 태그 */}
          <div
            style={{
              backgroundColor: '#EBECEE',
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              color: '#55585D',
            }}
          >
            총 {filteredMemos.length}개
          </div>

          {/* 3번 스크린샷 스타일 카테고리 선택 바 */}
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
                    padding: '6px 16px',
                    borderRadius: 10,
                    border: 'none',
                    fontSize: 12.5,
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

        {/* 새 메모 버튼 */}
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
            padding: '8px 18px',
            borderRadius: 20,
            border: '1px solid #D8DCE0',
            backgroundColor: '#FFFFFF',
            fontSize: 13,
            fontWeight: 600,
            color: '#44484E',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          {isFormOpen ? '✕ 닫기' : '+ 새 메모'}
        </button>
      </div>

      {/* 2. 메모 작성 / 수정 폼 */}
      {isFormOpen && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 20,
            marginBottom: 24,
            border: '1px solid #E5E7EB',
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>
              {editingId ? '메모 수정' : '새 메모 작성'}
            </div>

            {/* 작성 폼 내부 카테고리 드롭다운 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#666' }}>카테고리:</span>
              <select
                value={inputCategory}
                onChange={(e) => setInputCategory(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid #D1D5DB',
                  fontSize: 13,
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
            rows={6}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 8,
              border: '1px solid #D1D5DB',
              fontSize: 13.5,
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
                padding: '7px 16px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: '#F3F4F6',
                color: '#4B5563',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              취소
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '7px 18px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: '#374151',
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {editingId ? '수정 완료' : '저장'}
            </button>
          </div>
        </div>
      )}

      {/* 3. 메모 카드 그리드 (한 줄에 5개 배치) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 16,
          alignItems: 'start',
        }}
      >
        {filteredMemos.map((memo) => (
          <div
            key={memo.id}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: '18px 16px',
              border: '1px solid #ECEEEF',
              boxShadow: '0 4px 18px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 220,
            }}
          >
            <div>
              {/* 카테고리 태그 */}
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

              {/* 메모 본문 내용 */}
              <div
                style={{
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: '#333333',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  marginBottom: 16,
                }}
              >
                {memo.content}
              </div>
            </div>

            {/* 하단 날짜 & 수정/삭제 버튼 */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: 10,
                borderTop: '1px solid #F3F4F6',
              }}
            >
              <span style={{ fontSize: 11.5, color: '#A0A5AA' }}>{memo.date}</span>

              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={() => handleEditClick(memo)}
                  style={{
                    border: 'none',
                    backgroundColor: '#F3F4F6',
                    color: '#6B7280',
                    fontSize: 11.5,
                    padding: '2px 8px',
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
                    fontSize: 11.5,
                    padding: '2px 8px',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredMemos.length === 0 && (
          <div
            style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '80px 0',
              color: '#9CA3AF',
              fontSize: 14,
            }}
          >
            선택한 카테고리에 메모가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
