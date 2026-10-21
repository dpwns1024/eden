/**
 * 아이기스 3D 지도의 배치 (three를 들이지 않는 가벼운 모듈 — 이름표 자리를 React 쪽에서도 쓴다).
 * 바다 위 이동 요새(사용자 요청): 방패 돔(반지름 R0 · 높이 R0×DOME_K) 안의 원형 강철 플랫폼.
 *  뱃머리(+x) 쪽 본부 단지 · 선미(−x) 쪽 숙소 단지, 둘을 셔틀 선로로 잇는다. 갑판 아래 · 물속에 기계실 · 무기고 · 출전 게이트 · 수중 식물원 · 봉인 구역.
 * 월드 좌표: x 앞(뱃머리) · y 위 · z 오른쪽. 모든 건물은 방패 돔 안쪽에 들어간다(돔 = 보호막).
 */
export type P3 = [number, number, number];

/** 방패 돔 · 바다 위 포탑 (시안 C-3 그대로 고정) */
export const R0 = 250, DOME_K = 0.62;
export const TURRET_R = 285;
/** 그 자리에서 돔 안쪽 높이 한계 */
export const domeLimit = (x: number, z: number) => R0 * DOME_K * Math.sqrt(Math.max(0, 1 - (x * x + z * z) / (R0 * R0)));

/** 플랫폼 */
export const RP = 232, DECK = 20, Y = DECK + 4;
/** 본부 · 숙소 단지 기단 위 높이 */
export const HQ_B = Y + 10, RES_B = Y + 8;

/** 본부 단지 */
export const CORE = { x: 30, z: 0 };
export const HQ_PODIUM: [number, number][] = [[-78, -72], [-55, -95], [118, -95], [140, -72], [140, 72], [118, 95], [-55, 95], [-78, 72]];
/** 숙소 단지 */
export const RES_PODIUM: [number, number][] = [[-212, -78], [-195, -96], [-125, -96], [-108, -78], [-108, 78], [-125, 96], [-195, 96], [-212, 78]];
export const RES_TWR: { x: number; z: number; h: number; key?: 'eden' | 'eve' }[] = [
  { x: -142, z: -60, h: 44 }, { x: -142, z: -20, h: 34 }, { x: -142, z: 20, h: 34 }, { x: -142, z: 60, h: 44 },
  { x: -180, z: -64, h: 38 }, { x: -180, z: 64, h: 38 }, { x: -184, z: -22, h: 52, key: 'eden' }, { x: -184, z: 22, h: 52, key: 'eve' },
];

/** 시설(spot)마다 이름표 자리 */
const SPOT: Record<string, P3> = {
  sky: [30, 154, 0],
  core: [62, 92, 0],
  lobby: [30, HQ_B + 14, 26],
  dome: [95, HQ_B + 38, -50],
  heli: [180, Y + 10, 0],
  resonance: [95, HQ_B + 50, 52],
  sdiv: [-15, HQ_B + 11, -70],
  hdiv: [-15, HQ_B + 33, -70],
  rst: [-15, HQ_B + 55, -70],
  harmony: [-50, HQ_B + 50, -45],
  medbay: [-15, HQ_B + 10, 72],
  ward: [-15, HQ_B + 30, 72],
  stabil: [-52, HQ_B + 28, 62],
  lounge: [-60, HQ_B + 14, -14],
  dining: [-60, HQ_B + 14, 14],
  igarden: [-50, HQ_B + 32, 0],
  mech: [30, 8, 0],
  armory: [-15, 4, -58],
  gate: [196, -8, 0],
  aqua: [60, -88, 70],
  arena: [-40, -150, 0],
  quarters: [-160, RES_B + 4, 0],
  eden: [-184, RES_B + 52 + 26, -22],
  eve: [-184, RES_B + 52 + 26, 22],
};
/** 이름표 열쇠 → 월드 자리. site:hq · site:res · 시설 spot */
export function anchorOf(k: string): P3 | undefined {
  if (k === 'site:hq') return [40, 168, 0];
  if (k === 'site:res') return [-160, 112, 0];
  return SPOT[k];
}
