'use client';
import { getSetting, setSetting } from './settingStore';

const KEY = 'ohome.splash.v1';
const SESSION_KEY = 'ohome.splash.seen';

export interface SplashConf {
  enabled: boolean;
  bgBlobId?: string;
  targetX: number;
  targetY: number;
  targetSize: number;
  targetLabel?: string;
  /** 조준 시 출력되는 SF 프로필 */
  profileOn: boolean;
  profileName: string;
  profileSub: string;
  /** 한 줄에 하나 — "항목 | 값" */
  profileRows: string;
}

const DEFAULTS: SplashConf = {
  enabled: false,
  targetX: 50,
  targetY: 50,
  targetSize: 60,
  profileOn: true,
  profileName: 'EVE',
  profileSub: 'AGENT · A-CLASS SENTINEL',
  profileRows: 'NAME | JEON HAMIN\nATTR | PYRE\nAGE | 26\nFILE | AGENT-PYRE-02\nSTATUS | BERSERK',
};

export function getSplashConf(): SplashConf {
  return { ...DEFAULTS, ...getSetting<Partial<SplashConf>>(KEY, DEFAULTS) };
}

export function setSplashConf(v: Partial<SplashConf>): void {
  setSetting(KEY, { ...getSplashConf(), ...v });
}

export function splashSeenThisSession(): boolean {
  try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return false; }
}

export function markSplashSeen(): void {
  try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* */ }
}
