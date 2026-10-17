'use client';
/**
 * 인용구 딱지 이름 (v2.0 사용자 요청) — ARCH 인용구 앞 딱지(globals.css, 기본 「COMM」)에
 * 그 인용구 색과 같은 대표색을 가진 내 캐릭터 이름을 넣는다 (예: 에덴 색 → EDEN, 이브 색 → EVE).
 * 인용구에는 색(data-tone)만 저장돼 있으므로 이름은 화면에서 캐릭터 목록으로 찾아 CSS로 붙인다 —
 * 이미 쓴 글도 그대로 바뀌고, 캐릭터 이름을 고치면 딱지도 따라 바뀐다. 직접 고른 색은 「COMM」 그대로.
 */
import { useEffect, useMemo } from 'react';
import { useLocalList } from '@/lib/postStore';
import { CHAR_SEED, type Character } from '@/lib/charStore';

const HEX = /^#[0-9a-f]{3,8}$/i;
/** 한글 글자 가운데를 잴 표본 — 대사에 흔한 모양(ㅎ 꼭지 · 쌍자음 · 받침)을 고루 */
const SAMPLE = '하아진짜미치겠네그래평생';
const cssStr = (s: string) => `"${s.replace(/[\\"]/g, '\\$&').replace(/[\r\n]+/g, ' ')}"`;
const SCOPES = [
  'html.ui-arch .page-arch :is(.prose,.post-body,.re-content) blockquote',
  '.mng-box.arch-modal .re-content blockquote',
];

export function QuoteNameSync() {
  const [chars] = useLocalList<Character>('ohome.chars.v1', CHAR_SEED);
  /* 딱지 높이 맞춤 (v2.0 사용자 제보 — 기기마다 위아래 어긋남). 딱지는 대사 기준선 위 「한글 글자 가운데」에 놓이는데(globals.css --qhc),
     그 높이는 글꼴마다 다르다 — 본문 기본 글꼴은 웹 글꼴이 아니라 기기 글꼴(맑은 고딕 · 애플 산돌고딕 …)로 그려져 미리 정해 둘 수 없다.
     그래서 인용구가 실제로 쓰는 글꼴로 한글 표본을 그려 보고(캔버스 — 화면과 같은 글꼴을 고른다) 그 가운데 높이를 em으로 알려 준다 */
  useEffect(() => {
    let key = '';
    let t = 0;
    const measure = () => {
      const q = document.querySelector('blockquote');
      if (!q) return;
      const cs = getComputedStyle(q);
      const k = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontFamily}`;
      if (k === key) return;
      const ctx = document.createElement('canvas').getContext('2d');
      if (!ctx) return;
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} 100px ${cs.fontFamily}`;
      const m = ctx.measureText(SAMPLE);
      const hc = (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 200;
      if (!(hc > 0.2 && hc < 0.55)) return;   // 못 쟀으면 기본값(.34) 그대로
      key = k;
      document.documentElement.style.setProperty('--qhc', hc.toFixed(3));
    };
    const later = () => { window.clearTimeout(t); t = window.setTimeout(measure, 150); };
    const onFonts = () => { key = ''; later(); };   // 웹 글꼴이 늦게 붙으면 다시
    later();
    const mo = new MutationObserver(later);   // 글 · 페이지가 바뀌어 인용구가 새로 뜨면
    mo.observe(document.body, { childList: true, subtree: true });
    document.fonts?.addEventListener?.('loadingdone', onFonts);
    return () => { window.clearTimeout(t); mo.disconnect(); document.fonts?.removeEventListener?.('loadingdone', onFonts); };
  }, []);
  const css = useMemo(() => {
    const seen = new Set<string>();
    const rules: string[] = [];
    for (const c of chars) {
      const color = (c.color ?? '').trim().toLowerCase();
      const name = (c.name ?? '').trim();
      if (!c.own || !HEX.test(color) || !name || seen.has(color)) continue;   // 같은 색이면 앞 캐릭터
      seen.add(color);
      rules.push(`${SCOPES.map(s => `${s}[data-tone="${color}" i]`).join(',')}{--qname:${cssStr(name)}}`);   // 딱지(globals.css)가 이 값을 글자로 쓴다
    }
    return rules.join('\n');
  }, [chars]);
  return css ? <style data-quote-names="">{css}</style> : null;
}
