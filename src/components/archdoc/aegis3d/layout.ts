/**
 * 아이기스 3D 지도의 배치 (three를 들이지 않는 가벼운 모듈 — 이름표 자리를 React 쪽에서도 쓴다).
 * 바다 위 이동 요새(사용자 요청 · 시안 HEX · WALLS): 방패 돔 안의 육각 강철 선체.
 *  가운데 모노리스(통합 지휘본부) · 안쪽 성벽 안 = 본부 구역(부속동) · 두 성벽 사이 = 숙소 구역. 건물은 전부 갑판 위, 성벽 위엔 보루 탑 · 문루뿐.
 *  갑판 아래 · 물속에 기계실 · 무기고 · 출전 게이트 · 수중 식물원 · 봉인 구역.
 * 월드 좌표: x 앞(뱃머리) · y 위 · z 오른쪽. 모든 건물은 방패 돔 안쪽에 들어간다(돔 = 보호막).
 */
export type P3 = [number, number, number];

/** 육각 방향 — 꼭짓점이 30° · 90° …, 변 가운데(성문 · 도로)가 0° · 60° … */
export const HR = Math.PI / 6;
/** 방패 돔 · 바다 위 포탑 */
export const R0 = 385, DOME_K = 1.5, TURRET_R = 425;
/** 선체 (육각 외접 반지름) · 갑판 */
export const HULL_R = 340, DECK = 20, Y = DECK + 4;
/** 성벽 (외접 반지름 · 높이 · 두께 · 성문 너비) */
export const WALL_OUT = { R: 326, h: 40, t: 8, gate: 26 };
export const WALL_IN = { R: 200, h: 26, t: 6, gate: 22 };
/** 모노리스 */
export const MONO = { r: 50, h: 420, taper: 0.6 };
export const MONO_TOP = Y + MONO.h;
export const SKY_Y = MONO_TOP + 62;

/** 섹터 각도 — 모서리 방향(성문 사이) */
export const sectorAng = (k: number) => HR + (k * Math.PI) / 3;

/** 본부 부속동 — 섹터 k의 왼쪽(j=0) · 오른쪽(j=1) 자리 */
export interface Bld { x: number; z: number; rot: number; h: number }
const hqAt = (k: number, j: number): Bld => {
  const a = sectorAng(k) + (j ? 0.22 : -0.22), r = 150;
  return { x: Math.cos(a) * r, z: Math.sin(a) * r, rot: a, h: j ? 46 : 32 };
};
/** 시설 → 자리. 섹터 0(뱃머리 오른쪽)부터 시계 반대로 */
export const HQ_BLD: Record<string, Bld> = {
  resonance: hqAt(0, 0), dome: hqAt(0, 1),
  medbay: hqAt(1, 0), ward: hqAt(1, 1),
  igarden: hqAt(2, 0), stabil: hqAt(2, 1),
  lounge: hqAt(3, 0), dining: hqAt(3, 1),
  rst: hqAt(4, 0), harmony: hqAt(4, 1),
  sdiv: hqAt(5, 0), hdiv: hqAt(5, 1),
};
/** 숙소동 — 섹터마다 네 동 (선미 두 섹터는 가운데 두 동 대신 에덴 · 이브 고층동) */
export interface ResBld extends Bld { k: number; key?: 'eden' | 'eve' }
export const RES_BLD: ResBld[] = [];
for (let k = 0; k < 6; k++) {
  const a = sectorAng(k), stern = Math.cos(a) < -0.5;
  [-0.24, -0.08, 0.08, 0.24].forEach((d, j) => {
    if (stern && (j === 1 || j === 2)) return;
    const r = j % 3 ? 262 : 250;
    RES_BLD.push({ k, x: Math.cos(a + d) * r, z: Math.sin(a + d) * r, rot: a + d, h: 40 + ((j * 13 + k * 7) % 4) * 10 });
  });
  if (stern) RES_BLD.push({ k, x: Math.cos(a) * 278, z: Math.sin(a) * 278, rot: a, h: 120, key: Math.sin(a) > 0 ? 'eve' : 'eden' });
}

/** 이름표 자리 */
const top = (b: Bld, up = 10): P3 => [b.x, Y + b.h + up, b.z];
const SPOT: Record<string, P3> = {
  ...Object.fromEntries(Object.entries(HQ_BLD).map(([k, b]) => [k, top(b, k === 'stabil' ? -4 : 10)])),
  dome: [HQ_BLD.dome.x, Y + 30, HQ_BLD.dome.z],
  core: [MONO.r * 0.9, Y + 276, 0],
  sky: [0, SKY_Y + 18, 0],
  lobby: [56, Y + 16, 36],
  heli: [155, Y + 32, 0],
  mech: [0, 4, 0],
  armory: [HQ_BLD.sdiv.x, -8, HQ_BLD.sdiv.z],
  gate: [262, -4, 0],
  aqua: [90, -126, 120],
  arena: [-60, -232, 0],
  quarters: [-256, Y + 70, 0],
  eden: (() => { const b = RES_BLD.find(v => v.key === 'eden')!; return top(b, 24); })(),
  eve: (() => { const b = RES_BLD.find(v => v.key === 'eve')!; return top(b, 24); })(),
};
/** 이름표 열쇠 → 월드 자리. site:hq · site:res · 시설 spot */
export function anchorOf(k: string): P3 | undefined {
  if (k === 'site:hq') return [60, MONO_TOP + 70, 0];
  if (k === 'site:res') return [-250, Y + 130, 120];
  return SPOT[k];
}
