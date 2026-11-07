# YJHM 케이브덕 위젯 — 첫 화면 시안 3차: 홈 메인의 재료(색 · 글꼴 · 필름 · 라벨 테이프 · 망점)로 만든 「팬계정」 위젯들
# python3 design/widgets/yjhm-main-drafts3.gen.py → yjhm-main-drafts3.html (시안마다 <!-- ===== 시안 N · 이름 ===== -->)
# 자리표시: {{3}} 날짜 · {{4}} 시간 · {{1}} 장소 · {{2}} 상황 · {{11}} 레인 번호. 펼치기 버튼 「기사 전문 보기♡」는 모든 시안에.
# 픽셀 정렬은 고른 시안에만 마저 맞춘다 (사용자 요청)
import os
HERE = os.path.dirname(os.path.abspath(__file__))

F = "font-family:'Pretendard Variable','Pretendard','Noto Sans KR',-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Segoe UI',sans-serif;"
FT = "font-family:'Inter','Pretendard Variable','Pretendard',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"
NUM = "font-variant-numeric:tabular-nums;"
INK, NV2, AC, SUB, FAINT, LN, BG = '#1d2a3d', '#2c3e57', '#607ca0', '#4a5a70', '#6c7a8c', '#9fb0c6', '#eef0f3'
DOTS = "background-image:radial-gradient(rgba(96,124,160,.55) 30%,transparent 36%);background-size:4px 4px;"
PERF = "background:repeating-linear-gradient(90deg,transparent 0 4px,#eef0f3 4px 11px,transparent 11px 15px);"

def cap(text, size=9, ls=.2, color=AC, w=600, extra=''):
    return f'<span style="{F}{NUM}font-size:{size}px;font-weight:{w};letter-spacing:{ls}em;color:{color};line-height:{round(size) + 1}px;white-space:nowrap;{extra}">{text}</span>'

def tape(text, h=22, size=9.5, ls=.2, pad=10, bg=NV2, fg='#f2f4f7', radius=2, extra=''):
    return (f'<span style="flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;height:{h}px;padding:0 calc({pad}px - {ls}em) 0 {pad}px;'
            f'border-radius:{radius}px;background:{bg};color:{fg};{F}font-size:{size}px;font-weight:600;letter-spacing:{ls}em;line-height:{round(size)+1}px;white-space:nowrap;{extra}">{text}</span>')

def button(text='기사 전문 보기♡', radius=3):
    return f'<div style="display:flex;">{tape(text, h=38, size=11.5, ls=.06, pad=14, extra=f"flex:1;border-radius:{radius}px;box-shadow:0 1px 3px rgba(20,30,48,.25),inset 0 1px 0 rgba(255,255,255,.12);")}</div>'

def wrap(body, bg=BG):
    return f'''<div style="width:100%;max-width:520px;margin:16px auto;color:{INK};word-break:keep-all;line-height:1.5;{F}">
  <div style="position:relative;overflow:hidden;background:{bg};border-radius:8px;box-shadow:0 0 0 1px rgba(44,62,87,.1),0 18px 40px rgba(44,62,87,.14);">
{body}
  </div>
</div>'''

def scene(kind):
    """사진 자리 — CSS로 그린 장면 (과녁지 벽 / 어두운 사선)"""
    if kind == 'target':
        return f'''<div style="position:absolute;inset:0;background:linear-gradient(160deg,#f3efe2,#d6c9aa);"></div>
          <div style="position:absolute;left:12%;top:14%;width:44%;aspect-ratio:1;border-radius:50%;background:repeating-radial-gradient(circle,{INK} 0 3px,#efe6cf 3px 7px);box-shadow:0 0 0 3px #efe6cf;"></div>
          <div style="position:absolute;right:9%;top:34%;width:28%;aspect-ratio:1;border-radius:50%;background:repeating-radial-gradient(circle,{INK} 0 2px,#efe6cf 2px 5px);opacity:.75;"></div>
          <div style="position:absolute;inset:0;{DOTS}opacity:.3;"></div>'''
    return f'''<div style="position:absolute;inset:0;background:radial-gradient(80% 75% at 68% 28%,#56779c,#16243a 72%);"></div>
          <div style="position:absolute;left:0;right:0;bottom:24%;height:2px;background:rgba(255,255,255,.22);"></div>
          <div style="position:absolute;right:14%;top:20%;width:24%;aspect-ratio:1;border-radius:50%;background:repeating-radial-gradient(circle,#e8edf4 0 2px,#22344d 2px 5px);opacity:.9;"></div>
          <div style="position:absolute;inset:0;{DOTS}opacity:.22;"></div>'''

def avatar(size=40, ring=True):
    return (f'<span style="flex-shrink:0;position:relative;display:flex;align-items:center;justify-content:center;width:{size}px;height:{size}px;border-radius:50%;'
            f'background:linear-gradient(150deg,{AC},{INK});{"box-shadow:0 0 0 2px #fff,0 0 0 3px rgba(96,124,160,.5);" if ring else ""}'
            f'{FT}font-size:{round(size*.32)}px;font-weight:800;letter-spacing:-.02em;line-height:1;color:#fff;">YJ</span>')

# ───────── 시안 1 · 덕계 트윗 ─────────
act = lambda icon, n, on=False: f'<span style="display:inline-flex;align-items:center;gap:5px;{F}{NUM}font-size:12px;font-weight:{700 if on else 500};line-height:14px;color:{AC if on else FAINT};"><span style="font-size:14px;">{icon}</span>{n}</span>'
D1 = wrap(f'''
    <div style="padding:18px 18px 16px;">
      <div style="display:flex;align-items:center;gap:10px;">
        {avatar(42)}
        <div style="min-width:0;flex:1;">
          <div style="display:flex;align-items:center;gap:5px;{F}font-size:14px;font-weight:800;line-height:18px;color:{INK};white-space:nowrap;">홍예준 팬계정 ♡<span style="display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;background:{AC};color:#fff;font-size:9px;line-height:1;">✓</span></div>
          <div style="{F}font-size:12px;line-height:16px;color:{FAINT};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">@hongyejun_10ring · {{{{4}}}}</div>
        </div>
        <span style="{F}font-size:16px;font-weight:700;line-height:16px;color:{LN};">···</span>
      </div>
      <div style="margin-top:12px;{F}font-size:15px;line-height:23px;color:{INK};">{{{{2}}}}<br>오늘도 텐링 쏘는 우리 예준이 보고 가세요 🎯</div>
      <div style="margin-top:4px;{F}font-size:14px;font-weight:600;line-height:22px;color:{AC};">#홍예준 #텐링 #{{{{1}}}}</div>
      <div style="position:relative;margin-top:12px;height:196px;border-radius:14px;overflow:hidden;background:{INK};box-shadow:0 0 0 1px rgba(44,62,87,.12);">
        <div style="position:absolute;left:0;right:0;top:5px;height:6px;{PERF}"></div>
        <div style="position:absolute;left:0;right:0;bottom:5px;height:6px;{PERF}"></div>
        <div style="position:absolute;left:0;right:0;top:16px;bottom:16px;overflow:hidden;">{scene('range')}</div>
        <span style="position:absolute;left:12px;bottom:26px;">{tape('📍 {{1}}', h=24, size=11, ls=0, pad=10, bg='rgba(29,42,61,.72)', radius=12)}</span>
        <span style="position:absolute;right:12px;top:24px;">{tape('1/4', h=20, size=9.5, ls=.06, pad=8, bg='rgba(29,42,61,.72)', radius=10)}</span>
      </div>
      <div style="margin-top:10px;padding-bottom:10px;border-bottom:1px solid rgba(44,62,87,.1);{F}{NUM}font-size:12px;line-height:16px;color:{FAINT};">{{{{3}}}} · {{{{4}}}} · 사선 {{{{11}}}}번 · <b style="color:{INK};">10.9만</b> 조회</div>
      <div style="display:flex;justify-content:space-between;padding:10px 6px 2px;">
        {act('↩', '109')}{act('⇄', '1,090')}{act('♥', '10.9K', True)}{act('⚑', '보관')}
      </div>
    </div>
    <div style="padding:0 18px 18px;">{button(radius=19)}</div>''', bg='#fff')

# ───────── 시안 2 · 직캠 영상 ─────────
chap = lambda t, n, on=False: f'<span style="flex-shrink:0;display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px;border-radius:13px;background:{NV2 if on else "#fff"};box-shadow:{"none" if on else "0 0 0 1px rgba(44,62,87,.14)"};{F}{NUM}font-size:11px;font-weight:600;line-height:13px;color:{"#fff" if on else SUB};white-space:nowrap;"><b style="font-weight:700;color:{LN if on else AC};">{t}</b>{n}</span>'
D2 = wrap(f'''
    <div style="position:relative;height:262px;background:{INK};overflow:hidden;">
      {scene('range')}
      <div style="position:absolute;inset:0;background:linear-gradient(0deg,rgba(14,22,34,.85),transparent 45%,rgba(14,22,34,.35));"></div>
      <span style="position:absolute;left:14px;top:14px;">{tape('FANCAM 4K', h=22, size=9.5, ls=.2, pad=9, bg='#fff', fg=NV2)}</span>
      <span style="position:absolute;right:14px;top:14px;">{cap('© HONG YEJUN FAN ACCOUNT', 8.5, .16, 'rgba(255,255,255,.7)')}</span>
      <div style="position:absolute;left:50%;top:50%;width:62px;height:62px;margin:-41px 0 0 -31px;border-radius:50%;background:rgba(255,255,255,.16);box-shadow:0 0 0 2px rgba(255,255,255,.85);backdrop-filter:blur(4px);">
        <span style="position:absolute;left:25px;top:19px;width:0;height:0;border-style:solid;border-width:12px 0 12px 19px;border-color:transparent transparent transparent #fff;"></span>
      </div>
      <div style="position:absolute;left:14px;right:14px;bottom:14px;">
        <div style="position:relative;height:3px;border-radius:2px;background:rgba(255,255,255,.3);"><span style="position:absolute;left:0;top:0;bottom:0;width:31%;border-radius:2px;background:{LN};"></span><span style="position:absolute;left:31%;top:50%;width:11px;height:11px;margin:-5.5px 0 0 -5.5px;border-radius:50%;background:#fff;"></span></div>
        <div style="display:flex;justify-content:space-between;margin-top:8px;line-height:10px;">{cap('0:21 / 1:09', 9, .08, '#fff')}{cap('{{4}}', 9, .08, 'rgba(255,255,255,.75)')}</div>
      </div>
    </div>
    <div style="padding:16px 18px 18px;">
      <div style="{F}font-size:16px;font-weight:800;letter-spacing:-.02em;line-height:23px;color:{INK};">[직캠] 홍예준 10.9 격발 — {{{{1}}}} 🎯</div>
      <div style="margin-top:4px;{F}{NUM}font-size:12px;line-height:17px;color:{FAINT};">조회수 10.9만회 · {{{{3}}}} · 사선 {{{{11}}}}번</div>
      <div style="display:flex;gap:6px;margin-top:12px;padding:1px;overflow:hidden;">{chap('0:00', '입장')}{chap('0:10', '조준')}{chap('0:21', '격발 ♡', True)}{chap('0:48', '인터뷰')}</div>
      <div style="display:flex;align-items:center;gap:10px;margin-top:14px;padding:10px 0;border-top:1px solid rgba(44,62,87,.1);">
        {avatar(34, False)}
        <div style="min-width:0;flex:1;">
          <div style="{F}font-size:13px;font-weight:700;line-height:17px;color:{INK};">홍예준 팬계정 ♡</div>
          <div style="{F}font-size:11.5px;line-height:16px;color:{FAINT};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{{{2}}}}</div>
        </div>
        {tape('구독중 ♡', h=28, size=11, ls=0, pad=12, bg=BG, fg=NV2, radius=14)}
      </div>
      <div style="margin-top:6px;">{button(radius=19)}</div>
    </div>''', bg='#fff')

# ───────── 시안 3 · 컵홀더 생카 포스터 ─────────
cup = f'''<div style="position:relative;flex-shrink:0;width:108px;height:168px;">
        <span style="position:absolute;left:8px;right:8px;top:6px;height:12px;border-radius:6px 6px 2px 2px;background:#fff;box-shadow:0 0 0 1.5px {INK};"></span>
        <span style="position:absolute;left:2px;right:2px;top:16px;height:9px;border-radius:3px;background:#f7f8fa;box-shadow:0 0 0 1.5px {INK};"></span>
        <div style="position:absolute;left:10px;right:10px;top:25px;bottom:0;background:{INK};clip-path:polygon(0 0,100% 0,88% 100%,12% 100%);-webkit-clip-path:polygon(0 0,100% 0,88% 100%,12% 100%);"></div>
        <div style="position:absolute;left:12px;right:12px;top:25px;bottom:2px;background:#fff;clip-path:polygon(0 0,100% 0,88% 100%,12% 100%);-webkit-clip-path:polygon(0 0,100% 0,88% 100%,12% 100%);"></div>
        <div style="position:absolute;left:12px;right:12px;top:58px;height:62px;background:{NV2};clip-path:polygon(0 0,100% 0,95% 100%,5% 100%);-webkit-clip-path:polygon(0 0,100% 0,95% 100%,5% 100%);">
          <div style="position:absolute;inset:0;background-image:radial-gradient(rgba(242,244,247,.14) 30%,transparent 36%);background-size:4px 4px;"></div>
          <div style="position:absolute;left:0;right:0;top:11px;text-align:center;{FT}font-size:22px;font-weight:900;letter-spacing:-.04em;line-height:22px;color:#fff;">YJ</div>
          <div style="position:absolute;left:0;right:0;top:36px;text-align:center;{F}font-size:8px;font-weight:700;letter-spacing:.14em;line-height:10px;color:{LN};">10.9 ♡</div>
        </div>
      </div>'''
perk = lambda t: f'<div style="display:flex;align-items:center;gap:8px;{F}font-size:12px;font-weight:600;line-height:18px;color:{INK};"><span style="flex-shrink:0;width:14px;height:14px;border-radius:3px;background:{AC};color:#fff;font-size:10px;line-height:14px;text-align:center;">✓</span>{t}</div>'
D3 = wrap(f'''
    <div style="padding:16px;">
      <div style="position:relative;padding:18px 18px 16px;border-radius:4px;background:#fff;box-shadow:0 0 0 1px rgba(44,62,87,.12),0 10px 22px -12px rgba(29,42,61,.35);">
        <div style="position:absolute;left:0;right:0;top:0;height:8px;{PERF}background-color:{INK};border-radius:4px 4px 0 0;"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
          {tape('BIRTHDAY CAFE', h=22, size=9.5, ls=.2, pad=9)}
          {cap('HONG YEJUN · CUPSLEEVE EVENT', 8.5, .16, LN, 600, 'margin-right:-.16em;')}
        </div>
        <div style="margin-top:12px;{FT}font-size:42px;font-weight:900;letter-spacing:-.05em;line-height:40px;color:{INK};white-space:nowrap;">10.9 <span style="color:transparent;-webkit-text-stroke:1.4px {INK};">CAFÉ</span><span style="color:{AC};">.</span></div>
        <div style="display:flex;gap:18px;align-items:flex-end;margin-top:14px;">
          {cup}
          <div style="min-width:0;flex:1;">
            <div style="line-height:10px;">{cap('DATE', 8.5, .2, LN)}</div>
            <div style="margin-top:3px;{FT}{NUM}font-size:20px;font-weight:800;letter-spacing:-.02em;line-height:24px;color:{INK};">{{{{3}}}}</div>
            <div style="margin-top:2px;{F}{NUM}font-size:12px;font-weight:600;line-height:17px;color:{AC};">{{{{4}}}} ~ 마감까지</div>
            <div style="margin-top:10px;line-height:10px;">{cap('PLACE', 8.5, .2, LN)}</div>
            <div style="margin-top:3px;{F}font-size:14px;font-weight:800;line-height:19px;color:{INK};">{{{{1}}}}</div>
            <div style="display:flex;flex-direction:column;gap:5px;margin-top:12px;padding-top:10px;border-top:1px dashed rgba(96,124,160,.45);">
              {perk('컵홀더 · 필름 포토카드')}{perk('과녁 스티커 (선착 109)')}{perk('사선 {{11}}번 랜덤 키링')}
            </div>
          </div>
        </div>
        <div style="margin-top:14px;padding:9px 12px;border-radius:3px;background:{BG};{F}font-size:12px;line-height:18px;color:{SUB};"><b style="color:{AC};">NOTICE</b> &nbsp;{{{{2}}}}</div>
      </div>
      <div style="margin-top:14px;">{button()}</div>
    </div>''')

# ───────── 시안 4 · 홈마 프리뷰 (워터마크) ─────────
WM = "background-image:repeating-linear-gradient(-30deg,transparent 0 34px,rgba(255,255,255,.0) 34px 35px);"
def shot(kind, no, cap_text=''):
    return f'''<div style="position:relative;border-radius:3px;overflow:hidden;aspect-ratio:4/5;background:{INK};">
          {scene(kind)}
          <div style="position:absolute;left:-30%;right:-30%;top:44%;transform:rotate(-24deg);text-align:center;{FT}font-size:11px;font-weight:800;letter-spacing:.12em;line-height:13px;color:rgba(255,255,255,.42);white-space:nowrap;">© 10RING_YJ &nbsp; © 10RING_YJ</div>
          <span style="position:absolute;left:8px;top:8px;{F}{NUM}font-size:9px;font-weight:700;letter-spacing:.1em;line-height:10px;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.5);">{no}</span>
          {cap_text}
        </div>'''
D4 = wrap(f'''
    <div style="padding:18px 18px 0;">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:10px;">
        <div>
          <div style="line-height:10px;">{cap('{{3}} · {{1}}', 9, .14)}</div>
          <div style="margin-top:6px;{FT}font-size:40px;font-weight:900;letter-spacing:-.05em;line-height:36px;color:{INK};">PREVIEW<span style="color:{AC};">.</span></div>
        </div>
        {tape('HQ 4/4', h=22, size=9.5, ls=.2, pad=9)}
      </div>
      <div style="display:grid;grid-template-columns:1.3fr 1fr;gap:6px;margin-top:14px;">
        {shot('range', '01')}
        <div style="display:grid;grid-template-rows:1fr 1fr;gap:6px;">
          <div style="position:relative;border-radius:3px;overflow:hidden;background:{INK};">{scene('target')}<span style="position:absolute;left:8px;top:8px;{F}font-size:9px;font-weight:700;letter-spacing:.1em;line-height:10px;color:{INK};">02</span><div style="position:absolute;left:-30%;right:-30%;top:40%;transform:rotate(-24deg);text-align:center;{FT}font-size:10px;font-weight:800;letter-spacing:.12em;line-height:12px;color:rgba(29,42,61,.25);white-space:nowrap;">© 10RING_YJ</div></div>
          <div style="position:relative;border-radius:3px;overflow:hidden;background:{INK};">{scene('range')}<span style="position:absolute;left:8px;top:8px;{F}font-size:9px;font-weight:700;letter-spacing:.1em;line-height:10px;color:#fff;">03</span><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(14,22,34,.55);{FT}font-size:20px;font-weight:800;line-height:22px;color:#fff;">+1</div></div>
        </div>
      </div>
      <div style="margin-top:12px;{F}font-size:13.5px;line-height:21px;color:{INK};">{{{{2}}}} — 사선 {{{{11}}}}번에서 숨 참는 순간 🎯</div>
      <div style="margin-top:6px;line-height:10px;">{cap('© HONG YEJUN FAN ACCOUNT · DO NOT EDIT · DO NOT CROP', 8, .14, LN)}</div>
    </div>
    <div style="padding:14px 18px 18px;">{button()}</div>''', bg='#fff')

# ───────── 시안 5 · 시즌그리팅 다이어리 ─────────
def cal():
    days = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    head = ''.join(f'<span style="text-align:center;{F}font-size:8.5px;font-weight:700;letter-spacing:.1em;line-height:10px;color:{AC if i else "#c0788a"};">{d}</span>' for i, d in enumerate(days))
    cells = []
    for i in range(35):
        d = i - 6 + 1   # 1일이 토요일
        txt = str(d) if 1 <= d <= 30 else ''
        mark = ''
        if d == 6: mark = f'background:{NV2};color:#fff;border-radius:50%;'
        elif d in (14, 23): mark = f'box-shadow:inset 0 0 0 1.5px {AC};border-radius:50%;color:{AC};'
        heart = f'<span style="position:absolute;right:-1px;top:-5px;font-size:9px;line-height:9px;color:{AC};">♥</span>' if d in (9, 27) else ''
        cells.append(f'<span style="position:relative;display:flex;align-items:center;justify-content:center;height:22px;width:22px;margin:0 auto;{F}{NUM}font-size:10.5px;font-weight:600;line-height:12px;color:{INK};{mark}">{txt}{heart}</span>')
    return f'<div style="display:grid;grid-template-columns:repeat(7,1fr);row-gap:5px;">{head}{"".join(cells)}</div>'
D5 = wrap(f'''
    <div style="padding:18px 18px 0;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;">
        <div style="{FT}font-size:44px;font-weight:900;letter-spacing:-.05em;line-height:40px;color:{INK};">NOV<span style="color:{AC};">.</span></div>
        {cap("2026 SEASON'S GREETINGS · YJ", 8.5, .16, LN, 600, 'margin-right:-.16em;')}
      </div>
      <div style="display:flex;gap:16px;margin-top:14px;align-items:flex-start;">
        <div style="flex:1;min-width:0;padding:12px 10px;border-radius:6px;background:#fff;box-shadow:0 0 0 1px rgba(44,62,87,.1);">{cal()}</div>
        <div style="position:relative;flex-shrink:0;width:128px;">
          <div style="position:relative;padding:7px 7px 26px;background:#fff;transform:rotate(3deg);box-shadow:0 8px 18px rgba(29,42,61,.18),0 0 0 1px rgba(44,62,87,.08);">
            <div style="position:relative;height:118px;overflow:hidden;">{scene('target')}</div>
            <div style="position:absolute;left:0;right:0;bottom:7px;text-align:center;{F}font-size:10px;font-weight:700;line-height:12px;color:{SUB};">우리 텐링 요정 ♡</div>
          </div>
          <span style="position:absolute;left:38px;top:-8px;width:52px;height:16px;transform:rotate(-6deg);background:rgba(159,176,198,.75);"></span>
        </div>
      </div>
      <div style="position:relative;margin-top:14px;padding:12px 14px;border-radius:2px;background:#fdf7d8;transform:rotate(-1deg);box-shadow:0 6px 14px -6px rgba(29,42,61,.3);">
        <div style="line-height:10px;">{cap('D-DAY · {{3}} {{4}}', 9, .12, '#a8862e')}</div>
        <div style="margin-top:6px;{F}font-size:14px;font-weight:800;line-height:20px;color:{INK};">{{{{1}}}} 가는 날 🎯</div>
        <div style="{F}font-size:12px;line-height:18px;color:{SUB};">{{{{2}}}} · 사선 {{{{11}}}}번</div>
      </div>
    </div>
    <div style="padding:18px 18px 18px;">{button()}</div>''')

# ───────── 시안 6 · 응원 랭킹 차트 ─────────
def bar(rank, name, score, pct, on=False):
    return f'''<div style="display:flex;align-items:center;gap:10px;padding:8px 0;">
          <span style="flex-shrink:0;width:22px;{FT}{NUM}font-size:{18 if on else 14}px;font-weight:900;letter-spacing:-.03em;line-height:20px;color:{INK if on else LN};">{rank}</span>
          <div style="min-width:0;flex:1;">
            <div style="display:flex;justify-content:space-between;align-items:baseline;{F}font-size:12.5px;font-weight:{800 if on else 600};line-height:17px;color:{INK if on else SUB};"><span>{name}</span><span style="{FT}{NUM}font-weight:800;color:{AC if on else LN};">{score}</span></div>
            <div style="position:relative;height:{10 if on else 6}px;margin-top:5px;border-radius:5px;background:rgba(96,124,160,.14);overflow:hidden;"><span style="position:absolute;left:0;top:0;bottom:0;width:{pct}%;border-radius:5px;background:{f"linear-gradient(90deg,{AC},{NV2})" if on else LN};"></span></div>
          </div>
        </div>'''
D6 = wrap(f'''
    <div style="padding:18px 18px 0;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        {tape('VOTE NOW ♡', h=24, size=10, ls=.18, pad=10, radius=12)}
        {cap('{{3}} {{4}} 기준', 9, .06, LN, 600)}
      </div>
      <div style="margin-top:12px;{F}font-size:22px;font-weight:900;letter-spacing:-.04em;line-height:28px;color:{INK};">오늘의 응원 랭킹 🏆</div>
      <div style="margin-top:2px;{F}font-size:12px;line-height:18px;color:{FAINT};">{{{{1}}}} · 사선 {{{{11}}}}번 · 시리즈별 최고점</div>
      <div style="display:flex;align-items:center;gap:14px;margin-top:14px;padding:14px;border-radius:10px;background:{INK};background-image:radial-gradient(rgba(242,244,247,.08) 30%,transparent 36%);background-size:4px 4px;">
        <div style="position:relative;flex-shrink:0;width:56px;height:56px;border-radius:50%;background:repeating-radial-gradient(circle,#fff 0 4px,{AC} 4px 8px);box-shadow:0 0 0 3px {INK},0 0 0 4.5px {LN};"><span style="position:absolute;left:21px;top:21px;width:14px;height:14px;border-radius:50%;background:{INK};"></span></div>
        <div style="min-width:0;flex:1;">
          <div style="line-height:10px;">{cap('CHEER POINT', 8.5, .2, LN)}</div>
          <div style="margin-top:4px;{FT}{NUM}font-size:26px;font-weight:900;letter-spacing:-.03em;line-height:28px;color:#fff;">109,000 <span style="font-size:14px;color:{LN};">♡</span></div>
          <div style="{F}font-size:11.5px;line-height:17px;color:rgba(255,255,255,.75);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{{{2}}}}</div>
        </div>
      </div>
      <div style="margin-top:8px;">
        {bar('1', '홍예준 · FINAL', '10.9', 100, True)}
        {bar('2', 'SERIES 2', '10.7', 82)}
        {bar('3', 'SERIES 1', '10.4', 64)}
      </div>
    </div>
    <div style="padding:12px 18px 18px;">{button(radius=19)}</div>''', bg='#fff')

DRAFTS = [('1', '덕계 트윗', D1), ('2', '직캠 영상', D2), ('3', '컵홀더 생카 포스터', D3), ('4', '홈마 프리뷰', D4), ('5', '시즌그리팅 다이어리', D5), ('6', '응원 랭킹 차트', D6)]
out = '\n\n'.join(f'<!-- ===== 시안 {k} · {n} ===== -->\n{h}' for k, n, h in DRAFTS)
open(os.path.join(HERE, 'yjhm-main-drafts3.html'), 'w', encoding='utf-8').write(out + '\n')
print('wrote', len(DRAFTS), 'drafts')
