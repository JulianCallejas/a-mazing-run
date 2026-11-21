import { describe, expect, it } from 'vitest';
import { getInstallMode, isIosDevice } from './installMode';

const base = { hasDeferredPrompt: false, standalone: false, ios: false, hintDismissed: false };

describe('getInstallMode', () => {
  it('offers the native prompt when the browser provided one', () => {
    expect(getInstallMode({ ...base, hasDeferredPrompt: true })).toBe('prompt');
  });

  it('shows nothing when already installed, even with a prompt available', () => {
    expect(getInstallMode({ ...base, standalone: true, hasDeferredPrompt: true })).toBe('none');
    expect(getInstallMode({ ...base, standalone: true, ios: true })).toBe('none');
  });

  it('shows the iOS hint until it is dismissed', () => {
    expect(getInstallMode({ ...base, ios: true })).toBe('ios-hint');
    expect(getInstallMode({ ...base, ios: true, hintDismissed: true })).toBe('none');
  });

  it('shows nothing on browsers that cannot install', () => {
    expect(getInstallMode(base)).toBe('none');
  });
});

describe('isIosDevice', () => {
  it('detects iPhone and iPad user agents', () => {
    expect(isIosDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', 'iPhone', 5)).toBe(true);
    expect(isIosDevice('Mozilla/5.0 (iPad; CPU OS 17_0)', 'iPad', 5)).toBe(true);
  });

  it('detects iPadOS that reports a Mac user agent', () => {
    expect(isIosDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 'MacIntel', 5)).toBe(true);
  });

  it('does not flag desktop Mac or Android', () => {
    expect(isIosDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 'MacIntel', 0)).toBe(false);
    expect(isIosDevice('Mozilla/5.0 (Linux; Android 14)', 'Linux armv8l', 5)).toBe(false);
  });
});
