# YJHM 케이브덕 위젯 — 첫 화면(접힌 상태) 팬페이지 시안 모음
# python3 design/widgets/yjhm-main-drafts.gen.py → yjhm-main-drafts.html (시안마다 <!-- 시안 X --> 로 나뉨)
# 자리표시: {{3}} 날짜 · {{4}} 시간 · {{1}} 장소 · {{2}} 상황 · {{11}} 레인 번호. 장전(LOAD) 버튼은 모든 시안에 있다.
# 글자 정렬 보정값(너비 · 위아래)은 yjhm-main-drafts.adj.json — 100% 배율에서 글자 잉크를 픽셀 단위로 재서 맞춘 값
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
AP = os.path.join(HERE, 'yjhm-main-drafts.adj.json')
ADJ = json.load(open(AP)) if os.path.exists(AP) else {}

F = "font-family:'Pretendard Variable','Pretendard','Noto Sans KR',-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Segoe UI',sans-serif;"
FT = "font-family:'Inter','Pretendard Variable','Pretendard',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"
NUM = "font-variant-numeric:tabular-nums;"
INK, NV2, AC, SUB, FAINT, LN, BG = '#1d2a3d', '#2c3e57', '#607ca0', '#4a5a70', '#6c7a8c', '#9fb0c6', '#eef0f3'
DOTS = f"background-image:radial-gradient(rgba(96,124,160,.55) 30%,transparent 36%);background-size:4px 4px;"

def A(key, k, d=0):
    return ADJ.get(key, {}).get(k, d)

def cap(text, size=9, ls=.14, color=AC, w=600, extra=''):
    return f'<span style="{F}{NUM}font-size:{size}px;font-weight:{w};letter-spacing:{ls}em;color:{color};line-height:{round(size) + 1}px;white-space:nowrap;{extra}">{text}</span>'

def tape(text, key, h=20, size=9, ls=.14, pad=8, bg=NV2, fg='#f2f4f7', radius=2, extra='', shadow=True, w=600):
    """글자 상자 — 너비(w) · 위아래(t) · 높이(h)는 측정해서 adj에 넣은 값으로 맞춘다"""
    W, T, H = A(key, 'w'), A(key, 't'), h + A(key, 'h')
    sh = 'box-shadow:0 1px 3px rgba(20,30,48,.25),inset 0 1px 0 rgba(255,255,255,.12);' if shadow else ''
    box = (f'width:{W}px;padding:{max(T,0)}px 0 {max(-T,0)}px {ls}em;' if W else
           f'padding:{max(T,0)}px calc({pad}px - {ls}em) {max(-T,0)}px {pad}px;')
    return (f'<span data-c="{key}" style="flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;height:{H}px;{box}'
            f'border-radius:{radius}px;background:{bg};color:{fg};{F}font-size:{size}px;font-weight:{w};letter-spacing:{ls}em;line-height:{round(size)+1}px;white-space:nowrap;{sh}{extra}">{text}</span>')

def wrap(body, bg=BG, extra=''):
    return f'''<div style="width:100%;max-width:520px;margin:16px auto;color:{INK};word-break:keep-all;line-height:1.5;{F}">
  <div style="position:relative;overflow:hidden;background:{bg};border-radius:6px;box-shadow:0 0 0 1px rgba(44,62,87,.1),0 18px 40px rgba(44,62,87,.14);{extra}">
{body}
  </div>
</div>'''

def sticker(txt, size, rot, extra='', key='st', fs=None, lh=None):
    """둥근 스티커 딱지 — 글자 위아래(t) · 좌우(l)는 측정값으로"""
    size += A(key, 's'); fs = fs or round(size / 5.2); lh = lh or fs + 1; t, l = A(key, 't'), A(key, 'l')
    return (f'<span data-c="{key}" style="position:absolute;{extra}display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:{size}px;height:{size}px;'
            f'padding:{max(t,0)}px {max(-l,0)}px {max(-t,0)}px {max(l,0)}px;border-radius:50%;background:#fff;box-shadow:0 0 0 2px {INK},3px 3px 0 2px {INK};transform:rotate({rot}deg);'
            f'{FT}font-size:{fs}px;font-weight:900;letter-spacing:-.02em;line-height:{lh}px;color:{AC};text-align:center;">{txt}</span>')

# ───────── 시안 1 · 슬로건 배너 ─────────
A_ = wrap(f'''
    <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px 0;">
      {tape('HONG YEJUN FANSITE', 'a-site')}
      {cap('LANE NO.{{11}}', 9, .2, AC, 700, 'margin-right:-.2em;')}
    </div>
    <div style="position:relative;margin:18px -14px 0;padding:18px 34px 20px;transform:rotate(-2deg);background-color:{INK};{DOTS}background-image:radial-gradient(rgba(242,244,247,.10) 30%,transparent 36%);box-shadow:0 14px 26px rgba(29,42,61,.3);">
      <div style="{FT}font-size:46px;font-weight:900;letter-spacing:-.04em;line-height:44px;color:transparent;-webkit-text-stroke:1.5px #f2f4f7;white-space:nowrap;">HONG YEJUN</div>
      <div style="margin-top:6px;{FT}font-size:22px;font-weight:900;letter-spacing:-.02em;line-height:24px;color:#f2f4f7;white-space:nowrap;">10.9 <span style="color:{LN};">FOREVER</span> <span style="color:#fff;">♥</span></div>
      {sticker('TEN<br>RING', 62, 12, 'right:26px;bottom:-30px;', 'a-st', 12, 13)}
    </div>
    <div style="padding:26px 20px 20px;">
      <div style="display:flex;align-items:baseline;gap:10px;">
        <span style="{F}font-size:22px;font-weight:800;letter-spacing:-.03em;line-height:26px;color:{INK};">격발 기록지<span style="color:{AC};">.</span></span>
        {cap('{{3}} {{4}}', 10, .04, AC, 600)}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;">
        <span style="display:inline-flex;align-items:center;min-height:26px;padding:3px 11px;box-sizing:border-box;border-radius:13px;background:#fff;box-shadow:0 0 0 1px rgba(44,62,87,.14);{F}font-size:11.5px;font-weight:700;line-height:18px;color:{INK};"><span style="color:{AC};margin-right:2px;">#</span>{{{{1}}}}</span>
        <span style="display:inline-flex;align-items:center;min-height:26px;padding:3px 11px;box-sizing:border-box;border-radius:13px;background:#fff;box-shadow:0 0 0 1px rgba(44,62,87,.14);{F}font-size:11.5px;font-weight:500;line-height:18px;color:{SUB};"><span style="color:{AC};margin-right:2px;">#</span>{{{{2}}}}</span>
      </div>
      <div style="display:flex;margin-top:16px;">{tape('LOAD ♥ 응원 기록 펼치기', 'a-load', h=36, size=10.5, ls=.12, extra='flex:1;border-radius:18px;')}</div>
    </div>''')

# ───────── 공통 — 귀여운 말투 조각 ─────────
def pill(ph, key, strong=False):
    t = A(key, 't')
    return (f'<span data-c="{key}" style="display:inline-flex;align-items:center;box-sizing:border-box;min-height:{26 + ADJ.get('_pill_h', 0)}px;padding:{3+t}px 11px {3-t}px;border-radius:14px;background:#fff;'
            f'box-shadow:0 0 0 1px rgba(44,62,87,.14);{F}font-size:11.5px;font-weight:{700 if strong else 500};line-height:18px;color:{INK if strong else SUB};"><span style="color:{AC};margin-right:2px;">#</span>{ph}</span>')

def tail(pre, title='격발 기록지', load='LOAD ♥ 응원 기록 펼치기'):
    return f'''<div style="padding:0 20px 20px;">
      <div style="display:flex;align-items:baseline;gap:10px;">
        <span style="{F}font-size:22px;font-weight:800;letter-spacing:-.03em;line-height:26px;color:{INK};">{title}<span style="color:{AC};">.</span></span>
        {cap('{{3}} {{4}}', 10, .04, AC, 600)}
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-start;gap:6px;margin-top:12px;">{pill('{{1}}', pre + '-p1-pill', True)}{pill('{{2}}', pre + '-p2-pill')}</div>
      <div style="display:flex;margin-top:16px;">{tape(load, pre + '-load', h=36, size=10.5, ls=.12, extra='flex:1;border-radius:18px;')}</div>
    </div>'''

def heart(size, rot, pos, color=AC):
    return f'<span style="position:absolute;{pos}{FT}font-size:{size}px;font-weight:900;line-height:{size}px;color:{color};-webkit-text-stroke:1.5px {INK};text-shadow:2px 2px 0 {INK};transform:rotate({rot}deg);">♥</span>'

def spark(size, pos, color=INK):
    return f'<span style="position:absolute;{pos}{FT}font-size:{size}px;line-height:{size}px;color:{color};">✦</span>'

BURST = 'polygon(50% 0,61% 18%,80% 8%,78% 30%,100% 32%,86% 50%,100% 68%,78% 70%,80% 92%,61% 82%,50% 100%,39% 82%,20% 92%,22% 70%,0 68%,14% 50%,0 32%,22% 30%,20% 8%,39% 18%)'
def burst(text, size, rot, pos, key):
    t = A(key, 't'); l = A(key, 'l'); size += A(key, 's')
    return (f'<span style="position:absolute;{pos}filter:drop-shadow(2px 2px 0 {INK});transform:rotate({rot}deg);">'
            f'<span data-c="{key}" style="display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:{size}px;height:{size}px;padding:{max(t,0)}px {max(-l,0)}px {max(-t,0)}px {max(l,0)}px;background:#fff;clip-path:{BURST};-webkit-clip-path:{BURST};'
            f'{FT}font-size:{round(size/5)}px;font-weight:900;letter-spacing:-.02em;line-height:{round(size/5)+1}px;color:{AC};">{text}</span></span>')

def sq(text, key, rot, pos, bg=NV2, fg='#fff', size=11):
    return f'<span style="position:absolute;{pos}transform:rotate({rot}deg);">{tape(text, key, h=26, size=size, ls=.08, pad=10, bg=bg, fg=fg, radius=7, shadow=False, w=800, extra="box-shadow:0 0 0 2px " + INK + ",3px 3px 0 2px " + INK + ";")}</span>'

# ───────── 시안 2 · 스티커 판 ─────────
B_ = wrap(f'''
    <div style="position:relative;height:200px;background-image:radial-gradient(rgba(96,124,160,.18) 1px,transparent 1.5px);background-size:12px 12px;">
      <div style="position:absolute;left:0;right:0;top:66px;text-align:center;">
        <div style="{FT}font-size:44px;font-weight:900;letter-spacing:-.04em;line-height:44px;color:transparent;-webkit-text-stroke:1.6px {INK};text-shadow:3px 3px 0 rgba(96,124,160,.35);">YEJUN</div>
        <div style="margin-top:6px;line-height:10px;">{cap('MY TEN RING ♥ MY MARKSMAN', 9, .16, AC, 700)}</div>
      </div>
      {sticker('10.9', 58, -12, 'left:22px;top:22px;', 'b2-st', 13, 14)}
      {burst('BANG!', 70, 10, 'right:20px;top:14px;', 'b2-bang')}
      {sq('YJ × HM', 'b2-sq', -6, 'left:26px;bottom:20px;')}
      {sq('LANE {{11}}', 'b2-lane', 5, 'right:28px;bottom:26px;', '#fff', NV2)}
      {heart(30, -14, 'left:44%;top:14px;')}
      {heart(20, 16, 'right:36%;bottom:16px;', '#fff')}
      {spark(14, 'left:30%;top:52px;', AC)}{spark(10, 'right:24%;top:96px;')}{spark(12, 'left:18%;top:118px;', AC)}
    </div>
    {tail('b2')}''')

# ───────── 시안 3 · 응원 플래카드 ─────────
C_ = wrap(f'''
    <div style="position:relative;padding:22px 20px 26px;">
      <div style="position:relative;padding:22px 18px 20px;border-radius:20px;transform:rotate(-1.5deg);background-color:{INK};background-image:radial-gradient(rgba(242,244,247,.1) 30%,transparent 36%);background-size:4px 4px;box-shadow:0 12px 24px rgba(29,42,61,.28);">
        <div style="position:absolute;inset:7px;border-radius:15px;border:1.5px dashed rgba(242,244,247,.45);pointer-events:none;"></div>
        <div style="text-align:center;{F}font-size:36px;font-weight:900;letter-spacing:-.04em;line-height:44px;color:#f2f4f7;text-shadow:3px 3px 0 {AC};">예준아 텐링 가자!</div>
        <div style="margin-top:6px;text-align:center;{F}font-size:13px;font-weight:800;letter-spacing:.02em;line-height:18px;color:#f2f4f7;">오늘도 10.9 <span style="color:{LN};">♥</span> 하민이가 보고 있어</div>
        {heart(28, -16, 'left:-10px;top:-14px;', '#fff')}
        {sticker('HM<br>♥', 50, 12, 'right:-8px;top:-22px;', 'c3-st', 12, 13)}
        {spark(16, 'left:22px;bottom:12px;', '#fff')}{spark(11, 'right:30px;bottom:16px;', LN)}
      </div>
    </div>
    {tail('c3')}''')

# ───────── 시안 4 · 말풍선 대화 ─────────
def av(t, bg, key):
    return tape(t, key, h=30, size=10, ls=.02, pad=0, bg=bg, fg='#fff', radius=16, shadow=False, w=800, extra='width:' + str(30 + A(key, 'h')) + 'px;padding:0;box-shadow:0 0 0 2px #fff,0 0 0 3.5px ' + INK + ';')
D_ = wrap(f'''
    <div style="position:relative;padding:20px 20px 18px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="{FT}font-size:30px;font-weight:900;letter-spacing:-.04em;line-height:30px;color:{INK};">YJ <span style="color:{AC};">♥</span> <span style="color:transparent;-webkit-text-stroke:1.3px {INK};">HM</span></div>
        {tape('LANE {{11}}', 'd4-lane', h=22, size=9, ls=.14, radius=11)}
      </div>
      <div style="display:flex;align-items:flex-end;gap:8px;margin-top:16px;">
        {av('HM', NV2, 'd4-hm')}
        <div style="max-width:76%;padding:9px 13px;border-radius:16px 16px 16px 4px;background:#fff;box-shadow:0 0 0 1px rgba(44,62,87,.12),2px 2px 0 rgba(44,62,87,.12);{F}font-size:12.5px;font-weight:600;line-height:19px;color:{INK};">지금 어디예요? 👀<br><span style="font-weight:700;">{{{{1}}}}</span></div>
      </div>
      <div style="display:flex;justify-content:flex-end;align-items:flex-end;gap:8px;margin-top:8px;">
        {cap('{{3}} {{4}}', 8.5, .04, LN, 600, 'padding-bottom:2px;')}
        <div style="max-width:70%;padding:9px 13px;border-radius:16px 16px 4px 16px;background:{AC};box-shadow:2px 2px 0 rgba(29,42,61,.25);{F}font-size:12.5px;font-weight:600;line-height:19px;color:#fff;">{{{{2}}}} ♥</div>
        {av('YJ', AC, 'd4-yj')}
      </div>
      {spark(12, 'right:120px;top:26px;', AC)}
    </div>
    <div style="padding:0 20px 20px;">
      <div style="display:flex;">{tape('LOAD ♥ 대화 기록 펼치기', 'd4-load', h=36, size=10.5, ls=.12, extra='flex:1;border-radius:18px;')}</div>
    </div>''')

# ───────── 시안 5 · 메달 리본 ─────────
RIB = 'polygon(0 0,100% 0,92% 50%,100% 100%,0 100%,8% 50%)'
E_ = wrap(f'''
    <div style="position:relative;height:198px;">
      <div style="position:absolute;left:-10px;right:-10px;top:96px;height:42px;transform:rotate(-3deg);filter:drop-shadow(0 6px 10px rgba(29,42,61,.25));">
        <div style="height:100%;background:{NV2};clip-path:{RIB};-webkit-clip-path:{RIB};display:flex;align-items:center;justify-content:space-between;padding:0 13%;{FT}font-size:15px;font-weight:900;letter-spacing:.14em;line-height:18px;color:#f2f4f7;"><span>TEN RING <span style="color:{LN};">♥</span></span><span>FOREVER</span></div>
      </div>
      <div style="position:absolute;left:50%;top:14px;margin-left:-58px;width:116px;">
        <span style="position:absolute;left:24px;top:84px;width:26px;height:58px;background:{AC};clip-path:polygon(0 0,100% 0,100% 100%,50% 82%,0 100%);-webkit-clip-path:polygon(0 0,100% 0,100% 100%,50% 82%,0 100%);transform:rotate(14deg);"></span>
        <span style="position:absolute;right:24px;top:84px;width:26px;height:58px;background:{LN};clip-path:polygon(0 0,100% 0,100% 100%,50% 82%,0 100%);-webkit-clip-path:polygon(0 0,100% 0,100% 100%,50% 82%,0 100%);transform:rotate(-14deg);"></span>
        <div style="position:relative;width:116px;height:116px;border-radius:50%;background:repeating-conic-gradient(#fff 0 6deg,#e6ebf2 6deg 12deg);box-shadow:0 0 0 2.5px {INK},4px 4px 0 2.5px {INK};">
          <div style="position:absolute;inset:14px;border-radius:50%;background:{INK};box-shadow:inset 0 0 0 3px {AC};"></div>
          <div data-c="e5-medal" style="position:absolute;inset:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:{max(A('e5-medal','t'),0)}px 0 {max(-A('e5-medal','t'),0)}px;box-sizing:border-box;">
            <span style="{FT}{NUM}font-size:26px;font-weight:900;letter-spacing:-.03em;line-height:26px;color:#fff;">10.9</span>
            <span style="margin-top:3px;{F}font-size:8.5px;font-weight:700;letter-spacing:.16em;line-height:10px;color:{LN};margin-right:-.16em;">GOLD</span>
          </div>
        </div>
      </div>
      {heart(24, -18, 'left:30px;top:22px;')}{heart(18, 14, 'right:36px;top:40px;', '#fff')}
      {spark(14, 'left:70px;top:150px;', AC)}{spark(11, 'right:64px;top:160px;')}
    </div>
    {tail('e5')}''')

# ───────── 시안 6 · 탑로더 포카 ─────────
F_ = wrap(f'''
    <div style="display:flex;gap:22px;align-items:center;padding:24px 20px 18px;">
      <div style="position:relative;flex-shrink:0;width:128px;height:178px;transform:rotate(-4deg);border-radius:10px;padding:8px;box-sizing:border-box;background:linear-gradient(135deg,rgba(255,255,255,.95),rgba(230,236,244,.75));box-shadow:0 0 0 1.5px rgba(44,62,87,.22),0 12px 24px rgba(29,42,61,.2),inset 0 0 0 3px rgba(255,255,255,.8);">
        <div style="position:relative;height:100%;border-radius:5px;overflow:hidden;background:linear-gradient(160deg,#dfe6ef,#9db0c9 60%,{AC});">
          <div style="position:absolute;inset:0;{DOTS}opacity:.5;"></div>
          <div style="position:absolute;left:0;right:0;top:46px;text-align:center;{FT}font-size:40px;font-weight:900;letter-spacing:-.05em;line-height:38px;color:transparent;-webkit-text-stroke:1.4px #fff;">YJ</div>
          <div style="position:absolute;left:0;right:0;top:90px;text-align:center;{F}font-size:10px;font-weight:800;letter-spacing:.06em;line-height:12px;color:#fff;">홍예준 ♥</div>
        </div>
        <div style="position:absolute;inset:0;border-radius:10px;background:linear-gradient(120deg,transparent 35%,rgba(255,255,255,.6) 45%,transparent 55%);pointer-events:none;"></div>
        {heart(26, 12, 'right:-12px;top:-12px;')}
        {sticker('10.9', 40, -12, 'left:-14px;bottom:18px;', 'f6-st', 11, 12)}
        {spark(13, 'right:8px;bottom:-10px;', AC)}
      </div>
      <div style="min-width:0;flex:1;">
        <div style="line-height:10px;">{cap('MY BIAS · 최애 포카', 9, .14, AC, 700)}</div>
        <div style="margin-top:8px;{F}font-size:24px;font-weight:800;letter-spacing:-.04em;line-height:28px;color:{INK};">격발 기록지<span style="color:{AC};">.</span></div>
        <div style="margin-top:6px;line-height:11px;">{cap('{{3}} {{4}} · LANE {{11}}', 9.5, .04, LN, 600)}</div>
        <div style="display:flex;flex-direction:column;align-items:flex-start;gap:6px;margin-top:12px;">{pill('{{1}}', 'f6-p1-pill', True)}{pill('{{2}}', 'f6-p2-pill')}</div>
      </div>
    </div>
    <div style="padding:0 20px 20px;"><div style="display:flex;">{tape('LOAD ♥ 포카 뒷면 보기', 'f6-load', h=36, size=10.5, ls=.12, extra='flex:1;border-radius:18px;')}</div></div>''')

DRAFTS = [('1', '슬로건 배너', A_), ('2', '스티커 판', B_), ('3', '응원 플래카드', C_), ('4', '말풍선 대화', D_), ('5', '메달 리본', E_), ('6', '탑로더 포카', F_)]
out = '\n\n'.join(f'<!-- ===== 시안 {k} · {n} ===== -->\n{h}' for k, n, h in DRAFTS)
open(os.path.join(HERE, 'yjhm-main-drafts.html'), 'w', encoding='utf-8').write(out + '\n')
print('wrote', len(DRAFTS), 'drafts')
