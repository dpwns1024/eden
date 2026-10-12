'use client';
// EditableDesc 주입
// 자관 리스트 (4.5) — 4:3 가로 썸네일 · 공개범위 3단계 · 멤버 색 점
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLocalList } from '@/lib/postStore';
import { Relation, REL_SEED, Character, CHAR_SEED, relPath } from '@/lib/charStore';
import { useToast } from '@/components/ui/Toast';
import { CroppedBlobImg } from '@/components/ui/CropEditor';
import { EditableDesc, PageTitle } from '@/components/ui/PageText';
import { useMainStore } from '@/lib/mainStore';
import { useCardSort, mergeOrder } from '@/lib/cardSort';
import { useBoardSkin } from '@/lib/boardSkin';
import { cpLabelFor } from '@/lib/relqStore';

export default function RelsPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const { editOn } = useMainStore();
  const [rels, setRels] = useLocalList<Relation>('ohome.rels.v1', REL_SEED);
  const [chars] = useLocalList<Character>('ohome.chars.v1', CHAR_SEED);
  // 모바일 배너(칸이 훨씬 높다)는 따로 잡은 그림 위치를 쓴다 — globals.css의 .rel-bn 모바일 구간과 같은 기준
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width:620px)');
    const on = () => setNarrow(mq.matches);
    on(); mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const colorOf = (id: string) => chars.find(c => c.id === id)?.color ?? '#666';
  const nameOf = (id: string) => chars.find(c => c.id === id)?.name ?? '';
  const arch = useBoardSkin() === 'arch';   // ARCH 디자인이면 가로 배너 목록 (v2.0 사용자 선택 E)
  const visible = rels
    .filter(r => isAdmin || r.visibility !== 'private');

  // 편집모드 카드 드래그 정렬 (v1.9)
  const sort = useCardSort(visible, next => setRels(mergeOrder(rels, next)), editOn && isAdmin);

  return (
    <section className="page page-arch">
      <div className="page-head">
        <PageTitle>RELATIONS</PageTitle>
        <EditableDesc k="rels-desc" def="자관 목록 · 4:3 가로 썸네일 · 공개범위: 전체공개/멤버공개/나만보기" />
        {/* 검색창은 뺐다 (v2.0 사용자 요청) — 버튼이 없으면 줄 자체를 두지 않아 빈 여백이 안 생긴다 */}
        {isAdmin && (
          <div className="head-actions">
            <button className="btn btn-dark" onClick={() => router.push('/rels/new')}>＋ ADD RELATION</button>
          </div>
        )}
      </div>
      {arch ? (
        /* MISSION BANNER (v2.0 사용자 선택 E) — 그림을 가로로 크게 깔고 왼쪽에 이름·정보, 오른쪽 아래 큰 번호.
           카드형과 같은 동작: 클릭 열람 · 멤버공개 안내 · 나만보기 흐리게 · 편집모드 드래그 정렬 */
        <div className="rel-bns">
          {visible.map((r, i) => {
            const memberLocked = r.visibility === 'member' && !user;
            const priv = r.visibility === 'private';
            const sp = sort(i) as { style?: React.CSSProperties };
            // 상세 배너와 같은 그림·위치(첫 일러 + 상세에서 잡은 위치), 없으면 리스트 썸네일
            const art = r.arts?.[0] ?? r.thumbId;
            // 목록 배너 위치(수정 화면의 「목록 배너 위치」)가 있으면 그것 → 상세 배너 위치 → 썸네일 위치
            const crop = r.listCrop || (art && r.artCrops?.[art]) || (art === r.thumbId ? r.thumbCrop : undefined);
            // 모바일은 배너가 훨씬 높아 따로 잡은 위치(모바일 배너 위치)가 있으면 그것
            const cropM = r.listCropM || crop;
            const cp = cpLabelFor(r);
            const no = String(i + 1).padStart(3, '0');
            return (
              <div key={r.id} className="rel-bn" {...sort(i)}
                style={{ ...(priv ? { opacity: .45 } : undefined), ...sp.style }}
                onClick={() => {
                  if (editOn) return;
                  if (memberLocked) { toast('멤버공개 — 로그인 후 열람할 수 있습니다'); return; }
                  router.push(relPath(r));
                }}>
                <div className="bn-art">
                  <CroppedBlobImg fileRef={art} crop={narrow ? cropM : crop} ph={r.thumbClass} label="" />
                </div>
                <div className="bn-tx">
                  <b>
                    {r.name}
                    {r.visibility === 'member' && <span className="pill">멤버</span>}
                  </b>
                  {r.catchphrase && <small>{r.catchphrase}</small>}
                  <div className="bn-m">
                    {cp && <em>{cp}</em>}
                    {r.members.map(m => (
                      <span key={m.charId}><i style={{ background: colorOf(m.charId) }} />{nameOf(m.charId)}</span>
                    ))}
                    {r.aus.length > 1 && <span className="au">AU {r.aus.length - 1}</span>}
                  </div>
                  {(priv || memberLocked) && <span className="bn-lock">{priv ? '관리자에게만 표시됨' : '로그인 시 열람 가능'}</span>}
                </div>
                <span className="bn-no">{no}</span>
              </div>
            );
          })}
        </div>
      ) : (
      <div className="g3 rels-grid">
        {visible.map((r, i) => {
          const memberLocked = r.visibility === 'member' && !user;
          const priv = r.visibility === 'private';
          const sp = sort(i) as { style?: React.CSSProperties };
          return (
            <div key={r.id} className="rel-card" {...sort(i)}
              style={{ ...(priv ? { opacity: .45 } : undefined), ...sp.style }}
              onClick={() => {
                if (editOn) return;
                if (memberLocked) { toast('멤버공개 — 로그인 후 열람할 수 있습니다'); return; }
                router.push(relPath(r));
              }}>
              <div className="thumb" style={{ position: 'relative' }}>
                <CroppedBlobImg fileRef={r.thumbId} crop={r.thumbCrop} ph={r.thumbClass}
                  label={priv ? '나만보기' : memberLocked ? '멤버공개' : '4:3'} />
              </div>
              <div className="nm">
                {/* 리스트에서는 기본 폰트로 통일 — 개별 이름 폰트는 상세에서만 */}
                <b>
                  {r.name}
                  {r.visibility === 'member' && <span className="pill" style={{ marginLeft: 6 }}>멤버</span>}
                </b>
                {/* 권한 안내 문구만 필요 시 표시 (캐치프레이즈·인원 수 제거) */}
                {(priv || memberLocked) && (
                  <span>
                    {priv ? '관리자에게만 표시됨' : '로그인 시 열람 가능'}
                  </span>
                )}
                {r.members.length > 0 && (
                  <div className="who">
                    {r.members.map(m => <i key={m.charId} style={{ background: colorOf(m.charId) }} />)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </section>
  );
}
