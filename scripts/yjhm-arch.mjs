// ARCH 게시판 모양(globals.css의 html.ui-arch 규칙 · BGM 다이얼) → YJHM 색 · 글꼴 판을 만든다.
//   node scripts/yjhm-arch.mjs   →   src/components/world/yjhmArch.gen.css (손으로 고치지 말 것)
//
// ARCH는 어두운 바탕 · 밝은 글자 · 하늘색 포인트라, 같은 배치를 YJHM(미색 종이 · 남색 글자 · #607ca0)으로
// 옮기려면 색을 뒤집어야 한다. 규칙마다 색 · 그림자 · 글꼴만 뽑아 바꾸고, 선택자에 html.ui-yjhm을 붙여
// ARCH보다 한 단계 세게 덮는다. 배치(크기 · 여백 · 격자)는 ARCH 그대로 둔다.
// 컨셉 손질(굵은 상자 · 알약 버튼 · Archivo 제목 등)은 손으로 쓰는 yjhmBoard.css가 이 위에 얹힌다.
// ARCH 규칙을 고치면 이 스크립트를 다시 돌린다.
import fs from 'node:fs';
import postcss from 'postcss';

// whole: 파일 전체가 ARCH 전용(BGM 다이얼) — 모든 선택자 앞에 html.ui-yjhm을 붙인다
const SOURCES = [
  { file: 'src/app/globals.css', whole: false },
  { file: 'src/components/shell/bgmDial.css', whole: true },
];
const OUT = 'src/components/world/yjhmArch.gen.css';

const PAPER = [247, 246, 242];
const INK = [44, 62, 87];
const ACCENT = [96, 124, 160];
const ALERT = [184, 64, 56];

const COLOR_PROPS = /^(color|background|background-color|background-image|border|border-(top|right|bottom|left)(-color)?|border-color|outline|outline-color|box-shadow|text-shadow|fill|stroke|caret-color|accent-color|-webkit-text-fill-color|-webkit-text-stroke(-color)?|text-decoration(-color)?|scrollbar-color|filter|--.*)$/;
const FONT_PROPS = /^(font|font-family)$/;

const hsl = ([r, g, b]) => {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
};
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

/** 어두운 판의 색 하나 → YJHM 색 (투명도는 그대로) */
function mapRgb(rgb) {
  const [h, s, l] = hsl(rgb);
  if (s > 0.45 && (h < 20 || h > 330) && l > 0.3) return ALERT;            // 경고 · 삭제 빨강
  if (s > 0.4 && h >= 180 && h <= 240 && l > 0.5) return ACCENT;           // 하늘색 포인트
  const t = Math.pow(Math.max(0, (l - 0.12) / 0.88), 0.75);                  // 검정 → 종이 · 흰색 → 잉크
  return mix(PAPER, INK, t);
}

const hex = c => {
  const v = c.slice(1);
  const f = v.length <= 4 ? v.split('').map(x => x + x).join('') : v;
  const n = [0, 2, 4].map(i => parseInt(f.slice(i, i + 2), 16));
  const a = f.length === 8 ? parseInt(f.slice(6, 8), 16) / 255 : 1;
  return [n, a];
};
const fmt = ([r, g, b], a) => (a >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${+a.toFixed(3)})`);
const NAMED = { white: [255, 255, 255], black: [0, 0, 0] };

/** 값 안의 색을 모두 바꾼다 — shadow면 진한 그림자가 종이 위에서 무겁지 않게 옅게 */
function mapValue(v, prop) {
  const soft = /shadow|filter/.test(prop);
  const k = soft ? 0.3 : 1;
  v = v.replace(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+%?)\s*)?\)/g, (_, r, g, b, a) => {
    const al = a == null ? 1 : a.endsWith('%') ? parseFloat(a) / 100 : parseFloat(a);
    return fmt(mapRgb([+r, +g, +b]), al * k);
  });
  v = v.replace(/#[0-9a-fA-F]{3,8}\b/g, m => { const [c, a] = hex(m); return fmt(mapRgb(c), a * k); });
  v = v.replace(/\b(white|black)\b/g, m => fmt(mapRgb(NAMED[m]), k));
  // rgba(var(--a-acr),.5) 같은 쓰임에 들어가는 r,g,b 세 숫자 변수
  if (prop.startsWith('--') && /^\s*\d+\s*,\s*\d+\s*,\s*\d+\s*$/.test(v)) v = mapRgb(v.split(',').map(Number)).join(',');
  return v;
}
const mapFont = v => v
  .replace(/'?JetBrains Mono'?/g, "'Archivo Narrow'")
  .replace(/'?Jost'?/g, "'Archivo Narrow'")
  .replace(/\b300\b/, '500');

/** 이 선택자를 YJHM판으로 — ARCH 메인(.arx · 어두운 EVEDEN 홈)은 뺀다 */
function mapSelector(sel, whole) {
  if (/\.arx|ah-main/.test(sel)) return null;
  if (whole) return `html.ui-yjhm ${sel}`;
  if (sel.includes('html.ui-arch')) return sel.replace(/html\.ui-arch/g, 'html.ui-yjhm.ui-arch');
  if (/arch-modal|page-arch/.test(sel)) return `html.ui-yjhm ${sel}`;
  return null;
}

const out = postcss.root();
for (const { file, whole } of SOURCES) postcss.parse(fs.readFileSync(file, 'utf8')).walkRules(rule => {
  if (rule.parent?.type === 'atrule' && /keyframes/.test(rule.parent.name)) return;
  const sels = rule.selectors.map(x => mapSelector(x, whole)).filter(Boolean);
  if (!sels.length) return;
  const decls = [];
  rule.each(d => {
    if (d.type !== 'decl') return;
    if (COLOR_PROPS.test(d.prop)) {
      const v = mapValue(d.value, d.prop);
      if (v !== d.value) decls.push(d.clone({ value: v }));
    } else if (FONT_PROPS.test(d.prop)) {
      const v = mapFont(d.value);
      if (v !== d.value) decls.push(d.clone({ value: v }));
    }
  });
  if (!decls.length) return;
  const r = postcss.rule({ selectors: sels });
  decls.forEach(d => r.append(d));
  // @media 안 규칙은 같은 @media로 감싼다
  let target = out;
  const chain = [];
  for (let p = rule.parent; p && p.type === 'atrule'; p = p.parent) chain.unshift(p);
  for (const at of chain) {
    const a = postcss.atRule({ name: at.name, params: at.params });
    target.append(a); target = a;
  }
  target.append(r);
});

const head = `/* 자동 생성 — node scripts/yjhm-arch.mjs (손으로 고치지 말 것).
 * ARCH 게시판 규칙(globals.css) · BGM 다이얼(bgmDial.css)의 색 · 그림자 · 글꼴만 YJHM판으로 뒤집은 것. 배치는 ARCH 그대로. */\n`;
fs.writeFileSync(OUT, head + out.toString().replace(/\n\s*\n/g, '\n') + '\n');
console.log(`${OUT} — ${out.nodes.length}개 규칙`);
