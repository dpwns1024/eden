'use client';
// 맨 위로 버튼 (v2.0 사용자 요청) — 아래로 내리면 오른쪽 아래에 나타나고, 누르면 맨 위로 부드럽게.
// 모바일은 글을 가리지 않게 작고 반투명하게. 오른쪽 아래 BGM 플레이어가 있으면 그 위로 비켜 선다.
import { useEffect, useState } from 'react';

const SHOW_AFTER = 400;   // 이만큼(px) 내려가면 나타난다

export function ScrollTop() {
  const [show, setShow] = useState(false);
  const [lift, setLift] = useState(0);   // BGM 플레이어를 피해 올라가는 높이

  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      setShow(window.scrollY > SHOW_AFTER);
      // 오른쪽 아래에 떠 있는 BGM 플레이어와 겹치면 그 위로
      const bgm = document.querySelector('.bgm') as HTMLElement | null;
      const r = bgm && bgm.offsetWidth ? bgm.getBoundingClientRect() : null;
      const overlaps = !!r && r.right > window.innerWidth - 80 && r.bottom > window.innerHeight - 90;
      setLift(overlaps && r ? Math.max(0, window.innerHeight - r.top + 10) : 0);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(check); };
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    // BGM 플레이어를 접고 펴면 높이가 바뀐다
    const t = window.setInterval(onScroll, 1500);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.clearInterval(t);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <button type="button" className={`to-top${show ? ' on' : ''}`} aria-label="맨 위로" tabIndex={show ? 0 : -1}
      style={lift ? { bottom: lift } : undefined}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
