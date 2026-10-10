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
}

const DEFAULTS: SplashConf = {
  enabled: false,
  targetX: 50,
  targetY: 50,
  targetSize: 60,
};

export function getSplashConf(): SplashConf {
  return getSetting<SplashConf>(KEY, DEFAULTS);
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
