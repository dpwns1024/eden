# YJHM 케이브덕 위젯 — 첫 화면 시안 8차: 밝고 귀여운 필카 뷰파인더 (화면을 볼거리로 채우고 · 버튼은 시안마다 다르게)
# python3 design/widgets/yjhm-main-drafts8.gen.py → yjhm-main-drafts8.html (시안마다 <!-- ===== 시안 N · 이름 ===== -->)
# 자리표시: {{3}} 날짜 · {{4}} 시간 · {{1}} 장소 · {{2}} 상황 · {{11}} 레인 번호. 버튼 글자 「기사 전문 보기♡」
# 픽셀 정렬은 고른 시안에만 마저 맞춘다 (사용자 요청)
import os
HERE = os.path.dirname(os.path.abspath(__file__))

F = "font-family:'Pretendard Variable','Pretendard','Noto Sans KR',-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Segoe UI',sans-serif;"
FT = "font-family:'Inter','Pretendard Variable','Pretendard',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"
NUM = "font-variant-numeric:tabular-nums;"
INK, NV2, AC, SUB, FAINT, LN, BG = '#1d2a3d', '#2c3e57', '#607ca0', '#4a5a70', '#6c7a8c', '#9fb0c6', '#eef0f3'
SKY, PINK, BUTTER, STAMP = '#cfe0f5', '#f6c9d4', '#fbe7a6', '#ff8a3d'
EVE = '#ff5a64'   # 이브(EVEDEN) 테마 붉은색 — archdoc.css --red
BTN = '기사 전문 보기♡'

def cap(text, size=9, ls=.16, color=AC, w=700, extra=''):
    return f'<span style="{F}{NUM}font-size:{size}px;font-weight:{w};letter-spacing:{ls}em;color:{color};line-height:{round(size) + 1}px;white-space:nowrap;{extra}">{text}</span>'

def wrap(body, bg='#f6f7fb'):
    return f'''<div style="width:100%;max-width:520px;margin:16px auto;color:{INK};word-break:keep-all;line-height:1.5;{F}">
  <div style="position:relative;overflow:hidden;background:{bg};border-radius:18px;box-shadow:0 0 0 1px rgba(44,62,87,.08),0 18px 40px rgba(44,62,87,.12);">
{body}
  </div>
</div>'''

# 귀여운 스티커 조각
def sticker(text, pos, rot, bg='#fff', fg=AC, size=11, pad='5px 10px', radius=12, extra=''):
    return (f'<span style="position:absolute;{pos}z-index:3;display:inline-flex;align-items:center;justify-content:center;padding:{pad};border-radius:{radius}px;background:{bg};'
            f'box-shadow:0 0 0 2px {INK},2px 2px 0 2px {INK};transform:rotate({rot}deg);{FT}font-size:{size}px;font-weight:900;letter-spacing:-.01em;line-height:{size+2}px;color:{fg};white-space:nowrap;{extra}">{text}</span>')
heart = lambda pos, size, rot, color=PINK: f'<span style="position:absolute;{pos}z-index:3;{FT}font-size:{size}px;line-height:{size}px;color:{color};-webkit-text-stroke:1.5px {INK};text-shadow:2px 2px 0 {INK};transform:rotate({rot}deg);">♥</span>'
spark = lambda pos, size, color='#fff': f'<span style="position:absolute;{pos}z-index:2;{FT}font-size:{size}px;line-height:{size}px;color:{color};text-shadow:0 0 6px rgba(255,255,255,.9);">✦</span>'
tape_piece = lambda pos, rot, w=56: f'<span style="position:absolute;{pos}z-index:4;width:{w}px;height:18px;background:rgba(207,224,245,.82);box-shadow:0 1px 2px rgba(29,42,61,.15);transform:rotate({rot}deg);"></span>'

def screen(h, radius=14, square=False, red=False):
    """파인더 화면 — 볼거리로 채운다: 과녁 링 · 빛샘 · 반짝이 · 하트 초점 · 프레임 번호 · 날짜 각인
    red — 포인트 색을 #607ca0 · 이브 붉은색(#ff5a64)으로 (시안 4)"""
    leak1 = 'rgba(255,90,100,.42),rgba(255,140,150,.18) 45%' if red else 'rgba(255,150,90,.55),rgba(255,190,140,.25) 45%'
    leak2 = 'rgba(96,124,160,.42)' if red else 'rgba(246,201,212,.75)'
    fb = EVE if red else PINK
    ht = EVE if red else '#e98aa2'
    sp3 = EVE if red else BUTTER
    stp, glow = (EVE, 'rgba(255,90,100,.5)') if red else (STAMP, 'rgba(255,138,61,.55)')
    return f'''<div style="position:relative;height:{h}px;border-radius:{radius}px;overflow:hidden;background:linear-gradient(160deg,#fdfbf5,#e4ecf6 55%,#c9d7ea);box-shadow:inset 0 0 0 1px rgba(29,42,61,.12),inset 0 0 26px rgba(29,42,61,.18);">
          <div style="position:absolute;left:50%;top:50%;width:420px;height:420px;margin:-210px 0 0 -210px;border-radius:50%;background:repeating-radial-gradient(circle,transparent 0 22px,rgba(96,124,160,.16) 22px 23.5px);"></div>
          <div style="position:absolute;right:-40px;top:-50px;width:190px;height:170px;border-radius:50%;background:radial-gradient(circle,{leak1},transparent 70%);"></div>
          <div style="position:absolute;left:-30px;bottom:-40px;width:150px;height:130px;border-radius:50%;background:radial-gradient(circle,{leak2},transparent 70%);"></div>
          <div style="position:absolute;inset:0;background-image:radial-gradient(rgba(29,42,61,.22) 30%,transparent 36%);background-size:3px 3px;opacity:.22;"></div>
          <div style="position:absolute;left:16px;right:16px;top:14px;bottom:14px;border:1.5px solid rgba(255,255,255,.95);border-radius:6px;box-shadow:0 0 0 1px rgba(96,124,160,.18);"></div>
          <span style="position:absolute;left:24px;top:22px;z-index:2;{F}{NUM}font-size:9px;font-weight:800;letter-spacing:.14em;line-height:10px;color:{AC};">▶ {{{{11}}}}A</span>
          <span style="position:absolute;right:24px;top:22px;z-index:2;display:flex;gap:3px;align-items:flex-end;">{''.join(f'<span style="width:3px;height:{x}px;border-radius:1px;background:{AC};"></span>' for x in (4, 7, 10))}</span>
          {spark('left:26%;top:26%;', 12)}{spark('right:18%;top:40%;', 9)}{spark('left:16%;bottom:30%;', 10, sp3)}
          <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2;text-align:center;">
            <div style="position:relative;display:inline-block;padding:10px 18px;">
              <span style="position:absolute;left:0;top:0;width:12px;height:12px;border:2px solid {fb};border-width:2px 0 0 2px;border-radius:4px 0 0 0;"></span>
              <span style="position:absolute;right:0;top:0;width:12px;height:12px;border:2px solid {fb};border-width:2px 2px 0 0;border-radius:0 4px 0 0;"></span>
              <span style="position:absolute;left:0;bottom:0;width:12px;height:12px;border:2px solid {fb};border-width:0 0 2px 2px;border-radius:0 0 0 4px;"></span>
              <span style="position:absolute;right:0;bottom:0;width:12px;height:12px;border:2px solid {fb};border-width:0 2px 2px 0;border-radius:0 0 4px 0;"></span>
              <span style="position:absolute;left:50%;top:-12px;margin-left:-7px;{FT}font-size:14px;line-height:14px;color:{ht};">♥</span>
              <div style="{F}font-size:17px;font-weight:900;letter-spacing:-.03em;line-height:23px;color:{INK};white-space:nowrap;">{{{{1}}}}</div>
              <div style="{F}font-size:11px;font-weight:600;line-height:16px;color:{SUB};white-space:nowrap;">{{{{2}}}}</div>
            </div>
          </div>
          <span style="position:absolute;right:24px;bottom:20px;z-index:2;{F}{NUM}font-size:13px;font-weight:700;letter-spacing:.1em;line-height:14px;color:{stp};text-shadow:0 0 5px {glow};">{{{{3}}}}</span>
          <span style="position:absolute;left:24px;bottom:20px;z-index:2;{F}font-size:9px;font-weight:800;letter-spacing:.14em;line-height:10px;color:{AC};">ISO 400 · ☀</span>
        </div>'''

# ───────── 시안 1 · 화이트 토이 카메라 — 버튼: 손가락으로 누르는 셔터 + 「찰칵!」 말풍선 ─────────
finger_btn = f'''<div style="position:relative;display:flex;align-items:center;gap:14px;padding:4px 4px 4px 8px;">
      <div style="position:relative;flex-shrink:0;width:64px;height:56px;">
        <span style="position:absolute;left:8px;bottom:0;width:48px;height:18px;border-radius:9px 9px 4px 4px;background:{SKY};box-shadow:0 0 0 2px {INK};"></span>
        <span style="position:absolute;left:18px;bottom:14px;width:28px;height:12px;border-radius:8px 8px 2px 2px;background:#fff;box-shadow:0 0 0 2px {INK};"></span>
        <span style="position:absolute;left:23px;top:0;{F}font-size:24px;line-height:26px;transform:rotate(-8deg);">👆</span>
      </div>
      <div style="position:relative;flex:1;display:flex;align-items:center;justify-content:center;height:44px;border-radius:22px;background:#fff;box-shadow:0 0 0 2px {INK},3px 3px 0 2px {INK};{F}font-size:14px;font-weight:900;line-height:16px;color:{NV2};">{BTN}
        <span style="position:absolute;left:-12px;top:50%;margin-top:-6px;width:0;height:0;border-style:solid;border-width:6px 12px 6px 0;border-color:transparent {INK} transparent transparent;"></span>
        <span style="position:absolute;left:-8px;top:50%;margin-top:-4px;width:0;height:0;border-style:solid;border-width:4px 9px 4px 0;border-color:transparent #fff transparent transparent;"></span>
      </div>
      {sticker('찰칵!', 'left:56px;top:-6px;', -10, BUTTER, INK, 11, '4px 9px', 10)}
    </div>'''
D1 = wrap(f'''
    <div style="padding:20px 18px 18px;">
      <div style="position:relative;padding:14px;border-radius:26px;background:#fff;box-shadow:0 0 0 2px {INK},4px 4px 0 2px {INK};">
        <div style="display:flex;justify-content:space-between;align-items:center;margin:0 4px 10px;">
          <span style="display:flex;align-items:center;gap:6px;"><span style="width:12px;height:12px;border-radius:50%;background:{PINK};box-shadow:0 0 0 2px {INK};"></span>{cap('TEN RING TOY CAM', 9.5, .16, INK, 900)}</span>
          {cap('{{4}} · ♡', 9.5, .1, AC, 700)}
        </div>
        {screen(196)}
        {sticker('YEJUN ♡', 'left:-12px;top:150px;', -9, SKY, INK, 11)}
        {heart('right:-8px;top:34px;', 26, 14)}
        {sticker('10.9', 'right:22px;bottom:-12px;', 6, '#fff', AC, 12, '4px 9px', 10)}
      </div>
      <div style="margin-top:22px;">{finger_btn}</div>
    </div>''')

# ───────── 시안 2 · 즉석 카메라 — 버튼: 인화 구멍에서 나오는 폴라로이드 ─────────
polaroid = f'''<div style="position:relative;margin:0 34px;">
      <div style="position:relative;height:12px;border-radius:0 0 8px 8px;background:{INK};box-shadow:inset 0 3px 4px rgba(0,0,0,.5);"></div>
      <div style="position:relative;margin:-6px 14px 0;padding:8px 8px 0;background:#fff;box-shadow:0 0 0 1.5px rgba(29,42,61,.2),0 10px 18px -8px rgba(29,42,61,.4);transform:rotate(-1.5deg);">
        <div style="height:30px;background:linear-gradient(160deg,{SKY},{PINK});"></div>
        <div style="display:flex;align-items:center;justify-content:center;height:40px;{F}font-size:14px;font-weight:900;line-height:16px;color:{NV2};">{BTN}</div>
        {tape_piece('left:-14px;top:-6px;', -32, 46)}
      </div>
    </div>'''
D2 = wrap(f'''
    <div style="padding:20px 18px 22px;">
      <div style="position:relative;padding:16px 16px 18px;border-radius:24px 24px 18px 18px;background:linear-gradient(180deg,#fff,{BG});box-shadow:0 0 0 2px {INK},4px 4px 0 2px {INK};">
        <div style="position:absolute;left:0;right:0;top:0;height:10px;border-radius:24px 24px 0 0;background:repeating-linear-gradient(90deg,{SKY} 0 22px,{PINK} 22px 44px,{BUTTER} 44px 66px,{AC} 66px 88px);"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin:6px 4px 10px;">
          {cap('INSTANT · TEN RING ♡', 9.5, .16, INK, 900)}
          <span style="display:flex;gap:6px;"><span style="width:26px;height:14px;border-radius:4px;background:repeating-linear-gradient(90deg,rgba(29,42,61,.25) 0 2px,transparent 2px 4px);box-shadow:0 0 0 1.5px {INK};"></span><span style="width:14px;height:14px;border-radius:50%;background:radial-gradient(circle,#3a4a60 0 40%,{INK} 41%);box-shadow:0 0 0 1.5px {INK};"></span></span>
        </div>
        {screen(186)}
        {heart('left:-10px;top:52px;', 24, -14, SKY)}
        {sticker('LANE {{11}}', 'right:-12px;top:44px;', 8, BUTTER, INK, 10, '4px 9px', 10)}
      </div>
      <div style="margin-top:-2px;">{polaroid}</div>
    </div>''')

# ───────── 시안 3 · 일회용 카메라 스티커판 — 버튼: 커다란 셔터 스티커 ─────────
burst = 'polygon(50% 0,61% 18%,80% 8%,78% 30%,100% 32%,86% 50%,100% 68%,78% 70%,80% 92%,61% 82%,50% 100%,39% 82%,20% 92%,22% 70%,0 68%,14% 50%,0 32%,22% 30%,20% 8%,39% 18%)'
shutter_sticker = f'''<div style="display:flex;align-items:center;gap:12px;">
      <span style="flex-shrink:0;position:relative;display:block;width:70px;height:70px;filter:drop-shadow(3px 3px 0 {INK});">
        <span style="position:absolute;inset:0;background:{INK};clip-path:{burst};-webkit-clip-path:{burst};"></span>
        <span style="position:absolute;inset:3px;background:{BUTTER};clip-path:{burst};-webkit-clip-path:{burst};display:flex;align-items:center;justify-content:center;{FT}font-size:12px;font-weight:900;line-height:13px;color:{INK};text-align:center;">찰칵!</span>
      </span>
      <div style="flex:1;display:flex;align-items:center;justify-content:center;height:46px;border-radius:12px;background:{AC};box-shadow:0 0 0 2px {INK},3px 3px 0 2px {INK};transform:rotate(-1deg);{F}font-size:14px;font-weight:900;line-height:16px;color:#fff;">{BTN}</div>
    </div>'''
D3 = wrap(f'''
    <div style="padding:22px 18px 18px;">
      <div style="position:relative;padding:14px;border-radius:16px;background:linear-gradient(135deg,rgba(207,224,245,.95),rgba(246,201,212,.75));box-shadow:0 0 0 2px {INK},4px 4px 0 2px {INK},inset 0 0 0 6px rgba(255,255,255,.55);">
        <div style="position:absolute;inset:0;border-radius:16px;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.55) 45%,transparent 55%);pointer-events:none;"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin:0 4px 10px;">
          {cap('일회용 응원 카메라', 10, .02, INK, 900)}
          <span style="display:flex;align-items:center;justify-content:center;height:20px;padding:0 8px;border-radius:6px;background:#fff;box-shadow:0 0 0 1.5px {INK};{FT}{NUM}font-size:11px;font-weight:900;line-height:12px;color:{STAMP};">27 남음</span>
        </div>
        {screen(184, 10)}
        {sticker('HONG YEJUN', 'left:-12px;top:-12px;', -8, '#fff', NV2, 10, '4px 9px', 10)}
        {heart('right:10px;top:-14px;', 26, 12)}
        {sticker('★ 10.9', 'right:-12px;top:84px;', 10, BUTTER, INK, 11, '4px 9px', 10)}
        {sticker('{{4}}', 'left:18px;bottom:-12px;', 4, SKY, INK, 10, '3px 8px', 8)}
      </div>
      <div style="margin-top:22px;">{shutter_sticker}</div>
    </div>''', bg='#fbf7f9')

# ───────── 시안 4 · 셀카 필카 — 버튼: 당기는 필름 감기 레버 ─────────
print_btn = f'''<div style="display:flex;align-items:center;gap:12px;">
      <div style="flex-shrink:0;display:flex;align-items:center;gap:6px;">
        <span style="display:block;width:8px;height:8px;border-radius:50%;background:{EVE};box-shadow:0 0 6px {EVE};"></span>
        {cap('PRINT', 9, .2, AC, 800)}
      </div>
      <div style="position:relative;flex:1;min-width:0;height:42px;">
        <div style="position:absolute;left:0;right:0;top:0;z-index:2;height:10px;border-radius:5px;background:{INK};box-shadow:inset 0 2px 3px rgba(0,0,0,.55);"></div>
        <div style="position:absolute;left:10%;right:10%;top:5px;height:36px;background:#fff;box-shadow:0 0 0 1.5px {INK},2px 2px 0 1.5px {INK};transform:rotate(-1deg);display:flex;align-items:center;justify-content:center;gap:8px;padding-top:5px;box-sizing:border-box;">
          <span style="position:absolute;left:6px;top:8px;bottom:4px;width:4px;background:linear-gradient(180deg,{AC} 50%,{EVE} 50%);"></span>
          <span style="{F}font-size:13px;font-weight:900;line-height:16px;color:{NV2};">{BTN}</span>
        </div>
      </div>
    </div>'''
D4 = wrap(f'''
    <div style="padding:20px 18px 18px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <span style="display:flex;align-items:center;gap:6px;">{cap('SELFIE FILM', 10, .16, INK, 900)}<span style="display:inline-flex;align-items:center;height:18px;padding:0 7px;border-radius:9px;background:{AC};box-shadow:0 0 0 1.5px {INK};{F}font-size:9px;font-weight:900;line-height:10px;color:#fff;">REC ♡</span></span>
        {cap('LANE {{11}} · {{4}}', 9.5, .1, AC, 700)}
      </div>
      <div style="position:relative;padding:10px;border-radius:22px;background:{SKY};box-shadow:0 0 0 2px {INK},4px 4px 0 2px {INK};">
        <div style="position:absolute;left:50%;top:-9px;width:18px;height:18px;margin-left:-9px;border-radius:50%;background:radial-gradient(circle,#3a4a60 0 35%,{INK} 36%);box-shadow:0 0 0 2px #fff,0 0 0 3.5px {INK};z-index:3;"></div>
        {screen(200, 14, red=True)}
        {tape_piece('left:24px;top:-8px;', -12)}
        {tape_piece('right:24px;bottom:-8px;', 10)}
      </div>
      <div style="margin-top:20px;">{print_btn}</div>
    </div>''')

DRAFTS = [('1', '화이트 토이 카메라', D1), ('2', '즉석 카메라', D2), ('3', '일회용 카메라 스티커판', D3), ('4', '셀카 필카', D4)]
out = '\n\n'.join(f'<!-- ===== 시안 {k} · {n} ===== -->\n{h}' for k, n, h in DRAFTS)
open(os.path.join(HERE, 'yjhm-main-drafts8.html'), 'w', encoding='utf-8').write(out + '\n')
print('wrote', len(DRAFTS), 'drafts')
