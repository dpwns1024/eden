'use client';
/**
 * 인용구 딱지 이름 (v2.0 사용자 요청) — ARCH 인용구 앞 딱지(globals.css, 기본 「COMM」)에
 * 그 인용구 색과 같은 대표색을 가진 내 캐릭터 이름을 넣는다 (예: 에덴 색 → EDEN, 이브 색 → EVE).
 * 인용구에는 색(data-tone)만 저장돼 있으므로 이름은 화면에서 캐릭터 목록으로 찾아 CSS로 붙인다 —
 * 이미 쓴 글도 그대로 바뀌고, 캐릭터 이름을 고치면 딱지도 따라 바뀐다. 직접 고른 색은 「COMM」 그대로.
 */
import { useMemo } from 'react';
import { useLocalList } from '@/lib/postStore';
import { CHAR_SEED, type Character } from '@/lib/charStore';

const HEX = /^#[0-9a-f]{3,8}$/i;
const cssStr = (s: string) => `"${s.replace(/[\\"]/g, '\\$&').replace(/[\r\n]+/g, ' ')}"`;
const SCOPES = [
  'html.ui-arch .page-arch :is(.prose,.post-body,.re-content) blockquote',
  '.mng-box.arch-modal .re-content blockquote',
];

export function QuoteNameSync() {
  const [chars] = useLocalList<Character>('ohome.chars.v1', CHAR_SEED);
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
