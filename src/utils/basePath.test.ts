import { describe, expect, it } from 'vitest';
import { normalizeBase, robotsDenylistPattern } from './basePath';

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
