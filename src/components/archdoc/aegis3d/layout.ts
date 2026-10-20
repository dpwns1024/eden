/**
 * 아이기스 3D 지도의 배치 (three를 들이지 않는 가벼운 모듈 — 이름표 자리를 React 쪽에서도 쓴다).
 * 월드 좌표: x 오른쪽 · y 위 · z 앞(화면 쪽). 섬 지도(위에서 본 1000×1000) 한 칸 = 1.
 *  지휘본부: 예전 단면 좌표(lib/aegisMap.ts의 AEGIS_SPOTS — 가로 x · 세로 y, 지면 y=880)를 HQ_S배로 줄여 세운다. 깊이는 0(뒤)~200(앞).
 *  거주구역: RES_TOWERS 좌표(0~320)를 가로 RES_S · 높이 RES_V배로.
 */
import { AEGIS_SPOTS, RES_TOWERS } from '@/lib/aegisMap';

export type P3 = [number, number, number];

/** 섬 윤곽 · 작은 섬들 (섬 지도 좌표) */
export const ISLAND = 'M863 492 L857 506 L847 520 L841 534 L833 547 L820 558 L810 570 L806 584 L795 596 L774 603 L754 609 L744 620 L737 634 L724 644 L708 652 L691 659 L671 663 L646 659 L621 652 L603 651 L587 655 L567 645 L549 634 L535 642 L520 665 L502 676 L483 676 L462 682 L438 692 L414 696 L396 688 L381 677 L365 668 L348 660 L335 650 L318 642 L295 639 L272 634 L260 622 L254 608 L243 596 L228 586 L219 574 L217 559 L215 545 L216 532 L230 517 L252 503 L263 492 L259 481 L252 469 L253 457 L254 445 L252 432 L256 420 L267 411 L276 400 L275 385 L278 371 L292 362 L313 357 L329 350 L343 341 L358 333 L371 324 L381 307 L392 289 L410 280 L433 280 L455 279 L476 276 L498 276 L520 281 L541 285 L561 288 L579 297 L593 313 L607 324 L625 326 L646 325 L665 328 L682 334 L700 339 L714 348 L719 362 L723 376 L736 384 L753 390 L763 400 L766 413 L773 424 L785 433 L794 444 L804 455 L825 466 L851 478 Z';
export const ISLETS = [
  'M221 300 L217 304 L214 308 L210 311 L204 314 L196 313 L192 315 L186 318 L178 320 L172 317 L166 315 L161 312 L157 308 L159 304 L161 300 L159 296 L160 293 L163 289 L167 286 L170 280 L179 280 L186 282 L192 285 L199 284 L203 287 L208 290 L211 293 L218 296 Z',
  'M877 262 L875 266 L871 270 L868 274 L860 275 L855 278 L850 281 L842 284 L834 283 L826 281 L818 280 L815 275 L814 270 L817 265 L809 262 L809 258 L809 253 L815 249 L817 244 L826 242 L834 242 L842 244 L849 244 L856 245 L860 249 L868 250 L875 253 L883 256 Z',
  'M898 648 L897 652 L893 655 L888 658 L885 661 L879 663 L873 661 L868 662 L863 663 L856 664 L851 661 L845 659 L842 656 L840 652 L846 648 L846 645 L846 642 L848 638 L853 636 L857 634 L861 630 L868 630 L874 631 L878 635 L884 636 L886 639 L889 642 L891 645 Z',
  'M166 714 L165 717 L163 720 L159 722 L155 723 L154 727 L149 729 L144 730 L139 728 L134 728 L130 725 L128 722 L128 719 L124 717 L122 714 L122 711 L123 708 L125 704 L128 701 L135 702 L140 702 L144 702 L149 700 L153 702 L158 703 L162 705 L168 707 L167 711 Z',
  'M909 454 L908 456 L906 458 L905 460 L902 461 L899 462 L897 463 L894 465 L891 465 L888 463 L884 463 L883 460 L882 458 L884 456 L881 454 L880 452 L881 449 L883 448 L884 445 L887 444 L891 444 L894 445 L897 445 L900 445 L901 447 L905 448 L907 449 L911 451 Z',
  'M244 604 L243 606 L242 607 L240 608 L238 610 L236 609 L234 610 L232 610 L230 611 L227 611 L226 610 L223 609 L222 607 L222 606 L224 604 L223 603 L224 601 L224 600 L226 599 L227 597 L229 596 L232 596 L234 598 L236 598 L238 599 L239 600 L240 601 L242 602 Z',
  'M812 700 L811 702 L811 703 L808 704 L807 706 L806 708 L803 709 L800 709 L797 708 L794 708 L793 706 L792 704 L791 703 L788 702 L788 700 L788 698 L789 696 L789 694 L792 693 L795 693 L798 693 L800 693 L803 693 L805 693 L808 693 L811 694 L813 696 L811 698 Z',
];
export const ptsOf = (d: string) => [...d.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map(m => [+m[1], +m[2]] as [number, number]);
/** 섬 지도 좌표 → 월드 (x, z) */
export const mapXZ = (px: number, py: number): [number, number] => [px - 530, py - 480];

/* 지휘본부 */
export const HQX = -90, HQZ = -10, HQ_S = 0.12, HQ_D = 200;
/** 단면 좌표(x · 깊이 y · 지면 위 높이 z) → 월드 */
export const hqW = (x: number, y: number, z: number): P3 => [HQX + (x - 500) * HQ_S, z * HQ_S, HQZ + (y - HQ_D / 2) * HQ_S];
export const zOf = (sy: number) => 880 - sy;
export const rectsOf = (cell?: string) => [...(cell ?? '').matchAll(/M(\d+) (\d+)H(\d+)V(\d+)/g)].map(m => ({ x0: +m[1], y0: +m[2], x1: +m[3], y1: +m[4] }));
export const HQ_BANDS = [
  { tag: '11F', top: 300, bot: 390 }, { tag: '10F', top: 390, bot: 470 }, { tag: '7–9F', top: 470, bot: 580 },
  { tag: '4–6F', top: 580, bot: 690 }, { tag: '2–3F', top: 690, bot: 790 }, { tag: '1F', top: 790, bot: 880 },
  { tag: 'B1', top: 880, bot: 970 }, { tag: 'B2–B4', top: 970, bot: 1070 }, { tag: 'B5', top: 1070, bot: 1160 },
];

/* 거주구역 */
export const RX = 70, RZ = 25, RES_S = 0.16, RES_V = 0.38;
export const resW = (x: number, y: number, z: number): P3 => [RX + (x - 160) * RES_S, z * RES_V, RZ + (y - 160) * RES_S];

/** 시설(spot) 하나의 이름표 자리 */
const ROOF: Record<string, P3> = {
  sky: hqW(640, 100, zOf(70)),
  core: hqW(500, 100, zOf(300) + 124),
  dome: hqW(226, 100, zOf(300) + 98),
  heli: hqW(806, 100, zOf(300) + 52),
};
export function spotAnchor(spot: string): P3 | undefined {
  if (ROOF[spot]) return ROOF[spot];
  const s = AEGIS_SPOTS[spot];
  if (!s) return undefined;
  if (s.view === 'hq') {
    const r = rectsOf(s.cell)[0];
    return r ? hqW(r.x0 + 30, HQ_D, zOf(r.y0) - 22) : undefined;
  }
  if (spot === 'quarters') return resW(160, 160, 12);
  const t = RES_TOWERS.find(v => v.key === spot);
  return t ? resW(t.cx, t.cy, t.h + 40) : undefined;
}
/** 이름표 열쇠 → 월드 자리. site:hq · site:res · fl:층이름 · 시설 spot */
export function anchorOf(k: string): P3 | undefined {
  if (k === 'site:hq') return hqW(500, 100, zOf(300) + 330);
  if (k === 'site:res') return resW(160, 160, 190);
  if (k.startsWith('fl:')) {
    const b = HQ_BANDS.find(v => v.tag === k.slice(3));
    return b ? hqW(b.bot > 880 ? 150 : 110, HQ_D, (zOf(b.top) + zOf(b.bot)) / 2) : undefined;
  }
  return spotAnchor(k);
}
