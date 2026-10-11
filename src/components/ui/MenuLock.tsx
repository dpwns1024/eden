'use client';
// 비밀번호 메뉴 입구 — 비밀번호 대조는 서버(Firestore 보안 규칙)가 한다 (lib/menuLock.ts)
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { backend } from '@/lib/backend';
import { lockKeyOf } from '@/lib/menuLock';
import { PageTitle } from '@/components/ui/PageText';
import { KInput } from '@/components/ui/Kit';
import { boardSkin } from '@/lib/boardSkin';

/** 이 잠긴 메뉴를 지금 볼 수 있는가 — 회원·관리자는 항상, 방문자는 비밀번호를 통과했을 때만.
 *  lockHref = 이 주소를 다스리는 잠긴 메뉴 (governingLock) — null이면 잠기지 않은 곳 */
export function useLockOpen(lockHref: string | null): 'loading' | 'open' | 'locked' {
  const { user, ready } = useAuth();
  const [unlocked, setUnlocked] = useState<string[] | null>(null);
  const needCheck = !!lockHref && ready && !user;
  useEffect(() => {
    if (!needCheck) return;
    let alive = true;
    const be = backend();
    if (!be) { setUnlocked([]); return; }
    be.unlockedLocks().then(l => { if (alive) setUnlocked(l); }).catch(() => { if (alive) setUnlocked([]); });
    return () => { alive = false; };
  }, [needCheck]);
  if (!lockHref) return 'open';
  if (!ready) return 'loading';
  if (user) return 'open';
  if (unlocked === null) return 'loading';
  return unlocked.includes(lockKeyOf(lockHref)) ? 'open' : 'locked';
}

export function MenuLockScreen({ lockHref, title }: { lockHref: string; title: string }) {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  // 게시판 디자인 ARCH면 요원 말투 (로그인 화면과 같은 결)
  const [arch, setArch] = useState(false);
  useEffect(() => { setArch(boardSkin() === 'arch'); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw || busy) return;
    const be = backend();
    if (!be) { setErr('서버에 연결돼 있지 않습니다.'); return; }
    setBusy(true); setErr('');
    const r = await be.unlockLock(lockKeyOf(lockHref), pw);
    if (r.ok) { window.location.reload(); return; }
    setErr(r.error ?? '열지 못했습니다.');
    setBusy(false);
  };

  return (
    <section className="page page-arch page-lock">
      <div className="page-head"><PageTitle>{title}</PageTitle><p>비밀번호가 걸린 메뉴입니다</p></div>
      <form className="panel board-lock" onSubmit={submit}>
        <svg className="board-lock-ic" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4.5" y="10.5" width="15" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="12" cy="15.5" r="1.4" fill="currentColor" />
        </svg>
        <b>비밀번호 입력</b>
        <small>{arch ? '정식 요원은 로그인하면 비밀번호 없이 볼 수 있습니다' : '회원은 로그인하면 비밀번호 없이 볼 수 있습니다'}</small>
        <KInput type="password" value={pw} autoFocus placeholder="비밀번호"
          onChange={e => { setPw(e.target.value); setErr(''); }} />
        {err && <p className="board-lock-err">{err}</p>}
        <button type="submit" className="btn btn-dark" disabled={busy || !pw}>{busy ? '확인 중…' : '입장'}</button>
      </form>
    </section>
  );
}
