'use client';
/**
 * YJHM 회원증 — 로그인 · 비밀번호 창(잠긴 메뉴 · 잠긴 글)을 홍예준 팬페이지 「회원증」 한 장으로 (사용자 요청 —
 * 「비번창, 로그인창도 지금의 스타일에 맞게, 예준 팬페이지 회원 느낌으로」).
 * 위: 남색 띠(필름 구멍 + TEAM YEJUN · 카드 이름) → 작은 머리글 · Inter 제목 + 포인트색 점 · 과녁 문장
 * → 내용(입력칸은 DM Mono 이름표를 단다) → 아래: 절취선 + 회원 번호(메인 머리와 같은 NO.) · 바코드.
 * 모양은 yjhmUi.css의 .yj-pass.
 */
import React from 'react';
import { dday } from './YjhmHeader';

export function YjhmPass({ card, kicker, title, children, className, as = 'div', onSubmit }: {
  card: string; kicker: string; title: string; children: React.ReactNode; className?: string;
  as?: 'div' | 'form'; onSubmit?: (e: React.FormEvent) => void;
}) {
  const Box = as;
  return (
    <Box className={`yj-pass${className ? ` ${className}` : ''}`} onSubmit={onSubmit}>
      <div className="yj-pass-band"><b>TEAM YEJUN</b><span>{card}</span></div>
      <div className="yj-pass-body">
        <i className="yj-pass-mark" aria-hidden="true" />
        <small className="yj-pass-k">{kicker}</small>
        <h1 className="yj-pass-t">{title}<i>.</i></h1>
        {children}
      </div>
      <div className="yj-pass-stub" aria-hidden="true">
        <span>NO.{String(dday(new Date())).padStart(4, '0')}<i>·</i>SINCE 2026.03.05</span>
        <i className="yj-pass-bar" />
      </div>
    </Box>
  );
}

/** 이름표 단 입력칸 한 줄 */
export function YjhmPassField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="yj-pass-f"><span>{label}</span>{children}</label>;
}
