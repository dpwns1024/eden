# YJHM 케이브덕 위젯 — 첫 화면 시안 5차: 카메라 프리뷰 화면 (사진 대신 글자가 「피사체」로 초점 상자 안에)
# python3 design/widgets/yjhm-main-drafts5.gen.py → yjhm-main-drafts5.html (시안마다 <!-- ===== 시안 N · 이름 ===== -->)
# 자리표시: {{3}} 날짜 · {{4}} 시간 · {{1}} 장소 · {{2}} 상황 · {{11}} 레인 번호. 버튼(셔터 · 촬영 모드) 글자 「기사 전문 보기♡」
# 픽셀 정렬은 고른 시안에만 마저 맞춘다 (사용자 요청)
import os
HERE = os.path.dirname(os.path.abspath(__file__))

F = "font-family:'Pretendard Variable','Pretendard','Noto Sans KR',-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Segoe UI',sans-serif;"
FT = "font-family:'Inter','Pretendard Variable','Pretendard',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"
NUM = "font-variant-numeric:tabular-nums;"
INK, NV2, AC, SUB, FAINT, LN, BG = '#1d2a3d', '#2c3e57', '#607ca0', '#4a5a70', '#6c7a8c', '#9fb0c6', '#eef0f3'
BTN = '기사 전문 보기♡'

def cap(text, size=9, ls=.16, color='#fff', w=600, extra=''):
    return f'<span style="{F}{NUM}font-size:{size}px;font-weight:{w};letter-spacing:{ls}em;color:{color};line-height:{round(size) + 1}px;white-space:nowrap;{extra}">{text}</span>'

def wrap(body, bg='#0e1622'):
    return f'''<div style="width:100%;max-width:520px;margin:16px auto;color:#fff;word-break:keep-all;line-height:1.5;{F}">
  <div style="position:relative;overflow:hidden;background:{bg};border-radius:14px;box-shadow:0 0 0 1px rgba(44,62,87,.2),0 18px 40px rgba(14,22,34,.3);">
{body}
  </div>
</div>'''

def brackets(inset, color='#fff', size=16, w=2):
    b = f'position:absolute;width:{size}px;height:{size}px;border-color:{color};border-style:solid;'
    return (f'<span style="{b}left:{inset};top:{inset};border-width:{w}px 0 0 {w}px;"></span><span style="{b}right:{inset};top:{inset};border-width:{w}px {w}px 0 0;"></span>'
            f'<span style="{b}left:{inset};bottom:{inset};border-width:0 0 {w}px {w}px;"></span><span style="{b}right:{inset};bottom:{inset};border-width:0 {w}px {w}px 0;"></span>')

GRID = "background-image:linear-gradient(90deg,transparent calc(33.33% - .5px),rgba(255,255,255,.16) calc(33.33% - .5px) calc(33.33% + .5px),transparent calc(33.33% + .5px) calc(66.66% - .5px),rgba(255,255,255,.16) calc(66.66% - .5px) calc(66.66% + .5px),transparent calc(66.66% + .5px)),linear-gradient(180deg,transparent calc(33.33% - .5px),rgba(255,255,255,.16) calc(33.33% - .5px) calc(33.33% + .5px),transparent calc(33.33% + .5px) calc(66.66% - .5px),rgba(255,255,255,.16) calc(66.66% - .5px) calc(66.66% + .5px),transparent calc(66.66% + .5px));"
LIVE = "background:radial-gradient(60% 55% at 50% 48%,#3b5675,#16243a 62%,#0b121c);"
BOKEH = ''.join(f'<span style="position:absolute;left:{x}%;top:{y}%;width:{s}px;height:{s}px;border-radius:50%;background:radial-gradient(circle,rgba(159,176,198,{a}),transparent 70%);"></span>'
                for x, y, s, a in ((8, 14, 60, .35), (74, 8, 90, .25), (82, 62, 54, .3), (14, 70, 40, .22), (56, 76, 70, .18)))

# 과녁 조준선 — 초점 상자 가운데
def reticle(color='#fff', size=150):
    h = size / 2
    return (f'<span style="position:absolute;left:50%;top:50%;width:{size}px;height:{size}px;margin:-{h}px 0 0 -{h}px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(255,255,255,.28);"></span>'
            f'<span style="position:absolute;left:50%;top:50%;width:{size*.62}px;height:{size*.62}px;margin:-{h*.62}px 0 0 -{h*.62}px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(255,255,255,.2);"></span>')

# ───────── 시안 1 · 폰 카메라 앱 — 버튼: 촬영 모드 줄 가운데 + 셔터 ─────────
mode = lambda t, on=False: (f'<span style="flex-shrink:0;display:inline-flex;align-items:center;height:28px;padding:0 14px;border-radius:14px;background:{"rgba(255,255,255,.95)" if on else "transparent"};'
                            f'{F}font-size:{12.5 if on else 11}px;font-weight:{800 if on else 600};letter-spacing:{0 if on else .14}em;line-height:14px;color:{INK if on else "rgba(255,255,255,.55)"};white-space:nowrap;">{t}</span>')
D1 = wrap(f'''
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;">
      <span style="{F}font-size:15px;line-height:16px;color:#fff;">⚡</span>
      <span style="display:inline-flex;align-items:center;gap:6px;height:22px;padding:0 10px;border-radius:11px;background:rgba(255,255,255,.12);">{cap('LANE {{11}}', 9.5, .14)}</span>
      <span style="{F}font-size:13px;font-weight:700;line-height:16px;color:#fff;">⌄</span>
    </div>
    <div style="position:relative;height:330px;margin:0 6px;border-radius:10px;overflow:hidden;{LIVE}">
      {BOKEH}
      <div style="position:absolute;inset:0;{GRID}"></div>
      {reticle()}
      <div style="position:absolute;left:50%;top:50%;width:230px;height:120px;margin:-60px 0 0 -115px;">
        {brackets('0', '#f2d06b', 14, 2)}
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 14px;">
          <div style="{F}font-size:22px;font-weight:900;letter-spacing:-.03em;line-height:28px;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.4);">{{{{1}}}}</div>
          <div style="margin-top:4px;{F}font-size:12.5px;line-height:18px;color:rgba(255,255,255,.82);">{{{{2}}}}</div>
        </div>
        <span style="position:absolute;right:-30px;top:44px;{F}font-size:16px;line-height:16px;color:#f2d06b;">☀</span>
        <span style="position:absolute;right:-24px;top:64px;width:1.5px;height:30px;background:#f2d06b;"></span>
      </div>
      <span style="position:absolute;left:50%;top:14px;transform:translateX(-50%);display:inline-flex;align-items:center;gap:6px;height:22px;padding:0 10px;border-radius:4px;background:rgba(242,208,107,.95);{F}font-size:10px;font-weight:800;letter-spacing:.06em;line-height:12px;color:{INK};white-space:nowrap;">AE/AF 잠금 · 홍예준</span>
      <div style="position:absolute;left:12px;right:12px;bottom:12px;display:flex;justify-content:space-between;align-items:center;">
        {cap('{{3}} {{4}}', 9.5, .08, 'rgba(255,255,255,.8)')}
        <span style="display:flex;gap:6px;">{''.join(f'<span style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:{"rgba(255,255,255,.9)" if on else "rgba(0,0,0,.35)"};{F}font-size:10.5px;font-weight:800;line-height:12px;color:{INK if on else "#fff"};">{t}</span>' for t, on in ((".5", False), ("1×", True), ("3", False)))}</span>
      </div>
    </div>
    <div style="display:flex;justify-content:center;gap:4px;margin-top:14px;padding:0 10px;overflow:hidden;">{mode('SLO-MO')}{mode('VIDEO')}{mode(BTN, True)}{mode('PORTRAIT')}</div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 34px 20px;">
      <span style="width:40px;height:40px;border-radius:8px;background:linear-gradient(150deg,{AC},{INK});box-shadow:0 0 0 2px rgba(255,255,255,.85);display:flex;align-items:center;justify-content:center;{FT}font-size:12px;font-weight:800;line-height:12px;color:#fff;">YJ</span>
      <span style="display:block;width:68px;height:68px;border-radius:50%;background:#fff;box-shadow:inset 0 0 0 4px #0e1622,0 0 0 4px #fff;"></span>
      <span style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.14);{F}font-size:18px;line-height:18px;color:#fff;">⟲</span>
    </div>''')

# ───────── 시안 2 · 캠코더 녹화 화면 — 버튼: 빨간 녹화 단추 + 글자 ─────────
bars = lambda n: ''.join(f'<span style="width:4px;height:9px;border-radius:1px;background:{"#fff" if i < n else "rgba(255,255,255,.3)"};"></span>' for i in range(4))
D2 = wrap(f'''
    <div style="position:relative;height:340px;{LIVE}">
      {BOKEH}
      <div style="position:absolute;inset:0;background:repeating-linear-gradient(180deg,rgba(255,255,255,.03) 0 1px,transparent 1px 3px);"></div>
      <div style="position:absolute;left:14px;right:14px;top:14px;display:flex;justify-content:space-between;align-items:center;">
        <span style="display:flex;align-items:center;gap:7px;"><span style="width:10px;height:10px;border-radius:50%;background:#e0563b;box-shadow:0 0 8px #e0563b;"></span>{cap('REC 00:10:09', 12, .1, '#fff', 700)}</span>
        <span style="display:flex;align-items:center;gap:8px;">{cap('4K 60P', 10, .12, '#fff', 700)}<span style="display:flex;align-items:center;gap:2px;padding:2px;border-radius:2px;box-shadow:inset 0 0 0 1.5px #fff;">{bars(3)}</span></span>
      </div>
      <div style="position:absolute;left:14px;top:40px;line-height:11px;">{cap('STBY ▸ TEN RING CAM', 9.5, .14, 'rgba(255,255,255,.7)')}</div>
      {brackets('60px', 'rgba(255,255,255,.75)', 22, 2)}
      {reticle('#fff', 170)}
      <span style="position:absolute;left:50%;top:50%;width:26px;height:1.5px;margin:-.75px 0 0 -13px;background:#fff;"></span>
      <span style="position:absolute;left:50%;top:50%;width:1.5px;height:26px;margin:-13px 0 0 -.75px;background:#fff;"></span>
      <div style="position:absolute;left:30px;right:30px;bottom:64px;text-align:center;">
        <span style="display:inline-block;padding:4px 10px;background:rgba(0,0,0,.55);{F}font-size:14px;font-weight:700;line-height:22px;color:#fff;">{{{{1}}}} — {{{{2}}}}</span>
      </div>
      <div style="position:absolute;left:14px;right:14px;bottom:14px;display:flex;justify-content:space-between;align-items:flex-end;">
        <div>{cap('ISO 200 · F2.8 · 1/250', 10, .08, 'rgba(255,255,255,.75)')}<div style="margin-top:4px;line-height:11px;">{cap('LANE {{11}} · AF-C', 10, .12, '#fff', 700)}</div></div>
        <div style="text-align:right;{F}{NUM}font-size:15px;font-weight:700;letter-spacing:.06em;line-height:18px;color:#f2b33d;text-shadow:0 0 6px rgba(242,179,61,.5);">{{{{3}}}}<br>{{{{4}}}}</div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:14px;padding:16px 18px 18px;background:#121a26;">
      <span style="flex-shrink:0;display:block;width:52px;height:52px;border-radius:50%;background:#fff;box-shadow:0 0 0 3px #121a26,0 0 0 5px rgba(255,255,255,.6);position:relative;"><span style="position:absolute;inset:9px;border-radius:50%;background:#e0563b;"></span></span>
      <div style="flex:1;min-width:0;">
        <div style="{F}font-size:14px;font-weight:800;line-height:18px;color:#fff;">{BTN}</div>
        <div style="margin-top:3px;line-height:10px;">{cap('TAP TO PLAY FULL CLIP', 8.5, .2, LN)}</div>
      </div>
      <span style="flex-shrink:0;{FT}font-size:18px;font-weight:700;line-height:18px;color:{LN};">›</span>
    </div>''')

# ───────── 시안 3 · 필름 카메라 파인더 — 버튼: 셔터 단추 + 필름 감기 레버 ─────────
D3 = wrap(f'''
    <div style="padding:18px 18px 0;">
      <div style="position:relative;height:300px;border-radius:30px;background:#0b111a;box-shadow:inset 0 0 0 6px #1b2636,inset 0 0 30px rgba(0,0,0,.8);overflow:hidden;">
        <div style="position:absolute;inset:14px;border-radius:20px;background:radial-gradient(70% 65% at 50% 45%,#e9e4d6,#a9b4c2 60%,#53627a);opacity:.95;"></div>
        <div style="position:absolute;inset:14px;border-radius:20px;background-image:radial-gradient(rgba(29,42,61,.35) 30%,transparent 36%);background-size:4px 4px;opacity:.35;"></div>
        <div style="position:absolute;left:44px;right:44px;top:36px;bottom:52px;border:1.5px solid rgba(255,255,255,.95);box-shadow:0 0 0 1px rgba(29,42,61,.25);"></div>
        <div style="position:absolute;left:50%;top:44%;width:64px;height:64px;margin:-32px 0 0 -32px;border-radius:50%;box-shadow:inset 0 0 0 1.5px rgba(29,42,61,.7);overflow:hidden;">
          <span style="position:absolute;left:0;right:0;top:0;height:50%;background:rgba(255,255,255,.18);"></span>
          <span style="position:absolute;left:0;right:0;top:50%;height:1px;background:rgba(29,42,61,.7);"></span>
        </div>
        <div style="position:absolute;left:58px;right:58px;top:52px;text-align:center;">
          <div style="{FT}font-size:11px;font-weight:800;letter-spacing:.24em;line-height:12px;color:{NV2};margin-right:-.24em;">HONG YEJUN · TEN RING</div>
        </div>
        <div style="position:absolute;left:58px;right:58px;top:184px;text-align:center;">
          <div style="{F}font-size:18px;font-weight:900;letter-spacing:-.03em;line-height:24px;color:{INK};">{{{{1}}}}</div>
          <div style="{F}font-size:12px;font-weight:600;line-height:18px;color:{SUB};">{{{{2}}}}</div>
        </div>
        <div style="position:absolute;left:14px;right:14px;bottom:14px;height:30px;display:flex;justify-content:space-between;align-items:center;padding:0 22px;background:rgba(11,17,26,.9);border-radius:0 0 20px 20px;">
          {cap('1/250', 11, .06, '#9be37c', 700)}{cap('F2.8', 11, .06, '#9be37c', 700)}
          <span style="display:flex;gap:3px;">{''.join(f'<span style="width:5px;height:5px;border-radius:50%;background:{"#9be37c" if i == 2 else "rgba(155,227,124,.3)"};"></span>' for i in range(5))}</span>
          {cap('24/36', 11, .06, '#9be37c', 700)}
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;color:{INK};">
        {cap('{{3}} · {{4}}', 9.5, .1, AC)}{cap('LANE {{11}} · ISO 200', 9.5, .14, LN, 600, 'margin-right:-.14em;')}
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:14px;padding:16px 18px 20px;">
      <span style="flex-shrink:0;position:relative;display:block;width:50px;height:50px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#d8dee7,#8e9bad 55%,#5a6779);box-shadow:0 4px 8px rgba(29,42,61,.35),inset 0 0 0 2px rgba(255,255,255,.4);">
        <span style="position:absolute;inset:14px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#eef1f5,#aab4c3);box-shadow:inset 0 1px 2px rgba(0,0,0,.35);"></span></span>
      <div style="flex:1;display:flex;align-items:center;justify-content:space-between;height:46px;padding:0 6px 0 18px;border-radius:23px;background:linear-gradient(180deg,#3a4b63,{INK});box-shadow:inset 0 1px 0 rgba(255,255,255,.15),0 6px 12px -6px rgba(29,42,61,.6);">
        <span style="{F}font-size:13.5px;font-weight:800;line-height:16px;color:#fff;">{BTN}</span>
        <span style="display:flex;align-items:center;gap:2px;height:34px;padding:0 10px;border-radius:17px;background:rgba(255,255,255,.12);">{''.join(f'<span style="width:2px;height:{h}px;background:rgba(255,255,255,.7);border-radius:1px;"></span>' for h in (10, 14, 18, 14, 10))}</span>
      </div>
    </div>''', bg=BG)

DRAFTS = [('1', '폰 카메라 앱', D1), ('2', '캠코더 녹화 화면', D2), ('3', '필름 카메라 파인더', D3)]
out = '\n\n'.join(f'<!-- ===== 시안 {k} · {n} ===== -->\n{h}' for k, n, h in DRAFTS)
open(os.path.join(HERE, 'yjhm-main-drafts5.html'), 'w', encoding='utf-8').write(out + '\n')
print('wrote', len(DRAFTS), 'drafts')
