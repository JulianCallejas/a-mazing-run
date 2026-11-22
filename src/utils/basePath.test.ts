import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UserConfig } from 'vite';
import viteConfig from '../../vite.config';
import { normalizeBase, pwaBaseOptions, robotsDenylistPattern } from './basePath';

async function resolveConfig(): Promise<UserConfig> {
  const factory = viteConfig as (env: { mode: string; command: 'build' }) => UserConfig | Promise<UserConfig>;
  return factory({ mode: 'test', command: 'build' });
}

describe('normalizeBase', () => {
  it('defaults to the root when unset or empty', () => {
    expect(normalizeBase(undefined)).toBe('/');
    expect(normalizeBase('')).toBe('/');
    expect(normalizeBase('/')).toBe('/');
  });

  it('keeps an already normalized sub-path', () => {
    expect(normalizeBase('/a-mazing-run/')).toBe('/a-mazing-run/');
  });

  it('adds the missing leading and trailing slashes', () => {
    expect(normalizeBase('a-mazing-run')).toBe('/a-mazing-run/');
    expect(normalizeBase('/a-mazing-run')).toBe('/a-mazing-run/');
    expect(normalizeBase('a-mazing-run/')).toBe('/a-mazing-run/');
  });
});

describe('normalizeBase validation', () => {
  it.each(['./', '.', '../x/', 'https://cdn.example.com/app/', '//cdn.example.com/app/', '/a/./b/', '/a/../b/'])(
    'rejects %s with a clear error',
    (value) => {
      expect(() => normalizeBase(value)).toThrow(/BASE_PATH/);
    },
  );
});

describe('pwaBaseOptions', () => {
  it('derives manifest scope and service worker fallback from the base', () => {
    const o = pwaBaseOptions('/a-mazing-run/');
    expect(o.manifest).toEqual({ start_url: '/a-mazing-run/', scope: '/a-mazing-run/', id: '/a-mazing-run/' });
    expect(o.navigateFallback).toBe('/a-mazing-run/index.html');
    expect(o.navigateFallbackDenylist[0].test('/a-mazing-run/robots.txt')).toBe(true);
  });

  it('keeps the root defaults', () => {
    const o = pwaBaseOptions('/');
    expect(o.manifest.start_url).toBe('/');
    expect(o.navigateFallback).toBe('/index.html');
  });
});

describe('vite config wiring', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('uses the normalized BASE_PATH as the Vite base', async () => {
    vi.stubEnv('BASE_PATH', 'a-mazing-run');
    const config = await resolveConfig();
    expect(config.base).toBe('/a-mazing-run/');
  });

  it('defaults the Vite base to the root', async () => {
    vi.stubEnv('BASE_PATH', '');
    const config = await resolveConfig();
    expect(config.base).toBe('/');
  });
});

describe('robotsDenylistPattern', () => {
  it('matches only robots.txt at the app base', () => {
    const root = robotsDenylistPattern('/');
    expect(root.test('/robots.txt')).toBe(true);
    expect(root.test('/game/robots.txt')).toBe(false);

    const sub = robotsDenylistPattern('/a-mazing-run/');
    expect(sub.test('/a-mazing-run/robots.txt')).toBe(true);
    expect(sub.test('/robots.txt')).toBe(false);
    expect(sub.test('/a-mazing-run/robots.txt.bak')).toBe(false);
  });

  it('treats regex characters in the base literally', () => {
    const p = robotsDenylistPattern('/a.b/');
    expect(p.test('/a.b/robots.txt')).toBe(true);
    expect(p.test('/axb/robots.txt')).toBe(false);
  });
});
