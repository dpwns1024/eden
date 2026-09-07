'use client';

// 상단 바 — 우측 알림(종) · 프로필만 남긴 투명 헤더
import React, { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useBlobUrl } from '@/lib/blobStore';
import { refreshPage } from '@/lib/pageRefresh';
import { KToggle } from '@/components/ui/Kit';
import {
  Notif, NotifType, NOTIF_EVENT, NOTIF_TYPE_LABEL,
  readNotifs, markRead, markAllRead, clearReadNotifs, notifSettings, setNotifSetting, syncNotifs,
} from '@/lib/notifStore';
import { subscribeTable } from '@/lib/db';

const BellIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M6 9.5a6 6 0 0 1 12 0c0 4.2 1.6 5.6 2.2 6.3H3.8C4.4 15.1 6 13.7 6 9.5Z" />
    <path d="M10 18.8a2.1 2.1 0 0 0 4 0" />
  </svg>
);

export function TopBar() {
  const { user, isAdmin, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const avatarSrc = useBlobUrl(user?.avatarUrl);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen && !notifOpen) return;
    const close = (e: MouseEvent) => {
      if (!userRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen, notifOpen]);

  // 알림 (4.13) — 발생 지점의 커스텀 이벤트로 갱신
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [notifVer, setNotifVer] = useState(0);
  useEffect(() => {
    const load = () => { setNotifs(readNotifs()); setNotifVer(v => v + 1); };
    load();
    window.addEventListener(NOTIF_EVENT, load);
    window.addEventListener('storage', load);
    return () => {
      window.removeEventListener(NOTIF_EVENT, load);
      window.removeEventListener('storage', load);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    void syncNotifs(user.id, true);
    const off = subscribeTable('notifications', () => void syncNotifs(user.id, true));
    const onFocus = () => void syncNotifs(user.id);
    window.addEventListener('focus', onFocus);
    return () => { off(); window.removeEventListener('focus', onFocus); };
  }, [user?.id]);

  const myNotifs = user ? notifs.filter(n => n.toUserId === user.id) : [];
  const unread = myNotifs.filter(n => !n.read);
  const fmtNd = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  const mySet = user ? notifSettings(user.id) : null;
  void notifVer;

  const nav = (href: string) => {
    const cur = pathname + window.location.search;
    if (href === cur) { refreshPage(); return; }
    router.push(href);
  };

  return (
    <header
      className="topbar"
      style={{
        background: 'transparent',
        backgroundColor: 'transparent',
        boxShadow: 'none',
        border: 'none',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
      }}
    >
      {/* 사용자 영역 — 비로그인: 로그인 버튼 / 로그인: 알림 + 프로필 드롭다운 */}
      {user ? (
        <div className="user-wrap" ref={userRef}>
          <div className="user-chip" onClick={() => setMenuOpen(o => !o)}>
            {/* 알림 종 */}
            <span
              className="badge-dot"
              data-n={String(Math.min(9, unread.length))}
              onClick={e => { e.stopPropagation(); setMenuOpen(false); setNotifOpen(o => !o); }}
            >
              <BellIcon />
            </span>
            {/* 프로필 아바타 */}
            <div
              className="avatar"
              style={!avatarSrc && user.avatarColor ? { background: user.avatarColor } : undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {avatarSrc && <img src={avatarSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            {user.nickname} <span style={{ fontSize: 9, color: '#8d939d' }}>▾</span>
          </div>

          {/* 알림 드롭다운 */}
          <div className={`user-menu notif-menu ${notifOpen ? 'open' : ''}`}>
            <div className="nh">
              <b>알림</b>
              {unread.length > 0 && (
                <button className="all" onClick={() => markAllRead(user.id)}>모두 읽음</button>
              )}
              {myNotifs.some(n => n.read) && (
                <button className="all" onClick={() => clearReadNotifs(user.id)}>읽은 알림 정리</button>
              )}
            </div>
            {myNotifs.length === 0 && <p className="empty">알림이 없습니다</p>}
            {myNotifs.slice(0, 12).map(n => (
              <button
                key={n.id}
                className={`nt ${n.read ? 'rd' : ''}`}
                onClick={() => { markRead(n.id); setNotifOpen(false); nav(n.href); }}
              >
                <b>{n.title}</b>
                {n.body && <span>{n.body}</span>}
                <small>{fmtNd(n.date)}</small>
              </button>
            ))}
            {mySet && (
              <div className="nset">
                {(Object.keys(NOTIF_TYPE_LABEL) as NotifType[])
                  .filter(k => k !== 'guest' || isAdmin)
                  .map(k => (
                    <label key={k} className="row">
                      <span>{NOTIF_TYPE_LABEL[k]}</span>
                      <KToggle checked={mySet[k]} onChange={v => setNotifSetting(user.id, k, v)} />
                    </label>
                  ))}
              </div>
            )}
          </div>

          {/* 프로필 드롭다운 */}
          <div className={`user-menu ${menuOpen ? 'open' : ''}`}>
            <button onClick={() => { setMenuOpen(false); nav('/mypage'); }}>정보수정</button>
            {isAdmin && (
              <button onClick={() => { setMenuOpen(false); nav('/settings'); }}>환경설정</button>
            )}
            <button onClick={() => { setMenuOpen(false); logout(); }}>로그아웃</button>
          </div>
        </div>
      ) : (
        <button className="login-link" onClick={() => nav('/login')}>로그인</button>
      )}
    </header>
  );
}
