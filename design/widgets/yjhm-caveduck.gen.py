# YJHM 케이브덕 위젯 생성기 — python3 design/widgets/yjhm-caveduck.gen.py 로 yjhm-caveduck.html을 다시 만든다.
# 정렬 보정값(너비 · 위아래 · 높이)은 yjhm-caveduck.adj.json — 100% 배율에서 글자 잉크를 픽셀 단위로 재서 맞춘 값
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ADJ = json.load(open(os.environ.get('YJ_ADJ', os.path.join(HERE, 'yjhm-caveduck.adj.json'))))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'yjhm-caveduck.html')

SANS = "'Pretendard Variable','Pretendard','Noto Sans KR',-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Segoe UI',sans-serif"
TITLE = "'Inter','Pretendard Variable','Pretendard',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
F = f"font-family:{SANS};"
FT = f"font-family:{TITLE};"
NUM = "font-variant-numeric:tabular-nums;"
INK, NV2, AC, SUB, FAINT, LN = '#1d2a3d', '#2c3e57', '#607ca0', '#4a5a70', '#6c7a8c', '#9fb0c6'
HAIR = 'rgba(96,124,160,.3)'

def adj(key):
    a = ADJ.get(key, {})
    return a.get('w'), a.get('t', 0)
def dh(key):
    return ADJ.get(key, {}).get('h', 0)

def cap(text, size=9, ls=.14, color=AC, w=600, extra=''):
    """영문 작은 머리글 — 글줄 높이 정수 px"""
    return f'<span style="{F}{NUM}font-size:{size}px;font-weight:{w};letter-spacing:{ls}em;color:{color};line-height:{round(size) + 1}px;white-space:nowrap;{extra}">{text}</span>'

def tape(text, key, h=20, size=9, ls=.14, pad=8, bg=NV2, fg='#f2f4f7', extra='', shadow=True):
    """라벨 테이프 — 고정 글자는 정수 너비(adj) · 글자 간격 끝 여백은 왼쪽 padding으로 상쇄"""
    w, t = adj(key)
    sh = 'box-shadow:0 1px 3px rgba(20,30,48,.25),inset 0 1px 0 rgba(255,255,255,.12);' if shadow else ''
    if w:
        box = f'width:{w}px;padding:{t}px 0 0 {ls}em;' if t >= 0 else f'width:{w}px;padding:0 0 {-t}px {ls}em;'
    else:
        box = f'padding:{max(t,0)}px calc({pad}px - {ls}em) {max(-t,0)}px {pad}px;'
    return (f'<span data-c="{key}" style="flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;height:{h + dh(key)}px;{box}'
            f'border-radius:2px;background:{bg};color:{fg};{F}font-size:{size}px;font-weight:600;letter-spacing:{ls}em;line-height:{round(size)+1}px;white-space:nowrap;{sh}{extra}">{text}</span>')

def sec(label, key, sub):
    return f'''<div style="display:flex;align-items:center;gap:8px;margin:20px 0 10px;">
              {tape(label, key)}
              <span style="position:relative;top:-1px;min-width:0;overflow:hidden;text-overflow:ellipsis;{F}font-size:10px;font-weight:500;color:{FAINT};line-height:12px;white-space:nowrap;">{sub}</span>
              <span style="flex:1;min-width:8px;height:1px;background:{HAIR};"></span>
            </div>'''

TABS = [('01', 'BRIEFING'), ('02', 'ROSTER'), ('03', 'PLAN'), ('04', 'MISFIRE')]
def tabs(on):
    out = []
    for i, (n, name) in enumerate(TABS):
        if i == on:
            w, t = adj(f'tab-{name}')
            out.append(f'<span data-c="tab" style="flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;{f"width:{w}px;" if w else ""}height:31px;padding:{max(t,0)}px {"0" if w else "calc(12px - .14em)"} {max(-t,0)}px {".14em" if w else "12px"};border-radius:6px 6px 0 0;background:#fff;{F}font-size:9.5px;font-weight:600;letter-spacing:.14em;line-height:11px;color:{INK};white-space:nowrap;box-shadow:0 -4px 12px rgba(44,62,87,.06);"><span style="color:{AC};margin-right:7px;">{n}</span>{name}</span>')
        else:
            w, t = adj(f'tab-{n}')
            out.append(f'<span data-c="tab" style="flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;width:{w or 34}px;height:27px;padding:{max(t,0)}px 0 {max(-t,0)}px .14em;border-radius:6px 6px 0 0;background:#dfe4eb;{F}font-size:9.5px;font-weight:600;letter-spacing:.14em;line-height:11px;color:#5d6e84;">{n}</span>')
    hint = '‹ BACK' if on == 3 else 'SWIPE ›'
    out.append(f'<span style="margin-left:auto;align-self:center;{F}font-size:8.5px;font-weight:600;letter-spacing:.14em;color:{LN};line-height:10px;white-space:nowrap;">{hint}</span>')
    return f'''<div style="position:sticky;top:0;z-index:2;flex-shrink:0;display:flex;align-items:flex-end;gap:3px;height:31px;background:#eef0f3;">
            {"".join(out)}
          </div>'''

def slide(on, title, kr, body, right=''):
    radius = ['0 6px 6px 6px', '6px', '6px', '6px'][on]
    return f'''<div style="flex:0 0 100%;min-width:0;scroll-snap-align:start;box-sizing:border-box;height:470px;overflow-y:auto;overscroll-behavior-y:contain;display:flex;flex-direction:column;scrollbar-width:thin;scrollbar-color:rgba(96,124,160,.35) transparent;">
          {tabs(on)}
          <div style="flex:1 0 auto;background:#fff;border-radius:{radius};padding:16px 16px 18px;box-shadow:0 0 0 1px rgba(44,62,87,.07);">
            <div style="display:flex;align-items:baseline;gap:9px;padding-bottom:11px;border-bottom:1px solid {HAIR};">
              <span style="{FT}font-size:20px;font-weight:700;letter-spacing:-.05em;color:{INK};line-height:20px;">{title}<span style="color:{AC};">.</span></span>
              <span style="{F}font-size:11px;font-weight:600;color:{SUB};line-height:13px;">{kr}</span>{right}
            </div>
            {body}
          </div>
        </div>'''

def field(label, kr, ph, color=AC):
    return f'''<div style="padding:9px 0 8px;border-top:1px solid rgba(44,62,87,.1);">
                    <div style="margin-bottom:6px;line-height:10px;">{cap(label, 8.5, .14, color)} {cap(kr, 8.5, 0, LN, 500)}</div>
                    <div style="{F}font-size:11.5px;line-height:18px;color:{INK};">{ph}</div>
                  </div>'''

def person(name, ph_tag, color, fields, key):
    w, t = adj(key)
    return f'''<div style="flex:1 1 0;min-width:0;border-radius:3px;overflow:hidden;box-shadow:0 0 0 1px rgba(44,62,87,.12);">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 10px;background:{color};color:#fff;">
                  <span style="{F}font-size:14px;font-weight:700;letter-spacing:.02em;line-height:16px;white-space:nowrap;">{name}</span>
                  <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;{F}font-size:{ADJ.get('_tag_fs', 10.5)}px;font-weight:600;letter-spacing:.02em;line-height:{ADJ.get('_tag_lh', 14)}px;position:relative;top:{ADJ.get('_tag_top', 0)}px;color:rgba(255,255,255,.88);white-space:nowrap;text-align:right;">{ph_tag}</span>
                </div>
                <div style="padding:2px 10px 4px;">
                  {''.join(field(*f, color=AC if color == AC else NV2) for f in fields).replace('border-top:1px solid rgba(44,62,87,.1);', 'border-top:0;', 1)}
                </div>
              </div>'''

ring_m = lambda c, w: f'<span style="position:absolute;left:0;top:0;width:14px;height:14px;border-radius:50%;box-sizing:border-box;background:repeating-radial-gradient(circle,{c} 0 {w}px,#fff {w}px 3px);box-shadow:0 0 0 1px {c};"></span>'
def step(label, kr, ph, color, marker, line=True):
    ln = f'<span style="position:absolute;left:6.5px;top:15px;bottom:0;width:1px;background:rgba(96,124,160,.35);"></span>' if line else ''
    return f'''<div style="position:relative;padding:0 0 {14 if line else 0}px 26px;">
              {ln}{marker}
              <div style="line-height:14px;">{cap(label, 9, .14, color, 600, 'line-height:14px;')} {cap('· ' + kr, 9, 0, LN, 500, 'line-height:14px;')}</div>
              <div style="{F}font-size:11.5px;line-height:20px;color:{INK};margin-top:3px;">{ph}</div>
            </div>'''

def box(label, kr, ph):
    return f'''<div style="flex:1 1 170px;padding:10px 12px;background:#f4f6f9;border-radius:2px;box-shadow:0 0 0 1px rgba(44,62,87,.08);">
                <div style="margin-bottom:7px;line-height:10px;">{cap(label, 8.5)} {cap(kr, 8.5, 0, LN, 500)}</div>
                <div style="{F}font-size:11.5px;line-height:18px;color:{INK};">{ph}</div>
              </div>'''

name_tag = lambda n, bg, key: f'<span data-c="{key}" style="display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;width:{adj(key)[0] or 46}px;height:{20 + dh(key)}px;padding:{max(adj(key)[1],0)}px 0 {max(-adj(key)[1],0)}px;border-radius:2px;background:{bg};color:#fff;{F}font-size:9.5px;font-weight:700;line-height:11px;white-space:nowrap;">{n}</span>'

NSFW_MT = ADJ.get('_nsfw_mt', 0)
S1 = slide(0, 'Briefing', '사선 개요', f'''
            <div style="display:flex;align-items:center;gap:12px;margin-top:14px;padding:10px 12px;background:#f4f6f9;border-radius:2px;box-shadow:inset 3px 0 0 {AC};">
              <div style="flex-shrink:0;width:46px;height:19px;background:linear-gradient(180deg,#9fb0c6 0%,{AC} 45%,{NV2} 100%);clip-path:polygon(0 12%,3% 12%,3% 2%,7% 2%,7% 12%,80% 12%,80% 0,86% 0,86% 12%,100% 12%,100% 40%,96% 42%,100% 100%,77% 100%,71% 46%,64% 46%,64% 64%,52% 64%,50% 46%,40% 46%,40% 32%,0 32%);-webkit-clip-path:polygon(0 12%,3% 12%,3% 2%,7% 2%,7% 12%,80% 12%,80% 0,86% 0,86% 12%,100% 12%,100% 40%,96% 42%,100% 100%,77% 100%,71% 46%,64% 46%,64% 64%,52% 64%,50% 46%,40% 46%,40% 32%,0 32%);"></div>
              <div style="flex:1;min-width:0;">
                <div style="line-height:{ADJ.get('_air_lh', 13)}px;">{cap('10M AIR PISTOL', 11, .1, INK, 700, 'line-height:' + str(ADJ.get('_air_lh', 13)) + 'px;')}</div>
                <div style="{F}font-size:10px;color:{FAINT};margin-top:5px;line-height:12px;">10m 공기권총 · 4.5mm 펠릿 · 60발</div>
              </div>
              {tape('NSFW {{12}}', 'nsfw', bg='#fff', fg=NV2, shadow=False, size=8.5, pad=7, extra='margin-top:'+str(NSFW_MT)+'px;box-shadow:0 0 0 1px rgba(44,62,87,.18);')}
            </div>
            {sec('SPOTTER NOTE', 'spotter', '관측수 기록')}
            <div style="display:flex;align-items:baseline;gap:12px;padding:4px 0 8px;border-bottom:1px solid rgba(44,62,87,.1);margin-bottom:10px;">
              {cap('RELATION', 9)}
              <span style="min-width:0;{F}font-size:11.5px;font-weight:600;line-height:18px;color:{INK};">{{{{30}}}}</span>
            </div>
            <div style="{F}font-size:12px;line-height:22px;color:{NV2};">{{{{5}}}}</div>
            {sec('BREATH HOLD', 'breath', '한 손 조준 · 숨을 멈춘 사이의 의식 흐름')}
            <div style="padding:11px 14px;border-radius:4px 14px 14px 14px;background:#f4f6f9;box-shadow:0 0 0 1px rgba(44,62,87,.1);{F}font-size:12px;line-height:22px;color:{INK};font-style:italic;">{{{{26}}}}</div>
            <div style="margin-top:8px;text-align:right;{F}font-size:9px;color:{LN};line-height:12px;">* 방아쇠 1차 압력 ~ 격발 사이 · 원문 그대로 기록</div>''')

S2 = slide(1, 'Roster', '사선 인원', f'''
            <div style="display:flex;gap:8px;margin-top:14px;">
              {person('홍예준', '{{13}}', AC, [('POSITION', '위치', '{{14}}'), ('STANCE', '자세', '{{16}}'), ('GEAR', '복장', '{{15}}')], 'tag13')}
              {person('전하민', '{{25}}', NV2, [('POSITION', '위치', '{{17}}'), ('STANCE', '자세', '{{19}}'), ('GEAR', '복장', '{{18}}')], 'tag25')}
            </div>''', right=f'<span style="margin-left:auto;">{cap("MIXED TEAM", 9, .14, LN)}</span>')

S3 = slide(2, 'Series Plan', '훈련 계획', f'''
            {sec('COURSE OF FIRE', 'course', '관계 사격 순서').replace('margin:20px 0 10px', 'margin:16px 0 12px')}
            {step('SERIES 1', '단기', '{{21}}', '#7d92ae', ring_m(LN, 1))}
            {step('SERIES 2', '중기', '{{22}}', AC, ring_m(AC, 1.5))}
            {step('FINAL', '장기', '{{23}}', INK, f'<span style="position:absolute;left:0;top:0;width:14px;height:14px;border-radius:50%;box-sizing:border-box;background:radial-gradient(circle,#fff 0 1.5px,{INK} 2px 3.5px,#fff 4px 5px,{INK} 5.5px);box-shadow:0 0 0 3px rgba(44,62,87,.12);"></span>', line=False)}
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:18px;">
              {box('RANGE TIME', '사선 일정', '{{28}}')}
              {box('REQUEST', '홍예준 요청 사항', '{{29}}')}
            </div>
            {sec('RANGE RULES', 'rules', '사선 수칙 · 양측 합의')}
            <div style="padding:12px;border-radius:2px;background-color:#fff;background-image:radial-gradient(rgba(96,124,160,.16) .8px,transparent 1.3px);background-size:6px 6px;box-shadow:0 0 0 1px rgba(44,62,87,.12);">
              <div style="padding:8px 10px;background:rgba(255,255,255,.94);{F}font-size:11.5px;line-height:21px;color:{INK};">{{{{20}}}}</div>
              <div style="display:flex;align-items:center;gap:6px;margin-top:10px;padding-top:9px;border-top:1px dashed rgba(96,124,160,.4);">
                <span style="margin-right:auto;line-height:10px;position:relative;top:{ADJ.get('_conf_top', 0)}px;">{cap('CONFIRMED', ADJ.get('_conf_fs', 8.5), .16, '#7d92ae')}</span>
                {name_tag('홍예준', AC, 'n1')}
                {name_tag('전하민', NV2, 'n2')}
              </div>
            </div>''')

S4 = slide(3, 'Misfire', '불발 기록', f'''
            {sec('UNFIRED PELLET', 'pellet', '장전만 되고 격발되지 않은 한마디').replace('margin:20px 0 10px', 'margin:16px 0 12px')}
            <div style="padding:12px 14px 13px;border-radius:2px;background:#f4f6f9;box-shadow:0 0 0 1px rgba(44,62,87,.08);">
              <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:9px;border-bottom:1px solid rgba(44,62,87,.1);line-height:11px;">
                {cap(f'<span style="color:{AC};">●</span> LOADED', 9, .14, '#7d92ae')}
                {cap(f'SCORE <span style="color:{INK};">0.0</span>', 9, .14, '#7d92ae')}
              </div>
              <div style="display:flex;align-items:center;gap:8px;margin:16px 2px 8px;">
                <div style="flex-shrink:0;display:flex;align-items:center;">
                  <span style="display:block;width:8px;height:9px;background:linear-gradient(180deg,#c3cfdd,{AC});clip-path:polygon(0 0,100% 30%,100% 70%,0 100%);-webkit-clip-path:polygon(0 0,100% 30%,100% 70%,0 100%);"></span>
                  <span style="display:block;width:2px;height:4px;background:#7d92ae;"></span>
                  <span style="display:block;width:6px;height:7px;background:linear-gradient(180deg,#dfe6ef,{AC});border-radius:0 4px 4px 0;"></span>
                </div>
                <span style="flex:1;height:0;border-top:1px dashed rgba(96,124,160,.55);"></span>
                {tape('✕ DRY', 'dry', h=18, size=8.5, pad=6, bg='#fff', fg=NV2, shadow=False, extra='box-shadow:0 0 0 1px rgba(44,62,87,.18);')}
                <span style="flex:1;height:0;border-top:1px dashed rgba(96,124,160,.22);"></span>
                <span style="flex-shrink:0;display:block;width:24px;height:24px;border-radius:50%;background:radial-gradient(circle,{NV2} 0 5px,transparent 5.5px),repeating-radial-gradient(circle,transparent 0 3px,rgba(96,124,160,.45) 3px 4px);box-shadow:0 0 0 1px rgba(96,124,160,.3);"></span>
              </div>
              <div style="display:flex;justify-content:space-between;line-height:10px;">
                {cap(f'4.5MM PELLET · <span style="color:{AC};">장전</span>', 8, .08, LN, 600)}
                {cap('TARGET · 탄착 없음', 8, .08, LN, 600)}
              </div>
              <div style="position:relative;margin-top:16px;padding:13px 16px 13px 30px;border-radius:14px 14px 4px 14px;background:{INK};box-shadow:0 8px 18px -8px rgba(29,42,61,.55);">
                <span style="position:absolute;left:11px;top:9px;{FT}font-size:26px;font-weight:700;line-height:26px;color:{AC};">“</span>
                <div style="{F}font-size:12.5px;line-height:23px;color:#f2f4f7;font-style:italic;">{{{{24}}}}</div>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:9px;border-top:1px dashed rgba(96,124,160,.4);">
                <span style="line-height:{ADJ.get('_st_lh', 11)}px;position:relative;top:{ADJ.get('_st_top', 0)}px;">{cap('STATUS', 9, .14, LN)} {cap('· 격발 보류', 9, 0, SUB, 500)}</span>
                {tape('MISFIRE', 'misfire')}
              </div>
            </div>
            <div style="margin-top:8px;text-align:right;{F}font-size:9px;color:{LN};line-height:12px;">* 방아쇠에 손가락만 걸린 채 · 사선 밖으로 반출 금지</div>''')

perf = "background:repeating-linear-gradient(90deg,transparent 0 4px,#eef0f3 4px 10px,transparent 10px 14px);"
edge = lambda t: f'<span>{t}</span>'
# 맨 위 가장자리 — 곧은 35mm 필름 띠 (구멍 줄 사이에 가장자리 인쇄만)
FILM = f'''<div style="position:relative;height:26px;background:{INK};">
      <div style="position:absolute;left:0;right:0;top:3px;height:4px;{perf}"></div>
      <div style="position:absolute;left:0;right:0;bottom:3px;height:4px;{perf}"></div>
      <div style="position:absolute;left:16px;right:16px;top:9px;display:flex;justify-content:space-between;align-items:center;gap:16px;{F}{NUM}font-size:7px;font-weight:600;letter-spacing:.16em;color:#c9cfd6;line-height:8px;white-space:nowrap;overflow:hidden;">
        {edge('TEN RING 400')}{edge('▶ 11A')}<span style="flex-shrink:0;display:inline-block;width:30px;height:6px;opacity:.7;background:repeating-linear-gradient(90deg,#c9cfd6 0 3px,transparent 3px 5px,#c9cfd6 5px 6px,transparent 6px 10px);"></span>{edge('SAFETY FILM')}{edge('▶ 12')}
      </div>
    </div>'''

# 10m 공기권총 표적 — 흰 바탕 링 + 검은 조준 구역 + 탄흔 세 개
hole = lambda x, y: f'<span style="position:absolute;left:{x}px;top:{y}px;width:6px;height:6px;border-radius:50%;background:#f2f4f7;box-shadow:0 0 0 1px #fff,0 0 0 2.5px rgba(96,124,160,.55),inset 0 1px 2px rgba(29,42,61,.6);"></span>'
TARGET = f'''<div style="position:relative;flex-shrink:0;width:108px;height:108px;border-radius:50%;background:#fff;box-shadow:0 0 0 1px rgba(44,62,87,.14),0 10px 22px rgba(44,62,87,.14);">
            <span style="position:absolute;inset:5px;border-radius:50%;background:repeating-radial-gradient(circle,transparent 0 8.5px,rgba(44,62,87,.42) 8.5px 9.3px);"></span>
            <span style="position:absolute;inset:21px;border-radius:50%;background:{INK};box-shadow:0 0 0 3px #fff,0 0 0 4px rgba(44,62,87,.35);"></span>
            <span style="position:absolute;inset:21px;border-radius:50%;background:repeating-radial-gradient(circle,transparent 0 8.5px,rgba(255,255,255,.45) 8.5px 9.3px);"></span>
            <span style="position:absolute;left:53.5px;top:0;bottom:0;width:1px;background:linear-gradient({AC} 0 14%,transparent 14% 86%,{AC} 86%);opacity:.7;"></span>
            <span style="position:absolute;top:53.5px;left:0;right:0;height:1px;background:linear-gradient(90deg,{AC} 0 14%,transparent 14% 86%,{AC} 86%);opacity:.7;"></span>
            {hole(49, 46)}{hole(60, 55)}{hole(42, 61)}
          </div>'''

def info(label, ph, last=False, val_style=''):
    return f'''<div style="display:flex;align-items:center;gap:12px;min-height:34px;padding:0 14px;{'' if last else 'border-bottom:1px solid rgba(44,62,87,.08);'}">
            <span style="position:relative;top:-1px;flex-shrink:0;width:30px;{F}font-size:10px;font-weight:600;color:{AC};line-height:12px;">{label}</span>
            <span style="min-width:0;padding:8px 0;{F}font-size:12px;line-height:18px;color:{INK};{val_style}">{ph}</span>
          </div>'''

HTML = f'''<div style="width:100%;max-width:520px;margin:16px auto;color:{INK};word-break:keep-all;line-height:1.5;{F}">
  <div style="position:relative;overflow:hidden;background-color:#eef0f3;background-image:repeating-radial-gradient(circle at 74px 102px,transparent 0 64px,rgba(96,124,160,.12) 64px 65px);border-radius:6px;box-shadow:0 0 0 1px rgba(44,62,87,.1),0 18px 40px rgba(44,62,87,.14);">

    <!-- ===== 맨 위 필름 가장자리 ===== -->
    {FILM}

    <details>
      <summary style="list-style:none;cursor:pointer;user-select:none;padding:22px 20px 20px;">
        <!-- 표적 + 제목 -->
        <div style="display:flex;align-items:center;gap:20px;">
          {TARGET}
          <div style="min-width:0;">
            <div style="line-height:10px;">{cap('TEN RING', 8.5, .2)}</div>
            <div style="margin-top:9px;{F}font-size:26px;font-weight:800;letter-spacing:-.04em;color:{INK};line-height:30px;">격발 기록지<span style="color:{AC};">.</span></div>
            <div style="margin-top:8px;{F}font-size:11px;font-weight:500;color:{SUB};line-height:14px;">국가대표 사격팀 · {{{{11}}}}번 레인</div>
          </div>
        </div>
        <!-- 정보 칸 -->
        <div style="margin-top:20px;background:#fff;border-radius:4px;box-shadow:0 0 0 1px rgba(44,62,87,.1),0 6px 16px -8px rgba(44,62,87,.18);">
          {info('일시', '{{3}} {{4}}', val_style=NUM + 'color:' + NV2 + ';font-weight:600;')}
          {info('장소', '{{1}}', val_style='font-weight:700;')}
          {info('상황', '{{2}}', last=True, val_style='color:' + SUB + ';')}
        </div>
        <!-- 장전 버튼 -->
        <div style="display:flex;margin-top:12px;">
          {tape('LOAD RECORD', 'load', h=36, size=10.5, ls=.22, pad=14, extra='flex:1;border-radius:3px;')}
        </div>
      </summary>

      <!-- ===== 슬라이더 — 바인더 인덱스 탭 + 흰 종이 ===== -->
      <div style="display:flex;gap:24px;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;padding:0 20px 16px;scroll-padding:0 20px;scrollbar-width:thin;scrollbar-color:rgba(96,124,160,.35) transparent;align-items:flex-start;">

        <!-- ===== S1 사선 개요 ===== -->
        {S1}

        <!-- ===== S2 사선 인원 ===== -->
        {S2}

        <!-- ===== S3 훈련 계획 ===== -->
        {S3}

        <!-- ===== S4 불발 기록 ===== -->
        {S4}
      </div>

      <!-- ===== 꼬리 ===== -->
      <div style="display:flex;align-items:center;gap:10px;padding:4px 20px 0;line-height:10px;">
        <span style="flex:1;height:1px;background:{HAIR};"></span>
        {cap('CEASE FIRE', 8.5, .3, '#7d92ae', 600, 'margin-right:-.3em;')}
        <span style="flex:1;height:1px;background:{HAIR};"></span>
      </div>
      <div style="text-align:center;margin-top:7px;line-height:10px;">{cap(f'<span style="color:{AC};">■</span> SCORE CONFIRMED · 사격 중지, 기록 확정', 8, .06, LN, 500)}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:14px;padding:13px 20px 16px;border-top:1px solid {HAIR};">
        <div style="min-width:0;">
          <div style="{FT}font-size:16px;font-weight:700;letter-spacing:-.05em;color:{INK};line-height:16px;">Ten Ring<span style="color:{AC};">.</span></div>
          <div style="margin-top:6px;{F}{NUM}font-size:8.5px;font-weight:500;letter-spacing:.06em;color:{LN};line-height:14px;">LANE NO.{{{{11}}}} · 10M AIR PISTOL RANGE<br>선수촌 보관 · 외부 반출 금지</div>
        </div>
        <span data-c="stamp" style="flex-shrink:0;display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:{34 + dh('stamp')}px;height:{34 + dh('stamp')}px;padding:{max(adj('stamp')[1],0)}px 0 {max(-adj('stamp')[1],0)}px {adj('stamp')[0] or 0}px;border-radius:50%;border:1.3px solid {AC};box-shadow:inset 0 0 0 3px #eef0f3,inset 0 0 0 4px rgba(96,124,160,.45);color:{AC};{F}{NUM}font-size:9.5px;font-weight:700;line-height:11px;transform:rotate(-12deg);">10.9</span>
      </div>
    </details>
  </div>
</div>
'''
open(OUT, 'w', encoding='utf-8').write(HTML)
print('wrote', OUT, len(HTML))
