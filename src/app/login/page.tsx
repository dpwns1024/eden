'use client';
// 로그인 페이지 (4.8) — 회원정보창 위젯은 버튼만 두고 여기로 이동 (위젯 크기 유지 목적)
// 회원가입(가입코드) · 비밀번호 찾기 포함
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, signupOpen as signupAllowed, loginSkin } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { KInput } from '@/components/ui/Kit';
import { Modal } from '@/components/ui/Modal';
import { EditableDesc } from '@/components/ui/PageText';

export default function LoginPage() {
  const router = useRouter();
  const { user, login, signup, findId, resetPassword, mock } = useAuth();
  const toast = useToast();
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [signupOpen, setSignupOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  // 회원가입 폼
  const [sId, setSId] = useState('');
  const [sPw, setSPw] = useState('');
  const [sNick, setSNick] = useState('');
  const [sEmail, setSEmail] = useState('');   // 가입 이메일 (v1.9 — 아이디 찾기/비번 리셋용)
  const [sCode, setSCode] = useState('');
  const [sErr, setSErr] = useState('');
  // 아이디/비밀번호 찾기
  const [fEmail, setFEmail] = useState('');
  const [fErr, setFErr] = useState('');
  const [fInfo, setFInfo] = useState('');     // 결과 안내 (아이디·임시 비밀번호)

  // 회원가입을 받지 않으면 가입 버튼을 감춘다 (환경설정 → 회원/보안)
  const [canSignup, setCanSignup] = useState(false);
  // 로그인 화면 디자인 (환경설정 → 회원/보안) — ARCH면 각진 어두운 카드 + 요원 말투
  const [arch, setArch] = useState(false);
  useEffect(() => { setCanSignup(signupAllowed()); setArch(loginSkin() === 'arch'); }, []);
  const T = arch
    ? { desc: 'ARCH 정식 요원만 접속할 수 있습니다 — 인가된 계정으로 인증하세요', id: '식별코드', findId: '식별코드 찾기',
        findTitle: mock ? '식별코드·비밀번호 찾기' : '비밀번호 재설정',
        findDesc: mock ? '지급한 단말기로 식별코드를 찾거나 임시 비밀번호를 발급합니다' : '지급한 단말기로 재설정 링크를 보냅니다',
        mail: '단말기 코드 번호', found: '식별코드', cancel: '취소', send: '보내기' }
    : { desc: '로그인 후 멤버 전용 콘텐츠를 열람할 수 있습니다', id: '아이디', findId: '아이디 찾기',
        findTitle: mock ? '아이디·비밀번호 찾기' : '비밀번호 재설정',
        findDesc: mock ? '가입 시 등록한 이메일로 아이디를 찾거나 임시 비밀번호를 발급합니다' : '가입한 이메일로 재설정 링크를 보냅니다',
        mail: '이메일', found: '아이디', cancel: 'CANCEL', send: 'SEND' };
  /* 서버가 돌려준 오류 문구도 ARCH 말투로 — 「이메일 형식이…」 대신 「식별코드가…」 */
  const loginErr = (m: string) => (!arch ? m
    : /이메일 형식/.test(m) ? '식별코드가 올바르지 않습니다.'
    : m.replace(/아이디|이메일/g, '식별코드'));
  const findErr = (m: string) => (!arch ? m
    : /이메일 형식|올바르지 않/.test(m) ? '단말기 코드 번호가 올바르지 않습니다.'
    : m.replace(/이메일/g, '단말기 코드 번호').replace(/아이디/g, '식별코드'));

  // 이미 로그인 상태면 메인으로
  useEffect(() => { if (user) router.replace('/'); }, [user, router]);

  const doLogin = async () => {
    setErr('');
    const r = await login(id.trim(), pw);
    if (!r.ok) { setErr(loginErr(r.error ?? '로그인 실패')); return; }
    toast('로그인되었습니다');
    router.push('/');
  };

  const doSignup = async () => {
    setSErr('');
    // 서버 모드에서는 아이디가 곧 이메일 — 따로 받지 않고 그대로 쓴다
    const r = await signup(sId.trim(), sPw, sNick.trim(), sCode.trim(), (mock ? sEmail : sId).trim());
    if (!r.ok) { setSErr(r.error ?? '가입 실패'); return; }
    setSignupOpen(false);
    toast(mock ? '가입되었습니다 — 만든 계정으로 로그인해 보세요' : '가입되었습니다 — 이메일 인증 후 로그인해 주세요');
  };

  // 아이디 찾기 (v1.9) — 가입 이메일로
  const doFindId = async () => {
    setFErr(''); setFInfo('');
    const r = await findId(fEmail.trim());
    if (!r.ok) { setFErr(findErr(r.error ?? '요청 실패')); return; }
    setFInfo(`${arch ? '식별코드' : '아이디'}: ${r.foundId}`);
  };

  const doFind = async () => {
    setFErr(''); setFInfo('');
    const r = await resetPassword(fEmail.trim());
    if (!r.ok) { setFErr(findErr(r.error ?? '요청 실패')); return; }
    if (r.tempPassword) setFInfo(`임시 비밀번호: ${r.tempPassword} — 로그인 후 마이페이지에서 변경해 주세요`);
    else { setFindOpen(false); toast('재설정 링크를 이메일로 보냈습니다'); }
  };

  return (
    <section className={`page login-page ${arch ? 'login-arch' : ''}`}>
      {/* 타이틀은 카드 안 가운데 정렬 (v1.9 — 메뉴 페이지가 아니라 상단 대제목을 두지 않음) */}
      <div className="panel login-card" style={{ padding: 28, maxWidth: 480, margin: '40px auto 0' }}>
        <h1 style={{
          fontFamily: 'var(--serif)', fontSize: 24, letterSpacing: '.3em', textAlign: 'center',
          margin: '4px 0 6px', color: 'var(--ink)',
        }}>LOGIN</h1>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <EditableDesc k="login-desc" def={T.desc} />
        </div>
        <div style={{ display: 'grid', gap: 9 }}>
          <KInput placeholder={T.id} value={id} onChange={e => setId(e.target.value)} />
          <KInput placeholder="비밀번호" type="password" value={pw} onChange={e => setPw(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') doLogin(); }} />
          {err && <p className="login-err" style={{ fontSize: 11.5, color: 'var(--accent)' }}>{err}</p>}
          <button className="btn btn-dark" style={{ justifyContent: 'center', padding: 10 }} onClick={doLogin}>로그인</button>
        </div>
        <div className="login-sub" style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          {canSignup && (
            <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', padding: 7, fontSize: 11 }}
              onClick={() => setSignupOpen(true)}>회원가입</button>
          )}
          <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', padding: 7, fontSize: 11 }}
            onClick={() => setFindOpen(true)}>비밀번호 찾기</button>
        </div>
        {/* (v1.9) 개발용 기본 계정 안내 제거 — 설치 화면에서 계정을 직접 지정하므로 배포본에는 불필요 */}
      </div>

      {/* 회원가입 모달 (4.8 — 가입코드 방식) */}
      <Modal open={signupOpen} onClose={() => setSignupOpen(false)} small
        title="회원가입" desc="가입코드(초대코드)가 있어야 가입할 수 있습니다"
        dirty={!!(sId || sPw || sNick || sCode)}
        actions={<>
          <button className="btn btn-ghost" onClick={() => setSignupOpen(false)}>CANCEL</button>
          <button className="btn btn-dark" onClick={doSignup}>가입</button>
        </>}>
        <div style={{ display: 'grid', gap: 9 }}>
          <KInput placeholder={mock ? '아이디' : '이메일 (아이디)'} value={sId} onChange={e => setSId(e.target.value)} />
          <KInput placeholder="비밀번호" type="password" value={sPw} onChange={e => setSPw(e.target.value)} />
          <KInput placeholder="닉네임" value={sNick} onChange={e => setSNick(e.target.value)} />
          {/* 서버 모드는 이메일이 곧 아이디라 다시 받지 않는다 (로컬 계정에서만 별도 입력) */}
          {mock && (
            <KInput placeholder="이메일 — 아이디·비밀번호 찾기에 사용" value={sEmail} onChange={e => setSEmail(e.target.value)} />
          )}
          <KInput placeholder="가입코드" value={sCode} onChange={e => setSCode(e.target.value)} />
          {sErr && <p style={{ fontSize: 11.5, color: 'var(--accent)' }}>{sErr}</p>}
        </div>
      </Modal>

      {/* 아이디·비밀번호 찾기 모달 (4.8, v1.9) — 가입 이메일 기준 */}
      <Modal open={findOpen} onClose={() => { setFindOpen(false); setFInfo(''); setFErr(''); }} small
        className={arch ? 'arch-modal' : undefined}
        title={T.findTitle}
        desc={T.findDesc}
        dirty={!!fEmail}
        actions={<>
          <button className="btn btn-ghost" onClick={() => { setFindOpen(false); setFInfo(''); setFErr(''); }}>{T.cancel}</button>
          {/* 서버 모드는 이메일이 곧 아이디라 「아이디 찾기」가 의미 없다 */}
          {mock && <button className="btn btn-ghost" onClick={doFindId}>{T.findId}</button>}
          <button className="btn btn-dark" onClick={doFind}>{mock ? '임시 비밀번호' : T.send}</button>
        </>}>
        <div style={{ display: 'grid', gap: 9 }}>
          <KInput placeholder={T.mail} value={fEmail} onChange={e => setFEmail(e.target.value)} />
          {fErr && <p className="login-err" style={{ fontSize: 11.5, color: 'var(--accent)' }}>{fErr}</p>}
          {fInfo && <p className="login-info" style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 600 }}>{fInfo}</p>}
        </div>
      </Modal>
    </section>
  );
}
