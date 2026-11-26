/** Minimal key/value store, the subset of Web Storage this app relies on. */
export interface SimpleStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Browsers cap cookie lifetime (Chrome: 400 days), so "never expires" is not
 * possible; this is the longest accepted. Callers renew it on every visit.
 */
export const COOKIE_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

/** Browsers drop cookies above ~4096 bytes; refuse instead of silently keeping a stale value. */
const MAX_COOKIE_LENGTH = 4000;

export interface CookieStorageOptions {
  /** Anything with a `cookie` accessor; `document` in the browser. */
  doc: { cookie: string };
  /** Cookie path, normally the app base path so other apps on the origin never see it. */
  path?: string;
  secure?: boolean;
  maxAgeSeconds?: number;
}

/** Storage adapter over `document.cookie`: first-party, SameSite=Lax, long-lived. */
export const createCookieStorage = ({
  doc,
  path = '/',
  secure = false,
  maxAgeSeconds = COOKIE_MAX_AGE_SECONDS,
}: CookieStorageOptions): SimpleStorage => {
  const attributes = (maxAge: number) =>
    `; Max-Age=${maxAge}; Path=${path}; SameSite=Lax${secure ? '; Secure' : ''}`;

  return {
    getItem(key) {
      const prefix = `${encodeURIComponent(key)}=`;
      for (const part of doc.cookie.split('; ')) {
        if (part.startsWith(prefix)) {
          try {
            return decodeURIComponent(part.slice(prefix.length));
          } catch {
            return null;
          }
        }
      }
      return null;
    },
    setItem(key, value) {
      const cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
      if (cookie.length > MAX_COOKIE_LENGTH) {
        // Drop the old value so a mirrored store, not a stale cookie, wins on the next read.
        doc.cookie = `${encodeURIComponent(key)}=${attributes(0)}`;
        throw new RangeError('Value too large for a cookie');
      }
      doc.cookie = cookie + attributes(maxAgeSeconds);
    },
    removeItem(key) {
      doc.cookie = `${encodeURIComponent(key)}=${attributes(0)}`;
    },
  };
};

/**
 * Writes to every store and reads from the first one that has the key, so the
 * data survives one of them being cleared. A store that throws, or whose value
 * is not usable, is skipped.
 */
export const createReplicatedStorage = (
  stores: SimpleStorage[],
  /** Skips a stored value that fails this check, so a damaged copy cannot shadow an intact one. */
  isUsable: (value: string) => boolean = () => true,
): SimpleStorage => ({
  getItem(key) {
    for (const store of stores) {
      try {
        const value = store.getItem(key);
        if (value !== null && isUsable(value)) return value;
      } catch {
        // Try the next store.
      }
    }
    return null;
  },
  setItem(key, value) {
    for (const store of stores) {
      try {
        store.setItem(key, value);
      } catch {
        // One store being full or blocked must not lose the write elsewhere.
      }
    }
  },
  removeItem(key) {
    for (const store of stores) {
      try {
        store.removeItem(key);
      } catch {
        // Nothing to remove from an unavailable store.
      }
    }
  },
});
