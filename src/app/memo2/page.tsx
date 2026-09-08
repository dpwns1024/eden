'use client';

import { useState, useEffect } from 'react';

export interface BoardPost {
  id: string;
  title: string;
  category: string;
  content: string;
  author: string;
  date: string;
}

const CATEGORIES = ['전체', '잡담', '정보', '질문', '글귀', '메모'];

const INITIAL_POSTS: BoardPost[] = [
  {
    id: 'post-1',
    title: '게시판이 새로 개설되었습니다 🎉',
    category: '정보',
    author: '관리자',
    content: '자유롭게 글과 메모를 남길 수 있는 새 게시판입니다.\n상단의 [✍️ 새 글 쓰기] 버튼을 눌러 글을 작성해 보세요.',
    date: '2026.09.08',
  },
  {
    id: 'post-2',
    title: '프롬프트 및 메모 보관용',
    category: '글귀',
    author: '익명',
    content: 'Premium editorial flat lay lookbook photography, perfect 90-degree top-down view.',
    date: '2026.09.08',
  },
];

export default function BoardPage() {
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [mounted, setMounted] = useState(false);

  // 검색 및 필터
  const [selectedCat, setSelectedCat] = useState('전체');
  const [search, setSearch] = useState('');

  // 새 글 쓰기 폼
  const [isWriting, setIsWriting] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('잡담');
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');

  // 게시글 열기/접기 (ID 저장)
  const [openPostId, setOpenPostId] = useState<string | null>('post-1');

  // 로컬스토리지 불러오기
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('ohome_board_posts');
      if (saved) {
        setPosts(JSON.parse(saved));
      } else {
        setPosts(INITIAL_POSTS);
      }
    } catch {
      setPosts(INITIAL_POSTS);
    }
  }, []);

  const savePosts = (newPosts: BoardPost[]) => {
    setPosts(newPosts);
    try {
      localStorage.setItem('ohome_board_posts', JSON.stringify(newPosts));
    } catch (e) {
      console.error(e);
    }
  };

  // 글 등록
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 모두 입력해 주세요.');
      return;
    }

    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

    const newPost: BoardPost = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      title: title.trim(),
      category,
      author: author.trim() || '익명',
      content: content.trim(),
      date: dateStr,
    };

    const updated = [newPost, ...posts];
    savePosts(updated);

    // 폼 초기화
    setTitle('');
    setContent('');
    setAuthor('');
    setIsWriting(false);
    setOpenPostId(newPost.id); // 작성한 글 바로 열어주기
  };

  // 글 삭제
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('이 게시글을 삭제하시겠습니까?')) {
      const updated = posts.filter((p) => p.id !== id);
      savePosts(updated);
      if (openPostId === id) setOpenPostId(null);
    }
  };

  // 카테고리 & 검색어 필터링
  const filteredPosts = posts.filter((p) => {
    const matchCat = selectedCat === '전체' || p.category === selectedCat;
    const matchSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.content.toLowerCase().includes(search.toLowerCase()) ||
      p.author.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  if (!mounted) return <div style={{ padding: 40, textAlign: 'center' }}>로딩 중...</div>;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '30px 20px', fontFamily: 'sans-serif' }}>
      {/* 1. 헤더 영역 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#1a202c' }}>게시판</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#718096' }}>
            총 <strong style={{ color: '#3182ce' }}>{filteredPosts.length}</strong>개의 글이 있습니다.
          </p>
        </div>
        <button
          onClick={() => setIsWriting(!isWriting)}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            border: 'none',
            backgroundColor: isWriting ? '#718096' : '#2b6cb0',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: 13.5,
            cursor: 'pointer',
          }}
        >
          {isWriting ? '✕ 작성 취소' : '✍️ 새 글 쓰기'}
        </button>
      </div>

      {/* 2. 글 작성 폼 */}
      {isWriting && (
        <form
          onSubmit={handleSubmit}
          style={{
            backgroundColor: '#f7fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 20,
            marginBottom: 24,
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#2d3748' }}>새 게시글 작성</h3>

          <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            {/* 카테고리 선택 */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                padding: '9px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e0',
                fontSize: 13,
                backgroundColor: '#fff',
              }}
            >
              {CATEGORIES.filter((c) => c !== '전체').map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* 작성자 입력 */}
            <input
              type="text"
              placeholder="작성자 이름 (선택)"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              style={{
                flex: 1,
                minWidth: 140,
                padding: '9px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e0',
                fontSize: 13,
              }}
            />
          </div>

          {/* 제목 입력 */}
          <input
            type="text"
            placeholder="제목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 6,
              border: '1px solid #cbd5e0',
              fontSize: 14,
              marginBottom: 12,
              boxSizing: 'border-box',
            }}
          />

          {/* 본문 입력 */}
          <textarea
            placeholder="내용을 입력하세요..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 6,
              border: '1px solid #cbd5e0',
              fontSize: 13.5,
              lineHeight: 1.6,
              marginBottom: 16,
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />

          <div style={{ textAlign: 'right' }}>
            <button
              type="submit"
              style={{
                padding: '9px 24px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: '#2b6cb0',
                color: '#fff',
                fontWeight: 600,
                fontSize: 13.5,
                cursor: 'pointer',
              }}
            >
              등록하기
            </button>
          </div>
        </form>
      )}

      {/* 3. 검색 및 카테고리 필터 */}
      <div
        style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        {/* 카테고리 탭 */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: 'none',
                fontSize: 12.5,
                fontWeight: selectedCat === cat ? 700 : 500,
                cursor: 'pointer',
                backgroundColor: selectedCat === cat ? '#2d3748' : '#edf2f7',
                color: selectedCat === cat ? '#ffffff' : '#4a5568',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 검색창 */}
        <input
          type="text"
          placeholder="검색어 입력..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid #cbd5e0',
            fontSize: 12.5,
            width: 180,
          }}
        />
      </div>

      {/* 4. 게시글 목록 */}
      <div style={{ borderTop: '2px solid #2d3748' }}>
        {filteredPosts.map((post) => {
          const isOpen = openPostId === post.id;

          return (
            <div
              key={post.id}
              style={{
                borderBottom: '1px solid #e2e8f0',
                backgroundColor: isOpen ? '#f7fafc' : '#ffffff',
                transition: 'background-color 0.15s ease',
              }}
            >
              {/* 글 한 줄 요약 헤더 (클릭 시 열림) */}
              <div
                onClick={() => setOpenPostId(isOpen ? null : post.id)}
                style={{
                  padding: '16px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'space-between',
                  cursor: 'pointer',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden', flex: 1 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 4,
                      backgroundColor: '#e2e8f0',
                      color: '#4a5568',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {post.category}
                  </span>
                  <span
                    style={{
                      fontSize: 14.5,
                      fontWeight: isOpen ? 700 : 500,
                      color: '#2d3748',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {post.title}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: '#a0aec0' }}>
                  <span>{post.author}</span>
                  <span>{post.date}</span>
                  <button
                    onClick={(e) => handleDelete(post.id, e)}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#e53e3e',
                      fontSize: 12,
                      cursor: 'pointer',
                      padding: '2px 6px',
                    }}
                  >
                    삭제
                  </button>
                </div>
              </div>

              {/* 클릭 시 펼쳐지는 본문 내용 */}
              {isOpen && (
                <div
                  style={{
                    padding: '0 16px 20px 16px',
                    fontSize: 13.5,
                    lineHeight: 1.7,
                    color: '#2d3748',
                    whiteSpace: 'pre-wrap',
                    borderTop: '1px dashed #e2e8f0',
                    marginTop: 4,
                    paddingTop: 16,
                  }}
                >
                  {post.content}
                </div>
              )}
            </div>
          );
        })}

        {filteredPosts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '50px 0', color: '#a0aec0', fontSize: 13 }}>
            게시글이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
