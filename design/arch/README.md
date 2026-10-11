# ARCH 메인 HTML 디자인 보관함

메인 페이지 **HTML 블록**에 붙여넣는 디자인과, 나중에 메뉴(게시판)로 옮겨 쓸 섹션 디자인을 보관한다.
사이트 코드가 읽는 파일이 아니다 — 참고·복사용.

| 파일 | 내용 |
|---|---|
| `main.html` | 지금 메인에 쓰는 것 — 상단 정보 띠 · 헤더(메뉴·로그인 자리) · 메인 로고(MONOLITH, 윤곽선 연출) · 문구 · ABOUT ARCH 버튼 · 물결 · 푸터 |
| `full-reference.html` | 같은 디자인의 전체판 — 01 ABOUT ARCH(기관·아이기스 카드) · 02 CLASSIFICATION · 03 PERSONNEL ARCHIVE(에덴/이브 파일) · 04 BULLETIN(터미널·NOTI/NG/LIST 미니 창)까지. 새 메뉴 페이지를 만들 때 이 레이아웃·디자인을 그대로 가져다 쓴다 |

- 작은 로고(헤더·구분선·푸터·도장): 시안 01 AEGIS — 방패 + 크로스바 없는 Λ + 수평선 + 별빛
- 메인 로고: 시안 N3 MONOLITH — 두꺼운 스텐실 글자 + 단어를 베고 지나간 사선, 윤곽선이 그려진 뒤 은빛이 차오르고 꺾쇠가 잠기는 연출
- 메뉴·로그인은 `data-ohome="menu"` / `data-ohome="member"` 자리에 사이트가 채워 넣는다 (src/lib/htmlSlots.ts)
- ABOUT ARCH 버튼 주소는 게시판을 만든 뒤 `href="#"`를 그 주소로 바꾼다 (같은 창)
