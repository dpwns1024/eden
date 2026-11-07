# YJHM 케이브덕 위젯 — 첫 화면 시안 4차: 사진 자리 없이 글자 · 그래픽만으로 된 팬계정 형식 + 형식마다 새 버튼
# python3 design/widgets/yjhm-main-drafts4.gen.py → yjhm-main-drafts4.html (시안마다 <!-- ===== 시안 N · 이름 ===== -->)
# 자리표시: {{3}} 날짜 · {{4}} 시간 · {{1}} 장소 · {{2}} 상황 · {{11}} 레인 번호. 버튼 글자 「기사 전문 보기♡」
# 픽셀 정렬은 고른 시안에만 마저 맞춘다 (사용자 요청)
import os
HERE = os.path.dirname(os.path.abspath(__file__))

F = "font-family:'Pretendard Variable','Pretendard','Noto Sans KR',-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Segoe UI',sans-serif;"
FT = "font-family:'Inter','Pretendard Variable','Pretendard',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"
NUM = "font-variant-numeric:tabular-nums;"
INK, NV2, AC, SUB, FAINT, LN, BG = '#1d2a3d', '#2c3e57', '#607ca0', '#4a5a70', '#6c7a8c', '#9fb0c6', '#eef0f3'
BTN = '기사 전문 보기♡'

def cap(text, size=9, ls=.2, color=AC, w=600, extra=''):
    return f'<span style="{F}{NUM}font-size:{size}px;font-weight:{w};letter-spacing:{ls}em;color:{color};line-height:{round(size) + 1}px;white-space:nowrap;{extra}">{text}</span>'

def tape(text, h=22, size=9.5, ls=.2, pad=10, bg=NV2, fg='#f2f4f7', radius=2, extra=''):
    return (f'<span style="flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;height:{h}px;padding:0 calc({pad}px - {ls}em) 0 {pad}px;'
            f'border-radius:{radius}px;background:{bg};color:{fg};{F}font-size:{size}px;font-weight:600;letter-spacing:{ls}em;line-height:{round(size)+1}px;white-space:nowrap;{extra}">{text}</span>')

def wrap(body, bg=BG, extra=''):
    return f'''<div style="width:100%;max-width:520px;margin:16px auto;color:{INK};word-break:keep-all;line-height:1.5;{F}">
  <div style="position:relative;overflow:hidden;background:{bg};border-radius:8px;box-shadow:0 0 0 1px rgba(44,62,87,.1),0 18px 40px rgba(44,62,87,.14);{extra}">
{body}
  </div>
</div>'''

# ───────── 시안 1 · 팬레터 편지지 — 버튼: 봉투 + 밀랍 도장 ─────────
LINES = "background-image:repeating-linear-gradient(180deg,transparent 0 27px,rgba(96,124,160,.22) 27px 28px);"
envelope = f'''<div style="position:relative;height:74px;border-radius:4px;background:#fff;box-shadow:0 0 0 1.5px {NV2},0 6px 14px -6px rgba(29,42,61,.35);overflow:hidden;">
      <div style="position:absolute;left:0;right:0;top:0;height:32px;background:{NV2};clip-path:polygon(0 0,100% 0,50% 100%);-webkit-clip-path:polygon(0 0,100% 0,50% 100%);"></div>
      <div style="position:absolute;left:50%;top:12px;width:32px;height:32px;margin-left:-16px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#8aa3c4,{AC} 60%,#4d6788);box-shadow:0 2px 4px rgba(29,42,61,.4),inset 0 0 0 3px rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;{FT}font-size:14px;font-weight:900;line-height:14px;color:#fff;">♡</div>
      <div style="position:absolute;left:0;right:0;bottom:10px;text-align:center;{F}font-size:12.5px;font-weight:700;letter-spacing:.04em;line-height:14px;color:{NV2};">{BTN}</div>
    </div>'''
D1 = wrap(f'''
    <div style="padding:20px 20px 18px;">
      <div style="position:relative;padding:18px 18px 16px 30px;border-radius:3px;background:#fffdf8;box-shadow:0 0 0 1px rgba(44,62,87,.1),0 10px 22px -12px rgba(29,42,61,.3);">
        <span style="position:absolute;left:18px;top:0;bottom:0;width:1px;background:rgba(192,120,138,.35);"></span>
        <div style="display:flex;justify-content:space-between;align-items:baseline;">
          <span style="{FT}font-size:24px;font-weight:800;letter-spacing:-.04em;line-height:28px;color:{INK};">To. 예준<span style="color:{AC};">♡</span></span>
          {cap('{{3}} · {{4}}', 9, .1)}
        </div>
        <div style="margin-top:8px;{LINES}{F}font-size:14px;line-height:28px;color:{SUB};">
          오늘 <b style="color:{INK};">{{{{1}}}}</b>에서 봤어요.<br>{{{{2}}}} — 숨 참는 그 몇 초가 제일 멋있어요.<br>사선 {{{{11}}}}번은 앞으로도 제 최애 자리 ♡
        </div>
        <div style="margin-top:6px;text-align:right;{F}font-size:13px;font-weight:700;line-height:20px;color:{AC};">From. 텐링 지킴이</div>
      </div>
      <div style="margin-top:16px;">{envelope}</div>
    </div>''', bg='#f4f1ea')

# ───────── 시안 2 · 팬덤 공지 — 버튼: 둘로 나뉜 알약 (글자 + 화살표 동그라미) ─────────
row = lambda n, t, done=False: f'''<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid rgba(44,62,87,.08);">
          <span style="flex-shrink:0;display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:6px;background:{AC if done else "#fff"};box-shadow:{"none" if done else "inset 0 0 0 1.5px " + LN};{F}font-size:11px;font-weight:800;line-height:12px;color:#fff;">{"✓" if done else ""}</span>
          <span style="flex-shrink:0;{F}{NUM}font-size:11px;font-weight:700;letter-spacing:.06em;line-height:14px;color:{LN};">{n}</span>
          <span style="min-width:0;{F}font-size:13px;font-weight:{600 if not done else 500};line-height:19px;color:{INK if not done else FAINT};{"text-decoration:line-through;text-decoration-color:rgba(96,124,160,.6);" if done else ""}">{t}</span>
        </div>'''
split_btn = f'''<div style="display:flex;align-items:center;height:44px;padding:0 6px 0 20px;border-radius:22px;background:{INK};box-shadow:0 8px 16px -8px rgba(29,42,61,.6);">
      <span style="flex:1;{F}font-size:13px;font-weight:700;letter-spacing:.02em;line-height:16px;color:#fff;">{BTN}</span>
      <span style="flex-shrink:0;display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:{AC};{FT}font-size:16px;font-weight:700;line-height:16px;color:#fff;">→</span>
    </div>'''
D2 = wrap(f'''
    <div style="padding:18px 20px 20px;">
      <div style="display:flex;align-items:center;gap:8px;">
        {tape('공지', h=22, size=10.5, ls=.06, pad=9, bg=AC, radius=11)}
        {tape('D-DAY', h=22, size=9.5, ls=.18, pad=9, bg='#fff', fg=NV2, radius=11, extra='box-shadow:inset 0 0 0 1.5px ' + NV2 + ';')}
        <span style="margin-left:auto;">{cap('읽음 1,090', 9.5, .04, LN, 600)}</span>
      </div>
      <div style="margin-top:12px;{F}font-size:20px;font-weight:900;letter-spacing:-.03em;line-height:27px;color:{INK};">[공지] 오늘 홍예준 사선 일정 안내 📌</div>
      <div style="margin-top:4px;{F}{NUM}font-size:12px;line-height:18px;color:{FAINT};">{{{{3}}}} {{{{4}}}} · 운영진 텐링 지킴이</div>
      <div style="margin-top:12px;padding:2px 14px 4px;border-radius:8px;background:#fff;box-shadow:0 0 0 1px rgba(44,62,87,.08);">
        {row('01', '집합 장소 — {{1}}', True)}
        {row('02', '상황 — {{2}}')}
        {row('03', '사선 {{11}}번 맞은편 응원 자리 확보')}
        <div style="padding:9px 0 6px;{F}font-size:12px;line-height:18px;color:{SUB};">※ 격발 중에는 <b style="color:{INK};">절대 정숙</b> — 숨 참는 순간을 지켜 주세요</div>
      </div>
      <div style="margin-top:16px;">{split_btn}</div>
    </div>''')

# ───────── 시안 3 · 아크릴 네임택 — 버튼: 짐표(태그) 모양 ─────────
TAG = 'polygon(16px 0,100% 0,100% 100%,16px 100%,0 50%)'
tag_btn = f'''<div style="position:relative;height:44px;filter:drop-shadow(0 6px 10px rgba(29,42,61,.25));">
      <div style="position:absolute;inset:0;background:{NV2};clip-path:{TAG};-webkit-clip-path:{TAG};"></div>
      <span style="position:absolute;left:18px;top:50%;width:10px;height:10px;margin-top:-5px;border-radius:50%;background:{BG};box-shadow:inset 0 0 0 2px rgba(159,176,198,.8);"></span>
      <span style="position:absolute;left:28px;top:50%;width:26px;height:1.5px;margin-top:-.75px;background:rgba(159,176,198,.6);"></span>
      <div style="position:absolute;left:60px;right:16px;top:0;bottom:0;display:flex;align-items:center;justify-content:center;{F}font-size:13px;font-weight:700;letter-spacing:.04em;line-height:16px;color:#fff;">{BTN}</div>
    </div>'''
D3 = wrap(f'''
    <div style="position:relative;padding:22px 20px 20px;">
      <div style="position:relative;height:22px;">
        <span style="position:absolute;left:50%;top:0;width:22px;height:22px;margin-left:-11px;border-radius:50%;box-shadow:inset 0 0 0 3px {LN};"></span>
        <span style="position:absolute;left:50%;top:16px;width:3px;height:10px;margin-left:-1.5px;background:{LN};"></span>
      </div>
      <div style="position:relative;margin:2px auto 0;max-width:340px;padding:22px 20px 18px;border-radius:22px;background:linear-gradient(150deg,rgba(255,255,255,.92),rgba(226,233,242,.85));box-shadow:0 0 0 1.5px rgba(44,62,87,.18),inset 0 0 0 5px rgba(255,255,255,.7),0 14px 28px -12px rgba(29,42,61,.4);text-align:center;">
        <span style="position:absolute;left:50%;top:9px;width:12px;height:12px;margin-left:-6px;border-radius:50%;background:{BG};box-shadow:inset 0 0 0 1.5px rgba(44,62,87,.3);"></span>
        <div style="position:absolute;inset:0;border-radius:22px;background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.3) 42%,transparent 54%);pointer-events:none;"></div>
        <div style="margin-top:6px;line-height:10px;">{cap('NAME TAG · LANE {{11}}', 9, .2, AC, 700, 'margin-right:-.2em;')}</div>
        <div style="margin-top:8px;{FT}font-size:40px;font-weight:900;letter-spacing:-.05em;line-height:38px;color:{INK};">HONG<br><span style="color:transparent;-webkit-text-stroke:1.4px {INK};">YEJUN</span><span style="color:{AC};">.</span></div>
        <div style="display:flex;justify-content:center;gap:6px;margin-top:12px;">
          {tape('10.9', h=22, size=10, ls=.08, pad=9, radius=11)}
          {tape('MARKSMAN', h=22, size=9, ls=.16, pad=9, bg='#fff', fg=NV2, radius=11, extra='box-shadow:inset 0 0 0 1.5px ' + NV2 + ';')}
        </div>
        <div style="margin-top:14px;padding-top:12px;border-top:1px dashed rgba(96,124,160,.45);{F}font-size:12.5px;line-height:19px;color:{SUB};"><b style="color:{INK};">{{{{1}}}}</b><br>{{{{2}}}} · {{{{3}}}} {{{{4}}}}</div>
      </div>
      <div style="margin-top:18px;">{tag_btn}</div>
    </div>''')

# ───────── 시안 4 · 응원 플레이리스트 — 버튼: 재생 동그라미 + 글자 ─────────
def track(no, title, sub, dur, on=False):
    eq = (f'<span style="display:inline-flex;align-items:flex-end;gap:2px;height:12px;">' + ''.join(f'<span style="width:3px;height:{h}px;border-radius:1px;background:{AC};"></span>' for h in (6, 11, 8, 12)) + '</span>') if on else f'<span style="{F}{NUM}font-size:12px;font-weight:700;line-height:14px;color:{LN};">{no}</span>'
    return f'''<div style="display:flex;align-items:center;gap:12px;padding:9px 12px;border-radius:8px;{"background:#fff;box-shadow:0 0 0 1px rgba(44,62,87,.1),0 6px 12px -8px rgba(29,42,61,.3);" if on else ""}">
          <span style="flex-shrink:0;width:18px;display:flex;justify-content:center;">{eq}</span>
          <div style="min-width:0;flex:1;">
            <div style="{F}font-size:13px;font-weight:{800 if on else 600};line-height:18px;color:{INK};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{title}</div>
            <div style="{F}font-size:11px;line-height:15px;color:{FAINT};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{sub}</div>
          </div>
          <span style="flex-shrink:0;{F}{NUM}font-size:11px;font-weight:600;line-height:14px;color:{AC if on else LN};">{dur}</span>
        </div>'''
play_btn = f'''<div style="display:flex;align-items:center;gap:12px;">
      <span style="flex-shrink:0;position:relative;width:48px;height:48px;border-radius:50%;background:{INK};box-shadow:0 8px 16px -6px rgba(29,42,61,.6),0 0 0 4px rgba(96,124,160,.18);">
        <span style="position:absolute;left:19px;top:15px;width:0;height:0;border-style:solid;border-width:9px 0 9px 14px;border-color:transparent transparent transparent #fff;"></span></span>
      <div style="flex:1;display:flex;align-items:center;justify-content:space-between;height:48px;padding:0 18px;border-radius:24px;background:#fff;box-shadow:0 0 0 1.5px {NV2};">
        <span style="{F}font-size:13px;font-weight:800;line-height:16px;color:{NV2};">{BTN}</span>
        {cap('PLAY ALL', 8.5, .2, LN, 700, 'margin-right:-.2em;')}
      </div>
    </div>'''
D4 = wrap(f'''
    <div style="padding:20px 20px 20px;">
      <div style="display:flex;align-items:center;gap:14px;">
        <div style="position:relative;flex-shrink:0;width:64px;height:64px;border-radius:50%;background:repeating-radial-gradient(circle,{INK} 0 2px,#2a3a52 2px 4px);box-shadow:0 8px 16px -6px rgba(29,42,61,.5);">
          <span style="position:absolute;left:22px;top:22px;width:20px;height:20px;border-radius:50%;background:{AC};box-shadow:inset 0 0 0 7px {AC},inset 0 0 0 10px #fff;"></span>
        </div>
        <div style="min-width:0;">
          <div style="line-height:10px;">{cap("YEJUN'S CHEER PLAYLIST", 9, .2)}</div>
          <div style="margin-top:6px;{FT}font-size:26px;font-weight:900;letter-spacing:-.04em;line-height:28px;color:{INK};">숨 참는 노래<span style="color:{AC};">.</span></div>
          <div style="margin-top:4px;{F}{NUM}font-size:11.5px;line-height:16px;color:{FAINT};">3곡 · 10분 9초 · {{{{3}}}} 업데이트</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:2px;margin-top:16px;">
        {track('01', '{{1}}', '입장 — 사선 {{11}}번으로', '{{4}}')}
        {track('02', '{{2}}', '조준 — 한 손, 숨 멈춤', '3:21', True)}
        {track('03', '텐링 (10.9)', '격발 — 그리고 박수', '1:09')}
      </div>
      <div style="margin-top:16px;">{play_btn}</div>
    </div>''')

# ───────── 시안 5 · 덕질 영수증 — 버튼: 절취선 아래 잘라 가는 쿠폰 ─────────
ZIG = "background:linear-gradient(-45deg,transparent 6px,#fff 0) 0 0/12px 12px repeat-x,linear-gradient(45deg,transparent 6px,#fff 0) 0 0/12px 12px repeat-x;"
item = lambda name, val, strong=False: f'<div style="display:flex;justify-content:space-between;gap:12px;{F}font-size:12.5px;line-height:22px;color:{INK if strong else SUB};{"font-weight:800;" if strong else ""}"><span style="min-width:0;">{name}</span><span style="flex-shrink:0;{NUM}text-align:right;">{val}</span></div>'
D5 = wrap(f'''
    <div style="padding:20px 26px 22px;">
      <div style="position:relative;padding:18px 18px 10px;background:#fff;box-shadow:0 10px 22px -12px rgba(29,42,61,.35);">
        <div style="text-align:center;">
          <div style="{FT}font-size:20px;font-weight:900;letter-spacing:.12em;line-height:24px;color:{INK};margin-right:-.12em;">TEN RING STORE</div>
          <div style="margin-top:4px;line-height:10px;">{cap('홍예준 덕질 영수증 · NO.{{11}}', 9, .1, FAINT, 600)}</div>
          <div style="margin-top:3px;line-height:10px;">{cap('{{3}} {{4}}', 9, .1, LN, 600)}</div>
        </div>
        <div style="margin:12px 0 8px;border-top:1.5px dashed {LN};"></div>
        {item('사선 관람 (' + '{{1}}' + ')', '1')}
        {item('{{2}}', '♡')}
        {item('숨 참은 시간', '10.9초')}
        {item('심장 박동', '+109')}
        <div style="margin:8px 0 6px;border-top:1.5px dashed {LN};"></div>
        {item('TOTAL', '10.9 ♡', True)}
        <div style="display:flex;justify-content:center;margin-top:12px;"><span style="display:block;width:180px;height:30px;background:repeating-linear-gradient(90deg,{INK} 0 2px,transparent 2px 4px,{INK} 4px 5px,transparent 5px 8px,{INK} 8px 11px,transparent 11px 13px,{INK} 13px 14px,transparent 14px 17px);"></span></div>
        <div style="margin-top:6px;text-align:center;line-height:10px;">{cap('THANK YOU FOR LOVING YEJUN', 8, .2, LN, 600, 'margin-right:-.2em;')}</div>
        <div style="position:relative;margin:14px -18px 0;padding:14px 18px 10px;border-top:1.5px dashed {AC};">
          <span style="position:absolute;left:8px;top:-11px;{F}font-size:14px;line-height:20px;color:{AC};background:#fff;padding:0 4px;">✂</span>
          <div style="display:flex;align-items:center;justify-content:center;gap:10px;height:40px;border-radius:4px;background:{NV2};box-shadow:inset 0 0 0 3px {NV2},inset 0 0 0 4px rgba(242,244,247,.4);">
            <span style="{F}font-size:13px;font-weight:700;letter-spacing:.04em;line-height:16px;color:#fff;">{BTN}</span>
          </div>
        </div>
        <div style="position:absolute;left:0;right:0;bottom:-12px;height:12px;{ZIG}"></div>
      </div>
    </div>''')

# ───────── 시안 6 · 출석 스탬프판 — 버튼: 고무 도장 ─────────
def stamp(i, on):
    if on:
        return f'<span style="display:flex;align-items:center;justify-content:center;aspect-ratio:1;border-radius:50%;box-shadow:inset 0 0 0 2px {AC},inset 0 0 0 4px #fff,inset 0 0 0 5px rgba(96,124,160,.6);transform:rotate({(-12, 8, -4, 14, -9)[i % 5]}deg);{FT}font-size:{12 if i % 3 == 0 else 20}px;font-weight:900;letter-spacing:-.02em;line-height:{13 if i % 3 == 0 else 20}px;color:{AC};text-align:center;">{"10.9" if i % 3 == 0 else "♥"}</span>'
    return f'<span style="display:flex;align-items:center;justify-content:center;aspect-ratio:1;border-radius:50%;box-shadow:inset 0 0 0 1.5px rgba(159,176,198,.6);{F}{NUM}font-size:11px;font-weight:600;line-height:12px;color:{LN};">{i + 1}</span>'
grid = ''.join(stamp(i, i < 7) for i in range(10))
rubber = f'''<div style="display:flex;justify-content:center;">
      <div style="position:relative;display:flex;align-items:center;justify-content:center;gap:10px;height:48px;padding:0 26px;transform:rotate(-2deg);border-radius:6px;box-shadow:inset 0 0 0 2.5px {NV2},inset 0 0 0 5px #fff,inset 0 0 0 6.5px {NV2};background:#fff;">
        <span style="{FT}font-size:11px;font-weight:900;letter-spacing:.2em;line-height:12px;color:{AC};">STAMP</span>
        <span style="width:1.5px;height:20px;background:{NV2};opacity:.4;"></span>
        <span style="{F}font-size:14px;font-weight:800;letter-spacing:.02em;line-height:16px;color:{NV2};">{BTN}</span>
      </div>
    </div>'''
D6 = wrap(f'''
    <div style="padding:20px 20px 22px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
        <div>
          <div style="line-height:10px;">{cap('HONG YEJUN FAN ACCOUNT', 9, .2)}</div>
          <div style="margin-top:6px;{F}font-size:22px;font-weight:900;letter-spacing:-.04em;line-height:28px;color:{INK};">사선 출석 스탬프 🎯</div>
        </div>
        <div style="flex-shrink:0;text-align:right;">
          <div style="{FT}{NUM}font-size:28px;font-weight:900;letter-spacing:-.04em;line-height:28px;color:{INK};">7<span style="font-size:15px;color:{LN};">/10</span></div>
          <div style="line-height:10px;">{cap('STAMPS', 8.5, .2, LN, 600, 'margin-right:-.2em;')}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:16px;padding:16px;border-radius:10px;background:#fff;box-shadow:0 0 0 1px rgba(44,62,87,.1);background-image:radial-gradient(rgba(96,124,160,.12) 1px,transparent 1.5px);background-size:10px 10px;">{grid}</div>
      <div style="display:flex;align-items:center;gap:10px;margin-top:12px;padding:10px 14px;border-radius:8px;background:rgba(96,124,160,.1);">
        <span style="flex-shrink:0;{F}font-size:18px;line-height:20px;">📍</span>
        <div style="min-width:0;{F}font-size:12.5px;line-height:19px;color:{SUB};"><b style="color:{INK};">{{{{1}}}}</b> · {{{{2}}}}<br><span style="{NUM}color:{FAINT};">{{{{3}}}} {{{{4}}}} 출석 완료 · 사선 {{{{11}}}}번</span></div>
      </div>
      <div style="margin-top:18px;">{rubber}</div>
    </div>''')

DRAFTS = [('1', '팬레터 편지지', D1), ('2', '팬덤 공지', D2), ('3', '아크릴 네임택', D3), ('4', '응원 플레이리스트', D4), ('5', '덕질 영수증', D5), ('6', '출석 스탬프판', D6)]
out = '\n\n'.join(f'<!-- ===== 시안 {k} · {n} ===== -->\n{h}' for k, n, h in DRAFTS)
open(os.path.join(HERE, 'yjhm-main-drafts4.html'), 'w', encoding='utf-8').write(out + '\n')
print('wrote', len(DRAFTS), 'drafts')
