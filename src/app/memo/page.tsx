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
  { id: 'quote', label: '❞ 글귀' },
  { id: 'image', label: '📷 이미지' },
  { id: 'video', label: '▶ 영상' },
  { id: 'link', label: '🔗 링크' },
  { id: 'memo', label: '📝 일반' },
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
    content: `내용 : npc와 pc는 다른 시간선에 살고 있습니다(npc의 1일[첫만남] / pc의 30일[연애 중]). 이게 반대가 된다는 내용이라 오푸스로 하면 많이 먹먹합니다. 개인적으로 젬이오로 했을 때도 좋았습니다!\n\n[처음]\nooc: 이전 스토리를 종료하고 새로운 IF 세계관으로 진행한다.`,
    source: '',
    date: '2026.08.09',
  },
];

export default function MemoPage() {
  const auth = useAuth() || {};
  const user = auth.user;
  const isAdmin = auth.isAdmin;

  // useToast 호출 타입 차이로 인한 에러 방지 안전장치
  const toastObj = useToast();
  const notify = (msg: string) => {
    try {
      if (typeof toastObj === 'function') {
        (toastObj as any)(msg);
      } else if (toastObj && typeof (toastObj as any).toast === 'function') {
        (toastObj as any).toast(msg);
      } else if (toastObj && typeof (toastObj as any).addToast === 'function') {
        (toastObj as any).addToast(msg);
      }
    } catch (e) {
      console.log(msg);
    }
  };

  const [memos, setMemos] = useState<MemoItem[]>([]);
  const [mounted, setMounted] = useState(false);

  const [selectedCat, setSelectedCat] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formCat, setFormCat] = useState('quote');
  const [content, setContent] = useState('');
  const [source, setSource] = useState('');

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // 로컬스토리지 불러오기 (SSR 하이드레이션 오류 완벽 방지)
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('ohome.memos.v1');
      if (saved) {
        setMemos(JSON.parse(saved));
      } else {
        setMemos(INITIAL_MEMOS);
      }
    } catch {
      setMemos(INITIAL_MEMOS);
    }
  }, []);

  const saveMemos = (nextMemos: MemoItem[]) => {
    setMemos(nextMemos);
    try {
      localStorage.setItem('ohome.memos.v1', JSON.stringify(nextMemos));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddMemo = () => {
    if (!content.trim()) {
      notify('메모 내용을 입력해 주세요.');
      return;
    }

    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

    const newMemo: MemoItem = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      category: formCat,
      content: content.trim(),
      source: source.trim(),
      date: dateStr,
      authorId: user?.id || '',
    };

    saveMemos([newMemo, ...memos]);
    setContent('');
    setSource('');
    setIsFormOpen(false);
    notify('새 메모가 등록되었습니다.');
  };

  const handleDelete = () => {
    if (!deleteTargetId) return;
    saveMemos(memos.filter((m) => m.id !== deleteTargetId));
    setDeleteTargetId(null);
    notify('메모가 삭제되었습니다.');
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

  if (!mounted) return <section className="page" />;

  return (
    <section className="page" style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px' }}>
      {/* 타이틀 및 상단 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <PageTitle>MEMO</PageTitle>
          <span
            style={{
              padding: '4px 12px',
              borderRadius: 999,
              backgroundColor: 'var(--bg-sub, rgba(0,0,0,0.05))',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--faint, #666)',
            }}
          >
            총 {filteredMemos.length}개
          </span>
        </div>
        <button
          className="btn btn-dark"
          onClick={() => setIsFormOpen(!isFormOpen)}
          style={{ padding: '8px 20px', borderRadius: 999, fontSize: 13, cursor: 'pointer' }}
        >
          {isFormOpen ? '✕ 닫기' : '+ 새 메모'}
        </button>
      </div>

      {/* 작성 폼 (상단 펼침) */}
      {isFormOpen && (
        <div
          className="panel"
          style={{
            padding: 24,
            marginBottom: 24,
            borderRadius: 20,
            backgroundColor: 'var(--panel-bg, #ffffff)',
            border: '1px solid var(--line, rgba(0,0,0,0.08))',
          }}
        >
          {/* 카테고리 태그 선택 */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFormCat(cat.id)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 999,
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: formCat === cat.id ? 'var(--accent, #50688c)' : 'var(--bg-sub, #f0f2f5)',
                  color: formCat === cat.id ? '#ffffff' : 'var(--faint, #555)',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* 본문 입력창 */}
          <textarea
            placeholder="기록하고 싶은 내용을 입력하세요..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 12,
              border: '1px solid var(--line, #e2e8f0)',
              backgroundColor: 'var(--bg-sub, #f8fafc)',
              color: 'var(--fg, #1a202c)',
              fontSize: 13.5,
              lineHeight: 1.6,
              resize: 'vertical',
              outline: 'none',
              marginBottom: 10,
              boxSizing: 'border-box',
            }}
          />

          {/* 출처 입력창 */}
          <input
            type="text"
            placeholder="출처 (작가, 책 제목 등 — 선택)"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 12,
              border: '1px solid var(--line, #e2e8f0)',
              backgroundColor: 'var(--bg-sub, #f8fafc)',
              color: 'var(--fg, #1a202c)',
              fontSize: 13,
              outline: 'none',
              marginBottom: 18,
              boxSizing: 'border-box',
            }}
          />

          {/* 취소 / 등록 버튼 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setIsFormOpen(false)}
              style={{ padding: '8px 20px', borderRadius: 999, fontSize: 13, cursor: 'pointer' }}
            >
              취소
            </button>
            <button
              type="button"
              className="btn btn-dark"
              onClick={handleAddMemo}
              style={{ padding: '8px 24px', borderRadius: 999, fontSize: 13, cursor: 'pointer' }}
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
              fontSize: 12.5,
              fontWeight: selectedCat === cat.id ? 700 : 500,
              cursor: 'pointer',
              backgroundColor: selectedCat === cat.id ? 'var(--accent, #50688c)' : 'var(--bg-sub, #f0f2f5)',
              color: selectedCat === cat.id ? '#ffffff' : 'var(--faint, #666)',
              transition: 'all 0.15s ease',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 메모 카드 목록 (그리드 레이아웃) */}
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

          return (
            <div
              key={item.id}
              className="panel"
              style={{
                padding: '20px 22px',
                borderRadius: 18,
                backgroundColor: 'var(--panel-bg, #ffffff)',
                border: '1px solid var(--line, rgba(0,0,0,0.06))',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
              }}
            >
              {/* 카테고리 및 날짜 */}
              <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    padding: '3px 9px',
                    borderRadius: 6,
                    backgroundColor: 'var(--bg-sub, #f0f2f5)',
                    color: 'var(--faint, #555)',
                  }}
                >
                  {categoryObj?.label || '기타'}
                </span>
                <span style={{ fontSize: 11.5, color: 'var(--faint, #999)' }}>{item.date}</span>
              </div>

              {/* 본문 (접기/펴기 적용) */}
              <div
                style={{
                  fontSize: 13.5,
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

                {/* 긴 글 일때 하단 블러 그라데이션 */}
                {isLongText && !isExpanded && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 45,
                      background: 'linear-gradient(transparent, var(--panel-bg, #ffffff))',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </div>

              {/* 더보기 / 접기 버튼 */}
              {isLongText && (
                <button
                  type="button"
                  onClick={() => toggleExpand(item.id)}
                  style={{
                    marginTop: 8,
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent, #50688c)',
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

              {/* 하단 출처 및 삭제 */}
              <div
                style={{
                  marginTop: 16,
                  paddingTop: 12,
                  borderTop: '1px solid var(--line, rgba(0,0,0,0.06))',
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--faint, #777)', fontStyle: 'italic' }}>
                  {item.source ? `— ${item.source}` : ''}
                </span>

                {(isAdmin || !item.authorId || (user && item.authorId === user.id)) && (
                  <button
                    type="button"
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

      {/* 등록된 메모가 없을 때 */}
      {filteredMemos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--faint, #999)' }}>
          <p style={{ fontSize: 13 }}>등록된 메모가 없습니다.</p>
        </div>
      )}

      {/* 삭제 확인 모달 */}
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
