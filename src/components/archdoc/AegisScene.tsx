'use client';
/**
 * 아이기스 3D 지도의 무대 (aegis3d/world.ts를 띄우는 React 껍데기).
 * three는 무거워서 이 무대가 화면에 붙을 때 따로 불러온다(동적 import). WebGL이 안 되면 안내 문구만.
 * 이름표(children — data-k 달린 요소)는 React가 그리고, 자리는 world가 매 프레임 옮긴다.
 */
import React, { useEffect, useRef, useState } from 'react';
import type { AegisView } from '@/lib/aegisMap';
import type { AegisWorld, View } from './aegis3d/world';

export function AegisScene({ view, sel, color, live, go, pick, children }: {
  view: View; sel: string | null; color?: string; live: string[];
  go: (v: AegisView) => void; pick: (spot: string) => void; children?: React.ReactNode;
}) {
  const host = useRef<HTMLDivElement>(null);
  const labels = useRef<HTMLDivElement>(null);
  const world = useRef<AegisWorld | null>(null);
  const cb = useRef({ go, pick });
  cb.current = { go, pick };
  const [state, setState] = useState<'load' | 'ok' | 'fail'>('load');
  const init = useRef({ view, sel, color, live });
  init.current = { view, sel, color, live };

  useEffect(() => {
    let dead = false;
    import('./aegis3d/world').then(({ AegisWorld }) => {
      if (dead || !host.current || !labels.current) return;
      try {
        const w = new AegisWorld(host.current, labels.current, { go: v => cb.current.go(v), pick: s => cb.current.pick(s) });
        const i = init.current;
        w.setLive(i.live); w.setView(i.view); w.setSelected(i.sel, i.color);
        world.current = w;
        setState('ok');
      } catch (e) {
        console.error('[AegisScene]', e);
        setState('fail');
      }
    }).catch(e => { console.error('[AegisScene]', e); if (!dead) setState('fail'); });
    return () => { dead = true; world.current?.dispose(); world.current = null; };
  }, []);

  useEffect(() => { world.current?.setView(view); }, [view]);
  useEffect(() => { world.current?.setSelected(sel, color); }, [sel, color]);
  const liveKey = live.join('|');
  useEffect(() => { world.current?.setLive(liveKey ? liveKey.split('|') : []); }, [liveKey]);

  return (
    <div ref={host} className={`am3 is-${state}`}>
      <div ref={labels} className="am3-labels">{state === 'ok' && children}</div>
      {state === 'load' && <div className="am3-msg">INITIALIZING HOLOGRAM…</div>}
      {state === 'fail' && <div className="am3-msg">이 기기에서는 3D 지도를 띄울 수 없습니다. 아래 목록에서 시설을 골라 주세요.</div>}
    </div>
  );
}
