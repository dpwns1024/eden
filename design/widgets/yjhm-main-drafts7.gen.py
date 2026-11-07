# YJHM 케이브덕 위젯 — 첫 화면 시안 7차: 필카 「뷰파인더 화면」이 주인공 (5차 3번보다 작게 · 카메라 종류마다 다른 파인더)
# python3 design/widgets/yjhm-main-drafts7.gen.py → yjhm-main-drafts7.html (시안마다 <!-- ===== 시안 N · 이름 ===== -->)
# 자리표시: {{3}} 날짜 · {{4}} 시간 · {{1}} 장소 · {{2}} 상황 · {{11}} 레인 번호. 버튼 글자 「기사 전문 보기♡」
# 픽셀 정렬은 고른 시안에만 마저 맞춘다 (사용자 요청)
import os
HERE = os.path.dirname(os.path.abspath(__file__))

F = "font-family:'Pretendard Variable','Pretendard','Noto Sans KR',-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Segoe UI',sans-serif;"
FT = "font-family:'Inter','Pretendard Variable','Pretendard',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"
NUM = "font-variant-numeric:tabular-nums;"
INK, NV2, AC, SUB, FAINT, LN, BG = '#1d2a3d', '#2c3e57', '#607ca0', '#4a5a70', '#6c7a8c', '#9fb0c6', '#eef0f3'
BTN = '기사 전문 보기♡'
GREEN, AMBER = '#9be37c', '#f2b33d'
SCREEN = "background:radial-gradient(70% 70% at 50% 45%,#ece7d8,#a6b2c2 62%,#56657d);"
GRAIN = "background-image:radial-gradient(rgba(29,42,61,.35) 30%,transparent 36%);background-size:3px 3px;opacity:.28;"

def cap(text, size=9, ls=.16, color=AC, w=600, extra=''):
    return f'<span style="{F}{NUM}font-size:{size}px;font-weight:{w};letter-spacing:{ls}em;color:{color};line-height:{round(size) + 1}px;white-space:nowrap;{extra}">{text}</span>'

def wrap(body, bg=BG):
    return f'''<div style="width:100%;max-width:520px;margin:16px auto;color:{INK};word-break:keep-all;line-height:1.5;{F}">
  <div style="position:relative;overflow:hidden;background:{bg};border-radius:12px;box-shadow:0 0 0 1px rgba(44,62,87,.1),0 18px 40px rgba(44,62,87,.14);">
{body}
  </div>
</div>'''

def subject(size=17, sub=11.5, color=INK):
    return (f'<div style="{F}font-size:{size}px;font-weight:900;letter-spacing:-.03em;line-height:{round(size*1.3)}px;color:{color};">{{{{1}}}}</div>'
            f'<div style="{F}font-size:{sub}px;font-weight:600;line-height:{round(sub*1.5)}px;color:{SUB};">{{{{2}}}}</div>')

def led(items, color=GREEN, bg='#0a0f17', h=24):
    return f'<div style="position:absolute;left:0;right:0;bottom:0;height:{h}px;display:flex;justify-content:space-around;align-items:center;background:{bg};">{"".join(items)}</div>'

def meter(on=2, color=GREEN):
    return f'<span style="display:flex;gap:3px;">' + ''.join(f'<span style="width:5px;height:5px;border-radius:50%;background:{color if i == on else "rgba(155,227,124,.28)"};"></span>' for i in range(5)) + '</span>'

def eyepiece(inner, w='100%', h=214, radius=24):
    """접안부 고무 테 — 그 안이 파인더 화면"""
    return f'''<div style="position:relative;width:{w};height:{h}px;border-radius:{radius}px;background:#0b111a;box-shadow:inset 0 0 0 5px #1b2636,inset 0 0 24px rgba(0,0,0,.85),0 12px 24px -12px rgba(29,42,61,.6);overflow:hidden;">
        {inner}
      </div>'''

def btn(style='pill'):
    if style == 'lever':
        return f'''<div style="display:flex;align-items:center;height:44px;border-radius:22px;background:linear-gradient(180deg,#3a4b63,{INK});box-shadow:inset 0 1px 0 rgba(255,255,255,.15),0 6px 12px -6px rgba(29,42,61,.6);overflow:hidden;">
      <span style="flex-shrink:0;display:flex;align-items:center;gap:3px;height:100%;padding:0 14px;background:rgba(255,255,255,.08);">{''.join(f'<span style="width:2px;height:{h}px;border-radius:1px;background:rgba(255,255,255,.6);"></span>' for h in (10, 16, 20, 16, 10))}</span>
      <span style="flex:1;text-align:center;{F}font-size:13.5px;font-weight:800;line-height:16px;color:#fff;">{BTN}</span>
      <span style="flex-shrink:0;padding:0 16px;{FT}font-size:16px;font-weight:700;line-height:16px;color:{LN};">›</span>
    </div>'''
    return f'''<div style="display:flex;align-items:center;gap:12px;">
      <span style="flex-shrink:0;position:relative;display:block;width:44px;height:44px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#e3e8ee,#8e9bad 55%,#5a6779);box-shadow:0 3px 6px rgba(29,42,61,.35),inset 0 0 0 2px rgba(255,255,255,.4);">
        <span style="position:absolute;inset:12px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#f4f6f9,#aab4c3);box-shadow:inset 0 1px 2px rgba(0,0,0,.35);"></span></span>
      <div style="flex:1;display:flex;align-items:center;justify-content:center;height:42px;border-radius:21px;background:linear-gradient(180deg,#3a4b63,{INK});box-shadow:inset 0 1px 0 rgba(255,255,255,.15),0 6px 12px -6px rgba(29,42,61,.6);{F}font-size:13.5px;font-weight:800;line-height:16px;color:#fff;">{BTN}</div>
    </div>'''

def topline(left, right):
    return f'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;line-height:11px;">{left}{right}</div>'

# ───────── 시안 1 · 레인지파인더 — 밝은 프레임 선(35/50) · 가운데 노란 이중상 ─────────
R1 = eyepiece(f'''
        <div style="position:absolute;inset:12px 12px 36px;border-radius:14px;{SCREEN}"></div>
        <div style="position:absolute;inset:12px 12px 36px;border-radius:14px;{GRAIN}"></div>
        <div style="position:absolute;left:34px;right:34px;top:26px;bottom:50px;border:1.5px solid rgba(255,255,255,.95);"></div>
        <div style="position:absolute;left:70px;right:70px;top:44px;bottom:68px;border:1px solid rgba(255,255,255,.7);border-style:solid dashed;"></div>
        <div style="position:absolute;left:50%;top:50%;width:150px;height:56px;margin:-38px 0 0 -75px;border-radius:4px;background:rgba(242,179,61,.28);box-shadow:inset 0 0 0 1px rgba(242,179,61,.6);"></div>
        <div style="position:absolute;left:0;right:0;top:50%;margin-top:-34px;text-align:center;">
          <div style="position:relative;display:inline-block;">
            <span style="position:absolute;left:5px;top:0;{F}font-size:18px;font-weight:900;letter-spacing:-.03em;line-height:24px;color:rgba(29,42,61,.3);white-space:nowrap;">{{{{1}}}}</span>
            <span style="position:relative;{F}font-size:18px;font-weight:900;letter-spacing:-.03em;line-height:24px;color:{INK};white-space:nowrap;">{{{{1}}}}</span>
          </div>
          <div style="{F}font-size:11.5px;font-weight:600;line-height:17px;color:{SUB};">{{{{2}}}}</div>
        </div>
        <span style="position:absolute;left:40px;top:32px;">{cap('35', 8, .1, '#fff', 800)}</span>
        <span style="position:absolute;right:76px;top:50px;">{cap('50', 8, .1, 'rgba(255,255,255,.8)', 800)}</span>
        {led([cap('125', 10, .04, GREEN, 700), cap('F2.8', 10, .04, GREEN, 700), meter(), cap('24/36', 10, .04, GREEN, 700)])}''')
D1 = wrap(f'''
    <div style="padding:18px 18px 18px;">
      {topline(cap('RANGEFINDER · TEN RING 400', 9, .18), cap('{{3}} {{4}}', 9, .08, AC, 600))}
      {R1}
      <div style="display:flex;justify-content:space-between;margin:10px 2px 14px;line-height:10px;">{cap('HONG YEJUN · FAN ACCOUNT ♡', 8.5, .18, LN)}{cap('LANE {{11}}', 8.5, .18, LN, 600, 'margin-right:-.18em;')}</div>
      {btn()}
    </div>''')

# ───────── 시안 2 · 일안 반사식(SLR) — 매트 스크린 · 상 분할 원 · 마이크로프리즘 고리 ─────────
R2 = eyepiece(f'''
        <div style="position:absolute;inset:12px 12px 36px;border-radius:6px;background:radial-gradient(75% 80% at 50% 45%,#d9dde3,#8c99ab 70%,#3e4c63);"></div>
        <div style="position:absolute;inset:12px 12px 36px;border-radius:6px;background-image:radial-gradient(rgba(255,255,255,.35) .6px,transparent 1px);background-size:3px 3px;opacity:.5;"></div>
        <div style="position:absolute;left:50%;top:50%;width:92px;height:92px;margin:-58px 0 0 -46px;border-radius:50%;background:repeating-conic-gradient(rgba(29,42,61,.18) 0 4deg,transparent 4deg 8deg);box-shadow:inset 0 0 0 1px rgba(29,42,61,.45);"></div>
        <div style="position:absolute;left:50%;top:50%;width:46px;height:46px;margin:-35px 0 0 -23px;border-radius:50%;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(29,42,61,.6);background:rgba(255,255,255,.25);">
          <span style="position:absolute;left:0;right:0;top:50%;height:1px;background:rgba(29,42,61,.65);"></span>
          <span style="position:absolute;left:12px;top:5px;width:2px;height:18px;background:{INK};"></span>
          <span style="position:absolute;left:16px;top:23px;width:2px;height:18px;background:{INK};"></span>
        </div>
        <div style="position:absolute;left:24px;right:24px;top:18px;text-align:center;">{subject(15, 10.5)}</div>
        <div style="position:absolute;left:24px;right:24px;bottom:44px;display:flex;justify-content:space-between;line-height:10px;">{cap('LANE {{11}}', 9, .14, INK, 700)}{cap('{{3}}', 9, .1, INK, 700)}</div>
        {led([cap('1/250', 10, .04, AMBER, 700), cap('▸ F2.8 ◂', 10, .04, AMBER, 700), cap('+ ● −', 10, .04, AMBER, 700), cap('ISO 400', 10, .04, AMBER, 700)], AMBER)}''', h=214, radius=16)
D2 = wrap(f'''
    <div style="padding:18px 18px 18px;">
      {topline(cap('SLR · PRISM VIEW', 9, .18), cap('{{4}}', 9, .08, AC, 600))}
      <div style="position:relative;padding:14px 22px 0;border-radius:20px 20px 0 0;background:linear-gradient(180deg,#2f3d52,{INK});">
        <div style="position:absolute;left:50%;top:-10px;width:120px;height:20px;margin-left:-60px;border-radius:6px 6px 0 0;background:linear-gradient(180deg,#3c4c63,#2f3d52);"></div>
        <div style="position:absolute;left:50%;top:-6px;transform:translateX(-50%);{FT}font-size:9px;font-weight:900;letter-spacing:.24em;line-height:10px;color:rgba(255,255,255,.75);margin-left:.12em;">YJ-1</div>
        {R2}
      </div>
      <div style="height:14px;border-radius:0 0 12px 12px;background:{INK};margin-bottom:14px;"></div>
      {btn('lever')}
    </div>''')

# ───────── 시안 3 · 이안 반사식(TLR) — 위에서 내려다보는 정사각 파인더 · 후드 ─────────
hood = lambda pos, rot: f'<span style="position:absolute;{pos}background:linear-gradient(180deg,#3a4a60,{INK});transform:{rot};"></span>'
R3 = f'''<div style="position:relative;width:236px;height:236px;margin:0 auto;">
        {hood('left:18px;right:18px;top:-6px;height:22px;clip-path:polygon(0 0,100% 0,92% 100%,8% 100%);', 'none')}
        <div style="position:absolute;inset:14px;border-radius:6px;background:#0b111a;box-shadow:inset 0 0 0 5px #1b2636,inset 0 0 22px rgba(0,0,0,.85),0 14px 26px -12px rgba(29,42,61,.6);overflow:hidden;">
          <div style="position:absolute;inset:10px;border-radius:3px;{SCREEN}"></div>
          <div style="position:absolute;inset:10px;border-radius:3px;{GRAIN}"></div>
          <div style="position:absolute;inset:10px;background-image:linear-gradient(90deg,transparent calc(33.33% - .5px),rgba(29,42,61,.35) calc(33.33% - .5px) calc(33.33% + .5px),transparent calc(33.33% + .5px) calc(66.66% - .5px),rgba(29,42,61,.35) calc(66.66% - .5px) calc(66.66% + .5px),transparent calc(66.66% + .5px)),linear-gradient(180deg,transparent calc(33.33% - .5px),rgba(29,42,61,.35) calc(33.33% - .5px) calc(33.33% + .5px),transparent calc(33.33% + .5px) calc(66.66% - .5px),rgba(29,42,61,.35) calc(66.66% - .5px) calc(66.66% + .5px),transparent calc(66.66% + .5px));"></div>
          <div style="position:absolute;left:50%;top:50%;width:52px;height:52px;margin:-26px 0 0 -26px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(29,42,61,.5);background:rgba(255,255,255,.18);"></div>
          <div style="position:absolute;left:16px;right:16px;bottom:18px;text-align:center;">{subject(14, 10)}</div>
          <div style="position:absolute;left:16px;right:16px;top:16px;display:flex;justify-content:space-between;line-height:10px;">{cap('6×6', 9, .1, INK, 800)}{cap('LANE {{11}}', 9, .1, INK, 800)}</div>
        </div>
      </div>'''
D3 = wrap(f'''
    <div style="padding:18px 18px 18px;">
      {topline(cap('TWIN LENS · WAIST LEVEL', 9, .18), cap('{{3}} {{4}}', 9, .08, AC, 600))}
      <div style="position:relative;padding:14px 0 18px;border-radius:14px;background:linear-gradient(180deg,#e8ecf1,#c6ced9);box-shadow:inset 0 1px 0 #fff,0 0 0 1px rgba(29,42,61,.15);">
        <span style="position:absolute;left:16px;top:16px;">{cap('TEN RING', 10, .16, INK, 900)}</span>
        <span style="position:absolute;right:16px;top:16px;">{cap('120 · 12 EXP', 9, .12, FAINT, 700, 'margin-right:-.12em;')}</span>
        <div style="height:24px;"></div>
        {R3}
        <div style="margin-top:8px;text-align:center;line-height:10px;">{cap('HONG YEJUN · FAN ACCOUNT ♡', 8.5, .2, SUB, 700, 'margin-right:-.2em;')}</div>
      </div>
      <div style="margin-top:14px;">{btn()}</div>
    </div>''')

# ───────── 시안 4 · 하프 프레임 — 세로 파인더 두 칸(한 칸은 이미 찍힌 프레임) ─────────
def half(main=True):
    if main:
        inner = f'''<div style="position:absolute;inset:10px 10px 34px;border-radius:10px;{SCREEN}"></div>
          <div style="position:absolute;inset:10px 10px 34px;border-radius:10px;{GRAIN}"></div>
          <div style="position:absolute;left:24px;right:24px;top:22px;bottom:46px;border:1.5px solid rgba(255,255,255,.95);"></div>
          <span style="position:absolute;left:50%;top:22px;width:1.5px;height:8px;margin-left:-.75px;background:#fff;"></span>
          <div style="position:absolute;left:28px;right:28px;top:22px;bottom:46px;display:flex;flex-direction:column;justify-content:center;text-align:center;">{subject(16, 11)}</div>
          {led([cap('F2.8', 10, .04, GREEN, 700), meter(), cap('18/72', 10, .04, GREEN, 700)])}'''
        return f'<div style="flex:1.25;min-width:0;">{eyepiece(inner, h=232, radius=20)}</div>'
    return f'''<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:8px;">
        <div style="position:relative;flex:1;border-radius:10px;background:{INK};overflow:hidden;box-shadow:inset 0 0 0 4px #1b2636;">
          <div style="position:absolute;left:0;right:0;top:6px;height:5px;background:repeating-linear-gradient(90deg,transparent 0 4px,#eef0f3 4px 10px,transparent 10px 14px);"></div>
          <div style="position:absolute;left:0;right:0;bottom:6px;height:5px;background:repeating-linear-gradient(90deg,transparent 0 4px,#eef0f3 4px 10px,transparent 10px 14px);"></div>
          <div style="position:absolute;left:10px;right:10px;top:18px;bottom:18px;border-radius:4px;background:linear-gradient(160deg,#53637a,#2a3a52);display:flex;flex-direction:column;justify-content:center;padding:0 10px;">
            {cap('▶ 17A', 9, .12, '#c9cfd6', 700)}
            <div style="margin-top:6px;{F}{NUM}font-size:13px;font-weight:800;line-height:18px;color:#ff9a4d;text-shadow:0 0 6px rgba(255,154,77,.5);">{{{{3}}}}<br>{{{{4}}}}</div>
          </div>
        </div>
        <div style="padding:10px 12px;border-radius:10px;background:#fff;box-shadow:0 0 0 1px rgba(44,62,87,.1);">
          <div style="line-height:10px;">{cap('LAST FRAME', 8.5, .18, LN)}</div>
          <div style="margin-top:4px;{F}font-size:12px;font-weight:700;line-height:17px;color:{INK};">LANE {{{{11}}}} · 10.9 ♡</div>
        </div>
      </div>'''
D4 = wrap(f'''
    <div style="padding:18px 18px 18px;">
      {topline(cap('HALF FRAME · 72 SHOTS', 9, .18), cap('HONG YEJUN ♡', 9, .16, AC, 600, 'margin-right:-.16em;'))}
      <div style="display:flex;gap:10px;align-items:stretch;">{half(True)}{half(False)}</div>
      <div style="margin-top:14px;">{btn('lever')}</div>
    </div>''')

DRAFTS = [('1', '레인지파인더', D1), ('2', '일안 반사식 SLR', D2), ('3', '이안 반사식 TLR', D3), ('4', '하프 프레임', D4)]
out = '\n\n'.join(f'<!-- ===== 시안 {k} · {n} ===== -->\n{h}' for k, n, h in DRAFTS)
open(os.path.join(HERE, 'yjhm-main-drafts7.html'), 'w', encoding='utf-8').write(out + '\n')
print('wrote', len(DRAFTS), 'drafts')
