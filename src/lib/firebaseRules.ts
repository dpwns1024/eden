'use client';
// 설치 화면에서 복사해 쓰는 Firebase 보안 규칙 — 원본: firebase/firestore.rules · firebase/storage.rules
// (원본을 고치면 이 파일도 함께 갱신)

export const FIRESTORE_RULES = `rules_version = '2';

// ============================================================
// O.HOME Firestore 보안 규칙
// Firebase 콘솔 → Firestore Database → 규칙 에 붙여넣고 [게시].
//
// 문서 구조
//   meta/owner            { uid, admins[] }   ← 첫 로그인 계정이 1회만 자기를 등록
//   profiles/{uid}        { nickname, avatarUrl, avatarColor }
//   settings/{key}        { value }           ← 테마·메뉴·폰트·메인 위젯 등
//   <콘텐츠>/{id}          { data, authorId, visibility, sort, lockBoard? }
//   board_secrets/{board} { hash }            ← 게시판 비밀번호(해시) — 누구도 읽을 수 없다
//   board_unlocks/{uid_board} { uid, boardId, key }  ← 비밀번호를 맞힌 방문자의 통과 기록
//   members/{uid}         { uid, key }        ← 정식 회원 증명 — 가입코드(해시)가 맞을 때만 생긴다
//   vault/{id}            { data, visibility, lockBoard? } ← 보호 설정 조각 (ARCH 문서 · HTML 페이지 · 인트로 · 스케줄러) — 글과 같은 읽기 규칙
//
// 익명 로그인 = 게시판 비밀번호를 통과한 방문자의 임시 신분. 회원 권한은 없다(isMember).
// 로그인 계정만으로는 회원이 아니다 — Firebase 공개 키로 아무나 계정을 만들 수 있으므로,
// 가입코드를 맞혀 members 문서가 생긴 계정(또는 관리자)만 회원이다.
// ============================================================

service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() {
      return request.auth != null;
    }

    // 로그인 계정 (익명 로그인 제외) — 계정이 있다는 것뿐, 회원 권한은 아래 isMember
    function isUser() {
      return signedIn() && request.auth.token.firebase.sign_in_provider != 'anonymous';
    }

    // 정식 회원 — 가입코드를 맞혀 members 문서가 생긴 계정, 또는 관리자
    function isMember() {
      return isUser()
        && (exists(/databases/$(database)/documents/members/$(request.auth.uid)) || isAdmin());
    }

    // 회원가입을 받는 중인가 (환경설정 → 회원/보안) — 닫으면 가입코드를 알아도 회원이 될 수 없다
    function signupOpen() {
      let s = /databases/$(database)/documents/settings/ohome.signup.v1;
      return !exists(s) || get(s).data.get('value', {}).get('open', true) != false;
    }

    // 이 방문자가 게시판 b의 비밀번호를 통과했는가 — 비밀번호가 바뀌면 예전 통과 기록은 자동 무효
    function boardOpen(b) {
      let u = /databases/$(database)/documents/board_unlocks/$(request.auth.uid + '_' + b);
      let sec = /databases/$(database)/documents/board_secrets/$(b);
      return signedIn() && exists(sec) && exists(u) && get(u).data.key == get(sec).data.hash;
    }

    function ownerData() {
      return get(/databases/$(database)/documents/meta/owner).data;
    }

    function isAdmin() {
      return isUser()
        && exists(/databases/$(database)/documents/meta/owner)
        && (ownerData().uid == request.auth.uid
            || (ownerData().keys().hasAny(['admins']) && request.auth.uid in ownerData().admins));
    }

    // 콘텐츠 컬렉션 목록 — 여기 없는 이름은 아무 권한도 없다
    function isContent(name) {
      return name in [
        'posts', 'guestbook', 'characters', 'relations', 'gallery', 'roadview',
        'trpg_logs', 'trpg_log_bodies', 'trpg_chars', 'dotori', 'playlog', 'rp_rooms', 'threads',
        'diary', 'memos', 'commissions', 'applicants', 'moods', 'comments', 'qa_answers', 'rp_messages',
        'notifications', 'vault'
      ];
    }

    // ── 소유자(관리자) 지정 — 아직 없을 때 딱 한 번 ──────────────
    match /meta/owner {
      allow read: if true;
      allow create: if isUser() && !exists(/databases/$(database)/documents/meta/owner);
      allow update, delete: if isAdmin();
    }

    // ── 회원 프로필 ─────────────────────────────────────────────
    match /profiles/{uid} {
      allow read: if true;
      // 자기 프로필은 계정만 있으면 — 설치 화면의 첫 계정은 관리자로 등록되기 전에 프로필부터 만든다
      allow create, update: if isUser() && (request.auth.uid == uid || isAdmin());
      allow delete: if isAdmin();
    }

    // ── 사이트 설정 (읽기 공개 · 쓰기 관리자) ────────────────────
    match /settings/{key} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // ── 게시판 비밀번호 (해시) — 아무도 읽지 못한다. 대조는 아래 규칙이 서버에서 한다 ──
    match /board_secrets/{board} {
      allow read: if false;
      allow write: if isAdmin();
    }

    // ── 게시판 통과 기록 — 비밀번호(해시)가 맞을 때만 만들어진다 ──────────
    match /board_unlocks/{id} {
      allow read, delete: if signedIn() && resource.data.uid == request.auth.uid;
      allow create, update: if signedIn()
        && request.resource.data.keys().hasOnly(['uid', 'boardId', 'key', 'at'])
        && request.resource.data.uid == request.auth.uid
        && id == request.auth.uid + '_' + request.resource.data.boardId
        && exists(/databases/$(database)/documents/board_secrets/$(request.resource.data.boardId))
        && request.resource.data.key == get(/databases/$(database)/documents/board_secrets/$(request.resource.data.boardId)).data.hash;
    }

    // ── 정식 회원 증명 — 가입코드(해시)가 맞을 때만 자기 것을 만들 수 있다 ──────────
    // 정답은 board_secrets/__invite (관리자가 환경설정에서 정함, 아무도 읽을 수 없음)
    match /members/{uid} {
      allow read: if signedIn() && (request.auth.uid == uid || isAdmin());
      allow create: if isUser() && request.auth.uid == uid && signupOpen()
        && request.resource.data.keys().hasOnly(['uid', 'key', 'at'])
        && request.resource.data.uid == uid
        && exists(/databases/$(database)/documents/board_secrets/__invite)
        && request.resource.data.key == get(/databases/$(database)/documents/board_secrets/__invite).data.hash;
      // 관리자: 기존 회원 옮겨 담기 · 회원 삭제
      allow write: if isAdmin();
    }

    // ── 콘텐츠 ─────────────────────────────────────────────────
    match /{coll}/{docId} {
      // 읽기: 전체공개 / 멤버공개(회원) / 잠긴 게시판(회원 또는 비밀번호 통과) / 내가 쓴 것 / 관리자
      allow read: if isContent(coll) && (
        resource.data.visibility == 'public'
        || (resource.data.visibility == 'member' && isMember())
        || (resource.data.visibility == 'locked' && (isMember() || boardOpen(resource.data.lockBoard)))
        || (isMember() && resource.data.authorId == request.auth.uid)
        || isAdmin()
      );

      // 쓰기: 로그인 회원 — 방명록·댓글은 비로그인 방문자도 남길 수 있음(닉네임+비밀번호 방식)
      // notifications: 손님 댓글·방명록이 관리자에게 알림을 남길 수 있어야 한다 (v2.0) —
      // 행 주인(authorId)은 받는 사람이라 읽기·수정·삭제는 받는 사람·관리자만 (아래 공통 규칙)
      // vault: 보호 설정 조각(ARCH 문서 · HTML 페이지 · 인트로 · 스케줄러) — 사이트 내용이라 관리자만 쓴다
      allow create: if isContent(coll)
        && (coll == 'vault' ? isAdmin() : (isMember() || coll in ['guestbook', 'comments', 'notifications']));

      // 수정·삭제: 작성자 본인 · 편집 권한을 받은 회원 · 관리자
      // 댓글은 글과 따로 저장되므로(v2.0) 댓글을 달 때 글을 수정할 필요가 없다 —
      // 예전엔 댓글이 글 안에 있어서 일반 회원이 관리자 글에 댓글을 달면 이 규칙에 막혔다.
      // 게스트 댓글(로그인 없이 남긴 것)은 authorId가 비어 있어 본인 확인이 안 되므로
      // 지우는 것은 관리자만 — 방명록의 게스트 글과 같은 규칙이다.
      // editorIds: 캐릭터에 「편집까지」 권한을 준 회원 (v2.0). grants는 객체 배열이라
      // 규칙에서 훑을 수 없어, 저장할 때 회원 id만 뽑아 둔 평평한 배열을 본다.
      allow update, delete: if isContent(coll)
        && isMember()
        && (coll != 'vault' || isAdmin())
        && (resource.data.authorId == request.auth.uid
            || isAdmin()
            || (resource.data.keys().hasAny(['editorIds'])
                && request.auth.uid in resource.data.editorIds));
    }
  }
}
`;

export const STORAGE_RULES = `rules_version = '2';

// ============================================================
// O.HOME Storage 보안 규칙 (이미지·파일)
// Firebase 콘솔 → Storage → 규칙 에 붙여넣고 [게시].
//   · 화면의 그림은 업로드 때 받은 「다운로드 주소(토큰)」로 열리므로 이 규칙과 무관하게 보인다
//   · 파일 목록 보기(전체 훑기)는 관리자만 — 남이 버킷을 훑어 잠긴 게시판 그림까지 찾아내지 못하게
//   · 파일 하나 읽기(다운로드 주소 발급)는 정식 회원만
//   · 올리기는 정식 회원만 (가입코드를 맞힌 계정 · 익명/아무나 만든 계정 제외), 20MB · 이미지·글꼴·텍스트만
//   · 덮어쓰기는 금지(업로드마다 새 경로), 지우기는 관리자만
//
// ⚠ 회원·관리자 확인을 위해 Firestore를 읽는다 — 게시할 때 콘솔이
//   「Storage가 Firestore에 접근할 권한」을 물으면 [허용]을 눌러야 한다.
//   Firestore 데이터베이스가 (default)일 때만 동작한다.
// ============================================================

service firebase.storage {
  match /b/{bucket}/o {

    function isUser() {
      return request.auth != null
        && request.auth.token.firebase.sign_in_provider != 'anonymous';
    }

    function isAdmin() {
      let owner = /databases/(default)/documents/meta/owner;
      return isUser()
        && firestore.exists(owner)
        && (firestore.get(owner).data.uid == request.auth.uid
            || request.auth.uid in firestore.get(owner).data.get('admins', []));
    }

    // 정식 회원 — 가입코드를 맞혀 members 문서가 생긴 계정, 또는 관리자 (Firestore 규칙과 같은 기준)
    function isMember() {
      return isUser()
        && (firestore.exists(/databases/(default)/documents/members/$(request.auth.uid)) || isAdmin());
    }

    // 웹페이지·스크립트로 열리는 형식은 받지 않는다 (남의 피싱 페이지 호스팅 방지)
    function okType() {
      let t = request.resource.contentType;
      return (t.matches('image/.*') || t.matches('font/.*') || t.matches('text/.*')
              || t.matches('application/(octet-stream|font.*|x-font.*|vnd\\\\.ms-fontobject)'))
        && !t.matches('(?i).*(html|javascript|ecmascript).*');
    }

    match /ohome/{allPaths=**} {
      allow get: if isMember();
      allow list: if isAdmin();
      allow create: if isMember()
        && request.resource.size < 20 * 1024 * 1024
        && okType();
      allow update: if false;
      allow delete: if isAdmin();
    }
  }
}
`;
