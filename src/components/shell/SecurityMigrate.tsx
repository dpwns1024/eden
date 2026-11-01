'use client';
// 보안 점검 후속 정리 (v2.0) — 관리자가 접속하면 한 번만, 이미 서버에 올라간 옛 데이터를 새 방식으로 옮긴다.
//
//   1. 비밀글(게시판·방명록) → 나만보기로 다시 저장 (예전엔 공개로 저장되고 화면에서만 가렸다)
//   2. FIELD REPORT 글 비밀번호 → 서버 대조 방식으로 (목록 문서에 평문으로 있던 비밀번호를 지운다)
//      + 본문이 아직 목록 문서 안에 들어 있던 아주 옛 글은 본문 문서로 분리
//   3. 이미 가입한 회원 → 정식 회원 증명(members) 발급 — 새 보안 규칙을 붙여넣은 뒤에만 된다
//   4. 가입코드 → 서버에 해시로만 (공개 설정에 평문으로 있던 값을 지운다) — 3이 된 뒤에
//   5. 보호 설정(vault — ARCH 문서 · HTML 페이지 · 인트로 · 스케줄러)을 쓸 수 있는 규칙인지 확인 — 옮겨 담기는
//      설정을 받을 때 백엔드가 한다 (lib/settingVault.ts). 규칙이 옛것이면 관리자에게 알린다
//   6. 더는 쓰지 않는 옛 설정 지우기 — 사이트 설정은 누구나 읽으므로, 코드에서 빠진 뒤에도 서버에 남아
//      F12로 보이던 값을 비운다 (2026-11 보안 점검: 옛 「사이트 입장 비밀번호」 ohome.homepass.v1이 평문으로 남아 있었다)
//
// 끝난 단계는 사이트 설정(ohome.secmig.v1)에 적어 다시 돌지 않는다. 실패한 단계는 다음 접속 때 다시 시도.
import { useEffect, useRef } from 'react';
import { useAuth, inviteCode, setInviteCode } from '@/lib/auth';
import { backend, isServerMode, type ListItem } from '@/lib/backend';
import { getSetting, setSetting, removeSetting } from '@/lib/settingStore';
import { menuLockSupported, INVITE_LOCK_KEY, SEC_MIG_KEY } from '@/lib/menuLock';
import { setLogPassword } from '@/lib/logLock';
import { VAULT_COLL } from '@/lib/settingVault';
import { bodyVisibility, bodyPwLock, type TrpgLog, type TrpgLogBody } from '@/lib/galleryStore';
import { useToast } from '@/components/ui/Toast';

type Mig = { secret?: number; logs?: number; invite?: number; members?: number; vault?: number };

/** 더는 쓰지 않는데 서버에 남아 있을 수 있는 공개 설정 — 값이 있으면 매 관리자 접속 때 비운다 */
const OBSOLETE_SETTING_KEYS = [
  'ohome.homepass.v1',   // 옛 사이트 입장 비밀번호 — 평문이었다 (#19에서 기능은 지웠지만 값이 남았다)
] as const;

/** 옛 글에서 본문 문서로 옮길 칸 */
const LEGACY_BODY = ['body', 'bodyId', 'bodyHtml', 'originalFileId', 'originalName'] as const;

export function SecurityMigrate() {
  const { isAdmin, ready, user } = useAuth();
  const toast = useToast();
  const ran = useRef(false);

  useEffect(() => {
    if (!ready || !isAdmin || ran.current || !isServerMode()) return;
    const be = backend();
    if (!be) return;
    ran.current = true;
    const uid = user?.id ?? null;
    const done: Mig = { ...(getSetting<Mig>(SEC_MIG_KEY, {}) ?? {}) };
    const mark = (k: keyof Mig) => { done[k] = Date.now(); setSetting(SEC_MIG_KEY, { ...done }); };

    void (async () => {
      // 1. 비밀글 → 나만보기 (저장 단계 metaOf가 secret을 보고 좁힌다)
      if (!done.secret) {
        try {
          for (const coll of ['posts', 'guestbook']) {
            const rows = await be.fetchList<ListItem>(coll);
            const targets = rows.filter(r => r.secret === true);
            if (targets.length) await be.refreshVis(coll, targets, uid);
          }
          mark('secret');
        } catch { /* 다음 접속 때 */ }
      }

      // 6. 옛 설정 지우기 (위 OBSOLETE_SETTING_KEYS) — 백엔드 종류와 무관
      for (const k of OBSOLETE_SETTING_KEYS) {
        if (getSetting<unknown>(k, null) == null) continue;
        try { await be.saveSetting(k, null); removeSetting(k); } catch { /* 다음 접속 때 */ }
      }

      if (!menuLockSupported()) return;   // 아래는 Firebase(서버 대조)에서만

      // 2. FIELD REPORT — 평문 비밀번호를 서버로, 목록 문서 안의 옛 본문은 본문 문서로
      if (!done.logs) {
        try {
          const logs = await be.fetchList<TrpgLog & ListItem>('trpg_logs');
          const bodies = await be.fetchList<TrpgLogBody & ListItem>('trpg_log_bodies');
          const fixLogs: ListItem[] = [];
          const fixBodies: ListItem[] = [];
          const newBodies: ListItem[] = [];
          let failed = false;
          for (const l of logs) {
            const legacyBody = LEGACY_BODY.some(k => l[k] !== undefined && l[k] !== null);
            const pw = typeof l.password === 'string' && l.password ? l.password : '';
            if (!pw && !legacyBody) continue;
            if (pw) {
              const r = await setLogPassword(l.id, pw);
              if (!r.ok) { failed = true; continue; }
            }
            const pwLock = !!pw || !!l.pwLock || undefined;
            const nl: ListItem = { ...l, pwLock };
            delete nl.password;
            LEGACY_BODY.forEach(k => { delete nl[k]; });
            if (!pwLock) delete nl.pwLock;
            fixLogs.push(nl);
            const bd = bodies.find(b => b.id === l.id);
            const vis = bodyVisibility({ visibility: l.visibility, pwLock });
            const lockBody = bodyPwLock({ visibility: l.visibility, pwLock });
            if (bd) {
              const nb: ListItem = { ...bd, visibility: vis };
              if (lockBody) nb.pwLock = true; else delete nb.pwLock;
              fixBodies.push(nb);
            } else {
              // 아직 본문이 목록 문서 안에 있던 옛 글 — 본문 문서를 새로 만든다
              const nb: ListItem = { id: l.id, body: l.body ?? '', visibility: vis, ...(lockBody ? { pwLock: true } : {}) };
              (['bodyId', 'bodyHtml', 'originalFileId', 'originalName'] as const).forEach(k => {
                if (l[k] !== undefined && l[k] !== null) nb[k] = l[k];
              });
              if (typeof l.secId === 'string') nb.secId = l.secId;
              newBodies.push(nb);
            }
          }
          // 본문을 먼저 안전한 곳에 두고 → 그 다음 목록 문서에서 비밀번호·본문을 지운다
          if (newBodies.length) await be.syncList('trpg_log_bodies', [], newBodies, uid);
          if (fixBodies.length) await be.refreshVis('trpg_log_bodies', fixBodies, uid, true);
          if (fixLogs.length) await be.refreshVis('trpg_logs', fixLogs, uid, true);
          if (!failed) mark('logs');
        } catch { /* 다음 접속 때 */ }
      }

      // 3. 기존 회원 → 정식 회원 증명. 새 보안 규칙이 없으면 거부된다 — 그땐 관리자에게 알리고 다음 접속 때 다시
      if (!done.members && be.grantMembers) {
        try {
          const members = await be.listMembers();
          const r = await be.grantMembers(members.map(m => m.id));
          if (r.ok) mark('members');
          else if (r.error === 'rules') {
            toast('보안이 강화된 새 Firestore 규칙을 아직 붙여넣지 않았습니다 — 환경설정 → 회원/보안 → 보안 규칙을 복사해 Firebase 콘솔에 붙여넣고 게시해 주세요');
          }
        } catch { /* 다음 접속 때 */ }
      }
      // 4. 가입코드 → 서버 해시
      // 회원 증명이 서버에서 확인된 뒤에만 — 옛 규칙에선 가입코드를 서버로 옮기면 가입이 막힌다
      if (!done.invite && done.members) {
        try {
          const r = await be.setLockPassword(INVITE_LOCK_KEY, inviteCode());
          if (r.ok) { setInviteCode(''); mark('invite'); }
        } catch { /* 다음 접속 때 */ }
      }
      // 5. 보호 설정 규칙 확인 — 관리자는 vault를 통째로 읽을 수 있어야 한다
      if (!done.vault && be.kind === 'firebase') {
        try {
          await be.fetchList(VAULT_COLL);
          mark('vault');
        } catch {
          toast('ARCH 문서 · HTML 페이지 · 인트로 · 스케줄러를 서버에서 가리려면 새 Firestore 규칙이 필요합니다 — 환경설정 → 회원/보안 → 보안 규칙을 복사해 Firebase 콘솔에 붙여넣고 게시해 주세요');
        }
      }

    })();
  }, [ready, isAdmin, user, toast]);

  return null;
}
