'use client';
/**
 * HTML 페이지 (v2.0 사용자 요청) — 메뉴에 붙이는 「HTML 한 장짜리 페이지」.
 *
 * 메인의 HTML 블록과 같은 방식으로 그린다: 사용자 HTML을 그대로(스크립트만 걷어 내고) 화면 폭 전체에.
 * 페이지 큰 제목·패널 같은 틀을 두지 않는다 — 디자인 전부를 HTML이 정하게 하려는 것이다.
 * 여러 개 만들 수 있다(섹션 `/page?s=…`). 본문은 lib/htmlPageStore.ts.
 * 관리자에게만 오른쪽 위 작은 EDIT 버튼이 보이고, 누르면 이 자리에서 HTML을 고친다.
 *
 * 탭 문서 (v2.0 사용자 요청): 이 섹션에 탭 문서가 있으면 HTML 대신 그것을 그린다(lib/archDocStore.ts).
 * 아직 없더라도 HTML이 ARCH 소개 모양이면 읽어서 탭 문서로 보여 준다 — 처음 SAVE하는 순간 따로 저장되고,
 * 원래 HTML은 그대로 남아 「HTML로 되돌리기」로 돌아갈 수 있다.
 */
import React, { Suspense } from 'react';
import { useSectionParam } from '@/lib/sectionStore';
import { HtmlPageBody } from '@/components/archdoc/HtmlPageBody';

function HtmlPageInner() {
  const { id, name } = useSectionParam('page');
  return <HtmlPageBody id={id} name={name} />;
}

export default function HtmlPage() {
  return (
    <Suspense fallback={<section className="htmlpage" />}>
      <HtmlPageInner />
    </Suspense>
  );
}
