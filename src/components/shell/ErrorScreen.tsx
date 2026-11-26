'use client';
/**
 * 화면을 그리다 오류가 났을 때 (app/global-error.tsx · app/error.tsx).
 * 예전엔 Next 기본 영어 화면(「This page couldn't load」)만 떠서 무엇이 잘못됐는지 알 수 없었다
 * (사용자 제보 — 아이패드 사파리에서 EVEDEN → YJHM으로 넘어가면 이 화면이 떴다).
 *
 * 1. 처음 한 번은 조용히 다시 불러온다 — 고른 세계는 저장돼 있어 다시 불러오면 대개 그대로 열린다.
 * 2. 다시 불러온 뒤에도 곧바로 또 나면 오류 이유를 보여 준다 — 사용자가 이 화면을 찍어 보내면 원인을 고칠 수 있게.
 * 사이트 CSS가 없을 수도 있어서(global-error는 레이아웃 밖에서 그린다) 모양은 모두 이 안에 둔다. 세계마다 색을 따른다.
 */
import React, { useEffect, useState } from 'react';

const RELOAD_KEY = 'ohome.errReload';
const LAST_KEY = 'ohome.lastError';
/** 이 시간 안에 또 나면 「다시 불러와도 안 된다」로 본다 */
const WINDOW_MS = 20000;

const ss = {
  get: (k: string) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { sessionStorage.setItem(k, v); } catch { /* 저장이 막힌 브라우저 */ } },
};

/** 오류 한 줄 + 어디서 났는지 앞쪽 몇 줄 */
const describe = (e: Error & { digest?: string }) => {
  const head = `${e.name || 'Error'}: ${e.message || '(내용 없음)'}`;
  const stack = (e.stack ?? '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith(head)).slice(0, 6).join('\n');
  return { head, stack: [stack, e.digest ? `digest ${e.digest}` : ''].filter(Boolean).join('\n') };
};

export function ErrorScreen({ error }: { error: Error & { digest?: string } }) {
  const [show, setShow] = useState(false);
  const [yj, setYj] = useState(false);
  const { head, stack } = describe(error);

  useEffect(() => {
    let y = false;
    try { y = localStorage.getItem('ohome.world.v1') === 'yjhm'; } catch { /* */ }
    setYj(y);
    // 사이트 밖에서 그리는 오류 문서(global-error)에도 세계 표시를 달아 딱지 맞춤(TagAlign)이 같은 규칙으로 돈다
    if (y) document.documentElement.classList.add('ui-yjhm');
    console.error(error);
    const last = Number(ss.get(RELOAD_KEY)) || 0;
    if (Date.now() - last > WINDOW_MS) {
      ss.set(RELOAD_KEY, String(Date.now()));
      ss.set(LAST_KEY, `${head}\n${stack}`);
      window.location.reload();
      return;
    }
    setShow(true);
  }, [error, head, stack]);

  // 다시 불러오는 동안은 빈 화면 — 영어 기본 화면이 번쩍이지 않게
  if (!show) return <div style={{ minHeight: '100vh', background: yj ? '#eef0f3' : '#0b0e13' }} />;

  const c = yj
    ? { bg: '#eef0f3', box: '#fff', line: 'rgba(96,124,160,.35)', ink: '#1d2a3d', sub: '#5d6f88', tag: '#2c3e57', tagInk: '#f2f4f7', code: '#f3f5f8', btn: '#1d2a3d', btnInk: '#fff' }
    : { bg: '#0b0e13', box: '#10141b', line: '#2a323e', ink: '#e8edf3', sub: '#8e99a8', tag: 'transparent', tagInk: '#d11c20', code: '#0b0e13', btn: '#607ca0', btnInk: '#e8edf3' };
  const mono = "'DM Mono','JetBrains Mono',ui-monospace,Menlo,monospace";
  const sans = "'Pretendard Variable',Pretendard,-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif";
  // 버튼 — 폭 · 높이를 정수로 고정하고 글자는 상자 가운데에 (두 폭의 합이 짝수 → 줄 전체도 정수 자리).
  // 높이 · 문구 · 왼쪽 0.5px는 100% 배율 화면을 찍어 글자 잉크가 상자 한가운데(차 0.5px 미만)에 오는 값으로 골랐다
  const btn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', height: 39, padding: 0, font: `500 13px/1 ${sans}`, cursor: 'pointer' };
  const goEveden = () => { try { localStorage.setItem('ohome.world.v1', 'eveden'); } catch { /* */ } window.location.replace('/'); };

  return (
    // 모든 높이 · 폭을 정수 px로 — 가운데 정렬로 상자가 0.5px에 걸리면 글자가 화면 픽셀 단위로만 움직여 가운데에 못 온다.
    // 그래서 위아래 가운데 대신 위에서 일정한 자리에 둔다
    <div style={{ minHeight: '100vh', boxSizing: 'border-box', padding: '96px 16px 16px', background: c.bg, color: c.ink, fontFamily: sans }}>
      <div style={{ maxWidth: 520, margin: '0 auto', boxSizing: 'border-box', border: `1px solid ${c.line}`, background: c.box, padding: '30px 24px', textAlign: 'center' }}>
        {yj ? (
          // SCRAP · GUESTBOOK과 같은 남색 테이프 (yjhm.css .yj-tape) — 사이트 CSS가 없을 때도 같게 보이도록 값을 그대로 둔다.
          // 자간 끝 여백은 오른쪽 padding에서 빼 글자를 가운데에 두고, 레이아웃 안에서는 딱지 맞춤(TagAlign)이 화면 픽셀에 붙인다
          <div className="yj-err" style={{ marginBottom: 16 }}>
            <b className="yj-tape" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', height: 24, padding: '0 calc(11px - .22em) 0 11px', borderRadius: 2, background: c.tag, color: c.tagInk, font: `500 11px/1 ${mono}`, letterSpacing: '.22em', whiteSpace: 'nowrap' }}>
              PAGE ERROR
            </b>
          </div>
        ) : (
          <div style={{ fontFamily: mono, fontSize: 11, lineHeight: '20px', letterSpacing: '.24em', textIndent: '.24em', color: c.tagInk, marginBottom: 16 }}>
            SYSTEM FAULT
          </div>
        )}
        <h1 style={{ fontSize: 18, lineHeight: '26px', fontWeight: 700, margin: '0 0 10px' }}>화면을 그리다 문제가 생겼습니다</h1>
        <p style={{ fontSize: 13.5, lineHeight: '24px', margin: '0 0 18px', color: c.sub }}>
          다시 불러와도 같은 문제가 나서 멈췄습니다.<br />아래 내용을 화면째 찍어 관리자에게 보내 주세요.
        </p>
        <pre style={{ textAlign: 'left', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: mono, fontSize: 11.5, lineHeight: '18px', margin: '0 0 20px', padding: '12px 14px', background: c.code, border: `1px solid ${c.line}`, color: c.ink, maxHeight: 220, overflow: 'auto' }}>
          {head}{stack ? `\n${stack}` : ''}
        </pre>
        <div className="yj-err-act" style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => window.location.reload()}
            style={{ ...btn, width: 112, paddingLeft: 0.5, border: `1px solid ${c.btn}`, background: c.btn, color: c.btnInk }}>
            다시 불러오기
          </button>
          {yj && (
            <button type="button" onClick={goEveden}
              style={{ ...btn, width: 108, border: `1px solid ${c.line}`, background: 'transparent', color: c.ink }}>
              EVEDEN으로
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
