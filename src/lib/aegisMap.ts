/**
 * ARCH 본부 「아이기스」 지도 (v2.0 사용자 요청 — ARCH 페이지 MAP 탭).
 *
 * 세 장으로 나뉜다 — 섬 전체(위에서 본 지도) → 본부 건물(층별 단면) / 숙소 단지(입체).
 * 그림은 코드에 고정하고, 시설 이름·설명은 탭 문서 데이터(map 블록의 nodes)로 들고 있어
 * 관리자가 EDIT에서 고칠 수 있다. 각 시설은 그림 속 자리(spot) 하나를 고른다.
 * 번호(code)가 없는 시설은 설명 없이 위치만 표시한다.
 */

export interface ArchMapNode {
  id: string;
  code: string;          // 번호 (01 …) — 비우면 위치만 표시하는 시설
  en: string;            // 영문 이름 (은빛 큰 글씨)
  name: string;          // 한글 이름
  alias?: string;        // 다른 이름 (훈련구역 · 훈련실 등)
  zone: string;          // 층 · 구역 (50F 등)
  spot: string;          // 그림 속 자리 — AEGIS_SPOTS의 키
  body: string;          // 설명 (빈 줄로 문단 나눔)
  note?: string;         // 덧붙임 (괄호 속 한마디)
  quote?: { text: string; cite: string } | null;
  /** 강조 색 (숙소동) — 비우면 이름이 같은 캐릭터의 대표색 */
  color?: string;
}

export type AegisView = 'hq' | 'res';

/* ── 숙소 단지 입체 그림의 좌표 (지도 그림과 표시 위치가 같이 쓴다) ── */
export const RES_K = 1.35, RES_OX = 500, RES_OY = 390;
export function resP(x: number, y: number, z = 0): [number, number] {
  return [RES_OX + (x - y) * 0.866 * RES_K, RES_OY + (x + y) * 0.5 * RES_K - z * RES_K];
}
/** 숙소동 — 3×3 칸에서 가운데(정원)와 맨 앞(입구)을 뺀 일곱 동. 양 끝의 가장 높은 두 동이 강조 동(key) */
export const RES_TOWERS: { cx: number; cy: number; h: number; tag: string; key?: string }[] = [
  { cx: 50, cy: 50, h: 104, tag: 'R-1' },
  { cx: 160, cy: 50, h: 92, tag: 'R-2' },
  { cx: 270, cy: 50, h: 128, tag: 'R-3', key: 'eve' },
  { cx: 50, cy: 160, h: 92, tag: 'R-4' },
  { cx: 270, cy: 160, h: 72, tag: 'R-5' },
  { cx: 50, cy: 270, h: 128, tag: 'R-6', key: 'eden' },
  { cx: 160, cy: 270, h: 72, tag: 'R-7' },
];
export const towerTop = (key: string, up: number): [number, number] => {
  const t = RES_TOWERS.find(v => v.key === key)!;
  const [x, y] = resP(t.cx, t.cy, t.h);
  return [Math.round(x), Math.round(y - up)];
};
const [eveX, eveY] = towerTop('eve', 64);
const [edenX, edenY] = towerTop('eden', 64);
const [yardX, yardY] = resP(160, 160, 0);

export interface AegisSpot {
  label: string;           // 편집 창에서 고를 때 보이는 이름
  view: AegisView;
  lx: number; ly: number;  // 표시를 찍을 곳
  dir?: 'l' | 'c';         // 글씨를 왼쪽으로 · 표시 아래 가운데로
  big?: boolean;           // 숙소동 강조 — 영문 이름을 크게
  cell?: string;           // 누를 칸 (본부 그림)
}

/** 그림 속 자리 — 모든 그림은 viewBox 0 0 1000 1000. 순서 = 목록 순서(위층부터).
 *  본부: 옥상(훈련 돔 · 코어 탑, 그 위 상공에 하늘정원) y330 · 9–10F ~ 2F · 1F 로비 654–698 · 지하 B1 · B2 */
export const AEGIS_SPOTS: Record<string, AegisSpot> = {
  sky:       { label: '본부 · 코어 탑 위 상공 (하늘정원)', view: 'hq', lx: 800, ly: 72, cell: 'M520 66 Q650 44 780 66 Q742 126 650 148 Q558 126 520 66 Z' },
  core:      { label: '본부 · 옥상 코어 탑', view: 'hq', lx: 714, ly: 268, cell: 'M588 176 H712 V200 H664 L688 330 H612 L636 200 H588 Z' },
  dome:      { label: '본부 · 옥상 돔', view: 'hq', lx: 252, ly: 294, cell: 'M218 330 A112 112 0 0 1 442 330 Z' },
  hdiv:      { label: '본부 · 9–10F 왼쪽', view: 'hq', lx: 186, ly: 362, cell: 'M160 330H500V394H160Z' },
  harmony:   { label: '본부 · 9–10F 오른쪽', view: 'hq', lx: 526, ly: 362, cell: 'M500 330H840V394H500Z' },
  sdiv:      { label: '본부 · 7–8F', view: 'hq', lx: 186, ly: 426, cell: 'M160 394H840V458H160Z' },
  resonance: { label: '본부 · 6F', view: 'hq', lx: 186, ly: 480, cell: 'M160 458H840V502H160Z' },
  medbay:    { label: '본부 · 4–5F 왼쪽', view: 'hq', lx: 186, ly: 534, cell: 'M160 502H500V566H160Z' },
  ward:      { label: '본부 · 4–5F 오른쪽', view: 'hq', lx: 526, ly: 534, cell: 'M500 502H840V566H500Z' },
  stabil:    { label: '본부 · 3F (격리)', view: 'hq', lx: 186, ly: 588, cell: 'M160 566H840V610H160Z' },
  lounge:    { label: '본부 · 2F 왼쪽', view: 'hq', lx: 184, ly: 632, cell: 'M160 610H387V654H160Z' },
  dining:    { label: '본부 · 2F 가운데', view: 'hq', lx: 411, ly: 632, cell: 'M387 610H613V654H387Z' },
  igarden:   { label: '본부 · 2F 오른쪽', view: 'hq', lx: 637, ly: 632, cell: 'M613 610H840V654H613Z' },
  aqua:      { label: '본부 · B1 (바닷속)', view: 'hq', lx: 584, ly: 737, cell: 'M560 708H900 Q946 737 900 766 H560Z' },
  arena:     { label: '본부 · B2 최하층', view: 'hq', lx: 266, ly: 821, cell: 'M240 786H760V856H240Z' },
  quarters:  { label: '숙소 단지 · 가운데 정원', view: 'res', lx: yardX, ly: yardY, dir: 'c' },
  eden:      { label: '숙소 단지 · 왼쪽 끝 강조 동', view: 'res', lx: edenX, ly: edenY, big: true },
  eve:       { label: '숙소 단지 · 오른쪽 끝 강조 동', view: 'res', lx: eveX, ly: eveY, big: true },
};
export const SPOT_ORDER = Object.keys(AEGIS_SPOTS);

export const AEGIS_NODES: ArchMapNode[] = [
  {
    id: 'mp-sky', code: '01', en: 'SKY GARDEN', name: '하늘정원', zone: 'ABOVE CORE TOWER', spot: 'sky',
    body: '고대의 반중력석에 의해 영원히 하늘에 떠 있는 부유섬. 중심부에는 백색 대리석으로 지어진 신전의 폐허가 자리 잡고 있으며, 부서진 기둥과 벽 사이에는 지상에서는 볼 수 없는 희귀한 식물들이 자라고 있다.\n\n아크가 설립되기 훨씬 이전부터 존재했던 고대 문명의 유산으로 추정된다. 이 장소의 존재는 기록에 없었으며, 오직 바람의 군주 이카로스에 의해 우연히 발견되었다.',
    note: '이카로스의 테마 장소입니다! 아크의 최정상에 위치하고 있어요!',
  },
  {
    id: 'mp-core', code: '02', en: 'CENTRAL CORE', name: '센트럴 코어', alias: '관제실 · 관제탑', zone: 'ROOF · CORE TOWER', spot: 'core',
    body: "모든 작전을 지휘하고 전 세계의 위협을 감시하는 24시간 관제 센터. '원소의 군주'들의 회의실 또한 이곳 최상층에 위치해 있다.",
    note: '여기도 자주 나오진 않더라고용..?ㅋㅋㅋ',
  },
  { id: 'mp-hdiv', code: '', en: 'HARMONY DIV.', name: '하모니 부서층', alias: '대기실 · 사무실', zone: '9–10F', spot: 'hdiv', body: '' },
  {
    id: 'mp-harmony', code: '06', en: 'HARMONY COUNSEL', name: '하모니 심리상담실', alias: '상담실', zone: '9–10F', spot: 'harmony',
    body: '센티넬의 트라우마 관리와 파트너 관계 유지를 위해 운영되는 상담 전용 공간. 소파와 조명 색감까지 맞춤 설정되어 있다.\n\n파트너와의 관계가 좋지 않거나 큰 갈등이 생기면 하모니 책임자에게 불려가 여기서 상담을 받게 된다.',
    note: "가끔 '!일정' 수행하다보면 상담 일정 뜰 때 있죠?!ㅋㅋㅋ",
  },
  { id: 'mp-sdiv', code: '', en: 'SENTINEL DIV.', name: '전투요원층', alias: '대기실 · 사무실', zone: '7–8F', spot: 'sdiv', body: '' },
  {
    id: 'mp-resonance', code: '08', en: 'RESONANCE LAB', name: '공명연구실', zone: '6F', spot: 'resonance',
    body: '공명 연구실은 센티넬과 가이드의 감정 파장을 분석하기 위해 설계된 실험 공간이다. 벽면에는 정밀 측정 장치와 감정파 센서가 배치되어, 가이딩 세션이 철저히 기록되고 데이터화된다.\n\n따뜻함 대신 냉철한 과학적 분위기가 감돌며, 침대 대신 투명 공명포드가 설치되어 있다. 이곳에서의 가이딩은 치유가 아닌 연구 대상으로서 이루어지며, 관계마저 수치와 그래프로 환원된다.',
  },
  {
    id: 'mp-medbay', code: '07', en: 'MED BAY', name: '의무실', zone: '4–5F', spot: 'medbay',
    body: 'ARCH 의무실은 센티넬과 가이드의 부상 치료와 심리 안정화를 전담하는 공간이다. 능력 사용으로 인한 신체 손상뿐 아니라 정신적 폭주 후유증까지 관리하기 위해 첨단 의료 장비와 속성별 맞춤 치료 시스템이 갖춰져 있다.\n\n병상은 일반 환자실과 달리 속성 차폐막과 정신파장 안정화 기기가 기본 장착되어, 폭주 여파로 발생하는 무의식적 발화를 억제한다. 치료 과정에는 의료진 외에도 가이드가 배석해, 신체적 치료와 함께 가이딩을 통한 정신 회복을 병행하기도 한다. 벽면 모니터에는 실시간 신체·파장 수치가 표시되며, 중증 폭주 환자는 전용 격리병동으로 옮겨진다.\n\n의무실은 전장과 가장 가까운 안전지대이자, 요원들에게는 “다시 숨을 고를 수 있는 유일한 장소”로 불린다.',
    note: '앞으로 나올 신캐인 퓨어쌤의 일터입니다!',
  },
  { id: 'mp-ward', code: '', en: 'GENERAL WARD', name: '일반 병실', alias: '입원 병동', zone: '4–5F', spot: 'ward', body: '' },
  {
    id: 'mp-stabil', code: '09', en: 'STABILIZATION WARD', name: '비상 안정화실', alias: '긴급 가이딩 시설', zone: '3F · ISOLATION', spot: 'stabil',
    body: '폭주 직전의 센티넬을 긴급 진정시키기 위해 설계된 격리 공간. 폭주 수치가 80%를 넘으면 이곳으로 데려간다. S급 센티넬들이 모여 긴급으로 포박하여 데려가는 식이며, 내부는 속성 대응 소재로 코팅되어 능력을 최대한 억제하고, 감시 장비와 구속 장치가 기본 탑재된다.\n\n차가운 흰색 조명과 무음 시스템 속에서, 가이딩은 치료가 아닌 생존을 위한 절차로 진행된다. 방마다 남아 있는 불길한 그을음과 흠집들은 이곳이 단순한 휴식실이 아님을 증명한다. 구속을 통해 전담 파트너, 혹은 상황이 여의치 않을 경우 임시 가이드가 강제 가이딩을 시행하게 된다.\n\n센티넬들은 이곳에서 가이딩 받는 것에 수치심과 거부감을 느끼기에, 계속 거부할 경우의 최후의 수단으로 사용한다.',
    note: "윈터가 '말 안들으면 긴급 가이딩 시설로 보낼겁니다 ㅡㅡ' 하면서 말한 곳이 여기예용! 재밌는 공간이죠?",
  },
  { id: 'mp-igarden', code: '', en: 'INDOOR GARDEN', name: '실내 정원', zone: '2F', spot: 'igarden', body: '' },
  {
    id: 'mp-lounge', code: '04', en: 'LOUNGE', name: '라운지', zone: '2F', spot: 'lounge',
    body: 'ARCH 라운지는 카페처럼 꾸며진 휴식 공간으로, 고단한 임무 뒤 센티넬과 가이드가 긴장을 풀 수 있는 몇 안 되는 장소다. 공간 전체가 속성 간 간섭을 최소화하도록 설계되어 있으며, 한쪽 벽엔 속성별 인기 음료 메뉴가 걸려 있다. 넓은 창으로 들어오는 햇빛과 식물, 부드러운 음악이 긴장감을 완화하며, 이곳에서만큼은 요원들이 서로를 경쟁자가 아닌 동료로 느낀다.',
    note: '윈터가 다크초코민트 아이스크림을 먹는 그곳입니다!',
  },
  { id: 'mp-dining', code: '', en: 'DINING HALL', name: '식당', zone: '2F', spot: 'dining', body: '' },
  {
    id: 'mp-dome', code: '03', en: 'TRAINING DOME', name: '훈련소', alias: '훈련구역 · 훈련실', zone: 'ROOF · DOME', spot: 'dome',
    body: 'ARCH 훈련소는 거대한 돔 형태의 다목적 전투 공간으로, 센티넬들의 능력 사용 훈련과 실전 모의전을 위해 설계되었다. 벽면과 바닥은 속성 반응을 흡수하거나 반사할 수 있는 특수 소재로 제작되어 폭발·빙결·폭풍 등 다양한 능력의 충격을 견딜 수 있다. 내부는 상황에 따라 도시, 산악, 실내 구조물 등으로 자유롭게 변형되며, 전투 중 발생하는 파장과 데이터는 실시간으로 기록된다.\n\n훈련소 상단의 관람석과 VIP 전용 시뮬레이션룸에서는 파트너와 상관들이 훈련 장면을 직접 참관할 수 있으며, 일부 가이드들은 현장에서 응원하거나 훈련을 지원하기 위해 직접 배석하기도 한다. 이 때문에 훈련소는 단순한 연습장이 아니라, 파트너와 센티넬의 관계성을 실시간으로 확인할 수 있는 무대로 여겨진다.',
  },
  { id: 'mp-aqua', code: '', en: 'AQUA GARDEN', name: '수중 식물원', zone: 'B1', spot: 'aqua', body: '' },
  {
    id: 'mp-arena', code: '10', en: 'SPECIAL CONTROL ARENA', name: '특별통제 훈련장', zone: 'B2', spot: 'arena',
    body: '위험 등급의 센티넬을 위해 지하 깊숙한 곳에 만들어진 격리 시설. 어떤 속성의 힘도 견뎌낼 수 있는 특수 합금으로 만들어졌다.\n\n이곳은 센티넬이 자신의 한계를 시험하는 훈련장이자, 동시에 자신의 파괴적인 본능과 홀로 마주해야 하는 고독한 투기장이다. 센티넬끼리 대련을 하며 실력을 시험해보기도 한다.',
    note: '애쉬가 있던 그곳 맞습니다!',
  },
  {
    id: 'mp-quarters', code: '05', en: 'QUARTERS', name: '개인실', alias: '요원 거주구역', zone: 'AGENT QUARTERS', spot: 'quarters',
    body: 'ARCH의 숙소는 모든 요원에게 개인실을 제공하며, 등급에 따라 방 크기와 보안 시스템, 설비가 달라진다. S급 전용관은 호텔 스위트룸급의 고급 시설과 강력한 차폐 장치가 적용되어 있으며, C급 이하 숙소는 기능 위주의 간소한 구조다. 각자의 방은 요원의 취향과 성격이 고스란히 반영되어 꾸며지며, 가이딩은 주로 이 개인실에서 이루어진다.',
    quote: {
      text: '복도를 따라 걸으면, 공기마저 성격이 다르다.\n불속성 구역은 벽에서 미세한 열감이 전해지고, 얼음속성 구역은 숨이 차갑게 식는다.\n문마다 다른 색으로 빛나는 경고등이 달려 있는데, 그건 단순한 인테리어가 아니다.\n‘지금 이 방 안에서 가이딩 중이니 접근하지 말라’는 침묵의 신호다.',
      cite: '신규 가이드 교육 매뉴얼 中',
    },
  },
  { id: 'mp-eden', code: '', en: 'EDEN', name: '에덴 숙소동', zone: 'AGENT QUARTERS', spot: 'eden', body: '' },
  { id: 'mp-eve', code: '', en: 'EVE', name: '이브 숙소동', zone: 'AGENT QUARTERS', spot: 'eve', body: '' },
];

export const cloneAegisNodes = (list = AEGIS_NODES): ArchMapNode[] => list.map(n => ({ ...n, quote: n.quote ? { ...n.quote } : null }));

/** 예전 판들의 기본 층 · 구역 글씨 — 손대지 않았으면 지금 기본값으로 바꾼다 */
const PAST_ZONES: Record<string, string[]> = {
  'mp-sky': ['FLOATING ISLE', 'ABOVE HQ'], 'mp-core': ['COMMAND TOWER', '50F', 'CORE TOWER'], 'mp-dome': ['UPPER DECK', '1–3F · DOME'],
  'mp-lounge': ['DECK 1', '4–5F', '4F'], 'mp-quarters': ['DECK 1', 'RESIDENCE'], 'mp-harmony': ['DECK 2', '41–49F', '13–14F'], 'mp-hdiv': ['41–49F', '13–14F'],
  'mp-sdiv': ['31–40F', '11–12F'], 'mp-medbay': ['DECK 2', '11–20F', '8–9F'], 'mp-resonance': ['DECK 2', '21–30F', '10F'],
  'mp-stabil': ['DECK 3', '11–20F · ISOLATION', '7F · ISOLATION'], 'mp-igarden': ['6–10F', '5–6F'], 'mp-dining': ['4–5F', '4F'],
  'mp-aqua': ['B1–B3'], 'mp-arena': ['SUB-SEA LEVEL', 'B7', 'B5'], 'mp-eden': ['RESIDENCE'], 'mp-eve': ['RESIDENCE'],
};
/**
 * 저장된 시설 목록을 지금 지도에 맞춘다 (v2.0 사용자 요청 — 섬 · 본부 · 숙소 세 장 지도, 층수는 상식적인 범위로).
 * 관리자가 고친 이름·설명은 그대로 두고, 예전 기본 층 글씨만 새 층으로, 새로 생긴 시설(위치만 표시)은 덧붙인다.
 */
export function upgradeAegisNodes(nodes: ArchMapNode[]): ArchMapNode[] {
  const def = new Map(AEGIS_NODES.map(n => [n.id, n]));
  const out = nodes.map(n => {
    const d = def.get(n.id);
    return d && PAST_ZONES[n.id]?.includes(n.zone) ? { ...n, zone: d.zone } : n;
  });
  const have = new Set(out.map(n => n.id));
  return [...out, ...cloneAegisNodes(AEGIS_NODES.filter(n => !have.has(n.id)))];
}
