'use client';
// 비밀번호 게시판 입구 — 비밀번호 대조는 서버(Firestore 보안 규칙)가 한다 (lib/boardLock.ts)
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { backend } from '@/lib/backend';
import { boardLockSupported } from '@/lib/boardLock';
import { PageTitle } from '@/components/ui/PageText';
import { KInput } from '@/components/ui/Kit';

/** 이 게시판을 지금 볼 수 있는가 — 회원·관리자는 항상, 방문자는 비밀번호를 통과했을 때만 */
export function useBoardOpen(board?: { id: string; locked?: boolean } | null): 'loading' | 'open' | 'locked' {
  const { user, ready } = useAuth();
  const [unlocked, setUnlocked] = useState<string[] | null>(null);
  const needCheck = !!board?.locked && boardLockSupported() && ready && !user;
  useEffect(() => {
    if (!needCheck) return;
    let alive = true;
    const be = backend();
    if (!be) { setUnlocked([]); return; }
    be.unlockedBoards().then(l => { if (alive) setUnlocked(l); }).catch(() => { if (alive) setUnlocked([]); });
    return () => { alive = false; };
  }, [needCheck]);
  if (!board) return 'loading';
  if (!board.locked || !boardLockSupported()) return 'open';
  if (!ready) return 'loading';
  if (user) return 'open';
  if (unlocked === null) return 'loading';
  return unlocked.includes(board.id) ? 'open' : 'locked';
}

export function BoardLockScreen({ boardId, title }: { boardId: string; title: string }) {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw || busy) return;
    const be = backend();
    if (!be) { setErr('서버에 연결돼 있지 않습니다.'); return; }
    setBusy(true); setErr('');
    const r = await be.unlockBoard(boardId, pw);
    if (r.ok) { window.location.reload(); return; }
    setErr(r.error ?? '열지 못했습니다.');
    setBusy(false);
  };

  return (
    <section className="page">
      <div className="page-head"><PageTitle>{title}</PageTitle><p>비밀번호가 걸린 게시판입니다</p></div>
      <form className="panel board-lock" onSubmit={submit}>
        <svg className="board-lock-ic" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4.5" y="10.5" width="15" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="12" cy="15.5" r="1.4" fill="currentColor" />
        </svg>
        <b>비밀번호 입력</b>
        <small>회원은 로그인하면 비밀번호 없이 볼 수 있습니다</small>
        <KInput type="password" value={pw} autoFocus placeholder="비밀번호"
          onChange={e => { setPw(e.target.value); setErr(''); }} />
        {err && <p className="board-lock-err">{err}</p>}
        <button type="submit" className="btn btn-dark" disabled={busy || !pw}>{busy ? '확인 중…' : '입장'}</button>
      </form>
    </section>
  );
}
