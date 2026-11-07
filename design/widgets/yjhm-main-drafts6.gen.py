# YJHM 케이브덕 위젯 — 첫 화면 시안 6차: 필름 카메라(필카) 몸체 — 작은 뷰파인더 창 안에 글자가 피사체로
# python3 design/widgets/yjhm-main-drafts6.gen.py → yjhm-main-drafts6.html (시안마다 <!-- ===== 시안 N · 이름 ===== -->)
# 자리표시: {{3}} 날짜 · {{4}} 시간 · {{1}} 장소 · {{2}} 상황 · {{11}} 레인 번호. 버튼 글자 「기사 전문 보기♡」
# 픽셀 정렬은 고른 시안에만 마저 맞춘다 (사용자 요청)
import os
HERE = os.path.dirname(os.path.abspath(__file__))

F = "font-family:'Pretendard Variable','Pretendard','Noto Sans KR',-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Segoe UI',sans-serif;"
FT = "font-family:'Inter','Pretendard Variable','Pretendard',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"
NUM = "font-variant-numeric:tabular-nums;"
INK, NV2, AC, SUB, FAINT, LN, BG = '#1d2a3d', '#2c3e57', '#607ca0', '#4a5a70', '#6c7a8c', '#9fb0c6', '#eef0f3'
BTN = '기사 전문 보기♡'
SILVER = "background:linear-gradient(180deg,#f4f6f9 0%,#cfd6df 45%,#e6eaf0 55%,#b9c2ce 100%);"
LEATHER = f"background-color:{INK};background-image:radial-gradient(rgba(255,255,255,.07) 1px,transparent 1.4px),radial-gradient(rgba(0,0,0,.25) 1px,transparent 1.4px);background-size:4px 4px,5px 5px;background-position:0 0,2px 1px;"
GREEN = '#9be37c'

def cap(text, size=9, ls=.16, color=AC, w=600, extra=''):
    return f'<span style="{F}{NUM}font-size:{size}px;font-weight:{w};letter-spacing:{ls}em;color:{color};line-height:{round(size) + 1}px;white-space:nowrap;{extra}">{text}</span>'

def wrap(body, bg=BG):
    return f'''<div style="width:100%;max-width:520px;margin:16px auto;color:{INK};word-break:keep-all;line-height:1.5;{F}">
  <div style="position:relative;overflow:hidden;background:{bg};border-radius:10px;box-shadow:0 0 0 1px rgba(44,62,87,.1),0 18px 40px rgba(44,62,87,.14);">
{body}
  </div>
</div>'''

def finder(w, h, radius=6, title=True):
    """작은 뷰파인더 창 — 밝은 프레임 선 · 초점 원 · 글자 피사체 · 아래 녹색 표시줄"""
    return f'''<div style="position:relative;width:{w}px;height:{h}px;border-radius:{radius}px;background:#0a0f17;box-shadow:inset 0 0 0 3px #263347,inset 0 0 14px rgba(0,0,0,.8);overflow:hidden;">
          <div style="position:absolute;inset:5px 5px 20px;border-radius:{max(radius-3,2)}px;background:radial-gradient(70% 70% at 50% 45%,#ebe6d7,#a3afbf 65%,#5a6880);"></div>
          <div style="position:absolute;inset:5px 5px 20px;border-radius:{max(radius-3,2)}px;background-image:radial-gradient(rgba(29,42,61,.35) 30%,transparent 36%);background-size:3px 3px;opacity:.3;"></div>
          <div style="position:absolute;left:14px;right:14px;top:12px;bottom:28px;border:1px solid rgba(255,255,255,.95);"></div>
          <span style="position:absolute;left:50%;top:12px;width:1px;height:6px;margin-left:-.5px;background:rgba(255,255,255,.95);"></span>
          <div style="position:absolute;left:18px;right:18px;top:12px;bottom:28px;display:flex;flex-direction:column;justify-content:center;text-align:center;">
            <div style="{F}font-size:13px;font-weight:900;letter-spacing:-.02em;line-height:17px;color:{INK};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{{{1}}}}</div>
            <div style="{F}font-size:10px;font-weight:600;line-height:14px;color:{SUB};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{{{2}}}}</div>
          </div>
          <div style="position:absolute;left:0;right:0;bottom:0;height:20px;display:flex;justify-content:space-around;align-items:center;">
            {cap('125', 9, .04, GREEN, 700)}{cap('F2.8', 9, .04, GREEN, 700)}<span style="display:flex;gap:2px;">{''.join(f'<span style="width:4px;height:4px;border-radius:50%;background:{GREEN if i == 2 else "rgba(155,227,124,.3)"};"></span>' for i in range(5))}</span>
          </div>
        </div>'''

def counter(n='24'):
    return f'''<span style="position:relative;display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:50%;background:#0d141e;box-shadow:inset 0 0 0 3px #3a4a60,0 1px 0 rgba(255,255,255,.6);">
          <span style="{FT}{NUM}font-size:13px;font-weight:800;line-height:14px;color:#f2b33d;">{n}</span>
          <span style="position:absolute;left:50%;top:3px;width:2px;height:5px;margin-left:-1px;background:#e0563b;"></span></span>'''

def dial(labels=('500', '250', '125', '60')):
    return f'''<span style="position:relative;display:block;width:54px;height:54px;border-radius:50%;{SILVER}box-shadow:0 2px 4px rgba(29,42,61,.35),inset 0 0 0 1px rgba(29,42,61,.25);">
          <span style="position:absolute;inset:4px;border-radius:50%;background:repeating-conic-gradient(rgba(29,42,61,.35) 0 2deg,transparent 2deg 10deg);"></span>
          <span style="position:absolute;inset:12px;border-radius:50%;background:linear-gradient(180deg,#e8ecf1,#b3bdca);box-shadow:inset 0 0 0 1px rgba(29,42,61,.25);display:flex;align-items:center;justify-content:center;{FT}{NUM}font-size:10px;font-weight:800;line-height:10px;color:{INK};">{labels[1]}</span>
        </span>'''

def shutter_btn(dark=True, pill_bg=None):
    bg = pill_bg or f'linear-gradient(180deg,#3a4b63,{INK})'
    return f'''<div style="display:flex;align-items:center;gap:12px;">
      <span style="flex-shrink:0;position:relative;display:block;width:44px;height:44px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#e3e8ee,#8e9bad 55%,#5a6779);box-shadow:0 3px 6px rgba(29,42,61,.35),inset 0 0 0 2px rgba(255,255,255,.4);">
        <span style="position:absolute;inset:12px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#f4f6f9,#aab4c3);box-shadow:inset 0 1px 2px rgba(0,0,0,.35);"></span></span>
      <div style="flex:1;display:flex;align-items:center;justify-content:center;height:42px;border-radius:21px;background:{bg};box-shadow:inset 0 1px 0 rgba(255,255,255,.15),0 6px 12px -6px rgba(29,42,61,.6);{F}font-size:13.5px;font-weight:800;line-height:16px;color:#fff;">{BTN}</div>
    </div>'''

# ───────── 시안 1 · 레인지파인더 윗판 — 은색 윗판 + 가죽 몸체, 왼쪽 위 작은 파인더 창 ─────────
D1 = wrap(f'''
    <div style="padding:22px 18px 18px;">
      <div style="position:relative;border-radius:14px 14px 10px 10px;overflow:hidden;box-shadow:0 14px 28px -12px rgba(29,42,61,.55),0 0 0 1px rgba(29,42,61,.25);">
        <div style="position:relative;height:120px;{SILVER}">
          <div style="position:absolute;left:16px;top:14px;">{finder(176, 92)}</div>
          <div style="position:absolute;left:206px;top:22px;">{counter('{{11}}')}</div>
          <div style="position:absolute;right:20px;top:16px;">{dial()}</div>
          <div style="position:absolute;left:206px;right:84px;bottom:12px;">
            <div style="{FT}font-size:15px;font-weight:900;letter-spacing:.06em;line-height:16px;color:{INK};">TEN RING</div>
            <div style="margin-top:3px;line-height:9px;">{cap('M-YJ · 35mm', 8, .2, FAINT, 700)}</div>
          </div>
        </div>
        <div style="position:relative;height:56px;{LEATHER}display:flex;align-items:center;justify-content:space-between;padding:0 18px;">
          {cap('HONG YEJUN · FAN ACCOUNT ♡', 9, .2, LN, 700)}
          {cap('{{3}} {{4}}', 9.5, .08, '#f2b33d', 700)}
        </div>
      </div>
      <div style="margin-top:16px;">{shutter_btn()}</div>
    </div>''')

# ───────── 시안 2 · 똑딱이 자동 필카 — 둥근 남색 몸체 · 렌즈 · 플래시 · LCD ─────────
lens = f'''<span style="position:relative;display:block;width:96px;height:96px;border-radius:50%;background:radial-gradient(circle,#0b111a 0 30%,#1f2c40 31% 44%,#0b111a 45% 52%,#3a4a60 53% 60%,#151f2e 61%);box-shadow:0 0 0 4px #c7cfd9,0 0 0 5px rgba(29,42,61,.4),0 6px 12px rgba(0,0,0,.3);">
        <span style="position:absolute;left:32%;top:28%;width:14px;height:8px;border-radius:50%;background:rgba(255,255,255,.35);transform:rotate(-30deg);"></span>
        <span style="position:absolute;left:0;right:0;bottom:12px;text-align:center;{F}font-size:6.5px;font-weight:700;letter-spacing:.14em;line-height:8px;color:rgba(255,255,255,.55);">35mm 1:2.8</span></span>'''
D2 = wrap(f'''
    <div style="padding:22px 18px 18px;">
      <div style="position:relative;height:200px;border-radius:26px;background:linear-gradient(170deg,#3b4f6b,{INK} 70%);box-shadow:0 16px 30px -12px rgba(29,42,61,.6),inset 0 1px 0 rgba(255,255,255,.18),inset 0 -3px 0 rgba(0,0,0,.25);overflow:hidden;">
        <div style="position:absolute;left:0;right:0;top:0;height:30px;background:linear-gradient(180deg,rgba(255,255,255,.12),transparent);"></div>
        <div style="position:absolute;left:18px;top:18px;">{finder(150, 82, 10)}</div>
        <div style="position:absolute;left:180px;top:22px;width:54px;height:30px;border-radius:5px;background:repeating-linear-gradient(90deg,rgba(255,255,255,.55) 0 2px,rgba(255,255,255,.25) 2px 4px);box-shadow:inset 0 0 0 2px rgba(0,0,0,.35);"></div>
        <div style="position:absolute;left:180px;top:60px;">{cap('AF · FLASH', 8, .18, 'rgba(255,255,255,.55)', 700)}</div>
        <div style="position:absolute;right:20px;top:16px;">{lens}</div>
        <div style="position:absolute;left:18px;top:116px;{FT}font-size:22px;font-weight:900;letter-spacing:-.03em;line-height:24px;color:#fff;">mju-YJ<span style="color:{LN};">.</span> <span style="font-size:11px;font-weight:700;letter-spacing:.18em;color:{LN};">ZOOM 10.9</span></div>
        <div style="position:absolute;left:18px;right:18px;bottom:16px;display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;align-items:center;gap:8px;height:26px;padding:0 10px;border-radius:4px;background:#b9c7a6;box-shadow:inset 0 1px 3px rgba(0,0,0,.4);">
            <span style="{F}{NUM}font-size:13px;font-weight:700;letter-spacing:.12em;line-height:14px;color:#2b3424;">{{{{3}}}}</span>
          </div>
          {cap('LANE {{11}}', 9.5, .18, LN, 700, 'margin-right:-.18em;')}
        </div>
      </div>
      <div style="margin-top:16px;">{shutter_btn()}</div>
    </div>''')

# ───────── 시안 3 · 카메라 뒷면 · 데이트백 — 접안부 · 필름 확인창 · 날짜 각인 LCD ─────────
D3 = wrap(f'''
    <div style="padding:22px 18px 18px;">
      <div style="position:relative;border-radius:12px;overflow:hidden;box-shadow:0 14px 28px -12px rgba(29,42,61,.55),0 0 0 1px rgba(29,42,61,.25);">
        <div style="position:relative;height:46px;{SILVER}display:flex;align-items:center;justify-content:space-between;padding:0 16px;">
          <span style="display:flex;align-items:center;gap:8px;"><span style="display:block;width:26px;height:18px;border-radius:3px;background:#0a0f17;box-shadow:inset 0 0 0 3px #3a4a60;"></span>{cap('TEN RING', 11, .14, INK, 900)}</span>
          <span style="display:flex;align-items:center;gap:10px;">{counter('{{11}}')}<span style="display:block;width:44px;height:12px;border-radius:6px;{SILVER}box-shadow:0 1px 2px rgba(29,42,61,.4),inset 0 0 0 1px rgba(29,42,61,.25);"></span></span>
        </div>
        <div style="position:relative;{LEATHER}padding:16px;">
          <div style="display:flex;gap:14px;align-items:stretch;">
            <div style="flex-shrink:0;">{finder(150, 96, 8)}</div>
            <div style="min-width:0;flex:1;display:flex;flex-direction:column;gap:10px;">
              <div style="position:relative;flex:1;border-radius:4px;background:#0a0f17;box-shadow:inset 0 0 0 2px #3a4a60;overflow:hidden;">
                <div style="position:absolute;left:8px;right:8px;top:8px;bottom:8px;border-radius:2px;background:linear-gradient(90deg,{NV2} 0 64%,#e6ebf2 64%);">
                  <div style="position:absolute;left:8px;top:6px;{FT}font-size:12px;font-weight:900;letter-spacing:.04em;line-height:13px;color:#fff;">TEN RING<br><span style="font-size:18px;line-height:20px;color:#f2b33d;">400</span></div>
                  <div style="position:absolute;right:6px;top:8px;{F}font-size:8px;font-weight:800;letter-spacing:.1em;line-height:10px;color:{NV2};text-align:center;">36<br>EXP</div>
                </div>
              </div>
              <div style="display:flex;align-items:center;justify-content:center;height:30px;border-radius:4px;background:#1a2027;box-shadow:inset 0 0 0 2px #3a4a60;">
                <span style="{F}{NUM}font-size:13px;font-weight:700;letter-spacing:.14em;line-height:14px;color:#ff9a4d;text-shadow:0 0 6px rgba(255,154,77,.6);">{{{{3}}}}</span>
              </div>
            </div>
          </div>
          <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;">
            {cap('DATE BACK · {{4}}', 9, .16, LN, 700)}{cap('HONG YEJUN ♡', 9, .16, LN, 700, 'margin-right:-.16em;')}
          </div>
        </div>
      </div>
      <div style="margin-top:16px;">{shutter_btn()}</div>
    </div>''')

# ───────── 시안 4 · 일회용 카메라 — 종이 포장 인쇄 · 작은 파인더 · 감기 바퀴 ─────────
wheel = f'''<span style="display:block;width:22px;height:64px;border-radius:5px;background:repeating-linear-gradient(180deg,#2a3546 0 3px,#4a5a70 3px 5px);box-shadow:inset 0 0 0 1px rgba(0,0,0,.4),2px 0 4px rgba(0,0,0,.25);"></span>'''
D4 = wrap(f'''
    <div style="padding:22px 18px 18px;">
      <div style="position:relative;height:196px;border-radius:12px;overflow:hidden;background:#f3f1ea;box-shadow:0 14px 28px -12px rgba(29,42,61,.5),0 0 0 1px rgba(29,42,61,.18);">
        <div style="position:absolute;left:0;right:0;top:0;height:58px;background:{NV2};"></div>
        <div style="position:absolute;left:0;right:0;top:58px;height:8px;background:repeating-linear-gradient(90deg,#f2b33d 0 18px,{AC} 18px 36px);"></div>
        <div style="position:absolute;left:14px;top:12px;">{finder(140, 84, 6)}</div>
        <div style="position:absolute;left:168px;top:12px;width:68px;height:38px;border-radius:4px;background:repeating-linear-gradient(90deg,rgba(255,255,255,.65) 0 2px,rgba(255,255,255,.3) 2px 4px);box-shadow:inset 0 0 0 2px rgba(0,0,0,.3);"></div>
        <div style="position:absolute;right:16px;top:12px;display:flex;align-items:center;gap:8px;">{wheel}<span style="display:flex;align-items:center;justify-content:center;width:30px;height:24px;border-radius:4px;background:#0d141e;box-shadow:inset 0 0 0 2px #3a4a60;{FT}{NUM}font-size:12px;font-weight:800;line-height:13px;color:#f2b33d;">27</span></div>
        <div style="position:absolute;left:168px;right:16px;top:84px;">
          <div style="{FT}font-size:26px;font-weight:900;letter-spacing:-.04em;line-height:26px;color:{INK};">TEN RING<span style="color:{AC};">.</span></div>
          <div style="margin-top:4px;{F}font-size:10px;font-weight:800;letter-spacing:.14em;line-height:12px;color:{AC};">400 · 27 EXP · FLASH</div>
        </div>
        <div style="position:absolute;left:14px;right:16px;bottom:14px;display:flex;justify-content:space-between;align-items:flex-end;">
          <div>
            <div style="line-height:10px;">{cap('일회용 응원 카메라 ♡', 9, .08, SUB, 700)}</div>
            <div style="margin-top:3px;line-height:10px;">{cap('{{3}} {{4}} · LANE {{11}}', 9, .06, FAINT, 600)}</div>
          </div>
          <span style="{F}font-size:9px;font-weight:800;letter-spacing:.1em;line-height:10px;color:#e0563b;">찰칵 ▶</span>
        </div>
      </div>
      <div style="margin-top:16px;">{shutter_btn(pill_bg=f"linear-gradient(180deg,{AC},{NV2})")}</div>
    </div>''')

DRAFTS = [('1', '레인지파인더 윗판', D1), ('2', '똑딱이 자동 필카', D2), ('3', '카메라 뒷면 · 데이트백', D3), ('4', '일회용 카메라', D4)]
out = '\n\n'.join(f'<!-- ===== 시안 {k} · {n} ===== -->\n{h}' for k, n, h in DRAFTS)
open(os.path.join(HERE, 'yjhm-main-drafts6.html'), 'w', encoding='utf-8').write(out + '\n')
print('wrote', len(DRAFTS), 'drafts')
