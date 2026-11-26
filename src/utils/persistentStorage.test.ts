import { describe, expect, it } from 'vitest';
import {
  COOKIE_MAX_AGE_SECONDS,
  createCookieStorage,
  createReplicatedStorage,
  type SimpleStorage,
} from './persistentStorage';

/** Tiny `document.cookie` stand-in: keeps name=value pairs, honours Max-Age=0 deletion. */
const fakeDocument = () => {
  const jar = new Map<string, string>();
  const writes: string[] = [];
  return {
    jar,
    writes,
    get cookie() {
      return [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    },
    set cookie(line: string) {
      writes.push(line);
      const [pair, ...attrs] = line.split('; ');
      const eq = pair.indexOf('=');
      const name = pair.slice(0, eq);
      if (attrs.includes('Max-Age=0')) jar.delete(name);
      else jar.set(name, pair.slice(eq + 1));
    },
  };
};

class MemoryStorage implements SimpleStorage {
  data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
}

describe('cookie storage', () => {
  it('round-trips awkward values through cookie encoding', () => {
    const doc = fakeDocument();
    const storage = createCookieStorage({ doc });
    storage.setItem('scores', 'v2~a*1.5; b=c,d é');
    expect(storage.getItem('scores')).toBe('v2~a*1.5; b=c,d é');
    expect(storage.getItem('other')).toBeNull();
  });

  it('sets the longest allowed lifetime, the base path and SameSite=Lax', () => {
    const doc = fakeDocument();
    createCookieStorage({ doc, path: '/a-mazing-run/', secure: true }).setItem('k', 'v');
    expect(doc.writes[0]).toContain(`Max-Age=${COOKIE_MAX_AGE_SECONDS}`);
    expect(doc.writes[0]).toContain('Path=/a-mazing-run/');
    expect(doc.writes[0]).toContain('SameSite=Lax');
    expect(doc.writes[0]).toContain('Secure');
    expect(COOKIE_MAX_AGE_SECONDS).toBe(400 * 86400);
  });

  it('removes the cookie', () => {
    const storage = createCookieStorage({ doc: fakeDocument() });
    storage.setItem('k', 'v');
    storage.removeItem('k');
    expect(storage.getItem('k')).toBeNull();
  });

  it('refuses a value too big for a cookie and drops the stale one', () => {
    const storage = createCookieStorage({ doc: fakeDocument() });
    storage.setItem('k', 'small');
    expect(() => storage.setItem('k', 'x'.repeat(5000))).toThrow(RangeError);
    expect(storage.getItem('k')).toBeNull();
  });

  it('does not mistake a longer cookie name for the requested key', () => {
    const doc = fakeDocument();
    doc.jar.set('scores2', 'nope');
    expect(createCookieStorage({ doc }).getItem('scores')).toBeNull();
  });
});

describe('replicated storage', () => {
  it('writes everywhere and reads the first store that has the key', () => {
    const a = new MemoryStorage();
    const b = new MemoryStorage();
    const storage = createReplicatedStorage([a, b]);
    storage.setItem('k', 'v');
    expect(a.getItem('k')).toBe('v');
    expect(b.getItem('k')).toBe('v');

    a.removeItem('k');
    expect(storage.getItem('k')).toBe('v');
    storage.removeItem('k');
    expect(b.getItem('k')).toBeNull();
  });

  it('skips a damaged copy so it cannot shadow an intact one', () => {
    const cookie = new MemoryStorage();
    const local = new MemoryStorage();
    cookie.setItem('k', 'garbage');
    local.setItem('k', 'v2~ok');
    const storage = createReplicatedStorage([cookie, local], (value) => value.startsWith('v2~'));
    expect(storage.getItem('k')).toBe('v2~ok');
  });

  it('keeps working when one store throws', () => {
    const broken: SimpleStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('full');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    const good = new MemoryStorage();
    const storage = createReplicatedStorage([broken, good]);
    storage.setItem('k', 'v');
    expect(storage.getItem('k')).toBe('v');
    expect(() => storage.removeItem('k')).not.toThrow();
  });
});
