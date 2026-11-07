# YJHM 케이브덕 위젯 생성기 — python3 design/widgets/yjhm-caveduck.gen.py 로 yjhm-caveduck.html을 다시 만든다.
# 확정 디자인: 첫 화면 = 귀여운 셀카 필카(YEJUN FILM) 뷰파인더 · 아래 프린터 투입구에서 나온 「인화하기」 사진 한 장(= 펼치기 · 접기)
#   → 펼치면 그 사진 아래로 같은 폭의 긴 인화지가 이어지고, 그 안에 4장(BRIEFING · ROSTER · PLAN · MISFIRE)이 필름 띠 탭으로 넘어간다.
# 색: 남색 #1d2a3d · #2c3e57 · 포인트 #607ca0 · 이브(EVEDEN) 붉은색 #d11c20 · 하늘 · 분홍 · 버터 스티커
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
SKY, PINK, BUTTER = '#cfe0f5', '#f6c9d4', '#fbe7a6'
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
           f'padding:{max(T,0)}px calc({pad}px - {ls}em) {max(-T,0)}px {pad}px;')
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

# ═════════ 펼친 인화지 — 4장 ═════════
FRAMES = [('01', 'BRIEFING'), ('02', 'ROSTER'), ('03', 'PLAN'), ('04', 'MISFIRE')]
def strip(on):
    """필름 띠 탭 — 지금 장만 흰 프레임 + 붉은 테두리"""
    cells = []
    for i, (n, name) in enumerate(FRAMES):
        if i == on:
            cells.append(tag(f'<span style="color:{EVE};margin-right:6px;">{n}</span>{name}', f'fr-{name}', h=20, size=9, ls=.14, pad=8, bg='#fff', fg=INK, radius=2, outline=False, extra=f'box-shadow:0 0 0 1.5px {EVE};'))
        else:
            cells.append(tag(n, f'fr-{n}', h=20, size=9, ls=.14, pad=7, bg='rgba(255,255,255,.1)', fg=LN, radius=2, outline=False))
    perf = 'background:repeating-linear-gradient(90deg,transparent 0 3px,rgba(255,253,248,.85) 3px 7px,transparent 7px 10px);'
    hint = '‹ BACK' if on == 3 else 'SWIPE ›'
    return f'''<div style="position:sticky;top:0;z-index:3;padding-bottom:10px;background:{PAPER};">
            <div style="position:relative;display:flex;align-items:center;gap:4px;height:40px;padding:0 10px;border-radius:4px;background:{INK};">
              <span style="position:absolute;left:0;right:0;top:3px;height:3px;{perf}"></span>
              <span style="position:absolute;left:0;right:0;bottom:3px;height:3px;{perf}"></span>
              {''.join(cells)}
              <span style="margin-left:auto;display:flex;">{cap(hint, 8.5, .14, LN, 700, K('_hint'))}</span>
            </div>
          </div>'''

def title(en, kr, right=''):
    return f'''<div style="display:flex;align-items:baseline;gap:8px;padding:2px 0 10px;border-bottom:1.5px dashed rgba(44,62,87,.25);">
            <span style="{FT}font-size:20px;font-weight:800;letter-spacing:-.05em;line-height:20px;color:{INK};">{en}<span style="color:{EVE};">.</span></span>
            <span style="{F}font-size:11px;font-weight:700;color:{SUB};line-height:13px;">{kr}</span>{right}
          </div>'''

def sec(label, key, sub, bg=SKY, top=18):
    return f'''<div style="display:flex;align-items:center;gap:8px;margin:{top}px 0 10px;">
            {tag(label, key, bg=bg)}
            <span style="position:relative;top:{A('_sec_sub_top', 0)}px;min-width:0;overflow:hidden;text-overflow:ellipsis;{F}font-size:10px;font-weight:600;color:{FAINT};line-height:12px;white-space:nowrap;">{sub}</span>
            <span style="flex:1;min-width:8px;height:1px;background:rgba(44,62,87,.15);"></span>
          </div>'''

def slide(on, body):
    return f'''<div style="flex:0 0 100%;min-width:0;scroll-snap-align:start;box-sizing:border-box;height:456px;overflow-y:auto;overscroll-behavior-y:contain;padding-right:4px;scrollbar-width:thin;scrollbar-color:rgba(96,124,160,.35) transparent;">
          {strip(on)}
          {body}
        </div>'''

PISTOL = 'polygon(0 12%,3% 12%,3% 2%,7% 2%,7% 12%,80% 12%,80% 0,86% 0,86% 12%,100% 12%,100% 40%,96% 42%,100% 100%,77% 100%,71% 46%,64% 46%,64% 64%,52% 64%,50% 46%,40% 46%,40% 32%,0 32%)'
S1 = slide(0, f'''
          {title('Briefing', '사선 개요')}
          <div style="display:flex;align-items:center;gap:12px;margin-top:12px;padding:10px 12px;border-radius:6px;background:#f3f5f9;box-shadow:inset 3px 0 0 {EVE};">
            <div style="flex-shrink:0;width:44px;height:18px;background:linear-gradient(180deg,#9fb0c6,{AC} 45%,{NV2});clip-path:{PISTOL};-webkit-clip-path:{PISTOL};"></div>
            <div style="flex:1;min-width:0;">
              <div style="line-height:14px;">{cap('10M AIR PISTOL', 11, .1, INK, 800, 'line-height:14px;')}</div>
              <div style="{F}font-size:10px;color:{FAINT};margin-top:5px;line-height:12px;">10m 공기권총 · 4.5mm 펠릿 · 60발</div>
            </div>
            {tag('NSFW {{12}}', 'nsfw', h=20, size=8.5, ls=.12, pad=7, bg='#fff', fg=NV2, radius=10, outline=False, extra='box-shadow:0 0 0 1.5px ' + INK + ';align-self:flex-start;margin-top:' + str(A('_nsfw', 'mt', 6)) + 'px;')}
          </div>
          {sec('SPOTTER NOTE', 'spotter', '관측수 기록')}
          <div style="display:flex;align-items:baseline;gap:12px;padding:2px 0 8px;border-bottom:1px solid {LINE};margin-bottom:10px;">
            {cap('RELATION', 9, .14, EVE, 800)}
            <span style="min-width:0;{F}font-size:11.5px;font-weight:700;line-height:18px;color:{INK};">{{{{30}}}}</span>
          </div>
          <div style="{F}font-size:12px;line-height:21px;color:{NV2};">{{{{5}}}}</div>
          {sec('BREATH HOLD', 'breath', '한 손 조준 · 숨을 멈춘 사이의 의식 흐름', BUTTER, 22)}
          <div style="position:relative;margin-top:14px;padding:16px 14px 12px;background:#fff;box-shadow:0 0 0 1px {LINE},3px 4px 10px -6px rgba(29,42,61,.35);transform:rotate(-.6deg);">
            {tape_piece('left:50%;top:-8px;margin-left:-28px;', 2)}
            <div style="{F}font-size:12.5px;line-height:21px;color:{INK};font-style:italic;">{{{{26}}}}</div>
            <div style="margin-top:6px;text-align:right;{F}font-size:11px;font-weight:800;line-height:14px;color:{EVE};">— 홍예준</div>
          </div>
          <div style="margin-top:10px;text-align:right;{F}font-size:9px;line-height:12px;color:{LN};">* 방아쇠 1차 압력 ~ 격발 사이 · 원문 그대로 기록</div>''')

def field(label, kr, ph, color):
    return f'''<div style="padding:8px 0;border-top:1px solid {LINE};">
                <div style="line-height:10px;">{cap(label, 8.5, .14, color, 800)} {cap(kr, 8.5, 0, LN, 600)}</div>
                <div style="margin-top:5px;{F}font-size:11.5px;line-height:18px;color:{INK};">{ph}</div>
              </div>'''

def idcard(name, en, ph, color, fields):
    fs = ''.join(field(*f, color) for f in fields)
    return f'''<div style="position:relative;flex:1 1 0;min-width:0;background:#fff;border-radius:6px;box-shadow:0 0 0 1.5px {INK},3px 3px 0 1.5px {INK};overflow:hidden;">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;padding:9px 10px;background:{color};">
                <span style="{F}font-size:14px;font-weight:900;letter-spacing:.02em;line-height:16px;color:#fff;white-space:nowrap;">{name}</span>
                <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;{F}font-size:10.5px;font-weight:700;line-height:14px;{K('_idph')}color:rgba(255,255,255,.9);white-space:nowrap;">{ph}</span>
              </div>
              <div style="padding:2px 10px 2px;">
                <div style="padding:6px 0 7px;line-height:10px;">{cap(en, 8, .2, LN, 800)}</div>
                {fs}
              </div>
            </div>'''

S2 = slide(1, f'''
          {title('Roster', '사선 인원', '<span style="margin-left:auto;">' + cap('MIXED TEAM ♡', 8.5, .16, LN, 800, 'margin-right:-.16em;') + '</span>')}
          <div style="display:flex;gap:10px;margin-top:14px;padding:0 3px 4px 0;">
            {idcard('홍예준', 'MARKSMAN · NO.{{11}}', '{{13}}', AC, [('POSITION', '위치', '{{14}}'), ('STANCE', '자세', '{{16}}'), ('GEAR', '복장', '{{15}}')])}
            {idcard('전하민', 'INTERPRETER', '{{25}}', EVE, [('POSITION', '위치', '{{17}}'), ('STANCE', '자세', '{{19}}'), ('GEAR', '복장', '{{18}}')])}
          </div>''')

def shot(no, label, kr, ph, color, last=False):
    return f'''<div style="display:flex;gap:10px;{'' if last else 'margin-bottom:8px;'}">
            <div style="flex-shrink:0;position:relative;width:44px;border-radius:3px;background:{INK};">
              <span style="position:absolute;left:3px;top:0;bottom:0;width:3px;background:repeating-linear-gradient(180deg,transparent 0 3px,rgba(255,253,248,.85) 3px 7px,transparent 7px 10px);"></span>
              <span style="position:absolute;right:3px;top:0;bottom:0;width:3px;background:repeating-linear-gradient(180deg,transparent 0 3px,rgba(255,253,248,.85) 3px 7px,transparent 7px 10px);"></span>
              <div style="position:absolute;left:9px;right:9px;top:50%;margin-top:-6px;text-align:center;line-height:12px;">{cap(no, 9, .02, color, 900, 'line-height:12px;')}</div>
            </div>
            <div style="flex:1;min-width:0;padding:8px 10px;border-radius:4px;background:#fff;box-shadow:0 0 0 1px {LINE};">
              <div style="line-height:10px;">{cap(label, 8.5, .16, color, 800)} {cap('· ' + kr, 8.5, 0, LN, 600)}</div>
              <div style="margin-top:4px;{F}font-size:11.5px;line-height:18px;color:{INK};">{ph}</div>
            </div>
          </div>'''

def note(label, kr, ph):
    return f'''<div style="flex:1 1 160px;padding:10px 12px;border-radius:4px;background:#f3f5f9;box-shadow:inset 0 0 0 1px {LINE};">
              <div style="line-height:10px;">{cap(label, 8.5, .14, AC, 800)} {cap(kr, 8.5, 0, LN, 600)}</div>
              <div style="margin-top:6px;{F}font-size:11.5px;line-height:18px;color:{INK};">{ph}</div>
            </div>'''

name_tag = lambda n, bg, key: tag(n, key, h=20, size=9.5, ls=0, pad=0, bg=bg, fg='#fff', radius=10, outline=False, extra=f'width:{A(key, "w") or 48}px;')
S3 = slide(2, f'''
          {title('Series Plan', '훈련 계획')}
          {sec('COURSE OF FIRE', 'course', '관계 사격 순서 · 밀착 인화', SKY, 14)}
          {shot('01A', 'SERIES 1', '단기', '{{21}}', AC)}
          {shot('02A', 'SERIES 2', '중기', '{{22}}', AC)}
          {shot('03A', 'FINAL', '장기', '{{23}}', EVE, True)}
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;">
            {note('RANGE TIME', '사선 일정', '{{28}}')}
            {note('REQUEST', '홍예준 요청 사항', '{{29}}')}
          </div>
          {sec('RANGE RULES', 'rules', '사선 수칙 · 양측 합의', BUTTER, 20)}
          <div style="position:relative;margin-top:12px;padding:16px 14px 12px;background:#fff;box-shadow:0 0 0 1px {LINE},3px 4px 10px -6px rgba(29,42,61,.35);">
            {tape_piece('left:16px;top:-8px;', -6, 48)}{tape_piece('right:16px;top:-8px;', 6, 48)}
            <div style="{F}font-size:11.5px;line-height:21px;color:{INK};">{{{{20}}}}</div>
            <div style="display:flex;align-items:center;gap:6px;margin-top:10px;padding-top:9px;border-top:1.5px dashed rgba(44,62,87,.25);">
              <span style="margin-right:auto;display:flex;{K('_conf')}">{cap('CONFIRMED', 9, .16, LN, 800)}</span>
              {name_tag('홍예준', AC, 'n1')}{name_tag('전하민', EVE, 'n2')}
            </div>
          </div>''')

S4 = slide(3, f'''
          {title('Misfire', '불발 기록')}
          {sec('UNFIRED PELLET', 'pellet', '장전만 되고 격발되지 않은 한마디', PINK, 14)}
          <div style="position:relative;margin-top:4px;padding:22px 14px;border-radius:4px;background:{INK};">
            <span style="position:absolute;left:0;right:0;top:6px;height:4px;background:repeating-linear-gradient(90deg,transparent 0 4px,rgba(255,253,248,.85) 4px 9px,transparent 9px 13px);"></span>
            <span style="position:absolute;left:0;right:0;bottom:6px;height:4px;background:repeating-linear-gradient(90deg,transparent 0 4px,rgba(255,253,248,.85) 4px 9px,transparent 9px 13px);"></span>
            <div style="position:relative;padding:14px 14px 12px;border-radius:3px;background:#0b111a;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);">
              <div style="display:flex;justify-content:space-between;align-items:center;line-height:10px;">{cap('▶ 00 · NO IMAGE', 8.5, .14, LN, 800)}{cap('미노출', 8.5, .06, EVE, 800, K('_mino'))}</div>
              <div style="margin-top:12px;{F}font-size:13px;line-height:22px;color:#f2f4f7;font-style:italic;">{{{{24}}}}</div>
              <div style="margin-top:10px;text-align:right;line-height:10px;">{cap('SCORE 0.0', 8.5, .14, '#ff8c8f', 800)}</div>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;">
            <span style="line-height:11px;position:relative;top:{A('_st_top', 0)}px;">{cap('STATUS', 9, .14, LN, 800)} {cap('· 격발 보류', 9, 0, SUB, 600)}</span>
            {tag('MISFIRE', 'misfire', h=20, size=9, ls=.14, pad=8, bg=EVE, fg='#fff', radius=3, outline=False)}
          </div>
          <div style="margin-top:10px;text-align:right;{F}font-size:9px;line-height:12px;color:{LN};">* 방아쇠에 손가락만 걸린 채 · 사선 밖으로 반출 금지</div>''')

STAMP_SZ = 40 + A('stamp', 'h')
PAPER_BODY = f'''<div style="margin:0 8px;padding:14px 12px 4px;background:{PAPER};box-shadow:inset 1.5px 0 0 {INK},inset -1.5px 0 0 {INK};">
          <div style="display:flex;gap:20px;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;scrollbar-width:thin;scrollbar-color:rgba(96,124,160,.35) transparent;align-items:flex-start;">
            {S1}
            {S2}
            {S3}
            {S4}
          </div>
        </div>
        <div style="margin:0 8px;padding:12px 14px 14px;background:{PAPER};box-shadow:inset 1.5px 0 0 {INK},inset -1.5px 0 0 {INK},inset 0 -1.5px 0 {INK},0 10px 18px -10px rgba(29,42,61,.4);border-radius:0 0 6px 6px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding-top:12px;border-top:1.5px dashed rgba(44,62,87,.25);">
            <div style="min-width:0;">
              <div style="line-height:11px;{K('_printed')}">{cap('PRINTED AT TEN RING LAB', 9, .16, INK, 900)}</div>
              <div style="margin-top:5px;{F}{NUM}font-size:12px;font-weight:700;letter-spacing:.1em;line-height:14px;color:{EVE};text-shadow:0 0 5px rgba({EVE_RGB},.35);">{{{{3}}}} · {{{{11}}}}A</div>
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
