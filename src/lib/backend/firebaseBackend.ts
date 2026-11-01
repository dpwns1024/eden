'use client';
// Firebase 백엔드 — Firestore(문서=항목) + Auth + Storage
// 권한 규칙: firebase/firestore.rules · firebase/storage.rules
//
// Supabase 판과 같은 모양으로 맞춘 부분:
//  · 컬렉션 이름 동일 (posts, characters, …)
//  · 문서 = 항목 하나, 필드는 { data, authorId, visibility, sort }
//  · 관리자 판정은 meta/owner 문서 — 첫 로그인 계정이 소유자로 등록된다(규칙이 1회만 허용)
import {
  Backend, BackendCheck, BackendConfig, BackendUser, ListItem, diffList, metaOf,
} from './types';
import { visFloorOf, lockKeyOfItem } from '../visFloor';
import { lockHash, lockedKeys, INVITE_LOCK_KEY, sitePwOn, COMMON_LOCK_KEY } from '../menuLock';
import { VAULT_COLL, VAULT_KEYS, isVaultMark, vaultMerge, vaultSplit, type VaultItem } from '../settingVault';

type FirebaseCfg = Extract<BackendConfig, { kind: 'firebase' }>;

export async function createFirebaseBackend(cfg: FirebaseCfg): Promise<Backend> {
  const [{ initializeApp, getApps, getApp }, authMod, fsMod, stMod] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
    import('firebase/storage'),
  ]);

  const app = getApps().length ? getApp() : initializeApp({
    apiKey: cfg.apiKey,
    authDomain: cfg.authDomain,
    projectId: cfg.projectId,
    storageBucket: cfg.storageBucket,
    appId: cfg.appId,
    ...(cfg.messagingSenderId ? { messagingSenderId: cfg.messagingSenderId } : {}),
  });

  const auth = authMod.getAuth(app);
  // 콘솔에서 데이터베이스를 (default)가 아닌 이름으로 만든 경우를 위해 ID를 받는다
  const dbId = (cfg.databaseId ?? '').trim();
  const named = !!dbId && dbId !== '(default)';
  // ignoreUndefinedProperties — 화면 데이터에는 값이 없는 필드가 undefined로 남는데(grants 등),
  // JSON 저장에서는 자동으로 빠지지만 Firestore는 거부한다. 같은 동작이 되도록 건너뛰게 한다.
  const db = (() => {
    const opts = { ignoreUndefinedProperties: true };
    try {
      return named ? fsMod.initializeFirestore(app, opts, dbId) : fsMod.initializeFirestore(app, opts);
    } catch {
      // 이미 만들어진 인스턴스가 있으면 그걸 쓴다 (백엔드를 두 번 만드는 경로)
      return named ? fsMod.getFirestore(app, dbId) : fsMod.getFirestore(app);
    }
  })();
  const storage = stMod.getStorage(app);

  const {
    collection, doc, getDoc, getDocs, getDocsFromServer, setDoc, deleteDoc, query, where, onSnapshot, writeBatch, limit,
  } = fsMod;
  type Cons = ReturnType<typeof where>;

  // Firestore SDK는 서버에 못 닿으면 무한 재시도한다 — 쓰기가 영영 안 끝나는 것을 막는다
  const TIMEOUT = Symbol('timeout');
  const withLimit = <X,>(p: Promise<X>, ms = 12000) =>
    Promise.race([p, new Promise<typeof TIMEOUT>(r => setTimeout(() => r(TIMEOUT), ms))]);
  const NO_REACH = dbId
    ? `Firestore에 저장하지 못했습니다 — 데이터베이스 ID "${dbId}"가 맞는지 확인해 주세요.`
    : 'Firestore에 저장하지 못했습니다 — 데이터베이스가 만들어졌는지, 이름이 (default)인지 확인해 주세요.';

  /** 관리자 여부 — meta/owner 문서의 uid 또는 admins 목록 */
  const ownerInfo = async (): Promise<{ uid?: string; admins?: string[] } | null> => {
    try {
      const snap = await getDoc(doc(db, 'meta', 'owner'));
      return snap.exists() ? (snap.data() as { uid?: string; admins?: string[] }) : null;
    } catch { return null; }
  };

  // 목록을 읽을 때마다 meta/owner를 다시 읽지 않도록 (읽기 횟수도 요금이다)
  let ownerCache: { uid?: string; admins?: string[] } | null | undefined;
  const ownerNow = async () => {
    if (ownerCache === undefined) ownerCache = await ownerInfo();
    return ownerCache;
  };
  const isAdminNow = async () => {
    const u = auth.currentUser;
    if (!u) return false;
    const own = await ownerNow();
    return own?.uid === u.uid || (own?.admins ?? []).includes(u.uid);
  };
  /* 메뉴 비밀번호 통과 기록 (익명 로그인 방문자) — 아직 유효한 것만.
     (컬렉션·칸 이름의 board는 처음 게시판 단위였던 흔적 — 값은 메뉴 잠금키, lib/menuLock.ts)
     비밀번호가 바뀌면 기록은 남아 있어도 규칙이 거부하므로, 잠긴 글 질의를 한 번 던져 확인한다 */
  let unlockedCache: Promise<string[]> | undefined;
  authMod.onAuthStateChanged(auth, () => { ownerCache = undefined; unlockedCache = undefined; });
  const loadUnlocked = async (locked: Set<string> = lockedKeys()): Promise<string[]> => {
    const u = auth.currentUser;
    if (!u || !u.isAnonymous) return [];
    if (!locked.size) return [];
    try {
      const snap = await getDocsFromServer(query(collection(db, 'board_unlocks'), where('uid', '==', u.uid)));
      const ids = snap.docs.map(d => (d.data() as { boardId?: string }).boardId).filter((b): b is string => !!b && locked.has(b));
      const ok = await Promise.all(ids.map(async b => {
        try {
          await getDocsFromServer(query(collection(db, 'posts'), where('visibility', '==', 'locked'), where('lockBoard', '==', b), limit(1)));
          return b;
        } catch { return null; }
      }));
      return ok.filter((b): b is string => !!b);
    } catch { return []; }
  };
  const unlockedNow = () => (unlockedCache ??= loadUnlocked());
  /** 공통 비밀번호 해시를 두는 문서 id (members 컬렉션 — 관리자만 읽고 쓴다) */
  const SITE_PW_DOC = '__sitepw';
  const lockSaveError = (e: unknown) => {
    const code = (e as { code?: string })?.code ?? '';
    return code.includes('permission-denied')
      ? '저장이 거부됐습니다 — 새 보안 규칙을 Firebase 콘솔에 먼저 붙여넣고 게시해 주세요.'
      : humanError(e);
  };

  /**
   * 로그인 상태에 맞는 목록 질의 조건.
   *
   * Firestore는 **규칙으로 못 읽을 문서가 섞일 수 있는 질의를 통째로 거부한다.**
   * (Supabase의 RLS는 행을 조용히 걸러 주므로 조건 없이 읽어도 되지만, 여기서는 아니다.)
   * 조건 없이 읽으면 비로그인 방문자에게 전체공개 글까지 하나도 안 보인다 — 목록 요청 자체가 거부되기 때문.
   *
   * 정렬(orderBy)은 일부러 붙이지 않는다. where + orderBy 조합은 복합 색인을 만들어야 해서
   * 설치한 사람이 콘솔에서 색인을 추가해야 하기 때문 — 대신 받은 뒤 sort로 정렬한다.
   */
  /* locked — 잠긴 곳 목록을 직접 줄 때 (설정을 처음 받는 중이라 캐시가 아직 비어 있을 때 — 보호 설정 읽기) */
  const readSets = async (locked?: Set<string>): Promise<Cons[][]> => {
    const u = auth.currentUser;
    if (!u) return [[where('visibility', '==', 'public')]];
    // 익명 = 메뉴 비밀번호를 통과한 방문자 — 전체공개 + 통과한 메뉴의 잠긴 글만 (메뉴마다 질의 하나)
    if (u.isAnonymous) {
      const open = locked ? await loadUnlocked(locked) : await unlockedNow();
      return [[where('visibility', '==', 'public')],
        ...open.map(b => [where('visibility', '==', 'locked'), where('lockBoard', '==', b)])];
    }
    if (await isAdminNow()) return [[]];                    // 관리자는 전부
    // 회원: 전체공개+회원공개(+잠긴 메뉴), 그리고 내가 쓴 것(비공개 포함)은 따로 받아 합친다.
    // 'locked'는 잠긴 메뉴가 있을 때만 넣는다 — 새 규칙을 넣기 전의 서버에서도 질의가 거부되지 않게
    const vis = (locked ?? lockedKeys()).size ? ['public', 'member', 'locked'] : ['public', 'member'];
    return [[where('visibility', 'in', vis)], [where('authorId', '==', u.uid)]];
  };

  const listQuery = (coll: string, cs: Cons[]) =>
    (cs.length ? query(collection(db, coll), ...cs) : query(collection(db, coll)));

  /* 서버 문서의 작성자 칸(authorId) — 화면 데이터에 authorId가 없는 종류(캐릭터 등)를 고쳐 저장할 때
     작성자가 「저장한 사람」으로 바뀌지 않게 받아 둔다 (2026-11 보안 점검 — 보안 규칙이 이제 관리자 아닌
     사람이 작성자를 바꾸는 저장을 거부한다. 예전엔 편집 권한을 받은 회원이 저장하면 글이 그 회원 것이 됐다) */
  const authorSeen = new Map<string, string | null>();

  const listWith = async <T extends ListItem>(coll: string, sets: Cons[][]): Promise<T[]> => {
    // 반드시 getDocsFromServer — 일반 getDocs는 로컬(오프라인) 캐시가 있으면 그걸로 조용히 성공해
    // 버린다. 실시간 구독이 한 번의 쓰기에 두 번(로컬 반영·서버 확정) 반응해 재조회가 겹칠 때
    // 낡은 캐시 결과가 방금 반영된 변경을 도로 덮어써 "새로고침해야 보임"이 되던 원인 중 하나
    // (v2.0 사용자 발견 — 목록 숨김을 바꿔도 반영이 안 되는 것처럼 보임)
    // 질의 하나가 거부돼도(통과 기록이 낡은 게시판 등) 나머지는 보여 준다 — 전부 실패할 때만 오류
    const settled = await Promise.allSettled(sets.map(cs => getDocsFromServer(listQuery(coll, cs))));
    const snaps = settled.flatMap(r => (r.status === 'fulfilled' ? [r.value] : []));
    if (!snaps.length) throw (settled[0] as PromiseRejectedResult).reason;
    // 두 질의(공개분 · 내 글)를 합치므로 문서 id로 중복을 없앤 뒤 sort로 정렬한다
    const seen = new Map<string, { sort: number; item: T }>();
    snaps.forEach(s => s.docs.forEach(d => {
      if (seen.has(d.id)) return;
      const raw = d.data() as { data?: Record<string, unknown>; sort?: number; authorId?: string | null };
      authorSeen.set(`${coll}/${d.id}`, typeof raw.authorId === 'string' ? raw.authorId : null);
      seen.set(d.id, { sort: raw.sort ?? 0, item: { ...(raw.data ?? {}), id: d.id } as T });
    }));
    return [...seen.values()].sort((a, b) => a.sort - b.sort).map(v => v.item);
  };

  const syncWith = async <T extends ListItem>(coll: string, prev: T[], next: T[], uid: string | null) => {
    const { inserts, updates, moves, deletes } = diffList(prev, next);
    const ops = [...inserts, ...updates];
    const updated = new Set(updates.map(u => u.item.id));
    // Firestore 배치는 500개 제한에 **요청 크기 10MiB 제한**도 있다 (v2.0 포크 제보 — 큰 로그
    // 본문 저장 실패). 개수(400)만 보고 끊으면 700KB짜리 본문 문서 십수 개에 10MiB를 넘어
    // 배치가 통째로 거부된다 — 대략 크기를 재서 8MB쯤에서 미리 끊는다.
    const parts: { item: T; sort: number }[][] = [];
    let cur: { item: T; sort: number }[] = [];
    let bytes = 0;
    for (const op of ops) {
      const size = JSON.stringify(op.item).length + 200;
      if (cur.length && (cur.length >= 400 || bytes + size > 8_000_000)) { parts.push(cur); cur = []; bytes = 0; }
      cur.push(op); bytes += size;
    }
    if (cur.length) parts.push(cur);
    for (const part of parts) {
      const batch = writeBatch(db);
      part.forEach(({ item, sort }) => {
        const meta = metaOf(item, uid, visFloorOf(coll, item));
        const { visibility, editorIds } = meta;
        // 고치는 글은 서버에 있던 작성자를 그대로 (위 authorSeen) — 화면 데이터에 작성자가 적힌 글은 그 값
        const known = authorSeen.get(`${coll}/${item.id}`);
        const authorId = updated.has(item.id) && !(typeof item.authorId === 'string' && item.authorId) && known !== undefined
          ? known : meta.authorId;
        authorSeen.set(`${coll}/${item.id}`, authorId);
        batch.set(doc(db, coll, item.id), {
          data: item, authorId, visibility, editorIds, sort, updatedAt: Date.now(),
          lockBoard: visibility === 'locked' ? lockKeyOfItem(coll, item) : null,
        });
      });
      await batch.commit();
    }
    const chunk = <X,>(arr: X[], n: number) =>
      Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
    // 자리만 바뀐 항목 — sort만 고친다 (본문까지 다시 보내지 않게, 위 diffList 주석 참조)
    for (const part of chunk(moves, 400)) {
      const batch = writeBatch(db);
      part.forEach(({ id, sort }) => batch.update(doc(db, coll, id), { sort, updatedAt: Date.now() }));
      await batch.commit();
    }
    for (const part of chunk(deletes, 400)) {
      const batch = writeBatch(db);
      part.forEach(id => batch.delete(doc(db, coll, id)));
      await batch.commit();
      part.forEach(id => authorSeen.delete(`${coll}/${id}`));
    }
  };

  /* ── 보호 설정 (lib/settingVault.ts) ──────────────────────────────
     ARCH 탭 문서 · HTML 페이지 · 인트로 · 스케줄러 일정은 설정(누구나 읽음) 대신 vault 조각으로 저장해
     서버가 메뉴 공개범위 · 비밀번호대로 가린다. 설정 자리에는 표시(__vault)와 공개 틀만 남는다. */
  let vaultRows: VaultItem[] | null = null;    // 관리자가 마지막으로 받은(또는 쓴) 조각 — 바뀐 것만 쓰려고
  let vaultUsed = false;                       // 이 홈이 보호 설정을 쓰기 시작했는가 (설정에 표시가 하나라도 있음)
  let vaultChain: Promise<unknown> = Promise.resolve();
  /* 이 브라우저가 받아 본 조각 — 화면 값에 없는 조각을 「지웠다」고 볼 수 있는 건 받아 본 것뿐이다.
     로그인 상태가 늦게 잡혀 공개분만 받은 채 저장하면, 못 받은 조각(회원 전용 페이지 등)이 지워질 뻔했다 */
  const seenVault = new Set<string>();
  const settingDoc = (key: string, value: unknown) => setDoc(doc(db, 'settings', key), { value, updatedAt: Date.now() });

  const mergeVault = async (out: Record<string, unknown>) => {
    const marked = [...VAULT_KEYS].filter(k => isVaultMark(out[k]));
    if (marked.length) vaultUsed = true;
    const admin = await isAdminNow().catch(() => false);
    let rows: VaultItem[] = [];
    let listed = false;
    if (marked.length || admin) {
      try {
        // 설정을 처음 받는 중이라 화면 캐시는 아직 비어 있다 — 잠긴 곳 목록은 방금 받은 설정에서 읽는다
        const get = <T,>(k: string, fb: T) => (out[k] ?? fb) as T;
        rows = await listWith<VaultItem>(VAULT_COLL, await readSets(lockedKeys(get)));
        if (admin) vaultRows = rows;
        listed = true;
      } catch { /* 새 보안 규칙을 넣기 전 — 조각 없이 */ }
    }
    rows.forEach(r => seenVault.add(r.id));
    for (const k of marked) {
      const m = out[k] as { base: unknown };
      out[k] = vaultMerge(k, m.base, rows.filter(r => r.key === k));
    }
    // 관리자: 아직 설정에 통째로 있는 것을 옮겨 담는다 (새 보안 규칙을 넣은 뒤 첫 접속 · 옛 백업 복원 뒤)
    // (vault를 못 읽으면 = 규칙이 옛것 — 옮겨 담기도 거부되므로 시도하지 않는다)
    if (admin && listed) {
      for (const k of VAULT_KEYS) {
        if (!marked.includes(k) && out[k] != null) void queueVault(k, out[k], true).catch(() => { /* 다음 접속에 다시 */ });
      }
    }
  };

  const saveVault = async (key: string, value: unknown, migrating: boolean) => {
    const uid = auth.currentUser?.uid ?? null;
    if (!vaultRows) {
      try { vaultRows = await listWith<VaultItem>(VAULT_COLL, [[]]); } catch { vaultRows = null; }
    }
    const prev = (vaultRows ?? []).filter(r => r.key === key);
    if (value == null) {   // 초기화 — 조각도 지운다
      if (prev.length) { await syncWith(VAULT_COLL, prev, [], uid); vaultRows = (vaultRows ?? []).filter(r => r.key !== key); }
      await settingDoc(key, null);
      return;
    }
    const split = vaultSplit(key, value);
    const base = split.base;
    // 받아 본 적 없는 조각은 그대로 둔다 (위 seenVault)
    const ids = new Set(split.items.map(i => i.id));
    const items = [...split.items, ...prev.filter(r => !ids.has(r.id) && !seenVault.has(r.id))];
    try {
      await syncWith(VAULT_COLL, prev, items, uid);
    } catch (e) {
      if (migrating) return;
      // 새 보안 규칙(vault)을 아직 안 넣은 홈 — 예전처럼 설정에 통째로 저장한다.
      // 이미 옮겨 둔 적이 있으면 공개 자리로 되돌리지 않고 실패를 알린다(화면에 「저장 실패」)
      if (!vaultUsed) { await settingDoc(key, value); return; }
      throw e;
    }
    // 복사해 둔다 — 화면이 같은 객체를 고쳐도 다음 저장의 비교 기준이 함께 바뀌지 않게
    vaultRows = [...(vaultRows ?? []).filter(r => r.key !== key), ...(JSON.parse(JSON.stringify(items)) as VaultItem[])];
    items.forEach(i => seenVault.add(i.id));
    vaultUsed = true;
    await settingDoc(key, { __vault: 1, base });
  };
  /** 같은 키를 겹쳐 쓰면 diff 기준이 꼬이므로 한 줄로 세워 차례로 쓴다 */
  const queueVault = (key: string, value: unknown, migrating = false) => {
    const run = () => saveVault(key, value, migrating);
    const p = vaultChain.then(run, run);
    vaultChain = p.catch(() => undefined);
    return p;
  };

  const toUser = async (u: { uid: string; email?: string | null; displayName?: string | null } | null): Promise<BackendUser | null> => {
    if (!u) return null;
    // 익명 로그인(메뉴 비밀번호 통과용)은 화면에서는 비로그인 방문자다
    if ((u as { isAnonymous?: boolean }).isAnonymous) return null;
    // 이메일을 그대로 이름으로 쓰지 않는다 — 회원 목록·댓글에 남의 메일 주소가 그대로 노출된다.
    // (프로필 저장 직후에는 displayName이 아직 비어 있어 여기로 떨어질 수 있다)
    let nickname = u.displayName || (u.email ? u.email.split('@')[0] : 'user');
    let avatarUrl: string | undefined;
    let avatarColor: string | undefined;
    try {
      const p = await getDoc(doc(db, 'profiles', u.uid));
      if (p.exists()) {
        const d = p.data() as { nickname?: string; avatarUrl?: string; avatarColor?: string };
        nickname = d.nickname ?? nickname;
        avatarUrl = d.avatarUrl;
        avatarColor = d.avatarColor;
      }
    } catch { /* 규칙이 막으면 기본값 */ }
    const own = await ownerInfo();
    const isAdmin = !!own && (own.uid === u.uid || (own.admins ?? []).includes(u.uid));
    return {
      id: u.uid, nickname, role: isAdmin ? 'admin' : 'member',
      email: u.email ?? undefined, avatarUrl, avatarColor,
    };
  };

  const humanError = (e: unknown): string => {
    const code = (e as { code?: string })?.code ?? '';
    if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
      return '아이디 또는 비밀번호가 올바르지 않습니다.';
    }
    if (code.includes('email-already-in-use')) return '이미 사용 중인 이메일입니다.';
    if (code.includes('weak-password')) return '비밀번호는 6자 이상이어야 합니다.';
    if (code.includes('invalid-email')) return '이메일 형식이 올바르지 않습니다.';
    if (code.includes('operation-not-allowed')) return 'Firebase 콘솔에서 이메일/비밀번호 로그인을 켜 주세요 (Authentication → Sign-in method).';
    if (code.includes('permission-denied')) return '권한이 없습니다 — 보안 규칙이 적용됐는지 확인해 주세요.';
    return (e as { message?: string })?.message ?? '알 수 없는 오류입니다.';
  };

  return {
    kind: 'firebase',

    async check(): Promise<BackendCheck> {
      const fail = (p: Partial<BackendCheck>): BackendCheck =>
        ({ ok: false, reachable: false, schema: false, hasAdmin: false, message: '', ...p });
      // Firestore는 테이블을 미리 만들지 않는다 — 대신 "읽기가 되는지(규칙 적용 여부)"를 본다.
      // 반드시 getDocsFromServer — 일반 getDocs는 서버에 못 닿아도 로컬 캐시로 성공해서,
      // 데이터베이스가 없는데도 확인을 통과시켜 버린다(그 뒤 쓰기에서 멈춘다).
      try {
        const r = await withLimit(getDocsFromServer(query(collection(db, 'settings'), limit(1))));
        if (r === TIMEOUT) {
          return fail({ message: '응답이 없습니다 — projectId가 맞는지, Firestore 데이터베이스를 만들었는지 확인해 주세요.' });
        }
      } catch (e) {
        const code = (e as { code?: string })?.code ?? '';
        const msg = (e as { message?: string })?.message ?? '';
        if (code.includes('permission-denied')) {
          return fail({ reachable: true, message: '보안 규칙이 아직 적용되지 않았습니다 — 아래 규칙을 Firebase 콘솔의 Firestore → 규칙에 붙여넣고 게시해 주세요.' });
        }
        // 데이터베이스 자체가 없을 때 — 가장 흔한 첫 설치 실수
        if (code.includes('not-found') || /Database .* not found|NOT_FOUND/i.test(msg)) {
          return fail({
            message: dbId
              ? `"${dbId}" 데이터베이스를 찾을 수 없습니다 — Firebase 콘솔의 Firestore Database에서 그 이름이 맞는지 확인해 주세요.`
              : 'Firestore 데이터베이스가 없습니다 — Firebase 콘솔 → Firestore Database에서 [데이터베이스 만들기]를 먼저 해 주세요. 이미 만들었다면 데이터베이스 ID가 (default)인지 확인해 주세요.',
          });
        }
        if (code.includes('unavailable') || code.includes('failed-precondition')) {
          return fail({ message: 'Firestore가 아직 준비되지 않았습니다 — Firebase 콘솔에서 Firestore 데이터베이스를 먼저 만들어 주세요.' });
        }
        return fail({ message: `연결에 실패했습니다 — ${humanError(e)}` });
      }
      const own = await ownerInfo();
      const hasAdmin = !!own?.uid;
      return {
        ok: true, reachable: true, schema: true, hasAdmin,
        message: hasAdmin ? '연결 완료 — 관리자 계정이 이미 있습니다. 그 계정으로 로그인해 주세요.'
          : '연결 완료 — 이제 관리자 계정을 만들면 됩니다. 첫 번째 계정이 이 홈의 관리자가 됩니다.',
      };
    },

    async currentUser() {
      // 새로고침 직후 auth 복원을 기다린다
      const u = await new Promise<typeof auth.currentUser>(res => {
        const off = authMod.onAuthStateChanged(auth, x => { off(); res(x); });
      });
      return toUser(u);
    },

    onAuthChange(cb) {
      return authMod.onAuthStateChanged(auth, u => { void toUser(u).then(cb); });
    },

    async signIn(id, password) {
      try {
        await authMod.signInWithEmailAndPassword(auth, id, password);
        return { ok: true };
      } catch (e) { return { ok: false, error: humanError(e) }; }
    },

    async signUp(id, password, nickname, invite) {
      try {
        const cred = await authMod.createUserWithEmailAndPassword(auth, id, password);
        /* 정식 회원 증명 (v2.0 보안 점검) — 가입코드의 해시를 members/{uid}에 쓰면 보안 규칙이 서버에서
           정답(board_secrets/__invite)과 대조해 맞을 때만 받아 준다. 가입코드는 화면 어디에도 내려오지 않는다.
           틀리면 방금 만든 로그인 계정을 지워, 회원이 아닌 계정이 남지 않게 한다.
           (설치 화면의 첫 계정은 invite 없이 — 관리자 등록으로 회원이 된다) */
        if (invite !== undefined) {
          try {
            const key = await lockHash(INVITE_LOCK_KEY, invite);
            const w = await withLimit(setDoc(doc(db, 'members', cred.user.uid), { uid: cred.user.uid, key, at: Date.now() }));
            if (w === TIMEOUT) throw new Error('timeout');
          } catch (e) {
            const denied = ((e as { code?: string })?.code ?? '').includes('permission-denied');
            try { await authMod.deleteUser(cred.user); } catch { /* 무시 */ }
            return { ok: false, error: denied ? '가입코드가 올바르지 않거나 지금은 회원가입을 받지 않습니다.' : NO_REACH };
          }
        }
        await authMod.updateProfile(cred.user, { displayName: nickname });
        const r = await withLimit(
          setDoc(doc(db, 'profiles', cred.user.uid), { nickname, createdAt: Date.now() }, { merge: true }));
        // 계정(Auth)은 이미 만들어졌으므로 그 사실을 알려 준다 — 다시 시도하면 "이미 사용 중"이 뜬다
        if (r === TIMEOUT) return { ok: false, error: `${NO_REACH} (로그인 계정은 이미 만들어졌습니다)` };
        return { ok: true };
      } catch (e) { return { ok: false, error: humanError(e) }; }
    },

    async signOut() { await authMod.signOut(auth); },

    async resetPassword(email) {
      try {
        await authMod.sendPasswordResetEmail(auth, email);
        return { ok: true };
      } catch (e) { return { ok: false, error: humanError(e) }; }
    },

    async updateProfile(patch) {
      const u = auth.currentUser;
      if (!u) return { ok: false, error: '로그인이 필요합니다.' };
      try {
        const row: Record<string, unknown> = {};
        if (patch.nickname !== undefined) row.nickname = patch.nickname;
        if (patch.avatarUrl !== undefined) row.avatarUrl = patch.avatarUrl ?? null;
        if (patch.avatarColor !== undefined) row.avatarColor = patch.avatarColor ?? null;
        await setDoc(doc(db, 'profiles', u.uid), row, { merge: true });
        if (patch.nickname) await authMod.updateProfile(u, { displayName: patch.nickname });
        return { ok: true };
      } catch (e) { return { ok: false, error: humanError(e) }; }
    },

    /** 첫 계정을 소유자(관리자)로 등록 — 규칙이 "없을 때 1회"만 허용한다 */
    async claimOwner() {
      const u = auth.currentUser;
      if (!u) return { ok: false, error: '로그인이 필요합니다.' };
      try {
        const own = await ownerInfo();
        if (own?.uid) return { ok: true };   // 이미 소유자 있음
        const r = await withLimit(setDoc(doc(db, 'meta', 'owner'), { uid: u.uid, admins: [u.uid], at: Date.now() }));
        if (r === TIMEOUT) return { ok: false, error: NO_REACH };
        ownerCache = undefined;   // 방금 관리자가 됐으니 다시 판정하게
        return { ok: true };
      } catch (e) { return { ok: false, error: humanError(e) }; }
    },

    async listMembers() {
      const own = await ownerInfo();
      const admins = new Set([own?.uid, ...(own?.admins ?? [])].filter(Boolean) as string[]);
      const snap = await getDocs(collection(db, 'profiles'));
      return snap.docs.map(d => {
        // avatarUrl도 함께 — 이미지 정리가 프로필 사진을 「안 쓰는 파일」로 지우지 않게 (v2.0 사용자 제보)
        const v = d.data() as { nickname?: string; avatarUrl?: string };
        return {
          id: d.id,
          nickname: v.nickname ?? d.id,
          role: (admins.has(d.id) ? 'admin' : 'member') as 'admin' | 'member',
          avatarUrl: v.avatarUrl,
        };
      });
    },

    async fetchList<T extends ListItem>(coll: string): Promise<T[]> {
      return listWith<T>(coll, await readSets());
    },

    async syncList<T extends ListItem>(coll: string, prev: T[], next: T[], uid: string | null) {
      return syncWith(coll, prev, next, uid);
    },

    /* 공개범위·편집 권한 목록만 다시 계산해 덮어쓰기 (v2.0) — data·sort는 손대지 않는다.
       editorIds도 함께 쓴다 (포크 제보 — 업데이트 전에 준 편집 권한이 문서에 평평한 목록으로
       없어서, 최신 규칙을 넣어도 그 회원의 저장이 계속 거부됐다) */
    async refreshVis<T extends ListItem>(coll: string, items: T[], uid: string | null, withData = false): Promise<number> {
      let n = 0;
      for (let i = 0; i < items.length; i += 400) {
        const part = items.slice(i, i + 400);
        const batch = writeBatch(db);
        part.forEach(it => {
          const { visibility, editorIds } = metaOf(it, uid, visFloorOf(coll, it));
          batch.update(doc(db, coll, it.id), {
            visibility, editorIds, updatedAt: Date.now(),
            lockBoard: visibility === 'locked' ? lockKeyOfItem(coll, it) : null,
            // withData — 항목에 칸을 새로 붙여(댓글의 boardId·secId 등) 본문까지 함께 고칠 때
            ...(withData ? { data: it } : {}),
          });
        });
        await batch.commit();
        n += part.length;
      }
      return n;
    },

    async fetchVisMeta(coll) {
      const snap = await getDocsFromServer(query(collection(db, coll)));
      const out: Record<string, { visibility: string; lockBoard?: string | null }> = {};
      snap.docs.forEach(d => {
        const raw = d.data() as { visibility?: string; lockBoard?: string | null };
        out[d.id] = { visibility: raw.visibility ?? 'public', lockBoard: raw.lockBoard ?? null };
      });
      return out;
    },

    subscribe(coll, onChange) {
      // 조건이 두 갈래면 구독도 두 개 — fetchList와 같은 이유(질의 전체 거부 방지)
      let offs: Array<() => void> = [];
      let stopped = false;
      void readSets().then(sets => {
        if (stopped) return;
        offs = sets.map(cs => onSnapshot(listQuery(coll, cs), () => onChange(), () => { /* 권한 없음 등은 무시 */ }));
      });
      return () => { stopped = true; offs.forEach(off => off()); offs = []; };
    },

    async fetchSetting<T>(key: string) {
      const snap = await getDoc(doc(db, 'settings', key));
      return snap.exists() ? ((snap.data() as { value: T }).value ?? null) : null;
    },

    async saveSetting(key, value) {
      // 글 같은 내용이 든 설정은 조각으로 나눠 보호 설정(vault)에 (lib/settingVault.ts)
      if (VAULT_KEYS.has(key)) { await queueVault(key, value); return; }
      await setDoc(doc(db, 'settings', key), { value, updatedAt: Date.now() });
    },

    async fetchAllSettings() {
      const snap = await getDocs(collection(db, 'settings'));
      const out: Record<string, unknown> = {};
      snap.docs.forEach(d => { out[d.id] = (d.data() as { value: unknown }).value; });
      await mergeVault(out);
      return out;
    },

    async uploadFile(blob, ext) {
      const path = `ohome/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const r = stMod.ref(storage, path);
      // 경로가 업로드마다 고유하므로 내용이 바뀌지 않는다 — 길게 캐시해 재방문·엣지 캐시 이득을 본다
      // (지정하지 않으면 브라우저가 매번 다시 받아 먼 지역 버킷에서 지연이 그대로 드러남)
      await stMod.uploadBytes(r, blob, {
        contentType: blob.type || 'application/octet-stream',
        cacheControl: 'public, max-age=31536000, immutable',
      });
      return await stMod.getDownloadURL(r);
    },

    async listFiles() {
      // 저장하는 주소가 다운로드 URL이므로 목록도 같은 형태로 돌려줘야 대조가 된다
      const res = await stMod.listAll(stMod.ref(storage, 'ohome'));
      return Promise.all(res.items.map(async it => {
        const [ref, meta] = await Promise.all([stMod.getDownloadURL(it), stMod.getMetadata(it)]);
        return { ref, size: meta.size ?? 0 };
      }));
    },

    async deleteFile(ref) {
      // Firebase SDK는 다운로드 URL로도 참조를 만들 수 있다
      await stMod.deleteObject(stMod.ref(storage, ref));
    },

    async unlockedLocks() {
      return unlockedNow();
    },

    async unlockLock(lockKey, password) {
      try {
        if (!auth.currentUser) await authMod.signInAnonymously(auth);
        const u = auth.currentUser;
        if (!u) return { ok: false, error: '잠시 후 다시 시도해 주세요.' };
        // 공통 비밀번호면 모든 잠금의 정답이 같은 해시다 (menuLock.ts — 공통 비밀번호)
        const common = sitePwOn();
        const key = await lockHash(common ? COMMON_LOCK_KEY : lockKey, password);
        const put = (k: string) => setDoc(doc(db, 'board_unlocks', `${u.uid}_${k}`), { uid: u.uid, boardId: k, key, at: Date.now() });
        const r = await withLimit(put(lockKey));
        if (r === TIMEOUT) return { ok: false, error: '서버 응답이 없습니다 — 잠시 후 다시 시도해 주세요.' };
        // 맞혔으면 다른 잠금도 같은 해시로 한꺼번에 연다 — 한 번 입력으로 사이트 전체 (틀린 것은 규칙이 거부, 무시)
        if (common) {
          const rest = [...lockedKeys()].filter(k => k !== lockKey);
          await withLimit(Promise.allSettled(rest.map(put)));
        }
        unlockedCache = undefined;
        return { ok: true };
      } catch (e) {
        const code = (e as { code?: string })?.code ?? '';
        if (code.includes('permission-denied')) return { ok: false, error: '비밀번호가 올바르지 않습니다.' };
        if (code.includes('operation-not-allowed') || code.includes('admin-restricted')) {
          return { ok: false, error: '지금은 비밀번호로 열 수 없습니다 — 관리자가 Firebase 익명 로그인을 켜야 합니다.' };
        }
        return { ok: false, error: humanError(e) };
      }
    },

    async setLockPassword(lockKey, password) {
      try {
        const ref = doc(db, 'board_secrets', lockKey);
        const r = password
          ? await withLimit(setDoc(ref, { hash: await lockHash(lockKey, password), at: Date.now() }))
          : await withLimit(deleteDoc(ref));
        if (r === TIMEOUT) return { ok: false, error: NO_REACH };
        return { ok: true };
      } catch (e) {
        return { ok: false, error: lockSaveError(e) };
      }
    },

    async setSitePassword(password, keys) {
      try {
        const hash = await lockHash(COMMON_LOCK_KEY, password);
        // 해시는 관리자만 읽는 members/__sitepw에 — 새로 잠글 때 그대로 옮겨 적는다 (uid가 아니라 회원 증명으로 쓰이지 않는다)
        const r = await withLimit(setDoc(doc(db, 'members', SITE_PW_DOC), { hash, at: Date.now() }));
        if (r === TIMEOUT) return { ok: false, error: NO_REACH };
        for (let i = 0; i < keys.length; i += 400) {
          const batch = writeBatch(db);
          keys.slice(i, i + 400).forEach(k => batch.set(doc(db, 'board_secrets', k), { hash, at: Date.now() }));
          const w = await withLimit(batch.commit());
          if (w === TIMEOUT) return { ok: false, error: NO_REACH };
        }
        return { ok: true };
      } catch (e) {
        return { ok: false, error: lockSaveError(e) };
      }
    },

    async lockWithSitePassword(lockKey) {
      try {
        const snap = await getDoc(doc(db, 'members', SITE_PW_DOC));
        const hash = (snap.data() as { hash?: string } | undefined)?.hash;
        if (!hash) return { ok: false, error: '공통 비밀번호가 아직 없습니다 — 환경설정 → 메뉴 비밀번호에서 먼저 정해 주세요.' };
        const r = await withLimit(setDoc(doc(db, 'board_secrets', lockKey), { hash, at: Date.now() }));
        if (r === TIMEOUT) return { ok: false, error: NO_REACH };
        return { ok: true };
      } catch (e) {
        return { ok: false, error: lockSaveError(e) };
      }
    },

    async deleteMember(id) {
      // profiles 문서와 회원 증명을 지운다 — Authentication 계정은 관리자 키가 있어야 지울 수 있지만,
      // 회원 증명(members)이 없으면 로그인해도 회원 전용 글·잠긴 메뉴를 받을 수 없다 (v2.0 보안 점검)
      try { await deleteDoc(doc(db, 'members', id)); } catch { /* 새 규칙 전 — 무시 */ }
      await deleteDoc(doc(db, 'profiles', id));
    },

    async grantMembers(ids) {
      try {
        for (let i = 0; i < ids.length; i += 400) {
          const batch = writeBatch(db);
          ids.slice(i, i + 400).forEach(id => batch.set(doc(db, 'members', id), { uid: id, key: 'admin', at: Date.now() }));
          await batch.commit();
        }
        return { ok: true };
      } catch (e) {
        const code = (e as { code?: string })?.code ?? '';
        return { ok: false, error: code.includes('permission-denied') ? 'rules' : humanError(e) };
      }
    },
  };

  // (deleteDoc은 삭제 배치에서 doc 단위로 쓰지 않아 참조만 유지)
  void deleteDoc;
}
