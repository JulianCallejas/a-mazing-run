/**
 * Normalizes a deploy base path to `/` or `/segment/` (leading and trailing slash).
 * Only sub-paths are supported: relative bases ('./') and absolute URLs would
 * produce wrong asset URLs and a wrong PWA scope, so they fail the build loudly.
 */
export function normalizeBase(raw: string | undefined): string {
  const value = raw ?? '';
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(value);
  const trimmed = value.replace(/^\/+|\/+$/g, '');
  const dotSegment = trimmed.split('/').some((segment) => segment === '.' || segment === '..');
  if (hasScheme || value.startsWith('//') || dotSegment) {
    throw new Error(
      `Invalid BASE_PATH "${value}": use '/' or a sub-path such as '/my-repo/' (no './', '..' or full URLs).`,
    );
  }
  return trimmed ? `/${trimmed}/` : '/';
}

/** Matches robots.txt at the app base only, so the SPA shell never answers it. */
export function robotsDenylistPattern(base: string): RegExp {
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped}robots\\.txt$`);
}

/** Every PWA option that depends on the deploy base, derived from one normalized value. */
export function pwaBaseOptions(base: string) {
  return {
    manifest: { start_url: base, scope: base, id: base },
    navigateFallback: `${base}index.html`,
    navigateFallbackDenylist: [robotsDenylistPattern(base)],
  };
}
