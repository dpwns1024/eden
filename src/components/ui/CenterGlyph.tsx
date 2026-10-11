'use client';
/**
 * 기호 아이콘(♥ ✦ ✧ …)을 버튼 정가운데에 (v2.0 사용자 제보 — 「별 모양만 아래로 치우쳐 있다」).
 *
 * 기호는 기기마다 다른 글꼴에서 빌려 그려져서, 같은 글자도 iPhone·안드로이드·PC에서 세로 자리가 다르다.
 * 고정 보정값(padding)으로는 한 기기·한 기호만 맞는다. 그래서 그 기기에서 실제로 그려지는 잉크를 잰다:
 *  1) 같은 글꼴로 캔버스에 그려 픽셀을 훑어 「기준선에서 잉크 가운데까지」 거리를 구하고
 *  2) 화면에서 기호의 기준선 위치(보이지 않는 표식)를 읽어
 *  3) 잉크 가운데가 버튼 가운데에 오도록 translateY로 옮긴다.
 */
import React, { useLayoutEffect, useRef, useState } from 'react';

/** 기준선 기준 잉크의 세로 가운데(px, 위쪽이 음수) — 잉크가 없으면 null */
function inkMid(text: string, font: string, size: number): number | null {
  const S = 2; // 정밀도용 확대
  const W = Math.ceil(size * 3 * S), H = Math.ceil(size * 3 * S), base = Math.round(size * 2 * S);
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.scale(S, S);
  ctx.font = font;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#000';
  ctx.fillText(text, size * 0.5, base / S);
  const data = ctx.getImageData(0, 0, W, H).data;
  let top = -1, bottom = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] > 40) { if (top < 0) top = y; bottom = y; break; }
    }
  }
  if (top < 0) return null;
  return ((top + bottom + 1) / 2 - base) / S;
}

export function CenterGlyph({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const markRef = useRef<HTMLElement>(null);
  const [dy, setDy] = useState(0);
  const dyRef = useRef(0);

  useLayoutEffect(() => {
    const el = ref.current, mark = markRef.current, box = el?.parentElement;
    if (!el || !mark || !box) return;
    const run = () => {
      const cs = getComputedStyle(el);
      const size = parseFloat(cs.fontSize) || 16;
      const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const mid = inkMid(children, font, size);
      if (mid == null) return;
      const b = box.getBoundingClientRect();
      if (!b.height) return;
      // 표식은 지금 옮겨 둔 만큼(dy) 같이 움직여 있으므로 빼고 원래 기준선을 구한다
      const baseY = mark.getBoundingClientRect().bottom - dyRef.current;
      const next = Math.round((b.top + b.height / 2 - (baseY + mid)) * 4) / 4;
      if (Math.abs(next - dyRef.current) >= 0.25) { dyRef.current = next; setDy(next); }
    };
    run();
    document.fonts?.ready.then(run).catch(() => {});
    const ro = new ResizeObserver(run);
    ro.observe(box);
    ro.observe(el);   // 글꼴이 늦게 바뀌면 버튼 크기는 그대로여도 기호 크기가 바뀐다
    return () => ro.disconnect();
  }, [children]);

  return (
    <span ref={ref} style={{ display: 'inline-block', lineHeight: 1, transform: dy ? `translateY(${dy}px)` : undefined }}>
      {children}
      {/* 기준선 표식 — 크기 0, 화면엔 안 보인다 */}
      <i ref={markRef} aria-hidden style={{ display: 'inline-block', width: 0, height: 0, verticalAlign: 'baseline' }} />
    </span>
  );
}
