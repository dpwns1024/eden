'use client';
// 본문(페이지)에서 난 오류 — 머리 · 메뉴는 그대로 두고 본문 자리에만 (components/shell/ErrorScreen.tsx)
import { ErrorScreen } from '@/components/shell/ErrorScreen';

export default function Error({ error }: { error: Error & { digest?: string } }) {
  return <ErrorScreen error={error} />;
}
