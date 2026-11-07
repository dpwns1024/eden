# YJHM 케이브덕 위젯 생성기 — python3 design/widgets/yjhm-caveduck.gen.py 로 yjhm-caveduck.html을 다시 만든다.
# 확정 디자인: 첫 화면 = 귀여운 셀카 필카(YEJUN FILM) 뷰파인더 · 아래 프린터 투입구에서 나온 「인화하기」 사진 한 장(= 펼치기 · 접기)
#   → 펼치면 그 사진 아래로 같은 폭의 흰 인화지가 이어지고, 그 안에 팬페이지 4장(TODAY · PROFILE · SCHEDULE · UNSENT)이 홈 메뉴 같은 테이프 탭으로 넘어간다.
# 색: 남색 #1d2a3d · #2c3e57 · 포인트 #607ca0 · 이브(EVEDEN) 붉은색 #d11c20 (첫 화면만 하늘 · 테이프 장식, 펼친 창 안은 두 포인트 색만)
# 정렬 보정값(너비 · 위아래 · 높이)은 yjhm-caveduck.adj.json — 100% 배율에서 글자 잉크를 픽셀 단위로 재서 맞춘 값
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
AP = os.environ.get('YJ_ADJ', os.path.join(HERE, 'yjhm-caveduck.adj.json'))
ADJ = json.load(open(AP)) if os.path.exists(AP) else {}
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'yjhm-caveduck.html')

F = "font-family:'Pretendard Variable','Pretendard','Noto Sans KR',-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Segoe UI',sans-serif;"
FT = "font-family:'Inter','Pretendard Variable','Pretendard',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"
NUM = "font-variant-numeric:tabular-nums;"
INK, NV2, AC, SUB, FAINT, LN, BG = '#1d2a3d', '#2c3e57', '#607ca0', '#4a5a70', '#6c7a8c', '#9fb0c6', '#eef0f3'
SKY = '#cfe0f5'
EVE = '#d11c20'                       # 이브(EVEDEN) 테마 붉은색
EVE_RGB = '209,28,32'
PAPER = '#fffdf8'
LINE = 'rgba(44,62,87,.1)'

A = lambda key, k, d=0: ADJ.get(key, {}).get(k, d)
def K(name):
    """줄 맞춤 손잡이 — 측정값으로 위아래 1px · 글줄 높이 홀짝"""
    t = ADJ.get(name, {}).get('t', 0); lh = ADJ.get(name, {}).get('lh')
    return f'position:relative;top:{t}px;' + (f'line-height:{lh}px;' if lh else '')

def cap(text, size=9, ls=.14, color=AC, w=700, extra=''):
    """작은 머리글 — 글줄 높이 정수 px"""
    return f'<span style="{F}{NUM}font-size:{size}px;font-weight:{w};letter-spacing:{ls}em;color:{color};line-height:{round(size) + 1}px;white-space:nowrap;{extra}">{text}</span>'

def tag(text, key, h=20, size=9.5, ls=.12, pad=8, bg=SKY, fg=INK, radius=4, outline=True, extra='', w=800):
    """스티커 딱지 — 고정 글자는 정수 너비(w) · 위아래(t) · 높이(h)를 adj 측정값으로. 글자 간격 끝 여백은 왼쪽 padding으로 상쇄"""
    W, T, H = A(key, 'w'), A(key, 't'), h + A(key, 'h')
    L = A(key, 'l')
    box = (f'width:{W}px;padding:{max(T,0)}px {max(-L,0)}px {max(-T,0)}px calc({ls}em + {max(L,0)}px);' if W else
           f'padding:{max(T,0)}px calc({pad}px - {ls}em + {max(-L,0)}px) {max(-T,0)}px {pad + max(L,0)}px;')
    ol = f'box-shadow:0 0 0 1.5px {INK},2px 2px 0 1.5px {INK};' if outline else ''
    return (f'<span data-c="{key}" style="flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;height:{H}px;{box}'
            f'border-radius:{radius}px;background:{bg};color:{fg};{F}font-size:{size}px;font-weight:{w};letter-spacing:{ls}em;line-height:{round(size)+1}px;white-space:nowrap;{ol}{extra}">{text}</span>')

def tape_piece(pos, rot, w=56):
    return f'<span style="position:absolute;{pos}z-index:4;width:{w}px;height:16px;background:rgba(207,224,245,.85);box-shadow:0 1px 2px rgba(29,42,61,.15);transform:rotate({rot}deg);"></span>'

spark = lambda pos, size, color='#fff': f'<span style="position:absolute;{pos}z-index:2;{FT}font-size:{size}px;line-height:{size}px;color:{color};text-shadow:0 0 6px rgba(255,255,255,.9);">✦</span>'

# ═════════ 첫 화면 — 셀카 필카 뷰파인더 ═════════
def corner(pos, bw):
    return f'<span style="position:absolute;{pos}width:12px;height:12px;border:2px solid {EVE};border-width:{bw};"></span>'

SCREEN = f'''<div style="position:relative;height:200px;border-radius:14px;overflow:hidden;background:linear-gradient(160deg,#fdfbf5,#e4ecf6 55%,#c9d7ea);box-shadow:inset 0 0 0 1px rgba(29,42,61,.12),inset 0 0 26px rgba(29,42,61,.18);">
          <div style="position:absolute;left:50%;top:50%;width:420px;height:420px;margin:-210px 0 0 -210px;border-radius:50%;background:repeating-radial-gradient(circle,transparent 0 22px,rgba(96,124,160,.16) 22px 23.5px);"></div>
          <div style="position:absolute;right:-40px;top:-50px;width:190px;height:170px;border-radius:50%;background:radial-gradient(circle,rgba({EVE_RGB},.32),rgba({EVE_RGB},.12) 45%,transparent 70%);"></div>
          <div style="position:absolute;left:-30px;bottom:-40px;width:150px;height:130px;border-radius:50%;background:radial-gradient(circle,rgba(96,124,160,.42),transparent 70%);"></div>
          <div style="position:absolute;inset:0;background-image:radial-gradient(rgba(29,42,61,.22) 30%,transparent 36%);background-size:3px 3px;opacity:.22;"></div>
          <div style="position:absolute;left:16px;right:16px;top:14px;bottom:14px;border:1.5px solid rgba(255,255,255,.95);border-radius:6px;box-shadow:0 0 0 1px rgba(96,124,160,.18);"></div>
          <span style="position:absolute;left:24px;top:22px;z-index:2;{F}{NUM}font-size:9px;font-weight:800;letter-spacing:.14em;line-height:10px;color:{AC};">▶ {{{{11}}}}A</span>
          <span style="position:absolute;right:24px;top:22px;z-index:2;display:flex;gap:3px;align-items:flex-end;">{''.join(f'<span style="width:3px;height:{x}px;border-radius:1px;background:{AC};"></span>' for x in (4, 7, 10))}</span>
          {spark('left:26%;top:26%;', 12)}{spark('right:18%;top:40%;', 9)}{spark('left:16%;bottom:30%;', 10, EVE)}
          <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2;text-align:center;">
            <div style="position:relative;display:inline-block;padding:10px 18px;">
              {corner('left:0;top:0;', '2px 0 0 2px;border-radius:4px 0 0 0')}{corner('right:0;top:0;', '2px 2px 0 0;border-radius:0 4px 0 0')}
              {corner('left:0;bottom:0;', '0 0 2px 2px;border-radius:0 0 0 4px')}{corner('right:0;bottom:0;', '0 2px 2px 0;border-radius:0 0 4px 0')}
              <span style="position:absolute;left:50%;top:-12px;margin-left:-7px;{FT}font-size:14px;line-height:14px;color:{EVE};">♥</span>
              <div style="{F}font-size:17px;font-weight:900;letter-spacing:-.03em;line-height:23px;color:{INK};white-space:nowrap;">{{{{1}}}}</div>
              <div style="{F}font-size:11px;font-weight:600;line-height:16px;color:{SUB};white-space:nowrap;">{{{{2}}}}</div>
            </div>
          </div>
          <span style="position:absolute;right:24px;bottom:20px;z-index:2;{F}{NUM}font-size:13px;font-weight:700;letter-spacing:.1em;line-height:14px;color:{EVE};text-shadow:0 0 5px rgba({EVE_RGB},.45);">{{{{3}}}}</span>
          <span style="position:absolute;left:24px;bottom:20px;z-index:2;{F}font-size:9px;font-weight:800;letter-spacing:.14em;line-height:10px;color:{AC};">ISO 400 · ☀</span>
        </div>'''

CAMERA = f'''<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <span style="display:flex;align-items:center;gap:6px;">{cap('YEJUN FILM', 10, .16, INK, 900, K('_yf'))}{tag('REC ♡', 'rec', h=18, size=9, ls=.04, pad=7, bg=AC, fg='#fff', radius=9, outline=False, extra='box-shadow:0 0 0 1.5px ' + INK + ';', w=900)}</span>
          {cap('LANE {{11}} · {{4}}', 9.5, .1, AC, 700, K('_lane'))}
        </div>
        <div style="position:relative;padding:10px;border-radius:22px;background:{SKY};box-shadow:0 0 0 2px {INK},4px 4px 0 2px {INK};">
          <div style="position:absolute;left:50%;top:-9px;width:18px;height:18px;margin-left:-9px;border-radius:50%;background:radial-gradient(circle,#3a4a60 0 35%,{INK} 36%);box-shadow:0 0 0 2px #fff,0 0 0 3.5px {INK};z-index:3;"></div>
          {SCREEN}
          {tape_piece('left:24px;top:-8px;', -12)}
          {tape_piece('right:24px;bottom:-8px;', 10)}
        </div>'''

# 프린터 투입구 + 사진 한 장 「인화하기」 — 사진 아래 가장자리는 점선(절취선). 펼치면 같은 폭의 인화지가 이 선 아래로 이어진다
PRINT = f'''<div style="display:flex;justify-content:space-between;align-items:center;margin:20px 2px 8px;">
          <span style="display:flex;align-items:center;gap:6px;"><span style="display:block;width:8px;height:8px;border-radius:50%;background:{EVE};box-shadow:0 0 6px rgba({EVE_RGB},.8);"></span>{cap('PRINT', 9, .2, AC, 800)}</span>
          {cap('TEN RING LAB · 4 SHEETS', 9, .14, LN, 700, 'margin-right:-.14em;' + K('_lab'))}
        </div>
        <div style="position:relative;z-index:2;height:10px;border-radius:5px;background:{INK};box-shadow:inset 0 2px 3px rgba(0,0,0,.55);"></div>
        <div style="position:relative;margin:-5px 8px 0;height:{44 + A('_print_h', 0)}px;background:#fff;box-shadow:inset 0 0 0 1.5px {INK};border-bottom:1.5px dashed {INK};box-sizing:border-box;">
          <span style="position:absolute;left:10px;top:12px;bottom:8px;width:4px;background:linear-gradient(180deg,{AC} 50%,{EVE} 50%);"></span>
          <div data-c="print" style="position:absolute;left:24px;right:24px;top:5px;bottom:0;display:flex;align-items:center;justify-content:center;padding:{max(A('print','t'),0)}px 0 {max(-A('print','t'),0)}px {A('print','l')}px;{F}font-size:14px;font-weight:900;letter-spacing:.02em;line-height:17px;color:{NV2};">인화하기</div>
        </div>'''

# ═════════ 펼친 인화지 — 4장 (홈 「필름」 1면 말투: 남색 라벨 테이프 · Inter 제목 + 점 · 얇은 선 리스트 · 방명록 말풍선) ═════════
# 안쪽 포인트 색은 #607ca0(AC) · #d11c20(EVE) 두 가지만 — 나머지는 남색 글자 · 회색 선 · 흰 종이
PAPER = '#fff'
LINE = 'rgba(44,62,87,.1)'
RULE = 'rgba(96,124,160,.3)'
TAPE_SH = 'box-shadow:0 1px 3px rgba(20,30,48,.25),inset 0 1px 0 rgba(255,255,255,.12);'
FRAMES = [('01', 'TODAY'), ('02', 'PROFILE'), ('03', 'SCHEDULE'), ('04', 'UNSENT')]

def tape(text, key, h=20, size=9, ls=.2, pad=9, bg=NV2, fg='#f2f4f7', extra=''):
    """홈의 라벨 테이프 — 남색 바탕 · 흰 글자 · 넓은 글자 간격"""
    return tag(text, key, h=h, size=A('_tape', 'fs', size) if h == 20 else size, ls=ls, pad=pad, bg=bg, fg=fg, radius=2, outline=False, extra=TAPE_SH + extra, w=700)

def strip(on):
    """머리 메뉴 — 홈 메뉴처럼 지금 장만 남색 테이프, 나머지는 #607ca0 글자"""
    cells = []
    for i, (n, name) in enumerate(FRAMES):
        if i == on:
            cells.append(tape(f'<span style="color:{LN};margin-right:6px;">{n}</span>{name}', f'fr-{name}', h=22))
        else:
            cells.append(tag(n, f'fr-{n}', h=22, size=9, ls=.2, pad=7, bg='transparent', fg=AC, radius=2, outline=False, w=700))
    hint = '‹ BACK' if on == 3 else 'SWIPE ›'
    return f'''<div style="position:sticky;top:0;z-index:3;background:{PAPER};">
            <div data-r="strip" style="display:flex;align-items:center;gap:2px;height:38px;border-bottom:1px solid {RULE};">
              {''.join(cells)}
              <span style="margin-left:auto;display:flex;">{cap(hint, A('_hint', 'fs', 8.5), .18, LN, 700, 'margin-right:-.18em;' + K('_hint'))}</span>
            </div>
          </div>'''

def title(en, kicker=None, right=''):
    """홈 제호처럼 — 작은 머리글(#607ca0) 위에 Inter 굵은 이름 + 점"""
    return f'''<div style="display:flex;align-items:flex-end;gap:8px;padding:16px 0 12px;">
            <div style="min-width:0;">
              {f'<div style="line-height:10px;margin-bottom:6px;">{cap(kicker, 9, .24, AC, 600)}</div>' if kicker else ''}
              <div style="{FT}font-size:24px;font-weight:700;letter-spacing:-.05em;line-height:24px;color:{INK};white-space:nowrap;">{en}<span style="color:{AC};">.</span></div>
            </div>{right}
          </div>'''

def sec(label, key, top=20):
    return f'''<div style="display:flex;margin:{top}px 0 10px;">{tape(label, key)}</div>'''

def slide(on, body):
    return f'''<div data-s="{on}" style="flex:0 0 100%;min-width:0;scroll-snap-align:start;box-sizing:border-box;padding:0 8px 14px;">
          {strip(on)}
          {body}
        </div>'''

def row(label, kr, ph, color=AC, first=False):
    """홈 SCRAP 리스트 한 줄 — 왼쪽 작은 머리글 · 오른쪽 글 · 아래 얇은 선"""
    return f'''<div style="padding:9px 0;border-bottom:1px solid {LINE};{'border-top:1px solid ' + LINE + ';' if first else ''}">
              <div style="line-height:10px;">{cap(label, 8.5, .16, color, 700)} {cap(kr, 8.5, 0, LN, 500)}</div>
              <div style="margin-top:5px;{F}font-size:12px;line-height:19px;color:{INK};">{ph}</div>
            </div>'''

def bubble(ph, who, me=False, extra=''):
    """방명록 말풍선 — 흰 말풍선, me면 남색"""
    bg, fg, bd = (INK, '#fff', INK) if me else ('#fff', INK, 'rgba(44,62,87,.16)')
    return f'''<div style="display:flex;flex-direction:column;align-items:{'flex-end' if me else 'flex-start'};gap:5px;">
              <div style="box-sizing:border-box;max-width:88%;padding:9px 12px;border-radius:{'14px 14px 4px 14px' if me else '14px 14px 14px 4px'};background:{bg};border:1px solid {bd};{F}font-size:12.5px;line-height:20px;color:{fg};">{ph}</div>
              {who}
            </div>'''

def target(sz=40):
    """과녁 — 홈 바탕의 은은한 링 · 한가운데 붉은 점"""
    return (f'<span style="flex-shrink:0;position:relative;width:{sz}px;height:{sz}px;border-radius:50%;'
            f'background:repeating-radial-gradient(circle,transparent 0 4px,rgba(96,124,160,.45) 4px 5px);box-shadow:inset 0 0 0 1px {AC};">'
            f'<span style="position:absolute;left:50%;top:50%;width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:50%;background:{EVE};"></span></span>')

foot = lambda t: f'<div style="margin-top:12px;text-align:right;{F}font-size:9.5px;line-height:12px;color:{LN};">{t}</div>'

S1 = slide(0, f'''
          {title('Today', right=tag('NSFW {{12}}', 'nsfw', h=16, size=8, ls=.12, pad=7, bg='#fff', fg=NV2, radius=10, outline=False, extra='border:1px solid ' + RULE + ';position:relative;top:' + str(A('_nsfw', 't', 0)) + 'px;margin-left:auto;align-self:center;'))}
          <div data-r="event" style="display:flex;align-items:center;gap:12px;padding:12px;border-radius:4px;background:#f5f6f8;">
            {target(40 + A('_target', 'd', 0))}
            <div style="flex:1;min-width:0;{K('_evblk')}">
              <div style="line-height:14px;">{cap('10M AIR PISTOL', 11, .1, INK, 800, 'line-height:14px;')}</div>
              <div style="{F}font-size:10.5px;color:{FAINT};margin-top:{A('_evdesc', 'mt', 5)}px;line-height:{A('_evdesc', 'lh', 13)}px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">국가대표 · 공기권총</div>
            </div>
          </div>
          {sec('REPORT', 'report')}
          <div style="display:flex;align-items:baseline;gap:12px;padding:0 0 9px;border-bottom:1px solid {LINE};margin-bottom:10px;">
            {cap('RELATION', 8.5, .16, AC, 700)}
            <span style="min-width:0;{F}font-size:12px;font-weight:700;line-height:18px;color:{INK};">{{{{30}}}}</span>
          </div>
          <div style="{F}font-size:12px;line-height:21px;color:{NV2};">{{{{5}}}}</div>
          {sec('BEHIND', 'behind', 22)}
          {bubble('{{26}}', '')}
          {foot('* 무표정 뒤에 숨겨 둔 진짜 속마음 ♡')}''')

def kv(label, ph, color, first=False):
    """왼쪽 머리글 칸 · 오른쪽 글 — 홈 SCRAP 리스트처럼 얇은 선으로 나눈 한 줄"""
    return f'''<div data-r="kv" style="display:flex;align-items:flex-start;gap:10px;padding:9px 0;{'' if first else 'border-top:1px solid ' + LINE + ';'}">
                <span style="flex-shrink:0;width:56px;display:flex;height:19px;align-items:center;{K('_kv')}">{cap(label, 8.5, .16, color, 700)}</span>
                <span style="flex:1;min-width:0;{F}font-size:12px;line-height:19px;color:{INK};">{ph}</span>
              </div>'''

BARCODE = f'repeating-linear-gradient(90deg,{LN} 0 1px,transparent 1px 3px,{LN} 3px 5px,transparent 5px 6px,{LN} 6px 7px,transparent 7px 10px)'
def pass_(name, ph, color, fields):
    """출입증(AD 카드) — 왼쪽 색 띠 · 이름 · 한 줄 상태 · 아래 두 칸"""
    rows = ''.join(kv(lab, p, color, i == 0) for i, (lab, p) in enumerate(fields))
    return f'''<div style="position:relative;box-sizing:border-box;padding:13px 13px 3px 17px;border-radius:4px;background:#fff;border:1px solid rgba(44,62,87,.14);overflow:hidden;">
              <span style="position:absolute;left:0;top:0;bottom:0;width:4px;background:{color};"></span>
              <div data-r="pass" style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
                <div style="min-width:0;{F}font-size:18px;font-weight:800;letter-spacing:-.02em;line-height:21px;color:{INK};white-space:nowrap;">{name}</div>
                <span style="flex-shrink:0;display:block;position:relative;top:1px;width:44px;height:15px;background:{BARCODE};"></span>
              </div>
              <div style="margin-top:6px;padding-bottom:10px;border-bottom:1px dashed rgba(44,62,87,.2);{F}font-size:11.5px;line-height:18px;color:{SUB};">{ph}</div>
              {rows}
            </div>'''

S2 = slide(1, f'''
          {title('Profile')}
          <div style="display:flex;flex-direction:column;gap:10px;">
            {pass_('홍예준', '{{13}}', AC, [('POSE', '{{16}}'), ('OUTFIT', '{{15}}')])}
            {pass_('전하민', '{{25}}', EVE, [('POSE', '{{19}}'), ('OUTFIT', '{{18}}')])}
          </div>''')

PERF_V = 'repeating-linear-gradient(180deg,transparent 0 4px,rgba(238,240,243,.9) 4px 9px,transparent 9px 13px)'
def frame(no, label, ph, color, last=False):
    """필름 한 칸 — 홈 필름 띠처럼 남색 띠 위 흰 칸, 위에 프레임 번호"""
    heart = f'<span style="margin-left:4px;{FT}font-size:10px;line-height:10px;color:{EVE};">♥</span>' if last else ''
    return f'''<div style="{'' if last else 'margin-bottom:8px;'}">
              <div style="display:flex;justify-content:space-between;align-items:center;height:14px;padding:0 2px;">
                {cap('▶ ' + no + 'A', 8, .16, '#c9cfd6', 600)}{cap('YJHM 400', 8, .16, '#6c7a8c', 600, 'margin-right:-.16em;')}
              </div>
              <div style="padding:10px 12px;border-radius:3px;background:#fff;{'box-shadow:inset 0 0 0 1.5px ' + EVE + ';' if last else ''}">
                <div style="display:flex;align-items:center;line-height:10px;">{cap(label, 8.5, .16, color, 800)}{heart}</div>
                <div style="margin-top:5px;{F}font-size:12px;line-height:19px;color:{INK};">{ph}</div>
              </div>
            </div>'''

def ticket_row(label, ph):
    return f'''<div style="padding:11px 13px;">
              <div style="line-height:10px;">{cap(label, 8.5, .16, AC, 800)}</div>
              <div style="margin-top:5px;{F}font-size:12px;line-height:19px;color:{INK};">{ph}</div>
            </div>'''

NOTCH = lambda side: f'<span style="position:absolute;{side}:-7px;top:50%;width:14px;height:14px;margin-top:-7px;border-radius:50%;background:{PAPER};box-shadow:inset 0 0 0 1px rgba(44,62,87,.14);clip-path:inset(0 {"0 0 50%" if side == "left" else "50% 0 0"});"></span>'

S3 = slide(2, f'''
          {title('Schedule')}
          {sec('ROADMAP', 'roadmap', 4)}
          <div style="position:relative;padding:4px 20px 12px;border-radius:4px;background:{INK};box-shadow:0 10px 20px -12px rgba(29,42,61,.6);">
            <span style="position:absolute;left:7px;top:6px;bottom:6px;width:5px;background:{PERF_V};"></span>
            <span style="position:absolute;right:7px;top:6px;bottom:6px;width:5px;background:{PERF_V};"></span>
            {frame('01', 'NEXT', '{{21}}', AC)}
            {frame('02', 'SOON', '{{22}}', AC)}
            {frame('03', 'SOMEDAY', '{{23}}', EVE, True)}
          </div>
          {sec('TICKET', 'memo', 18)}
          <div style="border-radius:6px;background:#fff;border:1px solid rgba(44,62,87,.14);">
            <div data-r="tkh" style="display:flex;justify-content:space-between;align-items:center;height:28px;padding:0 13px;border-radius:5px 5px 0 0;background:{AC};">
              {cap('ADMIT TWO', 8.5, .2, '#fff', 800)}
            </div>
            {ticket_row('CALENDAR', '{{28}}')}
            <div style="position:relative;height:0;margin:0 13px;border-top:1.5px dashed rgba(44,62,87,.2);">
              <span style="position:absolute;left:-20px;top:-7px;width:14px;height:14px;border-radius:50%;background:{PAPER};box-shadow:inset -1px 0 0 rgba(44,62,87,.14);"></span>
              <span style="position:absolute;right:-20px;top:-7px;width:14px;height:14px;border-radius:50%;background:{PAPER};box-shadow:inset 1px 0 0 rgba(44,62,87,.14);"></span>
            </div>
            {ticket_row('REQUEST', '{{29}}')}
          </div>
          {sec('OUR RULES', 'rules', 18)}
          <div style="padding:11px 13px 13px;border-radius:4px;background:#fff;border:1px solid rgba(44,62,87,.14);">
            <div data-r="pact" style="display:flex;align-items:center;gap:8px;padding-bottom:12px;border-bottom:1px solid {LINE};">
              {tag('홍예준', 'p1', h=22, size=10.5, ls=0, pad=10, bg=AC, fg='#fff', radius=11, outline=False, w=700)}
              <span style="position:relative;flex:1;height:1px;background:{RULE};"><span style="position:absolute;left:50%;top:50%;width:18px;height:14px;margin:-7px 0 0 -9px;background:#fff;text-align:center;{FT}font-size:11px;line-height:14px;color:{EVE};">♥</span></span>
              {tag('전하민', 'p2', h=22, size=10.5, ls=0, pad=10, bg=EVE, fg='#fff', radius=11, outline=False, w=700)}
            </div>
            <div style="margin-top:10px;{F}font-size:12px;line-height:21px;color:{INK};">{{{{20}}}}</div>
          </div>''')

S4 = slide(3, f'''
          {title('Unsent')}
          <div style="padding:14px 12px;border-radius:4px;background:#f5f6f8;">
            <div style="text-align:center;line-height:10px;margin-bottom:12px;">{cap('홍예준 → 전하민 · 임시 저장', 8.5, .04, LN, 500)}</div>
            {bubble('{{24}}', '<span data-r="fail" style="display:flex;align-items:center;gap:5px;margin-right:2px;"><span style="display:block;width:' + str(6 + A('_dot', 'd', 0)) + 'px;height:' + str(6 + A('_dot', 'd', 0)) + 'px;border-radius:50%;background:' + EVE + ';"></span>' + cap('전송 안 됨', 8.5, .02, EVE, 700, K('_mino')) + '</span>', True)}
          </div>
          <div data-r="status" style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:12px;border-top:1px solid {LINE};">
            <span style="line-height:11px;position:relative;top:{A('_st_top', 't')}px;">{cap('STATUS', 9, .16, AC, 700)} {cap('· 아직 못 보냄', 9, 0, SUB, 500)}</span>
            {tag('UNSENT', 'unsent', h=20, size=9, ls=.2, pad=9, bg=EVE, fg='#fff', radius=2, outline=False, w=700)}
          </div>''')

STAMP_SZ = 40 + A('stamp', 'h')
PAPER_BODY = f'''<div style="margin:0 8px;padding:6px 4px 4px;background:{PAPER};box-shadow:inset 1.5px 0 0 {INK},inset -1.5px 0 0 {INK};">
          <div style="display:flex;gap:20px;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;scrollbar-width:thin;scrollbar-color:rgba(96,124,160,.35) transparent;align-items:flex-start;">
            {S1}
            {S2}
            {S3}
            {S4}
          </div>
        </div>
        <div style="margin:0 8px;padding:0 14px 14px;background:{PAPER};box-shadow:inset 1.5px 0 0 {INK},inset -1.5px 0 0 {INK},inset 0 -1.5px 0 {INK},0 10px 18px -10px rgba(29,42,61,.4);border-radius:0 0 6px 6px;">
          <div data-r="foot" style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding-top:12px;border-top:1px solid {RULE};">
            <div style="min-width:0;{K('_footblk')}">
              <div style="line-height:11px;{K('_printed')}">{cap('HONG YEJUN FAN ARCHIVE', 9, .2, INK, 700)}</div>
              <div style="margin-top:5px;{F}{NUM}font-size:11px;font-weight:600;letter-spacing:.16em;line-height:13px;color:{AC};">{{{{3}}}} · LANE {{{{11}}}}</div>
            </div>
            <span data-c="stamp" style="flex-shrink:0;display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:{STAMP_SZ}px;height:{STAMP_SZ}px;padding:{max(A('stamp','t'),0)}px 0 {max(-A('stamp','t'),0)}px;border-radius:50%;border:1.5px solid {EVE};box-shadow:inset 0 0 0 3px {PAPER},inset 0 0 0 4px rgba({EVE_RGB},.5);color:{EVE};{FT}{NUM}font-size:11px;font-weight:900;line-height:12px;transform:rotate(-12deg);">10.9</span>
          </div>
        </div>'''

HTML = f'''<div style="width:100%;max-width:520px;margin:16px auto;color:{INK};word-break:keep-all;line-height:1.5;{F}">
  <div style="position:relative;overflow:hidden;background:#f6f7fb;border-radius:18px;box-shadow:0 0 0 1px rgba(44,62,87,.08),0 18px 40px rgba(44,62,87,.12);">
    <details>
      <summary style="list-style:none;cursor:pointer;user-select:none;display:block;padding:20px 18px 0;">
        <!-- 셀카 필카 뷰파인더 -->
        {CAMERA}
        <!-- 프린터 투입구 + 「인화하기」 사진 (펼치기 · 접기) -->
        {PRINT}
      </summary>
      <!-- 펼친 인화지 — 사진 아래로 같은 폭이 이어진다 -->
      <div style="padding:0 18px 4px;">
        {PAPER_BODY}
      </div>
    </details>
    <div style="height:18px;"></div>
  </div>
</div>
'''
open(OUT, 'w', encoding='utf-8').write(HTML)
print('wrote', OUT, len(HTML))
