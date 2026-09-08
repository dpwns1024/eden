'use client';

import { useState, useEffect } from 'react';

export interface MemoItem {
  id: string;
  content: string;
  date: string;
}

// 초기 샘플 데이터 (보내주신 스크린샷의 내용)
const INITIAL_MEMOS: MemoItem[] = [
  {
    id: 'memo-1',
    content: `이미지만들어줘: 채팅 지문 그대로 복붙하고 하단에 이거 붙여서 보냄 (지피티랑 잼이나이! 근데 지피티가 좀더 취향이었음)\n\nPremium editorial flat lay lookbook photography, perfect 90-degree top-down view. Select only the clothing and a few carefully chosen personal belongings that best represent the character. Do NOT illustrate every item from the description. Curate the layout like a professional stylist. Prioritize storytelling over quantity. Arrange each garment individually instead of forming a complete outfit or human silhouette. Use relaxed wrinkles, slight overlaps, soft folds, rotated angles, and natural asymmetry to create an effortless editorial composition with generous negative space. Choose a simple background and lighting that naturally fit the character and mood. No unrelated objects or furniture. Ultra-realistic fabric textures, premium lifestyle magazine styling, subtle imperfections, soft realistic shadows, clean composition, 8k detail.`,
    date: '2026.08.09',
  },
  {
    id: 'memo-2',
    content: `내용 : npc와 pc는 다른 시간선에 살고 있습니다(npc의 1일[첫만남] / pc의 30일[연애 중]. 이게 반대가 된다는 내용이라 오푸스로 하면 많이 먹먹합니다, 개인적으로 젬이오로 했는데도 좋았습니다!\n\n[처음]\nooc: 이전 스토리를 종료하고 새로운 IF 세계관으로 진행한다.\n\nNPC는 우연히 자신의 이상형인 PC를 만나 첫눈에 반한다. 이름을 묻고, 함께 보내는 시간이 늘어날수록 서로의 거리는 가까워진다. 그러나 행복한 순간들 속에서 PC는 가끔 이유를 알 수 없는 슬픈 표정을 짓거나, 이별을 앞둔 사람처럼 행동한다.\n\nNPC는 이유를 알지 못한 채 평범한 연애를 이어가지만, NPC 기준 15일째, PC는 더 이상 진실을 숨길 수 없다고 판단하고 자신의 비밀을 털어놓는다.\n\nPC와 NPC는 서로 반대 방향으로 시간을 살아가고 있었다. NPC에게 내일인 하루는 PC에게는 어제가 되며, NPC에게 앞으로 만들어질 추억은 PC에게 이미 지나간 과거였다.\n\nPC는 앞으로 하루가 지나갈 때마다 NPC와 함께한 기억을 하나씩 잃게 되고, NPC 기준 30일째에는 NPC와 관련된 모든 추억을 완전히 잊게 된다. 하지만 NPC는 끝까지 모든 시간을 기억한 채 마지막 날을 맞이하게 된다`,
    date: '2026.08.09',
  },
  {
    id: 'memo-3',
    content: `*[OOC: 이전 롤플레이응 중단 및 신규 에피소드 출력\n지금부터 {{char}}와 {{user}}의 사복 스타일링에 대한 디테일한 분석과 에피소드를 전개하라. 아래 내용들을 {{char}}와 {{user}}의 기존 캐릭터 설정, 로어북, 쌓아온 서사, 기억을 100% 반영하여 절대 캐릭터 붕괴 없이 본래 성격과 말투에 맞게 디테일하게 출력할 것.\n1. 캐릭터별 사복 스타일 분석 (최소 3개 이상의 독창적인 상황/배경 설정):\n- 상황 및 배경 창작: AI는 특정 예시에 구애받지 말고, 캐릭터의 세계관, 직업, 라이프스타일, 로어북 서사에 완벽히 어울리는 다양하고 극적인 배경(예: 사적 모임, 한밤중의 산책, 전투상황, 계절감이 극명한 야외, 완전한 휴식 등)을 최소 3개 이상 자유롭게 창작해 설정할 것.`,
    date: '2026.08.09',
  },
];

export default function MemoPage() {
  const [memos, setMemos] = useState<MemoItem[]>([]);
  const [mounted, setMounted] = useState(false);

  // 작성 및 수정 상태
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inputContent, setInputContent] = useState('');

  // 브라우저 로컬스토리지 불러오기
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('ohome_grid_memos');
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
      localStorage.setItem('ohome_grid_memos', JSON.stringify(newList));
    } catch (e) {
      console.error(e);
    }
  };

  // 메모 저장/수정
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
        m.id === editingId ? { ...m, content: inputContent.trim() } : m
      );
      saveMemos(updated);
    } else {
      // 신규 등록
      const newMemo: MemoItem = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        content: inputContent.trim(),
        date: dateStr,
      };
      saveMemos([newMemo, ...memos]);
    }

    // 초기화
    setInputContent('');
    setEditingId(null);
    setIsFormOpen(false);
  };

  // 수정 버튼 클릭
  const handleEditClick = (memo: MemoItem) => {
    setEditingId(memo.id);
    setInputContent(memo.content);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 삭제 버튼 클릭
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

  if (!mounted) return null;

  return (
    <div style={{ maxWidth: 1140, margin: '0 auto', padding: '30px 20px', fontFamily: 'sans-serif' }}>
      {/* 1. 상단 헤더 영역 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <div
          style={{
            backgroundColor: '#EBECEE',
            padding: '6px 16px',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 600,
            color: '#55585D',
          }}
        >
          총 {memos.length}개
        </div>

        <button
          onClick={() => {
            if (isFormOpen) {
              handleCancelForm();
            } else {
              setEditingId(null);
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

      {/* 2. 작성 / 수정 입력 폼 */}
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
          <div style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 12 }}>
            {editingId ? '메모 수정' : '새 메모 작성'}
          </div>
          <textarea
            value={inputContent}
            onChange={(e) => setInputContent(e.target.value)}
            placeholder="메모를 입력하세요..."
            rows={7}
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

      {/* 3. 메모 카드 그리드 (3열) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 20,
          alignItems: 'start',
        }}
      >
        {memos.map((memo) => (
          <div
            key={memo.id}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: '22px 20px',
              border: '1px solid #ECEEEF',
              boxShadow: '0 4px 18px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 200,
            }}
          >
            {/* 메모 본문 내용 */}
            <div
              style={{
                fontSize: 13.5,
                lineHeight: 1.65,
                color: '#333333',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                marginBottom: 20,
              }}
            >
              {memo.content}
            </div>

            {/* 하단 날짜 & 수정/삭제 버튼 */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: 12,
                borderTop: '1px solid #F3F4F6',
                marginTop: 'auto',
              }}
            >
              <span style={{ fontSize: 12, color: '#A0A5AA' }}>{memo.date}</span>

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => handleEditClick(memo)}
                  style={{
                    border: 'none',
                    backgroundColor: '#F3F4F6',
                    color: '#6B7280',
                    fontSize: 12,
                    padding: '3px 10px',
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
                    fontSize: 12,
                    padding: '3px 10px',
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

        {memos.length === 0 && (
          <div
            style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '80px 0',
              color: '#9CA3AF',
              fontSize: 14,
            }}
          >
            등록된 메모가 없습니다. [+ 새 메모]를 눌러 작성해 보세요!
          </div>
        )}
      </div>
    </div>
  );
}
