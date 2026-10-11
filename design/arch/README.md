# ARCH 메인 HTML 디자인 보관함

메인 페이지 **HTML 블록**에 붙여넣는 디자인과, 나중에 메뉴(게시판)로 옮겨 쓸 섹션 디자인을 보관한다.
사이트 코드가 읽는 파일이 아니다 — 참고·복사용.

| 파일 | 내용 |
|---|---|
| `main.html` | 지금 메인에 쓰는 것 — 상단 정보 띠 · 헤더(메뉴·로그인 자리) · 메인 로고(MONOLITH, 윤곽선 연출) · 문구 · ABOUT ARCH 버튼 · 푸터 |
| `site-header.html` | 다른 페이지 공통 상단 — 환경설정 → 메인 페이지 → 「다른 페이지 공통 상단 (HTML)」에 붙여넣는다. 상단 정보 띠 · 로고 · 메뉴 · 로그인, 그리고 페이지 바탕(격자·주사선·가장자리 어둠)을 메인과 같게 |
| `site-footer.html` | 다른 페이지 공통 하단 — 「다른 페이지 공통 하단 (HTML)」에 붙여넣는다. 워터마크(로고 · 안내문 · © ARCH) |
| `page-about.html` | ARCH 소개 페이지(HTML 페이지 `/page`) 기본 틀 — 페이지 제목 · 01 ABOUT ARCH · 02 CLASSIFICATION (푸터는 공통 하단이 그린다) |
| `full-reference.html` | 같은 디자인의 전체판 — 01 ABOUT ARCH(기관·아이기스 카드) · 02 CLASSIFICATION · 03 PERSONNEL ARCHIVE(에덴/이브 파일) · 04 BULLETIN(터미널·NOTI/NG/LIST 미니 창)까지. 새 메뉴 페이지를 만들 때 이 레이아웃·디자인을 그대로 가져다 쓴다 |

- 작은 로고(헤더·구분선·푸터·도장): 시안 01 AEGIS — 방패 + 크로스바 없는 Λ + 수평선 + 별빛
- 메인 로고: 시안 N3 MONOLITH — 두꺼운 스텐실 글자 + 단어를 베고 지나간 사선, 윤곽선이 그려진 뒤 은빛이 차오르고 꺾쇠가 잠기는 연출
- 메뉴·로그인은 `data-ohome="menu"` / `data-ohome="member"` 자리에 사이트가 채워 넣는다 (src/lib/htmlSlots.ts)
- ABOUT ARCH 버튼 주소는 게시판을 만든 뒤 `href="#"`를 그 주소로 바꾼다 (같은 창)

## 게시판 ARCH 스타일 (사용자 확정 — 앞으로 모든 게시판을 이 형식으로)

게시판은 HTML이 아니라 사이트 코드로 꾸민다. **레이아웃은 그대로 두고 모양만** ARCH HTML 페이지(`page-about.html`)처럼 바꾼다.

- 켜기: 환경설정 → 메인 페이지 → 「게시판 디자인」 ARCH (`ohome.boardui.v1` → `<html class="ui-arch">`, src/lib/boardSkin.ts)
- CSS: `src/app/globals.css`의 「게시판 디자인 — ARCH」 블록. 게시판 페이지 `<section>`에 클래스를 붙이고 선택자에 더한다
- 모양 규칙
  - 제목: Jost 300 · 자간 .32em · 은빛 그라데이션 글자, 아래 가는 선(앞 120px만 #b8d8ff로 빛남)
  - 박스: 어두운 반투명(rgba(13,18,25,.64)) · 1px 테두리 rgba(190,208,228,.10) · 모서리 각짐 · 왼쪽 위/오른쪽 아래 꺾쇠
  - 버튼: 각진 테두리 · Jost 10px 자간 .3em · 마우스 올리면 #b8d8ff 테두리 빛
  - 라벨: JetBrains Mono 작은 글씨 · 넓은 자간 / 본문: Noto Sans KR 300 #b3bec9
- 적용된 게시판: 캐릭터(목록·프로필 `.page-chars`)
