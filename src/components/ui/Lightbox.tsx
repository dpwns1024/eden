'use client';
/**
 * 이미지 라이트박스 — **꺼 둠** (v2.0 사용자 요청 — 「사진을 누르면 확대되며 원본이 뜨는 것 전부 없애기」).
 *
 * 페어링·캐릭터·갤러리·게시글·감상타래·다이어리·커미션 등 사진을 누르면 확대 창을 띄우던 곳이 모두
 * 이 컴포넌트를 쓴다. 각 화면을 고치는 대신 여기서 아무것도 그리지 않고 바로 닫아, 누른 화면의
 * 「열림」 상태도 곧장 풀리게 한다(다른 동작에 걸리지 않게). 다시 켜려면 git 기록의 예전 내용을 쓰면 된다.
 */
import { useEffect } from 'react';

export function Lightbox({ onClose }: {
  srcs: string[];
  index: number;
  onClose: () => void;
}) {
  useEffect(() => { onClose(); }, [onClose]);
  return null;
}
