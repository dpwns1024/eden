'use client';
/**
 * 접근 권한 없음 (v2.0 사용자 요청 · lib/classified.ts) — 기밀 캐릭터·자관을 관리자 아닌 사람이
 * 목록에서 누르면 창으로(modal), 주소로 바로 들어오면 페이지로(page) 붉은 경고를 띄운다.
 * 내용은 처음부터 받지 않으므로(서버 규칙) 여기엔 이름 · 경고 문구만 있다. 스타일은 accessDenied.css
 */
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import './accessDenied.css';

interface Props {
  name?: string;            // 항목 이름 (목록 카드에 이미 보이던 것)
  kind: 'chars' | 'rels';
  onClose?: () => void;     // 있으면 창(modal) — 없으면 페이지
  backHref?: string;        // 페이지일 때 돌아갈 목록
}

const CODE = { chars: 'PERSONNEL FILE', rels: 'PAIR FILE' } as const;

function Win({ name, kind, onClose, backHref }: Props) {
  return (
    <div className="ad-win" role="alertdialog" aria-modal={onClose ? true : undefined} aria-labelledby="ad-t">
      <i className="ad-c tl" /><i className="ad-c tr" /><i className="ad-c bl" /><i className="ad-c br" />
      <header className="ad-h">
        <b><span className="ad-ic" aria-hidden="true">!</span><span id="ad-t" className="ad-gl" data-t="ACCESS DENIED">ACCESS DENIED</span></b>
        <span>ERR 403</span>
      </header>
      <p className="ad-ko">접근 권한이 없습니다</p>
      <dl className="ad-dl">
        <div><dt>FILE</dt><dd>{CODE[kind]}{name ? <> · <em>{name}</em></> : null}</dd></div>
        <div><dt>CLEARANCE</dt><dd>INSUFFICIENT</dd></div>
        <div><dt>ACCESS</dt><dd>ADMIN ONLY</dd></div>
      </dl>
      <p className="ad-log">&gt; REQUEST LOGGED · CONNECTION TERMINATED<i /></p>
      <div className="ad-act">
        {onClose
          ? <button type="button" onClick={onClose} autoFocus>CLOSE</button>
          : <Link href={backHref ?? '/'}>← BACK</Link>}
      </div>
    </div>
  );
}

export function AccessDenied(props: Props) {
  const { onClose } = props;
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!onClose) return;
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);

  if (!onClose) return <section className="page ad-page"><Win {...props} /></section>;
  if (!mounted) return null;
  return createPortal(
    <div className="ad-ov" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}><Win {...props} /></div>
    </div>,
    document.body,
  );
}
