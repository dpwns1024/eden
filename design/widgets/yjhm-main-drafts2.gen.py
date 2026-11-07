# YJHM 케이브덕 위젯 — 첫 화면 시안 2차 (홈 메인 「필름」 1면 느낌)
# python3 design/widgets/yjhm-main-drafts2.gen.py → yjhm-main-drafts2.html (시안마다 <!-- ===== 시안 N · 이름 ===== --> 로 나뉨)
# 자리표시: {{3}} 날짜 · {{4}} 시간 · {{1}} 장소 · {{2}} 상황 · {{11}} 레인 번호. 펼치기 버튼 「기사 전문 보기♡」는 모든 시안에.
# 픽셀 정렬은 고른 시안에만 마저 맞춘다 (사용자 요청)
import os
HERE = os.path.dirname(os.path.abspath(__file__))

F = "font-family:'Pretendard Variable','Pretendard','Noto Sans KR',-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Segoe UI',sans-serif;"
FT = "font-family:'Inter','Pretendard Variable','Pretendard',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"
NUM = "font-variant-numeric:tabular-nums;"
INK, NV2, AC, SUB, FAINT, LN, BG = '#1d2a3d', '#2c3e57', '#607ca0', '#4a5a70', '#6c7a8c', '#9fb0c6', '#eef0f3'
DOTS = "background-image:radial-gradient(rgba(96,124,160,.55) 30%,transparent 36%);background-size:4px 4px;"
RINGS = "background-image:repeating-radial-gradient(circle at 50% 46%,transparent 0 70px,rgba(96,124,160,.13) 70px 71px);"

def cap(text, size=9, ls=.2, color=AC, w=600, extra=''):
    return f'<span style="{F}{NUM}font-size:{size}px;font-weight:{w};letter-spacing:{ls}em;color:{color};line-height:{round(size) + 1}px;white-space:nowrap;{extra}">{text}</span>'

def tape(text, h=22, size=9.5, ls=.2, pad=10, bg=NV2, fg='#f2f4f7', radius=2, extra=''):
    return (f'<span style="flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;height:{h}px;padding:0 calc({pad}px - {ls}em) 0 {pad}px;'
            f'border-radius:{radius}px;background:{bg};color:{fg};{F}font-size:{size}px;font-weight:600;letter-spacing:{ls}em;line-height:{round(size)+1}px;white-space:nowrap;'
            f'text-shadow:0 1px 0 rgba(0,0,0,.35);box-shadow:0 1px 3px rgba(20,30,48,.25),inset 0 1px 0 rgba(255,255,255,.12);{extra}">{text}</span>')

def button(text='기사 전문 보기♡'):
    return f'<div style="display:flex;">{tape(text, h=38, size=11.5, ls=.06, pad=14, extra="flex:1;border-radius:3px;text-shadow:none;")}</div>'

def wrap(body):
    return f'''<div style="width:100%;max-width:520px;margin:16px auto;color:{INK};word-break:keep-all;line-height:1.5;{F}">
  <div style="position:relative;overflow:hidden;background-color:{BG};{RINGS}border-radius:6px;box-shadow:0 0 0 1px rgba(44,62,87,.1),0 18px 40px rgba(44,62,87,.14);">
{body}
  </div>
</div>'''

def kicker(text='FAN ACCOUNT ♡ — 10M AIR PISTOL'):
    return f'<div style="line-height:10px;">{cap(text, 9, .24)}</div>'

def mast(size=52):
    return f'<div style="{FT}font-size:{size}px;font-weight:800;letter-spacing:-.055em;line-height:{round(size*.92)}px;color:{INK};white-space:nowrap;">Hong Yejun<span style="color:{AC};">.</span></div>'

# ── 필름 띠 — 구멍 줄 · 가장자리 인쇄 · 프레임 ──
def perf(pos):
    return f'<div style="position:absolute;left:0;right:0;{pos}:5px;height:6px;background:repeating-linear-gradient(90deg,transparent 0 5px,#eef0f3 5px 14px,transparent 14px 19px);"></div>'

def edge(items, pos):
    sp = ''.join(f'<span>{t}</span>' for t in items)
    return f'<div style="position:absolute;left:26px;right:0;{pos}:15px;display:flex;gap:44px;{F}{NUM}font-size:8px;font-weight:600;letter-spacing:.16em;color:#c9cfd6;line-height:9px;white-space:nowrap;overflow:hidden;">{sp}</div>'

def photo(kind, ph=''):
    """프레임 속 그림 — 위젯엔 사진이 없으니 CSS로 그린 장면"""
    if kind == 'target':   # 과녁지 벽
        return f'''<div style="position:absolute;inset:0;background:linear-gradient(160deg,#f3efe2,#d9cdb0);"></div>
            <div style="position:absolute;left:14%;top:16%;width:46%;aspect-ratio:1;border-radius:50%;background:repeating-radial-gradient(circle,#1d2a3d 0 3px,#efe6cf 3px 7px);box-shadow:0 0 0 3px #efe6cf;"></div>
            <div style="position:absolute;right:8%;top:30%;width:30%;aspect-ratio:1;border-radius:50%;background:repeating-radial-gradient(circle,#1d2a3d 0 2px,#efe6cf 2px 5px);opacity:.75;"></div>
            <div style="position:absolute;inset:0;{DOTS}opacity:.35;"></div>'''
    if kind == 'range':    # 어두운 사선 · 조명
        return f'''<div style="position:absolute;inset:0;background:radial-gradient(80% 70% at 70% 30%,#4c6a8c,#1b2a3f 70%);"></div>
            <div style="position:absolute;left:0;right:0;bottom:22%;height:2px;background:rgba(255,255,255,.25);"></div>
            <div style="position:absolute;right:16%;top:22%;width:22%;aspect-ratio:1;border-radius:50%;background:repeating-radial-gradient(circle,#e8edf4 0 2px,#22344d 2px 5px);opacity:.9;"></div>
            <div style="position:absolute;inset:0;{DOTS}opacity:.25;"></div>'''
    # caption — 글이 실린 프레임
    return f'''<div style="position:absolute;inset:0;background:linear-gradient(160deg,#dfe6ef,#7d92ae);"></div>
            <div style="position:absolute;inset:0;{DOTS}opacity:.45;"></div>
            <div style="position:absolute;left:10px;right:10px;bottom:10px;{F}font-size:14px;font-weight:800;letter-spacing:-.02em;line-height:19px;color:#fff;text-shadow:0 1px 6px rgba(29,42,61,.6);">{ph}</div>'''

def film(frames, rot, h=150, fw=176, extra='', prints=('SAFETY FILM', '5 ▸ 5A', 'EXPIRED 200', '6 ▸ 6A', 'SAFETY FILM')):
    cells = ''.join(f'<div style="position:relative;flex-shrink:0;width:{fw}px;height:100%;border-radius:4px;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(255,255,255,.06);">{photo(*f)}</div>' for f in frames)
    return f'''<div style="position:relative;height:{h}px;margin:0 -40px;transform:rotate({rot}deg);background:{INK};box-shadow:0 18px 34px rgba(44,62,87,.3);{extra}">
        {perf('top')}{perf('bottom')}
        {edge(prints, 'top')}{edge(('▶ 5', 'ISO 200', '▶ 6', '▶ 6A', '▶ 7'), 'bottom')}
        <div style="position:absolute;left:30px;right:0;top:30px;bottom:30px;display:flex;gap:12px;">{cells}</div>
      </div>'''

def quote(name, ph):
    return f'''<div style="display:flex;width:max-content;max-width:100%;box-shadow:0 2px 8px rgba(44,62,87,.14);">
        {tape(name, h=30, size=9.5, ls=.2, pad=11, radius=0, extra='border-radius:2px 0 0 2px;box-shadow:none;')}
        <span style="min-width:0;display:flex;align-items:center;padding:0 14px;background:#fff;border-radius:0 2px 2px 0;{F}font-size:12.5px;line-height:30px;color:{INK};overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">{ph}</span>
      </div>'''

def scrap_row(date, title, right, last=False):
    return f'''<div style="display:flex;align-items:center;gap:14px;min-height:34px;{'' if last else 'border-bottom:1px solid rgba(44,62,87,.1);'}">
          <span style="flex-shrink:0;{F}{NUM}font-size:11px;font-weight:600;letter-spacing:.04em;color:{AC};line-height:14px;">{date}</span>
          <span style="min-width:0;flex:1;{F}font-size:13px;line-height:18px;color:{INK};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{title}</span>
          <span style="flex-shrink:0;{F}font-size:9px;font-weight:600;letter-spacing:.14em;color:{LN};line-height:10px;">{right}</span>
        </div>'''

FOLDER = ("-webkit-mask:url(data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2042%2032%27%3E%3Cpath%20d=%27M3%200h12.5a3%203%200%200%201%202.4%201.2L20%204h19a3%203%200%200%201%203%203v22a3%203%200%200%201-3%203H3a3%203%200%200%201-3-3V3a3%203%200%200%201%203-3z%27/%3E%3C/svg%3E) center/100% 100% no-repeat;"
          "mask:url(data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2042%2032%27%3E%3Cpath%20d=%27M3%200h12.5a3%203%200%200%201%202.4%201.2L20%204h19a3%203%200%200%201%203%203v22a3%203%200%200%201-3%203H3a3%203%200%200%201-3-3V3a3%203%200%200%201%203-3z%27/%3E%3C/svg%3E) center/100% 100% no-repeat;")
def folder(name, on=False):
    bg = f'linear-gradient({NV2} 0 7px,{AC} 7px)' if on else 'linear-gradient(#c3cfdd 0 7px,#dfe6ef 7px)'
    return f'''<div style="display:flex;flex-direction:column;align-items:center;gap:6px;min-width:0;">
          <span style="display:block;width:38px;height:29px;background:{bg};{FOLDER}"></span>
          <span style="{F}font-size:9px;font-weight:700;letter-spacing:.06em;line-height:10px;color:{INK if on else AC};white-space:nowrap;">{name}</span>
        </div>'''

def play_btn(size=34):
    return f'''<span style="flex-shrink:0;display:flex;align-items:center;justify-content:center;width:{size}px;height:{size}px;border-radius:2px;background:{NV2};box-shadow:0 1px 3px rgba(20,30,48,.25),inset 0 1px 0 rgba(255,255,255,.12);">
            <span style="display:block;width:0;height:0;margin-left:3px;border-style:solid;border-width:6px 0 6px 10px;border-color:transparent transparent transparent #f2f4f7;"></span></span>'''
skip = lambda d: (f'<span style="display:flex;align-items:center;gap:1px;opacity:.85;">'
                  + (f'<span style="width:2px;height:11px;background:{AC};"></span><span style="width:0;height:0;border-style:solid;border-width:5.5px 8px 5.5px 0;border-color:transparent {AC} transparent transparent;"></span>' if d < 0 else
                     f'<span style="width:0;height:0;border-style:solid;border-width:5.5px 0 5.5px 8px;border-color:transparent transparent transparent {AC};"></span><span style="width:2px;height:11px;background:{AC};"></span>') + '</span>')

# ───────── 시안 1 · 1면 그대로 ─────────
D1 = wrap(f'''
    <div style="padding:20px 20px 0;">
      <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:12px;border-bottom:1px solid rgba(96,124,160,.3);">
        <div style="display:flex;align-items:center;gap:6px;">{cap('EVEDEN', 9, .22, LN)}{tape('YJHM', h=22, size=9, ls=.22, pad=9)}</div>
        {cap('NO.{{11}} · {{3}}', 9, .18, AC, 600, 'margin-right:-.18em;')}
      </div>
      <div style="margin-top:18px;">{kicker()}</div>
      <div style="margin-top:8px;">{mast(54)}</div>
    </div>
    <div style="position:relative;height:262px;margin-top:22px;">
      <div style="position:absolute;left:0;right:0;top:4px;">{film([('range',), ('target',), ('range',)], 4.2, h=150, extra='opacity:.92;')}</div>
      <div style="position:absolute;left:0;right:0;top:66px;">{film([('target',), ('caption', '{{1}}'), ('range',)], -2.4, h=170, fw=200)}</div>
    </div>
    <div style="padding:6px 20px 20px;">
      {quote('YEJUN', '{{2}}')}
      <div style="margin-top:14px;">{button()}</div>
    </div>''')

# ───────── 시안 2 · BGM 플레이어 ─────────
D2 = wrap(f'''
    <div style="padding:20px 20px 0;">
      <div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-top:1px solid rgba(96,124,160,.3);border-bottom:1px solid rgba(96,124,160,.3);">
        {play_btn()}
        <div style="min-width:0;flex:1;">
          <div style="line-height:10px;">{cap('TRACK {{11}} <span style="color:#9fb0c6;">/ 60</span>', 9, .2)}</div>
          <div style="margin-top:5px;{FT}font-size:19px;font-weight:700;letter-spacing:-.03em;line-height:22px;color:{INK};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{{{1}}}}</div>
        </div>
        <div style="display:flex;align-items:center;gap:16px;padding-right:4px;">{skip(-1)}{skip(1)}</div>
      </div>
      <div style="position:relative;height:3px;margin-top:10px;border-radius:2px;background:rgba(96,124,160,.2);"><span style="position:absolute;left:0;top:0;bottom:0;width:38%;border-radius:2px;background:{AC};"></span><span style="position:absolute;left:38%;top:50%;width:9px;height:9px;margin:-4.5px 0 0 -4.5px;border-radius:50%;background:{NV2};"></span></div>
      <div style="display:flex;justify-content:space-between;margin-top:7px;line-height:10px;">{cap('{{4}}', 8.5, .1, AC)}{cap('10.9', 8.5, .1, LN)}</div>
      <div style="margin-top:22px;">{kicker('NOW PLAYING — HONG YEJUN FAN ACCOUNT ♡')}</div>
      <div style="margin-top:8px;">{mast(50)}</div>
    </div>
    <div style="position:relative;height:150px;margin-top:10px;">{film([('target',), ('caption', '{{2}}'), ('range',)], -2, h=150, fw=180)}</div>
    <div style="padding:14px 20px 20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;line-height:10px;">{cap('{{3}}', 9, .14, AC)}{cap('LANE {{11}}', 9, .2, LN, 600, 'margin-right:-.2em;')}</div>
      {button()}
    </div>''')

# ───────── 시안 3 · SCRAP 스크랩북 ─────────
D3 = wrap(f'''
    <div style="padding:22px 20px 0;">
      {kicker()}
      <div style="margin-top:8px;">{mast(48)}</div>
    </div>
    <div style="position:relative;height:120px;margin-top:14px;">{film([('range',), ('target',), ('range',), ('target',)], -2.6, h=118, fw=140)}</div>
    <div style="padding:16px 20px 20px;">
      <div style="display:flex;align-items:center;gap:6px;">{tape('SCRAP · 3', h=24, size=10, ls=.22, pad=11)}<span style="flex:1;height:1px;background:rgba(96,124,160,.3);"></span></div>
      <div style="margin-top:8px;">
        {scrap_row('{{3}}', '<b style="font-weight:700;">{{1}}</b>', 'MATCH')}
        {scrap_row('{{4}}', '{{2}}', 'DIARY')}
        {scrap_row('NO.{{11}}', '오늘의 사선 기록 · 10.9', 'NOTE', True)}
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;margin-top:14px;">
        {tape('GUESTBOOK', h=24, size=10, ls=.22, pad=11)}
        <span style="max-width:80%;padding:7px 12px;border-radius:14px 14px 4px 14px;background:{INK};{F}font-size:12.5px;line-height:17px;color:#fff;">오늘도 텐링이었어요 ♡</span>
      </div>
      <div style="margin-top:14px;">{button()}</div>
    </div>''')

# ───────── 시안 4 · 필름 한 칸 크게 ─────────
D4 = wrap(f'''
    <div style="padding:20px 20px 0;display:flex;justify-content:space-between;align-items:flex-end;gap:10px;">
      <div>{kicker('GOLD MEDALIST — FAN ACCOUNT ♡')}<div style="margin-top:8px;">{mast(40)}</div></div>
      {tape('LANE {{11}}', h=22, size=9, ls=.2, pad=9)}
    </div>
    <div style="position:relative;margin:18px -20px 0;height:250px;transform:rotate(-1.8deg);background:{INK};box-shadow:0 18px 34px rgba(44,62,87,.3);">
      {perf('top')}{perf('bottom')}
      {edge(('EXPIRED 200', '11 ▸ 11A', 'SAFETY FILM', 'ISO 200'), 'top')}{edge(('▶ 11', '▶ 11A', 'TEN RING 400', '▶ 12'), 'bottom')}
      <div style="position:absolute;left:44px;right:44px;top:30px;bottom:30px;border-radius:5px;overflow:hidden;">
        {photo('range')}
        <div style="position:absolute;inset:0;background:linear-gradient(0deg,rgba(29,42,61,.85),transparent 60%);"></div>
        <div style="position:absolute;left:16px;top:14px;">{tape('● REC', h=20, size=8.5, ls=.2, pad=8, bg='#fff', fg=NV2, extra='text-shadow:none;')}</div>
        <div style="position:absolute;left:16px;right:16px;bottom:14px;">
          <div style="line-height:10px;">{cap('{{3}} {{4}}', 9, .1, LN)}</div>
          <div style="margin-top:6px;{F}font-size:21px;font-weight:800;letter-spacing:-.03em;line-height:26px;color:#fff;">{{{{1}}}}</div>
          <div style="margin-top:2px;{F}font-size:12px;line-height:18px;color:rgba(255,255,255,.8);">{{{{2}}}}</div>
        </div>
      </div>
    </div>
    <div style="padding:26px 20px 20px;">{button()}</div>''')

# ───────── 시안 5 · 폴더 독 ─────────
D5 = wrap(f'''
    <div style="padding:22px 20px 0;">
      {kicker()}
      <div style="margin-top:8px;">{mast(52)}</div>
    </div>
    <div style="position:relative;height:206px;margin-top:22px;">
      <div style="position:absolute;left:0;right:0;top:10px;">{film([('target',), ('range',), ('target',)], 3.6, h=130, fw=150, extra='opacity:.9;')}</div>
      <div style="position:absolute;left:0;right:0;top:46px;">{film([('caption', '{{1}}'), ('range',), ('caption', '{{2}}')], -2.2, h=146, fw=170)}</div>
    </div>
    <div style="position:relative;margin-top:22px;padding:26px 16px 14px;border-top:1px solid rgba(96,124,160,.25);background:rgba(250,251,252,.88) repeating-linear-gradient(90deg,transparent 0 3px,rgba(96,124,160,.04) 3px 4px);">
      <div style="position:absolute;left:50%;top:-15px;transform:translateX(-50%);width:max-content;max-width:calc(100% - 32px);">{quote('YEJUN', '{{3}} · 텐링 쏘고 올게')}</div>
      <div style="display:flex;justify-content:space-between;gap:6px;">{folder('FRONT PAGE', True)}{folder('PEOPLE')}{folder('MATCH DAY')}{folder('PHOTO DESK')}</div>
      <div style="margin-top:14px;">{button()}</div>
    </div>''')

# ───────── 시안 6 · 방명록 1면 ─────────
D6 = wrap(f'''
    <div style="padding:20px 20px 0;">
      <div style="display:flex;justify-content:space-between;align-items:center;line-height:10px;">{cap('NO.{{11}}', 9, .2)}{cap('{{3}}', 9, .18, AC, 600, 'margin-right:-.18em;')}</div>
      <div style="margin-top:16px;">{mast(56)}</div>
      <div style="margin-top:6px;line-height:10px;">{cap('FAN ACCOUNT ♡ — GOLD MEDALIST · 10M AIR PISTOL', 8.5, .2, LN)}</div>
    </div>
    <div style="position:relative;height:118px;margin-top:16px;">{film([('target',), ('range',), ('target',), ('range',)], 2.4, h=118, fw=140)}</div>
    <div style="display:flex;gap:14px;align-items:flex-start;padding:18px 20px 0;">
      <div style="flex:1;min-width:0;">
        {tape('SCRAP · 1', h=24, size=10, ls=.22, pad=11)}
        <div style="margin-top:10px;">{scrap_row('{{4}}', '{{1}}', '11', True)}</div>
      </div>
      <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:6px;max-width:52%;">
        {tape('GUESTBOOK', h=24, size=10, ls=.22, pad=11)}
        <span style="padding:7px 12px;border-radius:14px 14px 4px 14px;background:#fff;box-shadow:0 0 0 1px rgba(44,62,87,.1);{F}font-size:12px;line-height:17px;color:{INK};">{{{{2}}}}</span>
        <span style="padding:7px 12px;border-radius:14px 14px 4px 14px;background:{INK};{F}font-size:12px;line-height:17px;color:#fff;">오늘도 텐링이었어요 ♡</span>
      </div>
    </div>
    <div style="padding:16px 20px 20px;">{button()}</div>''')

DRAFTS = [('1', '1면 그대로', D1), ('2', 'BGM 플레이어', D2), ('3', '스크랩북', D3), ('4', '필름 한 칸', D4), ('5', '폴더 독', D5), ('6', '방명록 1면', D6)]
out = '\n\n'.join(f'<!-- ===== 시안 {k} · {n} ===== -->\n{h}' for k, n, h in DRAFTS)
open(os.path.join(HERE, 'yjhm-main-drafts2.html'), 'w', encoding='utf-8').write(out + '\n')
print('wrote', len(DRAFTS), 'drafts')
