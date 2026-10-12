// 자관 질문 리스트 (v1.9) — 환경설정에서 관리하는 질문 세트.
// CP(커플)/NCP(커플 아님)로 구분 — 자관·AU의 CP/NCP에 맞는 세트를 골라 QUESTIONS 섹션에 넣는다.
// 기본 DB는 추후 사용자 제공분으로 교체 예정 — 아래 시드는 자리 표시용 소량.
import { RelCpTag, Relation, RelAu } from './charStore';

export interface RelQuestionSet {
  id: string;
  name: string;          // 세트 이름
  cat: RelCpTag;         // CP / NCP
  questions: string[];
}

export const RELQ_KEY = 'ohome.relqsets.v1';

export const RELQ_SEED: RelQuestionSet[] = [];

export const CP_LABEL: Record<RelCpTag, string> = { cp: 'CP', ncp: 'NCP' };

/** 뱃지 글자 (v2.0 사용자 요청 — CP/NCP 고르기 대신 직접 쓴다).
 *  AU에 쓴 글자 → AU의 옛 CP/NCP → 자관에 쓴 글자 → 자관의 옛 CP/NCP 순. ''(일부러 비움)이면 뱃지 없음 */
export function cpLabelFor(rel: Pick<Relation, 'cp' | 'cpText'> | null | undefined, au?: Pick<RelAu, 'cp' | 'cpText'> | null): string {
  if (au?.cpText !== undefined) return au.cpText.trim();
  if (au?.cp) return CP_LABEL[au.cp];
  if (rel?.cpText !== undefined) return rel.cpText.trim();
  return rel?.cp ? CP_LABEL[rel.cp] : '';
}

/** 쓴 글자에서 질문 리스트 분류(CP/NCP)를 정한다 — 「NCP」라고 쓴 것만 NCP, 나머지는 CP */
export const cpTagOf = (text: string): RelCpTag => (/^\s*n\s*\.?\s*cp\s*$/i.test(text) ? 'ncp' : 'cp');
